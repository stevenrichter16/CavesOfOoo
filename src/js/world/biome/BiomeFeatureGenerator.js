/**
 * BiomeFeatureGenerator - Generates Adventure Time biome-specific features
 * Creates tiles, entities, decorations, and resources for each biome
 */

import { ADVENTURE_TIME_BIOMES, getBiomeDefinition } from './adventure-time-biomes.js';
import { createNoise2D } from 'simplex-noise';
import * as constants from './biome-constants.js';

/**
 * Seeded random number generator
 */
class SeededRandom {
  constructor(seed) {
    this.seed = this.hashString(seed);
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  next() {
    this.seed = (this.seed * constants.RNG_MULTIPLIER + constants.RNG_INCREMENT) & constants.RNG_MODULUS;
    return this.seed / constants.RNG_MODULUS;
  }
  
  between(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  
  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }
  
  chance(probability) {
    return this.next() < probability;
  }
}

/**
 * Generates features for Adventure Time biomes
 */
export class BiomeFeatureGenerator {
  constructor(seed = 'ooo') {
    this.seed = seed;
    // Use seeded random for noise generation
    const rng = new SeededRandom(seed);
    this.noise = createNoise2D(() => rng.next());
  }
  
  /**
   * Generate all features for a biome at specific chunk coordinates
   */
  generateFeatures(biomeId, cx, cy, options = {}) {
    const biome = getBiomeDefinition(biomeId);
    const rng = new SeededRandom(`${this.seed}-${cx}-${cy}`);
    const density = options.density || this.getBiomeDensity(biomeId);
    
    const features = {
      tiles: [],
      entities: [],
      decorations: [],
      resources: [],
      special: []
    };
    
    // Generate features with error handling for each type
    try {
      this.generateTiles(features, biome, rng, density);
    } catch (err) {
      console.error('Failed to generate tiles:', err);
    }
    
    try {
      this.generateEntities(features, biome, rng);
    } catch (err) {
      console.error('Failed to generate entities:', err);
    }
    
    try {
      this.generateDecorations(features, biome, rng);
    } catch (err) {
      console.error('Failed to generate decorations:', err);
    }
    
    try {
      this.generateResources(features, biome, rng);
    } catch (err) {
      console.error('Failed to generate resources:', err);
    }
    
    try {
      this.generateSpecialFeatures(features, biome, rng, cx, cy);
    } catch (err) {
      console.error('Failed to generate special features:', err);
    }
    
    return features;
  }
  
  /**
   * Calculate tile count based on density
   */
  calculateTileCount(density) {
    // Clamp density to reasonable range
    const clampedDensity = Math.max(0, Math.min(1, density));
    
    const count = Math.floor(
      constants.CHUNK_WIDTH * 
      constants.CHUNK_HEIGHT * 
      clampedDensity * 
      constants.TILE_GENERATION_DENSITY_FACTOR
    );
    
    // Cap at maximum reasonable number
    return Math.min(count, constants.CHUNK_WIDTH * constants.CHUNK_HEIGHT / 2);
  }
  
  /**
   * Generate noise-based feature (for testing)
   */
  generateNoiseBasedFeature(x, y) {
    const noiseValue = this.noise(x * 0.1, y * 0.1);
    return {
      type: noiseValue > 0 ? 'feature_a' : 'feature_b',
      value: noiseValue
    };
  }
  
  /**
   * Get default density for biome type
   */
  getBiomeDensity(biomeId) {
    const densities = {
      candy_kingdom: 0.6,
      grasslands: 0.4,
      ice_kingdom: 0.5,
      fire_kingdom: 0.5,
      dungeon: 0.3,
      cloud_kingdom: 0.4,
      bad_lands: 0.2,
      breakfast_kingdom: 0.6,
      lemongrab_earldom: 0.5,
      marceline_cave: 0.3
    };
    return densities[biomeId] || 0.4;
  }
  
  /**
   * Generate tiles for the biome
   */
  generateTiles(features, biome, rng, density) {
    const tileCount = this.calculateTileCount(density);
    
    for (let i = 0; i < tileCount; i++) {
      // between() is exclusive of max, so use WIDTH-1 and HEIGHT-1 for inclusive bounds
      const x = rng.between(0, constants.CHUNK_WIDTH - 1);
      const y = rng.between(0, constants.CHUNK_HEIGHT - 1);
      
      let tileType;
      if (biome.tiles) {
        if (rng.chance(constants.FLOOR_TILE_CHANCE) && biome.tiles.floor) {
          tileType = rng.pick(biome.tiles.floor);
        } else if (rng.chance(constants.SPECIAL_TILE_CHANCE) && biome.tiles.special) {
          tileType = rng.pick(biome.tiles.special);
        } else if (biome.tiles.wall) {
          tileType = rng.pick(biome.tiles.wall);
        }
      }
      
      if (tileType) {
        features.tiles.push({
          x,
          y,
          type: tileType,
          char: this.getTileChar(tileType)
        });
      }
    }
  }
  
  /**
   * Get tile character for rendering
   */
  getTileChar(tileType) {
    const tileChars = {
      'candy_grass': '·',
      'lollipop': '♣',
      'gumdrop': 'o',
      'candy_wall': '▓',
      'snow': '·',
      'ice': '▓',
      'ice_spike': '▲',
      'lava_pool': '~',
      'charred_ground': '≈',
      'obsidian': '█',
      'cloud': '☁',
      'bacon_strip': '=',
      'toast_wall': '▓',
      'lemon_ground': '·'
    };
    return tileChars[tileType] || '.';
  }
  
  /**
   * Generate entities for the biome
   */
  generateEntities(features, biome, rng) {
    if (!biome.npcs) return;
    
    const entityCount = rng.between(constants.MIN_ENTITIES_PER_CHUNK, constants.MAX_ENTITIES_PER_CHUNK);
    
    for (let i = 0; i < entityCount; i++) {
      const entityType = rng.pick(biome.npcs);
      features.entities.push({
        type: entityType,
        x: rng.between(1, constants.CHUNK_WIDTH - 1),
        y: rng.between(1, constants.CHUNK_HEIGHT - 1),
        behavior: this.getEntityBehavior(entityType)
      });
    }
  }
  
  /**
   * Get entity behavior type
   */
  getEntityBehavior(entityType) {
    const behaviors = {
      'candy_person': 'friendly',
      'banana_guard': 'guard',
      'peppermint_butler': 'vendor',
      'penguin': 'wander',
      'snow_golem': 'patrol',
      'flame_person': 'neutral',
      'fire_wolf': 'hostile',
      'skeleton': 'hostile',
      'monster': 'hostile'
    };
    return behaviors[entityType] || 'wander';
  }
  
  /**
   * Generate decorations for the biome
   */
  generateDecorations(features, biome, rng) {
    if (!biome.features) return;
    
    const decoCount = rng.between(constants.MIN_DECORATIONS_PER_CHUNK, constants.MAX_DECORATIONS_PER_CHUNK);
    
    for (let i = 0; i < decoCount; i++) {
      let decoType;
      
      if (rng.chance(constants.COMMON_FEATURE_CHANCE) && biome.features.common) {
        decoType = rng.pick(biome.features.common);
      } else if (rng.chance(constants.UNCOMMON_FEATURE_CHANCE) && biome.features.uncommon) {
        decoType = rng.pick(biome.features.uncommon);
      }
      
      if (decoType) {
        features.decorations.push({
          type: decoType,
          x: rng.between(1, constants.CHUNK_WIDTH - 2),
          y: rng.between(1, constants.CHUNK_HEIGHT - 2),
          rarity: 'common'
        });
      }
    }
    
    // Add biome-specific decorations
    if (biome.name === 'Candy Kingdom') {
      features.decorations.push({
        type: 'candy_cane_lamp',
        x: rng.between(2, constants.CHUNK_WIDTH - 2),
        y: rng.between(2, constants.CHUNK_HEIGHT - 2),
        rarity: 'uncommon'
      });
      
      if (rng.chance(0.3)) {
        features.decorations.push({
          type: 'sugar_crystal',
          x: rng.between(1, constants.CHUNK_WIDTH - 1),
          y: rng.between(1, constants.CHUNK_HEIGHT - 1),
          rarity: 'uncommon'
        });
      }
    } else if (biome.name === 'Ice Kingdom') {
      features.decorations.push({
        type: 'frozen_tree',
        x: rng.between(1, constants.CHUNK_WIDTH - 1),
        y: rng.between(1, constants.CHUNK_HEIGHT - 1),
        rarity: 'common'
      });
      
      if (rng.chance(0.2)) {
        features.decorations.push({
          type: 'ice_sculpture',
          x: rng.between(5, constants.CHUNK_WIDTH - 6),
          y: rng.between(5, constants.CHUNK_HEIGHT - 6),
          rarity: 'uncommon'
        });
      }
    }
  }
  
  /**
   * Generate resources for the biome
   */
  generateResources(features, biome, rng) {
    if (!biome.resources) return;
    
    const resourceCount = rng.between(constants.MIN_RESOURCES_PER_CHUNK, constants.MAX_RESOURCES_PER_CHUNK);
    
    for (let i = 0; i < resourceCount; i++) {
      const resourceType = rng.pick(biome.resources);
      const rarity = rng.chance(constants.COMMON_RESOURCE_CHANCE) ? 'common' : (rng.chance(constants.UNCOMMON_RESOURCE_CHANCE) ? 'uncommon' : 'rare');
      
      features.resources.push({
        type: resourceType,
        x: rng.between(1, constants.CHUNK_WIDTH - 1),
        y: rng.between(1, constants.CHUNK_HEIGHT - 1),
        rarity: rarity,
        amount: rarity === 'common' ? 
          rng.between(constants.COMMON_RESOURCE_MIN_AMOUNT, constants.COMMON_RESOURCE_MAX_AMOUNT) : 
          rng.between(constants.RARE_RESOURCE_MIN_AMOUNT, constants.RARE_RESOURCE_MAX_AMOUNT)
      });
    }
  }
  
  /**
   * Generate special/rare features
   */
  generateSpecialFeatures(features, biome, rng, cx, cy) {
    // Always have a chance for rare features
    if (rng.chance(constants.SPECIAL_FEATURE_CHANCE) && biome.features && biome.features.rare) {
      const specialType = rng.pick(biome.features.rare);
      features.special.push({
        type: specialType,
        x: rng.between(constants.SPECIAL_FEATURE_MIN_X, constants.SPECIAL_FEATURE_MAX_X),
        y: rng.between(constants.SPECIAL_FEATURE_MIN_Y, constants.SPECIAL_FEATURE_MAX_Y),
        rarity: 'rare'
      });
    }
    
    // Candy Kingdom specific - gumball guardian
    if (biome.name === 'Candy Kingdom' && rng.chance(constants.GUMBALL_GUARDIAN_SPAWN_CHANCE)) {
      features.special.push({
        type: 'gumball_guardian',
        x: rng.between(constants.GUMBALL_GUARDIAN_MIN_X, constants.GUMBALL_GUARDIAN_MAX_X),
        y: rng.between(constants.GUMBALL_GUARDIAN_MIN_Y, constants.GUMBALL_GUARDIAN_MAX_Y),
        rarity: 'rare'
      });
    }
    
    // Dungeon specific - treasure room
    if (biome.name === 'Dungeon' && rng.chance(constants.DUNGEON_TREASURE_ROOM_CHANCE)) {
      features.special.push({
        type: 'treasure_room',
        x: rng.between(constants.TREASURE_ROOM_MIN_X, constants.TREASURE_ROOM_MAX_X),
        y: rng.between(constants.TREASURE_ROOM_MIN_Y, constants.TREASURE_ROOM_MAX_Y),
        rarity: 'rare'
      });
    }
  }
  
  /**
   * Apply generated features to a chunk
   */
  applyToChunk(chunk, features) {
    // Handle null chunk
    if (!chunk) {
      return;
    }
    
    // Apply tiles
    for (const tile of features.tiles) {
      if (chunk.setTile) {
        chunk.setTile(tile.x, tile.y, tile.char);
      } else if (chunk.map && chunk.map[tile.y] && tile.x < chunk.map[tile.y].length) {
        chunk.map[tile.y][tile.x] = tile.char;
      }
    }
    
    // Add entities
    if (chunk.npcs) {
      for (const entity of features.entities) {
        chunk.npcs.push({
          type: entity.type,
          x: entity.x,
          y: entity.y,
          behavior: entity.behavior
        });
      }
    }
    
    // Add items/resources
    if (chunk.items) {
      for (const resource of features.resources) {
        chunk.items.push({
          type: resource.type,
          x: resource.x,
          y: resource.y,
          amount: resource.amount
        });
      }
    }
    
    // Mark special features
    if (!chunk.features) {
      chunk.features = [];
    }
    for (const special of features.special) {
      chunk.features.push(special);
    }
    
    // Add decorations as visual elements
    for (const deco of features.decorations) {
      const decoChar = this.getDecorationChar(deco.type);
      if (decoChar && chunk.setTile) {
        chunk.setTile(deco.x, deco.y, decoChar);
      } else if (decoChar && chunk.map && chunk.map[deco.y]) {
        chunk.map[deco.y][deco.x] = decoChar;
      }
    }
  }
  
  /**
   * Get decoration character
   */
  getDecorationChar(decoType) {
    const decoChars = {
      'lollipop_tree': '♣',
      'candy_cane_lamp': '║',
      'sugar_crystal': '◊',
      'frozen_tree': '↟',
      'ice_sculpture': '☃',
      'snow_pile': '∘',
      'lava_pool': '~',
      'obsidian_spire': '▲'
    };
    return decoChars[decoType] || null;
  }
}

export default BiomeFeatureGenerator;