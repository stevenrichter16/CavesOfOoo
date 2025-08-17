import { applyStatusEffect } from './statusEffects.js';

export function openInventory(state) {
  state.ui.inventoryOpen = true;
  state.ui.selectedIndex = 0;
  renderInventory(state);
}

export function closeInventory(state) {
  state.ui.inventoryOpen = false;
  state.render();
}

export function renderInventory(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  
  overlay.style.display = "flex";
  content.innerHTML = "";
  
  const items = state.player.inventory;
  if (items.length === 0) {
    content.innerHTML = "<div style='color:var(--dim)'>Your inventory is empty.</div>";
    return;
  }
  
  items.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    if (idx === state.ui.selectedIndex) div.className += " selected";
    
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
    }
    
    content.appendChild(div);
  });
}

export function useInventoryItem(state) {
  const item = state.player.inventory[state.ui.selectedIndex];
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
        state.player.inventory.splice(state.ui.selectedIndex, 1);
        if (state.ui.selectedIndex >= state.player.inventory.length) {
          state.ui.selectedIndex = Math.max(0, state.player.inventory.length - 1);
        }
      }
    }
  }
  
  renderInventory(state);
}

export function dropInventoryItem(state) {
  const item = state.player.inventory[state.ui.selectedIndex];
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
  }
  
  // Handle potion stacks
  if (item.type === "potion" && item.count > 1) {
    // Drop just one from the stack
    const tile = "!";
    if (state.chunk.map[state.player.y][state.player.x] === ".") {
      state.chunk.map[state.player.y][state.player.x] = tile;
      state.chunk.items.push({
        type: "potion",
        x: state.player.x,
        y: state.player.y,
        item: { ...item.item }  // Clone the potion
      });
    }
    
    state.log(`Dropped ${item.item.name} (${item.count - 1} remaining).`, "note");
    
    // Decrease stack count
    item.count--;
    state.player.potionCount--;
  } else {
    // Drop entire item/last potion in stack
    const tile = item.type === "weapon" ? "/" : 
                  item.type === "armor" ? "]" : 
                  item.type === "headgear" ? "^" : "!";
    if (state.chunk.map[state.player.y][state.player.x] === ".") {
      state.chunk.map[state.player.y][state.player.x] = tile;
      state.chunk.items.push({
        type: item.type,
        x: state.player.x,
        y: state.player.y,
        item: item.item
      });
    }
    
    state.log(`Dropped ${item.item.name}.`, "note");
    
    // Remove from inventory
    state.player.inventory.splice(state.ui.selectedIndex, 1);
    if (item.type === "potion") state.player.potionCount--;
  }
  
  if (state.ui.selectedIndex >= state.player.inventory.length) {
    state.ui.selectedIndex = Math.max(0, state.player.inventory.length - 1);
  }
  
  renderInventory(state);
}