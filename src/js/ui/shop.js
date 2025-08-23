// ui/shop.js - Shop UI module
import { on, emit } from '../events.js';
import { EventType } from '../eventTypes.js';
import { esc } from '../utils.js';
import { WEAPONS, ARMORS, HEADGEAR, POTIONS, FETCH_ITEMS, QUEST_TEMPLATES } from '../config.js';
import { checkFetchQuestItem } from '../quests.js';

// Shop state
let shopState = {
  isOpen: false,
  vendor: null,
  selectedIndex: 0,
  mode: 'buy', // 'buy', 'sell', 'quest'
  confirmSell: false,
  confirmChoice: 'no'
};

// Event types for shop
export const ShopEvents = {
  OpenShop: 'openShop',
  CloseShop: 'closeShop',
  BuyItem: 'buyItem',
  SellItem: 'sellItem',
  NavigateShop: 'navigateShop'
};

/**
 * Initialize shop UI and event listeners
 */
export function initShopUI() {
  // Listen for shop events
  on(ShopEvents.OpenShop, ({ vendor, state }) => {
    openShop(vendor, state);
  });
  
  on(ShopEvents.CloseShop, () => {
    closeShop();
  });
  
  // Buy/Sell are handled in game.js, not here
  
  on(ShopEvents.NavigateShop, ({ direction, state }) => {
    navigateShop(direction, state);
  });
}

/**
 * Open the shop UI
 */
export function openShop(vendor, state) {
  
  // Normal shop (quest checking is now done in game.js)
  shopState.isOpen = true;
  shopState.vendor = vendor;
  shopState.selectedIndex = 0;
  shopState.mode = 'buy';
  shopState.confirmSell = false;
  shopState.confirmChoice = 'no';
  
  // Set the state flags
  state.ui.shopOpen = true;
  state.ui.shopVendor = vendor;
  state.ui.shopSelectedIndex = 0;
  state.ui.shopMode = 'buy';
  state.ui.confirmSell = false;
  state.ui.confirmChoice = 'no';
  
  // Render shop overlay
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    // The actual rendering will be done by game.js renderShop when called
  }
}

/**
 * Close the shop UI
 */
export function closeShop() {
  shopState.isOpen = false;
  shopState.vendor = null;
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Check for completed quests for this vendor
 */
function getCompletedQuests(state, vendor) {
  const completedFetchQuests = state.player.quests.active.filter(qId => {
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest && fetchQuest.vendorId === vendor.id) {
      return checkFetchQuestItem(state.player, fetchQuest);
    }
    return false;
  });

  const completedRegularQuests = state.player.quests.active.filter(qId => {
    const progress = state.player.quests.progress[qId] || 0;
    const quest = QUEST_TEMPLATES[qId];
    return quest && progress >= quest.targetCount;
  });
  
  return [...completedFetchQuests, ...completedRegularQuests];
}

// Quest turn-in is handled in game.js, not in the shop module

// The functions below are not currently used - shop logic is still in game.js
// They're kept here for future migration

/**
 * Navigate shop menu (UNUSED)
 */
function navigateShop(direction, state) {
  if (!shopState.isOpen) return;
  
  if (shopState.confirmSell) {
    // Navigate confirmation dialog
    if (direction === 'left' || direction === 'right') {
      shopState.confirmChoice = shopState.confirmChoice === 'yes' ? 'no' : 'yes';
      renderShop(state);
    }
    return;
  }
  
  // Normal navigation
  const items = getShopItems(state);
  if (direction === 'up') {
    shopState.selectedIndex = Math.max(0, shopState.selectedIndex - 1);
  } else if (direction === 'down') {
    shopState.selectedIndex = Math.min(items.length - 1, shopState.selectedIndex + 1);
  } else if (direction === 'tab') {
    // Switch between buy/sell modes
    shopState.mode = shopState.mode === 'buy' ? 'sell' : 'buy';
    shopState.selectedIndex = 0;
  }
  
  renderShop(state);
}

/**
 * Get items for current shop mode
 */
function getShopItems(state) {
  if (shopState.mode === 'buy') {
    return shopState.vendor?.inventory || [];
  } else if (shopState.mode === 'sell') {
    return state.player.inventory || [];
  } else if (shopState.mode === 'quest') {
    return shopState.questsToTurnIn || [];
  }
  return [];
}

/**
 * Buy item from vendor
 */
function buyFromVendor(state) {
  if (!shopState.isOpen || shopState.mode !== 'buy') return;
  
  const vendor = shopState.vendor;
  const selectedItem = vendor.inventory[shopState.selectedIndex];
  
  if (!selectedItem) return;
  
  const price = selectedItem.price || 10;
  if (state.player.gold < price) {
    emit(EventType.Log, { text: "Not enough gold!", cls: 'bad' });
    return;
  }
  
  // Deduct gold and add item
  state.player.gold -= price;
  
  // Add to inventory
  if (selectedItem.type === 'potion') {
    addPotionToInventory(state, selectedItem.item);
  } else {
    state.player.inventory.push({
      id: generateItemId(),
      type: selectedItem.type,
      item: { ...selectedItem.item }
    });
  }
  
  emit(EventType.Log, { text: `Bought ${selectedItem.item.name} for ${price} gold!`, cls: 'good' });
  
  // Remove from vendor inventory if not infinite
  if (!vendor.infiniteStock) {
    vendor.inventory.splice(shopState.selectedIndex, 1);
    shopState.selectedIndex = Math.min(shopState.selectedIndex, vendor.inventory.length - 1);
  }
  
  renderShop(state);
}

/**
 * Sell item to vendor
 */
function sellToVendor(state, forceConfirm = false) {
  if (!shopState.isOpen || shopState.mode !== 'sell') return;
  
  const item = state.player.inventory[shopState.selectedIndex];
  if (!item) return;
  
  // Check if item is equipped and show confirmation
  const isEquipped = (
    (item.type === 'weapon' && state.player.weapon === item.item) ||
    (item.type === 'armor' && state.player.armor === item.item) ||
    (item.type === 'headgear' && state.player.headgear === item.item)
  );
  
  if (isEquipped && !forceConfirm && !shopState.confirmSell) {
    shopState.confirmSell = true;
    shopState.confirmChoice = 'no';
    renderShop(state);
    return;
  }
  
  // Handle confirmation response
  if (shopState.confirmSell) {
    if (shopState.confirmChoice === 'no') {
      shopState.confirmSell = false;
      renderShop(state);
      return;
    }
    shopState.confirmSell = false;
  }
  
  // Calculate sell price
  const basePrice = item.item.price || 10;
  const sellPrice = Math.floor(basePrice * 0.5);
  
  // Unequip if necessary
  if (isEquipped) {
    if (item.type === 'weapon') state.player.weapon = null;
    if (item.type === 'armor') state.player.armor = null;
    if (item.type === 'headgear') state.player.headgear = null;
  }
  
  // Remove from inventory and add gold
  state.player.inventory.splice(shopState.selectedIndex, 1);
  state.player.gold += sellPrice;
  
  emit(EventType.Log, { text: `Sold ${item.item.name} for ${sellPrice} gold!`, cls: 'good' });
  
  shopState.selectedIndex = Math.min(shopState.selectedIndex, state.player.inventory.length - 1);
  renderShop(state);
}

/**
 * Render the shop UI
 */
export function renderShop(state) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlayContent');
  const title = document.getElementById('overlayTitle');
  const hint = document.getElementById('overlayHint');
  
  if (!overlay || !content) return;
  
  overlay.style.display = 'flex';
  
  // Handle confirmation dialog
  if (shopState.confirmSell) {
    renderConfirmDialog(content);
    return;
  }
  
  const vendor = shopState.vendor;
  
  // Set title based on mode
  if (shopState.mode === 'quest') {
    title.textContent = '📜 Quest Turn-In';
  } else {
    title.textContent = `🛍️ ${vendor.name || 'Shop'} - ${shopState.mode === 'buy' ? 'Buying' : 'Selling'}`;
  }
  
  // Render items
  const items = getShopItems(state);
  let html = '';
  
  if (shopState.mode === 'quest') {
    html = renderQuestList(state, items);
  } else if (shopState.mode === 'buy') {
    html = renderBuyList(state, vendor, items);
  } else {
    html = renderSellList(state, items);
  }
  
  content.innerHTML = html;
  
  // Update hint
  if (shopState.mode === 'quest') {
    hint.textContent = '↑↓ Navigate • Enter to turn in • Esc to cancel';
  } else {
    hint.textContent = '↑↓ Navigate • Tab to switch Buy/Sell • Enter to confirm • Esc to close';
  }
}

/**
 * Render confirmation dialog
 */
function renderConfirmDialog(content) {
  content.innerHTML = `
    <div class="shop-header" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--dim);">
      <h3 style="margin: 0 0 10px 0; color: var(--danger);">⚠️ WARNING ⚠️</h3>
    </div>
    <div style="text-align: center; padding: 20px;">
      <p style="color: var(--fg); margin-bottom: 20px;">You are about to sell an <span style="color: var(--ok)">EQUIPPED</span> item!</p>
      <p style="color: var(--accent); margin-bottom: 30px;">Are you sure you want to sell it?</p>
      <div style="display: flex; gap: 40px; justify-content: center; font-size: 18px;">
        <div style="padding: 10px 20px; border: 2px solid ${shopState.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'}; border-radius: 4px; color: ${shopState.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'};">
          YES
        </div>
        <div style="padding: 10px 20px; border: 2px solid ${shopState.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'}; border-radius: 4px; color: ${shopState.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'};">
          NO
        </div>
      </div>
    </div>
    <div class="shop-controls" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--dim); color: var(--dim);">
      [←→] Select | [Enter] Confirm | [Esc] Cancel
    </div>
  `;
}

/**
 * Render buy list
 */
function renderBuyList(state, vendor, items) {
  let html = `<div class="shop-gold" style="margin-bottom: 10px; color: var(--gold);">Your Gold: ${state.player.gold}</div>`;
  html += '<div class="inventory-grid">';
  
  items.forEach((item, idx) => {
    const price = item.price || 10;
    const canAfford = state.player.gold >= price;
    const selected = idx === shopState.selectedIndex;
    
    html += `
      <div class="inventory-item ${selected ? 'selected' : ''}" style="${!canAfford ? 'opacity: 0.5;' : ''}">
        <div>${getItemIcon(item)} ${esc(item.name)}</div>
        <div style="color: ${canAfford ? 'var(--gold)' : 'var(--danger)'};">${price}g</div>
      </div>
    `;
  });
  
  if (items.length === 0) {
    html += '<div style="color: var(--dim); text-align: center; padding: 20px;">No items for sale</div>';
  }
  
  html += '</div>';
  return html;
}

/**
 * Render sell list
 */
function renderSellList(state, items) {
  let html = `<div class="shop-gold" style="margin-bottom: 10px; color: var(--gold);">Your Gold: ${state.player.gold}</div>`;
  html += '<div class="inventory-grid">';
  
  items.forEach((invItem, idx) => {
    const item = invItem.item;
    const sellPrice = Math.floor((item.price || 10) * 0.5);
    const selected = idx === shopState.selectedIndex;
    const isEquipped = (
      (invItem.type === 'weapon' && state.player.weapon === item) ||
      (invItem.type === 'armor' && state.player.armor === item) ||
      (invItem.type === 'headgear' && state.player.headgear === item)
    );
    
    html += `
      <div class="inventory-item ${selected ? 'selected' : ''}">
        <div>
          ${getItemIcon(item)} ${esc(item.name)}
          ${isEquipped ? ' <span style="color: var(--ok)">[E]</span>' : ''}
          ${item.quantity ? ` x${item.quantity}` : ''}
        </div>
        <div style="color: var(--gold);">${sellPrice}g</div>
      </div>
    `;
  });
  
  if (items.length === 0) {
    html += '<div style="color: var(--dim); text-align: center; padding: 20px;">No items to sell</div>';
  }
  
  html += '</div>';
  return html;
}

/**
 * Render quest list
 */
function renderQuestList(state, quests) {
  let html = '<div class="quest-list">';
  
  quests.forEach((questId, idx) => {
    const quest = QUEST_TEMPLATES[questId] || state.player.quests.fetchQuests?.[questId];
    const selected = idx === shopState.selectedIndex;
    
    html += `
      <div class="quest-item ${selected ? 'selected' : ''}" style="padding: 10px; margin: 5px 0; border: 1px solid ${selected ? 'var(--accent)' : 'var(--dim)'};">
        <div style="color: var(--accent);">📜 ${quest.name}</div>
        <div style="color: var(--dim); font-size: 0.9em;">${quest.description}</div>
        <div style="color: var(--gold); margin-top: 5px;">Reward: ${quest.goldReward}g, ${quest.xpReward} XP</div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Get item icon
 */
function getItemIcon(item) {
  if (item.type === 'weapon' || item.slot === 'weapon') return '⚔️';
  if (item.type === 'armor' || item.slot === 'armor') return '🛡️';
  if (item.type === 'headgear' || item.slot === 'headgear') return '👑';
  if (item.type === 'potion') return '🧪';
  return '📦';
}

/**
 * Helper functions
 */
let nextItemId = 1;
function generateItemId() {
  return `item_${nextItemId++}`;
}

function addPotionToInventory(state, potion) {
  const existingPotion = state.player.inventory.find(
    i => i.type === 'potion' && i.item.name === potion.name
  );
  
  if (existingPotion) {
    existingPotion.item.quantity = (existingPotion.item.quantity || 1) + 1;
  } else {
    state.player.inventory.push({
      id: generateItemId(),
      type: 'potion',
      item: { ...potion, quantity: 1 }
    });
  }
  
  state.player.potionCount++;
}

// Export shop state for external access
export function getShopState() {
  return shopState;
}

export function isShopOpen() {
  return shopState.isOpen;
}