/**
 * BiomeTransitionManager - Handles smooth transitions between Adventure Time biomes
 * Creates natural blending and special transition zones
 */

import { getBiomeDefinition } from './adventure-time-biomes.js';
import * as constants from './biome-constants.js';
import { createNoise2D } from 'simplex-noise';
import { SeededRandom } from '../pipeline/SeededRandom.js';

/**
 * Manages transitions and blending between biomes
 */
export class BiomeTransitionManager {
  constructor(biomeManager) {
    this.biomeManager = biomeManager;
    this.transitionCache = new Map();
    this.cacheHits = 0;
    
    // Create noise function for transitions
    const seed = biomeManager?.seed || 'transition';
    const rng = new SeededRandom(seed + '-transition');
    this.noise = createNoise2D(() => rng.next());
    
    // Special transition rules for specific biome pairs
    this.specialTransitions = {
      'ice_kingdom-fire_kingdom': {
        type: 'steam_zone',
        features: ['steam_vent', 'hot_spring', 'melting_ice'],
        tiles: ['mist', 'warm_water', 'cracked_ice']
      },
      'candy_kingdom-grasslands': {
        type: 'candy_border',
        features: ['candy_fence', 'sugar_flowers', 'candy_grass_fading'],
        tiles: ['pink_grass', 'normal_grass', 'candy_sprinkles']
      },
      'fire_kingdom-grasslands': {
        type: 'scorched_border',
        features: ['charred_trees', 'ash_piles', 'cooling_lava'],
        tiles: ['burnt_grass', 'ash', 'warm_stone']
      },
      'ice_kingdom-grasslands': {
        type: 'tundra_border',
        features: ['frost_grass', 'patches_of_snow', 'frozen_puddles'],
        tiles: ['cold_grass', 'thin_snow', 'ice_patches']
      }
    };
  }
  
  /**
   * Check if a position is at a biome edge
   */
  isBiomeEdge(cx, cy) {
    if (!this.biomeManager) {
      return false;
    }
    const centerBiome = this.biomeManager.getBiome(cx, cy);
    
    // Check adjacent chunks
    const neighbors = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 }
    ];
    
    for (const neighbor of neighbors) {
      const adjacentBiome = this.biomeManager.getBiome(
        cx + neighbor.dx,
        cy + neighbor.dy
      );
      
      if (adjacentBiome !== centerBiome) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get transition information for a position
   */
  getTransitionInfo(cx, cy) {
    if (!this.biomeManager) {
      return {
        isTransition: false,
        fromBiome: 'grassland',
        toBiome: null,
        strength: 0
      };
    }
    
    const cacheKey = `${cx},${cy}`;
    
    if (this.transitionCache.has(cacheKey)) {
      this.cacheHits++;
      return this.transitionCache.get(cacheKey);
    }
    
    const centerBiome = this.biomeManager.getBiome(cx, cy);
    const neighbors = this.getNeighborBiomes(cx, cy);
    
    // Check if we're in a transition zone
    const differentBiomes = neighbors.filter(n => n.biome !== centerBiome);
    
    if (differentBiomes.length === 0) {
      const info = {
        isTransition: false,
        fromBiome: centerBiome,
        toBiome: null,
        strength: 0
      };
      this.transitionCache.set(cacheKey, info);
      return info;
    }
    
    // Calculate transition strength based on distance to biome center
    const toBiome = differentBiomes[0].biome;
    const strength = this.calculateTransitionStrength(cx, cy, centerBiome, toBiome);
    
    const info = {
      isTransition: true,
      fromBiome: centerBiome,
      toBiome: toBiome,
      strength: strength
    };
    
    this.transitionCache.set(cacheKey, info);
    return info;
  }
  
  /**
   * Get biomes of neighboring chunks
   */
  getNeighborBiomes(cx, cy) {
    const neighbors = [];
    const offsets = [
      { dx: -1, dy: 0, dir: 'west' },
      { dx: 1, dy: 0, dir: 'east' },
      { dx: 0, dy: -1, dir: 'north' },
      { dx: 0, dy: 1, dir: 'south' }
    ];
    
    for (const offset of offsets) {
      neighbors.push({
        biome: this.biomeManager.getBiome(cx + offset.dx, cy + offset.dy),
        direction: offset.dir
      });
    }
    
    return neighbors;
  }
  
  /**
   * Calculate how strong the transition effect should be
   */
  calculateTransitionStrength(cx, cy, fromBiome, toBiome) {
    // Use proper noise for natural variation
    const noiseValue = this.noise ? this.noise(cx * 0.1, cy * 0.1) : 0;
    const base = 0.5 + (noiseValue * 0.3);
    
    return Math.max(0, Math.min(1, base));
  }
  
  /**
   * Calculate blend ratio for transition zones
   */
  calculateBlendRatio(cx, cy, fromBiome, toBiome) {
    return this.calculateTransitionStrength(cx, cy, fromBiome, toBiome);
  }
  
  /**
   * Blend tile types between two biomes
   */
  blendTiles(biome1Id, biome2Id, blendRatio) {
    const biome1 = getBiomeDefinition(biome1Id);
    const biome2 = getBiomeDefinition(biome2Id);
    const tiles = [];
    
    // Determine tile count based on blend ratio
    const biome1Count = Math.floor(constants.TRANSITION_BLEND_TILE_COUNT * blendRatio);
    const biome2Count = constants.TRANSITION_BLEND_TILE_COUNT - biome1Count;
    
    // Add tiles from biome1
    if (biome1.tiles && biome1.tiles.floor) {
      for (let i = 0; i < biome1Count; i++) {
        const tileType = biome1.tiles.floor[i % biome1.tiles.floor.length];
        tiles.push(tileType.includes('candy') || tileType.includes('grass') ? tileType : 'candy_tile');
      }
    }
    
    // Add tiles from biome2
    if (biome2.tiles && biome2.tiles.floor) {
      for (let i = 0; i < biome2Count; i++) {
        const tileType = biome2.tiles.floor[i % biome2.tiles.floor.length];
        tiles.push(tileType.includes('grass') || tileType === '.' ? tileType : 'grass_tile');
      }
    }
    
    // Ensure we have some tiles
    if (tiles.length === 0) {
      tiles.push('mixed_tile');
    }
    
    return tiles;
  }
  
  /**
   * Mix features from two biomes
   */
  mixFeatures(biome1Id, biome2Id, blendRatio = 0.5) {
    const biome1 = getBiomeDefinition(biome1Id || 'grasslands');
    const biome2 = getBiomeDefinition(biome2Id || 'grasslands');
    
    const features = {
      tiles: [],
      decorations: [],
      entities: []
    };
    
    // Reduce density in transition zones
    const densityModifier = constants.FEATURE_DENSITY_MODIFIER;
    
    // Blend tiles from both biomes
    const blendedTiles = this.blendTiles(biome1Id, biome2Id, blendRatio);
    features.tiles = blendedTiles;
    
    // Add decorations from both biomes
    if (biome1.features && biome1.features.common) {
      const count = Math.floor(constants.TRANSITION_DECORATION_COUNT * blendRatio * densityModifier);
      for (let i = 0; i < count; i++) {
        features.decorations.push(
          biome1.features.common[i % biome1.features.common.length]
        );
      }
    }
    
    if (biome2.features && biome2.features.common) {
      const count = Math.floor(constants.TRANSITION_DECORATION_COUNT * (1 - blendRatio) * densityModifier);
      for (let i = 0; i < count; i++) {
        features.decorations.push(
          biome2.features.common[i % biome2.features.common.length]
        );
      }
    }
    
    // Add entities with reduced count
    if (biome1.npcs) {
      const count = Math.floor(constants.TRANSITION_ENTITY_COUNT * blendRatio * densityModifier);
      for (let i = 0; i < count; i++) {
        features.entities.push(biome1.npcs[i % biome1.npcs.length]);
      }
    }
    
    if (biome2.npcs) {
      const count = Math.floor(constants.TRANSITION_ENTITY_COUNT * (1 - blendRatio) * densityModifier);
      for (let i = 0; i < count; i++) {
        features.entities.push(biome2.npcs[i % biome2.npcs.length]);
      }
    }
    
    return features;
  }
  
  /**
   * Analyze biome clustering in a region
   */
  analyzeBiomeCluster(centerX, centerY, radius) {
    const biomes = [];
    const biomeCount = {};
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const biome = this.biomeManager.getBiome(centerX + dx, centerY + dy);
        biomes.push(biome);
        biomeCount[biome] = (biomeCount[biome] || 0) + 1;
      }
    }
    
    // Find dominant biome
    let dominantBiome = null;
    let maxCount = 0;
    
    for (const [biome, count] of Object.entries(biomeCount)) {
      if (count > maxCount) {
        maxCount = count;
        dominantBiome = biome;
      }
    }
    
    // Calculate coherence (how much of the cluster is the same biome)
    const totalTiles = biomes.length;
    const coherence = maxCount / totalTiles;
    
    return {
      dominantBiome,
      coherence,
      biomes: Object.keys(biomeCount),
      counts: biomeCount
    };
  }
  
  /**
   * Generate a transition pattern between biomes
   */
  generateTransitionPattern(fromBiome, toBiome, width, height) {
    const pattern = {
      width,
      height,
      tiles: []
    };
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Create gradient from left to right
        const ratio = x / (width - 1);
        
        // Add noise for natural variation
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.2;
        const adjustedRatio = Math.max(0, Math.min(1, ratio + noise));
        
        // Determine tile based on ratio
        if (adjustedRatio < constants.TRANSITION_GRADIENT_THRESHOLD_LOW) {
          pattern.tiles.push(fromBiome);
        } else if (adjustedRatio > constants.TRANSITION_GRADIENT_THRESHOLD_HIGH) {
          pattern.tiles.push(toBiome);
        } else {
          pattern.tiles.push('transition');
        }
      }
    }
    
    return pattern;
  }
  
  /**
   * Get special transition rules for biome pairs
   */
  getSpecialTransition(biome1, biome2) {
    const key1 = `${biome1}-${biome2}`;
    const key2 = `${biome2}-${biome1}`;
    
    return this.specialTransitions[key1] || 
           this.specialTransitions[key2] || 
           null;
  }
  
  /**
   * Get transition zone between two biomes
   * @param {string} fromBiome - Starting biome
   * @param {string} toBiome - Target biome  
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {Object} Transition zone info
   */
  getTransitionZone(fromBiome, toBiome, cx, cy) {
    const special = this.getSpecialTransition(fromBiome, toBiome);
    const strength = this.calculateTransitionStrength(cx, cy, fromBiome, toBiome);
    
    return {
      from: fromBiome || 'grasslands',
      to: toBiome || 'grasslands',
      strength: strength,
      special: special,
      features: special ? special.features : [],
      tiles: special ? special.tiles : []
    };
  }
  
  /**
   * Get cache hit count
   */
  getCacheHits() {
    return this.cacheHits;
  }
  
  /**
   * Clear transition cache
   */
  clearCache() {
    this.transitionCache.clear();
    this.cacheHits = 0;
  }
}

export default BiomeTransitionManager;