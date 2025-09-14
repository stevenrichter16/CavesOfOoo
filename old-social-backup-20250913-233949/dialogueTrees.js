// src/js/social/dialogueTrees.js - Branching dialogue tree system

import { RelationshipSystem } from './relationship.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// Store all dialogue trees by NPC type and biome
const DIALOGUE_TREES = new Map();

// Current dialogue state
let currentDialogue = null;

/**
 * Register a dialogue tree for an NPC type in a biome
 */
export function registerDialogueTree(npcType, biome, tree) {
  const key = `${biome}:${npcType}`;
  DIALOGUE_TREES.set(key, tree);
}

/**
 * Get dialogue tree for an NPC
 */
export function getDialogueTree(npc, biome) {
  const npcType = npc.dialogueType || npc.faction || 'peasant';
  const key = `${biome}:${npcType}`;
  return DIALOGUE_TREES.get(key);
}

/**
 * Start a dialogue with an NPC
 */
export function startDialogue(state, player, npc, biome = 'candy_kingdom') {
  const tree = getDialogueTree(npc, biome);
  if (!tree) {
    console.warn(`No dialogue tree for ${npc.name} in ${biome}`);
    return null;
  }
  
  currentDialogue = {
    state,
    player,
    npc,
    tree,
    currentNodeId: tree.start,
    history: []
  };
  
  return getCurrentNode();
}

/**
 * Get the current dialogue node
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
  
  // Process conditional text based on NPC traits
  const processedNode = processNodeConditionals(node, currentDialogue.npc);
  
  return processedNode;
}

/**
 * Process conditionals in dialogue based on NPC traits and state
 */
function processNodeConditionals(node, npc) {
  let npcLine = node.npcLine;
  
  // Replace trait-based variations
  if (npc.hasTrait?.('proud') && node.proudVariant) {
    npcLine = node.proudVariant;
  } else if (npc.hasTrait?.('humble') && node.humbleVariant) {
    npcLine = node.humbleVariant;
  } else if (npc.hasTrait?.('greedy') && node.greedyVariant) {
    npcLine = node.greedyVariant;
  }
  
  // Filter choices based on conditions
  const availableChoices = node.choices?.filter(choice => {
    if (choice.requires) {
      // Check requirements (items, relationship level, etc.)
      return checkRequirements(choice.requires, currentDialogue);
    }
    return true;
  }) || [];
  
  return {
    ...node,
    npcLine,
    choices: availableChoices
  };
}

/**
 * Check if requirements are met for a dialogue choice
 */
function checkRequirements(requires, dialogue) {
  if (requires.relationship) {
    const rel = RelationshipSystem.getRelation(dialogue.npc, dialogue.player);
    if (rel.value < requires.relationship) return false;
  }
  
  if (requires.item) {
    const hasItem = dialogue.player.inventory?.some(
      i => i.item?.name === requires.item
    );
    if (!hasItem) return false;
  }
  
  if (requires.faction) {
    const standing = RelationshipSystem.getFactionStanding(
      dialogue.player.id,
      requires.faction
    );
    if (standing < (requires.factionLevel || 0)) return false;
  }
  
  return true;
}

/**
 * Select a dialogue choice
 */
export function selectChoice(choiceIndex) {
  if (!currentDialogue) return null;
  
  const node = getCurrentNode();
  if (!node || !node.choices || choiceIndex >= node.choices.length) {
    return null;
  }
  
  const choice = node.choices[choiceIndex];
  
  // Record in history
  currentDialogue.history.push({
    nodeId: currentDialogue.currentNodeId,
    choiceText: choice.text,
    turn: currentDialogue.state?.turn || 0
  });
  
  // Apply effects
  if (choice.effects) {
    applyChoiceEffects(choice.effects, currentDialogue);
  }
  
  // Check for end
  if (choice.end || node.end) {
    endDialogue();
    return null;
  }
  
  // Move to next node
  currentDialogue.currentNodeId = choice.next;
  return getCurrentNode();
}

/**
 * Apply effects from a dialogue choice
 */
function applyChoiceEffects(effects, dialogue) {
  const { state, player, npc } = dialogue;
  
  // Relationship changes
  if (effects.relationship) {
    RelationshipSystem.modifyRelation(npc, player, {
      value: effects.relationship.value || 0,
      trust: effects.relationship.trust || 0,
      fear: effects.relationship.fear || 0,
      respect: effects.relationship.respect || 0,
      reason: 'dialogue'
    });
  }
  
  // Faction standing changes
  if (effects.faction) {
    for (const [faction, change] of Object.entries(effects.faction)) {
      RelationshipSystem.modifyFactionStanding(player.id, faction, change);
    }
  }
  
  // Give/take items
  if (effects.giveItem) {
    player.inventory = player.inventory || [];
    player.inventory.push({
      type: 'item',
      item: { name: effects.giveItem, value: effects.itemValue || 10 },
      id: `item_${Date.now()}`
    });
    if (state.log) {
      state.log(`You received ${effects.giveItem}!`, 'good');
    }
  }
  
  if (effects.takeItem) {
    const index = player.inventory?.findIndex(
      i => i.item?.name === effects.takeItem
    );
    if (index >= 0) {
      player.inventory.splice(index, 1);
      if (state.log) {
        state.log(`You gave away ${effects.takeItem}.`, 'note');
      }
    }
  }
  
  // Spread rumor
  if (effects.rumor && npc.memory) {
    npc.memory.addRumor({
      subject: effects.rumor.subject,
      detail: effects.rumor.detail,
      source: player.id
    });
  }
  
  // Trigger combat
  if (effects.startCombat) {
    npc.hostile = true;
    if (state.log) {
      state.log(`${npc.name} becomes hostile!`, 'bad');
    }
    emit(EventType.NPCHostile, { npc, reason: 'dialogue' });
  }
  
  // Quest triggers
  if (effects.quest) {
    // This could trigger quest system
    emit('QuestTriggered', { questId: effects.quest, npc: npc.id });
  }
}

/**
 * End the current dialogue
 */
export function endDialogue() {
  if (!currentDialogue) return;
  
  // Log dialogue completion
  emit(EventType.DialogueEnded, {
    npc: currentDialogue.npc.id,
    player: currentDialogue.player.id,
    history: currentDialogue.history
  });
  
  // Update NPC memory
  if (currentDialogue.npc.memory) {
    currentDialogue.npc.memory.remember({
      type: 'conversation',
      partner: currentDialogue.player.id,
      turn: currentDialogue.state?.turn || 0,
      nodeCount: currentDialogue.history.length
    });
  }
  
  currentDialogue = null;
}

/**
 * Load Candy Kingdom dialogue trees
 */
export function loadCandyKingdomDialogues() {
  // Noble dialogue tree
  registerDialogueTree('nobles', 'candy_kingdom', {
    start: 'noble_intro',
    nodes: [
      {
        id: 'noble_intro',
        npcLine: 'Welcome, commoner, to what remains of our once-sweet halls. Speak, what brings you here?',
        proudVariant: 'You dare enter these halls without invitation? Speak quickly before I have you removed!',
        humbleVariant: 'Greetings, traveler. These halls have seen better days. How may I assist you?',
        choices: [
          {
            text: 'Bow respectfully.',
            next: 'noble_respect',
            effects: {
              relationship: { value: 5, respect: 10 }
            }
          },
          {
            text: 'Demand treasure from the ruins.',
            next: 'noble_greed',
            effects: {
              relationship: { value: -10, respect: -5 }
            }
          },
          {
            text: 'Share a rumor about the fall of Candy Kingdom.',
            next: 'noble_rumor',
            requires: { relationship: -20 } // Only if somewhat friendly
          }
        ]
      },
      {
        id: 'noble_respect',
        npcLine: 'At least some still honor tradition. Perhaps you are not entirely useless.',
        choices: [
          {
            text: 'Ask about the kingdom\'s decline.',
            next: 'noble_decline'
          },
          {
            text: 'Offer assistance to restore order.',
            next: 'noble_help',
            effects: {
              relationship: { value: 10, trust: 5 },
              faction: { nobles: 5 }
            }
          }
        ]
      },
      {
        id: 'noble_greed',
        npcLine: 'How dare you! Insolence such as this would have meant exile in better days.',
        choices: [
          {
            text: 'Apologize.',
            next: 'noble_respect',
            effects: {
              relationship: { value: 5 }
            }
          },
          {
            text: 'Insult their pride.',
            next: 'noble_insult',
            effects: {
              relationship: { value: -20, respect: -10 }
            }
          }
        ]
      },
      {
        id: 'noble_rumor',
        npcLine: 'Rumors? Speak swiftly. We nobles thrive on whispers.',
        choices: [
          {
            text: 'Tell of merchants hoarding relics.',
            next: 'noble_rumor_merchant',
            effects: {
              rumor: {
                subject: 'merchants',
                detail: 'are hoarding precious relics from the kingdom'
              },
              faction: { merchants: -5, nobles: 5 }
            }
          },
          {
            text: 'Tell of guards plotting rebellion.',
            next: 'noble_rumor_guard',
            effects: {
              rumor: {
                subject: 'guards',
                detail: 'are plotting to overthrow the remaining nobility'
              },
              faction: { guards: -5, nobles: 5 }
            }
          }
        ]
      },
      {
        id: 'noble_decline',
        npcLine: 'The Candy Kingdom melted away not by fire, but by rot within. Greed and betrayal—our sweetest poisons.',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      },
      {
        id: 'noble_help',
        npcLine: 'Help? Perhaps… though the throne cannot be rebuilt with words alone.',
        choices: [
          {
            text: 'End conversation.',
            end: true,
            effects: {
              quest: 'restore_throne'
            }
          }
        ]
      },
      {
        id: 'noble_insult',
        npcLine: 'Your tongue will cost you dearly!',
        choices: [
          {
            text: 'Prepare to fight.',
            end: true,
            effects: {
              startCombat: true
            }
          }
        ]
      },
      {
        id: 'noble_rumor_merchant',
        npcLine: 'So the merchants fatten themselves while we starve? This will not be forgotten.',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      },
      {
        id: 'noble_rumor_guard',
        npcLine: 'Guards scheming? Hah! They never had the stomach for politics.',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      }
    ]
  });

  // Guard dialogue tree
  registerDialogueTree('guards', 'candy_kingdom', {
    start: 'guard_intro',
    nodes: [
      {
        id: 'guard_intro',
        npcLine: 'Halt! These ruins are dangerous. State your purpose.',
        choices: [
          {
            text: 'Say you\'re exploring.',
            next: 'guard_explore',
            effects: {
              relationship: { value: 2 }
            }
          },
          {
            text: 'Say you\'re looking for treasure.',
            next: 'guard_suspicious',
            effects: {
              relationship: { value: -5, trust: -5 }
            }
          },
          {
            text: 'Ask about recent trouble.',
            next: 'guard_rumor'
          }
        ]
      },
      {
        id: 'guard_explore',
        npcLine: 'Explorers often end up corpses. Stay near me, and maybe you\'ll last.',
        choices: [
          {
            text: 'Thank them for protection.',
            next: 'guard_friend',
            effects: {
              relationship: { value: 10, trust: 10, respect: 5 },
              faction: { guards: 5 }
            }
          }
        ]
      },
      {
        id: 'guard_suspicious',
        npcLine: 'Treasure-hunters are little better than bandits.',
        choices: [
          {
            text: 'Deny accusation.',
            next: 'guard_explore'
          },
          {
            text: 'Threaten the guard.',
            next: 'guard_fight',
            effects: {
              relationship: { value: -20, fear: 10 }
            }
          }
        ]
      },
      {
        id: 'guard_rumor',
        npcLine: 'Rumors? Too many. Bandits at the gates, nobles scheming, peasants starving. Which do you mean?',
        choices: [
          {
            text: 'Ask about bandits.',
            next: 'guard_bandits'
          },
          {
            text: 'Ask about peasants.',
            next: 'guard_peasants'
          }
        ]
      },
      {
        id: 'guard_friend',
        npcLine: 'Stay sharp. Loyalty is rare; I\'ll remember your gratitude.',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      },
      {
        id: 'guard_fight',
        npcLine: 'You\'ll regret crossing me!',
        choices: [
          {
            text: 'Prepare to fight.',
            end: true,
            effects: {
              startCombat: true
            }
          }
        ]
      },
      {
        id: 'guard_bandits',
        npcLine: 'Bandits breed like flies now that the throne is gone.',
        choices: [
          {
            text: 'End conversation.',
            end: true,
            effects: {
              rumor: {
                subject: 'bandits',
                detail: 'are gathering in large numbers outside the kingdom'
              }
            }
          }
        ]
      },
      {
        id: 'guard_peasants',
        npcLine: 'Peasants riot when they\'re hungry. Keep your distance, or you\'ll catch their anger.',
        choices: [
          {
            text: 'End conversation.',
            end: true,
            effects: {
              rumor: {
                subject: 'peasants',
                detail: 'are planning riots due to food shortages'
              }
            }
          }
        ]
      }
    ]
  });

  // Peasant dialogue tree
  registerDialogueTree('peasants', 'candy_kingdom', {
    start: 'peasant_intro',
    nodes: [
      {
        id: 'peasant_intro',
        npcLine: 'Oh, stranger! Have you food, coin, or kindness to spare?',
        choices: [
          {
            text: 'Give food.',
            next: 'peasant_grateful',
            requires: { item: 'Food' },
            effects: {
              takeItem: 'Food',
              relationship: { value: 20, trust: 15 },
              faction: { peasants: 10 }
            }
          },
          {
            text: 'Give coin.',
            next: 'peasant_grateful',
            requires: { gold: 5 },
            effects: {
              takeGold: 5,
              relationship: { value: 15, trust: 10 },
              faction: { peasants: 5 }
            }
          },
          {
            text: 'Refuse rudely.',
            next: 'peasant_angry',
            effects: {
              relationship: { value: -10 },
              faction: { peasants: -5 }
            }
          },
          {
            text: 'Ask about village rumors.',
            next: 'peasant_rumor'
          }
        ]
      },
      {
        id: 'peasant_grateful',
        npcLine: 'Bless you, stranger! May sweetness return to this land.',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      },
      {
        id: 'peasant_angry',
        npcLine: 'Then may your heart be as empty as our bellies!',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      },
      {
        id: 'peasant_rumor',
        npcLine: 'We whisper of nobles clinging to scraps of power, and guards taking bribes.',
        choices: [
          {
            text: 'End conversation.',
            end: true,
            effects: {
              rumor: {
                subject: 'nobles',
                detail: 'are desperately clinging to their remaining power'
              }
            }
          }
        ]
      }
    ]
  });

  // Merchant dialogue tree
  registerDialogueTree('merchants', 'candy_kingdom', {
    start: 'merchant_intro',
    nodes: [
      {
        id: 'merchant_intro',
        npcLine: 'Fine relics from sweeter days! Care to trade?',
        greedyVariant: 'Ah, another customer! My prices are fair... for those who can afford them!',
        choices: [
          {
            text: 'Inspect wares.',
            next: 'merchant_trade',
            effects: {
              openShop: true
            }
          },
          {
            text: 'Accuse them of hoarding relics.',
            next: 'merchant_accuse',
            effects: {
              relationship: { value: -10, trust: -5 }
            }
          },
          {
            text: 'Ask for rumors.',
            next: 'merchant_rumor'
          }
        ]
      },
      {
        id: 'merchant_trade',
        npcLine: 'All for a price, friend. Gold still speaks sweetest.',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      },
      {
        id: 'merchant_accuse',
        npcLine: 'Hush! Keep such words quiet, or the guards may hear…',
        choices: [
          {
            text: 'Press the accusation.',
            next: 'merchant_angry',
            effects: {
              relationship: { value: -15, trust: -10 },
              faction: { merchants: -10 }
            }
          },
          {
            text: 'Back down.',
            end: true
          }
        ]
      },
      {
        id: 'merchant_rumor',
        npcLine: 'Rumor says nobles seek lost crowns, while peasants seek bread.',
        choices: [
          {
            text: 'End conversation.',
            end: true,
            effects: {
              rumor: {
                subject: 'lost crown',
                detail: 'the lost crown of the Candy Kingdom may still exist'
              }
            }
          }
        ]
      },
      {
        id: 'merchant_angry',
        npcLine: 'I\'ll not have my honor sullied by baseless claims!',
        choices: [
          {
            text: 'End conversation.',
            end: true
          }
        ]
      }
    ]
  });
  
  console.log('Candy Kingdom dialogue trees loaded');
}

// Auto-load on module import
loadCandyKingdomDialogues();