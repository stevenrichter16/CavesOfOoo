/**
 * Constants for the Dynamic Event System
 */

export const EventTypes = {
  // Weather events
  CANDY_RAIN: 'candy_rain',
  SUGAR_STORM: 'sugar_storm',
  ICE_STORM: 'ice_storm',
  LAVA_ERUPTION: 'lava_eruption',
  
  // Biome events
  PRINCESS_PARADE: 'princess_parade',
  BANANA_GUARD_DRILL: 'banana_guard_drill',
  PENGUIN_MIGRATION: 'penguin_migration',
  AURORA_BOREALIS: 'aurora_borealis',
  ICE_KING_TANTRUM: 'ice_king_tantrum',
  FLAME_DANCE: 'flame_dance',
  HEAT_WAVE: 'heat_wave',
  FLAMBIT_SWARM: 'flambit_swarm',
  GUMBALL_INVASION: 'gumball_invasion',
  
  // Quest events
  DUNGEON_GUARDIAN_AWAKENS: 'dungeon_guardian_awakens',
  ANCIENT_CURSE: 'ancient_curse',
  
  // Social events
  RAINBOW_APPEARS: 'rainbow_appears',
  CANDY_CITIZENS_CELEBRATE: 'candy_citizens_celebrate',
  
  // Rare events
  COSMIC_OWL_VISIT: 'cosmic_owl_visit',
  ETERNAL_FLAME: 'eternal_flame',
  
  // Ambient
  GENTLE_BREEZE: 'gentle_breeze',
  AMBIENT_EFFECT: 'ambient_effect',
  SUNRISE_CEREMONY: 'sunrise_ceremony'
};

export const EventPriority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

export const EventRarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  LEGENDARY: 'legendary'
};

export const EventDuration = {
  INSTANT: 0,
  SHORT: 50,      // 50 ticks
  MEDIUM: 200,    // 200 ticks
  LONG: 1000,     // 1000 ticks
  ETERNAL: -1     // Never expires
};