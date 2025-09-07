/**
 * Integration constants
 * Constants for system integration, events, errors, and debugging
 */

// Event names
export const EVENTS = {
  NPC_INTERACTION: 'NPCInteraction',
  SOCIAL_MENU_OPEN: 'social:menu:open',
  SOCIAL_MENU_CLOSE: 'social:menu:close',
  SOCIAL_MENU_ERROR: 'social:menu:error',
  SOCIAL_ACTION_EXECUTE: 'social:action:execute',
  SOCIAL_ACTION_COMPLETE: 'social:action:complete',
  SOCIAL_CONTEXT_BUILT: 'social:context:built',
  NPC_HOSTILE_CHECK: 'npc:hostile:check'
};

// Error messages
export const ERRORS = {
  INVALID_NPC_POSITION: 'NPC position must be numeric',
  INVALID_NPC_HP: 'NPC hp must be a non-negative number',
  INVALID_NPC_ID: 'NPC must have a valid id',
  REGISTRY_NOT_AVAILABLE: 'Action registry is not available',
  ENCOUNTER_SYSTEM_ERROR: 'Failed to handle NPC encounter',
  CONVERSION_FAILED: 'Failed to convert NPC to new format'
};

// Debug flags
export const DEBUG = {
  LOG_ENCOUNTERS: false,
  LOG_CONTEXT_BUILDING: false,
  LOG_ACTION_REGISTRY: false,
  LOG_PERFORMANCE: false
};

// Time constants
export const HOURS_PER_DAY = 24;
export const MORNING_START_HOUR = 6;
export const AFTERNOON_START_HOUR = 12;
export const EVENING_START_HOUR = 18;
export const NIGHT_START_HOUR = 22;