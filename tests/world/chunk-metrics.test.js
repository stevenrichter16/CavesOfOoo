/**
 * Test-Driven Development for ChunkMetrics
 * RED -> GREEN -> REFACTOR cycle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChunkMetrics', () => {
  let ChunkMetrics;
  let metrics;
  
  beforeEach(async () => {
    // Will import the actual implementation once created
    try {
      const module = await import('../../src/js/world/core/ChunkMetrics.js');
      ChunkMetrics = module.ChunkMetrics;
    } catch {
      // Temporary mock for RED phase
      ChunkMetrics = class {
        constructor() {
          this.data = {
            generation: [],
            cacheHits: [],
            cacheMisses: [],
            saves: [],
            loads: [],
            errors: []
          };
        }
      };
    }
    
    metrics = new ChunkMetrics();
  });
  
  describe('Generation Metrics', () => {
    it('should track chunk generation time', () => {
      metrics.trackGeneration(150, 5, 5);
      
      const stats = metrics.getGenerationStats();
      expect(stats.count).toBe(1);
      expect(stats.averageTime).toBe(150);
      expect(stats.totalTime).toBe(150);
    });
    
    it('should calculate average generation time', () => {
      metrics.trackGeneration(100, 0, 0);
      metrics.trackGeneration(200, 1, 0);
      metrics.trackGeneration(150, 2, 0);
      
      const stats = metrics.getGenerationStats();
      expect(stats.count).toBe(3);
      expect(stats.averageTime).toBe(150);
      expect(stats.minTime).toBe(100);
      expect(stats.maxTime).toBe(200);
    });
    
    it('should track generation by biome', () => {
      metrics.trackGeneration(100, 0, 0, { biome: 'forest' });
      metrics.trackGeneration(200, 1, 0, { biome: 'desert' });
      metrics.trackGeneration(150, 2, 0, { biome: 'forest' });
      
      const biomeStats = metrics.getGenerationStatsByBiome();
      expect(biomeStats.forest.count).toBe(2);
      expect(biomeStats.forest.averageTime).toBe(125);
      expect(biomeStats.desert.count).toBe(1);
      expect(biomeStats.desert.averageTime).toBe(200);
    });
  });
  
  describe('Cache Metrics', () => {
    it('should track cache hits and misses', () => {
      metrics.trackCacheHit(0, 0);
      metrics.trackCacheHit(1, 0);
      metrics.trackCacheMiss(2, 0);
      
      const stats = metrics.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
    
    it('should track cache performance over time', () => {
      const now = Date.now();
      
      metrics.trackCacheHit(0, 0, now);
      metrics.trackCacheHit(1, 0, now + 1000);
      metrics.trackCacheMiss(2, 0, now + 2000);
      
      const timeStats = metrics.getCacheStatsForPeriod(now, now + 2000);
      expect(timeStats.hits).toBe(2);
      expect(timeStats.misses).toBe(1);
    });
    
    it('should calculate cache efficiency', () => {
      // 10 hits, 5 misses
      for (let i = 0; i < 10; i++) {
        metrics.trackCacheHit(i, 0);
      }
      for (let i = 0; i < 5; i++) {
        metrics.trackCacheMiss(i, 1);
      }
      
      const efficiency = metrics.getCacheEfficiency();
      expect(efficiency.hitRate).toBeCloseTo(0.667, 2);
      expect(efficiency.totalRequests).toBe(15);
      expect(efficiency.savedGenerations).toBe(10);
    });
  });
  
  describe('Persistence Metrics', () => {
    it('should track save operations', () => {
      metrics.trackSave(50, 1024, 10, 10);
      metrics.trackSave(75, 2048, 11, 10);
      
      const stats = metrics.getSaveStats();
      expect(stats.count).toBe(2);
      expect(stats.averageTime).toBe(62.5);
      expect(stats.totalSize).toBe(3072);
      expect(stats.averageSize).toBe(1536);
    });
    
    it('should track load operations', () => {
      metrics.trackLoad(25, 10, 10, true);
      metrics.trackLoad(100, 11, 10, false); // Failed load
      
      const stats = metrics.getLoadStats();
      expect(stats.count).toBe(2);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(1);
      expect(stats.successRate).toBe(0.5);
      expect(stats.averageTime).toBe(62.5);
    });
    
    it('should track persistence errors', () => {
      metrics.trackError('save', new Error('Disk full'), 10, 10);
      metrics.trackError('load', new Error('File not found'), 11, 10);
      
      const errors = metrics.getErrorStats();
      expect(errors.total).toBe(2);
      expect(errors.byType.save).toBe(1);
      expect(errors.byType.load).toBe(1);
    });
  });
  
  describe('Performance Analysis', () => {
    it('should identify performance bottlenecks', () => {
      // Simulate slow generations
      metrics.trackGeneration(500, 0, 0);
      metrics.trackGeneration(600, 1, 0);
      metrics.trackGeneration(100, 2, 0);
      
      const bottlenecks = metrics.getBottlenecks();
      expect(bottlenecks.slowestGeneration.duration).toBe(600);
      expect(bottlenecks.slowestGeneration.coords).toEqual({ cx: 1, cy: 0 });
    });
    
    it('should provide optimization recommendations', () => {
      // Low cache hit rate
      for (let i = 0; i < 10; i++) {
        metrics.trackCacheMiss(i, 0);
      }
      metrics.trackCacheHit(0, 0);
      
      const recommendations = metrics.getOptimizationRecommendations();
      expect(recommendations).toContain('increaseCacheSize');
    });
    
    it('should track memory usage', () => {
      metrics.trackMemoryUsage(100 * 1024 * 1024); // 100MB
      metrics.trackMemoryUsage(150 * 1024 * 1024); // 150MB
      
      const memStats = metrics.getMemoryStats();
      expect(memStats.current).toBe(150 * 1024 * 1024);
      expect(memStats.peak).toBe(150 * 1024 * 1024);
      expect(memStats.average).toBe(125 * 1024 * 1024);
    });
  });
  
  describe('Reporting', () => {
    it('should generate summary report', () => {
      // Add various metrics
      metrics.trackGeneration(100, 0, 0);
      metrics.trackCacheHit(0, 0);
      metrics.trackSave(50, 1024, 0, 0);
      
      const report = metrics.generateReport();
      expect(report).toHaveProperty('generation');
      expect(report).toHaveProperty('cache');
      expect(report).toHaveProperty('persistence');
      expect(report).toHaveProperty('timestamp');
    });
    
    it('should export metrics in JSON format', () => {
      metrics.trackGeneration(100, 0, 0);
      
      const json = metrics.toJSON();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('summary');
    });
    
    it('should reset metrics on demand', () => {
      metrics.trackGeneration(100, 0, 0);
      metrics.trackCacheHit(0, 0);
      
      metrics.reset();
      
      const stats = metrics.getGenerationStats();
      expect(stats.count).toBe(0);
      
      const cacheStats = metrics.getCacheStats();
      expect(cacheStats.hits).toBe(0);
    });
  });
  
  describe('Real-time Monitoring', () => {
    it('should calculate metrics for time windows', () => {
      const now = Date.now();
      
      metrics.trackGeneration(100, 0, 0, { timestamp: now - 5000 });
      metrics.trackGeneration(200, 1, 0, { timestamp: now - 1000 });
      metrics.trackGeneration(150, 2, 0, { timestamp: now });
      
      const recentStats = metrics.getStatsForLastMinute();
      expect(recentStats.generation.count).toBe(3);
      
      const last5Seconds = metrics.getStatsForPeriod(now - 5000, now);
      expect(last5Seconds.generation.count).toBe(3);
    });
    
    it('should detect anomalies', () => {
      // Normal generation times
      for (let i = 0; i < 10; i++) {
        metrics.trackGeneration(100 + Math.random() * 20, i, 0);
      }
      
      // Anomaly - very slow generation
      metrics.trackGeneration(1000, 10, 0);
      
      const anomalies = metrics.detectAnomalies();
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('slowGeneration');
    });
    
    it('should provide trend analysis', () => {
      const now = Date.now();
      
      // Increasing generation times (performance degradation)
      for (let i = 0; i < 10; i++) {
        metrics.trackGeneration(100 + i * 10, i, 0, { 
          timestamp: now + i * 1000 
        });
      }
      
      const trends = metrics.analyzeTrends();
      expect(trends.generation.trend).toBe('increasing');
      expect(trends.generation.concern).toBe(true);
    });
  });
});