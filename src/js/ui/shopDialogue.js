// Shop UI in Dialogue Style
// Renders shop interface to match the dialogue tree UI appearance

import { esc } from '../utils/utils.js';

/**
 * Render shop in dialogue UI style
 */
export function renderShopDialogueStyle(state) {
  if (!state.ui.shopOpen) return;
  
  const vendor = state.ui.shopVendor;
  if (!vendor) {
    console.log('❌ No vendor data in UI state!');
    return;
  }
  
  // Handle confirmation dialog
  if (state.ui.confirmSell) {
    renderConfirmDialogueStyle(state);
    return;
  }
  
  // Get or create container (like dialogue UI)
  let container = document.getElementById('shop-dialogue');
  if (!container) {
    container = document.createElement('div');
    container.id = 'shop-dialogue';
    container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg, #222);
      border: 2px solid var(--primary, #4af);
      padding: 20px;
      z-index: 1000;
      min-width: 500px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      color: var(--fg, #fff);
      font-family: monospace;
      font-size: 14px;
    `;
    document.body.appendChild(container);
  }
  
  // Determine mode text
  let modeText = 'BUYING';
  let actionText = 'Buy';
  
  if (state.ui.shopMode === 'sell') {
    modeText = 'SELLING';
    actionText = 'Sell';
  } else if (state.ui.shopMode === 'turn-in') {
    modeText = 'TURN IN QUEST';
    actionText = 'Turn In';
  } else if (state.ui.shopMode === 'quest') {
    modeText = 'QUEST';
    actionText = 'Accept';
  }
  
  // Build HTML in dialogue style
  let html = '';
  
  // NPC name header (like dialogue)
  html += `<h3>${vendor.name}'s Shop</h3>`;
  
  // Faction and mode info
  html += `<div style="color: #888; font-size: 12px; margin-bottom: 10px;">`;
  if (vendor.faction) {
    html += `${formatFaction(vendor.faction)} • `;
  }
  html += `${modeText}`;
  html += `</div>`;
  
  // Gold display
  if (state.ui.shopMode !== 'quest' && state.ui.shopMode !== 'turn-in') {
    html += `<div style="color: var(--gold, #ff0); margin-bottom: 15px;">Your Gold: ${state.player.gold}</div>`;
  }
  
  // Items section with border
  html += `<div style="margin-bottom: 20px; padding: 15px 0; border-bottom: 1px solid #444;">`;
  
  // Render items based on mode
  if (state.ui.shopMode === 'buy') {
    html += renderBuyListDialogue(state, vendor);
  } else if (state.ui.shopMode === 'sell') {
    html += renderSellListDialogue(state);
  } else if (state.ui.shopMode === 'turn-in') {
    html += renderTurnInListDialogue(state);
  } else if (state.ui.shopMode === 'quest') {
    html += renderQuestOfferDialogue(state, vendor);
  }
  
  html += `</div>`;
  
  // Instructions (like dialogue UI)
  html += `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444; color: #666; font-size: 12px; text-align: center;">`;
  html += `[↑/↓] or numbers to select • [Enter] to ${actionText} • [Tab] switch mode • [ESC] to exit`;
  html += `</div>`;
  
  container.innerHTML = html;
  container.style.display = 'block';
  container.style.visibility = 'visible';
  container.style.opacity = '1';
}

/**
 * Render buy list in dialogue choice format
 */
function renderBuyListDialogue(state, vendor) {
  let html = '';
  const items = vendor.inventory || [];
  
  if (items.length === 0) {
    return '<div style="color: #888; text-align: center; padding: 20px;">The vendor is sold out!</div>';
  }
  
  html += '<div style="margin-top: 15px;">';
  
  items.forEach((item, idx) => {
    const price = item.price || 10;
    const canAfford = state.player.gold >= price;
    const selected = idx === state.ui.shopSelectedIndex;
    
    // Vendor inventory items have nested structure
    const itemData = item.item || item;
    const itemName = itemData.name || 'Unknown Item';
    
    // Build item info string
    let itemInfo = `${itemName} - ${price}g`;
    
    // Add stats based on type
    if (item.type === 'weapon' && itemData.dmg) {
      itemInfo += ` (Damage +${itemData.dmg})`;
    } else if (item.type === 'armor' && itemData.def) {
      itemInfo += ` (Defense +${itemData.def})`;
    } else if (item.type === 'potion' || itemData.heal) {
      itemInfo += ` (Heals ${itemData.heal || 10} HP)`;
    } else if (item.type === 'headgear') {
      const stats = [];
      if (itemData.def) stats.push(`Def +${itemData.def}`);
      if (itemData.str) stats.push(`Str +${itemData.str}`);
      if (itemData.spd) stats.push(`Spd +${itemData.spd}`);
      if (stats.length > 0) itemInfo += ` (${stats.join(', ')})`;
    }
    
    // Style based on selection and affordability
    const textColor = selected ? 'var(--primary, #4af)' : canAfford ? '#ccc' : '#666';
    
    html += `<div style="
      padding: 5px 0;
      margin: 2px 0;
      cursor: pointer;
      color: ${textColor};
      ${!canAfford ? 'opacity: 0.5;' : ''}
    " data-item="${idx}">`;
    
    // Add selection arrow and number
    if (selected) {
      html += `&nbsp;&nbsp;&nbsp;&nbsp;> [${idx + 1}] ${itemInfo}`;
    } else {
      html += `[${idx + 1}] ${itemInfo}`;
    }
    
    // Add "can't afford" notice on new line if needed
    if (!canAfford && selected) {
      html += `<div style="color: var(--danger, #f44); font-size: 12px; margin-left: 40px;">Not enough gold!</div>`;
    }
    
    html += `</div>`;
  });
  
  html += '</div>';
  return html;
}

/**
 * Render sell list in dialogue choice format
 */
function renderSellListDialogue(state) {
  let html = '';
  
  const items = state.player.inventory.filter(item => 
    item.type === 'weapon' || 
    item.type === 'armor' || 
    item.type === 'headgear' || 
    item.type === 'ring' ||
    item.type === 'potion'
  );
  
  if (items.length === 0) {
    return '<div style="color: #888; text-align: center; padding: 20px;">You have nothing to sell!</div>';
  }
  
  html += '<div style="margin-top: 15px;">';
  
  items.forEach((invItem, idx) => {
    const item = invItem.item || invItem;
    const sellPrice = Math.floor((item.price || 10) * 0.5);
    const selected = idx === state.ui.shopSelectedIndex;
    const isEquipped = checkIfEquipped(state, invItem);
    
    // Build item info string
    let itemInfo = `${item.name} - ${sellPrice}g`;
    
    // Add equipped indicator
    if (isEquipped) {
      itemInfo += ' [EQUIPPED]';
    }
    
    // Add count for stackables
    if (invItem.count > 1) {
      itemInfo += ` x${invItem.count}`;
    }
    
    // Style based on selection
    const textColor = selected ? 'var(--primary, #4af)' : isEquipped ? 'var(--ok, #4f4)' : '#ccc';
    
    html += `<div style="
      padding: 5px 0;
      margin: 2px 0;
      cursor: pointer;
      color: ${textColor};
    " data-item="${idx}">`;
    
    // Add selection arrow and number
    if (selected) {
      html += `&nbsp;&nbsp;&nbsp;&nbsp;> [${idx + 1}] ${itemInfo}`;
    } else {
      html += `[${idx + 1}] ${itemInfo}`;
    }
    
    html += `</div>`;
  });
  
  html += '</div>';
  return html;
}

/**
 * Render quest turn-in list in dialogue format
 */
function renderTurnInListDialogue(state) {
  // Implementation for quest turn-in
  return '<div style="color: #888; text-align: center; padding: 20px;">Quest turn-in not yet implemented</div>';
}

/**
 * Render quest offer in dialogue format
 */
function renderQuestOfferDialogue(state, vendor) {
  // Implementation for quest offers
  return '<div style="color: #888; text-align: center; padding: 20px;">Quest system not yet implemented</div>';
}

/**
 * Render confirmation dialog in dialogue style
 */
function renderConfirmDialogueStyle(state) {
  let container = document.getElementById('shop-dialogue');
  if (!container) {
    container = document.createElement('div');
    container.id = 'shop-dialogue';
    container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg, #222);
      border: 2px solid var(--danger, #f44);
      padding: 20px;
      z-index: 1001;
      min-width: 400px;
      max-width: 500px;
      color: var(--fg, #fff);
      font-family: monospace;
      font-size: 14px;
    `;
    document.body.appendChild(container);
  }
  
  const choice = state.ui.confirmChoice;
  
  let html = '';
  html += '<h3 style="color: var(--danger, #f44);">⚠️ WARNING ⚠️</h3>';
  html += '<div style="margin: 20px 0; padding: 15px 0; border-bottom: 1px solid #444;">';
  html += '<p style="margin-bottom: 10px;">You are about to sell an <span style="color: var(--ok, #4f4);">EQUIPPED</span> item!</p>';
  html += '<p>Are you sure you want to sell it?</p>';
  html += '</div>';
  
  html += '<div style="margin-top: 15px;">';
  
  // YES option
  const yesColor = choice === 'yes' ? 'var(--danger, #f44)' : '#888';
  html += `<div style="
    padding: 5px 0;
    margin: 2px 0;
    cursor: pointer;
    color: ${yesColor};
  ">`;
  if (choice === 'yes') {
    html += '&nbsp;&nbsp;&nbsp;&nbsp;> [1] YES - Sell it';
  } else {
    html += '[1] YES - Sell it';
  }
  html += '</div>';
  
  // NO option
  const noColor = choice === 'no' ? 'var(--ok, #4f4)' : '#888';
  html += `<div style="
    padding: 5px 0;
    margin: 2px 0;
    cursor: pointer;
    color: ${noColor};
  ">`;
  if (choice === 'no') {
    html += '&nbsp;&nbsp;&nbsp;&nbsp;> [2] NO - Keep it';
  } else {
    html += '[2] NO - Keep it';
  }
  html += '</div>';
  
  html += '</div>';
  
  // Instructions
  html += '<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444; color: #666; font-size: 12px; text-align: center;">';
  html += '[↑/↓] or [1/2] to select • [Enter] to confirm • [ESC] to cancel';
  html += '</div>';
  
  container.innerHTML = html;
  container.style.display = 'block';
}

/**
 * Close shop dialogue UI
 */
export function closeShopDialogueUI() {
  const container = document.getElementById('shop-dialogue');
  if (container) {
    container.style.display = 'none';
    container.remove();
  }
}

/**
 * Format faction name
 */
function formatFaction(faction) {
  const factionNames = {
    'merchants': 'Merchant',
    'guards': 'Guard',
    'royalty': 'Royal',
    'citizens': 'Citizen',
    'wizards': 'Wizard'
  };
  return factionNames[faction] || faction;
}

/**
 * Check if item is equipped
 */
function checkIfEquipped(state, item) {
  if (item.type === 'weapon') {
    return state.player.weapon === item;
  } else if (item.type === 'armor') {
    return state.player.armor === item;
  } else if (item.type === 'headgear') {
    return state.player.headgear === item;
  } else if (item.type === 'ring') {
    return state.player.ring === item;
  }
  return false;
}