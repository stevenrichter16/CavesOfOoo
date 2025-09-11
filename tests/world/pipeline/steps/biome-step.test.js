/**
 * Tests for BiomeStep
 * Testing biome selection with regional clustering
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('BiomeStep', () => {
  let BiomeStep, Chunk, SeededRandom;
  
  beforeEach(async () => {
    const biomeModule = await import('../../../../src/js/world/pipeline/steps/BiomeStep.js');
    const chunkModule = await import('../../../../src/js/world/core/Chunk.js');
    const randomModule = await import('../../../../src/js/world/pipeline/SeededRandom.js');
    
    BiomeStep = biomeModule.BiomeStep;
    Chunk = chunkModule.Chunk;
    SeededRandom = randomModule.SeededRandom;
  });
  
  describe('Biome Selection', () => {
    it('should assign a biome to the chunk', async () => {
      const step = new BiomeStep();
      const context = {
        seed: 'test-seed',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('test-seed', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      expect(context.chunk.biome).toBeDefined();
      expect(context.chunk.biome).not.toBeNull();
    });
    
    it('should use available biome types', async () => {
      const step = new BiomeStep();
      const validBiomes = ['grassland', 'forest', 'desert', 'tundra', 'swamp', 'mountains'];
      
      const context = {
        seed: 'test-seed',
        cx: 5,
        cy: 5,
        chunk: new Chunk(5, 5),
        rng: new SeededRandom('test-seed', 5, 5),
        params: {}
      };
      
      await step.process(context);
      
      expect(validBiomes).toContain(context.chunk.biome);
    });
  });
  
  describe('Regional Biome Generation', () => {
    it('should generate consistent biomes for same region', async () => {
      const step = new BiomeStep();
      const seed = 'region-test';
      
      // Test chunks in same region (close together)
      const chunk1Context = {
        seed,
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom(seed, 0, 0),
        params: {}
      };
      
      const chunk2Context = {
        seed,
        cx: 1,
        cy: 0,
        chunk: new Chunk(1, 0),
        rng: new SeededRandom(seed, 1, 0),
        params: {}
      };
      
      const chunk3Context = {
        seed,
        cx: 0,
        cy: 1,
        chunk: new Chunk(0, 1),
        rng: new SeededRandom(seed, 0, 1),
        params: {}
      };
      
      await step.process(chunk1Context);
      await step.process(chunk2Context);
      await step.process(chunk3Context);
      
      // Adjacent chunks should likely have the same biome
      const biome1 = chunk1Context.chunk.biome;
      const biome2 = chunk2Context.chunk.biome;
      const biome3 = chunk3Context.chunk.biome;
      
      // At least 2 out of 3 adjacent chunks should share the same biome
      const sameBiomeCount = [biome1, biome2, biome3].filter(b => b === biome1).length;
      expect(sameBiomeCount).toBeGreaterThanOrEqual(2);
    });
    
    it('should create distinct biome regions', async () => {
      const step = new BiomeStep();
      const seed = 'region-test';
      const biomes = new Map();
      
      // Sample a larger area
      for (let cx = -5; cx <= 5; cx++) {
        for (let cy = -5; cy <= 5; cy++) {
          const context = {
            seed,
            cx,
            cy,
            chunk: new Chunk(cx, cy),
            rng: new SeededRandom(seed, cx, cy),
            params: {}
          };
          
          await step.process(context);
          biomes.set(`${cx},${cy}`, context.chunk.biome);
        }
      }
      
      // Should have multiple biome types (not all the same)
      const uniqueBiomes = new Set(biomes.values());
      expect(uniqueBiomes.size).toBeGreaterThan(1);
      expect(uniqueBiomes.size).toBeLessThanOrEqual(6); // Reasonable number of biomes for 11x11 area
      
      // Check for clustering - count how many chunks match their neighbors
      let matchingNeighbors = 0;
      let totalNeighborChecks = 0;
      
      for (let cx = -4; cx <= 4; cx++) {
        for (let cy = -4; cy <= 4; cy++) {
          const currentBiome = biomes.get(`${cx},${cy}`);
          
          // Check 4 neighbors
          const neighbors = [
            biomes.get(`${cx+1},${cy}`),
            biomes.get(`${cx-1},${cy}`),
            biomes.get(`${cx},${cy+1}`),
            biomes.get(`${cx},${cy-1}`)
          ].filter(b => b !== undefined);
          
          neighbors.forEach(neighborBiome => {
            totalNeighborChecks++;
            if (neighborBiome === currentBiome) {
              matchingNeighbors++;
            }
          });
        }
      }
      
      // At least 60% of neighbors should match (indicating clustering)
      const clusteringRatio = matchingNeighbors / totalNeighborChecks;
      expect(clusteringRatio).toBeGreaterThan(0.6);
    });
    
    it('should use biome centers for region calculation', async () => {
      const step = new BiomeStep();
      
      // Access biome centers if they're exposed
      const centers = step.getBiomeCenters ? step.getBiomeCenters('test-seed') : null;
      
      if (centers) {
        expect(centers).toBeInstanceOf(Array);
        expect(centers.length).toBeGreaterThan(0);
        
        // Each center should have coordinates and biome type
        centers.forEach(center => {
          expect(center).toHaveProperty('x');
          expect(center).toHaveProperty('y');
          expect(center).toHaveProperty('biome');
        });
      }
    });
  });
  
  describe('Biome Properties', () => {
    it('should set biome-specific metadata', async () => {
      const step = new BiomeStep();
      const context = {
        seed: 'test-seed',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('test-seed', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should set additional biome properties
      expect(context.params.biomeTemperature).toBeDefined();
      expect(context.params.biomeHumidity).toBeDefined();
      expect(context.params.biomeElevation).toBeDefined();
    });
    
    it('should have appropriate properties for each biome type', async () => {
      const step = new BiomeStep();
      
      const testBiome = async (cx, cy) => {
        const context = {
          seed: 'property-test',
          cx,
          cy,
          chunk: new Chunk(cx, cy),
          rng: new SeededRandom('property-test', cx, cy),
          params: {}
        };
        
        await step.process(context);
        return context;
      };
      
      // Test multiple chunks to get different biomes
      for (let i = 0; i < 10; i++) {
        const ctx = await testBiome(i * 10, i * 10);
        
        if (ctx.chunk.biome === 'desert') {
          expect(ctx.params.biomeTemperature).toBeGreaterThan(0.7);
          expect(ctx.params.biomeHumidity).toBeLessThan(0.3);
        } else if (ctx.chunk.biome === 'tundra') {
          expect(ctx.params.biomeTemperature).toBeLessThan(0.3);
        } else if (ctx.chunk.biome === 'swamp') {
          expect(ctx.params.biomeHumidity).toBeGreaterThan(0.7);
        } else if (ctx.chunk.biome === 'mountains') {
          expect(ctx.params.biomeElevation).toBeGreaterThan(0.7);
        }
      }
    });
  });
  
  describe('Deterministic Generation', () => {
    it('should generate same biome for same seed and coordinates', async () => {
      const step = new BiomeStep();
      
      const createContext = (seed, cx, cy) => ({
        seed,
        cx,
        cy,
        chunk: new Chunk(cx, cy),
        rng: new SeededRandom(seed, cx, cy),
        params: {}
      });
      
      const context1 = createContext('test', 5, 5);
      const context2 = createContext('test', 5, 5);
      
      await step.process(context1);
      await step.process(context2);
      
      expect(context1.chunk.biome).toBe(context2.chunk.biome);
      expect(context1.params.biomeTemperature).toBe(context2.params.biomeTemperature);
      expect(context1.params.biomeHumidity).toBe(context2.params.biomeHumidity);
    });
    
    it('should generate different patterns for different seeds', async () => {
      const step = new BiomeStep();
      
      const generateBiomeMap = async (seed) => {
        const biomes = [];
        for (let cx = 0; cx < 5; cx++) {
          for (let cy = 0; cy < 5; cy++) {
            const context = {
              seed,
              cx,
              cy,
              chunk: new Chunk(cx, cy),
              rng: new SeededRandom(seed, cx, cy),
              params: {}
            };
            await step.process(context);
            biomes.push(context.chunk.biome);
          }
        }
        return biomes.join(',');
      };
      
      const map1 = await generateBiomeMap('seed1');
      const map2 = await generateBiomeMap('seed2');
      
      // Different seeds should produce different biome patterns
      expect(map1).not.toBe(map2);
    });
  });
});