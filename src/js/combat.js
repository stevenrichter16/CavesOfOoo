import { clamp, roll } from './utils.js';
import { getStatusModifier, applyStatusEffect } from './statusEffects.js';
import { levelUp } from './entities.js';

export function attack(state, attacker, defender, labelA = "you", labelD = null) {
  labelD = labelD || defender.name || "enemy";
  
  const aStr = attacker.str + getStatusModifier(attacker, "str");
  const dDef = defender.def + getStatusModifier(defender, "def");
  
  // Add weapon damage if player attacking
  let weaponDmg = 0;
  let headgearStr = 0;
  if (attacker === state.player) {
    if (state.player.weapon) weaponDmg = state.player.weapon.dmg;
    if (state.player.headgear && state.player.headgear.str) headgearStr = state.player.headgear.str;
  }
  
  // Add armor and headgear defense if player defending
  let armorDef = 0;
  let headgearDef = 0;
  if (defender === state.player) {
    if (state.player.armor) armorDef = state.player.armor.def;
    if (state.player.headgear && state.player.headgear.def) headgearDef = state.player.headgear.def;
  }
  
  const totalDef = dDef + armorDef + headgearDef;
  const totalStr = aStr + headgearStr;
  const hitRoll = roll(1, 100);
  const hitChance = clamp(70 + (totalStr - totalDef) * 5, 30, 95);
  
  if (hitRoll > hitChance) { 
    state.log(`${labelA} miss ${labelD}.`); 
    const isPlayerTarget = defender === state.player;
    showDamageNumber(state, defender, "MISS", isPlayerTarget ? "player" : "enemy", true);
    return false; 
  }
  
  const crit = Math.random() < 0.15;
  const base = roll(1, totalStr) + weaponDmg - Math.floor(totalDef / 2);
  const dmg = Math.max(1, base) * (crit ? 2 : 1);
  
  defender.hp -= dmg;
  
  if (crit) state.log(`${labelA} crit ${labelD} for ${dmg}!`, "good");
  else state.log(`${labelA} hit ${labelD} for ${dmg}.`);
  
  const isPlayerTarget = defender === state.player;
  const damageText = crit ? `${dmg}!` : dmg.toString();
  showDamageNumber(state, defender, damageText, isPlayerTarget ? "player" : "enemy");
  
  // Apply weapon effects if attacker is player with an enchanted weapon
  if (attacker === state.player && state.player.weapon && state.player.weapon.effect) {
    const weapon = state.player.weapon;
    const magicBonus = state.player.headgear && state.player.headgear.magic ? state.player.headgear.magic * 0.05 : 0;
    const effectChance = weapon.effectChance + magicBonus;
    
    if (Math.random() < effectChance) {
      if (weapon.effect === "lifesteal") {
        // Life steal heals the attacker
        const healAmount = Math.floor(dmg * weapon.effectValue);
        attacker.hp = Math.min(attacker.hpMax, attacker.hp + healAmount);
        state.log(`You drain ${healAmount} life!`, "good");
        showDamageNumber(state, attacker, healAmount.toString(), "heal");
      } else if (weapon.effect === "freeze") {
        // Freeze skips enemy turns
        applyStatusEffect(defender, "freeze", weapon.effectTurns, 0);
        state.log(`${labelD} is frozen solid!`, "magic");
      } else if (weapon.effect === "burn") {
        applyStatusEffect(defender, "burn", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} catches fire!`, "bad");
      } else if (weapon.effect === "poison") {
        applyStatusEffect(defender, "poison", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} is poisoned!`, "bad");
      } else if (weapon.effect === "shock") {
        applyStatusEffect(defender, "shock", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} is electrified!`, "magic");
      } else if (weapon.effect === "weaken") {
        applyStatusEffect(defender, "weaken", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} is weakened!`, "note");
      }
    }
  }
  
  if (defender.hp <= 0) { 
    defender.alive = false; 
    state.log(`${labelD} is defeated!`, "good");
    
    // Grant XP if player killed a monster
    if (attacker === state.player && defender.xp) {
      state.player.xp += defender.xp;
      state.log(`+${defender.xp} XP`, "xp");
      if (state.player.xp >= state.player.xpNext) {
        levelUp(state);
      }
    }
  }
  
  return true;
}

export function showDamageNumber(state, entity, text, targetType = "enemy", isMiss = false) {
  const gameEl = document.getElementById("game");
  const charWidth = 8; // Approximate monospace char width
  const lineHeight = 17; // Line height from CSS
  
  // Get coordinates from entity
  const x = entity.x !== undefined ? entity.x : 0;
  const y = entity.y !== undefined ? entity.y : 0;
  
  const dmgEl = document.createElement("div");
  
  // Set appropriate class based on target
  if (isMiss) {
    dmgEl.className = "damage-float miss";
  } else if (targetType === "player") {
    dmgEl.className = "damage-float player-damage";
    text = `-${text}`; // Add minus sign for player damage
  } else if (targetType === "heal") {
    dmgEl.className = "damage-float heal";
    text = `+${text}`; // Add plus sign for healing
  } else {
    dmgEl.className = "damage-float enemy-damage";
  }
  
  dmgEl.textContent = text;
  dmgEl.style.left = `${x * charWidth}px`;
  dmgEl.style.top = `${y * lineHeight}px`;
  
  gameEl.parentElement.appendChild(dmgEl);
  setTimeout(() => dmgEl.remove(), 1000);
}