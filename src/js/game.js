import { W, H, TILE, QUOTES, WEAPONS, ARMORS, HEADGEAR, POTIONS, TIMES, WEATHERS, QUEST_TEMPLATES, FETCH_ITEMS } from './config.js';
import { rnd, choice, esc } from './utils.js';
import { makePlayer, levelUp } from './entities.js';
import { genChunk, findOpenSpot } from './worldGen.js';
import { saveChunk, loadChunk, clearWorld } from './persistence.js';
import { attack, showDamageNumber } from './combat.js';
import { processStatusEffects, getStatusModifier, applyStatusEffect, isFrozen } from './statusEffects.js';
import { openInventory, closeInventory, renderInventory, useInventoryItem, dropInventoryItem } from './inventory.js';
import { initMapCursor, renderWorldMap, handleMapNavigation } from './worldMap.js';
import { turnInQuest, hasQuest, getQuestStatus, giveQuest, displayActiveQuests, checkFetchQuestItem, turnInFetchQuest, turnInFetchQuestWithItem } from './quests.js';
import { mountLog, push } from './log.js';
import { emit } from './events.js'

// Game state
let STATE = null;
mountLog(document.getElementById('logger'));
push('CavesOfOoo booting…', 'note');

function log(state, text, cls = null) { 
  const span = cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text);
  state.logMessages.push(span);
}

function setText(id, text) { 
  const el = document.getElementById(id);
  if (el) el.textContent = text; 
}

function isBlocked(state, x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return false; // Allow edge travel
  const tile = state.chunk.map[y][x];
  if (tile === "#" || tile === "+") return true; // Walls and doors block
  if (state.player.x === x && state.player.y === y) return true;
  if (state.chunk.monsters.some(m => m.alive && m.x === x && m.y === y)) return true;
  return false;
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
function openVendorShop(state, vendor) {
  // Check for completed fetch quests for this vendor
  const completedFetchQuests = state.player.quests.active.filter(qId => {
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest && fetchQuest.vendorId === vendor.id) {
      return checkFetchQuestItem(state.player, fetchQuest);
    }
    return false;
  });

  // Check for completed regular quests
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
    // Normal shop
    state.ui.shopOpen = true;
    state.ui.shopVendor = vendor;
    state.ui.shopSelectedIndex = 0;
    state.ui.shopMode = "buy"; // "buy", "sell", or "quest"
    state.ui.confirmSell = false; // For equipped item confirmation
    state.ui.confirmChoice = "no"; // "yes" or "no"
    renderShop(state);
  }
}

function closeShop(state) {
  state.ui.shopOpen = false;
  state.ui.shopVendor = null;
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

function renderQuestTurnIn(state) {
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

function renderQuestTurnInConfirm(state) {
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

function claimQuestRewards(state, questsToTurnIn = null) {
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
  if (fetchQuestsNeedingSelection.length > 0 && !state.ui.selectingFetchItem) {
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
  initMapCursor(state);
  renderMap(state);
}

function closeMap(state) {
  state.ui.mapOpen = false;
  const mapOverlay = document.getElementById("mapOverlay");
  mapOverlay.classList.remove("active");
  render(state);
}

function renderMap(state) {
  const mapOverlay = document.getElementById("mapOverlay");
  const mapContent = document.getElementById("mapContent");
  
  mapContent.innerHTML = renderWorldMap(state);
  mapOverlay.classList.add("active");
}

function renderShop(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  
  overlay.style.display = "flex";
  
  // Check if we're showing confirmation dialog
  if (state.ui.confirmSell) {
    content.innerHTML = `
      <div class="shop-header" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--dim);">
        <h3 style="margin: 0 0 10px 0; color: var(--danger);">⚠️ WARNING ⚠️</h3>
      </div>
      <div style="text-align: center; padding: 20px;">
        <p style="color: var(--fg); margin-bottom: 20px;">You are about to sell an <span style="color: var(--ok)">EQUIPPED</span> item!</p>
        <p style="color: var(--accent); margin-bottom: 30px;">Are you sure you want to sell it?</p>
        <div style="display: flex; gap: 40px; justify-content: center; font-size: 18px;">
          <div style="padding: 10px 20px; border: 2px solid ${state.ui.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'}; border-radius: 4px; color: ${state.ui.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'};">
            YES
          </div>
          <div style="padding: 10px 20px; border: 2px solid ${state.ui.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'}; border-radius: 4px; color: ${state.ui.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'};">
            NO
          </div>
        </div>
      </div>
      <div class="shop-controls" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--dim); color: var(--dim);">
        [←→] Select | [Enter] Confirm | [Esc] Cancel
      </div>
    `;
    return;
  }
  
  const vendor = state.ui.shopVendor;
  const shopMode = state.ui.shopMode;
  
  // Retrofit existing vendors with fetch quests if they don't have one
  if (!vendor.id) {
    // Generate a unique vendor ID if missing
    vendor.id = `vendor_${state.worldSeed}_${vendor.x}_${vendor.y}`;
  }
  
  if (!vendor.fetchQuest) {
    // Add fetch quest to existing vendor
    const items = FETCH_ITEMS;
    const randomItem = items[Math.floor(Math.random() * items.length)];
    
    vendor.fetchQuest = {
      id: `fetch_${vendor.id}`,
      name: "Vendor's Request",
      description: `I need ${randomItem.name}. Can you help me?`,
      objective: `Bring ${randomItem.name} to this vendor`,
      targetItem: randomItem,
      vendorId: vendor.id,
      vendorChunk: { x: state.cx, y: state.cy },
      rewards: {
        gold: 40 + Math.floor(Math.random() * 60),
        xp: 20 + Math.floor(Math.random() * 30),
        item: Math.random() < 0.5 ? { type: "potion", item: POTIONS[Math.floor(Math.random() * POTIONS.length)] } : null
      },
      completionText: "Perfect! This is exactly what I needed. Thank you!",
      isRepeatable: false
    };
    
    // Save the updated chunk data
    state.chunk.items = state.chunk.items || [];
    const vendorIndex = state.chunk.items.findIndex(i => i.type === "vendor" && i.x === vendor.x && i.y === vendor.y);
    if (vendorIndex >= 0) {
      state.chunk.items[vendorIndex] = vendor;
      saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
    }
  }
  
  // Check if vendor has a quest to offer
  const hasQuestToOffer = vendor.fetchQuest && 
    !hasQuest(state.player, vendor.fetchQuest.id) && 
    !state.player.quests.completed.includes(vendor.fetchQuest.id);
  
  let modeText = "";
  let modeToggleHint = "";
  let actionHint = "";
  
  if (shopMode === "buy") {
    modeText = "BUYING";
    modeToggleHint = hasQuestToOffer ? "[Tab] Sell/Quest" : "[Tab] Switch to Sell";
    actionHint = "[Enter] Buy";
  } else if (shopMode === "sell") {
    modeText = "SELLING";
    modeToggleHint = hasQuestToOffer ? "[Tab] Quest/Buy" : "[Tab] Switch to Buy";
    actionHint = "[Enter] Sell";
  } else if (shopMode === "quest") {
    modeText = "QUEST";
    modeToggleHint = "[Tab] Buy/Sell";
    actionHint = "[Enter] Accept Quest";
  }
  
  content.innerHTML = `
    <div class="shop-header" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--dim);">
      <h3 style="margin: 0 0 10px 0; color: var(--accent);">VENDOR - ${modeText}</h3>
      <div style="color: var(--gold, #ffd700);">Your Gold: ${state.player.gold}</div>
    </div>
    <div class="shop-items"></div>
    <div class="shop-controls" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--dim); color: var(--dim);">
      [↑↓] Navigate | ${actionHint} | ${modeToggleHint} | [Esc/V] Exit
    </div>
  `;
  
  const itemsDiv = content.querySelector(".shop-items");
  
  if (shopMode === "quest") {
    // Quest mode - show available quest
    if (!hasQuestToOffer) {
      itemsDiv.innerHTML = '<div style="color: var(--dim);">No quests available from this vendor.</div>';
      return;
    }
    
    const quest = vendor.fetchQuest;
    itemsDiv.innerHTML = `
      <div class="quest-offer" style="padding: 15px; border: 1px solid var(--accent); border-radius: 4px;">
        <div style="color: var(--xp); font-size: 1.2em; margin-bottom: 10px;">📜 ${quest.name}</div>
        <div style="color: var(--fg); margin-bottom: 10px;">"${quest.description}"</div>
        <div style="color: var(--note); margin-bottom: 15px;">
          <strong>Objective:</strong> ${quest.objective}
        </div>
        <div style="color: var(--good);">
          <strong>Rewards:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>${quest.rewards.gold} gold</li>
            <li>${quest.rewards.xp} XP</li>
            ${quest.rewards.item ? `<li>${quest.rewards.item.item.name}</li>` : ''}
          </ul>
        </div>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--dim); color: var(--dim);">
          Press [Enter] to accept this quest
        </div>
      </div>
    `;
  } else if (shopMode === "buy") {
    // Buy mode - show vendor inventory
    const vendor = state.ui.shopVendor;
    
    if (vendor.inventory.length === 0) {
      itemsDiv.innerHTML = '<div style="color: var(--dim);">The vendor is sold out!</div>';
      return;
    }
    
    vendor.inventory.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    if (idx === state.ui.shopSelectedIndex) div.className += " selected";
    
    const canAfford = state.player.gold >= item.price;
    const typeSymbol = item.type === "potion" ? "!" : 
                       item.type === "weapon" ? "/" : 
                       item.type === "armor" ? "]" : "^";
    
    // Build stats display
    let statsText = "";
    if (item.type === "weapon") {
      statsText = ` [DMG: ${item.item.dmg}]`;
      if (item.item.effect) {
        statsText += ` [${item.item.effect}]`;
      }
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
    
    div.style.opacity = canAfford ? "1" : "0.5";
    div.innerHTML = `
      <div>
        <div class="name">${typeSymbol} ${item.item.name}${statsText} - ${item.price}g</div>
        <div class="desc">${item.item.desc || ''}</div>
        ${!canAfford ? '<div style="color: var(--danger); font-size: 0.9em;">Not enough gold!</div>' : ''}
      </div>
    `;
      itemsDiv.appendChild(div);
    });
  } else {
    // Sell mode - show player inventory
    const sellableItems = state.player.inventory.filter(item => 
      item.type === "weapon" || item.type === "armor" || 
      item.type === "headgear" || item.type === "potion"
    );
    
    if (sellableItems.length === 0) {
      itemsDiv.innerHTML = '<div style="color: var(--dim);">You have nothing to sell!</div>';
      return;
    }
    
    sellableItems.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      if (idx === state.ui.shopSelectedIndex) div.className += " selected";
      
      // Calculate sell price (50% of base value)
      let sellPrice = 10; // Default minimum
      if (item.type === "potion") {
        // Potion prices based on effect
        if (item.item.effect === "max_heal") sellPrice = 40;
        else if (item.item.effect === "heal") sellPrice = 12;
        else if (item.item.effect === "buff_both") sellPrice = 30;
        else if (item.item.effect === "berserk") sellPrice = 25;
        else sellPrice = 20;
      } else if (item.type === "weapon") {
        sellPrice = 25 + (item.item.dmg * 5);
        if (item.item.effect) sellPrice += 25; // Enchanted bonus
      } else if (item.type === "armor") {
        sellPrice = 20 + (item.item.def * 10);
      } else if (item.type === "headgear") {
        sellPrice = 15;
        if (item.item.def) sellPrice += item.item.def * 5;
        if (item.item.str) sellPrice += item.item.str * 5;
        if (item.item.spd) sellPrice += item.item.spd * 5;
        if (item.item.magic) sellPrice += item.item.magic * 8;
      }
      
      const typeSymbol = item.type === "potion" ? "!" : 
                         item.type === "weapon" ? "/" : 
                         item.type === "armor" ? "]" : "^";
      
      // Build stats display
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
      
      // Check if equipped
      const isEquipped = 
        (item.type === "weapon" && item.id === state.equippedWeaponId) ||
        (item.type === "armor" && item.id === state.equippedArmorId) ||
        (item.type === "headgear" && item.id === state.equippedHeadgearId);
      
      const equippedText = isEquipped ? ' <span style="color: var(--ok)">[EQUIPPED]</span>' : '';
      const countText = item.count && item.count > 1 ? ` x${item.count}` : '';
      
      div.innerHTML = `
        <div>
          <div class="name">${typeSymbol} ${item.item.name}${countText}${statsText} - Sell: ${sellPrice}g${equippedText}</div>
          <div class="desc">${item.item.desc || ''}</div>
        </div>
      `;
      
      // Store sell price for later use
      div.dataset.sellPrice = sellPrice;
      div.dataset.itemIndex = idx;
      
      itemsDiv.appendChild(div);
    });
  }
}

function buyFromVendor(state) {
  const vendor = state.ui.shopVendor;
  const item = vendor.inventory[state.ui.shopSelectedIndex];
  
  if (!item) return;
  
  if (state.player.gold >= item.price) {
    state.player.gold -= item.price;
    
    // Add to inventory
    if (item.type === "potion") {
      addPotionToInventory(state, item.item);
    } else {
      state.player.inventory.push({
        type: item.type,
        item: { ...item.item },
        id: generateItemId()
      });
    }
    
    log(state, `Bought ${item.item.name} for ${item.price}g!`, "good");
    
    // Remove from vendor inventory
    vendor.inventory.splice(state.ui.shopSelectedIndex, 1);
    
    // Adjust selected index if needed
    if (vendor.inventory.length === 0) {
      closeShop(state);
      log(state, "The vendor is sold out!", "note");
    } else if (state.ui.shopSelectedIndex >= vendor.inventory.length) {
      state.ui.shopSelectedIndex = vendor.inventory.length - 1;
      renderShop(state);
    } else {
      renderShop(state);
    }
  } else {
    log(state, "Not enough gold!", "bad");
  }
}

function sellToVendor(state, forceConfirm = false) {
  const sellableItems = state.player.inventory.filter(item => 
    item.type === "weapon" || item.type === "armor" || 
    item.type === "headgear" || item.type === "potion"
  );
  
  if (state.ui.shopSelectedIndex >= sellableItems.length) return;
  
  const item = sellableItems[state.ui.shopSelectedIndex];
  
  // Check if trying to sell equipped item
  const isEquipped = 
    (item.type === "weapon" && item.id === state.equippedWeaponId) ||
    (item.type === "armor" && item.id === state.equippedArmorId) ||
    (item.type === "headgear" && item.id === state.equippedHeadgearId);
  
  if (isEquipped && !forceConfirm) {
    // Show confirmation dialog
    state.ui.confirmSell = true;
    state.ui.confirmChoice = "no";
    state.ui.pendingSellItem = item; // Store item for later
    renderShop(state);
    return;
  }
  
  // Calculate sell price (same as in renderShop)
  let sellPrice = 10;
  if (item.type === "potion") {
    if (item.item.effect === "max_heal") sellPrice = 40;
    else if (item.item.effect === "heal") sellPrice = 12;
    else if (item.item.effect === "buff_both") sellPrice = 30;
    else if (item.item.effect === "berserk") sellPrice = 25;
    else sellPrice = 20;
  } else if (item.type === "weapon") {
    sellPrice = 25 + (item.item.dmg * 5);
    if (item.item.effect) sellPrice += 25;
  } else if (item.type === "armor") {
    sellPrice = 20 + (item.item.def * 10);
  } else if (item.type === "headgear") {
    sellPrice = 15;
    if (item.item.def) sellPrice += item.item.def * 5;
    if (item.item.str) sellPrice += item.item.str * 5;
    if (item.item.spd) sellPrice += item.item.spd * 5;
    if (item.item.magic) sellPrice += item.item.magic * 8;
  }
  
  // Unequip if it was equipped
  if (isEquipped) {
    if (item.type === "weapon") {
      state.player.weapon = null;
      state.equippedWeaponId = null;
    } else if (item.type === "armor") {
      state.player.armor = null;
      state.equippedArmorId = null;
    } else if (item.type === "headgear") {
      state.player.headgear = null;
      state.equippedHeadgearId = null;
    }
    log(state, `Unequipped and sold ${item.item.name} for ${sellPrice}g!`, "gold");
  } else {
    log(state, `Sold ${item.item.name} for ${sellPrice}g!`, "gold");
  }
  
  // Add gold to player
  state.player.gold += sellPrice;
  
  // Remove from inventory
  if (item.type === "potion" && item.count && item.count > 1) {
    // Decrease potion stack
    item.count--;
    state.player.potionCount--;
  } else {
    // Remove item completely
    const idx = state.player.inventory.indexOf(item);
    if (idx >= 0) {
      state.player.inventory.splice(idx, 1);
      if (item.type === "potion") state.player.potionCount--;
    }
  }
  
  // Adjust selected index if needed
  const newSellableItems = state.player.inventory.filter(item => 
    item.type === "weapon" || item.type === "armor" || 
    item.type === "headgear" || item.type === "potion"
  );
  
  if (newSellableItems.length === 0) {
    state.ui.shopSelectedIndex = 0;
  } else if (state.ui.shopSelectedIndex >= newSellableItems.length) {
    state.ui.shopSelectedIndex = newSellableItems.length - 1;
  }
  
  renderShop(state);
}

function interactTile(state, x, y) {
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
    if (chest && !chest.opened) {
      chest.opened = true;
      state.chunk.map[y][x] = ".";
      
      // Gold chance (40%)
      if (Math.random() < 0.4) {
        const goldAmount = 10 + Math.floor(Math.random() * 40);
        state.player.gold += goldAmount;
        log(state, `The chest contains ${goldAmount} gold!`, "gold");
      }
      
      const loot = Math.random();
      if (loot < 0.3) {
        const weapon = choice(WEAPONS);
        state.player.inventory.push({ 
          type: "weapon", 
          item: { ...weapon }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${weapon.name}!`, "good");
      } else if (loot < 0.6) {
        const armor = choice(ARMORS);
        state.player.inventory.push({ 
          type: "armor", 
          item: { ...armor }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${armor.name}!`, "good");
      } else if (loot < 0.8) {
        const headgear = choice(HEADGEAR);
        state.player.inventory.push({ 
          type: "headgear", 
          item: { ...headgear }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${headgear.name}!`, "good");
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
}

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
    if (state.chunk.map[player.y][player.x] === "#") {
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

function waitTurn(state) { 
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
  showAbilityDamage(state, state.player, damage, ability.type);
  
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

function showAbilityDamage(state, target, damage, abilityType) {
  const gameEl = document.getElementById("game");
  const charWidth = 8;
  const lineHeight = 17;
  
  const x = target.x !== undefined ? target.x : 0;
  const y = target.y !== undefined ? target.y : 0;
  
  // Create damage number
  const dmgEl = document.createElement("div");
  dmgEl.className = "damage-float ability-damage";
  dmgEl.textContent = `-${damage}`;
  dmgEl.style.left = `${x * charWidth}px`;
  dmgEl.style.top = `${y * lineHeight}px`;
  
  // Add ability-specific styling
  if (abilityType === "fireBlast") {
    dmgEl.style.color = "#ff6633";
    dmgEl.style.textShadow = "0 0 5px rgba(255,107,0,0.8)";
  } else if (abilityType === "iceBreath") {
    dmgEl.style.color = "#66ccff";
    dmgEl.style.textShadow = "0 0 5px rgba(102,204,255,0.8)";
  } else if (abilityType === "poisonSpit") {
    dmgEl.style.color = "#66ff66";
    dmgEl.style.textShadow = "0 0 5px rgba(102,255,102,0.8)";
  } else if (abilityType === "electricPulse") {
    dmgEl.style.color = "#ffff66";
    dmgEl.style.textShadow = "0 0 5px rgba(255,255,102,0.8)";
  }
  
  gameEl.parentElement.appendChild(dmgEl);
  
  // Create visual effect for ability
  const effectEl = document.createElement("div");
  effectEl.className = `ability-animation ${abilityType}`;
  effectEl.style.left = `${x * charWidth - 20}px`;
  effectEl.style.top = `${y * lineHeight - 20}px`;
  
  gameEl.parentElement.appendChild(effectEl);
  
  // Cleanup
  setTimeout(() => {
    dmgEl.remove();
    effectEl.remove();
  }, 1000);
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
  
  // Calculate total stats
  const p = state.player;
  const weaponDmg = p.weapon ? p.weapon.dmg : 0;
  const armorDef = p.armor ? p.armor.def : 0;
  const headgearDef = p.headgear ? (p.headgear.def || 0) : 0;
  const headgearStr = p.headgear ? (p.headgear.str || 0) : 0;
  const headgearSpd = p.headgear ? (p.headgear.spd || 0) : 0;
  const headgearMagic = p.headgear ? (p.headgear.magic || 0) : 0;
  const statusStrBonus = getStatusModifier(p, "str");
  const statusDefBonus = getStatusModifier(p, "def");
  const statusSpdBonus = getStatusModifier(p, "spd");
  
  const totalStr = p.str + headgearStr + statusStrBonus;
  const totalDef = p.def + armorDef + headgearDef + statusDefBonus;
  const totalSpd = (p.spd || 0) + headgearSpd + statusSpdBonus;
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
      <span class="stat-value" style="color:var(--ok)">+${armorDef + headgearDef}</span>
    </div>
    ${headgearStr > 0 ? `<div class="stat-row">
      <span class="stat-label">  + Gear STR:</span>
      <span class="stat-value" style="color:var(--accent)">+${headgearStr}</span>
    </div>` : ""}
    ${headgearMagic > 0 ? `<div class="stat-row">
      <span class="stat-label">  + Magic:</span>
      <span class="stat-value" style="color:var(--magic)">+${headgearMagic} (+${headgearMagic * 5}% proc)</span>
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
  `;
}

function render(state) {
  const { map, monsters, biome } = state.chunk;
  const buf = map.map(r => r.slice());
  
  // Track monster positions and tiers for coloring
  const monsterMap = new Map();
  
  // Draw monsters
  for (const m of monsters) {
    if (m.alive && m.y >= 0 && m.y < H && m.x >= 0 && m.x < W) {
      buf[m.y][m.x] = m.glyph;
      monsterMap.set(`${m.x},${m.y}`, m.tier || 1);
    }
  }
  
  // Draw player
  if (state.player.alive && state.player.y >= 0 && state.player.y < H && 
      state.player.x >= 0 && state.player.x < W) {
    buf[state.player.y][state.player.x] = TILE.player;
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

function newWorld() {
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
      completedQuests: []
    },
    equippedWeaponId: null,  // Track by ID instead of reference
    equippedArmorId: null,   // Track by ID instead of reference
    equippedHeadgearId: null, // Track by ID instead of reference
    // Add method references for modules to use
    log: (text, cls) => log(state, text, cls),
    render: () => render(state)
  };
  
  loadOrGenChunk(state, 0, 0);
  const spot = findOpenSpot(state.chunk.map) || { x: 2, y: 2 };
  player.x = spot.x;
  player.y = spot.y;
  
  log(state, "Welcome to the Land of Ooo! Press 'H' for help.", "note");
  log(state, "Walk off edges to explore. Press 'I' for inventory.", "note");
  
  // Show starter quest
  log(state, "════════════════════════════", "xp");
  log(state, "YOUR QUEST: Monster Hunter", "xp");
  log(state, "Defeat any 1 monster to prove yourself!", "note");
  log(state, "Visit any vendor (V) for your reward.", "dim");
  log(state, "Press 'Q' to view active quests.", "dim");
  log(state, "════════════════════════════", "xp");
  
  return state;
}

// Initialize game
export function initGame() {
  STATE = newWorld();
  render(STATE);
  
  // Keyboard controls
  window.addEventListener("keydown", e => {
    // Quest turn-in controls
    if (STATE.ui.questTurnInOpen) {
      // Confirmation dialog for giving equipped item (check this FIRST)
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
            STATE.ui.selectingFetchItem = null;
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
          STATE.ui.questTurnInOpen = false;
          STATE.ui.completedQuests = [];
          STATE.ui.selectingQuest = false;
          closeShop(STATE);
          openVendorShop(STATE, STATE.ui.shopVendor);
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
          STATE.ui.selectingFetchItem = null;
          STATE.ui.fetchItemSelectedIndex = 0;
          STATE.ui.questTurnInOpen = false;
          STATE.ui.completedQuests = [];
          closeShop(STATE);
          openVendorShop(STATE, STATE.ui.shopVendor);
        }
      }
      // Normal quest turn-in (not selecting quest, not selecting item, not confirming)
      else {
        // Normal quest turn-in
        if (e.key === "Enter") {
          claimQuestRewards(STATE);
        } else if (e.key === "Escape") {
          STATE.ui.questTurnInOpen = false;
          STATE.ui.completedQuests = [];
          closeShop(STATE);
          openVendorShop(STATE, STATE.ui.shopVendor);
        }
      }
      e.preventDefault();
      return;
    }
    
    // Map controls
    if (STATE.ui.mapOpen) {
      const result = handleMapNavigation(STATE, e.key);
      if (result === 'close') {
        closeMap(STATE);
      } else if (result === 'travel') {
        closeMap(STATE);
        render(STATE);
        log(STATE, `Fast traveled to (${STATE.cx}, ${STATE.cy})`, "note");
      } else if (result) {
        renderMap(STATE);
      }
      e.preventDefault();
      return;
    }
    
    // Shop controls
    if (STATE.ui.shopOpen) {
      // Handle confirmation dialog
      if (STATE.ui.confirmSell) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          STATE.ui.confirmChoice = STATE.ui.confirmChoice === "yes" ? "no" : "yes";
          renderShop(STATE);
        } else if (e.key === "Enter") {
          if (STATE.ui.confirmChoice === "yes") {
            // Proceed with selling equipped item
            STATE.ui.confirmSell = false;
            sellToVendor(STATE, true); // Force confirm
          } else {
            // Cancel
            STATE.ui.confirmSell = false;
            renderShop(STATE);
          }
        } else if (e.key === "Escape") {
          // Cancel confirmation
          STATE.ui.confirmSell = false;
          renderShop(STATE);
        }
        e.preventDefault();
        return;
      }
      
      // Normal shop controls
      if (e.key === "Escape" || e.key.toLowerCase() === "v") {
        closeShop(STATE);
      } else if (e.key === "Tab") {
        // Toggle between buy, sell, and quest modes
        const vendor = STATE.ui.shopVendor;
        const hasQuestToOffer = vendor.fetchQuest && 
          !hasQuest(STATE.player, vendor.fetchQuest.id) && 
          !STATE.player.quests.completed.includes(vendor.fetchQuest.id);
        
        if (STATE.ui.shopMode === "buy") {
          STATE.ui.shopMode = "sell";
        } else if (STATE.ui.shopMode === "sell") {
          STATE.ui.shopMode = hasQuestToOffer ? "quest" : "buy";
        } else if (STATE.ui.shopMode === "quest") {
          STATE.ui.shopMode = "buy";
        }
        STATE.ui.shopSelectedIndex = 0;
        renderShop(STATE);
      } else if (e.key === "ArrowUp") {
        if (STATE.ui.shopMode !== "quest") {
          STATE.ui.shopSelectedIndex = Math.max(0, STATE.ui.shopSelectedIndex - 1);
          renderShop(STATE);
        }
      } else if (e.key === "ArrowDown") {
        if (STATE.ui.shopMode !== "quest") {
          let maxIdx;
          if (STATE.ui.shopMode === "buy") {
            maxIdx = STATE.ui.shopVendor.inventory.length - 1;
          } else {
            const sellableItems = STATE.player.inventory.filter(item => 
              item.type === "weapon" || item.type === "armor" || 
              item.type === "headgear" || item.type === "potion"
            );
            maxIdx = sellableItems.length - 1;
          }
          STATE.ui.shopSelectedIndex = Math.min(maxIdx, STATE.ui.shopSelectedIndex + 1);
          renderShop(STATE);
        }
      } else if (e.key === "Enter") {
        if (STATE.ui.shopMode === "buy") {
          buyFromVendor(STATE);
        } else if (STATE.ui.shopMode === "sell") {
          sellToVendor(STATE);
        } else if (STATE.ui.shopMode === "quest") {
          // Accept quest from vendor
          const vendor = STATE.ui.shopVendor;
          if (vendor.fetchQuest) {
            const questAccepted = giveQuest(STATE, vendor.fetchQuest.id, vendor.fetchQuest);
            if (questAccepted) {
              // Close shop after accepting quest
              closeShop(STATE);
            }
          }
        }
      }
      e.preventDefault();
      return;
    }
    
    // Inventory controls
    if (STATE.ui.inventoryOpen) {
      if (e.key === "ArrowUp") {
        STATE.ui.selectedIndex = Math.max(0, STATE.ui.selectedIndex - 1);
        renderInventory(STATE);
      } else if (e.key === "ArrowDown") {
        STATE.ui.selectedIndex = Math.min(STATE.player.inventory.length - 1, STATE.ui.selectedIndex + 1);
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
    
    // Game controls
    if (STATE.over && e.key.toLowerCase() !== "r") return;
    
    const k = e.key;
    if (k === "ArrowUp" || k === "w") { tryMove(STATE, 0, -1); e.preventDefault(); }
    else if (k === "ArrowDown" || k === "s") { tryMove(STATE, 0, 1); e.preventDefault(); }
    else if (k === "ArrowLeft" || k === "a") { tryMove(STATE, -1, 0); e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d") { tryMove(STATE, 1, 0); e.preventDefault(); }
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
      STATE = newWorld();
      document.getElementById("log").innerHTML = "";
      render(STATE);
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
    else if (k.toLowerCase() === "m") {
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
      console.log("in L key");
      applyStatusEffect(STATE.player, "lifesteal", 1, 10);
      render(STATE);
      e.preventDefault();
    }
    else if (k.toLowerCase() === "f") {
      // Debug: Test freeze
      log(STATE, "=== DEBUG: Testing Freeze ===", "magic");
      applyStatusEffect(STATE.player, "freeze", 2, 0);
      emit('statusEffectRegister', { type:"freeze", vs: "You" })
      log(STATE, "Applied freeze effect for 2 turns", "magic");
      log(STATE, `Status effects: ${JSON.stringify(STATE.player.statusEffects)}`, "note");
      log(STATE, `isFrozen result: ${isFrozen(STATE.player)}`, "note");
      render(STATE);
      e.preventDefault();
    }
    else if (k.toLowerCase() === "b") {
      applyStatusEffect(STATE.player, "burn", 2, 1);
      emit("statusEffectRegister", { type:"burn", vs:"You" });
      render(STATE);
      e.preventDefault();
    }
    else if (k.toLowerCase() === "p") {
      applyStatusEffect(STATE.player, "poison", 2, 1)
      emit("statusEffectRegister", { type:"poison", vs:"You" });
      render(STATE);
      e.preventDefault();
    }
    else if (k.toLowerCase() === "e") {
      applyStatusEffect(STATE.player, "shock", 2, 1)
      emit("statusEffectRegister", { type:"shock", vs:"You" });
      render(STATE);
      e.preventDefault();
    }
  });

  emit('entityDied', { name:"You", by:"falling boulder", cause:"big rock" });
  emit('entityDied', { name:"Goober", by:"falling boulder", cause:"big rock" });
  emit('equipped', { item:'Big Sword' });
  emit('unequipped', { item:'Big Sword' });

  // Button handlers
  document.getElementById("restart").addEventListener("click", () => {
    STATE = newWorld();
    document.getElementById("log").innerHTML = "";
    render(STATE);
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
}