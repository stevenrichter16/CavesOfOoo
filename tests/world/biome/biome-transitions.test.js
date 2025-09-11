/**
 * TDD Tests for Biome Transitions and Clustering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';

describe('Biome Transitions and Clustering', () => {
  let transitionManager;
  let biomeManager;
  
  beforeEach(() => {
    biomeManager = new BiomeManager('test-seed');
    transitionManager = new BiomeTransitionManager(biomeManager);
  });
  
  describe('Edge Detection', () => {
    it('should detect biome edges', () => {
      const isEdge = transitionManager.isBiomeEdge(10, 0);
      expect(typeof isEdge).toBe('boolean');
    });
    
    it('should identify transition zones between kingdoms', () => {
      // Near the edge of Candy Kingdom
      const transition = transitionManager.getTransitionInfo(7, 0);
      expect(transition).toBeDefined();
      
      if (transition.isTransition) {
        expect(transition.fromBiome).toBeDefined();
        expect(transition.toBiome).toBeDefined();
        expect(transition.strength).toBeGreaterThan(0);
        expect(transition.strength).toBeLessThanOrEqual(1);
      }
    });
    
    it('should not detect transitions in kingdom centers', () => {
      // Center of Candy Kingdom
      const transition = transitionManager.getTransitionInfo(0, 0);
      expect(transition.isTransition).toBe(false);
    });
  });
  
  describe('Smooth Blending', () => {
    it('should blend tile types at edges', () => {
      const blendedTiles = transitionManager.blendTiles(
        'candy_kingdom',
        'grasslands',
        0.5
      );
      
      expect(blendedTiles).toBeDefined();
      expect(blendedTiles.length).toBeGreaterThan(0);
      
      // Should have mix of both biome tiles
      const hasCandyTiles = blendedTiles.some(t => t.includes('candy'));
      const hasGrassTiles = blendedTiles.some(t => t.includes('grass'));
      
      expect(hasCandyTiles || hasGrassTiles).toBe(true);
    });
    
    it('should adjust blend ratio based on distance', () => {
      const near = transitionManager.blendTiles('candy_kingdom', 'grasslands', 0.9);
      const mid = transitionManager.blendTiles('candy_kingdom', 'grasslands', 0.5);
      const far = transitionManager.blendTiles('candy_kingdom', 'grasslands', 0.1);
      
      // Near should be mostly candy tiles
      const nearCandyRatio = near.filter(t => t.includes('candy')).length / near.length;
      const farCandyRatio = far.filter(t => t.includes('candy')).length / far.length;
      
      expect(nearCandyRatio).toBeGreaterThanOrEqual(farCandyRatio);
    });
  });
  
  describe('Feature Mixing', () => {
    it('should mix features from adjacent biomes', () => {
      const mixedFeatures = transitionManager.mixFeatures(
        'ice_kingdom',
        'grasslands',
        0.5
      );
      
      expect(mixedFeatures).toBeDefined();
      expect(mixedFeatures.decorations).toBeDefined();
      expect(mixedFeatures.entities).toBeDefined();
    });
    
    it('should reduce feature density in transitions', () => {
      const fullFeatures = transitionManager.mixFeatures(
        'candy_kingdom',
        'candy_kingdom',
        1.0
      );
      
      const transitionFeatures = transitionManager.mixFeatures(
        'candy_kingdom',
        'grasslands',
        0.5
      );
      
      // Transition zones should be less dense
      const fullDensity = fullFeatures.decorations.length + fullFeatures.entities.length;
      const transDensity = transitionFeatures.decorations.length + transitionFeatures.entities.length;
      
      expect(transDensity).toBeLessThanOrEqual(fullDensity);
    });
  });
  
  describe('Biome Clustering', () => {
    it('should create coherent biome regions', () => {
      const cluster = transitionManager.analyzeBiomeCluster(30, 30, 3);
      
      expect(cluster).toBeDefined();
      expect(cluster.dominantBiome).toBeDefined();
      expect(cluster.coherence).toBeGreaterThan(0.5); // Most tiles same biome
    });
    
    it('should detect mixed zones', () => {
      // Find an edge area
      let mixedZone = null;
      
      for (let x = 5; x < 15; x++) {
        const cluster = transitionManager.analyzeBiomeCluster(x, 0, 2);
        if (cluster.coherence < 0.8) {
          mixedZone = cluster;
          break;
        }
      }
      
      if (mixedZone) {
        expect(mixedZone.biomes.length).toBeGreaterThan(1);
      }
    });
  });
  
  describe('Transition Patterns', () => {
    it('should create natural-looking transitions', () => {
      const pattern = transitionManager.generateTransitionPattern(
        'fire_kingdom',
        'grasslands',
        10, 10
      );
      
      expect(pattern).toBeDefined();
      expect(pattern.width).toBe(10);
      expect(pattern.height).toBe(10);
      expect(pattern.tiles).toHaveLength(100);
    });
    
    it('should avoid sharp biome boundaries', () => {
      const pattern = transitionManager.generateTransitionPattern(
        'ice_kingdom',
        'fire_kingdom',
        5, 5
      );
      
      // Check for gradual change
      let hasGradient = false;
      for (let i = 1; i < pattern.tiles.length - 1; i++) {
        if (pattern.tiles[i] !== pattern.tiles[0] && 
            pattern.tiles[i] !== pattern.tiles[pattern.tiles.length - 1]) {
          hasGradient = true;
          break;
        }
      }
      
      expect(hasGradient).toBe(true);
    });
  });
  
  describe('Special Transition Rules', () => {
    it('should handle ice-fire transitions specially', () => {
      const transition = transitionManager.getSpecialTransition(
        'ice_kingdom',
        'fire_kingdom'
      );
      
      expect(transition).toBeDefined();
      expect(transition.type).toBe('steam_zone');
      expect(transition.features).toContain('steam_vent');
    });
    
    it('should create candy borders', () => {
      const transition = transitionManager.getSpecialTransition(
        'candy_kingdom',
        'grasslands'
      );
      
      expect(transition).toBeDefined();
      expect(transition.type).toBe('candy_border');
      expect(transition.features).toContain('candy_fence');
    });
  });
  
  describe('Performance', () => {
    it('should generate transitions quickly', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        transitionManager.getTransitionInfo(i, i);
        transitionManager.blendTiles('candy_kingdom', 'grasslands', 0.5);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // 100 operations in 100ms
    });
    
    it('should cache transition calculations', () => {
      const first = transitionManager.getTransitionInfo(10, 10);
      const second = transitionManager.getTransitionInfo(10, 10);
      
      expect(transitionManager.getCacheHits()).toBeGreaterThan(0);
    });
  });
});