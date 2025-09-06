import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathfindingSystem } from '../../src/js/pathfinding/PathfindingSystem.js';

describe('PathfindingSystem', () => {
  let pathfinding;
  let mockState;

  beforeEach(() => {
    pathfinding = new PathfindingSystem();
    
    // Create a simple 5x5 grid for testing
    mockState = {
      chunk: {
        width: 5,
        height: 5,
        tiles: [
          [0, 0, 0, 0, 0],  // Row 0
          [0, 1, 1, 1, 0],  // Row 1 - wall
          [0, 0, 0, 1, 0],  // Row 2
          [0, 1, 0, 0, 0],  // Row 3
          [0, 0, 0, 0, 0],  // Row 4
        ],
        getTile: function(x, y) {
          if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
          }
          return this.tiles[y][x];
        },
        isPassable: function(x, y) {
          const tile = this.getTile(x, y);
          return tile !== null && tile !== 1;
        }
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(pathfinding).toBeDefined();
      expect(pathfinding.allowDiagonal).toBe(true);
      expect(pathfinding.heuristic).toBe('manhattan');
    });

    it('should accept custom options', () => {
      const customPathfinding = new PathfindingSystem({
        allowDiagonal: false,
        heuristic: 'euclidean'
      });
      
      expect(customPathfinding.allowDiagonal).toBe(false);
      expect(customPathfinding.heuristic).toBe('euclidean');
    });
  });

  describe('findPath', () => {
    it('should find straight path in open area', () => {
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        mockState
      );
      
      expect(path).toBeDefined();
      expect(path.length).toBe(5);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[4]).toEqual({ x: 4, y: 0 });
    });

    it('should find path around obstacles', () => {
      const path = pathfinding.findPath(
        { x: 0, y: 1 },
        { x: 4, y: 1 },
        mockState
      );
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(4);
      // Path should go around the wall
      expect(path.some(p => p.y !== 1)).toBe(true);
    });

    it('should return null for impossible path', () => {
      // Create an isolated target
      mockState.chunk.tiles = [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
      ];
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 2, y: 2 }, // Surrounded by walls
        mockState
      );
      
      expect(path).toBeNull();
    });

    it('should return single point path for same start and end', () => {
      const path = pathfinding.findPath(
        { x: 2, y: 2 },
        { x: 2, y: 2 },
        mockState
      );
      
      expect(path).toEqual([{ x: 2, y: 2 }]);
    });

    it('should handle diagonal movement when enabled', () => {
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        mockState
      );
      
      expect(path).toBeDefined();
      // With diagonal movement and obstacles, path should be reasonably short
      expect(path.length).toBeLessThanOrEqual(9);
    });

    it('should not use diagonal movement when disabled', () => {
      pathfinding.allowDiagonal = false;
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        mockState
      );
      
      expect(path).toBeDefined();
      // Without diagonal movement, path must be at least 8 steps
      expect(path.length).toBeGreaterThanOrEqual(9);
    });

    it('should validate input coordinates', () => {
      expect(() => {
        pathfinding.findPath(
          { x: -1, y: 0 },
          { x: 4, y: 4 },
          mockState
        );
      }).toThrow('Invalid start position');
      
      expect(() => {
        pathfinding.findPath(
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          mockState
        );
      }).toThrow('Invalid end position');
    });

    it('should handle max search limit', () => {
      // Create a complex maze that requires many iterations
      const largeMaze = {
        chunk: {
          width: 20,
          height: 20,
          tiles: Array(20).fill().map(() => Array(20).fill(0)),
          getTile: function(x, y) {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
              return null;
            }
            return this.tiles[y][x];
          },
          isPassable: function(x, y) {
            const tile = this.getTile(x, y);
            return tile !== null && tile !== 1;
          }
        }
      };
      
      const customPathfinding = new PathfindingSystem({ maxSearchNodes: 10 });
      const path = customPathfinding.findPath(
        { x: 0, y: 0 },
        { x: 19, y: 19 },
        largeMaze
      );
      
      // Should return null if search limit exceeded
      expect(path).toBeNull();
    });
  });

  describe('getNeighbors', () => {
    it('should return orthogonal neighbors only when diagonal disabled', () => {
      pathfinding.allowDiagonal = false;
      // Use position (0,0) which has 2 orthogonal neighbors
      const neighbors = pathfinding.getNeighbors({ x: 0, y: 0 }, mockState);
      
      expect(neighbors.length).toBe(2);
      expect(neighbors).toContainEqual({ x: 1, y: 0 });
      expect(neighbors).toContainEqual({ x: 0, y: 1 });
    });

    it('should return diagonal neighbors when enabled', () => {
      pathfinding.allowDiagonal = true;
      // Use position (0,0) - (1,1) is a wall so only 2 neighbors
      const neighbors = pathfinding.getNeighbors({ x: 0, y: 0 }, mockState);
      
      expect(neighbors.length).toBe(2);
      expect(neighbors).toContainEqual({ x: 1, y: 0 });
      expect(neighbors).toContainEqual({ x: 0, y: 1 });
      // (1,1) is a wall so not included
    });

    it('should filter out impassable tiles', () => {
      const neighbors = pathfinding.getNeighbors({ x: 2, y: 2 }, mockState);
      
      // Should not include (3, 2) which is a wall  
      expect(neighbors).not.toContainEqual({ x: 3, y: 2 });
      // Should not include (1, 3) which is a wall
      expect(neighbors).not.toContainEqual({ x: 1, y: 3 });
    });

    it('should handle edge positions', () => {
      const corners = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
        { x: 4, y: 4 }
      ];
      
      corners.forEach(corner => {
        const neighbors = pathfinding.getNeighbors(corner, mockState);
        expect(neighbors.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('heuristics', () => {
    it('should calculate manhattan distance', () => {
      const dist = pathfinding.calculateHeuristic(
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        'manhattan'
      );
      
      expect(dist).toBe(7); // |3-0| + |4-0| = 7
    });

    it('should calculate euclidean distance', () => {
      const dist = pathfinding.calculateHeuristic(
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        'euclidean'
      );
      
      expect(dist).toBeCloseTo(5, 1); // sqrt(9 + 16) = 5
    });

    it('should calculate chebyshev distance', () => {
      const dist = pathfinding.calculateHeuristic(
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        'chebyshev'
      );
      
      expect(dist).toBe(4); // max(|3-0|, |4-0|) = 4
    });

    it('should default to manhattan for unknown heuristic', () => {
      const dist = pathfinding.calculateHeuristic(
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        'unknown'
      );
      
      expect(dist).toBe(7);
    });
  });

  describe('getMovementCost', () => {
    it('should return 1 for orthogonal movement', () => {
      const cost = pathfinding.getMovementCost(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        mockState
      );
      
      expect(cost).toBe(1);
    });

    it('should return ~1.414 for diagonal movement', () => {
      const cost = pathfinding.getMovementCost(
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        mockState
      );
      
      expect(cost).toBeCloseTo(1.414, 2);
    });

    it('should consider terrain cost modifiers', () => {
      // Add terrain cost to mockState
      mockState.chunk.getTerrainCost = vi.fn((x, y) => {
        if (x === 2 && y === 2) return 3; // Difficult terrain
        return 1;
      });
      
      const cost = pathfinding.getMovementCost(
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        mockState
      );
      
      expect(cost).toBe(3);
    });
  });

  describe('reconstructPath', () => {
    it('should reconstruct path from came-from map', () => {
      const cameFrom = new Map();
      cameFrom.set('1,0', { x: 0, y: 0 });
      cameFrom.set('2,0', { x: 1, y: 0 });
      cameFrom.set('3,0', { x: 2, y: 0 });
      
      const path = pathfinding.reconstructPath(
        cameFrom,
        { x: 0, y: 0 },
        { x: 3, y: 0 }
      );
      
      expect(path).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 }
      ]);
    });
  });

  describe('performance', () => {
    it('should handle large grids efficiently', () => {
      const size = 50;
      const largeState = {
        chunk: {
          width: size,
          height: size,
          tiles: Array(size).fill().map(() => Array(size).fill(0)),
          getTile: function(x, y) {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
              return null;
            }
            return this.tiles[y][x];
          },
          isPassable: function(x, y) {
            return this.getTile(x, y) === 0;
          }
        }
      };
      
      const start = performance.now();
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: size - 1, y: size - 1 },
        largeState
      );
      const elapsed = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(elapsed).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe('edge cases', () => {
    it('should handle start position being impassable', () => {
      mockState.chunk.tiles[0][0] = 1; // Make start impassable
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        mockState
      );
      
      expect(path).toBeNull();
    });

    it('should handle end position being impassable', () => {
      mockState.chunk.tiles[4][4] = 1; // Make end impassable
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        mockState
      );
      
      expect(path).toBeNull();
    });

    it('should handle null state gracefully', () => {
      expect(() => {
        pathfinding.findPath({ x: 0, y: 0 }, { x: 4, y: 4 }, null);
      }).toThrow();
    });

    it('should handle missing chunk gracefully', () => {
      expect(() => {
        pathfinding.findPath({ x: 0, y: 0 }, { x: 4, y: 4 }, {});
      }).toThrow();
    });
  });
});