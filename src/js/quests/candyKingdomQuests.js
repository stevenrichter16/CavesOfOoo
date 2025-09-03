// Candy Kingdom Quest Implementation System
// Makes all dialogue quests actually completable with spawnable enemies, NPCs, and items

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { spawnSocialNPC } from '../social/index.js';
import { setStoryFlag, getStoryFlag } from '../social/dialogueTreesV2.js';

// Quest definitions with actual gameplay implementation
export const CANDY_KINGDOM_QUESTS = {
  // ========== PUP GANG QUEST ==========
  stop_pup_gang: {
    id: 'stop_pup_gang',
    name: 'Stop the Pup Gang',
    description: 'The notorious Pup Gang is stealing diamonds. Find and defeat them!',
    giver: 'banana_guard',
    objectives: [
      {
        type: 'defeat_enemies',
        enemies: ['pup_gang_leader', 'pup_thug_1', 'pup_thug_2'],
        count: 3,
        current: 0
      }
    ],
    rewards: {
      gold: 100,
      items: ['diamond_shard'],
      reputation: { guards: 20 }
    },
    onStart: (state) => {
      // Spawn Pup Gang near the Candy Convenience Store
      spawnPupGang(state);
      if (state.log) {
        state.log("Quest Started: Stop the Pup Gang! They're near the Candy Convenience Store!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('pup_gang_defeated', true);
      if (state.log) {
        state.log("The Pup Gang has been defeated! Return to the Banana Guard for your reward!", 'good');
      }
    }
  },

  // ========== JAWBREAKER THIEF QUEST ==========
  jawbreaker_thief_case: {
    id: 'jawbreaker_thief_case',
    name: 'The Jawbreaker Thief',
    description: 'Investigate the Candy Orphanage and find the jawbreaker thief',
    giver: 'root_beer_guy',
    objectives: [
      {
        type: 'investigate',
        location: 'candy_orphanage',
        clues_needed: 3,
        clues_found: 0
      },
      {
        type: 'confront',
        npc: 'orphan_thief',
        completed: false
      }
    ],
    rewards: {
      gold: 75,
      items: ['detective_badge', 'jawbreaker_stash'],
      reputation: { merchants: 15 }
    },
    onStart: (state) => {
      // Spawn investigation points and the thief
      spawnOrphanageInvestigation(state);
      if (state.log) {
        state.log("Quest Started: Investigate the Candy Orphanage for clues!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('jawbreaker_thief_caught', true);
      if (state.log) {
        state.log("Mystery solved! The jawbreaker thief has been caught!", 'good');
      }
    }
  },

  // ========== DUNGEON OOZE INVESTIGATION ==========
  investigate_dungeon_level_7: {
    id: 'investigate_dungeon_level_7',
    name: 'Dungeon Ooze Investigation',
    description: 'Investigate the mysterious ooze on level 7 of the Candy Dungeon',
    giver: 'peppermint_butler',
    objectives: [
      {
        type: 'collect',
        item: 'ooze_sample',
        count: 3,
        current: 0
      },
      {
        type: 'defeat_boss',
        boss: 'ooze_monster',
        defeated: false
      }
    ],
    rewards: {
      gold: 200,
      items: ['anti_ooze_charm', 'royal_favor'],
      reputation: { royalty: 30 }
    },
    onStart: (state) => {
      // Spawn ooze creatures and samples in dungeon
      spawnDungeonOoze(state);
      if (state.log) {
        state.log("Quest Started: Enter the Candy Dungeon and investigate level 7!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('dungeon_ooze_solved', true);
      setStoryFlag('pb_audience_earned', true);
      if (state.log) {
        state.log("The ooze source has been eliminated! Princess Bubblegum will want to hear about this!", 'good');
      }
    }
  },

  // ========== CANDY SMUGGLING RING ==========
  candy_smuggling_ring: {
    id: 'candy_smuggling_ring',
    name: 'Candy Smuggling Ring',
    description: 'Investigate illegal rock candy smuggling in the sewers',
    giver: 'root_beer_guy',
    objectives: [
      {
        type: 'find_entrance',
        location: 'sewer_grate',
        found: false
      },
      {
        type: 'defeat_enemies',
        enemies: ['smuggler_boss', 'smuggler_1', 'smuggler_2'],
        count: 3,
        current: 0
      },
      {
        type: 'collect',
        item: 'smuggled_rock_candy',
        count: 5,
        current: 0
      }
    ],
    rewards: {
      gold: 150,
      items: ['rock_candy_sword', 'smuggler_map'],
      reputation: { guards: 10, merchants: 10 }
    },
    onStart: (state) => {
      spawnSmugglers(state);
      if (state.log) {
        state.log("Quest Started: Find the sewer entrance and stop the smugglers!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('smuggling_ring_busted', true);
      if (state.log) {
        state.log("The smuggling ring has been shut down!", 'good');
      }
    }
  },

  // ========== TRAIN BANANA GUARDS ==========
  train_banana_guards: {
    id: 'train_banana_guards',
    name: 'Train the Banana Guards',
    description: 'Help train the Banana Guards to be more effective',
    giver: 'candy_peasant',
    objectives: [
      {
        type: 'training_session',
        guards_trained: 0,
        guards_needed: 3
      },
      {
        type: 'test_combat',
        test_passed: false
      }
    ],
    rewards: {
      gold: 50,
      items: ['banana_guard_insignia', 'training_manual'],
      reputation: { guards: 25 }
    },
    onStart: (state) => {
      spawnTrainingGuards(state);
      if (state.log) {
        state.log("Quest Started: Report to Captain Banana Guard at the barracks!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('guards_trained', true);
      if (state.log) {
        state.log("The Banana Guards are now slightly less incompetent!", 'good');
      }
    }
  },

  // ========== NOBLE'S HEIRLOOM ==========
  noble_heirloom: {
    id: 'noble_heirloom',
    name: "Retrieve the Lemon Crown",
    description: 'Retrieve the stolen Lemon Crown from level 5 of the Candy Dungeon',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'navigate_dungeon',
        level: 5,
        reached: false
      },
      {
        type: 'defeat_boss',
        boss: 'crown_guardian',
        defeated: false
      },
      {
        type: 'collect',
        item: 'lemon_crown',
        count: 1,
        current: 0
      }
    ],
    rewards: {
      gold: 300,
      items: ['noble_seal', 'lemon_charm'],
      reputation: { nobles: 40 }
    },
    onStart: (state) => {
      spawnCrownGuardian(state);
      if (state.log) {
        state.log("Quest Started: Descend to level 5 of the Candy Dungeon!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('noble_sponsor_earned', true);
      if (state.log) {
        state.log("The Lemon Crown has been recovered! Return it to the noble!", 'good');
      }
    }
  },

  // ========== LICH CORRUPTION INVESTIGATION ==========
  investigate_lich_corruption: {
    id: 'investigate_lich_corruption',
    name: 'Investigate Lich Corruption',
    description: 'Investigate signs of the Lich in the deepest dungeon levels',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'collect',
        item: 'lich_essence',
        count: 3,
        current: 0
      },
      {
        type: 'destroy',
        target: 'corruption_crystals',
        count: 5,
        current: 0
      },
      {
        type: 'defeat_boss',
        boss: 'lich_shadow',
        defeated: false
      }
    ],
    rewards: {
      gold: 500,
      items: ['anti_lich_amulet', 'hero_sigil', 'lich_dust'],
      reputation: { royalty: 50, nobles: 30 }
    },
    onStart: (state) => {
      spawnLichCorruption(state);
      if (state.log) {
        state.log("Quest Started: This is extremely dangerous! The Lich's presence awaits in the depths!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('lich_corruption_cleansed', true);
      setStoryFlag('hero_of_candy_kingdom', true);
      if (state.log) {
        state.log("You've weakened the Lich's influence! You're a true hero of the Candy Kingdom!", 'xp');
      }
    }
  },

  // ========== CLEAR CANDY ROT ==========
  clear_candy_rot: {
    id: 'clear_candy_rot',
    name: 'Clear the Candy Rot',
    description: 'Clear the rot spreading from the old cemetery',
    giver: 'candy_peasant',
    objectives: [
      {
        type: 'defeat_enemies',
        enemies: ['rot_zombie_1', 'rot_zombie_2', 'rot_zombie_3'],
        count: 3,
        current: 0
      },
      {
        type: 'destroy',
        target: 'rot_source',
        destroyed: false
      }
    ],
    rewards: {
      gold: 80,
      items: ['protection_charm', 'fresh_candy_seeds'],
      reputation: { peasants: 20 }
    },
    onStart: (state) => {
      spawnCandyRot(state);
      if (state.log) {
        state.log("Quest Started: Head to the cemetery and destroy the rot!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('candy_rot_cleared', true);
      if (state.log) {
        state.log("The candy rot has been cleared! The crops are saved!", 'good');
      }
    }
  },

  // ========== ROCK CANDY TRADE ==========
  rock_candy_trade: {
    id: 'rock_candy_trade',
    name: 'Rock Candy Collection',
    description: 'Collect 5 pieces of rock candy from the caves for the peasant',
    giver: 'candy_peasant',
    objectives: [
      {
        type: 'collect',
        item: 'rock_candy',
        count: 5,
        current: 0
      }
    ],
    rewards: {
      items: ['sugar_crystals_pack'],
      reputation: { peasants: 10 }
    },
    onStart: (state) => {
      spawnRockCandyDeposits(state);
      if (state.log) {
        state.log("Quest Started: Find rock candy in the caves!", 'quest');
      }
    },
    onComplete: (state) => {
      if (state.log) {
        state.log("Rock candy delivered! You receive sugar crystals!", 'good');
      }
    }
  },

  // ========== BANDIT HUNT (Multiple versions) ==========
  bandit_hunt: {
    id: 'bandit_hunt',
    name: 'Hunt the Bandits',
    description: 'Track down bandits raiding caravans in the Licorice Woods',
    giver: 'banana_guard',
    objectives: [
      {
        type: 'find_location',
        location: 'bandit_camp',
        found: false
      },
      {
        type: 'defeat_boss',
        boss: 'bandit_leader',
        defeated: false
      },
      {
        type: 'collect',
        item: 'bandit_mask',
        count: 1,
        current: 0
      }
    ],
    rewards: {
      gold: 50,
      items: ['guard_commendation'],
      reputation: { guards: 15 }
    },
    onStart: (state) => {
      spawnBanditCamp(state);
      if (state.log) {
        state.log("Quest Started: Head to Licorice Woods and find the bandit camp!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('bandits_defeated', true);
      if (state.log) {
        state.log("The bandits have been defeated! The caravans are safe!", 'good');
      }
    }
  },

  noble_bandit_bounty: {
    id: 'noble_bandit_bounty',
    name: 'Noble Bandit Bounty',
    description: 'Hunt the bandit leader for the noble to earn Princess audience',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'defeat_boss',
        boss: 'bandit_leader',
        defeated: false
      },
      {
        type: 'collect',
        item: 'bandit_head',
        count: 1,
        current: 0
      }
    ],
    rewards: {
      items: ['audience_seal'],
      reputation: { nobles: 25 }
    },
    onStart: (state) => {
      spawnBanditCamp(state);
      if (state.log) {
        state.log("Quest Started: Bring back the bandit leader's head!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('princess_audience_granted', true);
      if (state.log) {
        state.log("Impressive! You've earned an audience with Princess Bubblegum!", 'good');
      }
    }
  },

  // ========== NOBLE JEWELS RECOVERY ==========
  noble_jewels: {
    id: 'noble_jewels',
    name: 'Recover Noble Jewels',
    description: 'Retrieve stolen jewels from the bandits',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'defeat_enemies',
        enemies: ['jewel_thief_1', 'jewel_thief_2', 'jewel_thief_3'],
        count: 3,
        current: 0
      },
      {
        type: 'collect',
        item: 'stolen_jewels',
        count: 1,
        current: 0
      }
    ],
    rewards: {
      gold: 200,
      items: ['noble_favor'],
      reputation: { nobles: 30 }
    },
    onStart: (state) => {
      spawnJewelThieves(state);
      if (state.log) {
        state.log("Quest Started: Track down the jewel thieves!", 'quest');
      }
    },
    onComplete: (state) => {
      if (state.log) {
        state.log("The jewels have been recovered! The noble is pleased!", 'good');
      }
    }
  },

  // ========== PROVE TO NOBLES ==========
  prove_to_nobles: {
    id: 'prove_to_nobles',
    name: 'Prove Your Worth',
    description: 'Eliminate the bandit threat to prove yourself to the nobles',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'defeat_enemies',
        enemies: ['bandit_1', 'bandit_2', 'bandit_3', 'bandit_4', 'bandit_5'],
        count: 5,
        current: 0
      },
      {
        type: 'destroy',
        target: 'bandit_supplies',
        count: 3,
        current: 0
      }
    ],
    rewards: {
      gold: 150,
      items: ['noble_recommendation'],
      reputation: { nobles: 20 }
    },
    onStart: (state) => {
      spawnBanditCamp(state);
      if (state.log) {
        state.log("Quest Started: Eliminate the bandit threat completely!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('proven_to_nobles', true);
      if (state.log) {
        state.log("You've proven your worth! The nobles acknowledge you!", 'good');
      }
    }
  },

  // ========== SAVE CANDY KINGDOM (EPIC QUEST) ==========
  save_candy_kingdom: {
    id: 'save_candy_kingdom',
    name: 'Save the Candy Kingdom',
    description: 'Clear dungeons, stop the Lich King, restore order - a hero\'s journey',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'clear_dungeon',
        levels: [1, 2, 3, 4, 5],
        cleared: []
      },
      {
        type: 'defeat_boss',
        boss: 'lich_shadow',
        defeated: false
      },
      {
        type: 'restore_order',
        tasks: ['bandits_defeated', 'pup_gang_defeated', 'dungeon_ooze_solved'],
        completed: []
      }
    ],
    rewards: {
      gold: 1000,
      items: ['hero_crown', 'pb_blessing', 'legendary_candy_sword'],
      reputation: { royalty: 100, nobles: 50, guards: 50, peasants: 50 }
    },
    onStart: (state) => {
      if (state.log) {
        state.log("EPIC QUEST: Save the entire Candy Kingdom from all threats!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('candy_kingdom_hero', true);
      setStoryFlag('pb_eternal_gratitude', true);
      if (state.log) {
        state.log("YOU ARE THE HERO OF THE CANDY KINGDOM! Princess Bubblegum herself honors you!", 'xp');
      }
    }
  },

  // ========== BUTLER'S DARK MAGIC TRAINING ==========
  dark_magic_training: {
    id: 'dark_magic_training',
    name: 'Dark Magic Training',
    description: 'Meet Peppermint Butler at midnight in the castle crypts',
    giver: 'peppermint_butler',
    objectives: [
      {
        type: 'time_based',
        meet_at: 'midnight',
        location: 'castle_crypts',
        met: false
      },
      {
        type: 'ritual',
        components: ['demon_candle', 'shadow_essence', 'blood_chalk'],
        gathered: []
      },
      {
        type: 'summon',
        entity: 'lesser_demon',
        summoned: false
      }
    ],
    rewards: {
      items: ['dark_grimoire', 'shadow_cloak', 'demon_pact'],
      abilities: ['shadow_step', 'minor_curse'],
      reputation: { butler: 50 }
    },
    onStart: (state) => {
      spawnDarkMagicComponents(state);
      if (state.log) {
        state.log("Quest Started: Gather ritual components before midnight!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('dark_magic_apprentice', true);
      if (state.log) {
        state.log("You've learned the dark arts! Use them wisely...", 'dark');
      }
    }
  },

  // ========== BUTLER'S PUP GANG MISSION ==========
  butler_pup_gang: {
    id: 'butler_pup_gang',
    name: 'Capture the Pup Gang (Butler)',
    description: 'Capture the Pup Gang for Peppermint Butler',
    giver: 'peppermint_butler',
    objectives: [
      {
        type: 'capture',
        targets: ['pup_gang_leader', 'pup_thug_1', 'pup_thug_2'],
        captured: []
      }
    ],
    rewards: {
      gold: 100,
      items: ['butler_favor', 'capture_net'],
      reputation: { royalty: 20 }
    },
    onStart: (state) => {
      spawnPupGang(state);
      spawnCaptureItems(state);
      if (state.log) {
        state.log("Quest Started: Capture the Pup Gang alive!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('pup_gang_captured', true);
      if (state.log) {
        state.log("The Pup Gang has been captured and delivered to the dungeon!", 'good');
      }
    }
  },

  // ========== BUTLER'S FOREST INVESTIGATION ==========
  butler_forest_investigation: {
    id: 'butler_forest_investigation',
    name: 'Cotton Candy Forest Investigation',
    description: 'Investigate disturbances in the Cotton Candy Forest',
    giver: 'peppermint_butler',
    objectives: [
      {
        type: 'investigate',
        locations: ['north_grove', 'whispering_trees', 'wolf_den'],
        investigated: []
      },
      {
        type: 'defeat_boss',
        boss: 'alpha_cotton_candy_wolf',
        defeated: false
      },
      {
        type: 'collect',
        item: 'forest_anomaly_sample',
        count: 3,
        current: 0
      }
    ],
    rewards: {
      gold: 175,
      items: ['forest_compass', 'wolf_pelt_cloak'],
      reputation: { royalty: 25 }
    },
    onStart: (state) => {
      spawnForestInvestigation(state);
      if (state.log) {
        state.log("Quest Started: Enter the Cotton Candy Forest and investigate!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('forest_mystery_solved', true);
      if (state.log) {
        state.log("The forest disturbance has been resolved!", 'good');
      }
    }
  },

  // ========== SILENCE RUMORS ==========
  silence_rumors: {
    id: 'silence_rumors',
    name: 'Silence the Rumors',
    description: 'Find and silence whoever is spreading rumors about Princess Bubblegum',
    giver: 'peppermint_butler',
    objectives: [
      {
        type: 'investigate',
        suspects: ['gossipy_noble', 'jealous_merchant', 'disgruntled_guard'],
        questioned: []
      },
      {
        type: 'find_evidence',
        evidence: 'rumor_source_letter',
        found: false
      },
      {
        type: 'confront',
        target: 'rumor_monger',
        confronted: false
      }
    ],
    rewards: {
      gold: 250,
      items: ['silencer_ring', 'blackmail_documents'],
      reputation: { royalty: 40 }
    },
    onStart: (state) => {
      spawnRumorInvestigation(state);
      if (state.log) {
        state.log("Quest Started: Discretely investigate the source of the rumors!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('rumors_silenced', true);
      if (state.log) {
        state.log("The rumors have been silenced. The Princess's reputation is safe!", 'good');
      }
    }
  },

  // ========== NOBLE DEFENSE QUEST ==========
  noble_defense_quest: {
    id: 'noble_defense_quest',
    name: 'Defend the Kingdom',
    description: 'Clear Cotton Candy Wolves from the noble\'s summer estate',
    giver: 'candy_noble',
    objectives: [
      {
        type: 'defeat_enemies',
        enemies: ['cotton_candy_wolf_1', 'cotton_candy_wolf_2', 'cotton_candy_wolf_3', 'cotton_candy_wolf_4'],
        count: 4,
        current: 0
      },
      {
        type: 'secure_location',
        location: 'summer_estate',
        secured: false
      }
    ],
    rewards: {
      gold: 120,
      items: ['estate_key', 'noble_wine'],
      reputation: { nobles: 15 }
    },
    onStart: (state) => {
      spawnCottonCandyWolves(state);
      if (state.log) {
        state.log("Quest Started: Clear the wolves from the summer estate!", 'quest');
      }
    },
    onComplete: (state) => {
      setStoryFlag('estate_cleared', true);
      if (state.log) {
        state.log("The estate is secure! The noble is grateful!", 'good');
      }
    }
  }
};

// ========== ENEMY SPAWNING FUNCTIONS ==========

export function spawnPupGang(state) {
  // Find location near convenience store (chunk 0,1 or nearby)
  const spawnChunkX = 0;
  const spawnChunkY = 1;
  
  // Leader - tougher and drops special loot
  const leader = {
    id: 'pup_gang_leader',
    name: 'Jake Jr. (Pup Leader)',
    type: 'pup_gang',
    x: 10,
    y: 10,
    hp: 60,
    hpMax: 60,
    atk: 8,
    def: 4,
    hostile: true,
    loot: [
      { item: 'stolen_diamonds', chance: 1.0 },
      { item: 'pup_gang_mask', chance: 0.5 },
      { item: 'gold', amount: 50, chance: 1.0 }
    ],
    dialogue: ["Woof! You'll never stop our crime spree!"],
    questTarget: 'stop_pup_gang'
  };
  
  // Thugs
  const thug1 = {
    id: 'pup_thug_1',
    name: 'TV (Pup Thug)',
    type: 'pup_gang',
    x: 8,
    y: 10,
    hp: 40,
    hpMax: 40,
    atk: 6,
    def: 3,
    hostile: true,
    loot: [
      { item: 'candy_corn', chance: 0.3 },
      { item: 'gold', amount: 20, chance: 0.8 }
    ],
    questTarget: 'stop_pup_gang'
  };
  
  const thug2 = {
    id: 'pup_thug_2',
    name: 'Kim Kil Whan (Pup Thug)',
    type: 'pup_gang',
    x: 12,
    y: 10,
    hp: 40,
    hpMax: 40,
    atk: 6,
    def: 3,
    hostile: true,
    loot: [
      { item: 'candy_corn', chance: 0.3 },
      { item: 'gold', amount: 20, chance: 0.8 }
    ],
    questTarget: 'stop_pup_gang'
  };
  
  // Add to appropriate chunk or current if nearby
  if (state.cx === spawnChunkX && state.cy === spawnChunkY) {
    state.chunk.monsters = state.chunk.monsters || [];
    state.chunk.monsters.push(leader, thug1, thug2);
  } else {
    // Store for when player enters that chunk
    state.questSpawns = state.questSpawns || {};
    state.questSpawns[`${spawnChunkX},${spawnChunkY}`] = [leader, thug1, thug2];
  }
}

export function spawnOrphanageInvestigation(state) {
  // Spawn clue items around the orphanage area
  const clues = [
    {
      id: 'clue_candy_wrapper',
      name: 'Suspicious Candy Wrapper',
      type: 'quest_item',
      x: 5,
      y: 15,
      collectable: true,
      description: 'A jawbreaker wrapper with tiny bite marks',
      questTarget: 'jawbreaker_thief_case'
    },
    {
      id: 'clue_tiny_footprints',
      name: 'Tiny Footprints',
      type: 'quest_item',
      x: 7,
      y: 16,
      collectable: true,
      description: 'Small sticky footprints leading to a vent',
      questTarget: 'jawbreaker_thief_case'
    },
    {
      id: 'clue_confession_note',
      name: "Orphan's Confession",
      type: 'quest_item',
      x: 6,
      y: 14,
      collectable: true,
      description: "A note: 'We were just so hungry...'",
      questTarget: 'jawbreaker_thief_case'
    }
  ];
  
  // The actual thief NPC
  const thief = {
    id: 'orphan_thief',
    name: 'Timmy Sweetooth',
    type: 'npc',
    faction: 'neutral',
    dialogueType: 'orphan_thief',
    x: 8,
    y: 17,
    hp: 20,
    hpMax: 20,
    traits: ['hungry', 'guilty'],
    questTarget: 'jawbreaker_thief_case',
    confessionDialogue: [
      "Please don't turn me in!",
      "We were just so hungry, and jawbreakers last so long...",
      "I'll return them all, I promise!"
    ]
  };
  
  // Add to current chunk or store for later
  if (state.chunk) {
    state.chunk.items = state.chunk.items || [];
    state.chunk.items.push(...clues);
    state.npcs = state.npcs || [];
    state.npcs.push(thief);
  }
}

export function spawnDungeonOoze(state) {
  // Ooze samples to collect
  const oozeSamples = [
    {
      id: 'ooze_sample_1',
      name: 'Glowing Green Ooze',
      type: 'quest_item',
      x: 10,
      y: 20,
      collectable: true,
      questTarget: 'investigate_dungeon_level_7'
    },
    {
      id: 'ooze_sample_2',
      name: 'Pulsating Ooze',
      type: 'quest_item',
      x: 15,
      y: 22,
      collectable: true,
      questTarget: 'investigate_dungeon_level_7'
    },
    {
      id: 'ooze_sample_3',
      name: 'Corrupted Ooze',
      type: 'quest_item',
      x: 12,
      y: 25,
      collectable: true,
      questTarget: 'investigate_dungeon_level_7'
    }
  ];
  
  // Ooze creatures
  const oozeCreatures = [
    {
      id: 'ooze_creature_1',
      name: 'Ooze Minion',
      type: 'ooze',
      x: 11,
      y: 21,
      hp: 30,
      hpMax: 30,
      atk: 5,
      def: 2,
      hostile: true,
      statusOnHit: 'slimed'
    },
    {
      id: 'ooze_creature_2',
      name: 'Ooze Minion',
      type: 'ooze',
      x: 14,
      y: 23,
      hp: 30,
      hpMax: 30,
      atk: 5,
      def: 2,
      hostile: true,
      statusOnHit: 'slimed'
    }
  ];
  
  // Boss
  const oozeBoss = {
    id: 'ooze_monster',
    name: 'Mother Ooze',
    type: 'boss',
    x: 13,
    y: 27,
    hp: 150,
    hpMax: 150,
    atk: 12,
    def: 6,
    hostile: true,
    isBoss: true,
    loot: [
      { item: 'ooze_core', chance: 1.0 },
      { item: 'anti_ooze_charm', chance: 0.5 },
      { item: 'gold', amount: 200, chance: 1.0 }
    ],
    questTarget: 'investigate_dungeon_level_7',
    deathDialogue: "The ooze... it came from... deeper... beware..."
  };
  
  // Store for dungeon level 7
  state.dungeonSpawns = state.dungeonSpawns || {};
  state.dungeonSpawns[7] = {
    items: oozeSamples,
    monsters: [...oozeCreatures, oozeBoss]
  };
}

export function spawnSmugglers(state) {
  // Sewer entrance marker
  const sewerEntrance = {
    id: 'sewer_grate',
    name: 'Suspicious Sewer Grate',
    type: 'quest_location',
    x: 18,
    y: 8,
    description: 'A loose grate with fresh scratches. Something goes in and out here.',
    interaction: 'enter_sewers',
    questTarget: 'candy_smuggling_ring'
  };
  
  // Smugglers in the sewers
  const smugglers = [
    {
      id: 'smuggler_boss',
      name: 'Rock Candy Rick',
      type: 'smuggler',
      x: 10,
      y: 10,
      hp: 80,
      hpMax: 80,
      atk: 10,
      def: 5,
      hostile: true,
      loot: [
        { item: 'smuggled_rock_candy', amount: 3, chance: 1.0 },
        { item: 'smuggler_ledger', chance: 1.0 },
        { item: 'gold', amount: 100, chance: 1.0 }
      ],
      questTarget: 'candy_smuggling_ring'
    },
    {
      id: 'smuggler_1',
      name: 'Candy Smuggler',
      type: 'smuggler',
      x: 8,
      y: 9,
      hp: 45,
      hpMax: 45,
      atk: 7,
      def: 3,
      hostile: true,
      loot: [
        { item: 'smuggled_rock_candy', chance: 0.5 },
        { item: 'gold', amount: 30, chance: 0.8 }
      ],
      questTarget: 'candy_smuggling_ring'
    },
    {
      id: 'smuggler_2',
      name: 'Candy Smuggler',
      type: 'smuggler',
      x: 12,
      y: 11,
      hp: 45,
      hpMax: 45,
      atk: 7,
      def: 3,
      hostile: true,
      loot: [
        { item: 'smuggled_rock_candy', chance: 0.5 },
        { item: 'gold', amount: 30, chance: 0.8 }
      ],
      questTarget: 'candy_smuggling_ring'
    }
  ];
  
  // Rock candy stashes
  const stashes = [
    {
      id: 'candy_stash_1',
      name: 'Hidden Rock Candy Stash',
      type: 'container',
      x: 7,
      y: 12,
      loot: [
        { item: 'smuggled_rock_candy', amount: 2, chance: 1.0 }
      ]
    },
    {
      id: 'candy_stash_2',
      name: 'Hidden Rock Candy Stash',
      type: 'container',
      x: 13,
      y: 8,
      loot: [
        { item: 'smuggled_rock_candy', amount: 2, chance: 1.0 }
      ]
    }
  ];
  
  // Add entrance to current area
  if (state.chunk) {
    state.chunk.locations = state.chunk.locations || [];
    state.chunk.locations.push(sewerEntrance);
  }
  
  // Store sewer spawns
  state.sewerSpawns = {
    monsters: smugglers,
    containers: stashes
  };
}

export function spawnTrainingGuards(state) {
  // Captain and training guards
  const captain = {
    id: 'captain_banana_guard',
    name: 'Captain Banana Guard',
    type: 'npc',
    faction: 'guards',
    dialogueType: 'guard_captain',
    x: 15,
    y: 5,
    hp: 60,
    hpMax: 60,
    traits: ['brave', 'experienced'],
    questTarget: 'train_banana_guards',
    trainingDialogue: [
      "Alright recruits! Today we learn not to slip on our own peels!",
      "Step 1: Look where you're walking!",
      "Step 2: If you see a peel, DON'T STEP ON IT!"
    ]
  };
  
  const trainees = [
    {
      id: 'trainee_guard_1',
      name: 'Banana Guard Trainee',
      type: 'npc',
      faction: 'guards',
      x: 14,
      y: 6,
      hp: 30,
      hpMax: 30,
      needsTraining: true,
      questTarget: 'train_banana_guards'
    },
    {
      id: 'trainee_guard_2',
      name: 'Banana Guard Trainee',
      type: 'npc',
      faction: 'guards',
      x: 16,
      y: 6,
      hp: 30,
      hpMax: 30,
      needsTraining: true,
      questTarget: 'train_banana_guards'
    },
    {
      id: 'trainee_guard_3',
      name: 'Banana Guard Trainee',
      type: 'npc',
      faction: 'guards',
      x: 15,
      y: 7,
      hp: 30,
      hpMax: 30,
      needsTraining: true,
      questTarget: 'train_banana_guards'
    }
  ];
  
  // Training dummy for combat test
  const trainingDummy = {
    id: 'training_dummy',
    name: 'Training Dummy',
    type: 'training_target',
    x: 15,
    y: 9,
    hp: 100,
    hpMax: 100,
    atk: 0,
    def: 10,
    passive: true,
    questTarget: 'train_banana_guards'
  };
  
  // Add to barracks area
  state.npcs = state.npcs || [];
  state.npcs.push(captain, ...trainees);
  if (state.chunk) {
    state.chunk.monsters = state.chunk.monsters || [];
    state.chunk.monsters.push(trainingDummy);
  }
}

export function spawnCrownGuardian(state) {
  // Guardian boss on dungeon level 5
  const guardian = {
    id: 'crown_guardian',
    name: 'Crystal Guardian',
    type: 'boss',
    x: 12,
    y: 12,
    hp: 120,
    hpMax: 120,
    atk: 15,
    def: 8,
    hostile: true,
    isBoss: true,
    loot: [
      { item: 'lemon_crown', chance: 1.0 },
      { item: 'crystal_shard', amount: 3, chance: 0.8 },
      { item: 'gold', amount: 150, chance: 1.0 }
    ],
    questTarget: 'noble_heirloom',
    deathDialogue: "The crown... is yours... noble one..."
  };
  
  // Crystal minions
  const minions = [
    {
      id: 'crystal_minion_1',
      name: 'Crystal Minion',
      type: 'crystal',
      x: 10,
      y: 11,
      hp: 40,
      hpMax: 40,
      atk: 8,
      def: 5,
      hostile: true
    },
    {
      id: 'crystal_minion_2',
      name: 'Crystal Minion',
      type: 'crystal',
      x: 14,
      y: 11,
      hp: 40,
      hpMax: 40,
      atk: 8,
      def: 5,
      hostile: true
    }
  ];
  
  // Store for dungeon level 5
  state.dungeonSpawns = state.dungeonSpawns || {};
  state.dungeonSpawns[5] = {
    monsters: [guardian, ...minions]
  };
}

export function spawnLichCorruption(state) {
  // Corruption crystals to destroy
  const crystals = [];
  for (let i = 0; i < 5; i++) {
    crystals.push({
      id: `corruption_crystal_${i}`,
      name: 'Corruption Crystal',
      type: 'destructible',
      x: 8 + i * 2,
      y: 20 + (i % 2) * 3,
      hp: 50,
      hpMax: 50,
      def: 10,
      loot: [
        { item: 'lich_essence', chance: 0.6 }
      ],
      questTarget: 'investigate_lich_corruption',
      onDestroy: () => {
        emit(EventType.Log, { 
          text: "The crystal shatters, releasing dark energy!", 
          cls: 'combat' 
        });
      }
    });
  }
  
  // Lich-corrupted enemies
  const corrupted = [
    {
      id: 'lich_zombie_1',
      name: 'Lich-Touched Candy Person',
      type: 'corrupted',
      x: 10,
      y: 22,
      hp: 60,
      hpMax: 60,
      atk: 10,
      def: 4,
      hostile: true,
      statusOnHit: 'cursed',
      loot: [
        { item: 'lich_essence', chance: 0.3 }
      ]
    },
    {
      id: 'lich_zombie_2',
      name: 'Lich-Touched Candy Person',
      type: 'corrupted',
      x: 14,
      y: 23,
      hp: 60,
      hpMax: 60,
      atk: 10,
      def: 4,
      hostile: true,
      statusOnHit: 'cursed',
      loot: [
        { item: 'lich_essence', chance: 0.3 }
      ]
    }
  ];
  
  // Lich Shadow Boss
  const lichShadow = {
    id: 'lich_shadow',
    name: "The Lich's Shadow",
    type: 'boss',
    x: 12,
    y: 28,
    hp: 250,
    hpMax: 250,
    atk: 20,
    def: 10,
    hostile: true,
    isBoss: true,
    abilities: ['deathwave', 'summon_corrupted', 'life_drain'],
    loot: [
      { item: 'lich_essence', amount: 3, chance: 1.0 },
      { item: 'anti_lich_amulet', chance: 1.0 },
      { item: 'hero_sigil', chance: 1.0 },
      { item: 'lich_dust', amount: 5, chance: 1.0 },
      { item: 'gold', amount: 500, chance: 1.0 }
    ],
    questTarget: 'investigate_lich_corruption',
    introDialogue: "FALL... ALL LIFE MUST END...",
    deathDialogue: "This... is not... the end... The Lich... eternal..."
  };
  
  // Store for deep dungeon level
  state.dungeonSpawns = state.dungeonSpawns || {};
  state.dungeonSpawns[10] = {
    destructibles: crystals,
    monsters: [...corrupted, lichShadow]
  };
}

export function spawnCandyRot(state) {
  // Cemetery location (chunk 1, 0)
  const cemeteryChunkX = 1;
  const cemeteryChunkY = 0;
  
  // Rot zombies
  const rotZombies = [
    {
      id: 'rot_zombie_1',
      name: 'Rotting Candy Corpse',
      type: 'undead',
      x: 8,
      y: 10,
      hp: 35,
      hpMax: 35,
      atk: 6,
      def: 2,
      hostile: true,
      statusOnHit: 'rot',
      questTarget: 'clear_candy_rot'
    },
    {
      id: 'rot_zombie_2',
      name: 'Rotting Candy Corpse',
      type: 'undead',
      x: 10,
      y: 12,
      hp: 35,
      hpMax: 35,
      atk: 6,
      def: 2,
      hostile: true,
      statusOnHit: 'rot',
      questTarget: 'clear_candy_rot'
    },
    {
      id: 'rot_zombie_3',
      name: 'Rotting Candy Corpse',
      type: 'undead',
      x: 12,
      y: 10,
      hp: 35,
      hpMax: 35,
      atk: 6,
      def: 2,
      hostile: true,
      statusOnHit: 'rot',
      questTarget: 'clear_candy_rot'
    }
  ];
  
  // The rot source
  const rotSource = {
    id: 'rot_source',
    name: 'Cursed Grave',
    type: 'destructible',
    x: 10,
    y: 14,
    hp: 100,
    hpMax: 100,
    def: 5,
    description: 'A corrupted grave oozing with candy rot',
    questTarget: 'clear_candy_rot',
    onDestroy: (state) => {
      if (state.log) {
        state.log("The cursed grave crumbles! The rot begins to fade!", 'good');
      }
      // Clear rot status from area
      clearRotFromArea(state, cemeteryChunkX, cemeteryChunkY);
    }
  };
  
  // Add to cemetery chunk or store for later
  if (state.cx === cemeteryChunkX && state.cy === cemeteryChunkY) {
    state.chunk.monsters = state.chunk.monsters || [];
    state.chunk.monsters.push(...rotZombies);
    state.chunk.destructibles = state.chunk.destructibles || [];
    state.chunk.destructibles.push(rotSource);
  } else {
    state.questSpawns = state.questSpawns || {};
    state.questSpawns[`${cemeteryChunkX},${cemeteryChunkY}`] = {
      monsters: rotZombies,
      destructibles: [rotSource]
    };
  }
}

// Helper function to clear rot from area
function clearRotFromArea(state, chunkX, chunkY) {
  // Remove rot status effects
  // Update environment
  setStoryFlag('cemetery_cleansed', true);
}

// ========== ADDITIONAL SPAWNING FUNCTIONS ==========

export function spawnRockCandyDeposits(state) {
  // Spawn in caves (chunk -1, 0)
  const deposits = [
    {
      id: 'rock_candy_deposit_1',
      name: 'Rock Candy Deposit',
      type: 'harvestable',
      x: 5,
      y: 8,
      loot: [{ item: 'rock_candy', amount: 1, chance: 1.0 }],
      respawnTime: 100
    },
    {
      id: 'rock_candy_deposit_2',
      name: 'Rock Candy Deposit',
      type: 'harvestable',
      x: 15,
      y: 10,
      loot: [{ item: 'rock_candy', amount: 1, chance: 1.0 }],
      respawnTime: 100
    },
    {
      id: 'rock_candy_deposit_3',
      name: 'Rock Candy Deposit',
      type: 'harvestable',
      x: 10,
      y: 15,
      loot: [{ item: 'rock_candy', amount: 2, chance: 0.5 }],
      respawnTime: 100
    },
    {
      id: 'rock_candy_deposit_4',
      name: 'Rock Candy Deposit',
      type: 'harvestable',
      x: 8,
      y: 12,
      loot: [{ item: 'rock_candy', amount: 1, chance: 1.0 }],
      respawnTime: 100
    },
    {
      id: 'rock_candy_deposit_5',
      name: 'Rock Candy Deposit',
      type: 'harvestable',
      x: 18,
      y: 6,
      loot: [{ item: 'rock_candy', amount: 1, chance: 1.0 }],
      respawnTime: 100
    }
  ];
  
  state.caveSpawns = {
    harvestables: deposits
  };
}

export function spawnBanditCamp(state) {
  // Licorice Woods (chunk -1, 1)
  const banditLeader = {
    id: 'bandit_leader',
    name: 'Licorice Bandit Chief',
    type: 'boss',
    x: 12,
    y: 12,
    hp: 100,
    hpMax: 100,
    atk: 12,
    def: 6,
    hostile: true,
    isBoss: true,
    loot: [
      { item: 'bandit_mask', chance: 1.0 },
      { item: 'bandit_head', chance: 1.0 },
      { item: 'stolen_goods', chance: 0.8 },
      { item: 'gold', amount: 150, chance: 1.0 }
    ],
    questTarget: ['bandit_hunt', 'noble_bandit_bounty']
  };
  
  const bandits = [];
  for (let i = 1; i <= 5; i++) {
    bandits.push({
      id: `bandit_${i}`,
      name: 'Licorice Bandit',
      type: 'bandit',
      x: 10 + (i % 3) * 2,
      y: 10 + Math.floor(i / 3) * 2,
      hp: 45,
      hpMax: 45,
      atk: 8,
      def: 4,
      hostile: true,
      loot: [
        { item: 'licorice_rope', chance: 0.3 },
        { item: 'gold', amount: 20, chance: 0.7 }
      ],
      questTarget: 'prove_to_nobles'
    });
  }
  
  const banditSupplies = [
    {
      id: 'bandit_supplies_1',
      name: 'Bandit Supply Cache',
      type: 'destructible',
      x: 8,
      y: 14,
      hp: 30,
      hpMax: 30,
      loot: [{ item: 'stolen_goods', chance: 0.5 }],
      questTarget: 'prove_to_nobles'
    },
    {
      id: 'bandit_supplies_2',
      name: 'Bandit Supply Cache',
      type: 'destructible',
      x: 16,
      y: 14,
      hp: 30,
      hpMax: 30,
      loot: [{ item: 'stolen_goods', chance: 0.5 }],
      questTarget: 'prove_to_nobles'
    },
    {
      id: 'bandit_supplies_3',
      name: 'Bandit Supply Cache',
      type: 'destructible',
      x: 12,
      y: 8,
      hp: 30,
      hpMax: 30,
      loot: [{ item: 'stolen_goods', chance: 0.5 }],
      questTarget: 'prove_to_nobles'
    }
  ];
  
  // Camp location marker
  const campMarker = {
    id: 'bandit_camp',
    name: 'Bandit Camp',
    type: 'location',
    x: 12,
    y: 10,
    description: 'A rough camp of licorice bandits',
    questTarget: 'bandit_hunt'
  };
  
  state.licoriceWoodsSpawns = {
    monsters: [banditLeader, ...bandits],
    destructibles: banditSupplies,
    locations: [campMarker]
  };
}

export function spawnJewelThieves(state) {
  const thieves = [
    {
      id: 'jewel_thief_1',
      name: 'Sneaky Pete',
      type: 'thief',
      x: 6,
      y: 8,
      hp: 50,
      hpMax: 50,
      atk: 9,
      def: 3,
      hostile: true,
      abilities: ['smoke_bomb', 'steal'],
      loot: [
        { item: 'stolen_jewels', chance: 0.33 }
      ],
      questTarget: 'noble_jewels'
    },
    {
      id: 'jewel_thief_2',
      name: 'Quick Fingers McGee',
      type: 'thief',
      x: 14,
      y: 10,
      hp: 50,
      hpMax: 50,
      atk: 9,
      def: 3,
      hostile: true,
      abilities: ['smoke_bomb', 'steal'],
      loot: [
        { item: 'stolen_jewels', chance: 0.33 }
      ],
      questTarget: 'noble_jewels'
    },
    {
      id: 'jewel_thief_3',
      name: 'Shadow Sam',
      type: 'thief',
      x: 10,
      y: 12,
      hp: 60,
      hpMax: 60,
      atk: 10,
      def: 4,
      hostile: true,
      abilities: ['smoke_bomb', 'steal', 'vanish'],
      loot: [
        { item: 'stolen_jewels', chance: 1.0 },
        { item: 'thief_tools', chance: 0.5 }
      ],
      questTarget: 'noble_jewels'
    }
  ];
  
  // Add to current chunk or nearby
  if (state.chunk) {
    state.chunk.monsters = state.chunk.monsters || [];
    state.chunk.monsters.push(...thieves);
  }
}

export function spawnDarkMagicComponents(state) {
  // Components scattered around castle area
  const components = [
    {
      id: 'demon_candle',
      name: 'Demon Candle',
      type: 'quest_item',
      x: 5,
      y: 18,
      collectable: true,
      description: 'A black candle that burns with cold flame',
      questTarget: 'dark_magic_training'
    },
    {
      id: 'shadow_essence',
      name: 'Shadow Essence',
      type: 'quest_item',
      x: 15,
      y: 20,
      collectable: true,
      description: 'Condensed darkness in a vial',
      questTarget: 'dark_magic_training'
    },
    {
      id: 'blood_chalk',
      name: 'Blood Chalk',
      type: 'quest_item',
      x: 10,
      y: 22,
      collectable: true,
      description: 'Chalk made from... you don\'t want to know',
      questTarget: 'dark_magic_training'
    }
  ];
  
  // Castle crypts location
  const crypts = {
    id: 'castle_crypts',
    name: 'Castle Crypts',
    type: 'location',
    x: 10,
    y: 25,
    description: 'Dark crypts beneath the Candy Castle',
    interaction: 'enter_crypts',
    questTarget: 'dark_magic_training'
  };
  
  state.castleSpawns = {
    items: components,
    locations: [crypts]
  };
}

export function spawnCaptureItems(state) {
  // Nets for capturing
  const captureNets = [
    {
      id: 'capture_net_1',
      name: 'Capture Net',
      type: 'equipment',
      x: 7,
      y: 5,
      collectable: true,
      use: 'capture_enemy'
    },
    {
      id: 'capture_net_2',
      name: 'Capture Net',
      type: 'equipment',
      x: 13,
      y: 5,
      collectable: true,
      use: 'capture_enemy'
    }
  ];
  
  if (state.chunk) {
    state.chunk.items = state.chunk.items || [];
    state.chunk.items.push(...captureNets);
  }
}

export function spawnForestInvestigation(state) {
  // Cotton Candy Forest (chunk 0, -1)
  const locations = [
    {
      id: 'north_grove',
      name: 'North Grove',
      type: 'investigation_point',
      x: 10,
      y: 5,
      description: 'Strange whispers come from these trees',
      questTarget: 'butler_forest_investigation'
    },
    {
      id: 'whispering_trees',
      name: 'Whispering Trees',
      type: 'investigation_point',
      x: 5,
      y: 10,
      description: 'The cotton candy trees speak secrets',
      questTarget: 'butler_forest_investigation'
    },
    {
      id: 'wolf_den',
      name: 'Wolf Den',
      type: 'investigation_point',
      x: 15,
      y: 15,
      description: 'Home of the Cotton Candy Wolves',
      questTarget: 'butler_forest_investigation'
    }
  ];
  
  const anomalies = [
    {
      id: 'anomaly_1',
      name: 'Strange Growth',
      type: 'harvestable',
      x: 8,
      y: 7,
      loot: [{ item: 'forest_anomaly_sample', chance: 1.0 }],
      questTarget: 'butler_forest_investigation'
    },
    {
      id: 'anomaly_2',
      name: 'Corrupted Tree',
      type: 'harvestable',
      x: 12,
      y: 12,
      loot: [{ item: 'forest_anomaly_sample', chance: 1.0 }],
      questTarget: 'butler_forest_investigation'
    },
    {
      id: 'anomaly_3',
      name: 'Glowing Sap',
      type: 'harvestable',
      x: 17,
      y: 10,
      loot: [{ item: 'forest_anomaly_sample', chance: 1.0 }],
      questTarget: 'butler_forest_investigation'
    }
  ];
  
  const alphawolf = {
    id: 'alpha_cotton_candy_wolf',
    name: 'Alpha Cotton Candy Wolf',
    type: 'boss',
    x: 15,
    y: 17,
    hp: 120,
    hpMax: 120,
    atk: 14,
    def: 7,
    hostile: true,
    isBoss: true,
    abilities: ['howl', 'sugar_rush', 'pack_call'],
    loot: [
      { item: 'alpha_wolf_pelt', chance: 1.0 },
      { item: 'forest_compass', chance: 0.5 },
      { item: 'cotton_candy', amount: 10, chance: 1.0 }
    ],
    questTarget: 'butler_forest_investigation'
  };
  
  state.forestSpawns = {
    locations,
    harvestables: anomalies,
    monsters: [alphawolf]
  };
}

export function spawnRumorInvestigation(state) {
  const suspects = [
    {
      id: 'gossipy_noble',
      name: 'Countess Creampuff',
      type: 'npc',
      faction: 'nobles',
      x: 8,
      y: 6,
      hp: 25,
      hpMax: 25,
      traits: ['gossipy', 'jealous'],
      dialogueType: 'suspect',
      questTarget: 'silence_rumors'
    },
    {
      id: 'jealous_merchant',
      name: 'Sour Sam',
      type: 'npc',
      faction: 'merchants',
      x: 12,
      y: 8,
      hp: 30,
      hpMax: 30,
      traits: ['greedy', 'bitter'],
      dialogueType: 'suspect',
      questTarget: 'silence_rumors'
    },
    {
      id: 'disgruntled_guard',
      name: 'Ex-Guard Bob',
      type: 'npc',
      faction: 'neutral',
      x: 10,
      y: 10,
      hp: 35,
      hpMax: 35,
      traits: ['angry', 'vengeful'],
      dialogueType: 'suspect',
      questTarget: 'silence_rumors'
    }
  ];
  
  const evidence = {
    id: 'rumor_source_letter',
    name: 'Incriminating Letter',
    type: 'quest_item',
    x: 14,
    y: 14,
    collectable: true,
    hidden: true,
    description: 'A letter proving who spread the rumors',
    questTarget: 'silence_rumors'
  };
  
  const rumorMonger = {
    id: 'rumor_monger',
    name: 'The Gossip',
    type: 'npc',
    x: 16,
    y: 16,
    hp: 40,
    hpMax: 40,
    hostile: false,
    dialogueType: 'rumor_monger',
    questTarget: 'silence_rumors'
  };
  
  state.rumorSpawns = {
    npcs: [...suspects, rumorMonger],
    items: [evidence]
  };
}

export function spawnCottonCandyWolves(state) {
  // Summer estate (chunk 2, 0)
  const wolves = [
    {
      id: 'cotton_candy_wolf_1',
      name: 'Cotton Candy Wolf',
      type: 'wolf',
      x: 6,
      y: 8,
      hp: 40,
      hpMax: 40,
      atk: 8,
      def: 3,
      hostile: true,
      abilities: ['bite', 'sugar_rush'],
      loot: [
        { item: 'cotton_candy', chance: 0.5 },
        { item: 'wolf_fang', chance: 0.3 }
      ],
      questTarget: 'noble_defense_quest'
    },
    {
      id: 'cotton_candy_wolf_2',
      name: 'Cotton Candy Wolf',
      type: 'wolf',
      x: 14,
      y: 8,
      hp: 40,
      hpMax: 40,
      atk: 8,
      def: 3,
      hostile: true,
      abilities: ['bite', 'sugar_rush'],
      loot: [
        { item: 'cotton_candy', chance: 0.5 },
        { item: 'wolf_fang', chance: 0.3 }
      ],
      questTarget: 'noble_defense_quest'
    },
    {
      id: 'cotton_candy_wolf_3',
      name: 'Cotton Candy Wolf',
      type: 'wolf',
      x: 10,
      y: 12,
      hp: 40,
      hpMax: 40,
      atk: 8,
      def: 3,
      hostile: true,
      abilities: ['bite', 'sugar_rush'],
      loot: [
        { item: 'cotton_candy', chance: 0.5 },
        { item: 'wolf_fang', chance: 0.3 }
      ],
      questTarget: 'noble_defense_quest'
    },
    {
      id: 'cotton_candy_wolf_4',
      name: 'Cotton Candy Wolf Pack Leader',
      type: 'wolf',
      x: 10,
      y: 6,
      hp: 60,
      hpMax: 60,
      atk: 10,
      def: 4,
      hostile: true,
      abilities: ['bite', 'sugar_rush', 'howl'],
      loot: [
        { item: 'cotton_candy', amount: 3, chance: 0.8 },
        { item: 'wolf_pelt', chance: 0.5 }
      ],
      questTarget: 'noble_defense_quest'
    }
  ];
  
  const estateLocation = {
    id: 'summer_estate',
    name: 'Noble Summer Estate',
    type: 'location',
    x: 10,
    y: 10,
    description: 'A candy mansion overrun by wolves',
    questTarget: 'noble_defense_quest'
  };
  
  state.estateSpawns = {
    monsters: wolves,
    locations: [estateLocation]
  };
}

// ========== QUEST TRACKING FUNCTIONS ==========

export function checkQuestObjective(state, type, target) {
  const activeQuests = state.activeQuests || [];
  
  for (const questId of activeQuests) {
    const quest = CANDY_KINGDOM_QUESTS[questId];
    if (!quest) continue;
    
    for (const objective of quest.objectives) {
      if (objective.type === type) {
        switch (type) {
          case 'defeat_enemies':
            if (objective.enemies.includes(target)) {
              objective.current++;
              if (objective.current >= objective.count) {
                completeObjective(state, questId, objective);
              }
            }
            break;
            
          case 'collect':
            if (objective.item === target) {
              objective.current++;
              if (objective.current >= objective.count) {
                completeObjective(state, questId, objective);
              }
            }
            break;
            
          case 'defeat_boss':
            if (objective.boss === target) {
              objective.defeated = true;
              completeObjective(state, questId, objective);
            }
            break;
            
          case 'destroy':
            if (objective.target === target) {
              objective.current++;
              if (objective.current >= objective.count) {
                completeObjective(state, questId, objective);
              }
            }
            break;
        }
      }
    }
    
    // Check if all objectives complete
    checkQuestCompletion(state, questId);
  }
}

function completeObjective(state, questId, objective) {
  objective.completed = true;
  if (state.log) {
    state.log(`Quest objective completed!`, 'quest');
  }
}

function checkQuestCompletion(state, questId) {
  const quest = CANDY_KINGDOM_QUESTS[questId];
  const allComplete = quest.objectives.every(obj => 
    obj.completed || 
    (obj.count && obj.current >= obj.count) ||
    (obj.defeated === true) ||
    (obj.destroyed === true) ||
    (obj.found === true)
  );
  
  if (allComplete) {
    completeQuest(state, questId);
  }
}

export function completeQuest(state, questId) {
  const quest = CANDY_KINGDOM_QUESTS[questId];
  if (!quest) return;
  
  // Give rewards
  if (quest.rewards.gold) {
    state.player.gold = (state.player.gold || 0) + quest.rewards.gold;
    if (state.log) {
      state.log(`Received ${quest.rewards.gold} gold!`, 'gold');
    }
  }
  
  if (quest.rewards.items) {
    for (const itemId of quest.rewards.items) {
      giveItem(state, itemId);
    }
  }
  
  if (quest.rewards.reputation) {
    for (const [faction, amount] of Object.entries(quest.rewards.reputation)) {
      adjustReputation(state, faction, amount);
    }
  }
  
  // Run completion callback
  if (quest.onComplete) {
    quest.onComplete(state);
  }
  
  // Remove from active quests
  state.activeQuests = state.activeQuests.filter(q => q !== questId);
  state.completedQuests = state.completedQuests || [];
  state.completedQuests.push(questId);
  
  if (state.log) {
    state.log(`Quest Completed: ${quest.name}!`, 'xp');
  }
  
  emit(EventType.QuestCompleted, { questId });
}

export function startQuest(state, questId) {
  const quest = CANDY_KINGDOM_QUESTS[questId];
  if (!quest) return false;
  
  state.activeQuests = state.activeQuests || [];
  if (state.activeQuests.includes(questId)) {
    return false; // Already active
  }
  
  state.activeQuests.push(questId);
  
  // Run start callback
  if (quest.onStart) {
    quest.onStart(state);
  }
  
  emit(EventType.QuestStarted, { questId });
  return true;
}

// Helper functions
function giveItem(state, itemId, quantity = 1) {
  // Import and use the proper quest item granting function
  import('../items/questItems.js').then(module => {
    module.grantQuestItem(state, itemId, quantity);
  }).catch(err => {
    // Fallback if import fails
    console.warn('Failed to import questItems:', err);
    state.player.inventory = state.player.inventory || [];
    state.player.inventory.push({
      type: 'item',
      item: {
        id: itemId,
        name: itemId.replace(/_/g, ' '),
        value: 10
      },
      count: quantity
    });
    
    if (state.log) {
      state.log(`Received ${itemId.replace(/_/g, ' ')}!`, 'item');
    }
  });
}

function adjustReputation(state, faction, amount) {
  state.factionReputation = state.factionReputation || {};
  state.factionReputation[faction] = (state.factionReputation[faction] || 0) + amount;
  
  if (state.log) {
    const sign = amount > 0 ? '+' : '';
    state.log(`${sign}${amount} ${faction} reputation`, amount > 0 ? 'good' : 'bad');
  }
}