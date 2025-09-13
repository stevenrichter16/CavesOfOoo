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
  console.log('🛍️ initializeVendor called with vendor:', {
    id: vendor.id,
    name: vendor.name,
    goods: vendor.goods,
    shopkeeper: vendor.shopkeeper,
    hasInventory: !!vendor.inventory,
    inventoryLength: vendor.inventory?.length
  });
  
  // Ensure vendor has an ID
  if (!vendor.id) {
    vendor.id = `vendor_${state.worldSeed}_${vendor.x}_${vendor.y}`;
    console.log('🆔 Generated vendor ID:', vendor.id);
  }
  
  // Generate inventory based on goods type if not present or empty
  if (!vendor.inventory || vendor.inventory.length === 0) {
    console.log('📦 No/empty inventory found, generating for goods type:', vendor.goods);
    vendor.inventory = generateVendorInventory(vendor);
    console.log('✅ Generated inventory:', vendor.inventory);
  } else {
    console.log('📦 Vendor already has inventory:', vendor.inventory);
  }
  
  // Return vendor data (no mutations beyond ID)
  const vendorData = {
    id: vendor.id,
    inventory: vendor.inventory || [],
    x: vendor.x,
    y: vendor.y,
    name: vendor.name || 'Vendor',
    fetchQuest: vendor.fetchQuest,
    goods: vendor.goods
  };
  
  console.log('🎯 Returning vendor data:', {
    id: vendorData.id,
    name: vendorData.name,
    goods: vendorData.goods,
    inventoryCount: vendorData.inventory.length,
    inventory: vendorData.inventory
  });
  
  return vendorData;
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
      text: "Not enough gold!", 
      cls: 'bad' 
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
  
  // Add to inventory - check if it's a quest item first
  if (item.item && typeof item.item === 'string') {
    // This is a quest item ID, use the proper granting function
    import('../items/questItems.js').then(module => {
      module.grantQuestItem(state, item.item, 1);
    }).catch(err => {
      // Fallback to old method
      console.warn('Failed to import questItems:', err);
      state.player.inventory.push({
        type: item.type || 'item',
        item: { 
          id: item.item,
          name: item.item.replace(/_/g, ' '),
          value: item.price || 10
        },
        id: generateItemId()
      });
    });
  } else if (item.type === "potion") {
    addPotionToInventory(state, item.item);
  } else {
    // Regular vendor items with full item objects
    state.player.inventory.push({
      type: item.type,
      item: { ...item.item },
      id: generateItemId()
    });
  }
  
  // Log success
  const itemName = typeof item.item === 'string' 
    ? item.item.replace(/_/g, ' ') 
    : item.item.name;
  emit(EventType.Log, { 
    text: `Bought ${itemName} for ${price}g!`, 
    cls: 'good' 
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
    text: `Sold ${item.item.name || item.name} for ${sellPrice}g!`, 
    cls: 'good' 
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
  console.log('🏪 openShop called with vendor:', {
    id: vendor?.id,
    name: vendor?.name,
    goods: vendor?.goods,
    shopkeeper: vendor?.shopkeeper
  });
  
  const vendorData = initializeVendor(state, vendor);
  
  console.log('🎪 Setting up shop state with vendor data:', {
    vendorName: vendorData.name,
    inventoryCount: vendorData.inventory?.length,
    shopMode: 'buy'
  });
  
  // Set up shop state
  state.ui.shopOpen = true;
  state.ui.shopVendor = vendorData;
  state.ui.shopMode = 'buy';
  state.ui.shopSelectedIndex = 0;
  state.ui.confirmSell = false;
  state.ui.confirmChoice = 'no';
  
  console.log('✅ Shop state after setup:', {
    shopOpen: state.ui.shopOpen,
    vendorName: state.ui.shopVendor?.name,
    inventoryCount: state.ui.shopVendor?.inventory?.length,
    shopMode: state.ui.shopMode
  });
  
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

/**
 * Generate vendor inventory based on goods type
 */
function generateVendorInventory(vendor) {
  console.log('🏭 generateVendorInventory called for:', {
    vendorId: vendor.id,
    vendorName: vendor.name,
    goods: vendor.goods
  });
  
  const inventories = [];
  
  // Special handling for pharmacy
  if (vendor.goods === 'medicine' || vendor.id === 'pharmacist_ann') {
    console.log('💊 Generating pharmacy inventory');
    // Import pharmacy items and convert to vendor format
    return [
      { type: 'potion', item: { name: 'Sugar Pills', desc: "Basic candy medicine. They say it's just placebo, but it works!", heal: 5, effect: 'heal', value: 5 }, price: 5 },
      { type: 'potion', item: { name: 'Candy Medicine', desc: 'Proper medicinal candy. Tastes like cherry.', heal: 20, effect: 'heal', value: 20 }, price: 20 },
      { type: 'potion', item: { name: 'Strength Syrup', desc: 'Makes your muscles feel like rock candy.', buff: 'str', effect: 'buff_str', value: 50, turns: 5 }, price: 30 },
      { type: 'potion', item: { name: 'Defense Drops', desc: 'Peppermint drops that harden your candy coating.', buff: 'def', effect: 'buff_def', value: 30, turns: 5 }, price: 30 },
      { type: 'potion', item: { name: 'Speed Soda', desc: 'Fizzy cola that makes you jittery and fast.', buff: 'spd', heal: 5, effect: 'buff_spd', value: 35, turns: 5 }, price: 35 },
      { type: 'potion', item: { name: 'Pain Pops', desc: 'Numbing lollipops that reduce incoming damage.', damageReduction: true, heal: 10, effect: 'heal', value: 10 }, price: 40 },
      { type: 'potion', item: { name: 'Max Health Mints', desc: 'Rare mints that permanently increase your vitality!', maxHpBoost: 10, effect: 'max_hp', value: 10 }, price: 100 },
      { type: 'potion', item: { name: 'Energy Elixir', desc: 'Premium elixir. Fully restores health and grants regeneration.', fullRestore: true, effect: 'max_heal' }, price: 200 }
    ];
  }
  
  // Default inventories for other goods types
  const defaultInventories = {
    candy_corn: [
      { type: 'potion', item: { name: 'Candy Corn', desc: 'Classic triangular candy. Tastes like autumn.', heal: 5 }, price: 5 },
      { type: 'potion', item: { name: 'Candy Corn Bag', desc: 'A whole bag of candy corn! Perfect for sharing (or not).', heal: 20 }, price: 20 }
    ],
    lollipops: [
      { type: 'potion', item: { name: 'Small Lollipop', desc: 'A tiny sweet treat on a stick.', heal: 3 }, price: 3 },
      { type: 'potion', item: { name: 'Giant Lollipop', desc: 'A massive swirled lollipop that takes forever to finish.', heal: 15 }, price: 15 },
      { type: 'potion', item: { name: 'Rainbow Lollipop', desc: 'All the colors make you feel speedy!', heal: 25, buff: 'spd' }, price: 25 }
    ],
    chocolate: [
      { type: 'potion', item: { name: 'Chocolate Bar', desc: 'Smooth milk chocolate that melts in your mouth.', heal: 8 }, price: 8 },
      { type: 'potion', item: { name: 'Dark Chocolate', desc: 'Bitter chocolate that toughens your resolve.', heal: 10, buff: 'def' }, price: 12 }
    ],
    pizza: [
      { type: 'potion', item: { name: 'Pizza Slice', desc: 'A perfect triangle of cheesy goodness.', heal: 10 }, price: 10 },
      { type: 'potion', item: { name: 'Whole Pizza', desc: 'An entire pizza! Eight slices of heaven.', heal: 50 }, price: 50 },
      { type: 'potion', item: { name: 'Garlic Knots', desc: 'Twisted bread with garlic butter.', heal: 5 }, price: 5 }
    ],
    brooms: [
      { type: 'weapon', item: { name: 'Basic Broom', desc: 'A simple sweeping broom that doubles as a weapon.', dmg: 2 }, price: 20 },
      { type: 'weapon', item: { name: 'Quality Broom', desc: 'Well-crafted bristles perfect for sweeping foes.', dmg: 3 }, price: 50 },
      { type: 'weapon', item: { name: 'Magic Broom', desc: 'Enchanted broom that sparkles with power.', dmg: 5 }, price: 100 }
    ],
    royal_tarts: [
      { type: 'potion', item: { name: 'Royal Tart', desc: 'A fancy pastry fit for royalty.', heal: 30 }, price: 30 },
      { type: 'potion', item: { name: 'Mini Tart', desc: 'A bite-sized version of the royal favorite.', heal: 10 }, price: 10 },
      { type: 'potion', item: { name: 'Tart Sampler', desc: 'A variety pack of different tart flavors.', heal: 40 }, price: 50 }
    ],
    miscellaneous: [
      { type: 'item', item: { name: 'Mystery Box', desc: "Who knows what's inside? Could be anything!" }, price: 25 },
      { type: 'item', item: { name: 'Shiny Trinket', desc: 'A sparkly bauble that catches the light.', sellValue: 10 }, price: 15 },
      { type: 'item', item: { name: 'Golden Medallion', desc: 'An ornate golden disc with mysterious symbols.', sellValue: 75 }, price: 100 }
    ]
  };
  
  // Return inventory based on goods type or default
  const goods = vendor.goods || 'miscellaneous';
  const selectedInventory = defaultInventories[goods] || defaultInventories.miscellaneous;
  
  console.log('📋 Selected inventory for goods type:', goods);
  console.log('📦 Inventory items:', selectedInventory);
  console.log('📊 Item count:', selectedInventory.length);
  
  return selectedInventory;
}