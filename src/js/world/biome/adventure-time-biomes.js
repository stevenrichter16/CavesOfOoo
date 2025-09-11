/**
 * Adventure Time Biome Definitions
 * Lore-accurate biomes from the Land of Ooo
 */

/**
 * Adventure Time biome configurations
 * Each biome represents a kingdom or region from the show
 */
export const ADVENTURE_TIME_BIOMES = {
  // Core Kingdoms
  candy_kingdom: {
    name: 'Candy Kingdom',
    color: '#FFB3E6', // Pink candy color
    temperature: 'moderate',
    magicLevel: 0.8,
    tiles: {
      floor: ['candy_grass', '·', 'o'],  // Pink grass with candy sprinkles
      wall: ['candy_wall', '#', '▓'],
      special: ['lollipop', 'gumdrop', 'candy_cane']
    },
    features: {
      common: ['candy_grass', 'lollipop_tree', 'gumdrop_bush'],
      uncommon: ['candy_house', 'candy_cane_lamp', 'sugar_crystal'],
      rare: ['gumball_guardian', 'candy_dungeon_entrance', 'princess_statue']
    },
    npcs: ['candy_person', 'banana_guard', 'peppermint_butler'],
    resources: ['candy', 'sugar', 'syrup', 'bubblegum'],
    description: 'A sweet kingdom made entirely of candy and ruled by Princess Bubblegum'
  },
  
  grasslands: {
    name: 'Grasslands',
    color: '#4CAF50', // Green
    temperature: 'moderate',
    magicLevel: 0.2,
    tiles: {
      floor: ['.', '·', 'o'],  // Normal grass
      wall: ['#', 'T'],  // Trees and rocks
      special: ['flower', 'bush']
    },
    features: {
      common: ['grass', 'tree', 'flower', 'rock'],
      uncommon: ['ruins', 'campsite', 'well'],
      rare: ['dungeon_entrance', 'treehouse', 'mysterious_portal']
    },
    npcs: ['traveler', 'wildlife', 'adventurer'],
    resources: ['wood', 'berries', 'herbs', 'stone'],
    description: 'The regular grasslands of Ooo where Finn and Jake live'
  },
  
  ice_kingdom: {
    name: 'Ice Kingdom',
    color: '#B3E5FC', // Ice blue
    temperature: 'freezing',
    magicLevel: 0.6,
    tiles: {
      floor: ['snow', '·', '∘'],  // Snow
      wall: ['ice', '#', '▓'],  // Ice walls
      special: ['ice_spike', 'frozen_tree']
    },
    features: {
      common: ['snow', 'ice_spike', 'frozen_tree'],
      uncommon: ['ice_cave', 'penguin_nest', 'frozen_lake'],
      rare: ['ice_palace_chunk', 'frozen_artifact', 'ice_crown']
    },
    npcs: ['penguin', 'snow_golem', 'ice_creature'],
    resources: ['ice', 'crystal', 'frozen_fish', 'snow'],
    description: 'The frozen domain of the Ice King, filled with snow and ice'
  },
  
  fire_kingdom: {
    name: 'Fire Kingdom',
    color: '#FF6B35', // Fire orange
    temperature: 'scorching',
    magicLevel: 0.7,
    tiles: {
      floor: ['charred', '≈', '~'],  // Lava and charred ground
      wall: ['obsidian', '#', '█'],
      special: ['lava_pool', 'fire_geyser']
    },
    features: {
      common: ['lava_pool', 'charred_ground', 'fire_geyser'],
      uncommon: ['obsidian_spire', 'flame_vent', 'coal_deposit'],
      rare: ['flame_palace_chunk', 'fire_gem_deposit', 'eternal_flame']
    },
    npcs: ['flame_person', 'fire_wolf', 'lava_creature'],
    resources: ['coal', 'obsidian', 'fire_gem', 'sulfur'],
    description: 'The underground kingdom of flame people ruled by Flame Princess'
  },
  
  dungeon: {
    name: 'Dungeon',
    color: '#424242', // Dark gray
    temperature: 'cool',
    magicLevel: 0.55,
    tiles: {
      floor: ['stone', '.', '·'],
      wall: ['wall', '#', '█'],
      special: ['trap', 'chest', 'door']
    },
    features: {
      common: ['stone_floor', 'wall', 'darkness'],
      uncommon: ['trap', 'chest', 'bones'],
      rare: ['treasure_room', 'boss_room', 'ancient_mechanism']
    },
    npcs: ['skeleton', 'monster', 'dungeon_keeper'],
    resources: ['gold', 'gems', 'artifacts', 'weapons'],
    description: 'One of the many mysterious dungeons scattered across Ooo'
  },
  
  // Natural Biomes (still exist in Adventure Time)
  forest: {
    name: 'Forest',
    color: '#2E7D32', // Forest green
    temperature: 'moderate',
    magicLevel: 0.3,
    tiles: {
      floor: ['.', '·', 'o'],  // Forest floor
      wall: ['T', '#', '↟'],  // Trees
      special: ['bush', 'flower', 'mushroom']
    },
    features: {
      common: ['tree', 'bush', 'fallen_log', 'moss'],
      uncommon: ['clearing', 'stream', 'rock_formation'],
      rare: ['ancient_tree', 'hidden_grove', 'forest_dungeon']
    },
    npcs: ['deer', 'squirrel', 'forest_creature', 'wanderer'],
    resources: ['wood', 'berries', 'mushrooms', 'herbs'],
    description: 'Dense forests that still exist between kingdoms in Ooo'
  },
  
  desert: {
    name: 'Desert',
    color: '#FFB74D', // Sandy orange
    temperature: 'hot',
    magicLevel: 0.2,
    tiles: {
      floor: ['·', '∘', '.'],  // Sand
      wall: ['%', '#', '▲'],  // Rocks and dunes
      special: ['cactus', 'bones', 'oasis']
    },
    features: {
      common: ['sand_dune', 'cactus', 'rock'],
      uncommon: ['oasis', 'ruins', 'canyon'],
      rare: ['desert_temple', 'sand_shark_territory', 'mirage']
    },
    npcs: ['sand_person', 'desert_creature', 'nomad'],
    resources: ['cactus_juice', 'sand', 'desert_gem', 'fossil'],
    description: 'Sandy wastelands on the outskirts of Ooo'
  },
  
  // Extended Biomes
  cloud_kingdom: {
    name: 'Cloud Kingdom',
    color: '#E3F2FD', // Light blue
    temperature: 'cool',
    magicLevel: 0.9,
    tiles: {
      floor: ['cloud', '☁', '∘'],
      wall: ['solid_cloud', '▓', '█'],
      special: ['rainbow', 'bounce_pad']
    },
    features: {
      common: ['cloud_platform', 'wisp', 'rainbow_pool'],
      uncommon: ['cloud_house', 'bounce_cloud', 'storm_cloud'],
      rare: ['cloud_palace', 'rainbow_bridge', 'weather_machine']
    },
    npcs: ['cloud_person', 'rainbow_unicorn', 'sky_creature'],
    resources: ['cloud_stuff', 'rainbow_essence', 'lightning', 'rain'],
    description: 'A kingdom high in the clouds with bouncy platforms'
  },
  
  bad_lands: {
    name: 'Bad Lands',
    color: '#D84315', // Desert red
    temperature: 'hot',
    magicLevel: 0.3,
    tiles: {
      floor: ['sand', '·', '∘'],
      wall: ['rock', '#', '▓'],
      special: ['cactus', 'skull']
    },
    features: {
      common: ['sand', 'rock_formation', 'cactus'],
      uncommon: ['canyon', 'oasis', 'ruins'],
      rare: ['door_lord_door', 'desert_temple', 'buried_treasure']
    },
    npcs: ['bandit', 'desert_creature', 'wanderer'],
    resources: ['cactus_juice', 'desert_gem', 'sand', 'fossil'],
    description: 'A dangerous desert wasteland filled with bandits and monsters'
  },
  
  breakfast_kingdom: {
    name: 'Breakfast Kingdom',
    color: '#FFD54F', // Breakfast yellow
    temperature: 'warm',
    magicLevel: 0.6,
    tiles: {
      floor: ['bacon_strip', '=', '≡'],
      wall: ['toast_wall', '#', '▓'],
      special: ['egg', 'syrup_pool']
    },
    features: {
      common: ['bacon_strip', 'egg_platform', 'toast_ground'],
      uncommon: ['syrup_lake', 'butter_pad', 'waffle_floor'],
      rare: ['breakfast_palace', 'pancake_stack', 'coffee_geyser']
    },
    npcs: ['breakfast_person', 'bacon_guard', 'toast_citizen'],
    resources: ['bacon', 'eggs', 'syrup', 'butter'],
    description: 'A small kingdom where everything is made of breakfast foods'
  },
  
  lemongrab_earldom: {
    name: "Lemongrab's Earldom",
    color: '#FFF176', // Lemon yellow
    temperature: 'moderate',
    magicLevel: 0.4,
    tiles: {
      floor: ['lemon_ground', '·', 'o'],
      wall: ['lemon_wall', '#', '▓'],
      special: ['lemon_tree', 'surveillance']
    },
    features: {
      common: ['lemon_ground', 'sour_grass', 'lemon_tree'],
      uncommon: ['surveillance_post', 'lemon_house', 'reconditioning_chamber'],
      rare: ['lemon_castle', 'dungeon', 'earl_statue']
    },
    npcs: ['lemon_person', 'lemon_guard', 'lemongrab'],
    resources: ['lemons', 'sour_candy', 'surveillance_equipment'],
    description: 'The totalitarian earldom ruled by the Earl of Lemongrab'
  },
  
  marceline_cave: {
    name: "Marceline's Cave",
    color: '#B71C1C', // Dark red
    temperature: 'cool',
    magicLevel: 0.7,
    tiles: {
      floor: ['cave_floor', '.', '·'],
      wall: ['cave_wall', '#', '█'],
      special: ['bass_guitar', 'red_couch']
    },
    features: {
      common: ['dark_stone', 'cave_moss', 'stalactite'],
      uncommon: ['bass_guitar', 'red_furniture', 'record_player'],
      rare: ['memory_artifact', 'vampire_relic', 'hambo']
    },
    npcs: ['marceline', 'bat', 'cave_creature'],
    resources: ['music_sheets', 'vampire_artifacts', 'red_objects'],
    description: "Marceline the Vampire Queen's personal cave home"
  }
};

/**
 * Get biome by ID
 */
export function getBiomeDefinition(biomeId) {
  return ADVENTURE_TIME_BIOMES[biomeId] || ADVENTURE_TIME_BIOMES.grasslands;
}

/**
 * Get all biome IDs
 */
export function getAllBiomeIds() {
  return Object.keys(ADVENTURE_TIME_BIOMES);
}

/**
 * Get biome color for map rendering
 */
export function getBiomeColor(biomeId) {
  const biome = getBiomeDefinition(biomeId);
  return biome.color;
}

/**
 * Get biome temperature
 */
export function getBiomeTemperature(biomeId) {
  const biome = getBiomeDefinition(biomeId);
  return biome.temperature;
}

/**
 * Get biome magic level
 */
export function getBiomeMagicLevel(biomeId) {
  const biome = getBiomeDefinition(biomeId);
  return biome.magicLevel;
}