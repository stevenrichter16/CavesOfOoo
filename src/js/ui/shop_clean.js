// ui/shop.js - Shop UI module (Pure UI - no business logic)
// This module ONLY handles rendering and DOM manipulation
// All state changes go through the systems/shop.js module

import { on } from '../utils/events.js';
import { esc } from '../utils/utils.js';
import { ShopTransactionEvents } from '../items/shop.js';

// UI state (for rendering only, not game state)
let shopUIState = {
  isRendering: false
};

// Event types for shop UI
export const ShopUIEvents = {
  RefreshUI: 'shopUI:refresh',
  ShowMessage: 'shopUI:showMessage'
};

/**
 * Initialize shop UI event listeners
 */
export function initShopUI() {
  // Listen for transaction events from the system
  on(ShopTransactionEvents.PurchaseSuccess, ({ item, price, goldRemaining }) => {
    // UI can show a success animation or update gold display
    console.log(`Purchase successful: ${item.name} for ${price}g`);
  });
  
  on(ShopTransactionEvents.SellSuccess, ({ item, price, goldRemaining }) => {
    // UI can show a success animation or update gold display
    console.log(`Sale successful: ${item.name} for ${price}g`);
  });
  
  on(ShopTransactionEvents.ShopClosed, () => {
    closeShopUI();
  });
  
  on(ShopUIEvents.RefreshUI, ({ state }) => {
    renderShop(state);
  });
}

/**
 * Open the shop UI overlay
 */
export function openShopUI() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

/**
 * Close the shop UI overlay
 */
export function closeShopUI() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Render the shop UI (Pure rendering - no state mutations)
 */
export function renderShop(state) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlayContent');
  const title = document.getElementById('overlayTitle');
  const hint = document.getElementById('overlayHint');
  
  if (!overlay || !content || !state.ui.shopOpen) return;
  
  overlay.style.display = 'flex';
  
  // Handle confirmation dialog
  if (state.ui.confirmSell) {
    renderConfirmDialog(content, state);
    hint.textContent = '←→ Select • Enter to confirm • Esc to cancel';
    return;
  }
  
  const vendor = state.ui.shopVendor;
  if (!vendor) return;
  
  // Set title based on mode
  title.textContent = `🛍️ ${vendor.name || 'Shop'} - ${state.ui.shopMode === 'buy' ? 'Buying' : 'Selling'}`;
  
  // Render items based on mode
  let html = '';
  if (state.ui.shopMode === 'buy') {
    html = renderBuyList(state, vendor);
  } else if (state.ui.shopMode === 'sell') {
    html = renderSellList(state);
  }
  
  content.innerHTML = html;
  
  // Update hint
  hint.textContent = '↑↓ Navigate • Tab to switch Buy/Sell • Enter to confirm • Esc to close';
}

/**
 * Render confirmation dialog for selling equipped items
 */
function renderConfirmDialog(content, state) {
  const choice = state.ui.confirmChoice;
  content.innerHTML = `
    <div class="shop-header" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--dim);">
      <h3 style="margin: 0 0 10px 0; color: var(--danger);">⚠️ WARNING ⚠️</h3>
    </div>
    <div style="text-align: center; padding: 20px;">
      <p style="color: var(--fg); margin-bottom: 20px;">You are about to sell an <span style="color: var(--ok)">EQUIPPED</span> item!</p>
      <p style="color: var(--accent); margin-bottom: 30px;">Are you sure you want to sell it?</p>
      <div style="display: flex; gap: 40px; justify-content: center; font-size: 18px;">
        <div style="padding: 10px 20px; border: 2px solid ${choice === 'yes' ? 'var(--danger)' : 'var(--dim)'}; border-radius: 4px; color: ${choice === 'yes' ? 'var(--danger)' : 'var(--dim)'};">
          YES
        </div>
        <div style="padding: 10px 20px; border: 2px solid ${choice === 'no' ? 'var(--ok)' : 'var(--dim)'}; border-radius: 4px; color: ${choice === 'no' ? 'var(--ok)' : 'var(--dim)'};">
          NO
        </div>
      </div>
    </div>
  `;
}

/**
 * Render buy list
 */
function renderBuyList(state, vendor) {
  let html = `<div class="shop-gold" style="margin-bottom: 10px; color: var(--gold);">Your Gold: ${state.player.gold}</div>`;
  html += '<div class="inventory-grid">';
  
  const items = vendor.inventory || [];
  items.forEach((item, idx) => {
    const price = item.price || 10;
    const canAfford = state.player.gold >= price;
    const selected = idx === state.ui.shopSelectedIndex;
    
    // Vendor inventory items have nested structure: { type, item: {...}, price }
    const itemData = item.item || item;
    const itemName = itemData.name || 'Unknown Item';
    
    html += `
      <div class="inventory-item ${selected ? 'selected' : ''}" style="${!canAfford ? 'opacity: 0.5;' : ''}">
        <div>${getItemIcon(item)} ${esc(itemName)}</div>
        <div style="color: ${canAfford ? 'var(--gold)' : 'var(--danger)'};">${price}g</div>
      </div>
    `;
    
    // Add description for selected item
    if (selected && itemData.desc) {
      html += `<div style="color: var(--dim); font-size: 0.9em; padding: 5px 10px;">${esc(itemData.desc)}</div>`;
    }
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
function renderSellList(state) {
  let html = `<div class="shop-gold" style="margin-bottom: 10px; color: var(--gold);">Your Gold: ${state.player.gold}</div>`;
  html += '<div class="inventory-grid">';
  
  const items = state.player.inventory.filter(item => 
    item.type === 'weapon' || 
    item.type === 'armor' || 
    item.type === 'headgear' || 
    item.type === 'ring' ||
    item.type === 'potion'
  );
  
  items.forEach((invItem, idx) => {
    const item = invItem.item || invItem;
    const sellPrice = Math.floor((item.price || 10) * 0.5);
    const selected = idx === state.ui.shopSelectedIndex;
    
    const isEquipped = checkIfEquipped(state, invItem);
    
    html += `
      <div class="inventory-item ${selected ? 'selected' : ''}">
        <div>
          ${getItemIcon(invItem)} ${esc(item.name || 'Unknown Item')}
          ${isEquipped ? ' <span style="color: var(--ok)">[E]</span>' : ''}
          ${item.quantity ? ` x${item.quantity}` : ''}
        </div>
        <div style="color: var(--gold);">${sellPrice}g</div>
      </div>
    `;
    
    // Add description for selected item
    if (selected && item.desc) {
      html += `<div style="color: var(--dim); font-size: 0.9em; padding: 5px 10px;">${esc(item.desc)}</div>`;
    }
  });
  
  if (items.length === 0) {
    html += '<div style="color: var(--dim); text-align: center; padding: 20px;">No items to sell</div>';
  }
  
  html += '</div>';
  return html;
}

/**
 * Get item icon based on type
 */
function getItemIcon(item) {
  if (item.type === 'weapon') return '⚔️';
  if (item.type === 'armor') return '🛡️';
  if (item.type === 'headgear') return '👑';
  if (item.type === 'ring') return '💍';
  if (item.type === 'potion') return '🧪';
  return '📦';
}

/**
 * Check if item is equipped (read-only check for display)
 */
function checkIfEquipped(state, item) {
  if (item.type === 'weapon' && item.id === state.equippedWeaponId) return true;
  if (item.type === 'armor' && item.id === state.equippedArmorId) return true;
  if (item.type === 'headgear' && item.id === state.equippedHeadgearId) return true;
  if (item.type === 'ring' && state.equippedRingIds) {
    return item.id === state.equippedRingIds[0] || item.id === state.equippedRingIds[1];
  }
  return false;
}