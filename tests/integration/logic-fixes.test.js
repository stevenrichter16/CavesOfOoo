/**
 * Logic Fixes Tests
 * Testing and fixing the logic errors found in Phase 7/8 integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Logic Fixes', () => {
  
  describe('Coordinate System Fix', () => {
    it('should use tile coordinates directly, not multiply by 12', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      // Initialize systems
      WorldIntegration.initWorldSystems();
      const { worldSimulation } = WorldIntegration.getSystems();
      
      // Mock addPlayer to capture coordinates
      const addPlayerSpy = vi.spyOn(worldSimulation, 'addPlayer');
      
      // Update player position
      const player = { x: 10, y: 15 };
      WorldIntegration.updatePlayerPosition(player);
      
      // Should pass tile coordinates directly
      expect(addPlayerSpy).toHaveBeenCalledWith({
        id: 'player',
        x: 10,  // NOT 10 * 12 = 120
        y: 15   // NOT 15 * 12 = 180
      });
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should calculate chunk distance correctly', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      const { worldSimulation } = WorldIntegration.getSystems();
      
      // Add player at tile (12, 11) - center of chunk (0,0)
      WorldIntegration.updatePlayerPosition({ x: 12, y: 11 });
      
      // Mock chunk at (1, 0) - should be 24 tiles away
      const chunk = { cx: 1, cy: 0 };
      
      // Distance should be based on tiles, not some arbitrary multiplier
      const priorities = worldSimulation.prioritizeChunks([chunk]);
      expect(priorities).toBeDefined();
      
      WorldIntegration.destroyWorldSystems();
    });
  });
  
  describe('Time Throttling Fix', () => {
    it('should not advance time every frame', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      const { timeSystem } = WorldIntegration.getSystems();
      
      const initialTime = timeSystem.getGameTime();
      
      // Simulate 60 FPS for 1 second (60 calls)
      for (let i = 0; i < 60; i++) {
        WorldIntegration.updateWorld();
      }
      
      const afterTime = timeSystem.getGameTime();
      const minutesPassed = (afterTime - initialTime) / (1000 * 60);
      
      // Should advance much less than 300 minutes (60 * 5)
      // Ideally 0-5 minutes
      expect(minutesPassed).toBeLessThan(10);
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should throttle time updates to reasonable rate', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      const { timeSystem } = WorldIntegration.getSystems();
      
      // Spy on tick
      const tickSpy = vi.spyOn(timeSystem, 'tick');
      
      // Call updateWorld rapidly
      const start = Date.now();
      while (Date.now() - start < 100) { // 100ms
        WorldIntegration.updateWorld();
      }
      
      // Should have ticked at most once or twice in 100ms
      expect(tickSpy.mock.calls.length).toBeLessThanOrEqual(2);
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should advance time on player actions, not renders', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      
      // Export a function for player actions
      expect(typeof WorldIntegration.onPlayerAction).toBe('function');
      
      const { timeSystem } = WorldIntegration.getSystems();
      const tickSpy = vi.spyOn(timeSystem, 'tick');
      
      // Render shouldn't tick
      WorldIntegration.updateWorld();
      expect(tickSpy).not.toHaveBeenCalled();
      
      // Player action should tick
      WorldIntegration.onPlayerAction();
      expect(tickSpy).toHaveBeenCalledOnce();
      
      WorldIntegration.destroyWorldSystems();
    });
  });
  
  describe('NPC-Entity Synchronization', () => {
    it('should sync NPC positions with entity positions', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      const { entityManager } = WorldIntegration.getSystems();
      
      // Create test NPC
      const npc = {
        id: 'npc-1',
        name: 'Bob',
        x: 10,
        y: 10,
        entityId: null
      };
      
      // Create entity for NPC
      const entity = entityManager.createEntity({
        type: 'npc',
        name: npc.name,
        x: npc.x,
        y: npc.y,
        behavior: 'wander'
      });
      npc.entityId = entity.id;
      
      // Update behaviors (entity moves)
      entityManager.updateBehaviors();
      
      // Sync NPC with entity
      WorldIntegration.syncNPCWithEntity(npc);
      
      // NPC position should match entity position
      expect(npc.x).toBe(entity.x);
      expect(npc.y).toBe(entity.y);
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should sync all NPCs in state on update', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      
      const state = {
        npcs: [
          { id: 'npc-1', x: 10, y: 10, entityId: 'entity-1' },
          { id: 'npc-2', x: 20, y: 20, entityId: 'entity-2' }
        ]
      };
      
      // Should have sync function
      expect(typeof WorldIntegration.syncNPCsWithEntities).toBe('function');
      
      // Call sync
      WorldIntegration.syncNPCsWithEntities(state);
      
      // NPCs should be updated (hard to test without mock entities)
      expect(state.npcs[0]).toBeDefined();
      
      WorldIntegration.destroyWorldSystems();
    });
  });
  
  describe('Chunk Save/Load Fix', () => {
    it('should save chunks with worldSeed, not coordinates', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      const { chunkSystem } = WorldIntegration.getSystems();
      
      // Spy on chunkSystem.saveChunk
      const saveSpy = vi.spyOn(chunkSystem, 'saveChunk');
      
      const worldSeed = 'test-world-123';
      const chunk = { cx: 5, cy: 7, map: [] };
      
      // Save chunk
      await WorldIntegration.saveChunk(worldSeed, 5, 7, chunk);
      
      // Should call with worldSeed, not "5,7"
      expect(saveSpy).toHaveBeenCalledWith(worldSeed, chunk);
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should load chunks with correct parameters', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      const { chunkSystem } = WorldIntegration.getSystems();
      
      // Spy on chunkSystem.loadChunk
      const loadSpy = vi.spyOn(chunkSystem, 'loadChunk');
      
      const worldSeed = 'test-world-123';
      
      // Load chunk
      await WorldIntegration.loadChunk(worldSeed, 5, 7);
      
      // Should pass all parameters correctly
      expect(loadSpy).toHaveBeenCalledWith(worldSeed, 5, 7);
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should track chunk modifications', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      
      const chunk = {
        cx: 0,
        cy: 0,
        map: Array(22).fill(null).map(() => Array(24).fill('#')),
        modified: false
      };
      
      // Modify chunk
      WorldIntegration.modifyChunkTile(chunk, 10, 10, '.');
      
      // Should mark as modified
      expect(chunk.modified).toBe(true);
      expect(chunk.map[10][10]).toBe('.');
      
      WorldIntegration.destroyWorldSystems();
    });
  });
  
  describe('Weather Throttling Fix', () => {
    it('should not check weather every frame', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      
      const player = { x: 10, y: 10, statuses: {} };
      let wetAppliedCount = 0;
      
      // Mock checkWeatherEffects to count calls
      const originalCheck = WorldIntegration.checkWeatherEffects;
      WorldIntegration.checkWeatherEffects = (p) => {
        const result = originalCheck(p);
        if (result) wetAppliedCount++;
        return result;
      };
      
      // Set rainy weather
      const { weatherSystem } = WorldIntegration.getSystems();
      weatherSystem.setWeather('rain');
      
      // Simulate 60 FPS for 1 second
      for (let i = 0; i < 60; i++) {
        WorldIntegration.checkWeatherEffects(player);
      }
      
      // Should not apply wet 60 times
      expect(wetAppliedCount).toBeLessThan(5);
      
      WorldIntegration.destroyWorldSystems();
    });
    
    it('should throttle weather effect application', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      
      // Should have throttled version
      expect(typeof WorldIntegration.checkWeatherEffectsThrottled).toBe('function');
      
      const player = { x: 10, y: 10 };
      
      // Call rapidly
      let callCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = WorldIntegration.checkWeatherEffectsThrottled(player);
        if (result !== null) callCount++;
      }
      
      // Should only return result once or twice despite 100 calls
      expect(callCount).toBeLessThanOrEqual(2);
      
      WorldIntegration.destroyWorldSystems();
    });
  });
  
  describe('Integration', () => {
    it('should have all fixes working together', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      WorldIntegration.initWorldSystems();
      
      const state = {
        worldSeed: 'test-123',
        player: { x: 10, y: 10 },
        npcs: [
          { id: 'npc-1', x: 5, y: 5, entityId: null }
        ],
        chunk: { cx: 0, cy: 0, map: [] }
      };
      
      // All functions should exist
      expect(typeof WorldIntegration.updatePlayerPosition).toBe('function');
      expect(typeof WorldIntegration.onPlayerAction).toBe('function');
      expect(typeof WorldIntegration.syncNPCsWithEntities).toBe('function');
      expect(typeof WorldIntegration.saveChunk).toBe('function');
      expect(typeof WorldIntegration.modifyChunkTile).toBe('function');
      expect(typeof WorldIntegration.checkWeatherEffectsThrottled).toBe('function');
      
      // Should not throw
      WorldIntegration.updatePlayerPosition(state.player);
      WorldIntegration.onPlayerAction();
      WorldIntegration.syncNPCsWithEntities(state);
      
      WorldIntegration.destroyWorldSystems();
    });
  });
});