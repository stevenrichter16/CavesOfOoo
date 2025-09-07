/**
 * Common factions that exist outside of specific kingdoms
 * These are referenced by multiple kingdoms but don't belong to any one
 */

/**
 * @type {import('./_types.js').FactionDef[]}
 */
export const COMMON_FACTIONS = [
  {
    id: 'player',
    name: 'Player',
    kind: 'civilian',
    values: ['adventure', 'exploration', 'growth'],
    taboos: [],
    relations: {
      // Generally neutral with most factions
      bandits: -0.5,  // Bandits are hostile to adventurers
      criminals: -0.3
    },
    lawfulness: 0.5
  },
  {
    id: 'bandits',
    name: 'Bandits',
    kind: 'criminal',
    values: ['freedom', 'wealth', 'strength'],
    taboos: ['law', 'authority', 'weakness'],
    relations: {
      player: -0.5,  // Hostile to adventurers
      banana_guard: -0.9,
      fire_guards: -0.9,
      ice_guards: -0.9,
      slime_guards: -0.7,
      candy_merchants: -0.8,
      fire_merchants: -0.7,
      ice_merchants: -0.7,
      slime_traders: -0.6
    },
    lawfulness: 0.0
  },
  {
    id: 'criminals',
    name: 'Criminal Underground',
    kind: 'criminal',
    values: ['profit', 'secrecy', 'survival'],
    taboos: ['snitching', 'law_cooperation'],
    relations: {
      player: -0.3,  // Suspicious of adventurers
      bandits: 0.6,
      banana_guard: -0.8,
      fire_guards: -0.8,
      ice_guards: -0.8,
      slime_guards: -0.6
    },
    lawfulness: 0.0
  },
  {
    id: 'water_elementals',
    name: 'Water Elementals',
    kind: 'cult',
    values: ['flow', 'purity', 'change'],
    taboos: ['stagnation', 'pollution', 'fire_worship'],
    relations: {
      flame_priests: -0.9,
      fire_court: -0.7,
      slime_elementals: 0.5,
      ice_wizards: 0.3
    },
    lawfulness: 0.2
  },
  {
    id: 'earth_elementals',
    name: 'Earth Elementals',
    kind: 'cult',
    values: ['stability', 'growth', 'patience'],
    taboos: ['erosion', 'upheaval', 'haste'],
    relations: {
      slime_elementals: 0.4,
      water_elementals: 0.2,
      flame_priests: -0.3,
      lava_miners: 0.3
    },
    lawfulness: 0.3
  },
  {
    id: 'wizard_guild',
    name: 'Wizard Guild',
    kind: 'guild',
    values: ['knowledge', 'magic', 'wisdom', 'secrets'],
    taboos: ['anti_magic', 'ignorance', 'technology_worship'],
    relations: {
      ice_wizards: 0.5,
      bubblegum_scientists: 0.3,
      flame_priests: 0.2,
      gel_scientists: 0.2
    },
    lawfulness: 0.4
  },
  {
    id: 'dungeon_keepers',
    name: 'Dungeon Keepers',
    kind: 'guild',
    values: ['order', 'containment', 'tradition'],
    taboos: ['escape', 'mercy', 'chaos'],
    relations: {
      banana_guard: -0.6,
      slime_court: 0.3,
      criminals: 0.2,
      bandits: -0.3
    },
    lawfulness: 0.5
  },
  {
    id: 'dungeon_merchants',
    name: 'Dungeon Merchants',
    kind: 'guild',
    values: ['profit', 'rare_goods', 'neutrality'],
    taboos: ['taking_sides', 'common_goods'],
    relations: {
      candy_merchants: 0.2,
      fire_merchants: 0.4,
      ice_merchants: 0.3,
      slime_traders: 0.7,
      dungeon_keepers: 0.5
    },
    lawfulness: 0.3
  },
  {
    id: 'dungeon_dwellers',
    name: 'Dungeon Dwellers',
    kind: 'civilian',
    values: ['survival', 'darkness', 'solitude'],
    taboos: ['sunlight', 'crowds', 'surface_life'],
    relations: {
      sewer_slimes: 0.7,
      slime_citizens: 0.4,
      dungeon_keepers: 0.3,
      bandits: 0.2
    },
    lawfulness: 0.2
  },
  {
    id: 'rat_guild',
    name: 'Rat Guild',
    kind: 'guild',
    values: ['scavenging', 'information', 'survival'],
    taboos: ['waste', 'poison', 'cats'],
    relations: {
      sewer_slimes: 0.8,
      criminals: 0.4,
      dungeon_dwellers: 0.5,
      candy_citizens: -0.3
    },
    lawfulness: 0.1
  },
  {
    id: 'breakfast_nobles',
    name: 'Breakfast Kingdom Nobles',
    kind: 'state',
    values: ['morning', 'nutrition', 'tradition'],
    taboos: ['dinner_foods', 'fasting', 'night_eating'],
    relations: {
      candy_nobles: 0.6,
      candy_merchants: 0.4,
      slime_traders: 0.3
    },
    lawfulness: 0.7
  }
];

/**
 * Virtual kingdom for common factions
 * @type {import('./_types.js').KingdomPack}
 */
export const COMMON_KINGDOM = {
  id: 'common',
  name: 'Common Factions',
  tags: ['neutral', 'everywhere'],
  lawLevel: 0.5,
  realmWeights: {
    trust: 1,
    respect: 1,
    fear: 1,
    law: 1,
    rumor: 1
  },
  terrainCost: {},
  disguiseUniforms: [],
  factions: COMMON_FACTIONS
};