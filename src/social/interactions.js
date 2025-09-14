/**
 * InteractionSystem - Handles all NPC interactions in the NEW social system
 * Replaces the interaction logic from migrationAdapter
 */

import { NPC } from './npcEnhanced.js';

/**
 * Get available interactions between player and NPC
 * @param {Object} player - The player object
 * @param {Object} npc - The NPC object (can be OLD or NEW format)
 * @returns {Array} Array of available interaction options
 */
export function getAvailableInteractions(player, npc) {
  // Ensure player has required properties
  if (!player.factions && !player.faction) {
    player.factions = ['player'];
  }
  
  // Convert OLD format NPC if needed
  if (NPC.isOldFormat(npc)) {
    npc = NPC.fromOldFormat(npc);
  }
  
  const options = [];
  
  // Basic talk option (always available)
  options.push({
    type: 'talk',
    label: 'Talk',
    description: `Talk to ${npc.name || 'NPC'}`
  });
  
  // Trade option for merchants
  if (npc.shopkeeper || npc.faction === 'merchants') {
    options.push({
      type: 'trade',
      label: 'Trade',
      description: `Trade with ${npc.name || 'Merchant'}`
    });
  }
  
  // Quest option for quest givers
  if (npc.questGiver && npc.quests?.length > 0) {
    options.push({
      type: 'quest',
      label: 'Quest',
      description: 'Ask about quests'
    });
  }
  
  // Gift option if player has items
  if (player.inventory?.length > 0) {
    options.push({
      type: 'gift',
      label: 'Give Gift',
      description: 'Offer a gift'
    });
  }
  
  // Fight option for hostile NPCs
  const hostilityResult = npc.evaluateHostilityTo ? 
    npc.evaluateHostilityTo(player) : 
    { hostile: npc.attitude === 'hostile' };
    
  if (hostilityResult.hostile || npc.attitude === 'hostile') {
    options.push({
      type: 'fight',
      label: 'Fight',
      description: 'Attack the NPC'
    });
  }
  
  // Pickpocket option (if player has thief skills)
  if (player.skills?.includes('pickpocket') || player.class === 'thief') {
    options.push({
      type: 'pickpocket',
      label: 'Pickpocket',
      description: 'Attempt to steal'
    });
  }
  
  return options;
}

/**
 * Run an interaction between player and NPC
 * @param {Object} state - Game state
 * @param {Object} player - The player object  
 * @param {Object} npc - The NPC object
 * @param {string} actionType - Type of interaction
 * @param {Object} params - Additional parameters
 * @returns {Object} Result of the interaction
 */
export function runInteraction(state, player, npc, actionType, params = {}) {
  // Convert OLD format NPC if needed
  if (NPC.isOldFormat(npc)) {
    npc = NPC.fromOldFormat(npc);
  }
  
  // Ensure player has faction
  if (!player.factions && !player.faction) {
    player.factions = ['player'];
  }
  
  switch (actionType) {
    case 'talk':
      return handleTalk(state, player, npc);
    
    case 'trade':
      return handleTrade(state, player, npc);
    
    case 'quest':
      return handleQuest(state, player, npc);
    
    case 'gift':
      return handleGift(state, player, npc, params.item);
    
    case 'fight':
      return handleFight(state, player, npc);
    
    case 'pickpocket':
      return handlePickpocket(state, player, npc);
    
    default:
      return {
        success: false,
        reason: 'unknown_action',
        message: `Unknown action: ${actionType}`
      };
  }
}

/**
 * Handle talk interaction
 */
export function handleTalk(state, player, npc) {
  // Increase familiarity
  if (npc.memory) {
    npc.memory.remember({
      type: 'conversation',
      target: player.id || 'player',
      turn: state?.turn || 0
    });
    
    // Slightly improve relationship
    npc.memory.updateRelationship(player.id || 'player', 1);
  }
  
  return {
    success: true,
    message: `You talk with ${npc.name || 'the NPC'}.`,
    dialogue: npc.dialogue || true
  };
}

/**
 * Handle trade interaction
 */
export function handleTrade(state, player, npc) {
  if (!npc.shopkeeper && npc.faction !== 'merchants') {
    return {
      success: false,
      reason: 'not_merchant',
      message: `${npc.name || 'This NPC'} is not a merchant.`
    };
  }
  
  return {
    success: true,
    message: `Opening trade with ${npc.name || 'the merchant'}.`,
    goods: npc.goods || [],
    shopOpen: true
  };
}

/**
 * Handle quest interaction
 */
export function handleQuest(state, player, npc) {
  if (!npc.questGiver) {
    return {
      success: false,
      reason: 'not_quest_giver',
      message: `${npc.name || 'This NPC'} has no quests to offer.`
    };
  }
  
  return {
    success: true,
    message: 'Quest dialogue initiated.',
    quests: npc.quests || []
  };
}

/**
 * Handle gift interaction
 */
export function handleGift(state, player, npc, item) {
  if (!item) {
    return {
      success: false,
      reason: 'no_item',
      message: 'No item selected to gift.'
    };
  }
  
  // Remember the gift
  if (npc.memory) {
    npc.memory.remember({
      type: 'received_gift',
      item: item.id || item.name,
      from: player.id || 'player',
      turn: state?.turn || 0
    });
    
    // Improve relationship based on gift value
    const relationshipBonus = Math.min(10, item.value || 5);
    npc.memory.updateRelationship(player.id || 'player', relationshipBonus);
  }
  
  // Remove item from player inventory
  if (player.inventory) {
    const index = player.inventory.findIndex(i => 
      i.id === item.id || i === item
    );
    if (index >= 0) {
      player.inventory.splice(index, 1);
    }
  }
  
  return {
    success: true,
    message: `You give ${item.name || 'the item'} to ${npc.name || 'the NPC'}.`,
    relationshipChange: item.value || 5
  };
}

/**
 * Handle fight interaction
 */
export function handleFight(state, player, npc) {
  // Check if NPC is actually hostile
  const hostilityResult = npc.evaluateHostilityTo?.(player) || 
    { hostile: npc.attitude === 'hostile' };
  
  if (!hostilityResult.hostile && npc.attitude !== 'hostile') {
    return {
      success: false,
      reason: 'not_hostile',
      message: `${npc.name || 'This NPC'} is not hostile.`
    };
  }
  
  // Remember the attack
  if (npc.memory) {
    npc.memory.remember({
      type: 'attacked_by',
      attacker: player.id || 'player',
      turn: state?.turn || 0
    });
    
    // Severely damage relationship
    npc.memory.updateRelationship(player.id || 'player', -20);
    
    // Add a grudge
    npc.memory.addGrudge(player.id || 'player', 'attacked_me');
  }
  
  return {
    success: true,
    message: `You attack ${npc.name || 'the NPC'}!`,
    startsCombat: true
  };
}

/**
 * Handle pickpocket interaction
 */
export function handlePickpocket(state, player, npc) {
  if (!player.skills?.includes('pickpocket') && player.class !== 'thief') {
    return {
      success: false,
      reason: 'no_skill',
      message: 'You lack the skill to pickpocket.'
    };
  }
  
  // Check if NPC has items
  if (!npc.inventory || npc.inventory.length === 0) {
    return {
      success: false,
      reason: 'no_items',
      message: `${npc.name || 'This NPC'} has nothing to steal.`
    };
  }
  
  // Skill check (simplified)
  const successChance = 0.5; // 50% base chance
  const roll = Math.random();
  
  if (roll < successChance) {
    // Success - steal random item
    const stolenIndex = Math.floor(Math.random() * npc.inventory.length);
    const stolenItem = npc.inventory[stolenIndex];
    
    // Transfer item
    npc.inventory.splice(stolenIndex, 1);
    if (!player.inventory) player.inventory = [];
    player.inventory.push(stolenItem);
    
    return {
      success: true,
      message: `You successfully steal ${stolenItem.name || 'an item'}!`,
      item: stolenItem
    };
  } else {
    // Failure - NPC notices
    if (npc.memory) {
      npc.memory.remember({
        type: 'pickpocket_attempt',
        thief: player.id || 'player',
        turn: state?.turn || 0
      });
      
      npc.memory.updateRelationship(player.id || 'player', -10);
      npc.memory.addGrudge(player.id || 'player', 'tried_to_steal');
    }
    
    return {
      success: false,
      reason: 'caught',
      message: `${npc.name || 'The NPC'} catches you trying to steal!`,
      caught: true
    };
  }
}

// Export all functions for convenience
export default {
  getAvailableInteractions,
  runInteraction,
  handleTalk,
  handleTrade,
  handleQuest,
  handleGift,
  handleFight,
  handlePickpocket
};