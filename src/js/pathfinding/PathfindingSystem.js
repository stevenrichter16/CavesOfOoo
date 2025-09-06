/**
 * PathfindingSystem - A* pathfinding implementation for efficient movement
 * Finds optimal paths considering terrain costs and obstacles
 */
import { PriorityQueue } from './PriorityQueue.js';

// Configuration constants
export const PATHFINDING_CONFIG = {
  maxSearchNodes: 1000,
  diagonalCost: Math.sqrt(2),
  orthogonalCost: 1,
  heuristics: {
    manhattan: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    euclidean: (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)),
    chebyshev: (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
  }
};

export class PathfindingSystem {
  /**
   * Create a new pathfinding system
   * @param {Object} options - Configuration options
   * @param {boolean} options.allowDiagonal - Allow diagonal movement
   * @param {string} options.heuristic - Heuristic function name
   * @param {number} options.maxSearchNodes - Maximum nodes to search
   */
  constructor(options = {}) {
    this.allowDiagonal = options.allowDiagonal !== undefined ? options.allowDiagonal : true;
    this.heuristic = options.heuristic || 'manhattan';
    this.maxSearchNodes = options.maxSearchNodes || PATHFINDING_CONFIG.maxSearchNodes;
  }

  /**
   * Find path between two points using A* algorithm
   * @param {Object} start - Start position {x, y}
   * @param {Object} end - End position {x, y}
   * @param {Object} state - Game state with chunk data
   * @returns {Array|null} Path as array of {x, y} or null if no path
   */
  findPath(start, end, state) {
    // Validate inputs
    if (!state || !state.chunk) {
      throw new Error('Invalid state: missing chunk data');
    }

    if (!this.isValidPosition(start, state)) {
      throw new Error('Invalid start position');
    }

    if (!this.isValidPosition(end, state)) {
      throw new Error('Invalid end position');
    }

    // Check if start and end are the same
    if (start.x === end.x && start.y === end.y) {
      return [{ x: start.x, y: start.y }];
    }

    // Check if start or end are impassable
    if (!state.chunk.isPassable(start.x, start.y)) {
      return null;
    }

    if (!state.chunk.isPassable(end.x, end.y)) {
      return null;
    }

    // A* algorithm
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = this.positionToKey(start);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.calculateHeuristic(start, end, this.heuristic));
    openSet.enqueue(start, fScore.get(startKey));

    let nodesSearched = 0;

    while (!openSet.isEmpty() && nodesSearched < this.maxSearchNodes) {
      nodesSearched++;
      
      const current = openSet.dequeue().value;
      const currentKey = this.positionToKey(current);

      // Check if we reached the goal
      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(cameFrom, start, end);
      }

      closedSet.add(currentKey);

      // Check all neighbors
      const neighbors = this.getNeighbors(current, state);
      
      for (const neighbor of neighbors) {
        const neighborKey = this.positionToKey(neighbor);
        
        if (closedSet.has(neighborKey)) {
          continue;
        }

        const tentativeGScore = gScore.get(currentKey) + 
          this.getMovementCost(current, neighbor, state);

        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          // This path to neighbor is better
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          const f = tentativeGScore + this.calculateHeuristic(neighbor, end, this.heuristic);
          fScore.set(neighborKey, f);

          if (!openSet.contains(neighbor)) {
            openSet.enqueue(neighbor, f);
          } else {
            openSet.updatePriority(neighbor, f);
          }
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Get valid neighbors for a position
   * @param {Object} pos - Position {x, y}
   * @param {Object} state - Game state
   * @returns {Array} Array of neighbor positions
   */
  getNeighbors(pos, state) {
    const neighbors = [];
    const directions = this.allowDiagonal ? 
      [
        { dx: 0, dy: -1 },  // Up
        { dx: 1, dy: 0 },   // Right
        { dx: 0, dy: 1 },   // Down
        { dx: -1, dy: 0 },  // Left
        { dx: 1, dy: -1 },  // Up-Right
        { dx: 1, dy: 1 },   // Down-Right
        { dx: -1, dy: 1 },  // Down-Left
        { dx: -1, dy: -1 }  // Up-Left
      ] : [
        { dx: 0, dy: -1 },  // Up
        { dx: 1, dy: 0 },   // Right
        { dx: 0, dy: 1 },   // Down
        { dx: -1, dy: 0 }   // Left
      ];

    for (const dir of directions) {
      const newX = pos.x + dir.dx;
      const newY = pos.y + dir.dy;
      
      if (this.isValidPosition({ x: newX, y: newY }, state) &&
          state.chunk.isPassable(newX, newY)) {
        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
  }

  /**
   * Calculate heuristic distance between two points
   * @param {Object} a - First position
   * @param {Object} b - Second position
   * @param {string} heuristicName - Name of heuristic function
   * @returns {number} Heuristic distance
   */
  calculateHeuristic(a, b, heuristicName) {
    const heuristicFn = PATHFINDING_CONFIG.heuristics[heuristicName] || 
                       PATHFINDING_CONFIG.heuristics.manhattan;
    return heuristicFn(a, b);
  }

  /**
   * Get movement cost between two adjacent positions
   * @param {Object} from - From position
   * @param {Object} to - To position
   * @param {Object} state - Game state
   * @returns {number} Movement cost
   */
  getMovementCost(from, to, state) {
    // Base cost depends on if movement is diagonal
    const isDiagonal = from.x !== to.x && from.y !== to.y;
    let cost = isDiagonal ? PATHFINDING_CONFIG.diagonalCost : PATHFINDING_CONFIG.orthogonalCost;

    // Apply terrain cost modifier if available
    if (state.chunk.getTerrainCost) {
      cost *= state.chunk.getTerrainCost(to.x, to.y);
    }

    return cost;
  }

  /**
   * Reconstruct path from came-from map
   * @param {Map} cameFrom - Map of positions to previous positions
   * @param {Object} start - Start position
   * @param {Object} end - End position
   * @returns {Array} Path as array of positions
   */
  reconstructPath(cameFrom, start, end) {
    const path = [];
    let current = end;
    
    while (current.x !== start.x || current.y !== start.y) {
      path.unshift({ x: current.x, y: current.y });
      const key = this.positionToKey(current);
      current = cameFrom.get(key);
      
      if (!current) {
        // Should not happen if algorithm is correct
        console.error('[PathfindingSystem] Path reconstruction failed');
        return null;
      }
    }
    
    path.unshift({ x: start.x, y: start.y });
    return path;
  }

  /**
   * Check if position is valid within chunk bounds
   * @param {Object} pos - Position to check
   * @param {Object} state - Game state
   * @returns {boolean} True if valid
   */
  isValidPosition(pos, state) {
    return pos.x >= 0 && 
           pos.x < state.chunk.width && 
           pos.y >= 0 && 
           pos.y < state.chunk.height;
  }

  /**
   * Convert position to string key for maps
   * @param {Object} pos - Position
   * @returns {string} Position key
   */
  positionToKey(pos) {
    return `${pos.x},${pos.y}`;
  }

  /**
   * Convert string key to position
   * @param {string} key - Position key
   * @returns {Object} Position {x, y}
   */
  keyToPosition(key) {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
}

// Factory function for creating pathfinding system
let _pathfindingSystem = null;

/**
 * Get or create the pathfinding system instance
 * @param {Object} options - Configuration options
 * @returns {PathfindingSystem} The pathfinding system instance
 */
export function getPathfindingSystem(options = {}) {
  if (!_pathfindingSystem) {
    _pathfindingSystem = new PathfindingSystem(options);
  }
  return _pathfindingSystem;
}

/**
 * Reset the pathfinding system (useful for testing)
 */
export function resetPathfindingSystem() {
  _pathfindingSystem = null;
}