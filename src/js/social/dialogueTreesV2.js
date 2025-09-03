// src/js/social/dialogueTreesV2.js - Enhanced dialogue tree system v2.0

import { RelationshipSystem } from './relationship.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { propagateReputation } from './behavior.js';

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
 * Register a dialogue tree
 */
export function registerDialogueTree(npcType, biome, tree) {
  const key = `${biome}:${npcType}`;
  DIALOGUE_TREES.set(key, tree);
  console.log(`[DIALOGUE] Registered tree for ${key}`);
}

/**
 * Start dialogue with an NPC
 */
export function startDialogue(state, player, npc, biome = 'candy_kingdom') {
  // Use dialogueType if available, otherwise fall back to faction
  const npcType = npc.dialogueType || npc.faction || 'peasant';
  const key = `${biome}:${npcType}`;
  const tree = DIALOGUE_TREES.get(key);
  
  if (!tree) {
    console.warn(`No dialogue tree for ${key}`);
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
  
  const node = currentDialogue.tree.nodes.find(
    n => n.id === currentDialogue.currentNodeId
  );
  
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
  const { npc, player } = currentDialogue;
  
  // Handle multi-line dialogue
  let npcLine = Array.isArray(node.npcLine) 
    ? node.npcLine.join(' ') 
    : node.npcLine;
  
  // Process trait variants
  if (npc.hasTrait?.('proud') && node.proudVariant) {
    npcLine = node.proudVariant;
  } else if (npc.hasTrait?.('humble') && node.humbleVariant) {
    npcLine = node.humbleVariant;
  } else if (npc.hasTrait?.('greedy') && node.greedyVariant) {
    npcLine = node.greedyVariant;
  }
  
  // Filter choices based on conditions
  const availableChoices = [];
  
  if (node.choices) {
    for (const choice of node.choices) {
      if (evaluateConditions(choice.conditions || [])) {
        availableChoices.push(choice);
      }
    }
  }
  
  return {
    ...node,
    npcLine,
    choices: availableChoices
  };
}

/**
 * Evaluate an array of conditions (ALL must pass)
 */
function evaluateConditions(conditions) {
  if (!conditions || conditions.length === 0) return true;
  
  for (const condition of conditions) {
    if (!evaluateCondition(condition)) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition) {
  const { npc, player, state } = currentDialogue;
  
  // hasTrait condition
  if (condition.hasTrait) {
    return npc.hasTrait?.(condition.hasTrait) || false;
  }
  
  // flagTrue condition
  if (condition.flagTrue) {
    return getStoryFlag(condition.flagTrue);
  }
  
  // relationAtLeast condition
  if (condition.relationAtLeast) {
    const target = condition.relationAtLeast.target === 'player' ? player : npc;
    const rel = RelationshipSystem.getRelation(npc, target);
    const metric = condition.relationAtLeast.metric;
    const value = condition.relationAtLeast.value;
    return rel[metric] >= value;
  }
  
  // relationBelow condition (for Starchy's dialogue)
  if (condition.relationBelow) {
    const target = condition.relationBelow.target === 'player' ? player : npc;
    const rel = RelationshipSystem.getRelation(npc, target);
    const metric = condition.relationBelow.metric;
    const value = condition.relationBelow.value;
    return rel[metric] < value;
  }
  
  // randomLT condition (random < threshold)
  if (condition.randomLT !== undefined) {
    return Math.random() < condition.randomLT;
  }
  
  // hasItem condition
  if (condition.hasItem) {
    return player.inventory?.some(i => 
      i.item?.name === condition.hasItem || 
      i.item?.id === condition.hasItem
    ) || false;
  }
  
  // hasGold condition
  if (condition.hasGold !== undefined) {
    return (player.gold || 0) >= condition.hasGold;
  }
  
  // hasActiveQuest condition - check if player has an active quest
  if (condition.hasActiveQuest) {
    const questId = condition.hasActiveQuest;
    return state?.activeQuests?.some(q => q.id === questId) || false;
  }
  
  // hasCompletedObjective condition - check if quest objective is complete
  if (condition.hasCompletedObjective) {
    const { questId, objective } = condition.hasCompletedObjective;
    const quest = state?.activeQuests?.find(q => q.id === questId);
    if (!quest) return false;
    
    // Check for warding quest specifically
    if (questId === 'warding_the_haints') {
      // Check if player has whisper shard
      const hasWhisperShard = player.inventory?.some(i => 
        i.item?.id === 'whisper_shard' || 
        i.item?.name === 'Whisper Shard'
      ) || false;
      
      // Check if 5 wards were placed
      const wardsPlaced = quest.progress?.wardsPlaced >= 5;
      
      return hasWhisperShard && wardsPlaced;
    }
    
    return quest.progress?.[objective] >= 1;
  }
  
  // NOT condition (negation)
  if (condition.not) {
    return !evaluateCondition(condition.not);
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
  
  // Apply effects
  if (choice.effects && choice.effects.length > 0) {
    console.log('🎭 [DIALOGUE] Choice has effects to apply:', choice.effects);
    applyEffects(choice.effects);
  } else {
    console.log('🗣️ [DIALOGUE] Choice has no effects');
  }
  
  // Check for end
  if (choice.end || node.end) {
    endDialogue();
    return null;
  }
  
  // Move to next node
  currentDialogue.currentNodeId = choice.next;
  const nextNode = getCurrentNode();
  
  // Check if the destination node itself has effects to apply
  if (nextNode && nextNode.effects && nextNode.effects.length > 0) {
    console.log('🎭 [DIALOGUE] Destination node has effects to apply:', nextNode.effects);
    applyEffects(nextNode.effects);
  }
  
  return nextNode;
}

/**
 * Apply an array of effects
 */
function applyEffects(effects) {
  console.log('🎭 [DIALOGUE] Applying effects array:', effects);
  for (let i = 0; i < effects.length; i++) {
    console.log(`🎭 [DIALOGUE] Applying effect ${i + 1}/${effects.length}:`, effects[i]);
    applyEffect(effects[i]);
  }
  console.log('🎭 [DIALOGUE] All effects applied');
}

/**
 * Apply a single effect
 */
function applyEffect(effect) {
  const { state, player, npc } = currentDialogue;
  
  // relationDelta - modify relationship values
  if (effect.relationDelta) {
    const target = effect.relationDelta.target === 'player' ? player : npc;
    const deltas = effect.relationDelta.deltas;
    
    RelationshipSystem.modifyRelation(npc, target, {
      value: deltas.value || 0,
      trust: deltas.trust || 0,
      respect: deltas.respect || 0,
      fear: deltas.fear || 0,
      reason: 'dialogue'
    });
  }
  
  // factionDelta - modify faction standing
  if (effect.factionDelta) {
    const entity = effect.factionDelta.entity === 'player' ? player.id : effect.factionDelta.entity;
    propagateReputation(
      state,
      entity,
      effect.factionDelta.faction,
      effect.factionDelta.delta,
      effect.factionDelta.reason || 'dialogue'
    );
  }
  
  // emitEvent - trigger game events
  if (effect.emitEvent) {
    emit(effect.emitEvent.type, effect.emitEvent.payload || {});
    
    // Special handling for rumors
    if (effect.emitEvent.type === 'RumorShared' && npc.memory) {
      const rumor = effect.emitEvent.payload;
      npc.memory.addRumor({
        subject: rumor.id,
        detail: rumor.detail || rumor.id,
        source: player.id
      });
    }
  }
  
  // setFlag - set story flags
  if (effect.setFlag) {
    setStoryFlag(effect.setFlag.flag, effect.setFlag.value);
  }
  
  // grantItem - give items to player
  if (effect.grantItem) {
    console.log('🎁 [DIALOGUE] grantItem effect triggered:', effect.grantItem);
    console.log('🎁 [DIALOGUE] Current player inventory before grant:', JSON.stringify(player.inventory));
    console.log('🎁 [DIALOGUE] State object available:', !!state);
    console.log('🎁 [DIALOGUE] Player object available:', !!player);
    console.log('🎁 [DIALOGUE] Player gold:', player.gold);
    
    // SYNCHRONOUS FIX: Check if we already have questItems imported
    if (window.__questItems) {
      console.log('✅ [DIALOGUE] Using cached questItems module');
      window.__questItems.grantQuestItem(state, effect.grantItem.id, effect.grantItem.qty || 1);
      console.log('🎁 [DIALOGUE] Player inventory after sync grant:', JSON.stringify(player.inventory));
      return;
    }
    
    // Import and use the proper quest item granting function
    import('../items/questItems.js').then(module => {
      // Cache it for future use
      window.__questItems = module;
      console.log('✅ [DIALOGUE] Successfully imported questItems module');
      console.log('🎁 [DIALOGUE] Calling grantQuestItem with:', {
        itemId: effect.grantItem.id,
        quantity: effect.grantItem.qty || 1
      });
      
      module.grantQuestItem(state, effect.grantItem.id, effect.grantItem.qty || 1);
      
      console.log('🎁 [DIALOGUE] Player inventory after grant:', player.inventory);
    }).catch(err => {
      // Fallback if import fails
      console.error('❌ [DIALOGUE] Failed to import questItems:', err);
      console.log('⚠️ [DIALOGUE] Using fallback item creation method');
      
      player.inventory = player.inventory || [];
      const item = {
        type: 'item',
        item: {
          id: effect.grantItem.id,
          name: effect.grantItem.id.replace(/_/g, ' '),
          value: effect.grantItem.value || 10
        },
        id: `item_${Date.now()}_${Math.random()}`,
        count: effect.grantItem.qty || 1
      };
      
      console.log('🎁 [DIALOGUE] Fallback item created:', item);
      player.inventory.push(item);
      console.log('🎁 [DIALOGUE] Inventory after fallback push:', player.inventory);
      
      if (state.log) {
        state.log(`You received ${item.count}x ${item.item.name}!`, 'good');
      }
    });
  }
  
  // takeItem - remove items from player
  if (effect.takeItem) {
    console.log('💰 [DIALOGUE] takeItem effect triggered:', effect.takeItem);
    
    if (effect.takeItem.id === 'gold') {
      // Handle gold specially
      const amount = effect.takeItem.qty || 0;
      console.log('💰 [DIALOGUE] Taking gold:', { 
        requested: amount, 
        playerHas: player.gold,
        sufficient: player.gold >= amount 
      });
      
      if (player.gold >= amount) {
        const goldBefore = player.gold;
        player.gold -= amount;
        console.log('💰 [DIALOGUE] Gold deducted:', {
          before: goldBefore,
          after: player.gold,
          deducted: amount
        });
        
        if (state.log) {
          state.log(`You paid ${amount} gold.`, 'note');
        }
      } else {
        console.log('⚠️ [DIALOGUE] Not enough gold!')
      }
    } else {
      // Handle regular items
      const index = player.inventory?.findIndex(i => 
        i.item?.id === effect.takeItem.id || 
        i.item?.name === effect.takeItem.id
      );
      
      if (index >= 0) {
        const item = player.inventory[index];
        if (item.count > effect.takeItem.qty) {
          item.count -= effect.takeItem.qty;
        } else {
          player.inventory.splice(index, 1);
        }
        
        if (state.log) {
          state.log(`You gave ${effect.takeItem.qty}x ${effect.takeItem.id}.`, 'note');
        }
      }
    }
  }
  
  // startQuest - begin a quest
  if (effect.startQuest) {
    const questId = effect.startQuest.id;
    
    // Check if this is a Starchy quest
    const starchyQuests = [
      'warding_the_haints', 
      'grave_discoveries', 
      'pbs_secrets', 
      'sugar_war_protocols', 
      'mint_ward_errand'
    ];
    
    if (starchyQuests.includes(questId)) {
      // Import Starchy quest system and wait for it
      import('../quests/starchyQuests.js').then(module => {
        console.log('🎯 [DIALOGUE] Starchy quest module loaded, starting quest:', questId);
        const result = module.startStarchyQuest(state, questId);
        console.log('🎯 [DIALOGUE] Quest start result:', result);
        
        // Log success message after quest actually starts
        if (result && state.log) {
          state.log(`Quest started: ${questId.replace(/_/g, ' ')}`, 'xp');
        }
      }).catch(err => {
        console.error('❌ [DIALOGUE] Failed to load Starchy quest module:', err);
        if (state.log) {
          state.log(`Failed to start quest: ${questId}`, 'bad');
        }
      });
    } else {
      // Import regular quest system
      import('../quests/candyKingdomQuests.js').then(module => {
        module.startQuest(state, questId);
        if (state.log) {
          state.log(`Quest started: ${questId.replace(/_/g, ' ')}`, 'xp');
        }
      }).catch(err => {
        console.error('❌ [DIALOGUE] Failed to load quest module:', err);
      });
    }
  }
  
  // completeQuest - finish a quest
  if (effect.completeQuest) {
    const questId = effect.completeQuest.id;
    
    // Check if this is a Starchy quest
    if (questId === 'warding_the_haints') {
      // Import and complete the quest
      import('../quests/starchyQuests.js').then(module => {
        console.log('🎯 [DIALOGUE] Completing Starchy quest:', questId);
        
        // Remove whisper shard from inventory
        const shardIndex = player.inventory?.findIndex(i => 
          i.item?.id === 'whisper_shard' || i.item?.name === 'Whisper Shard'
        );
        if (shardIndex >= 0) {
          player.inventory.splice(shardIndex, 1);
        }
        
        // Complete the quest and grant rewards
        const result = module.completeStarchyQuest(state, questId);
        if (result && state.log) {
          state.log(`Quest completed: ${questId.replace(/_/g, ' ')}`, 'xp');
        }
      }).catch(err => {
        console.error('❌ [DIALOGUE] Failed to complete quest:', err);
      });
    }
  }
  
  // randomLT - conditional random gate (already handled in conditions)
  if (effect.randomLT !== undefined) {
    // This is a condition, not an effect
    return;
  }
  
  // Combat trigger
  if (effect.startCombat) {
    npc.hostile = true;
    emit(EventType.NPCHostile, { npc, reason: 'dialogue' });
    
    if (state.log) {
      state.log(`${npc.name} becomes hostile!`, 'bad');
    }
  }
}

/**
 * End dialogue
 */
export function endDialogue() {
  if (!currentDialogue) return;
  
  emit(EventType.DialogueEnded, {
    npc: currentDialogue.npc.id,
    player: currentDialogue.player.id,
    history: currentDialogue.history,
    duration: (currentDialogue.state?.turn || 0) - currentDialogue.turnStarted
  });
  
  // Update NPC memory
  if (currentDialogue.npc.memory) {
    currentDialogue.npc.memory.remember({
      type: 'conversation',
      partner: currentDialogue.player.id,
      turn: currentDialogue.state?.turn || 0,
      nodeCount: currentDialogue.history.length,
      outcome: currentDialogue.history[currentDialogue.history.length - 1]?.nodeId
    });
  }
  
  currentDialogue = null;
}

/**
 * Load the expanded Candy Kingdom dialogues
 */
export function loadExpandedCandyKingdomDialogues(dialogueData) {
  // Parse each tree from the data
  for (const tree of dialogueData.trees) {
    registerDialogueTree(tree.npcType, tree.biome, tree);
  }
  
  console.log(`[DIALOGUE] Loaded ${dialogueData.trees.length} expanded dialogue trees`);
}

// Export for testing
export function getCurrentDialogueState() {
  return currentDialogue;
}

export function clearDialogueState() {
  currentDialogue = null;
  STORY_FLAGS.clear();
}