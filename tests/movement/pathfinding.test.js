import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findPath, isWalkable, followPath } from '../../src/js/movement/pathfinding.js';
import { createMockState, createMockEntity } from '../helpers/testUtils.js';

describe('Pathfinding', () => {
  let state;
  const W = 48; // Actual game width
  const H = 22; // Actual game height

  beforeEach(() => {
    state = createMockState({
      chunk: {
        map: Array(H).fill(null).map(() => Array(W).fill('.')),
        monsters: []
      }
    });
  });

  describe('isWalkable', () => {
    it('should return true for passable tiles', () => {
      expect(isWalkable(state, 5, 5)).toBe(true);
    });

    it('should return false for walls', () => {
      state.chunk.map[5][5] = '#';
      expect(isWalkable(state, 5, 5)).toBe(false);
    });

    it('should return false for empty tiles', () => {
      state.chunk.map[5][5] = ' ';
      expect(isWalkable(state, 5, 5)).toBe(false);
    });

    it('should return true for water tiles', () => {
      state.chunk.map[5][5] = '~';
      expect(isWalkable(state, 5, 5)).toBe(true);
    });

    it('should return false for out of bounds', () => {
      expect(isWalkable(state, -1, 5)).toBe(false);
      expect(isWalkable(state, 5, -1)).toBe(false);
      expect(isWalkable(state, W, 5)).toBe(false);
      expect(isWalkable(state, 5, H)).toBe(false);
    });

    it('should return false for tiles with alive monsters', () => {
      state.chunk.monsters = [
        createMockEntity({ x: 5, y: 5, alive: true })
      ];
      expect(isWalkable(state, 5, 5)).toBe(false);
    });

    it('should return true for tiles with dead monsters', () => {
      state.chunk.monsters = [
        createMockEntity({ x: 5, y: 5, alive: false })
      ];
      expect(isWalkable(state, 5, 5)).toBe(true);
    });
  });

  describe('findPath', () => {
    it('should find direct horizontal path', () => {
      const path = findPath(state, 0, 0, 3, 0);
      
      expect(path).toBeTruthy();
      expect(path).toHaveLength(4); // Start + 3 steps
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[1]).toEqual({ x: 1, y: 0 });
      expect(path[2]).toEqual({ x: 2, y: 0 });
      expect(path[3]).toEqual({ x: 3, y: 0 });
    });

    it('should find direct vertical path', () => {
      const path = findPath(state, 0, 0, 0, 3);
      
      expect(path).toBeTruthy();
      expect(path).toHaveLength(4);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[3]).toEqual({ x: 0, y: 3 });
    });

    it('should find path around obstacles', () => {
      // Create a wall blocking direct path
      state.chunk.map[0][1] = '#';
      state.chunk.map[1][1] = '#';
      
      const path = findPath(state, 0, 0, 2, 0);
      
      expect(path).toBeTruthy();
      expect(path.length).toBeGreaterThan(3); // Longer than direct path
      // Path should go around the wall
      const hasDetour = path.some(step => step.y !== 0);
      expect(hasDetour).toBe(true);
    });

    it('should return null for unreachable goal', () => {
      // Surround goal with walls
      state.chunk.map[5][4] = '#';
      state.chunk.map[5][6] = '#';
      state.chunk.map[4][5] = '#';
      state.chunk.map[6][5] = '#';
      
      const path = findPath(state, 0, 0, 5, 5);
      
      expect(path).toBeNull();
    });

    it('should find path to same position', () => {
      const path = findPath(state, 5, 5, 5, 5);
      
      expect(path).toBeTruthy();
      expect(path).toHaveLength(1);
      expect(path[0]).toEqual({ x: 5, y: 5 });
    });

    it('should handle diagonal movement correctly', () => {
      const path = findPath(state, 0, 0, 2, 2);
      
      expect(path).toBeTruthy();
      // Path should use Manhattan distance (no diagonal moves)
      expect(path).toHaveLength(5); // 2 right + 2 down + start
    });

    describe('allowAdjacent option', () => {
      it('should find path to adjacent tile of occupied goal', () => {
        state.chunk.monsters = [
          createMockEntity({ x: 5, y: 5, alive: true })
        ];
        
        const path = findPath(state, 0, 0, 5, 5, { allowAdjacent: true });
        
        expect(path).toBeTruthy();
        const lastStep = path[path.length - 1];
        const distance = Math.abs(lastStep.x - 5) + Math.abs(lastStep.y - 5);
        expect(distance).toBe(1); // Should stop adjacent to goal
      });

      it('should reach exact position if not occupied', () => {
        const path = findPath(state, 0, 0, 5, 5, { allowAdjacent: false });
        
        expect(path).toBeTruthy();
        const lastStep = path[path.length - 1];
        expect(lastStep).toEqual({ x: 5, y: 5 });
      });
    });

    describe('Complex Pathfinding', () => {
      it('should find optimal path in maze', () => {
        // Create a simple maze
        state.chunk.map[1][0] = '#';
        state.chunk.map[1][1] = '#';
        state.chunk.map[1][2] = '#';
        state.chunk.map[1][3] = '#';
        state.chunk.map[3][1] = '#';
        state.chunk.map[3][2] = '#';
        state.chunk.map[3][3] = '#';
        state.chunk.map[3][4] = '#';
        
        const path = findPath(state, 0, 0, 4, 4);
        
        expect(path).toBeTruthy();
        // Verify path doesn't go through walls
        path.forEach(step => {
          expect(state.chunk.map[step.y][step.x]).not.toBe('#');
        });
      });

      it('should handle paths through water', () => {
        // Create water tiles
        for (let x = 2; x <= 4; x++) {
          state.chunk.map[3][x] = '~';
        }
        
        const path = findPath(state, 0, 3, 6, 3);
        
        expect(path).toBeTruthy();
        // Path should go through water
        const waterSteps = path.filter(step => 
          state.chunk.map[step.y][step.x] === '~'
        );
        expect(waterSteps.length).toBeGreaterThan(0);
      });

      it('should avoid monsters', () => {
        state.chunk.monsters = [
          createMockEntity({ x: 3, y: 0, alive: true }),
          createMockEntity({ x: 3, y: 1, alive: true }),
          createMockEntity({ x: 3, y: 2, alive: true })
        ];
        
        const path = findPath(state, 0, 0, 6, 0);
        
        expect(path).toBeTruthy();
        // Path should go around monsters
        path.forEach(step => {
          const hasMonster = state.chunk.monsters.some(m => 
            m.x === step.x && m.y === step.y && m.alive
          );
          expect(hasMonster).toBe(false);
        });
      });
    });
  });

  describe('followPath', () => {
    it('should store path in state', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ];
      
      followPath(state, path);
      
      expect(state.currentPath).toBe(path);
      expect(state.pathIndex).toBe(0);
    });

    it('should handle callback', () => {
      const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      const callback = vi.fn();
      
      followPath(state, path, callback);
      
      expect(state.pathCallback).toBe(callback);
    });

    it('should call callback immediately for empty path', () => {
      const callback = vi.fn();
      
      followPath(state, [], callback);
      
      expect(callback).toHaveBeenCalled();
      expect(state.currentPath).toBeUndefined();
    });

    it('should call callback immediately for single-step path', () => {
      const callback = vi.fn();
      const path = [{ x: 0, y: 0 }];
      
      followPath(state, path, callback);
      
      expect(callback).toHaveBeenCalled();
      expect(state.currentPath).toBeUndefined();
    });

    it('should handle null path', () => {
      const callback = vi.fn();
      
      followPath(state, null, callback);
      
      expect(callback).toHaveBeenCalled();
      expect(state.currentPath).toBeUndefined();
    });

    it('should return true for valid multi-step path', () => {
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ];
      
      const result = followPath(state, path);
      
      expect(result).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large empty maps efficiently', () => {
      const startTime = performance.now();
      const path = findPath(state, 0, 0, W-1, H-1);
      const endTime = performance.now();
      
      expect(path).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should terminate for impossible paths', () => {
      // Create an impossible maze
      for (let x = 0; x < W; x++) {
        state.chunk.map[10][x] = '#'; // Horizontal wall
      }
      
      const startTime = performance.now();
      const path = findPath(state, 5, 5, 5, 15);
      const endTime = performance.now();
      
      expect(path).toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Should fail fast
    });
  });
});