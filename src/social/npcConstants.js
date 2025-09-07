/**
 * Constants for NPC System
 * Centralizes configuration values for NPCs and spawning
 */

// Dialogue tone thresholds
export const DIALOGUE_THRESHOLDS = {
  FRIENDLY_RELATION: 0.5,      // Relation above this = friendly tone
  UNFRIENDLY_RELATION: -0.3,   // Relation below this = unfriendly tone
  DISGUISE_QUALITY_MIN: 0.5,   // Minimum quality for disguise to be convincing
  PERCEPTION_VS_DISGUISE: 0     // Perception - Quality threshold for suspicion
};

// Faction weight priorities
export const FACTION_PRIORITIES = {
  ADDITIONAL_WEIGHT: 0.6,       // Weight for additional factions when prioritized
  EXISTING_WEIGHT: 0.4,         // Weight for existing factions when additional prioritized
  WEIGHT_SUM_TOLERANCE: 0.01   // Tolerance for weight sum validation
};

// Weight limits  
export const WEIGHT_LIMITS = {
  DISGUISE_QUALITY_THRESHOLD: 0.5  // Same as DIALOGUE_THRESHOLDS.DISGUISE_QUALITY_MIN
};

// Behavior thresholds
export const BEHAVIOR_THRESHOLDS = {
  COOPERATION_MIN: 0.3,         // Minimum relation for cooperation
  HOSTILE_FLEE_THRESHOLD: 0     // Citizens flee if relation below this
};

// Spawn configuration
export const SPAWN_CONFIG = {
  DEFAULT_KINGDOM: 'candy',     // Default kingdom for spawning
  NAME_SUFFIX_COUNTER: true,    // Add counter to NPC names
  DEFAULT_PERCEPTION: 0.5       // Default NPC perception value
};

// Role categories for faction detection
export const FACTION_CATEGORIES = {
  GUARD: ['guard', 'guards', 'sentinel', 'watchman'],
  MERCHANT: ['merchant', 'merchants', 'trader', 'traders', 'vendor', 'shopkeep'],
  CITIZEN: ['citizen', 'citizens', 'resident', 'folk'],
  NOBLE: ['noble', 'nobles', 'court', 'aristocrat'],
  PRIEST: ['priest', 'priests', 'cleric', 'minister'],
  CRIMINAL: ['bandit', 'bandits', 'criminal', 'criminals', 'thief']
};

// Suspicious faction combinations
export const SUSPICIOUS_COMBOS = [
  ['bandits', 'candy_merchants'],
  ['bandits', 'banana_guard'],
  ['ice_spies', 'fire_court'],
  ['criminals', 'candy_nobles']
];

// Default faction mappings
export const DEFAULT_FACTIONS = {
  guard: {
    candy: 'banana_guard',
    fire: 'fire_guards',
    ice: 'ice_guards',
    slime: 'slime_guards'
  },
  citizen: {
    candy: 'candy_citizens',
    fire: 'fire_citizens',
    ice: 'ice_citizens',
    slime: 'slime_citizens'
  },
  merchant: {
    candy: 'candy_merchants',
    fire: 'fire_merchants',
    ice: 'ice_merchants',
    slime: 'slime_traders'
  },
  noble: {
    candy: 'candy_nobles',
    fire: 'fire_court',
    ice: 'ice_court',
    slime: 'slime_nobles'
  },
  priest: {
    fire: 'flame_priests',
    ice: 'ice_wizards',
    slime: 'slime_elementals'
  }
};