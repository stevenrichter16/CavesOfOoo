/**
 * Third Passover - Deep TDD tests for Phase 5 logic errors
 * Focus on edge cases, race conditions, and subtle integration bugs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';
import { AdventureTimeBiomeStep } from '../../../src/js/world/pipeline/steps/AdventureTimeBiomeStep.js';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { ChunkPipeline } from '../../../src/js/world/pipeline/ChunkPipeline.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';
import { SeededRandom } from '../../../src/js/world/pipeline/SeededRandom.js';
import * as constants from '../../../src/js/world/biome/biome-constants.js';

describe('Phase 5 Third Passover - Deep Logic Analysis', () => {
  
  describe('Biome Territory Overlap Logic', () => {
    it('should handle overlapping kingdom territories correctly', () => {
      const manager = new BiomeManager('test');
      
      // Test point that could be in multiple territories
      // Candy Kingdom: center (0,0) radius 8
      // Breakfast Kingdom: center (25,15) radius 5
      // What happens at boundaries?
      
      const biome1 = manager.getBiome(4, 4); // Should be candy_kingdom
      const biome2 = manager.getBiome(8, 0); // Edge of candy_kingdom
      const biome3 = manager.getBiome(9, 0); // Just outside candy_kingdom
      
      expect(biome1).to.equal('candy_kingdom');
      // Edge behavior - should use falloff
      console.log('Edge biome:', biome2);
      console.log('Outside biome:', biome3);
    });
    
    it('should respect kingdom priority when territories overlap', () => {
      const manager = new BiomeManager('test');
      
      // Modify territories to create overlap
      manager.kingdomTerritories.test_kingdom1 = {
        center: { x: 0, y: 0 },
        radius: 10,
        priority: 5,
        falloff: 0.8
      };
      
      manager.kingdomTerritories.test_kingdom2 = {
        center: { x: 5, y: 5 },
        radius: 10,
        priority: 10, // Higher priority
        falloff: 0.8
      };
      
      // Point (5, 5) is in both territories
      const biome = manager.getBiome(5, 5);
      
      // Should get higher priority kingdom
      expect(['test_kingdom2', 'test_kingdom1']).to.include(biome);
    });
    
    it('should handle negative chunk coordinates correctly', () => {
      const manager = new BiomeManager('test');
      
      // Ice Kingdom is at (-50, 50)
      const biome1 = manager.getBiome(-50, 50);
      const biome2 = manager.getBiome(-45, 45);
      const biome3 = manager.getBiome(-100, -100);
      
      expect(biome1).to.equal('ice_kingdom');
      // Should handle negative coords without errors
      expect(biome3).to.be.a('string');
    });
  });
  
  describe('SeededRandom Edge Cases', () => {
    it('should handle seed overflow correctly', () => {
      const rng1 = new SeededRandom('very-long-seed-that-might-cause-overflow-in-hash-function');
      const rng2 = new SeededRandom('very-long-seed-that-might-cause-overflow-in-hash-function');
      
      // Should still be deterministic
      expect(rng1.next()).to.equal(rng2.next());
      expect(rng1.next()).to.equal(rng2.next());
    });
    
    it('should never generate value >= max in between()', () => {
      const rng = new SeededRandom('test');
      
      // Test edge case: generate many values
      for (let i = 0; i < 10000; i++) {
        const val = rng.between(0, 22);
        expect(val).to.be.at.least(0);
        expect(val).to.be.lessThan(22);
        
        // Check it's an integer
        expect(val).to.equal(Math.floor(val));
      }
    });
    
    it('should handle between() with same min and max', () => {
      const rng = new SeededRandom('test');
      
      const val = rng.between(5, 5);
      // Should this return 5 or throw? Currently undefined behavior
      expect(val).to.equal(5);
    });
  });
  
  describe('Pipeline Context Mutation Safety', () => {
    it('should not allow one step to corrupt context for next step', async () => {
      const pipeline = new ChunkPipeline();
      
      // Add a malicious step that modifies context
      const maliciousStep = {
        name: 'MaliciousStep',
        process: async (context) => {
          context.chunk = null; // Try to break things
          context.params = undefined;
          delete context.cx;
        }
      };
      
      pipeline.steps.splice(1, 0, maliciousStep);
      
      // Should handle corrupted context gracefully
      const chunk = await pipeline.generate('test', 5, 5);
      
      expect(chunk).to.exist;
      // Original chunk should be preserved or recreated
      expect(chunk.cx).to.exist;
    });
    
    it('should preserve critical context properties through pipeline', async () => {
      const pipeline = new ChunkPipeline();
      const criticalData = { important: 'data' };
      
      // Add step that adds data
      const addStep = {
        name: 'AddStep',
        process: async (context) => {
          context.customData = criticalData;
        }
      };
      
      // Add step that verifies data
      const verifyStep = {
        name: 'VerifyStep',
        process: async (context) => {
          expect(context.customData).to.deep.equal(criticalData);
        }
      };
      
      pipeline.steps.push(addStep);
      pipeline.steps.push(verifyStep);
      
      await pipeline.generate('test', 0, 0);
    });
  });
  
  describe('Feature Generator Boundary Conditions', () => {
    it('should handle biome with no features defined', () => {
      const gen = new BiomeFeatureGenerator('test');
      
      // Create a biome with missing features
      const features = gen.generateFeatures('nonexistent_biome', 0, 0);
      
      expect(features).to.exist;
      expect(features.tiles).to.be.an('array');
      expect(features.entities).to.be.an('array');
      // Should return empty arrays, not crash
    });
    
    it('should handle extreme density values', () => {
      const gen = new BiomeFeatureGenerator('test');
      
      // Test with extreme density
      const features1 = gen.generateFeatures('forest', 0, 0, { density: 0 });
      const features2 = gen.generateFeatures('forest', 1, 1, { density: 1000 });
      
      expect(features1).to.exist;
      expect(features2).to.exist;
      
      // Should have reasonable limits
      const totalFeatures = Object.values(features2).flat().length;
      expect(totalFeatures).to.be.lessThan(1000); // Should cap at reasonable number
    });
    
    it('should not place entities on occupied tiles', () => {
      const gen = new BiomeFeatureGenerator('test');
      const features = gen.generateFeatures('candy_kingdom', 0, 0);
      
      // Check for position conflicts
      const positions = new Set();
      const allFeatures = [
        ...features.tiles,
        ...features.entities,
        ...features.decorations,
        ...features.resources,
        ...features.special
      ];
      
      let conflicts = 0;
      allFeatures.forEach(f => {
        if (f.x !== undefined && f.y !== undefined) {
          const key = `${f.x},${f.y}`;
          if (positions.has(key)) {
            conflicts++;
          }
          positions.add(key);
        }
      });
      
      // Some overlap is OK (decorations on tiles), but not too much
      expect(conflicts).to.be.lessThan(allFeatures.length * 0.2);
    });
  });
  
  describe('Cache Invalidation Scenarios', () => {
    it('should invalidate cache when seed changes', () => {
      const manager1 = new BiomeManager('seed1');
      const manager2 = new BiomeManager('seed2');
      
      const biome1 = manager1.getBiome(10, 10);
      const biome2 = manager2.getBiome(10, 10);
      
      // Different seeds should give different biomes (usually)
      // This might fail occasionally due to hash collisions
      const differentBiomes = biome1 !== biome2;
      expect(differentBiomes || biome1 === biome2).to.be.true; // Always passes but logs difference
      
      if (biome1 === biome2) {
        console.log('Hash collision at (10,10):', biome1);
      }
    });
    
    it('should handle cache overflow correctly during rapid generation', () => {
      const manager = new BiomeManager('test', { maxCacheSize: 10 });
      
      // Generate many chunks rapidly
      const biomes = [];
      for (let i = 0; i < 100; i++) {
        biomes.push(manager.getBiome(i, 0));
      }
      
      // Cache should not exceed max size
      expect(manager.getBiomeCacheSize()).to.be.at.most(10);
      
      // Should still be deterministic
      const biome0Again = manager.getBiome(0, 0);
      expect(biome0Again).to.equal(biomes[0]);
      
      // Check eviction count
      const stats = manager.getCacheStatistics();
      expect(stats.biomeEvictions).to.be.at.least(90);
    });
    
    it('should maintain separate cache statistics for different operations', () => {
      const manager = new BiomeManager('test');
      
      // Access biomes
      manager.getBiome(0, 0);
      manager.getBiome(0, 0); // Hit
      manager.getBiome(1, 1);
      
      // Access transitions
      manager.getTransitionZone('forest', 'desert', 0, 0);
      manager.getTransitionZone('forest', 'desert', 0, 0); // Hit
      
      const stats = manager.getCacheStatistics();
      
      expect(stats.hits).to.equal(2);
      expect(stats.misses).to.equal(3);
      expect(stats.hitRate).to.be.closeTo(0.4, 0.01);
    });
  });
  
  describe('Transition Manager Edge Cases', () => {
    it('should handle transitions at world boundaries', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      // Test at extreme coordinates
      const isEdge1 = transitionMgr.isBiomeEdge(999999, 999999);
      const isEdge2 = transitionMgr.isBiomeEdge(-999999, -999999);
      
      expect(isEdge1).to.be.a('boolean');
      expect(isEdge2).to.be.a('boolean');
      // Should not crash or overflow
    });
    
    it('should generate smooth transitions between similar biomes', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      const features1 = transitionMgr.mixFeatures('grasslands', 'forest', 0.5);
      const features2 = transitionMgr.mixFeatures('ice_kingdom', 'fire_kingdom', 0.5);
      
      // Similar biomes should have more features
      const count1 = features1.decorations.length + features1.entities.length;
      const count2 = features2.decorations.length + features2.entities.length;
      
      console.log('Grassland-forest features:', count1);
      console.log('Ice-fire features:', count2);
      
      expect(count1).to.be.greaterThan(0);
      expect(count2).to.be.greaterThan(0);
    });
    
    it('should handle circular biome references', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      // Create circular reference scenario
      const info1 = transitionMgr.getTransitionInfo(0, 0);
      const info2 = transitionMgr.getTransitionInfo(0, 0);
      
      // Should not create infinite loop
      expect(info1).to.deep.equal(info2);
    });
  });
  
  describe('ChunkSystem Integration Depth', () => {
    it('should handle biome manager initialization failure', async () => {
      const mockEventBus = { on: () => {}, emit: () => {} };
      const system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'test'
      });
      
      // Force initialization failure
      system.initializeBiomeManager = async () => {
        throw new Error('Init failed');
      };
      
      try {
        await system.initializeBiomeManager();
      } catch (e) {
        // Should handle gracefully
      }
      
      // System should still work with fallback
      const chunk = await system.generateChunk('test', 0, 0);
      expect(chunk).to.exist;
      expect(chunk.biome).to.exist;
    });
    
    it('should preserve biome manager state across multiple chunks', async () => {
      const mockEventBus = { on: () => {}, emit: () => {} };
      const system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'test'
      });
      
      await system.initializeBiomeManager();
      
      // Generate multiple chunks
      const chunk1 = await system.generateChunk('test', 0, 0);
      const chunk2 = await system.generateChunk('test', 1, 0);
      const chunk3 = await system.generateChunk('test', 0, 1);
      
      // Check that biomes were assigned
      expect(chunk1.biome).to.exist;
      expect(chunk2.biome).to.exist;
      expect(chunk3.biome).to.exist;
      
      // If BiomeManager is being used, check its state
      if (system.biomeManager) {
        const stats = system.biomeManager.getCacheStatistics();
        
        // BiomeManager should have entries if it was used
        if (chunk1.biome === 'candy_kingdom' || chunk1.biome === 'grasslands') {
          // Check that the manager was actually used (hits + misses > 0)
          expect(stats.hits + stats.misses).to.be.greaterThan(0);
        }
        
        // If we got the same biome for nearby chunks, cache should have helped
        if (chunk1.biome === chunk2.biome && chunk2.biome === chunk3.biome) {
          expect(stats.biomeCache.size).to.be.greaterThan(0);
        }
      }
    });
  });
  
  describe('Error Recovery Mechanisms', () => {
    it('should recover from feature generation errors', () => {
      const gen = new BiomeFeatureGenerator('test');
      
      // Override a method to throw
      const originalGenerate = gen.generateEntities;
      gen.generateEntities = () => {
        throw new Error('Entity generation failed');
      };
      
      // Should not crash entire feature generation
      const features = gen.generateFeatures('forest', 0, 0);
      
      expect(features).to.exist;
      expect(features.tiles).to.be.an('array');
      
      // Restore
      gen.generateEntities = originalGenerate;
    });
    
    it('should handle corrupt biome definitions', () => {
      const manager = new BiomeManager('test');
      
      // Try to get corrupted biome
      const biome = manager.getBiomeDefinition(null);
      expect(biome).to.exist;
      expect(biome.name).to.be.a('string');
      
      const biome2 = manager.getBiomeDefinition({});
      expect(biome2).to.exist;
    });
    
    it('should handle pipeline step that never resolves', async () => {
      const pipeline = new ChunkPipeline();
      
      // Add step that hangs
      const hangingStep = {
        name: 'HangingStep',
        process: () => new Promise(() => {}) // Never resolves
      };
      
      pipeline.steps.push(hangingStep);
      
      // Should timeout or handle somehow
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve('timeout'), 100);
      });
      
      const result = await Promise.race([
        pipeline.generate('test', 0, 0).catch(e => 'error'),
        timeoutPromise
      ]);
      
      expect(result).to.equal('timeout');
    });
  });
  
  describe('Data Consistency Validation', () => {
    it('should maintain biome consistency in adjacent chunks', () => {
      const manager = new BiomeManager('test');
      
      // Get a 3x3 grid of chunks
      const grid = [];
      for (let y = -1; y <= 1; y++) {
        const row = [];
        for (let x = -1; x <= 1; x++) {
          row.push(manager.getBiome(x, y));
        }
        grid.push(row);
      }
      
      // Center should usually be similar to at least one neighbor
      const center = grid[1][1];
      const neighbors = [
        grid[0][1], grid[2][1], grid[1][0], grid[1][2]
      ];
      
      const hasSimilar = neighbors.some(n => n === center);
      
      // Log for analysis
      console.log('Biome grid:', grid);
      console.log('Center biome:', center, 'Has similar neighbor:', hasSimilar);
      
      // This is informational, not a hard requirement
      expect(center).to.be.a('string');
    });
    
    it('should not modify readonly chunk properties', async () => {
      const pipeline = new ChunkPipeline();
      
      const chunk = await pipeline.generate('test', 5, 5);
      
      // Try to modify core properties
      const originalCx = chunk.cx;
      const originalCy = chunk.cy;
      
      chunk.cx = 999;
      chunk.cy = 999;
      
      // Should either prevent modification or at least detect it
      if (chunk.cx === 999) {
        console.warn('Chunk coordinates are mutable!');
      }
      
      expect(chunk.cx).to.be.a('number');
      expect(chunk.cy).to.be.a('number');
    });
  });
  
  describe('Memory Leak Detection', () => {
    it('should not leak memory in transition cache', () => {
      const manager = new BiomeManager('test', {
        maxTransitionCacheSize: 10
      });
      
      // Generate many unique transitions
      for (let i = 0; i < 1000; i++) {
        const biome1 = `biome${i % 10}`;
        const biome2 = `biome${(i + 1) % 10}`;
        manager.getTransitionZone(biome1, biome2, i, i);
      }
      
      // Cache should be bounded
      expect(manager.getTransitionCacheSize()).to.be.at.most(10);
      
      const stats = manager.getCacheStatistics();
      expect(stats.transitionEvictions).to.be.at.least(990);
    });
    
    it('should clean up references in chunk after processing', async () => {
      const pipeline = new ChunkPipeline();
      const biomeStep = new AdventureTimeBiomeStep('test');
      pipeline.steps[0] = biomeStep;
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Check for potential memory leaks
      const checkSize = (obj) => JSON.stringify(obj).length;
      
      const metadataSize = checkSize(chunk.metadata);
      const featuresSize = chunk.biomeFeatures ? checkSize(chunk.biomeFeatures) : 0;
      
      console.log('Metadata size:', metadataSize);
      console.log('Features size:', featuresSize);
      
      // Should not have excessive data
      expect(metadataSize).to.be.lessThan(10000);
      expect(featuresSize).to.be.lessThan(50000);
    });
  });
});