import { QuestState, QuestObjective, QuestPriority, QuestDifficulty } from '../constants.js';
import { setStoryFlag } from '../../../../social/dialogue.js';

/**
 * Create the Open Inventory quest
 * This is a simple tutorial quest to demonstrate QuestManager usage
 */
export function startOpenInventoryQuest(state, questManager, quest) {
  // Check if quest already exists
//   const existingQuest = questManager.getQuest('open_inventory_quest');
//   if (existingQuest) {
//     console.log('Quest already exists');
//     return false;
//   }
  
  // Create and add the quest
  //const quest = createOpenInventoryQuest();
  quest.startedAt = Date.now();
  //questManager.addQuest(quest);
  
  // Set quest flags
  state.flags = state.flags || {};
  state.flags.inventory_quest_started = true;
  
  // Log quest start
  if (state.log) {
    state.log("Steven: 'Ah, you look new here! Let me teach you something basic.'", "quest");
    state.log("'Press the 'i' key to open your inventory. It's essential for any adventurer!'", "quest");
    state.log("Quest Started: Open Your Inventory", "good");
  }
  console.log("Successfully Started starOpenInventoryQuest!");

  document.addEventListener('keydown', (e) => {
    if (e.key === 'i') {
        completeInventoryObjective(state, questManager);
        console.log("in startOpenInventory 'i' keypress");  
    }
  });
  return true;
}

/**
 * Complete the open inventory objective
 */
export function completeInventoryObjective(state, questManager) {
  console.log("in completeInventoryObjective");
  const quest = questManager.getQuest('open_inventory_quest');
  if (!quest || quest.state !== QuestState.ACTIVE) {
    return false;
  }
  
  const objective = quest.objectives.find(o => o.id === 'open_inventory');
  if (!objective || objective.completed) {
    return false;
  }
  
  // Update objective using QuestManager's updateObjective method
  questManager.updateObjective('open_inventory_quest', 'open_inventory', {
    progress: 1,
    completed: true
  });
  
  // Set flag for dialogue system
  state.flags = state.flags || {};
  setStoryFlag('inventory_tutorial_completed', true);
  
  // Log completion
  if (state.log) {
    state.log("✓ Inventory opened! Return to Steven for your reward.", "quest");
  }
  console.log("About to return true from completeInventoryObjective.");
  return true;
}


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
    start: startOpenInventoryQuest,
    startedAt: null,
    completedAt: null
  };
  return questMap;
}