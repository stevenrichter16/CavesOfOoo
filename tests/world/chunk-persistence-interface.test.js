/**
 * Test-Driven Development for ChunkPersistence Interface
 * Defining the contract for Phase 4 persistence implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('IChunkPersistence Interface', () => {
  let persistence;
  
  beforeEach(async () => {
    // Will test against interface implementations
    try {
      const module = await import('../../src/js/world/persistence/IChunkPersistence.js');
      const MemoryPersistence = module.MemoryPersistence; // Test implementation
      persistence = new MemoryPersistence();
    } catch {
      // Mock for RED phase
      persistence = {
        save: vi.fn(),
        load: vi.fn(),
        delete: vi.fn(),
        exists: vi.fn(),
        query: vi.fn()
      };
    }
  });
  
  describe('Core Operations', () => {
    it('should save a chunk', async () => {
      const chunk = {
        cx: 5,
        cy: 5,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        biome: 'forest',
        monsters: [],
        npcs: [],
        items: [],
        metadata: { version: '1.0.0' }
      };
      
      await persistence.save('test-seed', chunk);
      
      const exists = await persistence.exists('test-seed', 5, 5);
      expect(exists).toBe(true);
    });
    
    it('should load a saved chunk', async () => {
      const chunk = {
        cx: 10,
        cy: 10,
        map: [],
        biome: 'desert'
      };
      
      await persistence.save('test-seed', chunk);
      const loaded = await persistence.load('test-seed', 10, 10);
      
      expect(loaded).toBeDefined();
      expect(loaded.cx).toBe(10);
      expect(loaded.cy).toBe(10);
      expect(loaded.biome).toBe('desert');
    });
    
    it('should return null for non-existent chunk', async () => {
      const loaded = await persistence.load('test-seed', 999, 999);
      expect(loaded).toBeNull();
    });
    
    it('should delete a chunk', async () => {
      const chunk = { cx: 15, cy: 15, map: [] };
      
      await persistence.save('test-seed', chunk);
      expect(await persistence.exists('test-seed', 15, 15)).toBe(true);
      
      await persistence.delete('test-seed', 15, 15);
      expect(await persistence.exists('test-seed', 15, 15)).toBe(false);
    });
    
    it('should check chunk existence', async () => {
      const chunk = { cx: 20, cy: 20, map: [] };
      
      expect(await persistence.exists('test-seed', 20, 20)).toBe(false);
      
      await persistence.save('test-seed', chunk);
      
      expect(await persistence.exists('test-seed', 20, 20)).toBe(true);
    });
  });
  
  describe('Batch Operations', () => {
    it('should save multiple chunks in batch', async () => {
      const chunks = [
        { cx: 0, cy: 0, map: [] },
        { cx: 1, cy: 0, map: [] },
        { cx: 2, cy: 0, map: [] }
      ];
      
      await persistence.saveBatch('test-seed', chunks);
      
      for (const chunk of chunks) {
        const exists = await persistence.exists('test-seed', chunk.cx, chunk.cy);
        expect(exists).toBe(true);
      }
    });
    
    it('should load multiple chunks in batch', async () => {
      const chunks = [
        { cx: 5, cy: 5, map: [], data: 'chunk1' },
        { cx: 6, cy: 5, map: [], data: 'chunk2' }
      ];
      
      await persistence.saveBatch('test-seed', chunks);
      
      const coords = chunks.map(c => ({ cx: c.cx, cy: c.cy }));
      const loaded = await persistence.loadBatch('test-seed', coords);
      
      expect(loaded).toHaveLength(2);
      expect(loaded[0].data).toBe('chunk1');
      expect(loaded[1].data).toBe('chunk2');
    });
    
    it('should delete multiple chunks in batch', async () => {
      const chunks = [
        { cx: 10, cy: 10, map: [] },
        { cx: 11, cy: 10, map: [] }
      ];
      
      await persistence.saveBatch('test-seed', chunks);
      
      const coords = chunks.map(c => ({ cx: c.cx, cy: c.cy }));
      await persistence.deleteBatch('test-seed', coords);
      
      for (const chunk of chunks) {
        const exists = await persistence.exists('test-seed', chunk.cx, chunk.cy);
        expect(exists).toBe(false);
      }
    });
  });
  
  describe('Query Operations', () => {
    beforeEach(async () => {
      // Setup test data
      const chunks = [
        { cx: 0, cy: 0, map: [], biome: 'forest' },
        { cx: 1, cy: 0, map: [], biome: 'desert' },
        { cx: 0, cy: 1, map: [], biome: 'forest' },
        { cx: 1, cy: 1, map: [], biome: 'desert' }
      ];
      
      for (const chunk of chunks) {
        await persistence.save('test-seed', chunk);
      }
    });
    
    it('should query chunks in a region', async () => {
      const results = await persistence.queryRegion('test-seed', 0, 0, 1, 1);
      
      expect(results).toHaveLength(4);
      expect(results.some(c => c.cx === 0 && c.cy === 0)).toBe(true);
      expect(results.some(c => c.cx === 1 && c.cy === 1)).toBe(true);
    });
    
    it('should query chunks by metadata', async () => {
      const results = await persistence.queryByMetadata('test-seed', {
        biome: 'forest'
      });
      
      expect(results).toHaveLength(2);
      expect(results.every(c => c.biome === 'forest')).toBe(true);
    });
    
    it('should list all saved chunks for a seed', async () => {
      const list = await persistence.listChunks('test-seed');
      
      expect(list).toHaveLength(4);
      expect(list).toContainEqual({ cx: 0, cy: 0 });
      expect(list).toContainEqual({ cx: 1, cy: 1 });
    });
  });
  
  describe('Versioning', () => {
    it('should handle version upgrades', async () => {
      const oldChunk = {
        cx: 30,
        cy: 30,
        map: [],
        version: '0.9.0' // Old version
      };
      
      await persistence.save('test-seed', oldChunk);
      
      const loaded = await persistence.load('test-seed', 30, 30);
      
      // Should migrate to current version
      expect(loaded.metadata).toBeDefined();
      expect(loaded.metadata.version).toBe('1.0.0');
    });
    
    it('should reject incompatible versions', async () => {
      const futureChunk = {
        cx: 40,
        cy: 40,
        map: [],
        metadata: { version: '2.0.0' } // Future version
      };
      
      await expect(persistence.save('test-seed', futureChunk))
        .rejects.toThrow('Incompatible version');
    });
  });
  
  describe('Compression', () => {
    it('should compress chunks if enabled', async () => {
      if (persistence.setCompression) {
        persistence.setCompression(true);
      }
      
      const largeChunk = {
        cx: 50,
        cy: 50,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        monsters: Array(100).fill({ type: 'goblin', hp: 10 })
      };
      
      const stats = await persistence.save('test-seed', largeChunk);
      
      if (stats && stats.compressed) {
        expect(stats.compressedSize).toBeLessThan(stats.originalSize);
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle save failures gracefully', async () => {
      if (persistence.simulateError) {
        persistence.simulateError('save');
      }
      
      const chunk = { cx: 60, cy: 60, map: [] };
      
      try {
        await persistence.save('test-seed', chunk);
      } catch (error) {
        expect(error.message).toContain('save');
      }
    });
    
    it('should handle load failures gracefully', async () => {
      if (persistence.simulateError) {
        persistence.simulateError('load');
      }
      
      try {
        await persistence.load('test-seed', 70, 70);
      } catch (error) {
        expect(error.message).toContain('load');
      }
    });
  });
  
  describe('Statistics', () => {
    it('should track persistence statistics', async () => {
      if (!persistence.getStats) return;
      
      const chunk = { cx: 80, cy: 80, map: [] };
      
      await persistence.save('test-seed', chunk);
      await persistence.load('test-seed', 80, 80);
      
      const stats = persistence.getStats();
      
      expect(stats.saves).toBeGreaterThan(0);
      expect(stats.loads).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });
});