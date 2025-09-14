import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NPC } from '../../../src/social/npcEnhanced.js';
import { initializeMigration, spawnSocialNPC } from '../../../src/social/migrationAdapter.js';
import { startDialogue, registerDialogueTree } from '../../../src/js/social/dialogueTreesV2.js';

describe('Migration Integration with Game Systems', () => {
  let state;
  
  beforeEach(() => {
    // Mock game state
    state = {
      player: {
        id: 'player',
        x: 10,
        y: 10,
        inventory: [],
        gold: 100,
        quests: {
          active: ['sweet_tooth_foxes'],
          completed: [],
          progress: { sweet_tooth_foxes: { teeth: 3 } }
        }
      },
      npcs: [],
      cx: 0,
      cy: 0,
      log: vi.fn()
    };
    
    // Initialize migration
    initializeMigration(state);
  });

  describe('NPC spawning with migrated system', () => {
    it('should spawn NPCs as NEW class instances', () => {
      // Use migrated spawn function (same API as OLD)
      const guard = spawnSocialNPC(state, {
        name: 'Banana Guard',
        type: 'banana_guard',
        faction: 'guards',
        x: 15,
        y: 10,
        dialogue: true,
        traits: ['brave', 'loyal']
      });
      
      expect(guard).toBeInstanceOf(NPC);
      expect(guard.name).toBe('Banana Guard');
      expect(guard.faction).toBe('guards');
      expect(guard.hasTrait('brave')).toBe(true);
      expect(state.npcs).toHaveLength(1);
    });

    it('should work with vendor NPCs', () => {
      const vendor = spawnSocialNPC(state, {
        name: 'Candy Merchant',
        faction: 'merchants',
        shopkeeper: true,
        goods: [
          { id: 'candy_apple', name: 'Candy Apple', price: 5 },
          { id: 'lollipop', name: 'Lollipop', price: 3 }
        ],
        traits: ['greedy']
      });
      
      expect(vendor.shopkeeper).toBe(true);
      expect(vendor.goods).toHaveLength(2);
      expect(vendor.hasTrait('greedy')).toBe(true);
    });

    it('should work with quest giver NPCs', () => {
      const questGiver = spawnSocialNPC(state, {
        name: 'Root Beer Guy',
        faction: 'peasants',
        questGiver: true,
        quests: ['find_the_gem', 'delivery_quest'],
        dialogueType: 'quest_giver'
      });
      
      expect(questGiver.questGiver).toBe(true);
      expect(questGiver.quests).toHaveLength(2);
      expect(questGiver.dialogueType).toBe('quest_giver');
    });
  });

  describe('Dialogue system compatibility', () => {
    it('should work with dialogueTreesV2', () => {
      // Register a test dialogue tree
      const tree = {
        biome: 'candy_kingdom',
        npcType: 'banana_guard',
        start: 'greeting',
        nodes: [
          {
            id: 'greeting',
            npcLine: 'Halt! State your business!',
            choices: [
              { text: 'Just passing through', next: 'pass' },
              { text: 'I have a quest', next: 'quest' }
            ]
          },
          {
            id: 'pass',
            npcLine: 'Move along then.',
            end: true
          },
          {
            id: 'quest',
            npcLine: 'Ah, the Sweet Tooth Fox quest!',
            proudVariant: 'Of course, I know all about it!',
            humbleVariant: 'I heard something about that...',
            end: true
          }
        ]
      };
      
      registerDialogueTree(tree.npcType, tree.biome, tree);
      
      // Spawn guard with NEW system
      const guard = spawnSocialNPC(state, {
        name: 'Test Guard',
        type: 'banana_guard',
        faction: 'guards',
        traits: ['proud'],
        dialogue: true
      });
      
      // Start dialogue
      const node = startDialogue(state, state.player, guard, 'candy_kingdom');
      
      expect(node).toBeDefined();
      expect(node.npcLine).toBe('Halt! State your business!');
      expect(node.choices).toHaveLength(2);
    });

    it('should support dialogue conditions with NEW NPCs', () => {
      const merchant = spawnSocialNPC(state, {
        name: 'Merchant',
        faction: 'merchants',
        traits: ['greedy'],
        inventory: [
          { id: 'gem', value: 100 }
        ]
      });
      
      // Test hasTrait condition
      expect(merchant.hasTrait('greedy')).toBe(true);
      
      // Test inventory condition
      expect(merchant.inventory.length).toBeGreaterThan(0);
      
      // Test faction condition
      expect(merchant.faction).toBe('merchants');
    });
  });

  describe('Movement system compatibility', () => {
    it('should work with hostile NPCs', () => {
      const bandit = spawnSocialNPC(state, {
        name: 'Bandit',
        factions: ['bandits'],
        attitude: 'hostile',
        x: 11,
        y: 10
      });
      
      // Should have hostility evaluation
      expect(typeof bandit.evaluateHostilityTo).toBe('function');
      
      // Player needs factions for hostility evaluation
      const playerEntity = {
        ...state.player,
        factions: ['player']
      };
      
      const hostility = bandit.evaluateHostilityTo(playerEntity, {
        lawLevel: 50,
        kingdomId: 'candy_kingdom'
      });
      
      expect(hostility.hostile).toBeDefined();
    });

    it('should maintain position properties', () => {
      const npc = spawnSocialNPC(state, {
        name: 'Positioned NPC',
        x: 5,
        y: 7
      });
      
      expect(npc.x).toBe(5);
      expect(npc.y).toBe(7);
      expect(npc.chunkX).toBe(0);
      expect(npc.chunkY).toBe(0);
    });
  });

  describe('Mixed OLD and NEW NPCs', () => {
    it('should handle mixed NPCs in state', () => {
      // Add OLD format NPC directly
      state.npcs.push({
        id: 'old_npc',
        name: 'Old Format',
        faction: 'peasants',
        traits: ['humble'],
        hasTrait: function(t) { return this.traits?.includes(t); }
      });
      
      // Add NEW NPC via spawn
      spawnSocialNPC(state, {
        name: 'New Format',
        faction: 'guards'
      });
      
      // Both should be NPC instances after push
      expect(state.npcs).toHaveLength(2);
      expect(state.npcs[0]).toBeInstanceOf(NPC);
      expect(state.npcs[1]).toBeInstanceOf(NPC);
      
      // Data should be preserved
      expect(state.npcs[0].name).toBe('Old Format');
      expect(state.npcs[0].hasTrait('humble')).toBe(true);
      expect(state.npcs[1].name).toBe('New Format');
    });
  });

  describe('Quest system integration', () => {
    it('should work with quest turn-in conditions', () => {
      // Spawn Banana Guard for quest turn-in
      const guard = spawnSocialNPC(state, {
        name: 'Quest Guard',
        type: 'banana_guard',
        faction: 'guards',
        dialogue: true
      });
      
      // Add teeth to inventory
      state.player.inventory = [{
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        count: 5
      }];
      
      // Guard should work with dialogue conditions
      expect(guard.dialogue).toBe(true);
      expect(guard.type).toBe('banana_guard');
      
      // Lookup key for dialogue should work
      const biome = 'candy_kingdom';
      const lookupType = guard.dialogueType || guard.type || guard.faction;
      const key = `${biome}:${lookupType}`;
      expect(key).toBe('candy_kingdom:banana_guard');
    });
  });

  describe('UI compatibility', () => {
    it('should work with openNPCInteraction checks', () => {
      const npc = spawnSocialNPC(state, {
        name: 'UI Test NPC',
        faction: 'guards',
        dialogueType: 'special_guard',
        dialogue: true
      });
      
      // Check conditions UI uses
      const hasDialogueTree = (npc.faction && 
        ['nobles', 'guards', 'merchants', 'peasants', 'forest_animals', 'wizards'].includes(npc.faction)) ||
        npc.dialogueType;
      
      expect(hasDialogueTree).toBe(true);
      expect(npc.dialogue).toBe(true);
    });

    it('should work with shop UI', () => {
      const vendor = spawnSocialNPC(state, {
        name: 'Shop Vendor',
        shopkeeper: true,
        goods: [
          { id: 'item1', name: 'Item 1', price: 10, count: 5 }
        ]
      });
      
      expect(vendor.shopkeeper).toBe(true);
      expect(Array.isArray(vendor.goods)).toBe(true);
      expect(vendor.goods[0].price).toBe(10);
    });
  });

  describe('Save/Load compatibility', () => {
    it('should serialize and deserialize NPCs', () => {
      const npc = spawnSocialNPC(state, {
        name: 'Saveable NPC',
        faction: 'merchants',
        traits: ['greedy', 'gossip'],
        inventory: [{ id: 'gold', value: 50 }],
        dialogue: true
      });
      
      // Simulate save
      const serialized = JSON.stringify(npc);
      const deserialized = JSON.parse(serialized);
      
      // Convert back to NPC
      const restored = NPC.fromOldFormat(deserialized);
      
      expect(restored).toBeInstanceOf(NPC);
      expect(restored.name).toBe('Saveable NPC');
      expect(restored.hasTrait('greedy')).toBe(true);
      expect(restored.inventory).toHaveLength(1);
    });
  });
});