import { describe, it, expect, beforeEach } from 'vitest';
import { initGame } from '../../../src/js/core/game.js';
import { generateCandyKingdomTownChunk, spawnCandyKingdomNPCs } from '../../../src/js/world/candyKingdomTown.js';
import { NPC } from '../../../src/social/npcEnhanced.js';

describe('Browser Integration - Migration Test', () => {
  let state;
  
  beforeEach(() => {
    // Mock DOM elements that game expects
    global.document = {
      getElementById: () => null,
      addEventListener: () => {},
      querySelector: () => null
    };
    global.window = {
      addEventListener: () => {},
      innerWidth: 800,
      innerHeight: 600
    };
  });

  describe('Full game initialization with migration', () => {
    it('should initialize game with migrated NPCs', () => {
      // Initialize game state
      state = {
        player: {
          id: 'player',
          name: 'Finn',
          x: 24,
          y: 11,
          hp: 100,
          hpMax: 100,
          inventory: [],
          gold: 50,
          quests: { active: [], completed: [] },
          factions: ['player']
        },
        npcs: [],
        cx: 0,
        cy: 0,
        W: 48,
        H: 22,
        turn: 0,
        chunk: null,
        map: null
      };
      
      // Generate chunk
      const chunk = generateCandyKingdomTownChunk('test-seed', 0, 0);
      expect(chunk).toBeDefined();
      expect(chunk.isKingdomTown).toBe(true);
      
      state.chunk = chunk;
      
      // Spawn NPCs
      const npcs = spawnCandyKingdomNPCs(state);
      expect(npcs.length).toBeGreaterThan(20);
      
      // All NPCs should be migrated to NEW format
      state.npcs.forEach(npc => {
        expect(npc).toBeInstanceOf(NPC);
      });
    });

    it('should handle NPC interactions after migration', () => {
      state = {
        player: {
          id: 'player',
          x: 24,
          y: 11,
          inventory: [],
          gold: 100,
          quests: { active: [], completed: [] },
          factions: ['player']
        },
        npcs: [],
        cx: 0,
        cy: 0
      };
      
      spawnCandyKingdomNPCs(state);
      
      // Find a guard
      const guard = state.npcs.find(n => n.faction === 'guards');
      expect(guard).toBeDefined();
      
      // Test dialogue context
      const dialogueContext = guard.toDialogueContext();
      expect(dialogueContext.name).toBeDefined();
      expect(dialogueContext.faction).toBe('guards');
      expect(typeof dialogueContext.hasTrait).toBe('function');
      
      // Test memory system
      expect(guard.memory).toBeDefined();
      expect(guard.memory.events).toBeDefined();
      
      // Test trait system  
      expect(Array.isArray(guard.traits)).toBe(true);
      expect(guard.traits.length).toBeGreaterThan(0);
    });

    it('should handle merchant NPCs correctly', () => {
      state = {
        player: {
          id: 'player',
          x: 24,
          y: 11,
          inventory: [],
          gold: 100
        },
        npcs: [],
        cx: 0,
        cy: 0
      };
      
      spawnCandyKingdomNPCs(state);
      
      // Find merchants
      const merchants = state.npcs.filter(n => n.shopkeeper);
      expect(merchants.length).toBeGreaterThan(5);
      
      merchants.forEach(merchant => {
        expect(merchant).toBeInstanceOf(NPC);
        expect(merchant.shopkeeper).toBe(true);
        expect(merchant.faction).toBe('merchants');
        // Goods should be defined
        expect(merchant.goods).toBeDefined();
      });
    });

    it('should handle world file imports correctly', async () => {
      // Test that other world files also work
      const { spawnForestNPCs } = await import('../../../src/js/world/theForest.js');
      
      state = {
        player: {
          id: 'player',
          x: 10,
          y: 10,
          factions: ['player']
        },
        npcs: [],
        cx: 0,
        cy: -2,
        chunk: {
          isForest: true  // Mark as forest chunk
        }
      };
      
      const forestNPCs = spawnForestNPCs(state);
      expect(forestNPCs).toBeDefined();
      expect(Array.isArray(forestNPCs)).toBe(true);
      
      // All forest NPCs should be NEW format
      forestNPCs.forEach(npc => {
        if (npc) {
          expect(npc).toBeInstanceOf(NPC);
        }
      });
    });

    it('should maintain performance with migrated NPCs', () => {
      state = {
        player: {
          id: 'player',
          x: 24,
          y: 11,
          factions: ['player']
        },
        npcs: [],
        cx: 0,
        cy: 0
      };
      
      const startTime = performance.now();
      
      // Spawn NPCs from multiple chunks
      spawnCandyKingdomNPCs(state);
      
      // Simulate multiple evaluations (as would happen in game loop)
      for (let i = 0; i < 100; i++) {
        state.npcs.forEach(npc => {
          // Simulate checks that happen during gameplay
          npc.evaluateHostilityTo(state.player);
          npc.hasTrait('brave');
          npc.toDialogueContext();
        });
      }
      
      const endTime = performance.now();
      
      // Should complete quickly (under 100ms for 100 iterations)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle save/load cycle', () => {
      state = {
        player: {
          id: 'player',
          x: 24,
          y: 11,
          factions: ['player']
        },
        npcs: [],
        cx: 0,
        cy: 0
      };
      
      spawnCandyKingdomNPCs(state);
      
      // Simulate save
      const saveData = JSON.stringify({
        player: state.player,
        npcs: state.npcs
      });
      
      // Simulate load
      const loadedData = JSON.parse(saveData);
      
      // Convert NPCs back to class instances
      const restoredNPCs = loadedData.npcs.map(npcData => 
        NPC.fromOldFormat(npcData)
      );
      
      // All should be properly restored
      restoredNPCs.forEach((npc, i) => {
        expect(npc).toBeInstanceOf(NPC);
        expect(npc.name).toBe(state.npcs[i].name);
        expect(npc.faction).toBe(state.npcs[i].faction);
        
        // Methods should work
        expect(typeof npc.hasTrait).toBe('function');
        expect(typeof npc.evaluateHostilityTo).toBe('function');
      });
    });
  });
});