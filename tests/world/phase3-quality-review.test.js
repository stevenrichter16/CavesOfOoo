/**
 * Phase 3 Quality Review Tests
 * Comprehensive tests to identify logic errors, memory leaks, and quality issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Phase 3 Quality Review', () => {
  let ChunkSystem;
  let chunkSystem;
  let mockEventBus;
  
  beforeEach(async () => {
    mockEventBus = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn()
    };
    
    const module = await import('../../src/js/world/ChunkSystem.js');
    ChunkSystem = module.ChunkSystem;
    chunkSystem = new ChunkSystem(mockEventBus);
  });
  
  describe('Logic Errors', () => {
    it('should not regenerate cached chunks', async () => {
      const chunk = { cx: 0, cy: 0, map: [] };
      chunkSystem.cache.set(0, 0, chunk);
      
      const result = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Should return cached chunk without regeneration
      expect(result).toBe(chunk);
      expect(chunkSystem.pipeline.generate).not.toHaveBeenCalled();
    });
    
    it('should handle chunk boundary transitions correctly', () => {
      // Test edge case: moving from 0,0 to -1,0
      const result = chunkSystem.getChunkTransition(0, 10, -1, 0);
      
      expect(result.shouldTransition).toBe(true);
      expect(result.toCx).toBe(-1);
      expect(result.newX).toBe(23); // Should wrap to max X
    });
    
    it('should not lose quest modifications on chunk reload', async () => {
      const quest = {
        id: 'test_quest',
        targetChunk: { cx: 5, cy: 5 },
        modifications: {
          addMonster: { type: 'boss', x: 10, y: 10 }
        }
      };
      
      // Apply quest modification
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      const chunk = { cx: 5, cy: 5, monsters: [], metadata: {} };
      chunkSystem.cache.set(5, 5, chunk);
      
      await handler({ quest });
      
      // Verify modification
      expect(chunk.monsters).toHaveLength(1);
      expect(chunk.metadata.questModified).toBe(true);
      
      // Simulate chunk unload and reload
      chunkSystem.cache.cache.delete('5,5');
      chunkSystem.loadChunk = vi.fn().mockResolvedValue(chunk);
      
      const reloaded = await chunkSystem.generateChunk('seed', 5, 5);
      
      // Should preserve quest modifications
      expect(reloaded.monsters).toHaveLength(1);
      expect(reloaded.metadata.questModified).toBe(true);
    });
    
    it('should not duplicate entities when modifying chunks', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      const chunk = {
        cx: 10,
        cy: 10,
        monsters: [{ type: 'goblin', x: 5, y: 5 }],
        metadata: {}
      };
      
      chunkSystem.cache.set(10, 10, chunk);
      
      const quest1 = {
        id: 'quest1',
        targetChunk: { cx: 10, cy: 10 },
        modifications: {
          addMonster: { type: 'orc', x: 6, y: 6 }
        }
      };
      
      const quest2 = {
        id: 'quest2',
        targetChunk: { cx: 10, cy: 10 },
        modifications: {
          addMonster: { type: 'troll', x: 7, y: 7 }
        }
      };
      
      await handler({ quest: quest1 });
      await handler({ quest: quest2 });
      
      // Should have 3 monsters total, not duplicates
      expect(chunk.monsters).toHaveLength(3);
      expect(chunk.monsters.map(m => m.type)).toEqual(['goblin', 'orc', 'troll']);
    });
  });
  
  describe('Memory Leaks', () => {
    it('should not accumulate event handlers on multiple instances', () => {
      const system1 = new ChunkSystem(mockEventBus);
      const system2 = new ChunkSystem(mockEventBus);
      const system3 = new ChunkSystem(mockEventBus);
      
      // Each system should register exactly 3 handlers
      const expectedHandlers = 3 * 3; // 3 systems × 3 events each
      expect(mockEventBus.on).toHaveBeenCalledTimes(expectedHandlers);
    });
    
    it('should properly cleanup on destroy', async () => {
      const system = new ChunkSystem(mockEventBus);
      
      // Track registered handlers
      const handlers = mockEventBus.on.mock.calls.map(call => ({
        event: call[0],
        handler: call[1]
      }));
      
      await system.destroy();
      
      // Should unregister all handlers
      for (const { event, handler } of handlers) {
        expect(mockEventBus.off).toHaveBeenCalledWith(event, handler);
      }
    });
    
    it('should not retain references to destroyed chunks', async () => {
      const chunk1 = { cx: 0, cy: 0, map: [], id: 'chunk1' };
      const chunk2 = { cx: 1, cy: 1, map: [], id: 'chunk2' };
      
      chunkSystem.cache.set(0, 0, chunk1);
      chunkSystem.cache.set(1, 1, chunk2);
      
      // Clear cache
      chunkSystem.cache.clear();
      
      // Try to get chunks
      const result1 = chunkSystem.cache.get(0, 0);
      const result2 = chunkSystem.cache.get(1, 1);
      
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });
    
    it('should limit cache size to prevent memory overflow', () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: 10 });
      
      // Add more chunks than cache size
      for (let i = 0; i < 20; i++) {
        system.cache.set(i, 0, { cx: i, cy: 0 });
      }
      
      // Cache should not exceed limit
      const cacheSize = system.cache.cache.size;
      expect(cacheSize).toBeLessThanOrEqual(10);
    });
  });
  
  describe('Race Conditions', () => {
    it('should handle simultaneous chunk generation requests', async () => {
      let generateCallCount = 0;
      chunkSystem.pipeline.generate = vi.fn().mockImplementation(async (seed, cx, cy) => {
        generateCallCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { cx, cy, map: [], generated: true };
      });
      
      // Request same chunk multiple times simultaneously
      const promises = [
        chunkSystem.generateChunk('seed', 5, 5),
        chunkSystem.generateChunk('seed', 5, 5),
        chunkSystem.generateChunk('seed', 5, 5)
      ];
      
      const results = await Promise.all(promises);
      
      // Should only generate once
      expect(generateCallCount).toBe(1);
      
      // All should get the same chunk
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
    
    it('should handle rapid chunk transitions safely', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'PlayerChangedChunk')?.[1];
      
      // Simulate very rapid movement
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          from: { cx: i, cy: 0 },
          to: { cx: i + 1, cy: 0 },
          worldSeed: 'seed'
        });
      }
      
      // Fire all events without waiting
      const promises = events.map(e => handler(e));
      
      // Should handle all without errors
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
  
  describe('Input Validation', () => {
    it('should validate chunk coordinates', async () => {
      // Test with invalid coordinates
      const invalidCoords = [
        [null, 0],
        [0, undefined],
        ['not-a-number', 0],
        [Infinity, 0],
        [NaN, NaN]
      ];
      
      for (const [cx, cy] of invalidCoords) {
        const result = await chunkSystem.generateChunk('seed', cx, cy)
          .catch(err => err);
        
        // Should handle gracefully
        expect(result).toBeDefined();
      }
    });
    
    it('should validate quest modifications', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      const invalidQuests = [
        { id: 'no-target' }, // Missing targetChunk
        { id: 'null-target', targetChunk: null },
        { id: 'invalid-mods', targetChunk: { cx: 0, cy: 0 }, modifications: 'not-an-object' }
      ];
      
      for (const quest of invalidQuests) {
        // Should not throw
        await expect(handler({ quest })).resolves.not.toThrow();
      }
    });
    
    it('should validate template functions', () => {
      const invalidTemplate = {
        matches: 'not-a-function', // Should be a function
        generate: async () => ({ cx: 0, cy: 0 })
      };
      
      chunkSystem.registerTemplate('invalid', invalidTemplate);
      
      // Should not find invalid template
      const result = chunkSystem.registry.findTemplate(0, 0);
      expect(result).toBeNull();
    });
  });
  
  describe('Error Recovery', () => {
    it('should recover from pipeline generation failures', async () => {
      let attempts = 0;
      chunkSystem.pipeline.generate = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('First attempt failed');
        }
        return { cx: 0, cy: 0, map: [], recovered: true };
      });
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      expect(chunk.recovered).toBe(true);
      expect(attempts).toBe(2);
    });
    
    it('should handle corrupted cache data', async () => {
      // Set corrupted data in cache
      chunkSystem.cache.set(0, 0, null);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Should regenerate instead of returning null
      expect(chunk).not.toBeNull();
      expect(chunk.map).toBeDefined();
    });
    
    it('should handle event handler exceptions', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'PlayerChangedChunk')?.[1];
      
      // Mock generateChunk to throw
      chunkSystem.generateChunk = vi.fn().mockRejectedValue(new Error('Generation failed'));
      
      // Should not throw to caller
      await expect(handler({
        to: { cx: 1, cy: 1 },
        worldSeed: 'seed'
      })).resolves.not.toThrow();
    });
  });
  
  describe('Performance Concerns', () => {
    it('should not block on preloading', async () => {
      let preloadStarted = false;
      let preloadCompleted = false;
      
      chunkSystem.generateChunk = vi.fn().mockImplementation(async () => {
        preloadStarted = true;
        await new Promise(resolve => setTimeout(resolve, 50));
        preloadCompleted = true;
        return { map: [] };
      });
      
      const startTime = Date.now();
      const promise = chunkSystem.preloadAdjacentChunks('seed', 0, 0);
      const immediateTime = Date.now();
      
      // Should return immediately
      expect(immediateTime - startTime).toBeLessThan(10);
      expect(preloadStarted).toBe(true);
      expect(preloadCompleted).toBe(false);
      
      // Wait for completion
      await promise;
      expect(preloadCompleted).toBe(true);
    });
    
    it('should batch save operations efficiently', async () => {
      const chunks = Array.from({ length: 100 }, (_, i) => ({
        cx: i,
        cy: 0,
        modified: i % 2 === 0 // Half are modified
      }));
      
      chunkSystem.getAllChunks = () => chunks;
      chunkSystem.saveChunk = vi.fn().mockResolvedValue();
      
      const startTime = Date.now();
      await chunkSystem.destroy();
      const endTime = Date.now();
      
      // Should save only modified chunks
      expect(chunkSystem.saveChunk).toHaveBeenCalledTimes(50);
      
      // Should complete quickly (under 100ms for 50 saves)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate and default configuration options', () => {
      const system = new ChunkSystem(mockEventBus, {
        cacheSize: -1, // Invalid
        preloadRadius: 'not-a-number', // Invalid
        persistChunks: 'yes' // Should be boolean
      });
      
      // Should use defaults for invalid values
      expect(system.config.cacheSize).toBeGreaterThan(0);
      expect(typeof system.config.preloadRadius).toBe('number');
      expect(typeof system.config.persistChunks).toBe('boolean');
    });
    
    it('should enforce maximum preload radius', () => {
      const system = new ChunkSystem(mockEventBus, {
        preloadRadius: 10 // Too large
      });
      
      // Should cap at reasonable value
      expect(system.config.preloadRadius).toBeLessThanOrEqual(3);
    });
  });
  
  describe('Integration Points', () => {
    it('should properly integrate with event bus', () => {
      // Check all expected events are registered
      const registeredEvents = mockEventBus.on.mock.calls.map(call => call[0]);
      
      expect(registeredEvents).toContain('PlayerChangedChunk');
      expect(registeredEvents).toContain('ChunkRequested');
      expect(registeredEvents).toContain('QuestAccepted');
    });
    
    it('should emit expected events during lifecycle', async () => {
      chunkSystem.cache.get = vi.fn().mockReturnValue(null);
      
      await chunkSystem.generateChunk('seed', 0, 0);
      
      const emittedEvents = mockEventBus.emit.mock.calls.map(call => call[0]);
      
      expect(emittedEvents).toContain('ChunkGenerating');
      expect(emittedEvents).toContain('ChunkGenerated');
    });
    
    it('should handle missing event bus gracefully', () => {
      // Create system without event bus
      const system = new ChunkSystem(null);
      
      // Should not throw
      expect(() => system.setupEventListeners()).not.toThrow();
    });
  });
  
  describe('Data Integrity', () => {
    it('should maintain chunk coordinate consistency', async () => {
      const chunk = await chunkSystem.generateChunk('seed', 10, 20);
      
      expect(chunk.cx).toBe(10);
      expect(chunk.cy).toBe(20);
    });
    
    it('should preserve chunk metadata through operations', async () => {
      const chunk = {
        cx: 5,
        cy: 5,
        map: [],
        metadata: {
          biome: 'forest',
          generated: Date.now(),
          custom: 'data'
        }
      };
      
      chunkSystem.cache.set(5, 5, chunk);
      
      // Modify for quest
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      await handler({
        quest: {
          id: 'test',
          targetChunk: { cx: 5, cy: 5 },
          modifications: { addItem: { type: 'key' } }
        }
      });
      
      // Original metadata should be preserved
      expect(chunk.metadata.biome).toBe('forest');
      expect(chunk.metadata.custom).toBe('data');
      expect(chunk.metadata.questModified).toBe(true);
    });
  });
});