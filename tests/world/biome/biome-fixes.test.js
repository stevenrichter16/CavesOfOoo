/**
 * TDD Tests for Phase 5 Priority Fixes
 * Tests for cache limits, seeded noise, and magic number extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';
import * as constants from '../../../src/js/world/biome/biome-constants.js';

describe('Phase 5 Priority Fixes', () => {
  
  describe('Cache Size Limits', () => {
    let biomeManager;
    
    beforeEach(() => {
      // Use small cache size for testing
      biomeManager = new BiomeManager('test-seed', { maxCacheSize: 10 });
    });
    
    it('should limit biome cache size', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 20; i++) {
        biomeManager.getBiome(i, i);
      }
      
      // Cache should not exceed max size
      expect(biomeManager.getBiomeCacheSize()).toBeLessThanOrEqual(10);
    });
    
    it('should evict oldest entries when cache is full', () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        biomeManager.getBiome(i, i);
      }
      
      // Access first entry to make it recent
      biomeManager.getBiome(0, 0);
      
      // Add new entry (should evict oldest that isn't 0,0)
      biomeManager.getBiome(99, 99);
      
      // First accessed should still be in cache
      const cacheHitsBefore = biomeManager.getCacheHits();
      biomeManager.getBiome(0, 0);
      const cacheHitsAfter = biomeManager.getCacheHits();
      
      expect(cacheHitsAfter).toBe(cacheHitsBefore + 1);
    });
    
    it('should limit transition cache size', () => {
      // Test transition cache limit
      for (let i = 0; i < 20; i++) {
        biomeManager.getTransitionZone('candy_kingdom', 'grasslands', i, i);
      }
      
      expect(biomeManager.getTransitionCacheSize()).toBeLessThanOrEqual(10);
    });
    
    it('should track cache statistics', () => {
      const stats = biomeManager.getCacheStatistics();
      
      expect(stats).toHaveProperty('biomeCache');
      expect(stats).toHaveProperty('transitionCache');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('evictions');
    });
  });
  
  describe('Seeded Noise Generator', () => {
    it('should produce consistent results with same seed', () => {
      const gen1 = new BiomeFeatureGenerator('test-seed');
      const gen2 = new BiomeFeatureGenerator('test-seed');
      
      const features1 = gen1.generateFeatures('candy_kingdom', 0, 0);
      const features2 = gen2.generateFeatures('candy_kingdom', 0, 0);
      
      // Same seed should produce identical features
      expect(features1.tiles.length).toBe(features2.tiles.length);
      expect(features1.entities.length).toBe(features2.entities.length);
      
      // Check positions match
      if (features1.tiles.length > 0) {
        expect(features1.tiles[0].x).toBe(features2.tiles[0].x);
        expect(features1.tiles[0].y).toBe(features2.tiles[0].y);
      }
    });
    
    it('should produce different results with different seeds', () => {
      const gen1 = new BiomeFeatureGenerator('seed1');
      const gen2 = new BiomeFeatureGenerator('seed2');
      
      const features1 = gen1.generateFeatures('grasslands', 5, 5);
      const features2 = gen2.generateFeatures('grasslands', 5, 5);
      
      // Different seeds should produce different results
      let hasDifference = false;
      
      if (features1.tiles.length !== features2.tiles.length) {
        hasDifference = true;
      } else if (features1.tiles.length > 0) {
        hasDifference = features1.tiles[0].x !== features2.tiles[0].x ||
                       features1.tiles[0].y !== features2.tiles[0].y;
      }
      
      expect(hasDifference).toBe(true);
    });
    
    it('should use seeded noise for feature placement', () => {
      const gen = new BiomeFeatureGenerator('noise-test');
      
      // Generate features multiple times with same coordinates
      const features1 = gen.generateNoiseBasedFeature(10, 10);
      const features2 = gen.generateNoiseBasedFeature(10, 10);
      
      // Should be consistent
      expect(features1).toEqual(features2);
    });
  });
  
  describe('Magic Number Extraction', () => {
    it('should use constants for biome generation thresholds', () => {
      // Check that constants are defined
      expect(constants.DUNGEON_EVIL_THRESHOLD).toBeDefined();
      expect(constants.CLOUD_KINGDOM_MAGIC_THRESHOLD).toBeDefined();
      expect(constants.BAD_LANDS_TEMP_THRESHOLD).toBeDefined();
      
      // Check values are reasonable
      expect(constants.DUNGEON_EVIL_THRESHOLD).toBeGreaterThan(0);
      expect(constants.DUNGEON_EVIL_THRESHOLD).toBeLessThanOrEqual(1);
    });
    
    it('should use constants for noise scales', () => {
      expect(constants.NOISE_SCALE).toBeDefined();
      expect(constants.NOISE_SCALE.TEMPERATURE).toBeDefined();
      expect(constants.NOISE_SCALE.HUMIDITY).toBeDefined();
      expect(constants.NOISE_SCALE.MAGIC).toBeDefined();
      expect(constants.NOISE_SCALE.EVIL).toBeDefined();
    });
    
    it('should use constants for chunk dimensions', () => {
      expect(constants.CHUNK_WIDTH).toBe(24);
      expect(constants.CHUNK_HEIGHT).toBe(22);
    });
    
    it('should use constants in BiomeManager', () => {
      const manager = new BiomeManager('test');
      
      // Test that the manager uses constants (by checking behavior)
      const biome = manager.generateBiomeFromNoise(100, 100);
      expect(biome).toBeDefined();
      
      // Test edge noise factor is applied
      const edgeTest = manager.testEdgeNoiseFactor();
      expect(edgeTest).toBe(constants.BIOME_EDGE_NOISE_FACTOR);
    });
    
    it('should use constants in BiomeFeatureGenerator', () => {
      const generator = new BiomeFeatureGenerator('test');
      
      // Test tile generation uses constants
      const tileCount = generator.calculateTileCount(0.5);
      const expected = Math.floor(
        constants.CHUNK_WIDTH * 
        constants.CHUNK_HEIGHT * 
        0.5 * 
        constants.TILE_GENERATION_DENSITY_FACTOR
      );
      
      expect(tileCount).toBe(expected);
    });
    
    it('should use constants in BiomeTransitionManager', () => {
      const biomeManager = new BiomeManager('test');
      const transitionManager = new BiomeTransitionManager(biomeManager);
      
      // Test that transition manager uses constants
      const pattern = transitionManager.generateTransitionPattern(
        'ice_kingdom',
        'fire_kingdom',
        5, 5
      );
      
      // Check that gradient thresholds are applied
      let hasLowGradient = false;
      let hasHighGradient = false;
      
      pattern.tiles.forEach(tile => {
        if (tile === 'ice_kingdom') hasLowGradient = true;
        if (tile === 'fire_kingdom') hasHighGradient = true;
      });
      
      expect(hasLowGradient || hasHighGradient).toBe(true);
    });
  });
  
  describe('Performance with Fixes', () => {
    it('should maintain performance with cache limits', () => {
      const manager = new BiomeManager('perf-test', { maxCacheSize: 100 });
      
      const start = performance.now();
      
      // Generate many biomes
      for (let i = 0; i < 200; i++) {
        manager.getBiome(i % 50, i % 50);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should still be fast
    });
    
    it('should handle cache eviction efficiently', () => {
      const manager = new BiomeManager('evict-test', { maxCacheSize: 50 });
      
      // Fill and overflow cache
      for (let i = 0; i < 100; i++) {
        manager.getBiome(i, i);
      }
      
      const stats = manager.getCacheStatistics();
      expect(stats.evictions).toBeGreaterThan(0);
      expect(stats.biomeCache.size).toBeLessThanOrEqual(50);
    });
  });
});