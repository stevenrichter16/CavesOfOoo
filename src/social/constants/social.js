/**
 * Social system constants
 * Constants for relationships, trust, fear, respect, and social interactions
 */

// Trust thresholds
export const MIN_TRUST_FOR_TRADE = 0.3;
export const MIN_TRUST_FOR_SECRETS = 0.7;
export const DEFAULT_TRUST = 0;

// Fear thresholds
export const MAX_FEAR_FOR_INTERACTION = 0.8;
export const DEFAULT_FEAR = 0;

// Respect thresholds
export const RESPECT_MULTIPLIER = 1.5;
export const DEFAULT_RESPECT = 0;

// Relationship dynamics
export const RELATIONSHIP_DECAY_RATE = 0.01;
export const RUMOR_SPREAD_CHANCE = 0.3;

// Faction weights
export const FACTION_WEIGHT_NORMALIZATION = 1.0;

// Social interaction timings (milliseconds)
export const INTERACTION_COOLDOWN = 1000;
export const DIALOGUE_TIMEOUT = 30000;
export const ACTION_ANIMATION_DURATION = 500;

// Default roles
export const DEFAULT_PLAYER_ROLE = 'adventurer';
export const DEFAULT_NPC_ROLE = 'citizen';