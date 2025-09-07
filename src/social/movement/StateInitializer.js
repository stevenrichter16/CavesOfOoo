/**
 * StateInitializer - Initializes game state with spatial indexing support
 * Provides hooks for NPC management that maintain the spatial index
 */

import { SpatialIndex } from './SpatialIndex.js';

/**
 * Initialize state with spatial index and management hooks
 * @param {Object} state - Initial game state
 * @returns {Object} Enhanced state with spatial indexing
 */
export function initializeStateWithSpatialIndex(state = {}) {
  // Ensure npcs array exists
  if (!state.npcs) {
    state.npcs = [];
  }
  
  // Create spatial index
  state.npcSpatialIndex = new SpatialIndex();
  
  // Build index from existing NPCs
  if (state.npcs.length > 0) {
    state.npcSpatialIndex.rebuild(state.npcs);
  }
  
  /**
   * Add an NPC to the state
   * @param {Object} npc - NPC to add
   */
  state.addNPC = function(npc) {
    if (!npc || !npc.id) {
      throw new Error('Invalid NPC: must have an id');
    }
    
    // Add to array
    this.npcs.push(npc);
    
    // Add to spatial index
    if (this.npcSpatialIndex) {
      this.npcSpatialIndex.add(npc);
    }
    
    return npc;
  };
  
  /**
   * Remove an NPC from the state
   * @param {Object} npc - NPC to remove
   */
  state.removeNPC = function(npc) {
    if (!npc) return false;
    
    // Remove from array
    const index = this.npcs.indexOf(npc);
    if (index === -1) return false;
    
    this.npcs.splice(index, 1);
    
    // Remove from spatial index
    if (this.npcSpatialIndex) {
      this.npcSpatialIndex.remove(npc);
    }
    
    return true;
  };
  
  /**
   * Move an NPC to a new position
   * @param {Object} npc - NPC to move
   * @param {number} newX - New X coordinate
   * @param {number} newY - New Y coordinate
   */
  state.moveNPC = function(npc, newX, newY) {
    if (!npc) {
      throw new Error('Invalid NPC');
    }
    
    if (typeof newX !== 'number' || typeof newY !== 'number') {
      throw new Error('Invalid coordinates: must be numbers');
    }
    
    // Update NPC position
    npc.x = newX;
    npc.y = newY;
    
    // Update spatial index
    if (this.npcSpatialIndex) {
      this.npcSpatialIndex.update(npc);
    }
    
    return npc;
  };
  
  /**
   * Update NPC health (for filtering dead NPCs)
   * @param {Object} npc - NPC whose health changed
   */
  state.updateNPCHealth = function(npc) {
    // Spatial index doesn't need update for hp changes
    // The filtering happens at query time
    // This method exists for future extensions (e.g., removing dead NPCs)
    
    if (npc.hp <= 0 && this.removeDeadNPCs) {
      this.removeNPC(npc);
    }
  };
  
  /**
   * Get NPC at specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} filters - Optional filters
   * @returns {Object|null} NPC at position or null
   */
  state.getNPCAt = function(x, y, filters = {}) {
    // Use spatial index if available
    if (this.npcSpatialIndex) {
      return this.npcSpatialIndex.getAt(x, y, filters);
    }
    
    // Fallback to linear search
    return this.npcs.find(npc => {
      if (npc.x !== x || npc.y !== y) return false;
      
      // Apply filters
      if (filters.minHp !== undefined && npc.hp < filters.minHp) return false;
      if (filters.chunkX !== undefined && npc.chunkX !== filters.chunkX) return false;
      if (filters.chunkY !== undefined && npc.chunkY !== filters.chunkY) return false;
      
      return true;
    }) || null;
  };
  
  /**
   * Get all NPCs at specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} filters - Optional filters
   * @returns {Array} NPCs at position
   */
  state.getAllNPCsAt = function(x, y, filters = {}) {
    if (this.npcSpatialIndex) {
      return this.npcSpatialIndex.getAllAt(x, y, filters);
    }
    
    // Fallback to linear search
    return this.npcs.filter(npc => {
      if (npc.x !== x || npc.y !== y) return false;
      
      // Apply filters
      if (filters.minHp !== undefined && npc.hp < filters.minHp) return false;
      if (filters.chunkX !== undefined && npc.chunkX !== filters.chunkX) return false;
      if (filters.chunkY !== undefined && npc.chunkY !== filters.chunkY) return false;
      
      return true;
    });
  };
  
  /**
   * Get NPCs within radius of a position
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} radius - Search radius
   * @param {Object} filters - Optional filters
   * @returns {Array} NPCs within radius
   */
  state.getNPCsNearby = function(x, y, radius, filters = {}) {
    if (this.npcSpatialIndex) {
      return this.npcSpatialIndex.getWithinRadius(x, y, radius, filters);
    }
    
    // Fallback to linear search
    const radiusSquared = radius * radius;
    return this.npcs.filter(npc => {
      const dx = npc.x - x;
      const dy = npc.y - y;
      if (dx * dx + dy * dy > radiusSquared) return false;
      
      // Apply filters
      if (filters.minHp !== undefined && npc.hp < filters.minHp) return false;
      if (filters.chunkX !== undefined && npc.chunkX !== filters.chunkX) return false;
      if (filters.chunkY !== undefined && npc.chunkY !== filters.chunkY) return false;
      
      return true;
    });
  };
  
  /**
   * Rebuild spatial index from current NPCs array
   * Useful after bulk operations or corruption
   */
  state.rebuildSpatialIndex = function() {
    if (!this.npcSpatialIndex) {
      this.npcSpatialIndex = new SpatialIndex();
    }
    
    this.npcSpatialIndex.rebuild(this.npcs);
  };
  
  /**
   * Get spatial index statistics
   * @returns {Object} Statistics object
   */
  state.getSpatialIndexStats = function() {
    if (!this.npcSpatialIndex) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      ...this.npcSpatialIndex.getStats()
    };
  };
  
  /**
   * Load NPCs for a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @param {Array} chunkNPCs - NPCs to load
   */
  state.loadChunkNPCs = function(chunkX, chunkY, chunkNPCs) {
    // Remove old NPCs from this chunk
    if (this.npcSpatialIndex) {
      const oldNPCs = this.npcSpatialIndex.getInChunk(chunkX, chunkY);
      oldNPCs.forEach(npc => this.removeNPC(npc));
    } else {
      // Fallback: remove by filtering
      this.npcs = this.npcs.filter(npc => 
        npc.chunkX !== chunkX || npc.chunkY !== chunkY
      );
    }
    
    // Add new NPCs
    chunkNPCs.forEach(npc => {
      npc.chunkX = chunkX;
      npc.chunkY = chunkY;
      this.addNPC(npc);
    });
  };
  
  /**
   * Clear all NPCs
   */
  state.clearNPCs = function() {
    this.npcs = [];
    
    if (this.npcSpatialIndex) {
      this.npcSpatialIndex.clear();
    }
  };
  
  return state;
}

/**
 * Create a new game state with spatial indexing
 * @param {Object} config - Configuration options
 * @returns {Object} New state with spatial indexing
 */
export function createStateWithSpatialIndex(config = {}) {
  const state = {
    // Player
    player: config.player || { x: 0, y: 0, hp: 100 },
    
    // Chunk info
    cx: config.cx || 0,
    cy: config.cy || 0,
    chunk: config.chunk || null,
    
    // NPCs
    npcs: config.npcs || [],
    
    // Settings
    removeDeadNPCs: config.removeDeadNPCs || false,
    
    // Logging
    log: config.log || console.log
  };
  
  return initializeStateWithSpatialIndex(state);
}