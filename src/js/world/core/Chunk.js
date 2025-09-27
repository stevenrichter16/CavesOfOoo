/**
 * Chunk Data Model
 * Core representation of a single chunk in the world
 */

import { getTerrainSystem } from '../../systems/TerrainSystem.js';
import { glyphToTileId } from '../tileUtils.js';
import { getTileDef } from '../TileRegistry.js';

// Chunk dimensions - must match existing system
export const CHUNK_WIDTH = 24;
export const CHUNK_HEIGHT = 22;

// Tile type constants
export const TILE_TYPES = {
  WALL: '#',
  FLOOR: '.',
  FLOOR_ALT: '·',
  WATER: '~'
};

/**
 * Represents a single chunk in the game world
 */
export class Chunk {
  /**
   * Create a new chunk
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @throws {TypeError} If coordinates are not integers
   */
  constructor(cx, cy) {
    // Validate coordinates
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) {
      throw new TypeError('Chunk coordinates must be integers');
    }
    
    // Make coordinates immutable
    Object.defineProperty(this, 'cx', {
      value: cx,
      writable: false,
      enumerable: true,
      configurable: false
    });
    
    Object.defineProperty(this, 'cy', {
      value: cy,
      writable: false,
      enumerable: true,
      configurable: false
    });
    
    // Initialize map with wall tiles
    this.map = Array(CHUNK_HEIGHT).fill(null).map(() => 
      Array(CHUNK_WIDTH).fill(TILE_TYPES.WALL)
    );
    const defaultWallId = glyphToTileId(TILE_TYPES.WALL, 'wall.stone.solid');
    this.tileIds = Array(CHUNK_HEIGHT).fill(null).map(() => 
      Array(CHUNK_WIDTH).fill(defaultWallId)
    );
    
    // Entity arrays with custom push to maintain spatial index
    this.monsters = [];
    this.items = [];
    this.npcs = [];
    
    // Override push methods for backward compatibility
    this._setupArrayOverrides();
    
    // Spatial index for O(1) entity lookups
    this._entityIndex = new Map(); // "x,y" -> Set of entities
    
    // Cache for expensive operations
    this._emptyTilesCache = null;
    this._cacheValid = false;
    
    // Chunk metadata
    this.biome = null;
    this.special = null;  // For special/unique chunks like candy_market
    this.features = [];   // List of applied features
    this.metadata = {};   // Extensible metadata storage
    
    // Temporary modifications tracking for events
    this.temporaryModifications = {};
  }
  
  /**
   * Get tile at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string|null} Tile character or null if out of bounds
   */
  getTile(x, y) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT) {
      return null;
    }
    // Handle corrupted map rows
    if (!this.map[y] || !Array.isArray(this.map[y])) {
      return null;
    }
    return this.map[y][x];
  }
  
  /**
   * Set tile at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} tile - Tile character to set
   * @throws {TypeError} If tile is not a single character
   * @returns {boolean} True if tile was set, false if out of bounds
   */
  setTile(x, y, tile) {
    if (typeof tile !== 'string' || tile.length === 0) {
      throw new TypeError('Tile must be a non-empty string');
    }
    
    // Validate coordinates are numbers
    x = Number(x);
    y = Number(y);
    
    if (isNaN(x) || isNaN(y)) {
      console.warn(`Invalid coordinates for setTile: (${x}, ${y})`);
      return false;
    }
    
    if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT) {
      this._ensureRowIntegrity(y);

      let tileId;
      let glyph;

      if (tile.length === 1) {
        glyph = tile;
        tileId = glyphToTileId(glyph, null);
        if (!tileId) {
          tileId = `legacy.glyph.${glyph}`;
        }
      } else {
        if (tile.startsWith('legacy.glyph.')) {
          tileId = tile;
          glyph = tile.slice('legacy.glyph.'.length) || '.';
        } else {
          tileId = tile;
          try {
            const def = getTileDef(tileId);
            glyph = def.glyph;
          } catch (err) {
            console.warn(`Chunk.setTile: unknown tile id '${tileId}', defaulting to '.'`);
            glyph = '.';
          }
        }
      }

      if (typeof glyph !== 'string' || glyph.length !== 1) {
        console.warn(`Chunk.setTile: invalid glyph derived for '${tile}', defaulting to '.'`);
        glyph = '.';
      }

      this.map[y][x] = glyph;
      if (!this.tileIds) {
        this.tileIds = Array(CHUNK_HEIGHT).fill(null).map(() => Array(CHUNK_WIDTH).fill(glyphToTileId('.', 'floor.default')));
      }
      if (!this.tileIds[y]) {
        this.tileIds[y] = Array(CHUNK_WIDTH).fill(glyphToTileId('.', 'floor.default'));
      }
      this.tileIds[y][x] = tileId;
      this._invalidateCache();
      return true;
    }
    
    // Out of bounds
    return false;
  }

  getTileId(x, y) {
    x = Number(x);
    y = Number(y);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    if (y < 0 || y >= CHUNK_HEIGHT || x < 0 || x >= CHUNK_WIDTH) return null;

    const tileId = this.tileIds?.[y]?.[x];
    if (tileId) return tileId;

    const glyph = this.getTile(x, y);
    if (!glyph) return null;
    return glyphToTileId(glyph, null);
  }

  _ensureRowIntegrity(y) {
    if (!this.map[y] || !Array.isArray(this.map[y])) {
      this.map[y] = Array(CHUNK_WIDTH).fill(TILE_TYPES.WALL);
    }
    if (!this.tileIds) {
      const defaultId = glyphToTileId(TILE_TYPES.WALL, 'wall.stone.solid');
      this.tileIds = Array(CHUNK_HEIGHT).fill(null).map(() => Array(CHUNK_WIDTH).fill(defaultId));
    }
    if (!this.tileIds[y] || !Array.isArray(this.tileIds[y])) {
      const defaultId = glyphToTileId(TILE_TYPES.WALL, 'wall.stone.solid');
      this.tileIds[y] = Array(CHUNK_WIDTH).fill(defaultId);
    }
  }
  
  /**
   * Check if a tile is passable
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if tile is passable
   */
  isPassable(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    const terrain = getTerrainSystem();
    return terrain.isPassable(tile);
  }
  
  /**
   * Check if there's an entity at position
   * O(1) performance using spatial index
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if entity exists at position
   */
  hasEntityAt(x, y) {
    const key = this._getPositionKey(x, y);
    const entities = this._entityIndex.get(key);
    return entities ? entities.size > 0 : false;
  }
  
  /**
   * Find all empty (passable and unoccupied) tiles
   * Uses caching for performance
   * @returns {Array<{x: number, y: number}>} Array of empty tile coordinates
   */
  findEmptyTiles() {
    if (this._cacheValid && this._emptyTilesCache) {
      return this._emptyTilesCache;
    }
    
    const tiles = [];
    
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        if (this.isPassable(x, y) && !this.hasEntityAt(x, y)) {
          tiles.push({ x, y });
        }
      }
    }
    
    this._emptyTilesCache = tiles;
    this._cacheValid = true;
    return tiles;
  }
  
  /**
   * Add a monster to the chunk
   * @param {Object} monster - Monster object with x, y, alive properties
   */
  addMonster(monster) {
    // push will handle spatial index via override
    this.monsters.push(monster);
    // No need to add to index again - push override handles it
    // Just invalidate cache
    this._invalidateCache();
  }
  
  /**
   * Add an NPC to the chunk
   * @param {Object} npc - NPC object with x, y properties
   */
  addNPC(npc) {
    // push will handle spatial index via override
    this.npcs.push(npc);
    // No need to add to index again - push override handles it
    // Just invalidate cache
    this._invalidateCache();
  }
  
  /**
   * Update entity state (e.g., when monster dies)
   * @param {Object} entity - Entity to update
   */
  updateEntity(entity) {
    // Remove from index if monster died
    if ('alive' in entity && !entity.alive) {
      this._removeFromIndex(entity);
    }
    this._invalidateCache();
  }
  
  /**
   * Move an entity to a new position
   * @param {Object} entity - Entity to move
   * @param {number} newX - New X coordinate
   * @param {number} newY - New Y coordinate
   * @returns {boolean} True if move was successful, false if out of bounds
   */
  moveEntity(entity, newX, newY) {
    // Validate new position is within bounds
    if (newX < 0 || newX >= CHUNK_WIDTH || 
        newY < 0 || newY >= CHUNK_HEIGHT) {
      console.warn(`Cannot move entity to (${newX}, ${newY}) - outside chunk bounds`);
      return false;
    }
    
    this._removeFromIndex(entity);
    entity.x = newX;
    entity.y = newY;
    if (!('alive' in entity) || entity.alive) {
      this._addToIndex(entity);
    }
    this._invalidateCache();
    return true;
  }
  
  /**
   * Get position key for spatial index
   * @private
   */
  _getPositionKey(x, y) {
    return `${x},${y}`;
  }
  
  /**
   * Add entity to spatial index
   * @private
   */
  _addToIndex(entity) {
    // Validate entity has valid coordinates
    if (entity.x === undefined || entity.y === undefined) {
      return; // Skip entities without position
    }
    
    // Validate entity is within bounds
    if (entity.x < 0 || entity.x >= CHUNK_WIDTH || 
        entity.y < 0 || entity.y >= CHUNK_HEIGHT) {
      console.warn(`Entity at (${entity.x}, ${entity.y}) is outside chunk bounds`);
      return; // Skip out-of-bounds entities
    }
    
    const key = this._getPositionKey(entity.x, entity.y);
    if (!this._entityIndex.has(key)) {
      this._entityIndex.set(key, new Set());
    }
    this._entityIndex.get(key).add(entity);
  }
  
  /**
   * Remove entity from spatial index
   * @private
   */
  _removeFromIndex(entity) {
    // Validate entity has valid coordinates
    if (entity.x === undefined || entity.y === undefined) {
      return; // Skip entities without position
    }
    
    const key = this._getPositionKey(entity.x, entity.y);
    const entities = this._entityIndex.get(key);
    if (entities) {
      entities.delete(entity);
      if (entities.size === 0) {
        this._entityIndex.delete(key);
      }
    }
  }
  
  /**
   * Invalidate cached data
   * @private
   */
  _invalidateCache() {
    this._cacheValid = false;
    this._emptyTilesCache = null;
  }
  
  /**
   * Setup array overrides for backward compatibility
   * @private
   */
  _setupArrayOverrides() {
    const chunk = this;
    
    // Create custom arrays that maintain spatial index
    const originalMonstersPush = Array.prototype.push;
    Object.defineProperty(this.monsters, 'push', {
      value: function(...entities) {
        const result = originalMonstersPush.apply(this, entities);
        entities.forEach(entity => {
          if (entity.alive && entity.x !== undefined && entity.y !== undefined) {
            chunk._addToIndex(entity);
          }
        });
        chunk._invalidateCache();
        return result;
      },
      enumerable: false,
      configurable: true
    });
    
    const originalNPCsPush = Array.prototype.push;
    Object.defineProperty(this.npcs, 'push', {
      value: function(...entities) {
        const result = originalNPCsPush.apply(this, entities);
        entities.forEach(entity => {
          if (entity.x !== undefined && entity.y !== undefined) {
            chunk._addToIndex(entity);
          }
        });
        chunk._invalidateCache();
        return result;
      },
      enumerable: false,
      configurable: true
    });
  }
}
