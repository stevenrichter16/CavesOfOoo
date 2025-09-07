/**
 * Integration example showing how to use SpatialIndex with MovementPipeline
 * This demonstrates the performance improvement from O(n) to O(1) lookups
 */

import { SpatialIndex } from './SpatialIndex.js';

/**
 * Enhanced MovementPipeline method using spatial indexing
 * This would replace the current handleNPCInteraction method
 */
export function handleNPCInteractionWithSpatialIndex(context) {
  const { targetX, targetY, state } = context;
  
  // Skip if edge transition
  if (context.isEdgeTransition) return;
  
  // BEFORE: O(n) linear search through all NPCs
  // const npc = state.npcs?.find(n => 
  //   n.x === targetX && 
  //   n.y === targetY && 
  //   n.hp > 0 &&
  //   n.chunkX === state.cx &&
  //   n.chunkY === state.cy
  // );
  
  // AFTER: O(1) spatial index lookup
  const npc = state.npcSpatialIndex?.getAt(targetX, targetY, {
    minHp: 1,  // Only alive NPCs
    chunkX: state.cx,
    chunkY: state.cy
  });
  
  if (!npc) return;
  
  // Rest of the interaction logic remains the same...
  // Check hostility, emit events, etc.
}

/**
 * State manager that maintains the spatial index
 */
export class NPCStateManager {
  constructor() {
    this.spatialIndex = new SpatialIndex();
    this.npcs = [];
  }
  
  /**
   * Add NPC to both array and spatial index
   */
  addNPC(npc) {
    this.npcs.push(npc);
    this.spatialIndex.add(npc);
  }
  
  /**
   * Remove NPC from both array and spatial index
   */
  removeNPC(npc) {
    const index = this.npcs.indexOf(npc);
    if (index !== -1) {
      this.npcs.splice(index, 1);
      this.spatialIndex.remove(npc);
    }
  }
  
  /**
   * Update NPC position
   */
  moveNPC(npc, newX, newY) {
    // Update NPC object
    npc.x = newX;
    npc.y = newY;
    
    // Update spatial index
    this.spatialIndex.update(npc);
  }
  
  /**
   * Get NPC at position (O(1) operation)
   */
  getNPCAt(x, y, filters) {
    return this.spatialIndex.getAt(x, y, filters);
  }
  
  /**
   * Get NPCs near a position (efficient radius search)
   */
  getNearbyNPCs(x, y, radius, filters) {
    return this.spatialIndex.getWithinRadius(x, y, radius, filters);
  }
  
  /**
   * Load chunk - rebuild spatial index for chunk NPCs
   */
  loadChunk(chunkX, chunkY, chunkNPCs) {
    // Clear old chunk NPCs
    const oldNPCs = this.spatialIndex.getInChunk(chunkX, chunkY);
    oldNPCs.forEach(npc => this.removeNPC(npc));
    
    // Add new chunk NPCs
    chunkNPCs.forEach(npc => {
      npc.chunkX = chunkX;
      npc.chunkY = chunkY;
      this.addNPC(npc);
    });
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return this.spatialIndex.getStats();
  }
}

/**
 * Example usage in game initialization
 */
export function initializeWithSpatialIndex(state) {
  // Create spatial index for the state
  state.npcSpatialIndex = new SpatialIndex();
  
  // Build index from existing NPCs
  if (state.npcs && state.npcs.length > 0) {
    state.npcSpatialIndex.rebuild(state.npcs);
  }
  
  // Hook into NPC creation
  const originalAddNPC = state.addNPC;
  state.addNPC = function(npc) {
    // Call original if it exists
    if (originalAddNPC) {
      originalAddNPC.call(this, npc);
    } else {
      // Default behavior
      if (!state.npcs) state.npcs = [];
      state.npcs.push(npc);
    }
    
    // Update spatial index
    state.npcSpatialIndex.add(npc);
  };
  
  // Hook into NPC movement
  state.moveNPC = function(npc, newX, newY) {
    npc.x = newX;
    npc.y = newY;
    state.npcSpatialIndex.update(npc);
  };
  
  // Hook into NPC removal
  state.removeNPC = function(npc) {
    const index = state.npcs.indexOf(npc);
    if (index !== -1) {
      state.npcs.splice(index, 1);
      state.npcSpatialIndex.remove(npc);
    }
  };
  
  return state;
}

/**
 * Performance comparison example
 */
export function performanceComparison(npcs, iterations = 1000) {
  const results = {
    linearSearch: { time: 0, operations: 0 },
    spatialIndex: { time: 0, operations: 0 }
  };
  
  // Test data - random positions to look up
  const testPositions = [];
  for (let i = 0; i < iterations; i++) {
    testPositions.push({
      x: Math.floor(Math.random() * 48),
      y: Math.floor(Math.random() * 22),
      cx: 0,
      cy: 0
    });
  }
  
  // Linear search (O(n))
  const linearStart = performance.now();
  for (const pos of testPositions) {
    const found = npcs.find(n => 
      n.x === pos.x && 
      n.y === pos.y && 
      n.hp > 0 &&
      n.chunkX === pos.cx &&
      n.chunkY === pos.cy
    );
    results.linearSearch.operations++;
    if (found) results.linearSearch.found = (results.linearSearch.found || 0) + 1;
  }
  results.linearSearch.time = performance.now() - linearStart;
  
  // Spatial index (O(1))
  const spatialIndex = new SpatialIndex();
  spatialIndex.rebuild(npcs);
  
  const spatialStart = performance.now();
  for (const pos of testPositions) {
    const found = spatialIndex.getAt(pos.x, pos.y, {
      minHp: 1,
      chunkX: pos.cx,
      chunkY: pos.cy
    });
    results.spatialIndex.operations++;
    if (found) results.spatialIndex.found = (results.spatialIndex.found || 0) + 1;
  }
  results.spatialIndex.time = performance.now() - spatialStart;
  
  // Calculate improvement
  results.improvement = {
    speedup: (results.linearSearch.time / results.spatialIndex.time).toFixed(2) + 'x',
    linearAvg: (results.linearSearch.time / iterations).toFixed(4) + 'ms',
    spatialAvg: (results.spatialIndex.time / iterations).toFixed(4) + 'ms'
  };
  
  return results;
}