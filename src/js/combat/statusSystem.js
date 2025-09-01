// systems/statusSystem.js - Status effect management system
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// Map to store status effects: entityId -> { effectKey: { value, turns, sourceId }, ... }
export const Status = new Map();

// Set to track entities with active effects
const Active = new Set();

/**
 * Get entity ID consistently
 */
export function getEntityId(entity) {
  if (!entity) return null;
  if (entity.id) return entity.id;
  if (entity === window.STATE?.player) return 'player';
  if (entity.x !== undefined && entity.y !== undefined) {
    return `monster_${entity.x}_${entity.y}`;
  }
  return null;
}

/**
 * Get status effects for an entity as an array (for compatibility)
 */
export function getStatusEffectsAsArray(entity) {
  const entityId = getEntityId(entity);
  if (!entityId) return [];
  
  const effects = Status.get(entityId) || {};
  return Object.entries(effects).map(([type, data]) => ({
    type,
    turns: data.turns || 0,
    value: data.value || 0,
    sourceId: data.sourceId || null,
    // Include any extra properties stored in data
    ...Object.fromEntries(
      Object.entries(data).filter(([k]) => !['turns', 'value', 'sourceId'].includes(k))
    )
  }));
}

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
  
  emit(EventType.StatusEffectRegister, { toId, type: effect, value, turns, sourceId });
}

/**
 * Process one tick of status effects for an entity
 */
export function statusEffectPerformTick({ toId, applyDamage, applyHeal }) {
  const entityEffects = Status.get(toId);
  if (!entityEffects) return;
  
  console.log(`\n[STATUS-SYSTEM] ══ TURN TICK for ${toId} ══`);
  console.log(`[STATUS-SYSTEM] Active effects:`, Object.keys(entityEffects).join(', '));
  
  // Also update the entity's statusEffects array for UI compatibility
  const entity = toId === 'player' ? window.STATE?.player : 
                 window.STATE?.chunk?.monsters?.find(m => `monster_${m.x}_${m.y}` === toId);
  
  for (const [effect, data] of Object.entries(entityEffects)) {
    if (!data) continue;
    
    console.log(`[STATUS-SYSTEM] Processing '${effect}': ${data.turns} turns left, ${data.value} power`);
    
    let delta = 0;
    
    // Damage-over-time effects
    if (['poison', 'burn', 'bleed', 'shock'].includes(effect)) {
      delta = -Math.abs(data.value);
      console.log(`[STATUS-SYSTEM]   → DOT effect: Applying ${Math.abs(delta)} damage`);
      applyDamage(toId, -delta, effect);
    }
    
    // Healing-over-time effects
    else if (['regen', 'lifesteal'].includes(effect)) {
      delta = +Math.abs(data.value);
      console.log(`[STATUS-SYSTEM]   → HOT effect: Applying ${delta} healing`);
      applyHeal(toId, delta, effect);
    }
    
    // Control effects
    else if (['freeze', 'weaken', 'blind'].includes(effect)) {
      console.log(`[STATUS-SYSTEM]   → Control effect: No damage/heal this turn`);
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
    console.log(`[STATUS-SYSTEM]   → Turns remaining: ${data.turns + 1} → ${data.turns}`);
    
    // Status tracking handled by Map only
    
    // Remove expired effects
    if (data.turns <= 0) {
      console.log(`[STATUS-SYSTEM]   ✗ EXPIRED: Removing '${effect}'`);
      delete entityEffects[effect];
      emit(EventType.StatusEffectExpired, { toId, effect, reason: 'duration' });
      
      // Removal handled by Map only
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
  const entityId = getEntityId(entity);
  if (!entityId) {
    console.error('[STATUS-SYSTEM] Could not determine entity ID');
    return;
  }
  
  console.log(`\n[STATUS-SYSTEM] ═══ APPLYING NEW STATUS EFFECT ═══`);
  console.log(`[STATUS-SYSTEM] Status: '${type}' | Target: ${entityId} | Duration: ${turns} turns | Power: ${value}/turn`);
  
  // Check for status effect interactions
  let modifiedValue = value;
  let modifiedTurns = turns;
  
  // Wet amplifies shock damage and duration (check using Map)
  if (type === 'shock') {
    const existingEffects = Status.get(entityId) || {};
    const isWet = existingEffects['water_slow'] || existingEffects['wet'];
    if (isWet) {
      // Instant kill when wet + shocked
      if (window.STATE?.log) {
        const entityName = entity === window.STATE.player ? "You" : entity.name || "Enemy";
        //window.STATE.log(window.STATE, "⚡💀 ELECTROCUTED! Being wet and shocked is lethal! 💀⚡", "bad");
      }
      // Note: Instant kill logic commented out per original
    }
  }
  
  // Check if effect already exists
  console.log(`[STATUS-SYSTEM] → Checking Map storage for existing '${type}' effect...`);
  const existingEffects = Status.get(entityId);
  const existingEffect = existingEffects?.[type];
  
  if (existingEffect) {
    // Stack the effect - add turns and value
    console.log(`[STATUS-SYSTEM]   ✓ Found existing ${type}: ${existingEffect.turns} turns, ${existingEffect.value} power`);
    existingEffect.turns += modifiedTurns;
    existingEffect.value = Math.max(existingEffect.value, modifiedValue); // Use higher value
    console.log(`[STATUS-SYSTEM]   → Stacked to: ${existingEffect.turns} turns, ${existingEffect.value} power`);
  } else {
    // Register new effect
    console.log(`[STATUS-SYSTEM]   ✓ No existing ${type} found, registering new effect in Map storage`);
    statusEffectRegister({
      toId: entityId,
      effect: type,
      value: modifiedValue,
      turns: modifiedTurns,
      sourceId: null
    });
  }
  
  console.log(`[STATUS-SYSTEM] ═══ STATUS APPLICATION COMPLETE ═══\n`);
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
  
  // Check for water_slow in Map
  if (stat === "spd" && effects['water_slow']) {
    mod -= (effects['water_slow'].speedReduction || 2); // Reduce SPD by 2 (or configured amount)
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
  const entityId = getEntityId(entity);
  if (!entityId) return;
  
  // Process water_slow effect separately using Map
  const effects = Status.get(entityId) || {};
  if (effects['water_slow']) {
    const waterSlowData = effects['water_slow'];
    // Check if still in water
    const tile = state.chunk?.map?.[entity.y]?.[entity.x];
    if (tile === '~') {
      // Still in water, keep duration at 0
      waterSlowData.duration = 0;
    } else if (waterSlowData.duration > 0) {
      // Out of water, decrement duration
      waterSlowData.duration--;
      if (waterSlowData.duration === 0) {
        // Effect expired - remove from Map
        delete effects['water_slow'];
        if (entity === state.player && state.log) {
          state.log(state, "You've dried off and can move normally again.", "note");
        }
        emit(EventType.StatusEffectExpired, { toId: entityId, effect: 'water_slow', reason: 'duration' });
      }
    }
  }
  
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
  
  // The array is already updated by statusEffectPerformTick through the entity reference
  // No need to process it again here
}