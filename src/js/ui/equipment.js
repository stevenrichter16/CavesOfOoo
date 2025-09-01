// ui/equipment.js - Equipment and stats panel rendering
// Handles all equipment display and stat calculations UI

import { getGearMods } from '../combat/effects.js';
import { getStatusModifier } from '../combat/statusSystem.js';

/**
 * Render the equipment panel showing all equipped items and stats
 */
export function renderEquipmentPanel(state) {
  const slotsEl = document.getElementById("equipmentSlots");
  const statsEl = document.getElementById("totalStats");
  
  if (!slotsEl || !statsEl) return;
  
  // Clear previous content
  slotsEl.innerHTML = "";
  
  // Find equipped items by ID
  const equippedWeapon = state.player.inventory.find(i => i.id === state.equippedWeaponId);
  const equippedArmor = state.player.inventory.find(i => i.id === state.equippedArmorId);
  const equippedHeadgear = state.player.inventory.find(i => i.id === state.equippedHeadgearId);
  const equippedRing1 = state.equippedRingIds ? state.player.inventory.find(i => i.id === state.equippedRingIds[0]) : null;
  const equippedRing2 = state.equippedRingIds ? state.player.inventory.find(i => i.id === state.equippedRingIds[1]) : null;
  
  // Render each equipment slot
  renderWeaponSlot(slotsEl, equippedWeapon, state);
  renderArmorSlot(slotsEl, equippedArmor);
  renderHeadgearSlot(slotsEl, equippedHeadgear);
  renderRingSlot(slotsEl, equippedRing1, 1);
  renderRingSlot(slotsEl, equippedRing2, 2);
  
  // Render total stats
  renderTotalStats(statsEl, state, equippedWeapon, equippedArmor, equippedHeadgear);
}

/**
 * Render weapon slot
 */
function renderWeaponSlot(container, equippedWeapon, state) {
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
  container.appendChild(weaponDiv);
}

/**
 * Render armor slot
 */
function renderArmorSlot(container, equippedArmor) {
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
  container.appendChild(armorDiv);
}

/**
 * Render headgear slot
 */
function renderHeadgearSlot(container, equippedHeadgear) {
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
  container.appendChild(headgearDiv);
}

/**
 * Render ring slot
 */
function renderRingSlot(container, equippedRing, slotNumber) {
  const ringDiv = document.createElement("div");
  ringDiv.className = equippedRing ? "equipment-slot" : "equipment-slot empty";
  
  if (equippedRing) {
    const stats = [];
    if (equippedRing.item.mods) {
      const m = equippedRing.item.mods;
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
    
    ringDiv.innerHTML = `
      <div class="slot-label">Ring ${slotNumber}</div>
      <div class="item-name">○ ${equippedRing.item.name}</div>
      <div class="item-stats">
        ${stats.join("")}
      </div>
    `;
  } else {
    ringDiv.innerHTML = `
      <div class="slot-label">Ring ${slotNumber}</div>
      <div class="item-name">Empty</div>
    `;
  }
  container.appendChild(ringDiv);
}

/**
 * Render total stats panel
 */
function renderTotalStats(container, state, equippedWeapon, equippedArmor, equippedHeadgear) {
  const p = state.player;
  
  // Calculate equipment bonuses
  const weaponDmg = p.weapon ? p.weapon.dmg : 0;
  const armorDef = p.armor ? p.armor.def : 0;
  const headgearDef = p.headgear ? (p.headgear.def || 0) : 0;
  const headgearStr = p.headgear ? (p.headgear.str || 0) : 0;
  const headgearSpd = p.headgear ? (p.headgear.spd || 0) : 0;
  const headgearMagic = p.headgear ? (p.headgear.magic || 0) : 0;
  
  // Get gear mods including rings
  const gearMods = getGearMods(p);
  
  // Get status effect bonuses
  const statusStrBonus = getStatusModifier(p, "str");
  const statusDefBonus = getStatusModifier(p, "def");
  const statusSpdBonus = getStatusModifier(p, "spd");
  
  // Calculate totals
  const totalStr = p.str + gearMods.str + statusStrBonus;
  const totalDef = p.def + armorDef + headgearDef + gearMods.def + statusDefBonus;
  const totalSpd = (p.spd || 0) + headgearSpd + gearMods.spd + statusSpdBonus;
  const totalMag = (p.mag || 0) + headgearMagic + gearMods.mag;
  
  // Build stats HTML
  let html = `
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
  `;
  
  // Add gear bonuses if present
  if (gearMods.str > 0) {
    html += `<div class="stat-row">
      <span class="stat-label">  + Gear STR:</span>
      <span class="stat-value" style="color:var(--accent)">+${gearMods.str}</span>
    </div>`;
  }
  
  if (gearMods.spd > 0) {
    html += `<div class="stat-row">
      <span class="stat-label">  + Gear SPD:</span>
      <span class="stat-value" style="color:var(--speed)">+${gearMods.spd}</span>
    </div>`;
  }
  
  if (totalMag > 0) {
    html += `<div class="stat-row">
      <span class="stat-label">  + Magic:</span>
      <span class="stat-value" style="color:var(--magic)">+${totalMag} (+${totalMag * 5}% proc)</span>
    </div>`;
  }
  
  // Add status effect bonuses
  if (statusStrBonus || statusDefBonus) {
    html += `<div class="stat-row">
      <span class="stat-label">Status Effects:</span>
      <span class="stat-value"></span>
    </div>`;
  }
  
  if (statusStrBonus) {
    html += `<div class="stat-row">
      <span class="stat-label">  + Buff STR:</span>
      <span class="stat-value" style="color:var(--xp)">+${statusStrBonus}</span>
    </div>`;
  }
  
  if (statusDefBonus) {
    html += `<div class="stat-row">
      <span class="stat-label">  + Buff DEF:</span>
      <span class="stat-value" style="color:var(--xp)">+${statusDefBonus}</span>
    </div>`;
  }
  
  // Add totals
  html += `
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
  
  if (totalMag > 0) {
    html += `<div class="stat-row">
      <span class="stat-label"><strong>Total MAG:</strong></span>
      <span class="stat-value"><strong>${totalMag}</strong></span>
    </div>`;
  }
  
  // Add resistances section
  html += renderResistances(gearMods);
  
  container.innerHTML = html;
}

/**
 * Render resistances section
 */
function renderResistances(gearMods) {
  if (!gearMods.res) return "";
  
  const hasResistances = Object.values(gearMods.res).some(v => v > 0);
  if (!hasResistances) return "";
  
  let html = `<div class="stat-row" style="border-top:1px solid #2c2f33;margin-top:8px;padding-top:8px;">
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
      
      html += `<div class="stat-row">
        <span class="stat-label">  ${type}:</span>
        <span class="stat-value" style="color:${color}">${percent}%</span>
      </div>`;
    }
  }
  
  return html;
}

/**
 * Helper function to get status effect display character
 */
export function getStatusChar(statusType) {
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

/**
 * Helper function to get status effect CSS class
 */
export function getStatusClass(statusType) {
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