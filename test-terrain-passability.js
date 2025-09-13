#!/usr/bin/env node

// Test terrain passability
import { TerrainSystem } from './src/js/systems/TerrainSystem.js';
import { isPassable } from './src/js/utils/queries.js';

console.log('=== Testing Terrain Passability ===\n');

const terrain = new TerrainSystem();

// Test tiles that should be passable
const passableTiles = [
  { tile: '.', name: 'floor' },
  { tile: '=', name: 'paved road' },
  { tile: '·', name: 'candy floor' },
  { tile: ',', name: 'grass' },
  { tile: '~', name: 'water' },
  { tile: '%', name: 'candy dust' },
  { tile: '!', name: 'potion' },
  { tile: '/', name: 'weapon' },
  { tile: ']', name: 'armor' },
  { tile: '^', name: 'spikes (damages but passable)' },
  { tile: '$', name: 'chest' },
  { tile: '▲', name: 'shrine' },
  { tile: 'V', name: 'vendor' },
  { tile: '★', name: 'artifact' },
  { tile: '♪', name: 'oddity' },
  { tile: 'X', name: 'unknown tile (should default to passable)' }
];

// Test tiles that should NOT be passable
const impassableTiles = [
  { tile: '#', name: 'wall' },
  { tile: '+', name: 'door' }
];

console.log('Testing PASSABLE tiles:');
let passCount = 0;
for (const { tile, name } of passableTiles) {
  const passable = terrain.isPassable(tile);
  const status = passable ? '✅' : '❌';
  console.log(`  ${status} '${tile}' (${name}): ${passable ? 'PASS' : 'FAIL'}`);
  if (passable) passCount++;
}

console.log(`\n${passCount}/${passableTiles.length} passable tiles correct\n`);

console.log('Testing IMPASSABLE tiles:');
let blockCount = 0;
for (const { tile, name } of impassableTiles) {
  const passable = terrain.isPassable(tile);
  const status = !passable ? '✅' : '❌';
  console.log(`  ${status} '${tile}' (${name}): ${!passable ? 'PASS' : 'FAIL'}`);
  if (!passable) blockCount++;
}

console.log(`\n${blockCount}/${impassableTiles.length} impassable tiles correct\n`);

// Test old system for comparison
console.log('Comparing with old isPassable function:');
const mockState = {
  chunk: {
    map: Array(20).fill(null).map(() => Array(40).fill('.'))
  }
};

// Place some test tiles
mockState.chunk.map[5][5] = '#';  // wall
mockState.chunk.map[5][6] = '+';  // door
mockState.chunk.map[5][7] = '=';  // road
mockState.chunk.map[5][8] = '·';  // candy floor

console.log('  Old system at wall (5,5):', isPassable(mockState, 5, 5) ? 'passable' : 'blocked');
console.log('  Old system at door (6,5):', isPassable(mockState, 6, 5) ? 'passable' : 'blocked');
console.log('  Old system at road (7,5):', isPassable(mockState, 7, 5) ? 'passable' : 'blocked');
console.log('  Old system at candy (8,5):', isPassable(mockState, 8, 5) ? 'passable' : 'blocked');

console.log('\n=== Test Complete ===');
const totalCorrect = passCount + blockCount;
const totalTests = passableTiles.length + impassableTiles.length;
console.log(`Total: ${totalCorrect}/${totalTests} tests passed`);

if (totalCorrect === totalTests) {
  console.log('✅ All terrain passability tests passed!');
} else {
  console.log('❌ Some tests failed - please review');
}