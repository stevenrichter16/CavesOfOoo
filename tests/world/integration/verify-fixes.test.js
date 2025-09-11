/**
 * Simple verification tests for priority fixes
 */

import { describe, it, expect } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { AdventureTimeBiomeStep } from '../../../src/js/world/pipeline/steps/AdventureTimeBiomeStep.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';

describe('Verify Priority Fixes', () => {
  
  it('should create ChunkSystem with async factory', async () => {
    const system = await ChunkSystem.create(null, {
      seed: 'test',
      useAdventureTimeBiomes: true
    });
    
    expect(system).toBeDefined();
    expect(system.biomeManager).toBeInstanceOf(BiomeManager);
  });
  
  it('should use dependency injection in AdventureTimeBiomeStep', () => {
    const mockBiomeManager = new BiomeManager('test');
    
    const step = new AdventureTimeBiomeStep('test', {
      biomeManager: mockBiomeManager
    });
    
    expect(step.biomeManager).toBe(mockBiomeManager);
  });
  
  it('should handle errors gracefully', async () => {
    const step = new AdventureTimeBiomeStep('test');
    
    // Test with invalid context
    const result = await step.process(null);
    
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid context');
  });
  
  it('should safely handle empty chunk map', () => {
    const step = new AdventureTimeBiomeStep('test');
    
    const chunk = { map: [] };
    const dims = step.getChunkDimensions(chunk);
    
    expect(dims.width).toBe(0);
    expect(dims.height).toBe(0);
    
    // Should not throw
    step.applyBiomeTiles(chunk, { tiles: [{ x: 0, y: 0, char: '#' }] });
  });
  
  it('should use seeded random', () => {
    const step = new AdventureTimeBiomeStep('test-seed');
    
    const rng1 = step.createSeededRandom(0, 0);
    const rng2 = step.createSeededRandom(0, 0);
    
    // Same seed should produce same sequence
    const val1 = rng1.next();
    const val2 = rng2.next();
    
    expect(val1).toBe(val2);
  });
  
  it('should not have require() in source code', () => {
    const sourceCode = ChunkSystem.toString();
    
    // Should not contain require()
    expect(sourceCode).not.toContain('require(');
  });
});