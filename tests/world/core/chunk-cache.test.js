/**
 * Tests for ChunkCache
 * Testing the caching layer with LRU eviction for chunks
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('ChunkCache', () => {
  let ChunkCache, Chunk;
  
  beforeEach(async () => {
    const cacheModule = await import('../../../src/js/world/core/ChunkCache.js');
    const chunkModule = await import('../../../src/js/world/core/Chunk.js');
    ChunkCache = cacheModule.ChunkCache;
    Chunk = chunkModule.Chunk;
  });
  
  describe('Basic Caching', () => {
    it('should store chunks by coordinates', () => {
      const cache = new ChunkCache(10);
      const chunk = new Chunk(5, -3);
      
      cache.set(5, -3, chunk);
      
      expect(cache.has(5, -3)).toBe(true);
    });
    
    it('should retrieve cached chunks', () => {
      const cache = new ChunkCache(10);
      const chunk = new Chunk(0, 0);
      chunk.special = 'test_chunk';
      
      cache.set(0, 0, chunk);
      const retrieved = cache.get(0, 0);
      
      expect(retrieved).toBe(chunk);
      expect(retrieved.special).toBe('test_chunk');
    });
    
    it('should return null for uncached chunks', () => {
      const cache = new ChunkCache(10);
      
      const result = cache.get(1, 1);
      
      expect(result).toBeNull();
    });
    
    it('should handle negative coordinates', () => {
      const cache = new ChunkCache(10);
      const chunk = new Chunk(-5, -10);
      
      cache.set(-5, -10, chunk);
      
      expect(cache.has(-5, -10)).toBe(true);
      expect(cache.get(-5, -10)).toBe(chunk);
    });
    
    it('should distinguish between different coordinates', () => {
      const cache = new ChunkCache(10);
      const chunk1 = new Chunk(1, 0);
      const chunk2 = new Chunk(0, 1);
      
      chunk1.special = 'chunk1';
      chunk2.special = 'chunk2';
      
      cache.set(1, 0, chunk1);
      cache.set(0, 1, chunk2);
      
      expect(cache.get(1, 0).special).toBe('chunk1');
      expect(cache.get(0, 1).special).toBe('chunk2');
    });
  });
  
  describe('LRU Eviction', () => {
    it('should evict least recently used when full', () => {
      const cache = new ChunkCache(3);
      
      const chunk1 = new Chunk(0, 0);
      const chunk2 = new Chunk(1, 0);
      const chunk3 = new Chunk(2, 0);
      const chunk4 = new Chunk(3, 0);
      
      cache.set(0, 0, chunk1);
      cache.set(1, 0, chunk2);
      cache.set(2, 0, chunk3);
      
      // Cache is now full
      expect(cache.size).toBe(3);
      
      // Adding a 4th chunk should evict the least recently used (chunk1)
      cache.set(3, 0, chunk4);
      
      expect(cache.has(0, 0)).toBe(false); // chunk1 evicted
      expect(cache.has(1, 0)).toBe(true);
      expect(cache.has(2, 0)).toBe(true);
      expect(cache.has(3, 0)).toBe(true);
      expect(cache.size).toBe(3);
    });
    
    it('should update access time on get', () => {
      const cache = new ChunkCache(3);
      
      const chunk1 = new Chunk(0, 0);
      const chunk2 = new Chunk(1, 0);
      const chunk3 = new Chunk(2, 0);
      const chunk4 = new Chunk(3, 0);
      
      cache.set(0, 0, chunk1);
      cache.set(1, 0, chunk2);
      cache.set(2, 0, chunk3);
      
      // Access chunk1 to make it recently used
      cache.get(0, 0);
      
      // Now chunk2 is least recently used
      cache.set(3, 0, chunk4);
      
      expect(cache.has(0, 0)).toBe(true); // chunk1 still here (was accessed)
      expect(cache.has(1, 0)).toBe(false); // chunk2 evicted (LRU)
      expect(cache.has(2, 0)).toBe(true);
      expect(cache.has(3, 0)).toBe(true);
    });
    
    it('should not evict recently accessed chunks', () => {
      const cache = new ChunkCache(2);
      
      const chunk1 = new Chunk(0, 0);
      const chunk2 = new Chunk(1, 0);
      const chunk3 = new Chunk(2, 0);
      
      cache.set(0, 0, chunk1);
      cache.set(1, 0, chunk2);
      
      // Access both chunks multiple times
      cache.get(0, 0);
      cache.get(1, 0);
      cache.get(0, 0);
      
      // Add new chunk - should evict chunk2 (accessed less recently)
      cache.set(2, 0, chunk3);
      
      expect(cache.has(0, 0)).toBe(true);
      expect(cache.has(1, 0)).toBe(false);
      expect(cache.has(2, 0)).toBe(true);
    });
    
    it('should handle re-setting existing chunks', () => {
      const cache = new ChunkCache(2);
      
      const chunk1 = new Chunk(0, 0);
      const chunk2 = new Chunk(1, 0);
      const chunk1Updated = new Chunk(0, 0);
      chunk1Updated.special = 'updated';
      
      cache.set(0, 0, chunk1);
      cache.set(1, 0, chunk2);
      
      // Re-set chunk at (0,0) with new data
      cache.set(0, 0, chunk1Updated);
      
      expect(cache.size).toBe(2); // Size shouldn't increase
      expect(cache.get(0, 0).special).toBe('updated');
    });
  });
  
  describe('Cache Operations', () => {
    it('should clear all chunks', () => {
      const cache = new ChunkCache(10);
      
      cache.set(0, 0, new Chunk(0, 0));
      cache.set(1, 0, new Chunk(1, 0));
      cache.set(2, 0, new Chunk(2, 0));
      
      expect(cache.size).toBe(3);
      
      cache.clear();
      
      expect(cache.size).toBe(0);
      expect(cache.has(0, 0)).toBe(false);
      expect(cache.has(1, 0)).toBe(false);
      expect(cache.has(2, 0)).toBe(false);
    });
    
    it('should check existence with has()', () => {
      const cache = new ChunkCache(10);
      const chunk = new Chunk(5, 5);
      
      expect(cache.has(5, 5)).toBe(false);
      
      cache.set(5, 5, chunk);
      
      expect(cache.has(5, 5)).toBe(true);
    });
    
    it('should delete specific chunk', () => {
      const cache = new ChunkCache(10);
      
      cache.set(0, 0, new Chunk(0, 0));
      cache.set(1, 0, new Chunk(1, 0));
      
      expect(cache.size).toBe(2);
      
      const deleted = cache.delete(0, 0);
      
      expect(deleted).toBe(true);
      expect(cache.size).toBe(1);
      expect(cache.has(0, 0)).toBe(false);
      expect(cache.has(1, 0)).toBe(true);
    });
    
    it('should return false when deleting non-existent chunk', () => {
      const cache = new ChunkCache(10);
      
      const deleted = cache.delete(0, 0);
      
      expect(deleted).toBe(false);
    });
    
    it('should track chunk count with size property', () => {
      const cache = new ChunkCache(10);
      
      expect(cache.size).toBe(0);
      
      cache.set(0, 0, new Chunk(0, 0));
      expect(cache.size).toBe(1);
      
      cache.set(1, 0, new Chunk(1, 0));
      expect(cache.size).toBe(2);
      
      cache.delete(0, 0);
      expect(cache.size).toBe(1);
      
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
  
  describe('Memory Limits', () => {
    it('should enforce maximum size of 100 chunks by default', () => {
      const cache = new ChunkCache(); // Default max size
      
      // Add 101 chunks
      for (let i = 0; i < 101; i++) {
        cache.set(i, 0, new Chunk(i, 0));
      }
      
      // Should only have 100 chunks (first one evicted)
      expect(cache.size).toBe(100);
      expect(cache.has(0, 0)).toBe(false); // First chunk evicted
      expect(cache.has(100, 0)).toBe(true); // Last chunk present
    });
    
    it('should handle cache overflow gracefully', () => {
      const cache = new ChunkCache(2);
      
      // Rapidly add many chunks
      for (let i = 0; i < 10; i++) {
        cache.set(i, 0, new Chunk(i, 0));
      }
      
      // Should maintain size limit
      expect(cache.size).toBe(2);
      
      // Most recent chunks should be present
      expect(cache.has(8, 0)).toBe(true);
      expect(cache.has(9, 0)).toBe(true);
    });
    
    it('should accept custom max size', () => {
      const cache = new ChunkCache(5);
      
      for (let i = 0; i < 10; i++) {
        cache.set(i, 0, new Chunk(i, 0));
      }
      
      expect(cache.size).toBe(5);
    });
    
    it('should handle max size of 1', () => {
      const cache = new ChunkCache(1);
      
      const chunk1 = new Chunk(0, 0);
      const chunk2 = new Chunk(1, 0);
      
      cache.set(0, 0, chunk1);
      expect(cache.has(0, 0)).toBe(true);
      
      cache.set(1, 0, chunk2);
      expect(cache.has(0, 0)).toBe(false);
      expect(cache.has(1, 0)).toBe(true);
      expect(cache.size).toBe(1);
    });
  });
  
  describe('Cache Key Generation', () => {
    it('should generate consistent keys for same coordinates', () => {
      const cache = new ChunkCache(10);
      const chunk = new Chunk(5, -3);
      
      cache.set(5, -3, chunk);
      
      // Should retrieve same chunk with same coordinates
      const retrieved1 = cache.get(5, -3);
      const retrieved2 = cache.get(5, -3);
      
      expect(retrieved1).toBe(retrieved2);
    });
    
    it('should handle coordinate edge cases', () => {
      const cache = new ChunkCache(10);
      
      // Test various coordinate combinations
      const coords = [
        [0, 0],
        [-1, -1],
        [1000, 1000],
        [-1000, -1000],
        [0, -1],
        [-1, 0]
      ];
      
      coords.forEach(([x, y]) => {
        const chunk = new Chunk(x, y);
        cache.set(x, y, chunk);
        expect(cache.get(x, y)).toBe(chunk);
      });
    });
  });
});