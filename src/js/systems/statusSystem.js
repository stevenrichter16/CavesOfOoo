// systems/statusSystem.js - Status effect management system
import { emit } from '../events.js';
import { EventType } from '../eventTypes.js';

// Map to store status effects: entityId -> { effectKey: { value, turns, sourceId }, ... }
const Status = new Map();

// Set to track entities with active effects
const Active = new Set();

/**
 * Register a status effect on an entity
 */
export function statusEffectRegister({ toId, effect, value = 0, turns = 0, sourceId = null }) {
  let entityEffects = Status.get(toId);
  if (!entityEffects) {
    entityEffects = {};
    Status.set(toId, entityEffects);
  }
  
  entityEffects[effect] = { value, turns, sourceId };
  Active.add(toId);
  
  emit(EventType.StatusEffectRegister, { toId, effect, value, turns, sourceId });
}

/**
 * Process one tick of status effects for an entity
 */
export function statusEffectPerformTick({ toId, applyDamage, applyHeal }) {
  const entityEffects = Status.get(toId);
  if (!entityEffects) return;
  
  // Also update the entity's statusEffects array for UI compatibility
  const entity = toId === 'player' ? window.STATE?.player : 
                 window.STATE?.chunk?.monsters?.find(m => `monster_${m.x}_${m.y}` === toId);
  
  for (const [effect, data] of Object.entries(entityEffects)) {
    if (!data) continue;
    
    let delta = 0;
    
    // Damage-over-time effects
    if (['poison', 'burn', 'bleed', 'shock'].includes(effect)) {
      delta = -Math.abs(data.value);
      applyDamage(toId, -delta, effect);
    }
    
    // Healing-over-time effects
    if (['regen', 'lifesteal'].includes(effect)) {
      delta = +Math.abs(data.value);
      applyHeal(toId, delta, effect);
    }
    
    // Emit status effect performance
    emit(EventType.StatusEffectPerform, { 
      toId, 
      effect, 
      delta, 
      remaining: Math.max(0, (data.turns || 0) - 1) 
    });
    
    // Decrement turns
    data.turns = (data.turns || 0) - 1;
    
    // Update entity's array if it exists (for UI)
    if (entity && entity.statusEffects) {
      const arrayEffect = entity.statusEffects.find(e => e.type === effect);
      if (arrayEffect) {
        arrayEffect.turns = data.turns;
      }
    }
    
    // Remove expired effects
    if (data.turns <= 0) {
      delete entityEffects[effect];
      emit(EventType.StatusEffectExpired, { toId, effect, reason: 'duration' });
      
      // Remove from entity's array too
      if (entity && entity.statusEffects) {
        entity.statusEffects = entity.statusEffects.filter(e => e.type !== effect);
      }
    }
  }
  
  // Clean up if no effects remain
  if (Object.keys(entityEffects).length === 0) {
    Status.delete(toId);
    Active.delete(toId);
  }
}

/**
 * Process end-of-turn status effects for all active entities
 */
export function endOfTurnStatusPass(state, applyDamage, applyHeal) {
  // Only iterate active entities
  for (const id of Array.from(Active)) {
    statusEffectPerformTick({ toId: id, applyDamage, applyHeal });
  }
}

/**
 * Get all status effects for an entity
 */
export function getStatusEffects(entityId) {
  return Status.get(entityId) || {};
}

/**
 * Check if an entity has a specific status effect
 */
export function hasStatusEffect(entityId, effect) {
  const entityEffects = Status.get(entityId);
  return entityEffects && effect in entityEffects;
}

/**
 * Apply a status effect (wrapper for compatibility)
 */
export function applyStatusEffect(entity, type, turns, value = 0) {
  // Get entity ID
  const entityId = entity.id || (entity === window.STATE?.player ? 'player' : `monster_${entity.x}_${entity.y}`);
  
  // Check if effect already exists
  const existingEffects = Status.get(entityId);
  const existingEffect = existingEffects?.[type];
  
  if (existingEffect) {
    // Stack the effect - add turns and value
    existingEffect.turns += turns;
    existingEffect.value = Math.max(existingEffect.value, value); // Use higher value
  } else {
    // Register new effect
    statusEffectRegister({
      toId: entityId,
      effect: type,
      value: value,
      turns: turns,
      sourceId: null
    });
  }
  
  // Also maintain old array for backward compatibility during migration
  if (!entity.statusEffects) entity.statusEffects = [];
  
  // Check if effect already exists in array
  const arrayEffect = entity.statusEffects.find(e => e.type === type);
  if (arrayEffect) {
    // Update existing effect
    arrayEffect.turns += turns;
    arrayEffect.value = Math.max(arrayEffect.value, value);
  } else {
    // Add new effect
    entity.statusEffects.push({ type, turns, value });
  }
}

/**
 * Check if entity is frozen
 */
export function isFrozen(entity) {
  const entityId = entity.id || (entity === window.STATE?.player ? 'player' : `monster_${entity.x}_${entity.y}`);
  return hasStatusEffect(entityId, 'freeze');
}

/**
 * Get status modifier for a stat
 */
export function getStatusModifier(entity, stat) {
  const entityId = entity.id || (entity === window.STATE?.player ? 'player' : `monster_${entity.x}_${entity.y}`);
  const effects = getStatusEffects(entityId);
  
  let mod = 0;
  for (const [effect, data] of Object.entries(effects)) {
    if (effect === `buff_${stat}`) mod += data.value;
    if (effect === `debuff_${stat}`) mod -= data.value;
    // Weaken effect reduces strength
    if (stat === "str" && effect === "weaken") mod -= data.value;
    // Armor buff increases defense  
    if (stat === "def" && effect === "armor") mod += data.value;
    // Blind effect reduces accuracy (affects SPD for dodge)
    if (stat === "spd" && effect === "blind") mod -= 3;
  }
  return mod;
}

/**
 * Clear all status effects for an entity
 */
export function clearStatusEffects(entityId) {
  Status.delete(entityId);
  Active.delete(entityId);
  emit(EventType.StatusEffectCleared, { toId: entityId });
}

/**
 * Process status effects (compatibility wrapper for old system)
 * This is called by monsters.js and will be removed after full migration
 */
export function processStatusEffects(state, entity, label = "") {
  // Get entity ID
  const entityId = entity.id || (entity === state.player ? 'player' : `monster_${entity.x}_${entity.y}`);
  
  // Process using new system
  statusEffectPerformTick({
    toId: entityId,
    applyDamage: (id, amount, source) => {
      const target = id === 'player' ? state.player : 
                     state.chunk.monsters.find(m => `monster_${m.x}_${m.y}` === id);
      if (target) {
        target.hp -= amount;
        if (label && state.log) {
          state.log(`${label} take${label === "You" ? "" : "s"} ${amount} ${source} damage!`, "bad");
        }
        if (target.hp <= 0) {
          target.alive = false;
          if (target === state.player) {
            state.over = true;
            state.log(`Game over - ${source} was too much!`, "bad");
          }
        }
      }
    },
    applyHeal: (id, amount, source) => {
      const target = id === 'player' ? state.player : 
                     state.chunk.monsters.find(m => `monster_${m.x}_${m.y}` === id);
      if (target && target.hpMax) {
        const before = target.hp;
        target.hp = Math.min(target.hpMax, target.hp + amount);
        const gained = target.hp - before;
        if (gained > 0 && label && state.log) {
          state.log(`${label} heal${label === "You" ? "" : "s"} ${gained} HP!`, "good");
        }
      }
    }
  });
  
  // Also process old array for UI display compatibility
  if (entity.statusEffects) {
    for (let i = entity.statusEffects.length - 1; i >= 0; i--) {
      entity.statusEffects[i].turns--;
      if (entity.statusEffects[i].turns <= 0) {
        entity.statusEffects.splice(i, 1);
      }
    }
  }
}