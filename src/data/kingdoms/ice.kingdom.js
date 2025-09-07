/**
 * Ice Kingdom data pack
 * Ruled by Ice King, home to penguins, ice creatures, and snow people
 * @type {import('./_types.js').KingdomPack}
 */
export default {
  id: 'ice',
  name: 'Ice Kingdom',
  tags: ['ice', 'cold', 'isolated', 'magical'],
  lawLevel: 0.6, // Moderate law, Ice King is erratic
  
  realmWeights: {
    trust: 0.8,    // Less trusting (isolation)
    respect: 1.0,  // Normal respect
    fear: 1.1,     // Some fear of Ice King's powers
    law: 0.9,      // Law depends on Ice King's mood
    rumor: 1.2     // Rumors spread in isolation
  },
  
  terrainCost: {
    ice: 0.8,           // Native terrain, easy
    snow: 0.9,          // Easy in snow
    ice_road: 0.7,      // Efficient ice roads
    frozen_lake: 1.0,   // Can walk on frozen water
    water: 3.0,         // Harder when not frozen
    lava: 8.0,          // Extremely difficult (opposite element)
    fire: 7.0,          // Very dangerous
    basalt: 5.0,        // Hot rock is hard
    grass: 1.5,         // Okay but not ideal
    forest: 1.8,        // Harder in forests
    mountain: 1.2       // Good with mountains
  },
  
  disguiseUniforms: [
    'ice_guard',
    'ice_court',
    'penguin_suit',
    'snow_citizen'
  ],
  
  ruler: 'Ice King',
  capital: 'Ice King\'s Castle',
  allies: [],  // Ice King doesn't have real allies
  enemies: ['fire'],  // Ancient rivalry with Fire Kingdom
  
  factions: [
    {
      id: 'ice_court',
      name: 'Ice Court',
      kind: 'state',
      values: ['loyalty', 'cold_beauty', 'tradition', 'magic'],
      taboos: ['fire_magic', 'heat_worship', 'melting', 'insulting_ice_king'],
      relations: {
        ice_guards: 0.8,
        ice_citizens: 0.5,
        penguin_guards: 0.7,
        fire_court: -0.8,      // Deep hostility
        fire_citizens: -0.6,   // General hostility
        candy_kingdom: 0.0,    // Neutral
        banana_guard: -0.2,    // Slight distrust
        slime_court: 0.1
      },
      lawfulness: 0.7
    },
    {
      id: 'ice_guards',
      name: 'Frost Guards',
      kind: 'state',
      values: ['duty', 'frost', 'protection', 'endurance'],
      taboos: ['desertion', 'warmth_seeking', 'fire_friendship'],
      relations: {
        ice_court: 0.8,
        ice_citizens: 0.6,
        penguin_guards: 0.8,
        fire_guards: -0.9,     // Direct enemies
        banana_guard: -0.1,
        candy_kingdom: 0.0
      },
      lawfulness: 0.75,
      specialActions: ['freeze_warning', 'ice_barrier']
    },
    {
      id: 'penguin_guards',
      name: 'Penguin Guards',
      kind: 'state',
      values: ['loyalty', 'waddle_power', 'ice_king', 'gunter'],
      taboos: ['betraying_ice_king', 'warmth', 'flying'],
      relations: {
        ice_court: 0.7,
        ice_guards: 0.8,
        ice_citizens: 0.6,
        fire_court: -0.7,
        candy_citizens: 0.2,   // Penguins are cute
        slime_citizens: 0.3
      },
      lawfulness: 0.8,
      specialActions: ['waddle_attack', 'gunter_call']
    },
    {
      id: 'ice_citizens',
      name: 'Ice People',
      kind: 'civilian',
      values: ['survival', 'community', 'cold_comfort', 'isolation'],
      taboos: ['melting', 'fire_embrace', 'heat_seeking'],
      relations: {
        ice_court: 0.5,
        ice_guards: 0.6,
        penguin_guards: 0.6,
        fire_citizens: -0.5,
        candy_citizens: 0.2,
        slime_citizens: 0.3
      },
      lawfulness: 0.6
    },
    {
      id: 'ice_merchants',
      name: 'Frost Traders',
      kind: 'guild',
      values: ['profit', 'ice_goods', 'preservation', 'quality'],
      taboos: ['melted_goods', 'fire_trade', 'warm_deals'],
      relations: {
        ice_court: 0.4,
        ice_citizens: 0.7,
        candy_merchants: 0.5,  // Some trade
        slime_traders: 0.6,    // Good trade
        fire_merchants: -0.7,  // Trade embargo
        dungeon_merchants: 0.3
      },
      lawfulness: 0.5,
      specialActions: ['ice_preservation', 'frozen_deal']
    },
    {
      id: 'snow_golems',
      name: 'Snow Golem Collective',
      kind: 'civilian',
      values: ['purpose', 'creation', 'service', 'cold'],
      taboos: ['heat', 'purposelessness', 'destruction'],
      relations: {
        ice_court: 0.6,
        ice_citizens: 0.7,
        fire_court: -1.0,      // Natural enemies
        candy_citizens: 0.4,
        slime_citizens: 0.2
      },
      lawfulness: 0.9,  // Very lawful, follow programming
      specialActions: ['snow_build', 'cold_service']
    },
    {
      id: 'ice_wizards',
      name: 'Frost Wizard Circle',
      kind: 'guild',
      values: ['ice_magic', 'knowledge', 'power', 'research'],
      taboos: ['fire_magic', 'heat_spells', 'anti_magic'],
      relations: {
        ice_court: 0.7,
        wizard_guild: 0.5,     // Professional respect
        fire_court: -0.9,
        bubblegum_scientists: 0.2
      },
      lawfulness: 0.4,  // Magic over law
      specialActions: ['ice_spell', 'frost_research']
    }
  ],
  
  customs: {
    greetings: ['Stay frosty!', 'Cool greetings!', 'Ice to meet you!'],
    farewells: ['Stay cool!', 'Don\'t melt!', 'Freeze you later!'],
    currency: 'ice_shards',
    festivals: ['Snowman Day', 'Ice Sculpture Contest', 'Penguin Parade'],
    foods: ['snow_cones', 'ice_cream', 'frozen_fish', 'glacier_mints'],
    music_style: 'ice_ambient'
  }
};