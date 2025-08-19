import { QUEST_TEMPLATES } from './config.js';
import { levelUp } from './entities.js';

// Generate unique item ID
let itemIdCounter = 0;
function generateItemId() {
  return `item_${Date.now()}_${itemIdCounter++}`;
}

// Check if player has a quest
export function hasQuest(player, questId) {
  return player.quests.active.includes(questId);
}

// Check if quest is completed
export function isQuestCompleted(player, questId) {
  return player.quests.completed.includes(questId);
}

// Give quest to player (regular or fetch quest)
export function giveQuest(state, questId, questData = null) {
  const quest = questData || QUEST_TEMPLATES[questId];
  if (!quest) return false;
  
  const player = state.player;
  
  // Check if already has quest or completed it (unless repeatable)
  if (hasQuest(player, questId)) {
    state.log(`You already have this quest!`, "note");
    return false;
  }
  
  if (isQuestCompleted(player, questId) && !quest.isRepeatable) {
    state.log(`You've already completed this quest!`, "note");
    return false;
  }
  
  // Add quest to active
  player.quests.active.push(questId);
  
  // For fetch quests, store the quest data
  if (questData) {
    if (!player.quests.fetchQuests) player.quests.fetchQuests = {};
    player.quests.fetchQuests[questId] = questData;
    // Store vendor chunk location
    questData.vendorChunk = { x: state.cx, y: state.cy };
  }
  
  // Initialize progress tracking
  if (!player.quests.progress[questId]) {
    player.quests.progress[questId] = 0;
  }
  
  // Log quest acceptance
  state.log(`QUEST ACCEPTED: ${quest.name}`, "xp");
  state.log(`Objective: ${quest.objective}`, "note");
  
  return true;
}

// Update quest progress when monster is killed
export function updateQuestProgress(state, monsterKind) {
  const player = state.player;
  
  // Check each active quest
  player.quests.active.forEach(questId => {
    const quest = QUEST_TEMPLATES[questId];
    if (!quest) return;
    
    // Check if this kill counts for the quest
    if (quest.targetMonster === "any" || quest.targetMonster === monsterKind) {
      // Increment progress
      player.quests.progress[questId] = (player.quests.progress[questId] || 0) + 1;
      
      // Check if quest is complete
      if (player.quests.progress[questId] >= quest.targetCount) {
        state.log(`QUEST COMPLETE: ${quest.name}!`, "xp");
        state.log(`Return to any vendor for your reward!`, "good");
      } else {
        // Show progress
        const remaining = quest.targetCount - player.quests.progress[questId];
        state.log(`Quest progress: ${player.quests.progress[questId]}/${quest.targetCount} monsters defeated`, "note");
      }
    }
  });
}

// Turn in completed quest
export function turnInQuest(state, questId) {
  const player = state.player;
  const quest = QUEST_TEMPLATES[questId];
  
  if (!quest || !hasQuest(player, questId)) {
    return false;
  }
  
  // Check if quest objectives are met
  const progress = player.quests.progress[questId] || 0;
  if (progress < quest.targetCount) {
    state.log(`Quest not complete! (${progress}/${quest.targetCount})`, "note");
    return false;
  }
  
  // Give rewards
  if (quest.rewards.gold) {
    player.gold += quest.rewards.gold;
    state.log(`Received ${quest.rewards.gold} gold!`, "gold");
  }
  
  if (quest.rewards.xp) {
    player.xp += quest.rewards.xp;
    state.log(`Gained ${quest.rewards.xp} XP!`, "xp");
    
    // Check for level up
    if (player.xp >= player.xpNext) {
      levelUp(state);
    }
  }
  
  if (quest.rewards.item) {
    // Add item to inventory
    player.inventory.push({
      type: quest.rewards.item.type,
      item: { ...quest.rewards.item.item },
      id: generateItemId()
    });
    state.log(`Received ${quest.rewards.item.item.name}!`, "good");
  }
  
  // Show completion text
  state.log(`"${quest.completionText}"`, "note");
  
  // Move quest from active to completed
  const activeIndex = player.quests.active.indexOf(questId);
  if (activeIndex > -1) {
    player.quests.active.splice(activeIndex, 1);
  }
  
  // Add to completed (if not repeatable)
  if (!quest.isRepeatable && !player.quests.completed.includes(questId)) {
    player.quests.completed.push(questId);
  }
  
  // Reset progress for repeatable quests
  if (quest.isRepeatable) {
    player.quests.progress[questId] = 0;
  }
  
  return true;
}

// Get quest status for display
export function getQuestStatus(player, questId) {
  const quest = QUEST_TEMPLATES[questId];
  if (!quest) return null;
  
  const progress = player.quests.progress[questId] || 0;
  const isComplete = progress >= quest.targetCount;
  
  return {
    name: quest.name,
    objective: quest.objective,
    progress: progress,
    target: quest.targetCount,
    isComplete: isComplete,
    rewards: quest.rewards
  };
}

// Check if player has item for fetch quest
export function checkFetchQuestItem(player, fetchQuest) {
  return player.inventory.some(item => fetchQuest.targetItem.itemCheck(item));
}

// Turn in fetch quest
export function turnInFetchQuest(state, questId, vendor) {
  const player = state.player;
  const fetchQuest = player.quests.fetchQuests?.[questId];
  
  if (!fetchQuest) return false;
  
  // Check if this is the right vendor
  if (fetchQuest.vendorId !== vendor.id) {
    state.log("This isn't the vendor who gave you this quest!", "note");
    return false;
  }
  
  // Check if player has the item
  const itemIndex = player.inventory.findIndex(item => fetchQuest.targetItem.itemCheck(item));
  if (itemIndex === -1) {
    state.log(`You don't have ${fetchQuest.targetItem.name}!`, "note");
    return false;
  }
  
  // Remove the item from inventory
  const item = player.inventory[itemIndex];
  player.inventory.splice(itemIndex, 1);
  state.log(`You hand over ${item.item.name}.`, "note");
  
  // Give rewards
  if (fetchQuest.rewards.gold) {
    player.gold += fetchQuest.rewards.gold;
    state.log(`Received ${fetchQuest.rewards.gold} gold!`, "gold");
  }
  
  if (fetchQuest.rewards.xp) {
    player.xp += fetchQuest.rewards.xp;
    state.log(`Gained ${fetchQuest.rewards.xp} XP!`, "xp");
    
    // Check for level up
    if (player.xp >= player.xpNext) {
      levelUp(state);
    }
  }
  
  if (fetchQuest.rewards.item) {
    player.inventory.push({
      type: fetchQuest.rewards.item.type,
      item: { ...fetchQuest.rewards.item.item },
      id: generateItemId()
    });
    state.log(`Received ${fetchQuest.rewards.item.item.name}!`, "good");
  }
  
  // Show completion text
  state.log(`"${fetchQuest.completionText}"`, "note");
  
  // Remove quest from active
  const activeIndex = player.quests.active.indexOf(questId);
  if (activeIndex > -1) {
    player.quests.active.splice(activeIndex, 1);
  }
  
  // Mark as completed
  if (!player.quests.completed.includes(questId)) {
    player.quests.completed.push(questId);
  }
  
  // Remove from fetch quests
  delete player.quests.fetchQuests[questId];
  
  return true;
}

// Turn in fetch quest with specific item index
export function turnInFetchQuestWithItem(state, questId, vendor, itemIndex) {
  const player = state.player;
  const fetchQuest = player.quests.fetchQuests?.[questId];
  
  if (!fetchQuest) return false;
  
  // Check if this is the right vendor
  if (fetchQuest.vendorId !== vendor.id) {
    state.log("This isn't the vendor who gave you this quest!", "note");
    return false;
  }
  
  // Get the specific item
  const item = player.inventory[itemIndex];
  if (!item || !fetchQuest.targetItem.itemCheck(item)) {
    state.log(`That item doesn't match what the vendor needs!`, "note");
    return false;
  }
  
  // Check if item is equipped and unequip it first
  if (item.type === "weapon" && item.id === state.equippedWeaponId) {
    state.equippedWeaponId = null;
    state.player.weapon = null;
  } else if (item.type === "armor" && item.id === state.equippedArmorId) {
    state.equippedArmorId = null;
    state.player.armor = null;
  } else if (item.type === "headgear" && item.id === state.equippedHeadgearId) {
    state.equippedHeadgearId = null;
    state.player.headgear = null;
  }
  
  // Remove the item from inventory
  player.inventory.splice(itemIndex, 1);
  state.log(`You hand over ${item.item.name}.`, "note");
  
  // Give rewards
  if (fetchQuest.rewards.gold) {
    player.gold += fetchQuest.rewards.gold;
    state.log(`Received ${fetchQuest.rewards.gold} gold!`, "gold");
  }
  
  if (fetchQuest.rewards.xp) {
    player.xp += fetchQuest.rewards.xp;
    state.log(`Gained ${fetchQuest.rewards.xp} XP!`, "xp");
    
    // Check for level up
    if (player.xp >= player.xpNext) {
      levelUp(state);
    }
  }
  
  if (fetchQuest.rewards.item) {
    player.inventory.push({
      type: fetchQuest.rewards.item.type,
      item: { ...fetchQuest.rewards.item.item },
      id: generateItemId()
    });
    state.log(`Received ${fetchQuest.rewards.item.item.name}!`, "good");
  }
  
  // Show completion text
  state.log(`"${fetchQuest.completionText}"`, "note");
  
  // Remove quest from active
  const activeIndex = player.quests.active.indexOf(questId);
  if (activeIndex > -1) {
    player.quests.active.splice(activeIndex, 1);
  }
  
  // Mark as completed
  if (!player.quests.completed.includes(questId)) {
    player.quests.completed.push(questId);
  }
  
  // Remove from fetch quests
  delete player.quests.fetchQuests[questId];
  
  return true;
}

// Display active quests
export function displayActiveQuests(state) {
  const player = state.player;
  
  if (player.quests.active.length === 0) {
    state.log("No active quests", "dim");
    return;
  }
  
  state.log("=== ACTIVE QUESTS ===", "xp");
  player.quests.active.forEach(questId => {
    // Check if it's a fetch quest
    const fetchQuest = player.quests.fetchQuests?.[questId];
    if (fetchQuest) {
      const hasItem = checkFetchQuestItem(player, fetchQuest);
      const statusText = hasItem ? "COMPLETE - Return to vendor!" : "In Progress";
      state.log(`${fetchQuest.name}: ${statusText}`, hasItem ? "good" : "note");
      state.log(`  ${fetchQuest.objective}`, "dim");
      if (fetchQuest.vendorChunk) {
        state.log(`  Vendor location: (${fetchQuest.vendorChunk.x}, ${fetchQuest.vendorChunk.y})`, "dim");
      }
    } else {
      // Regular quest
      const status = getQuestStatus(player, questId);
      if (status) {
        const progressText = status.isComplete ? "COMPLETE - Turn in at vendor!" : 
                            `${status.progress}/${status.target}`;
        state.log(`${status.name}: ${progressText}`, status.isComplete ? "good" : "note");
        state.log(`  ${status.objective}`, "dim");
      }
    }
  });
}