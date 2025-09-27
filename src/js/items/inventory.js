import { applyStatusEffect } from '../combat/statusSystem.js';
import { runOnEquipHooks, runOnUnequipHooks } from '../combat/effects.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { QuestManager } from '../world/quests/QuestManager.js';
import { getTileDef } from '../world/TileRegistry.js';
import { glyphToTileId } from '../world/tileUtils.js';
import { getTerrainSystem } from '../systems/TerrainSystem.js';

export function openInventory(state) {
  console.log("[INVENTORY] openInventory() called");
  state.ui.inventoryOpen = true;
  state.ui.selectedIndex = 0;
  // Initialize inventory tab if not set
  if (!state.ui.inventoryTab) {
    state.ui.inventoryTab = 'all';
  }
  console.log("[INVENTORY] About to render inventory UI");
  renderInventory(state);
  
  // Emit quest event for inventory opened
  console.log("[INVENTORY] Emitting INVENTORY_OPENED event to QuestManager");
  QuestManager.emitEvent('INVENTORY_OPENED', {
    timestamp: Date.now()
  });
  console.log("[INVENTORY] INVENTORY_OPENED event emitted successfully");
}

export function closeInventory(state) {
  state.ui.inventoryOpen = false;
  state.render();
}

export function renderInventory(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  const titleEl = document.getElementById("overlayTitle");
  const hintEl = document.getElementById("overlayHint");
  
  overlay.style.display = "flex";
  content.innerHTML = "";
  
  // Create tab navigation
  const tabsContainer = document.createElement("div");
  tabsContainer.className = "inventory-tabs";
  tabsContainer.style.cssText = "display:flex; gap:8px; margin-bottom:12px; border-bottom:1px solid #2c2f33; padding-bottom:8px;";
  
  const tabs = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'weapon', label: 'Weapons', icon: '⚔️' },
    { id: 'armor', label: 'Armor', icon: '🛡️' },
    { id: 'headgear', label: 'Headgear', icon: '👑' },
    { id: 'ring', label: 'Rings', icon: '💍' },
    { id: 'potion', label: 'Potions', icon: '🧪' },
    { id: 'throwable', label: 'Throwables', icon: '🏺' },
    { id: 'item', label: 'Quest Items', icon: '📜' }
  ];
  
  tabs.forEach(tab => {
    const tabBtn = document.createElement("button");
    tabBtn.className = "tab-button";
    tabBtn.style.cssText = `
      padding: 6px 12px;
      background: ${state.ui.inventoryTab === tab.id ? '#2a2d32' : '#1a1d22'};
      border: 1px solid ${state.ui.inventoryTab === tab.id ? 'var(--accent)' : '#2c2f33'};
      border-radius: 4px;
      color: ${state.ui.inventoryTab === tab.id ? 'var(--accent)' : 'var(--dim)'};
      cursor: pointer;
      transition: all 0.2s;
      font-size: 12px;
    `;
    tabBtn.innerHTML = `${tab.icon} ${tab.label}`;
    tabBtn.onclick = () => {
      state.ui.inventoryTab = tab.id;
      state.ui.selectedIndex = 0;
      renderInventory(state);
    };
    tabsContainer.appendChild(tabBtn);
  });
  
  content.appendChild(tabsContainer);
  
  // Filter items based on selected tab
  let items = state.player.inventory;
  if (state.ui.inventoryTab !== 'all') {
    items = items.filter(item => item.type === state.ui.inventoryTab);
  }
  // Update title with count
  const currentTab = tabs.find(t => t.id === state.ui.inventoryTab);
  titleEl.innerHTML = `${currentTab.icon} ${currentTab.label} (${items.length} items)`;
  
  // Update hint based on tab
  let hintText = "Tab/Shift+Tab to switch tabs • ";
  if (state.ui.inventoryTab === 'potion') {
    hintText += "Enter to use • ";
  } else if (state.ui.inventoryTab === 'throwable') {
    hintText += "Enter to throw • ";
  } else if (state.ui.inventoryTab !== 'all') {
    hintText += "Enter to equip/unequip • ";
  } else {
    hintText += "Enter to use/equip • ";
  }
  hintText += "D to drop • I/Esc to close";
  hintEl.textContent = hintText;
  
  if (items.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.style.cssText = "color:var(--dim); text-align:center; padding:20px;";
    emptyMsg.textContent = `No ${currentTab.label.toLowerCase()} in inventory`;
    content.appendChild(emptyMsg);
    return;
  }
  
  // Create items container
  const itemsContainer = document.createElement("div");
  itemsContainer.className = "inventory-items";
  itemsContainer.style.cssText = "max-height:400px; overflow-y:auto;";
  
  // Track actual index in filtered list
  const filteredIndices = [];
  state.player.inventory.forEach((item, originalIdx) => {
    if (state.ui.inventoryTab === 'all' || item.type === state.ui.inventoryTab) {
      filteredIndices.push(originalIdx);
    }
  });
  
  items.forEach((item, displayIdx) => {
    const originalIdx = filteredIndices[displayIdx];
    const div = document.createElement("div");
    div.className = "item";
    if (displayIdx === state.ui.selectedIndex) div.className += " selected";
    
    let statusText = "";
    if (item.type === "weapon") {
      if (state.equippedWeaponId === item.id) statusText = " [EQUIPPED]";
      let effectText = "";
      if (item.item.effect) {
        const chance = Math.floor(item.item.effectChance * 100);
        effectText = ` | ${chance}% ${item.item.effect}`;
        if (item.item.magical) {
          effectText = `<span style="color:var(--magic)">${effectText}</span>`;
        }
      }
      div.innerHTML = `
        <div>
          <div class="name">/ ${item.item.name}${statusText}</div>
          <div class="desc">${item.item.desc} (DMG +${item.item.dmg}${effectText})</div>
        </div>
      `;
    } else if (item.type === "armor") {
      if (state.equippedArmorId === item.id) statusText = " [EQUIPPED]";
      div.innerHTML = `
        <div>
          <div class="name">] ${item.item.name}${statusText}</div>
          <div class="desc">${item.item.desc} (DEF +${item.item.def})</div>
        </div>
      `;
    } else if (item.type === "headgear") {
      if (state.equippedHeadgearId === item.id) statusText = " [EQUIPPED]";
      let stats = [];
      if (item.item.def) stats.push(`DEF +${item.item.def || 0}`);
      if (item.item.str) stats.push(`STR +${item.item.str}`);
      if (item.item.magic) stats.push(`MAG +${item.item.magic}`);
      div.innerHTML = `
        <div>
          <div class="name">^ ${item.item.name}${statusText}</div>
          <div class="desc">${item.item.desc} (${stats.join(", ")})</div>
        </div>
      `;
    } else if (item.type === "ring") {
      // Check if equipped in either slot
      let statusText = "";
      if (state.equippedRingIds) {
        if (state.equippedRingIds[0] === item.id) statusText = " [RING 1]";
        else if (state.equippedRingIds[1] === item.id) statusText = " [RING 2]";
      }
      
      let stats = [];
      if (item.item.mods) {
        const m = item.item.mods;
        if (m.str) stats.push(`STR +${m.str}`);
        if (m.def) stats.push(`DEF +${m.def}`);
        if (m.spd) stats.push(`SPD +${m.spd}`);
        if (m.mag) stats.push(`MAG +${m.mag}`);
        if (m.hp) stats.push(`HP +${m.hp}`);
        if (m.res) {
          for (const [k, v] of Object.entries(m.res)) {
            if (v > 0) stats.push(`${k} res ${Math.floor(v*100)}%`);
          }
        }
      }
      const statsText = stats.length > 0 ? ` (${stats.join(", ")})` : "";
      const special = item.item.hooks ? " ✦" : "";
      
      div.innerHTML = `
        <div>
          <div class="name">○ ${item.item.name}${statusText}${special}</div>
          <div class="desc">${item.item.desc}${statsText}</div>
        </div>
      `;
    } else if (item.type === "potion") {
      let effectText = "";
      const p = item.item;
      if (p.effect === "heal") effectText = ` (+${p.value} HP)`;
      else if (p.effect === "max_heal") effectText = " (Full heal)";
      else if (p.effect === "buff_str") effectText = ` (+${p.value} STR, ${p.turns} turns)`;
      else if (p.effect === "buff_def") effectText = ` (+${p.value} DEF, ${p.turns} turns)`;
      else if (p.effect === "buff_both") effectText = ` (+${p.value} STR/DEF, ${p.turns} turns)`;
      else if (p.effect === "berserk") effectText = ` (+${p.value} STR, -2 DEF, ${p.turns} turns)`;
      
      const countText = item.count > 1 ? ` x${item.count}` : "";
      
      div.innerHTML = `
        <div>
          <div class="name">! ${item.item.name}${countText}</div>
          <div class="desc">${item.item.desc}</div>
        </div>
      `;
    } else if (item.type === "throwable") {
      // Throwable pots - handle both item.item and direct item structures
      const throwableData = item.item || item;
      const countText = item.count > 1 ? ` x${item.count}` : "";
      const name = throwableData.name || item.name || item.id || 'Unknown Throwable';
      const desc = throwableData.desc || throwableData.description || 'A throwable item';
      
      let damageText = "";
      if (throwableData.damage) {
        damageText = ` (DMG ${throwableData.damage})`;
      } else if (throwableData.dmg) {
        damageText = ` (DMG ${throwableData.dmg})`;
      }
      
      if (throwableData.statusEffect) {
        damageText += damageText ? `, ${throwableData.statusEffect}` : ` (${throwableData.statusEffect})`;
      }
      
      div.innerHTML = `
        <div>
          <div class="name">⚱ ${name}${countText}</div>
          <div class="desc">${desc}${damageText}</div>
        </div>
      `;
    } else if (item.type === "item") {
      // Generic quest/misc items
      const countText = item.count > 1 ? ` x${item.count}` : "";
      const desc = item.item.description || item.item.desc || "A quest item";
      
      div.innerHTML = `
        <div>
          <div class="name">• ${item.item.name}${countText}</div>
          <div class="desc">${desc}</div>
        </div>
      `;
    }
    
    itemsContainer.appendChild(div);
  });
  
  content.appendChild(itemsContainer);
  
  // Store the filtered indices for use/drop operations
  state.ui.filteredIndices = filteredIndices;
}

export function useInventoryItem(state) {
  // Get the actual inventory index from filtered indices
  const actualIndex = state.ui.filteredIndices ? 
    state.ui.filteredIndices[state.ui.selectedIndex] : 
    state.ui.selectedIndex;
  
  const item = state.player.inventory[actualIndex];
  if (!item) return;
  
  if (item.type === "weapon") {
    // Toggle equipment by ID
    if (state.equippedWeaponId === item.id) {
      state.equippedWeaponId = null;
      state.player.weapon = null;
      state.log(`Unequipped ${item.item.name}.`, "note");
    } else {
      state.equippedWeaponId = item.id;
      state.player.weapon = item.item;
      state.log(`Equipped ${item.item.name}!`, "note");
    }
  } else if (item.type === "armor") {
    // Toggle equipment by ID
    if (state.equippedArmorId === item.id) {
      state.equippedArmorId = null;
      state.player.armor = null;
      state.log(`Unequipped ${item.item.name}.`, "note");
    } else {
      state.equippedArmorId = item.id;
      state.player.armor = item.item;
      state.log(`Equipped ${item.item.name}!`, "note");
    }
  } else if (item.type === "headgear") {
    // Toggle equipment by ID
    if (state.equippedHeadgearId === item.id) {
      state.equippedHeadgearId = null;
      state.player.headgear = null;
      state.log(`Unequipped ${item.item.name}.`, "note");
    } else {
      state.equippedHeadgearId = item.id;
      state.player.headgear = item.item;
      state.log(`Equipped ${item.item.name}!`, "note");
    }
  } else if (item.type === "ring") {
    // Initialize ring tracking if needed
    if (!state.equippedRingIds) state.equippedRingIds = [null, null];
    
    // Check if already equipped
    const slot1Equipped = state.equippedRingIds[0] === item.id;
    const slot2Equipped = state.equippedRingIds[1] === item.id;
    
    if (slot1Equipped || slot2Equipped) {
      // Unequip
      const slot = slot1Equipped ? 0 : 1;
      state.equippedRingIds[slot] = null;
      const oldRing = state.player.rings[slot];
      state.player.rings[slot] = null;
      if (oldRing) {
        runOnUnequipHooks(state, state.player, oldRing);
      }
      emit(EventType.Unequipped, { item: item.item, slot: `ring${slot+1}` });
      state.log(`Unequipped ${item.item.name} from ring slot ${slot+1}.`, "note");
    } else {
      // Find empty slot or ask which to replace
      let slot = -1;
      if (!state.equippedRingIds[0]) slot = 0;
      else if (!state.equippedRingIds[1]) slot = 1;
      else {
        // Both slots full - replace slot 1 for now
        slot = 0;
        const oldRing = state.player.rings[0];
        if (oldRing) {
          runOnUnequipHooks(state, state.player, oldRing);
          state.log(`Replaced ${oldRing.name} with ${item.item.name}.`, "note");
        }
      }
      
      state.equippedRingIds[slot] = item.id;
      state.player.rings[slot] = item.item;
      runOnEquipHooks(state, state.player, item.item);
      emit(EventType.Equipped, { item: item.item, slot: `ring${slot+1}` });
      state.log(`Equipped ${item.item.name} to ring slot ${slot+1}!`, "note");
    }
  } else if (item.type === "throwable") {
    // Activate throw mode with cursor
    closeInventory(state);
    
    // Handle both item.item and direct item structures
    const throwableData = item.item || item;
    const throwableName = throwableData.name || item.name || item.id || 'throwable';
    
    console.log(`[INVENTORY] Selected throwable from inventory:`, item);
    console.log(`[INVENTORY] Setting pendingThrowable with data:`, throwableData);
    
    // Store the throwable item for when throw is executed
    state.pendingThrowable = {
      item: throwableData,
      inventoryIndex: actualIndex
    };
    
    // Activate cursor for targeting
    import('../movement/cursor.js').then(cursorModule => {
      console.log(`[INVENTORY] Activating cursor for throw mode`);
      cursorModule.activateCursor('throw');
      state.log(`Aiming ${throwableName}... Use arrows to aim, Enter to throw, Escape to cancel`, "note");
    });
    
    return; // Don't consume the item yet
  } else if (item.type === "potion") {
    // Use potion
    const potion = item.item;
    let used = true;
    
    if (potion.effect === "heal") {
      const prevHp = state.player.hp;
      state.player.hp = Math.min(state.player.hpMax, state.player.hp + potion.value);
      const healed = state.player.hp - prevHp;
      state.log(`You drink the ${potion.name}. Restored ${healed} HP!`, "good");
    } else if (potion.effect === "max_heal") {
      const prevHp = state.player.hp;
      state.player.hp = state.player.hpMax;
      const healed = state.player.hp - prevHp;
      state.log(`You drink the ${potion.name}. Fully restored! (+${healed} HP)`, "good");
    } else if (potion.effect === "buff_str") {
      applyStatusEffect(state.player, "buff_str", potion.turns, potion.value);
      state.log(`You drink the ${potion.name}. +${potion.value} STR for ${potion.turns} turns!`, "good");
    } else if (potion.effect === "buff_def") {
      applyStatusEffect(state.player, "buff_def", potion.turns, potion.value);
      state.log(`You drink the ${potion.name}. +${potion.value} DEF for ${potion.turns} turns!`, "good");
    } else if (potion.effect === "buff_spd") {
      applyStatusEffect(state.player, "buff_spd", potion.turns, potion.value);
      state.log(`You drink the ${potion.name}. +${potion.value} SPD for ${potion.turns} turns!`, "good");
    } else if (potion.effect === "buff_both") {
      applyStatusEffect(state.player, "buff_str", potion.turns, potion.value);
      applyStatusEffect(state.player, "buff_def", potion.turns, potion.value);
      state.log(`You drink the ${potion.name}. +${potion.value} STR/DEF for ${potion.turns} turns!`, "good");
    } else if (potion.effect === "berserk") {
      applyStatusEffect(state.player, "buff_str", potion.turns, potion.value);
      applyStatusEffect(state.player, "debuff_def", potion.turns, 2);
      state.log(`You drink the ${potion.name}. BERSERK MODE! +${potion.value} STR, -2 DEF!`, "magic");
    } else {
      used = false;
      state.log(`The ${potion.name} has no effect right now.`, "note");
    }
    
    if (used) {
      // Decrease stack count or remove if last one
      item.count = (item.count || 1) - 1;
      state.player.potionCount--;
      
      if (item.count <= 0) {
        // Remove empty stack from inventory
        state.player.inventory.splice(actualIndex, 1);
        // Adjust selected index for filtered view
        const newFilteredItems = state.player.inventory.filter(i => 
          state.ui.inventoryTab === 'all' || i.type === state.ui.inventoryTab
        );
        if (state.ui.selectedIndex >= newFilteredItems.length) {
          state.ui.selectedIndex = Math.max(0, newFilteredItems.length - 1);
        }
      }
    }
  }
  
  renderInventory(state);
}

export function dropInventoryItem(state) {
  // Get the actual inventory index from filtered indices
  const actualIndex = state.ui.filteredIndices ? 
    state.ui.filteredIndices[state.ui.selectedIndex] : 
    state.ui.selectedIndex;
  
  const item = state.player.inventory[actualIndex];
  if (!item) return;
  
  // Ensure items array exists
  if (!state.chunk.items) state.chunk.items = [];
  
  // Unequip if equipped (check by ID)
  if (item.type === "weapon" && state.equippedWeaponId === item.id) {
    state.equippedWeaponId = null;
    state.player.weapon = null;
  } else if (item.type === "armor" && state.equippedArmorId === item.id) {
    state.equippedArmorId = null;
    state.player.armor = null;
  } else if (item.type === "headgear" && state.equippedHeadgearId === item.id) {
    state.equippedHeadgearId = null;
    state.player.headgear = null;
  } else if (item.type === "ring" && state.equippedRingIds) {
    // Check both ring slots
    if (state.equippedRingIds[0] === item.id) {
      state.equippedRingIds[0] = null;
      const oldRing = state.player.rings[0];
      state.player.rings[0] = null;
      if (oldRing) runOnUnequipHooks(state, state.player, oldRing);
    } else if (state.equippedRingIds[1] === item.id) {
      state.equippedRingIds[1] = null;
      const oldRing = state.player.rings[1];
      state.player.rings[1] = null;
      if (oldRing) runOnUnequipHooks(state, state.player, oldRing);
    }
  }
  
  const dropX = state.player.x;
  const dropY = state.player.y;
  const terrain = getTerrainSystem();
  const dropTileId = getTileIdAt(state, dropX, dropY);
  const dropHereIsFloor = canDropOnTile(dropTileId, terrain);

  const placeGroundTile = (tileId) => {
    if (!state.chunk) return false;

    if (typeof state.chunk.setTile === 'function') {
      try {
        const success = state.chunk.setTile(dropX, dropY, tileId);
        if (success) return true;
      } catch (err) {
        // Fallback to manual mapping update below
      }
    }

    const mapRow = state.chunk.map?.[dropY];
    if (!mapRow || typeof mapRow[dropX] === 'undefined') return false;

    const def = getTileDef(tileId);
    mapRow[dropX] = def.glyph;

    if (!state.chunk.tileIds) state.chunk.tileIds = [];
    if (!Array.isArray(state.chunk.tileIds[dropY])) {
      state.chunk.tileIds[dropY] = [];
    }
    state.chunk.tileIds[dropY][dropX] = tileId;
    return true;
  };

  const resolveDropTileId = (type) => {
    switch (type) {
      case 'weapon':
        return 'item.drop.weapon';
      case 'armor':
        return 'item.drop.armor';
      case 'headgear':
        return 'item.drop.headgear';
      case 'ring':
        return 'item.drop.ring';
      case 'throwable':
        return 'item.drop.throwable';
      case 'potion':
        return 'item.drop.potion';
      default:
        return 'item.drop.potion';
    }
  };

  // Handle potion stacks
  if (item.type === 'potion' && item.count > 1) {
    if (dropHereIsFloor && placeGroundTile('item.drop.potion')) {
      state.chunk.items.push({
        type: 'potion',
        x: dropX,
        y: dropY,
        item: { ...item.item }
      });
    }

    state.log(`Dropped ${item.item.name} (${item.count - 1} remaining).`, 'note');

    item.count--;
    state.player.potionCount--;
  } else if (item.type === 'throwable' && item.count > 1) {
    if (dropHereIsFloor && placeGroundTile('item.drop.throwable')) {
      state.chunk.items.push({
        type: 'throwable',
        x: dropX,
        y: dropY,
        item: { ...item.item }
      });
    }

    state.log(`Dropped ${item.item.name} (${item.count - 1} remaining).`, 'note');

    item.count--;
  } else {
    const tileId = resolveDropTileId(item.type);
    if (dropHereIsFloor && placeGroundTile(tileId)) {
      state.chunk.items.push({
        type: item.type,
        x: dropX,
        y: dropY,
        item: item.item
      });
    }

    state.log(`Dropped ${item.item.name}.`, 'note');

    state.player.inventory.splice(actualIndex, 1);
    if (item.type === 'potion') state.player.potionCount--;
  }
  
  // Adjust selected index for filtered view
  const newFilteredItems = state.player.inventory.filter(i => 
    state.ui.inventoryTab === 'all' || i.type === state.ui.inventoryTab
  );
  if (state.ui.selectedIndex >= newFilteredItems.length) {
    state.ui.selectedIndex = Math.max(0, newFilteredItems.length - 1);
  }
  
  renderInventory(state);
}

function canDropOnTile(tileId, terrain) {
  if (!tileId) return false;

  if (tileId.startsWith('item.drop.')) return false;
  if (tileId.startsWith('interaction.')) return false;
  if (tileId.startsWith('container.')) return false;

  if (tileId.startsWith('legacy.glyph.')) {
    const glyph = tileId.slice('legacy.glyph.'.length);
    return glyph === '.';
  }

  try {
    const def = getTileDef(tileId);
    if (def?.tags && (
      def.tags.includes('pickup') ||
      def.tags.includes('interactive') ||
      def.tags.includes('container')
    )) {
      return false;
    }
    if (def?.terrain && def.terrain.passable === false) {
      return false;
    }
  } catch (err) {
    // Unknown tile id; fall through to terrain check
  }

  return terrain.isPassable(tileId);
}

function getTileIdAt(state, x, y) {
  const chunk = state?.chunk;
  if (!chunk) return null;

  if (typeof chunk.getTileId === 'function') {
    const id = chunk.getTileId(x, y);
    if (id) return id;
  }

  const row = chunk.tileIds?.[y];
  if (row) {
    const id = row[x];
    if (id) return id;
  }

  const glyph = chunk.map?.[y]?.[x];
  if (typeof glyph === 'string' && glyph.length > 0) {
    const mapped = glyphToTileId(glyph, null);
    if (mapped) return mapped;
    return `legacy.glyph.${glyph}`;
  }

  return null;
}
