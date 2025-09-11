/**
 * Tests for ChunkSystem - Main orchestrator for chunk generation
 * Coordinates cache, registry, pipeline, and persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChunkSystem', () => {
  let ChunkSystem, EventBus;
  let chunkSystem, eventBus;
  
  beforeEach(async () => {
    // Import the actual ChunkSystem
    const systemModule = await import('../../src/js/world/ChunkSystem.js');
    ChunkSystem = systemModule.ChunkSystem;
    
    // Mock EventBus
    eventBus = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn()
    };
    
    chunkSystem = new ChunkSystem(eventBus);
    
    // Set up default mock for pipeline.generate
    if (!chunkSystem.pipeline.generate) {
      chunkSystem.pipeline.generate = vi.fn().mockResolvedValue({
        cx: 0,
        cy: 0,
        map: [],
        biome: 'grassland'
      });
    }
  });
  
  describe('Initialization', () => {
    it('should create cache, registry, and pipeline', () => {
      expect(chunkSystem.cache).toBeDefined();
      expect(chunkSystem.registry).toBeDefined();
      expect(chunkSystem.pipeline).toBeDefined();
    });
    
    it('should setup event listeners', () => {
      expect(eventBus.on).toHaveBeenCalledWith('PlayerChangedChunk', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('ChunkRequested', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('QuestAccepted', expect.any(Function));
    });
    
    it('should register default templates', () => {
      // Should have special location templates registered
      expect(chunkSystem.registry.findTemplate).toBeDefined();
    });
    
    it('should accept configuration options', () => {
      const system = new ChunkSystem(eventBus, {
        cacheSize: 50,
        preloadRadius: 2,
        persistChunks: true
      });
      
      expect(system.config.cacheSize).toBe(50);
      expect(system.config.preloadRadius).toBe(2);
      expect(system.config.persistChunks).toBe(true);
    });
  });
  
  describe('Chunk Generation', () => {
    it('should return cached chunk if available', async () => {
      const cachedChunk = { cx: 0, cy: 0, map: [] };
      chunkSystem.cache.get = vi.fn().mockReturnValue(cachedChunk);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      expect(chunk).toBe(cachedChunk);
      expect(chunkSystem.cache.get).toHaveBeenCalledWith(0, 0);
    });
    
    it('should load persisted chunk if available', async () => {
      const persistedChunk = { cx: 1, cy: 1, map: [], persisted: true };
      chunkSystem.cache.get = vi.fn().mockReturnValue(null);
      chunkSystem.loadChunk = vi.fn().mockResolvedValue(persistedChunk);
      
      const chunk = await chunkSystem.generateChunk('seed', 1, 1);
      
      expect(chunk).toBe(persistedChunk);
      expect(chunkSystem.loadChunk).toHaveBeenCalledWith('seed', 1, 1);
    });
    
    it('should use template if coordinates match', async () => {
      const template = {
        generate: vi.fn().mockResolvedValue({ cx: 2, cy: 2, special: 'candy' })
      };
      
      chunkSystem.cache.get = vi.fn().mockReturnValue(null);
      chunkSystem.loadChunk = vi.fn().mockResolvedValue(null);
      chunkSystem.registry.findTemplate = vi.fn().mockReturnValue(template);
      
      const chunk = await chunkSystem.generateChunk('seed', 2, 2);
      
      expect(chunk.special).toBe('candy');
      expect(template.generate).toHaveBeenCalledWith('seed', 2, 2);
    });
    
    it('should use pipeline for procedural generation', async () => {
      const generatedChunk = { cx: 3, cy: 3, biome: 'forest' };
      
      chunkSystem.cache.get = vi.fn().mockReturnValue(null);
      chunkSystem.loadChunk = vi.fn().mockResolvedValue(null);
      chunkSystem.registry.findTemplate = vi.fn().mockReturnValue(null);
      chunkSystem.pipeline.generate = vi.fn().mockResolvedValue(generatedChunk);
      
      const chunk = await chunkSystem.generateChunk('seed', 3, 3);
      
      expect(chunk).toBe(generatedChunk);
      expect(chunkSystem.pipeline.generate).toHaveBeenCalledWith('seed', 3, 3);
    });
    
    it('should cache generated chunks', async () => {
      const newChunk = { cx: 4, cy: 4 };
      
      chunkSystem.cache.get = vi.fn().mockReturnValue(null);
      chunkSystem.cache.set = vi.fn();
      chunkSystem.loadChunk = vi.fn().mockResolvedValue(null);
      chunkSystem.pipeline.generate = vi.fn().mockResolvedValue(newChunk);
      
      await chunkSystem.generateChunk('seed', 4, 4);
      
      expect(chunkSystem.cache.set).toHaveBeenCalledWith(4, 4, newChunk);
    });
    
    it('should emit events during generation', async () => {
      const newChunk = { cx: 5, cy: 5 };
      
      chunkSystem.cache.get = vi.fn().mockReturnValue(null);
      chunkSystem.pipeline.generate = vi.fn().mockResolvedValue(newChunk);
      
      await chunkSystem.generateChunk('seed', 5, 5);
      
      expect(eventBus.emit).toHaveBeenCalledWith('ChunkGenerating', { cx: 5, cy: 5 });
      expect(eventBus.emit).toHaveBeenCalledWith('ChunkGenerated', { chunk: newChunk });
    });
  });
  
  describe('Chunk Preloading', () => {
    it('should preload adjacent chunks', async () => {
      const generateSpy = vi.spyOn(chunkSystem, 'generateChunk');
      
      await chunkSystem.preloadAdjacentChunks('seed', 0, 0);
      
      // Should preload 8 adjacent chunks
      expect(generateSpy).toHaveBeenCalledTimes(8);
      expect(generateSpy).toHaveBeenCalledWith('seed', -1, -1);
      expect(generateSpy).toHaveBeenCalledWith('seed', 0, -1);
      expect(generateSpy).toHaveBeenCalledWith('seed', 1, -1);
      expect(generateSpy).toHaveBeenCalledWith('seed', -1, 0);
      expect(generateSpy).toHaveBeenCalledWith('seed', 1, 0);
      expect(generateSpy).toHaveBeenCalledWith('seed', -1, 1);
      expect(generateSpy).toHaveBeenCalledWith('seed', 0, 1);
      expect(generateSpy).toHaveBeenCalledWith('seed', 1, 1);
    });
    
    it('should respect preload radius configuration', async () => {
      chunkSystem.config = { preloadRadius: 2 };
      const generateSpy = vi.spyOn(chunkSystem, 'generateChunk');
      
      await chunkSystem.preloadAdjacentChunks('seed', 0, 0);
      
      // Should preload (5x5 - 1) = 24 chunks with radius 2
      expect(generateSpy).toHaveBeenCalledTimes(24);
    });
    
    it('should preload asynchronously without blocking', async () => {
      chunkSystem.generateChunk = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ map: [] }), 10))
      );
      
      const startTime = Date.now();
      const promise = chunkSystem.preloadAdjacentChunks('seed', 0, 0);
      const immediateTime = Date.now();
      
      // Should return immediately
      expect(immediateTime - startTime).toBeLessThan(5);
      
      // But still complete the preloading
      await promise;
      expect(chunkSystem.generateChunk).toHaveBeenCalledTimes(8);
    });
  });
  
  describe('Movement Integration', () => {
    it('should handle chunk transitions', async () => {
      const handler = eventBus.on.mock.calls
        .find(call => call[0] === 'PlayerChangedChunk')[1];
      
      const event = {
        from: { cx: 0, cy: 0 },
        to: { cx: 1, cy: 0 },
        player: { x: 0, y: 10 }
      };
      
      chunkSystem.generateChunk = vi.fn().mockResolvedValue({ cx: 1, cy: 0 });
      chunkSystem.preloadAdjacentChunks = vi.fn();
      
      await handler(event);
      
      expect(chunkSystem.generateChunk).toHaveBeenCalledWith(expect.any(String), 1, 0);
      expect(chunkSystem.preloadAdjacentChunks).toHaveBeenCalledWith(expect.any(String), 1, 0);
      expect(eventBus.emit).toHaveBeenCalledWith('ChunkLoaded', expect.objectContaining({
        chunk: expect.objectContaining({ cx: 1, cy: 0 })
      }));
    });
    
    it('should handle edge detection', () => {
      const result = chunkSystem.getChunkTransition(23, 10, 1, 0);
      
      expect(result).toEqual({
        shouldTransition: true,
        toCx: 1,
        toCy: 0,
        newX: 0,
        newY: 10
      });
    });
    
    it('should not transition when not at edge', () => {
      const result = chunkSystem.getChunkTransition(12, 10, 0, 1);
      
      expect(result.shouldTransition).toBe(false);
    });
    
    it('should handle diagonal transitions', () => {
      const result = chunkSystem.getChunkTransition(23, 21, 1, 1);
      
      expect(result).toEqual({
        shouldTransition: true,
        toCx: 1,
        toCy: 1,
        newX: 0,
        newY: 0
      });
    });
  });
  
  describe('Quest Integration', () => {
    it('should modify chunks for quests', async () => {
      const handler = eventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')[1];
      
      const quest = {
        id: 'rescue_princess',
        targetChunk: { cx: 10, cy: 10 },
        modifications: {
          addNPC: { type: 'princess', x: 12, y: 11 },
          addMonster: { type: 'dragon', x: 12, y: 10 }
        }
      };
      
      const chunk = { cx: 10, cy: 10, npcs: [], monsters: [] };
      chunkSystem.cache.get = vi.fn().mockReturnValue(chunk);
      
      await handler({ quest });
      
      expect(chunk.npcs).toHaveLength(1);
      expect(chunk.npcs[0].type).toBe('princess');
      expect(chunk.monsters).toHaveLength(1);
      expect(chunk.monsters[0].type).toBe('dragon');
    });
    
    it('should mark chunks as quest-modified', async () => {
      const handler = eventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')[1];
      
      const quest = {
        id: 'find_artifact',
        targetChunk: { cx: 5, cy: 5 },
        modifications: {
          addItem: { type: 'artifact', x: 10, y: 10 }
        }
      };
      
      const chunk = { cx: 5, cy: 5, items: [], metadata: {} };
      chunkSystem.cache.get = vi.fn().mockReturnValue(chunk);
      
      await handler({ quest });
      
      expect(chunk.metadata.questModified).toBe(true);
      expect(chunk.metadata.questId).toBe('find_artifact');
    });
    
    it('should persist quest modifications', async () => {
      const handler = eventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')[1];
      
      const quest = {
        id: 'defeat_boss',
        targetChunk: { cx: 20, cy: 20 }
      };
      
      const chunk = { cx: 20, cy: 20 };
      chunkSystem.cache.get = vi.fn().mockReturnValue(chunk);
      chunkSystem.saveChunk = vi.fn();
      
      await handler({ quest });
      
      expect(chunkSystem.saveChunk).toHaveBeenCalledWith('seed', chunk);
    });
  });
  
  describe('Persistence', () => {
    it('should save chunks when unloaded from cache', async () => {
      chunkSystem.saveChunk = vi.fn();
      const chunk = { cx: 0, cy: 0, modified: true };
      
      await chunkSystem.handleChunkUnload(chunk);
      
      expect(chunkSystem.saveChunk).toHaveBeenCalledWith(expect.any(String), chunk);
    });
    
    it('should not save unmodified chunks', async () => {
      chunkSystem.saveChunk = vi.fn();
      const chunk = { cx: 0, cy: 0, modified: false };
      
      await chunkSystem.handleChunkUnload(chunk);
      
      expect(chunkSystem.saveChunk).not.toHaveBeenCalled();
    });
    
    it('should handle save errors gracefully', async () => {
      chunkSystem.saveChunk = vi.fn().mockRejectedValue(new Error('Disk full'));
      const chunk = { cx: 0, cy: 0, modified: true };
      
      await chunkSystem.handleChunkUnload(chunk);
      
      expect(eventBus.emit).toHaveBeenCalledWith('ChunkSaveError', expect.objectContaining({
        chunk,
        error: expect.any(Error)
      }));
    });
  });
  
  describe('Template Registration', () => {
    it('should register special location templates', () => {
      const template = {
        matches: (cx, cy) => cx === 100 && cy === 100,
        generate: vi.fn()
      };
      
      chunkSystem.registerTemplate('castle', template);
      
      expect(chunkSystem.registry.templates.get('castle')).toBe(template);
    });
    
    it('should allow template overrides', () => {
      const original = { generate: vi.fn() };
      const override = { generate: vi.fn() };
      
      chunkSystem.registerTemplate('town', original);
      chunkSystem.registerTemplate('town', override);
      
      expect(chunkSystem.registry.templates.get('town')).toBe(override);
    });
    
    it('should find matching templates by coordinates', () => {
      const template = {
        matches: (cx, cy) => cx === 50 && cy === 50,
        generate: vi.fn()
      };
      
      chunkSystem.registerTemplate('special', template);
      
      const found = chunkSystem.registry.findTemplate(50, 50);
      expect(found).toBe(template);
      
      const notFound = chunkSystem.registry.findTemplate(51, 51);
      expect(notFound).toBeNull();
    });
  });
  
  describe('Cleanup', () => {
    it('should cleanup event listeners on destroy', () => {
      chunkSystem.destroy();
      
      expect(eventBus.off).toHaveBeenCalledWith('PlayerChangedChunk', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('ChunkRequested', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('QuestAccepted', expect.any(Function));
    });
    
    it('should save all modified chunks on destroy', async () => {
      const modifiedChunks = [
        { cx: 0, cy: 0, modified: true },
        { cx: 1, cy: 1, modified: true },
        { cx: 2, cy: 2, modified: false }
      ];
      
      chunkSystem.cache.getAllChunks = vi.fn().mockReturnValue(modifiedChunks);
      chunkSystem.saveChunk = vi.fn();
      
      await chunkSystem.destroy();
      
      expect(chunkSystem.saveChunk).toHaveBeenCalledTimes(2);
      expect(chunkSystem.saveChunk).toHaveBeenCalledWith(expect.any(String), modifiedChunks[0]);
      expect(chunkSystem.saveChunk).toHaveBeenCalledWith(expect.any(String), modifiedChunks[1]);
    });
    
    it('should clear cache on destroy', () => {
      chunkSystem.cache.clear = vi.fn();
      
      chunkSystem.destroy();
      
      expect(chunkSystem.cache.clear).toHaveBeenCalled();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle generation errors with fallback', async () => {
      chunkSystem.pipeline.generate = vi.fn()
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({ cx: 0, cy: 0, fallback: true });
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      expect(chunk.fallback).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith('ChunkGenerationError', expect.any(Object));
    });
    
    it('should retry failed chunk loads', async () => {
      chunkSystem.loadChunk = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ cx: 0, cy: 0, loaded: true });
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      expect(chunk.loaded).toBe(true);
      expect(chunkSystem.loadChunk).toHaveBeenCalledTimes(2);
    });
    
    it('should validate generated chunks', async () => {
      const invalidChunk = { cx: 0, cy: 0 }; // Missing required fields
      chunkSystem.pipeline.generate = vi.fn().mockResolvedValue(invalidChunk);
      chunkSystem.validateChunk = vi.fn().mockReturnValue(false);
      
      await expect(chunkSystem.generateChunk('seed', 0, 0))
        .rejects.toThrow('Invalid chunk generated');
    });
  });
});