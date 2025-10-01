import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MovementCostCalculator } from '../../src/js/pathfinding/MovementCostCalculator.js';
import { getTerrainSystem, resetTerrainSystem } from '../../src/js/systems/TerrainSystem.js';
import { getTileByGlyph } from '../../src/js/world/TileRegistry.js';

function createTestChunk(glyphGrid, glyphOverrides = {}) {
  const height = glyphGrid.length;
  const width = glyphGrid[0].length;

  const map = glyphGrid.map(row => [...row]);
  const tileIds = glyphGrid.map(row => row.map(glyph => {
    const override = glyphOverrides[glyph];
    if (override) {
      return override;
    }
    return getTileByGlyph(glyph) || `legacy.glyph.${glyph}`;
  }));

  return {
    width,
    height,
    map,
    tileIds,
    getTile(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        return null;
      }
      return map[y][x];
    },
    getTileId(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        return null;
      }
      return tileIds[y][x];
    },
    isPassable(x, y) {
      const terrainSystem = getTerrainSystem();
      const tile = this.getTileId(x, y) || this.getTile(x, y);
      return terrainSystem.isPassable(tile);
    },
    setGlyph(x, y, glyph) {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        return;
      }
      map[y][x] = glyph;
      const override = glyphOverrides[glyph];
      tileIds[y][x] = override || getTileByGlyph(glyph) || `legacy.glyph.${glyph}`;
    }
  };
}

describe('MovementCostCalculator', () => {
  let calculator;
  let mockState;

  beforeEach(() => {
    resetTerrainSystem();
    calculator = new MovementCostCalculator();

    const terrainSystem = getTerrainSystem();
    terrainSystem.registerTerrain('m', {
      passable: true,
      moveCost: 3,
      blocksVision: false,
      name: 'mud'
    });
    terrainSystem.registerTerrain('i', {
      passable: true,
      moveCost: 1.5,
      blocksVision: false,
      name: 'ice'
    });
    terrainSystem.registerTerrain('l', {
      passable: true,
      moveCost: 5,
      blocksVision: false,
      name: 'lava'
    });

    const glyphGrid = [
      ['.', '.', '.', '.', '.'],
      ['.', 'i', '.', '.', '.'],
      ['.', '.', '~', '.', '.'],
      ['.', '.', '.', 'm', '.'],
      ['.', '.', '.', '.', 'l']
    ];

    mockState = {
      chunk: createTestChunk(glyphGrid, {
        i: 'legacy.glyph.i',
        m: 'legacy.glyph.m',
        l: 'legacy.glyph.l'
      }),
      player: {
        statuses: new Set(),
        equipment: {
          boots: null
        }
      },
      entities: new Map()
    };
  });

  afterEach(() => {
    resetTerrainSystem();
  });

  describe('constructor', () => {
    it('should initialize with default terrain costs', () => {
      expect(calculator.terrainCosts).toBeDefined();
      expect(calculator.terrainCosts.ground).toBe(1);
      expect(calculator.terrainCosts.water).toBe(2);
      expect(calculator.terrainCosts.mud).toBe(3);
    });

    it('should accept custom terrain costs', () => {
      const customCalculator = new MovementCostCalculator({
        terrainCosts: {
          ground: 1,
          water: 5,
          mud: 10
        }
      });

      expect(customCalculator.terrainCosts.water).toBe(5);
      expect(customCalculator.terrainCosts.mud).toBe(10);
    });
  });

  describe('calculateMoveCost', () => {
    it('should return base cost for ground terrain', () => {
      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(1);
    });

    it('should return higher cost for water terrain', () => {
      const cost = calculator.calculateMoveCost(
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        mockState
      );

      expect(cost).toBe(2);
    });

    it('should return higher cost for mud terrain', () => {
      const cost = calculator.calculateMoveCost(
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        mockState
      );

      expect(cost).toBe(3);
    });

    it('should apply diagonal movement multiplier', () => {
      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        mockState
      );

      expect(cost).toBeCloseTo(2.121, 2);
    });

    it('should combine terrain and diagonal costs', () => {
      const cost = calculator.calculateMoveCost(
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        mockState
      );

      expect(cost).toBeCloseTo(2 * 1.414, 2);
    });
  });

  describe('status effects', () => {
    it('should reduce cost with speed boost', () => {
      mockState.player.statuses.add('speed');

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(0.5);
    });

    it('should increase cost with slow effect', () => {
      mockState.player.statuses.add('slow');

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(2);
    });

    it('should handle multiple status effects', () => {
      mockState.player.statuses.add('slow');
      mockState.player.statuses.add('wet');

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(3);
    });
  });

  describe('equipment modifiers', () => {
    it('should reduce water cost with water walking boots', () => {
      mockState.player.equipment.boots = { type: 'water_walking' };

      const cost = calculator.calculateMoveCost(
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        mockState
      );

      expect(cost).toBe(1);
    });

    it('should reduce ice cost with ice cleats', () => {
      mockState.player.equipment.boots = { type: 'ice_cleats' };

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        mockState
      );

      expect(cost).toBeCloseTo(1, 1);
    });

    it('should reduce lava damage with fire boots', () => {
      mockState.player.equipment.boots = { type: 'fire_boots' };

      const cost = calculator.calculateMoveCost(
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        mockState
      );

      expect(cost).toBe(2);
    });
  });

  describe('entity blocking', () => {
    it('should increase cost when moving through ally', () => {
      const ally = { type: 'ally', x: 1, y: 0 };
      mockState.entities.set('1,0', ally);

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(2);
    });

    it('should return infinity for enemy blocking', () => {
      const enemy = { type: 'enemy', x: 1, y: 0 };
      mockState.entities.set('1,0', enemy);

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(Infinity);
    });

    it('should handle neutral entities', () => {
      const neutral = { type: 'neutral', x: 1, y: 0 };
      mockState.entities.set('1,0', neutral);

      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );

      expect(cost).toBe(3);
    });
  });

  describe('getTerrainCost', () => {
    it('should return cost for known terrain', () => {
      expect(calculator.getTerrainCost('water')).toBe(2);
      expect(calculator.getTerrainCost('mud')).toBe(3);
      expect(calculator.getTerrainCost('ice')).toBe(1.5);
    });

    it('should return default cost for unknown terrain', () => {
      expect(calculator.getTerrainCost('unknown')).toBe(1);
      expect(calculator.getTerrainCost(null)).toBe(1);
      expect(calculator.getTerrainCost(undefined)).toBe(1);
    });

    it('should resolve tile identifiers', () => {
      const terrainSystem = getTerrainSystem();
      terrainSystem.registerTerrain('z', {
        passable: true,
        moveCost: 2.7,
        blocksVision: false,
        name: 'bog muck'
      });

      expect(calculator.getTerrainCost('legacy.glyph.z')).toBe(2.7);
    });
  });

  describe('applyStatusModifiers', () => {
    it('should apply single modifier', () => {
      mockState.player.statuses.add('speed');
      const modified = calculator.applyStatusModifiers(10, mockState);
      expect(modified).toBe(5);
    });

    it('should stack modifiers multiplicatively', () => {
      mockState.player.statuses.add('speed');
      mockState.player.statuses.add('haste');
      const modified = calculator.applyStatusModifiers(10, mockState);
      expect(modified).toBe(3.75);
    });

    it('should return original cost with no statuses', () => {
      const modified = calculator.applyStatusModifiers(10, mockState);
      expect(modified).toBe(10);
    });
  });

  describe('applyEquipmentModifiers', () => {
    it('should apply boot modifiers for matching terrain', () => {
      mockState.player.equipment.boots = { type: 'water_walking' };
      const modified = calculator.applyEquipmentModifiers(5, 'water', mockState);
      expect(modified).toBe(2.5);
    });

    it('should not apply modifiers for non-matching terrain', () => {
      mockState.player.equipment.boots = { type: 'water_walking' };
      const modified = calculator.applyEquipmentModifiers(5, 'mud', mockState);
      expect(modified).toBe(5);
    });

    it('should handle missing equipment', () => {
      mockState.player.equipment.boots = null;
      const modified = calculator.applyEquipmentModifiers(5, 'water', mockState);
      expect(modified).toBe(5);
    });
  });

  describe('caching', () => {
    it('should cache calculated costs', () => {
      const spy = vi.spyOn(calculator, 'getTerrainCost');

      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);
      expect(spy).toHaveBeenCalledTimes(1);

      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when state changes', () => {
      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);

      mockState.player.statuses.add('slow');
      calculator.invalidateCache();

      const spy = vi.spyOn(calculator, 'getTerrainCost');
      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null state gracefully', () => {
      expect(() => {
        calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, null);
      }).toThrow();
    });

    it('should handle out of bounds positions', () => {
      const cost = calculator.calculateMoveCost(
        { x: -1, y: -1 },
        { x: 0, y: 0 },
        mockState
      );

      expect(cost).toBeCloseTo(1.414, 2);
    });

    it('should handle same position', () => {
      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        mockState
      );

      expect(cost).toBe(0);
    });
  });
});
