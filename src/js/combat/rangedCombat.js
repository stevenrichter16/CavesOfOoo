// src/js/combat/rangedCombat.js
// Unified ranged combat system for all projectile weapons

import { launchProjectile } from '../systems/ProjectileSystem.js';
import { entityAt } from '../utils/queries.js';
import { applyAttack } from './combat.js';
import { applyStatusEffect } from './statusSystem.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

/**
 * Configuration for different ranged weapon types
 */
const RANGED_CONFIGS = {
  bow: {
    projectileType: 'arrow',
    speed: 1200,
    trail: false,
    arcHeight: 0.2,
    range: 10
  },
  crossbow: {
    projectileType: 'arrow',
    speed: 1500,
    trail: false,
    arcHeight: 0.1,
    range: 12
  },
  wand: {
    projectileType: 'magic',
    speed: 1000,
    trail: true,
    arcHeight: 0,
    range: 8
  },
  staff: {
    projectileType: 'magic',
    speed: 800,
    trail: true,
    arcHeight: 0.3,
    range: 6
  },
  throwable: {
    projectileType: 'default',
    speed: 800,
    trail: false,
    arcHeight: 0.5,
    range: 8
  }
};

/**
 * Execute a ranged attack with projectile animation
 * @async
 */
export async function executeRangedAttack(state, attacker, targetX, targetY, weapon, config = {}) {
  // Validate inputs
  if (!state || !attacker || !weapon) {
    console.error('Invalid inputs to executeRangedAttack');
    return false;
  }
  
  // Validate coordinates
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    console.error('Invalid target coordinates');
    return false;
  }
  
  // Get weapon configuration
  const weaponType = weapon.rangedType || 'throwable';
  const baseConfig = RANGED_CONFIGS[weaponType] || RANGED_CONFIGS.throwable;
  
  // Merge configurations
  const finalConfig = {
    ...baseConfig,
    ...config,
    fromX: attacker.x,
    fromY: attacker.y,
    toX: targetX,
    toY: targetY
  };
  
  // Check range
  const distance = calculateDistance(attacker.x, attacker.y, targetX, targetY);
  if (distance > finalConfig.range) {
    if (state.log) {
      state.log("Target is out of range!", "bad");
    }
    return false;
  }
  
  // Launch projectile animation
  await launchProjectile(finalConfig);
  
  // Apply attack effects
  const target = entityAt(state, targetX, targetY);
  if (target && target !== attacker) {
    await applyRangedDamage(state, attacker, target, weapon);
  } else {
    // Missed
    if (state.log) {
      state.log(`The ${weapon.name || 'projectile'} hits nothing.`, "note");
    }
    emit(EventType.FloatingText, {
      x: targetX,
      y: targetY,
      text: 'MISS',
      kind: 'miss'
    });
  }
  
  return true;
}

/**
 * Apply damage from ranged attack
 * @async
 */
async function applyRangedDamage(state, attacker, target, weapon) {
  // Calculate damage
  const baseDamage = weapon.damage || weapon.dmg || 5;
  const rangeBonus = weapon.rangeBonus || 0;
  const damage = baseDamage + rangeBonus + Math.floor((attacker.dex || 0) / 2);
  
  // Create attack result
  const isCrit = Math.random() < 0.15;
  const result = {
    hit: true,
    crit: isCrit,
    dmg: isCrit ? damage * 2 : damage,
    by: attacker === state.player ? 'You' : attacker.name,
    vs: target.name || 'target',
    method: 'ranged',
    element: weapon.element || 'physical'
  };
  
  // Apply damage
  applyAttack(state, attacker, target, result);
  
  // Apply status effects if any
  if (weapon.statusEffect && Math.random() < (weapon.statusChance || 0.2)) {
    applyStatusEffect(
      target, 
      weapon.statusEffect, 
      weapon.statusDuration || 3, 
      weapon.statusValue || 0
    );
    
    if (state.log) {
      state.log(`${target.name} is ${weapon.statusEffect}!`, "magic");
    }
  }
}

/**
 * Calculate distance between two points
 */
function calculateDistance(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a position is in range for a ranged weapon
 */
export function isInRange(fromX, fromY, toX, toY, weaponType = 'throwable') {
  const config = RANGED_CONFIGS[weaponType] || RANGED_CONFIGS.throwable;
  const distance = calculateDistance(fromX, fromY, toX, toY);
  return distance <= config.range;
}

/**
 * Get range for a weapon type
 */
export function getWeaponRange(weaponType = 'throwable') {
  const config = RANGED_CONFIGS[weaponType] || RANGED_CONFIGS.throwable;
  return config.range;
}