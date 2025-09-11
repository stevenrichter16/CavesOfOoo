/**
 * Optimized Chunk Serializer
 * Provides efficient serialization with object pooling and delta compression
 */

export class ChunkSerializer {
  constructor() {
    // Object pools to reduce allocation
    this.bufferPool = [];
    this.maxPoolSize = 10;
    
    // Cache for repeated operations
    this.tileTypeMap = new Map();
    this.tileTypeCounter = 0;
    
    // Initialize common tile types
    this.registerTileType('#'); // Wall
    this.registerTileType('.'); // Floor
    this.registerTileType('~'); // Water
    this.registerTileType('·'); // Alt floor
  }
  
  /**
   * Register a tile type for efficient encoding
   */
  registerTileType(tile) {
    if (!this.tileTypeMap.has(tile)) {
      this.tileTypeMap.set(tile, this.tileTypeCounter++);
    }
    return this.tileTypeMap.get(tile);
  }
  
  /**
   * Get a buffer from pool or create new
   */
  getBuffer() {
    return this.bufferPool.pop() || { data: null };
  }
  
  /**
   * Return buffer to pool
   */
  releaseBuffer(buffer) {
    if (this.bufferPool.length < this.maxPoolSize) {
      buffer.data = null; // Clear data
      this.bufferPool.push(buffer);
    }
  }
  
  /**
   * Efficient shallow clone for chunks
   * Avoids JSON.parse(JSON.stringify()) overhead
   */
  cloneChunk(chunk) {
    const clone = {
      cx: chunk.cx,
      cy: chunk.cy,
      biome: chunk.biome,
      metadata: chunk.metadata ? { ...chunk.metadata } : {},
      features: chunk.features ? [...chunk.features] : [],
      items: chunk.items ? [...chunk.items] : [],
      npcs: chunk.npcs ? [...chunk.npcs] : [],
      monsters: chunk.monsters ? [...chunk.monsters] : []
    };
    
    // Clone map efficiently
    if (chunk.map) {
      clone.map = new Array(chunk.map.length);
      for (let i = 0; i < chunk.map.length; i++) {
        if (chunk.map[i]) {
          clone.map[i] = [...chunk.map[i]];
        } else {
          clone.map[i] = null;
        }
      }
    }
    
    return clone;
  }
  
  /**
   * Compress chunk data using run-length encoding
   */
  compressChunk(chunk) {
    const compressed = {
      cx: chunk.cx,
      cy: chunk.cy,
      biome: chunk.biome,
      metadata: chunk.metadata,
      features: chunk.features,
      items: chunk.items,
      npcs: chunk.npcs,
      monsters: chunk.monsters,
      mapRuns: []
    };
    
    // Compress map using run-length encoding
    if (chunk.map) {
      let currentTile = null;
      let runLength = 0;
      
      for (let y = 0; y < chunk.map.length; y++) {
        for (let x = 0; x < (chunk.map[y] ? chunk.map[y].length : 0); x++) {
          const tile = chunk.map[y][x];
          
          if (tile === currentTile) {
            runLength++;
          } else {
            if (currentTile !== null) {
              compressed.mapRuns.push([
                this.registerTileType(currentTile),
                runLength
              ]);
            }
            currentTile = tile;
            runLength = 1;
          }
        }
      }
      
      // Add final run
      if (currentTile !== null) {
        compressed.mapRuns.push([
          this.registerTileType(currentTile),
          runLength
        ]);
      }
    }
    
    return compressed;
  }
  
  /**
   * Decompress chunk data
   */
  decompressChunk(compressed) {
    const chunk = {
      cx: compressed.cx,
      cy: compressed.cy,
      biome: compressed.biome,
      metadata: compressed.metadata || {},
      features: compressed.features || [],
      items: compressed.items || [],
      npcs: compressed.npcs || [],
      monsters: compressed.monsters || []
    };
    
    // Decompress map
    if (compressed.mapRuns) {
      const width = 24; // CHUNK_WIDTH
      const height = 22; // CHUNK_HEIGHT
      chunk.map = new Array(height);
      
      for (let i = 0; i < height; i++) {
        chunk.map[i] = new Array(width);
      }
      
      let index = 0;
      const reverseTileMap = Array.from(this.tileTypeMap.entries())
        .reduce((acc, [tile, id]) => {
          acc[id] = tile;
          return acc;
        }, {});
      
      for (const [tileId, runLength] of compressed.mapRuns) {
        const tile = reverseTileMap[tileId];
        
        for (let i = 0; i < runLength; i++) {
          const y = Math.floor(index / width);
          const x = index % width;
          
          if (y < height && x < width) {
            chunk.map[y][x] = tile;
          }
          
          index++;
        }
      }
    }
    
    return chunk;
  }
  
  /**
   * Create a delta between two chunks
   */
  createDelta(oldChunk, newChunk) {
    const delta = {
      cx: newChunk.cx,
      cy: newChunk.cy,
      tileChanges: [],
      itemChanges: {
        added: [],
        removed: [],
        modified: []
      },
      npcChanges: {
        added: [],
        removed: [],
        modified: []
      }
    };
    
    // Compare maps
    if (oldChunk.map && newChunk.map) {
      for (let y = 0; y < newChunk.map.length; y++) {
        for (let x = 0; x < (newChunk.map[y] ? newChunk.map[y].length : 0); x++) {
          const oldTile = oldChunk.map[y] ? oldChunk.map[y][x] : null;
          const newTile = newChunk.map[y][x];
          
          if (oldTile !== newTile) {
            delta.tileChanges.push([x, y, this.registerTileType(newTile)]);
          }
        }
      }
    }
    
    // Compare items efficiently
    const oldItemSet = new Set(oldChunk.items ? oldChunk.items.map(i => i.id || JSON.stringify(i)) : []);
    const newItemSet = new Set(newChunk.items ? newChunk.items.map(i => i.id || JSON.stringify(i)) : []);
    
    if (newChunk.items) {
      for (const item of newChunk.items) {
        const key = item.id || JSON.stringify(item);
        if (!oldItemSet.has(key)) {
          delta.itemChanges.added.push(item);
        }
      }
    }
    
    if (oldChunk.items) {
      for (const item of oldChunk.items) {
        const key = item.id || JSON.stringify(item);
        if (!newItemSet.has(key)) {
          delta.itemChanges.removed.push(item);
        }
      }
    }
    
    return delta;
  }
  
  /**
   * Apply a delta to a chunk
   */
  applyDelta(chunk, delta) {
    // Apply tile changes
    if (delta.tileChanges) {
      const reverseTileMap = Array.from(this.tileTypeMap.entries())
        .reduce((acc, [tile, id]) => {
          acc[id] = tile;
          return acc;
        }, {});
      
      for (const [x, y, tileId] of delta.tileChanges) {
        if (chunk.map && chunk.map[y]) {
          chunk.map[y][x] = reverseTileMap[tileId];
        }
      }
    }
    
    // Apply item changes
    if (delta.itemChanges) {
      if (delta.itemChanges.added) {
        chunk.items = chunk.items || [];
        chunk.items.push(...delta.itemChanges.added);
      }
      
      if (delta.itemChanges.removed && chunk.items) {
        const toRemove = new Set(delta.itemChanges.removed.map(i => i.id || JSON.stringify(i)));
        chunk.items = chunk.items.filter(item => 
          !toRemove.has(item.id || JSON.stringify(item))
        );
      }
    }
    
    return chunk;
  }
  
  /**
   * Get serialization statistics
   */
  getStats() {
    return {
      tileTypes: this.tileTypeMap.size,
      bufferPoolSize: this.bufferPool.length,
      cacheSize: this.tileTypeMap.size * 2 // Approximate memory usage
    };
  }
  
  /**
   * Reset serializer state
   */
  reset() {
    this.bufferPool = [];
    this.tileTypeMap.clear();
    this.tileTypeCounter = 0;
    
    // Re-register common types
    this.registerTileType('#');
    this.registerTileType('.');
    this.registerTileType('~');
    this.registerTileType('·');
  }
}