/**
 * BiomeManager - Adventure Time Biome Distribution System
 * Uses Perlin noise for natural biome clustering with lore-accurate placement
 */

import { createNoise2D } from 'simplex-noise';
import { ADVENTURE_TIME_BIOMES, getBiomeDefinition } from './adventure-time-biomes.js';
import * as constants from './biome-constants.js';

/**
 * Manages biome generation and distribution across the Land of Ooo
 */
export class BiomeManager {
  constructor(seed = 'ooo', options = {}) {
    this.seed = seed;
    // Handle null options
    options = options || {};
    this.maxCacheSize = options.maxCacheSize || constants.MAX_BIOME_CACHE_SIZE;
    this.maxTransitionCacheSize = options.maxTransitionCacheSize || constants.MAX_TRANSITION_CACHE_SIZE;
    
    // Create noise generators for different environmental factors
    this.noiseGenerators = {
      temperature: createNoise2D(() => this.hashSeed(seed + 'temp')),
      humidity: createNoise2D(() => this.hashSeed(seed + 'humid')),
      magic: createNoise2D(() => this.hashSeed(seed + 'magic')),
      evil: createNoise2D(() => this.hashSeed(seed + 'evil')),
      clustering: createNoise2D(() => this.hashSeed(seed + 'cluster'))
    };
    
    // Adventure Time kingdom territories with fixed positions
    this.kingdomTerritories = {
      candy_kingdom: {
        center: { x: 0, y: 0 },
        radius: 8,
        priority: 10,
        falloff: 0.8
      },
      ice_kingdom: {
        center: { x: -50, y: 50 },
        radius: 15,
        priority: 9,
        falloff: 0.7
      },
      fire_kingdom: {
        center: { x: 50, y: -50 },
        radius: 15,
        priority: 9,
        falloff: 0.7
      },
      breakfast_kingdom: {
        center: { x: 25, y: 15 },
        radius: 5,
        priority: 7,
        falloff: 0.9
      },
      lemongrab_earldom: {
        center: { x: -30, y: -20 },
        radius: 8,
        priority: 7,
        falloff: 0.85
      }
    };
    
    // Special locations (like Finn's treehouse)
    this.specialLocations = {
      treehouse: { x: 15, y: 20, biome: 'grasslands' },
      marceline_cave: { x: -25, y: 10, biome: 'marceline_cave' }
    };
    
    // Cache for performance with LRU eviction
    this.biomeCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.biomeEvictions = 0;
    this.transitionEvictions = 0;
    this.transitionCache = new Map();
  }
  
  /**
   * Simple hash function for seed generation
   */
  hashSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / constants.HASH_NORMALIZATION_FACTOR; // Normalize to 0-1
  }
  
  /**
   * Get biome at specific chunk coordinates
   */
  getBiome(cx, cy) {
    // Check cache first
    const cacheKey = `${cx},${cy}`;
    if (this.biomeCache.has(cacheKey)) {
      this.cacheHits++;
      // Move to end (most recently used)
      const value = this.biomeCache.get(cacheKey);
      this.biomeCache.delete(cacheKey);
      this.biomeCache.set(cacheKey, value);
      return value;
    }
    this.cacheMisses++;
    
    // Check for special locations first
    for (const [locName, loc] of Object.entries(this.specialLocations)) {
      if (loc.x === cx && loc.y === cy) {
        this.addToCache(cacheKey, loc.biome);
        return loc.biome;
      }
    }
    
    // Check kingdom territories with smooth falloff
    for (const [biomeId, territory] of Object.entries(this.kingdomTerritories)) {
      const dist = Math.sqrt(
        Math.pow(cx - territory.center.x, 2) + 
        Math.pow(cy - territory.center.y, 2)
      );
      
      if (dist <= territory.radius) {
        // Check if within core radius first (no noise for core)
        if (dist <= territory.radius * territory.falloff) {
          this.addToCache(cacheKey, biomeId);
          return biomeId;
        }
        
        // Use noise only for edge zones
        const edgeNoise = this.noiseGenerators.clustering(cx * constants.NOISE_SCALE.CLUSTERING, cy * constants.NOISE_SCALE.CLUSTERING);
        const adjustedRadius = territory.radius + (edgeNoise * constants.BIOME_EDGE_NOISE_FACTOR);
        
        if (dist <= adjustedRadius) {
          this.addToCache(cacheKey, biomeId);
          return biomeId;
        }
      }
    }
    
    // Use noise-based generation for other areas
    const biome = this.generateBiomeFromNoise(cx, cy);
    this.addToCache(cacheKey, biome);
    return biome;
  }
  
  /**
   * Generate biome based on Perlin noise values
   */
  generateBiomeFromNoise(cx, cy) {
    // Sample noise at different scales for variety - smaller scale = larger features
    const temp = this.noiseGenerators.temperature(cx * constants.NOISE_SCALE.TEMPERATURE, cy * constants.NOISE_SCALE.TEMPERATURE);
    const humidity = this.noiseGenerators.humidity(cx * constants.NOISE_SCALE.HUMIDITY, cy * constants.NOISE_SCALE.HUMIDITY);
    const magic = this.noiseGenerators.magic(cx * constants.NOISE_SCALE.MAGIC, cy * constants.NOISE_SCALE.MAGIC);
    const evil = this.noiseGenerators.evil(cx * constants.NOISE_SCALE.EVIL, cy * constants.NOISE_SCALE.EVIL);
    
    // Check for dungeons (scattered randomly based on evil noise)
    if (evil > constants.DUNGEON_EVIL_THRESHOLD && Math.abs(cx) + Math.abs(cy) > constants.DUNGEON_MIN_DISTANCE_FROM_ORIGIN) {
      return 'dungeon';
    }
    
    // Cloud kingdom in highly magical areas
    if (magic > constants.CLOUD_KINGDOM_MAGIC_THRESHOLD && temp > constants.CLOUD_KINGDOM_TEMP_THRESHOLD) {
      return 'cloud_kingdom';
    }
    
    // Desert in very hot, very dry areas (check more specific condition first)
    if (temp > constants.DESERT_TEMP_THRESHOLD && humidity < constants.DESERT_HUMIDITY_THRESHOLD) {
      return 'desert';
    }
    
    // Bad lands in hot, dry areas (less restrictive than desert)
    if (temp > constants.BAD_LANDS_TEMP_THRESHOLD && humidity < constants.BAD_LANDS_HUMIDITY_THRESHOLD) {
      return 'bad_lands';
    }
    
    // Forest in moderate temp, high humidity
    if (temp > constants.FOREST_TEMP_MIN && temp < constants.FOREST_TEMP_MAX && humidity > constants.FOREST_HUMIDITY_THRESHOLD) {
      return 'forest';
    }
    
    // Default to grasslands (most common biome)
    return 'grasslands';
  }
  
  /**
   * Get transition zone between two biomes
   */
  getTransitionZone(biome1, biome2, x, y) {
    const transitionKey = `${biome1}-${biome2}-${x}-${y}`;
    
    if (this.transitionCache.has(transitionKey)) {
      this.cacheHits++;
      // Move to end (LRU)
      const value = this.transitionCache.get(transitionKey);
      this.transitionCache.delete(transitionKey);
      this.transitionCache.set(transitionKey, value);
      return value;
    }
    this.cacheMisses++;
    
    // Calculate mix ratio based on position noise
    const noise = this.noiseGenerators.clustering(x * constants.NOISE_SCALE.TRANSITION, y * constants.NOISE_SCALE.TRANSITION);
    const mixRatio = (noise + 1) / 2; // Normalize to 0-1
    
    const transition = {
      from: biome1,
      to: biome2,
      mixRatio: mixRatio,
      x: x,
      y: y
    };
    
    this.addToTransitionCache(transitionKey, transition);
    return transition;
  }
  
  /**
   * Get mixed features at biome edges
   */
  getEdgeFeatures(biome1, biome2) {
    const features = [];
    
    // Special transition features
    if (biome1 === 'candy_kingdom' && biome2 === 'grasslands') {
      features.push('candy_grass_fading', 'normal_grass');
    } else if (biome1 === 'ice_kingdom' && biome2 === 'grasslands') {
      features.push('melting_snow', 'frost_grass');
    } else if (biome1 === 'fire_kingdom' && biome2 === 'grasslands') {
      features.push('charred_grass', 'warm_stones');
    } else {
      // Generic transition
      features.push('mixed_vegetation', 'transition_rocks');
    }
    
    return features;
  }
  
  /**
   * Check if a special kingdom exists
   */
  hasSpecialKingdom(kingdomId) {
    return this.kingdomTerritories.hasOwnProperty(kingdomId);
  }
  
  /**
   * Get kingdom territory info
   */
  getKingdomTerritory(kingdomId) {
    return this.kingdomTerritories[kingdomId] || null;
  }
  
  /**
   * Get special location info
   */
  getSpecialLocation(locationId) {
    return this.specialLocations[locationId] || null;
  }
  
  /**
   * Get biome definition
   */
  getBiomeDefinition(biomeId) {
    return getBiomeDefinition(biomeId);
  }
  
  /**
   * Get biome features from definition
   */
  getBiomeFeatures(biomeId) {
    const biome = getBiomeDefinition(biomeId);
    return biome.features || { common: [], uncommon: [], rare: [] };
  }
  
  /**
   * Get biome temperature
   */
  getBiomeTemperature(biomeId) {
    const biome = getBiomeDefinition(biomeId);
    return biome.temperature || 'moderate';
  }
  
  /**
   * Get biome magic level
   */
  getBiomeMagicLevel(biomeId) {
    const biome = getBiomeDefinition(biomeId);
    return biome.magicLevel || 0.5;
  }
  
  /**
   * Analyze biome clustering in a region
   */
  analyzeBiomeCluster(centerX, centerY, radius) {
    const biomes = [];
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const biome = this.getBiome(centerX + dx, centerY + dy);
        biomes.push(biome);
      }
    }
    
    return biomes;
  }
  
  /**
   * Get cache statistics
   */
  getCacheHits() {
    return this.cacheHits;
  }
  
  /**
   * Add to biome cache with LRU eviction
   */
  addToCache(key, value) {
    if (this.biomeCache.size >= this.maxCacheSize) {
      // Evict oldest (first) entry
      const firstKey = this.biomeCache.keys().next().value;
      this.biomeCache.delete(firstKey);
      this.biomeEvictions++;
    }
    this.biomeCache.set(key, value);
  }
  
  /**
   * Add to transition cache with LRU eviction
   */
  addToTransitionCache(key, value) {
    if (this.transitionCache.size >= this.maxTransitionCacheSize) {
      // Evict oldest (first) entry
      const firstKey = this.transitionCache.keys().next().value;
      this.transitionCache.delete(firstKey);
      this.transitionEvictions++;
    }
    this.transitionCache.set(key, value);
  }
  
  /**
   * Get biome cache size
   */
  getBiomeCacheSize() {
    return this.biomeCache.size;
  }
  
  /**
   * Get transition cache size
   */
  getTransitionCacheSize() {
    return this.transitionCache.size;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return {
      biomeCache: {
        size: this.biomeCache.size,
        maxSize: this.maxCacheSize
      },
      transitionCache: {
        size: this.transitionCache.size,
        maxSize: this.maxTransitionCacheSize
      },
      hits: this.cacheHits,
      misses: this.cacheMisses,
      biomeEvictions: this.biomeEvictions,
      transitionEvictions: this.transitionEvictions,
      totalEvictions: this.biomeEvictions + this.transitionEvictions,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
  
  /**
   * Test method for edge noise factor (for testing)
   */
  testEdgeNoiseFactor() {
    return constants.BIOME_EDGE_NOISE_FACTOR;
  }
  
  /**
   * Clear caches (useful for testing)
   */
  clearCache() {
    this.biomeCache.clear();
    this.transitionCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.biomeEvictions = 0;
    this.transitionEvictions = 0;
  }
}

export default BiomeManager;