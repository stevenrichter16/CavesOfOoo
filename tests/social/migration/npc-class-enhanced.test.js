import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NPC } from '../../../src/social/npcEnhanced.js';
import { NPCMemory } from '../../../src/social/memory.js';
import { NPCTraits } from '../../../src/social/traits.js';

describe('Enhanced NPC Class - Migration from OLD to NEW system', () => {
  describe('Core OLD system features', () => {
    it('should support traits from OLD system', () => {
      const npc = new NPC({
        id: 'test_npc',
        traits: ['brave', 'loyal']
      });
      
      expect(npc.traits).toEqual(['brave', 'loyal']);
      expect(npc.hasTrait('brave')).toBe(true);
      expect(npc.hasTrait('coward')).toBe(false);
    });

    it('should auto-generate traits if not provided', () => {
      const npc = new NPC({
        id: 'test_npc'
      });
      
      expect(npc.traits).toBeDefined();
      expect(Array.isArray(npc.traits)).toBe(true);
      expect(npc.traits.length).toBeGreaterThan(0);
    });

    it('should not generate opposing traits', () => {
      // Test 100 NPCs to ensure no opposing traits
      for (let i = 0; i < 100; i++) {
        const npc = new NPC({
          id: `test_npc_${i}`
        });
        
        // Check common opposing pairs
        expect(!(npc.hasTrait('brave') && npc.hasTrait('coward'))).toBe(true);
        expect(!(npc.hasTrait('proud') && npc.hasTrait('humble'))).toBe(true);
        expect(!(npc.hasTrait('generous') && npc.hasTrait('greedy'))).toBe(true);
      }
    });

    it('should support NPCMemory integration', () => {
      const npc = new NPC({
        id: 'test_npc'
      });
      
      expect(npc.memory).toBeDefined();
      expect(npc.memory).toBeInstanceOf(NPCMemory);
      
      // Test memory functionality
      npc.memory.remember({
        type: 'interaction',
        partner: 'player',
        turn: 100
      });
      
      // NPCMemory stores events
      expect(npc.memory.events).toHaveLength(1);
      expect(npc.memory.events[0].type).toBe('interaction');
      expect(npc.memory.events[0].partner).toBe('player');
    });

    it('should support inventory from OLD system', () => {
      const npc = new NPC({
        id: 'test_npc',
        inventory: [
          { id: 'sword', name: 'Iron Sword', value: 50 }
        ]
      });
      
      expect(npc.inventory).toHaveLength(1);
      expect(npc.inventory[0].name).toBe('Iron Sword');
    });

    it('should support dialogue type for tree lookup', () => {
      const npc = new NPC({
        id: 'guard_1',
        dialogueType: 'banana_guard',
        faction: 'guards'  // Single faction for backward compat
      });
      
      expect(npc.dialogueType).toBe('banana_guard');
      expect(npc.faction).toBe('guards');
      // Should also work with multi-faction
      expect(npc.factions).toContain('guards');
    });

    it('should support shopkeeper properties', () => {
      const npc = new NPC({
        id: 'vendor_1',
        shopkeeper: true,
        goods: [
          { id: 'potion', name: 'Health Potion', price: 20 },
          { id: 'bread', name: 'Bread', price: 5 }
        ]
      });
      
      expect(npc.shopkeeper).toBe(true);
      expect(npc.goods).toHaveLength(2);
      expect(npc.goods[0].name).toBe('Health Potion');
    });

    it('should support quest giver properties', () => {
      const npc = new NPC({
        id: 'quest_giver_1',
        questGiver: true,
        quests: ['sweet_tooth_foxes', 'find_the_gem']
      });
      
      expect(npc.questGiver).toBe(true);
      expect(npc.quests).toHaveLength(2);
      expect(npc.quests).toContain('sweet_tooth_foxes');
    });
  });

  describe('Backward compatibility', () => {
    it('should accept OLD system config format', () => {
      const oldConfig = {
        id: 'old_npc',
        name: 'Old Style NPC',
        x: 10,
        y: 15,
        hp: 20,
        hpMax: 20,
        faction: 'guards',  // Single string
        traits: ['brave'],
        dialogue: true,
        glyph: 'G',
        color: 'yellow'
      };
      
      const npc = new NPC(oldConfig);
      
      expect(npc.id).toBe('old_npc');
      expect(npc.name).toBe('Old Style NPC');
      expect(npc.x).toBe(10);
      expect(npc.y).toBe(15);
      expect(npc.faction).toBe('guards');
      expect(npc.factions).toContain('guards');
      expect(npc.traits).toContain('brave');
      expect(npc.dialogue).toBe(true);
      expect(npc.glyph).toBe('G');
      expect(npc.color).toBe('yellow');
    });

    it('should handle both faction (string) and factions (array)', () => {
      // Old style - single faction
      const oldNpc = new NPC({
        id: 'old',
        faction: 'guards'
      });
      
      expect(oldNpc.faction).toBe('guards');
      expect(oldNpc.factions).toEqual(['guards']);
      
      // New style - multi-faction
      const newNpc = new NPC({
        id: 'new',
        factions: ['guards', 'candy_kingdom']
      });
      
      expect(newNpc.factions).toEqual(['guards', 'candy_kingdom']);
      expect(newNpc.faction).toBe('guards'); // First faction for backward compat
    });

    it('should maintain hasTrait method compatibility', () => {
      const npc = new NPC({
        id: 'test',
        traits: ['brave', 'loyal']
      });
      
      // Method should work exactly like OLD system
      expect(typeof npc.hasTrait).toBe('function');
      expect(npc.hasTrait('brave')).toBe(true);
      expect(npc.hasTrait('loyal')).toBe(true);
      expect(npc.hasTrait('coward')).toBe(false);
    });
  });

  describe('Migration adapter', () => {
    it('should convert OLD initializeNPC result to NPC class', () => {
      // Simulate OLD system NPC object
      const oldNPC = {
        id: 'old_1',
        name: 'Old NPC',
        traits: ['brave'],
        memory: new NPCMemory('old_1'),
        hasTrait: function(trait) {
          return this.traits?.includes(trait);
        },
        faction: 'guards',
        inventory: [],
        hp: 20,
        hpMax: 20,
        x: 5,
        y: 10
      };
      
      // Convert to NEW NPC class
      const newNPC = NPC.fromOldFormat(oldNPC);
      
      expect(newNPC).toBeInstanceOf(NPC);
      expect(newNPC.id).toBe('old_1');
      expect(newNPC.name).toBe('Old NPC');
      expect(newNPC.traits).toContain('brave');
      expect(newNPC.hasTrait('brave')).toBe(true);
      expect(newNPC.faction).toBe('guards');
      expect(newNPC.factions).toContain('guards');
      expect(newNPC.memory).toBeDefined();
    });

    it('should handle spawnSocialNPC replacement', () => {
      const state = {
        npcs: [],
        cx: 0,
        cy: 0
      };
      
      const config = {
        name: 'Test NPC',
        type: 'banana_guard',
        faction: 'guards',
        x: 10,
        y: 10,
        dialogue: true
      };
      
      // New spawn function should return NPC class instance
      const npc = NPC.spawn(state, config);
      
      expect(npc).toBeInstanceOf(NPC);
      expect(npc.name).toBe('Test NPC');
      expect(npc.type).toBe('banana_guard');
      expect(npc.faction).toBe('guards');
      expect(npc.dialogue).toBe(true);
      expect(npc.chunkX).toBe(0);
      expect(npc.chunkY).toBe(0);
      
      // Should be added to state
      expect(state.npcs).toHaveLength(1);
      expect(state.npcs[0]).toBe(npc);
    });
  });

  describe('Dialogue system integration', () => {
    it('should work with dialogueTreesV2 lookup', () => {
      const npc = new NPC({
        id: 'guard_1',
        dialogueType: 'banana_guard',
        faction: 'guards'
      });
      
      // Dialogue system uses this for lookup key
      const lookupType = npc.dialogueType || npc.faction;
      expect(lookupType).toBe('banana_guard');
      
      // Should work with biome for key generation
      const biome = 'candy_kingdom';
      const key = `${biome}:${lookupType}`;
      expect(key).toBe('candy_kingdom:banana_guard');
    });

    it('should support dialogue conditions', () => {
      const npc = new NPC({
        id: 'merchant_1',
        traits: ['greedy'],
        faction: 'merchants',
        inventory: [
          { id: 'gem', name: 'Ruby', value: 100 }
        ]
      });
      
      // Conditions that dialogue system checks
      expect(npc.hasTrait('greedy')).toBe(true);
      expect(npc.faction).toBe('merchants');
      expect(npc.inventory.length).toBeGreaterThan(0);
    });
  });

  describe('UI compatibility', () => {
    it('should work with openNPCInteraction checks', () => {
      const npc = new NPC({
        id: 'test',
        faction: 'guards',
        dialogueType: 'banana_guard',
        dialogue: true
      });
      
      // UI checks these properties
      const hasDialogueTree = (npc.faction && 
        ['nobles', 'guards', 'merchants', 'peasants', 'forest_animals', 'wizards'].includes(npc.faction)) ||
        npc.dialogueType;
      
      expect(hasDialogueTree).toBe(true);
      expect(npc.dialogue).toBe(true);
    });

    it('should support vendor UI properties', () => {
      const npc = new NPC({
        id: 'vendor',
        shopkeeper: true,
        goods: [
          { id: 'potion', name: 'Health Potion', price: 20, count: 5 }
        ]
      });
      
      expect(npc.shopkeeper).toBe(true);
      expect(npc.goods).toBeDefined();
      expect(Array.isArray(npc.goods)).toBe(true);
    });
  });

  describe('Movement system compatibility', () => {
    it('should work with MovementAdapter hostility checks', () => {
      const npc = new NPC({
        id: 'hostile_npc',
        factions: ['bandits'],
        attitude: 'hostile'
      });
      
      const player = {
        factions: ['player'],
        disguise: null
      };
      
      const context = {
        lawLevel: 50,
        kingdomId: 'candy_kingdom'
      };
      
      // Should have evaluateHostilityTo method
      expect(typeof npc.evaluateHostilityTo).toBe('function');
      
      const hostility = npc.evaluateHostilityTo(player, context);
      expect(hostility).toBeDefined();
      expect(typeof hostility.hostile).toBe('boolean');
    });

    it('should maintain position properties', () => {
      const npc = new NPC({
        id: 'test',
        x: 10,
        y: 15,
        chunkX: 2,
        chunkY: -1
      });
      
      expect(npc.x).toBe(10);
      expect(npc.y).toBe(15);
      expect(npc.chunkX).toBe(2);
      expect(npc.chunkY).toBe(-1);
      expect(npc.lastX).toBe(10);
      expect(npc.lastY).toBe(15);
    });
  });
});