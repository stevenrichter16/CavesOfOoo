// src/js/quests/starchyQuests.js
// Starchy's conspiracy and paranormal quest chains

import { grantQuestItem } from '../items/questItems.js';
import { RelationshipSystem } from '../social/relationship.js';

// Quest definitions for Starchy
export const STARCHY_QUESTS = {
  // Low reputation quest - help with haints
  warding_the_haints: {
    id: "warding_the_haints",
    name: "Warding the Haints",
    giver: "Starchy",
    description: "Get grave salt from Starchy's shed, then sprinkle it on marked graves at night.",
    objectives: [
      { type: "defeat", target: "ghoul", count: 1, description: "Defeat the ghoul in Starchy's shed" },
      { type: "collect", target: "grave_salt", count: 5, description: "Collect the grave salt from the shed" },
      { type: "place", target: "grave_salt", count: 5, description: "Sprinkle grave salt on 5 graves" },
      { type: "collect", target: "whisper_shard", count: 1, description: "Collect a whisper shard as proof" }
    ],
    rewards: {
      gold: 50,
      xp: 30,
      rings: ["peppermint_ward"], // Get to keep one ward as a ring
      reputation: { starchy: 10, peasants: 5 }
    },
    requirements: {
      minRep: 0,
      flags: []
    },
    onStart: (state) => {
      console.log('🎯 [WARDING_QUEST] onStart called!');
      
      // Give player the shed key
      grantQuestItem(state, "starchy_shed_key", 1);
      
      if (state.log) {
        state.log("Starchy: 'Oh my glob! The grave salts are in my shed, but...'", "quest");
        state.log("'A ghoul moved in there! Gives me the heeby jeebies, that thing does!'", "quest");
        state.log("'Here's the key. Get rid of that ghoul and the salts are yours!'", "quest");
        state.log("Starchy gives you his shed key.", "good");
      }
      
      // Mark quest as started for shed interaction
      state.flags = state.flags || {};
      state.flags.warding_quest_started = true;
    },
    onComplete: (state) => {
      if (state.log) {
        state.log("Starchy: 'Oh my glob! You actually did it! The haints are quieter now!'", "quest");
      }
      // Increase Starchy reputation
      RelationshipSystem.modifyRelation("starchy", state.player, {
        value: 10,
        trust: 8,
        reason: "completed_haints_quest"
      });
    }
  },

  // Mid reputation quest - investigate PB's secrets
  grave_discoveries: {
    id: "grave_discoveries",
    name: "Grave Discoveries",
    giver: "Starchy",
    description: "Retrieve evidence of PB's failed experiments from a locked crypt.",
    objectives: [
      { type: "location", target: "candy_kingdom_crypt", description: "Find the Rootbeer mausoleum" },
      { type: "collect", target: "failed_experiment_notes", count: 1, description: "Retrieve the hidden notes" },
      { type: "return", target: "starchy", description: "Return to Starchy without being caught" }
    ],
    rewards: {
      gold: 100,
      xp: 50,
      items: ["conspiracy_evidence"],
      reputation: { starchy: 20, peasants: 10, guards: -5 }
    },
    requirements: {
      minRep: 10,
      flags: []
    },
    onStart: (state) => {
      if (state.log) {
        state.log("Starchy: 'Third row, behind the Rootbeer mausoleum. Don't let the guards see you!'", "quest");
      }
      // Spawn the notes in the crypt if not already there
      // Note: The graveyard populateGraveyard function handles spawning quest items
    },
    onComplete: (state) => {
      if (state.log) {
        state.log("Starchy: 'The truth will out! This proves everything!'", "quest");
      }
      RelationshipSystem.modifyRelation("starchy", state.player, {
        value: 20,
        trust: 15,
        respect: 10,
        reason: "brought_evidence"
      });
      // Set flag for future dialogue options
      state.flags = state.flags || {};
      state.flags.knows_pb_experiments = true;
    }
  },

  // High trust quest - PB's ledger
  pbs_secrets: {
    id: "pbs_secrets",
    name: "Princess Bubblegum's Secrets",
    giver: "Starchy",
    description: "Retrieve PB's secret ledger about disposed candy folk.",
    objectives: [
      { type: "infiltrate", target: "candy_dungeon_archive", description: "Infiltrate the sealed archive" },
      { type: "collect", target: "pb_ledger_plate", count: 1, description: "Find the ledger plate" },
      { type: "choice", description: "Decide who gets the information" }
    ],
    rewards: {
      gold: 200,
      xp: 100,
      items: ["veritas_decoder_ring"],
      reputation: { starchy: 30, peasants: 20, nobles: -15 }
    },
    requirements: {
      minRep: 30,
      flags: ["knows_pb_experiments"]
    },
    onStart: (state) => {
      if (state.log) {
        state.log("Starchy: 'This is big. Real big. The Veritas Brigade is counting on you!'", "quest");
      }
    },
    onComplete: (state, choice) => {
      if (choice === "give_to_starchy") {
        if (state.log) {
          state.log("You give the ledger to Starchy. He promises to broadcast it on Graveyard Shift.", "quest");
        }
        RelationshipSystem.modifyRelation("starchy", state.player, {
          value: 30,
          trust: 25,
          respect: 20,
          reason: "trusted_with_secrets"
        });
        state.flags.veritas_brigade_hero = true;
      } else if (choice === "give_to_pb") {
        if (state.log) {
          state.log("You give the ledger to PB. Starchy will never forgive this betrayal.", "quest");
        }
        RelationshipSystem.modifyRelation("starchy", state.player, {
          value: -100,
          trust: -100,
          respect: -50,
          reason: "betrayed_to_pb"
        });
        // Increase PB faction rep
        state.factionReputation.nobles = (state.factionReputation.nobles || 0) + 20;
      } else if (choice === "keep_yourself") {
        if (state.log) {
          state.log("You keep the ledger for yourself. This could be useful leverage...", "quest");
        }
        grantQuestItem(state, "pb_ledger_plate", 1);
        state.flags.has_pb_blackmail = true;
      }
    }
  },

  // Ultimate conspiracy quest
  sugar_war_protocols: {
    id: "sugar_war_protocols",
    name: "Sugar War Protocols",
    giver: "Starchy",
    description: "Retrieve the blueprints for PB's candy weapons from the sealed archive.",
    objectives: [
      { type: "location", target: "candy_dungeon_depths", description: "Reach the sealed archive" },
      { type: "puzzle", target: "syrup_falls_seal", description: "Solve the syrup falls puzzle" },
      { type: "collect", target: "sugar_war_blueprints", count: 1, description: "Retrieve the blueprints" },
      { type: "survive", description: "Escape the dungeon alive" }
    ],
    rewards: {
      gold: 500,
      xp: 200,
      items: ["veritas_decoder_ring", "conspiracy_evidence"],
      reputation: { starchy: 50, peasants: 30, guards: -20, nobles: -30 }
    },
    requirements: {
      minRep: 50,
      flags: ["veritas_brigade_member"]
    },
    onStart: (state) => {
      if (state.log) {
        state.log("Starchy: 'This is it! The big one! Oh my glob, we're really doing this!'", "quest");
        state.log("Starchy: 'Behind the syrup falls, deep in the dungeon. Be careful!'", "quest");
      }
      // Make dungeon more dangerous
      // TODO: Implement dungeon alert level
    },
    onComplete: (state, choice) => {
      state.flags.has_sugar_war_blueprints = true;
      
      if (choice === "broadcast") {
        if (state.log) {
          state.log("The Sugar War Protocols are broadcast on Graveyard Shift! The kingdom is in uproar!", "quest");
        }
        // Major world event
        // TODO: Implement world event system
        state.flags.exposed_sugar_war = true;
      } else if (choice === "blackmail") {
        if (state.log) {
          state.log("You keep the blueprints as leverage over Princess Bubblegum.", "quest");
        }
        state.flags.blackmailing_pb = true;
      } else if (choice === "destroy") {
        if (state.log) {
          state.log("You destroy the blueprints. Some secrets should stay buried.", "quest");
        }
        RelationshipSystem.modifyRelation("starchy", state.player, {
          value: -20,
          trust: -10,
          reason: "destroyed_evidence"
        });
      }
    }
  },

  // Small side quest - protection from Peppermint Butler
  mint_ward_errand: {
    id: "mint_ward_errand",
    name: "Mint Ward Errand",
    giver: "Starchy",
    description: "Help Starchy make a ward against Peppermint Butler's magic.",
    objectives: [
      { type: "collect", target: "curse_ward_mint", count: 3, description: "Collect 3 curse ward mints" },
      { type: "collect", target: "graveyard_mist_essence", count: 1, description: "Collect graveyard mist" }
    ],
    rewards: {
      gold: 30,
      xp: 20,
      items: ["peppermint_ward", "peppermint_ward"], // Get 2 wards
      reputation: { starchy: 5 }
    },
    requirements: {
      minRep: 5,
      flags: []
    },
    onStart: (state) => {
      if (state.log) {
        state.log("Starchy: 'Need special mints and graveyard mist. Standard anti-demon stuff!'", "quest");
      }
    },
    onComplete: (state) => {
      if (state.log) {
        state.log("Starchy: 'Perfect! These wards should keep Butler's demons at bay. Mostly.'", "quest");
      }
    }
  }
};

// Function to start a Starchy quest
export function startStarchyQuest(state, questId) {
  console.log('🎯 [STARCHY_QUEST] Starting quest:', questId);
  console.log('🎯 [STARCHY_QUEST] State available:', !!state);
  console.log('🎯 [STARCHY_QUEST] Player available:', !!state?.player);
  
  const quest = STARCHY_QUESTS[questId];
  if (!quest) {
    console.error(`Unknown Starchy quest: ${questId}`);
    return false;
  }

  // Check requirements
  const starchyRep = RelationshipSystem.getRelation("starchy", state.player).value;
  if (starchyRep < quest.requirements.minRep) {
    if (state.log) {
      state.log("Starchy: 'I don't trust you enough for that yet!'", "note");
    }
    return false;
  }

  // Check required flags
  if (quest.requirements.flags && quest.requirements.flags.length > 0) {
    const hasAllFlags = quest.requirements.flags.every(flag => 
      state.flags && state.flags[flag]
    );
    if (!hasAllFlags) {
      if (state.log) {
        state.log("You're not ready for this quest yet.", "note");
      }
      return false;
    }
  }

  // Add quest to active quests
  state.activeQuests = state.activeQuests || [];
  console.log('🎯 [STARCHY_QUEST] Active quests before:', state.activeQuests);
  
  state.activeQuests.push({
    ...quest,
    status: "active",
    progress: {}
  });
  
  console.log('🎯 [STARCHY_QUEST] Active quests after:', state.activeQuests);
  console.log('🎯 [STARCHY_QUEST] Quest has onStart?', !!quest.onStart);

  // Call quest start handler
  if (quest.onStart) {
    console.log('🎯 [STARCHY_QUEST] Calling onStart for quest:', questId);
    quest.onStart(state);
    console.log('🎯 [STARCHY_QUEST] onStart completed');
  }

  if (state.log) {
    state.log(`Quest started: ${quest.name}`, "quest");
  }

  return true;
}

// Function to complete a Starchy quest
export function completeStarchyQuest(state, questId, choice) {
  const questIndex = state.activeQuests?.findIndex(q => q.id === questId);
  if (questIndex === -1) return false;

  const quest = state.activeQuests[questIndex];
  
  // Grant rewards
  if (quest.rewards.gold) {
    state.player.gold += quest.rewards.gold;
  }
  if (quest.rewards.xp) {
    state.player.xp += quest.rewards.xp;
  }
  if (quest.rewards.items) {
    quest.rewards.items.forEach(itemId => {
      grantQuestItem(state, itemId, 1);
    });
  }
  if (quest.rewards.rings) {
    quest.rewards.rings.forEach(ringId => {
      // Grant as a ring type item
      grantQuestItem(state, ringId, 1);
    });
  }
  if (quest.rewards.reputation) {
    Object.entries(quest.rewards.reputation).forEach(([faction, amount]) => {
      if (faction === "starchy") {
        RelationshipSystem.modifyRelation("starchy", state.player, {
          value: amount,
          reason: "quest_completion"
        });
      } else {
        state.factionReputation[faction] = (state.factionReputation[faction] || 0) + amount;
      }
    });
  }

  // Call completion handler
  if (quest.onComplete) {
    quest.onComplete(state, choice);
  }

  // Remove from active quests
  state.activeQuests.splice(questIndex, 1);

  if (state.log) {
    state.log(`Quest completed: ${quest.name}`, "quest");
  }

  return true;
}

// Check if player has a Starchy quest
export function hasStarchyQuest(state, questId) {
  return state.activeQuests?.some(q => q.id === questId) || false;
}

// Update quest progress
export function updateStarchyQuestProgress(state, questId, objective, progress) {
  const quest = state.activeQuests?.find(q => q.id === questId);
  if (!quest) return;

  quest.progress[objective] = progress;

  // Check if quest is complete
  const allComplete = quest.objectives.every(obj => 
    quest.progress[obj.target] >= (obj.count || 1)
  );

  if (allComplete) {
    if (state.log) {
      state.log(`Quest ready for turn-in: ${quest.name}`, "quest");
    }
    quest.status = "ready";
  }
}