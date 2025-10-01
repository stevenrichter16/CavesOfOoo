/**
 * FeatureStep - Applies features to chunk
 * Adds doors, chests, traps, decorations, and stairs
 * Integrates with Adventure Time biome features from Phase 5
 */

import { PipelineStep } from '../PipelineStep.js';
import { BiomeFeatureGenerator } from '../../biome/BiomeFeatureGenerator.js';
import { SeededRandom } from '../SeededRandom.js';
import * as constants from '../../biome/biome-constants.js';
import { getTerrainSystem } from '../../../systems/TerrainSystem.js';
import { getTileDef } from '../../TileRegistry.js';
import { glyphToTileId } from '../../tileUtils.js';

// Feature density by biome (including Adventure Time biomes)
const BIOME_FEATURE_PARAMS = {
  // Adventure Time biomes
  candy_kingdom: {
    chestDensity: 0.15,
    trapDensity: 0.02,
    decorationDensity: 0.3,
    doorChance: 0.8,
    stairChance: 0.1,
    decorations: [
      'decoration.candy.tree',
      'structure.training.statue',
      'structure.market.cart.support',
      'terrain.grass.scatter'
    ]
  },
  ice_kingdom: {
    chestDensity: 0.1,
    trapDensity: 0.08,
    decorationDensity: 0.25,
    doorChance: 0.7,
    stairChance: 0.08,
    decorations: [
      'decoration.snowman',
      'decoration.shrine.marker',
      'decoration.transition.marker',
      'floor.candy.polished'
    ]
  },
  fire_kingdom: {
    chestDensity: 0.12,
    trapDensity: 0.15,
    decorationDensity: 0.2,
    doorChance: 0.6,
    stairChance: 0.12,
    decorations: [
      'terrain.water.shallow',
      'floor.crosswalk.striped',
      'decoration.shrine.marker',
      'structure.building.block'
    ]
  },
  // Original biomes
  grassland: {
    chestDensity: 0.1,
    trapDensity: 0.05,
    decorationDensity: 0.2,
    doorChance: 0.7,
    stairChance: 0.1,
    decorations: [
      'material.candy.dust',
      'decoration.bush.generic',
      'floor.default',
      'floor.candy.polished'
    ]
  },
  // Alias for consistency with Adventure Time biomes
  grasslands: {
    chestDensity: 0.1,
    trapDensity: 0.05,
    decorationDensity: 0.2,
    doorChance: 0.7,
    stairChance: 0.1,
    decorations: [
      'material.candy.dust',
      'decoration.bush.generic',
      'floor.default',
      'floor.candy.polished'
    ]
  },
  forest: {
    chestDensity: 0.15,
    trapDensity: 0.08,
    decorationDensity: 0.3,
    doorChance: 0.6,
    stairChance: 0.1,
    decorations: [
      'decoration.tree.generic',
      'material.candy.dust',
      'decoration.bush.generic',
      'decoration.mushroom.cluster'
    ]
  },
  desert: {
    chestDensity: 0.05,
    trapDensity: 0.1,
    decorationDensity: 0.1,
    doorChance: 0.5,
    stairChance: 0.05,
    decorations: [
      'terrain.grass.scatter',
      'floor.candy.polished',
      'terrain.hazard.spikes'
    ]
  },
  tundra: {
    chestDensity: 0.08,
    trapDensity: 0.06,
    decorationDensity: 0.15,
    doorChance: 0.6,
    stairChance: 0.08,
    decorations: [
      'decoration.flower.patch',
      'floor.candy.polished',
      'decoration.crystal.cluster'
    ]
  },
  swamp: {
    chestDensity: 0.12,
    trapDensity: 0.15,
    decorationDensity: 0.25,
    doorChance: 0.5,
    stairChance: 0.05,
    decorations: [
      'terrain.water.shallow',
      'material.candy.dust',
      'decoration.mushroom.cluster',
      'decoration.bush.generic'
    ]
  },
  mountains: {
    chestDensity: 0.2,
    trapDensity: 0.12,
    decorationDensity: 0.1,
    doorChance: 0.8,
    stairChance: 0.9,
    decorations: [
      'terrain.hazard.spikes',
      'terrain.grass.scatter',
      'decoration.flower.patch'
    ]
  }
};

export class FeatureStep extends PipelineStep {
  constructor() {
    super('FeatureStep');
    this.terrainSystem = getTerrainSystem();
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
        const doorTileId = 'door.closed';
        chunk.setTile(candidate.x, candidate.y, doorTileId);
        params.features.doors.push({
          x: candidate.x,
          y: candidate.y,
          locked: rng.next() < 0.2,
          tileId: doorTileId,
          type: doorTileId
        });
      }
    }

    // Ensure at least one door if we have rooms
    if (params.features.doors.length === 0 && doorCandidates.length > 0) {
      const door = doorCandidates[Math.floor(rng.next() * doorCandidates.length)];
      const doorTileId = 'door.closed';
      chunk.setTile(door.x, door.y, doorTileId);
      params.features.doors.push({
        x: door.x,
        y: door.y,
        locked: false,
        tileId: doorTileId,
        type: doorTileId
      });
    }
  }
  
  /**
   * Check if a position is a good door candidate
   */
  isDoorCandidate(chunk, x, y) {
    const center = this.getTileInfo(chunk, x, y);
    if (!this.isFloorTile(center)) return false;

    const north = this.getTileInfo(chunk, x, y - 1);
    const south = this.getTileInfo(chunk, x, y + 1);
    const east = this.getTileInfo(chunk, x + 1, y);
    const west = this.getTileInfo(chunk, x - 1, y);

    const neighbors = [north, south, east, west];
    const walls = neighbors.filter(info => this.isWallTile(info)).length;
    const floors = neighbors.filter(info => this.isFloorTile(info)).length;

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
            const info = this.getTileInfo(chunk, x, y);
            if (this.isFloorTile(info) && this.isAgainstWall(chunk, x, y)) {
              positions.push({ x, y, tileInfo: info });
            }
          }
        }
        
        if (positions.length > 0) {
          const pos = positions[Math.floor(rng.next() * positions.length)];
          const chestTileId = 'container.chest.generic';
          chunk.setTile(pos.x, pos.y, chestTileId);
          
          params.features.chests.push({
            x: pos.x,
            y: pos.y,
            loot: this.generateLoot(rng, chunk.biome),
            tileId: chestTileId,
            type: chestTileId
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
      const info = this.getTileInfo(chunk, pos.x, pos.y);
      if (this.isWallTile(info)) {
        return true;
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
        const validPoints = corridor.points.filter(p => this.isFloorTile(this.getTileInfo(chunk, p.x, p.y)));

        if (validPoints.length > 0) {
          const pos = validPoints[Math.floor(rng.next() * validPoints.length)];
          const trapTileId = 'terrain.hazard.spikes';
          chunk.setTile(pos.x, pos.y, trapTileId);

          params.features.traps.push({
            x: pos.x,
            y: pos.y,
            type: this.getTrapType(rng),
            triggered: false,
            tileId: trapTileId
          });
        }
      }
    }
    
    // Place some traps in rooms
    for (const room of rooms) {
      if (rng.next() < featureParams.trapDensity * 0.5) {
        const x = room.x + 1 + Math.floor(rng.next() * (room.width - 2));
        const y = room.y + 1 + Math.floor(rng.next() * (room.height - 2));
        
        const tileInfo = this.getTileInfo(chunk, x, y);

        if (this.isFloorTile(tileInfo)) {
          const trapTileId = 'terrain.hazard.spikes';
          chunk.setTile(x, y, trapTileId);
          
          params.features.traps.push({
            x,
            y,
            type: this.getTrapType(rng),
            triggered: false,
            tileId: trapTileId
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
        
        const tileInfo = this.getTileInfo(chunk, x, y);
        if (this.isFloorTile(tileInfo)) {
          const decorationValue = decorations[Math.floor(rng.next() * decorations.length)];
          const decorationTileId = this.resolveTileId(decorationValue);
          chunk.setTile(x, y, decorationTileId);

          const decorationDef = this.safeGetTileDef(decorationTileId);
          const passable = decorationDef?.terrain ? decorationDef.terrain.passable !== false && decorationDef.terrain.moveCost !== Infinity : true;

          params.features.decorations.push({
            x,
            y,
            tileId: decorationTileId,
            type: decorationTileId,
            passable
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
        
        const tileInfo = this.getTileInfo(chunk, x, y);
        if (this.isFloorTile(tileInfo)) {
          const stairType = rng.next() < 0.5 ? 'up' : 'down';
          const stairTileId = stairType === 'up' ? 'legacy.glyph.<' : 'legacy.glyph.>';
          
          chunk.setTile(x, y, stairTileId);
          
          params.features.stairs.push({
            x,
            y,
            type: stairType,
            destination: null, // Will be set by world generator
            tileId: stairTileId
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
            const info = this.getTileInfo(chunk, x, y);
            if (this.isFloorTile(info)) {
              emptyTiles.push({ x, y });
            }
          }
        }

        if (emptyTiles.length > 0) {
          const pos = emptyTiles[Math.floor(rng.next() * emptyTiles.length)];
          if (chunk.map[pos.y] && chunk.map[pos.y][pos.x] !== undefined) {
            chunk.setTile(pos.x, pos.y, 'decoration.transition.marker');
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

  getTileInfo(chunk, x, y) {
    const mapHeight = chunk.map?.length ?? 0;
    const mapWidth = mapHeight > 0 ? (chunk.map[0]?.length ?? 0) : 0;

    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
      return { glyph: null, tileId: null, tileDef: null, outOfBounds: true };
    }

    const glyph = chunk.getTile(x, y);
    let tileId = typeof chunk.getTileId === 'function'
      ? chunk.getTileId(x, y)
      : chunk.tileIds?.[y]?.[x] ?? (glyph ? glyphToTileId(glyph, null) : null);

    let tileDef = null;
    if (tileId && !tileId.startsWith('legacy.')) {
      try {
        tileDef = getTileDef(tileId);
      } catch (err) {
        tileDef = null;
      }
    }

    return { glyph, tileId, tileDef, outOfBounds: false };
  }

  isWallTile(tileInfo) {
    if (!tileInfo) return false;
    if (tileInfo.outOfBounds) return true;

    const terrain = tileInfo.tileDef?.terrain;
    if (terrain) {
      if (!terrain.passable || terrain.moveCost === Infinity) {
        return true;
      }
      const name = (terrain.name || '').toLowerCase();
      if (name.includes('wall') || name.includes('cliff') || name.includes('rock')) {
        return true;
      }
      return false;
    }

    const tileId = tileInfo.tileId;
    if (tileId && !tileId.startsWith('legacy.')) {
      return tileId.includes('.wall') || tileId.includes('.cliff');
    }

    const glyph = tileId?.startsWith('legacy.glyph.')
      ? tileId.slice('legacy.glyph.'.length)
      : tileInfo.glyph;
    return glyph === '#' || glyph === '█' || glyph === '▓';
  }

  isFloorTile(tile, chunk = null, x = null, y = null) {
    let info = null;

    if (typeof tile === 'object' && tile && ('tileId' in tile || 'glyph' in tile || 'tileDef' in tile)) {
      info = tile;
    } else if (typeof tile === 'string') {
      const tileId = glyphToTileId(tile, null);
      let tileDef = null;
      if (tileId && !tileId.startsWith('legacy.')) {
        try {
          tileDef = getTileDef(tileId);
        } catch (err) {
          tileDef = null;
        }
      }
      info = { glyph: tile, tileId, tileDef, outOfBounds: false };
    } else if (chunk && Number.isInteger(x) && Number.isInteger(y)) {
      info = this.getTileInfo(chunk, x, y);
    }

    if (!info || info.outOfBounds) return false;

    const terrain = info.tileDef?.terrain;
    if (terrain) {
      if (!terrain.passable || terrain.moveCost === Infinity) return false;
      const name = (terrain.name || '').toLowerCase();
      if (name.includes('wall') || name.includes('rock')) return false;
      return true;
    }

    const tileId = info.tileId ?? (info.glyph ? glyphToTileId(info.glyph, null) : null);
    if (tileId) {
      if (!tileId.startsWith('legacy.')) {
        return !tileId.includes('.wall') && !tileId.includes('.cliff');
      }
      const glyph = tileId.slice('legacy.glyph.'.length);
      return glyph === '.' || glyph === '·' || glyph === ',' || glyph === '-' || glyph === '=';
    }

    const glyph = info.glyph;
    return glyph === '.' || glyph === '·' || glyph === ',' || glyph === '-' || glyph === '=';
  }

  resolveTileId(value) {
    if (!value) return null;
    if (typeof value === 'string' && value.length === 1) {
      const tileId = glyphToTileId(value, null);
      if (tileId) return tileId;
      return `legacy.glyph.${value}`;
    }
    return value;
  }

  safeGetTileDef(tileId) {
    if (!tileId || tileId.startsWith('legacy.')) return null;
    try {
      return getTileDef(tileId);
    } catch (err) {
      return null;
    }
  }
}
