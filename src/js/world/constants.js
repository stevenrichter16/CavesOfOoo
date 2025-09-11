/**
 * Shared constants for the chunk generation system
 */

// Chunk dimensions - use full viewport
export const CHUNK_WIDTH = 48;
export const CHUNK_HEIGHT = 22;

// Room generation
export const MIN_ROOM_SIZE = 3;
export const MAX_ROOM_SIZE = 15;
export const MAX_ROOM_ATTEMPTS = 50;
export const MIN_ROOM_DISTANCE = 2;

// Entity limits
export const MAX_ENTITIES_PER_CHUNK = 20;
export const MAX_NPCS_PER_CHUNK = 10;
export const MAX_MONSTERS_PER_CHUNK = 15;

// Cache limits
export const MAX_BIOME_CACHE_SIZE = 100;
export const MAX_CHUNK_CACHE_SIZE = 50;

// Corridor generation
export const MIN_CORRIDOR_WIDTH = 1;
export const MAX_CORRIDOR_WIDTH = 3;
export const CORRIDOR_TURN_CHANCE = 0.3;

// Feature densities
export const DEFAULT_DOOR_CHANCE = 0.8;
export const DEFAULT_CHEST_CHANCE = 0.2;
export const DEFAULT_TRAP_CHANCE = 0.1;
export const DEFAULT_DECORATION_CHANCE = 0.3;

// Validation constants
export const MAX_VALIDATION_ATTEMPTS = 10;
export const MAX_ENTITY_PLACEMENT_RADIUS = 10;
export const MIN_CONNECTED_REGION_SIZE = 10;

// Performance limits
export const MAX_PATHFIND_ITERATIONS = 1000;
export const MAX_FLOOD_FILL_SIZE = 1000;

// Biome parameters
export const DEFAULT_BIOME_CENTER_COUNT = 6;
export const BIOME_CENTER_MIN_DISTANCE = 30;

// Valid tile types
export const TILE_TYPES = {
  WALL: '#',
  FLOOR: '.',
  FLOOR_ALT: '·',
  WATER: '~',
  DOOR: '+',
  CHEST: 'C',
  TRAP: '^',
  STAIRS_UP: '<',
  STAIRS_DOWN: '>',
  TREE: 'T',
  ROCK: '%',
  BUSH: '&',
  GRASS: 'o',
  FLOWER: '*',
  MUSHROOM: 'v',
  CRYSTAL: 'i'
};

// Valid tile set
export const VALID_TILES = new Set(Object.values(TILE_TYPES));

// Biome types (including Adventure Time biomes)
export const BIOME_TYPES = [
  // Original biomes
  'grassland',
  'grasslands', // Alias
  'forest',
  'desert',
  'tundra',
  'swamp',
  'mountains',
  // Adventure Time biomes
  'candy_kingdom',
  'ice_kingdom',
  'fire_kingdom',
  'dungeon',
  'cloud_kingdom',
  'bad_lands',
  'breakfast_kingdom',
  'lemongrab_earldom',
  'marceline_cave'
];

// Default biome
export const DEFAULT_BIOME = 'grassland';

// Streaming System Constants
export const STREAMING_CONSTANTS = {
  DEFAULT_MAX_CHUNKS: 100,
  DEFAULT_MEMORY_LIMIT: 50 * 1024 * 1024, // 50MB
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_VIEWPORT_RADIUS: 5,
  MOVEMENT_HISTORY_DURATION: 5000, // 5 seconds
  MOVEMENT_HISTORY_MAX_SIZE: 100,
  MEMORY_CLEANUP_THRESHOLD: 0.9,
  BASE_CHUNK_MEMORY: 1024,
  TILE_MEMORY_SIZE: 1,
  ENTITY_MEMORY_SIZE: 100,
  ITEM_MEMORY_SIZE: 50,
  REQUEST_BATCH_HISTORY_LIMIT: 10,
  CANCELLED_REQUESTS_LIMIT: 100,
  STREAMING_ISSUES_LIMIT: 100,
  LARGE_VIEWPORT_WARNING: 20,
  COMPRESSION_FAKE_RATIO: 0.3,
  DEFAULT_LOD_DISTANCES: [3, 6, 10],
  PREDICTIVE_CHUNK_RADIUS: 2,
  PREDICTIVE_HISTORY_CUTOFF: 5000
};

// Persistence System Constants
export const PERSISTENCE_CONSTANTS = {
  MAX_SEED_LENGTH: 255,
  CURRENT_VERSION: '1.0.0',
  COMPRESSION_LEVEL: 6,
  ATOMIC_WRITE_EXTENSION: '.tmp',
  BACKUP_EXTENSION: '.backup',
  CHUNK_FILE_EXTENSION: '.json',
  COMPRESSED_EXTENSION: '.gz',
  MAX_PATH_LENGTH: 255,
  NEGATIVE_COORD_PREFIX: 'n',
  CHUNK_DIR_NAME: 'chunks',
  BACKUP_DIR_NAME: 'backups',
  METADATA_DIR_NAME: 'metadata'
};