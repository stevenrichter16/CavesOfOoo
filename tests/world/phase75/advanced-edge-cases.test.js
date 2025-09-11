/**
 * Advanced Edge Cases and Logic Error Tests for Phase 7.5
 * TDD approach - write tests for potential issues first
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { WorldPersistence } from '../../../src/js/world/persistence/WorldPersistence.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';
import { ModificationTracker } from '../../../src/js/world/persistence/ModificationTracker.js';

describe('Phase 7.5: Advanced Edge Cases', () => {
  let chunkSystem;
  let eventSystem;
  let persistence;
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
  });
  
  afterEach(() => {
    if (eventSystem) {
      eventSystem.destroy();
    }
  });
  
  describe('Concurrent Operation Safety', () => {
    it('should handle simultaneous chunk generation and eviction', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      chunkSystem.cache.maxSize = 2; // Very small cache
      
      // Start generating multiple chunks concurrently
      const promises = [
        chunkSystem.generateChunk('seed', 0, 0),
        chunkSystem.generateChunk('seed', 1, 0),
        chunkSystem.generateChunk('seed', 2, 0), // This should trigger eviction
        chunkSystem.generateChunk('seed', 0, 0)  // Request same chunk again
      ];
      
      const results = await Promise.all(promises);
      
      // All should succeed without errors
      results.forEach(chunk => {
        expect(chunk).toBeDefined();
        expect(chunk.map).toBeDefined();
      });
      
      // First and last should be the same chunk
      expect(results[0].cx).toBe(results[3].cx);
      expect(results[0].cy).toBe(results[3].cy);
    });
    
    it('should handle event application during chunk reload', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.persistence = persistence;
      chunkSystem._detectPersistenceCapabilities();
      
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      chunkSystem.setEventSystem(eventSystem);
      
      // Generate chunk
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Ensure chunk has some passable tiles for item placement
      chunk.setTile(10, 10, '.');
      chunk.setTile(11, 10, '.');
      chunk.setTile(12, 10, '.');
      
      // Save base chunk to persistence
      await persistence.saveBaseChunk(chunk);
      
      // Start an event
      const event = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      event.effects = { spawnItems: ['candy'] };
      eventSystem.startEvent(event);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Verify event was applied
      const initialItemCount = chunk.items.length;
      expect(initialItemCount).toBeGreaterThan(0);
      
      // Simulate eviction
      chunkSystem.cache.delete(0, 0);
      eventSystem.handleChunkEviction({ cx: 0, cy: 0 });
      
      // Apply another event while first is marked for reapplication
      const event2 = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      event2.effects = { spawnItems: ['gold'] };
      eventSystem.startEvent(event2);
      
      // Reload chunk - should load from persistence and reapply events
      const reloaded = await chunkSystem.loadChunk('seed', 0, 0);
      
      // Ensure chunk has passable tiles (base state)
      expect(reloaded.getTile(10, 10)).toBe('.');
      
      // Events should be reapplied to reloaded chunk
      expect(reloaded.items).toBeDefined();
      expect(reloaded.items.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should handle rapid cache thrashing without corruption', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      chunkSystem.cache.maxSize = 1; // Extreme thrashing
      
      const coords = [[0,0], [1,0], [0,1], [1,1]];
      const chunks = [];
      
      // Rapidly switch between chunks
      for (let i = 0; i < 20; i++) {
        const [cx, cy] = coords[i % 4];
        const chunk = await chunkSystem.generateChunk('seed', cx, cy);
        chunks.push(chunk);
      }
      
      // All chunks should be valid
      chunks.forEach(chunk => {
        expect(chunk).toBeDefined();
        expect(chunk.map).toBeDefined();
        expect(chunk.map.length).toBe(22);
      });
    });
  });
  
  describe('Memory Leak Prevention', () => {
    it('should not accumulate event listeners over time', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const initialListenerCount = mockEventBus.on.mock.calls.length;
      
      // Create and destroy multiple event systems
      for (let i = 0; i < 10; i++) {
        const eventSys = new DynamicEventSystem(chunkSystem, mockEventBus);
        eventSys.destroy();
      }
      
      // Listener count should not grow indefinitely
      const finalListenerCount = mockEventBus.on.mock.calls.length;
      expect(finalListenerCount - initialListenerCount).toBeLessThanOrEqual(10);
    });
    
    it('should clean up temporary modifications after event expiration', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Create event with temporary modifications
      const event = {
        id: 'temp_event',
        cx: 0,
        cy: 0,
        duration: 1,
        effects: {
          temporaryTiles: { '.': '~' }
        }
      };
      
      eventSystem.startEvent(event);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Check modifications exist
      expect(chunk.temporaryModifications[event.id]).toBeDefined();
      
      // Advance time to expire event
      eventSystem.tick(2);
      
      // Modifications should be cleaned up
      expect(chunk.temporaryModifications[event.id]).toBeUndefined();
    });
    
    it('should limit spatial index size', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      eventSystem.maxSpatialIndexSize = 10;
      
      // Create many events at different locations
      for (let i = 0; i < 20; i++) {
        const event = {
          id: `event_${i}`,
          cx: i,
          cy: i,
          active: true
        };
        eventSystem.startEvent(event);
      }
      
      // Trigger cleanup
      eventSystem._cleanupSpatialIndex();
      
      // Spatial index should be limited
      expect(eventSystem.spatialIndex.size).toBeLessThanOrEqual(10);
    });
  });
  
  describe('Data Integrity', () => {
    it('should maintain chunk integrity through serialization cycle', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      
      const chunk = await chunkSystem.generateChunk('seed', 5, 5);
      
      // Modify chunk
      chunk.setTile(10, 10, '~');
      chunk.items.push({ type: 'sword', x: 5, y: 5 });
      chunk.metadata.customData = 'test';
      
      // Save and reload
      await persistence.saveBaseChunk(chunk);
      const loaded = await persistence.loadBaseChunk(5, 5);
      
      // Verify integrity
      expect(loaded.getTile(10, 10)).toBe('~');
      expect(loaded.items).toHaveLength(1);
      expect(loaded.metadata.customData).toBe('test');
    });
    
    it('should handle corrupted persistence data gracefully', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      
      // Inject corrupted data
      persistence.baseChunks.set('0,0', { corrupt: true });
      
      // Should handle gracefully
      const chunk = await persistence.loadBaseChunk(0, 0);
      expect(chunk).toBeNull();
      
      // System should still work
      const newChunk = await chunkSystem.generateChunk('seed', 0, 0);
      expect(newChunk).toBeDefined();
    });
    
    it('should prevent modification tracker overflow', () => {
      const tracker = new ModificationTracker();
      tracker.maxTrackedChunks = 5;
      
      // Add many modifications
      for (let i = 0; i < 10; i++) {
        tracker.trackTileChange({ cx: i, cy: 0 }, 0, 0, '.', '#');
      }
      
      // Should not exceed limit
      expect(tracker.modifications.size).toBeLessThanOrEqual(5);
    });
  });
  
  describe('Event System Edge Cases', () => {
    it('should handle circular event chains', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Create event that chains to itself (indirectly)
      const event1 = {
        id: 'event1',
        chainEvents: ['event2']
      };
      
      // Limit chain depth to prevent infinite recursion
      let chainDepth = 0;
      const originalStart = eventSystem.startChainEvents.bind(eventSystem);
      eventSystem.startChainEvents = function(...args) {
        chainDepth++;
        if (chainDepth > 10) {
          return [];
        }
        return originalStart(...args);
      };
      
      eventSystem.startEvent(event1);
      
      // Should not crash or hang
      expect(eventSystem.activeEvents.length).toBeGreaterThan(0);
      expect(chainDepth).toBeLessThanOrEqual(10);
    });
    
    it('should handle events with invalid chunk coordinates', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const event = {
        id: 'bad_coords',
        cx: NaN,
        cy: undefined,
        effects: { spawnItems: ['item'] }
      };
      
      // Should not crash
      expect(() => eventSystem.startEvent(event)).not.toThrow();
      
      // Event should be added but not to spatial index
      expect(eventSystem.activeEvents).toContainEqual(event);
      expect(eventSystem.spatialIndex.size).toBe(0);
    });
    
    it('should handle event application to null/undefined chunk', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const event = { id: 'test', effects: { spawnItems: ['item'] } };
      
      // Should not crash
      await expect(eventSystem.applyEventToChunk(event, null)).resolves.not.toThrow();
      await expect(eventSystem.applyEventToChunk(event, undefined)).resolves.not.toThrow();
    });
  });
  
  describe('Persistence Edge Cases', () => {
    it('should handle base chunk save when at memory limit', async () => {
      persistence = new WorldPersistence();
      persistence.maxBaseChunks = 3;
      
      // Fill to limit
      for (let i = 0; i < 5; i++) {
        const chunk = new Chunk(i, 0);
        chunk.biome = 'test'; // Required for validation
        await persistence.saveBaseChunk(chunk);
      }
      
      // Should enforce limit
      expect(persistence.baseChunks.size).toBe(3);
      
      // Most recent chunks should be kept
      expect(persistence.baseChunks.has('4,0')).toBe(true);
      expect(persistence.baseChunks.has('3,0')).toBe(true);
      expect(persistence.baseChunks.has('2,0')).toBe(true);
    });
    
    it('should handle concurrent saves to same chunk', async () => {
      persistence = new WorldPersistence();
      const chunk = new Chunk(0, 0);
      chunk.biome = 'test'; // Required for validation
      
      // Attempt concurrent saves
      const saves = [
        persistence.saveBaseChunk(chunk),
        persistence.saveBaseChunk(chunk),
        persistence.saveBaseChunk(chunk)
      ];
      
      const results = await Promise.all(saves);
      
      // First should succeed, others should report already exists
      const successCount = results.filter(r => r.success && !r.alreadyExists).length;
      const alreadyExistsCount = results.filter(r => r.alreadyExists).length;
      
      expect(successCount).toBe(1);
      expect(alreadyExistsCount).toBe(2);
    });
    
    it('should handle transaction rollback correctly', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.persistence = persistence;
      chunkSystem._detectPersistenceCapabilities();
      
      // Mock save to fail
      const originalSave = persistence.saveBaseChunk;
      persistence.saveBaseChunk = vi.fn().mockRejectedValue(new Error('Save failed'));
      
      // Create a proper chunk for testing
      const testChunk = new Chunk(0, 0);
      testChunk.biome = 'test';
      
      // Attempt to generate (which includes save in transaction)
      try {
        await chunkSystem._cacheAndPersistChunk(testChunk, 0, 0);
      } catch (e) {
        // Expected to fail
      }
      
      // Cache should be rolled back (cache returns null for missing items)
      expect(chunkSystem.cache.get(0, 0)).toBeNull();
      
      persistence.saveBaseChunk = originalSave;
    });
  });
  
  describe('Boundary Conditions', () => {
    it('should handle maximum coordinate values', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      const maxCoord = Number.MAX_SAFE_INTEGER;
      const chunk = await chunkSystem.generateChunk('seed', maxCoord, maxCoord);
      
      expect(chunk).toBeDefined();
      expect(chunk.cx).toBe(maxCoord);
      expect(chunk.cy).toBe(maxCoord);
    });
    
    it('should handle minimum coordinate values', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      const minCoord = Number.MIN_SAFE_INTEGER;
      const chunk = await chunkSystem.generateChunk('seed', minCoord, minCoord);
      
      expect(chunk).toBeDefined();
      expect(chunk.cx).toBe(minCoord);
      expect(chunk.cy).toBe(minCoord);
    });
    
    it('should handle empty event effects gracefully', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      const event = {
        id: 'empty',
        effects: {}
      };
      
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Should not crash or modify chunk
      expect(chunk.items).toHaveLength(0);
      expect(chunk.temporaryModifications).toEqual({});
    });
  });
  
  describe('State Consistency', () => {
    it('should maintain consistency between cache and persistence', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.persistence = persistence;
      chunkSystem._detectPersistenceCapabilities();
      
      // Generate and modify chunk
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      chunk.setTile(5, 5, '~');
      
      // Save to persistence
      await persistence.saveBaseChunk(chunk);
      
      // Evict from cache
      chunkSystem.cache.delete(0, 0);
      
      // Reload
      const reloaded = await chunkSystem.loadChunk('seed', 0, 0);
      
      // Should have base state (without modification since it was after generation)
      expect(reloaded).toBeDefined();
      expect(reloaded.cx).toBe(0);
    });
    
    it('should handle interrupted event reapplication', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const chunk = new Chunk(0, 0);
      const events = [
        { id: 'e1', needsReapplication: true, active: true, effects: {} },
        { id: 'e2', needsReapplication: true, active: true, effects: {} },
        { id: 'e3', needsReapplication: true, active: true, effects: {} }
      ];
      
      // Mock one to throw error
      const originalApply = eventSystem.applyEventToChunk;
      eventSystem.applyEventToChunk = vi.fn().mockImplementation(async (event, chunk) => {
        if (event.id === 'e2') {
          throw new Error('Application failed');
        }
        return originalApply.call(eventSystem, event, chunk);
      });
      
      // Add events to spatial index
      eventSystem.spatialIndex.set('0,0', new Set(events));
      
      // Reapply events
      await eventSystem.reapplyEventsToChunk(chunk);
      
      // All should have needsReapplication cleared despite error
      expect(events[0].needsReapplication).toBe(false);
      expect(events[1].needsReapplication).toBe(false);
      expect(events[2].needsReapplication).toBe(false);
    });
  });
});