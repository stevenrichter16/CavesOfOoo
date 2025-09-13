// debug/foxToothDebug.js
// Debug utilities for Fox Sweet Tooth quest

import { QUEST_ITEMS } from '../items/questItems.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

/**
 * Force add fox sweet teeth to player inventory
 * Can be called from browser console: window.grantFoxTeeth(3)
 * 
 * @param {number} quantity - Number of teeth to add
 * @returns {boolean} Success status
 */
export function grantFoxTeeth(quantity = 1) {
  // Get the game state
  const state = window.gameState || window.state;
  if (!state || !state.player) {
    console.error('No game state found. Make sure game is loaded.');
    return false;
  }

  const player = state.player;
  
  // Initialize inventory if needed
  if (!player.inventory) {
    player.inventory = [];
  }

  // Check for existing teeth in inventory
  const existing = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
  
  if (existing) {
    // Stack with existing
    existing.quantity += quantity;
    console.log(`Added ${quantity} teeth. Total: ${existing.quantity}`);
  } else {
    // Create new inventory item using QUEST_ITEMS definition
    const itemDef = QUEST_ITEMS.fox_sweet_tooth;
    if (!itemDef) {
      console.error('Fox Sweet Tooth item not defined in QUEST_ITEMS');
      return false;
    }

    const tooth = {
      item: {
        id: 'fox_sweet_tooth',
        ...itemDef
      },
      quantity: quantity
    };
    
    player.inventory.push(tooth);
    console.log(`Added ${quantity} fox sweet teeth to inventory`);
  }

  // Update quest progress if applicable
  if (player.quests?.active?.includes('sweet_tooth_foxes')) {
    if (!player.quests.progress['sweet_tooth_foxes']) {
      player.quests.progress['sweet_tooth_foxes'] = { teeth: 0 };
    }
    player.quests.progress['sweet_tooth_foxes'].teeth += quantity;
    const total = player.quests.progress['sweet_tooth_foxes'].teeth;
    
    console.log(`Quest progress: ${total}/5 teeth collected`);
    
    // Emit log event for in-game display
    emit(EventType.Log, {
      text: `Debug: Added ${quantity} fox teeth. Quest progress: ${total}/5`,
      cls: 'debug'
    });
  }

  // Trigger render if available
  if (state.render && typeof state.render === 'function') {
    state.render();
  }

  return true;
}

/**
 * Set a sleeping fox at specific position for testing
 * Can be called from browser console: window.spawnSleepingFox(11, 10)
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} Success status
 */
export function spawnSleepingFox(x, y) {
  const state = window.gameState || window.state;
  if (!state || !state.chunk) {
    console.error('No game state or chunk found');
    return false;
  }

  // Create a sleeping fox
  const fox = {
    id: `debug_fox_${Date.now()}`,
    name: 'Sweet Tooth Fox',
    kind: 'sweet_tooth_fox',
    x: x,
    y: y,
    hp: 5,
    hpMax: 15,
    str: 3,
    def: 1,
    spd: 3,
    status: 'sleep',
    asleep: true,
    hasTeeth: true,
    alive: true,
    glyph: 'f',
    color: 'orange'
  };

  // Add to chunk monsters
  if (!state.chunk.monsters) {
    state.chunk.monsters = [];
  }
  state.chunk.monsters.push(fox);

  console.log(`Spawned sleeping fox at (${x}, ${y})`);
  
  emit(EventType.Log, {
    text: `Debug: Spawned sleeping fox at (${x}, ${y})`,
    cls: 'debug'
  });

  // Trigger render
  if (state.render && typeof state.render === 'function') {
    state.render();
  }

  return true;
}

/**
 * Clear all fox teeth from inventory (for testing)
 * Can be called from browser console: window.clearFoxTeeth()
 */
export function clearFoxTeeth() {
  const state = window.gameState || window.state;
  if (!state || !state.player) {
    console.error('No game state found');
    return false;
  }

  const player = state.player;
  if (!player.inventory) {
    console.log('No inventory to clear');
    return false;
  }

  // Remove teeth from inventory
  const index = player.inventory.findIndex(i => i.item?.id === 'fox_sweet_tooth');
  if (index >= 0) {
    const removed = player.inventory.splice(index, 1)[0];
    console.log(`Removed ${removed.quantity} fox teeth from inventory`);
    
    // Reset quest progress
    if (player.quests?.progress?.['sweet_tooth_foxes']) {
      player.quests.progress['sweet_tooth_foxes'].teeth = 0;
      console.log('Reset quest progress to 0');
    }
    
    emit(EventType.Log, {
      text: 'Debug: Cleared all fox teeth from inventory',
      cls: 'debug'
    });
    
    // Trigger render
    if (state.render && typeof state.render === 'function') {
      state.render();
    }
    
    return true;
  }

  console.log('No fox teeth in inventory');
  return false;
}

// Export to window for console access
if (typeof window !== 'undefined') {
  window.grantFoxTeeth = grantFoxTeeth;
  window.spawnSleepingFox = spawnSleepingFox;
  window.clearFoxTeeth = clearFoxTeeth;
  
  console.log('Fox tooth debug commands available:');
  console.log('  window.grantFoxTeeth(quantity) - Add teeth to inventory');
  console.log('  window.spawnSleepingFox(x, y) - Spawn a sleeping fox');
  console.log('  window.clearFoxTeeth() - Clear all teeth from inventory');
}