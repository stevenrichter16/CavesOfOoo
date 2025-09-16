import { createOpenInventoryQuest } from '../definitions/openInventory.js';
import { QuestState } from '../constants.js';

/**
 * Start the open inventory quest
 */
export function startOpenInventoryQuest(state, questManager) {
  // Check if quest already exists
  const existingQuest = questManager.getQuest('open_inventory_quest');
  if (existingQuest) {
    console.log('Quest already exists');
    return false;
  }
  
  // Create and add the quest
  const quest = createOpenInventoryQuest();
  quest.startedAt = Date.now();
  questManager.addQuest(quest);
  
  // Set quest flags
  state.flags = state.flags || {};
  state.flags.inventory_quest_started = true;
  
  // Log quest start
  if (state.log) {
    state.log("Steven: 'Ah, you look new here! Let me teach you something basic.'", "quest");
    state.log("'Press the 'i' key to open your inventory. It's essential for any adventurer!'", "quest");
    state.log("Quest Started: Open Your Inventory", "good");
  }
  
  return true;
}

/**
 * Complete the open inventory objective
 */
export function completeInventoryObjective(state, questManager) {
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
  
  // Log completion
  if (state.log) {
    state.log("✓ Inventory opened! Return to Steven for your reward.", "quest");
  }
  
  return true;
}

/**
 * Turn in the quest to Steven
 */
export function turnInOpenInventoryQuest(state, questManager) {
  const quest = questManager.getQuest('open_inventory_quest');
  if (!quest) {
    return false;
  }
  
  // Check if objective is complete
  const objective = quest.objectives.find(o => o.id === 'open_inventory');
  if (!objective || !objective.completed) {
    return false;
  }
  
  // Complete the quest using QuestManager
  const rewards = questManager.completeQuest('open_inventory_quest');
  
  // Apply rewards
  if (rewards && state.player) {
    // Add gold
    if (rewards.gold) {
      state.player.gold = (state.player.gold || 0) + rewards.gold;
    }
    
    // Add experience
    if (rewards.experience) {
      state.player.experience = (state.player.experience || 0) + rewards.experience;
    }
  }
  
  // Set completion flag
  state.flags = state.flags || {};
  state.flags.inventory_tutorial_completed = true;
  
  // Log completion
  if (state.log) {
    state.log("Quest Complete: Tutorial - Open Your Inventory!", "quest");
    state.log("Steven: 'Well done! Here's 2000 gold for your trouble.'", "quest");
    state.log("You received 2000 gold!", "good");
  }
  
  return true;
}