/**
 * Production-Grade Tests for Phase 7.5
 * Testing enterprise-level features for A-grade implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { WorldPersistence } from '../../../src/js/world/persistence/WorldPersistence.js';
import { PerformanceMonitor } from '../../../src/js/world/core/PerformanceMonitor.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';

describe('Phase 7.5: Production-Grade Features', () => {
  let chunkSystem;
  let eventSystem;
  let persistence;
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
  });
  
  afterEach(() => {
    if (eventSystem) {
      eventSystem.destroy();
    }
  });
  
  describe('Performance Monitoring & Metrics', () => {
    it('should track detailed performance metrics', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const monitor = chunkSystem.getPerformanceMonitor();
      
      expect(monitor).toBeDefined();
      
      // Generate chunks and track metrics
      await chunkSystem.generateChunk('seed', 0, 0);
      await chunkSystem.generateChunk('seed', 1, 0);
      
      const metrics = monitor.getMetrics();
      
      expect(metrics.chunkGeneration).toBeDefined();
      expect(metrics.chunkGeneration.count).toBe(2);
      expect(metrics.chunkGeneration.averageTime).toBeGreaterThan(0);
      expect(metrics.chunkGeneration.p95).toBeDefined();
      expect(metrics.chunkGeneration.p99).toBeDefined();
    });
    
    it('should expose metrics for external monitoring systems', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      // Should support Prometheus-style metrics
      const prometheusMetrics = chunkSystem.getMetricsForPrometheus();
      
      expect(prometheusMetrics).toContain('chunk_generation_duration_ms');
      expect(prometheusMetrics).toContain('cache_hit_rate');
      expect(prometheusMetrics).toContain('active_chunks_count');
      expect(prometheusMetrics).toContain('event_processing_duration_ms');
    });
    
    it('should track memory usage trends', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const monitor = chunkSystem.getPerformanceMonitor();
      
      // Generate many chunks
      for (let i = 0; i < 10; i++) {
        await chunkSystem.generateChunk('seed', i, 0);
      }
      
      const memoryTrend = monitor.getMemoryTrend();
      
      expect(memoryTrend.samples).toHaveLength(10);
      expect(memoryTrend.trend).toBeDefined(); // 'stable', 'growing', 'shrinking'
      expect(memoryTrend.estimatedLeakRate).toBeDefined();
    });
    
    it('should provide performance recommendations', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const monitor = chunkSystem.getPerformanceMonitor();
      
      // Simulate poor performance
      chunkSystem.cache.maxSize = 1; // Too small
      
      for (let i = 0; i < 20; i++) {
        await chunkSystem.generateChunk('seed', i % 3, 0);
      }
      
      const recommendations = monitor.getRecommendations();
      
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          issue: 'high_cache_miss_rate',
          recommendation: expect.stringContaining('Increase cache size'),
          impact: 'high'
        })
      );
    });
  });
  
  describe('Advanced Configuration System', () => {
    it('should support comprehensive configuration', () => {
      const config = {
        chunk: {
          width: 24,
          height: 22,
          generationTimeout: 5000
        },
        cache: {
          maxSize: 100,
          ttl: 300000,
          evictionStrategy: 'lru'
        },
        persistence: {
          enabled: true,
          compressionLevel: 6,
          maxConcurrentSaves: 3,
          retryAttempts: 3,
          retryDelay: 1000
        },
        events: {
          maxActiveEvents: 500,
          spatialIndexSize: 1000,
          cleanupInterval: 100
        },
        monitoring: {
          enabled: true,
          sampleRate: 0.1,
          metricsPort: 9090
        }
      };
      
      chunkSystem = new ChunkSystem(mockEventBus, config);
      
      expect(chunkSystem.config.cache.maxSize).toBe(100);
      expect(chunkSystem.config.persistence.compressionLevel).toBe(6);
      expect(chunkSystem.config.monitoring.enabled).toBe(true);
    });
    
    it('should validate configuration and provide defaults', () => {
      const invalidConfig = {
        cache: {
          maxSize: -1, // Invalid
          ttl: 'invalid' // Wrong type
        }
      };
      
      chunkSystem = new ChunkSystem(mockEventBus, invalidConfig);
      
      // Should use safe defaults for invalid values
      expect(chunkSystem.config.cache.maxSize).toBeGreaterThan(0);
      expect(typeof chunkSystem.config.cache.ttl).toBe('number');
    });
    
    it('should support runtime configuration updates', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      const originalMaxSize = chunkSystem.config.cache.maxSize;
      
      chunkSystem.updateConfig({
        cache: { maxSize: 200 }
      });
      
      expect(chunkSystem.config.cache.maxSize).toBe(200);
      expect(chunkSystem.cache.maxSize).toBe(200); // Should update runtime
      
      // Should emit configuration change event
      expect(mockEventBus.emit).toHaveBeenCalledWith('ConfigurationChanged', 
        expect.objectContaining({
          changed: ['cache.maxSize'],
          oldValues: { 'cache.maxSize': originalMaxSize },
          newValues: { 'cache.maxSize': 200 }
        })
      );
    });
  });
  
  describe('Schema Migration System', () => {
    it('should detect and migrate old chunk formats', async () => {
      persistence = new WorldPersistence();
      
      // Simulate old format chunk
      const oldFormatChunk = {
        cx: 0,
        cy: 0,
        map: Array(22).fill(Array(24).fill('#')),
        // Missing: biome, features, metadata (added in newer versions)
      };
      
      persistence.baseChunks.set('0,0', oldFormatChunk);
      
      // Load with migration
      const migrated = await persistence.loadBaseChunkWithMigration(0, 0);
      
      expect(migrated.biome).toBeDefined(); // Should add default biome
      expect(migrated.features).toEqual([]); // Should add empty features
      expect(migrated.metadata).toBeDefined(); // Should add metadata
      expect(migrated.metadata.version).toBe('1.0'); // Should track version
    });
    
    it('should handle multi-version migrations', async () => {
      persistence = new WorldPersistence();
      
      // Register migration strategies
      persistence.registerMigration('0.1', '0.2', (chunk) => {
        chunk.items = chunk.items || [];
        return chunk;
      });
      
      persistence.registerMigration('0.2', '1.0', (chunk) => {
        chunk.metadata = { ...chunk.metadata, version: '1.0' };
        return chunk;
      });
      
      const v01Chunk = {
        cx: 0, cy: 0,
        map: Array(22).fill(Array(24).fill('#')),
        version: '0.1'
      };
      
      const migrated = await persistence.migrateChunk(v01Chunk, '1.0');
      
      expect(migrated.items).toBeDefined();
      expect(migrated.metadata.version).toBe('1.0');
    });
    
    it('should backup before risky migrations', async () => {
      persistence = new WorldPersistence();
      
      const chunk = new Chunk(0, 0);
      chunk.biome = 'test';
      await persistence.saveBaseChunk(chunk);
      
      // Perform risky migration
      await persistence.performRiskyMigration('0,0', (chunk) => {
        chunk.map = 'corrupted'; // Intentionally break
        return chunk;
      });
      
      // Should have backup
      const backup = await persistence.loadBackup('0,0');
      expect(backup).toBeDefined();
      expect(Array.isArray(backup.map)).toBe(true);
      
      // Should be able to restore
      await persistence.restoreFromBackup('0,0');
      const restored = await persistence.loadBaseChunk(0, 0);
      expect(Array.isArray(restored.map)).toBe(true);
    });
  });
  
  describe('Advanced Error Recovery', () => {
    it('should implement circuit breaker for failing operations', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence();
      chunkSystem.persistence = persistence;
      
      // Mock persistence to fail repeatedly
      let failCount = 0;
      persistence.saveBaseChunk = vi.fn().mockImplementation(() => {
        failCount++;
        throw new Error('Service unavailable');
      });
      
      // Try to save multiple times
      for (let i = 0; i < 10; i++) {
        try {
          const chunk = new Chunk(i, 0);
          chunk.biome = 'test';
          await chunkSystem.saveWithCircuitBreaker(chunk);
        } catch (e) {
          // Expected
        }
      }
      
      // Circuit breaker should open after threshold
      expect(failCount).toBeLessThan(10); // Should stop trying
      expect(chunkSystem.circuitBreaker.state).toBe('open');
      
      // Should auto-recover after timeout
      vi.advanceTimersByTime(30000); // 30 seconds
      expect(chunkSystem.circuitBreaker.state).toBe('half-open');
    });
    
    it('should implement retry with exponential backoff', async () => {
      persistence = new WorldPersistence();
      
      let attempts = 0;
      const timestamps = [];
      
      persistence._performOperation = vi.fn().mockImplementation(() => {
        attempts++;
        timestamps.push(Date.now());
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });
      
      const result = await persistence.saveWithRetry(new Chunk(0, 0));
      
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      
      // Check exponential backoff
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay2).toBeGreaterThan(delay1); // Exponential
      }
    });
    
    it('should handle cascade failures gracefully', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Simulate cascade: chunk load fails -> event apply fails -> cache corrupt
      chunkSystem.cache.get = vi.fn().mockImplementation(() => {
        throw new Error('Cache corrupted');
      });
      
      // Should isolate failure and recover
      const chunk = await chunkSystem.loadChunkWithRecovery('seed', 0, 0);
      
      expect(chunk).toBeDefined();
      expect(chunk.metadata.recovered).toBe(true);
      expect(chunk.metadata.recoveryReason).toContain('cache failure');
    });
  });
  
  describe('Performance Optimizations', () => {
    it('should use worker threads for heavy operations', async () => {
      chunkSystem = new ChunkSystem(mockEventBus, {
        performance: { useWorkers: true }
      });
      
      // Generate large chunk that would benefit from worker
      const chunk = await chunkSystem.generateLargeChunk('seed', 0, 0, {
        size: 100, // 100x100 instead of 24x22
        complexity: 'high'
      });
      
      expect(chunk).toBeDefined();
      expect(chunk.metadata.generatedByWorker).toBe(true);
    });
    
    it('should implement intelligent prefetching', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      // Enable predictive prefetching
      chunkSystem.enablePrefetching({
        strategy: 'predictive',
        radius: 2
      });
      
      // Load a chunk
      await chunkSystem.loadChunk('seed', 5, 5);
      
      // Should prefetch nearby chunks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Nearby chunks should be in cache
      expect(chunkSystem.cache.get(4, 5)).toBeDefined();
      expect(chunkSystem.cache.get(6, 5)).toBeDefined();
      expect(chunkSystem.cache.get(5, 4)).toBeDefined();
      expect(chunkSystem.cache.get(5, 6)).toBeDefined();
    });
    
    it('should batch operations for efficiency', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence();
      chunkSystem.persistence = persistence;
      
      const saveSpy = vi.spyOn(persistence, 'batchSave');
      
      // Queue multiple saves
      const chunks = [];
      for (let i = 0; i < 10; i++) {
        const chunk = new Chunk(i, 0);
        chunk.biome = 'test';
        chunks.push(chunk);
      }
      
      // Save all at once
      await chunkSystem.batchSave(chunks);
      
      // Should use single batch operation
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(chunks);
    });
  });
  
  describe('Network Resilience', () => {
    it('should handle network partitions', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      // Simulate network partition
      chunkSystem.network.simulatePartition({
        duration: 5000,
        affectedNodes: ['persistence-service']
      });
      
      // Should queue operations during partition
      const chunk = new Chunk(0, 0);
      chunk.biome = 'test';
      
      const savePromise = chunkSystem.save(chunk);
      
      expect(chunkSystem.operationQueue.size).toBe(1);
      
      // Resolve partition
      chunkSystem.network.resolvePartition();
      
      // Operation should complete
      const result = await savePromise;
      expect(result.success).toBe(true);
      expect(result.wasQueued).toBe(true);
    });
    
    it('should implement request deduplication', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      let generateCount = 0;
      chunkSystem._generateChunkInternal = vi.fn().mockImplementation(async () => {
        generateCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        const chunk = new Chunk(0, 0);
        chunk.biome = 'test';
        return chunk;
      });
      
      // Request same chunk multiple times concurrently
      const promises = [
        chunkSystem.generateChunk('seed', 0, 0),
        chunkSystem.generateChunk('seed', 0, 0),
        chunkSystem.generateChunk('seed', 0, 0)
      ];
      
      const results = await Promise.all(promises);
      
      // Should only generate once
      expect(generateCount).toBe(1);
      
      // All should get same result
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });
  
  describe('Data Integrity & Validation', () => {
    it('should implement checksums for chunks', async () => {
      persistence = new WorldPersistence();
      
      const chunk = new Chunk(0, 0);
      chunk.biome = 'test';
      chunk.setTile(10, 10, '~');
      
      await persistence.saveBaseChunk(chunk);
      
      // Should store with checksum
      const stored = persistence.baseChunks.get('0,0');
      expect(stored.checksum).toBeDefined();
      
      // Corrupt the data
      stored.map[0][0] = 'X';
      
      // Should detect corruption on load
      const loaded = await persistence.loadBaseChunk(0, 0);
      expect(loaded).toBeNull(); // Should reject corrupted chunk
      
      // Should log integrity violation
      expect(persistence.integrityViolations).toContain('0,0');
    });
    
    it('should validate chunk boundaries and relationships', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      const chunk1 = await chunkSystem.generateChunk('seed', 0, 0);
      const chunk2 = await chunkSystem.generateChunk('seed', 1, 0);
      
      // Should validate edge continuity
      const validation = chunkSystem.validateChunkBoundaries(chunk1, chunk2);
      
      expect(validation.valid).toBe(true);
      expect(validation.edgeContinuity).toBe(true);
      
      // Corrupt edge
      chunk1.setTile(23, 10, '#');
      chunk2.setTile(0, 10, '.');
      
      const validation2 = chunkSystem.validateChunkBoundaries(chunk1, chunk2);
      expect(validation2.warnings).toContainEqual(
        expect.objectContaining({
          type: 'edge_mismatch',
          severity: 'low'
        })
      );
    });
  });
  
  describe('Observability & Debugging', () => {
    it('should provide detailed debug information', async () => {
      chunkSystem = new ChunkSystem(mockEventBus, {
        debug: { enabled: true, verbosity: 'trace' }
      });
      
      await chunkSystem.generateChunk('seed', 0, 0);
      
      const debugInfo = chunkSystem.getDebugInfo();
      
      expect(debugInfo.recentOperations).toBeDefined();
      expect(debugInfo.performanceTrace).toBeDefined();
      expect(debugInfo.memorySnapshot).toBeDefined();
      expect(debugInfo.eventTrace).toBeDefined();
      expect(debugInfo.cacheStats).toBeDefined();
    });
    
    it('should support operation tracing', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      
      const traceId = chunkSystem.startTrace('user-123');
      
      await chunkSystem.generateChunk('seed', 0, 0);
      await chunkSystem.loadChunk('seed', 1, 0);
      
      const trace = chunkSystem.endTrace(traceId);
      
      expect(trace.operations).toHaveLength(2);
      expect(trace.operations[0].type).toBe('generate');
      expect(trace.operations[1].type).toBe('load');
      expect(trace.totalDuration).toBeGreaterThan(0);
      expect(trace.userId).toBe('user-123');
    });
    
    it('should provide health checks', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const health = await chunkSystem.getHealthStatus();
      
      expect(health.status).toBe('healthy'); // 'healthy', 'degraded', 'unhealthy'
      expect(health.components).toEqual(
        expect.objectContaining({
          cache: 'healthy',
          persistence: 'healthy',
          eventSystem: 'healthy',
          memory: 'healthy'
        })
      );
      expect(health.metrics).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
    });
  });
});