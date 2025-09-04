// src/engine/adapters/cavesOfOoo.js
import { runPhase, runPhases } from '../sim.js';
import { getEntityId, getStatusEffectsAsArray, Status } from '../../combat/statusSystem.js';
import { emit } from '../../utils/events.js';
import { EventType } from '../../utils/eventTypes.js';

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

  const result = { 
    id: entity.id || 'entity', 
    hp: entity.hp, 
    hpMax: entity.hpMax, 
    x: entity.x,
    y: entity.y,
    name: entity.name,
    statuses, 
    materials 
  };
  
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
  if (t === '%') return ['powder','explosive'];
  return [];
}

// Get tile material information
export function getTileMaterial(state, x, y) {
  const tile = state.chunk?.map?.[y]?.[x];
  switch(tile) {
    case '~': 
      return { 
        id: 'water', 
        tags: ['liquid', 'extinguisher', 'conductive'],
        props: { extinguishingPower: 25, conductivityAmp: 1.5 }
      };
    case '%': 
      return { 
        id: 'candy_dust', 
        tags: ['powder', 'flammable', 'explosive', 'sweet'],
        props: { explosionDamage: 15, explosionRadius: 3, ignitionThreshold: 1 }
      };
    case '^': 
      return { 
        id: 'spikes', 
        tags: ['sharp', 'hazard', 'metal'],
        props: { damage: 5, damageType: 'piercing' }
      };
    default: 
      return null;
  }
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
      tileMaterial: getTileMaterial(state, entity.x, entity.y),
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

// Helper function to apply area effects
function applyAreaEffect(state, source, act) {
  const { x, y, radius, damage, damageType, excludeSource } = act;
  
  console.log(`[ENGINE] Applying ${damageType} area effect at (${x},${y}) with radius ${radius}`);
  
  // If this explosion is at a candy dust tile, remove it (it's exploding)
  if (damageType === 'explosion' && state.chunk?.map) {
    if (y >= 0 && y < state.chunk.map.length &&
        x >= 0 && x < state.chunk.map[0].length &&
        state.chunk.map[y][x] === '%') {
      console.log(`[ENGINE] Removing exploded candy dust at origin (${x},${y})`);
      state.chunk.map[y][x] = '.';
    }
  }
  
  // Check for chain reactions - find candy dust tiles in blast radius
  if (damageType === 'explosion' && state.chunk?.map) {
    const chainReactionTiles = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const checkX = x + dx;
        const checkY = y + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Skip the source tile and check if in radius
        if ((dx !== 0 || dy !== 0) && distance <= radius) {
          // Check if this tile is candy dust
          if (checkY >= 0 && checkY < state.chunk.map.length &&
              checkX >= 0 && checkX < state.chunk.map[0].length &&
              state.chunk.map[checkY][checkX] === '%') {
            chainReactionTiles.push({ x: checkX, y: checkY });
            // Mark it as already exploding to prevent re-triggering
            state.chunk.map[checkY][checkX] = '.';
            console.log(`[ENGINE] Chain reaction: Found candy dust at (${checkX},${checkY}) - removed`);
          }
        }
      }
    }
    
    // Queue delayed chain explosions
    chainReactionTiles.forEach((tile, index) => {
      setTimeout(() => {
        console.log(`[ENGINE] Chain explosion at (${tile.x},${tile.y})`);
        
        // Double-check tile is removed (in case of timing issues)
        if (state.chunk?.map?.[tile.y]?.[tile.x] === '%') {
          state.chunk.map[tile.y][tile.x] = '.';
        }
        
        // Trigger visual effect
        emit('explosion', { x: tile.x, y: tile.y });
        
        // Apply another area effect from this tile (with same radius as original)
        applyAreaEffect(state, null, {
          x: tile.x,
          y: tile.y,
          radius: 3,
          damage: 15,
          damageType: 'explosion',
          effect: 'explosion',
          excludeSource: false
        });
        
        if (state.log) {
          state.log(`💥 Chain explosion at (${tile.x},${tile.y})!`, 'danger');
        }
        
        // Trigger a re-render to update the map display
        if (state.render) {
          state.render();
        }
      }, 50 + (index * 50)); // Quick chain explosions for immediate effect
    });
    
    // Also trigger render after initial explosion
    if (state.render && chainReactionTiles.length > 0) {
      state.render();
    }
  }
  
  // Damage player if in range (check even if dead for overkill damage)
  if (state.player) {
    const dx = Math.abs(state.player.x - x);
    const dy = Math.abs(state.player.y - y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= radius) {
      // Skip if source and excluding source
      if (excludeSource && source === state.player && distance === 0) {
        console.log(`[ENGINE] Skipping source entity (player)`);
      } else if (state.player.hp > 0) { // Only damage if still has HP
        const falloff = distance === 0 ? 1 : (1 - distance / (radius + 1));
        const actualDamage = Math.floor(damage * falloff);
        state.player.hp -= actualDamage;
        
        console.log(`[ENGINE] Player takes ${actualDamage} ${damageType} damage (distance: ${distance}), HP: ${state.player.hp}`);
        
        if (state.log) {
          if (distance === 0) {
            // Direct hit message already handled by rule
          } else {
            state.log(`You take ${actualDamage} damage from the ${act.effect || damageType}!`, 'bad');
          }
        }
        
        if (state.player.hp <= 0 && state.player.alive) {
          state.player.alive = false;
          state.over = true;
          if (state.log) {
            state.log(`You were killed by the ${act.effect || damageType}!`, 'bad');
          }
          // Emit EntityDied event to clean up particles
          console.log('[ENGINE] Emitting EntityDied event for player');
          emit(EventType.EntityDied, { id: 'player', name: 'You', cause: act.effect || damageType });
        }
      }
    }
  }
  
  // Damage monsters in range (check all monsters, even dead ones for overkill)
  if (state.chunk?.monsters) {
    state.chunk.monsters.forEach(monster => {
      // Don't skip dead monsters, but only damage if they have HP
      
      const dx = Math.abs(monster.x - x);
      const dy = Math.abs(monster.y - y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        // Skip if source and excluding source
        if (excludeSource && source === monster && distance === 0) {
          console.log(`[ENGINE] Skipping source entity (${monster.name})`);
          return;
        }
        
        // Only apply damage if monster still has HP
        if (monster.hp > 0) {
          const falloff = distance === 0 ? 1 : (1 - distance / (radius + 1));
          const actualDamage = Math.floor(damage * falloff);
          const oldHp = monster.hp;
          monster.hp = Math.max(0, monster.hp - actualDamage);
          
          console.log(`[ENGINE] ${monster.name} takes ${actualDamage} ${damageType} damage (${oldHp} -> ${monster.hp})`);
          
          if (state.log) {
            state.log(`${monster.name} takes ${actualDamage} ${act.effect || damageType} damage!`, 'note');
          }
          
          if (monster.hp <= 0 && monster.alive) {
            monster.alive = false;
            if (state.log) {
              state.log(`${monster.name} was killed by the ${act.effect || damageType}!`, 'good');
            }
            // Award XP for kill
            if (state.player) {
              state.player.xp = (state.player.xp || 0) + (monster.xpValue || 10);
              state.player.kills = (state.player.kills || 0) + 1;
            }
          }
        } else {
          console.log(`[ENGINE] ${monster.name} already at 0 HP, skipping damage`);
        }
      }
    });
  }
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
        if (entity.hp <= 0 && entity.alive) {
          entity.alive = false;
          console.log(`[ENGINE] Entity killed by damage`);
          
          // Check if this is the player and emit EntityDied event
          if (entity === state.player || entity.id === 'player') {
            state.over = true;
            console.log('[ENGINE] Player killed by damage action, emitting EntityDied');
            emit(EventType.EntityDied, { id: 'player', name: 'You', cause: act.dtype || 'damage' });
          }
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
        if (state.log) {
          state.log(act.message, act.style || 'note');
        } else if (state.emit) {
          state.emit('Log', { text: act.message, cls: act.style || 'note' });
        }
        break;
      }
      case 'areaEffect': {
        console.log(`[ENGINE] Area effect: ${act.effect} at (${act.x},${act.y}) radius ${act.radius}`);
        applyAreaEffect(state, entity, act);
        break;
      }
      case 'removeTile': {
        if (state.chunk?.map?.[act.y]?.[act.x]) {
          const oldTile = state.chunk.map[act.y][act.x];
          state.chunk.map[act.y][act.x] = '.';
          console.log(`[ENGINE] Removed tile at (${act.x},${act.y}): ${oldTile} -> .`);
        }
        break;
      }
      case 'visualEffect': {
        console.log(`[ENGINE] Visual effect: ${act.effect} at (${act.x},${act.y})`);
        emit(act.effect, { x: act.x, y: act.y });
        break;
      }
      case 'triggerExplosion': {
        console.log(`[ENGINE] Triggering explosion at (${act.x},${act.y})`);
        // This would re-trigger the explosion rule at the specified location
        // Implementation depends on how we want to handle it
        break;
      }
      case 'delayedAction': {
        console.log(`[ENGINE] Queueing delayed action: ${act.action.type} in ${act.delay}ms`);
        setTimeout(() => {
          applyActions(state, entity, [act.action]);
        }, act.delay);
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
export function runMovementForEntity(state, entity, fromX, fromY, toX, toY) {
  console.log(`[ENGINE] === Running MOVEMENT phase for entity ===`);
  const ctx = buildContext(state, entity, { 
    kind: 'move',
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY }
  });
  
  // Update context with destination tile material
  ctx.env.tileMaterial = getTileMaterial(state, toX, toY);
  ctx.env.tileTags = getTileTags(state, toX, toY);
  
  runPhase('movement', ctx);
  applyActions(state, entity, ctx.queue);
}

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

// Export applyAreaEffect for external use (like throwables)
export { applyAreaEffect as applyAreaEffectPublic };