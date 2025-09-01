// systems/vendorQuests.js - Vendor quest business logic
// Handles quest generation, acceptance, and turn-in

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { FETCH_ITEMS, POTIONS } from '../core/config.js';
import { saveChunk } from '../utils/persistence.js';
import { hasQuest, giveQuest } from './quests.js';

// Quest events
export const VendorQuestEvents = {
  QuestOffered: 'vendorQuest:offered',
  QuestAccepted: 'vendorQuest:accepted',
  QuestCompleted: 'vendorQuest:completed',
  QuestCancelled: 'vendorQuest:cancelled'
};

/**
 * Initialize vendor with a fetch quest if they don't have one
 */
export function initializeVendorQuest(state, vendor) {
  // Ensure vendor has an ID
  if (!vendor.id) {
    vendor.id = `vendor_${state.worldSeed}_${vendor.x}_${vendor.y}`;
  }
  
  // Generate fetch quest if vendor doesn't have one
  if (!vendor.fetchQuest) {
    const items = FETCH_ITEMS;
    const randomItem = items[Math.floor(Math.random() * items.length)];
    
    vendor.fetchQuest = {
      id: `fetch_${vendor.id}`,
      name: "Vendor's Request",
      description: `I need ${randomItem.name}. Can you help me?`,
      objective: `Bring ${randomItem.name} to this vendor`,
      targetItem: randomItem,
      vendorId: vendor.id,
      vendorChunk: { x: state.cx, y: state.cy },
      rewards: {
        gold: 40 + Math.floor(Math.random() * 60),
        xp: 20 + Math.floor(Math.random() * 30),
        item: Math.random() < 0.5 ? { type: "potion", item: POTIONS[Math.floor(Math.random() * POTIONS.length)] } : null
      },
      completionText: "Perfect! This is exactly what I needed. Thank you!",
      isRepeatable: false
    };
    
    // Save the updated chunk data
    state.chunk.items = state.chunk.items || [];
    const vendorIndex = state.chunk.items.findIndex(i => i.type === "vendor" && i.x === vendor.x && i.y === vendor.y);
    if (vendorIndex >= 0) {
      state.chunk.items[vendorIndex] = vendor;
      saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
    }
  }
  
  return vendor.fetchQuest;
}

/**
 * Check if vendor has a quest to offer
 */
export function hasQuestToOffer(state, vendor) {
  if (!vendor || !vendor.fetchQuest) return false;
  
  return !hasQuest(state.player, vendor.fetchQuest.id) && 
         !state.player.quests.completed.includes(vendor.fetchQuest.id);
}

/**
 * Accept a quest from vendor
 */
export function acceptVendorQuest(state, vendor) {
  if (!vendor || !vendor.fetchQuest) {
    return { 
      success: false, 
      reason: 'No quest available',
      message: 'This vendor has no quest to offer.' 
    };
  }
  
  const quest = vendor.fetchQuest;
  
  // Check if already has quest
  if (hasQuest(state.player, quest.id)) {
    return { 
      success: false, 
      reason: 'Already have quest',
      message: 'You already have this quest!' 
    };
  }
  
  // Check if already completed
  if (state.player.quests.completed.includes(quest.id)) {
    return { 
      success: false, 
      reason: 'Already completed',
      message: 'You have already completed this quest!' 
    };
  }
  
  // Give quest to player
  const questAccepted = giveQuest(state, quest.id, quest);
  
  if (questAccepted) {
    emit(EventType.Log, { 
      message: `Quest accepted: ${quest.name}`, 
      style: 'good' 
    });
    
    emit(VendorQuestEvents.QuestAccepted, {
      quest: quest,
      vendor: vendor
    });
    
    return {
      success: true,
      quest: quest,
      message: `Quest accepted: ${quest.name}`
    };
  } else {
    return {
      success: false,
      reason: 'Failed to accept',
      message: 'Could not accept quest.'
    };
  }
}

/**
 * Get quest details for display
 */
export function getQuestDisplay(quest) {
  if (!quest) return null;
  
  return {
    name: quest.name,
    description: quest.description,
    objective: quest.objective,
    rewards: {
      gold: quest.rewards.gold,
      xp: quest.rewards.xp,
      item: quest.rewards.item ? quest.rewards.item.item.name : null
    }
  };
}