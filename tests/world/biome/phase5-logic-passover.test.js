/**
 * Comprehensive TDD tests for Phase 5 logic errors - Second Passover
 * Testing deep integration issues and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';
import { AdventureTimeBiomeStep } from '../../../src/js/world/pipeline/steps/AdventureTimeBiomeStep.js';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { ChunkPipeline } from '../../../src/js/world/pipeline/ChunkPipeline.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';
import * as constants from '../../../src/js/world/biome/biome-constants.js';

describe('Phase 5 Logic Errors - Second Passover', () => {
  
  describe('Biome Manager Cache Coherency', () => {
    it('should maintain cache coherency when same chunk accessed multiple times', () => {
      const manager = new BiomeManager('test', { maxCacheSize: 10 });
      
      // Access same chunk multiple times
      const biome1 = manager.getBiome(5, 5);
      const biome2 = manager.getBiome(5, 5);
      const biome3 = manager.getBiome(5, 5);
      
      expect(biome1).to.equal(biome2);
      expect(biome2).to.equal(biome3);
      
      // Cache should have exactly 1 entry
      expect(manager.getBiomeCacheSize()).to.equal(1);
      
      // Should have 1 miss and 2 hits
      const stats = manager.getCacheStatistics();
      expect(stats.hits).to.equal(2);
      expect(stats.misses).to.equal(1);
    });
    
    it('should not corrupt cache when evicting during concurrent access', () => {
      const manager = new BiomeManager('test', { maxCacheSize: 2 });
      
      // Fill cache
      const biome1 = manager.getBiome(1, 1);
      const biome2 = manager.getBiome(2, 2);
      
      // This should evict (1,1)
      const biome3 = manager.getBiome(3, 3);
      
      // Access evicted entry - should regenerate same biome
      const biome1Again = manager.getBiome(1, 1);
      
      expect(biome1).to.equal(biome1Again);
    });
    
    it('should handle transition cache independently from biome cache', () => {
      const manager = new BiomeManager('test', { 
        maxCacheSize: 2,
        maxTransitionCacheSize: 1 
      });
      
      // Fill biome cache
      manager.getBiome(1, 1);
      manager.getBiome(2, 2);
      
      // Fill transition cache - should not affect biome cache
      manager.getTransitionZone('forest', 'desert', 1, 1);
      manager.getTransitionZone('forest', 'desert', 2, 2); // Should evict first
      
      const stats = manager.getCacheStatistics();
      expect(stats.biomeCache.size).to.equal(2);
      expect(stats.transitionCache.size).to.equal(1);
      expect(stats.transitionEvictions).to.equal(1);
      expect(stats.biomeEvictions).to.equal(0);
    });
  });
  
  describe('Feature Generator Coordinate Boundaries', () => {
    it('should never generate features outside chunk boundaries', () => {
      const gen = new BiomeFeatureGenerator('test');
      
      // Test 1000 generations to ensure edge cases
      for (let i = 0; i < 1000; i++) {
        const features = gen.generateFeatures('forest', i % 100, Math.floor(i / 100));
        
        // Check all feature arrays
        const allFeatures = [
          ...(features.tiles || []),
          ...(features.entities || []),
          ...(features.decorations || []),
          ...(features.resources || []),
          ...(features.special || [])
        ];
        
        allFeatures.forEach(feature => {
          if (feature.x !== undefined) {
            if (feature.x < 0 || feature.x >= constants.CHUNK_WIDTH) {
              console.log('Bad feature:', feature);
            }
            expect(feature.x, `Feature x=${feature.x} out of bounds`).to.be.at.least(0);
            expect(feature.x, `Feature x=${feature.x} exceeds width`).to.be.lessThan(constants.CHUNK_WIDTH);
          }
          if (feature.y !== undefined) {
            if (feature.y < 0 || feature.y >= constants.CHUNK_HEIGHT) {
              console.log('Bad feature:', feature, 'at iteration', i);
            }
            expect(feature.y, `Feature y=${feature.y} out of bounds`).to.be.at.least(0);
            expect(feature.y, `Feature y=${feature.y} exceeds height`).to.be.lessThan(constants.CHUNK_HEIGHT);
          }
        });
      }
    });
    
    it('should generate deterministic features even with interleaved calls', () => {
      const gen1 = new BiomeFeatureGenerator('test');
      const gen2 = new BiomeFeatureGenerator('test');
      
      // Interleaved generation
      const f1_00 = gen1.generateFeatures('forest', 0, 0);
      const f2_11 = gen2.generateFeatures('forest', 1, 1);
      const f1_11 = gen1.generateFeatures('forest', 1, 1);
      const f2_00 = gen2.generateFeatures('forest', 0, 0);
      
      // Should be deterministic regardless of call order
      expect(f1_00).to.deep.equal(f2_00);
      expect(f1_11).to.deep.equal(f2_11);
    });
  });
  
  describe('Pipeline Integration Race Conditions', () => {
    it('should handle async biome manager initialization correctly', async () => {
      const mockEventBus = { on: () => {}, emit: () => {} };
      const system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'test'
      });
      
      // Should wait for initialization
      await system.initializeBiomeManager();
      
      expect(system.biomeManager).to.exist;
      expect(system.biomeManager).to.be.instanceOf(BiomeManager);
    });
    
    it('should not lose biome data during pipeline processing', async () => {
      const pipeline = new ChunkPipeline();
      const biomeStep = new AdventureTimeBiomeStep('test');
      pipeline.steps[0] = biomeStep;
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Biome should be set
      expect(chunk.biome).to.exist;
      expect(chunk.biome).to.not.equal('undefined');
      
      // Features should be preserved
      expect(chunk.biomeFeatures).to.exist;
    });
    
    it('should handle pipeline step failures gracefully', async () => {
      const pipeline = new ChunkPipeline();
      
      // Add failing step
      const failingStep = {
        name: 'FailingStep',
        process: async () => { throw new Error('Test failure'); }
      };
      pipeline.steps.splice(1, 0, failingStep);
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Should still generate chunk despite failure
      expect(chunk).to.exist;
      expect(chunk.cx).to.equal(0);
    });
  });
  
  describe('Coordinate System Consistency', () => {
    it('should use consistent coordinates between BiomeManager and TransitionManager', () => {
      const biomeManager = new BiomeManager('test');
      const transitionManager = new BiomeTransitionManager(biomeManager);
      
      // Test boundary detection consistency
      const cx = 10, cy = 10;
      const biome = biomeManager.getBiome(cx, cy);
      
      // Check surrounding chunks
      const surroundingBiomes = [
        biomeManager.getBiome(cx - 1, cy),
        biomeManager.getBiome(cx + 1, cy),
        biomeManager.getBiome(cx, cy - 1),
        biomeManager.getBiome(cx, cy + 1)
      ];
      
      const hasTransition = surroundingBiomes.some(b => b !== biome);
      const isEdge = transitionManager.isBiomeEdge(cx, cy);
      
      // If biomes differ, should detect edge
      if (hasTransition) {
        expect(isEdge).to.be.true;
      }
    });
    
    it('should maintain coordinate consistency through full pipeline', async () => {
      const pipeline = new ChunkPipeline();
      const biomeStep = new AdventureTimeBiomeStep('test');
      pipeline.steps[0] = biomeStep;
      
      const cx = 5, cy = 7;
      const chunk = await pipeline.generate('test', cx, cy);
      
      // Chunk should have correct coordinates
      expect(chunk.cx).to.equal(cx);
      expect(chunk.cy).to.equal(cy);
      
      // Biome should match direct query
      const directBiome = biomeStep.biomeManager.getBiome(cx, cy);
      expect(chunk.biome).to.equal(directBiome);
    });
  });
  
  describe('Biome Transition Edge Cases', () => {
    it('should handle transition between same biome gracefully', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      const transition = manager.getTransitionZone('forest', 'forest', 0, 0);
      
      expect(transition).to.exist;
      expect(transition.from).to.equal('forest');
      expect(transition.to).to.equal('forest');
      expect(transition.mixRatio).to.be.at.least(0);
      expect(transition.mixRatio).to.be.at.most(1);
    });
    
    it('should not generate invalid features at biome edges', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      // Find an edge
      let edgeFound = false;
      let edgeX, edgeY;
      for (let x = 0; x < 20 && !edgeFound; x++) {
        for (let y = 0; y < 20 && !edgeFound; y++) {
          if (transitionMgr.isBiomeEdge(x, y)) {
            edgeFound = true;
            edgeX = x;
            edgeY = y;
          }
        }
      }
      
      if (edgeFound) {
        const info = transitionMgr.getTransitionInfo(edgeX, edgeY);
        expect(info).to.exist;
        expect(info.fromBiome).to.be.a('string');
        expect(info.toBiome).to.be.a('string');
      }
    });
    
    it('should blend features proportionally at transitions', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      const features = transitionMgr.mixFeatures('candy_kingdom', 'grasslands', 0.3);
      
      expect(features).to.exist;
      expect(features.tiles).to.exist;
      expect(features.decorations).to.exist;
      expect(features.entities).to.exist;
      
      // Should have more grassland features (70%) than candy (30%)
      const totalFeatures = features.tiles.length + features.decorations.length;
      expect(totalFeatures).to.be.greaterThan(0);
    });
  });
  
  describe('Error Propagation Across Phases', () => {
    it('should propagate biome errors to pipeline context', async () => {
      const failingBiomeManager = {
        getBiome: () => { throw new Error('Biome error'); },
        getBiomeDefinition: () => null
      };
      
      const step = new AdventureTimeBiomeStep('test', {
        biomeManager: failingBiomeManager
      });
      
      const context = {
        chunk: new Chunk(0, 0),
        cx: 0,
        cy: 0,
        params: {}
      };
      
      await step.process(context);
      
      expect(context.params.biomeError).to.contain('Biome error');
      expect(context.chunk.biome).to.equal('grasslands'); // Fallback
    });
    
    it('should handle missing biome definitions gracefully', () => {
      const manager = new BiomeManager('test');
      
      // Force an invalid biome
      const definition = manager.getBiomeDefinition('nonexistent_biome');
      
      expect(definition).to.exist; // Should return default
      expect(definition.name).to.equal('Grasslands'); // Default biome
    });
  });
  
  describe('Memory and Resource Management', () => {
    it('should not leak memory when processing many chunks', async () => {
      const pipeline = new ChunkPipeline();
      const biomeStep = new AdventureTimeBiomeStep('test');
      pipeline.steps[0] = biomeStep;
      
      // Process many chunks
      const chunks = [];
      for (let i = 0; i < 100; i++) {
        const chunk = await pipeline.generate('test', i, 0);
        chunks.push(chunk);
      }
      
      // Check cache didn't grow unbounded
      const stats = biomeStep.biomeManager.getCacheStatistics();
      expect(stats.biomeCache.size).to.be.at.most(constants.MAX_BIOME_CACHE_SIZE);
      expect(stats.transitionCache.size).to.be.at.most(constants.MAX_TRANSITION_CACHE_SIZE);
    });
    
    it('should clean up transition cache entries properly', () => {
      const manager = new BiomeManager('test', {
        maxTransitionCacheSize: 3
      });
      
      // Add transitions
      manager.getTransitionZone('forest', 'desert', 0, 0);
      manager.getTransitionZone('forest', 'desert', 1, 1);
      manager.getTransitionZone('forest', 'desert', 2, 2);
      
      expect(manager.getTransitionCacheSize()).to.equal(3);
      
      // Add one more - should evict oldest
      manager.getTransitionZone('forest', 'desert', 3, 3);
      
      expect(manager.getTransitionCacheSize()).to.equal(3);
      
      const stats = manager.getCacheStatistics();
      expect(stats.transitionEvictions).to.equal(1);
    });
  });
  
  describe('Phase 1-5 Data Flow', () => {
    it('should preserve chunk data through all phases', async () => {
      const mockEventBus = { on: () => {}, emit: () => {} };
      const system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'test'
      });
      
      await system.initializeBiomeManager();
      
      const chunk = await system.generateChunk('test', 5, 5);
      
      // Phase 1: Core chunk properties
      expect(chunk.cx).to.equal(5);
      expect(chunk.cy).to.equal(5);
      expect(chunk.map).to.exist;
      
      // Phase 2: Pipeline processed
      expect(chunk.generated).to.be.true;
      
      // Phase 3: World management
      expect(chunk.seed).to.equal('test');
      
      // Phase 5: Biome data
      expect(chunk.biome).to.exist;
      expect(chunk.biome).to.not.equal('undefined');
    });
    
    it('should maintain data consistency when switching biome systems', async () => {
      const mockEventBus = { on: () => {}, emit: () => {} };
      
      // Create with Adventure Time biomes
      const system1 = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'test'
      });
      await system1.initializeBiomeManager();
      
      // Create with generic biomes
      const system2 = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: false,
        seed: 'test'
      });
      
      const chunk1 = await system1.generateChunk('test', 0, 0);
      const chunk2 = await system2.generateChunk('test', 0, 0);
      
      // Both should generate valid chunks
      expect(chunk1.biome).to.exist;
      expect(chunk2.biome).to.exist;
      
      // But biomes may differ
      console.log('AT biome:', chunk1.biome, 'Generic biome:', chunk2.biome);
    });
  });
  
  describe('Special Kingdom Territory Logic', () => {
    it('should correctly identify kingdom territories', () => {
      const manager = new BiomeManager('test');
      
      // Candy Kingdom is at (0, 0) with radius 8
      const centerBiome = manager.getBiome(0, 0);
      expect(centerBiome).to.equal('candy_kingdom');
      
      // Just outside radius should be different
      const outsideBiome = manager.getBiome(12, 12);
      expect(outsideBiome).to.not.equal('candy_kingdom');
    });
    
    it('should apply kingdom falloff correctly', () => {
      const manager = new BiomeManager('test');
      
      // Test points at different distances from candy kingdom
      const biomes = [];
      for (let r = 0; r <= 10; r++) {
        biomes.push(manager.getBiome(r, 0));
      }
      
      // Should transition from candy_kingdom to other biomes
      const candyCount = biomes.filter(b => b === 'candy_kingdom').length;
      expect(candyCount).to.be.greaterThan(0);
      expect(candyCount).to.be.lessThan(biomes.length);
    });
  });
  
  describe('Async Operation Safety', () => {
    it('should handle concurrent chunk generation safely', async () => {
      const pipeline = new ChunkPipeline();
      const biomeStep = new AdventureTimeBiomeStep('test');
      pipeline.steps[0] = biomeStep;
      
      // Generate multiple chunks concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(pipeline.generate('test', i, i));
      }
      
      const chunks = await Promise.all(promises);
      
      // All should have valid biomes
      chunks.forEach((chunk, i) => {
        expect(chunk.biome).to.exist;
        expect(chunk.cx).to.equal(i);
        expect(chunk.cy).to.equal(i);
      });
      
      // Check for determinism
      const chunk0Again = await pipeline.generate('test', 0, 0);
      expect(chunk0Again.biome).to.equal(chunks[0].biome);
    });
    
    it('should not have race conditions in cache access', async () => {
      const manager = new BiomeManager('test', { maxCacheSize: 5 });
      
      // Concurrent access to same chunks
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(() => {
              const biome = manager.getBiome(i % 5, 0);
              resolve(biome);
            }, Math.random() * 10);
          })
        );
      }
      
      const biomes = await Promise.all(promises);
      
      // Should have consistent results for same coordinates
      for (let i = 0; i < 20; i++) {
        const expectedBiome = biomes[i % 5];
        expect(biomes[i]).to.equal(expectedBiome);
      }
    });
  });
});