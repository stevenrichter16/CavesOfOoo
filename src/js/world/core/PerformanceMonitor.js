/**
 * Performance Monitor for tracking chunk system operations
 * 
 * Tracks timing, memory usage, and throughput metrics for 
 * chunk generation, loading, and persistence operations.
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.timings = new Map();
    this.operationCounts = new Map();
    this.memorySnapshots = [];
    this.maxSnapshots = 100;
    this.startTime = Date.now();
    this.detailedMetrics = {
      chunkGeneration: [],
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0
    };
    
    // Initialize categories
    this.categories = [
      'chunk_generation',
      'chunk_load',
      'chunk_save',
      'cache_hit',
      'cache_miss',
      'cache_eviction',
      'transaction_commit',
      'transaction_rollback',
      'event_application',
      'persistence_io'
    ];
    
    this.categories.forEach(cat => {
      this.metrics.set(cat, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        lastTime: 0
      });
    });
  }
  
  /**
   * Start timing an operation
   * @param {string} operationId - Unique operation identifier
   * @returns {void}
   */
  startOperation(operationId) {
    this.timings.set(operationId, {
      start: performance.now(),
      memory: this._getMemoryUsage()
    });
  }
  
  /**
   * End timing an operation and record metrics
   * @param {string} operationId - Unique operation identifier
   * @param {string} category - Operation category
   * @param {Object} metadata - Additional metadata
   * @returns {number} Operation duration in ms
   */
  endOperation(operationId, category, metadata = {}) {
    const timing = this.timings.get(operationId);
    if (!timing) {
      console.warn(`No timing found for operation ${operationId}`);
      return 0;
    }
    
    const duration = performance.now() - timing.start;
    const memoryDelta = this._getMemoryUsage() - timing.memory;
    
    // Update metrics
    const metric = this.metrics.get(category);
    if (metric) {
      metric.count++;
      metric.totalTime += duration;
      metric.minTime = Math.min(metric.minTime, duration);
      metric.maxTime = Math.max(metric.maxTime, duration);
      metric.avgTime = metric.totalTime / metric.count;
      metric.lastTime = duration;
    }
    
    // Record operation
    const operationCount = this.operationCounts.get(category) || 0;
    this.operationCounts.set(category, operationCount + 1);
    
    // Clean up timing
    this.timings.delete(operationId);
    
    // Take memory snapshot periodically
    if (Math.random() < 0.1) { // 10% chance
      this._takeMemorySnapshot();
    }
    
    return duration;
  }
  
  /**
   * Record a simple count metric
   * @param {string} category - Metric category
   * @param {number} value - Value to add (default 1)
   */
  recordCount(category, value = 1) {
    const count = this.operationCounts.get(category) || 0;
    this.operationCounts.set(category, count + value);
  }
  
  /**
   * Get current memory usage
   * @private
   * @returns {number} Memory usage in bytes
   */
  _getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    }
    
    // Browser environment - use performance.memory if available
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    
    return 0;
  }
  
  /**
   * Take a memory snapshot
   * @private
   */
  _takeMemorySnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      memory: this._getMemoryUsage(),
      operations: new Map(this.operationCounts)
    };
    
    this.memorySnapshots.push(snapshot);
    
    // Limit snapshots
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }
  }
  
  /**
   * Get performance report
   * @returns {Object} Performance metrics report
   */
  getReport() {
    const report = {
      timestamp: Date.now(),
      metrics: {},
      operationCounts: {},
      memoryUsage: this._getMemoryUsage(),
      memoryTrend: this._getMemoryTrend()
    };
    
    // Convert metrics to plain objects
    for (const [category, metric] of this.metrics.entries()) {
      report.metrics[category] = { ...metric };
    }
    
    // Convert operation counts
    for (const [category, count] of this.operationCounts.entries()) {
      report.operationCounts[category] = count;
    }
    
    // Calculate throughput
    report.throughput = this._calculateThroughput();
    
    // Add performance score
    report.performanceScore = this._calculatePerformanceScore();
    
    return report;
  }
  
  /**
   * Calculate memory trend
   * @private
   * @returns {string} 'increasing', 'decreasing', or 'stable'
   */
  _getMemoryTrend() {
    if (this.memorySnapshots.length < 2) {
      return 'stable';
    }
    
    const recent = this.memorySnapshots.slice(-10);
    const firstMemory = recent[0].memory;
    const lastMemory = recent[recent.length - 1].memory;
    
    const change = lastMemory - firstMemory;
    const changePercent = (change / firstMemory) * 100;
    
    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }
  
  /**
   * Calculate operations per second
   * @private
   * @returns {Object} Throughput metrics
   */
  _calculateThroughput() {
    if (this.memorySnapshots.length < 2) {
      return { chunksPerSecond: 0, eventsPerSecond: 0 };
    }
    
    const timeWindow = 60000; // 1 minute window
    const now = Date.now();
    const recentOps = this.memorySnapshots.filter(s => 
      now - s.timestamp < timeWindow
    );
    
    if (recentOps.length === 0) {
      return { chunksPerSecond: 0, eventsPerSecond: 0 };
    }
    
    const firstOp = recentOps[0];
    const lastOp = recentOps[recentOps.length - 1];
    const timeDiff = (lastOp.timestamp - firstOp.timestamp) / 1000;
    
    if (timeDiff === 0) {
      return { chunksPerSecond: 0, eventsPerSecond: 0 };
    }
    
    const chunkOps = (lastOp.operations.get('chunk_generation') || 0) - 
                     (firstOp.operations.get('chunk_generation') || 0);
    const eventOps = (lastOp.operations.get('event_application') || 0) - 
                     (firstOp.operations.get('event_application') || 0);
    
    return {
      chunksPerSecond: chunkOps / timeDiff,
      eventsPerSecond: eventOps / timeDiff
    };
  }
  
  /**
   * Calculate overall performance score (0-100)
   * @private
   * @returns {number} Performance score
   */
  _calculatePerformanceScore() {
    let score = 100;
    
    // Penalize slow operations
    const genMetric = this.metrics.get('chunk_generation');
    if (genMetric && genMetric.avgTime > 100) {
      score -= Math.min(20, (genMetric.avgTime - 100) / 10);
    }
    
    // Reward cache hits
    const cacheHits = this.operationCounts.get('cache_hit') || 0;
    const cacheMisses = this.operationCounts.get('cache_miss') || 0;
    const hitRate = cacheHits / Math.max(1, cacheHits + cacheMisses);
    score += hitRate * 10;
    
    // Penalize transaction rollbacks
    const commits = this.operationCounts.get('transaction_commit') || 0;
    const rollbacks = this.operationCounts.get('transaction_rollback') || 0;
    const rollbackRate = rollbacks / Math.max(1, commits + rollbacks);
    score -= rollbackRate * 20;
    
    // Penalize memory growth
    const memoryTrend = this._getMemoryTrend();
    if (memoryTrend === 'increasing') {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.timings.clear();
    this.operationCounts.clear();
    this.memorySnapshots = [];
    
    // Re-initialize categories
    this.categories.forEach(cat => {
      this.metrics.set(cat, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        lastTime: 0
      });
    });
  }
  
  /**
   * Get detailed metrics with percentiles
   */
  getMetrics() {
    const chunkGen = this.metrics.get('chunk_generation') || {};
    return {
      chunkGeneration: {
        count: chunkGen.count || 0,
        averageTime: chunkGen.avgTime || 0,
        p50: this._calculatePercentile(50),
        p95: this._calculatePercentile(95),
        p99: this._calculatePercentile(99),
        min: chunkGen.minTime || 0,
        max: chunkGen.maxTime || 0
      },
      cache: {
        hits: this.detailedMetrics.cacheHits,
        misses: this.detailedMetrics.cacheMisses,
        hitRate: this.getCacheHitRate(),
        evictions: this.detailedMetrics.evictions
      },
      memory: this.getMemoryMetrics(),
      operations: this._getOperationMetrics()
    };
  }
  
  /**
   * Get memory usage metrics
   */
  getMemoryMetrics() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external || 0,
        rss: usage.rss
      };
    }
    return {
      heapUsed: this._getMemoryUsage(),
      heapTotal: 0,
      external: 0,
      rss: 0
    };
  }
  
  /**
   * Get memory trend analysis
   */
  getMemoryTrend() {
    const samples = this.memorySnapshots.map(s => s.memory);
    if (samples.length < 2) {
      return {
        samples,
        trend: 'stable',
        estimatedLeakRate: 0
      };
    }
    
    const recentAvg = samples.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, samples.length);
    const oldAvg = samples.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, samples.length);
    
    let trend = 'stable';
    let leakRate = 0;
    
    if (recentAvg > oldAvg * 1.1) {
      trend = 'growing';
      leakRate = (recentAvg - oldAvg) / samples.length;
    } else if (recentAvg < oldAvg * 0.9) {
      trend = 'shrinking';
    }
    
    return {
      samples,
      trend,
      estimatedLeakRate: leakRate
    };
  }
  
  /**
   * Track cache operations
   */
  trackCacheHit() {
    this.detailedMetrics.cacheHits++;
    this.recordCount('cache_hit');
  }
  
  trackCacheMiss() {
    this.detailedMetrics.cacheMisses++;
    this.recordCount('cache_miss');
  }
  
  trackEviction() {
    this.detailedMetrics.evictions++;
    this.recordCount('cache_eviction');
  }
  
  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const total = this.detailedMetrics.cacheHits + this.detailedMetrics.cacheMisses;
    return total === 0 ? 0 : this.detailedMetrics.cacheHits / total;
  }
  
  /**
   * Calculate percentile
   * @private
   */
  _calculatePercentile(percentile) {
    const metric = this.metrics.get('chunk_generation');
    if (!metric || metric.count === 0) return 0;
    
    // For now, return average as approximation
    // In production, would track all values for accurate percentiles
    return metric.avgTime || 0;
  }
  
  /**
   * Get operation metrics
   * @private
   */
  _getOperationMetrics() {
    const result = {};
    for (const [category, metric] of this.metrics.entries()) {
      result[category] = {
        count: metric.count,
        average: metric.avgTime,
        min: metric.minTime === Infinity ? 0 : metric.minTime,
        max: metric.maxTime
      };
    }
    return result;
  }
  
  /**
   * Get recommendations based on metrics
   * @returns {Array<Object>} Performance recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    // Check generation time
    const genMetric = this.metrics.get('chunk_generation');
    if (genMetric && genMetric.avgTime > 200) {
      recommendations.push({
        issue: 'slow_chunk_generation',
        recommendation: 'Consider optimizing chunk generation or using workers',
        p95Time: genMetric.avgTime,
        impact: 'medium'
      });
    }
    
    // Check cache performance
    const hitRate = this.getCacheHitRate();
    if (hitRate < 0.7) {
      recommendations.push({
        issue: 'high_cache_miss_rate',
        recommendation: 'Increase cache size to improve hit rate',
        currentValue: hitRate,
        targetValue: 0.85,
        impact: 'high'
      });
    }
    
    // Check transaction health
    const rollbacks = this.operationCounts.get('transaction_rollback') || 0;
    if (rollbacks > 10) {
      recommendations.push('High transaction rollback count. Review error handling and data validation.');
    }
    
    // Check memory usage
    const memTrend = this.getMemoryTrend();
    if (memTrend.trend === 'growing' && memTrend.estimatedLeakRate > 1000) {
      recommendations.push({
        issue: 'potential_memory_leak',
        recommendation: 'Investigate memory usage, possible leak detected',
        leakRate: memTrend.estimatedLeakRate,
        impact: 'critical'
      });
    }
    
    // Check eviction rate
    const evictions = this.operationCounts.get('cache_eviction') || 0;
    if (evictions > cacheHits * 0.5) {
      recommendations.push('High cache eviction rate. Consider increasing cache size.');
    }
    
    return recommendations;
  }
}