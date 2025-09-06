import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathfindingSystem } from '../../src/js/pathfinding/PathfindingSystem.js';
import { MovementCostCalculator } from '../../src/js/pathfinding/MovementCostCalculator.js';
import { PathCache } from '../../src/js/pathfinding/PathCache.js';
import { PriorityQueue } from '../../src/js/pathfinding/PriorityQueue.js';

describe('Pathfinding Integration', () => {
  let pathfinding;
  let costCalculator;
  let pathCache;
  let mockState;

  beforeEach(() => {
    pathfinding = new PathfindingSystem();
    costCalculator = new MovementCostCalculator();
    pathCache = new PathCache();
    
    // Create a more complex test environment
    mockState = {
      chunk: {
        width: 10,
        height: 10,
        tiles: [
          //0  1  2  3  4  5  6  7  8  9
          ['g','g','g','g','w','w','g','g','g','g'], // 0
          ['g','#','#','g','w','w','g','#','#','g'], // 1
          ['g','#','g','g','w','w','g','g','#','g'], // 2
          ['g','g','g','g','b','b','g','g','g','g'], // 3 (b = bridge)
          ['g','g','m','m','m','m','m','g','g','g'], // 4 (m = mud)
          ['g','g','m','g','g','g','m','g','g','g'], // 5
          ['g','g','m','g','#','g','m','g','g','g'], // 6
          ['g','g','m','g','#','g','m','g','g','g'], // 7
          ['g','g','m','m','m','m','m','g','g','g'], // 8
          ['g','g','g','g','g','g','g','g','g','g']  // 9
        ],
        getTile: function(x, y) {
          if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
          }
          return this.tiles[y][x];
        },
        isPassable: function(x, y) {
          const tile = this.getTile(x, y);
          return tile !== null && tile !== '#';
        },
        getTerrainCost: function(x, y) {
          const tile = this.getTile(x, y);
          const costs = {
            'g': 1,    // ground
            'w': 3,    // water
            'b': 1,    // bridge
            'm': 2,    // mud
            '#': Infinity
          };
          return costs[tile] || 1;
        }
      },
      player: {
        x: 0,
        y: 0,
        statuses: new Set(),
        equipment: {
          boots: null
        }
      },
      entities: new Map()
    };
  });

  describe('Basic pathfinding with caching', () => {
    it('should find and cache optimal path', () => {
      // First pathfinding request
      const path1 = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        mockState
      );
      
      expect(path1).toBeDefined();
      expect(path1[0]).toEqual({ x: 0, y: 0 });
      expect(path1[path1.length - 1]).toEqual({ x: 9, y: 9 });
      
      // Cache the path
      pathCache.set({ x: 0, y: 0 }, { x: 9, y: 9 }, path1);
      
      // Second request should use cache
      const path2 = pathCache.get({ x: 0, y: 0 }, { x: 9, y: 9 });
      expect(path2).toEqual(path1);
      
      // Check cache stats
      const stats = pathCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should handle bidirectional caching', () => {
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        mockState
      );
      
      pathCache.set({ x: 0, y: 0 }, { x: 5, y: 5 }, path);
      
      // Reverse direction should work
      const reversePath = pathCache.get({ x: 5, y: 5 }, { x: 0, y: 0 });
      expect(reversePath).toBeDefined();
      expect(reversePath[0]).toEqual({ x: 5, y: 5 });
      expect(reversePath[reversePath.length - 1]).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Pathfinding with movement costs', () => {
    it('should prefer bridge over water', () => {
      // Path from left to right through water/bridge area
      const path = pathfinding.findPath(
        { x: 0, y: 3 },
        { x: 9, y: 3 },
        mockState
      );
      
      // Should use bridge tiles (4,3) and (5,3)
      const bridgeUsed = path.some(p => 
        (p.x === 4 || p.x === 5) && p.y === 3
      );
      expect(bridgeUsed).toBe(true);
    });

    it('should avoid mud when possible', () => {
      // Path that could go through mud or around it
      const path = pathfinding.findPath(
        { x: 0, y: 5 },
        { x: 9, y: 5 },
        mockState
      );
      
      // Should minimize mud tiles
      const mudTiles = path.filter(p => {
        const tile = mockState.chunk.getTile(p.x, p.y);
        return tile === 'm';
      });
      
      // Should try to avoid mud where possible
      expect(mudTiles.length).toBeLessThan(path.length / 2);
    });

    it('should calculate accurate path costs', () => {
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        mockState
      );
      
      const totalCost = costCalculator.getPathCost(path, mockState);
      expect(totalCost).toBeGreaterThan(0);
      expect(totalCost).toBeLessThan(10);
    });
  });

  describe('Status effects and equipment', () => {
    it('should adjust costs with speed boost', () => {
      const normalPath = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        mockState
      );
      
      const normalCost = costCalculator.getPathCost(normalPath, mockState);
      
      // Add speed boost
      mockState.player.statuses.add('speed');
      costCalculator.invalidateCache();
      
      const boostedCost = costCalculator.getPathCost(normalPath, mockState);
      expect(boostedCost).toBeLessThan(normalCost);
    });

    it('should handle water walking boots', () => {
      // Path through water
      const normalPath = pathfinding.findPath(
        { x: 3, y: 0 },
        { x: 5, y: 2 },
        mockState
      );
      
      // Equip water walking boots
      mockState.player.equipment.boots = { type: 'water_walking' };
      
      // Recalculate with boots
      const bootPath = pathfinding.findPath(
        { x: 3, y: 0 },
        { x: 5, y: 2 },
        mockState
      );
      
      // With boots, might take different path through water
      expect(bootPath).toBeDefined();
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate paths when terrain changes', () => {
      // Cache a path
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        mockState
      );
      pathCache.set({ x: 0, y: 0 }, { x: 5, y: 0 }, path);
      
      // Invalidate area where path passes
      pathCache.invalidateArea({ x: 2, y: 0, width: 2, height: 1 });
      
      // Path should no longer be cached
      expect(pathCache.get({ x: 0, y: 0 }, { x: 5, y: 0 })).toBeNull();
    });

    it('should handle circular area invalidation', () => {
      // Cache multiple paths
      let cachedCount = 0;
      for (let i = 0; i < 5; i++) {
        const path = pathfinding.findPath(
          { x: i, y: i },
          { x: i + 1, y: i + 1 },
          mockState
        );
        if (path) {
          pathCache.set({ x: i, y: i }, { x: i + 1, y: i + 1 }, path);
          cachedCount++;
        }
      }
      
      expect(pathCache.size()).toBe(cachedCount);
      const initialSize = pathCache.size();
      
      // Invalidate circular area
      pathCache.invalidateArea({ x: 2, y: 2, radius: 1.5 });
      
      // Some paths should be invalidated
      expect(pathCache.size()).toBeLessThan(initialSize);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple obstacles', () => {
      // Add more obstacles
      mockState.entities.set('3,3', { type: 'enemy' });
      mockState.entities.set('5,5', { type: 'enemy' });
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        mockState
      );
      
      expect(path).toBeDefined();
      
      // Should not pass through enemies
      const passesEnemy = path.some(p => 
        (p.x === 3 && p.y === 3) || (p.x === 5 && p.y === 5)
      );
      expect(passesEnemy).toBe(false);
    });

    it('should handle impossible paths gracefully', () => {
      // Surround target with walls
      mockState.chunk.tiles[8][8] = '#';
      mockState.chunk.tiles[8][9] = '#';
      mockState.chunk.tiles[9][8] = '#';
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        mockState
      );
      
      expect(path).toBeNull();
    });

    it('should optimize for different heuristics', () => {
      const manhattanPathfinding = new PathfindingSystem({ heuristic: 'manhattan' });
      const euclideanPathfinding = new PathfindingSystem({ heuristic: 'euclidean' });
      
      const path1 = manhattanPathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        mockState
      );
      
      const path2 = euclideanPathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        mockState
      );
      
      // Both should find valid paths
      expect(path1).toBeDefined();
      expect(path2).toBeDefined();
      
      // Paths might differ slightly
      expect(path1.length).toBeGreaterThan(0);
      expect(path2.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large searches efficiently', () => {
      // Create large empty grid
      const largeState = {
        chunk: {
          width: 50,
          height: 50,
          tiles: Array(50).fill().map(() => Array(50).fill('g')),
          getTile: function(x, y) {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
              return null;
            }
            return this.tiles[y][x];
          },
          isPassable: function(x, y) {
            return this.getTile(x, y) !== null;
          },
          getTerrainCost: function() {
            return 1;
          }
        },
        player: mockState.player,
        entities: new Map()
      };
      
      const start = performance.now();
      
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 49, y: 49 },
        largeState
      );
      
      const elapsed = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(elapsed).toBeLessThan(100); // Should complete quickly
    });

    it('should benefit from caching', () => {
      const iterations = 100;
      
      // Without cache
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        pathfinding.findPath(
          { x: 0, y: 0 },
          { x: 9, y: 9 },
          mockState
        );
      }
      const timeWithoutCache = performance.now() - start1;
      
      // With cache
      const cachedPath = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        mockState
      );
      pathCache.set({ x: 0, y: 0 }, { x: 9, y: 9 }, cachedPath);
      
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        pathCache.get({ x: 0, y: 0 }, { x: 9, y: 9 });
      }
      const timeWithCache = performance.now() - start2;
      
      // Cache should be significantly faster
      expect(timeWithCache).toBeLessThan(timeWithoutCache / 10);
    });
  });

  describe('Priority queue integration', () => {
    it('should efficiently process nodes', () => {
      const pq = new PriorityQueue();
      
      // Simulate pathfinding node processing
      const nodes = [];
      for (let i = 0; i < 100; i++) {
        nodes.push({
          x: Math.floor(Math.random() * 10),
          y: Math.floor(Math.random() * 10),
          f: Math.random() * 100
        });
      }
      
      // Add all nodes
      nodes.forEach(node => pq.enqueue(node, node.f));
      
      // Process in priority order
      let lastPriority = -Infinity;
      while (!pq.isEmpty()) {
        const node = pq.dequeue();
        expect(node.priority).toBeGreaterThanOrEqual(lastPriority);
        lastPriority = node.priority;
      }
    });
  });
});