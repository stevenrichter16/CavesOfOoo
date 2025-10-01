/**
 * MovementCostCalculator - Calculates movement costs based on terrain, status effects, and equipment
 * Provides accurate cost estimation for pathfinding and movement validation
 */

import { getTerrainSystem } from '../systems/TerrainSystem.js';

// Configuration constants
export const MOVEMENT_COST_CONFIG = {
  defaultTerrainCosts: {
    ground: 1,
    grass: 1,
    stone: 1,
    water: 2,
    mud: 3,
    ice: 1.5,
    sand: 1.5,
    lava: 5,
    swamp: 2.5,
    snow: 1.8
  },
  statusModifiers: {
    speed: 0.5,
    haste: 0.75,
    slow: 2,
    wet: 1.5,
    frozen: 3,
    burning: 1.2,
    exhausted: 1.5
  },
  equipmentModifiers: {
    water_walking: { terrain: 'water', multiplier: 0.5 },
    ice_cleats: { terrain: 'ice', multiplier: 0.67 },
    fire_boots: { terrain: 'lava', multiplier: 0.4 },
    swamp_boots: { terrain: 'swamp', multiplier: 0.6 },
    snow_shoes: { terrain: 'snow', multiplier: 0.55 }
  },
  entityCosts: {
    ally: 2,
    neutral: 3,
    enemy: Infinity
  },
  diagonalMultiplier: Math.sqrt(2)
};

export class MovementCostCalculator {
  /**
   * Create a new movement cost calculator
   * @param {Object} options - Configuration options
   * @param {Object} options.terrainCosts - Custom terrain cost mappings
   */
  constructor(options = {}) {
    this.terrainCosts = {
      ...MOVEMENT_COST_CONFIG.defaultTerrainCosts,
      ...(options.terrainCosts || {})
    };
    
    // Cache for calculated costs
    this.cache = new Map();
    this.cacheGeneration = 0;
  }

  /**
   * Calculate movement cost between two positions
   * @param {Object} from - Starting position {x, y}
   * @param {Object} to - Target position {x, y}
   * @param {Object} state - Game state
   * @returns {number} Movement cost
   */
  calculateMoveCost(from, to, state) {
    if (!state) {
      throw new Error('State is required for cost calculation');
    }

    // Check if moving to same position
    if (from.x === to.x && from.y === to.y) {
      return 0;
    }

    // Check cache
    const cacheKey = `${from.x},${from.y}-${to.x},${to.y}-${this.cacheGeneration}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Get base terrain cost
    const { tile, terrainType } = this.getTileContext(state, to.x, to.y);
    let cost = this.getTerrainCost(terrainType, tile);

    // Apply diagonal movement multiplier
    const isDiagonal = from.x !== to.x && from.y !== to.y;
    if (isDiagonal) {
      cost *= MOVEMENT_COST_CONFIG.diagonalMultiplier;
    }

    // Apply status effect modifiers
    cost = this.applyStatusModifiers(cost, state);

    // Apply equipment modifiers
    cost = this.applyEquipmentModifiers(cost, terrainType, state);

    // Check for entity blocking
    const entityKey = `${to.x},${to.y}`;
    if (state.entities && state.entities.has(entityKey)) {
      const entity = state.entities.get(entityKey);
      cost *= this.getEntityCostMultiplier(entity);
    }

    // Cache the result
    this.cache.set(cacheKey, cost);

    return cost;
  }

  /**
   * Get terrain cost for a specific terrain type
   * @param {string} terrain - Terrain type or tile identifier
   * @param {string|null} tile - Optional raw tile id/glyph
   * @returns {number} Terrain cost multiplier
   */
  getTerrainCost(terrain, tile = null) {
    const terrainKey = this.resolveTerrainType(terrain);

    if (terrainKey && this.terrainCosts[terrainKey] !== undefined) {
      return this.terrainCosts[terrainKey];
    }

    const terrainSystem = getTerrainSystem();
    const moveCost = terrainSystem.getMoveCost(tile ?? terrain);
    if (typeof moveCost === 'number' && !Number.isNaN(moveCost)) {
      return moveCost;
    }

    return this.terrainCosts.ground || 1;
  }

  /**
   * Apply status effect modifiers to movement cost
   * @param {number} baseCost - Base movement cost
   * @param {Object} state - Game state
   * @returns {number} Modified cost
   */
  applyStatusModifiers(baseCost, state) {
    if (!state.player || !state.player.statuses) {
      return baseCost;
    }

    let multiplier = 1;
    
    for (const status of state.player.statuses) {
      if (MOVEMENT_COST_CONFIG.statusModifiers[status]) {
        multiplier *= MOVEMENT_COST_CONFIG.statusModifiers[status];
      }
    }

    return baseCost * multiplier;
  }

  /**
   * Apply equipment modifiers to movement cost
   * @param {number} baseCost - Base movement cost
   * @param {string} terrain - Terrain type
   * @param {Object} state - Game state
   * @returns {number} Modified cost
   */
  applyEquipmentModifiers(baseCost, terrain, state) {
    if (!state.player || !state.player.equipment || !state.player.equipment.boots) {
      return baseCost;
    }

    const bootType = state.player.equipment.boots.type;
    const modifier = MOVEMENT_COST_CONFIG.equipmentModifiers[bootType];

    if (modifier && modifier.terrain === terrain) {
      return baseCost * modifier.multiplier;
    }

    return baseCost;
  }

  /**
   * Get cost multiplier for moving through entity
   * @param {Object} entity - Entity at target position
   * @returns {number} Cost multiplier
   */
  getEntityCostMultiplier(entity) {
    if (!entity || !entity.type) {
      return 1;
    }

    return MOVEMENT_COST_CONFIG.entityCosts[entity.type] || 1;
  }

  /**
   * Invalidate the cache (call when state changes significantly)
   */
  invalidateCache() {
    this.cache.clear();
    this.cacheGeneration++;
  }

  /**
   * Get estimated cost for a path
   * @param {Array} path - Array of positions
   * @param {Object} state - Game state
   * @returns {number} Total path cost
   */
  getPathCost(path, state) {
    if (!path || path.length < 2) {
      return 0;
    }

    let totalCost = 0;
    for (let i = 1; i < path.length; i++) {
      totalCost += this.calculateMoveCost(path[i - 1], path[i], state);
    }

    return totalCost;
  }

  /**
   * Check if movement is possible (finite cost)
   * @param {Object} from - Starting position
   * @param {Object} to - Target position
   * @param {Object} state - Game state
   * @returns {boolean} True if movement is possible
   */
  canMove(from, to, state) {
    const cost = this.calculateMoveCost(from, to, state);
    return cost !== Infinity;
  }

  getTileContext(state, x, y) {
    const chunk = state?.chunk;
    if (!chunk) {
      return { tile: null, terrainType: this.resolveTerrainType('ground') };
    }

    let tileId = null;
    if (typeof chunk.getTileId === 'function') {
      tileId = chunk.getTileId(x, y);
    }
    if (!tileId && chunk.tileIds && chunk.tileIds[y] && chunk.tileIds[y][x]) {
      tileId = chunk.tileIds[y][x];
    }

    let rawTile = tileId;
    if (!rawTile && typeof chunk.getTile === 'function') {
      rawTile = chunk.getTile(x, y);
    }

    if (!rawTile && tileId && tileId.startsWith('legacy.glyph.')) {
      rawTile = tileId.slice('legacy.glyph.'.length) || null;
    }

    const terrainType = this.resolveTerrainType(rawTile || tileId);

    return {
      tile: rawTile || tileId,
      terrainType
    };
  }

  resolveTerrainType(value) {
    if (!value) {
      return 'ground';
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();

      if (this.terrainCosts[normalized] !== undefined) {
        return normalized;
      }

      const alias = this.matchTerrainAlias(normalized);
      if (alias) {
        return alias;
      }

      if (normalized.startsWith('legacy.glyph.')) {
        const glyph = normalized.slice('legacy.glyph.'.length) || null;
        if (glyph) {
          return this.resolveTerrainType(glyph);
        }
      }
    }

    const terrainSystem = getTerrainSystem();
    const resolved = terrainSystem.resolveTerrain(value);
    const name = resolved?.name ? resolved.name.toLowerCase() : null;
    if (name) {
      if (name === 'floor') {
        return 'ground';
      }
      return this.matchTerrainAlias(name) || name;
    }

    if (typeof value === 'string' && value.length === 1) {
      const charAlias = this.matchTerrainAliasFromGlyph(value);
      if (charAlias) {
        return charAlias;
      }
    }

    return 'ground';
  }

  matchTerrainAlias(normalized) {
    if (!normalized) return null;
    if (normalized === 'floor' || normalized === 'road') return 'ground';
    if (normalized.includes('water')) return 'water';
    if (normalized.includes('mud')) return 'mud';
    if (normalized.includes('lava')) return 'lava';
    if (normalized.includes('swamp')) return 'swamp';
    if (normalized.includes('snow')) return 'snow';
    if (normalized.includes('ice')) return 'ice';
    if (normalized.includes('sand')) return 'sand';
    if (normalized.includes('ground')) return 'ground';
    return null;
  }

  matchTerrainAliasFromGlyph(glyph) {
    switch (glyph) {
      case '.':
      case '·':
      case '=':
        return 'ground';
      case '~':
        return 'water';
      case 'm':
        return 'mud';
      case 'i':
        return 'ice';
      case 's':
        return 'sand';
      case 'l':
        return 'lava';
      default:
        return null;
    }
  }
}

// Factory function for creating movement cost calculator
let _movementCostCalculator = null;

/**
 * Get or create the movement cost calculator instance
 * @param {Object} options - Configuration options
 * @returns {MovementCostCalculator} The calculator instance
 */
export function getMovementCostCalculator(options = {}) {
  if (!_movementCostCalculator) {
    _movementCostCalculator = new MovementCostCalculator(options);
  }
  return _movementCostCalculator;
}

/**
 * Reset the movement cost calculator (useful for testing)
 */
export function resetMovementCostCalculator() {
  _movementCostCalculator = null;
}
