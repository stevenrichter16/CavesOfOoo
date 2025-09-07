/**
 * Constants for Action Registry System - Phase 7
 * Centralized values for social interactions and effects
 */

/**
 * Social stat default values
 */
export const SOCIAL_DEFAULTS = {
  TRUST: 0.5,
  FEAR: 0.2,
  RESPECT: 0.3
};

/**
 * Trust modifications for different actions
 */
export const TRUST_CHANGES = {
  GREET: 0.05,
  CHAT: 0.08,
  COMPLIMENT: 0.1,
  INSULT: -0.15,
  THREATEN: -0.2,
  GIFT: 0.2,
  SHARE_RUMOR: 0.05,
  HUG: 0.15,
  SHARE_CANDY: 0.1
};

/**
 * Respect modifications for different actions
 */
export const RESPECT_CHANGES = {
  COMPLIMENT: 0.05,
  INSULT: -0.1,
  GIFT: 0.1,
  PRAISE_PRINCESS: 0.1,
  FLAME_CHALLENGE: 0.15,
  SHOW_RESPECT: 0.2,
  FORMAL_GREETING: 0.08,
  DISCUSS_SCIENCE: 0.15
};

/**
 * Fear modifications for different actions
 */
export const FEAR_CHANGES = {
  THREATEN: 0.3,
  FLAME_CHALLENGE: 0.1
};

/**
 * Relationship thresholds for action requirements
 */
export const RELATIONSHIP_THRESHOLDS = {
  HUG_TRUST_REQUIRED: 0.7,
  HOSTILE_TRUST: 0.3,
  FRIENDLY_TRUST: 0.7,
  POSITIVE_RELATION: 0.5
};

/**
 * Law level thresholds
 */
export const LAW_THRESHOLDS = {
  PICKPOCKET_MAX: 0.3
};

/**
 * Disguise quality thresholds
 */
export const DISGUISE_THRESHOLDS = {
  MINIMUM_QUALITY: 0.5,
  HIGH_QUALITY: 0.8
};

/**
 * Action cooldowns (in turns/time units)
 */
export const ACTION_COOLDOWNS = {
  GREET: 1,
  CHAT: 2,
  COMPLIMENT: 3,
  INSULT: 4,
  THREATEN: 5,
  GIFT: 5,
  TRADE: 3,
  SHARE_RUMOR: 2,
  HUG: 3,
  ARREST: 10,
  PICKPOCKET: 5,
  PRAISE_PRINCESS: 2,
  SHARE_CANDY: 3,
  FLAME_CHALLENGE: 5,
  SHOW_RESPECT: 2,
  FORMAL_GREETING: 2,
  DISCUSS_SCIENCE: 4,
  EXCHANGE_INTEL: 5
};