/**
 * Simple verification script for ChunkMetrics
 */

import { ChunkMetrics } from '../../src/js/world/core/ChunkMetrics.js';

async function verifyMetrics() {
  console.log('🔍 Verifying ChunkMetrics implementation...\n');
  
  const metrics = new ChunkMetrics();
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Track generation
  console.log('✓ Test 1: Generation Tracking');
  totalTests++;
  try {
    metrics.trackGeneration(150, 5, 5);
    const stats = metrics.getGenerationStats();
    
    if (stats.count !== 1 || stats.averageTime !== 150) {
      throw new Error('Generation tracking failed');
    }
    console.log('  ✅ Generation tracking works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 2: Cache metrics
  console.log('✓ Test 2: Cache Metrics');
  totalTests++;
  try {
    metrics.trackCacheHit(0, 0);
    metrics.trackCacheHit(1, 0);
    metrics.trackCacheMiss(2, 0);
    
    const stats = metrics.getCacheStats();
    if (stats.hits !== 2 || stats.misses !== 1 || Math.abs(stats.hitRate - 0.667) > 0.01) {
      throw new Error(`Cache stats wrong: ${JSON.stringify(stats)}`);
    }
    console.log('  ✅ Cache metrics work\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 3: Persistence metrics
  console.log('✓ Test 3: Persistence Metrics');
  totalTests++;
  try {
    metrics.trackSave(50, 1024, 10, 10);
    metrics.trackLoad(25, 10, 10, true);
    
    const saveStats = metrics.getSaveStats();
    const loadStats = metrics.getLoadStats();
    
    if (saveStats.count !== 1 || loadStats.count !== 1) {
      throw new Error('Persistence tracking failed');
    }
    console.log('  ✅ Persistence metrics work\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 4: Error tracking
  console.log('✓ Test 4: Error Tracking');
  totalTests++;
  try {
    metrics.trackError('save', new Error('Test error'), 10, 10);
    
    const errorStats = metrics.getErrorStats();
    if (errorStats.total !== 1 || errorStats.byType.save !== 1) {
      throw new Error('Error tracking failed');
    }
    console.log('  ✅ Error tracking works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 5: Bottleneck detection
  console.log('✓ Test 5: Bottleneck Detection');
  totalTests++;
  try {
    metrics.reset(); // Clear previous data
    metrics.trackGeneration(100, 0, 0);
    metrics.trackGeneration(500, 1, 1); // Slow one
    metrics.trackGeneration(150, 2, 2);
    
    const bottlenecks = metrics.getBottlenecks();
    if (bottlenecks.slowestGeneration.duration !== 500) {
      throw new Error('Bottleneck detection failed');
    }
    console.log('  ✅ Bottleneck detection works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 6: Recommendations
  console.log('✓ Test 6: Optimization Recommendations');
  totalTests++;
  try {
    metrics.reset();
    // Create low cache hit rate scenario
    for (let i = 0; i < 10; i++) {
      metrics.trackCacheMiss(i, 0);
    }
    metrics.trackCacheHit(0, 0);
    
    const recommendations = metrics.getOptimizationRecommendations();
    if (!recommendations.includes('increaseCacheSize')) {
      throw new Error('Should recommend cache size increase');
    }
    console.log('  ✅ Recommendations work\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 7: Report generation
  console.log('✓ Test 7: Report Generation');
  totalTests++;
  try {
    const report = metrics.generateReport();
    
    if (!report.generation || !report.cache || !report.persistence || !report.timestamp) {
      throw new Error('Report missing required fields');
    }
    console.log('  ✅ Report generation works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 8: Anomaly detection
  console.log('✓ Test 8: Anomaly Detection');
  totalTests++;
  try {
    metrics.reset();
    // Normal generations
    for (let i = 0; i < 5; i++) {
      metrics.trackGeneration(100, i, 0);
    }
    // Anomaly
    metrics.trackGeneration(1000, 10, 0);
    
    const anomalies = metrics.detectAnomalies();
    if (anomalies.length === 0 || anomalies[0].type !== 'slowGeneration') {
      throw new Error('Failed to detect anomaly');
    }
    console.log('  ✅ Anomaly detection works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 9: Trend analysis
  console.log('✓ Test 9: Trend Analysis');
  totalTests++;
  try {
    metrics.reset();
    // Increasing trend
    for (let i = 0; i < 10; i++) {
      metrics.trackGeneration(100 + i * 20, i, 0);
    }
    
    const trends = metrics.analyzeTrends();
    if (trends.generation.trend !== 'increasing') {
      throw new Error('Failed to detect increasing trend');
    }
    console.log('  ✅ Trend analysis works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (passedTests === totalTests) {
    console.log('✨ All ChunkMetrics tests passed!');
    console.log('🎉 Metrics system is ready for production!\n');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} tests failed\n`);
  }
  
  return passedTests === totalTests;
}

// Run verification
verifyMetrics().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});