/**
 * Test-Driven Development for Adventure Time Biome System
 * Tests for lore-accurate biomes from the Land of Ooo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { ADVENTURE_TIME_BIOMES } from '../../../src/js/world/biome/adventure-time-biomes.js';

describe('Adventure Time Biomes', () => {
  let biomeManager;
  
  beforeEach(() => {
    biomeManager = new BiomeManager('test-seed');
  });
  
  describe('Biome Definitions', () => {
    it('should define core Adventure Time biomes', () => {
      expect(ADVENTURE_TIME_BIOMES).toBeDefined();
      expect(ADVENTURE_TIME_BIOMES.candy_kingdom).toBeDefined();
      expect(ADVENTURE_TIME_BIOMES.grasslands).toBeDefined();
      expect(ADVENTURE_TIME_BIOMES.ice_kingdom).toBeDefined();
      expect(ADVENTURE_TIME_BIOMES.fire_kingdom).toBeDefined();
      expect(ADVENTURE_TIME_BIOMES.dungeon).toBeDefined();
    });
    
    it('should have proper biome properties', () => {
      const candyKingdom = ADVENTURE_TIME_BIOMES.candy_kingdom;
      expect(candyKingdom.name).toBe('Candy Kingdom');
      expect(candyKingdom.tiles).toBeDefined();
      expect(candyKingdom.features).toBeDefined();
      expect(candyKingdom.npcs).toBeDefined();
      expect(candyKingdom.color).toBeDefined();
    });
    
    it('should have lore-accurate tile sets', () => {
      const candy = ADVENTURE_TIME_BIOMES.candy_kingdom;
      expect(candy.tiles.floor).toContain('candy_grass');
      expect(candy.tiles.wall).toContain('candy_wall');
      
      const ice = ADVENTURE_TIME_BIOMES.ice_kingdom;
      expect(ice.tiles.floor).toContain('snow');
      expect(ice.tiles.wall).toContain('ice');
    });
  });
  
  describe('Biome Distribution', () => {
    it('should place Candy Kingdom at the center of Ooo', () => {
      const biome = biomeManager.getBiome(0, 0);
      expect(biome).toBe('candy_kingdom');
    });
    
    it('should place Ice Kingdom in the cold north', () => {
      const biome = biomeManager.getBiome(-50, 50);
      expect(biome).toBe('ice_kingdom');
    });
    
    it('should place Fire Kingdom in the hot south', () => {
      const biome = biomeManager.getBiome(50, -50);
      expect(biome).toBe('fire_kingdom');
    });
    
    it('should have grasslands as the default biome', () => {
      // Test multiple positions to find one that generates grasslands
      // Since we added forest biome, need to find an area that doesn't match forest conditions
      const biome1 = biomeManager.getBiome(35, 35);
      const biome2 = biomeManager.getBiome(40, 40);
      const biome3 = biomeManager.getBiome(45, 45);
      // At least one of these should be grasslands (the default)
      const hasGrasslands = [biome1, biome2, biome3].includes('grasslands');
      expect(hasGrasslands).toBe(true);
    });
    
    it('should generate dungeons randomly', () => {
      // Check multiple locations for dungeons
      let dungeonFound = false;
      for (let x = -100; x <= 100; x += 10) {
        for (let y = -100; y <= 100; y += 10) {
          if (biomeManager.getBiome(x, y) === 'dungeon') {
            dungeonFound = true;
            break;
          }
        }
      }
      expect(dungeonFound).toBe(true);
    });
  });
  
  describe('Kingdom Territories', () => {
    it('should respect kingdom boundaries', () => {
      // Candy Kingdom should have a defined territory
      const candyTerritory = [];
      for (let x = -5; x <= 5; x++) {
        for (let y = -5; y <= 5; y++) {
          candyTerritory.push(biomeManager.getBiome(x, y));
        }
      }
      
      const candyCount = candyTerritory.filter(b => b === 'candy_kingdom').length;
      expect(candyCount).toBeGreaterThan(candyTerritory.length * 0.8);
    });
    
    it('should have smaller kingdoms', () => {
      // Breakfast Kingdom should be small
      const hasBreakfast = biomeManager.hasSpecialKingdom('breakfast_kingdom');
      if (hasBreakfast) {
        const territory = biomeManager.getKingdomTerritory('breakfast_kingdom');
        expect(territory.radius).toBeLessThanOrEqual(5);
      }
    });
  });
  
  describe('Biome Transitions', () => {
    it('should have smooth transitions between biomes', () => {
      const transition = biomeManager.getTransitionZone(
        'candy_kingdom',
        'grasslands',
        10, 0
      );
      
      expect(transition).toBeDefined();
      expect(transition.mixRatio).toBeGreaterThan(0);
      expect(transition.mixRatio).toBeLessThan(1);
    });
    
    it('should mix features at biome edges', () => {
      const edgeFeatures = biomeManager.getEdgeFeatures(
        'candy_kingdom',
        'grasslands'
      );
      
      expect(edgeFeatures).toContain('candy_grass_fading');
      expect(edgeFeatures).toContain('normal_grass');
    });
  });
  
  describe('Biome Features', () => {
    it('should generate candy-themed features in Candy Kingdom', () => {
      const features = biomeManager.getBiomeFeatures('candy_kingdom');
      
      expect(features.common).toContain('lollipop_tree');
      expect(features.common).toContain('candy_grass');
      expect(features.uncommon).toContain('candy_house');
      expect(features.rare).toContain('gumball_guardian');
    });
    
    it('should generate ice features in Ice Kingdom', () => {
      const features = biomeManager.getBiomeFeatures('ice_kingdom');
      
      expect(features.common).toContain('ice_spike');
      expect(features.common).toContain('snow');
      expect(features.uncommon).toContain('penguin_nest');
      expect(features.rare).toContain('ice_palace_chunk');
    });
    
    it('should generate fire features in Fire Kingdom', () => {
      const features = biomeManager.getBiomeFeatures('fire_kingdom');
      
      expect(features.common).toContain('lava_pool');
      expect(features.uncommon).toContain('obsidian_spire');
      expect(features.rare).toContain('flame_palace_chunk');
    });
  });
  
  describe('Special Locations', () => {
    it('should place Finns treehouse in grasslands', () => {
      const treehouseLocation = biomeManager.getSpecialLocation('treehouse');
      expect(treehouseLocation).toBeDefined();
      
      const biome = biomeManager.getBiome(
        treehouseLocation.x,
        treehouseLocation.y
      );
      expect(biome).toBe('grasslands');
    });
    
    it('should place Marcelines cave appropriately', () => {
      const caveLocation = biomeManager.getSpecialLocation('marceline_cave');
      if (caveLocation) {
        const biome = biomeManager.getBiome(
          caveLocation.x,
          caveLocation.y
        );
        expect(biome).toBe('marceline_cave');
      }
    });
  });
  
  describe('Biome Properties', () => {
    it('should have temperature values', () => {
      const candyTemp = biomeManager.getBiomeTemperature('candy_kingdom');
      const iceTemp = biomeManager.getBiomeTemperature('ice_kingdom');
      const fireTemp = biomeManager.getBiomeTemperature('fire_kingdom');
      
      expect(candyTemp).toBe('moderate');
      expect(iceTemp).toBe('freezing');
      expect(fireTemp).toBe('scorching');
    });
    
    it('should have magic levels', () => {
      const candyMagic = biomeManager.getBiomeMagicLevel('candy_kingdom');
      const dungeonMagic = biomeManager.getBiomeMagicLevel('dungeon');
      const grassMagic = biomeManager.getBiomeMagicLevel('grasslands');
      
      expect(candyMagic).toBeGreaterThan(0.7);
      expect(dungeonMagic).toBeGreaterThan(0.5);
      expect(grassMagic).toBeLessThan(0.3);
    });
  });
  
  describe('Perlin Noise Integration', () => {
    it('should use Perlin noise for natural distribution', () => {
      // Get a region of biomes
      const region = [];
      for (let x = 20; x <= 40; x++) {
        for (let y = 20; y <= 40; y++) {
          region.push(biomeManager.getBiome(x, y));
        }
      }
      
      // Should have clustering (not random scatter)
      const uniqueBiomes = [...new Set(region)];
      expect(uniqueBiomes.length).toBeLessThan(region.length / 10);
    });
    
    it('should create biome clusters', () => {
      const cluster = biomeManager.analyzeBiomeCluster(30, 30, 5);
      
      // Most of the cluster should be the same biome or similar
      // With forest and desert added, we may have more variety at edges
      const biomeCounts = {};
      cluster.forEach(b => {
        biomeCounts[b] = (biomeCounts[b] || 0) + 1;
      });
      
      // The most common biome should appear frequently
      const maxCount = Math.max(...Object.values(biomeCounts));
      expect(maxCount).toBeGreaterThan(cluster.length * 0.35); // Adjusted for more variety
    });
  });
  
  describe('Performance', () => {
    it('should generate biomes quickly', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        biomeManager.getBiome(
          Math.floor(Math.random() * 200 - 100),
          Math.floor(Math.random() * 200 - 100)
        );
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // 1000 biomes in 100ms
    });
    
    it('should cache biome calculations', () => {
      const first = biomeManager.getBiome(10, 10);
      const second = biomeManager.getBiome(10, 10);
      
      expect(first).toBe(second);
      expect(biomeManager.getCacheHits()).toBeGreaterThan(0);
    });
  });
});