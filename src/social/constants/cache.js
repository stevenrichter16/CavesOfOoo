/**
 * Cache-related constants
 * Constants for various caching mechanisms in the social system
 */

// Cache sizes
export const RELATION_CACHE_SIZE = 1000;
export const PATH_CACHE_SIZE = 100;

// Cache TTL (Time To Live) in milliseconds
export const DIALOGUE_CACHE_TTL = 300000; // 5 minutes
export const ACTION_CACHE_TTL = 60000;    // 1 minute

// Spatial index cache
export const SPATIAL_INDEX_MAX_HISTORY = 100;