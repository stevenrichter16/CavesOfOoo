// src/engine/adapters/cavesOfOoo.js
import { runPhase } from '../sim.js';

/** Build an engine-friendly snapshot of an entity */
export function toEngineEntity(state, entity) {
  // Map your statusEffects -> engine statuses
  const statuses = (entity.statusEffects || []).map(s => ({
    id: s.type,
    tags: tagsForStatus(s.type),
    props: { ...s }
  }));

  // Materials from environment/gear/simple mirrors
  const materials = [];

  // On water tile? Treat as water material
  const tile = state.chunk?.map?.[entity.y]?.[entity.x];
  if (tile === '~') materials.push({ id:'water', tags:['liquid','extinguisher','conductive'], props:{} });

  // Mirror 'wet' status as a water pool to enable physics later
  const wet = statuses.find(s => s.id === 'wet');
  if (wet) {
    materials.push({ id:'water', tags:['liquid','extinguisher','conductive'], props:{ quantity: wet.quantity ?? 20 } });
  }

  // Optional: mild conductivity from metal gear
  const gear = [entity.armor, entity.headgear].filter(Boolean);
  if (gear.some(g => /steel|iron|metal/i.test(g?.name ?? ''))) {
    materials.push({ id:'metal', tags:['solid','conductive'], props:{ conductivityAmp: 1.2 } });
  }

  return { 
    id: entity.id || 'entity', 
    statuses, 
    materials,
    hp: entity.hp,
    hpMax: entity.hpMax
  };
}

function tagsForStatus(t) {
  if (t === 'wet') return ['coated','conductive','extinguisher'];
  if (t === 'water_slow') return ['conductive','wet']; // Water slow also makes you conductive!
  if (t === 'burning') return ['fire','dot'];
  if (t === 'shock') return ['electric','dot'];
  return [];
}

/** Apply queued actions to your real game state */
export function applyActions(state, entity, queue) {
  for (const act of queue) {
    switch (act.type) {
      case 'addStatus': {
        const turns = act.props?.turns ?? 3;
        const val   = act.props?.intensity ?? act.props?.value ?? 1;
        state.applyStatus(entity, act.id, turns, val);
        break;
      }
      case 'removeStatus': {
        if (!entity.statusEffects) break;
        const i = entity.statusEffects.findIndex(s => s.type === act.id);
        if (i >= 0) entity.statusEffects.splice(i, 1);
        break;
      }
      case 'consumeCoating': {
        if (act.id === 'water') {
          const wet = entity.statusEffects?.find(s => s.type === 'wet');
          if (wet) {
            const amt = (act.qty === 'all') ? (wet.quantity || 20) : (act.qty || 1);
            wet.quantity = Math.max(0, (wet.quantity || 20) - amt);
            if (wet.quantity === 0) {
              const i = entity.statusEffects.findIndex(s => s.type === 'wet');
              if (i >= 0) entity.statusEffects.splice(i, 1);
            }
          }
        }
        break;
      }
      case 'damage': {
        entity.hp = Math.max(0, (entity.hp || 0) - act.amount);
        if (entity.hp <= 0) entity.alive = false;
        break;
      }
      // 'spawn' (explosions etc.) omitted for the minimal test
    }
  }
}

/** Run tick-phase rules for an entity (you'll call this for the player each turn) */
export function runTickForEntity(state, entity, env = {}) {
  const ctx = {
    entity: toEngineEntity(state, entity),
    env: { temperatureC: 20, oxygen: 1.0, autoIgniteAtC: 500, ...env },
    event: { kind: 'tick' },
    rand: Math.random,
    queue: []
  };
  const q = runPhase('tick', ctx);
  applyActions(state, entity, q);
}

/** Let rules modify incoming damage before you subtract HP */
export function runPreDamage(state, defender, damage /* {amount,type} */, env = {}) {
  const engineEntity = toEngineEntity(state, defender);
  
  const ctx = {
    entity: engineEntity,
    env: { temperatureC: 20, oxygen: 1.0, autoIgniteAtC: 500, ...env },
    event: { kind: 'damage', damage },
    rand: Math.random,
    queue: []
  };
  runPhase('predamage', ctx); // may change ctx.event.damage.amount
  
  return ctx.event.damage;
}