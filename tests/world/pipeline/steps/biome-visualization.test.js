/**
 * Biome visualization test - Shows biome regions in ASCII
 */

import { describe, it } from 'vitest';

describe('Biome Visualization', () => {
  it('should show biome regions', async () => {
    const { BiomeStep } = await import('../../../../src/js/world/pipeline/steps/BiomeStep.js');
    const { Chunk } = await import('../../../../src/js/world/core/Chunk.js');
    const { SeededRandom } = await import('../../../../src/js/world/pipeline/SeededRandom.js');
    
    const step = new BiomeStep();
    const seed = 'visual-test';
    
    // Map biomes to ASCII characters
    const biomeChars = {
      grassland: '.',
      forest: 'T',
      desert: 'D',
      tundra: '*',
      swamp: '~',
      mountains: '^'
    };
    
    // Generate a 20x20 map of chunks
    const map = [];
    for (let cy = -10; cy < 10; cy++) {
      const row = [];
      for (let cx = -10; cx < 10; cx++) {
        const context = {
          seed,
          cx,
          cy,
          chunk: new Chunk(cx, cy),
          rng: new SeededRandom(seed, cx, cy),
          params: {}
        };
        
        await step.process(context);
        row.push(biomeChars[context.chunk.biome] || '?');
      }
      map.push(row.join(''));
    }
    
    console.log('\nBiome Map (20x20 chunks):');
    console.log('Legend: . = grassland, T = forest, D = desert, * = tundra, ~ = swamp, ^ = mountains');
    console.log('─'.repeat(20));
    map.forEach(row => console.log(row));
    console.log('─'.repeat(20));
    
    // The test always passes - it's just for visualization
  });
  
  it('should show biome centers', async () => {
    const { BiomeStep } = await import('../../../../src/js/world/pipeline/steps/BiomeStep.js');
    
    const step = new BiomeStep();
    const centers = step.getBiomeCenters('test-seed');
    
    console.log('\nBiome Centers:');
    centers.forEach((center, i) => {
      console.log(`  ${i}: ${center.biome} at (${center.x.toFixed(1)}, ${center.y.toFixed(1)})`);
    });
  });
});