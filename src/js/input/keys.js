// keys.js - Keyboard input handling
// This module ONLY handles keyboard events and dispatches to the appropriate handlers
// It does not contain game logic, only input routing

import { 
  handlePlayerMove, 
  waitTurn, 
  interactTile, 
  render, 
  log, 
  newWorld,
  openVendorShop,
  claimQuestRewards,
  renderQuestTurnIn,
  renderQuestTurnInConfirm,
  closeShop
} from '../core/game.js';
import { openQuestTurnIn } from '../quests/questTurnIn.js';
import * as ShopSystem from '../items/shop.js';
import * as ShopUI from '../ui/shop.js';
import * as VendorQuests from '../quests/vendorQuests.js';
import { saveChunk } from '../utils/persistence.js';
import { openInventory, closeInventory, useInventoryItem, dropInventoryItem, renderInventory } from '../items/inventory.js';
import { handleMapNavigation } from '../world/worldMap.js';
import { openMap, closeMap, renderMap } from '../ui/map.js';
import { displayActiveQuests, hasQuest, giveQuest, checkFetchQuestItem } from '../quests/quests.js';
import { QUEST_TEMPLATES } from '../core/config.js';
import { applyStatusEffect, isFrozen, Status } from '../combat/statusSystem.js';
import { tagsForStatus } from '../engine/adapters/cavesOfOoo.js';
import { PHASE_ORDER } from '../engine/sim.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { W, H } from '../core/config.js';
import { 
  activateCursor, 
  deactivateCursor, 
  moveCursor, 
  getCursorState,
  executeCursorAction,
  getInfoAtCursor
} from '../movement/cursor.js';
import { handleSocialInput } from '../ui/social.js';
import { handleDialogueInput } from '../ui/dialogueTree.js';

// Helper function to show cursor info
function showCursorInfo(STATE) {
  const cursorState = getCursorState();
  if (!cursorState.active) return;
  
  // Show mode-specific info
  if (cursorState.mode === 'throw') {
    if (STATE.pendingThrowable && STATE.pendingThrowable.item) {
      const info = getInfoAtCursor();
      if (info && info.monster) {
        log(STATE, `Throw ${STATE.pendingThrowable.item.name} at ${info.monster.name}? (Enter to throw, Esc to cancel)`, "combat");
      } else {
        log(STATE, `Aiming ${STATE.pendingThrowable.item.name}... (arrows to aim, Enter to throw, Esc to cancel)`, "note");
      }
    }
    return;
  }
  
  const info = getInfoAtCursor();
  if (info && info.monster) {
    let quickInfo = `Examining: ${info.monster.name} (${info.monster.hp}/${info.monster.hpMax} HP)`;
    
    // Add status effects
    if (info.monster.statuses && info.monster.statuses.length > 0) {
      const statusNames = info.monster.statuses.map(s => {
        let text = s.name;
        if (s.turns > 0) text += ` ${s.turns}t`;
        return text;
      });
      quickInfo += ` [${statusNames.join(', ')}]`;
    } else {
      quickInfo += ' [Healthy]';
    }
    
    log(STATE, quickInfo, "dim");
  } else if (info && info.item) {
    log(STATE, `Item: ${info.item.name}`, "dim");
  } else if (info) {
    // Just show tile type
    const tileDesc = 
      info.tile === '.' ? 'Floor' :
      info.tile === '#' ? 'Wall' :
      info.tile === '~' ? 'Water' :
      info.tile === '>' ? 'Stairs down' :
      info.tile === '<' ? 'Stairs up' :
      info.tile === '%' ? 'Plant' :
      info.tile === 'V' ? 'Vendor' :
      info.tile === 'A' ? 'Artifact' :
      info.tile === '!' ? 'Shrine' :
      'Unknown';
    log(STATE, `Tile: ${tileDesc}`, "dim");
  }
}

// Initialize keyboard controls
export function initKeyboardControls() {
  window.addEventListener("keydown", e => {
    // Use window.STATE to always get the current STATE object
    const STATE = window.STATE;
    if (!STATE) return;
    
    // Prevent Tab key from selecting HTML elements when any UI is open
    if (e.key === "Tab" && (STATE.ui.questTurnInOpen || STATE.ui.mapOpen || 
        STATE.ui.shopOpen || STATE.ui.inventoryOpen || STATE.ui.socialMenuOpen || STATE.ui.dialogueTreeOpen)) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Cursor controls have priority when active
    const cursorState = getCursorState();
    if (cursorState && cursorState.active) {
      handleCursorControls(STATE, e);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Dialogue tree controls (priority over social menu)
    if (STATE.ui.dialogueTreeOpen) {
      if (handleDialogueInput(STATE, e.key)) {
        e.preventDefault();
        return;
      }
    }
    
    // Social menu controls
    if (STATE.ui.socialMenuOpen) {
      if (handleSocialInput(STATE, e.key)) {
        e.preventDefault();
        return;
      }
    }
    
    // Quest turn-in controls
    if (STATE.ui.questTurnInOpen) {
      handleQuestTurnInControls(STATE, e);
      return;
    }
    
    // Map controls
    if (STATE.ui.mapOpen) {
      handleMapControls(STATE, e);
      return;
    }
    
    // Shop controls
    if (STATE.ui.shopOpen) {
      handleShopControls(STATE, e);
      return;
    }
    
    // Inventory controls
    if (STATE.ui.inventoryOpen) {
      handleInventoryControls(STATE, e);
      return;
    }
    
    // Game controls
    if (STATE.over && e.key.toLowerCase() !== "r") return;
    handleGameControls(STATE, e);
    return;
  });
}

function handleGameControls(STATE, e) {
  const k = e.key;

  // Check if following movement path
  if (STATE.movementPath && STATE.movementPath.length > 1) {
    // Escape or any movement key cancels the automatic path
    if (k === "Escape" || k === "ArrowUp" || k === "w" || k === "ArrowDown" || k === "s" || 
        k === "ArrowLeft" || k === "a" || k === "ArrowRight" || k === "d") {
      STATE.movementPath = null;
      STATE.movementTarget = null;
      log(STATE, "Path cancelled", "dim");
      render(STATE);
      
      // If it was a movement key, also execute that movement
      if (k !== "Escape") {
        // Continue to process the movement key normally below
      } else {
        e.preventDefault();
        return;
      }
    }
  }

  // Normal movement
  if (k === "ArrowUp" || k === "w") { handlePlayerMove(STATE, 0, -1); e.preventDefault(); }
  else if (k === "ArrowDown" || k === "s") { handlePlayerMove(STATE, 0, 1); e.preventDefault(); }
  else if (k === "ArrowLeft" || k === "a") { handlePlayerMove(STATE, -1, 0); e.preventDefault(); }
  else if (k === "ArrowRight" || k === "d") { handlePlayerMove(STATE, 1, 0); e.preventDefault(); }

  // World Interaction
  else if (k === ".") { waitTurn(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "i") { openInventory(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "m") { openMap(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "q") { displayActiveQuests(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "x") { 
    // Toggle cursor mode for examining
    activateCursor('examine');
    log(STATE, "Cursor mode activated - use arrows to move cursor, Enter to examine, Escape to exit", "note");
    showCursorInfo(STATE); // Show info about what's under the cursor immediately
    render(STATE);
    e.preventDefault(); 
  }
  else if (k.toLowerCase() === "v") {
    // Check if standing next to vendor
    const positions = [
      {x: STATE.player.x, y: STATE.player.y - 1},
      {x: STATE.player.x, y: STATE.player.y + 1},
      {x: STATE.player.x - 1, y: STATE.player.y},
      {x: STATE.player.x + 1, y: STATE.player.y}
    ];
    
    for (const pos of positions) {
      if (pos.x >= 0 && pos.x < W && pos.y >= 0 && pos.y < H) {
        if (STATE.chunk.map[pos.y][pos.x] === "V") {
          interactTile(STATE, pos.x, pos.y);
          break;
        }
      }
    }
    e.preventDefault();
  }
  else if (k === "p") { // lowercase p only - Place ward on adjacent gravestone
    // Place ward on adjacent gravestone (for graveyard quest)
    if (STATE.chunk?.isGraveyard) {
      const positions = [
        {x: STATE.player.x, y: STATE.player.y - 1},
        {x: STATE.player.x, y: STATE.player.y + 1},
        {x: STATE.player.x - 1, y: STATE.player.y},
        {x: STATE.player.x + 1, y: STATE.player.y}
      ];
      
      let placedWard = false;
      for (const pos of positions) {
        if (pos.x >= 0 && pos.x < W && pos.y >= 0 && pos.y < H) {
          if (STATE.chunk.map[pos.y][pos.x] === "T") {
            // Try to place ward on this grave
            import('../world/graveyardChunk.js').then(module => {
              module.placeWardOnGrave(STATE, pos.x, pos.y);
              render(STATE);
            });
            placedWard = true;
            break;
          }
        }
      }
      
      if (!placedWard) {
        log(STATE, "Stand next to a gravestone (T) to place a ward.", "note");
      }
    } else {
      log(STATE, "You can only place wards in the graveyard.", "note");
    }
    e.preventDefault();
  }
  else if (k.toLowerCase() === "r") {
    if (STATE.chunk) saveChunk(STATE.worldSeed, STATE.cx, STATE.cy, STATE.chunk);
    window.STATE = newWorld();
    document.getElementById("log").innerHTML = "";
    render(window.STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "h") {
    log(STATE, "=== HELP ===", "note");
    log(STATE, "WASD/Arrows: Move | .: Wait | I: Inventory", "note");
    log(STATE, "X: Examine | Q: Quests | M: Map", "note");
    log(STATE, "p: Place ward (graveyard) | V: Talk to vendor", "note");
    log(STATE, "R: New Game | Walk off edges to explore", "note");
    log(STATE, "Find weapons, armor, and potions to survive!", "note");
    log(STATE, "Defeat monsters to gain XP and level up!", "note");
    log(STATE, "The graveyard is west (-1,0) from spawn!", "note");
    log(STATE, "Place wards after evening/dusk/night!", "note");
    e.preventDefault();
  }
  
  // Debug controls (always enabled for now, can add a debug flag later)
  handleDebugGameControls(STATE, e, k);
}

function handleDebugGameControls(STATE, e, k) {
  if (k.toLowerCase() === "m") {
    // Debug: Show current monsters
    log(STATE, "=== MONSTERS IN AREA ===", "magic");
    const monsters = STATE.chunk.monsters.filter(m => m.alive);
    monsters.forEach(m => {
      const ability = m.ability ? ` [${m.ability.type}]` : "";
      log(STATE, `${m.name} (${m.glyph}) HP:${m.hp}${ability}`, "note");
    });
    if (monsters.length === 0) log(STATE, "No monsters in this area", "dim");
    e.preventDefault();
  }
  else if (k.toLowerCase() === "l") {
    log(STATE, "=== DEBUG: Testing Lifesteal ===", "magic");
    applyStatusEffect(STATE.player, "lifesteal", 1, 10);
    render(STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "f") {
    // Debug: Test freeze
    log(STATE, "=== DEBUG: Testing Freeze ===", "magic");
    applyStatusEffect(STATE.player, "freeze", 2, 0);
    log(STATE, "Frozen for 2 turns!", "magic");
    log(STATE, `Status effects: ${JSON.stringify(STATE.player.statusEffects)}`, "note");
    log(STATE, `isFrozen result: ${isFrozen(STATE.player)}`, "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "b") {
    console.log("[KEYS] 'b' pressed - applying burn status");
    console.log("[KEYS] STATE.player:", STATE.player);
    applyStatusEffect(STATE.player, "burn", 3, 2);
    log(STATE, "Applied burn (3 turns, 2 damage)!", "magic");
    render(STATE);
    e.preventDefault();
  }
  else if (k === "P") { // uppercase P for debug poison
    applyStatusEffect(STATE.player, "poison", 3, 2);
    log(STATE, "Applied poison (3 turns, 2 damage)!", "magic");
    render(STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "e") {
    applyStatusEffect(STATE.player, "shock", 3, 4);
    log(STATE, "Applied shock (3 turns, 4 damage)!", "magic");
    render(STATE);
    e.preventDefault();
  }
  
  // ===== ENGINE TEST COMMANDS =====
  else if (k === "T") {
    // Test menu
    log(STATE, "════ ENGINE TEST COMMANDS ════", "magic");
    log(STATE, "1: Fire+Water interaction test", "note");
    log(STATE, "2: Freeze movement prevention", "note");
    log(STATE, "3: Stat modifiers (weaken/armor)", "note");
    log(STATE, "4: Wet+Electric instant kill", "note");
    log(STATE, "5: Apply all DOT effects", "note");
    log(STATE, "6: Test water material (step into water)", "note");
    log(STATE, "7: Test multiple status stacking", "note");
    log(STATE, "8: Test status expiration", "note");
    log(STATE, "9: Run full engine diagnostic", "note");
    e.preventDefault();
  }
  else if (k === "1" && e.shiftKey) {
    // Test fire extinguishing water
    log(STATE, "═══ TEST: Fire + Water Interaction ═══", "magic");
    log(STATE, "Applying burn first...", "note");
    applyStatusEffect(STATE.player, "burn", 5, 3);
    setTimeout(() => {
      log(STATE, "Now applying wet (should extinguish burn)...", "note");
      applyStatusEffect(STATE.player, "wet", 3, 0);
      render(STATE);
    }, 100);
    e.preventDefault();
  }
  else if (k === "2" && e.shiftKey) {
    // Test freeze prevention
    log(STATE, "═══ TEST: Freeze Movement Prevention ═══", "magic");
    applyStatusEffect(STATE.player, "freeze", 3, 0);
    log(STATE, "Applied freeze - try to move (should be prevented)", "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k === "3" && e.shiftKey) {
    // Test stat modifiers
    log(STATE, "═══ TEST: Stat Modifiers ═══", "magic");
    log(STATE, "Applying weaken (STR -3)...", "note");
    applyStatusEffect(STATE.player, "weaken", 3, 0);
    log(STATE, "Applying armor (DEF +3)...", "note");
    applyStatusEffect(STATE.player, "armor", 3, 0);
    render(STATE);
    e.preventDefault();
  }
  else if (k === "4" && e.shiftKey) {
    // Test wet + electric instant kill
    log(STATE, "═══ TEST: Wet + Electric Instant Kill ═══", "magic");
    log(STATE, "Applying wet status with high conductivity...", "note");
    applyStatusEffect(STATE.player, "wet", 5, 0);
    const wet = STATE.player.statusEffects?.find(s => s.type === 'wet');
    if (wet) wet.quantity = 50; // Ensure high conductivity
    setTimeout(() => {
      log(STATE, "Now applying shock (should be LETHAL!)...", "bad");
      applyStatusEffect(STATE.player, "shock", 1, 4);
      render(STATE);
    }, 100);
    e.preventDefault();
  }
  else if (k === "5" && e.shiftKey) {
    // Apply all DOT effects
    log(STATE, "═══ TEST: All DOT Effects ═══", "magic");
    applyStatusEffect(STATE.player, "burn", 2, 2);
    applyStatusEffect(STATE.player, "poison", 2, 2);
    applyStatusEffect(STATE.player, "shock", 2, 3);
    applyStatusEffect(STATE.player, "bleed", 2, 1);
    log(STATE, "Applied: burn, poison, shock, bleed", "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k === "6" && e.shiftKey) {
    // Test water tile conductivity
    log(STATE, "═══ TEST: Water Tile Conductivity ═══", "magic");
    log(STATE, "Find water (~) and step in it", "note");
    log(STATE, "Then press 'e' for shock to test instant kill", "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k === "7" && e.shiftKey) {
    // Test multiple stacking
    log(STATE, "═══ TEST: Status Stacking ═══", "magic");
    log(STATE, "Applying burn 3 times (should stack)...", "note");
    applyStatusEffect(STATE.player, "burn", 2, 2);
    applyStatusEffect(STATE.player, "burn", 2, 3);
    applyStatusEffect(STATE.player, "burn", 2, 1);
    log(STATE, "Check console for stacking behavior", "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k === "8" && e.shiftKey) {
    // Test expiration
    log(STATE, "═══ TEST: Quick Expiration ═══", "magic");
    applyStatusEffect(STATE.player, "burn", 1, 5);
    applyStatusEffect(STATE.player, "poison", 1, 5);
    log(STATE, "Applied 1-turn effects. Move to see expiration", "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k === "9" && e.shiftKey) {
    // Full diagnostic
    log(STATE, "═══ FULL ENGINE DIAGNOSTIC ═══", "magic");
    console.log("\n════════ ENGINE DIAGNOSTIC REPORT ════════");
    
    // Check registered statuses
    console.log("[DIAGNOSTIC] Checking registered statuses...");
    const testStatuses = ['wet', 'burn', 'poison', 'shock', 'freeze', 'weaken', 'armor'];
    testStatuses.forEach(s => {
      const tags = tagsForStatus(s);
      console.log(`  • ${s}: ${tags.length > 0 ? tags.join(', ') : 'NO TAGS (ERROR)'}`);
    });
    
    // Check phases
    console.log("\n[DIAGNOSTIC] Available phases:");
    console.log("  •", PHASE_ORDER.join(', '));
    
    // Check current status
    console.log("\n[DIAGNOSTIC] Current player status:");
    console.log(`  • HP: ${STATE.player.hp}/${STATE.player.hpMax}`);
    console.log(`  • Active effects: ${STATE.player.statusEffects?.map(e => `${e.type}(${e.turns}t)`).join(', ') || 'none'}`);
    
    // Check Map vs Array sync
    console.log("\n[DIAGNOSTIC] Map/Array synchronization:");
    const mapEffects = Status.get('player');
    const arrayEffects = STATE.player.statusEffects || [];
    console.log(`  • Map storage: ${mapEffects ? Object.keys(mapEffects).join(', ') : 'empty'}`);
    console.log(`  • Array storage: ${arrayEffects.map(e => e.type).join(', ') || 'empty'}`);
    
    if (mapEffects && arrayEffects.length > 0) {
      const inMapNotArray = Object.keys(mapEffects).filter(e => !arrayEffects.find(a => a.type === e));
      const inArrayNotMap = arrayEffects.filter(a => !mapEffects[a.type]);
      if (inMapNotArray.length > 0) console.log(`  ⚠ In Map but not Array: ${inMapNotArray.join(', ')}`);
      if (inArrayNotMap.length > 0) console.log(`  ⚠ In Array but not Map: ${inArrayNotMap.map(a => a.type).join(', ')}`);
      if (inMapNotArray.length === 0 && inArrayNotMap.length === 0) console.log(`  ✓ Map and Array are synchronized`);
    }
    
    console.log("\n════════ END DIAGNOSTIC ════════\n");
    log(STATE, "Diagnostic complete. Check console.", "note");
    e.preventDefault();
  }
  return;
}

function handleInventoryControls(STATE, e) {
  const filteredItems = STATE.player.inventory.filter(item => 
    STATE.ui.inventoryTab === 'all' || item.type === STATE.ui.inventoryTab
  );
  
  if (e.key === "ArrowUp") {
    STATE.ui.selectedIndex = Math.max(0, STATE.ui.selectedIndex - 1);
    renderInventory(STATE);
  } else if (e.key === "ArrowDown") {
    STATE.ui.selectedIndex = Math.min(filteredItems.length - 1, STATE.ui.selectedIndex + 1);
    renderInventory(STATE);
  } else if (e.key === "Tab") {
    // Tab navigation
    const tabs = ['all', 'weapon', 'armor', 'headgear', 'ring', 'potion'];
    const currentIdx = tabs.indexOf(STATE.ui.inventoryTab);
    if (e.shiftKey) {
      // Previous tab
      STATE.ui.inventoryTab = tabs[(currentIdx - 1 + tabs.length) % tabs.length];
    } else {
      // Next tab
      STATE.ui.inventoryTab = tabs[(currentIdx + 1) % tabs.length];
    }
    STATE.ui.selectedIndex = 0;
    renderInventory(STATE);
  } else if (e.key === "Enter") {
    useInventoryItem(STATE);
  } else if (e.key.toLowerCase() === "d") {
    dropInventoryItem(STATE);
  } else if (e.key.toLowerCase() === "i" || e.key === "Escape") {
    closeInventory(STATE);
  }
  e.preventDefault();
  return;
}

function handleMapControls(STATE, e) {
  const result = handleMapNavigation(STATE, e.key);
  if (result === 'close') {
    STATE.ui.mapOpen = false;  // Update state flag
    closeMap();
    render(STATE);  // Re-render the game
  } else if (result === 'travel') {
    STATE.ui.mapOpen = false;  // Update state flag
    closeMap();
    render(STATE);
    log(STATE, `Fast traveled to (${STATE.cx}, ${STATE.cy})`, "note");
  } else if (result) {
    renderMap(STATE);
  }
  e.preventDefault();
  return;
}

function handleQuestTurnInControls(STATE, e) {
  if (STATE.ui.confirmGiveEquipped) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      STATE.ui.confirmChoice = STATE.ui.confirmChoice === "yes" ? "no" : "yes";
      renderQuestTurnInConfirm(STATE);
    } else if (e.key === "Enter") {
      if (STATE.ui.confirmChoice === "yes") {
        // Proceed with giving equipped item using the stored selected item
        const selectedItem = STATE.ui.tempSelectedItem;
        const actualIndex = selectedItem.inventoryIndex;
        STATE.ui.selectedFetchItemIndex = actualIndex;
        // Keep selectingFetchItem set so claimQuestRewards knows we've selected
        // It will be cleared after the quest is turned in
        STATE.ui.confirmGiveEquipped = false;
        STATE.ui.tempSelectedItem = null;
        claimQuestRewards(STATE);
      } else {
        // Cancel - go back to item selection
        STATE.ui.confirmGiveEquipped = false;
        STATE.ui.tempSelectedItem = null;
        renderQuestTurnIn(STATE);
      }
    } else if (e.key === "Escape") {
      // Cancel - go back to item selection
      STATE.ui.confirmGiveEquipped = false;
      STATE.ui.tempSelectedItem = null;
      renderQuestTurnIn(STATE);
    }
    e.preventDefault();
    return;
  }
  // Quest selection menu
  else if (STATE.ui.selectingQuest) {
    if (e.key === "ArrowUp") {
      STATE.ui.selectedQuestIndex = Math.max(0, STATE.ui.selectedQuestIndex - 1);
      renderQuestTurnIn(STATE);
    } else if (e.key === "ArrowDown") {
      STATE.ui.selectedQuestIndex = Math.min(STATE.ui.completedQuests.length - 1, STATE.ui.selectedQuestIndex + 1);
      renderQuestTurnIn(STATE);
    } else if (e.key === "Enter") {
      // Turn in selected quest
      const selectedQuestId = STATE.ui.completedQuests[STATE.ui.selectedQuestIndex];
      STATE.ui.selectingQuest = false;
      STATE.ui.completedQuests = [selectedQuestId]; // Only turn in the selected quest
      claimQuestRewards(STATE);
    } else if (e.key.toLowerCase() === "a") {
      // Turn in all quests
      STATE.ui.selectingQuest = false;
      claimQuestRewards(STATE);
    } else if (e.key === "Escape") {
      // Cancel quest turn-in
      const vendor = STATE.ui.shopVendor;  // Save vendor before closing
      STATE.ui.questTurnInOpen = false;
      STATE.ui.completedQuests = [];
      STATE.ui.selectingQuest = false;
      
      // Close the overlay
      const overlay = document.getElementById("overlay");
      if (overlay) overlay.style.display = "none";
      
      // Need to call render to refresh the game view
      render(STATE);
      
      if (vendor) {
        setTimeout(() => {
          openVendorShop(STATE, vendor, true);  // Skip quest check when escaping
        }, 50);
      }
    }
    e.preventDefault();
    return;
  }
  // Item selection for fetch quest
  else if (STATE.ui.selectingFetchItem) {
    const fetchQuest = STATE.player.quests.fetchQuests[STATE.ui.selectingFetchItem];
    const matchingItems = [];
    STATE.player.inventory.forEach((item, idx) => {
      if (fetchQuest.targetItem.itemCheck(item)) {
        matchingItems.push({...item, inventoryIndex: idx});
      }
    });
    
    if (e.key === "ArrowUp") {
      STATE.ui.fetchItemSelectedIndex = Math.max(0, STATE.ui.fetchItemSelectedIndex - 1);
      renderQuestTurnIn(STATE);
    } else if (e.key === "ArrowDown") {
      STATE.ui.fetchItemSelectedIndex = Math.min(matchingItems.length - 1, STATE.ui.fetchItemSelectedIndex + 1);
      renderQuestTurnIn(STATE);
    } else if (e.key === "Enter") {
      // Check if selected item is equipped
      const selectedItem = matchingItems[STATE.ui.fetchItemSelectedIndex];
      const isEquipped = 
        (selectedItem.type === "weapon" && selectedItem.id === STATE.equippedWeaponId) ||
        (selectedItem.type === "armor" && selectedItem.id === STATE.equippedArmorId) ||
        (selectedItem.type === "headgear" && selectedItem.id === STATE.equippedHeadgearId);
      
      if (isEquipped && !STATE.ui.confirmGiveEquipped) {
        // Show confirmation for equipped item
        STATE.ui.confirmGiveEquipped = true;
        STATE.ui.confirmChoice = "no";
        STATE.ui.tempSelectedItem = selectedItem; // Store the selected item
        renderQuestTurnInConfirm(STATE);
      } else {
        // Proceed with giving the item
        const actualIndex = selectedItem.inventoryIndex;
        STATE.ui.selectedFetchItemIndex = actualIndex;
        STATE.ui.selectingFetchItem = null;
        STATE.ui.confirmGiveEquipped = false;
        claimQuestRewards(STATE);
      }
    } else if (e.key === "Escape") {
      // Cancel item selection
      const vendor = STATE.ui.shopVendor;  // Save vendor before closing
      STATE.ui.selectingFetchItem = null;
      STATE.ui.fetchItemSelectedIndex = 0;
      STATE.ui.questTurnInOpen = false;
      STATE.ui.completedQuests = [];
      
      // Close the overlay
      const overlay = document.getElementById("overlay");
      if (overlay) overlay.style.display = "none";
      
      // Need to call render to refresh the game view
      render(STATE);
      
      if (vendor) {
        setTimeout(() => {
          openVendorShop(STATE, vendor, true);  // Skip quest check when escaping
        }, 50);
      }
    }
  }
  // Normal quest turn-in (not selecting quest, not selecting item, not confirming)
  else {
    // Normal quest turn-in
    if (e.key === "Enter") {
      claimQuestRewards(STATE);
    } else if (e.key === "Escape") {
      // Save vendor before closing
      const vendor = STATE.ui.shopVendor;
      STATE.ui.questTurnInOpen = false;
      STATE.ui.completedQuests = [];
      
      // Close the overlay
      const overlay = document.getElementById("overlay");
      if (overlay) overlay.style.display = "none";
      
      // Need to call render to refresh the game view
      render(STATE);
      
      // Open vendor shop after a small delay
      if (vendor) {
        setTimeout(() => {
          openVendorShop(STATE, vendor, true);  // Skip quest check when escaping
        }, 50);
      }
    }
  }
  e.preventDefault();
  return;
}

function handleShopControls(STATE, e) {
  // Handle confirmation dialog
  if (STATE.ui.confirmSell) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      ShopSystem.navigateShop(STATE, 'left');
      ShopUI.renderShop(STATE);
    } else if (e.key === "Enter") {
      if (STATE.ui.confirmChoice === "yes") {
        // Proceed with selling equipped item
        const result = ShopSystem.handleSellConfirmation(STATE, true);
        ShopUI.renderShop(STATE);
      } else {
        // Cancel
        STATE.ui.confirmSell = false;
        ShopUI.renderShop(STATE);
      }
    } else if (e.key === "Escape") {
      // Cancel confirmation
      STATE.ui.confirmSell = false;
      ShopUI.renderShop(STATE);
    }
    e.preventDefault();
    return;
  }
  
  // Normal shop controls
  if (e.key === "Escape" || e.key.toLowerCase() === "v") {
    closeShop(STATE);
  } else if (e.key.toLowerCase() === "a" && STATE.ui.shopMode === "turn-in") {
    // Turn in ALL quests
    const vendor = STATE.ui.shopVendor;
    const completedFetchQuests = STATE.player.quests.active.filter(qId => {
      const fetchQuest = STATE.player.quests.fetchQuests?.[qId];
      if (fetchQuest && fetchQuest.vendorId === vendor.id) {
        return checkFetchQuestItem(STATE.player, fetchQuest);
      }
      return false;
    });
    const completedRegularQuests = STATE.player.quests.active.filter(qId => {
      const progress = STATE.player.quests.progress[qId] || 0;
      const quest = QUEST_TEMPLATES[qId];
      return quest && progress >= quest.targetCount;
    });
    const allCompletedQuests = [...completedFetchQuests, ...completedRegularQuests];
    
    if (allCompletedQuests.length > 0) {
      // Close shop UI first
      STATE.ui.shopOpen = false;
      // Open quest turn-in for all quests
      openQuestTurnIn(STATE, vendor, allCompletedQuests);
      renderQuestTurnIn(STATE);
      // Reset index
      STATE.ui.questTurnInIndex = 0;
    }
  } else if (e.key === "Tab") {
    // Toggle between buy, sell, quest, and turn-in modes
    const vendor = STATE.ui.shopVendor;
    const hasQuestToOffer = VendorQuests.hasQuestToOffer(STATE, vendor);
    
    // Check for completed quests
    const completedFetchQuests = STATE.player.quests.active.filter(qId => {
      const fetchQuest = STATE.player.quests.fetchQuests?.[qId];
      if (fetchQuest && fetchQuest.vendorId === vendor.id) {
        return checkFetchQuestItem(STATE.player, fetchQuest);
      }
      return false;
    });
    const completedRegularQuests = STATE.player.quests.active.filter(qId => {
      const progress = STATE.player.quests.progress[qId] || 0;
      const quest = QUEST_TEMPLATES[qId];
      return quest && progress >= quest.targetCount;
    });
    const hasCompletedQuests = completedFetchQuests.length > 0 || completedRegularQuests.length > 0;
    
    if (STATE.ui.shopMode === "buy") {
      ShopSystem.switchShopMode(STATE, "sell");
    } else if (STATE.ui.shopMode === "sell") {
      if (hasCompletedQuests) {
        ShopSystem.switchShopMode(STATE, "turn-in");
      } else if (hasQuestToOffer) {
        ShopSystem.switchShopMode(STATE, "quest");
      } else {
        ShopSystem.switchShopMode(STATE, "buy");
      }
    } else if (STATE.ui.shopMode === "turn-in") {
      ShopSystem.switchShopMode(STATE, hasQuestToOffer ? "quest" : "buy");
    } else if (STATE.ui.shopMode === "quest") {
      ShopSystem.switchShopMode(STATE, "buy");
    }
    ShopUI.renderShop(STATE);
    e.preventDefault();  // Prevent browser's default tab behavior
  } else if (e.key === "ArrowUp") {
    if (STATE.ui.shopMode !== "quest" && STATE.ui.shopMode !== "turn-in") {
      ShopSystem.navigateShop(STATE, 'up');
      ShopUI.renderShop(STATE);
    } else if (STATE.ui.shopMode === "turn-in") {
      // Navigate quest selection in turn-in mode
      STATE.ui.questTurnInIndex = Math.max(0, (STATE.ui.questTurnInIndex || 0) - 1);
      ShopUI.renderShop(STATE);
    }
  } else if (e.key === "ArrowDown") {
    if (STATE.ui.shopMode !== "quest" && STATE.ui.shopMode !== "turn-in") {
      ShopSystem.navigateShop(STATE, 'down');
      ShopUI.renderShop(STATE);
    } else if (STATE.ui.shopMode === "turn-in") {
      // Navigate quest selection in turn-in mode
      const vendor = STATE.ui.shopVendor;
      const completedFetchQuests = STATE.player.quests.active.filter(qId => {
        const fetchQuest = STATE.player.quests.fetchQuests?.[qId];
        if (fetchQuest && fetchQuest.vendorId === vendor.id) {
          return checkFetchQuestItem(STATE.player, fetchQuest);
        }
        return false;
      });
      const completedRegularQuests = STATE.player.quests.active.filter(qId => {
        const progress = STATE.player.quests.progress[qId] || 0;
        const quest = QUEST_TEMPLATES[qId];
        return quest && progress >= quest.targetCount;
      });
      const allCompletedQuests = [...completedFetchQuests, ...completedRegularQuests];
      STATE.ui.questTurnInIndex = Math.min(allCompletedQuests.length - 1, (STATE.ui.questTurnInIndex || 0) + 1);
      ShopUI.renderShop(STATE);
    }
  } else if (e.key === "Enter") {
    if (STATE.ui.shopMode === "buy") {
      handleBuyFromVendor(STATE);
    } else if (STATE.ui.shopMode === "sell") {
      handleSellToVendor(STATE);
    } else if (STATE.ui.shopMode === "turn-in") {
      // Turn in the selected quest
      const vendor = STATE.ui.shopVendor;
      const completedFetchQuests = STATE.player.quests.active.filter(qId => {
        const fetchQuest = STATE.player.quests.fetchQuests?.[qId];
        if (fetchQuest && fetchQuest.vendorId === vendor.id) {
          return checkFetchQuestItem(STATE.player, fetchQuest);
        }
        return false;
      });
      const completedRegularQuests = STATE.player.quests.active.filter(qId => {
        const progress = STATE.player.quests.progress[qId] || 0;
        const quest = QUEST_TEMPLATES[qId];
        return quest && progress >= quest.targetCount;
      });
      const allCompletedQuests = [...completedFetchQuests, ...completedRegularQuests];
      
      if (allCompletedQuests.length > 0) {
        const selectedIndex = STATE.ui.questTurnInIndex || 0;
        const selectedQuest = allCompletedQuests[selectedIndex];
        
        if (selectedQuest) {
          // Close shop UI first
          STATE.ui.shopOpen = false;
          // Open quest turn-in for just the selected quest
          openQuestTurnIn(STATE, vendor, [selectedQuest]);
          renderQuestTurnIn(STATE);
          // Reset index for next time
          STATE.ui.questTurnInIndex = 0;
        }
      }
    } else if (STATE.ui.shopMode === "quest") {
      // Accept quest from vendor
      const vendor = STATE.ui.shopVendor;
      const result = VendorQuests.acceptVendorQuest(STATE, vendor);
      
      if (result.success) {
        // Close shop after accepting quest
        closeShop(STATE);
      } else {
        log(STATE, result.message || "Cannot accept quest", "note");
      }
    }
  }
  e.preventDefault();
  return;
}// Shop handler functions to add to keys.js

function handleBuyFromVendor(STATE) {
  const vendor = STATE.ui.shopVendor;
  if (!vendor) return;
  
  const result = ShopSystem.purchaseItem(STATE, vendor.id, STATE.ui.shopSelectedIndex);
  
  if (result.success) {
    ShopUI.renderShop(STATE);
    
    if (result.vendorEmpty) {
      closeShop(STATE);
    }
  }
}

function handleSellToVendor(STATE) {
  if (STATE.ui.confirmSell) {
    const result = ShopSystem.handleSellConfirmation(STATE, true);
    ShopUI.renderShop(STATE);
    return;
  }
  
  const sellableItems = STATE.player.inventory.filter(item => 
    item.type === 'weapon' || 
    item.type === 'armor' || 
    item.type === 'headgear' || 
    item.type === 'ring' ||
    item.type === 'potion'
  );
  
  const selectedItem = sellableItems[STATE.ui.shopSelectedIndex];
  if (!selectedItem) return;
  
  const actualIndex = STATE.player.inventory.indexOf(selectedItem);
  const result = ShopSystem.sellItem(STATE, actualIndex);
  
  if (result.needsConfirmation) {
    STATE.ui.confirmSell = true;
    STATE.ui.confirmChoice = 'no';
    ShopUI.renderShop(STATE);
  } else if (result.success) {
    ShopUI.renderShop(STATE);
  }
}

async function handleCursorControls(STATE, e) {
  const k = e.key;
  
  // Check if dropdown is open first
  const { isDropdownOpen } = await import('../ui/dropdown.js');
  if (isDropdownOpen()) {
    // Let dropdown handle the input
    return;
  }
  
  // Movement (arrows and WASD)
  if (k === "ArrowUp" || k === "w" || k === "W") {
    moveCursor(0, -1, e.shiftKey);
    showCursorInfo(STATE);
    render(STATE);
    e.preventDefault();
  } else if (k === "ArrowDown" || k === "s" || k === "S") {
    moveCursor(0, 1, e.shiftKey);
    showCursorInfo(STATE);
    render(STATE);
    e.preventDefault();
  } else if (k === "ArrowLeft" || k === "a" || k === "A") {
    moveCursor(-1, 0, e.shiftKey);
    showCursorInfo(STATE);
    render(STATE);
    e.preventDefault();
  } else if (k === "ArrowRight" || k === "d" || k === "D") {
    moveCursor(1, 0, e.shiftKey);
    showCursorInfo(STATE);
    render(STATE);
    e.preventDefault();
  }
  // Actions
  else if (k === "Enter") {
    // Check if we're in throw mode - if so, just execute the throw
    const cursorState = getCursorState();
    if (cursorState.mode === 'throw') {
      executeCursorAction();
      render(STATE);
      e.preventDefault();
      return;
    }
    
    const info = getInfoAtCursor();
    
    if (info) {
      // Show dropdown menu for any tile (except in throw mode)
      import('../ui/dropdown.js').then(({ createDropdown }) => {
        import('../movement/pathfinding.js').then(({ findPath, isWalkable }) => {
          const menuOptions = [];
          
          // Check if clicking on a monster
          if (info.monster) {
            const attackPath = findPath(
              STATE, 
              STATE.player.x, 
              STATE.player.y,
              info.x,
              info.y,
              { allowAdjacent: true }
            );
            
            menuOptions.push({
              label: 'Attack',
              icon: '⚔',
              disabled: !attackPath || attackPath.length <= 1,
              action: () => {
                deactivateCursor();
                STATE.movementPath = attackPath;
                STATE.movementTarget = { x: info.x, y: info.y, isAttack: true };
                log(STATE, `Moving to attack ${info.monster.name}...`, "note");
                render(STATE);
                // Start automatic movement
                setTimeout(() => {
                  if (STATE.movementPath && STATE.movementPath.length > 1) {
                    handlePlayerMove(STATE, 0, 0);
                  }
                }, 100);
              }
            });
            
            menuOptions.push({
              label: 'Inspect',
              icon: '👁',
              action: () => {
                let desc = `${info.monster.name}: HP ${info.monster.hp}/${info.monster.hpMax}`;
                if (info.distance) {
                  desc += ` (${info.distance} tiles away)`;
                }
                
                // Add status effects if any
                if (info.monster.statuses && info.monster.statuses.length > 0) {
                  const statusStrings = info.monster.statuses.map(status => {
                    let statusText = status.name;
                    if (status.turns > 0) {
                      statusText += ` (${status.turns}t)`;
                    }
                    if (status.value > 0 && ['Burning', 'Poisoned', 'Shocked'].includes(status.name)) {
                      statusText += ` [${status.value} dmg/turn]`;
                    }
                    return statusText;
                  });
                  desc += ` | Status: ${statusStrings.join(', ')}`;
                } else {
                  desc += ' | Status: None';
                }
                
                log(STATE, desc, "note");
                render(STATE);
              }
            });
          } else {
            // For non-monster tiles, check if we can move there
            const movePath = findPath(
              STATE,
              STATE.player.x,
              STATE.player.y,
              info.x,
              info.y
            );
            
            // Only show Move option for walkable tiles
            if (info.tile !== '#' && info.tile !== ' ') {
              menuOptions.push({
                label: 'Move',
                icon: '→',
                disabled: !movePath || movePath.length <= 1,
                action: () => {
                  deactivateCursor();
                  STATE.movementPath = movePath;
                  STATE.movementTarget = { x: info.x, y: info.y, isAttack: false };
                  log(STATE, `Moving to (${info.x}, ${info.y})...`, "note");
                  render(STATE);
                  // Start automatic movement
                  setTimeout(() => {
                    if (STATE.movementPath && STATE.movementPath.length > 1) {
                      handlePlayerMove(STATE, 0, 0);
                    }
                  }, 100);
                }
              });
            }
            
            menuOptions.push({
              label: 'Inspect',
              icon: '👁',
              action: () => {
                let desc = `Tile at (${info.x}, ${info.y}): `;
                if (info.item) {
                  desc += `${info.item.name || info.item.type}`;
                } else if (info.tile === '#') {
                  desc += "Wall";
                } else if (info.tile === '.') {
                  desc += "Floor";
                } else if (info.tile === '+') {
                  desc += "Door";
                } else if (info.tile === 'V') {
                  desc += "Vendor";
                } else if (info.tile === '$') {
                  desc += "Chest";
                } else {
                  desc += info.tile || "Empty";
                }
                if (info.distance !== null) {
                  desc += ` [${info.distance} tiles away]`;
                }
                log(STATE, desc, "note");
                render(STATE);
              }
            });
          }
          
          // Only show dropdown if we have options
          if (menuOptions.length > 0) {
            createDropdown(info.x, info.y, menuOptions, STATE);
          }
        });
      });
    } else {
      log(STATE, "Nothing here", "dim");
      render(STATE);
    }
    e.preventDefault();
  }
  // Exit cursor mode
  else if (k === "Escape" || k.toLowerCase() === "x") {
    deactivateCursor();
    log(STATE, "Cursor mode deactivated", "dim");
    render(STATE);
    e.preventDefault();
  }
}