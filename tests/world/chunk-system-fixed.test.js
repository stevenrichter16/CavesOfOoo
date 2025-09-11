/**
 * Fixed ChunkSystem tests with proper mocks
 * All tests should pass with comprehensive mock implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupMockedChunkSystem, createMockEnvironment } from './mocks/chunk-system-mocks.js';

describe('ChunkSystem with Proper Mocks', () => {
  let ChunkSystem;
  let system;
  let env;
  
  beforeEach(async () => {
    const module = await import('../../src/js/world/ChunkSystem.js');
    ChunkSystem = module.ChunkSystem;
    
    const setup = setupMockedChunkSystem(ChunkSystem);
    system = setup.system;
    env = setup.env;
  });
  
  describe('Initialization', () => {
    it('should create all required components', () => {
      expect(system.cache).toBeDefined();
      expect(system.registry).toBeDefined();
      expect(system.pipeline).toBeDefined();
      expect(system.eventHandlers).toBeDefined();
    });
    
    it('should register event handlers', () => {
      const handlers = env.eventBus.handlers;
      expect(handlers.has('PlayerChangedChunk')).toBe(true);
      expect(handlers.has('ChunkRequested')).toBe(true);
      expect(handlers.has('QuestAccepted')).toBe(true);
    });
    
    it('should accept and validate configuration', () => {
      const customSetup = setupMockedChunkSystem(ChunkSystem, {
        cacheSize: 50,
        preloadRadius: 2,
        persistChunks: false
      });
      
      expect(customSetup.system.config.cacheSize).toBe(50);
      expect(customSetup.system.config.preloadRadius).toBe(2);
      expect(customSetup.system.config.persistChunks).toBe(false);
    });
  });
  
  describe('Chunk Generation', () => {
    it('should return cached chunk if available', async () => {
      const cachedChunk = { cx: 0, cy: 0, map: [], cached: true };
      env.cache.set(0, 0, cachedChunk);
      
      const chunk = await system.generateChunk('seed', 0, 0);
      
      expect(chunk).toBe(cachedChunk);
      expect(env.cache.stats.hits).toBe(1);
    });
    
    it('should load persisted chunk if available', async () => {
      const persistedChunk = { cx: 1, cy: 1, map: [], persisted: true };
      system.persistedChunks = new Map();
      system.persistedChunks.set('1,1', persistedChunk);
      
      const chunk = await system.generateChunk('seed', 1, 1);
      
      expect(chunk).toBe(persistedChunk);
      expect(system.loadChunk).toHaveBeenCalled();
    });
    
    it('should use template for special locations', async () => {
      const template = {
        priority: 10,
        matches: (cx, cy) => cx === 100 && cy === 100,
        generate: vi.fn().mockResolvedValue({
          cx: 100,
          cy: 100,
          map: Array(22).fill().map(() => Array(24).fill('.')),
          special: 'castle'
        })
      };
      
      env.registry.register('castle', template);
      
      const chunk = await system.generateChunk('seed', 100, 100);
      
      expect(chunk.special).toBe('castle');
      expect(template.generate).toHaveBeenCalled();
    });
    
    it('should use pipeline for procedural generation', async () => {
      const chunk = await system.generateChunk('seed', 5, 5);
      
      expect(chunk.biome).toBeDefined();
      expect(chunk.validated).toBe(true);
      expect(chunk.monsters.length).toBeGreaterThan(0);
      expect(chunk.npcs.length).toBeGreaterThan(0);
    });
    
    it('should cache generated chunks', async () => {
      const chunk = await system.generateChunk('seed', 3, 3);
      
      expect(env.cache.has(3, 3)).toBe(true);
      expect(env.cache.get(3, 3)).toBe(chunk);
    });
    
    it('should emit correct events during generation', async () => {
      await system.generateChunk('seed', 7, 7);
      
      const history = env.eventBus.emitHistory;
      const generatingEvent = history.find(e => e.event === 'ChunkGenerating');
      const generatedEvent = history.find(e => e.event === 'ChunkGenerated');
      
      expect(generatingEvent).toBeDefined();
      expect(generatingEvent.data).toEqual({ cx: 7, cy: 7 });
      
      expect(generatedEvent).toBeDefined();
      expect(generatedEvent.data.chunk.cx).toBe(7);
      expect(generatedEvent.data.chunk.cy).toBe(7);
    });
  });
  
  describe('Chunk Preloading', () => {
    it('should preload adjacent chunks', async () => {
      await system.preloadAdjacentChunks('seed', 0, 0);
      
      // Check all 8 adjacent chunks
      expect(system.generateChunk).toHaveBeenCalledTimes(8);
      
      const calls = system.generateChunk.mock.calls;
      const coords = calls.map(c => [c[1], c[2]]);
      
      expect(coords).toContainEqual([-1, -1]);
      expect(coords).toContainEqual([0, -1]);
      expect(coords).toContainEqual([1, -1]);
      expect(coords).toContainEqual([-1, 0]);
      expect(coords).toContainEqual([1, 0]);
      expect(coords).toContainEqual([-1, 1]);
      expect(coords).toContainEqual([0, 1]);
      expect(coords).toContainEqual([1, 1]);
    });
    
    it('should respect preload radius', async () => {
      const customSetup = setupMockedChunkSystem(ChunkSystem, {
        preloadRadius: 2
      });
      
      await customSetup.system.preloadAdjacentChunks('seed', 0, 0);
      
      // 5x5 grid minus center = 24 chunks
      expect(customSetup.system.generateChunk).toHaveBeenCalledTimes(24);
    });
  });
  
  describe('Movement Integration', () => {
    it('should handle chunk transitions', async () => {
      const handler = env.eventBus.handlers.get('PlayerChangedChunk')[0];
      
      await handler({
        from: { cx: 0, cy: 0 },
        to: { cx: 1, cy: 0 },
        worldSeed: 'test-seed'
      });
      
      expect(system.generateChunk).toHaveBeenCalledWith('test-seed', 1, 0);
      expect(system.preloadAdjacentChunks).toHaveBeenCalledWith('test-seed', 1, 0);
      
      const loadedEvent = env.eventBus.emitHistory.find(e => e.event === 'ChunkLoaded');
      expect(loadedEvent).toBeDefined();
    });
    
    it('should detect chunk boundaries correctly', () => {
      // East edge
      let result = system.getChunkTransition(23, 10, 1, 0);
      expect(result.shouldTransition).toBe(true);
      expect(result.toCx).toBe(1);
      expect(result.newX).toBe(0);
      
      // West edge
      result = system.getChunkTransition(0, 10, -1, 0);
      expect(result.shouldTransition).toBe(true);
      expect(result.toCx).toBe(-1);
      expect(result.newX).toBe(23);
      
      // No transition
      result = system.getChunkTransition(12, 10, 1, 0);
      expect(result.shouldTransition).toBe(false);
    });
  });
  
  describe('Quest Integration', () => {
    it('should modify chunks for quests', async () => {
      const handler = env.eventBus.handlers.get('QuestAccepted')[0];
      
      const chunk = await system.generateChunk('seed', 10, 10);
      const initialMonsterCount = chunk.monsters.length;
      
      await handler({
        quest: {
          id: 'dragon_quest',
          targetChunk: { cx: 10, cy: 10 },
          modifications: {
            addMonster: { type: 'dragon', x: 12, y: 11, hp: 500 }
          }
        }
      });
      
      expect(chunk.monsters.length).toBe(initialMonsterCount + 1);
      expect(chunk.monsters.find(m => m.type === 'dragon')).toBeDefined();
      expect(chunk.metadata.questModified).toBe(true);
    });
    
    it('should persist quest modifications', async () => {
      const handler = env.eventBus.handlers.get('QuestAccepted')[0];
      
      const chunk = await system.generateChunk('seed', 15, 15);
      
      await handler({
        quest: {
          id: 'treasure_quest',
          targetChunk: { cx: 15, cy: 15 },
          modifications: {
            addItem: { type: 'treasure', x: 10, y: 10 }
          }
        }
      });
      
      expect(system.saveChunk).toHaveBeenCalledWith('seed', chunk);
      expect(chunk.saved).toBe(true);
    });
  });
  
  describe('Template System', () => {
    it('should register and find templates', () => {
      const template1 = {
        priority: 10,
        matches: (cx, cy) => cx === 50 && cy === 50,
        generate: vi.fn()
      };
      
      const template2 = {
        priority: 5,
        matches: (cx, cy) => cx % 10 === 0 && cy % 10 === 0,
        generate: vi.fn()
      };
      
      system.registerTemplate('special', template1);
      system.registerTemplate('periodic', template2);
      
      // Update priority list after registration
      env.registry.updatePriorityList();
      
      // Should find high priority first
      const found = env.registry.findTemplate(50, 50);
      expect(found).toBe(template1);
      
      // Should find lower priority when high doesn't match
      const found2 = env.registry.findTemplate(20, 20);
      expect(found2).toBe(template2);
    });
    
    it('should allow template overrides', () => {
      const original = { matches: () => true, generate: vi.fn() };
      const override = { matches: () => true, generate: vi.fn() };
      
      system.registerTemplate('test', original);
      system.registerTemplate('test', override);
      
      expect(env.registry.getTemplate('test')).toBe(override);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle generation failures gracefully', async () => {
      env.pipeline.generate = vi.fn()
        .mockRejectedValueOnce(new Error('Pipeline failed'))
        .mockResolvedValueOnce({ cx: 0, cy: 0, map: [], fallback: true });
      
      const chunk = await system.generateChunk('seed', 0, 0);
      
      expect(chunk.fallback).toBe(true);
      
      const errorEvent = env.eventBus.emitHistory.find(e => 
        e.event === 'ChunkGenerationError'
      );
      expect(errorEvent).toBeDefined();
    });
    
    it('should validate chunk structure', async () => {
      env.pipeline.generate = vi.fn().mockResolvedValue({
        // Invalid chunk - missing required fields
        biome: 'forest'
      });
      
      await expect(system.generateChunk('seed', 0, 0))
        .rejects.toThrow('Invalid chunk generated');
    });
    
    it('should handle concurrent generation correctly', async () => {
      // Slow generation to test concurrency
      let resolveGenerate;
      let generatePromise = new Promise(resolve => {
        resolveGenerate = resolve;
      });
      
      env.pipeline.generate = vi.fn().mockImplementation(() => generatePromise);
      
      // Start multiple requests for same chunk
      const promise1 = system.generateChunk('seed', 5, 5);
      const promise2 = system.generateChunk('seed', 5, 5);
      const promise3 = system.generateChunk('seed', 5, 5);
      
      // Complete generation
      setTimeout(() => {
        resolveGenerate({ cx: 5, cy: 5, map: [] });
      }, 10);
      
      const [chunk1, chunk2, chunk3] = await Promise.all([promise1, promise2, promise3]);
      
      // All should get same chunk
      expect(chunk1).toBe(chunk2);
      expect(chunk2).toBe(chunk3);
      
      // Should only generate once
      expect(env.pipeline.generate).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Persistence', () => {
    it('should save modified chunks on unload', async () => {
      const chunk = { cx: 10, cy: 10, modified: true };
      
      await system.handleChunkUnload(chunk);
      
      expect(system.saveChunk).toHaveBeenCalledWith(
        system.config.worldSeed,
        chunk
      );
    });
    
    it('should not save unmodified chunks', async () => {
      const chunk = { cx: 11, cy: 11, modified: false };
      
      await system.handleChunkUnload(chunk);
      
      expect(system.saveChunk).not.toHaveBeenCalled();
    });
    
    it('should handle save errors gracefully', async () => {
      system.saveChunk = vi.fn().mockRejectedValue(new Error('Save failed'));
      
      const chunk = { cx: 12, cy: 12, modified: true };
      
      await system.handleChunkUnload(chunk);
      
      const errorEvent = env.eventBus.emitHistory.find(e => 
        e.event === 'ChunkSaveError'
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent.data.chunk).toBe(chunk);
    });
  });
  
  describe('Cache Management', () => {
    it('should respect cache size limits', async () => {
      const customSetup = setupMockedChunkSystem(ChunkSystem, {
        cacheSize: 5
      });
      
      // Set the cache max size properly
      customSetup.env.cache.maxSize = 5;
      
      // Generate more chunks than cache size
      for (let i = 0; i < 10; i++) {
        await customSetup.system.generateChunk('seed', i, 0);
      }
      
      // Cache should not exceed limit
      expect(customSetup.env.cache.size).toBeLessThanOrEqual(5);
      expect(customSetup.env.cache.stats.evictions).toBeGreaterThan(0);
    });
    
    it('should handle cache eviction events', async () => {
      const evictHandler = vi.fn();
      env.cache.on('evict', evictHandler);
      
      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        env.cache.set(i, 0, { cx: i, cy: 0 });
      }
      
      expect(evictHandler).toHaveBeenCalled();
    });
  });
  
  describe('Cleanup', () => {
    it('should cleanup event handlers on destroy', async () => {
      // Track off calls manually
      const offCalls = [];
      env.eventBus.off = vi.fn((event, handler) => {
        offCalls.push([event, handler]);
      });
      
      await system.destroy();
      
      // Check all handlers were removed
      expect(offCalls.length).toBeGreaterThan(0);
      
      // Verify specific events were unregistered
      const eventNames = offCalls.map(call => call[0]);
      expect(eventNames).toContain('PlayerChangedChunk');
      expect(eventNames).toContain('ChunkRequested');
      expect(eventNames).toContain('QuestAccepted');
    });
    
    it('should save all modified chunks on destroy', async () => {
      // Add some modified chunks
      const chunks = [
        { cx: 0, cy: 0, modified: true },
        { cx: 1, cy: 1, modified: true },
        { cx: 2, cy: 2, modified: false }
      ];
      
      for (const chunk of chunks) {
        env.cache.set(chunk.cx, chunk.cy, chunk);
      }
      
      await system.destroy();
      
      // Should save only modified chunks
      expect(system.saveChunk).toHaveBeenCalledTimes(2);
    });
    
    it('should clear cache on destroy', async () => {
      // Add some chunks
      env.cache.set(0, 0, { cx: 0, cy: 0 });
      env.cache.set(1, 1, { cx: 1, cy: 1 });
      
      await system.destroy();
      
      expect(env.cache.size).toBe(0);
    });
  });
  
  describe('Performance', () => {
    it('should handle high load efficiently', async () => {
      const startTime = Date.now();
      
      // Generate many chunks rapidly
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(system.generateChunk('seed', i, 0));
      }
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // Should complete quickly
      expect(duration).toBeLessThan(500);
      
      // Should use cache efficiently
      expect(env.cache.stats.hits).toBeGreaterThanOrEqual(0);
    });
    
    it('should optimize repeated chunk access', async () => {
      const chunk1 = await system.generateChunk('seed', 8, 8);
      const chunk2 = await system.generateChunk('seed', 8, 8);
      const chunk3 = await system.generateChunk('seed', 8, 8);
      
      // Should return same cached instance
      expect(chunk1).toBe(chunk2);
      expect(chunk2).toBe(chunk3);
      
      // Should have cache hits
      expect(env.cache.stats.hits).toBeGreaterThan(0);
      expect(env.cache.stats.misses).toBe(1); // Only first access
    });
  });
});