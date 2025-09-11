/**
 * IChunkPersistence - Interface definition for chunk persistence
 * All persistence implementations must follow this contract
 */

/**
 * Interface for chunk persistence operations
 * @interface
 */
export class IChunkPersistence {
  /**
   * Save a chunk to persistent storage
   * @param {string} seed - World seed
   * @param {Object} chunk - Chunk data to save
   * @returns {Promise<Object>} Save statistics
   */
  async save(seed, chunk) {
    throw new Error('save() must be implemented');
  }
  
  /**
   * Load a chunk from persistent storage
   * @param {string} seed - World seed
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {Promise<Object|null>} Chunk data or null if not found
   */
  async load(seed, cx, cy) {
    throw new Error('load() must be implemented');
  }
  
  /**
   * Delete a chunk from persistent storage
   * @param {string} seed - World seed
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(seed, cx, cy) {
    throw new Error('delete() must be implemented');
  }
  
  /**
   * Check if a chunk exists in storage
   * @param {string} seed - World seed
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {Promise<boolean>} True if exists
   */
  async exists(seed, cx, cy) {
    throw new Error('exists() must be implemented');
  }
  
  /**
   * Save multiple chunks in batch
   * @param {string} seed - World seed
   * @param {Array} chunks - Array of chunks to save
   * @returns {Promise<Object>} Batch save statistics
   */
  async saveBatch(seed, chunks) {
    // Default implementation - can be overridden for optimization
    const results = [];
    for (const chunk of chunks) {
      results.push(await this.save(seed, chunk));
    }
    return { saved: chunks.length, results };
  }
  
  /**
   * Load multiple chunks in batch
   * @param {string} seed - World seed
   * @param {Array} coords - Array of {cx, cy} coordinates
   * @returns {Promise<Array>} Array of loaded chunks
   */
  async loadBatch(seed, coords) {
    // Default implementation - can be overridden for optimization
    const results = [];
    for (const coord of coords) {
      const chunk = await this.load(seed, coord.cx, coord.cy);
      if (chunk) results.push(chunk);
    }
    return results;
  }
  
  /**
   * Delete multiple chunks in batch
   * @param {string} seed - World seed
   * @param {Array} coords - Array of {cx, cy} coordinates
   * @returns {Promise<Object>} Deletion statistics
   */
  async deleteBatch(seed, coords) {
    // Default implementation - can be overridden for optimization
    let deleted = 0;
    for (const coord of coords) {
      if (await this.delete(seed, coord.cx, coord.cy)) {
        deleted++;
      }
    }
    return { deleted, requested: coords.length };
  }
  
  /**
   * Query chunks in a rectangular region
   * @param {string} seed - World seed
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @returns {Promise<Array>} Chunks in region
   */
  async queryRegion(seed, x1, y1, x2, y2) {
    throw new Error('queryRegion() must be implemented');
  }
  
  /**
   * Query chunks by metadata criteria
   * @param {string} seed - World seed
   * @param {Object} criteria - Query criteria
   * @returns {Promise<Array>} Matching chunks
   */
  async queryByMetadata(seed, criteria) {
    throw new Error('queryByMetadata() must be implemented');
  }
  
  /**
   * List all saved chunk coordinates
   * @param {string} seed - World seed
   * @returns {Promise<Array>} Array of {cx, cy} coordinates
   */
  async listChunks(seed) {
    throw new Error('listChunks() must be implemented');
  }
}

/**
 * Memory-based implementation for testing and development
 */
export class MemoryPersistence extends IChunkPersistence {
  constructor() {
    super();
    this.storage = new Map(); // seed -> Map(key -> chunk)
    this.stats = {
      saves: 0,
      loads: 0,
      deletes: 0,
      totalSize: 0
    };
    this.compressionEnabled = false;
    this.simulatedError = null;
    this.currentVersion = '1.0.0';
  }
  
  _getKey(cx, cy) {
    return `${cx},${cy}`;
  }
  
  _getSeedStorage(seed) {
    if (!this.storage.has(seed)) {
      this.storage.set(seed, new Map());
    }
    return this.storage.get(seed);
  }
  
  async save(seed, chunk) {
    if (this.simulatedError === 'save') {
      throw new Error('Simulated save error');
    }
    
    // Version check
    if (chunk.metadata?.version && chunk.metadata.version > this.currentVersion) {
      throw new Error(`Incompatible version: ${chunk.metadata.version}`);
    }
    
    const storage = this._getSeedStorage(seed);
    const key = this._getKey(chunk.cx, chunk.cy);
    
    // Clone chunk to avoid mutations
    const chunkCopy = JSON.parse(JSON.stringify(chunk));
    
    // Ensure metadata
    if (!chunkCopy.metadata) {
      chunkCopy.metadata = {};
    }
    chunkCopy.metadata.version = this.currentVersion;
    chunkCopy.metadata.savedAt = Date.now();
    
    // Calculate size
    const originalSize = JSON.stringify(chunkCopy).length;
    let compressedSize = originalSize;
    
    if (this.compressionEnabled) {
      // Simulate compression (in real implementation, use actual compression)
      compressedSize = Math.floor(originalSize * 0.3);
    }
    
    storage.set(key, chunkCopy);
    
    this.stats.saves++;
    this.stats.totalSize += compressedSize;
    
    return {
      saved: true,
      originalSize,
      compressedSize,
      compressed: this.compressionEnabled
    };
  }
  
  async load(seed, cx, cy) {
    if (this.simulatedError === 'load') {
      throw new Error('Simulated load error');
    }
    
    const storage = this._getSeedStorage(seed);
    const key = this._getKey(cx, cy);
    
    if (!storage.has(key)) {
      return null;
    }
    
    const chunk = storage.get(key);
    
    // Version migration
    if (!chunk.metadata) {
      chunk.metadata = { version: '1.0.0' };
    } else if (chunk.version && !chunk.metadata.version) {
      // Old format migration
      chunk.metadata.version = '1.0.0';
      delete chunk.version;
    }
    
    this.stats.loads++;
    
    // Return a copy to avoid mutations
    return JSON.parse(JSON.stringify(chunk));
  }
  
  async delete(seed, cx, cy) {
    const storage = this._getSeedStorage(seed);
    const key = this._getKey(cx, cy);
    
    const existed = storage.has(key);
    storage.delete(key);
    
    if (existed) {
      this.stats.deletes++;
    }
    
    return existed;
  }
  
  async exists(seed, cx, cy) {
    const storage = this._getSeedStorage(seed);
    const key = this._getKey(cx, cy);
    return storage.has(key);
  }
  
  async queryRegion(seed, x1, y1, x2, y2) {
    const storage = this._getSeedStorage(seed);
    const results = [];
    
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    for (const [key, chunk] of storage) {
      if (chunk.cx >= minX && chunk.cx <= maxX &&
          chunk.cy >= minY && chunk.cy <= maxY) {
        results.push(JSON.parse(JSON.stringify(chunk)));
      }
    }
    
    return results;
  }
  
  async queryByMetadata(seed, criteria) {
    const storage = this._getSeedStorage(seed);
    const results = [];
    
    for (const [key, chunk] of storage) {
      let matches = true;
      
      for (const [field, value] of Object.entries(criteria)) {
        if (chunk[field] !== value && chunk.metadata?.[field] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        results.push(JSON.parse(JSON.stringify(chunk)));
      }
    }
    
    return results;
  }
  
  async listChunks(seed) {
    const storage = this._getSeedStorage(seed);
    const coords = [];
    
    for (const [key, chunk] of storage) {
      coords.push({ cx: chunk.cx, cy: chunk.cy });
    }
    
    return coords;
  }
  
  // Additional methods for testing
  setCompression(enabled) {
    this.compressionEnabled = enabled;
  }
  
  simulateError(type) {
    this.simulatedError = type;
  }
  
  clearErrors() {
    this.simulatedError = null;
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  clear() {
    this.storage.clear();
    this.stats = {
      saves: 0,
      loads: 0,
      deletes: 0,
      totalSize: 0
    };
  }
}

/**
 * Factory for creating persistence implementations
 */
export class PersistenceFactory {
  static create(type = 'memory', config = {}) {
    switch (type) {
      case 'memory':
        return new MemoryPersistence();
      
      case 'filesystem':
        // Phase 4 will implement this
        throw new Error('Filesystem persistence not yet implemented');
      
      case 'database':
        // Phase 4 will implement this
        throw new Error('Database persistence not yet implemented');
      
      default:
        throw new Error(`Unknown persistence type: ${type}`);
    }
  }
}