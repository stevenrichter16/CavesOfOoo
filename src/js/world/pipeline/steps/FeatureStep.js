/**
 * FeatureStep - Applies features to chunk
 * Adds doors, chests, traps, decorations, and stairs
 * Integrates with Adventure Time biome features from Phase 5
 */

import { PipelineStep } from '../PipelineStep.js';
import { BiomeFeatureGenerator } from '../../biome/BiomeFeatureGenerator.js';
import { SeededRandom } from '../SeededRandom.js';
import * as constants from '../../biome/biome-constants.js';

// Feature density by biome (including Adventure Time biomes)
const BIOME_FEATURE_PARAMS = {
  // Adventure Time biomes
  candy_kingdom: {
    chestDensity: 0.15,
    trapDensity: 0.02,
    decorationDensity: 0.3,
    doorChance: 0.8,
    stairChance: 0.1,
    decorations: ['♣', '◊', '║', 'o']
  },
  ice_kingdom: {
    chestDensity: 0.1,
    trapDensity: 0.08,
    decorationDensity: 0.25,
    doorChance: 0.7,
    stairChance: 0.08,
    decorations: ['☃', '▲', '∘', '·']
  },
  fire_kingdom: {
    chestDensity: 0.12,
    trapDensity: 0.15,
    decorationDensity: 0.2,
    doorChance: 0.6,
    stairChance: 0.12,
    decorations: ['~', '≈', '▲', '█']
  },
  // Original biomes
  grassland: {
    chestDensity: 0.1,
    trapDensity: 0.05,
    decorationDensity: 0.2,
    doorChance: 0.7,
    stairChance: 0.1,
    decorations: ['%', '&', '.', '·']
  },
  // Alias for consistency with Adventure Time biomes
  grasslands: {
    chestDensity: 0.1,
    trapDensity: 0.05,
    decorationDensity: 0.2,
    doorChance: 0.7,
    stairChance: 0.1,
    decorations: ['%', '&', '.', '·']
  },
  forest: {
    chestDensity: 0.15,
    trapDensity: 0.08,
    decorationDensity: 0.3,
    doorChance: 0.6,
    stairChance: 0.1,
    decorations: ['T', '%', '&', 'v']
  },
  desert: {
    chestDensity: 0.05,
    trapDensity: 0.1,
    decorationDensity: 0.1,
    doorChance: 0.5,
    stairChance: 0.05,
    decorations: ['o', '·', '^']
  },
  tundra: {
    chestDensity: 0.08,
    trapDensity: 0.06,
    decorationDensity: 0.15,
    doorChance: 0.6,
    stairChance: 0.08,
    decorations: ['*', '·', 'i']
  },
  swamp: {
    chestDensity: 0.12,
    trapDensity: 0.15,
    decorationDensity: 0.25,
    doorChance: 0.5,
    stairChance: 0.05,
    decorations: ['~', '%', 'v', '&']
  },
  mountains: {
    chestDensity: 0.2,
    trapDensity: 0.12,
    decorationDensity: 0.1,
    doorChance: 0.8,
    stairChance: 0.9,
    decorations: ['^', 'o', '*']
  }
};

export class FeatureStep extends PipelineStep {
  constructor() {
    super('FeatureStep');
  }
  
  /**
   * Create a seeded random generator for deterministic generation
   */
  createSeededRandom(cx, cy) {
    const seed = `${cx},${cy}`;
    return new SeededRandom(seed);
  }
  
  async process(context) {
    const { chunk, params } = context;
    // Create or use existing RNG
    const rng = context.rng || this.createSeededRandom(chunk.cx, chunk.cy);
    // Store RNG for transition features
    this.transitionRng = rng;
    const biome = chunk.biome || 'grasslands';
    const featureParams = BIOME_FEATURE_PARAMS[biome] || BIOME_FEATURE_PARAMS.grasslands || BIOME_FEATURE_PARAMS.grassland;
    
    // Initialize features object
    params.features = {
      doors: [],
      chests: [],
      traps: [],
      decorations: [],
      stairs: []
    };
    
    // Apply Adventure Time biome features if they exist
    if (chunk.biomeFeatures) {
      this.applyBiomeFeatures(chunk, chunk.biomeFeatures);
    }
    
    // Apply transition features if in transition zone
    if (chunk.isTransitionZone && chunk.transitionFeatures) {
      this.applyTransitionFeatures(chunk, chunk.transitionFeatures);
    }
    
    // Place doors at room entrances and corridors
    this.placeDoors(chunk, rng, params, featureParams);
    
    // Place chests in rooms
    this.placeChests(chunk, rng, params, featureParams);
    
    // Place traps in corridors and rooms
    this.placeTraps(chunk, rng, params, featureParams);
    
    // Place decorations
    this.placeDecorations(chunk, rng, params, featureParams);
    
    // Place stairs
    this.placeStairs(chunk, rng, params, featureParams);
  }
  
  /**
   * Place doors at room entrances
   */
  placeDoors(chunk, rng, params, featureParams) {
    const rooms = params.rooms || [];
    const corridors = params.corridors || [];
    
    // Find potential door locations (transitions between room and corridor)
    const doorCandidates = [];
    
    // Check room edges for corridors
    for (const room of rooms) {
      // Check room perimeter
      for (let x = room.x - 1; x <= room.x + room.width; x++) {
        for (let y = room.y - 1; y <= room.y + room.height; y++) {
          // Only check edges
          if ((x === room.x - 1 || x === room.x + room.width ||
               y === room.y - 1 || y === room.y + room.height) &&
              x >= 0 && x < 24 && y >= 0 && y < 22) {
            
            // Check if this is a transition point
            if (this.isDoorCandidate(chunk, x, y)) {
              doorCandidates.push({ x, y });
            }
          }
        }
      }
    }
    
    // Also scan entire chunk for door candidates if we didn't find any
    if (doorCandidates.length === 0) {
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (this.isDoorCandidate(chunk, x, y)) {
            doorCandidates.push({ x, y });
          }
        }
      }
    }
    
    // Place doors at some candidates
    for (const candidate of doorCandidates) {
      if (rng.next() < featureParams.doorChance) {
        chunk.setTile(candidate.x, candidate.y, '+');
        params.features.doors.push({
          x: candidate.x,
          y: candidate.y,
          locked: rng.next() < 0.2
        });
      }
    }
    
    // Ensure at least one door if we have rooms
    if (params.features.doors.length === 0 && doorCandidates.length > 0) {
      const door = doorCandidates[Math.floor(rng.next() * doorCandidates.length)];
      chunk.setTile(door.x, door.y, '+');
      params.features.doors.push({
        x: door.x,
        y: door.y,
        locked: false
      });
    }
  }
  
  /**
   * Check if a position is a good door candidate
   */
  isDoorCandidate(chunk, x, y) {
    const tile = chunk.getTile(x, y);
    if (tile !== '.' && tile !== '·') return false;
    
    // Check for wall-floor-wall pattern (horizontal or vertical)
    const north = y > 0 ? chunk.getTile(x, y - 1) : '#';
    const south = y < 21 ? chunk.getTile(x, y + 1) : '#';
    const east = x < 23 ? chunk.getTile(x + 1, y) : '#';
    const west = x > 0 ? chunk.getTile(x - 1, y) : '#';
    
    const isFloor = (t) => t === '.' || t === '·';
    const isWall = (t) => t === '#';
    
    // Count adjacent walls and floors
    const walls = [north, south, east, west].filter(isWall).length;
    const floors = [north, south, east, west].filter(isFloor).length;
    
    // Good door candidate has 2 walls and 2 floors in cross pattern
    // OR 1 wall and 3 floors (entrance)
    return (walls === 2 && floors === 2) || (walls === 1 && floors === 3);
  }
  
  /**
   * Place chests in rooms
   */
  placeChests(chunk, rng, params, featureParams) {
    const rooms = params.rooms || [];
    
    for (const room of rooms) {
      if (rng.next() < featureParams.chestDensity) {
        // Find a wall position in the room for the chest
        const positions = [];
        
        for (let y = room.y; y < room.y + room.height; y++) {
          for (let x = room.x; x < room.x + room.width; x++) {
            if (chunk.getTile(x, y) === '.' && this.isAgainstWall(chunk, x, y)) {
              positions.push({ x, y });
            }
          }
        }
        
        if (positions.length > 0) {
          const pos = positions[Math.floor(rng.next() * positions.length)];
          chunk.setTile(pos.x, pos.y, 'C');
          
          params.features.chests.push({
            x: pos.x,
            y: pos.y,
            loot: this.generateLoot(rng, chunk.biome)
          });
        }
      }
    }
  }
  
  /**
   * Check if position is against a wall
   */
  isAgainstWall(chunk, x, y) {
    const adjacent = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 }
    ];
    
    for (const pos of adjacent) {
      if (pos.x >= 0 && pos.x < 24 && pos.y >= 0 && pos.y < 22) {
        if (chunk.getTile(pos.x, pos.y) === '#') {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Generate loot for a chest
   */
  generateLoot(rng, biome) {
    const lootTypes = ['gold', 'potion', 'weapon', 'armor', 'scroll'];
    const lootType = lootTypes[Math.floor(rng.next() * lootTypes.length)];
    
    return {
      type: lootType,
      amount: 1 + Math.floor(rng.next() * 5),
      quality: rng.next() < 0.1 ? 'rare' : 'common'
    };
  }
  
  /**
   * Place traps in corridors and rooms
   */
  placeTraps(chunk, rng, params, featureParams) {
    const corridors = params.corridors || [];
    const rooms = params.rooms || [];
    
    // Place traps in corridors
    for (const corridor of corridors) {
      if (rng.next() < featureParams.trapDensity && corridor.points) {
        const validPoints = corridor.points.filter(p => 
          chunk.getTile(p.x, p.y) === '.' || chunk.getTile(p.x, p.y) === '·'
        );
        
        if (validPoints.length > 0) {
          const pos = validPoints[Math.floor(rng.next() * validPoints.length)];
          chunk.setTile(pos.x, pos.y, '^');
          
          params.features.traps.push({
            x: pos.x,
            y: pos.y,
            type: this.getTrapType(rng),
            triggered: false
          });
        }
      }
    }
    
    // Place some traps in rooms
    for (const room of rooms) {
      if (rng.next() < featureParams.trapDensity * 0.5) {
        const x = room.x + 1 + Math.floor(rng.next() * (room.width - 2));
        const y = room.y + 1 + Math.floor(rng.next() * (room.height - 2));
        
        if (chunk.getTile(x, y) === '.') {
          chunk.setTile(x, y, '^');
          
          params.features.traps.push({
            x,
            y,
            type: this.getTrapType(rng),
            triggered: false
          });
        }
      }
    }
  }
  
  /**
   * Get a random trap type
   */
  getTrapType(rng) {
    const types = ['spike', 'pit', 'dart', 'fire', 'poison'];
    return types[Math.floor(rng.next() * types.length)];
  }
  
  /**
   * Place decorative features
   */
  placeDecorations(chunk, rng, params, featureParams) {
    const rooms = params.rooms || [];
    const decorations = featureParams.decorations;
    
    for (const room of rooms) {
      const numDecorations = Math.ceil(rng.next() * 3 * featureParams.decorationDensity) + 1;
      
      for (let i = 0; i < numDecorations; i++) {
        const x = room.x + Math.floor(rng.next() * room.width);
        const y = room.y + Math.floor(rng.next() * room.height);
        
        const tile = chunk.getTile(x, y);
        if (tile === '.' || tile === '·') {
          const decoration = decorations[Math.floor(rng.next() * decorations.length)];
          chunk.setTile(x, y, decoration);
          
          params.features.decorations.push({
            x,
            y,
            type: decoration,
            passable: decoration !== 'T' && decoration !== '#'
          });
        }
      }
    }
  }
  
  /**
   * Place stairs in appropriate locations
   */
  placeStairs(chunk, rng, params, featureParams) {
    const rooms = params.rooms || [];
    
    if (rooms.length > 0 && rng.next() < featureParams.stairChance) {
      // Place stairs in a room
      const room = rooms[Math.floor(rng.next() * rooms.length)];
      
      // Find a good position (not too close to edges)
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 10) {
        const x = room.x + 1 + Math.floor(rng.next() * Math.max(1, room.width - 2));
        const y = room.y + 1 + Math.floor(rng.next() * Math.max(1, room.height - 2));
        
        const tile = chunk.getTile(x, y);
        if (tile === '.' || tile === '·') {
          const stairType = rng.next() < 0.5 ? 'up' : 'down';
          const stairChar = stairType === 'up' ? '<' : '>';
          
          chunk.setTile(x, y, stairChar);
          
          params.features.stairs.push({
            x,
            y,
            type: stairType,
            destination: null // Will be set by world generator
          });
          placed = true;
        }
        attempts++;
      }
    }
  }
  
  /**
   * Apply Adventure Time biome features to chunk
   * @param {Chunk} chunk - Chunk to modify
   * @param {Object} features - Biome features from BiomeFeatureGenerator
   */
  applyBiomeFeatures(chunk, features) {
    if (!features) return;
    
    // Add NPCs from biome
    if (features.entities && chunk.npcs) {
      for (const entity of features.entities) {
        chunk.npcs.push({
          type: entity.type,
          x: entity.x,
          y: entity.y,
          behavior: entity.behavior
        });
      }
    }
    
    // Add resources/items from biome
    if (features.resources && chunk.items) {
      for (const resource of features.resources) {
        chunk.items.push({
          type: resource.type,
          x: resource.x,
          y: resource.y,
          amount: resource.amount,
          rarity: resource.rarity
        });
      }
    }
    
    // Add special features
    if (features.special && chunk.features) {
      for (const special of features.special) {
        chunk.features.push(special);
      }
    }
  }
  
  /**
   * Apply transition features for biome edges
   * @param {Chunk} chunk - Chunk to modify  
   * @param {Object} transitionFeatures - Features from BiomeTransitionManager
   */
  applyTransitionFeatures(chunk, transitionFeatures) {
    if (!transitionFeatures) return;
    
    // Get map dimensions safely
    const mapHeight = chunk.map?.length || 0;
    const mapWidth = chunk.map?.[0]?.length || 0;
    
    // Early return if map is invalid
    if (mapHeight === 0 || mapWidth === 0) {
      return;
    }
    
    // Get or create RNG for deterministic placement
    const rng = this.transitionRng || this.createSeededRandom(chunk.cx, chunk.cy);
    
    // Apply mixed decorations
    if (transitionFeatures.decorations) {
      for (const deco of transitionFeatures.decorations) {
        // Find a random empty spot
        const emptyTiles = [];
        for (let y = 0; y < mapHeight; y++) {
          for (let x = 0; x < mapWidth; x++) {
            if (chunk.map[y]?.[x] === '.' || chunk.map[y]?.[x] === '·') {
              emptyTiles.push({ x, y });
            }
          }
        }
        
        if (emptyTiles.length > 0) {
          const pos = emptyTiles[Math.floor(rng.next() * emptyTiles.length)];
          // Use simple decoration character
          if (chunk.map[pos.y] && chunk.map[pos.y][pos.x] !== undefined) {
            chunk.map[pos.y][pos.x] = '∘'; // Transition marker
          }
        }
      }
    }
    
    // Add transition entities (reduced count)
    if (transitionFeatures.entities && chunk.npcs) {
      for (const entity of transitionFeatures.entities) {
        // Place at random location using seeded RNG
        const x = Math.floor(rng.next() * mapWidth);
        const y = Math.floor(rng.next() * mapHeight);
        
        chunk.npcs.push({
          type: entity,
          x: x,
          y: y,
          behavior: 'wander'
        });
      }
    }
  }
}