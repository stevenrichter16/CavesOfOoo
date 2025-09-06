/**
 * PathCache - LRU cache for pathfinding results with area invalidation
 * Improves performance by caching frequently used paths
 */

// Configuration constants
export const PATH_CACHE_CONFIG = {
  defaultMaxSize: 100,
  defaultMaxAge: 5000, // 5 seconds
  cleanupInterval: 1000 // 1 second
};

export class PathCache {
  /**
   * Create a new path cache
   * @param {Object} options - Configuration options
   * @param {number} options.maxSize - Maximum number of cached paths
   * @param {number} options.maxAge - Maximum age of cached paths in ms
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || PATH_CACHE_CONFIG.defaultMaxSize;
    this.maxAge = options.maxAge || PATH_CACHE_CONFIG.defaultMaxAge;
    
    // LRU cache implementation
    this.cache = new Map();
    this.accessOrder = [];
    
    // Statistics
    this.hits = 0;
    this.misses = 0;
    
    // Cleanup timer
    this.lastCleanup = Date.now();
  }

  /**
   * Get a cached path
   * @param {Object} from - Start position
   * @param {Object} to - End position
   * @returns {Array|null} Cached path or null if not found
   */
  get(from, to) {
    this.cleanupIfNeeded();
    
    const key = this.getKey(from, to);
    const reverseKey = this.getKey(to, from);
    
    // Check forward direction
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      
      // Check if expired
      if (Date.now() - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.misses++;
        return null;
      }
      
      this.updateAccessOrder(key);
      this.hits++;
      return [...entry.path]; // Return copy
    }
    
    // Check reverse direction
    if (this.cache.has(reverseKey)) {
      const entry = this.cache.get(reverseKey);
      
      // Check if expired
      if (Date.now() - entry.timestamp > this.maxAge) {
        this.cache.delete(reverseKey);
        this.removeFromAccessOrder(reverseKey);
        this.misses++;
        return null;
      }
      
      this.updateAccessOrder(reverseKey);
      this.hits++;
      // Return reversed path
      return [...entry.path].reverse();
    }
    
    this.misses++;
    return null;
  }

  /**
   * Store a path in the cache
   * @param {Object} from - Start position
   * @param {Object} to - End position
   * @param {Array} path - Path to cache
   */
  set(from, to, path) {
    if (!from || !to) {
      throw new Error('Invalid positions provided to PathCache.set');
    }
    
    if (path === null || path === undefined) {
      throw new Error('Path cannot be null or undefined');
    }
    
    if (!Array.isArray(path)) {
      throw new Error('Path must be an array');
    }
    
    const key = this.getKey(from, to);
    
    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }
    
    // Check size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    // Store the path
    this.cache.set(key, {
      path: [...path], // Store copy
      timestamp: Date.now()
    });
    
    this.accessOrder.push(key);
  }

  /**
   * Check if a path exists in the cache
   * @param {Object} from - Start position
   * @param {Object} to - End position
   * @returns {boolean} True if path exists
   */
  has(from, to) {
    const key = this.getKey(from, to);
    const reverseKey = this.getKey(to, from);
    
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp <= this.maxAge) {
        return true;
      }
    }
    
    if (this.cache.has(reverseKey)) {
      const entry = this.cache.get(reverseKey);
      if (Date.now() - entry.timestamp <= this.maxAge) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Delete a cached path
   * @param {Object} from - Start position
   * @param {Object} to - End position
   * @returns {boolean} True if deleted
   */
  delete(from, to) {
    const key = this.getKey(from, to);
    
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all cached paths
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Invalidate paths passing through an area
   * @param {Object} area - Area to invalidate
   * @param {number} area.x - X coordinate
   * @param {number} area.y - Y coordinate
   * @param {number} area.width - Width (for rectangular area)
   * @param {number} area.height - Height (for rectangular area)
   * @param {number} area.radius - Radius (for circular area)
   */
  invalidateArea(area) {
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const path = entry.path;
      
      for (const point of path) {
        if (this.isPointInArea(point, area)) {
          keysToDelete.push(key);
          break;
        }
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }

  /**
   * Get cache size
   * @returns {number} Number of cached paths
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: hitRate
    };
  }

  /**
   * Generate cache key from positions
   * @private
   */
  getKey(from, to) {
    return `${from.x},${from.y}-${to.x},${to.y}`;
  }

  /**
   * Update access order for LRU
   * @private
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Remove from access order
   * @private
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict oldest entry
   * @private
   */
  evictOldest() {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Check if point is in area
   * @private
   */
  isPointInArea(point, area) {
    if (area.radius !== undefined) {
      // Circular area
      const dx = point.x - area.x;
      const dy = point.y - area.y;
      return Math.sqrt(dx * dx + dy * dy) <= area.radius;
    } else {
      // Rectangular area
      return point.x >= area.x && 
             point.x < area.x + area.width &&
             point.y >= area.y && 
             point.y < area.y + area.height;
    }
  }

  /**
   * Cleanup expired entries if needed
   * @private
   */
  cleanupIfNeeded() {
    const now = Date.now();
    
    // Always cleanup if maxAge is very short (for testing)
    if (this.maxAge < 1000 || now - this.lastCleanup >= PATH_CACHE_CONFIG.cleanupInterval) {
      this.lastCleanup = now;
      
      const keysToDelete = [];
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.maxAge) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
      }
    }
  }
}

// Factory function for creating path cache
let _pathCache = null;

/**
 * Get or create the path cache instance
 * @param {Object} options - Configuration options
 * @returns {PathCache} The path cache instance
 */
export function getPathCache(options = {}) {
  if (!_pathCache) {
    _pathCache = new PathCache(options);
  }
  return _pathCache;
}

/**
 * Reset the path cache (useful for testing)
 */
export function resetPathCache() {
  if (_pathCache) {
    _pathCache.clear();
  }
  _pathCache = null;
}