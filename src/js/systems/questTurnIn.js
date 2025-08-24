// systems/questTurnIn.js - Quest turn-in business logic
// Handles quest completion, rewards, and state management

import { QUEST_TEMPLATES } from '../config.js';
import { turnInQuest, checkFetchQuestItem, turnInFetchQuest, turnInFetchQuestWithItem, giveQuest } from '../quests.js';
import { emit } from '../events.js';
import { EventType } from '../eventTypes.js';
import { renderQuestTurnIn as renderUI } from '../ui/questTurnIn.js';

/**
 * Open the quest turn-in interface
 */
export function openQuestTurnIn(state, vendor, completedQuests) {
  // Prevent opening if already open
  if (state.ui.questTurnInOpen) {
    return;
  }
  
  state.ui.questTurnInOpen = true;
  state.ui.shopVendor = vendor;
  state.ui.completedQuests = completedQuests;
  state.ui.allCompletedQuests = [...completedQuests]; // Store all for tracking
  state.ui.selectedQuestIndex = 0;
  state.ui.selectingQuest = completedQuests.length > 1; // Show selection if multiple quests
  
  // Emit event for UI to render
  emit('questTurnIn:open', { vendor, completedQuests });
}

/**
 * Process quest rewards and turn-in logic
 */
export function processQuestRewards(state, questsToTurnIn = null) {
  // Use provided quests or all completed quests
  const quests = questsToTurnIn || state.ui.completedQuests;
  
  // Check if there are any fetch quests that need item selection
  const fetchQuestsNeedingSelection = quests.filter(qId => {
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (!fetchQuest) return false;
    
    // Check if player has the item
    if (!checkFetchQuestItem(state.player, fetchQuest)) return false;
    
    // Always show selection for equipment (weapon, armor, headgear)
    // For consumables (potions), only show if multiple matches
    const matchingItems = state.player.inventory.filter(item => 
      fetchQuest.targetItem.itemCheck(item)
    );
    
    if (matchingItems.length === 0) return false;
    
    // Always show selection for equipment items
    const firstMatch = matchingItems[0];
    if (firstMatch.type === "weapon" || firstMatch.type === "armor" || firstMatch.type === "headgear") {
      return true; // Always show selection for equipment
    }
    
    // For other items (like potions), only show if multiple
    return matchingItems.length > 1;
  });
  
  // If we need to select an item and haven't yet
  // But skip if we already have a selected item index
  if (fetchQuestsNeedingSelection.length > 0 && !state.ui.selectingFetchItem && state.ui.selectedFetchItemIndex === undefined) {
    // Start item selection for the first fetch quest
    state.ui.selectingFetchItem = fetchQuestsNeedingSelection[0];
    state.ui.fetchItemSelectedIndex = 0;
    state.ui.completedQuests = quests; // Update to only the quests we're turning in
    emit('questTurnIn:selectItem', { questId: fetchQuestsNeedingSelection[0] });
    
    // Need to re-render the UI to show item selection
    renderUI(state);
    return;
  }
  
  // Process all quests
  quests.forEach(qId => {
    // Check if it's a fetch quest
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest) {
      // If we had item selection, use the selected item
      if (state.ui.selectedFetchItemIndex !== undefined) {
        turnInFetchQuestWithItem(state, qId, state.ui.shopVendor, state.ui.selectedFetchItemIndex);
        state.ui.selectedFetchItemIndex = undefined;
      } else {
        // Otherwise use the first matching item
        turnInFetchQuest(state, qId, state.ui.shopVendor);
      }
    } else {
      turnInQuest(state, qId);
    }
  });
  
  // Give new quest after turning in starter
  if (quests.includes("kill_any")) {
    // Give a random quest from available ones
    const nextQuests = ["kill_goober", "kill_three"];
    const nextQuest = nextQuests[Math.floor(Math.random() * nextQuests.length)];
    giveQuest(state, nextQuest);
  }
  
  // Check if there are more quests to turn in
  checkForRemainingQuests(state, quests);
}

/**
 * Check for remaining quests after turn-in
 */
function checkForRemainingQuests(state, justTurnedIn) {
  // Filter out quests that were just turned in
  const remainingQuests = state.ui.allCompletedQuests ? 
    state.ui.allCompletedQuests.filter(qId => {
      // Don't include quests we just turned in
      if (justTurnedIn.includes(qId)) return false;
      
      // Check if quest is still actually completed and ready to turn in
      const fetchQuest = state.player.quests.fetchQuests?.[qId];
      if (fetchQuest) {
        // For fetch quests, check if we still have the item
        return checkFetchQuestItem(state.player, fetchQuest);
      } else {
        // For regular quests, check if it's still in active quests
        if (!state.player.quests.active.includes(qId)) return false;
        const quest = QUEST_TEMPLATES[qId];
        if (!quest) return false;
        const progress = state.player.quests.progress[qId] || 0;
        return progress >= quest.targetCount;
      }
    }) : [];
  
  if (remainingQuests.length > 0) {
    // Still have quests to turn in, go back to selection
    state.ui.completedQuests = remainingQuests;
    state.ui.allCompletedQuests = remainingQuests; // Update the list
    state.ui.selectingQuest = remainingQuests.length > 1;
    state.ui.selectedQuestIndex = 0;
    state.ui.selectingFetchItem = null;
    state.ui.fetchItemSelectedIndex = 0;
    emit('questTurnIn:update', { remainingQuests });
  } else {
    // Close quest turn-in and open shop
    closeQuestTurnIn(state);
  }
}

/**
 * Close quest turn-in UI and return to shop
 */
export function closeQuestTurnIn(state) {
  // Clear quest turn-in state
  state.ui.questTurnInOpen = false;
  state.ui.completedQuests = [];
  state.ui.allCompletedQuests = null;
  state.ui.selectingFetchItem = null;
  state.ui.fetchItemSelectedIndex = 0;
  state.ui.selectingQuest = false;
  
  // Emit close event
  emit('questTurnIn:close');
  
  // Return to vendor shop if we have a vendor
  if (state.ui.shopVendor) {
    // Small delay to prevent UI flashing
    setTimeout(() => {
      // This will be called from game.js
      emit('questTurnIn:openShop', { vendor: state.ui.shopVendor });
    }, 100);
  }
}

/**
 * Get matching items for a fetch quest
 */
export function getMatchingItemsForQuest(state, questId) {
  const fetchQuest = state.player.quests.fetchQuests?.[questId];
  if (!fetchQuest) return [];
  
  const matchingItems = [];
  state.player.inventory.forEach((item, idx) => {
    if (fetchQuest.targetItem.itemCheck(item)) {
      matchingItems.push({...item, inventoryIndex: idx});
    }
  });
  
  return matchingItems;
}

/**
 * Check if an item is equipped
 */
export function isItemEquipped(state, item) {
  return (item.type === "weapon" && item.id === state.equippedWeaponId) ||
         (item.type === "armor" && item.id === state.equippedArmorId) ||
         (item.type === "headgear" && item.id === state.equippedHeadgearId);
}