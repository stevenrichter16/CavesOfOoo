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
    
    // Remove expired effects
    if (data.turns <= 0) {
      delete entityEffects[effect];
      emit(EventType.StatusEffectExpired, { toId, effect, reason: 'duration' });
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
 * Clear all status effects for an entity
 */
export function clearStatusEffects(entityId) {
  const entityEffects = Status.get(entityId);
  if (!entityEffects) return;
  
  // Emit expiration for each effect
  for (const effect of Object.keys(entityEffects)) {
    emit(EventType.StatusEffectExpired, { toId: entityId, effect, reason: 'cleared' });
  }
  
  Status.delete(entityId);
  Active.delete(entityId);
}

/**
 * Clear all status effects (e.g., on game restart)
 */
export function clearAllStatusEffects() {
  for (const entityId of Status.keys()) {
    clearStatusEffects(entityId);
  }
}