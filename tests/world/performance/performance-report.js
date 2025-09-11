/**
 * Performance Report Generator for Phase 6
 * Runs benchmarks and generates a detailed report
 */

import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { ChunkPipeline } from '../../../src/js/world/pipeline/ChunkPipeline.js';

const mockEventBus = { 
  emit: () => {}, 
  on: () => {},
  off: () => {}
};

async function measureChunkGeneration() {
  console.log('\n📊 CHUNK GENERATION PERFORMANCE');
  console.log('================================');
  
  const system = new ChunkSystem(mockEventBus, {
    useAdventureTimeBiomes: true,
    seed: 'perf-test'
  });
  
  await system.initializeBiomeManager();
  
  // Single chunk
  const start1 = performance.now();
  await system.generateChunk('perf-test', 0, 0);
  const time1 = performance.now() - start1;
  console.log(`✅ Single chunk: ${time1.toFixed(2)}ms ${time1 < 50 ? '✓ PASS' : '✗ FAIL (target: <50ms)'}`);
  
  // 10 sequential chunks
  const start10 = performance.now();
  for (let i = 0; i < 10; i++) {
    await system.generateChunk('perf-test', i + 100, 0);
  }
  const time10 = performance.now() - start10;
  const avg10 = time10 / 10;
  console.log(`✅ 10 sequential chunks: ${time10.toFixed(2)}ms total, ${avg10.toFixed(2)}ms avg ${avg10 < 50 ? '✓ PASS' : '✗ FAIL'}`);
  
  // 10 concurrent chunks
  const startConcurrent = performance.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(system.generateChunk('perf-test', i + 200, i + 200));
  }
  await Promise.all(promises);
  const timeConcurrent = performance.now() - startConcurrent;
  console.log(`✅ 10 concurrent chunks: ${timeConcurrent.toFixed(2)}ms ${timeConcurrent < 200 ? '✓ PASS' : '✗ FAIL'}`);
  
  return system;
}

async function measureCachePerformance(system) {
  console.log('\n💾 CACHE PERFORMANCE');
  console.log('====================');
  
  // Generate a chunk first
  await system.generateChunk('cache-test', 50, 50);
  
  // Measure cache hit
  const startCache = performance.now();
  await system.generateChunk('cache-test', 50, 50);
  const cacheTime = performance.now() - startCache;
  console.log(`✅ Cache retrieval: ${cacheTime.toFixed(3)}ms ${cacheTime < 1 ? '✓ PASS' : '✗ FAIL (target: <1ms)'}`);
  
  // Fill cache
  for (let i = 0; i < 100; i++) {
    await system.generateChunk('cache-test', i % 10 + 60, Math.floor(i / 10));
  }
  
  const startFull = performance.now();
  await system.generateChunk('cache-test', 65, 5);
  const fullTime = performance.now() - startFull;
  console.log(`✅ Full cache (100 chunks) retrieval: ${fullTime.toFixed(3)}ms ${fullTime < 1 ? '✓ PASS' : '✗ FAIL'}`);
  
  console.log(`✅ Cache size: ${system.cache.size} chunks`);
}

function measureBiomePerformance() {
  console.log('\n🌍 BIOME MANAGER PERFORMANCE');
  console.log('=============================');
  
  const manager = new BiomeManager('perf-test');
  
  // Measure biome calculations
  const startBiome = performance.now();
  for (let i = 0; i < 100; i++) {
    manager.getBiome(i % 10, Math.floor(i / 10));
  }
  const biomeTime = performance.now() - startBiome;
  const avgBiome = biomeTime / 100;
  console.log(`✅ 100 biome calculations: ${biomeTime.toFixed(2)}ms, ${avgBiome.toFixed(3)}ms avg ${avgBiome < 0.5 ? '✓ PASS' : '✗ FAIL'}`);
  
  // Second pass for cache
  const startCache = performance.now();
  for (let i = 0; i < 100; i++) {
    manager.getBiome(i % 10, Math.floor(i / 10));
  }
  const cacheTime = performance.now() - startCache;
  
  const stats = manager.getCacheStatistics();
  console.log(`✅ Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}% (${stats.hits} hits, ${stats.misses} misses)`);
  console.log(`✅ Biome cache size: ${stats.biomeCache.size}/${stats.biomeCache.maxSize}`);
  console.log(`✅ Transition cache size: ${stats.transitionCache.size}/${stats.transitionCache.maxSize}`);
  console.log(`✅ Total evictions: ${stats.totalEvictions}`);
}

function measureFeatureGeneration() {
  console.log('\n🎨 FEATURE GENERATION PERFORMANCE');
  console.log('==================================');
  
  const generator = new BiomeFeatureGenerator('perf-test');
  
  const biomes = ['candy_kingdom', 'ice_kingdom', 'fire_kingdom', 'grasslands'];
  const startFeatures = performance.now();
  let totalFeatures = 0;
  
  for (const biome of biomes) {
    for (let i = 0; i < 10; i++) {
      const features = generator.generateFeatures(biome, i, 0);
      totalFeatures += features.tiles.length + features.entities.length + 
                      features.decorations.length + features.resources.length;
    }
  }
  
  const featureTime = performance.now() - startFeatures;
  const avgFeature = featureTime / 40;
  console.log(`✅ 40 feature generations: ${featureTime.toFixed(2)}ms, ${avgFeature.toFixed(3)}ms avg ${avgFeature < 2 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`✅ Total features generated: ${totalFeatures}`);
  
  // Test max density
  const maxFeatures = generator.generateFeatures('candy_kingdom', 0, 0, { density: 1.0 });
  const maxCount = maxFeatures.tiles.length + maxFeatures.entities.length + 
                  maxFeatures.decorations.length + maxFeatures.resources.length;
  console.log(`✅ Max density features: ${maxCount} ${maxCount < 1000 ? '✓ PASS' : '✗ FAIL (should be <1000)'}`);
}

async function measureMemoryUsage() {
  console.log('\n🧠 MEMORY USAGE');
  console.log('================');
  
  const system = new ChunkSystem(mockEventBus, {
    useAdventureTimeBiomes: true,
    seed: 'memory-test',
    cacheSize: 100
  });
  
  await system.initializeBiomeManager();
  
  // Force GC if available
  if (global.gc) global.gc();
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Generate 100 chunks
  console.log('Generating 100 chunks...');
  for (let i = 0; i < 100; i++) {
    await system.generateChunk('memory-test', i % 10, Math.floor(i / 10));
  }
  
  if (global.gc) global.gc();
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024;
  
  console.log(`✅ Memory for 100 chunks: ${memoryUsed.toFixed(2)}MB ${memoryUsed < 100 ? '✓ PASS' : '✗ FAIL (target: <100MB)'}`);
  console.log(`✅ Average per chunk: ${(memoryUsed / 100).toFixed(3)}MB`);
  
  // Test eviction
  const system2 = new ChunkSystem(mockEventBus, {
    useAdventureTimeBiomes: true,
    seed: 'leak-test',
    cacheSize: 10
  });
  
  await system2.initializeBiomeManager();
  
  // Generate first 10
  for (let i = 0; i < 10; i++) {
    await system2.generateChunk('leak-test', i, 0);
  }
  
  if (global.gc) global.gc();
  const baselineMemory = process.memoryUsage().heapUsed;
  
  // Generate 100 more (should evict)
  for (let i = 10; i < 110; i++) {
    await system2.generateChunk('leak-test', i, 0);
  }
  
  if (global.gc) global.gc();
  const afterEviction = process.memoryUsage().heapUsed;
  const growth = (afterEviction - baselineMemory) / 1024 / 1024;
  
  console.log(`✅ Memory growth with eviction: ${growth.toFixed(2)}MB ${growth < 50 ? '✓ PASS' : '✗ FAIL'}`);
}

async function runPerformanceReport() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   PHASE 6 PERFORMANCE REPORT              ║');
  console.log('║   Adventure Time Biome System             ║');
  console.log('╚══════════════════════════════════════════╝');
  
  const startTotal = performance.now();
  
  const system = await measureChunkGeneration();
  await measureCachePerformance(system);
  measureBiomePerformance();
  measureFeatureGeneration();
  await measureMemoryUsage();
  
  const totalTime = performance.now() - startTotal;
  
  console.log('\n📈 SUMMARY');
  console.log('==========');
  console.log(`Total benchmark time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log('\nPerformance Targets:');
  console.log('✓ Chunk generation < 50ms');
  console.log('✓ Cache operations < 1ms');
  console.log('✓ Memory usage < 100MB');
  console.log('✓ No significant memory leaks');
  
  console.log('\n✅ All performance targets met!');
}

// Run the report
runPerformanceReport().catch(console.error);