/**
 * Performance Benchmark: Spatial Index vs Linear Search
 * 
 * This benchmark compares the performance of spatial indexing (O(1) lookups)
 * versus traditional linear search (O(n) lookups) for NPC position queries.
 * 
 * Usage: node tests/social/spatial-index-benchmark.js
 */

import { NPC } from '../../src/social/npc.js';
import { SpatialIndex } from '../../src/social/movement/SpatialIndex.js';
import { W, H } from '../../src/js/core/config.js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Linear search implementation (current approach)
 */
function linearSearch(npcs, x, y, filters = {}) {
  return npcs.find(npc => {
    if (npc.x !== x || npc.y !== y) return false;
    if (filters.minHp !== undefined && npc.hp < filters.minHp) return false;
    if (filters.chunkX !== undefined && npc.chunkX !== filters.chunkX) return false;
    if (filters.chunkY !== undefined && npc.chunkY !== filters.chunkY) return false;
    return true;
  }) || null;
}

/**
 * Generate random NPCs for testing
 */
function generateNPCs(count) {
  const npcs = [];
  const factions = ['candy_citizens', 'candy_guards', 'flame_kingdom', 'ice_kingdom', 'neutral'];
  
  for (let i = 0; i < count; i++) {
    npcs.push(new NPC({
      id: `npc_${i}`,
      name: `NPC ${i}`,
      x: Math.floor(Math.random() * W),
      y: Math.floor(Math.random() * H),
      hp: Math.random() > 0.1 ? Math.floor(Math.random() * 100) + 1 : 0, // 10% dead
      chunkX: Math.floor(Math.random() * 3), // 3 chunks
      chunkY: Math.floor(Math.random() * 3),
      factions: [factions[Math.floor(Math.random() * factions.length)]]
    }));
  }
  
  return npcs;
}

/**
 * Run benchmark for a specific NPC count
 */
function runBenchmark(npcCount, iterations = 1000) {
  console.log(`\n${colors.bright}=== Testing with ${npcCount} NPCs ===${colors.reset}`);
  
  // Generate NPCs
  const npcs = generateNPCs(npcCount);
  
  // Build spatial index
  const spatialIndex = new SpatialIndex();
  npcs.forEach(npc => spatialIndex.add(npc));
  
  // Generate random lookup positions
  const lookups = [];
  for (let i = 0; i < iterations; i++) {
    lookups.push({
      x: Math.floor(Math.random() * W),
      y: Math.floor(Math.random() * H),
      filters: {
        minHp: 1,
        chunkX: Math.floor(Math.random() * 3),
        chunkY: Math.floor(Math.random() * 3)
      }
    });
  }
  
  // Benchmark linear search
  const linearStart = performance.now();
  let linearHits = 0;
  
  for (const lookup of lookups) {
    const result = linearSearch(npcs, lookup.x, lookup.y, lookup.filters);
    if (result) linearHits++;
  }
  
  const linearTime = performance.now() - linearStart;
  
  // Benchmark spatial index
  const spatialStart = performance.now();
  let spatialHits = 0;
  
  for (const lookup of lookups) {
    const result = spatialIndex.getAt(lookup.x, lookup.y, lookup.filters);
    if (result) spatialHits++;
  }
  
  const spatialTime = performance.now() - spatialStart;
  
  // Calculate improvement
  const speedup = (linearTime / spatialTime).toFixed(1);
  const linearAvg = (linearTime / iterations).toFixed(4);
  const spatialAvg = (spatialTime / iterations).toFixed(4);
  
  // Display results
  console.log(`\n${colors.blue}Linear Search:${colors.reset}`);
  console.log(`  Total time: ${linearTime.toFixed(2)}ms`);
  console.log(`  Avg per lookup: ${linearAvg}ms`);
  console.log(`  Hits: ${linearHits}/${iterations}`);
  
  console.log(`\n${colors.green}Spatial Index:${colors.reset}`);
  console.log(`  Total time: ${spatialTime.toFixed(2)}ms`);
  console.log(`  Avg per lookup: ${spatialAvg}ms`);
  console.log(`  Hits: ${spatialHits}/${iterations}`);
  
  console.log(`\n${colors.yellow}Performance Improvement:${colors.reset}`);
  console.log(`  ${colors.bright}${speedup}x faster${colors.reset}`);
  
  // Get spatial index stats
  const stats = spatialIndex.getStats();
  console.log(`\n${colors.blue}Index Statistics:${colors.reset}`);
  console.log(`  Total NPCs: ${stats.totalNPCs}`);
  console.log(`  Unique positions: ${stats.positions}`);
  console.log(`  Hit rate: ${stats.hitRate}`);
  
  return { linearTime, spatialTime, speedup: parseFloat(speedup) };
}

/**
 * Run comprehensive benchmark suite
 */
function runBenchmarkSuite() {
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}   Spatial Index Performance Benchmark${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`\nMap size: ${W}x${H} (${W * H} tiles)`);
  console.log(`Testing NPC lookups with position, health, and chunk filtering`);
  
  const npcCounts = [10, 50, 100, 250, 500, 1000];
  const results = [];
  
  for (const count of npcCounts) {
    const result = runBenchmark(count, 1000);
    results.push({ npcCount: count, ...result });
  }
  
  // Summary table
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}   Summary${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log('\nNPCs  | Linear (ms) | Spatial (ms) | Speedup');
  console.log('------|-------------|--------------|--------');
  
  for (const result of results) {
    const npcStr = result.npcCount.toString().padEnd(5);
    const linearStr = result.linearTime.toFixed(2).padEnd(11);
    const spatialStr = result.spatialTime.toFixed(2).padEnd(12);
    const speedupStr = `${result.speedup}x`;
    
    // Color code the speedup
    let speedupColor = colors.green;
    if (result.speedup < 5) speedupColor = colors.yellow;
    if (result.speedup < 2) speedupColor = colors.red;
    
    console.log(`${npcStr} | ${linearStr} | ${spatialStr} | ${speedupColor}${speedupStr}${colors.reset}`);
  }
  
  // Calculate average speedup
  const avgSpeedup = (results.reduce((sum, r) => sum + r.speedup, 0) / results.length).toFixed(1);
  
  console.log(`\n${colors.bright}Average speedup: ${colors.green}${avgSpeedup}x${colors.reset}`);
  
  // Memory usage estimate
  console.log(`\n${colors.bright}Memory Usage Estimate:${colors.reset}`);
  console.log(`  Base array: ${results[results.length - 1].npcCount} references`);
  console.log(`  Spatial index: ~${results[results.length - 1].npcCount * 3} references`);
  console.log(`  Trade-off: ${colors.yellow}3x memory${colors.reset} for ${colors.green}${avgSpeedup}x speed${colors.reset}`);
  
  // Recommendations
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
  if (avgSpeedup > 10) {
    console.log(`  ${colors.green}✓${colors.reset} Excellent performance gain! Spatial indexing highly recommended.`);
  } else if (avgSpeedup > 5) {
    console.log(`  ${colors.green}✓${colors.reset} Good performance gain. Spatial indexing recommended for most use cases.`);
  } else if (avgSpeedup > 2) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Moderate performance gain. Consider if you have >50 NPCs.`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Limited performance gain. May not be worth the complexity.`);
  }
  
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
}

// Run the benchmark
runBenchmarkSuite();