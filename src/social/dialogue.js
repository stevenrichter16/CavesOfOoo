/**
 * Dialogue System - Enhanced dialogue tree system
 * Migrated from OLD dialogueTreesV2.js with backward compatibility
 */

import { emit } from '../js/utils/events.js';
import { EventType } from '../js/utils/eventTypes.js';
import { QuestManager } from '../js/world/quests/QuestManager.js';
import { createQuests } from '../js/world/quests/definitions/openInventory.js';

const questManager = new QuestManager(null, null);
// Store dialogue trees and global story flags
const DIALOGUE_TREES = new Map();
const STORY_FLAGS = new Map();
let currentDialogue = null;

/**
 * Set a story flag
 */
export function setStoryFlag(flag, value = true) {
  STORY_FLAGS.set(flag, value);
  console.log(`[DIALOGUE] Story flag set: ${flag} = ${value}`);
}

/**
 * Get a story flag
 */
export function getStoryFlag(flag) {
  return STORY_FLAGS.get(flag) || false;
}

/**
 * Check if has story flag
 */
export function hasStoryFlag(flag) {
  return STORY_FLAGS.has(flag) && STORY_FLAGS.get(flag) === true;
}

/**
 * Register a dialogue tree - supports multiple formats
 */
export function registerDialogueTree(keyOrNpcType, treeOrBiome, optionalTree) {
  let key, tree;
  
  // Handle different call signatures for backward compatibility
  if (optionalTree) {
    // OLD format: registerDialogueTree(npcType, biome, tree)
    key = `${treeOrBiome}:${keyOrNpcType}`;
    tree = optionalTree;
  } else {
    // NEW format: registerDialogueTree(key, tree)
    key = keyOrNpcType;
    tree = treeOrBiome;
  }
  
  // Normalize tree structure
  if (!tree.id) {
    tree.id = key;
  }
  
  // Wrap in nodes if not already wrapped
  if (!tree.nodes && tree.start) {
    tree = {
      id: tree.id || key,
      nodes: tree
    };
  }
  
  DIALOGUE_TREES.set(key, tree);
  console.log(`[DIALOGUE] Registered tree for ${key}`);
}

/**
 * Get a dialogue tree by key
 */
export function getDialogueTree(key) {
  return DIALOGUE_TREES.get(key);
}

/**
 * Get dialogue for an NPC based on type and biome
 */
export function getDialogueForNPC(npc, biome = 'candy_kingdom') {
  // Try direct lookup with dialogueType as key (for backward compat)
  if (npc.dialogueType) {
    // Try biome:dialogueType format
    let key = `${biome}:${npc.dialogueType}`;
    let tree = DIALOGUE_TREES.get(key);
    if (tree) return tree;
    
    // Try just dialogueType as key
    tree = DIALOGUE_TREES.get(npc.dialogueType);
    if (tree) return tree;
  }
  
  // Try faction as fallback
  if (npc.faction) {
    const key = `${biome}:${npc.faction}`;
    const tree = DIALOGUE_TREES.get(key);
    if (tree) return tree;
  }
  
  // Try type property
  if (npc.type) {
    const key = `${biome}:${npc.type}`;
    const tree = DIALOGUE_TREES.get(key);
    if (tree) return tree;
  }
  
  // Try generic peasant dialogue as last resort
  const fallbackKey = `${biome}:peasants`;
  return DIALOGUE_TREES.get(fallbackKey);
}

/**
 * Start dialogue with an NPC
 */
export function startDialogue(state, player, npc, biome = 'candy_kingdom') {
  const tree = getDialogueForNPC(npc, biome);
  
  if (!tree) {
    console.warn(`No dialogue tree for NPC:`, { 
      name: npc.name, 
      dialogueType: npc.dialogueType, 
      faction: npc.faction,
      biome 
    });
    return null;
  }
  
  currentDialogue = {
    state,
    player,
    npc,
    tree,
    currentNodeId: tree.start || 'start',
    history: [],
    turnStarted: state?.turn || 0
  };
  
  return getCurrentNode();
}

/**
 * Get current dialogue node with conditions evaluated
 */
export function getCurrentNode() {
  if (!currentDialogue) return null;
  
  const tree = currentDialogue.tree;
  const nodes = tree.nodes || tree; // Handle both wrapped and unwrapped
  
  const node = nodes[currentDialogue.currentNodeId] || 
                nodes.find?.(n => n.id === currentDialogue.currentNodeId);
  
  if (!node) {
    console.error(`Node ${currentDialogue.currentNodeId} not found`);
    return null;
  }
  
  // Process the node with conditions
  return processNode(node);
}

/**
 * Process a node, evaluating conditions and filtering choices
 */
function processNode(node) {
  const { state, player, npc } = currentDialogue;
  
  // Handle text variations
  let text = node.text || node.npcLine;
  if (Array.isArray(text)) {
    text = text.join(' ');
  }
  
  // Process trait variants
  if (npc.hasTrait) {
    if (npc.hasTrait('proud') && node.proudVariant) {
      text = node.proudVariant;
    }
    if (npc.hasTrait('greedy') && node.greedyVariant) {
      text = node.greedyVariant;
    }
    if (npc.hasTrait('friendly') && node.friendlyVariant) {
      text = node.friendlyVariant;
    }
  }
  
  // Filter choices based on conditions
  let choices = node.choices || node.responses || [];
  if (!Array.isArray(choices)) {
    choices = [];
  }
  
  const filteredChoices = choices.filter(choice => {
    if (!choice.condition) return true;
    return evaluateDialogueConditions(choice.condition, state, player, npc);
  });
  
  return {
    id: currentDialogue.currentNodeId,
    text,
    npcLine: text, // For backward compatibility
    choices: filteredChoices,
    responses: filteredChoices, // For backward compatibility
    action: node.action,
    effect: node.effect
  };
}

/**
 * Evaluate dialogue conditions
 */
export function evaluateDialogueConditions(condition, state, player, npc) {
  if (!condition) return true;
  return evaluateConditionInternal(condition, state, player, npc);
}

/**
 * Internal condition evaluator
 */
export function evaluateConditionInternal(condition, state, player, npc) {
  if (!condition) return true;
  
  // AND condition
  if (condition.and) {
    return condition.and.every(c => 
      evaluateConditionInternal(c, state, player, npc)
    );
  }
  
  // OR condition
  if (condition.or) {
    return condition.or.some(c => 
      evaluateConditionInternal(c, state, player, npc)
    );
  }
  
  // NOT condition
  if (condition.not) {
    return !evaluateConditionInternal(condition.not, state, player, npc);
  }
  
  // Gold condition
  if (condition.type === 'gold') {
    const playerGold = player.gold || 0;
    const amount = condition.amount || 0;
    const operator = condition.operator || '>=';
    
    switch (operator) {
      case '>=': return playerGold >= amount;
      case '>': return playerGold > amount;
      case '<=': return playerGold <= amount;
      case '<': return playerGold < amount;
      case '==': return playerGold === amount;
      default: return playerGold >= amount;
    }
  }
  
  // Item condition
  if (condition.type === 'item') {
    const hasItem = player.inventory?.some(i => 
      i.id === condition.item || 
      i.item?.id === condition.item
    );
    return hasItem || false;
  }
  
  // Level condition
  if (condition.type === 'level') {
    const playerLevel = player.level || 1;
    const level = condition.level || 1;
    const operator = condition.operator || '>=';
    
    switch (operator) {
      case '>=': return playerLevel >= level;
      case '>': return playerLevel > level;
      case '<=': return playerLevel <= level;
      case '<': return playerLevel < level;
      case '==': return playerLevel === level;
      default: return playerLevel >= level;
    }
  }
  
  // Trait condition (NPC trait)
  if (condition.type === 'trait') {
    if (!npc.hasTrait) return false;
    return npc.hasTrait(condition.trait);
  }
  
  // Story flag condition
  if (condition.type === 'flag' || condition.storyFlag) {
    const flag = condition.flag || condition.storyFlag;
    return getStoryFlag(flag) === true;
  }
  
  // Quest conditions
  if (condition.type === 'quest' || condition.hasActiveQuest) {
    const questId = condition.quest || condition.hasActiveQuest;
    return player.quests?.active?.includes(questId) || false;
  }
  
  if (condition.hasCompletedQuest) {
    return player.quests?.completed?.includes(condition.hasCompletedQuest) || false;
  }
  
  // Relationship condition
  if (condition.type === 'relationship') {
    if (!npc.memory) return false;
    const relationship = npc.memory.getRelationship(player.id || 'player');
    const threshold = condition.threshold || 0;
    const operator = condition.operator || '>=';
    
    switch (operator) {
      case '>=': return relationship >= threshold;
      case '>': return relationship > threshold;
      case '<=': return relationship <= threshold;
      case '<': return relationship < threshold;
      case '==': return relationship === threshold;
      default: return relationship >= threshold;
    }
  }
  
  // Legacy conditions for backward compatibility
  if (condition.hasItem !== undefined) {
    const item = player.inventory?.find(i => 
      i.id === condition.hasItem || 
      i.item?.id === condition.hasItem
    );
    
    if (!item) return false;
    
    if (condition.minCount) {
      const count = item.count || item.quantity || 1;
      return count >= condition.minCount;
    }
    
    return true;
  }
  
  if (condition.hasGold !== undefined) {
    return (player.gold || 0) >= condition.hasGold;
  }
  
  return true;
}

/**
 * Select a dialogue choice
 */
export function selectChoice(choiceIndex) {
  console.log('🗣️ [DIALOGUE] selectChoice called with index:', choiceIndex);
  
  if (!currentDialogue) {
    console.log('❌ [DIALOGUE] No current dialogue active');
    return null;
  }
  
  const node = getCurrentNode();
  console.log('🗣️ [DIALOGUE] Current node:', node?.id);
  
  if (!node || !node.choices || choiceIndex >= node.choices.length) {
    console.log('❌ [DIALOGUE] Invalid choice index or no choices available');
    return null;
  }
  
  const choice = node.choices[choiceIndex];
  console.log('🗣️ [DIALOGUE] Selected choice:', choice);
  
  // Record in history
  currentDialogue.history.push({
    nodeId: currentDialogue.currentNodeId,
    choiceText: choice.text,
    turn: currentDialogue.state?.turn || 0
  });
  
  // Handle action if present
  if (choice.action) {
    console.log('🎭 [DIALOGUE] Choice has action:', choice.action);
    const actionResult = processDialogueAction(
      choice.action, 
      currentDialogue.state, 
      currentDialogue.npc
    );
    
    if (actionResult?.closesDialogue) {
      endDialogue();
      return null;
    }
    
    if (actionResult?.nextNode) {
      currentDialogue.currentNodeId = actionResult.nextNode;
      return getCurrentNode();
    }
  }
  
  // Handle effect if present
  if (choice.effect) {
    processDialogueAction(choice.effect, currentDialogue.state, currentDialogue.npc);
  }
  
  // Move to next node
  if (choice.next) {
    currentDialogue.currentNodeId = choice.next;
    return getCurrentNode();
  }
  
  // End dialogue if no next node
  endDialogue();
  return null;
}

/**
 * Process dialogue action/effect
 */
export function processDialogueAction(action, state, npc) {
  if (!action) return null;
  
  const player = state.player;
  
  // Handle string actions (backward compatibility)
  if (typeof action === 'string') {
    switch (action) {
      case 'openShop':
        console.log('[DIALOGUE] Opening shop for NPC:', npc.name);
        // Ensure state.ui exists
        if (!state.ui) {
          state.ui = {};
        }
        // Import and use ShopSystem dynamically to avoid circular dependencies
        Promise.all([
          import('../js/items/shop.js'),
          import('../js/ui/shop.js')
        ]).then(([shopModule, uiModule]) => {
          if (shopModule.openShop) {
            console.log('[DIALOGUE] Calling ShopSystem.openShop');
            shopModule.openShop(state, npc);
            
            // Trigger UI render after shop is opened
            if (uiModule.renderShop) {
              console.log('[DIALOGUE] Rendering shop UI');
              uiModule.renderShop(state);
            }
          }
        }).catch(err => {
          console.error('[DIALOGUE] Failed to open shop:', err);
        });
        return { opensShop: true, closesDialogue: true, goods: npc.goods || [] };
        
      case 'closeDialogue':
        return { closesDialogue: true };
        
      default:
        console.log(`[DIALOGUE] Unknown string action: ${action}`);
        return null;
    }
  }
  
  // Handle object actions (standard format)
  switch (action.type) {
    case 'start_quest':
      console.log("STARTING QUEST:", action);
      var quests = createQuests();
      var selectedQuest = quests[action.id];
      //questManager.addQuest(selectedQuest);
      console.log("SELECTED QUEST:", selectedQuest);
    case 'give_gold':
      if (player.gold !== undefined) {
        player.gold += action.amount || 0;
        console.log(`[DIALOGUE] Player received ${action.amount} gold`);
      }
      break;
      
    case 'take_gold':
      if (player.gold !== undefined) {
        player.gold = Math.max(0, player.gold - (action.amount || 0));
        console.log(`[DIALOGUE] Player spent ${action.amount} gold`);
      }
      break;
      
    case 'give_item':
      if (player.inventory) {
        player.inventory.push(action.item);
        console.log(`[DIALOGUE] Player received item:`, action.item);
      }
      break;
      
    case 'take_item':
      if (player.inventory) {
        const index = player.inventory.findIndex(i => 
          i.id === action.item || i.item?.id === action.item
        );
        if (index >= 0) {
          player.inventory.splice(index, 1);
          console.log(`[DIALOGUE] Removed item from player:`, action.item);
        }
      }
      break;
      
    case 'give_quest':
      if (player.quests?.active) {
        if (!player.quests.active.includes(action.quest)) {
          player.quests.active.push(action.quest);
          console.log(`[DIALOGUE] Quest added:`, action.quest);
        }
      }
      break;
      
    case 'complete_quest':
      if (player.quests) {
        // Remove from active
        if (player.quests.active) {
          const index = player.quests.active.indexOf(action.quest);
          if (index >= 0) {
            player.quests.active.splice(index, 1);
          }
        }
        // Add to completed
        if (player.quests.completed) {
          if (!player.quests.completed.includes(action.quest)) {
            player.quests.completed.push(action.quest);
          }
        }
        console.log(`[DIALOGUE] Quest completed:`, action.quest);
      }
      break;
      
    case 'relationship':
      if (npc.memory) {
        npc.memory.updateRelationship(player.id || 'player', action.change || 0);
        console.log(`[DIALOGUE] Relationship changed by ${action.change}`);
      }
      break;
      
    case 'set_flag':
      setStoryFlag(action.flag, action.value !== false);
      break;
      
    case 'shop':
      // Open shop UI
      if (action.open) {
        // Ensure state.ui exists
        if (!state.ui) {
          state.ui = {};
        }
        // Import and use ShopSystem dynamically
        Promise.all([
          import('../js/items/shop.js'),
          import('../js/ui/shop.js')
        ]).then(([shopModule, uiModule]) => {
          if (shopModule.openShop) {
            console.log('[DIALOGUE] Opening shop via object action');
            shopModule.openShop(state, npc);
            
            // Trigger UI render
            if (uiModule.renderShop) {
              console.log('[DIALOGUE] Rendering shop UI');
              uiModule.renderShop(state);
            }
          }
        }).catch(err => {
          console.error('[DIALOGUE] Failed to open shop:', err);
        });
        return { opensShop: true, closesDialogue: true, goods: npc.goods || [] };
      }
      break;
      
    case 'end':
      return { closesDialogue: true };
      
    default:
      console.log(`[DIALOGUE] Unknown action type: ${action.type}`);
  }
  
  return null;
}

/**
 * End current dialogue
 */
export function endDialogue() {
  if (currentDialogue) {
    console.log('[DIALOGUE] Ending dialogue');
    
    // Emit dialogue end event
    if (emit) {
      emit(EventType.DIALOGUE_END, {
        npc: currentDialogue.npc,
        player: currentDialogue.player,
        history: currentDialogue.history
      });
    }
    
    currentDialogue = null;
  }
}

/**
 * Get current dialogue state
 */
export function getCurrentDialogue() {
  return currentDialogue;
}

/**
 * Load expanded Candy Kingdom dialogues
 */
export async function loadExpandedCandyKingdomDialogues() {
  try {
    // Import dialogue data files
    const dialogueModules = await Promise.all([
      import('../js/data/candyKingdomDialoguesV3.js').catch(() => null),
      import('../js/data/forestDialogues.js').catch(() => null),
      import('../js/data/shoppingDistrictDialogues.js').catch(() => null)
    ]);
    
    // Register all dialogues
    dialogueModules.forEach(module => {
      if (module?.dialogues) {
        Object.entries(module.dialogues).forEach(([key, tree]) => {
          registerDialogueTree(key, tree);
        });
      }
    });
    
    console.log('[DIALOGUE] Loaded dialogue data files');
    return true;
  } catch (error) {
    console.error('[DIALOGUE] Failed to load dialogue data:', error);
    return false;
  }
}

// Export for backward compatibility
export default {
  setStoryFlag,
  getStoryFlag,
  hasStoryFlag,
  registerDialogueTree,
  getDialogueTree,
  getDialogueForNPC,
  startDialogue,
  getCurrentNode,
  selectChoice,
  endDialogue,
  getCurrentDialogue,
  evaluateDialogueConditions,
  evaluateConditionInternal,
  processDialogueAction,
  loadExpandedCandyKingdomDialogues
};