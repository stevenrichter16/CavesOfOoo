/**
 * BiomeStep - Selects and applies biome to chunk
 * Uses Voronoi-like regions for coherent biome areas
 */

import { PipelineStep } from '../PipelineStep.js';
import { BIOME_TYPES, MAX_BIOME_CACHE_SIZE, DEFAULT_BIOME_CENTER_COUNT } from '../../constants.js';

// Biome properties
const BIOME_PROPERTIES = {
  grassland: { temperature: 0.5, humidity: 0.5, elevation: 0.3 },
  forest: { temperature: 0.5, humidity: 0.7, elevation: 0.4 },
  desert: { temperature: 0.9, humidity: 0.1, elevation: 0.3 },
  tundra: { temperature: 0.1, humidity: 0.4, elevation: 0.5 },
  swamp: { temperature: 0.6, humidity: 0.9, elevation: 0.2 },
  mountains: { temperature: 0.3, humidity: 0.5, elevation: 0.9 }
};

/**
 * LRU Cache implementation for biome centers
 */
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      // Remove and re-add to move to end
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  get size() {
    return this.cache.size;
  }
}

export class BiomeStep extends PipelineStep {
  constructor() {
    super('BiomeStep');
    this.biomeCenters = new LRUCache(MAX_BIOME_CACHE_SIZE);
  }
  
  async process(context) {
    // Validate context
    if (!context || !context.chunk || !context.params || !context.rng) {
      throw new Error('Invalid context: missing required fields (chunk, params, or rng)');
    }
    
    const { seed, cx, cy, chunk, params } = context;
    
    // Check if we have a shared BiomeManager in context
    let biome;
    if (context.biomeManager) {
      // Use shared BiomeManager for better caching
      biome = context.biomeManager.getBiome(cx, cy);
    } else {
      // Fall back to simple implementation
      const centers = this.getBiomeCenters(seed);
      biome = this.findNearestBiome(cx, cy, centers);
    }
    
    // Apply biome to chunk
    chunk.biome = biome;
    
    // Set biome properties in params
    const properties = BIOME_PROPERTIES[biome] || BIOME_PROPERTIES['grassland'];
    if (properties) {
      params.biomeTemperature = properties.temperature;
      params.biomeHumidity = properties.humidity;
      params.biomeElevation = properties.elevation;
    }
  }
  
  /**
   * Get or generate biome centers for a seed
   * @param {string} seed - World seed
   * @returns {Array} Array of biome centers
   */
  getBiomeCenters(seed) {
    // Check cache using LRU get
    const cached = this.biomeCenters.get(seed);
    if (cached) {
      return cached;
    }
    
    // Generate biome centers using seed
    const centers = this.generateBiomeCenters(seed);
    this.biomeCenters.set(seed, centers);
    return centers;
  }
  
  /**
   * Generate biome center points
   * @param {string} seed - World seed
   * @returns {Array} Array of biome centers
   */
  generateBiomeCenters(seed) {
    // Use a seeded random based on the seed string
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Simple RNG for center generation
    const rng = {
      state: Math.abs(hash) || 1,
      next() {
        this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
        return this.state / 0x7fffffff;
      }
    };
    
    const centers = [];
    const numCenters = 20; // Number of biome regions
    const spread = 50; // How far apart centers can be
    
    for (let i = 0; i < numCenters; i++) {
      centers.push({
        x: (rng.next() - 0.5) * spread,
        y: (rng.next() - 0.5) * spread,
        biome: BIOME_TYPES[Math.floor(rng.next() * BIOME_TYPES.length)]
      });
    }
    
    return centers;
  }
  
  /**
   * Find the nearest biome center to a chunk
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @param {Array} centers - Biome centers
   * @returns {string} Biome type
   */
  findNearestBiome(cx, cy, centers) {
    let nearestBiome = 'grassland';  // Use consistent naming
    let nearestDistance = Infinity;
    
    for (const center of centers) {
      // Calculate distance to center
      const dx = cx - center.x;
      const dy = cy - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestBiome = center.biome;
      }
    }
    
    return nearestBiome;
  }
}