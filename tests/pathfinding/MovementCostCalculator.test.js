import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementCostCalculator } from '../../src/js/pathfinding/MovementCostCalculator.js';

describe('MovementCostCalculator', () => {
  let calculator;
  let mockState;

  beforeEach(() => {
    calculator = new MovementCostCalculator();
    
    mockState = {
      chunk: {
        width: 5,
        height: 5,
        getTile: vi.fn((x, y) => {
          // Return different terrain types for testing
          if (x === 2 && y === 2) return 'water';
          if (x === 3 && y === 3) return 'mud';
          if (x === 1 && y === 1) return 'ice';
          if (x === 4 && y === 4) return 'lava';
          return 'ground';
        }),
        isPassable: vi.fn(() => true)
      },
      player: {
        statuses: new Set(),
        equipment: {
          boots: null
        }
      },
      entities: new Map()
    };
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
        { x: 1, y: 1 }, // Ice tile (1.5 cost)
        mockState
      );
      
      // Ice (1.5) * diagonal (1.414) = 2.121
      expect(cost).toBeCloseTo(2.121, 2);
    });

    it('should combine terrain and diagonal costs', () => {
      const cost = calculator.calculateMoveCost(
        { x: 1, y: 1 },
        { x: 2, y: 2 }, // Moving diagonally to water
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
      
      // Slow (2x) + Wet (1.5x) = 3x total
      expect(cost).toBe(3);
    });
  });

  describe('equipment modifiers', () => {
    it('should reduce water cost with water walking boots', () => {
      mockState.player.equipment.boots = { type: 'water_walking' };
      
      const cost = calculator.calculateMoveCost(
        { x: 1, y: 2 },
        { x: 2, y: 2 }, // Water tile
        mockState
      );
      
      expect(cost).toBe(1); // Water walking makes water cost like ground
    });

    it('should reduce ice cost with ice cleats', () => {
      mockState.player.equipment.boots = { type: 'ice_cleats' };
      
      const cost = calculator.calculateMoveCost(
        { x: 0, y: 1 },
        { x: 1, y: 1 }, // Ice tile
        mockState
      );
      
      // Ice (1.5) * ice_cleats (0.67) = 1.005
      expect(cost).toBeCloseTo(1, 1);
    });

    it('should reduce lava damage with fire boots', () => {
      mockState.player.equipment.boots = { type: 'fire_boots' };
      
      const cost = calculator.calculateMoveCost(
        { x: 3, y: 4 },
        { x: 4, y: 4 }, // Lava tile
        mockState
      );
      
      expect(cost).toBe(2); // Fire boots reduce lava cost
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
      
      expect(cost).toBe(2); // Moving through ally costs extra
    });

    it('should return infinity for enemy blocking', () => {
      const enemy = { type: 'enemy', x: 1, y: 0 };
      mockState.entities.set('1,0', enemy);
      
      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );
      
      expect(cost).toBe(Infinity); // Cannot move through enemies
    });

    it('should handle neutral entities', () => {
      const neutral = { type: 'neutral', x: 1, y: 0 };
      mockState.entities.set('1,0', neutral);
      
      const cost = calculator.calculateMoveCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );
      
      expect(cost).toBe(3); // Neutral entities are harder to pass
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
  });

  describe('applyStatusModifiers', () => {
    it('should apply single modifier', () => {
      mockState.player.statuses.add('speed');
      const modified = calculator.applyStatusModifiers(10, mockState);
      expect(modified).toBe(5);
    });

    it('should stack modifiers multiplicatively', () => {
      mockState.player.statuses.add('speed'); // 0.5x
      mockState.player.statuses.add('haste'); // 0.75x
      const modified = calculator.applyStatusModifiers(10, mockState);
      expect(modified).toBe(3.75); // 10 * 0.5 * 0.75
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
      expect(modified).toBe(2.5); // Water walking halves water cost
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
      
      // First call
      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second call with same positions should use cache
      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when state changes', () => {
      calculator.calculateMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockState);
      
      // Change player status
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
      
      // Diagonal movement with ground terrain (default)
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