// systems/shop.js - Shop business logic (no DOM, no UI)
// This module handles all shop transactions and state mutations
// It emits events that UI modules can listen to

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { saveChunk } from '../utils/persistence.js';

// Shop transaction events
export const ShopTransactionEvents = {
  PurchaseAttempt: 'shop:purchaseAttempt',
  PurchaseSuccess: 'shop:purchaseSuccess',
  PurchaseFailed: 'shop:purchaseFailed',
  SellAttempt: 'shop:sellAttempt',
  SellSuccess: 'shop:sellSuccess',
  SellFailed: 'shop:sellFailed',
  ShopClosed: 'shop:closed'
};

/**
 * Initialize a vendor for shopping
 * Sets up vendor ID and prepares vendor data
 */
export function initializeVendor(state, vendor) {
  // Ensure vendor has an ID
  if (!vendor.id) {
    vendor.id = `vendor_${state.worldSeed}_${vendor.x}_${vendor.y}`;
  }
  
  // Return vendor data (no mutations beyond ID)
  return {
    id: vendor.id,
    inventory: vendor.inventory || [],
    x: vendor.x,
    y: vendor.y,
    name: vendor.name || 'Vendor',
    fetchQuest: vendor.fetchQuest
  };
}

/**
 * Purchase an item from a vendor
 * Handles all business logic for buying
 * @returns {object} Result with success flag and details
 */
export function purchaseItem(state, vendorId, itemIndex) {
  const vendor = state.ui.shopVendor;
  
  // Validate vendor
  if (!vendor || vendor.id !== vendorId) {
    return { 
      success: false, 
      reason: 'Invalid vendor',
      message: 'Vendor not found!' 
    };
  }
  
  // Validate item
  const item = vendor.inventory[itemIndex];
  if (!item) {
    return { 
      success: false, 
      reason: 'Invalid item',
      message: 'Item not found!' 
    };
  }
  
  const price = item.price || 10;
  
  // Check gold
  if (state.player.gold < price) {
    emit(EventType.Log, { 
      message: "Not enough gold!", 
      style: 'bad' 
    });
    return { 
      success: false, 
      reason: 'Insufficient gold',
      message: 'Not enough gold!',
      required: price,
      available: state.player.gold 
    };
  }
  
  // Perform transaction
  state.player.gold -= price;
  
  // Add to inventory
  if (item.type === "potion") {
    addPotionToInventory(state, item.item);
  } else {
    state.player.inventory.push({
      type: item.type,
      item: { ...item.item },
      id: generateItemId()
    });
  }
  
  // Log success
  emit(EventType.Log, { 
    message: `Bought ${item.item.name} for ${price}g!`, 
    style: 'good' 
  });
  
  // Remove from vendor inventory
  vendor.inventory.splice(itemIndex, 1);
  
  // Update the vendor in the chunk items and save
  if (state.chunk && state.chunk.items) {
    const vendorIndex = state.chunk.items.findIndex(i => 
      i.type === "vendor" && i.x === vendor.x && i.y === vendor.y
    );
    
    if (vendorIndex >= 0) {
      // Update vendor inventory in chunk
      state.chunk.items[vendorIndex].inventory = vendor.inventory;
      // Save the chunk to persist the change
      saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
    }
  }
  
  // Update selected index if needed
  if (vendor.inventory.length === 0) {
    // Vendor is out of stock
    return {
      success: true,
      item: item.item,
      price: price,
      vendorEmpty: true,
      message: "The vendor is sold out!"
    };
  } else if (state.ui.shopSelectedIndex >= vendor.inventory.length) {
    state.ui.shopSelectedIndex = vendor.inventory.length - 1;
  }
  
  // Emit purchase success event
  emit(ShopTransactionEvents.PurchaseSuccess, {
    item: item.item,
    price: price,
    goldRemaining: state.player.gold
  });
  
  return {
    success: true,
    item: item.item,
    price: price,
    goldRemaining: state.player.gold
  };
}

/**
 * Sell an item to a vendor
 * Handles all business logic for selling
 * @returns {object} Result with success flag and details
 */
export function sellItem(state, itemIndex, forceConfirm = false) {
  const item = state.player.inventory[itemIndex];
  
  if (!item) {
    return { 
      success: false, 
      reason: 'Invalid item',
      message: 'Item not found!' 
    };
  }
  
  // Check if item is equipped
  const isEquipped = checkIfEquipped(state, item);
  
  // If equipped and not forcing, return confirmation needed
  if (isEquipped && !forceConfirm) {
    return {
      success: false,
      reason: 'Confirmation needed',
      needsConfirmation: true,
      item: item,
      isEquipped: true
    };
  }
  
  // Calculate sell price (50% of base price)
  const basePrice = item.item.price || item.price || 10;
  const sellPrice = Math.floor(basePrice * 0.5);
  
  // Unequip if necessary
  if (isEquipped) {
    unequipItem(state, item);
  }
  
  // Remove from inventory
  state.player.inventory.splice(itemIndex, 1);
  
  // Add gold
  state.player.gold += sellPrice;
  
  // Add item to vendor inventory (if vendor is present)
  if (state.ui.shopVendor) {
    // Create vendor inventory item with proper structure
    const vendorItem = {
      type: item.type,
      item: { ...(item.item || item) },
      price: basePrice  // Use full price for resale
    };
    
    // Initialize vendor inventory if it doesn't exist
    if (!state.ui.shopVendor.inventory) {
      state.ui.shopVendor.inventory = [];
    }
    
    // Add to vendor's inventory
    state.ui.shopVendor.inventory.push(vendorItem);
    
    // Update the vendor in the chunk items and save
    if (state.chunk && state.chunk.items) {
      const vendor = state.ui.shopVendor;
      const vendorIndex = state.chunk.items.findIndex(i => 
        i.type === "vendor" && i.x === vendor.x && i.y === vendor.y
      );
      
      if (vendorIndex >= 0) {
        // Update vendor inventory in chunk
        state.chunk.items[vendorIndex].inventory = vendor.inventory;
        // Save the chunk to persist the change
        saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
      }
    }
  }
  
  // Log success
  emit(EventType.Log, { 
    message: `Sold ${item.item.name || item.name} for ${sellPrice}g!`, 
    style: 'good' 
  });
  
  // Update selected index if needed
  if (state.ui.shopSelectedIndex >= state.player.inventory.length) {
    state.ui.shopSelectedIndex = Math.max(0, state.player.inventory.length - 1);
  }
  
  // Emit sell success event
  emit(ShopTransactionEvents.SellSuccess, {
    item: item.item || item,
    price: sellPrice,
    goldRemaining: state.player.gold,
    wasEquipped: isEquipped
  });
  
  return {
    success: true,
    item: item.item || item,
    price: sellPrice,
    goldRemaining: state.player.gold,
    wasEquipped: isEquipped
  };
}

/**
 * Open shop for a vendor
 * Sets up shop state
 */
export function openShop(state, vendor) {
  const vendorData = initializeVendor(state, vendor);
  
  // Set up shop state
  state.ui.shopOpen = true;
  state.ui.shopVendor = vendorData;
  state.ui.shopMode = 'buy';
  state.ui.shopSelectedIndex = 0;
  state.ui.confirmSell = false;
  state.ui.confirmChoice = 'no';
  
  return vendorData;
}

/**
 * Close the shop
 * Cleans up shop state
 */
export function closeShop(state) {
  // Clear shop state
  state.ui.shopOpen = false;
  state.ui.shopVendor = null;
  state.ui.shopMode = null;
  state.ui.shopSelectedIndex = 0;
  state.ui.confirmSell = false;
  state.ui.confirmChoice = 'no';
  
  // Emit close event
  emit(ShopTransactionEvents.ShopClosed);
}

/**
 * Switch shop mode (buy/sell/quest/turn-in)
 */
export function switchShopMode(state, newMode) {
  state.ui.shopMode = newMode;
  state.ui.shopSelectedIndex = 0;
  state.ui.confirmSell = false;
  state.ui.confirmChoice = 'no';
  // Reset quest turn-in index when switching modes
  if (newMode === 'turn-in') {
    state.ui.questTurnInIndex = 0;
  }
}

/**
 * Navigate shop selection
 */
export function navigateShop(state, direction) {
  if (state.ui.confirmSell) {
    // In confirmation dialog
    if (direction === 'left' || direction === 'right') {
      state.ui.confirmChoice = state.ui.confirmChoice === 'yes' ? 'no' : 'yes';
    }
    return;
  }
  
  // Get max index based on mode
  let maxIndex = 0;
  if (state.ui.shopMode === 'buy' && state.ui.shopVendor) {
    maxIndex = state.ui.shopVendor.inventory.length - 1;
  } else if (state.ui.shopMode === 'sell') {
    const sellableItems = getSellableItems(state);
    maxIndex = sellableItems.length - 1;
  }
  
  // Update selection
  if (direction === 'up') {
    state.ui.shopSelectedIndex = Math.max(0, state.ui.shopSelectedIndex - 1);
  } else if (direction === 'down') {
    state.ui.shopSelectedIndex = Math.min(maxIndex, state.ui.shopSelectedIndex + 1);
  }
}

/**
 * Handle sell confirmation
 */
export function handleSellConfirmation(state, confirm) {
  if (!state.ui.confirmSell) return;
  
  if (confirm && state.ui.confirmChoice === 'yes') {
    // Proceed with sale
    const result = sellItem(state, state.ui.shopSelectedIndex, true);
    state.ui.confirmSell = false;
    state.ui.confirmChoice = 'no';
    return result;
  } else {
    // Cancel
    state.ui.confirmSell = false;
    state.ui.confirmChoice = 'no';
    return { success: false, cancelled: true };
  }
}

// Helper functions

function checkIfEquipped(state, item) {
  if (item.type === 'weapon' && item.id === state.equippedWeaponId) return true;
  if (item.type === 'armor' && item.id === state.equippedArmorId) return true;
  if (item.type === 'headgear' && item.id === state.equippedHeadgearId) return true;
  if (item.type === 'ring') {
    return state.equippedRingIds && 
      (item.id === state.equippedRingIds[0] || item.id === state.equippedRingIds[1]);
  }
  return false;
}

function unequipItem(state, item) {
  if (item.type === 'weapon') state.equippedWeaponId = null;
  if (item.type === 'armor') state.equippedArmorId = null;
  if (item.type === 'headgear') state.equippedHeadgearId = null;
  if (item.type === 'ring' && state.equippedRingIds) {
    if (item.id === state.equippedRingIds[0]) state.equippedRingIds[0] = null;
    if (item.id === state.equippedRingIds[1]) state.equippedRingIds[1] = null;
  }
}

function getSellableItems(state) {
  return state.player.inventory.filter(item => 
    item.type === 'weapon' || 
    item.type === 'armor' || 
    item.type === 'headgear' || 
    item.type === 'ring' ||
    item.type === 'potion'
  );
}

let nextItemId = 1;
function generateItemId() {
  return `item_${Date.now()}_${nextItemId++}`;
}

function addPotionToInventory(state, potion) {
  // Check if we already have this potion type
  const existingPotion = state.player.inventory.find(
    i => i.type === 'potion' && i.item.name === potion.name
  );
  
  if (existingPotion) {
    // Increment quantity
    existingPotion.item.quantity = (existingPotion.item.quantity || 1) + 1;
  } else {
    // Add new potion
    state.player.inventory.push({
      id: generateItemId(),
      type: 'potion',
      item: { ...potion, quantity: 1 }
    });
  }
  
  state.player.potionCount++;
}