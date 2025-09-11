/**
 * Integration tests for ChunkSystem
 * Tests the complete world management system with all components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChunkSystem Integration', () => {
  let ChunkSystem;
  let chunkSystem;
  let mockEventBus;
  let mockCache;
  let mockRegistry;
  let mockPipeline;
  
  beforeEach(async () => {
    // Create comprehensive mocks
    mockEventBus = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn()
    };
    
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      on: vi.fn(),
      getAllChunks: vi.fn().mockReturnValue([])
    };
    
    mockRegistry = {
      templates: new Map(),
      findTemplate: vi.fn(),
      register: vi.fn()
    };
    
    mockPipeline = {
      generate: vi.fn().mockResolvedValue({
        cx: 0,
        cy: 0,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        biome: 'grassland',
        monsters: [],
        npcs: [],
        items: []
      })
    };
    
    // Import and setup ChunkSystem
    const module = await import('../../../src/js/world/ChunkSystem.js');
    ChunkSystem = module.ChunkSystem;
    
    // Create system with mocked dependencies
    chunkSystem = new ChunkSystem(mockEventBus);
    
    // Override internal components with mocks
    chunkSystem.cache = mockCache;
    chunkSystem.registry = mockRegistry;
    chunkSystem.pipeline = mockPipeline;
  });
  
  describe('Complete Chunk Generation Flow', () => {
    it('should follow cache -> persistence -> template -> pipeline flow', async () => {
      const cx = 5, cy = 5;
      const seed = 'test-seed';
      
      // Setup: no cache hit
      mockCache.get.mockReturnValue(null);
      
      // Setup: no persisted chunk
      chunkSystem.loadChunk = vi.fn().mockResolvedValue(null);
      
      // Setup: no template match
      mockRegistry.findTemplate.mockReturnValue(null);
      
      // Generate chunk
      const chunk = await chunkSystem.generateChunk(seed, cx, cy);
      
      // Verify flow order
      expect(mockCache.get).toHaveBeenCalledWith(cx, cy);
      expect(chunkSystem.loadChunk).toHaveBeenCalledWith(seed, cx, cy);
      expect(mockRegistry.findTemplate).toHaveBeenCalledWith(cx, cy);
      expect(mockPipeline.generate).toHaveBeenCalledWith(seed, cx, cy);
      
      // Verify chunk was cached
      expect(mockCache.set).toHaveBeenCalledWith(cx, cy, chunk);
      
      // Verify events
      expect(mockEventBus.emit).toHaveBeenCalledWith('ChunkGenerating', { cx, cy });
      expect(mockEventBus.emit).toHaveBeenCalledWith('ChunkGenerated', { chunk });
    });
    
    it('should handle special template chunks', async () => {
      const template = {
        matches: (cx, cy) => cx === 100 && cy === 100,
        generate: vi.fn().mockResolvedValue({
          cx: 100,
          cy: 100,
          map: Array(22).fill().map(() => Array(24).fill('.')),
          special: 'castle',
          metadata: { templateName: 'castle' }
        })
      };
      
      mockCache.get.mockReturnValue(null);
      mockRegistry.findTemplate.mockReturnValue(template);
      
      const chunk = await chunkSystem.generateChunk('seed', 100, 100);
      
      expect(chunk.special).toBe('castle');
      expect(chunk.metadata.templateName).toBe('castle');
      expect(template.generate).toHaveBeenCalled();
      expect(mockPipeline.generate).not.toHaveBeenCalled();
    });
  });
  
  describe('Movement System Integration', () => {
    it('should handle complete chunk transition', async () => {
      // Get the registered handler
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'PlayerChangedChunk')?.[1];
      
      expect(handler).toBeDefined();
      
      const event = {
        from: { cx: 0, cy: 0 },
        to: { cx: 1, cy: 0 },
        worldSeed: 'test-seed',
        player: { x: 0, y: 10 }
      };
      
      // Mock chunk generation
      const newChunk = { cx: 1, cy: 0, map: [] };
      mockCache.get.mockReturnValue(null);
      mockPipeline.generate.mockResolvedValue(newChunk);
      
      // Mock preloading
      chunkSystem.preloadAdjacentChunks = vi.fn().mockResolvedValue();
      
      await handler(event);
      
      expect(mockCache.set).toHaveBeenCalledWith(1, 0, newChunk);
      expect(chunkSystem.preloadAdjacentChunks).toHaveBeenCalledWith('test-seed', 1, 0);
      expect(mockEventBus.emit).toHaveBeenCalledWith('ChunkLoaded', { chunk: newChunk });
    });
    
    it('should detect chunk boundaries correctly', () => {
      // Test all edge cases
      const testCases = [
        // [x, y, dx, dy, expectedTransition, expectedNewChunk]
        [23, 10, 1, 0, true, { toCx: 1, toCy: 0, newX: 0, newY: 10 }],  // East edge
        [0, 10, -1, 0, true, { toCx: -1, toCy: 0, newX: 23, newY: 10 }], // West edge
        [10, 21, 0, 1, true, { toCx: 0, toCy: 1, newX: 10, newY: 0 }],   // South edge
        [10, 0, 0, -1, true, { toCx: 0, toCy: -1, newX: 10, newY: 21 }], // North edge
        [23, 21, 1, 1, true, { toCx: 1, toCy: 1, newX: 0, newY: 0 }],    // Southeast corner
        [12, 10, 1, 0, false, { toCx: 0, toCy: 0 }],                     // No transition
      ];
      
      for (const [x, y, dx, dy, shouldTransition, expected] of testCases) {
        const result = chunkSystem.getChunkTransition(x, y, dx, dy);
        
        expect(result.shouldTransition).toBe(shouldTransition);
        if (shouldTransition) {
          expect(result.toCx).toBe(expected.toCx);
          expect(result.toCy).toBe(expected.toCy);
          expect(result.newX).toBe(expected.newX);
          expect(result.newY).toBe(expected.newY);
        }
      }
    });
    
    it('should preload chunks in correct pattern', async () => {
      const generateSpy = vi.spyOn(chunkSystem, 'generateChunk')
        .mockResolvedValue({ map: [] });
      
      // Test radius 1 (default)
      await chunkSystem.preloadAdjacentChunks('seed', 0, 0);
      
      const calls = generateSpy.mock.calls;
      expect(calls).toHaveLength(8);
      
      // Verify all 8 adjacent chunks are loaded
      const coords = calls.map(call => [call[1], call[2]]);
      expect(coords).toContainEqual([-1, -1]);
      expect(coords).toContainEqual([0, -1]);
      expect(coords).toContainEqual([1, -1]);
      expect(coords).toContainEqual([-1, 0]);
      expect(coords).toContainEqual([1, 0]);
      expect(coords).toContainEqual([-1, 1]);
      expect(coords).toContainEqual([0, 1]);
      expect(coords).toContainEqual([1, 1]);
    });
    
    it('should handle preload failures gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      vi.spyOn(chunkSystem, 'generateChunk')
        .mockRejectedValue(new Error('Generation failed'));
      
      // Should not throw
      await expect(chunkSystem.preloadAdjacentChunks('seed', 0, 0))
        .resolves.not.toThrow();
      
      // Should log warnings
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('Quest System Integration', () => {
    it('should modify chunks for quest objectives', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      const quest = {
        id: 'dragon_slayer',
        name: 'Slay the Dragon',
        targetChunk: { cx: 50, cy: 50 },
        modifications: {
          addMonster: {
            type: 'dragon',
            x: 12,
            y: 11,
            hp: 500,
            isBoss: true
          },
          addItem: {
            type: 'dragon_egg',
            x: 12,
            y: 12,
            questItem: true
          }
        }
      };
      
      const targetChunk = {
        cx: 50,
        cy: 50,
        map: [],
        monsters: [],
        items: [],
        metadata: {}
      };
      
      mockCache.get.mockReturnValue(targetChunk);
      chunkSystem.saveChunk = vi.fn();
      
      await handler({ quest });
      
      // Verify modifications
      expect(targetChunk.monsters).toHaveLength(1);
      expect(targetChunk.monsters[0].type).toBe('dragon');
      expect(targetChunk.monsters[0].isBoss).toBe(true);
      
      expect(targetChunk.items).toHaveLength(1);
      expect(targetChunk.items[0].type).toBe('dragon_egg');
      expect(targetChunk.items[0].questItem).toBe(true);
      
      // Verify metadata
      expect(targetChunk.metadata.questModified).toBe(true);
      expect(targetChunk.metadata.questId).toBe('dragon_slayer');
      
      // Verify persistence
      expect(chunkSystem.saveChunk).toHaveBeenCalledWith('seed', targetChunk);
    });
    
    it('should generate chunk if not cached for quest', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      const quest = {
        id: 'find_treasure',
        targetChunk: { cx: 30, cy: 30 },
        modifications: {
          addItem: { type: 'treasure', x: 10, y: 10 }
        }
      };
      
      mockCache.get.mockReturnValue(null);
      
      const generatedChunk = {
        cx: 30,
        cy: 30,
        map: [],
        items: [],
        metadata: {}
      };
      
      mockPipeline.generate.mockResolvedValue(generatedChunk);
      
      await handler({ quest });
      
      // Should generate the chunk
      expect(mockPipeline.generate).toHaveBeenCalledWith('seed', 30, 30);
      
      // Should apply modifications
      expect(generatedChunk.items).toHaveLength(1);
      expect(generatedChunk.items[0].type).toBe('treasure');
    });
    
    it('should handle quest NPCs correctly', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      const quest = {
        id: 'rescue_mission',
        targetChunk: { cx: 15, cy: 15 },
        modifications: {
          addNPC: {
            type: 'prisoner',
            name: 'Princess Luna',
            x: 12,
            y: 11,
            dialogue: ['Please save me!', 'The dragon has kept me here for days!'],
            questNPC: true
          }
        }
      };
      
      const chunk = {
        cx: 15,
        cy: 15,
        npcs: [],
        metadata: {}
      };
      
      mockCache.get.mockReturnValue(chunk);
      
      await handler({ quest });
      
      expect(chunk.npcs).toHaveLength(1);
      expect(chunk.npcs[0].name).toBe('Princess Luna');
      expect(chunk.npcs[0].questNPC).toBe(true);
      expect(chunk.npcs[0].dialogue).toContain('Please save me!');
    });
  });
  
  describe('Error Handling and Recovery', () => {
    it('should retry on transient failures', async () => {
      let attempts = 0;
      mockPipeline.generate.mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Network timeout');
        }
        return { cx: 0, cy: 0, map: [], fallback: true };
      });
      
      mockCache.get.mockReturnValue(null);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      expect(chunk.fallback).toBe(true);
      expect(attempts).toBe(2);
    });
    
    it('should validate chunk structure', async () => {
      // Test with invalid chunk
      mockPipeline.generate.mockResolvedValue({ 
        // Missing required fields
        biome: 'forest' 
      });
      
      mockCache.get.mockReturnValue(null);
      
      await expect(chunkSystem.generateChunk('seed', 0, 0))
        .rejects.toThrow('Invalid chunk generated');
    });
    
    it('should handle concurrent generation requests', async () => {
      mockCache.get.mockReturnValue(null);
      
      let resolveGenerate;
      const generatePromise = new Promise(resolve => {
        resolveGenerate = resolve;
      });
      
      mockPipeline.generate.mockReturnValue(generatePromise);
      
      // Start multiple concurrent requests for same chunk
      const promise1 = chunkSystem.generateChunk('seed', 5, 5);
      const promise2 = chunkSystem.generateChunk('seed', 5, 5);
      const promise3 = chunkSystem.generateChunk('seed', 5, 5);
      
      // Resolve generation
      resolveGenerate({ cx: 5, cy: 5, map: [] });
      
      const [chunk1, chunk2, chunk3] = await Promise.all([promise1, promise2, promise3]);
      
      // All should get the same chunk
      expect(chunk1).toBe(chunk2);
      expect(chunk2).toBe(chunk3);
      
      // Should only generate once
      expect(mockPipeline.generate).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Persistence Integration', () => {
    it('should save modified chunks on cache eviction', async () => {
      const modifiedChunk = {
        cx: 10,
        cy: 10,
        modified: true,
        map: []
      };
      
      const unmodifiedChunk = {
        cx: 11,
        cy: 11,
        modified: false,
        map: []
      };
      
      chunkSystem.saveChunk = vi.fn();
      
      await chunkSystem.handleChunkUnload(modifiedChunk);
      await chunkSystem.handleChunkUnload(unmodifiedChunk);
      
      // Should only save modified chunk
      expect(chunkSystem.saveChunk).toHaveBeenCalledTimes(1);
      expect(chunkSystem.saveChunk).toHaveBeenCalledWith(
        expect.any(String),
        modifiedChunk
      );
    });
    
    it('should handle save failures gracefully', async () => {
      const chunk = {
        cx: 5,
        cy: 5,
        modified: true
      };
      
      chunkSystem.saveChunk = vi.fn()
        .mockRejectedValue(new Error('Disk full'));
      
      await chunkSystem.handleChunkUnload(chunk);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('ChunkSaveError', {
        chunk,
        error: expect.any(Error)
      });
    });
    
    it('should batch save on system shutdown', async () => {
      const chunks = [
        { cx: 0, cy: 0, modified: true },
        { cx: 1, cy: 1, modified: true },
        { cx: 2, cy: 2, modified: false },
        { cx: 3, cy: 3, modified: true }
      ];
      
      mockCache.getAllChunks.mockReturnValue(chunks);
      chunkSystem.saveChunk = vi.fn();
      
      await chunkSystem.destroy();
      
      // Should save all modified chunks
      expect(chunkSystem.saveChunk).toHaveBeenCalledTimes(3);
      
      // Should clear cache
      expect(mockCache.clear).toHaveBeenCalled();
      
      // Should remove event listeners
      expect(mockEventBus.off).toHaveBeenCalled();
    });
  });
  
  describe('Template System', () => {
    it('should register and find templates by coordinates', () => {
      const castleTemplate = {
        name: 'castle',
        matches: (cx, cy) => cx === 100 && cy === 100,
        generate: vi.fn()
      };
      
      const dungeonTemplate = {
        name: 'dungeon',
        matches: (cx, cy) => cx % 50 === 0 && cy % 50 === 0 && (cx !== 0 || cy !== 0),
        generate: vi.fn()
      };
      
      chunkSystem.registerTemplate('castle', castleTemplate);
      chunkSystem.registerTemplate('dungeon', dungeonTemplate);
      
      // Should find castle at specific coords
      expect(chunkSystem.registry.findTemplate(100, 100)).toBe(castleTemplate);
      
      // Should find dungeon at multiples of 50
      expect(chunkSystem.registry.findTemplate(50, 50)).toBe(dungeonTemplate);
      expect(chunkSystem.registry.findTemplate(150, 150)).toBe(dungeonTemplate);
      
      // Should not find at origin (excluded by dungeon condition)
      expect(chunkSystem.registry.findTemplate(0, 0)).toBeNull();
      
      // Should not find at random coords
      expect(chunkSystem.registry.findTemplate(37, 83)).toBeNull();
    });
    
    it('should allow template overrides', () => {
      const original = {
        matches: () => true,
        generate: vi.fn().mockResolvedValue({ type: 'original' })
      };
      
      const override = {
        matches: () => true,
        generate: vi.fn().mockResolvedValue({ type: 'override' })
      };
      
      chunkSystem.registerTemplate('special', original);
      chunkSystem.registerTemplate('special', override);
      
      expect(chunkSystem.registry.templates.get('special')).toBe(override);
    });
  });
  
  describe('Performance and Optimization', () => {
    it('should cache chunks to avoid regeneration', async () => {
      const cachedChunk = { cx: 0, cy: 0, map: [], cached: true };
      
      // First call - not cached
      mockCache.get.mockReturnValueOnce(null);
      mockPipeline.generate.mockResolvedValueOnce(cachedChunk);
      
      const chunk1 = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Second call - should be cached
      mockCache.get.mockReturnValueOnce(cachedChunk);
      
      const chunk2 = await chunkSystem.generateChunk('seed', 0, 0);
      
      expect(chunk1).toBe(chunk2);
      expect(mockPipeline.generate).toHaveBeenCalledTimes(1);
    });
    
    it('should respect cache size limits', () => {
      const config = {
        cacheSize: 50,
        preloadRadius: 2
      };
      
      const system = new ChunkSystem(mockEventBus, config);
      
      expect(system.config.cacheSize).toBe(50);
      expect(system.config.preloadRadius).toBe(2);
    });
    
    it('should handle rapid chunk transitions smoothly', async () => {
      const handler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'PlayerChangedChunk')?.[1];
      
      // Simulate rapid movement
      const transitions = [
        { from: { cx: 0, cy: 0 }, to: { cx: 1, cy: 0 } },
        { from: { cx: 1, cy: 0 }, to: { cx: 2, cy: 0 } },
        { from: { cx: 2, cy: 0 }, to: { cx: 3, cy: 0 } }
      ];
      
      mockCache.get.mockReturnValue(null);
      chunkSystem.preloadAdjacentChunks = vi.fn();
      
      const startTime = Date.now();
      
      await Promise.all(
        transitions.map(t => handler({ ...t, worldSeed: 'seed' }))
      );
      
      const endTime = Date.now();
      
      // Should complete quickly (under 100ms for 3 transitions)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should emit all events
      const loadedEvents = mockEventBus.emit.mock.calls
        .filter(call => call[0] === 'ChunkLoaded');
      expect(loadedEvents).toHaveLength(3);
    });
  });
  
  describe('Memory Management', () => {
    it('should not leak event handlers', () => {
      const system1 = new ChunkSystem(mockEventBus);
      const system2 = new ChunkSystem(mockEventBus);
      
      // Each system should register its own handlers
      const onCalls = mockEventBus.on.mock.calls;
      const system1Handlers = onCalls.slice(0, 3);
      const system2Handlers = onCalls.slice(3, 6);
      
      // Handlers should be different instances
      expect(system1Handlers[0][1]).not.toBe(system2Handlers[0][1]);
    });
    
    it('should clean up completely on destroy', async () => {
      const system = new ChunkSystem(mockEventBus);
      system.cache = mockCache;
      
      // Add some data
      system.registry.templates.set('test', {});
      system.eventHandlers.set('TestEvent', () => {});
      
      await system.destroy();
      
      // Should clear all data
      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockEventBus.off).toHaveBeenCalledTimes(3); // 3 registered events
    });
  });
});