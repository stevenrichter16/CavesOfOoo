// combat.js - Event-driven, DOM-free combat system
import { emit } from './events.js';
import { EventType } from './eventTypes.js';
import { clamp, roll } from './utils.js';
import { getStatusModifier, applyStatusEffect } from './systems/statusSystem.js';
import { levelUp } from './entities.js';
import { updateQuestProgress } from './quests.js';
import { getGearMods, runOnAttackHooks, runOnHitTakenHooks } from './gear/effects.js';

// Helper to humanize names in logs
const label = (e) => {
  if (e === null || e === undefined) return 'unknown';
  if (e.isPlayer || e === 'player') return 'You';
  return e.name || 'enemy';
};

export function attack(state, attacker, defender, method = 'melee') {
  // Set up IDs for events
  attacker.id = attacker.id || (attacker === state.player ? 'player' : `monster_${attacker.x}_${attacker.y}`);
  defender.id = defender.id || (defender === state.player ? 'player' : `monster_${defender.x}_${defender.y}`);
  
  // Cancellable pre-event (auras/status can cancel)
  const pre = { 
    attackerId: attacker.id, 
    defenderId: defender.id, 
    method, 
    cancel: false 
  };
  emit(EventType.WillAttack, pre);
  if (pre.cancel) return 'cancelled';

  const res = resolveAttack(state, attacker, defender, method);
  return applyAttack(state, attacker, defender, res);
}

export function resolveAttack(state, attacker, defender, method = 'melee') {
  // Get gear mods for both combatants
  const aMods = getGearMods(attacker);
  const dMods = getGearMods(defender);
  
  // Calculate stats with equipment, gear mods, and status modifiers
  const aStr = (attacker.str || 0) + aMods.str + getStatusModifier(attacker, "str");
  const dDef = (defender.def || 0) + dMods.def + getStatusModifier(defender, "def");
  const dSpd = (defender.spd || 0) + dMods.spd + getStatusModifier(defender, "spd");
  const aMag = (attacker.mag || 0) + aMods.mag;
  
  // Add weapon damage if player attacking
  let weaponDmg = 0;
  let headgearStr = 0;
  if (attacker === state.player || attacker.isPlayer) {
    if (state.player.weapon) weaponDmg = state.player.weapon.dmg;
    if (state.player.headgear && state.player.headgear.str) headgearStr = state.player.headgear.str;
  }
  
  // Add armor and headgear defense if player defending
  let armorDef = 0;
  let headgearDef = 0;
  let headgearSpd = 0;
  if (defender === state.player || defender.isPlayer) {
    if (state.player.armor) armorDef = state.player.armor.def;
    if (state.player.headgear) {
      if (state.player.headgear.def) headgearDef = state.player.headgear.def;
      if (state.player.headgear.spd) headgearSpd = state.player.headgear.spd;
    }
  }
  
  const totalDef = dDef + armorDef + headgearDef;
  const totalStr = aStr + headgearStr;
  const totalSpd = dSpd + headgearSpd;
  
  // Hit chance based on STR vs SPD
  const hitRoll = roll(1, 100);
  const hitChance = clamp(75 + (totalStr * 2) - (totalSpd * 3), 35, 85);
  
  const by = label(attacker);
  const vs = label(defender);
  
  if (hitRoll > hitChance) {
    return { hit: false, crit: false, dmg: 0, by, vs, method };
  }
  
  // Calculate damage
  const crit = Math.random() < 0.15;
  const base = roll(1, totalStr) + weaponDmg;
  const reduced = Math.max(1, base - Math.floor(totalDef * 0.5));
  const dmg = reduced * (crit ? 2 : 1);
  
  // Check for weapon effects (enhanced by magic stat)
  let weaponEffect = null;
  if (attacker === state.player && state.player.weapon && state.player.weapon.effect) {
    const weapon = state.player.weapon;
    const magicBonus = aMag * 0.01; // 1% per magic point
    const effectChance = weapon.effectChance + magicBonus;
    
    if (Math.random() < effectChance) {
      weaponEffect = {
        type: weapon.effect,
        turns: weapon.effectTurns,
        value: weapon.effectValue
      };
    }
  }
  
  return { hit: true, crit, dmg, by, vs, method, weaponEffect };
}

export function applyAttack(state, attacker, defender, result) {
  // Emit attack completion
  emit(EventType.DidAttack, {
    attackerId: attacker.id,
    defenderId: defender.id,
    method: result.method
  });
  
  if (!result.hit) {
    emit(EventType.Miss, { by: result.by, vs: result.vs });
    emit(EventType.FloatingText, { 
      x: defender.x, 
      y: defender.y, 
      text: 'MISS', 
      kind: 'miss' 
    });
    return 'miss';
  }
  
  // Apply damage
  defender.hp = Math.max(0, (defender.hp || 0) - result.dmg);
  
  // Emit hit/crit events
  if (result.crit) {
    emit(EventType.Crit, { by: result.by, vs: result.vs, dmg: result.dmg });
  } else {
    emit(EventType.Hit, { by: result.by, vs: result.vs, dmg: result.dmg });
  }
  
  // Emit damage events
  emit(EventType.TookDamage, { 
    id: defender.id, 
    amount: -result.dmg, 
    source: result.method, 
    byId: attacker.id 
  });
  
  emit(EventType.FloatingText, { 
    x: defender.x, 
    y: defender.y, 
    text: result.crit ? `${result.dmg}!` : `${result.dmg}`, 
    kind: result.crit ? 'crit' : 'damage'
  });
  
  // Run gear hooks after damage is applied
  const ctx = { dmg: result.dmg, crit: result.crit, method: result.method };
  runOnAttackHooks(state, attacker, defender, ctx);
  runOnHitTakenHooks(state, defender, attacker, ctx);
  
  // Apply weapon effects if any
  if (result.weaponEffect) {
    const effect = result.weaponEffect;
    
    if (effect.type === "lifesteal") {
      // Life steal heals the attacker
      const healAmount = Math.floor(result.dmg * effect.value);
      attacker.hp = Math.min(attacker.hpMax, attacker.hp + healAmount);
      
      emit(EventType.Log, { text: `You drain ${healAmount} life!`, cls: "good" });
      emit(EventType.FloatingText, { 
        x: attacker.x, 
        y: attacker.y, 
        text: `+${healAmount}`, 
        kind: 'heal' 
      });
    } else {
      // Apply status effects
      applyStatusEffect(defender, effect.type, effect.turns, effect.value);
      emit(EventType.StatusEffectRegister, { 
        type: effect.type, 
        vs: result.vs,
        toId: defender.id,
        turns: effect.turns,
        value: effect.value
      });
    }
  }
  
  // Check for death
  if (defender.hp <= 0) {
    defender.alive = false;
    
    emit(EventType.EntityDied, {
      id: defender.id,
      name: result.vs,
      by: result.by,
      byId: attacker.id,
      cause: result.method
    });
    
    // Grant rewards if player killed a monster
    if (attacker === state.player && defender.xp) {
      // XP reward
      state.player.xp += defender.xp;
      emit(EventType.Log, { text: `+${defender.xp} XP`, cls: "xp" });
      
      // Update quest progress
      updateQuestProgress(state, defender.kind);
      
      // Gold drop
      const tier = defender.tier || 1;
      const goldAmount = Math.floor(Math.random() * (tier * 5 + 10)) + 5;
      state.player.gold += goldAmount;
      emit(EventType.Log, { text: `+${goldAmount} gold!`, cls: "gold" });
      
      // Check for level up
      if (state.player.xp >= state.player.xpNext) {
        levelUp(state);
      }
    }
    
    return 'kill';
  }
  
  return 'hit';
}