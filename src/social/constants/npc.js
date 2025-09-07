/**
 * NPC-specific constants
 * Constants for NPC properties, limits, and defaults
 */

// Health defaults
export const DEFAULT_NPC_HP = 100;
export const DEFAULT_NPC_HP_MAX = 100;

// Perception limits
export const MIN_PERCEPTION_VALUE = 0;
export const MAX_PERCEPTION_VALUE = 2.0;
export const DEFAULT_PERCEPTION = 1.0;

// NPC limits per area
export const MAX_NPCS_PER_CHUNK = 100;
export const MAX_NPCS_PER_POSITION = 5;
export const MAX_ACTIONS_PER_NPC = 20;

// NPC memory
export const NPC_MEMORY_LIMIT = 50;

// NPC processing
export const NPC_UPDATE_BATCH_SIZE = 10;

// Default positions
export const DEFAULT_CHUNK_X = 0;
export const DEFAULT_CHUNK_Y = 0;

// Default kingdom
export const DEFAULT_KINGDOM = 'candy';

// Time defaults
export const DEFAULT_GAME_HOUR = 12;
export const DEFAULT_LAW_LEVEL = 0.5;