/**
 * Final ChunkSystem tests - simplified to avoid recursion issues
 * Testing core functionality with proper mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupMockedChunkSystem } from './mocks/chunk-system-mocks.js';

describe('ChunkSystem Final Tests', () => {
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
  
  describe('Core Functionality', () => {
    it('should initialize with all components', () => {
      expect(system.cache).toBeDefined();
      expect(system.registry).toBeDefined();
      expect(system.pipeline).toBeDefined();
      expect(system.eventHandlers).toBeDefined();
      expect(system.config).toBeDefined();
    });
    
    it('should return cached chunks', async () => {
      const cachedChunk = { cx: 0, cy: 0, map: [], cached: true };
      env.cache.set(0, 0, cachedChunk);
      
      const chunk = await system.generateChunk('seed', 0, 0);
      
      expect(chunk).toBe(cachedChunk);
      expect(env.cache.stats.hits).toBe(1);
    });
    
    it('should generate new chunks via pipeline', async () => {
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
    
    it('should emit correct events', async () => {
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
  
  describe('Template System', () => {
    it('should use templates for special locations', async () => {
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
    
    it('should allow template registration', () => {
      const template = {
        matches: (cx, cy) => cx === 50 && cy === 50,
        generate: vi.fn()
      };
      
      system.registerTemplate('special', template);
      
      env.registry.updatePriorityList();
      const found = env.registry.findTemplate(50, 50);
      expect(found).toBe(template);
    });
  });
  
  describe('Movement Integration', () => {
    it('should detect chunk boundaries', () => {
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
    
    it('should handle chunk transition events', async () => {
      const handler = env.eventBus.handlers.get('PlayerChangedChunk')[0];
      
      // Mock the system methods to avoid recursion
      system.generateChunk = vi.fn().mockResolvedValue({ cx: 1, cy: 0, map: [] });
      system.preloadAdjacentChunks = vi.fn().mockResolvedValue();
      
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
      
      system.saveChunk = vi.fn(system.saveChunk);
      
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
  
  describe('Error Handling', () => {
    it('should handle generation failures', async () => {
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
    
    it('should validate coordinates', () => {
      expect(system.validateCoordinates(0, 0)).toBe(true);
      expect(system.validateCoordinates(-10, 10)).toBe(true);
      expect(system.validateCoordinates(NaN, 0)).toBe(false);
      expect(system.validateCoordinates(Infinity, 0)).toBe(false);
      expect(system.validateCoordinates('string', 0)).toBe(false);
      expect(system.validateCoordinates(null, null)).toBe(false);
    });
  });
  
  describe('Cache Management', () => {
    it('should respect cache limits', () => {
      const customSetup = setupMockedChunkSystem(ChunkSystem, {
        cacheSize: 10
      });
      
      // Add more chunks than cache size
      for (let i = 0; i < 20; i++) {
        customSetup.env.cache.set(i, 0, { cx: i, cy: 0 });
      }
      
      // Should not exceed configured limit
      expect(customSetup.env.cache.cache.size).toBeLessThanOrEqual(10);
    });
    
    it('should handle cache eviction', async () => {
      const evictHandler = vi.fn();
      env.cache.on('evict', evictHandler);
      
      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        env.cache.set(i, 0, { cx: i, cy: 0 });
      }
      
      expect(evictHandler).toHaveBeenCalled();
    });
  });
  
  describe('Persistence', () => {
    it('should save modified chunks on unload', async () => {
      const chunk = { cx: 10, cy: 10, modified: true };
      
      system.saveChunk = vi.fn(system.saveChunk);
      
      await system.handleChunkUnload(chunk);
      
      expect(system.saveChunk).toHaveBeenCalledWith(
        system.config.worldSeed,
        chunk
      );
    });
    
    it('should not save unmodified chunks', async () => {
      const chunk = { cx: 11, cy: 11, modified: false };
      
      system.saveChunk = vi.fn(system.saveChunk);
      
      await system.handleChunkUnload(chunk);
      
      expect(system.saveChunk).not.toHaveBeenCalled();
    });
  });
  
  describe('Cleanup', () => {
    it('should cleanup on destroy', async () => {
      // Track off calls
      const offCalls = [];
      env.eventBus.off = vi.fn((event, handler) => {
        offCalls.push([event, handler]);
      });
      
      // Add some chunks
      env.cache.set(0, 0, { cx: 0, cy: 0, modified: true });
      env.cache.set(1, 1, { cx: 1, cy: 1, modified: false });
      
      system.saveChunk = vi.fn(system.saveChunk);
      
      await system.destroy();
      
      // Should remove event handlers
      expect(offCalls.length).toBeGreaterThan(0);
      const eventNames = offCalls.map(call => call[0]);
      expect(eventNames).toContain('PlayerChangedChunk');
      expect(eventNames).toContain('ChunkRequested');
      expect(eventNames).toContain('QuestAccepted');
      
      // Should save modified chunks
      expect(system.saveChunk).toHaveBeenCalledTimes(1);
      
      // Should clear cache
      expect(env.cache.size).toBe(0);
    });
  });
  
  describe('Performance', () => {
    it('should handle repeated chunk access efficiently', async () => {
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
    
    it('should complete generation quickly', async () => {
      const startTime = Date.now();
      
      // Generate several chunks
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(system.generateChunk('seed', i, 0));
      }
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // Should complete quickly
      expect(duration).toBeLessThan(500);
    });
  });
  
  describe('Concurrent Generation', () => {
    it('should prevent duplicate generation of same chunk', async () => {
      // Track generation calls
      let generateCallCount = 0;
      env.pipeline.generate = vi.fn().mockImplementation(async (seed, cx, cy) => {
        generateCallCount++;
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return { cx, cy, map: [], biome: 'test' };
      });
      
      // Request same chunk multiple times concurrently
      const [chunk1, chunk2, chunk3] = await Promise.all([
        system.generateChunk('seed', 20, 20),
        system.generateChunk('seed', 20, 20),
        system.generateChunk('seed', 20, 20)
      ]);
      
      // All should get same chunk
      expect(chunk1).toBe(chunk2);
      expect(chunk2).toBe(chunk3);
      
      // Should only generate once
      expect(generateCallCount).toBe(1);
    });
  });
});