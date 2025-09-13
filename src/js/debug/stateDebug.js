// debug/stateDebug.js
// Debug utilities for checking state synchronization

/**
 * Check if state.player and various p references are the same object
 */
export function checkStateSync() {
  const state = window.gameState || window.state;
  if (!state) {
    console.error('No game state found');
    return;
  }

  console.group('🔍 State Synchronization Check');
  
  // Check if state.player exists
  console.log('state.player exists:', !!state.player);
  console.log('state.player:', state.player);
  
  // Check inventory
  if (state.player) {
    console.log('state.player.inventory:', state.player.inventory);
    
    // Check for fox teeth
    const teeth = state.player.inventory?.find(i => i.item?.id === 'fox_sweet_tooth');
    if (teeth) {
      console.log('✅ Fox teeth found in state.player.inventory:', teeth);
    } else {
      console.log('❌ No fox teeth in state.player.inventory');
    }
  }
  
  // Try to find any other player references
  console.log('\nChecking for other player references:');
  for (const key in state) {
    if (key !== 'player' && state[key] && typeof state[key] === 'object') {
      if (state[key].inventory !== undefined || state[key].hp !== undefined) {
        console.log(`Found player-like object at state.${key}:`, state[key]);
        console.log(`  Same as state.player?`, state[key] === state.player);
      }
    }
  }
  
  console.groupEnd();
  
  return state.player;
}

/**
 * Monitor inventory changes in real-time
 */
export function monitorInventory() {
  const state = window.gameState || window.state;
  if (!state || !state.player) {
    console.error('No game state found');
    return;
  }
  
  let lastInventoryJSON = JSON.stringify(state.player.inventory);
  
  console.log('📦 Starting inventory monitor (press Ctrl+C to stop)...');
  
  const interval = setInterval(() => {
    const currentInventoryJSON = JSON.stringify(state.player.inventory);
    
    if (currentInventoryJSON !== lastInventoryJSON) {
      console.group(`🔄 Inventory changed at ${new Date().toLocaleTimeString()}`);
      console.log('New inventory:', state.player.inventory);
      
      // Check for fox teeth
      const teeth = state.player.inventory?.find(i => i.item?.id === 'fox_sweet_tooth');
      if (teeth) {
        console.log('🦷 Fox teeth count:', teeth.quantity);
      }
      
      console.groupEnd();
      lastInventoryJSON = currentInventoryJSON;
    }
  }, 100);
  
  // Store interval ID so it can be stopped
  window._inventoryMonitorInterval = interval;
  
  return interval;
}

/**
 * Stop monitoring inventory
 */
export function stopMonitoringInventory() {
  if (window._inventoryMonitorInterval) {
    clearInterval(window._inventoryMonitorInterval);
    console.log('Stopped inventory monitoring');
    delete window._inventoryMonitorInterval;
  }
}

/**
 * Force sync state.player with any local p variable
 * This is a debugging tool to ensure they're the same reference
 */
export function forceSyncPlayer() {
  const state = window.gameState || window.state;
  if (!state || !state.player) {
    console.error('No game state found');
    return;
  }
  
  console.log('⚠️ This function would need to be called from within the movement pipeline');
  console.log('to access the local "p" variable. Add this debug code to movePipeline.js:');
  console.log('');
  console.log('// At the top of runPlayerMoveOriginal, after const p = state.player:');
  console.log('if (p !== state.player) {');
  console.log('  console.warn("p and state.player are different objects!");');
  console.log('  // Force them to be the same');
  console.log('  state.player = p;');
  console.log('}');
}

// Export to window for console access
if (typeof window !== 'undefined') {
  window.checkStateSync = checkStateSync;
  window.monitorInventory = monitorInventory;
  window.stopMonitoringInventory = stopMonitoringInventory;
  window.forceSyncPlayer = forceSyncPlayer;
  
  console.log('State debug commands available:');
  console.log('  window.checkStateSync() - Check if state references are synchronized');
  console.log('  window.monitorInventory() - Watch inventory changes in real-time');
  console.log('  window.stopMonitoringInventory() - Stop watching inventory');
  console.log('  window.forceSyncPlayer() - Show how to force sync player references');
}