/**
 * Pot Throwing Practice Quest Definition
 * A quest that teaches the player how to use throwable items effectively
 */
export const potThrowingQuestDef = {
  id: 'pot_throwing_practice',
  
  /**
   * Create a new instance of the quest
   * @param {Object} params - Optional parameters
   * @returns {Object} Quest instance
   */
  create: (params = {}) => ({
    id: 'pot_throwing_practice',
    name: 'Throwing Practice',
    description: 'Learn the art of pot throwing by practicing with different types of pots.',
    
    // Quest metadata
    giver: 'Steven',
    giverLocation: { cx: 0, cy: 0, biome: 'candy_kingdom' },
    priority: 'SIDE',
    difficulty: 'EASY',
    level: 2,
    
    // Quest objectives - two separate objectives for different pot types
    objectives: [
      {
        id: 'throw_sugar_pot',
        type: 'EVENT_BASED',
        description: 'Throw a Sugar Pot',
        progress: 0,
        count: 1,  // Need to throw 1 sugar pot
        completed: false,
        conditions: {
          events: ['ITEM_THROWN'],
          match: {
            'item.id': 'sugar_pot'  // Match sugar pot specifically
          }
        }
      },
      {
        id: 'throw_clay_pot',
        type: 'EVENT_BASED',
        description: 'Throw a Clay Pot',
        progress: 0,
        count: 1,  // Need to throw 1 clay pot
        completed: false,
        conditions: {
          events: ['ITEM_THROWN'],
          match: {
            'item.id': 'clay_pot'  // Match clay pot specifically
          }
        }
      }
    ],
    
    // Quest rewards
    rewards: {
      gold: 1500,
      experience: 25,
      items: []  // Could add bonus throwables as reward
    },
    
    // Quest state
    state: 'ACTIVE',
    startedAt: null,
    completedAt: null,
    
    // Custom data
    flags: params.flags || {}
  }),
  
  /**
   * Called when quest is started
   * @param {Object} state - Game state
   * @param {Object} quest - The quest instance
   */
  onStart: (state, quest) => {
    // Set quest flags
    if (state.flags) {
      state.flags.pot_throwing_quest_started = true;
    }
    
    // Give the player some pots to practice with if they don't have any
    const hasSugarPot = state.player.inventory?.some(item => 
      item.id === 'sugar_pot' || item.type === 'sugar_pot'
    );
    const hasClayPot = state.player.inventory?.some(item => 
      item.id === 'clay_pot' || item.type === 'clay_pot'
    );
    
    if (!hasSugarPot) {
      state.player.inventory.push({
        id: 'sugar_pot',
        type: 'throwable',
        name: 'Sugar Pot',
        count: 2  // Give 2 in case they miss
      });
      if (state.log) {
        state.log("Steven hands you 2 Sugar Pots", "item");
      }
    }
    
    if (!hasClayPot) {
      state.player.inventory.push({
        id: 'clay_pot',
        type: 'throwable',
        name: 'Clay Pot',
        count: 2  // Give 2 in case they miss
      });
      if (state.log) {
        state.log("Steven hands you 2 Clay Pots", "item");
      }
    }
    
    // Log quest start
    if (state.log) {
      state.log("Steven: 'Let me teach you the ancient art of pot throwing!'", "quest");
      state.log("'Throwables are powerful ranged weapons in combat.'", "quest");
      state.log("'Practice throwing both a Sugar Pot and a Clay Pot.'", "quest");
      state.log("'Press T to enter throw mode, then click your target!'", "quest");
      state.log("Quest Started: Throwing Practice", "good");
    }
  },
  
  /**
   * Called when quest is completed
   * @param {Object} state - Game state
   * @param {Object} quest - The quest instance
   * @param {Object} rewards - The rewards that were given
   */
  onComplete: (state, quest, rewards) => {
    // Set completion flag for dialogue system
    if (state.flags) {
      state.flags.pot_throwing_quest_completed = true;
    }
    
    // Log completion
    if (state.log) {
      state.log("Steven: 'Excellent throwing technique! You're a natural.'", "quest");
      state.log("'Here's your reward. Remember, different pots have different effects!'", "quest");
      state.log("'Fire Pots burn enemies, Mint Pots freeze them, and so on.'", "quest");
    }
  }
};