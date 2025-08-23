import { W, H, TILE, QUOTES, WEAPONS, ARMORS, HEADGEAR, RINGS, POTIONS, TIMES, WEATHERS, QUEST_TEMPLATES, FETCH_ITEMS } from './config.js';
import { rnd, choice, esc } from './utils.js';
import { makePlayer, levelUp } from './entities.js';
import { genChunk, findOpenSpot } from './worldGen.js';
import { saveChunk, loadChunk, clearWorld } from './persistence.js';
import { attack } from './combat.js';
import { processStatusEffects, getStatusModifier, applyStatusEffect, isFrozen } from './statusEffects.js';
import { openInventory, closeInventory, renderInventory, useInventoryItem, dropInventoryItem } from './inventory.js';
import { initMapCursor, renderWorldMap, handleMapNavigation } from './worldMap.js';
import { turnInQuest, hasQuest, getQuestStatus, giveQuest, displayActiveQuests, checkFetchQuestItem, turnInFetchQuest, turnInFetchQuestWithItem } from './quests.js';
import { mountLog } from './log.js';
import { on, emit } from './events.js'
import { EventType } from './eventTypes.js';
import { Move } from './actions.js';
import { runPlayerMove } from './movePipeline.js';
import { isBlocked } from './queries.js';
import * as ShopSystem from './systems/shop.js';
import * as ShopUI from './ui/shop.js';
import * as VendorQuests from './systems/vendorQuests.js';
import { initMapUI, MapEvents, isMapOpen, renderMap } from './ui/map.js';
import { initQuestUI, QuestEvents, isQuestUIOpen } from './ui/quests.js';
import { endOfTurnStatusPass } from './systems/statusSystem.js';
import { runOnTurnEndHooks, getGearMods } from './gear/effects.js';
import { initKeyboardControls } from './input/keys.js';

// Game state
let STATE = null;
mountLog(document.getElementById('logger'));
emit(EventType.Log, { text: 'CavesOfOoo booting…', cls: 'note' });

export function log(state, text, cls = null) { 
  const span = cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text);
  state.logMessages.push(span);
}

function setText(id, text) { 
  const el = document.getElementById(id);
  if (el) el.textContent = text; 
}

// Helper to generate unique IDs
let nextItemId = 1;
function generateItemId() {
  return `item_${nextItemId++}`;
}

// Helper to add potion with stacking
function addPotionToInventory(state, potion) {
  // Check if we already have this potion type
  const existingPotion = state.player.inventory.find(
    i => i.type === "potion" && i.item.name === potion.name
  );
  
  if (existingPotion) {
    // Stack it
    existingPotion.count = (existingPotion.count || 1) + 1;
  } else {
    // Add new stack
    state.player.inventory.push({
      type: "potion",
      item: { ...potion },
      id: generateItemId(),
      count: 1
    });
  }
  state.player.potionCount++;
}

// Vendor shop functions
export function openVendorShop(state, vendor) {
  // Initialize vendor quest if needed
  VendorQuests.initializeVendorQuest(state, vendor);
  
  // Check for completed quests first
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
  
  const allCompletedQuests = [...completedFetchQuests, ...completedRegularQuests];
  
  if (allCompletedQuests.length > 0) {
    // Show quest turn-in option first
    openQuestTurnIn(state, vendor, allCompletedQuests);
  } else {
    // Use systems/shop.js to open shop (handles vendor initialization)
    ShopSystem.openShop(state, vendor);
    // Use ui/shop.js to render
    ShopUI.renderShop(state);
  }
}

export function closeShop(state) {
  // Use systems/shop.js to handle closing (manages state)
  ShopSystem.closeShop(state);
  // UI will auto-close via event listener
  render(state);
}

// Quest turn-in functions
function openQuestTurnIn(state, vendor, completedQuests) {
  // Prevent opening if already open or if shop is open
  if (state.ui.questTurnInOpen || state.ui.shopOpen) {
    return;
  }
  
  state.ui.questTurnInOpen = true;
  state.ui.shopVendor = vendor;
  state.ui.completedQuests = completedQuests;
  state.ui.allCompletedQuests = [...completedQuests]; // Store all for tracking
  state.ui.selectedQuestIndex = 0;
  state.ui.selectingQuest = completedQuests.length > 1; // Show selection if multiple quests
  renderQuestTurnIn(state);
}

export function renderQuestTurnIn(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  const title = document.getElementById("overlayTitle");
  const hint = document.getElementById("overlayHint");
  
  overlay.style.display = "flex";
  
  // Check if we need to select an item for a fetch quest
  if (state.ui.selectingFetchItem) {
    title.textContent = "SELECT ITEM TO GIVE";
    
    const fetchQuest = state.player.quests.fetchQuests[state.ui.selectingFetchItem];
    const matchingItems = [];
    state.player.inventory.forEach((item, idx) => {
      if (fetchQuest.targetItem.itemCheck(item)) {
        matchingItems.push({...item, inventoryIndex: idx});
      }
    });
    
    let itemsHtml = '<div class="item-list">';
    matchingItems.forEach((item, idx) => {
      const isSelected = idx === state.ui.fetchItemSelectedIndex;
      const isEquipped = 
        (item.type === "weapon" && item.id === state.equippedWeaponId) ||
        (item.type === "armor" && item.id === state.equippedArmorId) ||
        (item.type === "headgear" && item.id === state.equippedHeadgearId);
      
      const typeSymbol = item.type === "potion" ? "!" : 
                         item.type === "weapon" ? "/" : 
                         item.type === "armor" ? "]" : "^";
      
      let statsText = "";
      if (item.type === "weapon") {
        statsText = ` [DMG: ${item.item.dmg}]`;
        if (item.item.effect) statsText += ` [${item.item.effect}]`;
      } else if (item.type === "armor") {
        statsText = ` [DEF: ${item.item.def}]`;
      } else if (item.type === "headgear") {
        const stats = [];
        if (item.item.def) stats.push(`DEF: ${item.item.def}`);
        if (item.item.str) stats.push(`STR: ${item.item.str}`);
        if (item.item.spd) stats.push(`SPD: ${item.item.spd}`);
        if (item.item.magic) stats.push(`MAG: ${item.item.magic}`);
        if (stats.length > 0) statsText = ` [${stats.join(", ")}]`;
      }
      
      itemsHtml += `
        <div class="item ${isSelected ? 'selected' : ''}" style="padding: 5px; ${isSelected ? 'border: 1px solid var(--accent);' : ''}">
          <div>${typeSymbol} ${item.item.name}${statsText} ${isEquipped ? '<span style="color: var(--ok)">[EQUIPPED]</span>' : ''}</div>
          ${item.item.desc ? `<div style="color: var(--dim); font-size: 0.9em;">${item.item.desc}</div>` : ''}
        </div>
      `;
    });
    itemsHtml += '</div>';
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="color: var(--note);">The vendor needs: ${fetchQuest.targetItem.name}</div>
        <div style="color: var(--dim); margin-top: 10px;">Select which item to give:</div>
      </div>
      ${itemsHtml}
    `;
    
    hint.textContent = "[↑↓] Select • [Enter] Give Item • [Esc] Cancel";
    return;
  }
  
  // Quest selection menu
  if (state.ui.selectingQuest) {
    title.textContent = "SELECT QUEST TO TURN IN";
    
    const quests = state.ui.completedQuests.map((qId, idx) => {
      const isSelected = idx === state.ui.selectedQuestIndex;
      
      // Check if it's a fetch quest
      const fetchQuest = state.player.quests.fetchQuests?.[qId];
      if (fetchQuest) {
        const hasItem = checkFetchQuestItem(state.player, fetchQuest);
        return `
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--dim)'}; border-radius: 4px; ${isSelected ? 'background: rgba(255, 255, 255, 0.05);' : ''}">
            <div style="color: var(--good); font-weight: bold;">✓ ${fetchQuest.name}</div>
            <div style="color: var(--dim); margin: 5px 0;">${fetchQuest.objective}</div>
            ${!hasItem ? '<div style="color: var(--danger);">⚠️ Missing required item!</div>' : ''}
            <div style="color: var(--accent);">
              Rewards: ${fetchQuest.rewards.gold} gold, ${fetchQuest.rewards.xp} XP
              ${fetchQuest.rewards.item ? `, ${fetchQuest.rewards.item.item.name}` : ''}
            </div>
          </div>
        `;
      } else {
        // Regular quest
        const quest = QUEST_TEMPLATES[qId];
        if (!quest) return ''; // Skip if quest doesn't exist
        return `
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--dim)'}; border-radius: 4px; ${isSelected ? 'background: rgba(255, 255, 255, 0.05);' : ''}">
            <div style="color: var(--good); font-weight: bold;">✓ ${quest.name}</div>
            <div style="color: var(--dim); margin: 5px 0;">${quest.objective}</div>
            <div style="color: var(--accent);">
              Rewards: ${quest.rewards.gold} gold, ${quest.rewards.xp} XP
              ${quest.rewards.item ? `, ${quest.rewards.item.item.name}` : ''}
            </div>
          </div>
        `;
      }
    }).join('');
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="color: var(--note);">You have multiple completed quests. Select which one to turn in:</div>
      </div>
      ${quests}
    `;
    
    hint.textContent = "[↑↓] Select • [Enter] Turn In Quest • [A] Turn In All • [Esc] Cancel";
    return;
  }
  
  title.textContent = "QUEST COMPLETE!";
  
  const quests = state.ui.completedQuests.map(qId => {
    // Check if it's a fetch quest
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest) {
      return `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--dim); border-radius: 4px;">
          <div style="color: var(--good); font-weight: bold;">✓ ${fetchQuest.name}</div>
          <div style="color: var(--dim); margin: 5px 0;">${fetchQuest.objective}</div>
          <div style="color: var(--accent);">
            Rewards: ${fetchQuest.rewards.gold} gold, ${fetchQuest.rewards.xp} XP
            ${fetchQuest.rewards.item ? `, ${fetchQuest.rewards.item.item.name}` : ''}
          </div>
        </div>
      `;
    } else {
      // Regular quest
      const quest = QUEST_TEMPLATES[qId];
      if (!quest) return ''; // Skip if quest doesn't exist
      return `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--dim); border-radius: 4px;">
          <div style="color: var(--good); font-weight: bold;">✓ ${quest.name}</div>
          <div style="color: var(--dim); margin: 5px 0;">${quest.objective}</div>
          <div style="color: var(--accent);">
            Rewards: ${quest.rewards.gold} gold, ${quest.rewards.xp} XP
            ${quest.rewards.item ? `, ${quest.rewards.item.item.name}` : ''}
          </div>
        </div>
      `;
    }
  }).join('');
  
  content.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="color: var(--xp); font-size: 1.2em;">The vendor is impressed!</div>
    </div>
    ${quests}
  `;
  
  hint.textContent = "Press Enter to claim rewards • Esc to skip to shop";
}

export function renderQuestTurnInConfirm(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  const title = document.getElementById("overlayTitle");
  const hint = document.getElementById("overlayHint");
  
  overlay.style.display = "flex";
  title.textContent = "⚠️ WARNING ⚠️";
  
  content.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <p style="color: var(--fg); margin-bottom: 20px;">You are about to give away an <span style="color: var(--ok)">EQUIPPED</span> item!</p>
      <p style="color: var(--accent); margin-bottom: 30px;">Are you sure you want to give it to the vendor?</p>
      <div style="display: flex; gap: 40px; justify-content: center; font-size: 18px;">
        <div style="padding: 10px 20px; border: 2px solid ${state.ui.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'}; border-radius: 4px; color: ${state.ui.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'};">
          YES
        </div>
        <div style="padding: 10px 20px; border: 2px solid ${state.ui.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'}; border-radius: 4px; color: ${state.ui.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'};">
          NO
        </div>
      </div>
    </div>
  `;
  
  hint.textContent = "[←→] Select • [Enter] Confirm • [Esc] Cancel";
}

export function claimQuestRewards(state, questsToTurnIn = null) {
  // Use provided quests or all completed quests
  const quests = questsToTurnIn || state.ui.completedQuests;
  
  // Check if there are any fetch quests that need item selection
  const fetchQuestsNeedingSelection = quests.filter(qId => {
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (!fetchQuest) return false;
    
    // Check if player has the item
    if (!checkFetchQuestItem(state.player, fetchQuest)) return false;
    
    // Always show selection for equipment (weapon, armor, headgear)
    // For consumables (potions), only show if multiple matches
    const matchingItems = state.player.inventory.filter(item => 
      fetchQuest.targetItem.itemCheck(item)
    );
    
    if (matchingItems.length === 0) return false;
    
    // Always show selection for equipment items
    const firstMatch = matchingItems[0];
    if (firstMatch.type === "weapon" || firstMatch.type === "armor" || firstMatch.type === "headgear") {
      return true; // Always show selection for equipment
    }
    
    // For other items (like potions), only show if multiple
    return matchingItems.length > 1;
  });
  
  // If we need to select an item and haven't yet
  // But skip if we already have a selected item index
  if (fetchQuestsNeedingSelection.length > 0 && !state.ui.selectingFetchItem && state.ui.selectedFetchItemIndex === undefined) {
    // Start item selection for the first fetch quest
    state.ui.selectingFetchItem = fetchQuestsNeedingSelection[0];
    state.ui.fetchItemSelectedIndex = 0;
    state.ui.completedQuests = quests; // Update to only the quests we're turning in
    renderQuestTurnIn(state);
    return;
  }
  
  // Process all quests
  quests.forEach(qId => {
    // Check if it's a fetch quest
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest) {
      // If we had item selection, use the selected item
      if (state.ui.selectedFetchItemIndex !== undefined) {
        turnInFetchQuestWithItem(state, qId, state.ui.shopVendor, state.ui.selectedFetchItemIndex);
        state.ui.selectedFetchItemIndex = undefined;
      } else {
        // Otherwise use the first matching item
        turnInFetchQuest(state, qId, state.ui.shopVendor);
      }
    } else {
      turnInQuest(state, qId);
    }
  });
  
  // Give new quest after turning in starter
  if (quests.includes("kill_any")) {
    // Give a random quest from available ones
    const nextQuests = ["kill_goober", "kill_three"];
    const nextQuest = nextQuests[Math.floor(Math.random() * nextQuests.length)];
    giveQuest(state, nextQuest);
  }
  
  // Check if there are more quests to turn in
  // Filter out quests that were just turned in
  const remainingQuests = state.ui.allCompletedQuests ? 
    state.ui.allCompletedQuests.filter(qId => {
      // Don't include quests we just turned in
      if (quests.includes(qId)) return false;
      
      // Check if quest is still actually completed and ready to turn in
      const fetchQuest = state.player.quests.fetchQuests?.[qId];
      if (fetchQuest) {
        // For fetch quests, check if we still have the item
        return checkFetchQuestItem(state.player, fetchQuest);
      } else {
        // For regular quests, check if it's still in active quests
        if (!state.player.quests.active.includes(qId)) return false;
        const quest = QUEST_TEMPLATES[qId];
        if (!quest) return false;
        const progress = state.player.quests.progress[qId] || 0;
        return progress >= quest.targetCount;
      }
    }) : [];
  
  if (remainingQuests.length > 0) {
    // Still have quests to turn in, go back to selection
    state.ui.completedQuests = remainingQuests;
    state.ui.allCompletedQuests = remainingQuests; // Update the list
    state.ui.selectingQuest = remainingQuests.length > 1;
    state.ui.selectedQuestIndex = 0;
    state.ui.selectingFetchItem = null;
    state.ui.fetchItemSelectedIndex = 0;
    renderQuestTurnIn(state);
  } else {
    // Close quest turn-in UI
    state.ui.questTurnInOpen = false;
    state.ui.completedQuests = [];
    state.ui.allCompletedQuests = null;
    state.ui.selectingFetchItem = null;
    state.ui.fetchItemSelectedIndex = 0;
    state.ui.selectingQuest = false;
    
    // Close overlay first
    const overlay = document.getElementById("overlay");
    overlay.style.display = "none";
    
    // Then open shop after a brief delay
    setTimeout(() => {
      openVendorShop(state, state.ui.shopVendor);
    }, 100);
  }
}

function openMap(state) {
  state.ui.mapOpen = true;
  emit(MapEvents.OpenWorldMap, { state });
}

function closeMap(state) {
  state.ui.mapOpen = false;
  emit(MapEvents.CloseWorldMap);
  render(state);
}

export function renderShop(state) {
  // Delegate all rendering to the UI module
  ShopUI.renderShop(state);
}


export function interactTile(state, x, y) {
  // Check bounds
  if (y < 0 || y >= H || x < 0 || x >= W) return;
  if (!state.chunk?.map?.[y]?.[x]) return;
  
  const tile = state.chunk.map[y][x];
  if (!state.chunk.items) state.chunk.items = [];
  const items = state.chunk.items;
  
  // Vendor interaction
  if (tile === "V") {
    const vendor = items.find(i => i.type === "vendor" && i.x === x && i.y === y);
    if (vendor) {
      log(state, "\"Hello, adventurer! Take a look at my wares!\"", "note");
      // Delay vendor shop opening to next tick to avoid UI conflicts
      setTimeout(() => {
        openVendorShop(state, vendor);
      }, 0);
    }
    return; // Don't auto-pickup vendors!
  }
  
  if (tile === "★") {
    log(state, choice([
      "A diary speaks: 'I dreamed I was a butterfly...'",
      "A music box plays a forgotten lullaby.",
      "An old crown whispers of lost kingdoms."
    ]), "rare");
    state.chunk.map[y][x] = ".";
    state.player.xp += 5;
    log(state, "+5 XP from artifact!", "xp");
    
    // Check for level up
    if (state.player.xp >= state.player.xpNext) {
      levelUp(state);
    }
  } else if (tile === "♪") {
    log(state, choice([
      // Original messages
      "The floor hums with ancient magic.",
      "A voice echoes: 'Remember to be awesome.'",
      "Time feels stretchy here, like taffy.",
      
      // New mystical/philosophical
      "You hear the universe giggling softly.",
      "Something here remembers being a star.",
      "The air tastes like purple nostalgia.",
      "Reality hiccups. You pretend not to notice.",
      "This spot exists in seven dimensions. You can feel three.",
      "A memory that isn't yours floats by.",
      "The ground purrs like a sleepy cosmic cat.",
      "You smell colors and see sounds for a moment.",
      "Gravity feels optional here.",
      "The shadows are dancing to silent music.",
      "You briefly understand everything, then forget.",
      "Time moves sideways for exactly three seconds.",
      "The walls are dreaming about being clouds.",
      "You hear tomorrow's echo.",
      "Something whispers your true name backwards.",
      
      // Adventure Time vibes
      "Mathematical! This place is algebraic!",
      "The dungeon sighs contentedly.",
      "You feel inexplicably radical.",
      "A ghostly voice says 'What time is it?'",
      "Everything turns sepia-toned briefly.",
      "You taste bacon pancakes... somehow.",
      "The stones remember better days.",
      "Reality does a little flip. Neat!",
      
      // Funny/whimsical
      "Your reflection winks at you from nowhere.",
      "The floor apologizes for being cold.",
      "You hear someone humming off-key nearby. It's you.",
      "A dust mote does a tiny backflip.",
      "The darkness feels unusually friendly.",
      "Your shadow high-fives itself.",
      "Something invisible boops your nose.",
      "The silence is uncomfortably loud.",
      "You feel briefly taller. Or is everything else shorter?",
      "The air sparkles with unfinished thoughts.",
      
      // Cryptic/mysterious
      "The number 47 appears in your mind.",
      "You see a door that was never there.",
      "Someone left their dreams here.",
      "The walls know your middle name.",
      "You hear dice rolling in the distance.",
      "A clock ticks thirteen times.",
      "The darkness has been expecting you.",
      "You find a memory you haven't made yet.",
      "The stones spell out words in a language you almost know.",
      "You see your past self for half a second.",
      
      // Sensory/atmospheric
      "It smells like rain on another planet.",
      "The temperature can't decide what it wants to be.",
      "Light bends wrong here.",
      "You hear the sound of melting starlight.",
      "The air feels thick with possibility.",
      "Everything glows slightly from within.",
      "The darkness has texture, like velvet.",
      "You taste copper pennies and childhood.",
      "The floor ripples like water, but stays solid.",
      "Sounds echo before they're made.",
      
      // Meta/existential
      "You suddenly wonder if you're the NPC.",
      "The universe pauses to buffer.",
      "Someone pressed pause, but you can still move.",
      "You feel observed by friendly eyes.",
      "The code shows through for a moment.",
      "Reality.exe has stopped responding. Continue anyway?",
      "You gain one point of existential awareness.",
      "The fourth wall feels thin here.",
      "You hear the sound of dice rolling.",
      "A loading bar appears above your head briefly."
    ]), "magic");
  } else if (tile === "$") {
    // Open chest
    const chest = items.find(i => i.type === "chest" && i.x === x && i.y === y);
    if (!chest) {
      // No chest object found, but tile is $, so create one
      const newChest = { type: "chest", x: x, y: y, opened: false };
      items.push(newChest);
    }
    
    const chestToOpen = chest || items.find(i => i.type === "chest" && i.x === x && i.y === y);
    if (chestToOpen && !chestToOpen.opened) {
      chestToOpen.opened = true;
      state.chunk.map[y][x] = ".";
      
      // Gold chance (40%)
      if (Math.random() < 0.4) {
        const goldAmount = 10 + Math.floor(Math.random() * 40);
        state.player.gold += goldAmount;
        log(state, `The chest contains ${goldAmount} gold!`, "gold");
      }
      
      const loot = Math.random();
      if (loot < 0.25) {
        const weapon = choice(WEAPONS);
        const newItem = { 
          type: "weapon", 
          item: { ...weapon }, // Clone to avoid shared references
          id: generateItemId() 
        };
        state.player.inventory.push(newItem);
        log(state, `Chest contains: ${weapon.name}!`, "good");
        log(state, `[DEBUG] Inventory now has ${state.player.inventory.length} items`, "note");
      } else if (loot < 0.45) {
        const armor = choice(ARMORS);
        const newItem = { 
          type: "armor", 
          item: { ...armor }, // Clone to avoid shared references
          id: generateItemId() 
        };
        state.player.inventory.push(newItem);
        log(state, `Chest contains: ${armor.name}!`, "good");
        log(state, `[DEBUG] Inventory now has ${state.player.inventory.length} items`, "note");
      } else if (loot < 0.65) {
        const headgear = choice(HEADGEAR);
        state.player.inventory.push({ 
          type: "headgear", 
          item: { ...headgear }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${headgear.name}!`, "good");
      } else if (loot < 0.85) {
        const ring = choice(RINGS);
        state.player.inventory.push({ 
          type: "ring", 
          item: { ...ring }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${ring.name}!`, "good");
      } else {
        const potion = choice(POTIONS);
        addPotionToInventory(state, potion);
        log(state, `Chest contains: ${potion.name}!`, "good");
      }
    }
  } else if (tile === "!") {
    // Pickup potion
    const potion = items.find(i => i.type === "potion" && i.x === x && i.y === y);
    if (potion) {
      addPotionToInventory(state, potion.item);
      state.chunk.map[y][x] = ".";
      log(state, `You pickup: ${potion.item.name}`, "good");
      // Remove from items
      const idx = items.indexOf(potion);
      if (idx >= 0) items.splice(idx, 1);
    }
  } else if (tile === "/" || tile === "]" || tile === "^") {
    // Pickup weapon/armor/headgear
    const item = items.find(i => (i.type === "weapon" || i.type === "armor" || i.type === "headgear") && i.x === x && i.y === y);
    if (item) {
      state.player.inventory.push({ 
        type: item.type, 
        item: { ...item.item }, // Clone to avoid shared references
        id: generateItemId() 
      });
      state.chunk.map[y][x] = ".";
      log(state, `You pickup: ${item.item.name}`, "good");
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
    }
  } else if (tile === "▲") {
    // Shrine interaction
    const shrine = items.find(i => i.type === "shrine" && i.x === x && i.y === y);
    if (shrine && !shrine.used) {
      shrine.used = true;
      log(state, choice(QUOTES[state.chunk.biome]?.shrine || ["The shrine pulses with ancient power."]), "magic");
      // Blessing effect
      const blessing = Math.random();
      if (blessing < 0.3) {
        state.player.hp = state.player.hpMax;
        log(state, "The shrine fully restores your health!", "good");
      } else if (blessing < 0.6) {
        applyStatusEffect(state.player, "buff_str", 50, 3);
        log(state, "The shrine grants you strength!", "good");
      } else {
        applyStatusEffect(state.player, "buff_def", 50, 3);
        log(state, "The shrine grants you protection!", "good");
      }
    }
  }
}

function loadOrGenChunk(state, cx, cy) {
  if (state.chunk) saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
  state.cx = cx;
  state.cy = cy;
  const existing = loadChunk(state.worldSeed, cx, cy);
  state.chunk = existing ? existing : genChunk(state.worldSeed, cx, cy);
  if (!state.chunk.items) state.chunk.items = [];
  
  // Restore itemCheck functions for vendor fetch quests (lost during JSON serialization)
  if (state.chunk.items) {
    state.chunk.items.forEach(item => {
      if (item.type === "vendor" && item.fetchQuest && item.fetchQuest.targetItem) {
        const targetItem = item.fetchQuest.targetItem;
        // Find matching FETCH_ITEM by name to restore the itemCheck function
        const matchingFetchItem = FETCH_ITEMS.find(fi => fi.name === targetItem.name);
        if (matchingFetchItem) {
          item.fetchQuest.targetItem = matchingFetchItem;
        }
      }
    });
  }
}

export function handlePlayerMove(state, dx, dy) {
  if (state.over) return;
  
  // Check if player is frozen
  const frozen = isFrozen(state.player);
  if (frozen) {
    log(state, "You're frozen solid and can't move!", "magic");
    enemiesTurn(state);
    return;
  }
  
  // Add dimensions and references to state for movePipeline
  state.W = W;
  state.H = H;
  state.FETCH_ITEMS = FETCH_ITEMS; // For restoring fetch quest functions
  
  // Add interactTile reference for movePipeline
  state.interactTile = interactTile;
  
  // Create move action and run through pipeline
  const action = Move(dx, dy);
  const consumed = runPlayerMove(state, action);
  
  // If action was consumed (move attempted), run enemy turn
  if (consumed) {
    enemiesTurn(state);
  }
}

// Old tryMove function - no longer used, replaced by handlePlayerMove + runPlayerMove pipeline
// Kept for reference during migration
/*
function tryMove(state, dx, dy) {
  if (state.over) return;
  const { player } = state;
  
  // Check if player is frozen
  const frozen = isFrozen(player);
  if (frozen) {
    log(state, "You're frozen solid and can't move!", "magic");
    enemiesTurn(state);
    return;
  }
  
  const nx = player.x + dx, ny = player.y + dy;
  
  // Edge travel
  if (nx < 0 || nx >= W || ny < 0 || ny >= H) {
    const tcx = state.cx + (nx < 0 ? -1 : nx >= W ? 1 : 0);
    const tcy = state.cy + (ny < 0 ? -1 : ny >= H ? 1 : 0);
    loadOrGenChunk(state, tcx, tcy);
    player.x = (nx + W) % W;
    player.y = (ny + H) % H;
    if (state.chunk?.map?.[player.y]?.[player.x] === "#") {
      const spot = findOpenSpot(state.chunk.map) || { x: 2, y: 2 };
      player.x = spot.x; player.y = spot.y;
    }
    log(state, `You step into a new area.`, "note");
    enemiesTurn(state);
    return;
  }
  
  // Check tile
  const tile = state.chunk.map[ny][nx];
  
  // Doors
  if (tile === "+") {
    state.chunk.map[ny][nx] = ".";
    log(state, "You open the door.");
    turnEnd(state);
    return;
  }
  
  // Walls
  if (tile === "#") { 
    log(state, "You bonk the wall. It forgives you."); 
    turnEnd(state); 
    enemiesTurn(state);
    return; 
  }
  
  // Combat
  const m = state.chunk.monsters.find(mm => mm.alive && mm.x === nx && mm.y === ny);
  if (m) { 
    attack(state, player, m, "You", m.name); 
    if (!state.over) enemiesTurn(state); 
    return; 
  }
  
  // Move
  player.x = nx; 
  player.y = ny;
  player.turnsSinceRest++;
  
  // Auto-pickup items
  interactTile(state, nx, ny);
  
  // Regen at shrines
  if (tile === "▲" && player.hp < player.hpMax && player.turnsSinceRest > 10) {
    player.hp = Math.min(player.hpMax, player.hp + 2);
    player.turnsSinceRest = 0;
    log(state, "The shrine's aura heals you slightly.", "good");
  }
  
  enemiesTurn(state);
}
*/

export function waitTurn(state) { 
  if (state.over) return;
  
  // Check if player is frozen
  if (isFrozen(state.player)) {
    log(state, "You're frozen solid and can't act!", "magic");
    enemiesTurn(state);
    return;
  }
  
  log(state, "You wait. Time wiggles."); 
  state.player.turnsSinceRest = 0;
  // Small heal if hurt
  if (state.player.hp < state.player.hpMax) {
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + 1);
    log(state, "You catch your breath. +1 HP", "good");
  }
  enemiesTurn(state); 
}

function processMonsterAbility(state, monster) {
  if (!monster.ability) return false;
  
  // Handle self-buff abilities
  if (monster.ability.selfBuff) {
    // Check if ability triggers
    if (Math.random() >= monster.ability.chance) return false;
    
    // Execute self-buff ability
    const ability = monster.ability;
    
    if (ability.type === "boneShield") {
      log(state, `${monster.name} raises a bone shield!`, "bad");
      applyStatusEffect(monster, ability.effect, ability.turns, ability.value);
      return true;
    }
    
    return false;
  }
  
  // Calculate distance to player for ranged abilities
  const dx = Math.abs(state.player.x - monster.x);
  const dy = Math.abs(state.player.y - monster.y);
  const distance = dx + dy;
  
  // Check if player is in range
  if (monster.ability.range && distance > monster.ability.range) return false;
  
  // Check if ability triggers (with tier scaling already applied)
  if (Math.random() >= monster.ability.chance) return false;
  
  // Execute ability
  const ability = monster.ability;
  const abilityNames = {
    fireBlast: "emits a blast of fire",
    iceBreath: "breathes freezing ice",
    poisonSpit: "spits toxic venom",
    electricPulse: "releases an electric pulse",
    lifeDrain: "drains your life force",
    shadowStrike: "strikes from the shadows",
    hellfire: "unleashes hellfire"
  };
  
  log(state, `${monster.name} ${abilityNames[ability.type] || "uses special ability"}!`, "bad");
  
  // Apply damage (reduced by defense)
  const playerDef = state.player.def + 
    (state.player.armor ? state.player.armor.def : 0) +
    (state.player.headgear && state.player.headgear.def ? state.player.headgear.def : 0);
  const damage = Math.max(1, ability.damage - Math.floor(playerDef / 2));
  
  state.player.hp -= damage;
  log(state, `You take ${damage} damage from the ${ability.type}!`, "bad");
  
  // Show damage number
  // Show damage via floating text event
  emit(EventType.FloatingText, {
    x: state.player.x,
    y: state.player.y,
    text: `-${damage}`,
    kind: 'damage'
  });
  
  // Handle special ability effects
  if (ability.type === "lifeDrain" && ability.heal) {
    // Heal the monster
    monster.hp = Math.min(monster.hp + ability.heal, monster.hpMax || monster.hp + ability.heal);
    log(state, `${monster.name} heals ${ability.heal} HP!`, "good");
  } else if (ability.type === "shadowStrike" && ability.blindTurns) {
    // Apply blind status
    applyStatusEffect(state.player, "blind", ability.blindTurns, 0);
    log(state, "You are blinded by the shadows!", "bad");
  } else if (ability.type === "hellfire") {
    // Always apply burn with hellfire
    applyStatusEffect(state.player, "burn", 5, 3);
    log(state, "The hellfire burns you!", "bad");
  }
  
  // Apply status effect if any (for original abilities)
  if (ability.effect && ability.effectTurns > 0) {
    applyStatusEffect(state.player, ability.effect, ability.effectTurns, ability.effectValue);
    
    const effectMessages = {
      burn: "You catch fire!",
      freeze: "You are frozen solid!",
      poison: "You are poisoned!",
      shock: "You are electrified!",
      weakness: "You feel weakened!"
    };
    log(state, effectMessages[ability.effect] || "You are afflicted!", "bad");
  }
  
  // Check if player died
  if (state.player.hp <= 0) {
    state.player.alive = false;
    state.over = true;
    log(state, `You were defeated by ${monster.name}'s ${ability.type}!`, "bad");
  }
  
  return true; // Ability was used
}

// showAbilityDamage removed - now using EventType.FloatingText events

// HP mutator functions for the new status system
function applyStatusDamage(entityId, amount, source) {
  const entity = entityId === 'player' ? STATE.player : 
                 STATE.chunk.monsters.find(m => m.id === entityId);
  
  if (!entity) return;
  
  entity.hp = Math.max(0, entity.hp - amount);
  emit(EventType.TookDamage, { id: entityId, amount: -amount, source });
  
  if (entity.hp <= 0) {
    entity.alive = false;
    const name = entity === STATE.player ? 'You' : entity.name || `entity#${entityId}`;
    emit(EventType.EntityDied, { id: entityId, name, cause: source });
    
    if (entity === STATE.player) {
      STATE.over = true;
      log(STATE, `Game over - ${source} was too much!`, 'bad');
    }
  }
}

function applyStatusHeal(entityId, amount, source) {
  const entity = entityId === 'player' ? STATE.player : 
                 STATE.chunk.monsters.find(m => m.id === entityId);
  
  if (!entity) return;
  
  const before = entity.hp;
  entity.hp = Math.min(entity.hpMax || entity.hp, entity.hp + amount);
  const gained = entity.hp - before;
  
  if (gained > 0) {
    emit(EventType.FloatingText, { 
      x: entity.x, 
      y: entity.y, 
      text: `+${gained}`, 
      kind: 'heal' 
    });
  }
}

// Process the new status system (gradual migration)
function processNewStatusSystem(state) {
  // For now, this is a no-op since we're still using the old system
  // Uncomment below to enable the new system:
  // endOfTurnStatusPass(state, applyStatusDamage, applyStatusHeal);
}

function enemiesTurn(state) {
  const mons = state.chunk.monsters;
  
  for (const m of mons) {
    if (!m.alive) continue;
    
    // Check if monster is frozen - skip turn if so
    if (isFrozen(m)) {
      log(state, `${m.name} is frozen and can't move!`, "magic");
      processStatusEffects(state, m, m.name);
      continue;
    }
    
    // Check for ability activation
    if (processMonsterAbility(state, m)) {
      processStatusEffects(state, m, m.name);
      continue; // Skip normal turn if ability was used
    }
    
    // Ensure monster is within bounds
    m.x = Math.max(0, Math.min(W - 1, m.x));
    m.y = Math.max(0, Math.min(H - 1, m.y));
    
    const dx = state.player.x - m.x;
    const dy = state.player.y - m.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    
    // Attack if adjacent
    if (distance === 1) {
      attack(state, m, state.player, m.name, "you");
      if (state.player.hp <= 0) {
        state.player.alive = false;
        state.over = true;
        log(state, "You fall. The floor hums a lullaby. Game over.", "bad");
        break;
      }
      // Process status effects after normal attack
      processStatusEffects(state, m, m.name);
      continue;
    }
    
    // Movement AI
    let moved = false;
    if (m.ai === "chase" && distance < 8) {
      // Move toward player
      const moveX = Math.sign(dx);
      const moveY = Math.sign(dy);
      
      const newX = m.x + moveX;
      const newY = m.y + moveY;
      
      if (moveX && newX >= 0 && newX < W && !isBlocked(state, newX, m.y)) {
        m.x = newX;
        moved = true;
      } else if (moveY && newY >= 0 && newY < H && !isBlocked(state, m.x, newY)) {
        m.y = newY;
        moved = true;
      }
    } else if (m.ai === "smart") {
      // Boss AI - smarter pathfinding
      if (distance < 10) {
        const moveX = Math.sign(dx);
        const moveY = Math.sign(dy);
        
        const newX = m.x + moveX;
        const newY = m.y + moveY;
        
        // Try direct approach
        if (newX >= 0 && newX < W && newY >= 0 && newY < H && !isBlocked(state, newX, newY)) {
          m.x = newX;
          m.y = newY;
        } else if (newX >= 0 && newX < W && !isBlocked(state, newX, m.y)) {
          m.x = newX;
        } else if (newY >= 0 && newY < H && !isBlocked(state, m.x, newY)) {
          m.y = newY;
        }
      }
    } else if (m.ai === "wander") {
      // Random movement
      const dir = choice([[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]);
      const newX = m.x + dir[0];
      const newY = m.y + dir[1];
      
      if (newX >= 0 && newX < W && newY >= 0 && newY < H && !isBlocked(state, newX, newY)) {
        m.x = newX;
        m.y = newY;
      }
    } else if (m.ai === "skittish" && distance < 5) {
      // Run away
      const moveX = -Math.sign(dx);
      const moveY = -Math.sign(dy);
      
      const newX = m.x + moveX;
      const newY = m.y + moveY;
      
      if (newX >= 0 && newX < W && newY >= 0 && newY < H && !isBlocked(state, newX, newY)) {
        m.x = newX;
        m.y = newY;
      }
    }
    
    // Process status effects on monster
    processStatusEffects(state, m, m.name);
  }
  
  turnEnd(state);
}

function turnEnd(state) {
  // Process player status effects
  processStatusEffects(state, state.player, "You");
  
  // NEW: Also process with the new status system (gradual migration)
  // This will eventually replace processStatusEffects above
  processNewStatusSystem(state);
  
  // Run gear turn-end hooks
  if (state.player.alive) {
    runOnTurnEndHooks(state, state.player);
  }
  
  // Time progression
  if (Math.random() < 0.1) {
    state.timeIndex = (state.timeIndex + 1) % TIMES.length;
    if (Math.random() < 0.3) state.weather = choice(WEATHERS);
  }
  
  // Ambient messages
  if (Math.random() < 0.05) {
    const t = TIMES[state.timeIndex];
    const w = state.weather;
    const b = state.chunk.biome;
    const quotes = ((QUOTES[b] || {})[t] || {})[w];
    if (quotes && quotes.length) {
      log(state, choice(quotes), "note");
    }
  }
  
  render(state);
}

function renderEquipmentPanel(state) {
  const slotsEl = document.getElementById("equipmentSlots");
  const statsEl = document.getElementById("totalStats");
  
  // Clear previous content
  slotsEl.innerHTML = "";
  
  // Find equipped items by ID
  const equippedWeapon = state.player.inventory.find(i => i.id === state.equippedWeaponId);
  const equippedArmor = state.player.inventory.find(i => i.id === state.equippedArmorId);
  const equippedHeadgear = state.player.inventory.find(i => i.id === state.equippedHeadgearId);
  const equippedRing1 = state.equippedRingIds ? state.player.inventory.find(i => i.id === state.equippedRingIds[0]) : null;
  const equippedRing2 = state.equippedRingIds ? state.player.inventory.find(i => i.id === state.equippedRingIds[1]) : null;
  
  // Weapon slot
  const weaponDiv = document.createElement("div");
  weaponDiv.className = equippedWeapon ? "equipment-slot" : "equipment-slot empty";
  if (equippedWeapon) {
    const stats = [`<span class="stat damage">DMG +${equippedWeapon.item.dmg}</span>`];
    
    // Add enchantment info if weapon has an effect
    if (equippedWeapon.item.effect) {
      const magicBonus = state.player.headgear && state.player.headgear.magic ? 
        state.player.headgear.magic * 0.05 : 0;
      const totalChance = Math.floor((equippedWeapon.item.effectChance + magicBonus) * 100);
      
      // Determine effect type for color coding
      let effectClass = "magic";
      if (["burn", "poison"].includes(equippedWeapon.item.effect)) effectClass = "damage";
      if (["freeze", "shock"].includes(equippedWeapon.item.effect)) effectClass = "magic";
      if (equippedWeapon.item.effect === "lifesteal") effectClass = "defense";
      if (equippedWeapon.item.effect === "weaken") effectClass = "strength";
      
      stats.push(`<span class="stat ${effectClass}">${totalChance}% ${equippedWeapon.item.effect}</span>`);
    }
    
    weaponDiv.innerHTML = `
      <div class="slot-label">Weapon</div>
      <div class="item-name">/ ${equippedWeapon.item.name}</div>
      <div class="item-stats">
        ${stats.join("")}
      </div>
    `;
  } else {
    weaponDiv.innerHTML = `
      <div class="slot-label">Weapon</div>
      <div class="item-name">Empty</div>
    `;
  }
  slotsEl.appendChild(weaponDiv);
  
  // Armor slot
  const armorDiv = document.createElement("div");
  armorDiv.className = equippedArmor ? "equipment-slot" : "equipment-slot empty";
  if (equippedArmor) {
    armorDiv.innerHTML = `
      <div class="slot-label">Armor</div>
      <div class="item-name">] ${equippedArmor.item.name}</div>
      <div class="item-stats">
        <span class="stat defense">DEF +${equippedArmor.item.def}</span>
      </div>
    `;
  } else {
    armorDiv.innerHTML = `
      <div class="slot-label">Armor</div>
      <div class="item-name">Empty</div>
    `;
  }
  slotsEl.appendChild(armorDiv);
  
  // Headgear slot
  const headgearDiv = document.createElement("div");
  headgearDiv.className = equippedHeadgear ? "equipment-slot" : "equipment-slot empty";
  if (equippedHeadgear) {
    const stats = [];
    if (equippedHeadgear.item.def) stats.push(`<span class="stat defense">DEF +${equippedHeadgear.item.def}</span>`);
    if (equippedHeadgear.item.str) stats.push(`<span class="stat strength">STR +${equippedHeadgear.item.str}</span>`);
    if (equippedHeadgear.item.spd) stats.push(`<span class="stat speed">SPD +${equippedHeadgear.item.spd}</span>`);
    if (equippedHeadgear.item.magic) stats.push(`<span class="stat magic">MAG +${equippedHeadgear.item.magic}</span>`);
    
    headgearDiv.innerHTML = `
      <div class="slot-label">Headgear</div>
      <div class="item-name">^ ${equippedHeadgear.item.name}</div>
      <div class="item-stats">
        ${stats.join("")}
      </div>
    `;
  } else {
    headgearDiv.innerHTML = `
      <div class="slot-label">Headgear</div>
      <div class="item-name">Empty</div>
    `;
  }
  slotsEl.appendChild(headgearDiv);
  
  // Ring 1 slot
  const ring1Div = document.createElement("div");
  ring1Div.className = equippedRing1 ? "equipment-slot" : "equipment-slot empty";
  if (equippedRing1) {
    const stats = [];
    if (equippedRing1.item.mods) {
      const m = equippedRing1.item.mods;
      if (m.str) stats.push(`<span class="stat strength">STR +${m.str}</span>`);
      if (m.def) stats.push(`<span class="stat defense">DEF +${m.def}</span>`);
      if (m.spd) stats.push(`<span class="stat speed">SPD +${m.spd}</span>`);
      if (m.mag) stats.push(`<span class="stat magic">MAG +${m.mag}</span>`);
      if (m.hp) stats.push(`<span class="stat health">HP +${m.hp}</span>`);
      // Add resistances
      if (m.res) {
        for (const [type, value] of Object.entries(m.res)) {
          if (value > 0) {
            const percent = Math.floor(value * 100);
            let resClass = "resistance";
            if (type === "fire") resClass = "res-fire";
            else if (type === "ice") resClass = "res-ice";
            else if (type === "poison") resClass = "res-poison";
            else if (type === "shock") resClass = "res-shock";
            stats.push(`<span class="stat ${resClass}">${type} ${percent}%</span>`);
          }
        }
      }
    }
    ring1Div.innerHTML = `
      <div class="slot-label">Ring 1</div>
      <div class="item-name">○ ${equippedRing1.item.name}</div>
      <div class="item-stats">
        ${stats.join("")}
      </div>
    `;
  } else {
    ring1Div.innerHTML = `
      <div class="slot-label">Ring 1</div>
      <div class="item-name">Empty</div>
    `;
  }
  slotsEl.appendChild(ring1Div);
  
  // Ring 2 slot
  const ring2Div = document.createElement("div");
  ring2Div.className = equippedRing2 ? "equipment-slot" : "equipment-slot empty";
  if (equippedRing2) {
    const stats = [];
    if (equippedRing2.item.mods) {
      const m = equippedRing2.item.mods;
      if (m.str) stats.push(`<span class="stat strength">STR +${m.str}</span>`);
      if (m.def) stats.push(`<span class="stat defense">DEF +${m.def}</span>`);
      if (m.spd) stats.push(`<span class="stat speed">SPD +${m.spd}</span>`);
      if (m.mag) stats.push(`<span class="stat magic">MAG +${m.mag}</span>`);
      if (m.hp) stats.push(`<span class="stat health">HP +${m.hp}</span>`);
      // Add resistances
      if (m.res) {
        for (const [type, value] of Object.entries(m.res)) {
          if (value > 0) {
            const percent = Math.floor(value * 100);
            let resClass = "resistance";
            if (type === "fire") resClass = "res-fire";
            else if (type === "ice") resClass = "res-ice";
            else if (type === "poison") resClass = "res-poison";
            else if (type === "shock") resClass = "res-shock";
            stats.push(`<span class="stat ${resClass}">${type} ${percent}%</span>`);
          }
        }
      }
    }
    ring2Div.innerHTML = `
      <div class="slot-label">Ring 2</div>
      <div class="item-name">○ ${equippedRing2.item.name}</div>
      <div class="item-stats">
        ${stats.join("")}
      </div>
    `;
  } else {
    ring2Div.innerHTML = `
      <div class="slot-label">Ring 2</div>
      <div class="item-name">Empty</div>
    `;
  }
  slotsEl.appendChild(ring2Div);
  
  // Calculate total stats
  const p = state.player;
  const weaponDmg = p.weapon ? p.weapon.dmg : 0;
  const armorDef = p.armor ? p.armor.def : 0;
  const headgearDef = p.headgear ? (p.headgear.def || 0) : 0;
  const headgearStr = p.headgear ? (p.headgear.str || 0) : 0;
  const headgearSpd = p.headgear ? (p.headgear.spd || 0) : 0;
  const headgearMagic = p.headgear ? (p.headgear.magic || 0) : 0;
  
  // Get gear mods including rings
  const gearMods = getGearMods(p);
  
  const statusStrBonus = getStatusModifier(p, "str");
  const statusDefBonus = getStatusModifier(p, "def");
  const statusSpdBonus = getStatusModifier(p, "spd");
  
  const totalStr = p.str + gearMods.str + statusStrBonus;
  const totalDef = p.def + armorDef + headgearDef + gearMods.def + statusDefBonus;
  const totalSpd = (p.spd || 0) + headgearSpd + gearMods.spd + statusSpdBonus;
  const totalMag = (p.mag || 0) + headgearMagic + gearMods.mag;
  const totalDmg = weaponDmg;
  
  // Display total stats
  statsEl.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Base STR:</span>
      <span class="stat-value">${p.str}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Base DEF:</span>
      <span class="stat-value">${p.def}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Base SPD:</span>
      <span class="stat-value">${p.spd || 0}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Equipment Bonuses:</span>
      <span class="stat-value"></span>
    </div>
    <div class="stat-row">
      <span class="stat-label">  + Weapon DMG:</span>
      <span class="stat-value" style="color:var(--danger)">+${weaponDmg}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">  + Total DEF:</span>
      <span class="stat-value" style="color:var(--ok)">+${armorDef + headgearDef + gearMods.def}</span>
    </div>
    ${(gearMods.str > 0) ? `<div class="stat-row">
      <span class="stat-label">  + Gear STR:</span>
      <span class="stat-value" style="color:var(--accent)">+${gearMods.str}</span>
    </div>` : ""}
    ${(gearMods.spd > 0) ? `<div class="stat-row">
      <span class="stat-label">  + Gear SPD:</span>
      <span class="stat-value" style="color:var(--speed)">+${gearMods.spd}</span>
    </div>` : ""}
    ${(totalMag > 0) ? `<div class="stat-row">
      <span class="stat-label">  + Magic:</span>
      <span class="stat-value" style="color:var(--magic)">+${totalMag} (+${totalMag * 5}% proc)</span>
    </div>` : ""}
    ${(statusStrBonus || statusDefBonus) ? `<div class="stat-row">
      <span class="stat-label">Status Effects:</span>
      <span class="stat-value"></span>
    </div>` : ""}
    ${statusStrBonus ? `<div class="stat-row">
      <span class="stat-label">  + Buff STR:</span>
      <span class="stat-value" style="color:var(--xp)">+${statusStrBonus}</span>
    </div>` : ""}
    ${statusDefBonus ? `<div class="stat-row">
      <span class="stat-label">  + Buff DEF:</span>
      <span class="stat-value" style="color:var(--xp)">+${statusDefBonus}</span>
    </div>` : ""}
    <div class="stat-row" style="border-top:1px solid #2c2f33;margin-top:8px;padding-top:8px;">
      <span class="stat-label"><strong>Total STR:</strong></span>
      <span class="stat-value"><strong>${totalStr}</strong></span>
    </div>
    <div class="stat-row">
      <span class="stat-label"><strong>Total DEF:</strong></span>
      <span class="stat-value"><strong>${totalDef}</strong></span>
    </div>
    <div class="stat-row">
      <span class="stat-label"><strong>Total SPD:</strong></span>
      <span class="stat-value"><strong>${totalSpd}</strong></span>
    </div>
    ${totalMag > 0 ? `<div class="stat-row">
      <span class="stat-label"><strong>Total MAG:</strong></span>
      <span class="stat-value"><strong>${totalMag}</strong></span>
    </div>` : ""}
    ${(() => {
      // Display total resistances if any
      const hasResistances = gearMods.res && Object.values(gearMods.res).some(v => v > 0);
      if (!hasResistances) return "";
      
      let resHtml = `<div class="stat-row" style="border-top:1px solid #2c2f33;margin-top:8px;padding-top:8px;">
        <span class="stat-label"><strong>Resistances:</strong></span>
        <span class="stat-value"></span>
      </div>`;
      
      for (const [type, value] of Object.entries(gearMods.res)) {
        if (value > 0) {
          const percent = Math.floor(value * 100);
          let color = "#999";
          if (type === "fire") color = "#ff6347";
          else if (type === "ice") color = "#87ceeb";
          else if (type === "poison") color = "#90ee90";
          else if (type === "shock") color = "#ffff66";
          else if (type === "bleed") color = "#ff4444";
          
          resHtml += `<div class="stat-row">
            <span class="stat-label">  ${type}:</span>
            <span class="stat-value" style="color:${color}">${percent}%</span>
          </div>`;
        }
      }
      
      return resHtml;
    })()}
  `;
}

// Helper function to get status effect display character
function getStatusChar(statusType) {
  const chars = {
    burn: '!', fire: '!',
    freeze: '*', ice: '*',
    shock: '!',
    poison: 'x',
    weaken: '-', weakness: '-',
    buff_str: '+',
    buff_def: '#',
    bleed: '.'
  };
  return chars[statusType] || '?';
}

// Helper function to get status effect CSS class
function getStatusClass(statusType) {
  const classes = {
    burn: 'status-burn', fire: 'status-burn',
    freeze: 'status-freeze', ice: 'status-freeze',
    shock: 'status-shock',
    poison: 'status-poison',
    weaken: 'status-weaken', weakness: 'status-weaken',
    buff_str: 'status-strength',
    buff_def: 'status-defense',
    bleed: 'status-bleed'
  };
  return classes[statusType] || 'status-unknown';
}

export function render(state) {
  console.log("in RENDER");
  const { map, monsters, biome } = state.chunk;
  const buf = map.map(r => r.slice());
  
  // Track monster positions and tiers for coloring
  const monsterMap = new Map();
  
  // Track entities with status effects
  const statusMap = new Map();
  
  // Draw monsters
  for (const m of monsters) {
    if (m.alive && m.y >= 0 && m.y < H && m.x >= 0 && m.x < W) {
      buf[m.y][m.x] = m.glyph;
      monsterMap.set(`${m.x},${m.y}`, m.tier || 1);
      
      // Check for status effects
      if (m.statusEffects && m.statusEffects.length > 0) {
        const effect = m.statusEffects[0]; // Show first effect
        statusMap.set(`${m.x},${m.y}`, effect.type);
      }
    }
  }
  
  // Draw player
  if (state.player.alive && state.player.y >= 0 && state.player.y < H && 
      state.player.x >= 0 && state.player.x < W) {
    buf[state.player.y][state.player.x] = TILE.player;
    
    // Check for player status effects
    if (state.player.statusEffects && state.player.statusEffects.length > 0) {
      console.log("in Render Check Player Status Effects");
      const effect = state.player.statusEffects[0];
      console.log("Effect:", effect);
      statusMap.set(`${state.player.x},${state.player.y}`, effect.type);
    }
  }
  
  // Render with colored monsters
  const gameEl = document.getElementById("game");
  
  // Handle old biome names and apply class for color palette
  let biomeClass = biome;
  // Convert old biome names to new ones (for backwards compatibility)
  if (biome === "candy") biomeClass = "candy_forest";
  else if (biome === "ice") biomeClass = "frost_caverns";
  else if (biome === "fire") biomeClass = "volcanic_marsh";
  else if (biome === "slime" || biome === "glimmering_meadows") biomeClass = "slime_kingdom";
  // New biomes already have correct names
  
  gameEl.className = `biome-${biomeClass}`;
  
  let html = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const char = buf[y][x];
      const monsterTier = monsterMap.get(`${x},${y}`);
      const statusEffect = statusMap.get(`${x},${y}`);
      
      if (monsterTier) {
        // Check for special monster styling
        const monster = monsters.find(m => m.x === x && m.y === y && m.alive);
        const tierClass = `monster-tier-${monsterTier}`;
        
        if (monster) {
          // Apply special styling for specific monsters
          if (monster.name === "flame pup") {
            html += `<span class="flame-pup ${tierClass}">${char}</span>`;
          } else if (monster.name === "demon") {
            html += `<span class="demon">${char}</span>`;
          } else if (monster.name === "bone knight") {
            html += `<span class="bone-knight">${char}</span>`;
          } else if (monster.name === "wraith") {
            html += `<span class="wraith">${char}</span>`;
          } else if (monster.name === "shadow beast") {
            html += `<span class="shadow-beast">${char}</span>`;
          } else {
            // Color monster based on tier
            html += `<span class="${tierClass}">${char}</span>`;
          }
        } else {
          html += `<span class="${tierClass}">${char}</span>`;
        }
      } else {
        html += char;
      }
    }
    if (y < H - 1) html += "\n";
  }
  gameEl.innerHTML = html;
  
  // Update HUD
  const p = state.player;
  setText("hp", `HP ${p.hp}/${p.hpMax}`);
  setText("xp", `XP ${p.xp}/${p.xpNext}`);
  setText("level", `Lv ${p.level}`);
  setText("gold", `Gold: ${p.gold}`);
  
  const strBonus = getStatusModifier(p, "str");
  const defBonus = getStatusModifier(p, "def");
  const weaponBonus = p.weapon ? p.weapon.dmg : 0;
  const armorBonus = p.armor ? p.armor.def : 0;
  const headgearDefBonus = p.headgear ? (p.headgear.def || 0) : 0;
  const headgearStrBonus = p.headgear ? (p.headgear.str || 0) : 0;
  
  const spdBonus = getStatusModifier(p, "spd");
  const headgearSpdBonus = p.headgear ? (p.headgear.spd || 0) : 0;
  
  setText("str", `STR ${p.str}${strBonus ? `+${strBonus}` : ""} ${weaponBonus ? `[+${weaponBonus}]` : ""} ${headgearStrBonus ? `[+${headgearStrBonus}]` : ""}`);
  setText("def", `DEF ${p.def}${defBonus ? `+${defBonus}` : ""} ${armorBonus ? `[+${armorBonus}]` : ""} ${headgearDefBonus ? `[+${headgearDefBonus}]` : ""}`);
  setText("spd", `SPD ${p.spd || 0}${spdBonus ? `+${spdBonus}` : ""} ${headgearSpdBonus ? `[+${headgearSpdBonus}]` : ""}`);
  
  // Find equipped items by ID
  const equippedWeapon = p.inventory.find(i => i.id === state.equippedWeaponId);
  const equippedArmor = p.inventory.find(i => i.id === state.equippedArmorId);
  const equippedHeadgear = p.inventory.find(i => i.id === state.equippedHeadgearId);
  
  setText("weapon", equippedWeapon ? `/ ${equippedWeapon.item.name}` : "/ None");
  setText("armor", equippedArmor ? `] ${equippedArmor.item.name}` : "] None");
  setText("headgear", equippedHeadgear ? `^ ${equippedHeadgear.item.name}` : "^ None");
  setText("potions", `! x${p.potionCount}`);
  
  // Display quest status
  if (p.quests) {
    const completeQuests = p.quests.active.filter(qId => {
      const progress = p.quests.progress[qId] || 0;
      const quest = QUEST_TEMPLATES[qId];
      return quest && progress >= quest.targetCount;
    }).length;
    
    if (completeQuests > 0) {
      setText("quests", `Quests: ${p.quests.active.length} (${completeQuests} ready!)`);
      document.getElementById("quests").style.color = "#FFD700";
    } else {
      setText("quests", `Quests: ${p.quests.active.length}`);
      document.getElementById("quests").style.color = "";
    }
  }
  
  setText("time", `${TIMES[state.timeIndex]} / ${state.weather}`);
  
  // Display friendly biome name
  let biomeName = biome;
  if (biome === "candy_forest" || biome === "candy") biomeName = "Candy Forest";
  else if (biome === "slime_kingdom" || biome === "slime") biomeName = "Slime Kingdom";
  else if (biome === "frost_caverns" || biome === "ice") biomeName = "Frost Caverns";
  else if (biome === "volcanic_marsh" || biome === "fire") biomeName = "Volcanic Marsh";
  else if (biome === "corrupted_dungeon") biomeName = "Corrupted Dungeon";
  else if (biome === "lich_domain") biomeName = "Lich Domain";
  else if (biome === "glimmering_meadows") biomeName = "Slime Kingdom"; // Old name conversion
  
  setText("biome", biomeName);
  setText("coords", `(${state.cx},${state.cy})`);
  
  // Display danger level
  const dangerLevel = state.chunk.danger || 0;
  const dangerDisplay = dangerLevel > 0 ? "☠".repeat(Math.min(dangerLevel, 5)) : "Safe";
  const dangerColor = dangerLevel === 0 ? "var(--ok)" : 
                      dangerLevel <= 2 ? "var(--accent)" : 
                      dangerLevel <= 4 ? "var(--rare)" : "var(--danger)";
  
  setText("danger", `Danger: ${dangerDisplay}`);
  const dangerEl = document.getElementById("danger");
  if (dangerEl) dangerEl.style.color = dangerColor;
  
  // Optional: Add warning when entering dangerous zones
  if (state.lastDanger !== undefined && dangerLevel > state.lastDanger) {
    log(state, `⚠ You enter a more dangerous area! (Danger Level ${dangerLevel})`, "bad");
  }
  state.lastDanger = dangerLevel;
  
  // Status effects - group by type to show stacks
  const statusBar = document.getElementById("statusBar");
  statusBar.innerHTML = "";
  
  // Group effects by type
  const effectGroups = {};
  for (const eff of p.statusEffects) {
    if (!effectGroups[eff.type]) {
      effectGroups[eff.type] = { count: 0, totalValue: 0, minTurns: eff.turns, maxTurns: eff.turns };
    }
    effectGroups[eff.type].count++;
    effectGroups[eff.type].totalValue += eff.value;
    effectGroups[eff.type].minTurns = Math.min(effectGroups[eff.type].minTurns, eff.turns);
    effectGroups[eff.type].maxTurns = Math.max(effectGroups[eff.type].maxTurns, eff.turns);
  }
  
  // Display grouped effects
  for (const [type, data] of Object.entries(effectGroups)) {
    const div = document.createElement("div");
    
    // Determine effect class
    let effectClass = "debuff";
    if (type.startsWith("buff")) effectClass = "buff";
    if (type === "freeze") effectClass = "freeze";
    
    div.className = `status-effect ${effectClass}`;
    
    // Format display name
    let displayName = type.replace(/_/g, " ");
    if (type.startsWith("buff_")) displayName = "+" + type.replace("buff_", "");
    else if (type.startsWith("debuff_")) displayName = "-" + type.replace("debuff_", "");
    else if (type === "freeze") displayName = "FROZEN";
    else if (type === "burn") displayName = "burning";
    else if (type === "poison") displayName = "poisoned";
    else if (type === "shock") displayName = "shocked";
    else if (type === "weaken") displayName = "weakened";
    
    // Show stack count if more than 1
    const stackText = data.count > 1 ? ` x${data.count}` : "";
    const turnsText = data.minTurns === data.maxTurns ? 
      `${data.minTurns}` : 
      `${data.minTurns}-${data.maxTurns}`;
    
    // Don't show value for freeze (it's always 0)
    const valueText = (type === "freeze" || data.totalValue === 0) ? "" : ` +${data.totalValue}`;
    
    div.textContent = `${displayName}${stackText}${valueText} (${turnsText}t)`;
    statusBar.appendChild(div);
  }
  
  // Update log
  const logEl = document.getElementById("log");
  logEl.innerHTML = state.logMessages.slice(-15).join("<br/>");
  // Auto-scroll to bottom to show most recent messages
  logEl.scrollTop = logEl.scrollHeight;
  
  // Show/hide restart
  document.getElementById("restart").style.display = state.over ? "inline-block" : "none";
  
  // Inventory/Shop overlay
  document.getElementById("overlay").style.display = 
    (state.ui.inventoryOpen || state.ui.shopOpen) ? "flex" : "none";
  
  // Update equipment panel
  renderEquipmentPanel(state);
}

export function newWorld() {
  console.log("in newWorld")
  const worldSeed = Math.floor(Math.random() * 2**31) >>> 0;
  const player = makePlayer();
  const state = {
    worldSeed, player,
    cx: 0, cy: 0,
    chunk: null,
    timeIndex: rnd(TIMES.length),
    weather: choice(WEATHERS),
    logMessages: [],
    over: false,
    ui: { 
      inventoryOpen: false, 
      selectedIndex: 0, 
      mapOpen: false,
      questTurnInOpen: false,
      completedQuests: [],
      shopOpen: false,
      shopMode: null,
      shopVendor: null,
      shopSelectedIndex: 0,
      confirmSell: false,
      confirmChoice: "no",
      selectingQuest: false,
      selectedQuestIndex: 0,
      selectingFetchItem: null,
      fetchItemSelectedIndex: 0,
      selectedFetchItemIndex: undefined,
      confirmGiveEquipped: false,
      tempSelectedItem: null,
      allCompletedQuests: null
    },
    equippedWeaponId: null,  // Track by ID instead of reference
    equippedArmorId: null,   // Track by ID instead of reference
    equippedHeadgearId: null, // Track by ID instead of reference
    // Add method references for modules to use
    log: (text, cls) => log(state, text, cls),
    render: () => render(state)
  };
  console.log("Right before loadOrGenChunk");
  loadOrGenChunk(state, 0, 0);
  const spot = findOpenSpot(state.chunk.map) || { x: 2, y: 2 };
  player.x = spot.x;
  player.y = spot.y;
  
  // Restore itemCheck functions for player's accepted fetch quests
  if (player.quests && player.quests.fetchQuests) {
    Object.values(player.quests.fetchQuests).forEach(fetchQuest => {
      if (fetchQuest.targetItem) {
        const matchingFetchItem = FETCH_ITEMS.find(fi => fi.name === fetchQuest.targetItem.name);
        if (matchingFetchItem) {
          fetchQuest.targetItem = matchingFetchItem;
        }
      }
    });
  }
  
  log(state, "Welcome to the Land of Ooo! Press 'H' for help.", "note");
  log(state, "Walk off edges to explore. Press 'I' for inventory.", "note");
  
  // Show starter quest
  log(state, "════════════════════════════", "xp");
  log(state, "YOUR QUEST: Monster Hunter", "xp");
  log(state, "Defeat any 1 monster to prove yourself!", "note");
  log(state, "Visit any vendor (V) for your reward.", "dim");
  log(state, "Press 'Q' to view active quests.", "dim");
  log(state, "════════════════════════════", "xp");
  console.log("still in newWorld before RETURN STATE");
  return state;
}

// Initialize game
export function initGame() {
  // Initialize UI modules
  ShopUI.initShopUI();
  initMapUI();
  initQuestUI();
  
  // Initialize particle effects
  import('./ui/particles.js').then(module => {
    module.initParticles();
  });
  
  STATE = newWorld();
  window.STATE = STATE; // Make available for particle system
  render(STATE);
  
  // Initialize keyboard controls
  initKeyboardControls();
}

// Keyboard controls moved to src/js/input/keys.js

// Initialization code when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  // Button handlers
  document.getElementById("restart").addEventListener("click", () => {
    window.STATE = newWorld();
    document.getElementById("log").innerHTML = "";
    render(window.STATE);
  });
  
  document.getElementById("resetWorld").addEventListener("click", () => {
    clearWorld();
    log(STATE, "World data cleared. New areas will regenerate.", "note");
    render(STATE);
  });
  
  document.getElementById("help").addEventListener("click", () => {
    log(STATE, "=== HELP ===", "note");
    log(STATE, "WASD/Arrows: Move | .: Wait | I: Inventory", "note");
    log(STATE, "R: New Game | Walk off edges to explore", "note");
    log(STATE, "Find weapons, armor, and potions to survive!", "note");
    log(STATE, "Defeat monsters to gain XP and level up!", "note");
    render(STATE);
  });
});