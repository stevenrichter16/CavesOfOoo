import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathCache } from '../../src/js/pathfinding/PathCache.js';

describe('PathCache', () => {
  let cache;

  beforeEach(() => {
    cache = new PathCache();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(cache.maxSize).toBe(100);
      expect(cache.maxAge).toBe(5000);
      expect(cache.size()).toBe(0);
    });

    it('should accept custom settings', () => {
      const customCache = new PathCache({
        maxSize: 50,
        maxAge: 10000
      });
      
      expect(customCache.maxSize).toBe(50);
      expect(customCache.maxAge).toBe(10000);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve paths', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ];
      
      cache.set({ x: 0, y: 0 }, { x: 2, y: 0 }, path);
      const retrieved = cache.get({ x: 0, y: 0 }, { x: 2, y: 0 });
      
      expect(retrieved).toEqual(path);
    });

    it('should return null for non-existent path', () => {
      const retrieved = cache.get({ x: 0, y: 0 }, { x: 5, y: 5 });
      expect(retrieved).toBeNull();
    });

    it('should handle bidirectional caching', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ];
      
      cache.set({ x: 0, y: 0 }, { x: 2, y: 0 }, path);
      
      // Should retrieve reversed path
      const reversed = cache.get({ x: 2, y: 0 }, { x: 0, y: 0 });
      expect(reversed).toEqual([
        { x: 2, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 }
      ]);
    });

    it('should update existing path', () => {
      const oldPath = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      const newPath = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }];
      
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, oldPath);
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, newPath);
      
      const retrieved = cache.get({ x: 0, y: 0 }, { x: 1, y: 0 });
      expect(retrieved).toEqual(newPath);
    });
  });

  describe('has', () => {
    it('should check if path exists', () => {
      const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      
      expect(cache.has({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
      
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, path);
      
      expect(cache.has({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
      expect(cache.has({ x: 1, y: 0 }, { x: 0, y: 0 })).toBe(true); // Bidirectional
    });
  });

  describe('delete', () => {
    it('should remove cached path', () => {
      const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, path);
      
      expect(cache.has({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
      
      cache.delete({ x: 0, y: 0 }, { x: 1, y: 0 });
      
      expect(cache.has({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
    });

    it('should return true if deleted, false otherwise', () => {
      const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, path);
      
      expect(cache.delete({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
      expect(cache.delete({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all cached paths', () => {
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      cache.set({ x: 2, y: 2 }, { x: 3, y: 3 }, []);
      cache.set({ x: 4, y: 4 }, { x: 5, y: 5 }, []);
      
      expect(cache.size()).toBe(3);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.get({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
    });
  });

  describe('invalidateArea', () => {
    it('should remove paths passing through area', () => {
      // Set up paths
      const path1 = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ];
      const path2 = [
        { x: 3, y: 3 },
        { x: 4, y: 4 },
        { x: 5, y: 5 }
      ];
      const path3 = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ];
      
      cache.set({ x: 0, y: 0 }, { x: 2, y: 0 }, path1);
      cache.set({ x: 3, y: 3 }, { x: 5, y: 5 }, path2);
      cache.set({ x: 0, y: 0 }, { x: 0, y: 2 }, path3);
      
      // Invalidate area containing (1, 0)
      cache.invalidateArea({ x: 0, y: 0, width: 2, height: 1 });
      
      // Path1 should be invalidated (passes through 1,0)
      expect(cache.get({ x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
      
      // Path2 should still exist (doesn't pass through area)
      expect(cache.get({ x: 3, y: 3 }, { x: 5, y: 5 })).toEqual(path2);
      
      // Path3 should be invalidated (starts in area)
      expect(cache.get({ x: 0, y: 0 }, { x: 0, y: 2 })).toBeNull();
    });

    it('should handle circular areas', () => {
      const path1 = [{ x: 5, y: 5 }, { x: 6, y: 6 }];
      const path2 = [{ x: 10, y: 10 }, { x: 11, y: 11 }];
      
      cache.set({ x: 5, y: 5 }, { x: 6, y: 6 }, path1);
      cache.set({ x: 10, y: 10 }, { x: 11, y: 11 }, path2);
      
      // Invalidate circular area around (5, 5) with radius 2
      cache.invalidateArea({ x: 5, y: 5, radius: 2 });
      
      expect(cache.get({ x: 5, y: 5 }, { x: 6, y: 6 })).toBeNull();
      expect(cache.get({ x: 10, y: 10 }, { x: 11, y: 11 })).toEqual(path2);
    });
  });

  describe('size limits', () => {
    it('should evict oldest entries when max size reached', () => {
      const smallCache = new PathCache({ maxSize: 3 });
      
      smallCache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      smallCache.set({ x: 1, y: 1 }, { x: 2, y: 2 }, []);
      smallCache.set({ x: 2, y: 2 }, { x: 3, y: 3 }, []);
      
      expect(smallCache.size()).toBe(3);
      
      // Adding fourth should evict first
      smallCache.set({ x: 3, y: 3 }, { x: 4, y: 4 }, []);
      
      expect(smallCache.size()).toBe(3);
      expect(smallCache.has({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
      expect(smallCache.has({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(true);
    });

    it('should update LRU order on get', () => {
      const smallCache = new PathCache({ maxSize: 3 });
      
      smallCache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      smallCache.set({ x: 1, y: 1 }, { x: 2, y: 2 }, []);
      smallCache.set({ x: 2, y: 2 }, { x: 3, y: 3 }, []);
      
      // Access first entry to make it most recently used
      smallCache.get({ x: 0, y: 0 }, { x: 1, y: 0 });
      
      // Adding fourth should evict second, not first
      smallCache.set({ x: 3, y: 3 }, { x: 4, y: 4 }, []);
      
      expect(smallCache.has({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
      expect(smallCache.has({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
    });
  });

  describe('age limits', () => {
    it('should expire old entries', async () => {
      const shortCache = new PathCache({ maxAge: 100 }); // 100ms expiry
      
      shortCache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      
      expect(shortCache.get({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortCache.get({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
    });

    it('should clean expired entries on access', async () => {
      const shortCache = new PathCache({ maxAge: 100 });
      
      shortCache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      shortCache.set({ x: 1, y: 1 }, { x: 2, y: 2 }, []);
      
      expect(shortCache.size()).toBe(2);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Accessing any entry should trigger cleanup
      shortCache.get({ x: 5, y: 5 }, { x: 6, y: 6 });
      
      expect(shortCache.size()).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = cache.getStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should track hits and misses', () => {
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      
      // Hit
      cache.get({ x: 0, y: 0 }, { x: 1, y: 0 });
      // Miss
      cache.get({ x: 2, y: 2 }, { x: 3, y: 3 });
      // Hit
      cache.get({ x: 0, y: 0 }, { x: 1, y: 0 });
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('performance', () => {
    it('should handle many paths efficiently', () => {
      const start = performance.now();
      
      // Add 1000 paths
      for (let i = 0; i < 1000; i++) {
        const path = [
          { x: i, y: i },
          { x: i + 1, y: i + 1 }
        ];
        cache.set({ x: i, y: i }, { x: i + 1, y: i + 1 }, path);
      }
      
      // Retrieve 1000 paths
      for (let i = 0; i < 1000; i++) {
        cache.get({ x: i, y: i }, { x: i + 1, y: i + 1 });
      }
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe('edge cases', () => {
    it('should handle null or undefined paths', () => {
      expect(() => {
        cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, null);
      }).toThrow();
      
      expect(() => {
        cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, undefined);
      }).toThrow();
    });

    it('should handle empty paths', () => {
      cache.set({ x: 0, y: 0 }, { x: 1, y: 0 }, []);
      expect(cache.get({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
    });

    it('should handle invalid positions', () => {
      expect(() => {
        cache.set(null, { x: 1, y: 0 }, []);
      }).toThrow();
      
      expect(() => {
        cache.set({ x: 0, y: 0 }, null, []);
      }).toThrow();
    });
  });
});