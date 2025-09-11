/**
 * TDD Tests for Adventure Time Biome Features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { ADVENTURE_TIME_BIOMES } from '../../../src/js/world/biome/adventure-time-biomes.js';

describe('Biome Feature Generator', () => {
  let generator;
  
  beforeEach(() => {
    generator = new BiomeFeatureGenerator('test-seed');
  });
  
  describe('Feature Generation', () => {
    it('should generate features based on biome type', () => {
      const candyFeatures = generator.generateFeatures('candy_kingdom', 10, 10);
      expect(candyFeatures).toBeDefined();
      expect(candyFeatures.tiles).toBeDefined();
      expect(candyFeatures.entities).toBeDefined();
      expect(candyFeatures.decorations).toBeDefined();
    });
    
    it('should generate candy-specific tiles for Candy Kingdom', () => {
      const features = generator.generateFeatures('candy_kingdom', 0, 0);
      const hasCandyTiles = features.tiles.some(tile => 
        ['candy_grass', 'lollipop', 'gumdrop'].includes(tile.type)
      );
      expect(hasCandyTiles).toBe(true);
    });
    
    it('should generate ice-specific tiles for Ice Kingdom', () => {
      const features = generator.generateFeatures('ice_kingdom', -50, 50);
      const hasIceTiles = features.tiles.some(tile => 
        ['snow', 'ice', 'ice_spike'].includes(tile.type)
      );
      expect(hasIceTiles).toBe(true);
    });
    
    it('should generate fire-specific tiles for Fire Kingdom', () => {
      const features = generator.generateFeatures('fire_kingdom', 50, -50);
      const hasFireTiles = features.tiles.some(tile => 
        ['lava_pool', 'charred_ground', 'obsidian'].includes(tile.type)
      );
      expect(hasFireTiles).toBe(true);
    });
  });
  
  describe('Tile Placement', () => {
    it('should place tiles within chunk bounds', () => {
      const features = generator.generateFeatures('grasslands', 5, 5);
      
      features.tiles.forEach(tile => {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(24); // CHUNK_WIDTH
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeLessThan(22); // CHUNK_HEIGHT
      });
    });
    
    it('should respect tile density settings', () => {
      const sparseFeatures = generator.generateFeatures('desert', 10, 10, { density: 0.1 });
      const denseFeatures = generator.generateFeatures('forest', 10, 10, { density: 0.8 });
      
      expect(sparseFeatures.tiles.length).toBeLessThan(denseFeatures.tiles.length);
    });
  });
  
  describe('Entity Spawning', () => {
    it('should spawn biome-appropriate NPCs', () => {
      const candyFeatures = generator.generateFeatures('candy_kingdom', 0, 0);
      const hasCandy = candyFeatures.entities.some(e => 
        ['candy_person', 'banana_guard', 'peppermint_butler'].includes(e.type)
      );
      expect(hasCandy).toBe(true);
    });
    
    it('should spawn penguins in Ice Kingdom', () => {
      const iceFeatures = generator.generateFeatures('ice_kingdom', -50, 50);
      const hasPenguins = iceFeatures.entities.some(e => 
        ['penguin', 'snow_golem'].includes(e.type)
      );
      expect(hasPenguins).toBe(true);
    });
    
    it('should spawn flame people in Fire Kingdom', () => {
      const fireFeatures = generator.generateFeatures('fire_kingdom', 50, -50);
      const hasFlame = fireFeatures.entities.some(e => 
        ['flame_person', 'fire_wolf'].includes(e.type)
      );
      expect(hasFlame).toBe(true);
    });
  });
  
  describe('Decorations', () => {
    it('should add candy decorations to Candy Kingdom', () => {
      const features = generator.generateFeatures('candy_kingdom', 0, 0);
      const hasCandyDeco = features.decorations.some(d => 
        ['candy_cane_lamp', 'sugar_crystal', 'lollipop_tree'].includes(d.type)
      );
      expect(hasCandyDeco).toBe(true);
    });
    
    it('should add ice decorations to Ice Kingdom', () => {
      const features = generator.generateFeatures('ice_kingdom', -50, 50);
      const hasIceDeco = features.decorations.some(d => 
        ['frozen_tree', 'ice_sculpture', 'snow_pile'].includes(d.type)
      );
      expect(hasIceDeco).toBe(true);
    });
  });
  
  describe('Resource Distribution', () => {
    it('should place biome-specific resources', () => {
      const candyFeatures = generator.generateFeatures('candy_kingdom', 0, 0);
      const hasResources = candyFeatures.resources && candyFeatures.resources.some(r => 
        ['candy', 'sugar', 'syrup', 'bubblegum'].includes(r.type)
      );
      expect(hasResources).toBe(true);
    });
    
    it('should vary resource rarity', () => {
      const features = generator.generateFeatures('dungeon', 20, 20);
      
      if (features.resources) {
        const commonCount = features.resources.filter(r => r.rarity === 'common').length;
        const rareCount = features.resources.filter(r => r.rarity === 'rare').length;
        
        // Common resources should be more frequent than rare
        expect(commonCount).toBeGreaterThanOrEqual(rareCount);
      }
    });
  });
  
  describe('Special Features', () => {
    it('should occasionally generate rare features', () => {
      // Generate many times to ensure we get at least one rare feature
      let foundRare = false;
      
      for (let i = 0; i < 20; i++) {
        const features = generator.generateFeatures('candy_kingdom', i, i);
        if (features.special && features.special.some(s => s.rarity === 'rare')) {
          foundRare = true;
          break;
        }
      }
      
      expect(foundRare).toBe(true);
    });
    
    it('should generate gumball guardians in Candy Kingdom rarely', () => {
      let foundGuardian = false;
      
      // Try multiple times since it's rare
      for (let i = 0; i < 50; i++) {
        const features = generator.generateFeatures('candy_kingdom', 0, i);
        if (features.special && features.special.some(s => s.type === 'gumball_guardian')) {
          foundGuardian = true;
          break;
        }
      }
      
      expect(foundGuardian).toBe(true);
    });
  });
  
  describe('Chunk Integration', () => {
    it('should apply features to a chunk', () => {
      const mockChunk = {
        map: Array(22).fill().map(() => Array(24).fill('.')),
        monsters: [],
        items: [],
        npcs: [],
        setTile: function(x, y, tile) {
          if (x >= 0 && x < 24 && y >= 0 && y < 22) {
            this.map[y][x] = tile;
          }
        }
      };
      
      const features = generator.generateFeatures('candy_kingdom', 0, 0);
      generator.applyToChunk(mockChunk, features);
      
      // Should have modified the chunk
      const hasNonFloorTiles = mockChunk.map.some(row => 
        row.some(tile => tile !== '.')
      );
      expect(hasNonFloorTiles).toBe(true);
    });
  });
  
  describe('Performance', () => {
    it('should generate features quickly', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        generator.generateFeatures('grasslands', i, i);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // 100 generations in 500ms
    });
  });
});