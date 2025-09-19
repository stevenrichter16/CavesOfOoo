/**
 * Open Inventory Quest Definition
 * A tutorial quest that teaches the player how to open their inventory
 */
export const openInventoryQuestDef = {
  id: 'open_inventory_quest',
  
  /**
   * Create a new instance of the quest
   * @param {Object} params - Optional parameters
   * @returns {Object} Quest instance
   */
  create: (params = {}) => ({
    id: 'open_inventory_quest',
    name: 'Tutorial: Open Your Inventory',
    description: 'Learn how to open your inventory by pressing the "i" key.',
    
    // Quest metadata
    giver: 'Steven',
    giverLocation: { cx: 0, cy: 0, biome: 'candy_kingdom' },
    priority: 'MAIN',
    difficulty: 'TRIVIAL',
    level: 1,
    
    // Objectives
    objectives: [
      {
        id: 'open_inventory',
        type: 'EVENT_BASED',
        description: 'Open your inventory by pressing "i"',
        progress: 0,
        count: 1,
        completed: false,
        conditions: {
          events: ['INVENTORY_OPENED'],
          // No additional match conditions needed - any inventory open counts
        }
      }
    ],
    
    // Rewards
    rewards: {
      gold: 2000,
      experience: 10,
      items: []
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
      state.flags.inventory_quest_started = true;
    }
    
    // Log quest start
    if (state.log) {
      state.log("Steven: 'Ah, you look new here! Let me teach you something basic.'", "quest");
      state.log("'Press the 'i' key to open your inventory. It's essential for any adventurer!'", "quest");
      state.log("Quest Started: Open Your Inventory", "good");
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
      state.flags.inventory_tutorial_completed = true;
    }
    
    // Log completion
    if (state.log) {
      state.log("Steven: 'Excellent! You're a natural at this.'", "quest");
      state.log("'Here's your reward for completing the tutorial.'", "quest");
    }
  }
};