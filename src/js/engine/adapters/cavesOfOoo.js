// src/engine/adapters/cavesOfOoo.js
import { runPhase, runPhases } from '../sim.js';
import { getEntityId, getStatusEffectsAsArray, Status, applyStatusEffect } from '../../combat/statusSystem.js';
import { emit } from '../../utils/events.js';
import { EventType } from '../../utils/eventTypes.js';

// ===== Snapshot builders =====
export function toEngineEntity(state, entity) {
  // Get status effects from Map
  const statusEffectsArray = getStatusEffectsAsArray(entity);
  
  const statuses = statusEffectsArray.map(s => {
    const tags = tagsForStatus(s.type);
    return {
      id: s.type,
      tags: tags,
      props: { turns: s.turns, value: s.value, quantity: s.quantity, ...s }
    };
  });

  const materials = [];
  const tile = state.chunk?.map?.[entity.y]?.[entity.x];
  if (tile === '~') {
    materials.push({ id: 'water', tags: ['liquid','extinguisher','conductive'], props: {} });
  }

  // Simple gear conductivity
  const gear = [entity.armor, entity.headgear].filter(Boolean);
  if (gear.some(g => /steel|iron|metal/i.test(g?.name ?? ''))) {
    materials.push({ id: 'metal', tags: ['solid','conductive'], props: { conductivityAmp: 1.2 } });
  }

  // Mirror wet quantity as a water pool (physics use later)
  const wet = statuses.find(s => s.id === 'wet');
  if (wet && (wet.props?.quantity ?? 0) > 0) {
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
  if (event.damage) {
  }
  if (event.status) {
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
  
  
  // If this explosion is at a candy dust tile, remove it (it's exploding)
  if (damageType === 'explosion' && state.chunk?.map) {
    if (y >= 0 && y < state.chunk.map.length &&
        x >= 0 && x < state.chunk.map[0].length &&
        state.chunk.map[y][x] === '%') {
      state.chunk.map[y][x] = '.';
    }
  }
  
  // Check for water electrification
  if (damageType === 'electric' && state.chunk?.map) {
    const electrifiedTiles = [];
    // Find all connected water tiles
    const visited = new Set();
    const queue = [[x, y]];
    
    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const key = `${cx},${cy}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // Check if this position is water
      if (cy >= 0 && cy < state.chunk.map.length &&
          cx >= 0 && cx < state.chunk.map[0].length &&
          state.chunk.map[cy][cx] === '~') {
        electrifiedTiles.push({ x: cx, y: cy });
        
        // Check adjacent tiles (within radius)
        const adjacentDirs = [[-1,0], [1,0], [0,-1], [0,1]];
        for (const [dx, dy] of adjacentDirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          const dist = Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y));
          if (dist <= radius && !visited.has(`${nx},${ny}`)) {
            queue.push([nx, ny]);
          }
        }
      }
    }
    
    // First pass: Immediately check and mark all entities in electrified water
    const shockedEntities = [];
    let immediateKills = false;
    electrifiedTiles.forEach(tile => {
      // Check player
      if (state.player && state.player.x === tile.x && state.player.y === tile.y) {
        shockedEntities.push({ entity: state.player, x: tile.x, y: tile.y, isPlayer: true });
        // Immediate visual feedback
        emit(EventType.FloatingText, {
          x: state.player.x,
          y: state.player.y,
          text: 'ZAP!',
          kind: 'crit',
          duration: 600
        });
      }
      
      // Check monsters - apply immediate damage and mark dead ones
      if (state.chunk?.monsters) {
        state.chunk.monsters.forEach(monster => {
          if (monster.x === tile.x && monster.y === tile.y && monster.alive) {
            // Apply immediate damage
            const oldHp = monster.hp;
            monster.hp = Math.max(0, monster.hp - damage);
            
            if (monster.hp <= 0) {
              monster.alive = false;
              immediateKills = true;
              
              // Award XP for electric kill
              if (state.player) {
                state.player.xp = (state.player.xp || 0) + (monster.xpValue || 10);
                state.player.kills = (state.player.kills || 0) + 1;
              }

              // Emit MONSTER_KILLED for quest tracking
              import('../../world/quests/QuestManager.js').then(module => {
                const monsterData = {
                  monster: {
                    id: monster.id || `${monster.kind}_${monster.x}_${monster.y}`,
                    name: monster.name || 'monster',
                    kind: monster.kind,
                    x: monster.x,
                    y: monster.y,
                    tier: monster.tier || 1
                  },
                  timestamp: Date.now()
                };
                module.QuestManager.emitEvent('MONSTER_KILLED', monsterData);
              }).catch(() => {});
              
              if (state.log) state.log(`${monster.name} was electrocuted!`, "good");
            } else {
              shockedEntities.push({ entity: monster, x: tile.x, y: tile.y, isPlayer: false });
            }
            
            // Immediate visual feedback
            emit(EventType.FloatingText, {
              x: monster.x,
              y: monster.y,
              text: monster.hp <= 0 ? 'DEAD!' : 'ZAP!',
              kind: 'crit',
              duration: 600
            });
          }
        });
      }
    });
    
    // Immediately render to remove dead enemies
    if (immediateKills && state.render && typeof state.render === 'function') {
      state.render();
    }
    
    // Apply electric effect to all water tiles and entities in them
    let anyKills = false;
    electrifiedTiles.forEach((tile, index) => {
      // Animate electricity on water tiles
      setTimeout(() => {
        
        // Show electric animation on water
        emit(EventType.FloatingText, {
          x: tile.x,
          y: tile.y,
          text: 'z',
          kind: 'magic',
          duration: 500
        });
        
        // Apply damage and status to any entity on this water tile
        if (state.player && state.player.x === tile.x && state.player.y === tile.y) {
          applyStatusEffect(state.player, 'shock', 3, 4);
          state.player.hp -= damage;
          
          // Show shock effect on player
          emit(EventType.FloatingText, {
            x: state.player.x,
            y: state.player.y,
            text: 'SHOCKED!',
            kind: 'magic',
            duration: 800
          });
          
          // Damage number
          emit(EventType.FloatingText, {
            x: state.player.x,
            y: state.player.y,
            text: `-${damage}`,
            kind: 'damage',
            duration: 600
          });
          
          if (state.log) state.log("You're shocked by the electrified water!", "danger");
        }
        
        // Check monsters (skip if already dead from immediate damage)
        if (state.chunk?.monsters) {
          state.chunk.monsters.forEach(monster => {
            if (monster.x === tile.x && monster.y === tile.y && monster.alive && monster.hp > 0) {
              // Only apply status effect in second pass (damage was already applied)
              applyStatusEffect(monster, 'shock', 3, 4);
              
              // Show continuing shock effect on monster
              emit(EventType.FloatingText, {
                x: monster.x,
                y: monster.y,
                text: 'SHOCKED!',
                kind: 'magic',
                duration: 800
              });
              
              if (state.log) state.log(`${monster.name} is shocked by the electrified water!`, "combat");
            }
          });
        }
        
        // If this is the last tile and we had any kills, trigger render
        if (index === electrifiedTiles.length - 1 && anyKills) {
          if (state.render && typeof state.render === 'function') {
            state.render();
          }
        }
      }, index * 50); // Cascade effect
    });
    
    // Create immediate and continuous electric animation on shocked entities
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        // Animate shocked entities immediately with more frequent updates
        shockedEntities.forEach(shocked => {
          if (shocked.entity.hp > 0 && (shocked.entity.alive !== false)) {
            const entitySymbols = ['!', 'z', 'Z', 'x', '*'];
            emit(EventType.FloatingText, {
              x: shocked.entity.x,
              y: shocked.entity.y,
              text: entitySymbols[i % entitySymbols.length],
              kind: i % 2 === 0 ? 'crit' : 'magic',
              duration: 250
            });
          }
        });
      }, i * 250); // More frequent animations
    }
    
    // Create continuous electric animation on water tiles for a few seconds
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        electrifiedTiles.forEach(tile => {
          const symbols = ['z', 'Z', '~', 'z'];
          emit(EventType.FloatingText, {
            x: tile.x,
            y: tile.y,
            text: symbols[i % symbols.length],
            kind: 'magic',
            duration: 400
          });
        });
      }, 500 + i * 400);
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
          }
        }
      }
    }
    
    // Queue delayed chain explosions
    chainReactionTiles.forEach((tile, index) => {
      setTimeout(() => {
        
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
      } else if (state.player.hp > 0) { // Only damage if still has HP
        const falloff = distance === 0 ? 1 : (1 - distance / (radius + 1));
        const actualDamage = Math.floor(damage * falloff);
        state.player.hp -= actualDamage;
        
        
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
          return;
        }
        
        // Only apply damage if monster still has HP
        if (monster.hp > 0) {
          const falloff = distance === 0 ? 1 : (1 - distance / (radius + 1));
          const actualDamage = Math.floor(damage * falloff);
          const oldHp = monster.hp;
          monster.hp = Math.max(0, monster.hp - actualDamage);
          
          
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

            // Emit MONSTER_KILLED for quest tracking
            import('../../world/quests/QuestManager.js').then(module => {
              const monsterData = {
                monster: {
                  id: monster.id || `${monster.kind}_${monster.x}_${monster.y}`,
                  name: monster.name || 'monster',
                  kind: monster.kind,
                  x: monster.x,
                  y: monster.y,
                  tier: monster.tier || 1
                },
                timestamp: Date.now()
              };
              module.QuestManager.emitEvent('MONSTER_KILLED', monsterData);
            }).catch(() => {});
          }
        } else {
        }
      }
    });
  }
}

// ===== Action applier =====
export function applyActions(state, entity, queue) {
  
  for (const act of queue) {
    
    switch (act.type) {
      case 'addStatus': {
        const turns = act.props?.turns ?? 3;
        const val   = act.props?.value ?? 1;
        state.applyStatus?.(entity, act.id, turns, val);
        // Handle quantity property if needed
        if (act.props?.quantity != null) {
          const entityId = getEntityId(entity);
          const effects = Status.get(entityId);
          if (effects && effects[act.id]) {
            effects[act.id].quantity = act.props.quantity;
          }
        }
        break;
      }
      case 'removeStatus': {
        const entityId = getEntityId(entity);
        const effects = Status.get(entityId);
        if (effects && effects[act.id]) {
          delete effects[act.id];
        } else {
        }
        break;
      }
      case 'damage': {
        const oldHp = entity.hp;
        entity.hp = Math.max(0, (entity.hp || 0) - (act.amount || 0));
        if (entity.hp <= 0 && entity.alive) {
          entity.alive = false;
          
          // Check if this is the player and emit EntityDied event
          if (entity === state.player || entity.id === 'player') {
            state.over = true;
            emit(EventType.EntityDied, { id: 'player', name: 'You', cause: act.dtype || 'damage' });
          }
        }
        break;
      }
      case 'consumeCoating': {
        if (act.id === 'water') {
          const entityId = getEntityId(entity);
          const effects = Status.get(entityId);
          if (effects && effects['wet']) {
            const wet = effects['wet'];
            const amt = act.qty === 'all' ? (wet.quantity || 0) : (act.qty || 0);
            const oldQty = wet.quantity || 0;
            wet.quantity = Math.max(0, oldQty - amt);
            if (wet.quantity === 0) {
              delete effects['wet'];
            }
          }
        }
        break;
      }
      case 'preventTurn': {
        entity._engine ||= {};
        entity._engine.preventTurn = act.reason || true;
        break;
      }
      case 'modifyStat': {
        entity._engine ||= {};
        const mods = (entity._engine.statMods ||= {});
        const oldMod = mods[act.stat] || 0;
        mods[act.stat] = oldMod + (act.modifier || 0);
        break;
      }
      case 'log': {
        if (state.log) {
          state.log(act.message, act.style || 'note');
        } else if (state.emit) {
          state.emit('Log', { text: act.message, cls: act.style || 'note' });
        }
        break;
      }
      case 'areaEffect': {
        applyAreaEffect(state, entity, act);
        break;
      }
      case 'removeTile': {
        if (state.chunk?.map?.[act.y]?.[act.x]) {
          const oldTile = state.chunk.map[act.y][act.x];
          state.chunk.map[act.y][act.x] = '.';
        }
        break;
      }
      case 'visualEffect': {
        emit(act.effect, { x: act.x, y: act.y });
        break;
      }
      case 'triggerExplosion': {
        // This would re-trigger the explosion rule at the specified location
        // Implementation depends on how we want to handle it
        break;
      }
      case 'delayedAction': {
        setTimeout(() => {
          applyActions(state, entity, [act.action]);
        }, act.delay);
        break;
      }
      // stopPhase/stopAllPhases handled in sim control flow
      default: 
        break;
    }
  }
}

// ===== Public runners (keep existing behavior working) =====
export function runMovementForEntity(state, entity, fromX, fromY, toX, toY) {
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
  const ctx = buildContext(state, entity, { kind: 'turn' });
  runPhase('tick', ctx);
  applyActions(state, entity, ctx.queue);
  // Clear transient engine fields at end of turn
  if (entity._engine) { 
    delete entity._engine.preventTurn; 
    delete entity._engine.statMods; 
  }
}

export function runPreDamage(state, defender, damage /* {amount,type} */, env = {}) {
  const ctx = buildContext(state, defender, { kind: 'damage', damage });
  runPhase('predamage', ctx);
  if (ctx.event.damage.amount !== damage.amount) {
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
  const ctx = buildContext(state, entity, { kind: 'applyStatus', status: { id: statusId, props: { turns, value } } });
  runPhase('apply', ctx);
  // If not prevented, add it
  if (!ctx.queue.some(a => a.type === 'preventStatus')) {
    state.applyStatus?.(entity, statusId, turns, value);
  } else {
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
