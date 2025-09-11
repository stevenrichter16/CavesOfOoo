/**
 * Modification Tracker - Tracks all changes to chunks
 */

export class ModificationTracker {
  constructor() {
    this.modifications = new Map(); // "cx,cy" -> modifications object
    this.maxTrackedChunks = 1000; // Limit tracked chunks to prevent memory leak
  }
  
  /**
   * Get chunk key
   */
  getChunkKey(chunk) {
    if (typeof chunk === 'object' && chunk.cx !== undefined && chunk.cy !== undefined) {
      return `${chunk.cx},${chunk.cy}`;
    }
    // If passed coordinates directly
    return `${arguments[0]},${arguments[1]}`;
  }
  
  /**
   * Get or create modifications for chunk
   */
  getOrCreateModifications(chunk) {
    const key = this.getChunkKey(chunk);
    
    if (!this.modifications.has(key)) {
      this.modifications.set(key, {
        tiles: {},
        entities: {
          added: [],
          removed: [],
          modified: []
        },
        items: {
          added: [],
          pickedUp: [],
          modified: []
        },
        structures: []
      });
    }
    
    return this.modifications.get(key);
  }
  
  /**
   * Track tile change
   */
  trackTileChange(chunk, x, y, originalTile, newTile) {
    const mods = this.getOrCreateModifications(chunk);
    const key = `${x},${y}`;
    
    mods.tiles[key] = {
      original: originalTile,
      current: newTile,
      timestamp: Date.now()
    };
    
    this._cleanupIfNeeded();
  }
  
  /**
   * Track entity added
   */
  trackEntityAdded(chunk, entityType, entity) {
    const mods = this.getOrCreateModifications(chunk);
    
    mods.entities.added.push({
      type: entityType,
      entity: entity,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track entity removed
   */
  trackEntityRemoved(chunk, entityType, entity) {
    const mods = this.getOrCreateModifications(chunk);
    
    mods.entities.removed.push({
      type: entityType,
      entity: entity,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track item pickup
   */
  trackItemPickup(chunk, item, playerId) {
    const mods = this.getOrCreateModifications(chunk);
    
    mods.items.pickedUp.push({
      item: item,
      playerId: playerId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track structure built
   */
  trackStructureBuilt(chunk, structure) {
    const mods = this.getOrCreateModifications(chunk);
    mods.structures.push(structure);
  }
  
  /**
   * Get modifications for a chunk
   */
  getModifications(cx, cy) {
    const key = `${cx},${cy}`;
    return this.modifications.get(key) || {
      tiles: {},
      entities: { added: [], removed: [], modified: [] },
      items: { added: [], pickedUp: [], modified: [] },
      structures: []
    };
  }
  
  /**
   * Clear modifications for a chunk
   */
  clearModifications(cx, cy) {
    const key = `${cx},${cy}`;
    this.modifications.delete(key);
  }
  
  /**
   * Get all modified chunks
   */
  getModifiedChunks() {
    return Array.from(this.modifications.keys()).map(key => {
      const [cx, cy] = key.split(',').map(Number);
      return { cx, cy };
    });
  }
  
  /**
   * Cleanup old modifications if over limit
   */
  _cleanupIfNeeded() {
    if (this.modifications.size > this.maxTrackedChunks) {
      // Remove oldest 10% of entries
      const toRemove = Math.ceil(this.maxTrackedChunks * 0.1);
      const keys = Array.from(this.modifications.keys());
      
      // Remove from the beginning (oldest entries)
      for (let i = 0; i < toRemove && i < keys.length; i++) {
        this.modifications.delete(keys[i]);
      }
    }
  }
  
  /**
   * Clear all modifications (for cleanup)
   */
  clear() {
    this.modifications.clear();
  }
}