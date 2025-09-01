// systems/pathfinding.js - A* pathfinding for cursor-based movement commands

import { W, H } from '../core/config.js';

// Node class for A* pathfinding
class PathNode {
  constructor(x, y, g = 0, h = 0, parent = null) {
    this.x = x;
    this.y = y;
    this.g = g; // Cost from start
    this.h = h; // Heuristic cost to end
    this.f = g + h; // Total cost
    this.parent = parent;
  }
}

// Check if a tile is walkable
export function isWalkable(state, x, y) {
  // Check bounds
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  
  // Check map tile
  const tile = state.chunk.map[y][x];
  if (tile === '#' || tile === ' ') return false; // Walls and empty tiles block
  // Water is walkable but slower
  
  // Check for monsters (except target)
  const monster = state.chunk.monsters?.find(m => 
    m.x === x && m.y === y && m.alive
  );
  if (monster) return false;
  
  return true;
}

// Manhattan distance heuristic
function heuristic(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Get neighbors of a position
function getNeighbors(x, y) {
  return [
    { x: x, y: y - 1 }, // North
    { x: x + 1, y: y },  // East
    { x: x, y: y + 1 },  // South
    { x: x - 1, y: y }   // West
  ];
}

/**
 * Find path from start to goal using A* algorithm
 * Returns array of {x, y} positions, or null if no path exists
 */
export function findPath(state, startX, startY, goalX, goalY, options = {}) {
  // Allow walking to adjacent tile of occupied goal (for attacking)
  const allowAdjacent = options.allowAdjacent || false;
  
  // Check if goal is reachable
  if (!allowAdjacent && !isWalkable(state, goalX, goalY)) {
    return null;
  }
  
  const openSet = [];
  const closedSet = new Set();
  const startNode = new PathNode(startX, startY, 0, heuristic(startX, startY, goalX, goalY));
  openSet.push(startNode);
  
  while (openSet.length > 0) {
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    
    // Check if we reached the goal
    if (current.x === goalX && current.y === goalY) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }
    
    // Check if we're adjacent to goal (for attacking)
    if (allowAdjacent) {
      const dist = Math.abs(current.x - goalX) + Math.abs(current.y - goalY);
      if (dist === 1) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }
    }
    
    closedSet.add(`${current.x},${current.y}`);
    
    // Check neighbors
    const neighbors = getNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      
      // Skip if in closed set
      if (closedSet.has(key)) continue;
      
      // Skip if not walkable (unless it's the goal)
      if (neighbor.x !== goalX || neighbor.y !== goalY) {
        if (!isWalkable(state, neighbor.x, neighbor.y)) continue;
      }
      
      const g = current.g + 1;
      const h = heuristic(neighbor.x, neighbor.y, goalX, goalY);
      
      // Check if neighbor is already in open set
      const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      if (existingNode) {
        // Update if this path is better
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = g + h;
          existingNode.parent = current;
        }
      } else {
        // Add new node
        openSet.push(new PathNode(neighbor.x, neighbor.y, g, h, current));
      }
    }
  }
  
  // No path found
  return null;
}

/**
 * Execute movement along a path
 */
export function followPath(state, path, onComplete) {
  if (!path || path.length <= 1) {
    if (onComplete) onComplete();
    return;
  }
  
  // Store path in state for visualization
  state.currentPath = path;
  state.pathIndex = 0;
  state.pathCallback = onComplete;
  
  // Path following will be handled by the game's turn system
  return true;
}