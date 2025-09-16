import { QuestState, QuestObjective, QuestPriority, QuestDifficulty } from '../constants.js';

/**
 * Create the Open Inventory quest
 * This is a simple tutorial quest to demonstrate QuestManager usage
 */
export function createQuests() {
  var questMap = new Map();
  questMap['open_inventory_quest'] = 
  {
    id: 'open_inventory_quest',
    name: 'Tutorial: Open Your Inventory',
    description: 'Learn how to open your inventory by pressing the "i" key.',
    giver: 'Steven',
    giverLocation: { cx: 0, cy: 0, biome: 'candy_kingdom' },
    
    // Quest metadata
    priority: QuestPriority.MAIN, // Main quest since it's a tutorial
    difficulty: QuestDifficulty.TRIVIAL,
    level: 1,
    
    // Simple objective - we'll use INTERACT type as closest match
    objectives: [
      {
        id: 'open_inventory',
        type: QuestObjective.INTERACT, // Using existing type
        target: 'inventory_ui',
        count: 1,
        progress: 0,
        completed: false,
        description: 'Open your inventory by pressing "i"'
      }
    ],
    
    // Rewards
    rewards: {
      gold: 2000,
      experience: 10,
      reputation: {
        steven: 5
      }
    },
    
    // Quest state
    state: QuestState.ACTIVE, // Will be set to ACTIVE when started
    startedAt: null,
    completedAt: null
  };
  return questMap;
}