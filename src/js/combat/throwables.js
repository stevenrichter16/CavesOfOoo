// src/js/combat/throwables.js
// System for throwing items at enemies

import { calculateThrowDamage } from '../items/throwables.js';
import { entityAt } from '../utils/queries.js';
import { applyAttack } from './combat.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { applyStatusEffect } from './statusSystem.js';

/**
 * Execute a throw at the target position
 * @async
 */
export async function executeThrow(state, targetX, targetY) {
  try {
    if (!state.pendingThrowable) {
      state.log("No item selected to throw!", "bad");
      return false;
    }
    
    const { item, inventoryIndex } = state.pendingThrowable;
    
    // Validate inventory index
    if (!state.player.inventory[inventoryIndex]) {
      state.log("Item no longer in inventory!", "bad");
      state.pendingThrowable = null;
      return false;
    }
    
    // Import ProjectileSystem and launch projectile (cache the import)
    let launchProjectile;
    try {
      const module = await import('../systems/ProjectileSystem.js');
      launchProjectile = module.launchProjectile;
    } catch (importError) {
      console.error('Failed to import ProjectileSystem:', importError);
      state.log("Failed to load projectile system!", "bad");
      return false;
    }
    
    // Determine projectile type based on item
    const projectileType = item.damageType === 'fire' ? 'fire' : 
                          item.statusEffect === 'freeze' ? 'ice' :
                          item.statusEffect === 'poison' ? 'poison' : 'default';
    
    // Launch projectile with animation
    await launchProjectile({
      fromX: state.player.x,
      fromY: state.player.y,
      toX: targetX,
      toY: targetY,
      type: projectileType,
      speed: 100, // Faster projectiles
      trail: item.damageType === 'fire', // Fire pots leave trails
      arcHeight: 5.5,
      onImpact: (x, y) => handleImpactEffects(state, x, y, item)
    });
    
    // Process the actual throw effects after animation
    await processThrowEffects(state, targetX, targetY, item, inventoryIndex);
    
    return true;
  } catch (error) {
    console.error('Error executing throw:', error);
    state.log("Failed to throw item!", "bad");
    state.pendingThrowable = null;
    return false;
  }
}

/**
 * Handle visual impact effects
 */
function handleImpactEffects(state, x, y, item) {
  // Validate inputs
  if (!state || !item) return;
  
  // Additional impact effects specific to item type
  if (item.damageType === 'fire') {
    emit(EventType.FloatingText, {
      x,
      y,
      text: 'BOOM!',
      kind: 'crit',
      duration: 300
    });
  }
}

/**
 * Process throw effects after projectile hits
 * @async
 */
async function processThrowEffects(state, targetX, targetY, item, inventoryIndex) {
  return new Promise((resolve) => {
    // Check what's at the target position
    const target = entityAt(state, targetX, targetY);
    const targetTile = state.chunk?.map?.[targetY]?.[targetX];
    
    if (!target || target === state.player) {
    // Check if it's a fire pot hitting candy dust FIRST
    if (item.damageType === 'fire' && targetTile === '%') {
      // Fire pot hitting candy dust - don't show miss!
      state.log(`You throw the ${item.name} at the candy dust!`, "combat");
      state.log("💥 KABOOM! The candy dust ignites explosively!", "danger");
      
      // Use the game's proper area effect system which handles chain reactions
      import('../engine/adapters/cavesOfOoo.js').then(module => {
        // Call the game's area effect handler which will:
        // 1. Remove the candy dust tile
        // 2. Damage all entities in radius
        // 3. Trigger chain reactions on nearby candy dust
        // 4. Show explosion animations
        module.applyAreaEffectPublic(state, state.player, {
          x: targetX,
          y: targetY,
          radius: 3,  // Larger radius for chain reactions
          damage: 15,
          damageType: 'explosion',
          effect: 'explosion',
          excludeSource: false
        });
        
        // Also emit explosion event for visual effects
        emit(EventType.Explosion, { x: targetX, y: targetY });
        
        // Import and trigger particle effects
        import('../ui/particles.js').then(particleModule => {
          particleModule.createExplosion(targetX, targetY);
        });
      });
    } else {
      // Actually missed - nothing to hit
      state.log(`You throw the ${item.name} but it hits nothing.`, "note");
      
      // Visual effect at target position
      emit(EventType.FloatingText, {
        x: targetX,
        y: targetY,
        text: 'MISS',
        kind: 'miss'
      });
    }
  } else {
    // Calculate damage
    const damage = calculateThrowDamage(item, state.player);
    
    // Create attack result object with damage type
    const result = {
      hit: true,
      crit: false,
      dmg: damage,
      by: 'You',
      vs: target.name || 'monster',
      method: 'thrown',
      element: item.damageType || 'physical'
    };
    
    // Apply damage to target
    const outcome = applyAttack(state, state.player, target, result);
    
    // Log the throw
    state.log(`You throw the ${item.name} at ${target.name}!`, "combat");
    
    // Apply status effect if the pot has one
    if (item.statusEffect && Math.random() < (item.statusChance || 0.2)) {
      applyStatusEffect(target, item.statusEffect, item.statusDuration || 3, item.statusValue || 0);
      const statusMsg = item.statusEffect === 'burn' ? 'burning' : 
                       item.statusEffect === 'freeze' ? 'frozen' :
                       item.statusEffect === 'poison' ? 'poisoned' : item.statusEffect;
      state.log(`${target.name} is ${statusMsg}!`, "magic");
    }
    
    // Visual feedback
    emit(EventType.FloatingText, {
      x: targetX,
      y: targetY, 
      text: `${damage}`,
      kind: 'damage'
    });
  }
    
    // Remove or reduce the thrown item from inventory
    // Re-validate inventory index as state may have changed during animation
    if (state.player && state.player.inventory && inventoryIndex < state.player.inventory.length) {
      const invItem = state.player.inventory[inventoryIndex];
      if (invItem) {
        if (invItem.count && invItem.count > 1) {
          invItem.count--;
          if (state.log) {
            state.log(`${item.name} x${invItem.count} remaining`, "dim");
          }
        } else {
          state.player.inventory.splice(inventoryIndex, 1);
        }
      }
    }
    
    // Clear pending throwable
    state.pendingThrowable = null;
    
    // Trigger render to update display if available
    if (state.render && typeof state.render === 'function') {
      state.render();
    }
    
    resolve(true);
  });
}

/**
 * Check if player can throw at a position
 */
export function canThrowAt(state, x, y) {
  if (!state.player) return false;
  
  // Calculate distance
  const dx = Math.abs(x - state.player.x);
  const dy = Math.abs(y - state.player.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Max throwing range is 8 tiles
  return distance <= 8;
}

/**
 * Get throw range for display
 */
export function getThrowRange() {
  return 8;
}