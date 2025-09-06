/**
 * TerrainSystem - Manages terrain types and their properties
 * Handles movement costs, passability, vision blocking, and terrain effects
 */
import { getGameEventBus } from './EventBus.js';

// Configuration constants
export const TERRAIN_CONFIG = {
  damage: {
    spikes: 1,
    lava: 3
  },
  effects: {
    waterSlowReduction: 2,
    waterSlowDuration: 3
  },
  defaults: {
    moveCost: 1,
    passable: true,
    blocksVision: false
  }
};

export class TerrainSystem {
  constructor(eventBus = null) {
    this.eventBus = eventBus || getGameEventBus();
    this.terrainTypes = new Map();
    this.registerDefaultTerrains();
  }

  /**
   * Register default terrain types
   * @private
   */
  registerDefaultTerrains() {
    // Floor - basic walkable terrain
    this.registerTerrain('.', {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'floor',
      description: 'Stone floor worn smooth by countless footsteps'
    });

    // Wall - impassable, blocks vision
    this.registerTerrain('#', {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'wall',
      description: 'Solid stone wall'
    });

    // Water - walkable but slow
    this.registerTerrain('~', {
      passable: true,
      moveCost: 2,
      blocksVision: false,
      name: 'water',
      description: 'Shallow water that slows movement',
      onEnter: (state, x, y) => {
        if (!state.player) return;
        
        // Emit cleanup event to remove expired effects
        this.eventBus.emit('CleanupStatusEffects', {
          entity: state.player,
          filter: (e) => e.type !== 'water_slow' || e.duration > 0
        });
        
        // Emit event to apply water slow effect
        this.eventBus.emit('StatusEffectApplied', {
          entity: state.player,
          effect: {
            type: 'water_slow',
            duration: 0, // Permanent while in water
            speedReduction: TERRAIN_CONFIG.effects.waterSlowReduction
          }
        });
        
        if (state.log) {
          state.log('You wade into the water. Your movement slows.', 'note');
        }
      },
      onExit: (state, x, y) => {
        if (!state.player) return;
        
        // Emit event to update water_slow duration
        this.eventBus.emit('StatusEffectUpdated', {
          entity: state.player,
          effectType: 'water_slow',
          update: { duration: TERRAIN_CONFIG.effects.waterSlowDuration }
        });
        
        if (state.log) {
          state.log('You emerge from the water, still dripping wet.', 'note');
        }
      }
    });

    // Door - can be opened
    this.registerTerrain('+', {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'door',
      description: 'A closed door'
    });

    // Spikes - damages on entry
    this.registerTerrain('^', {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'spikes',
      description: 'Sharp spikes jutting from the floor',
      onEnter: (state, x, y) => {
        if (!state.player) return;
        
        // Emit damage event instead of direct mutation
        this.eventBus.emit('DamageDealt', {
          source: 'terrain_spikes',
          target: state.player,
          amount: TERRAIN_CONFIG.damage.spikes,
          type: 'physical'
        });
        
        if (state.log) {
          state.log('Ouch! You step on spikes!', 'bad');
        }
      }
    });

    // Candy dust - special material effect
    this.registerTerrain('%', {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'candy dust',
      description: 'Sparkling candy dust covers the floor',
      onEnter: (state, x, y) => {
        if (state.log) {
          state.log('The candy dust sparkles beneath your feet.', 'magic');
        }
        // Emit event for material system to handle
        this.eventBus.emit('MaterialInteraction', {
          entity: state.player,
          material: 'candy_dust',
          position: { x, y }
        });
      }
    });
  }

  /**
   * Register a new terrain type or override existing one
   * @param {string} tile - The character representing this terrain
   * @param {Object} config - Terrain configuration
   */
  registerTerrain(tile, config) {
    this.terrainTypes.set(tile, {
      passable: config.passable ?? TERRAIN_CONFIG.defaults.passable,
      moveCost: config.moveCost ?? TERRAIN_CONFIG.defaults.moveCost,
      onEnter: config.onEnter ?? null,
      onExit: config.onExit ?? null,
      effect: config.effect ?? null,
      blocksVision: config.blocksVision ?? TERRAIN_CONFIG.defaults.blocksVision,
      name: config.name ?? tile,
      description: config.description ?? 'Unknown terrain'
    });
  }

  /**
   * Get movement cost for a terrain type
   * @param {string} tile - Terrain character
   * @returns {number} Movement cost (1 = normal, higher = slower, Infinity = impassable)
   */
  getMoveCost(tile) {
    if (!tile) return 1;
    return this.terrainTypes.get(tile)?.moveCost ?? 1;
  }

  /**
   * Check if terrain is passable
   * @param {string} tile - Terrain character
   * @returns {boolean} True if passable
   */
  isPassable(tile) {
    if (!tile) return false;
    return this.terrainTypes.get(tile)?.passable ?? false;
  }

  /**
   * Check if terrain blocks vision
   * @param {string} tile - Terrain character
   * @returns {boolean} True if blocks vision
   */
  blocksVision(tile) {
    if (!tile) return false;
    return this.terrainTypes.get(tile)?.blocksVision ?? false;
  }

  /**
   * Get terrain at specific coordinates
   * @param {Object} state - Game state
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string|null} Terrain character or null if out of bounds
   */
  getTerrainAt(state, x, y) {
    // Validate inputs
    if (!state?.chunk?.map) return null;
    if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
    
    const map = state.chunk.map;
    // Additional bounds validation
    if (!Array.isArray(map) || map.length === 0) return null;
    if (y < 0 || y >= map.length) return null;
    if (!Array.isArray(map[y])) return null;
    if (x < 0 || x >= map[y].length) return null;
    
    return map[y][x];
  }

  /**
   * Get full terrain information
   * @param {string} tile - Terrain character
   * @returns {Object} Full terrain configuration
   */
  getTerrainInfo(tile) {
    if (!tile || !this.terrainTypes.has(tile)) {
      return {
        passable: false,
        moveCost: 1,
        blocksVision: false,
        name: 'unknown',
        description: 'Unknown terrain',
        onEnter: null,
        onExit: null,
        effect: null
      };
    }
    
    return { ...this.terrainTypes.get(tile) };
  }

  /**
   * Handle entering a tile
   * @param {Object} state - Game state
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  onEnterTile(state, x, y) {
    const tile = this.getTerrainAt(state, x, y);
    if (!tile) return;
    
    const terrain = this.terrainTypes.get(tile);
    if (terrain?.onEnter) {
      // onEnter is now synchronous
      terrain.onEnter(state, x, y);
    }
  }

  /**
   * Handle exiting a tile
   * @param {Object} state - Game state
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  onExitTile(state, x, y) {
    const tile = this.getTerrainAt(state, x, y);
    if (!tile) return;
    
    const terrain = this.terrainTypes.get(tile);
    if (terrain?.onExit) {
      // onExit is now synchronous
      terrain.onExit(state, x, y);
    }
  }
}

// Factory function for creating terrain system
let _terrainSystem = null;

/**
 * Get or create the terrain system instance
 * @param {EventBus} eventBus - Optional event bus
 * @returns {TerrainSystem} The terrain system instance
 */
export function getTerrainSystem(eventBus = null) {
  if (!_terrainSystem) {
    _terrainSystem = new TerrainSystem(eventBus);
  }
  return _terrainSystem;
}

/**
 * Reset the terrain system (useful for testing)
 */
export function resetTerrainSystem() {
  _terrainSystem = null;
}