/**
 * Phase 7.5: Chunk Lifecycle - Proper Persistence and Reloading
 * Tests for complete chunk lifecycle with base persistence and event reapplication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { WorldPersistence } from '../../../src/js/world/persistence/WorldPersistence.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';

describe('Phase 7.5: Chunk Lifecycle', () => {
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
  
  describe('Base Chunk Persistence', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.setPersistence(persistence);
    });
    
    it('should save base chunk state immediately after generation', async () => {
      const chunk = await chunkSystem.generateChunk('test-seed', 0, 0);
      
      // Base chunk should be saved before any modifications
      const baseChunk = await persistence.loadBaseChunk(0, 0);
      
      expect(baseChunk).toBeDefined();
      expect(baseChunk.cx).toBe(0);
      expect(baseChunk.cy).toBe(0);
      expect(baseChunk.biome).toBe(chunk.biome);
      expect(baseChunk.map).toEqual(chunk.map);
    });
    
    it('should keep base chunk separate from modified chunk', async () => {
      const chunk = await chunkSystem.generateChunk('test-seed', 1, 1);
      
      // Count original floor tiles
      let originalFloorCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) === '.') originalFloorCount++;
        }
      }
      
      // Modify the chunk
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) === '.') {
            chunk.setTile(x, y, '·');
          }
        }
      }
      
      // Base chunk should remain unchanged
      const baseChunk = await persistence.loadBaseChunk(1, 1);
      let baseFloorCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (baseChunk.getTile(x, y) === '.') baseFloorCount++;
        }
      }
      
      expect(baseFloorCount).toBe(originalFloorCount);
      expect(baseFloorCount).toBeGreaterThan(0);
    });
    
    it('should not save base chunk twice for same coordinates', async () => {
      await chunkSystem.generateChunk('test-seed', 2, 2);
      const firstBase = await persistence.loadBaseChunk(2, 2);
      
      // Generate again (simulating cache miss)
      await chunkSystem.generateChunk('test-seed', 2, 2);
      const secondBase = await persistence.loadBaseChunk(2, 2);
      
      // Should be the same base chunk
      expect(secondBase.map).toEqual(firstBase.map);
      expect(persistence.getBaseChunkSaveCount(2, 2)).toBe(1);
    });
    
    it('should store base chunk efficiently', async () => {
      const chunk = await chunkSystem.generateChunk('test-seed', 3, 3);
      
      // Get storage size
      const baseSize = await persistence.getBaseChunkSize(3, 3);
      
      // Base should be stored
      expect(baseSize).toBeGreaterThan(0);
      expect(baseSize).toBeGreaterThan(100); // Should have some actual data
    });
  });
  
  describe('Chunk Reload Lifecycle', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.setPersistence(persistence);
      chunkSystem.setEventSystem(eventSystem);
    });
    
    it('should reload chunk from base instead of regenerating', async () => {
      // Generate and cache chunk
      const original = await chunkSystem.loadChunk('test-seed', 0, 0);
      const originalGenTime = original.metadata?.generationTime;
      
      // Clear cache to force reload
      chunkSystem.cache.clear();
      
      // Load again - should use persisted base, not regenerate
      const reloaded = await chunkSystem.loadChunk('test-seed', 0, 0);
      
      expect(reloaded.map).toEqual(original.map);
      expect(reloaded.metadata?.loadedFromBase).toBe(true);
      expect(reloaded.metadata?.generationTime).toBe(originalGenTime);
    });
    
    it('should handle the complete eviction and reload cycle', async () => {
      // Generate chunk
      const chunk = await chunkSystem.loadChunk('test-seed', 1, 0);
      
      // Add some items
      chunk.items.push({ type: 'gold', x: 10, y: 10 });
      
      // Apply an event
      const event = {
        id: 'test_event',
        cx: 1,
        cy: 0,
        effects: {
          tileChanges: { '.': '·' }
        }
      };
      await eventSystem.applyEventToChunk(event, chunk);
      eventSystem.startEvent(event);
      
      // Count modified tiles
      let modifiedCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) === '·') modifiedCount++;
        }
      }
      
      // Simulate cache eviction
      chunkSystem.cache.evict(1, 0);
      
      // Reload chunk
      const reloaded = await chunkSystem.loadChunk('test-seed', 1, 0);
      
      // Should have base terrain
      expect(reloaded).toBeDefined();
      
      // Active events should be reapplied
      let reloadedModifiedCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (reloaded.getTile(x, y) === '·') reloadedModifiedCount++;
        }
      }
      
      expect(reloadedModifiedCount).toBe(modifiedCount);
    });
    
    it('should regenerate if no base chunk exists', async () => {
      // Clear all persistence
      persistence.clearAll();
      
      // Load chunk - should generate since no base exists
      const chunk = await chunkSystem.loadChunk('test-seed', 5, 5);
      
      expect(chunk).toBeDefined();
      expect(chunk.metadata?.regenerated).toBe(true);
      
      // Should save base for next time
      const baseChunk = await persistence.loadBaseChunk(5, 5);
      expect(baseChunk).toBeDefined();
    });
    
    it('should maintain chunk integrity through multiple reload cycles', async () => {
      // Generate initial chunk
      const original = await chunkSystem.loadChunk('test-seed', 2, 2);
      const originalBiome = original.biome;
      const originalFeatures = [...(original.features || [])];
      
      // Multiple eviction/reload cycles
      for (let i = 0; i < 3; i++) {
        chunkSystem.cache.evict(2, 2);
        const reloaded = await chunkSystem.loadChunk('test-seed', 2, 2);
        
        expect(reloaded.biome).toBe(originalBiome);
        expect(reloaded.features).toEqual(originalFeatures);
      }
    });
  });
  
  describe('Event Reapplication on Reload', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.setPersistence(persistence);
      chunkSystem.setEventSystem(eventSystem);
    });
    
    it('should reapply active events to reloaded chunks', async () => {
      // Generate chunk
      const chunk = await chunkSystem.loadChunk('test-seed', 0, 0);
      
      // Start an event
      const event = await eventSystem.generateBiomeEvent(chunk.biome, 0, 0);
      event.effects = {
        spawnItems: ['candy', 'gold']
      };
      eventSystem.startEvent(event);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Clear cache
      chunkSystem.cache.clear();
      
      // Reload - events should be reapplied
      const reloaded = await chunkSystem.loadChunk('test-seed', 0, 0);
      
      expect(reloaded.items.length).toBe(2);
      expect(reloaded.items.map(i => i.type)).toContain('candy');
      expect(reloaded.items.map(i => i.type)).toContain('gold');
    });
    
    it('should handle multiple active events on reload', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 1, 1);
      
      // Start multiple events
      const event1 = {
        id: 'event_1',
        cx: 1,
        cy: 1,
        effects: { spawnItems: ['candy'] }
      };
      
      const event2 = {
        id: 'event_2',
        cx: 1,
        cy: 1,
        effects: { spawnItems: ['gold'] }
      };
      
      eventSystem.startEvent(event1);
      eventSystem.startEvent(event2);
      await eventSystem.applyEventToChunk(event1, chunk);
      await eventSystem.applyEventToChunk(event2, chunk);
      
      // Clear and reload
      chunkSystem.cache.clear();
      const reloaded = await chunkSystem.loadChunk('test-seed', 1, 1);
      
      // Both events should be reapplied
      const itemTypes = reloaded.items.map(i => i.type);
      expect(itemTypes).toContain('candy');
      expect(itemTypes).toContain('gold');
    });
    
    it('should not reapply expired events', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 2, 2);
      
      // Start a short-duration event
      const event = {
        id: 'temp_event',
        cx: 2,
        cy: 2,
        duration: 5,
        startTick: 0,
        effects: { spawnItems: ['temporary_item'] }
      };
      
      eventSystem.startEvent(event);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Advance time to expire event
      eventSystem.tick(10);
      
      // Clear and reload
      chunkSystem.cache.clear();
      const reloaded = await chunkSystem.loadChunk('test-seed', 2, 2);
      
      // Expired event should not be reapplied
      expect(reloaded.items.map(i => i.type)).not.toContain('temporary_item');
    });
    
    it('should apply events in correct order', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 3, 3);
      
      // Events that modify same tiles
      const event1 = {
        id: 'first',
        cx: 3,
        cy: 3,
        priority: 1,
        effects: { tileChanges: { '.': '~' } }
      };
      
      const event2 = {
        id: 'second',
        cx: 3,
        cy: 3,
        priority: 2,
        effects: { tileChanges: { '~': '·' } }
      };
      
      eventSystem.startEvent(event1);
      eventSystem.startEvent(event2);
      
      // Clear and reload
      chunkSystem.cache.clear();
      const reloaded = await chunkSystem.loadChunk('test-seed', 3, 3);
      
      // Should have final state (priority 2 applied last)
      let finalTileCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (reloaded.getTile(x, y) === '·') finalTileCount++;
        }
      }
      
      expect(finalTileCount).toBeGreaterThan(0);
    });
  });
  
  describe('Modification Separation', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.setPersistence(persistence);
    });
    
    it('should separate permanent and temporary modifications', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 0, 0);
      
      // Permanent modification (player action)
      chunk.setTile(5, 5, 'X');
      await persistence.savePermanentModification(0, 0, {
        tiles: { '5,5': 'X' }
      });
      
      // Temporary modification (event)
      chunk.setTile(10, 10, 'T');
      chunk.temporaryModifications['event_1'] = {
        tiles: { '10,10': 'T' }
      };
      
      // Clear and reload
      chunkSystem.cache.clear();
      const reloaded = await chunkSystem.loadChunk('test-seed', 0, 0);
      
      // Permanent modification should persist
      expect(reloaded.getTile(5, 5)).toBe('X');
      
      // Temporary modification should not persist (unless event is active)
      expect(reloaded.getTile(10, 10)).not.toBe('T');
    });
    
    it('should track modification history', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 1, 1);
      
      // Make several modifications
      chunk.setTile(1, 1, 'A');
      await persistence.savePermanentModification(1, 1, {
        tiles: { '1,1': 'A' },
        timestamp: Date.now(),
        source: 'player'
      });
      
      chunk.setTile(2, 2, 'B');
      await persistence.savePermanentModification(1, 1, {
        tiles: { '2,2': 'B' },
        timestamp: Date.now() + 1000,
        source: 'quest'
      });
      
      // Get modification history
      const history = await persistence.getModificationHistory(1, 1);
      
      expect(history.length).toBe(2);
      expect(history[0].source).toBe('player');
      expect(history[1].source).toBe('quest');
    });
    
    it('should handle conflicting modifications', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 2, 2);
      
      // Permanent modification
      await persistence.savePermanentModification(2, 2, {
        tiles: { '5,5': 'P' }
      });
      
      // Event tries to modify same tile
      const event = {
        id: 'conflict_event',
        cx: 2,
        cy: 2,
        effects: { tileChanges: { 'P': 'E' } }
      };
      
      // Reload with both modifications
      chunkSystem.cache.clear();
      const reloaded = await chunkSystem.loadChunk('test-seed', 2, 2);
      
      // Permanent modifications should take precedence
      expect(reloaded.getTile(5, 5)).toBe('P');
    });
    
    it('should clean up old temporary modifications', async () => {
      const chunk = await chunkSystem.loadChunk('test-seed', 3, 3);
      
      // Add many temporary modifications
      for (let i = 0; i < 10; i++) {
        chunk.temporaryModifications[`event_${i}`] = {
          tiles: { [`${i},${i}`]: 'T' },
          expiry: Date.now() - 1000 // Already expired
        };
      }
      
      // Reload should clean up expired modifications
      chunkSystem.cache.clear();
      const reloaded = await chunkSystem.loadChunk('test-seed', 3, 3);
      
      expect(Object.keys(reloaded.temporaryModifications).length).toBe(0);
    });
  });
  
  describe('Performance Considerations', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
      chunkSystem.setPersistence(persistence);
      chunkSystem.setEventSystem(eventSystem);
    });
    
    it('should load chunks faster from persistence than generation', async () => {
      // Generate and time it
      const genStart = performance.now();
      const generated = await chunkSystem.loadChunk('perf-test', 0, 0);
      const genTime = performance.now() - genStart;
      
      // Clear cache
      chunkSystem.cache.clear();
      
      // Load from persistence and time it
      const loadStart = performance.now();
      const loaded = await chunkSystem.loadChunk('perf-test', 0, 0);
      const loadTime = performance.now() - loadStart;
      
      // Loading should be faster than generation
      expect(loadTime).toBeLessThan(genTime);
      expect(loaded.map).toEqual(generated.map);
    });
    
    it('should handle rapid chunk switching efficiently', async () => {
      // Pre-generate some chunks
      for (let i = 0; i < 5; i++) {
        await chunkSystem.loadChunk('rapid-test', i, 0);
      }
      
      // Clear cache to force reloading
      chunkSystem.cache.clear();
      
      // Rapidly switch between chunks
      const start = performance.now();
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < 5; i++) {
          await chunkSystem.loadChunk('rapid-test', i, 0);
          chunkSystem.cache.clear(); // Force reload each time
        }
      }
      const totalTime = performance.now() - start;
      
      // Should handle 15 loads quickly
      expect(totalTime).toBeLessThan(500); // Less than 500ms for 15 loads
    });
  });
});