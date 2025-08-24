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
} from '../game.js';
import { openQuestTurnIn } from '../systems/questTurnIn.js';
import * as ShopSystem from '../systems/shop.js';
import * as ShopUI from '../ui/shop.js';
import * as VendorQuests from '../systems/vendorQuests.js';
import { saveChunk } from '../persistence.js';
import { openInventory, closeInventory, useInventoryItem, dropInventoryItem, renderInventory } from '../inventory.js';
import { handleMapNavigation } from '../worldMap.js';
import { openMap, closeMap, renderMap } from '../ui/map.js';
import { displayActiveQuests, hasQuest, giveQuest, checkFetchQuestItem } from '../quests.js';
import { QUEST_TEMPLATES } from '../config.js';
import { applyStatusEffect, isFrozen } from '../systems/statusSystem.js';
import { emit } from '../events.js';
import { EventType } from '../eventTypes.js';
import { W, H } from '../config.js';

// Initialize keyboard controls
export function initKeyboardControls() {
  window.addEventListener("keydown", e => {
    // Use window.STATE to always get the current STATE object
    const STATE = window.STATE;
    if (!STATE) return;
    
    // Prevent Tab key from selecting HTML elements when any UI is open
    if (e.key === "Tab" && (STATE.ui.questTurnInOpen || STATE.ui.mapOpen || 
        STATE.ui.shopOpen || STATE.ui.inventoryOpen)) {
      e.preventDefault();
      e.stopPropagation();
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

  // Movement
  if (k === "ArrowUp" || k === "w") { handlePlayerMove(STATE, 0, -1); e.preventDefault(); }
  else if (k === "ArrowDown" || k === "s") { handlePlayerMove(STATE, 0, 1); e.preventDefault(); }
  else if (k === "ArrowLeft" || k === "a") { handlePlayerMove(STATE, -1, 0); e.preventDefault(); }
  else if (k === "ArrowRight" || k === "d") { handlePlayerMove(STATE, 1, 0); e.preventDefault(); }

  // World Interaction
  else if (k === ".") { waitTurn(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "i") { openInventory(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "m") { openMap(STATE); e.preventDefault(); }
  else if (k.toLowerCase() === "q") { displayActiveQuests(STATE); e.preventDefault(); }
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
    log(STATE, "R: New Game | Walk off edges to explore", "note");
    log(STATE, "Find weapons, armor, and potions to survive!", "note");
    log(STATE, "Defeat monsters to gain XP and level up!", "note");
    e.preventDefault();
  }
  
  // Debug controls (always enabled for now, can add a debug flag later)
  handleDebugGameControls(STATE, e, k);
  return;
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
    emit(EventType.StatusEffectRegister, { 
      type: "freeze", 
      vs: "You",
      toId: "player",
      turns: 2,
      value: 0
    });
    log(STATE, "Applied freeze effect for 2 turns (press F for testing)", "magic");
    log(STATE, `Status effects: ${JSON.stringify(STATE.player.statusEffects)}`, "note");
    log(STATE, `isFrozen result: ${isFrozen(STATE.player)}`, "note");
    render(STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "b") {
    applyStatusEffect(STATE.player, "burn", 3, 2);
    emit(EventType.StatusEffectRegister, { 
      type: "burn", 
      vs: "You",
      toId: "player",
      turns: 3,
      value: 2
    });
    log(STATE, "Applied burn effect (press B for testing)", "magic");
    render(STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "p") {
    applyStatusEffect(STATE.player, "poison", 3, 2);
    emit(EventType.StatusEffectRegister, { 
      type: "poison", 
      vs: "You",
      toId: "player",
      turns: 3,
      value: 2
    });
    log(STATE, "Applied poison effect (press P for testing)", "magic");
    render(STATE);
    e.preventDefault();
  }
  else if (k.toLowerCase() === "e") {
    applyStatusEffect(STATE.player, "shock", 2, 3);
    emit(EventType.StatusEffectRegister, { 
      type: "shock", 
      vs: "You",
      toId: "player",
      turns: 2,
      value: 3
    });
    log(STATE, "Applied shock effect (press E for testing)", "magic");
    render(STATE);
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