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
import * as PlayerMovement from './systems/playerMovement.js';
import { isBlocked } from './queries.js';
import * as ShopSystem from './systems/shop.js';
import * as ShopUI from './ui/shop.js';
import * as VendorQuests from './systems/vendorQuests.js';
import { processMonsterTurns } from './systems/monsters.js';
import { openQuestTurnIn, processQuestRewards, closeQuestTurnIn } from './systems/questTurnIn.js';
import { renderQuestTurnIn as renderQuestTurnInUI, renderQuestTurnInConfirm as renderQuestTurnInConfirmUI } from './ui/questTurnIn.js';
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


// Vendor shop functions
export function openVendorShop(state, vendor, skipQuestCheck = false) {
  // Initialize vendor quest if needed
  VendorQuests.initializeVendorQuest(state, vendor);
  
  // Check for completed quests first (unless explicitly skipping)
  if (!skipQuestCheck) {
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
      renderQuestTurnIn(state);  // Need to render the UI
      return;
    }
  }
  
  // Use systems/shop.js to open shop (handles vendor initialization)
  ShopSystem.openShop(state, vendor);
  // Use ui/shop.js to render
  ShopUI.renderShop(state);
}

export function closeShop(state) {
  // Use systems/shop.js to handle closing (manages state)
  ShopSystem.closeShop(state);
  // UI will auto-close via event listener
  render(state);
}

// Quest turn-in wrapper functions (delegate to systems/questTurnIn.js)
export function renderQuestTurnIn(state) {
  renderQuestTurnInUI(state);
}

export function renderQuestTurnInConfirm(state) {
  renderQuestTurnInConfirmUI(state);
}

export function claimQuestRewards(state, questsToTurnIn = null) {
  processQuestRewards(state, questsToTurnIn);
}

// Old implementations removed - moved to systems/questTurnIn.js and ui/questTurnIn.js

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


// Delegate tile interactions to PlayerMovement module
export function interactTile(state, x, y) {
  PlayerMovement.interactTile(state, x, y, openVendorShop);
}

// Large interactTile function moved to PlayerMovement module
/*
  The original function handled vendor interaction, artifacts, special tiles,
  chests, potions, equipment, and shrines. All this logic is now in
  src/js/systems/playerMovement.js
*/


export function handlePlayerMove(state, dx, dy) {
  if (state.over) return;
  
  // Set up state references for movement system
  state.FETCH_ITEMS = FETCH_ITEMS;
  state.openVendorShop = openVendorShop; // Pass vendor shop function
  
  // Process movement through the movement system
  const consumed = PlayerMovement.handlePlayerMove(state, dx, dy);
  
  // If action was consumed (move attempted), run enemy turn
  if (consumed) {
    processMonsterTurns(state);
    turnEnd(state);
  }
}


export function waitTurn(state) { 
  if (state.over) return;
  
  const consumed = PlayerMovement.waitTurn(state);
  
  if (consumed) {
    processMonsterTurns(state);
    turnEnd(state);
  }
}

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

export function turnEnd(state) {
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
  state.FETCH_ITEMS = FETCH_ITEMS; // Set reference for PlayerMovement module
  PlayerMovement.loadOrGenChunk(state, 0, 0);
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
  
  // Initialize quest turn-in UI
  import('./ui/questTurnIn.js').then(module => {
    module.initQuestTurnInUI();
  });
  
  // Listen for quest turn-in events
  on('questTurnIn:openShop', ({ vendor }) => {
    // Skip quest check to avoid immediately reopening quest turn-in
    openVendorShop(STATE, vendor, true);
  });
  
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