/**
 * Fire Kingdom data pack
 * Ruled by Flame King, home to flame people and lava creatures
 * @type {import('./_types.js').KingdomPack}
 */
export default {
  id: 'fire',
  name: 'Fire Kingdom',
  tags: ['fire', 'hot', 'authoritarian', 'passionate'],
  lawLevel: 0.75, // Strong but harsh law enforcement
  
  realmWeights: {
    trust: 0.9,    // Less trust-based
    respect: 1.2,  // Respect through strength
    fear: 1.25,    // Fear is a tool of control
    law: 1.1,      // Law through strength
    rumor: 1.0     // Normal rumor influence
  },
  
  terrainCost: {
    basalt: 1.0,        // Native terrain
    lava: 4.0,          // Can traverse but still dangerous
    fire_road: 0.8,     // Efficient fire roads
    obsidian: 1.1,      // Slightly harder
    ice: 6.0,           // Very difficult (opposite element)
    water: 5.0,         // Dangerous to fire beings
    snow: 7.0,          // Extremely difficult
    grass: 1.5,         // Burns easily
    forest: 2.0,        // Risk of spreading fire
    mountain: 1.8       // Rocky terrain okay
  },
  
  disguiseUniforms: [
    'fire_guard',
    'fire_court',
    'flame_citizen',
    'lava_worker'
  ],
  
  ruler: 'Flame King',
  capital: 'Fire Kingdom Capital',
  allies: [],  // Mostly isolated
  enemies: ['ice'],  // Ancient rivalry with Ice Kingdom
  
  factions: [
    {
      id: 'fire_court',
      name: 'Fire Court',
      kind: 'state',
      values: ['order', 'power', 'loyalty', 'strength'],
      taboos: ['ice_magic', 'insult_monarchy', 'weakness', 'water_worship'],
      relations: {
        fire_guards: 0.9,
        fire_citizens: 0.6,
        lava_miners: 0.4,
        ice_court: -0.8,       // Deep hostility
        ice_citizens: -0.6,    // General hostility
        candy_kingdom: -0.1,   // Slight wariness
        banana_guard: -0.3,    // Distrust other authority
        slime_court: 0.2       // Neutral-positive
      },
      lawfulness: 0.8
    },
    {
      id: 'fire_guards',
      name: 'Flame Guards',
      kind: 'state',
      values: ['duty', 'strength', 'honor', 'vigilance'],
      taboos: ['cowardice', 'betrayal', 'ice_sympathy'],
      relations: {
        fire_court: 0.9,
        fire_citizens: 0.7,
        lava_miners: 0.5,
        ice_court: -0.9,
        banana_guard: -0.2,    // Professional rivalry
        candy_kingdom: -0.1
      },
      lawfulness: 0.85,
      specialActions: ['flame_intimidate', 'heat_warning']
    },
    {
      id: 'fire_citizens',
      name: 'Flame People',
      kind: 'civilian',
      values: ['passion', 'family', 'warmth', 'tradition'],
      taboos: ['extinguishing', 'cold_embrace', 'water_magic'],
      relations: {
        fire_court: 0.6,
        fire_guards: 0.7,
        lava_miners: 0.6,
        ice_citizens: -0.5,
        candy_citizens: 0.0,
        slime_citizens: 0.1
      },
      lawfulness: 0.6
    },
    {
      id: 'lava_miners',
      name: 'Lava Miners Guild',
      kind: 'guild',
      values: ['profit', 'safety', 'brotherhood', 'hard_work'],
      taboos: ['strikebreaking', 'unsafe_practices', 'claim_jumping'],
      relations: {
        fire_court: 0.4,
        fire_guards: 0.5,
        fire_citizens: 0.6,
        fire_merchants: 0.7,
        ice_court: -0.4,
        slime_traders: 0.5,    // Trade relations
        candy_merchants: 0.3
      },
      lawfulness: 0.5,
      specialActions: ['ore_trade', 'safety_protest']
    },
    {
      id: 'fire_merchants',
      name: 'Flame Traders',
      kind: 'guild',
      values: ['profit', 'quality', 'heat_goods', 'reputation'],
      taboos: ['ice_trade', 'water_goods', 'cold_deals'],
      relations: {
        fire_court: 0.5,
        lava_miners: 0.7,
        candy_merchants: 0.3,
        slime_traders: 0.6,
        ice_merchants: -0.7,   // Trade embargo
        dungeon_merchants: 0.4
      },
      lawfulness: 0.5
    },
    {
      id: 'flame_priests',
      name: 'Order of the Eternal Flame',
      kind: 'cult',
      values: ['eternal_flame', 'purity', 'sacrifice', 'devotion'],
      taboos: ['extinguishing', 'ice_worship', 'flame_doubt'],
      relations: {
        fire_court: 0.7,
        fire_citizens: 0.8,
        ice_court: -1.0,       // Absolute enemies
        water_elementals: -0.9,
        slime_elementals: -0.3  // Different philosophies
      },
      lawfulness: 0.4,  // Religious law over civil law
      specialActions: ['flame_blessing', 'purification_ritual']
    }
  ],
  
  customs: {
    greetings: ['Burn bright!', 'Flames guide you!', 'Hot greetings!'],
    farewells: ['Keep the flame!', 'May you never be extinguished!', 'Burn on!'],
    currency: 'ember_coins',
    festivals: ['Flame Festival', 'Lava Day', 'Burning Man Competition'],
    foods: ['flame_bits', 'charcoal_cakes', 'spicy_coal', 'magma_melts'],
    music_style: 'fire_metal'
  }
};