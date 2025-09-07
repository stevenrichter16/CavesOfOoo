/**
 * Relation Cache - Memoization for expensive relation calculations
 * Improves performance for repeated relation checks
 */

/**
 * Simple LRU cache implementation
 */
export class RelationCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from parameters
   * @param {string[]} sideA 
   * @param {string[]} sideB 
   * @param {Object} context 
   * @returns {string}
   */
  makeKey(sideA, sideB, context) {
    // Use stable sort with unique values
    const sortedA = [...new Set(sideA)].sort().join(',');
    const sortedB = [...new Set(sideB)].sort().join(',');
    
    // Include ALL relevant context fields
    const contextKey = JSON.stringify({
      kingdomId: context.kingdomId || null,
      lawLevel: context.lawLevel || null,
      tradeContext: context.tradeContext || false,
      alertState: context.alertState || null,
      timeOfDay: context.timeOfDay || null,
      // Critical: Include disguise and taboo context
      disguise: context.disguise || null,
      tabooViolations: context.tabooViolations || null,
      ritualContext: context.ritualContext || false
    });
    return `${sortedA}|${sortedB}|${contextKey}`;
  }

  /**
   * Get cached value or compute and cache
   * @param {string[]} sideA 
   * @param {string[]} sideB 
   * @param {Object} context 
   * @param {Function} computeFn 
   * @returns {any}
   */
  getOrCompute(sideA, sideB, context, computeFn) {
    const key = this.makeKey(sideA, sideB, context);
    
    if (this.cache.has(key)) {
      this.hits++;
      // Move to end (LRU)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    
    this.misses++;
    const value = computeFn(sideA, sideB, context);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
    return value;
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns {{size: number, hits: number, misses: number, hitRate: number}}
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  /**
   * Invalidate entries matching a predicate
   * @param {Function} predicate - Function that returns true for keys to invalidate
   */
  invalidate(predicate) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (predicate(key)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Invalidate all entries for a specific faction
   * @param {string} factionId 
   */
  invalidateFaction(factionId) {
    this.invalidate(key => {
      // Parse the key structure: sortedA|sortedB|context
      const parts = key.split('|');
      if (parts.length < 2) return false;
      
      const sideA = parts[0].split(',');
      const sideB = parts[1].split(',');
      
      // Check if faction is in either side
      return sideA.includes(factionId) || sideB.includes(factionId);
    });
  }

  /**
   * Invalidate all entries for a specific kingdom
   * @param {string} kingdomId 
   */
  invalidateKingdom(kingdomId) {
    this.invalidate(key => {
      // Parse the context JSON from the key
      const parts = key.split('|');
      if (parts.length < 3) return false;
      
      try {
        const context = JSON.parse(parts[2]);
        return context.kingdomId === kingdomId;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Invalidate all entries with disguise context
   */
  invalidateDisguise() {
    this.invalidate(key => {
      // Parse the context JSON from the key
      const parts = key.split('|');
      if (parts.length < 3) return false;
      
      try {
        const context = JSON.parse(parts[2]);
        return context.disguise != null;
      } catch (e) {
        return false;
      }
    });
  }
}

// Create singleton instances for different cache types
// With multi-faction NPCs: ~20 keys per NPC pair, 100 NPCs = 4950 pairs
// Increase cache sizes for better hit rates
const relationCache = new RelationCache(1000);  // ~20% of possible keys
const hostilityCache = new RelationCache(500);   // Less frequent than relations

/**
 * Get cached relation or compute
 * @param {string[]} sideA 
 * @param {string[]} sideB 
 * @param {Object} context 
 * @param {Function} computeFn 
 * @returns {number}
 */
export function getCachedRelation(sideA, sideB, context, computeFn) {
  return relationCache.getOrCompute(sideA, sideB, context, computeFn);
}

/**
 * Get cached hostility or compute
 * @param {string[]} sideA 
 * @param {string[]} sideB 
 * @param {Object} context 
 * @param {Function} computeFn 
 * @returns {Object}
 */
export function getCachedHostility(sideA, sideB, context, computeFn) {
  return hostilityCache.getOrCompute(sideA, sideB, context, computeFn);
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  relationCache.clear();
  hostilityCache.clear();
}

/**
 * Invalidate disguise-related caches
 */
export function invalidateDisguiseCaches() {
  relationCache.invalidateDisguise();
  hostilityCache.invalidateDisguise();
}

/**
 * Get cache statistics
 * @returns {Object}
 */
export function getCacheStats() {
  return {
    relation: relationCache.getStats(),
    hostility: hostilityCache.getStats()
  };
}

/**
 * Invalidate caches for a faction
 * @param {string} factionId 
 */
export function invalidateFactionCaches(factionId) {
  relationCache.invalidateFaction(factionId);
  hostilityCache.invalidateFaction(factionId);
}

/**
 * Invalidate caches for a kingdom
 * @param {string} kingdomId 
 */
export function invalidateKingdomCaches(kingdomId) {
  relationCache.invalidateKingdom(kingdomId);
  hostilityCache.invalidateKingdom(kingdomId);
}