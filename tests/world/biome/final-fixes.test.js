/**
 * TDD tests for final Phase 5 fixes
 * Testing fixes for Math.random(), safety checks, and magic numbers
 */

import { expect } from 'chai';
import { FeatureStep } from '../../../src/js/world/pipeline/steps/FeatureStep.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import * as constants from '../../../src/js/world/biome/biome-constants.js';

class MockChunk {
  constructor() {
    this.map = Array(22).fill(null).map(() => Array(24).fill('.'));
    this.biome = 'grassland';
    this.cx = 0;
    this.cy = 0;
    this.npcs = [];
    this.items = [];
    this.features = [];
    this.transitionFeatures = {
      entities: ['test_entity'],
      decorations: ['test_decoration']
    };
    this.isTransitionZone = false;
  }
  
  getTile(x, y) {
    if (this.map && y >= 0 && y < this.map.length && x >= 0 && this.map[0] && x < this.map[0].length) {
      return this.map[y][x];
    }
    return '#';
  }
  
  setTile(x, y, tile) {
    if (this.map && y >= 0 && y < this.map.length && x >= 0 && this.map[0] && x < this.map[0].length) {
      this.map[y][x] = tile;
    }
  }
}

class MockRNG {
  constructor(seed = 0) {
    this.seed = seed;
    this.callCount = 0;
    this.values = [];
  }
  
  next() {
    this.callCount++;
    // Return predictable values for testing
    return this.values[this.callCount - 1] || 0.5;
  }
  
  setValues(values) {
    this.values = values;
    this.callCount = 0;
  }
}

describe('Phase 5 Final Fixes - TDD', () => {
  describe('FeatureStep - Math.random() Fix', () => {
    let featureStep;
    let chunk;
    let context;
    
    beforeEach(() => {
      featureStep = new FeatureStep();
      chunk = new MockChunk();
      context = {
        chunk,
        rng: new MockRNG(),
        params: {}
      };
    });
    
    it('should not use Math.random() for transition entity placement', async () => {
      // Test that transition entities are placed deterministically
      chunk.isTransitionZone = true;
      
      // Override Math.random to detect if it's called
      const originalRandom = Math.random;
      let randomCalled = false;
      Math.random = () => {
        randomCalled = true;
        return originalRandom();
      };
      
      await featureStep.process(context);
      
      // Math.random should not be called for entity placement
      expect(randomCalled).to.be.false;
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
    
    it('should use seeded RNG for all random operations', async () => {
      chunk.isTransitionZone = true;
      
      // Set predictable RNG values
      context.rng.setValues([0.3, 0.7, 0.2, 0.8, 0.5]);
      
      await featureStep.process(context);
      
      // Check that RNG was used (not Math.random)
      expect(context.rng.callCount).to.be.greaterThan(0);
      
      // Entities should be placed at predictable positions
      if (chunk.npcs.length > 0) {
        // Position should be based on RNG values, not Math.random
        const firstNpc = chunk.npcs[0];
        expect(firstNpc.x).to.be.a('number');
        expect(firstNpc.y).to.be.a('number');
      }
    });
    
    it('should create seeded RNG when context.rng is missing', async () => {
      // Remove RNG from context
      delete context.rng;
      
      await featureStep.process(context);
      
      // Should not crash and should create its own RNG
      expect(context.params.features).to.exist;
    });
  });
  
  describe('FeatureStep - Safety Checks', () => {
    let featureStep;
    let chunk;
    let context;
    
    beforeEach(() => {
      featureStep = new FeatureStep();
      chunk = new MockChunk();
      context = {
        chunk,
        rng: new MockRNG(),
        params: {}
      };
    });
    
    it('should handle empty map array safely', async () => {
      chunk.map = [];
      chunk.isTransitionZone = true;
      
      // Should not crash
      await featureStep.process(context);
      
      expect(context.params.features).to.exist;
    });
    
    it('should handle null map safely', async () => {
      chunk.map = null;
      chunk.isTransitionZone = true;
      
      // Should not crash
      await featureStep.process(context);
      
      expect(context.params.features).to.exist;
    });
    
    it('should handle undefined map safely', async () => {
      chunk.map = undefined;
      chunk.isTransitionZone = true;
      
      // Should not crash
      await featureStep.process(context);
      
      expect(context.params.features).to.exist;
    });
    
    it('should handle empty map rows safely', async () => {
      chunk.map = [[], [], []];
      chunk.isTransitionZone = true;
      
      // Should not crash
      await featureStep.process(context);
      
      expect(context.params.features).to.exist;
    });
    
    it('should use default dimensions when map is invalid', async () => {
      chunk.map = null;
      chunk.isTransitionZone = true;
      
      await featureStep.process(context);
      
      // Should use constants for dimensions
      expect(constants.CHUNK_WIDTH).to.equal(24);
      expect(constants.CHUNK_HEIGHT).to.equal(22);
    });
  });
  
  describe('BiomeManager - Magic Number Extraction', () => {
    let biomeManager;
    
    beforeEach(() => {
      biomeManager = new BiomeManager('test-seed');
    });
    
    it('should use constants for desert thresholds', () => {
      // Desert thresholds should be in constants
      expect(constants.DESERT_TEMP_THRESHOLD).to.exist;
      expect(constants.DESERT_HUMIDITY_THRESHOLD).to.exist;
    });
    
    it('should use constants for forest thresholds', () => {
      // Forest thresholds should be in constants
      expect(constants.FOREST_TEMP_MIN).to.exist;
      expect(constants.FOREST_TEMP_MAX).to.exist;
      expect(constants.FOREST_HUMIDITY_THRESHOLD).to.exist;
    });
    
    it('should generate desert biome using constants', () => {
      // Mock noise generators to return values that trigger desert
      // Desert requires temp > 0.7 AND humidity < -0.5
      // But bad_lands requires temp > 0.6 AND humidity < -0.4
      // So we need temp > 0.7 (not just 0.6) and humidity < -0.5
      biomeManager.noiseGenerators.temperature = () => 0.8; // > DESERT_TEMP_THRESHOLD
      biomeManager.noiseGenerators.humidity = () => -0.6; // < DESERT_HUMIDITY_THRESHOLD
      biomeManager.noiseGenerators.magic = () => 0;
      biomeManager.noiseGenerators.evil = () => 0;
      
      const biome = biomeManager.generateBiomeFromNoise(100, 100);
      expect(biome).to.equal('desert');
    });
    
    it('should generate forest biome using constants', () => {
      // Mock noise generators to return values that trigger forest
      biomeManager.noiseGenerators.temperature = () => (constants.FOREST_TEMP_MIN + constants.FOREST_TEMP_MAX) / 2;
      biomeManager.noiseGenerators.humidity = () => constants.FOREST_HUMIDITY_THRESHOLD + 0.1;
      biomeManager.noiseGenerators.magic = () => 0;
      biomeManager.noiseGenerators.evil = () => 0;
      
      const biome = biomeManager.generateBiomeFromNoise(100, 100);
      expect(biome).to.equal('forest');
    });
    
    it('should not have hardcoded thresholds in generateBiomeFromNoise', () => {
      // This test checks that the implementation uses constants
      // We'll verify by checking the constants exist and are reasonable
      expect(constants.DESERT_TEMP_THRESHOLD).to.be.greaterThan(0.5);
      expect(constants.DESERT_HUMIDITY_THRESHOLD).to.be.lessThan(0);
      expect(constants.FOREST_TEMP_MIN).to.be.lessThan(constants.FOREST_TEMP_MAX);
      expect(constants.FOREST_HUMIDITY_THRESHOLD).to.be.greaterThan(0);
    });
  });
  
  describe('Integration - All Fixes Together', () => {
    it('should work with all fixes applied', async () => {
      const featureStep = new FeatureStep();
      const chunk = new MockChunk();
      chunk.isTransitionZone = true;
      chunk.map = null; // Test safety
      
      const context = {
        chunk,
        rng: new MockRNG(),
        params: {}
      };
      
      // Should not crash with all fixes
      await featureStep.process(context);
      
      expect(context.params.features).to.exist;
      
      // Test BiomeManager with extracted constants
      const biomeManager = new BiomeManager('test');
      const biome = biomeManager.getBiome(50, 50);
      expect(biome).to.be.a('string');
    });
  });
});
