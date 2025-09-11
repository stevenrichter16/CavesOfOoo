/**
 * TDD tests for Phase 5 logic error fixes
 * Testing critical bugs found in logic analysis
 */

import { expect } from 'chai';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { AdventureTimeBiomeStep } from '../../../src/js/world/pipeline/steps/AdventureTimeBiomeStep.js';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';
import * as constants from '../../../src/js/world/biome/biome-constants.js';

describe('Phase 5 Logic Error Fixes', () => {
  describe('Cache Configuration Bug', () => {
    it('should use separate cache size options for biome and transition caches', () => {
      const manager = new BiomeManager('test', {
        maxCacheSize: 100,
        maxTransitionCacheSize: 50
      });
      
      expect(manager.maxCacheSize).to.equal(100);
      expect(manager.maxTransitionCacheSize).to.equal(50);
    });
    
    it('should track cache evictions separately', () => {
      const manager = new BiomeManager('test', {
        maxCacheSize: 2,
        maxTransitionCacheSize: 2
      });
      
      // Fill biome cache
      manager.getBiome(0, 0);
      manager.getBiome(1, 1);
      manager.getBiome(2, 2); // Should evict
      
      // Fill transition cache
      manager.getTransitionZone('forest', 'desert', 0, 0);
      manager.getTransitionZone('forest', 'desert', 1, 1);
      manager.getTransitionZone('forest', 'desert', 2, 2); // Should evict
      
      const stats = manager.getCacheStatistics();
      expect(stats.biomeEvictions).to.equal(1);
      expect(stats.transitionEvictions).to.equal(1);
    });
  });
  
  describe('RNG Determinism Violation', () => {
    it('should produce identical features for same seed and coordinates', () => {
      const gen1 = new BiomeFeatureGenerator('test-seed');
      const gen2 = new BiomeFeatureGenerator('test-seed');
      
      const features1 = gen1.generateFeatures('forest', 5, 5);
      const features2 = gen2.generateFeatures('forest', 5, 5);
      
      expect(features1).to.deep.equal(features2);
    });
    
    it('should not affect subsequent calls with noise generation', () => {
      const gen = new BiomeFeatureGenerator('test-seed');
      
      // Generate with noise sampling
      const features1a = gen.generateFeatures('forest', 5, 5);
      const features1b = gen.generateFeatures('forest', 10, 10);
      
      // Reset and regenerate
      const gen2 = new BiomeFeatureGenerator('test-seed');
      const features2a = gen2.generateFeatures('forest', 5, 5);
      const features2b = gen2.generateFeatures('forest', 10, 10);
      
      expect(features1a).to.deep.equal(features2a);
      expect(features1b).to.deep.equal(features2b);
    });
  });
  
  describe('Array Bounds Errors', () => {
    it('should place features at all valid positions including edges', () => {
      const gen = new BiomeFeatureGenerator('test-seed');
      
      // Mock to track positions
      const positions = new Set();
      let callCount = 0;
      
      // Generate many times to ensure we hit edges
      for (let i = 0; i < 100; i++) {
        const features = gen.generateFeatures('forest', i, i);
        if (features && features.length > 0) {
          features.forEach(f => {
            if (f.x !== undefined && f.y !== undefined) {
              positions.add(`${f.x},${f.y}`);
            }
          });
        }
      }
      
      // Should be able to place at edges
      const hasRightEdge = Array.from(positions).some(p => 
        p.startsWith(`${constants.CHUNK_WIDTH - 1},`));
      const hasBottomEdge = Array.from(positions).some(p => 
        p.endsWith(`,${constants.CHUNK_HEIGHT - 1}`));
      
      expect(hasRightEdge).to.be.true;
      expect(hasBottomEdge).to.be.true;
    });
    
    it('should not use hardcoded bounds for special features', () => {
      const gen = new BiomeFeatureGenerator('test-seed');
      
      // Generate features which includes special features
      const features = gen.generateFeatures('candy_kingdom', 0, 0);
      
      // Check all features for bounds
      if (features && features.length > 0) {
        features.forEach(f => {
          if (f.x !== undefined && f.y !== undefined) {
            expect(f.x).to.be.at.least(0);
            expect(f.x).to.be.lessThan(constants.CHUNK_WIDTH);
            expect(f.y).to.be.at.least(0);
            expect(f.y).to.be.lessThan(constants.CHUNK_HEIGHT);
          }
        });
      }
    });
  });
  
  describe('Race Condition in Error Handling', () => {
    it('should not set chunk.biome when getBiome fails', async () => {
      const mockBiomeManager = {
        getBiome: () => { throw new Error('Test error'); }
      };
      
      const step = new AdventureTimeBiomeStep('test', {
        biomeManager: mockBiomeManager
      });
      
      const context = {
        chunk: { map: [] },
        cx: 0,
        cy: 0,
        params: {}
      };
      
      await step.process(context);
      
      // Should use fallback, not undefined
      expect(context.chunk.biome).to.equal('grasslands');
      expect(context.params.biomeError).to.contain('Test error');
    });
    
    it('should handle biome manager not initialized', async () => {
      const step = new AdventureTimeBiomeStep('test', {
        biomeManager: null
      });
      
      const context = {
        chunk: { map: [] },
        cx: 0,
        cy: 0,
        params: {}
      };
      
      await step.process(context);
      
      expect(context.chunk.biome).to.equal('grasslands');
    });
  });
  
  describe('Pipeline Step Replacement', () => {
    it('should properly identify and replace BiomeStep', () => {
      const mockEventBus = { on: () => {}, emit: () => {} };
      const system = new ChunkSystem(mockEventBus, {
        useAdventureTimeBiomes: true,
        seed: 'test'
      });
      
      // Check that pipeline has Adventure Time biome step
      const biomeSteps = system.pipeline.steps.filter(s => 
        s.name === 'AdventureTimeBiomeStep' || s.name === 'BiomeStep'
      );
      
      // Should have exactly one biome step
      expect(biomeSteps.length).to.equal(1);
      expect(biomeSteps[0].name).to.equal('AdventureTimeBiomeStep');
    });
  });
  
  describe('Coordinate System Consistency', () => {
    it('should use consistent coordinate interpretation', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      // Both should interpret coordinates the same way
      const biome1 = manager.getBiome(10, 10);
      const isEdge = transitionMgr.isBiomeEdge(10, 10);
      
      // If not at edge, surrounding chunks should have same biome
      if (!isEdge) {
        const biome2 = manager.getBiome(11, 10);
        const biome3 = manager.getBiome(10, 11);
        
        expect(biome2).to.equal(biome1);
        expect(biome3).to.equal(biome1);
      }
    });
  });
  
  describe('Data Format Compatibility', () => {
    it('should use consistent parameter structure between biome steps', async () => {
      const step = new AdventureTimeBiomeStep('test');
      
      const context = {
        chunk: { map: [] },
        cx: 0,
        cy: 0,
        params: {}
      };
      
      await step.process(context);
      
      // Should set both old and new format for compatibility
      expect(context.params.biomeTemperature).to.exist;
      expect(context.params.biomeHumidity).to.exist;
      expect(context.params.biomeFeatures).to.exist;
    });
  });
  
  describe('Entity Spatial Indexing', () => {
    it('should properly index NPCs without alive property', () => {
      const Chunk = (async () => {
        const module = await import('../../../src/js/world/core/Chunk.js');
        return module.Chunk;
      })();
      
      Chunk.then(ChunkClass => {
        const chunk = new ChunkClass(0, 0);
        
        const npc = {
          type: 'candy_person',
          x: 10,
          y: 10,
          behavior: 'wander'
        };
        
        chunk.npcs = [npc];
        chunk.updateSpatialIndex();
        
        const nearby = chunk.getEntitiesNear(10, 10, 5);
        expect(nearby).to.include(npc);
      });
    });
  });
  
  describe('Transition Manager Noise', () => {
    it('should use proper noise instead of trigonometric patterns', () => {
      const manager = new BiomeManager('test');
      const transitionMgr = new BiomeTransitionManager(manager);
      
      // Generate multiple transition blends
      const blends = [];
      for (let x = 0; x < 10; x++) {
        const blend = transitionMgr.calculateBlendRatio(x, 0, 'forest', 'desert');
        blends.push(blend);
      }
      
      // Should not follow simple sin/cos pattern
      // Check that it's not a perfect sinusoidal wave
      let isPerfectWave = true;
      for (let i = 1; i < blends.length - 1; i++) {
        const expectedSin = 0.5 + Math.sin(i * 0.5) * 0.3;
        if (Math.abs(blends[i] - expectedSin) > 0.01) {
          isPerfectWave = false;
          break;
        }
      }
      
      expect(isPerfectWave).to.be.false;
    });
  });
});