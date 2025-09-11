/**
 * Test-Driven Development for FilesystemPersistence
 * RED -> GREEN -> REFACTOR cycle for Phase 4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FilesystemPersistence', () => {
  let FilesystemPersistence;
  let persistence;
  let testDir;
  
  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `chunk-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Import implementation
    try {
      const module = await import('../../../src/js/world/persistence/FilesystemPersistence.js');
      FilesystemPersistence = module.FilesystemPersistence;
      persistence = new FilesystemPersistence({
        baseDir: testDir,
        compression: false // Start without compression
      });
    } catch {
      // Mock for RED phase
      persistence = {
        save: vi.fn(),
        load: vi.fn(),
        delete: vi.fn(),
        exists: vi.fn()
      };
    }
  });
  
  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('Basic File Operations', () => {
    it('should save chunk to filesystem', async () => {
      const chunk = {
        cx: 5,
        cy: 5,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        biome: 'forest',
        monsters: [{ type: 'goblin', x: 10, y: 10, hp: 20 }],
        npcs: [],
        items: [],
        metadata: {
          version: '1.0.0',
          generatedAt: Date.now()
        }
      };
      
      await persistence.save('test-world', chunk);
      
      // Verify file exists
      const filePath = path.join(testDir, 'test-world', 'chunks', '5_5.json');
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      
      expect(exists).toBe(true);
      
      // Verify content
      const content = await fs.readFile(filePath, 'utf8');
      const saved = JSON.parse(content);
      
      expect(saved.cx).toBe(5);
      expect(saved.cy).toBe(5);
      expect(saved.biome).toBe('forest');
      expect(saved.monsters).toHaveLength(1);
    });
    
    it('should load chunk from filesystem', async () => {
      // First save a chunk
      const original = {
        cx: 10,
        cy: 10,
        map: [],
        biome: 'desert',
        metadata: { version: '1.0.0' }
      };
      
      const filePath = path.join(testDir, 'test-world', 'chunks', '10_10.json');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(original));
      
      // Load it back
      const loaded = await persistence.load('test-world', 10, 10);
      
      expect(loaded).toBeDefined();
      expect(loaded.cx).toBe(10);
      expect(loaded.cy).toBe(10);
      expect(loaded.biome).toBe('desert');
    });
    
    it('should return null for non-existent chunk', async () => {
      const loaded = await persistence.load('test-world', 999, 999);
      expect(loaded).toBeNull();
    });
    
    it('should delete chunk from filesystem', async () => {
      // Save a chunk
      const chunk = { cx: 15, cy: 15, map: [], biome: 'swamp' };
      await persistence.save('test-world', chunk);
      
      // Verify it exists
      expect(await persistence.exists('test-world', 15, 15)).toBe(true);
      
      // Delete it
      await persistence.delete('test-world', 15, 15);
      
      // Verify it's gone
      expect(await persistence.exists('test-world', 15, 15)).toBe(false);
    });
    
    it('should check chunk existence', async () => {
      const chunk = { cx: 20, cy: 20, map: [] };
      
      expect(await persistence.exists('test-world', 20, 20)).toBe(false);
      
      await persistence.save('test-world', chunk);
      
      expect(await persistence.exists('test-world', 20, 20)).toBe(true);
    });
  });
  
  describe('Directory Structure', () => {
    it('should organize chunks by world seed', async () => {
      const chunk1 = { cx: 0, cy: 0, map: [] };
      const chunk2 = { cx: 1, cy: 0, map: [] };
      
      await persistence.save('world-1', chunk1);
      await persistence.save('world-2', chunk2);
      
      const world1Path = path.join(testDir, 'world-1', 'chunks', '0_0.json');
      const world2Path = path.join(testDir, 'world-2', 'chunks', '1_0.json');
      
      expect(await fs.access(world1Path).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(world2Path).then(() => true).catch(() => false)).toBe(true);
    });
    
    it('should handle negative coordinates', async () => {
      const chunk = { cx: -5, cy: -10, map: [] };
      
      await persistence.save('test-world', chunk);
      
      const filePath = path.join(testDir, 'test-world', 'chunks', 'n5_n10.json');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);
      
      const loaded = await persistence.load('test-world', -5, -10);
      expect(loaded.cx).toBe(-5);
      expect(loaded.cy).toBe(-10);
    });
  });
  
  describe('Compression', () => {
    it('should compress chunks when enabled', async () => {
      const compressedPersistence = new FilesystemPersistence({
        baseDir: testDir,
        compression: true
      });
      
      const largeChunk = {
        cx: 30,
        cy: 30,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        monsters: Array(50).fill({ type: 'goblin', hp: 20, x: 0, y: 0 }),
        metadata: { version: '1.0.0' }
      };
      
      await compressedPersistence.save('test-world', largeChunk);
      
      const compressedPath = path.join(testDir, 'test-world', 'chunks', '30_30.json.gz');
      const uncompressedPath = path.join(testDir, 'test-world', 'chunks', '30_30.json');
      
      // Should save as .gz file
      expect(await fs.access(compressedPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(uncompressedPath).then(() => true).catch(() => false)).toBe(false);
      
      // Should be able to load compressed chunk
      const loaded = await compressedPersistence.load('test-world', 30, 30);
      expect(loaded.monsters).toHaveLength(50);
    });
    
    it('should handle mixed compressed and uncompressed chunks', async () => {
      // Save uncompressed
      const uncompressedPersistence = new FilesystemPersistence({
        baseDir: testDir,
        compression: false
      });
      
      await uncompressedPersistence.save('test-world', { cx: 1, cy: 1, map: [] });
      
      // Save compressed
      const compressedPersistence = new FilesystemPersistence({
        baseDir: testDir,
        compression: true
      });
      
      await compressedPersistence.save('test-world', { cx: 2, cy: 2, map: [] });
      
      // Load both with either persistence
      const loaded1 = await compressedPersistence.load('test-world', 1, 1);
      const loaded2 = await compressedPersistence.load('test-world', 2, 2);
      
      expect(loaded1.cx).toBe(1);
      expect(loaded2.cx).toBe(2);
    });
  });
  
  describe('Batch Operations', () => {
    it('should save multiple chunks efficiently', async () => {
      const chunks = [];
      for (let i = 0; i < 10; i++) {
        chunks.push({
          cx: i,
          cy: 0,
          map: [],
          biome: 'grassland'
        });
      }
      
      const startTime = Date.now();
      await persistence.saveBatch('test-world', chunks);
      const duration = Date.now() - startTime;
      
      // All chunks should be saved
      for (const chunk of chunks) {
        expect(await persistence.exists('test-world', chunk.cx, chunk.cy)).toBe(true);
      }
      
      // Should be reasonably fast (batch optimization)
      expect(duration).toBeLessThan(1000); // Under 1 second for 10 chunks
    });
    
    it('should load multiple chunks efficiently', async () => {
      // Save some chunks
      const chunks = [];
      for (let i = 0; i < 5; i++) {
        chunks.push({ cx: i, cy: i, map: [], data: `chunk-${i}` });
      }
      
      await persistence.saveBatch('test-world', chunks);
      
      // Load them back
      const coords = chunks.map(c => ({ cx: c.cx, cy: c.cy }));
      const loaded = await persistence.loadBatch('test-world', coords);
      
      expect(loaded).toHaveLength(5);
      expect(loaded[0].data).toBe('chunk-0');
      expect(loaded[4].data).toBe('chunk-4');
    });
  });
  
  describe('Query Operations', () => {
    beforeEach(async () => {
      // Setup test data grid
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          await persistence.save('query-world', {
            cx: x,
            cy: y,
            map: [],
            biome: x < 3 ? 'forest' : 'desert'
          });
        }
      }
    });
    
    it('should query chunks in a region', async () => {
      const chunks = await persistence.queryRegion('query-world', 1, 1, 3, 3);
      
      expect(chunks).toHaveLength(9); // 3x3 grid
      expect(chunks.every(c => c.cx >= 1 && c.cx <= 3)).toBe(true);
      expect(chunks.every(c => c.cy >= 1 && c.cy <= 3)).toBe(true);
    });
    
    it('should list all saved chunks', async () => {
      const list = await persistence.listChunks('query-world');
      
      expect(list).toHaveLength(25); // 5x5 grid
      expect(list).toContainEqual({ cx: 0, cy: 0 });
      expect(list).toContainEqual({ cx: 4, cy: 4 });
    });
    
    it('should query by metadata', async () => {
      const forests = await persistence.queryByMetadata('query-world', {
        biome: 'forest'
      });
      
      expect(forests).toHaveLength(15); // 3 columns × 5 rows
      expect(forests.every(c => c.biome === 'forest')).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle corrupted chunk files', async () => {
      // Write invalid JSON
      const corruptPath = path.join(testDir, 'test-world', 'chunks', '99_99.json');
      await fs.mkdir(path.dirname(corruptPath), { recursive: true });
      await fs.writeFile(corruptPath, 'invalid json content');
      
      const loaded = await persistence.load('test-world', 99, 99);
      
      // Should return null or handle gracefully
      expect(loaded).toBeNull();
    });
    
    it('should handle permission errors', async () => {
      // This test would require changing file permissions
      // Skip on Windows, implement on Unix systems
      if (process.platform === 'win32') return;
      
      const chunk = { cx: 50, cy: 50, map: [] };
      await persistence.save('test-world', chunk);
      
      const filePath = path.join(testDir, 'test-world', 'chunks', '50_50.json');
      
      // Make file read-only
      await fs.chmod(filePath, 0o444);
      
      // Try to overwrite (should handle error)
      const result = await persistence.save('test-world', chunk).catch(e => e);
      
      if (result instanceof Error) {
        expect(result.message).toContain('permission');
      }
    });
  });
  
  describe('Atomic Operations', () => {
    it('should save chunks atomically', async () => {
      const chunk = {
        cx: 60,
        cy: 60,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        metadata: { important: true }
      };
      
      // Save should be atomic (use temp file + rename)
      await persistence.save('test-world', chunk);
      
      // Verify no temp files left behind
      const chunkDir = path.join(testDir, 'test-world', 'chunks');
      const files = await fs.readdir(chunkDir);
      const tempFiles = files.filter(f => f.includes('.tmp'));
      
      expect(tempFiles).toHaveLength(0);
    });
    
    it('should not corrupt existing chunk on save failure', async () => {
      // Save initial chunk
      const original = { cx: 70, cy: 70, map: [], data: 'original' };
      await persistence.save('test-world', original);
      
      // Simulate save failure for update
      const updated = { cx: 70, cy: 70, map: [], data: 'updated' };
      
      // Force an error during save (mock fs.writeFile temporarily)
      const originalWriteFile = fs.writeFile;
      let callCount = 0;
      fs.writeFile = async (...args) => {
        callCount++;
        if (callCount === 2) { // Fail on second write (the update)
          throw new Error('Simulated write failure');
        }
        return originalWriteFile(...args);
      };
      
      try {
        await persistence.save('test-world', updated);
      } catch {
        // Expected to fail
      }
      
      // Restore original function
      fs.writeFile = originalWriteFile;
      
      // Original should still be intact
      const loaded = await persistence.load('test-world', 70, 70);
      expect(loaded.data).toBe('original');
    });
  });
  
  describe('Statistics and Monitoring', () => {
    it('should track persistence statistics', async () => {
      const chunk = { cx: 80, cy: 80, map: [] };
      
      await persistence.save('test-world', chunk);
      await persistence.load('test-world', 80, 80);
      await persistence.delete('test-world', 80, 80);
      
      const stats = persistence.getStats();
      
      expect(stats.totalSaves).toBeGreaterThan(0);
      expect(stats.totalLoads).toBeGreaterThan(0);
      expect(stats.totalDeletes).toBeGreaterThan(0);
      expect(stats.totalBytesWritten).toBeGreaterThan(0);
      expect(stats.totalBytesRead).toBeGreaterThan(0);
    });
    
    it('should report storage usage', async () => {
      // Save some chunks
      for (let i = 0; i < 5; i++) {
        await persistence.save('test-world', {
          cx: i,
          cy: 0,
          map: Array(22).fill().map(() => Array(24).fill('#'))
        });
      }
      
      const usage = await persistence.getStorageUsage('test-world');
      
      expect(usage.chunkCount).toBe(5);
      expect(usage.totalBytes).toBeGreaterThan(0);
      expect(usage.averageChunkSize).toBeGreaterThan(0);
    });
  });
  
  describe('Migration and Versioning', () => {
    it('should migrate old chunk formats', async () => {
      // Save chunk in old format
      const oldFormat = {
        cx: 90,
        cy: 90,
        tiles: Array(22).fill().map(() => Array(24).fill('#')), // Old: tiles
        version: '0.9.0'
      };
      
      const filePath = path.join(testDir, 'test-world', 'chunks', '90_90.json');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(oldFormat));
      
      // Load with new persistence (should migrate)
      const loaded = await persistence.load('test-world', 90, 90);
      
      expect(loaded.map).toBeDefined(); // New: map
      expect(loaded.tiles).toBeUndefined(); // Old field removed
      expect(loaded.metadata.version).toBe('1.0.0'); // Updated version
    });
    
    it('should backup chunks before migration', async () => {
      // Save old format chunk
      const oldChunk = {
        cx: 95,
        cy: 95,
        tiles: [],
        version: '0.9.0'
      };
      
      const filePath = path.join(testDir, 'test-world', 'chunks', '95_95.json');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(oldChunk));
      
      // Load (triggers migration)
      await persistence.load('test-world', 95, 95);
      
      // Check for backup
      const backupPath = path.join(testDir, 'test-world', 'backups', '95_95.json.backup');
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      
      expect(backupExists).toBe(true);
    });
  });
});