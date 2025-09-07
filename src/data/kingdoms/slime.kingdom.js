/**
 * Slime Kingdom data pack
 * Ruled by Slime Princess, home to various slime creatures
 * @type {import('./_types.js').KingdomPack}
 */
export default {
  id: 'slime',
  name: 'Slime Kingdom',
  tags: ['slime', 'gooey', 'adaptable', 'underground'],
  lawLevel: 0.5, // Moderate law, more flexible society
  
  realmWeights: {
    trust: 1.0,    // Normal trust
    respect: 0.9,  // Less formal respect
    fear: 0.7,     // Not fear-based
    law: 0.8,      // Flexible law
    rumor: 1.3     // Rumors spread through slime network
  },
  
  terrainCost: {
    slime: 0.6,         // Native terrain, very easy
    swamp: 0.8,         // Comfortable in swamps
    underground: 0.9,   // Good underground
    sewer: 0.7,         // Excellent in sewers
    water: 1.2,         // Okay in water
    mud: 0.8,           // Great in mud
    grass: 1.3,         // Slightly harder
    fire: 5.0,          // Dangerous to slimes
    lava: 6.0,          // Very dangerous
    ice: 2.0,           // Slows them down
    mountain: 2.5       // Difficult terrain
  },
  
  disguiseUniforms: [
    'slime_guard',
    'slime_court',
    'slime_citizen',
    'goo_worker'
  ],
  
  ruler: 'Slime Princess',
  capital: 'Slime Central',
  allies: [],  // Generally neutral
  enemies: [],  // No traditional enemies
  
  factions: [
    {
      id: 'slime_court',
      name: 'Slime Court',
      kind: 'state',
      values: ['flexibility', 'adaptation', 'unity', 'flow'],
      taboos: ['rigidity', 'drying_out', 'separation', 'anti_slime'],
      relations: {
        slime_guards: 0.8,
        slime_citizens: 0.7,
        slime_traders: 0.6,
        candy_kingdom: 0.2,    // Neutral-positive
        fire_court: 0.2,       // Cautious but not hostile
        ice_court: 0.1,        // Neutral
        banana_guard: 0.0,
        dungeon_keepers: 0.3   // Some underground alliance
      },
      lawfulness: 0.6
    },
    {
      id: 'slime_guards',
      name: 'Goo Guards',
      kind: 'state',
      values: ['protection', 'absorption', 'flexibility', 'loyalty'],
      taboos: ['brittleness', 'abandonment', 'solidification'],
      relations: {
        slime_court: 0.8,
        slime_citizens: 0.7,
        slime_traders: 0.5,
        banana_guard: 0.1,     // Professional respect
        fire_guards: -0.3,     // Wary of fire
        ice_guards: -0.1
      },
      lawfulness: 0.65,
      specialActions: ['slime_engulf', 'goo_shield']
    },
    {
      id: 'slime_citizens',
      name: 'Slime People',
      kind: 'civilian',
      values: ['community', 'fluidity', 'sharing', 'adaptation'],
      taboos: ['isolation', 'hardening', 'heat_exposure'],
      relations: {
        slime_court: 0.7,
        slime_guards: 0.7,
        slime_traders: 0.8,
        candy_citizens: 0.3,
        ice_citizens: 0.3,
        fire_citizens: -0.2,   // Wary of fire
        dungeon_dwellers: 0.4
      },
      lawfulness: 0.5
    },
    {
      id: 'slime_traders',
      name: 'Goo Merchants Guild',
      kind: 'guild',
      values: ['profit', 'viscosity', 'quality', 'absorption'],
      taboos: ['dried_goods', 'fire_deals', 'solid_contracts'],
      relations: {
        slime_court: 0.6,
        slime_citizens: 0.8,
        candy_merchants: 0.7,  // Good trade
        ice_merchants: 0.6,    // Decent trade
        fire_merchants: 0.6,   // Cautious trade
        lava_miners: 0.5,      // Some mineral trade
        dungeon_merchants: 0.7 // Underground trade routes
      },
      lawfulness: 0.4,
      specialActions: ['slime_deal', 'absorption_trade']
    },
    {
      id: 'sewer_slimes',
      name: 'Sewer Slime Collective',
      kind: 'civilian',
      values: ['recycling', 'flow', 'hidden_knowledge', 'waste_management'],
      taboos: ['pollution', 'clogging', 'exposure'],
      relations: {
        slime_court: 0.5,
        slime_citizens: 0.6,
        dungeon_dwellers: 0.7,
        candy_citizens: -0.2,  // Candy people find them gross
        rat_guild: 0.8         // Alliance with rats
      },
      lawfulness: 0.3,  // Outside normal law
      specialActions: ['sewer_knowledge', 'waste_removal']
    },
    {
      id: 'gel_scientists',
      name: 'Gel Research Institute',
      kind: 'guild',
      values: ['viscosity', 'chemistry', 'adaptation', 'innovation'],
      taboos: ['solidification', 'evaporation', 'contamination'],
      relations: {
        slime_court: 0.7,
        bubblegum_scientists: 0.4,  // Some cooperation
        ice_wizards: 0.2,
        fire_court: -0.5
      },
      lawfulness: 0.5,
      specialActions: ['gel_experiment', 'viscosity_test']
    },
    {
      id: 'slime_elementals',
      name: 'Primordial Slimes',
      kind: 'cult',
      values: ['primordial_ooze', 'unity', 'absorption', 'evolution'],
      taboos: ['individuality', 'solidification', 'separation'],
      relations: {
        slime_court: 0.6,
        slime_citizens: 0.7,
        water_elementals: 0.5,
        earth_elementals: 0.4,
        fire_court: -0.8,
        flame_priests: -0.3  // Different philosophies
      },
      lawfulness: 0.2,  // Ancient laws only
      specialActions: ['merge_ritual', 'ooze_blessing']
    }
  ],
  
  customs: {
    greetings: ['Gooey greetings!', 'Flow well!', 'Slime time!'],
    farewells: ['Keep flowing!', 'Stay viscous!', 'Slide you later!'],
    currency: 'gel_gems',
    festivals: ['Ooze Festival', 'Great Merge', 'Viscosity Day'],
    foods: ['gel_cubes', 'slime_smoothies', 'goo_balls', 'absorption_paste'],
    music_style: 'squelch_wave'
  }
};