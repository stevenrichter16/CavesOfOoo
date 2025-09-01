// src/engine/adapters/cavesOfOoo.js
import { runPhase, runPhases } from '../sim.js';
import { getEntityId, getStatusEffectsAsArray, Status } from '../../combat/statusSystem.js';

// ===== Snapshot builders =====
export function toEngineEntity(state, entity) {
  console.log(`\n[ENGINE-SNAPSHOT] Building entity snapshot for engine processing...`);
  
  // Get status effects from Map
  const statusEffectsArray = getStatusEffectsAsArray(entity);
  console.log(`[ENGINE-SNAPSHOT] Entity has ${statusEffectsArray.length} status effects`);
  
  const statuses = statusEffectsArray.map(s => {
    const tags = tagsForStatus(s.type);
    console.log(`[ENGINE-SNAPSHOT]   • ${s.type}: [${tags.join(', ')}] (${s.turns} turns)`);
    return {
      id: s.type,
      tags: tags,
      props: { turns: s.turns, value: s.value, quantity: s.quantity, ...s }
    };
  });

  const materials = [];
  const tile = state.chunk?.map?.[entity.y]?.[entity.x];
  if (tile === '~') {
    console.log(`[ENGINE] Entity on water tile, adding water material with conductive tag`);
    materials.push({ id: 'water', tags: ['liquid','extinguisher','conductive'], props: {} });
  }

  // Simple gear conductivity
  const gear = [entity.armor, entity.headgear].filter(Boolean);
  if (gear.some(g => /steel|iron|metal/i.test(g?.name ?? ''))) {
    console.log(`[ENGINE] Entity has metal gear, adding conductive material`);
    materials.push({ id: 'metal', tags: ['solid','conductive'], props: { conductivityAmp: 1.2 } });
  }

  // Mirror wet quantity as a water pool (physics use later)
  const wet = statuses.find(s => s.id === 'wet');
  if (wet && (wet.props?.quantity ?? 0) > 0) {
    console.log(`[ENGINE] Wet status detected with quantity ${wet.props.quantity}, adding water material`);
    materials.push({ id: 'water', tags: ['liquid','extinguisher','conductive'], props: { quantity: wet.props.quantity } });
  }

  const result = { id: entity.id || 'entity', hp: entity.hp, hpMax: entity.hpMax, statuses, materials };
  
  const hasConductive = statuses.some(s => s.tags?.includes('conductive')) || materials.some(m => m.tags?.includes('conductive'));
  console.log(`[ENGINE-SNAPSHOT] Snapshot complete:`);
  console.log(`[ENGINE-SNAPSHOT]   • HP: ${result.hp}/${result.hpMax}`);
  console.log(`[ENGINE-SNAPSHOT]   • Statuses: ${statuses.length} | Materials: ${materials.length}`);
  console.log(`[ENGINE-SNAPSHOT]   • Conductive: ${hasConductive ? 'YES ⚡' : 'NO'}`);
  
  return result;
}

export function tagsForStatus(id) {
  if (id === 'wet') return ['coated','conductive','extinguisher'];
  if (id === 'burn' || id === 'burning') return ['fire','dot','hot'];
  if (id === 'poison') return ['toxic','dot'];
  if (id === 'shock') return ['electric','dot','paralyze'];
  if (id === 'bleed') return ['physical','dot'];
  if (id === 'freeze') return ['ice','control','immobilize'];
  if (id === 'weaken') return ['debuff','strength'];
  if (id === 'armor') return ['buff','defense'];
  if (id === 'water_slow') return ['wet','movement_impair','conductive'];
  return [];
}

function getTileTags(state, x, y) {
  const t = state.chunk?.map?.[y]?.[x];
  if (t === '~') return ['water','liquid'];
  if (t === '^') return ['spikes','hazard'];
  return [];
}

// ===== Context builder =====
export function buildContext(state, entity, event = {}) {
  console.log(`[ENGINE] Building context for event: ${event.kind || 'unknown'}`);
  if (event.damage) {
    console.log(`[ENGINE] Damage event: type=${event.damage.type}, amount=${event.damage.amount}`);
  }
  if (event.status) {
    console.log(`[ENGINE] Status event: id=${event.status.id}, turns=${event.status.props?.turns}, value=${event.status.props?.value}`);
  }
  
  const ctx = {
    entity: toEngineEntity(state, entity),
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: getTileTags(state, entity.x, entity.y),
      timeOfDay: state.time || 'day',
      weather: state.weather || 'clear'
    },
    event,
    state,
    rand: Math.random,
    queue: []
  };
  
  return ctx;
}

// ===== Action applier =====
export function applyActions(state, entity, queue) {
  console.log(`[ENGINE] Applying ${queue.length} actions`);
  
  for (const act of queue) {
    console.log(`[ENGINE] Processing action: ${act.type}`, act);
    
    switch (act.type) {
      case 'addStatus': {
        const turns = act.props?.turns ?? 3;
        const val   = act.props?.value ?? 1;
        console.log(`[ENGINE] Adding status '${act.id}' for ${turns} turns with value ${val}`);
        state.applyStatus?.(entity, act.id, turns, val);
        // Handle quantity property if needed
        if (act.props?.quantity != null) {
          const entityId = getEntityId(entity);
          const effects = Status.get(entityId);
          if (effects && effects[act.id]) {
            effects[act.id].quantity = act.props.quantity;
            console.log(`[ENGINE] Set ${act.id} quantity to ${act.props.quantity}`);
          }
        }
        break;
      }
      case 'removeStatus': {
        const entityId = getEntityId(entity);
        const effects = Status.get(entityId);
        if (effects && effects[act.id]) {
          console.log(`[ENGINE] Removing status '${act.id}'`);
          delete effects[act.id];
        } else {
          console.log(`[ENGINE] Status '${act.id}' not found to remove`);
        }
        break;
      }
      case 'damage': {
        const oldHp = entity.hp;
        entity.hp = Math.max(0, (entity.hp || 0) - (act.amount || 0));
        console.log(`[ENGINE] Applied ${act.amount} damage (${act.dtype || 'untyped'}): HP ${oldHp} -> ${entity.hp}`);
        if (entity.hp <= 0) {
          entity.alive = false;
          console.log(`[ENGINE] Entity killed by damage`);
        }
        break;
      }
      case 'consumeCoating': {
        console.log(`[ENGINE] Consuming coating '${act.id}' qty=${act.qty}`);
        if (act.id === 'water') {
          const entityId = getEntityId(entity);
          const effects = Status.get(entityId);
          if (effects && effects['wet']) {
            const wet = effects['wet'];
            const amt = act.qty === 'all' ? (wet.quantity || 0) : (act.qty || 0);
            const oldQty = wet.quantity || 0;
            wet.quantity = Math.max(0, oldQty - amt);
            console.log(`[ENGINE] Wet coating: ${oldQty} -> ${wet.quantity}`);
            if (wet.quantity === 0) {
              delete effects['wet'];
              console.log(`[ENGINE] Removed wet status (quantity depleted)`);
            }
          }
        }
        break;
      }
      case 'preventTurn': {
        console.log(`[ENGINE] Preventing turn: ${act.reason}`);
        entity._engine ||= {};
        entity._engine.preventTurn = act.reason || true;
        break;
      }
      case 'modifyStat': {
        entity._engine ||= {};
        const mods = (entity._engine.statMods ||= {});
        const oldMod = mods[act.stat] || 0;
        mods[act.stat] = oldMod + (act.modifier || 0);
        console.log(`[ENGINE] Stat mod ${act.stat}: ${oldMod} -> ${mods[act.stat]} (source: ${act.source})`);
        break;
      }
      case 'log': {
        console.log(`[ENGINE] Game log: ${act.message}`);
        state.log?.(state, act.message, 'note');
        break;
      }
      // stopPhase/stopAllPhases handled in sim control flow
      default: 
        console.log(`[ENGINE] Unknown action type: ${act.type}`);
        break;
    }
  }
}

// ===== Public runners (keep existing behavior working) =====
export function runTickForEntity(state, entity, env = {}) {
  console.log(`[ENGINE] === Running TICK phase for entity ===`);
  const ctx = buildContext(state, entity, { kind: 'turn' });
  runPhase('tick', ctx);
  applyActions(state, entity, ctx.queue);
  // Clear transient engine fields at end of turn
  if (entity._engine) { 
    console.log(`[ENGINE] Clearing transient engine fields`);
    delete entity._engine.preventTurn; 
    delete entity._engine.statMods; 
  }
}

export function runPreDamage(state, defender, damage /* {amount,type} */, env = {}) {
  console.log(`[ENGINE] === Running PREDAMAGE phase ===`);
  console.log(`[ENGINE] Incoming damage: ${damage.amount} ${damage.type}`);
  const ctx = buildContext(state, defender, { kind: 'damage', damage });
  runPhase('predamage', ctx);
  if (ctx.event.damage.amount !== damage.amount) {
    console.log(`[ENGINE] Damage modified: ${damage.amount} -> ${ctx.event.damage.amount}`);
  }
  return ctx.event.damage;
}

// Optional: higher-level helpers (introduce gradually)
export function processEntityTurn(state, entity) {
  const ctx = buildContext(state, entity, { kind: 'turn' });
  runPhase('preturn', ctx);
  if (!ctx.queue.some(a => a.type === 'preventTurn')) {
    runPhase('tick', ctx);
  }
  runPhase('cleanup', ctx);
  applyActions(state, entity, ctx.queue);
  if (entity._engine) { delete entity._engine.preventTurn; delete entity._engine.statMods; }
  return !ctx.queue.some(a => a.type === 'preventTurn');
}

export function applyStatusWithEngine(state, entity, statusId, turns, value) {
  console.log(`[ENGINE] === Applying status '${statusId}' with engine ===`);
  const ctx = buildContext(state, entity, { kind: 'applyStatus', status: { id: statusId, props: { turns, value } } });
  runPhase('apply', ctx);
  // If not prevented, add it
  if (!ctx.queue.some(a => a.type === 'preventStatus')) {
    console.log(`[ENGINE] Status not prevented, applying '${statusId}'`);
    state.applyStatus?.(entity, statusId, turns, value);
  } else {
    console.log(`[ENGINE] Status '${statusId}' was prevented by a rule`);
  }
  applyActions(state, entity, ctx.queue);
}

export function processDamageWithEngine(state, attacker, defender, damage) {
  const ctx = buildContext(state, defender, { kind: 'damage', damage: { ...damage } });
  ctx.attacker = toEngineEntity(state, attacker);
  runPhases(['predamage','damage','postdamage'], ctx);
  applyActions(state, defender, ctx.queue);
  return ctx.event.damage.amount;
}