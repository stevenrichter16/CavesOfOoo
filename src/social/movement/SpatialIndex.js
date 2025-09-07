/**
 * SpatialIndex - Efficient spatial indexing for NPC lookups
 * Provides O(1) lookups by position instead of O(n) array searches
 */

export class SpatialIndex {
  constructor() {
    // Primary index: "x,y" -> Set of NPCs at that position
    this.positionIndex = new Map();
    
    // Chunk index: "chunkX,chunkY" -> Set of NPCs in that chunk
    this.chunkIndex = new Map();
    
    // NPC tracking: npcId -> position for updates
    this.npcPositions = new Map();
    
    // Statistics for performance monitoring
    this.stats = {
      lookups: 0,
      hits: 0,
      misses: 0,
      updates: 0
    };
  }
  
  /**
   * Add an NPC to the spatial index
   * @param {Object} npc - NPC object with x, y, chunkX, chunkY, id
   */
  add(npc) {
    if (!npc || typeof npc.x !== 'number' || typeof npc.y !== 'number') {
      throw new Error('Invalid NPC: must have numeric x and y coordinates');
    }
    
    const posKey = this._getPositionKey(npc.x, npc.y);
    const chunkKey = this._getChunkKey(npc.chunkX || 0, npc.chunkY || 0);
    
    // Add to position index
    if (!this.positionIndex.has(posKey)) {
      this.positionIndex.set(posKey, new Set());
    }
    this.positionIndex.get(posKey).add(npc);
    
    // Add to chunk index
    if (!this.chunkIndex.has(chunkKey)) {
      this.chunkIndex.set(chunkKey, new Set());
    }
    this.chunkIndex.get(chunkKey).add(npc);
    
    // Track NPC position for updates
    this.npcPositions.set(npc.id, {
      x: npc.x,
      y: npc.y,
      chunkX: npc.chunkX || 0,
      chunkY: npc.chunkY || 0
    });
  }
  
  /**
   * Remove an NPC from the spatial index
   * @param {Object} npc - NPC to remove
   */
  remove(npc) {
    if (!npc || !npc.id) return;
    
    const oldPos = this.npcPositions.get(npc.id);
    if (!oldPos) return;
    
    // Remove from position index
    const posKey = this._getPositionKey(oldPos.x, oldPos.y);
    const posSet = this.positionIndex.get(posKey);
    if (posSet) {
      posSet.delete(npc);
      if (posSet.size === 0) {
        this.positionIndex.delete(posKey);
      }
    }
    
    // Remove from chunk index
    const chunkKey = this._getChunkKey(oldPos.chunkX, oldPos.chunkY);
    const chunkSet = this.chunkIndex.get(chunkKey);
    if (chunkSet) {
      chunkSet.delete(npc);
      if (chunkSet.size === 0) {
        this.chunkIndex.delete(chunkKey);
      }
    }
    
    // Remove position tracking
    this.npcPositions.delete(npc.id);
  }
  
  /**
   * Update an NPC's position in the index
   * @param {Object} npc - NPC with updated position
   */
  update(npc) {
    this.stats.updates++;
    
    // Remove from old position
    this.remove(npc);
    
    // Add to new position
    this.add(npc);
  }
  
  /**
   * Get NPC at specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} filters - Optional filters (hp > 0, chunkX, chunkY)
   * @returns {Object|null} NPC at position or null
   */
  getAt(x, y, filters = {}) {
    this.stats.lookups++;
    
    const posKey = this._getPositionKey(x, y);
    const npcsAtPosition = this.positionIndex.get(posKey);
    
    if (!npcsAtPosition || npcsAtPosition.size === 0) {
      this.stats.misses++;
      return null;
    }
    
    // Apply filters
    for (const npc of npcsAtPosition) {
      if (this._matchesFilters(npc, filters)) {
        this.stats.hits++;
        return npc;
      }
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * Get all NPCs at specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of NPCs at position
   */
  getAllAt(x, y, filters = {}) {
    const posKey = this._getPositionKey(x, y);
    const npcsAtPosition = this.positionIndex.get(posKey);
    
    if (!npcsAtPosition || npcsAtPosition.size === 0) {
      return [];
    }
    
    const result = [];
    for (const npc of npcsAtPosition) {
      if (this._matchesFilters(npc, filters)) {
        result.push(npc);
      }
    }
    
    return result;
  }
  
  /**
   * Get all NPCs within a radius
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Search radius
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of NPCs within radius
   */
  getWithinRadius(centerX, centerY, radius, filters = {}) {
    const result = [];
    const radiusSquared = radius * radius;
    
    // Check all positions within bounding box
    const minX = Math.floor(centerX - radius);
    const maxX = Math.ceil(centerX + radius);
    const minY = Math.floor(centerY - radius);
    const maxY = Math.ceil(centerY + radius);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if position is within circle
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radiusSquared) {
          const npcs = this.getAllAt(x, y, filters);
          result.push(...npcs);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get all NPCs in a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of NPCs in chunk
   */
  getInChunk(chunkX, chunkY, filters = {}) {
    const chunkKey = this._getChunkKey(chunkX, chunkY);
    const npcsInChunk = this.chunkIndex.get(chunkKey);
    
    if (!npcsInChunk || npcsInChunk.size === 0) {
      return [];
    }
    
    const result = [];
    for (const npc of npcsInChunk) {
      if (this._matchesFilters(npc, filters)) {
        result.push(npc);
      }
    }
    
    return result;
  }
  
  /**
   * Get all NPCs within a rectangle
   * @param {number} x1 - Top-left X
   * @param {number} y1 - Top-left Y
   * @param {number} x2 - Bottom-right X
   * @param {number} y2 - Bottom-right Y
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of NPCs in rectangle
   */
  getInRectangle(x1, y1, x2, y2, filters = {}) {
    const result = [];
    
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const npcs = this.getAllAt(x, y, filters);
        result.push(...npcs);
      }
    }
    
    return result;
  }
  
  /**
   * Clear all indices
   */
  clear() {
    this.positionIndex.clear();
    this.chunkIndex.clear();
    this.npcPositions.clear();
    this.stats = {
      lookups: 0,
      hits: 0,
      misses: 0,
      updates: 0
    };
  }
  
  /**
   * Get statistics about index performance
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.lookups > 0 
        ? (this.stats.hits / this.stats.lookups * 100).toFixed(2) + '%'
        : '0%',
      totalNPCs: this.npcPositions.size,
      uniquePositions: this.positionIndex.size,
      chunks: this.chunkIndex.size
    };
  }
  
  /**
   * Rebuild index from array of NPCs
   * @param {Array} npcs - Array of NPCs
   */
  rebuild(npcs) {
    this.clear();
    for (const npc of npcs) {
      this.add(npc);
    }
  }
  
  // Private helper methods
  
  _getPositionKey(x, y) {
    return `${x},${y}`;
  }
  
  _getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }
  
  _matchesFilters(npc, filters) {
    // Check alive filter
    if (filters.alive !== undefined) {
      if (filters.alive && npc.hp <= 0) return false;
      if (!filters.alive && npc.hp > 0) return false;
    }
    
    // Check hp filter
    if (filters.hp !== undefined && npc.hp !== filters.hp) {
      return false;
    }
    
    if (filters.minHp !== undefined && npc.hp < filters.minHp) {
      return false;
    }
    
    // Check chunk filters
    if (filters.chunkX !== undefined && npc.chunkX !== filters.chunkX) {
      return false;
    }
    
    if (filters.chunkY !== undefined && npc.chunkY !== filters.chunkY) {
      return false;
    }
    
    // Check faction filter
    if (filters.faction && !npc.factions?.includes(filters.faction)) {
      return false;
    }
    
    // Check role filter
    if (filters.role && npc.role !== filters.role) {
      return false;
    }
    
    // Check hostile filter
    if (filters.hostile !== undefined) {
      const isHostile = npc.attitude === 'hostile';
      if (filters.hostile !== isHostile) return false;
    }
    
    return true;
  }
}

// Singleton instance for global NPC tracking
let globalIndex = null;

/**
 * Get or create the global spatial index
 * @returns {SpatialIndex}
 */
export function getGlobalSpatialIndex() {
  if (!globalIndex) {
    globalIndex = new SpatialIndex();
  }
  return globalIndex;
}

/**
 * Reset the global spatial index
 */
export function resetGlobalSpatialIndex() {
  if (globalIndex) {
    globalIndex.clear();
  }
  globalIndex = null;
}