import { W, H, TILE, QUOTES, WEAPONS, ARMORS, HEADGEAR, POTIONS, TIMES, WEATHERS } from './config.js';
import { rnd, choice, esc } from './utils.js';
import { makePlayer, levelUp } from './entities.js';
import { genChunk, findOpenSpot } from './worldGen.js';
import { saveChunk, loadChunk, clearWorld } from './persistence.js';
import { attack, showDamageNumber } from './combat.js';
import { processStatusEffects, getStatusModifier, applyStatusEffect, isFrozen } from './statusEffects.js';
import { openInventory, closeInventory, renderInventory, useInventoryItem, dropInventoryItem } from './inventory.js';

// Game state
let STATE = null;

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

function interactTile(state, x, y) {
  const tile = state.chunk.map[y][x];
  if (!state.chunk.items) state.chunk.items = [];
  const items = state.chunk.items;
  
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
      "The floor hums with ancient magic.",
      "A voice echoes: 'Remember to be awesome.'",
      "Time feels stretchy here, like taffy."
    ]), "magic");
  } else if (tile === "$") {
    // Open chest
    const chest = items.find(i => i.type === "chest" && i.x === x && i.y === y);
    if (chest && !chest.opened) {
      chest.opened = true;
      state.chunk.map[y][x] = ".";
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
  
  // Calculate distance to player
  const dx = Math.abs(state.player.x - monster.x);
  const dy = Math.abs(state.player.y - monster.y);
  const distance = dx + dy;
  
  // Check if player is in range
  if (distance > monster.ability.range) return false;
  
  // Check if ability triggers (with tier scaling already applied)
  if (Math.random() >= monster.ability.chance) return false;
  
  // Execute ability
  const ability = monster.ability;
  const abilityNames = {
    fireBlast: "emits a blast of fire",
    iceBreath: "breathes freezing ice",
    poisonSpit: "spits toxic venom",
    electricPulse: "releases an electric pulse"
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
  
  // Apply status effect if any
  if (ability.effect && ability.effectTurns > 0) {
    applyStatusEffect(state.player, ability.effect, ability.effectTurns, ability.effectValue);
    
    const effectMessages = {
      burn: "You catch fire!",
      freeze: "You are frozen solid!",
      poison: "You are poisoned!",
      shock: "You are electrified!"
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
  // Convert old biome names to new ones
  if (biome === "candy_forest") biomeClass = "candy";
  else if (biome === "frost_caverns") biomeClass = "ice";
  else if (biome === "volcanic_marsh") biomeClass = "fire";
  else if (biome === "glimmering_meadows") biomeClass = "slime";
  
  gameEl.className = `biome-${biomeClass}`;
  
  let html = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const char = buf[y][x];
      const monsterTier = monsterMap.get(`${x},${y}`);
      
      if (monsterTier) {
        // Check if this is a flame pup for special styling
        const monster = monsters.find(m => m.x === x && m.y === y && m.alive);
        const tierClass = `monster-tier-${monsterTier}`;
        if (monster && monster.name === "flame pup") {
          html += `<span class="flame-pup ${tierClass}">${char}</span>`;
        } else {
          // Color monster based on tier
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
  setText("time", `${TIMES[state.timeIndex]} / ${state.weather}`);
  
  // Display friendly biome name
  let biomeName = biome;
  if (biome === "candy_forest" || biome === "candy") biomeName = "candy";
  else if (biome === "frost_caverns" || biome === "ice") biomeName = "ice";
  else if (biome === "volcanic_marsh" || biome === "fire") biomeName = "fire";
  else if (biome === "glimmering_meadows" || biome === "slime") biomeName = "slime";
  
  setText("biome", biomeName);
  setText("coords", `(${state.cx},${state.cy})`);
  
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
  
  // Inventory overlay
  document.getElementById("overlay").style.display = state.ui.inventoryOpen ? "flex" : "none";
  
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
    ui: { inventoryOpen: false, selectedIndex: 0 },
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
  
  return state;
}

// Initialize game
export function initGame() {
  STATE = newWorld();
  render(STATE);
  
  // Keyboard controls
  window.addEventListener("keydown", e => {
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
    else if (k.toLowerCase() === "f") {
      // Debug: Test freeze
      log(STATE, "=== DEBUG: Testing Freeze ===", "magic");
      applyStatusEffect(STATE.player, "freeze", 2, 0);
      log(STATE, "Applied freeze effect for 2 turns", "magic");
      log(STATE, `Status effects: ${JSON.stringify(STATE.player.statusEffects)}`, "note");
      log(STATE, `isFrozen result: ${isFrozen(STATE.player)}`, "note");
      render(STATE);
      e.preventDefault();
    }
  });
  
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