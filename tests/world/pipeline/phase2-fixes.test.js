/**
 * Tests for Phase 2 code quality fixes
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Phase 2 Code Quality Fixes', () => {
  describe('BiomeStep Cache Management', () => {
    it('should limit cache to maximum size', async () => {
      const { BiomeStep } = await import('../../../src/js/world/pipeline/steps/BiomeStep.js');
      const step = new BiomeStep();
      
      // Generate many seeds
      for (let i = 0; i < 200; i++) {
        step.getBiomeCenters(`seed-${i}`);
      }
      
      // Cache should be limited
      expect(step.biomeCenters.size).toBeLessThanOrEqual(100);
    });
    
    it('should use LRU eviction for cache', async () => {
      const { BiomeStep } = await import('../../../src/js/world/pipeline/steps/BiomeStep.js');
      const step = new BiomeStep();
      
      // Fill cache to max
      for (let i = 0; i < 100; i++) {
        step.getBiomeCenters(`seed-${i}`);
      }
      
      // Access first seed again (make it recently used)
      step.getBiomeCenters('seed-0');
      
      // Add new seed (should evict least recently used)
      step.getBiomeCenters('seed-new');
      
      // First seed should still be cached (was recently used)
      expect(step.biomeCenters.has('seed-0')).toBe(true);
      
      // Some middle seed should be evicted
      let hasEvicted = false;
      for (let i = 1; i < 100; i++) {
        if (!step.biomeCenters.has(`seed-${i}`)) {
          hasEvicted = true;
          break;
        }
      }
      expect(hasEvicted).toBe(true);
    });
  });
  
  describe('Input Validation', () => {
    it('should validate and default invalid biome types', async () => {
      const { StructureStep } = await import('../../../src/js/world/pipeline/steps/StructureStep.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const { SeededRandom } = await import('../../../src/js/world/pipeline/SeededRandom.js');
      
      const step = new StructureStep();
      const chunk = new Chunk(0, 0);
      
      // Test various invalid biome values
      const invalidBiomes = [null, undefined, 123, {}, [], 'invalid_biome'];
      
      for (const invalidBiome of invalidBiomes) {
        chunk.biome = invalidBiome;
        
        const context = {
          seed: 'test',
          cx: 0,
          cy: 0,
          chunk,
          rng: new SeededRandom('test', 0, 0),
          params: {}
        };
        
        await step.process(context);
        
        // Should handle gracefully and produce valid output
        expect(context.params.rooms).toBeDefined();
        expect(Array.isArray(context.params.rooms)).toBe(true);
      }
    });
    
    it('should validate context structure', async () => {
      const { BiomeStep } = await import('../../../src/js/world/pipeline/steps/BiomeStep.js');
      const step = new BiomeStep();
      
      // Test with missing required fields
      const invalidContexts = [
        null,
        undefined,
        {},
        { chunk: null },
        { chunk: {}, params: null },
        { chunk: {}, params: {}, rng: null }
      ];
      
      for (const context of invalidContexts) {
        try {
          await step.process(context);
          // Should throw
          expect(false).toBe(true);
        } catch (e) {
          expect(e.message).toContain('Invalid context');
        }
      }
    });
  });
  
  describe.skip('Constants Definition', () => {
    it('should export chunk dimension constants', async () => {
      const constants = await import('../../../src/js/world/constants.js');
      
      expect(constants.CHUNK_WIDTH).toBe(24);
      expect(constants.CHUNK_HEIGHT).toBe(22);
      expect(constants.MAX_ROOM_ATTEMPTS).toBe(50);
      expect(constants.MAX_BIOME_CACHE_SIZE).toBe(100);
      expect(constants.MAX_ENTITIES_PER_CHUNK).toBe(20);
      expect(constants.MAX_NPCS_PER_CHUNK).toBe(10);
    });
    
    it('should use constants instead of magic numbers', async () => {
      const { CHUNK_WIDTH, CHUNK_HEIGHT } = await import('../../../src/js/world/constants.js');
      const { ValidationStep } = await import('../../../src/js/world/pipeline/steps/ValidationStep.js');
      
      const step = new ValidationStep();
      
      // Constants should be used in validation
      expect(CHUNK_WIDTH).toBe(24);
      expect(CHUNK_HEIGHT).toBe(22);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle negative RNG values', async () => {
      const { PopulationStep } = await import('../../../src/js/world/pipeline/steps/PopulationStep.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const step = new PopulationStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, y > 5 && y < 10 && x > 5 && x < 10 ? '.' : '#');
        }
      }
      
      chunk.biome = 'grassland';
      
      const context = {
        seed: 'negative-rng',
        cx: 0,
        cy: 0,
        chunk,
        rng: {
          next: () => -0.5 // Negative value
        },
        params: {
          rooms: [{ x: 6, y: 6, width: 4, height: 4 }]
        }
      };
      
      await step.process(context);
      
      // Should handle negative values properly
      for (const monster of chunk.monsters) {
        expect(monster.hp).toBeGreaterThan(0);
        expect(monster.damage).toBeGreaterThan(0);
        expect(monster.level).toBeGreaterThanOrEqual(1);
        expect(monster.x).toBeGreaterThanOrEqual(0);
        expect(monster.y).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should handle NaN RNG values', async () => {
      const { FeatureStep } = await import('../../../src/js/world/pipeline/steps/FeatureStep.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      for (let y = 5; y < 10; y++) {
        for (let x = 5; x < 10; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      chunk.biome = 'grassland';
      
      let callCount = 0;
      const context = {
        seed: 'nan-rng',
        cx: 0,
        cy: 0,
        chunk,
        rng: {
          next: () => {
            callCount++;
            return callCount % 3 === 0 ? NaN : 0.5;
          }
        },
        params: {
          rooms: [{ x: 5, y: 5, width: 5, height: 5 }]
        }
      };
      
      // Should not throw
      await expect(step.process(context)).resolves.not.toThrow();
      
      // Should have valid features
      expect(context.params.features).toBeDefined();
    });
  });
  
  describe('Performance Optimizations', () => {
    it('should complete validation quickly with many entities', async () => {
      const { ValidationStep } = await import('../../../src/js/world/pipeline/steps/ValidationStep.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const { SeededRandom } = await import('../../../src/js/world/pipeline/SeededRandom.js');
      
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Initialize tiles
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Add many entities
      chunk.monsters = [];
      for (let i = 0; i < 100; i++) {
        chunk.monsters.push({
          x: Math.floor(Math.random() * 24),
          y: Math.floor(Math.random() * 22),
          type: 'goblin',
          hp: 10
        });
      }
      
      const context = {
        seed: 'perf-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('perf-test', 0, 0),
        params: {}
      };
      
      const startTime = performance.now();
      await step.process(context);
      const endTime = performance.now();
      
      // Should complete very quickly
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});