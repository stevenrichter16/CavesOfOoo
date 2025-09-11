/**
 * ChunkCache - LRU cache for chunk storage
 * Manages memory by evicting least recently used chunks
 * Uses doubly-linked list for O(1) eviction
 */

import { EventEmitter } from './EventEmitter.js';

/**
 * Node for doubly-linked list
 * @private
 */
class LRUNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

/**
 * Cache for managing loaded chunks with LRU eviction
 * Extends EventEmitter for cache events
 */
export class ChunkCache extends EventEmitter {
  /**
   * Create a new chunk cache
   * @param {number} maxSize - Maximum number of chunks to cache (default 100)
   */
  constructor(maxSize = 100) {
    super();
    this.maxSize = maxSize;
    this.cache = new Map(); // key -> LRUNode
    
    // Doubly-linked list for O(1) LRU
    this._head = new LRUNode(null, null); // Dummy head
    this._tail = new LRUNode(null, null); // Dummy tail
    this._head.next = this._tail;
    this._tail.prev = this._head;
    
    // Statistics tracking
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    
    // Access counter for overflow protection
    this.accessCounter = 0;
  }
  
  /**
   * Get the current number of cached chunks
   */
  get size() {
    return this.cache.size;
  }
  
  /**
   * Generate cache key from coordinates
   * @private
   */
  _getKey(cx, cy) {
    return `${cx},${cy}`;
  }
  
  /**
   * Move node to head (most recently used)
   * @private
   */
  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }
  
  /**
   * Add node right after head
   * @private
   */
  _addToHead(node) {
    node.prev = this._head;
    node.next = this._head.next;
    this._head.next.prev = node;
    this._head.next = node;
  }
  
  /**
   * Remove node from list
   * @private
   */
  _removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
  }
  
  /**
   * Remove tail node (least recently used)
   * @private
   */
  _removeTail() {
    const lru = this._tail.prev;
    if (lru === this._head) return null;
    this._removeNode(lru);
    return lru;
  }
  
  /**
   * Handle access counter overflow
   * @private
   */
  _checkAccessCounterOverflow() {
    if (this.accessCounter >= Number.MAX_SAFE_INTEGER - 1000) {
      // Reset counter and re-index
      this.accessCounter = 0;
      // In this implementation, we don't need to reindex since we use linked list
    }
  }
  
  /**
   * Store a chunk in the cache
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @param {Chunk} chunk - The chunk to cache
   */
  set(cx, cy, chunk) {
    const key = this._getKey(cx, cy);
    
    // Check for overflow
    this._checkAccessCounterOverflow();
    this.accessCounter++;
    
    // If already exists, update and move to head
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = chunk;
      this._moveToHead(node);
      return;
    }
    
    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      const lru = this._removeTail();
      if (lru) {
        const evictedChunk = lru.value;
        this.cache.delete(lru.key);
        this._stats.evictions++;
        
        // Emit eviction event
        this.emit('evicted', {
          key: lru.key,
          chunk: evictedChunk
        });
      }
    }
    
    // Add the new chunk
    const newNode = new LRUNode(key, chunk);
    this.cache.set(key, newNode);
    this._addToHead(newNode);
  }
  
  /**
   * Retrieve a chunk from the cache
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {Chunk|null} The cached chunk or null if not found
   */
  get(cx, cy) {
    const key = this._getKey(cx, cy);
    
    if (!this.cache.has(key)) {
      this._stats.misses++;
      this.emit('miss', { key });
      return null;
    }
    
    // Update access order
    const node = this.cache.get(key);
    this._moveToHead(node);
    
    this._stats.hits++;
    this.emit('hit', { key });
    
    return node.value;
  }
  
  /**
   * Check if a chunk is in the cache
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {boolean} True if chunk is cached
   */
  has(cx, cy) {
    const key = this._getKey(cx, cy);
    return this.cache.has(key);
  }
  
  /**
   * Delete a specific chunk from the cache
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @returns {boolean} True if chunk was deleted
   */
  delete(cx, cy) {
    const key = this._getKey(cx, cy);
    
    if (!this.cache.has(key)) {
      return false;
    }
    
    const node = this.cache.get(key);
    this._removeNode(node);
    this.cache.delete(key);
    return true;
  }
  
  /**
   * Evict a specific chunk from cache
   */
  evict(cx, cy) {
    const key = `${cx},${cy}`;
    const node = this.cache.get(key);
    
    if (node) {
      // Remove from cache
      this.cache.delete(key);
      
      // Remove from linked list
      this._removeNode(node);
      
      // Emit eviction event
      this.emit('evicted', { 
        cx, 
        cy, 
        key,
        chunk: node.value 
      });
      
      this._stats.evictions++;
      return true;
    }
    
    return false;
  }
  
  /**
   * Clear all chunks from the cache
   */
  clear() {
    // Get all chunks before clearing for eviction events
    const chunks = Array.from(this.cache.entries());
    
    // Reset linked list
    this._head.next = this._tail;
    this._tail.prev = this._head;
    
    // Clear map
    this.cache.clear();
    
    // Reset counter
    this.accessCounter = 0;
    
    // Emit eviction events for each chunk
    for (const [key, node] of chunks) {
      const [cx, cy] = key.split(',').map(Number);
      this.emit('evicted', { 
        cx, 
        cy, 
        key,
        chunk: node.value 
      });
    }
    
    // Reset statistics
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStatistics() {
    const total = this._stats.hits + this._stats.misses;
    return {
      hits: this._stats.hits,
      misses: this._stats.misses,
      evictions: this._stats.evictions,
      hitRate: total > 0 ? this._stats.hits / total : 0,
      size: this.size,
      maxSize: this.maxSize
    };
  }
  
  /**
   * Get all chunks from cache
   * @returns {Array} Array of all cached chunks
   */
  getAllChunks() {
    const chunks = [];
    for (const node of this.cache.values()) {
      if (node.value) {
        chunks.push(node.value);
      }
    }
    return chunks;
  }
}