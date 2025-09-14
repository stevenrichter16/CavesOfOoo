// src/js/social/shoppingDistrictActions.js
// Actions for Shopping District NPC interactions

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { RelationshipSystem } from './relationship.js';
// Note: propagateReputation was removed - behavior.js is part of OLD system

/**
 * Shopping District dialogue actions
 * These are triggered from dialogue choices with action properties
 */
export const ShoppingDistrictActions = {
  // Open shop interface for merchant NPCs
  openShop: (context) => {
    const { state, npc, player } = context;
    
    console.log('🛍️ ShoppingDistrictActions.openShop called:', {
      npcId: npc?.id,
      npcName: npc?.name,
      npcGoods: npc?.goods,
      shopkeeper: npc?.shopkeeper,
      hasOpenVendorShop: !!state.openVendorShop
    });
    
    // Check if NPC is a shopkeeper
    if (!npc.shopkeeper && !npc.goods) {
      console.log('⚠️ NPC is not a shopkeeper:', npc.name);
      emit(EventType.Log, { 
        text: `${npc.name} doesn't have anything to sell.`, 
        cls: 'note' 
      });
      return { success: false };
    }
    
    // Open vendor shop UI if available
    if (state.openVendorShop) {
      console.log('✅ Calling state.openVendorShop from ShoppingDistrictActions...');
      // Pass NPC directly - openVendorShop will handle inventory generation
      state.openVendorShop(state, npc);
      return { success: true, closesDialogue: true };
    }
    
    emit(EventType.Log, { 
      text: `${npc.name} shows you their wares.`, 
      cls: 'note' 
    });
    return { success: true };
  },
  
  // Buy specific item from NPC
  buyItem: (context, itemId) => {
    const { state, npc, player } = context;
    const item = getItemData(itemId);
    
    if (!item) {
      emit(EventType.Log, { 
        text: `That item doesn't exist.`, 
        cls: 'error' 
      });
      return { success: false };
    }
    
    // Check gold
    const cost = item.cost || 10;
    if ((player.gold || 0) < cost) {
      emit(EventType.Log, { 
        text: `You don't have enough gold (need ${cost}).`, 
        cls: 'error' 
      });
      return { success: false };
    }
    
    // Deduct gold and give item
    player.gold -= cost;
    addItemToInventory(state, player, item);
    
    emit(EventType.Log, { 
      text: `You bought ${item.name} for ${cost} gold.`, 
      cls: 'good' 
    });
    
    // Improve relationship slightly
    RelationshipSystem.modifyRelation(player, npc, 5, 'transaction');
    
    return { 
      success: true, 
      nextNode: 'greeting' // Return to greeting
    };
  },
  
  // Receive free item from NPC (like Starchy's screaming turnip)
  receiveItem: (context, itemId) => {
    const { state, npc, player } = context;
    const item = getItemData(itemId);
    
    if (!item) {
      return { success: false };
    }
    
    addItemToInventory(state, player, item);
    
    emit(EventType.Log, { 
      text: `${npc.name} gives you ${item.name}.`, 
      cls: 'good' 
    });
    
    // Improve relationship
    RelationshipSystem.modifyRelation(player, npc, 10, 'gift_received');
    
    return { success: true };
  },
  
  // Check if player has enough gold
  hasGold: (context, amount) => {
    const { player } = context;
    return (player.gold || 0) >= parseInt(amount);
  },
  
  // End dialogue
  end: (context) => {
    return { success: true, closesDialogue: true };
  }
};

/**
 * Generate shop inventory based on NPC type
 * @deprecated This function is no longer used - inventory generation happens in shop.js
 */
function generateShopInventory_DEPRECATED(npc) {
  // Special handling for pharmacy
  if (npc.goods === 'medicine' || npc.id === 'pharmacist_ann') {
    // Dynamically import pharmacy items
    const pharmacyItems = [
      { name: 'Sugar Pills', cost: 5, type: 'potion', heal: 5, 
        description: 'Basic candy medicine. They say it\'s just placebo, but it works!' },
      { name: 'Candy Medicine', cost: 20, type: 'potion', heal: 20,
        description: 'Proper medicinal candy. Tastes like cherry.' },
      { name: 'Strength Syrup', cost: 30, type: 'potion', 
        description: 'Makes your muscles feel like rock candy.' },
      { name: 'Defense Drops', cost: 30, type: 'potion',
        description: 'Peppermint drops that harden your candy coating.' },
      { name: 'Speed Soda', cost: 35, type: 'potion',
        description: 'Fizzy cola that makes you jittery and fast.' },
      { name: 'Pain Pops', cost: 40, type: 'potion',
        description: 'Numbing lollipops that reduce incoming damage.' },
      { name: 'Max Health Mints', cost: 100, type: 'potion',
        description: 'Rare mints that permanently increase your vitality!' },
      { name: 'Energy Elixir', cost: 200, type: 'potion',
        description: 'Premium elixir. Fully restores health and grants regeneration.' }
    ];
    
    // Add pharmacy-specific item handler
    pharmacyItems.forEach(item => {
      item.isPharmacyItem = true;
      item.onUse = (state, player) => {
        // Import and use pharmacy item effects
        import('../items/pharmacyItems.js').then(module => {
          const pharmacyItem = module.PharmacyItems[item.id || item.name.toLowerCase().replace(/\s+/g, '_')];
          if (pharmacyItem) {
            module.applyPharmacyItemEffect(state, player, pharmacyItem);
          }
        });
      };
    });
    
    return pharmacyItems;
  }
  
  const inventories = {
    candy_corn: [
      { name: 'Candy Corn', cost: 5, heal: 5 },
      { name: 'Candy Corn Bag', cost: 20, heal: 20 }
    ],
    lollipops: [
      { name: 'Small Lollipop', cost: 3, heal: 3 },
      { name: 'Giant Lollipop', cost: 15, heal: 15 },
      { name: 'Rainbow Lollipop', cost: 25, heal: 25, buff: 'speed' }
    ],
    chocolate: [
      { name: 'Chocolate Bar', cost: 8, heal: 8 },
      { name: 'Dark Chocolate', cost: 12, heal: 10, buff: 'defense' }
    ],
    pizza: [
      { name: 'Pizza Slice', cost: 10, heal: 10 },
      { name: 'Whole Pizza', cost: 50, heal: 50 },
      { name: 'Garlic Knots', cost: 5, heal: 5 }
    ],
    brooms: [
      { name: 'Basic Broom', cost: 20, type: 'weapon', dmg: 2 },
      { name: 'Quality Broom', cost: 50, type: 'weapon', dmg: 3 },
      { name: 'Magic Broom', cost: 100, type: 'weapon', dmg: 5 }
    ],
    miscellaneous: [
      { name: 'Mystery Box', cost: 25, type: 'consumable' },
      { name: 'Shiny Trinket', cost: 15, type: 'treasure' },
      { name: 'Golden Medallion', cost: 100, type: 'treasure' }
    ],
    royal_tarts: [
      { name: 'Royal Tart', cost: 30, heal: 30 },
      { name: 'Mini Tart', cost: 10, heal: 10 },
      { name: 'Tart Sampler', cost: 50, heal: 40 }
    ]
  };
  
  // Get inventory based on goods type or default
  const goods = npc.goods || 'miscellaneous';
  return inventories[goods] || inventories.miscellaneous;
}

/**
 * Get item data by ID
 */
function getItemData(itemId) {
  const items = {
    candy_apple: { name: 'Candy Apple', cost: 10, heal: 10, type: 'food' },
    pizza: { name: 'Pizza Slice', cost: 10, heal: 10, type: 'food' },
    garlic_knots: { name: 'Garlic Knots', cost: 5, heal: 5, type: 'food' },
    golden_medallion: { name: 'Golden Medallion', cost: 100, type: 'treasure' },
    magic_wheel: { name: 'Magic Wheel', cost: 50, type: 'special', effect: 'random' },
    crystal_ball: { name: 'Crystal Ball', cost: 75, type: 'special', effect: 'fortune' },
    screaming_turnip: { name: 'Screaming Turnip', cost: 0, type: 'special', description: 'It screams when cut!' }
  };
  
  return items[itemId];
}

/**
 * Add item to player inventory
 */
function addItemToInventory(state, player, item) {
  if (!player.inventory) {
    player.inventory = [];
  }
  
  // Check if item is stackable (food/potions)
  if (item.type === 'food' || item.type === 'potion') {
    const existing = player.inventory.find(i => i.name === item.name);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      return;
    }
  }
  
  // Add new item
  player.inventory.push({
    ...item,
    id: `item_${Date.now()}_${Math.random()}`,
    count: 1
  });
  
  // Update state counters if needed
  if (item.type === 'potion') {
    player.potionCount = (player.potionCount || 0) + 1;
  }
}

// Export for dialogue system to use
export function registerShoppingDistrictActions() {
  // Make actions available to dialogue system
  if (typeof window !== 'undefined') {
    window.ShoppingDistrictActions = ShoppingDistrictActions;
  }
  
  console.log('🛍️ Shopping District actions registered');
}