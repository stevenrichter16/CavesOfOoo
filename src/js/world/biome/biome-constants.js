/**
 * Constants for the Adventure Time Biome System
 * Centralizes all magic numbers and configuration values
 */

// Chunk dimensions (should match world constants)
export const CHUNK_WIDTH = 24;
export const CHUNK_HEIGHT = 22;

// Cache configuration
export const MAX_BIOME_CACHE_SIZE = 1000;
export const MAX_TRANSITION_CACHE_SIZE = 500;

// Biome generation parameters
export const BIOME_EDGE_NOISE_FACTOR = 3;
export const DUNGEON_EVIL_THRESHOLD = 0.7;
export const DUNGEON_MIN_DISTANCE_FROM_ORIGIN = 10;
export const CLOUD_KINGDOM_MAGIC_THRESHOLD = 0.75;
export const CLOUD_KINGDOM_TEMP_THRESHOLD = 0.3;
export const BAD_LANDS_TEMP_THRESHOLD = 0.6;
export const BAD_LANDS_HUMIDITY_THRESHOLD = -0.4;

// Noise sampling scales (smaller = larger features)
export const NOISE_SCALE = {
  TEMPERATURE: 0.02,
  HUMIDITY: 0.025,
  MAGIC: 0.015,
  EVIL: 0.01,
  CLUSTERING: 0.1,
  TRANSITION: 0.2
};

// Feature generation parameters
export const TILE_GENERATION_DENSITY_FACTOR = 0.1;
export const FEATURE_DENSITY_MODIFIER = 0.7; // For transition zones
export const MIN_ENTITIES_PER_CHUNK = 1;
export const MAX_ENTITIES_PER_CHUNK = 5;
export const MIN_DECORATIONS_PER_CHUNK = 2;
export const MAX_DECORATIONS_PER_CHUNK = 8;
export const MIN_RESOURCES_PER_CHUNK = 1;
export const MAX_RESOURCES_PER_CHUNK = 4;

// Probability thresholds
export const COMMON_FEATURE_CHANCE = 0.6;
export const UNCOMMON_FEATURE_CHANCE = 0.3;
export const RARE_FEATURE_CHANCE = 0.1;
export const SPECIAL_FEATURE_CHANCE = 0.1;
export const GUMBALL_GUARDIAN_SPAWN_CHANCE = 0.05;
export const DUNGEON_TREASURE_ROOM_CHANCE = 0.15;

// Tile type probabilities
export const FLOOR_TILE_CHANCE = 0.7;
export const SPECIAL_TILE_CHANCE = 0.2;

// Resource rarity chances
export const COMMON_RESOURCE_CHANCE = 0.7;
export const UNCOMMON_RESOURCE_CHANCE = 0.5; // When not common
export const COMMON_RESOURCE_MIN_AMOUNT = 3;
export const COMMON_RESOURCE_MAX_AMOUNT = 8;
export const RARE_RESOURCE_MIN_AMOUNT = 1;
export const RARE_RESOURCE_MAX_AMOUNT = 3;

// Transition zone parameters
export const TRANSITION_BLEND_TILE_COUNT = 10;
export const TRANSITION_DECORATION_COUNT = 3;
export const TRANSITION_ENTITY_COUNT = 2;
export const TRANSITION_GRADIENT_THRESHOLD_LOW = 0.3;
export const TRANSITION_GRADIENT_THRESHOLD_HIGH = 0.7;
export const TRANSITION_COHERENCE_THRESHOLD = 0.5;
export const TRANSITION_MIXED_ZONE_THRESHOLD = 0.8;
export const TRANSITION_MAIN_BIOME_THRESHOLD = 0.6;

// Special location bounds
export const SPECIAL_FEATURE_MIN_X = 8;
export const SPECIAL_FEATURE_MAX_X = 15;
export const SPECIAL_FEATURE_MIN_Y = 8;
export const SPECIAL_FEATURE_MAX_Y = 13;

// Gumball guardian position
export const GUMBALL_GUARDIAN_MIN_X = 10;
export const GUMBALL_GUARDIAN_MAX_X = 13;
export const GUMBALL_GUARDIAN_MIN_Y = 10;
export const GUMBALL_GUARDIAN_MAX_Y = 11;

// Treasure room bounds
export const TREASURE_ROOM_MIN_X = 5;
export const TREASURE_ROOM_MAX_X = 18;
export const TREASURE_ROOM_MIN_Y = 5;
export const TREASURE_ROOM_MAX_Y = 16;

// Hash normalization
export const HASH_NORMALIZATION_FACTOR = 2147483647;

// Seed constants for RNG
export const RNG_MULTIPLIER = 1103515245;
export const RNG_INCREMENT = 12345;
export const RNG_MODULUS = 0x7fffffff;

// Desert biome thresholds
export const DESERT_TEMP_THRESHOLD = 0.7;
export const DESERT_HUMIDITY_THRESHOLD = -0.5;

// Forest biome thresholds
export const FOREST_TEMP_MIN = -0.2;
export const FOREST_TEMP_MAX = 0.4;
export const FOREST_HUMIDITY_THRESHOLD = 0.4;