import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TerrainSystem } from '../../src/js/systems/TerrainSystem.js';

describe('TerrainSystem', () => {
  let terrainSystem;

  beforeEach(() => {
    terrainSystem = new TerrainSystem();
  });

  describe('Initialization', () => {
    it('should create a TerrainSystem instance', () => {
      expect(terrainSystem).toBeInstanceOf(TerrainSystem);
      expect(terrainSystem.terrainTypes).toBeInstanceOf(Map);
    });

    it('should register default terrain types', () => {
      // Should have common terrain types registered
      expect(terrainSystem.terrainTypes.has('.')).toBe(true); // Floor
      expect(terrainSystem.terrainTypes.has('#')).toBe(true); // Wall
      expect(terrainSystem.terrainTypes.has('~')).toBe(true); // Water
      expect(terrainSystem.terrainTypes.has('+')).toBe(true); // Door
      expect(terrainSystem.terrainTypes.has('^')).toBe(true); // Spikes
      expect(terrainSystem.terrainTypes.has('%')).toBe(true); // Candy dust
    });

    it('should set correct default properties for floor', () => {
      const floor = terrainSystem.terrainTypes.get('.');
      expect(floor.passable).toBe(true);
      expect(floor.moveCost).toBe(1);
      expect(floor.blocksVision).toBe(false);
    });

    it('should set correct default properties for wall', () => {
      const wall = terrainSystem.terrainTypes.get('#');
      expect(wall.passable).toBe(false);
      expect(wall.moveCost).toBe(Infinity);
      expect(wall.blocksVision).toBe(true);
    });

    it('should set correct default properties for water', () => {
      const water = terrainSystem.terrainTypes.get('~');
      expect(water.passable).toBe(true);
      expect(water.moveCost).toBe(2); // Slower movement in water
      expect(water.blocksVision).toBe(false);
    });
  });

  describe('registerTerrain', () => {
    it('should register a new terrain type', () => {
      const customTerrain = {
        passable: true,
        moveCost: 3,
        onEnter: vi.fn(),
        onExit: vi.fn(),
        effect: 'slippery'
      };

      terrainSystem.registerTerrain('*', customTerrain);

      expect(terrainSystem.terrainTypes.has('*')).toBe(true);
      const registered = terrainSystem.terrainTypes.get('*');
      expect(registered).toMatchObject(customTerrain);
    });

    it('should apply default values for missing properties', () => {
      terrainSystem.registerTerrain('?', { moveCost: 5 });

      const registered = terrainSystem.terrainTypes.get('?');
      expect(registered.passable).toBe(true); // Default
      expect(registered.moveCost).toBe(5); // Provided
      expect(registered.onEnter).toBeNull(); // Default
      expect(registered.onExit).toBeNull(); // Default
      expect(registered.effect).toBeNull(); // Default
      expect(registered.blocksVision).toBe(false); // Default
    });

    it('should override existing terrain types', () => {
      // First registration
      terrainSystem.registerTerrain('X', { passable: true, moveCost: 1 });
      expect(terrainSystem.terrainTypes.get('X').passable).toBe(true);

      // Override
      terrainSystem.registerTerrain('X', { passable: false, moveCost: 10 });
      expect(terrainSystem.terrainTypes.get('X').passable).toBe(false);
      expect(terrainSystem.terrainTypes.get('X').moveCost).toBe(10);
    });
  });

  describe('getMoveCost', () => {
    it('should return move cost for registered terrain', () => {
      expect(terrainSystem.getMoveCost('.')).toBe(1); // Floor
      expect(terrainSystem.getMoveCost('~')).toBe(2); // Water
      expect(terrainSystem.getMoveCost('#')).toBe(Infinity); // Wall
    });

    it('should return default cost for unknown terrain', () => {
      expect(terrainSystem.getMoveCost('unknown')).toBe(1);
    });

    it('should handle null/undefined terrain', () => {
      expect(terrainSystem.getMoveCost(null)).toBe(1);
      expect(terrainSystem.getMoveCost(undefined)).toBe(1);
    });
  });

  describe('isPassable', () => {
    it('should return passability for registered terrain', () => {
      expect(terrainSystem.isPassable('.')).toBe(true); // Floor
      expect(terrainSystem.isPassable('#')).toBe(false); // Wall
      expect(terrainSystem.isPassable('~')).toBe(true); // Water
    });

    it('should return false for unknown terrain', () => {
      expect(terrainSystem.isPassable('unknown')).toBe(false);
    });

    it('should handle null/undefined terrain', () => {
      expect(terrainSystem.isPassable(null)).toBe(false);
      expect(terrainSystem.isPassable(undefined)).toBe(false);
    });
  });

  describe('blocksVision', () => {
    it('should return vision blocking for registered terrain', () => {
      expect(terrainSystem.blocksVision('.')).toBe(false); // Floor
      expect(terrainSystem.blocksVision('#')).toBe(true); // Wall
      expect(terrainSystem.blocksVision('~')).toBe(false); // Water
    });

    it('should return false for unknown terrain', () => {
      expect(terrainSystem.blocksVision('unknown')).toBe(false);
    });
  });

  describe('onEnterTile', () => {
    it('should call onEnter callback for terrain with handler', async () => {
      const onEnter = vi.fn();
      terrainSystem.registerTerrain('!', { 
        passable: true, 
        onEnter 
      });

      const mockState = {
        chunk: {
          map: [
            ['!', '.', '.'],
            ['.', '.', '.'],
            ['.', '.', '.']
          ]
        }
      };

      await terrainSystem.onEnterTile(mockState, 0, 0);

      expect(onEnter).toHaveBeenCalledWith(mockState, 0, 0);
    });

    it('should not error for terrain without onEnter handler', async () => {
      const mockState = {
        chunk: {
          map: [
            ['.', '.', '.'],
            ['.', '.', '.'],
            ['.', '.', '.']
          ]
        }
      };

      await expect(terrainSystem.onEnterTile(mockState, 0, 0)).resolves.not.toThrow();
    });

    it('should handle missing chunk/map gracefully', async () => {
      await expect(terrainSystem.onEnterTile({}, 0, 0)).resolves.not.toThrow();
      await expect(terrainSystem.onEnterTile({ chunk: {} }, 0, 0)).resolves.not.toThrow();
    });

    it('should handle out of bounds coordinates', async () => {
      const mockState = {
        chunk: {
          map: [['.', '.']]
        }
      };

      await expect(terrainSystem.onEnterTile(mockState, 5, 5)).resolves.not.toThrow();
    });
  });

  describe('onExitTile', () => {
    it('should call onExit callback for terrain with handler', async () => {
      const onExit = vi.fn();
      terrainSystem.registerTerrain('!', { 
        passable: true, 
        onExit 
      });

      const mockState = {
        chunk: {
          map: [
            ['!', '.', '.'],
            ['.', '.', '.'],
            ['.', '.', '.']
          ]
        }
      };

      await terrainSystem.onExitTile(mockState, 0, 0);

      expect(onExit).toHaveBeenCalledWith(mockState, 0, 0);
    });

    it('should not error for terrain without onExit handler', async () => {
      const mockState = {
        chunk: {
          map: [['.', '.', '.']]
        }
      };

      await expect(terrainSystem.onExitTile(mockState, 0, 0)).resolves.not.toThrow();
    });
  });

  describe('getTerrainAt', () => {
    it('should return terrain type at coordinates', () => {
      const mockState = {
        chunk: {
          map: [
            ['#', '.', '~'],
            ['.', '^', '.'],
            ['%', '.', '+']
          ]
        }
      };

      expect(terrainSystem.getTerrainAt(mockState, 0, 0)).toBe('#');
      expect(terrainSystem.getTerrainAt(mockState, 2, 0)).toBe('~');
      expect(terrainSystem.getTerrainAt(mockState, 1, 1)).toBe('^');
      expect(terrainSystem.getTerrainAt(mockState, 0, 2)).toBe('%');
    });

    it('should return null for out of bounds', () => {
      const mockState = {
        chunk: {
          map: [['.']]
        }
      };

      expect(terrainSystem.getTerrainAt(mockState, 5, 5)).toBeNull();
      expect(terrainSystem.getTerrainAt(mockState, -1, 0)).toBeNull();
    });

    it('should handle missing state/chunk/map', () => {
      expect(terrainSystem.getTerrainAt(null, 0, 0)).toBeNull();
      expect(terrainSystem.getTerrainAt({}, 0, 0)).toBeNull();
      expect(terrainSystem.getTerrainAt({ chunk: {} }, 0, 0)).toBeNull();
    });
  });

  describe('getTerrainInfo', () => {
    it('should return full terrain info for registered terrain', () => {
      const info = terrainSystem.getTerrainInfo('~');
      
      expect(info).toMatchObject({
        passable: true,
        moveCost: 2,
        blocksVision: false,
        name: 'water',
        description: expect.any(String)
      });
    });

    it('should return default info for unknown terrain', () => {
      const info = terrainSystem.getTerrainInfo('unknown');
      
      expect(info).toMatchObject({
        passable: false,
        moveCost: 1,
        blocksVision: false,
        name: 'unknown',
        description: 'Unknown terrain'
      });
    });
  });

  describe('Default terrain effects', () => {
    it('should handle spike damage on enter', async () => {
      const mockState = {
        player: { hp: 10 },
        log: vi.fn(),
        chunk: {
          map: [['^']]
        }
      };

      await terrainSystem.onEnterTile(mockState, 0, 0);

      // Spikes should damage the player
      expect(mockState.player.hp).toBeLessThan(10);
      expect(mockState.log).toHaveBeenCalledWith(
        expect.stringContaining('spike'),
        expect.any(String)
      );
    });

    it('should handle water slow effect', async () => {
      const mockState = {
        player: { statusEffects: [] },
        log: vi.fn(),
        chunk: {
          map: [['~']]
        }
      };

      await terrainSystem.onEnterTile(mockState, 0, 0);

      // Water should apply slow effect
      expect(mockState.player.statusEffects).toHaveLength(1);
      expect(mockState.player.statusEffects[0]).toMatchObject({
        type: 'water_slow',
        speedReduction: expect.any(Number)
      });
    });

    it('should handle candy dust effect', async () => {
      const mockState = {
        player: { speed: 10 },
        log: vi.fn(),
        chunk: {
          map: [['%']]
        }
      };

      const initialSpeed = mockState.player.speed;
      await terrainSystem.onEnterTile(mockState, 0, 0);

      // Candy dust might increase speed or have other effects
      expect(mockState.log).toHaveBeenCalled();
    });
  });
});