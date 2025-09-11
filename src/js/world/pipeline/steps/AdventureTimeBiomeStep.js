/**
 * AdventureTimeBiomeStep - Adventure Time biome selection and application
 * Integrates Phase 5 biome system with Phase 2 pipeline
 */

import { PipelineStep } from '../PipelineStep.js';
import { BiomeManager } from '../../biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../biome/BiomeTransitionManager.js';

/**
 * Pipeline step for Adventure Time biome generation
 */
export class AdventureTimeBiomeStep extends PipelineStep {
  /**
   * Create Adventure Time biome step
   * @param {string} seed - World seed for consistent generation
   * @param {Object} options - Dependency injection options
   */
  constructor(seed = 'ooo', options = {}) {
    super('AdventureTimeBiomeStep');
    this.seed = seed;
    
    // Dependency injection with defaults
    this.biomeManager = options.biomeManager || new BiomeManager(seed);
    this.featureGenerator = options.featureGenerator || new BiomeFeatureGenerator(seed);
    this.transitionManager = options.transitionManager || new BiomeTransitionManager(this.biomeManager);
  }
  
  /**
   * Process chunk to add Adventure Time biome
   * @param {Object} context - Pipeline context
   */
  async process(context) {
    // Validate context
    if (!context || !context.chunk) {
      const error = 'Invalid context: missing chunk';
      console.error(error);
      return { error };
    }
    
    const { cx, cy, chunk, params } = context;
    
    // Get biome for this chunk with error handling
    let biome = 'grasslands'; // Default fallback
    try {
      biome = this.biomeManager.getBiome(cx, cy);
    } catch (err) {
      console.error('Failed to get biome:', err);
      params.biomeError = err.message;
    }
    chunk.biome = biome;
    
    // Generate biome-specific features with error handling
    let features = [];
    try {
      features = this.featureGenerator.generateFeatures(biome, cx, cy);
    } catch (err) {
      console.error('Failed to generate features:', err);
      params.featureError = err.message;
    }
    
    // Store features in chunk
    chunk.biomeFeatures = features;
    
    // Set compatibility parameters for other pipeline steps
    // that expect standard biome properties
    const biomeDefinition = this.biomeManager?.getBiomeDefinition?.(biome) || {};
    params.biomeTemperature = biomeDefinition.temperature || 'moderate';
    params.biomeHumidity = biomeDefinition.humidity || 'normal';
    params.biomeElevation = biomeDefinition.elevation || 'medium';
    params.biomeFeatures = features;
    
    // Apply basic biome tiles immediately
    this.applyBiomeTiles(chunk, features);
    
    // Check for transition zones
    if (this.transitionManager && this.transitionManager.isBiomeEdge(cx, cy)) {
      chunk.isTransitionZone = true;
      
      // Get transition info
      const transitionInfo = this.transitionManager.getTransitionInfo(cx, cy);
      
      if (transitionInfo.isTransition) {
        // Generate transition features
        chunk.transitionFeatures = this.transitionManager.mixFeatures(
          transitionInfo.fromBiome,
          transitionInfo.toBiome,
          transitionInfo.strength
        );
        
        // Apply transition blending
        this.applyTransitionBlending(chunk, transitionInfo);
      }
    }
    
    // Store biome properties for other pipeline steps
    params.biome = biome;
    params.biomeFeatures = features;
    params.isTransitionZone = chunk.isTransitionZone || false;
    
    // Get biome properties for structure generation
    const biomeData = this.biomeManager.getBiomeDefinition(biome);
    if (biomeData) {
      params.biomeTemperature = biomeData.temperature;
      params.biomeMagicLevel = biomeData.magicLevel;
      params.biomeColor = biomeData.color;
    }
  }
  
  /**
   * Get chunk dimensions safely
   * @param {Object} chunk - Chunk to check
   * @returns {Object} Width and height
   */
  getChunkDimensions(chunk) {
    const width = chunk?.map?.[0]?.length || 0;
    const height = chunk?.map?.length || 0;
    return { width, height };
  }
  
  /**
   * Apply basic biome tiles to chunk
   * @param {Chunk} chunk - Chunk to modify
   * @param {Object} features - Biome features
   */
  applyBiomeTiles(chunk, features) {
    if (!features || !features.tiles || !chunk || !chunk.map) return;
    
    const { width, height } = this.getChunkDimensions(chunk);
    if (width === 0 || height === 0) return;
    
    // Apply tile changes
    for (const tile of features.tiles) {
      if (tile.x >= 0 && tile.x < width &&
          tile.y >= 0 && tile.y < height) {
        // Only apply to floor tiles, not walls
        if (chunk.map[tile.y][tile.x] === '.' || 
            chunk.map[tile.y][tile.x] === '·') {
          chunk.map[tile.y][tile.x] = tile.char || tile.type[0];
        }
      }
    }
    
    // Apply decorations
    if (features.decorations) {
      for (const deco of features.decorations) {
        if (deco.x >= 0 && deco.x < chunk.map[0].length &&
            deco.y >= 0 && deco.y < chunk.map.length) {
          // Only place on empty floor
          if (chunk.map[deco.y][deco.x] === '.' ||
              chunk.map[deco.y][deco.x] === '·') {
            const char = this.getDecorationChar(deco.type);
            if (char) {
              chunk.map[deco.y][deco.x] = char;
            }
          }
        }
      }
    }
  }
  
  /**
   * Create seeded random generator
   * @param {number} cx - Chunk X
   * @param {number} cy - Chunk Y
   * @returns {Object} Seeded RNG
   */
  createSeededRandom(cx, cy) {
    let seed = this.hashString(`${this.seed}-${cx}-${cy}`);
    return {
      next() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      },
      pick(array) {
        return array[Math.floor(this.next() * array.length)];
      }
    };
  }
  
  /**
   * Hash string to number
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Apply transition blending to chunk edges
   * @param {Chunk} chunk - Chunk to modify
   * @param {Object} transitionInfo - Transition information
   */
  applyTransitionBlending(chunk, transitionInfo) {
    if (!chunk || !chunk.map || !transitionInfo) return;
    
    const { fromBiome, toBiome, strength } = transitionInfo;
    const { width, height } = this.getChunkDimensions(chunk);
    if (width === 0 || height === 0) return;
    
    // Blend tiles at edges
    let blendedTiles = [];
    try {
      blendedTiles = this.transitionManager.blendTiles(
        fromBiome,
        toBiome,
        strength
      );
    } catch (err) {
      console.error('Failed to blend tiles:', err);
      return;
    }
    
    // Apply blended tiles to edge regions
    const EDGE_WIDTH = 3; // Width of transition zone (extracted constant)
    
    // Apply to left/right edges if transitioning horizontally
    const rng = this.createSeededRandom(chunk.cx || 0, chunk.cy || 0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < Math.min(EDGE_WIDTH, width); x++) {
        if (chunk.map[y] && chunk.map[y][x] && 
            (chunk.map[y][x] === '.' || chunk.map[y][x] === '·')) {
          const tileType = rng.pick(blendedTiles);
          chunk.map[y][x] = this.getTileChar(tileType);
        }
      }
    }
  }
  
  /**
   * Get character for tile type
   * @param {string} tileType - Tile type name
   * @returns {string} Character for rendering
   */
  getTileChar(tileType) {
    const tileChars = {
      'candy_grass': '·',
      'grass_tile': '.',
      'mixed_tile': '∘',
      'candy_tile': 'o',
      'pink_grass': '·',
      'normal_grass': '.',
      'candy_sprinkles': '∘'
    };
    return tileChars[tileType] || '.';
  }
  
  /**
   * Get decoration character
   * @param {string} decoType - Decoration type
   * @returns {string|null} Character or null
   */
  getDecorationChar(decoType) {
    const decoChars = {
      'lollipop_tree': '♣',
      'candy_cane_lamp': '║',
      'sugar_crystal': '◊',
      'tree': 'T',
      'bush': '&',
      'flower': '*',
      'mushroom': 'v',
      'cactus': '†',
      'rock': '%'
    };
    return decoChars[decoType] || null;
  }
}

export default AdventureTimeBiomeStep;