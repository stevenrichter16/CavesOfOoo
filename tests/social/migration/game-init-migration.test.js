import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeMigration } from '../../../src/social/migrationAdapter.js';
import { NPC } from '../../../src/social/npcEnhanced.js';

describe('Game Initialization with Migration', () => {
  let state;
  let mockLog;

  beforeEach(() => {
    // Reset console mocks
    vi.restoreAllMocks();
    
    mockLog = vi.fn();
    
    // Mock initial game state
    state = {
      player: {
        id: 'player',
        x: 10,
        y: 10,
        hp: 100,
        hpMax: 100,
        inventory: [],
        gold: 50,
        quests: { active: [], completed: [], progress: {} }
      },
      npcs: [],
      cx: 0,
      cy: 0,
      W: 40,
      H: 20,
      log: mockLog,
      turn: 0
    };
  });

  describe('initializeMigration function', () => {
    it('should initialize migration adapter', () => {
      const adapter = initializeMigration(state);
      
      expect(adapter).toBeDefined();
      expect(adapter.getMigrationProgress).toBeDefined();
      expect(adapter.getMigrationProgress().count).toBe(0);
    });

    it('should convert existing OLD format NPCs on initialization', () => {
      // Add OLD format NPCs to state
      state.npcs = [
        {
          id: 'old_guard',
          name: 'Old Guard',
          faction: 'guards',
          traits: ['brave'],
          hasTrait: function(t) { return this.traits?.includes(t); }
        },
        {
          id: 'old_merchant',
          name: 'Old Merchant',
          faction: 'merchants',
          shopkeeper: true,
          goods: []
        }
      ];
      
      const consoleSpy = vi.spyOn(console, 'log');
      initializeMigration(state);
      
      // All NPCs should be converted to NEW format
      expect(state.npcs[0]).toBeInstanceOf(NPC);
      expect(state.npcs[1]).toBeInstanceOf(NPC);
      
      // Data should be preserved
      expect(state.npcs[0].name).toBe('Old Guard');
      expect(state.npcs[0].hasTrait('brave')).toBe(true);
      expect(state.npcs[1].shopkeeper).toBe(true);
      
      // Should log conversion
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Converting 2 OLD format NPCs')
      );
    });

    it('should not convert NPCs that are already NEW format', () => {
      // Add mix of OLD and NEW NPCs
      const newNPC = new NPC({
        id: 'new_npc',
        name: 'Already New'
      });
      
      state.npcs = [
        newNPC,
        {
          id: 'old_npc',
          name: 'Old NPC',
          faction: 'peasants'
        }
      ];
      
      initializeMigration(state);
      
      // First should be same instance
      expect(state.npcs[0]).toBe(newNPC);
      // Second should be converted
      expect(state.npcs[1]).toBeInstanceOf(NPC);
      expect(state.npcs[1].id).toBe('old_npc');
    });

    it('should handle empty npcs array', () => {
      state.npcs = [];
      
      const adapter = initializeMigration(state);
      
      expect(adapter).toBeDefined();
      // The array may have a custom push method but should still be empty
      expect(state.npcs.length).toBe(0);
    });

    it('should handle missing npcs array', () => {
      delete state.npcs;
      
      const adapter = initializeMigration(state);
      
      expect(adapter).toBeDefined();
      expect(state.npcs).toBeUndefined();
    });

    it('should override array.push to auto-convert OLD NPCs', () => {
      initializeMigration(state);
      
      // Push OLD format NPC
      state.npcs.push({
        id: 'pushed_npc',
        name: 'Pushed NPC',
        faction: 'guards',
        dialogue: true
      });
      
      // Should be auto-converted
      expect(state.npcs[0]).toBeInstanceOf(NPC);
      expect(state.npcs[0].name).toBe('Pushed NPC');
      expect(state.npcs[0].dialogue).toBe(true);
    });

    it('should not double-convert when pushing NEW NPCs', () => {
      initializeMigration(state);
      
      const newNPC = new NPC({
        id: 'new_push',
        name: 'New Push'
      });
      
      state.npcs.push(newNPC);
      
      // Should be same instance
      expect(state.npcs[0]).toBe(newNPC);
    });
  });

  describe('Game state after migration', () => {
    it('should maintain game functionality after migration', () => {
      // Add some OLD NPCs
      state.npcs = [
        {
          id: 'guard1',
          name: 'Guard 1',
          faction: 'guards',
          x: 5,
          y: 5,
          hp: 20,
          dialogue: true
        }
      ];
      
      initializeMigration(state);
      
      // Check NPC is accessible and functional
      const guard = state.npcs[0];
      expect(guard.name).toBe('Guard 1');
      expect(guard.x).toBe(5);
      expect(guard.y).toBe(5);
      expect(guard.hp).toBe(20);
      expect(guard.dialogue).toBe(true);
      
      // Check methods work
      expect(typeof guard.hasTrait).toBe('function');
      expect(typeof guard.evaluateHostilityTo).toBe('function');
    });

    it('should work with spawn functions after migration', async () => {
      initializeMigration(state);
      
      // Import migrated spawn function
      const { spawnSocialNPC } = await import('../../../src/social/migrationAdapter.js');
      
      const npc = spawnSocialNPC(state, {
        name: 'Post-Migration NPC',
        faction: 'merchants'
      });
      
      expect(npc).toBeInstanceOf(NPC);
      expect(state.npcs).toHaveLength(1);
      expect(state.npcs[0]).toBe(npc);
    });
  });

  describe('Performance considerations', () => {
    it('should use WeakMap cache for conversions', () => {
      // Add same OLD NPC multiple times (simulating multiple conversions)
      const oldNPC = {
        id: 'cached_npc',
        name: 'Cached NPC',
        faction: 'peasants'
      };
      
      state.npcs = [oldNPC];
      
      const adapter = initializeMigration(state);
      const firstConverted = state.npcs[0];
      
      // Manually trigger another conversion
      adapter.migrateState(state);
      const secondConverted = state.npcs[0];
      
      // Should be same instance (cached)
      expect(firstConverted).toBe(secondConverted);
    });

    it('should handle large numbers of NPCs efficiently', () => {
      // Create many OLD format NPCs
      const npcCount = 100;
      state.npcs = [];
      
      for (let i = 0; i < npcCount; i++) {
        state.npcs.push({
          id: `npc_${i}`,
          name: `NPC ${i}`,
          faction: ['guards', 'merchants', 'peasants'][i % 3],
          x: i % 40,
          y: Math.floor(i / 40)
        });
      }
      
      const startTime = performance.now();
      initializeMigration(state);
      const endTime = performance.now();
      
      // All should be converted
      expect(state.npcs.every(npc => npc instanceof NPC)).toBe(true);
      
      // Should be reasonably fast (less than 100ms for 100 NPCs)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Error handling', () => {
    it('should handle corrupt NPC data gracefully', () => {
      state.npcs = [
        null,
        undefined,
        {},  // Empty object
        { id: 'valid', name: 'Valid NPC' },
        'invalid',  // Wrong type
        123  // Wrong type
      ];
      
      // Should not throw
      expect(() => initializeMigration(state)).not.toThrow();
      
      // Valid NPCs should be converted (only the one with id and name)
      const validNPCs = state.npcs.filter(npc => npc instanceof NPC);
      expect(validNPCs).toHaveLength(1); // Only the valid one, empty object is filtered out
    });

    it('should handle circular references in NPCs', () => {
      const circularNPC = {
        id: 'circular',
        name: 'Circular NPC'
      };
      circularNPC.self = circularNPC; // Circular reference
      
      state.npcs = [circularNPC];
      
      // Should not cause infinite loop
      expect(() => initializeMigration(state)).not.toThrow();
      
      // Should still convert
      expect(state.npcs[0]).toBeInstanceOf(NPC);
    });
  });
});