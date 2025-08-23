import { emit } from "./events.js";
import { EventType } from "./eventTypes.js";

export function applyStatusEffect(entity, type, turns, value = 0) {
  if (!entity.statusEffects) entity.statusEffects = [];
  // Allow stacking - each potion adds a new effect
  entity.statusEffects.push({ type, turns, value });
}

export function processStatusEffects(state, entity, label = "") { 
  if (!entity.statusEffects) entity.statusEffects = [];
  const effects = entity.statusEffects;
  
  for (let i = effects.length - 1; i >= 0; i--) {
    const eff = effects[i];
    
    // Damage over time effects
    if (eff.type == "lifesteal") {
      entity.hp += eff.value;
      // Lifesteal handled via floating text in combat
    }
    if (eff.type === "poison") {
      entity.hp -= eff.value;
      if (label && state.log) {
        state.log(`${label} take${label === "You" ? "" : "s"} ${eff.value} poison damage!`, "bad");
      }
      if (entity.hp <= 0) {
        entity.alive = false;
        if (label && state.log) {
          state.log(`${label} succumb${label === "You" ? "" : "s"} to poison!`, "bad");
        }
        // Set game over if player dies
        if (entity === state.player) {
          state.over = true;
          state.log("Game over - you were poisoned to death!", "bad");
        }
      }
    } else if (eff.type === "burn") {
      entity.hp -= eff.value;
      if (label && state.log) {
        state.log(`${label} take${label === "You" ? "" : "s"} ${eff.value} burn damage!`, "bad");
      }
      if (entity.hp <= 0) {
        entity.alive = false;
        if (label && state.log) {
          state.log(`${label} ${label === "You" ? "are" : "is"} burned to a crisp!`, "bad");
        }
        // Set game over if player dies
        if (entity === state.player) {
          state.over = true;
          state.log("Game over - you burned to death!", "bad");
        }
      }
    } else if (eff.type === "shock") {
      entity.hp -= eff.value;
      if (label && state.log) {
        state.log(`${label} take${label === "You" ? "" : "s"} ${eff.value} shock damage!`, "magic");
      }
      if (entity.hp <= 0) {
        entity.alive = false;
        if (label && state.log) {
          state.log(`${label} ${label === "You" ? "are" : "is"} electrocuted!`, "bad");
        }
        // Set game over if player dies
        if (entity === state.player) {
          state.over = true;
          state.log("Game over - you were electrocuted!", "bad");
        }
      }
    }
    // Freeze effect is handled in movement (skips turn)
    // Weaken effect is handled in getStatusModifier (reduces STR)
    
    eff.turns--;
    if (eff.turns <= 0) {
      // Emit expiration event before removing
      const entityId = entity === state.player ? 'player' : `monster_${entity.x}_${entity.y}`;
      emit(EventType.StatusEffectExpired, { 
        toId: entityId, 
        effect: eff.type,
        reason: 'duration'
      });
      effects.splice(i, 1);
      
      // Log expiration
      if (label && state.log) {
        state.log(`${label}'s ${eff.type} effect has worn off.`, "note");
      }
    }
  }
}

export function getStatusModifier(entity, stat) {
  if (!entity.statusEffects) return 0;
  let mod = 0;
  for (const eff of entity.statusEffects) {
    if (eff.type === `buff_${stat}`) mod += eff.value;
    if (eff.type === `debuff_${stat}`) mod -= eff.value;
    // Weaken effect reduces strength
    if (stat === "str" && eff.type === "weaken") mod -= eff.value;
    // Armor buff increases defense
    if (stat === "def" && eff.type === "armor") mod += eff.value;
    // Blind effect reduces accuracy (affects SPD for dodge)
    if (stat === "spd" && eff.type === "blind") mod -= 3;
  }
  return mod;
}

// Check if entity is frozen
export function isFrozen(entity) {
  if (!entity.statusEffects) return false;
  return entity.statusEffects.some(eff => eff.type === "freeze");
}