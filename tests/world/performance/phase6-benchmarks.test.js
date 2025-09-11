/**
 * Phase 6: Performance & Polish - Benchmark Tests
 * 
 * Performance Requirements:
 * - Chunk generation < 50ms
 * - Cache operations < 1ms
 * - Memory usage < 100MB
 * - No memory leaks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { ChunkPipeline } from '../../../src/js/world/pipeline/ChunkPipeline.js';

describe('Phase 6: Performance Benchmarks', () => {
  let system;
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = { 
      emit: vi.fn(), 
      on: vi.fn(),
      off: vi.fn()
    };
  });
  
  afterEach(() => {
    if (system) {
      // Clear cache if method exists
      if (system.cache && system.cache.clear) {
        system.cache.clear();
      }
      system = null;
    }
  });
  
  describe('Chunk Generation Performance', () => {
    it('should generate a single chunk in less than 50ms', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'perf-test'
      });
      
      await system.initializeBiomeManager();
      
      const startTime = performance.now();
      const chunk = await system.generateChunk('perf-test', 0, 0);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(chunk).to.exist;
      expect(duration).to.be.lessThan(50);
      console.log(`Single chunk generation: ${duration.toFixed(2)}ms`);
    });
    
    it('should generate 10 chunks in reasonable time', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'perf-test'
      });
      
      await system.initializeBiomeManager();
      
      const startTime = performance.now();
      const chunks = [];
      
      for (let i = 0; i < 10; i++) {
        chunks.push(await system.generateChunk('perf-test', i, 0));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / 10;
      
      expect(chunks).to.have.length(10);
      expect(avgTime).to.be.lessThan(50);
      console.log(`10 chunks total: ${duration.toFixed(2)}ms, avg: ${avgTime.toFixed(2)}ms`);
    });
    
    it('should handle concurrent chunk generation efficiently', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'perf-test'
      });
      
      await system.initializeBiomeManager();
      
      const startTime = performance.now();
      
      // Generate 10 chunks concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(system.generateChunk('perf-test', i, i));
      }
      
      const chunks = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(chunks).to.have.length(10);
      expect(duration).to.be.lessThan(200); // Should be faster than sequential
      console.log(`10 concurrent chunks: ${duration.toFixed(2)}ms`);
    });
  });
  
  describe('Cache Performance', () => {
    it('should retrieve cached chunks in less than 1ms', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'cache-test',
        cacheSize: 100
      });
      
      await system.initializeBiomeManager();
      
      // Generate and cache a chunk
      await system.generateChunk('cache-test', 5, 5);
      
      // Measure cache retrieval time (getChunk returns from cache if available)
      const startTime = performance.now();
      const chunk = await system.generateChunk('cache-test', 5, 5);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(chunk).to.exist;
      expect(duration).to.be.lessThan(1);
      console.log(`Cache retrieval: ${duration.toFixed(3)}ms`);
    });
    
    it('should handle cache with 100 chunks efficiently', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'cache-test',
        cacheSize: 100
      });
      
      await system.initializeBiomeManager();
      
      // Fill cache
      for (let i = 0; i < 100; i++) {
        await system.generateChunk('cache-test', i % 10, Math.floor(i / 10));
      }
      
      // Test retrieval from full cache
      const startTime = performance.now();
      const chunk = await system.generateChunk('cache-test', 5, 5);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(chunk).to.exist;
      expect(duration).to.be.lessThan(1);
      console.log(`Full cache retrieval: ${duration.toFixed(3)}ms`);
    });
    
    it('should evict LRU chunks when cache is full', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'cache-test',
        cacheSize: 10
      });
      
      await system.initializeBiomeManager();
      
      // Fill cache beyond capacity
      for (let i = 0; i < 15; i++) {
        await system.generateChunk('cache-test', i, 0);
      }
      
      // First chunk should be evicted
      const firstChunk = system.cache.get(0, 0);
      const lastChunk = system.cache.get(14, 0);
      
      expect(firstChunk).to.not.exist;
      expect(lastChunk).to.exist;
      expect(system.cache.size).to.be.lessThanOrEqual(10);
    });
  });
  
  describe('Memory Usage', () => {
    it('should not exceed 100MB for 100 chunks', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'memory-test',
        cacheSize: 100
      });
      
      await system.initializeBiomeManager();
      
      // Get initial memory
      if (global.gc) global.gc(); // Force GC if available
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate 100 chunks
      for (let i = 0; i < 100; i++) {
        await system.generateChunk('memory-test', i % 10, Math.floor(i / 10));
      }
      
      // Get final memory
      if (global.gc) global.gc(); // Force GC if available
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB
      
      expect(memoryUsed).to.be.lessThan(100);
      console.log(`Memory used for 100 chunks: ${memoryUsed.toFixed(2)}MB`);
    });
    
    it('should not leak memory when chunks are evicted', async () => {
      system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'leak-test',
        cacheSize: 10
      });
      
      await system.initializeBiomeManager();
      
      // Get baseline memory after first 10 chunks
      for (let i = 0; i < 10; i++) {
        await system.generateChunk('leak-test', i, 0);
      }
      
      if (global.gc) global.gc();
      const baselineMemory = process.memoryUsage().heapUsed;
      
      // Generate 100 more chunks (should evict old ones)
      for (let i = 10; i < 110; i++) {
        await system.generateChunk('leak-test', i, 0);
      }
      
      if (global.gc) global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - baselineMemory) / 1024 / 1024;
      
      // Should not grow significantly since we're evicting
      // Allow some growth due to JS memory management but should be bounded
      expect(memoryGrowth).to.be.lessThan(50);
      console.log(`Memory growth after evictions: ${memoryGrowth.toFixed(2)}MB`);
    });
  });
  
  describe('BiomeManager Performance', () => {
    it('should calculate biomes quickly', () => {
      const manager = new BiomeManager('perf-test');
      
      const startTime = performance.now();
      
      // Get biomes for 100 chunks
      for (let i = 0; i < 100; i++) {
        manager.getBiome(i % 10, Math.floor(i / 10));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / 100;
      
      expect(avgTime).to.be.lessThan(0.5);
      console.log(`100 biome calculations: ${duration.toFixed(2)}ms, avg: ${avgTime.toFixed(3)}ms`);
    });
    
    it('should use cache effectively', () => {
      const manager = new BiomeManager('cache-test');
      
      // First pass - cache misses
      for (let i = 0; i < 50; i++) {
        manager.getBiome(i % 10, Math.floor(i / 10));
      }
      
      const missRate = manager.cacheMisses;
      
      // Second pass - should hit cache
      for (let i = 0; i < 50; i++) {
        manager.getBiome(i % 10, Math.floor(i / 10));
      }
      
      const stats = manager.getCacheStatistics();
      expect(stats.hits).to.be.greaterThan(0);
      expect(stats.hitRate).to.be.greaterThan(0.4);
      console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    });
  });
  
  describe('Feature Generation Performance', () => {
    it('should generate features quickly', () => {
      const generator = new BiomeFeatureGenerator('perf-test');
      
      const startTime = performance.now();
      
      // Generate features for multiple biomes
      const biomes = ['candy_kingdom', 'ice_kingdom', 'fire_kingdom', 'grasslands'];
      const features = [];
      
      for (const biome of biomes) {
        for (let i = 0; i < 10; i++) {
          features.push(generator.generateFeatures(biome, i, 0));
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / 40;
      
      expect(features).to.have.length(40);
      expect(avgTime).to.be.lessThan(2);
      console.log(`40 feature generations: ${duration.toFixed(2)}ms, avg: ${avgTime.toFixed(3)}ms`);
    });
    
    it('should not generate excessive features', () => {
      const generator = new BiomeFeatureGenerator('density-test');
      
      // Test with max density
      const features = generator.generateFeatures('candy_kingdom', 0, 0, { density: 1.0 });
      
      const totalFeatures = 
        features.tiles.length + 
        features.entities.length + 
        features.decorations.length + 
        features.resources.length;
      
      // Should be capped by our density limits
      expect(totalFeatures).to.be.lessThan(1000);
      console.log(`Max density features: ${totalFeatures}`);
    });
  });
  
  describe('Pipeline Performance', () => {
    it('should execute all steps efficiently', async () => {
      const pipeline = new ChunkPipeline(mockEventBus);
      
      const startTime = performance.now();
      
      const chunk = await pipeline.generate('perf-test', 0, 0);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(chunk).to.exist;
      expect(chunk.generated).to.be.true;
      expect(duration).to.be.lessThan(30);
      console.log(`Pipeline execution: ${duration.toFixed(2)}ms`);
    });
    
    it('should handle errors without major performance impact', async () => {
      const pipeline = new ChunkPipeline(mockEventBus);
      
      // Add a failing step
      pipeline.addStep({
        name: 'FailingStep',
        execute: async () => { throw new Error('Test error'); }
      });
      
      const startTime = performance.now();
      
      // Should continue despite error
      const chunk = await pipeline.generate('error-test', 0, 0);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(chunk).to.exist;
      expect(duration).to.be.lessThan(50);
      console.log(`Pipeline with error: ${duration.toFixed(2)}ms`);
    });
  });
});