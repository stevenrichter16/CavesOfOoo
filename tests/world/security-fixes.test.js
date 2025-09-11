/**
 * TDD Tests for Phase 4 Security and Quality Fixes
 * These tests should FAIL initially, demonstrating the issues
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilesystemPersistence } from '../../src/js/world/persistence/FilesystemPersistence.js';
import { ChunkStreaming } from '../../src/js/world/streaming/ChunkStreaming.js';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

describe('Security Vulnerability Tests', () => {
  let testDir;
  let persistence;
  
  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `security-test-${Date.now()}`);
    persistence = new FilesystemPersistence({
      baseDir: testDir,
      compression: false
    });
  });
  
  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts in seed parameter', async () => {
      const maliciousSeed = '../../etc/passwd';
      const chunk = { cx: 0, cy: 0, map: [], sensitive: 'data' };
      
      // This should throw or sanitize the seed
      await expect(persistence.save(maliciousSeed, chunk))
        .rejects.toThrow(/invalid seed/i);
    });
    
    it('should reject null byte injection', async () => {
      const maliciousSeed = 'world\x00/etc/passwd';
      const chunk = { cx: 0, cy: 0, map: [] };
      
      await expect(persistence.save(maliciousSeed, chunk))
        .rejects.toThrow(/invalid seed/i);
    });
    
    it('should reject absolute paths in seed', async () => {
      const maliciousSeed = '/etc/passwd';
      const chunk = { cx: 0, cy: 0, map: [] };
      
      await expect(persistence.save(maliciousSeed, chunk))
        .rejects.toThrow(/invalid seed/i);
    });
    
    it('should sanitize dots and slashes in seed', async () => {
      const seeds = [
        '../../../secret',
        'world/../../../etc',
        'world/..',
        '..world',
        'world/../../'
      ];
      
      for (const seed of seeds) {
        await expect(persistence.save(seed, { cx: 0, cy: 0 }))
          .rejects.toThrow(/invalid seed/i);
      }
    });
    
    it('should handle Windows path traversal attempts', async () => {
      const maliciousSeed = '..\\..\\..\\windows\\system32';
      const chunk = { cx: 0, cy: 0, map: [] };
      
      await expect(persistence.save(maliciousSeed, chunk))
        .rejects.toThrow(/invalid seed/i);
    });
  });
  
  describe('Input Validation', () => {
    it('should validate chunk coordinates are numbers', async () => {
      await expect(persistence.load('world', 'not-a-number', 0))
        .rejects.toThrow(/invalid coordinates/i);
    });
    
    it('should validate chunk coordinates are finite', async () => {
      await expect(persistence.load('world', Infinity, 0))
        .rejects.toThrow(/invalid coordinates/i);
    });
    
    it('should validate chunk structure before saving', async () => {
      const invalidChunk = { cx: 'not-a-number', cy: 0, map: [] };
      
      await expect(persistence.save('world', invalidChunk))
        .rejects.toThrow(/invalid chunk/i);
    });
    
    it('should validate seed name length', async () => {
      const longSeed = 'a'.repeat(256);
      
      await expect(persistence.save(longSeed, { cx: 0, cy: 0 }))
        .rejects.toThrow(/seed name too long/i);
    });
  });
});

describe('Real Compression Implementation Tests', () => {
  let streaming;
  let mockChunkSystem;
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = { emit: () => {}, on: () => {} };
    mockChunkSystem = {
      generateChunk: async () => ({ cx: 0, cy: 0, map: Array(100).fill(Array(100).fill('#')) })
    };
    streaming = new ChunkStreaming(mockChunkSystem, mockEventBus);
  });
  
  it('should actually compress chunk data', async () => {
    const chunk = {
      cx: 0,
      cy: 0,
      map: Array(100).fill(Array(100).fill('#')),
      monsters: Array(50).fill({ type: 'goblin', hp: 20 })
    };
    
    const compressed = await streaming.compressChunk(chunk);
    
    // Should have actual compressed data, not placeholder
    expect(compressed.data).not.toBe('compressed_data_here');
    expect(compressed.data).toBeInstanceOf(Buffer);
    
    // Should be actually compressed
    const originalSize = JSON.stringify(chunk).length;
    expect(compressed.size).toBeLessThan(originalSize * 0.5);
    
    // Should be decompressible
    const decompressed = await gunzip(compressed.data);
    const restored = JSON.parse(decompressed.toString());
    expect(restored.cx).toBe(chunk.cx);
    expect(restored.monsters.length).toBe(50);
  });
  
  it('should handle compression levels correctly', async () => {
    streaming.setCompressionLevel(1); // Fast compression
    const chunk = { cx: 0, cy: 0, map: Array(100).fill(Array(100).fill('#')) };
    
    const fast = await streaming.compressChunk(chunk);
    
    streaming.setCompressionLevel(9); // Best compression
    const best = await streaming.compressChunk(chunk);
    
    // Best compression should be smaller
    expect(best.size).toBeLessThanOrEqual(fast.size);
  });
});

describe('Memory Leak Prevention Tests', () => {
  let streaming;
  let mockChunkSystem;
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = { emit: () => {}, on: () => {} };
    mockChunkSystem = {
      generateChunk: async () => ({ cx: 0, cy: 0, map: [] })
    };
    streaming = new ChunkStreaming(mockChunkSystem, mockEventBus);
  });
  
  it('should limit movement history size', async () => {
    // Add many movement records
    for (let i = 0; i < 1000; i++) {
      streaming.updateMovementHistory(1, 0);
    }
    
    // History should be bounded
    expect(streaming.movementHistory.length).toBeLessThanOrEqual(100);
  });
  
  it('should limit request batch history', async () => {
    streaming.setBatchSize(5);
    
    // Create many batches
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 5; j++) {
        await streaming.requestChunk('seed', i * 5 + j, 0);
      }
    }
    
    // Batch history should be bounded
    expect(streaming.requestBatches.length).toBeLessThanOrEqual(10);
  });
  
  it('should clear cancelled requests periodically', () => {
    // Cancel many requests
    for (let i = 0; i < 1000; i++) {
      streaming.cancelledRequests.add(`${i},0`);
    }
    
    // Should have a cleanup mechanism
    streaming.cleanupCancelledRequests();
    expect(streaming.cancelledRequests.size).toBeLessThanOrEqual(100);
  });
  
  it('should limit streaming issues log', () => {
    // Add many issues
    for (let i = 0; i < 1000; i++) {
      streaming.streamingIssues.push({
        type: 'TEST_ISSUE',
        message: `Issue ${i}`
      });
    }
    
    // Should be bounded
    streaming.cleanupIssues();
    expect(streaming.streamingIssues.length).toBeLessThanOrEqual(100);
  });
});

describe('Magic Numbers Extraction Tests', () => {
  it('should use named constants instead of magic numbers', async () => {
    const { ChunkStreaming } = await import('../../src/js/world/streaming/ChunkStreaming.js');
    const { STREAMING_CONSTANTS } = await import('../../src/js/world/constants.js');
    
    // Check that constants are defined
    expect(STREAMING_CONSTANTS).toBeDefined();
    expect(STREAMING_CONSTANTS.DEFAULT_MAX_CHUNKS).toBe(100);
    expect(STREAMING_CONSTANTS.DEFAULT_MEMORY_LIMIT).toBe(50 * 1024 * 1024);
    expect(STREAMING_CONSTANTS.DEFAULT_BATCH_SIZE).toBe(10);
    expect(STREAMING_CONSTANTS.DEFAULT_VIEWPORT_RADIUS).toBe(5);
    expect(STREAMING_CONSTANTS.MOVEMENT_HISTORY_DURATION).toBe(5000);
    expect(STREAMING_CONSTANTS.MEMORY_CLEANUP_THRESHOLD).toBe(0.9);
    expect(STREAMING_CONSTANTS.BASE_CHUNK_MEMORY).toBe(1024);
    expect(STREAMING_CONSTANTS.TILE_MEMORY_SIZE).toBe(1);
    expect(STREAMING_CONSTANTS.ENTITY_MEMORY_SIZE).toBe(100);
    expect(STREAMING_CONSTANTS.ITEM_MEMORY_SIZE).toBe(50);
  });
  
  it('should use constants from FilesystemPersistence', async () => {
    const { FilesystemPersistence } = await import('../../src/js/world/persistence/FilesystemPersistence.js');
    const { PERSISTENCE_CONSTANTS } = await import('../../src/js/world/constants.js');
    
    expect(PERSISTENCE_CONSTANTS).toBeDefined();
    expect(PERSISTENCE_CONSTANTS.MAX_SEED_LENGTH).toBe(255);
    expect(PERSISTENCE_CONSTANTS.CURRENT_VERSION).toBe('1.0.0');
    expect(PERSISTENCE_CONSTANTS.COMPRESSION_LEVEL).toBe(6);
  });
});

describe('Memory Usage Calculation Tests', () => {
  let streaming;
  let mockChunkSystem;
  
  beforeEach(() => {
    mockChunkSystem = {
      generateChunk: async () => ({ cx: 0, cy: 0, map: [] })
    };
    streaming = new ChunkStreaming(mockChunkSystem, {});
  });
  
  it('should accurately calculate memory usage', () => {
    // Add chunks with known sizes
    streaming.activeChunks.set('0,0', {
      cx: 0,
      cy: 0,
      map: Array(22).fill(Array(24).fill('#')),
      monsters: Array(10).fill({ type: 'goblin' }),
      items: Array(5).fill({ type: 'potion' })
    });
    
    const usage = streaming.getMemoryUsage();
    
    // Should include all components
    const expectedBase = 1024;
    const expectedMap = 22 * 24 * 1; // Assuming 1 byte per tile
    const expectedMonsters = 10 * 100;
    const expectedItems = 5 * 50;
    const expectedTotal = expectedBase + expectedMap + expectedMonsters + expectedItems;
    
    expect(usage).toBeCloseTo(expectedTotal, 100);
  });
  
  it('should handle chunks with missing properties', () => {
    streaming.activeChunks.set('0,0', { cx: 0, cy: 0 });
    streaming.activeChunks.set('1,0', { cx: 1, cy: 0, map: [] });
    
    const usage = streaming.getMemoryUsage();
    expect(usage).toBeGreaterThan(0);
    expect(() => streaming.getMemoryUsage()).not.toThrow();
  });
});