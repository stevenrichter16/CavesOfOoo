import { clamp, roll } from './utils.js';
import { getStatusModifier, applyStatusEffect } from './statusEffects.js';
import { levelUp } from './entities.js';
import { updateQuestProgress } from './quests.js';
import { emit } from './events.js';
import { EventType } from './eventTypes.js';

export function attack(state, attacker, defender, labelA = "you", labelD = null) {
  labelD = labelD || defender.name || "enemy";
  const aStr = attacker.str + getStatusModifier(attacker, "str");
  const dDef = defender.def + getStatusModifier(defender, "def");
  const dSpd = defender.spd || 0; // Speed for dodge calculation
  
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
  let headgearSpd = 0;
  if (defender === state.player) {
    if (state.player.armor) armorDef = state.player.armor.def;
    if (state.player.headgear) {
      if (state.player.headgear.def) headgearDef = state.player.headgear.def;
      if (state.player.headgear.spd) headgearSpd = state.player.headgear.spd;
    }
  }
  
  const totalDef = dDef + armorDef + headgearDef;
  const totalStr = aStr + headgearStr;
  const totalSpd = dSpd + headgearSpd + getStatusModifier(defender, "spd");
  
  // NEW FORMULA: Hit chance based on STR vs SPD
  const hitRoll = roll(1, 100);
  const hitChance = clamp(75 + (totalStr * 2) - (totalSpd * 3), 35, 85);
  
  if (hitRoll > hitChance) { 
    state.log(`${labelA} miss ${labelD}.`); 
    emit(EventType.Miss, {by:labelA, vs:labelD});
    const isPlayerTarget = defender === state.player;
    emit(EventType.FloatingText, { 
      x: defender.x, 
      y: defender.y, 
      text: "MISS", 
      kind: 'miss' 
    });
    return false; 
  }
  
  const crit = Math.random() < 0.15;
  // NEW DAMAGE FORMULA: DEF reduces damage directly (0.5 per point)
  const base = roll(1, totalStr) + weaponDmg;
  const reduced = Math.max(1, base - Math.floor(totalDef * 0.5));
  const dmg = reduced * (crit ? 2 : 1);
  
  defender.hp -= dmg;
  if (crit) {
    state.log(`${labelA} crit ${labelD} for ${dmg}!`, "good");
    emit(EventType.Crit, {by:labelA, vs:labelD, dmg:dmg});
  }
  else {
    emit(EventType.Hit, {by:labelA, vs:labelD, dmg:dmg});
    state.log(`${labelA} hit ${labelD} for ${dmg}.`);
  }
  
  const isPlayerTarget = defender === state.player;
  const damageText = crit ? `${dmg}!` : dmg.toString();
  emit(EventType.FloatingText, { 
    x: defender.x, 
    y: defender.y, 
    text: damageText, 
    kind: crit ? 'crit' : 'damage'
  });
  
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
        // Lifesteal effect handled via floating text
        // TODO: Use applyStatusEffect for lifesteal weapon
        emit(EventType.FloatingText, { 
          x: attacker.x, 
          y: attacker.y, 
          text: `+${healAmount}`, 
          kind: 'heal' 
        });
      } else if (weapon.effect === "freeze") {
        // Freeze skips enemy turns
        applyStatusEffect(defender, "freeze", weapon.effectTurns, 0);
        state.log(`${labelD} is frozen solid!`, "magic");
        emit(EventType.StatusEffectRegister, { type:"freeze", vs:labelD });
      } else if (weapon.effect === "burn") {
        applyStatusEffect(defender, "burn", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} catches fire!`, "bad");
        emit(EventType.StatusEffectRegister, { type:"burn", vs:labelD });
      } else if (weapon.effect === "poison") {
        applyStatusEffect(defender, "poison", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} is poisoned!`, "bad");
        emit(EventType.StatusEffectRegister, { type:'poison', vs:labelD});
      } else if (weapon.effect === "shock") {
        applyStatusEffect(defender, "shock", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} is electrified!`, "magic");
        emit(EventType.StatusEffectRegister, { type:'shock', vs:labelD });
      } else if (weapon.effect === "weaken") {
        applyStatusEffect(defender, "weaken", weapon.effectTurns, weapon.effectValue);
        state.log(`${labelD} is weakened!`, "note");
        emit(EventType.StatusEffectRegister, { type: 'weaken', vs: labelD });
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
      
      // Update quest progress when player kills a monster
      updateQuestProgress(state, defender.kind);
      
      // Gold drop from monsters
      const tier = defender.tier || 1;
      const goldAmount = Math.floor(Math.random() * (tier * 5 + 10)) + 5;
      state.player.gold += goldAmount;
      state.log(`+${goldAmount} gold!`, "gold");
      
      if (state.player.xp >= state.player.xpNext) {
        levelUp(state);
      }
    }
  }
  
  return true;
}

// showDamageNumber removed - now using EventType.FloatingText events