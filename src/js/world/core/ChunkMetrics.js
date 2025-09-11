/**
 * ChunkMetrics - Performance monitoring and analytics for chunk system
 * Tracks generation times, cache efficiency, persistence operations
 */

export class ChunkMetrics {
  constructor() {
    this.data = {
      generation: [],
      cacheHits: [],
      cacheMisses: [],
      saves: [],
      loads: [],
      errors: [],
      memory: []
    };
    
    this.startTime = Date.now();
  }
  
  /**
   * Track chunk generation
   */
  trackGeneration(duration, cx, cy, metadata = {}) {
    this.data.generation.push({
      duration,
      cx,
      cy,
      timestamp: metadata.timestamp || Date.now(),
      biome: metadata.biome || null,
      ...metadata
    });
  }
  
  /**
   * Track cache hit
   */
  trackCacheHit(cx, cy, timestamp = Date.now()) {
    this.data.cacheHits.push({ cx, cy, timestamp });
  }
  
  /**
   * Track cache miss
   */
  trackCacheMiss(cx, cy, timestamp = Date.now()) {
    this.data.cacheMisses.push({ cx, cy, timestamp });
  }
  
  /**
   * Track save operation
   */
  trackSave(duration, size, cx, cy, timestamp = Date.now()) {
    this.data.saves.push({
      duration,
      size,
      cx,
      cy,
      timestamp
    });
  }
  
  /**
   * Track load operation
   */
  trackLoad(duration, cx, cy, success, timestamp = Date.now()) {
    this.data.loads.push({
      duration,
      cx,
      cy,
      success,
      timestamp
    });
  }
  
  /**
   * Track error
   */
  trackError(type, error, cx, cy) {
    this.data.errors.push({
      type,
      message: error.message,
      stack: error.stack,
      cx,
      cy,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track memory usage
   */
  trackMemoryUsage(bytes) {
    this.data.memory.push({
      bytes,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get generation statistics
   */
  getGenerationStats() {
    const generations = this.data.generation;
    
    if (generations.length === 0) {
      return {
        count: 0,
        averageTime: 0,
        totalTime: 0,
        minTime: 0,
        maxTime: 0
      };
    }
    
    const times = generations.map(g => g.duration);
    const total = times.reduce((sum, t) => sum + t, 0);
    
    return {
      count: generations.length,
      averageTime: total / generations.length,
      totalTime: total,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }
  
  /**
   * Get generation stats by biome
   */
  getGenerationStatsByBiome() {
    const byBiome = {};
    
    for (const gen of this.data.generation) {
      if (!gen.biome) continue;
      
      if (!byBiome[gen.biome]) {
        byBiome[gen.biome] = {
          count: 0,
          totalTime: 0,
          times: []
        };
      }
      
      byBiome[gen.biome].count++;
      byBiome[gen.biome].totalTime += gen.duration;
      byBiome[gen.biome].times.push(gen.duration);
    }
    
    // Calculate averages
    for (const biome in byBiome) {
      const stats = byBiome[biome];
      stats.averageTime = stats.totalTime / stats.count;
      delete stats.times; // Clean up temp array
    }
    
    return byBiome;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const hits = this.data.cacheHits.length;
    const misses = this.data.cacheMisses.length;
    const total = hits + misses;
    
    return {
      hits,
      misses,
      total,
      hitRate: total > 0 ? hits / total : 0
    };
  }
  
  /**
   * Get cache stats for a time period
   */
  getCacheStatsForPeriod(startTime, endTime) {
    const hits = this.data.cacheHits.filter(
      h => h.timestamp >= startTime && h.timestamp <= endTime
    ).length;
    
    const misses = this.data.cacheMisses.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    ).length;
    
    return {
      hits,
      misses,
      total: hits + misses,
      hitRate: (hits + misses) > 0 ? hits / (hits + misses) : 0
    };
  }
  
  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency() {
    const stats = this.getCacheStats();
    
    return {
      hitRate: stats.hitRate,
      totalRequests: stats.total,
      savedGenerations: stats.hits
    };
  }
  
  /**
   * Get save statistics
   */
  getSaveStats() {
    const saves = this.data.saves;
    
    if (saves.length === 0) {
      return {
        count: 0,
        averageTime: 0,
        totalSize: 0,
        averageSize: 0
      };
    }
    
    const totalTime = saves.reduce((sum, s) => sum + s.duration, 0);
    const totalSize = saves.reduce((sum, s) => sum + s.size, 0);
    
    return {
      count: saves.length,
      averageTime: totalTime / saves.length,
      totalSize,
      averageSize: totalSize / saves.length
    };
  }
  
  /**
   * Get load statistics
   */
  getLoadStats() {
    const loads = this.data.loads;
    
    if (loads.length === 0) {
      return {
        count: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        averageTime: 0
      };
    }
    
    const successCount = loads.filter(l => l.success).length;
    const totalTime = loads.reduce((sum, l) => sum + l.duration, 0);
    
    return {
      count: loads.length,
      successCount,
      failureCount: loads.length - successCount,
      successRate: successCount / loads.length,
      averageTime: totalTime / loads.length
    };
  }
  
  /**
   * Get error statistics
   */
  getErrorStats() {
    const errors = this.data.errors;
    const byType = {};
    
    for (const error of errors) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }
    
    return {
      total: errors.length,
      byType
    };
  }
  
  /**
   * Identify performance bottlenecks
   */
  getBottlenecks() {
    const generations = this.data.generation;
    
    if (generations.length === 0) {
      return {
        slowestGeneration: null
      };
    }
    
    const slowest = generations.reduce((max, g) => 
      g.duration > (max?.duration || 0) ? g : max, null
    );
    
    return {
      slowestGeneration: {
        duration: slowest.duration,
        coords: { cx: slowest.cx, cy: slowest.cy }
      }
    };
  }
  
  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const cacheStats = this.getCacheStats();
    
    // Low cache hit rate
    if (cacheStats.hitRate < 0.5 && cacheStats.total > 10) {
      recommendations.push('increaseCacheSize');
    }
    
    // Slow generation times
    const genStats = this.getGenerationStats();
    if (genStats.averageTime > 500) {
      recommendations.push('optimizePipeline');
    }
    
    // High error rate
    const errorStats = this.getErrorStats();
    if (errorStats.total > 10) {
      recommendations.push('improveErrorHandling');
    }
    
    return recommendations;
  }
  
  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const memory = this.data.memory;
    
    if (memory.length === 0) {
      return {
        current: 0,
        peak: 0,
        average: 0
      };
    }
    
    const values = memory.map(m => m.bytes);
    const total = values.reduce((sum, v) => sum + v, 0);
    
    return {
      current: values[values.length - 1],
      peak: Math.max(...values),
      average: total / values.length
    };
  }
  
  /**
   * Generate comprehensive report
   */
  generateReport() {
    return {
      generation: this.getGenerationStats(),
      cache: this.getCacheStats(),
      persistence: {
        saves: this.getSaveStats(),
        loads: this.getLoadStats()
      },
      errors: this.getErrorStats(),
      memory: this.getMemoryStats(),
      recommendations: this.getOptimizationRecommendations(),
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }
  
  /**
   * Export metrics as JSON
   */
  toJSON() {
    return JSON.stringify({
      data: this.data,
      summary: this.generateReport()
    }, null, 2);
  }
  
  /**
   * Reset all metrics
   */
  reset() {
    this.data = {
      generation: [],
      cacheHits: [],
      cacheMisses: [],
      saves: [],
      loads: [],
      errors: [],
      memory: []
    };
    this.startTime = Date.now();
  }
  
  /**
   * Get stats for last minute
   */
  getStatsForLastMinute() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    return this.getStatsForPeriod(oneMinuteAgo, now);
  }
  
  /**
   * Get stats for a time period
   */
  getStatsForPeriod(startTime, endTime) {
    const generation = this.data.generation.filter(
      g => g.timestamp >= startTime && g.timestamp <= endTime
    );
    
    return {
      generation: {
        count: generation.length,
        averageTime: generation.length > 0 
          ? generation.reduce((sum, g) => sum + g.duration, 0) / generation.length 
          : 0
      },
      cache: this.getCacheStatsForPeriod(startTime, endTime)
    };
  }
  
  /**
   * Detect anomalies in metrics
   */
  detectAnomalies() {
    const anomalies = [];
    const genStats = this.getGenerationStats();
    
    // Check for slow generations (3x average)
    for (const gen of this.data.generation) {
      if (gen.duration > genStats.averageTime * 3) {
        anomalies.push({
          type: 'slowGeneration',
          duration: gen.duration,
          coords: { cx: gen.cx, cy: gen.cy },
          threshold: genStats.averageTime * 3
        });
      }
    }
    
    return anomalies;
  }
  
  /**
   * Analyze trends
   */
  analyzeTrends() {
    const recentGens = this.data.generation.slice(-10);
    
    if (recentGens.length < 2) {
      return {
        generation: { trend: 'insufficient-data', concern: false }
      };
    }
    
    // Check if generation times are increasing
    let increasing = 0;
    for (let i = 1; i < recentGens.length; i++) {
      if (recentGens[i].duration > recentGens[i - 1].duration) {
        increasing++;
      }
    }
    
    const trend = increasing > recentGens.length * 0.6 ? 'increasing' : 'stable';
    
    return {
      generation: {
        trend,
        concern: trend === 'increasing'
      }
    };
  }
}