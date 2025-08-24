// systems/monsters.js - Monster AI and turn processing
// This module handles all monster behavior, movement, and abilities

import { W, H } from '../config.js';
import { choice } from '../utils.js';
import { attack } from '../combat.js';
import { isBlocked } from '../queries.js';
import { isFrozen, processStatusEffects, applyStatusEffect } from '../statusEffects.js';
import { emit } from '../events.js';
import { EventType } from '../eventTypes.js';

/**
 * Process all monster turns
 * Handles movement, attacks, and abilities for all alive monsters
 */
export function processMonsterTurns(state) {
  const monsters = state.chunk.monsters;
  
  for (const monster of monsters) {
    if (!monster.alive) continue;
    
    // Check if monster is frozen - skip turn if so
    if (isFrozen(monster)) {
      log(state, `${monster.name} is frozen and can't move!`, "magic");
      processStatusEffects(state, monster, monster.name);
      continue;
    }
    
    // Check for ability activation
    if (processMonsterAbility(state, monster)) {
      processStatusEffects(state, monster, monster.name);
      continue; // Skip normal turn if ability was used
    }
    
    // Ensure monster is within bounds
    monster.x = Math.max(0, Math.min(W - 1, monster.x));
    monster.y = Math.max(0, Math.min(H - 1, monster.y));
    
    const dx = state.player.x - monster.x;
    const dy = state.player.y - monster.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    
    // Attack if adjacent
    if (distance === 1) {
      attack(state, monster, state.player, monster.name, "you");
      if (state.player.hp <= 0) {
        state.player.alive = false;
        state.over = true;
        log(state, "You fall. The floor hums a lullaby. Game over.", "bad");
        break;
      }
      // Process status effects after normal attack
      processStatusEffects(state, monster, monster.name);
      continue;
    }
    
    // Process movement based on AI type
    processMonsterMovement(state, monster, dx, dy, distance);
    
    // Process status effects after movement
    processStatusEffects(state, monster, monster.name);
  }
  
  // Note: turnEnd is called by the game loop after processMonsterTurns
  // We don't call it here to avoid circular dependency
}

/**
 * Process monster movement based on AI type
 */
function processMonsterMovement(state, monster, dx, dy, distance) {
  switch (monster.ai) {
    case "chase":
      if (distance < 8) {
        moveTowardPlayer(state, monster, dx, dy);
      }
      break;
      
    case "smart":
      // Boss AI - smarter pathfinding
      if (distance < 10) {
        moveSmartly(state, monster, dx, dy);
      }
      break;
      
    case "wander":
      moveRandomly(state, monster);
      break;
      
    case "skittish":
      if (distance < 5) {
        moveAwayFromPlayer(state, monster, dx, dy);
      }
      break;
  }
}

/**
 * Move monster toward player
 */
function moveTowardPlayer(state, monster, dx, dy) {
  const moveX = Math.sign(dx);
  const moveY = Math.sign(dy);
  
  const newX = monster.x + moveX;
  const newY = monster.y + moveY;
  
  if (moveX && newX >= 0 && newX < W && !isBlocked(state, newX, monster.y)) {
    monster.x = newX;
  } else if (moveY && newY >= 0 && newY < H && !isBlocked(state, monster.x, newY)) {
    monster.y = newY;
  }
}

/**
 * Smart movement for boss-type monsters
 */
function moveSmartly(state, monster, dx, dy) {
  const moveX = Math.sign(dx);
  const moveY = Math.sign(dy);
  
  const newX = monster.x + moveX;
  const newY = monster.y + moveY;
  
  // Try direct approach
  if (newX >= 0 && newX < W && newY >= 0 && newY < H && !isBlocked(state, newX, newY)) {
    monster.x = newX;
    monster.y = newY;
  } else if (newX >= 0 && newX < W && !isBlocked(state, newX, monster.y)) {
    monster.x = newX;
  } else if (newY >= 0 && newY < H && !isBlocked(state, monster.x, newY)) {
    monster.y = newY;
  }
}

/**
 * Random movement for wandering monsters
 */
function moveRandomly(state, monster) {
  const dir = choice([[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]);
  const newX = monster.x + dir[0];
  const newY = monster.y + dir[1];
  
  if (newX >= 0 && newX < W && newY >= 0 && newY < H && !isBlocked(state, newX, newY)) {
    monster.x = newX;
    monster.y = newY;
  }
}

/**
 * Move monster away from player
 */
function moveAwayFromPlayer(state, monster, dx, dy) {
  const moveX = -Math.sign(dx);
  const moveY = -Math.sign(dy);
  
  const newX = monster.x + moveX;
  const newY = monster.y + moveY;
  
  if (newX >= 0 && newX < W && newY >= 0 && newY < H && !isBlocked(state, newX, newY)) {
    monster.x = newX;
    monster.y = newY;
  }
}

/**
 * Process monster special ability
 * Returns true if ability was used, false otherwise
 */
export function processMonsterAbility(state, monster) {
  if (!monster.ability) return false;
  
  // Handle self-buff abilities
  if (monster.ability.selfBuff) {
    return processSelfBuffAbility(state, monster);
  }
  
  // Calculate distance to player for ranged abilities
  const dx = Math.abs(state.player.x - monster.x);
  const dy = Math.abs(state.player.y - monster.y);
  const distance = dx + dy;
  
  // Check if player is in range
  if (monster.ability.range && distance > monster.ability.range) return false;
  
  // Check if ability triggers (with tier scaling already applied)
  if (Math.random() >= monster.ability.chance) return false;
  
  // Execute ability
  executeMonsterAbility(state, monster);
  
  return true; // Ability was used
}

/**
 * Process self-buff abilities
 */
function processSelfBuffAbility(state, monster) {
  // Check if ability triggers
  if (Math.random() >= monster.ability.chance) return false;
  
  // Execute self-buff ability
  const ability = monster.ability;
  
  if (ability.type === "boneShield") {
    log(state, `${monster.name} raises a bone shield!`, "bad");
    applyStatusEffect(monster, ability.effect, ability.turns, ability.value);
    return true;
  }
  
  return false;
}

/**
 * Execute a monster's ability against the player
 */
function executeMonsterAbility(state, monster) {
  const ability = monster.ability;
  const abilityNames = {
    fireBlast: "emits a blast of fire",
    iceBreath: "breathes freezing ice",
    poisonSpit: "spits toxic venom",
    electricPulse: "releases an electric pulse",
    lifeDrain: "drains your life force",
    shadowStrike: "strikes from the shadows",
    hellfire: "unleashes hellfire"
  };
  
  log(state, `${monster.name} ${abilityNames[ability.type] || "uses special ability"}!`, "bad");
  
  // Apply damage (reduced by defense)
  const playerDef = state.player.def + 
    (state.player.armor ? state.player.armor.def : 0) +
    (state.player.headgear && state.player.headgear.def ? state.player.headgear.def : 0);
  const damage = Math.max(1, ability.damage - Math.floor(playerDef / 2));
  
  state.player.hp -= damage;
  log(state, `You take ${damage} damage from the ${ability.type}!`, "bad");
  
  // Show damage via floating text event
  emit(EventType.FloatingText, {
    x: state.player.x,
    y: state.player.y,
    text: `-${damage}`,
    kind: 'damage'
  });
  
  // Handle special ability effects
  handleSpecialAbilityEffects(state, monster, ability);
  
  // Apply status effect if any
  if (ability.effect && ability.effectTurns > 0) {
    applyStatusEffect(state.player, ability.effect, ability.effectTurns, ability.effectValue);
    
    const effectMessages = {
      burn: "You catch fire!",
      freeze: "You are frozen solid!",
      poison: "You are poisoned!",
      shock: "You are electrified!",
      weakness: "You feel weakened!"
    };
    log(state, effectMessages[ability.effect] || "You are afflicted!", "bad");
  }
  
  // Check if player died
  if (state.player.hp <= 0) {
    state.player.alive = false;
    state.over = true;
    log(state, `You were defeated by ${monster.name}'s ${ability.type}!`, "bad");
  }
}

/**
 * Handle special effects for specific ability types
 */
function handleSpecialAbilityEffects(state, monster, ability) {
  if (ability.type === "lifeDrain" && ability.heal) {
    // Heal the monster
    monster.hp = Math.min(monster.hp + ability.heal, monster.hpMax || monster.hp + ability.heal);
    log(state, `${monster.name} heals ${ability.heal} HP!`, "good");
  } else if (ability.type === "shadowStrike" && ability.blindTurns) {
    // Apply blind status
    applyStatusEffect(state.player, "blind", ability.blindTurns, 0);
    log(state, "You are blinded by the shadows!", "bad");
  } else if (ability.type === "hellfire") {
    // Always apply burn with hellfire
    applyStatusEffect(state.player, "burn", 5, 3);
    log(state, "The hellfire burns you!", "bad");
  }
}

// Helper function for logging (will be imported from game.js)
function log(state, text, cls = null) {
  emit(EventType.Log, { text, cls });
}