// ui/shop.js - Shop UI module (Pure UI - no business logic)
// This module ONLY handles rendering and DOM manipulation
// All state changes go through the systems/shop.js module

import { on } from '../events.js';
import { esc } from '../utils.js';
import { ShopTransactionEvents } from '../systems/shop.js';
import { getQuestDisplay } from '../systems/vendorQuests.js';

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
  
  // Set title and header based on mode
  let modeText = 'BUYING';
  let actionText = 'Buy';
  let tabHint = 'Switch to Sell';
  
  if (state.ui.shopMode === 'sell') {
    modeText = 'SELLING';
    actionText = 'Sell';
    tabHint = 'Switch to Buy';
  } else if (state.ui.shopMode === 'quest') {
    modeText = 'QUEST';
    actionText = 'Accept Quest';
    tabHint = 'Buy/Sell';
  }
  
  title.textContent = `VENDOR - ${modeText}`;
  
  // Add header with gold display
  content.innerHTML = `
    <div class="shop-header" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--dim);">
      <h3 style="margin: 0 0 10px 0; color: var(--accent);">VENDOR - ${modeText}</h3>
      ${state.ui.shopMode !== 'quest' ? `<div style="color: var(--gold);">Your Gold: ${state.player.gold}</div>` : ''}
    </div>
    <div class="shop-items"></div>
    <div class="shop-controls" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--dim); color: var(--dim);">
      ${state.ui.shopMode !== 'quest' ? '[↑↓] Navigate | ' : ''}[Enter] ${actionText} | [Tab] ${tabHint} | [Esc/V] Exit
    </div>
  `;
  
  const itemsDiv = content.querySelector('.shop-items');
  
  // Render items based on mode
  if (state.ui.shopMode === 'buy') {
    itemsDiv.innerHTML = renderBuyList(state, vendor);
  } else if (state.ui.shopMode === 'sell') {
    itemsDiv.innerHTML = renderSellList(state);
  } else if (state.ui.shopMode === 'quest') {
    itemsDiv.innerHTML = renderQuestOffer(state, vendor);
  }
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
  let html = '';
  
  const items = vendor.inventory || [];
  
  if (items.length === 0) {
    return '<div style="color: var(--dim); text-align: center; padding: 20px;">The vendor is sold out!</div>';
  }
  
  items.forEach((item, idx) => {
    const price = item.price || 10;
    const canAfford = state.player.gold >= price;
    const selected = idx === state.ui.shopSelectedIndex;
    
    // Vendor inventory items have nested structure: { type, item: {...}, price }
    const itemData = item.item || item;
    const itemName = itemData.name || 'Unknown Item';
    
    // Get type symbol
    const typeSymbol = item.type === 'potion' ? '!' : 
                       item.type === 'weapon' ? '/' : 
                       item.type === 'armor' ? ']' : 
                       item.type === 'headgear' ? '^' : 
                       item.type === 'ring' ? 'o' : '?';
    
    // Build stats display
    let statsText = '';
    if (item.type === 'weapon') {
      statsText = ` [DMG: ${itemData.dmg || 0}]`;
      if (itemData.effect) {
        statsText += ` [${itemData.effect}]`;
      }
    } else if (item.type === 'armor') {
      statsText = ` [DEF: ${itemData.def || 0}]`;
    } else if (item.type === 'headgear') {
      const stats = [];
      if (itemData.def) stats.push(`DEF: ${itemData.def}`);
      if (itemData.str) stats.push(`STR: ${itemData.str}`);
      if (itemData.spd) stats.push(`SPD: ${itemData.spd}`);
      if (itemData.magic) stats.push(`MAG: ${itemData.magic}`);
      if (stats.length > 0) statsText = ` [${stats.join(', ')}]`;
    }
    
    html += `
      <div class="item ${selected ? 'selected' : ''}" style="${!canAfford ? 'opacity: 0.5;' : ''}">
        <div>
          <div class="name">${typeSymbol} ${esc(itemName)}${statsText} - ${price}g</div>
          <div class="desc">${itemData.desc ? esc(itemData.desc) : ''}</div>
          ${!canAfford ? '<div style="color: var(--danger); font-size: 0.9em;">Not enough gold!</div>' : ''}
        </div>
      </div>
    `;
  });
  
  return html;
}

/**
 * Render sell list
 */
function renderSellList(state) {
  let html = '';
  
  const items = state.player.inventory.filter(item => 
    item.type === 'weapon' || 
    item.type === 'armor' || 
    item.type === 'headgear' || 
    item.type === 'ring' ||
    item.type === 'potion'
  );
  
  if (items.length === 0) {
    return '<div style="color: var(--dim); text-align: center; padding: 20px;">You have nothing to sell!</div>';
  }
  
  items.forEach((invItem, idx) => {
    const item = invItem.item || invItem;
    const sellPrice = Math.floor((item.price || 10) * 0.5);
    const selected = idx === state.ui.shopSelectedIndex;
    const isEquipped = checkIfEquipped(state, invItem);
    
    // Get type symbol
    const typeSymbol = invItem.type === 'potion' ? '!' : 
                       invItem.type === 'weapon' ? '/' : 
                       invItem.type === 'armor' ? ']' : 
                       invItem.type === 'headgear' ? '^' : 
                       invItem.type === 'ring' ? 'o' : '?';
    
    // Build stats display
    let statsText = '';
    if (invItem.type === 'weapon') {
      statsText = ` [DMG: ${item.dmg || 0}]`;
      if (item.effect) {
        statsText += ` [${item.effect}]`;
      }
    } else if (invItem.type === 'armor') {
      statsText = ` [DEF: ${item.def || 0}]`;
    } else if (invItem.type === 'headgear') {
      const stats = [];
      if (item.def) stats.push(`DEF: ${item.def}`);
      if (item.str) stats.push(`STR: ${item.str}`);
      if (item.spd) stats.push(`SPD: ${item.spd}`);
      if (item.magic) stats.push(`MAG: ${item.magic}`);
      if (stats.length > 0) statsText = ` [${stats.join(', ')}]`;
    }
    
    html += `
      <div class="item ${selected ? 'selected' : ''}">
        <div>
          <div class="name">
            ${typeSymbol} ${esc(item.name || 'Unknown Item')}${statsText}
            ${isEquipped ? ' <span style="color: var(--ok)">[EQUIPPED]</span>' : ''}
            ${item.quantity ? ` x${item.quantity}` : ''}
            - ${sellPrice}g
          </div>
          <div class="desc">${item.desc ? esc(item.desc) : ''}</div>
        </div>
      </div>
    `;
  });
  
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
 * Render quest offer
 */
function renderQuestOffer(state, vendor) {
  if (!vendor || !vendor.fetchQuest) {
    return '<div style="color: var(--dim); text-align: center; padding: 20px;">No quests available from this vendor.</div>';
  }
  
  const quest = vendor.fetchQuest;
  const questDisplay = getQuestDisplay(quest);
  
  if (!questDisplay) {
    return '<div style="color: var(--dim); text-align: center; padding: 20px;">No quests available.</div>';
  }
  
  return `
    <div class="quest-offer" style="padding: 15px; border: 1px solid var(--accent); border-radius: 4px;">
      <div style="color: var(--xp); font-size: 1.2em; margin-bottom: 10px;">📜 ${esc(questDisplay.name)}</div>
      <div style="color: var(--fg); margin-bottom: 10px;">"${esc(questDisplay.description)}"</div>
      <div style="color: var(--note); margin-bottom: 15px;">
        <strong>Objective:</strong> ${esc(questDisplay.objective)}
      </div>
      <div style="color: var(--good);">
        <strong>Rewards:</strong>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li>${questDisplay.rewards.gold} gold</li>
          <li>${questDisplay.rewards.xp} XP</li>
          ${questDisplay.rewards.item ? `<li>${esc(questDisplay.rewards.item)}</li>` : ''}
        </ul>
      </div>
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--dim); color: var(--dim);">
        Press [Enter] to accept this quest
      </div>
    </div>
  `;
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