// gear/effects.js
// Unified way to read gear passives (mods/resists) and run gear hooks.
// Works for armor/headgear/weapon and new ring slots.

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// ---- Shape conventions ----
// Each equipped item may optionally define:
//   mods: { hp?:number, str?:number, def?:number, spd?:number, mag?:number,
//           res?: { fire?:number, ice?:number, poison?:number, shock?:number, bleed?:number } }
//   hooks: {
//     onAttack?(state, wearer, target, ctx)        // after resolve, before/after HP apply
//     onHitTaken?(state, wearer, attacker, ctx)    // after damage is applied to wearer
//     onTurnEnd?(state, wearer)                    // once per turn at end
//     onEquip?(state, wearer) / onUnequip?(...)    // optional, for immediate effects
//   }

export function equippedItemsOf(entity) {
  // Adjust to your entity schema if different:
  // weapon, armor, headgear, rings: [r1, r2]
  const out = [];
  if (entity.weapon) out.push(entity.weapon);
  if (entity.armor) out.push(entity.armor);
  if (entity.headgear) out.push(entity.headgear);
  if (Array.isArray(entity.rings)) {
    for (const r of entity.rings) if (r) out.push(r);
  }
  return out;
}

export function getGearMods(entity) {
  const base = { hp:0, str:0, def:0, spd:0, mag:0, res:{ fire:0, ice:0, poison:0, shock:0, bleed:0 } };
  for (const it of equippedItemsOf(entity)) {
    const m = it?.mods;
    if (!m) continue;
    if (m.hp)  base.hp  += m.hp;
    if (m.str) base.str += m.str;
    if (m.def) base.def += m.def;
    if (m.spd) base.spd += m.spd;
    if (m.mag) base.mag += m.mag;
    if (m.res) {
      for (const k of Object.keys(base.res)) {
        const v = m.res[k];
        if (typeof v === 'number') base.res[k] += v; // additive; clamp later if needed
      }
    }
  }
  // Optional clamp of resists (e.g., 0..0.85)
  for (const k of Object.keys(base.res)) base.res[k] = Math.max(0, Math.min(0.85, base.res[k]));
  return base;
}

export function runOnAttackHooks(state, attacker, target, ctx) {
  for (const it of equippedItemsOf(attacker)) {
    const fn = it?.hooks?.onAttack;
    if (typeof fn === 'function') {
      try {
        fn(state, attacker, target, ctx);
        emit(EventType.GearEffectTriggered, { type:'onAttack', item: it.name || it.type, by: attacker.id, vs: target.id });
      } catch (e) { /* swallow to keep combat safe */ }
    }
  }
}

export function runOnHitTakenHooks(state, wearer, attacker, ctx) {
  for (const it of equippedItemsOf(wearer)) {
    const fn = it?.hooks?.onHitTaken;
    if (typeof fn === 'function') {
      try {
        fn(state, wearer, attacker, ctx);
        emit(EventType.GearEffectTriggered, { type:'onHitTaken', item: it.name || it.type, by: wearer.id, vs: attacker.id });
      } catch (e) {}
    }
  }
}

export function runOnTurnEndHooks(state, entity) {
  for (const it of equippedItemsOf(entity)) {
    const fn = it?.hooks?.onTurnEnd;
    if (typeof fn === 'function') {
      try {
        fn(state, entity);
        emit(EventType.GearEffectTriggered, { type:'onTurnEnd', item: it.name || it.type, by: entity.id });
      } catch (e) {}
    }
  }
}

export function runOnEquipHooks(state, entity, item) {
  const fn = item?.hooks?.onEquip;
  if (typeof fn === 'function') {
    try {
      fn(state, entity);
      emit(EventType.GearEffectTriggered, { type:'onEquip', item: item.name || item.type, by: entity.id });
    } catch (e) {}
  }
}

export function runOnUnequipHooks(state, entity, item) {
  const fn = item?.hooks?.onUnequip;
  if (typeof fn === 'function') {
    try {
      fn(state, entity);
      emit(EventType.GearEffectTriggered, { type:'onUnequip', item: item.name || item.type, by: entity.id });
    } catch (e) {}
  }
}