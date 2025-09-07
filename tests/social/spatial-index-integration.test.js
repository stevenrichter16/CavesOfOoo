import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { SpatialIndex } from '../../src/social/movement/SpatialIndex.js';
import { W, H } from '../../src/js/core/config.js';

describe('Spatial Index Integration with MovementPipeline', () => {
  let pipeline;
  let eventBus;
  let state;
  let player;
  
  beforeEach(() => {
    eventBus = new EventBus();
    pipeline = new MovementPipeline(eventBus);
    
    player = {
      x: 5,
      y: 5,
      hp: 100,
      name: 'Finn',
      inventory: []
    };
    
    const map = Array(H).fill(null).map(() => Array(W).fill('.'));
    
    state = {
      player: player,
      cx: 0,
      cy: 0,
      chunk: {
        map: map,
        getTile: function(x, y) {
          if (y >= 0 && y < this.map.length && x >= 0 && x < this.map[0].length) {
            return this.map[y][x];
          }
          return '#';
        }
      },
      npcs: [],
      npcSpatialIndex: null, // Will be initialized in tests
      log: vi.fn()
    };
  });
  
  describe('MovementPipeline with Spatial Index', () => {
    it('should use spatial index when available', async () => {
      // Create spatial index
      state.npcSpatialIndex = new SpatialIndex();
      
      // Create and add NPC
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0,
        factions: ['candy_citizens']
      });
      
      state.npcs.push(npc);
      state.npcSpatialIndex.add(npc);
      
      // Spy on spatial index getAt method
      const getAtSpy = vi.spyOn(state.npcSpatialIndex, 'getAt');
      
      // Try to move into NPC
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(state, action);
      
      // Should have used spatial index
      expect(getAtSpy).toHaveBeenCalledWith(6, 5, expect.objectContaining({
        minHp: 1,
        chunkX: 0,
        chunkY: 0
      }));
      
      // Should have detected NPC
      expect(result.success).toBe(false);
      expect(result.reason).toBe('NPC interaction');
    });
    
    it('should fall back to linear search when spatial index not available', async () => {
      // No spatial index
      state.npcSpatialIndex = null;
      
      // Create and add NPC
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0,
        factions: ['candy_citizens']
      });
      
      state.npcs.push(npc);
      
      // Try to move into NPC
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(state, action);
      
      // Should still detect NPC using array search
      expect(result.success).toBe(false);
      expect(result.reason).toBe('NPC interaction');
    });
    
    it('should handle multiple NPCs at same position', async () => {
      state.npcSpatialIndex = new SpatialIndex();
      
      // Create two NPCs at same position
      const npc1 = new NPC({
        id: 'npc1',
        name: 'NPC 1',
        x: 6,
        y: 5,
        hp: 0, // Dead
        chunkX: 0,
        chunkY: 0,
        factions: ['test']
      });
      
      const npc2 = new NPC({
        id: 'npc2',
        name: 'NPC 2',
        x: 6,
        y: 5,
        hp: 100, // Alive
        chunkX: 0,
        chunkY: 0,
        factions: ['test']
      });
      
      state.npcs.push(npc1, npc2);
      state.npcSpatialIndex.add(npc1);
      state.npcSpatialIndex.add(npc2);
      
      // Try to move into NPCs
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(state, action);
      
      // Should interact with alive NPC only
      expect(result.success).toBe(false);
      expect(result.reason).toBe('NPC interaction');
    });
  });
  
  describe('State Initialization with Spatial Index', () => {
    it('should initialize spatial index when creating state', async () => {
      // Import initialization function
      const { initializeStateWithSpatialIndex } = await import('../../src/social/movement/StateInitializer.js');
      
      const initialState = {
        npcs: [
          new NPC({ id: '1', x: 1, y: 1, hp: 100, factions: ['test'] }),
          new NPC({ id: '2', x: 2, y: 2, hp: 100, factions: ['test'] }),
          new NPC({ id: '3', x: 3, y: 3, hp: 100, factions: ['test'] })
        ]
      };
      
      const enhancedState = initializeStateWithSpatialIndex(initialState);
      
      // Should have spatial index
      expect(enhancedState.npcSpatialIndex).toBeDefined();
      expect(enhancedState.npcSpatialIndex).toBeInstanceOf(SpatialIndex);
      
      // Should have indexed all NPCs
      expect(enhancedState.npcSpatialIndex.getAt(1, 1)).toBe(initialState.npcs[0]);
      expect(enhancedState.npcSpatialIndex.getAt(2, 2)).toBe(initialState.npcs[1]);
      expect(enhancedState.npcSpatialIndex.getAt(3, 3)).toBe(initialState.npcs[2]);
    });
    
    it('should add hooks for NPC management', async () => {
      const { initializeStateWithSpatialIndex } = await import('../../src/social/movement/StateInitializer.js');
      
      const state = initializeStateWithSpatialIndex({ npcs: [] });
      
      // Should have NPC management methods
      expect(state.addNPC).toBeDefined();
      expect(state.removeNPC).toBeDefined();
      expect(state.moveNPC).toBeDefined();
      
      // Test addNPC
      const npc = new NPC({ id: 'test', x: 5, y: 5, hp: 100, factions: ['test'] });
      state.addNPC(npc);
      
      expect(state.npcs).toContain(npc);
      expect(state.npcSpatialIndex.getAt(5, 5)).toBe(npc);
      
      // Test moveNPC
      state.moveNPC(npc, 10, 10);
      
      expect(npc.x).toBe(10);
      expect(npc.y).toBe(10);
      expect(state.npcSpatialIndex.getAt(5, 5)).toBeNull();
      expect(state.npcSpatialIndex.getAt(10, 10)).toBe(npc);
      
      // Test removeNPC
      state.removeNPC(npc);
      
      expect(state.npcs).not.toContain(npc);
      expect(state.npcSpatialIndex.getAt(10, 10)).toBeNull();
    });
  });
  
  describe('NPC Movement Updates', () => {
    it('should update spatial index when NPC moves', async () => {
      const { initializeStateWithSpatialIndex } = await import('../../src/social/movement/StateInitializer.js');
      
      const npc = new NPC({ id: 'mobile', x: 5, y: 5, hp: 100, factions: ['test'] });
      const state = initializeStateWithSpatialIndex({ npcs: [npc] });
      
      // Initial position
      expect(state.npcSpatialIndex.getAt(5, 5)).toBe(npc);
      
      // Move NPC
      state.moveNPC(npc, 8, 8);
      
      // Should update index
      expect(state.npcSpatialIndex.getAt(5, 5)).toBeNull();
      expect(state.npcSpatialIndex.getAt(8, 8)).toBe(npc);
    });
    
    it('should handle NPC death', async () => {
      const { initializeStateWithSpatialIndex } = await import('../../src/social/movement/StateInitializer.js');
      
      const npc = new NPC({ id: 'mortal', x: 5, y: 5, hp: 100, factions: ['test'] });
      const state = initializeStateWithSpatialIndex({ npcs: [npc] });
      
      // NPC is alive
      expect(state.npcSpatialIndex.getAt(5, 5, { minHp: 1 })).toBe(npc);
      
      // Kill NPC
      npc.hp = 0;
      state.updateNPCHealth(npc);
      
      // Should still be in index but filtered by hp
      expect(state.npcSpatialIndex.getAt(5, 5)).toBe(npc);
      expect(state.npcSpatialIndex.getAt(5, 5, { minHp: 1 })).toBeNull();
    });
  });
  
  describe('Performance Comparison', () => {
    it('should be faster than linear search with many NPCs', async () => {
      // Create many NPCs
      const npcCount = 100;
      state.npcs = [];
      state.npcSpatialIndex = new SpatialIndex();
      
      for (let i = 0; i < npcCount; i++) {
        const npc = new NPC({
          id: `npc_${i}`,
          name: `NPC ${i}`,
          x: Math.floor(Math.random() * W),
          y: Math.floor(Math.random() * H),
          hp: 100,
          chunkX: 0,
          chunkY: 0,
          factions: ['test']
        });
        state.npcs.push(npc);
        state.npcSpatialIndex.add(npc);
      }
      
      // Place one NPC at target position
      const targetNPC = new NPC({
        id: 'target',
        name: 'Target',
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0,
        factions: ['test']
      });
      state.npcs.push(targetNPC);
      state.npcSpatialIndex.add(targetNPC);
      
      // Measure time for movement check
      const start = performance.now();
      
      const action = { type: 'move', dx: 1, dy: 0 };
      await pipeline.execute(state, action);
      
      const duration = performance.now() - start;
      
      // Should be very fast even with many NPCs
      expect(duration).toBeLessThan(10); // Less than 10ms
      
      // Check spatial index stats
      const stats = state.npcSpatialIndex.getStats();
      expect(stats.lookups).toBeGreaterThan(0);
      console.log('Spatial index stats:', stats);
    });
  });
  
  describe('Chunk Transitions', () => {
    it('should handle chunk transitions with spatial index', async () => {
      const { initializeStateWithSpatialIndex } = await import('../../src/social/movement/StateInitializer.js');
      
      // Create NPCs in different chunks
      const chunk0NPCs = [
        new NPC({ id: 'c0_1', x: 5, y: 5, hp: 100, chunkX: 0, chunkY: 0, factions: ['test'] }),
        new NPC({ id: 'c0_2', x: 10, y: 10, hp: 100, chunkX: 0, chunkY: 0, factions: ['test'] })
      ];
      
      const chunk1NPCs = [
        new NPC({ id: 'c1_1', x: 5, y: 5, hp: 100, chunkX: 1, chunkY: 0, factions: ['test'] }),
        new NPC({ id: 'c1_2', x: 10, y: 10, hp: 100, chunkX: 1, chunkY: 0, factions: ['test'] })
      ];
      
      const state = initializeStateWithSpatialIndex({
        npcs: [...chunk0NPCs, ...chunk1NPCs],
        cx: 0,
        cy: 0
      });
      
      // Should find NPCs in current chunk
      const npcsInChunk0 = state.npcSpatialIndex.getInChunk(0, 0);
      expect(npcsInChunk0).toHaveLength(2);
      expect(npcsInChunk0).toEqual(expect.arrayContaining(chunk0NPCs));
      
      // Should find NPCs in other chunk
      const npcsInChunk1 = state.npcSpatialIndex.getInChunk(1, 0);
      expect(npcsInChunk1).toHaveLength(2);
      expect(npcsInChunk1).toEqual(expect.arrayContaining(chunk1NPCs));
      
      // Should filter by chunk when getting at position
      const npcAt5_5_chunk0 = state.npcSpatialIndex.getAt(5, 5, { chunkX: 0, chunkY: 0 });
      expect(npcAt5_5_chunk0.id).toBe('c0_1');
      
      const npcAt5_5_chunk1 = state.npcSpatialIndex.getAt(5, 5, { chunkX: 1, chunkY: 0 });
      expect(npcAt5_5_chunk1.id).toBe('c1_1');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing spatial index gracefully', async () => {
      // Remove spatial index
      state.npcSpatialIndex = undefined;
      
      // Add NPC to array only
      const npc = new NPC({
        id: 'test',
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0,
        factions: ['test']
      });
      state.npcs.push(npc);
      
      // Should still work with fallback
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(state, action);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('NPC interaction');
    });
    
    it('should handle corrupted spatial index', async () => {
      const { initializeStateWithSpatialIndex } = await import('../../src/social/movement/StateInitializer.js');
      
      const state = initializeStateWithSpatialIndex({ npcs: [] });
      
      // Add NPC normally
      const npc = new NPC({ id: 'test', x: 5, y: 5, hp: 100, factions: ['test'] });
      state.addNPC(npc);
      
      // Corrupt the index (simulate error)
      state.npcSpatialIndex.positionIndex.clear();
      
      // Should handle gracefully
      const found = state.getNPCAt(5, 5);
      expect(found).toBeNull(); // Index corrupted but doesn't crash
      
      // Rebuild should fix it
      state.rebuildSpatialIndex();
      const foundAfterRebuild = state.getNPCAt(5, 5);
      expect(foundAfterRebuild).toBe(npc);
    });
  });
});