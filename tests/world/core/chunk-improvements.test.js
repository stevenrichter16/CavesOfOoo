/**
 * Tests for Phase 1 Improvements
 * Testing constants, validation, and performance optimizations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Chunk Improvements', () => {
  
  describe('Tile Type Constants', () => {
    it('should export TILE_TYPES constant', async () => {
      const { TILE_TYPES } = await import('../../../src/js/world/core/Chunk.js');
      
      expect(TILE_TYPES).toBeDefined();
      expect(TILE_TYPES.WALL).toBe('#');
      expect(TILE_TYPES.FLOOR).toBe('.');
      expect(TILE_TYPES.FLOOR_ALT).toBe('·');
      expect(TILE_TYPES.WATER).toBe('~');
    });
    
    it('should export PASSABLE_TILES Set', async () => {
      const { PASSABLE_TILES } = await import('../../../src/js/world/core/Chunk.js');
      
      expect(PASSABLE_TILES).toBeInstanceOf(Set);
      expect(PASSABLE_TILES.has('.')).toBe(true);
      expect(PASSABLE_TILES.has('·')).toBe(true);
      expect(PASSABLE_TILES.has('~')).toBe(true);
      expect(PASSABLE_TILES.has('#')).toBe(false);
    });
    
    it('should use PASSABLE_TILES in isPassable method', async () => {
      const { Chunk, TILE_TYPES } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(0, 0, TILE_TYPES.FLOOR);
      chunk.setTile(1, 0, TILE_TYPES.WATER);
      chunk.setTile(2, 0, TILE_TYPES.WALL);
      
      expect(chunk.isPassable(0, 0)).toBe(true);
      expect(chunk.isPassable(1, 0)).toBe(true);
      expect(chunk.isPassable(2, 0)).toBe(false);
    });
  });
  
  describe('Input Validation', () => {
    it('should validate chunk coordinates are integers', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      expect(() => new Chunk(1.5, 0)).toThrow('Chunk coordinates must be integers');
      expect(() => new Chunk(0, 'string')).toThrow('Chunk coordinates must be integers');
      expect(() => new Chunk(null, 0)).toThrow('Chunk coordinates must be integers');
      expect(() => new Chunk(undefined, 0)).toThrow('Chunk coordinates must be integers');
      expect(() => new Chunk(NaN, 0)).toThrow('Chunk coordinates must be integers');
      
      // Valid integers should work
      expect(() => new Chunk(0, 0)).not.toThrow();
      expect(() => new Chunk(-5, 10)).not.toThrow();
    });
    
    it('should validate setTile input', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      // Should validate tile is a single character
      expect(() => chunk.setTile(0, 0, 'ab')).toThrow('Tile must be a single character');
      expect(() => chunk.setTile(0, 0, '')).toThrow('Tile must be a single character');
      expect(() => chunk.setTile(0, 0, null)).toThrow('Tile must be a single character');
      
      // Valid single character should work
      expect(() => chunk.setTile(0, 0, '.')).not.toThrow();
    });
  });
  
  describe('Entity Spatial Index', () => {
    it('should maintain spatial index for entities', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      // Should have spatial index
      expect(chunk._entityIndex).toBeDefined();
      expect(chunk._entityIndex).toBeInstanceOf(Map);
    });
    
    it('should update spatial index when adding monsters', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const monster = { x: 5, y: 5, alive: true, type: 'skeleton' };
      chunk.addMonster(monster);
      
      expect(chunk.hasEntityAt(5, 5)).toBe(true);
      expect(chunk._entityIndex.get('5,5')).toContain(monster);
    });
    
    it('should update spatial index when adding NPCs', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const npc = { x: 10, y: 10, id: 'vendor' };
      chunk.addNPC(npc);
      
      expect(chunk.hasEntityAt(10, 10)).toBe(true);
      expect(chunk._entityIndex.get('10,10')).toContain(npc);
    });
    
    it('should remove from spatial index when entity dies', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const monster = { x: 5, y: 5, alive: true, type: 'skeleton' };
      chunk.addMonster(monster);
      
      expect(chunk.hasEntityAt(5, 5)).toBe(true);
      
      // Kill the monster
      monster.alive = false;
      chunk.updateEntity(monster);
      
      expect(chunk.hasEntityAt(5, 5)).toBe(false);
    });
    
    it('should handle entity movement in spatial index', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const npc = { x: 5, y: 5, id: 'vendor' };
      chunk.addNPC(npc);
      
      // Move the NPC
      chunk.moveEntity(npc, 7, 7);
      
      expect(chunk.hasEntityAt(5, 5)).toBe(false);
      expect(chunk.hasEntityAt(7, 7)).toBe(true);
      expect(npc.x).toBe(7);
      expect(npc.y).toBe(7);
    });
    
    it('should have O(1) hasEntityAt performance', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      // Add many entities
      for (let i = 0; i < 100; i++) {
        chunk.addMonster({ x: i % 24, y: Math.floor(i / 24), alive: true });
      }
      
      // Should be O(1) lookup, not O(n)
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        chunk.hasEntityAt(10, 10);
      }
      const time = performance.now() - start;
      
      expect(time).toBeLessThan(10); // Should be very fast
    });
  });
  
  describe('Empty Tiles Caching', () => {
    it('should cache empty tiles result', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      // Set some passable tiles
      chunk.setTile(5, 5, '.');
      chunk.setTile(10, 10, '.');
      
      const tiles1 = chunk.findEmptyTiles();
      const tiles2 = chunk.findEmptyTiles();
      
      // Should return the same cached array
      expect(tiles1).toBe(tiles2);
    });
    
    it('should invalidate cache when tiles change', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(5, 5, '.');
      const tiles1 = chunk.findEmptyTiles();
      
      chunk.setTile(10, 10, '.');
      const tiles2 = chunk.findEmptyTiles();
      
      // Should be different arrays after modification
      expect(tiles1).not.toBe(tiles2);
      expect(tiles2.length).toBe(tiles1.length + 1);
    });
    
    it('should invalidate cache when entities change', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(5, 5, '.');
      chunk.setTile(10, 10, '.');
      
      const tiles1 = chunk.findEmptyTiles();
      expect(tiles1.length).toBe(2);
      
      chunk.addMonster({ x: 5, y: 5, alive: true });
      const tiles2 = chunk.findEmptyTiles();
      
      expect(tiles1).not.toBe(tiles2);
      expect(tiles2.length).toBe(1);
    });
  });
});

describe('ChunkCache Improvements', () => {
  
  describe('Better LRU Implementation', () => {
    it('should have O(1) eviction performance', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const cache = new ChunkCache(100);
      
      // Fill cache
      for (let i = 0; i < 100; i++) {
        cache.set(i, 0, new Chunk(i, 0));
      }
      
      // Time adding one more (triggers eviction)
      const start = performance.now();
      cache.set(100, 0, new Chunk(100, 0));
      const time = performance.now() - start;
      
      // Should be very fast (< 1ms) for O(1) operation
      expect(time).toBeLessThan(1);
    });
    
    it('should use doubly-linked list for LRU', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      
      const cache = new ChunkCache(3);
      
      // Internal structure should have head and tail
      expect(cache._head).toBeDefined();
      expect(cache._tail).toBeDefined();
    });
    
    it('should handle accessCounter overflow', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const cache = new ChunkCache(2);
      
      // Set accessCounter near max
      cache.accessCounter = Number.MAX_SAFE_INTEGER - 1;
      
      cache.set(0, 0, new Chunk(0, 0));
      cache.set(1, 0, new Chunk(1, 0));
      
      // Should handle overflow gracefully
      expect(() => cache.set(2, 0, new Chunk(2, 0))).not.toThrow();
      expect(cache.accessCounter).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
  });
  
  describe('Cache Events', () => {
    it('should emit eviction events', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const cache = new ChunkCache(2);
      const evictionHandler = vi.fn();
      
      cache.on('evicted', evictionHandler);
      
      cache.set(0, 0, new Chunk(0, 0));
      cache.set(1, 0, new Chunk(1, 0));
      cache.set(2, 0, new Chunk(2, 0)); // Should evict (0,0)
      
      expect(evictionHandler).toHaveBeenCalledWith({
        key: '0,0',
        chunk: expect.any(Object)
      });
    });
    
    it('should emit cache hit/miss events', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const cache = new ChunkCache(10);
      const hitHandler = vi.fn();
      const missHandler = vi.fn();
      
      cache.on('hit', hitHandler);
      cache.on('miss', missHandler);
      
      cache.set(0, 0, new Chunk(0, 0));
      
      cache.get(0, 0); // Hit
      cache.get(1, 0); // Miss
      
      expect(hitHandler).toHaveBeenCalledOnce();
      expect(missHandler).toHaveBeenCalledOnce();
    });
  });
  
  describe('Cache Statistics', () => {
    it('should track cache statistics', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const cache = new ChunkCache(10);
      
      cache.set(0, 0, new Chunk(0, 0));
      cache.get(0, 0); // Hit
      cache.get(1, 0); // Miss
      cache.get(0, 0); // Hit
      
      const stats = cache.getStatistics();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(10);
    });
  });
});

describe('ChunkRegistry Improvements', () => {
  
  describe('Sorted Insertion', () => {
    it('should insert templates in sorted order', async () => {
      const { ChunkRegistry } = await import('../../../src/js/world/core/ChunkRegistry.js');
      
      const registry = new ChunkRegistry();
      const registerSpy = vi.spyOn(registry.templateList, 'sort');
      
      registry.register({ id: 'low', priority: 1, generate: () => {} });
      registry.register({ id: 'high', priority: 10, generate: () => {} });
      registry.register({ id: 'medium', priority: 5, generate: () => {} });
      
      // Should not need to sort every time
      expect(registerSpy).not.toHaveBeenCalled();
      
      // Templates should still be in priority order
      const templates = registry.getAllTemplates();
      expect(templates[0].id).toBe('high');
      expect(templates[1].id).toBe('medium');
      expect(templates[2].id).toBe('low');
    });
  });
  
  describe('Template Validation', () => {
    it('should validate template has generate method or layout', async () => {
      const { ChunkRegistry } = await import('../../../src/js/world/core/ChunkRegistry.js');
      
      const registry = new ChunkRegistry();
      
      // Should require generate method or layout
      expect(() => {
        registry.register({ id: 'invalid' });
      }).toThrow('Template must have a generate method or layout property');
      
      // Valid with generate
      expect(() => {
        registry.register({ id: 'valid1', generate: () => {} });
      }).not.toThrow();
      
      // Valid with layout
      expect(() => {
        registry.register({ id: 'valid2', layout: [] });
      }).not.toThrow();
    });
  });
});