import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';

const mockEventBus = { emit: () => {}, on: () => {} };
const system = new ChunkSystem(mockEventBus, { 
  useAdventureTimeBiomes: true, 
  seed: 'test' 
});

console.log('Testing BiomeManager integration...\n');

await system.initializeBiomeManager();
console.log('✅ BiomeManager initialized:', !!system.biomeManager);

// Test if biomeManager is passed to pipeline
const chunk = await system.generateChunk('test', 0, 0);
console.log('✅ Chunk generated with biome:', chunk.biome);

// Check biome manager directly
if (system.biomeManager) {
  const biome = system.biomeManager.getBiome(0, 0);
  console.log('✅ Direct BiomeManager call returns:', biome);
  
  // Check if it's Candy Kingdom
  if (biome === 'candy_kingdom') {
    console.log('✅ Correctly identified (0,0) as Candy Kingdom!');
  } else {
    console.log('❌ Expected candy_kingdom at (0,0), got:', biome);
  }
}

// Check pipeline context
console.log('\nDebugging pipeline context...');
const testChunk = await system.pipeline.generate('test', 0, 0, {
  biomeManager: system.biomeManager
});
console.log('✅ Direct pipeline call with biomeManager:', testChunk.biome);

// Test biome step directly
import { BiomeStep } from '../../src/js/world/pipeline/steps/BiomeStep.js';
const biomeStep = new BiomeStep();
const context = {
  seed: 'test',
  cx: 0,
  cy: 0,
  chunk: { biome: null },
  params: {},
  rng: { next: () => Math.random() },
  biomeManager: system.biomeManager
};

await biomeStep.process(context);
console.log('✅ BiomeStep with context.biomeManager:', context.chunk.biome);

console.log('\n✨ Diagnosis complete!');