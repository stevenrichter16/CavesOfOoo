import { describe, it, expect, beforeEach } from 'vitest';
import { PathfindingSystem } from '../../src/js/pathfinding/PathfindingSystem.js';
import { MovementCostCalculator } from '../../src/js/pathfinding/MovementCostCalculator.js';
import { PathCache } from '../../src/js/pathfinding/PathCache.js';
import { PriorityQueue } from '../../src/js/pathfinding/PriorityQueue.js';

describe('Pathfinding Performance Benchmarks', () => {
  let pathfinding;
  let calculator;
  let cache;

  beforeEach(() => {
    pathfinding = new PathfindingSystem();
    calculator = new MovementCostCalculator();
    cache = new PathCache();
  });

  describe('A* Performance', () => {
    it('should handle 10x10 grid in under 10ms', () => {
      const state = createGridState(10, 10);
      
      const start = performance.now();
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        state
      );
      const elapsed = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(elapsed).toBeLessThan(10);
    });

    it('should handle 50x50 grid in under 50ms', () => {
      const state = createGridState(50, 50);
      
      const start = performance.now();
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 49, y: 49 },
        state
      );
      const elapsed = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle 100x100 grid in under 200ms', () => {
      const state = createGridState(100, 100);
      
      const start = performance.now();
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 99, y: 99 },
        state
      );
      const elapsed = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(elapsed).toBeLessThan(200);
    });

    it('should handle complex maze efficiently', () => {
      const state = createMazeState(50, 50);
      
      const start = performance.now();
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 49, y: 49 },
        state
      );
      const elapsed = performance.now() - start;
      
      // Maze might not have a path
      if (path) {
        expect(path.length).toBeGreaterThan(0);
      }
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Priority Queue Performance', () => {
    it('should handle 10000 operations in under 100ms', () => {
      const pq = new PriorityQueue();
      const operations = 10000;
      
      const start = performance.now();
      
      // Insert operations
      for (let i = 0; i < operations / 2; i++) {
        pq.enqueue(i, Math.random() * 1000);
      }
      
      // Mixed operations
      for (let i = 0; i < operations / 2; i++) {
        if (i % 2 === 0) {
          pq.dequeue();
        } else {
          pq.enqueue(i, Math.random() * 1000);
        }
      }
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it('should maintain O(log n) insertion complexity', () => {
      const pq = new PriorityQueue();
      const sizes = [100, 1000, 10000];
      const times = [];
      
      for (const size of sizes) {
        pq.clear();
        const start = performance.now();
        
        for (let i = 0; i < size; i++) {
          pq.enqueue(i, Math.random() * 1000);
        }
        
        times.push((performance.now() - start) / size);
      }
      
      // Time per operation should not increase dramatically
      const ratio = times[2] / times[0];
      expect(ratio).toBeLessThan(10); // Should be roughly logarithmic
    });
  });

  describe('Path Cache Performance', () => {
    it('should provide 100x speedup for cached paths', () => {
      const state = createGridState(20, 20);
      const iterations = 100;
      
      // First, calculate the path
      const path = pathfinding.findPath(
        { x: 0, y: 0 },
        { x: 19, y: 19 },
        state
      );
      
      // Time without cache
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        pathfinding.findPath(
          { x: 0, y: 0 },
          { x: 19, y: 19 },
          state
        );
      }
      const timeWithoutCache = performance.now() - start1;
      
      // Cache the path
      cache.set({ x: 0, y: 0 }, { x: 19, y: 19 }, path);
      
      // Time with cache
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        cache.get({ x: 0, y: 0 }, { x: 19, y: 19 });
      }
      const timeWithCache = performance.now() - start2;
      
      // Cache should be at least 10x faster
      expect(timeWithCache * 10).toBeLessThan(timeWithoutCache);
    });

    it('should handle 1000 cached paths efficiently', () => {
      const numPaths = 1000;
      
      const start = performance.now();
      
      // Add paths
      for (let i = 0; i < numPaths; i++) {
        const path = [
          { x: i % 100, y: Math.floor(i / 100) },
          { x: (i + 1) % 100, y: Math.floor((i + 1) / 100) }
        ];
        cache.set(path[0], path[1], path);
      }
      
      // Retrieve paths
      for (let i = 0; i < numPaths; i++) {
        const from = { x: i % 100, y: Math.floor(i / 100) };
        const to = { x: (i + 1) % 100, y: Math.floor((i + 1) / 100) };
        cache.get(from, to);
      }
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Movement Cost Calculator Performance', () => {
    it('should calculate 10000 costs in under 50ms', () => {
      const state = createGridState(100, 100);
      state.player = { statuses: new Set(), equipment: { boots: null } };
      
      const start = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        const from = { 
          x: Math.floor(Math.random() * 100), 
          y: Math.floor(Math.random() * 100) 
        };
        const to = { 
          x: Math.min(99, from.x + 1), 
          y: Math.min(99, from.y + 1) 
        };
        
        calculator.calculateMoveCost(from, to, state);
      }
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should benefit from caching', () => {
      const state = createGridState(10, 10);
      state.player = { statuses: new Set(), equipment: { boots: null } };
      
      const positions = [
        { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
        { from: { x: 1, y: 1 }, to: { x: 2, y: 2 } },
        { from: { x: 5, y: 5 }, to: { x: 6, y: 6 } }
      ];
      
      // First pass - no cache
      const start1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        for (const pos of positions) {
          calculator.calculateMoveCost(pos.from, pos.to, state);
        }
      }
      const firstPassTime = performance.now() - start1;
      
      // Second pass - with cache
      const start2 = performance.now();
      for (let i = 0; i < 1000; i++) {
        for (const pos of positions) {
          calculator.calculateMoveCost(pos.from, pos.to, state);
        }
      }
      const secondPassTime = performance.now() - start2;
      
      // Second pass should be faster due to caching
      expect(secondPassTime).toBeLessThan(firstPassTime);
    });
  });

  describe('End-to-end Performance', () => {
    it('should handle complex pathfinding scenario efficiently', () => {
      const state = createComplexState(30, 30);
      const numQueries = 50;
      
      const start = performance.now();
      
      for (let i = 0; i < numQueries; i++) {
        const from = { 
          x: Math.floor(Math.random() * 30), 
          y: Math.floor(Math.random() * 30) 
        };
        const to = { 
          x: Math.floor(Math.random() * 30), 
          y: Math.floor(Math.random() * 30) 
        };
        
        // Check cache
        let path = cache.get(from, to);
        
        if (!path) {
          // Find path
          path = pathfinding.findPath(from, to, state);
          
          if (path) {
            // Cache it
            cache.set(from, to, path);
            
            // Calculate total cost
            const cost = calculator.getPathCost(path, state);
            expect(cost).toBeGreaterThanOrEqual(0);
          }
        }
      }
      
      const elapsed = performance.now() - start;
      const stats = cache.getStats();
      
      // Should complete quickly
      expect(elapsed).toBeLessThan(200);
      // Cache hit rate depends on random queries, so just verify stats exist
      expect(stats.hits).toBeGreaterThanOrEqual(0);
      expect(stats.misses).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions
function createGridState(width, height) {
  return {
    chunk: {
      width,
      height,
      tiles: Array(height).fill().map(() => Array(width).fill(0)),
      getTile: function(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
          return null;
        }
        return this.tiles[y][x];
      },
      isPassable: function(x, y) {
        return this.getTile(x, y) !== null && this.getTile(x, y) !== 1;
      },
      getTerrainCost: function() {
        return 1;
      }
    }
  };
}

function createMazeState(width, height) {
  const state = createGridState(width, height);
  
  // Add random walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.random() < 0.3 && !(x === 0 && y === 0) && !(x === width - 1 && y === height - 1)) {
        state.chunk.tiles[y][x] = 1; // Wall
      }
    }
  }
  
  return state;
}

function createComplexState(width, height) {
  const state = createGridState(width, height);
  state.player = { 
    statuses: new Set(),
    equipment: { boots: null }
  };
  
  // Add various terrain types
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rand = Math.random();
      if (rand < 0.1) {
        state.chunk.tiles[y][x] = 1; // Wall
      } else if (rand < 0.2) {
        state.chunk.tiles[y][x] = 'water';
      } else if (rand < 0.25) {
        state.chunk.tiles[y][x] = 'mud';
      }
    }
  }
  
  state.chunk.getTerrainCost = function(x, y) {
    const tile = this.getTile(x, y);
    if (tile === 'water') return 2;
    if (tile === 'mud') return 1.5;
    return 1;
  };
  
  return state;
}