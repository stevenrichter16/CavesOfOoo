/**
 * Candy Kingdom data pack
 * Home of Princess Bubblegum, Banana Guards, and candy citizens
 * @type {import('./_types.js').KingdomPack}
 */
export default {
  id: 'candy',
  name: 'Candy Kingdom',
  tags: ['sweet', 'civilization', 'science', 'order'],
  lawLevel: 0.8, // High law enforcement under PB's rule
  
  realmWeights: {
    trust: 1.1,    // Values trust slightly more
    respect: 1.2,  // Values respect and order
    fear: 0.8,     // Less fear-based than Fire Kingdom
    law: 1.3,      // Strong law emphasis
    rumor: 1.0     // Normal rumor influence
  },
  
  terrainCost: {
    candy_road: 0.7,    // Easy movement on candy roads
    grass: 1.0,         // Normal grass
    forest: 1.2,        // Slightly harder in forests
    swamp: 2.0,         // Hard in swamps
    lava: 8.0,          // Very hard in lava
    ice: 3.0,           // Moderate difficulty on ice
    water: 1.5,         // Some difficulty in water
    mountain: 2.5       // Hard on mountains
  },
  
  disguiseUniforms: [
    'banana_guard',
    'candy_court',
    'candy_citizen',
    'royal_servant'
  ],
  
  ruler: 'Princess Bubblegum',
  capital: 'Candy Kingdom Castle',
  allies: ['breakfast_kingdom'],
  enemies: [],  // Generally diplomatic, but wary of threats
  
  factions: [
    {
      id: 'banana_guard',
      name: 'Banana Guards',
      kind: 'state',
      values: ['order', 'loyalty', 'protection', 'duty'],
      taboos: ['desertion', 'treason', 'dereliction'],
      relations: {
        candy_citizens: 0.7,
        candy_merchants: 0.5,
        candy_nobles: 0.8,
        fire_court: -0.3,      // Wary of Fire Kingdom authority
        ice_court: -0.2,       // Slight distrust
        slime_court: 0.1,      // Neutral-positive
        bandits: -0.9,         // Very hostile to criminals
        dungeon_keepers: -0.6  // Opposed to dungeon activities
      },
      lawfulness: 0.95
    },
    {
      id: 'candy_citizens',
      name: 'Candy Citizens',
      kind: 'civilian',
      values: ['community', 'sweetness', 'safety', 'tradition'],
      taboos: ['violence', 'sourness', 'chaos'],
      relations: {
        banana_guard: 0.7,
        candy_merchants: 0.6,
        candy_nobles: 0.3,
        fire_court: -0.4,
        ice_citizens: 0.2,
        slime_citizens: 0.3,
        bandits: -0.7
      },
      lawfulness: 0.7
    },
    {
      id: 'candy_merchants',
      name: 'Candy Merchants Guild',
      kind: 'guild',
      values: ['profit', 'trade', 'quality', 'reputation'],
      taboos: ['theft', 'counterfeit', 'bad_deals'],
      relations: {
        banana_guard: 0.5,
        candy_citizens: 0.6,
        candy_nobles: 0.4,
        slime_traders: 0.7,    // Good trade relations
        ice_merchants: 0.5,    // Decent trade
        fire_merchants: 0.3,   // Some trade
        bandits: -0.8,         // Hate thieves
        dungeon_merchants: 0.2 // Cautious trade
      },
      lawfulness: 0.6,
      specialActions: ['sweet_deal', 'candy_trade']
    },
    {
      id: 'candy_nobles',
      name: 'Candy Court',
      kind: 'state',
      values: ['refinement', 'science', 'progress', 'order'],
      taboos: ['rudeness', 'ignorance', 'chaos', 'anti_science'],
      relations: {
        banana_guard: 0.8,
        candy_citizens: 0.3,
        candy_merchants: 0.4,
        fire_court: -0.2,
        ice_court: 0.0,
        slime_court: 0.2,
        breakfast_nobles: 0.6
      },
      lawfulness: 0.8
    },
    {
      id: 'bubblegum_scientists',
      name: 'Royal Science Division',
      kind: 'guild',
      values: ['knowledge', 'progress', 'logic', 'innovation'],
      taboos: ['anti_science', 'magic_abuse', 'ignorance'],
      relations: {
        banana_guard: 0.6,
        candy_nobles: 0.9,
        candy_citizens: 0.4,
        wizard_guild: 0.3,     // Some cooperation
        fire_court: -0.4,      // Opposed to authoritarianism
        ice_court: -0.1
      },
      lawfulness: 0.7,
      specialActions: ['science_lecture', 'experiment']
    }
  ],
  
  customs: {
    greetings: ['Hey there, sugar!', 'Sweet day to you!', 'How algebraic!'],
    farewells: ['Stay sweet!', 'Catch you on the flip!', 'Mathematical!'],
    currency: 'candy_coins',
    festivals: ['Candy Carnival', 'Science Fair', 'Royal Ball'],
    foods: ['candy_apples', 'bubblegum', 'cotton_candy', 'jawbreakers'],
    music_style: 'bubblegum_pop'
  }
};