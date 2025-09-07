/**
 * Constants for the social and faction system
 * Centralizes magic numbers and configuration values
 */

// Relation calculation weights
export const RELATION_WEIGHTS = {
  HOME_KINGDOM_BONUS: 1.25,      // Bonus for being in home kingdom
  TRADE_CONTEXT_BONUS: 1.2,       // Bonus for merchants in trade context
  SAME_KINGDOM_BONUS: 0.2,        // Bonus for same kingdom relations
  FOREIGN_PENALTY: -0.1,          // Penalty for both being foreign
  NIGHT_GUARD_PENALTY: -0.1,      // Guards more suspicious at night
  HIGH_ALERT_PENALTY: -0.2,       // Penalty during high alert
  LOW_ALERT_BONUS: 0.05,          // Bonus during low alert
  RITUAL_CULT_BONUS: 0.1          // Cult bonus during rituals
};

// Hostility calculation factors
export const HOSTILITY_FACTORS = {
  LAW_BASE_FACTOR: 0.2,           // Base hostility increase from law level
  CRIMINAL_LAW_FACTOR: 0.5,       // Extra hostility to criminals
  TABOO_VIOLATION_FACTOR: 0.5,    // Hostility for taboo violations
  HOSTILITY_THRESHOLD: 0.4,       // Threshold for being considered hostile
  DISGUISE_REDUCTION: 1.0         // How much disguise reduces hostility
};

// Weight system limits
export const WEIGHT_LIMITS = {
  MAX_BONUS: 0.5,                 // Maximum weight bonus (1.5x total)
  DISGUISE_QUALITY_THRESHOLD: 0.5 // Minimum quality for disguise to be convincing
};

// Standing change impacts
export const STANDING_IMPACTS = {
  help: 0.1,
  trade: 0.05,
  gift: 0.08,
  compliment: 0.03,
  insult: -0.05,
  threaten: -0.1,
  attack: -0.2,
  steal: -0.15
};

// Faction standing propagation
export const STANDING_PROPAGATION = {
  ALLIED_FACTION_MULTIPLIER: 0.5,  // How much allied factions are affected
  ALLIANCE_THRESHOLD: 0.5          // Relation threshold to be considered allied
};

// Default values
export const DEFAULTS = {
  NEUTRAL_RELATION: 0,            // Default relation value
  NORMAL_TERRAIN_COST: 1,         // Default terrain cost
  DEFAULT_DISGUISE_QUALITY: 0.5,  // Default disguise quality
  DISGUISE_EFFECTIVENESS: 0.5     // Minimum quality for disguise to work
};

// Special faction identifiers (for backwards compatibility)
export const SPECIAL_FACTIONS = {
  BANDITS: 'bandits',              // Generic bandit faction
  CRIMINALS: 'criminals',          // Generic criminal faction
  PLAYER: 'player'                 // Player pseudo-faction
};