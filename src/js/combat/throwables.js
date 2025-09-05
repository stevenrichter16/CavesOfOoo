// src/js/combat/throwables.js
// System for throwing items at enemies

import { calculateThrowDamage, getThrowablePot } from '../items/throwables.js';
import { entityAt, isBlockedByTerrain } from '../utils/queries.js';
import { applyAttack } from './combat.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { applyStatusEffect } from './statusSystem.js';
import { launchProjectile } from '../systems/ProjectileSystem.js';

/**
 * Get friendly name for tile type
 */
function getTileName(tile) {
  const tileNames = {
    '%': 'candy dust',
    '~': 'water',
    '^': 'spikes',
    '#': 'wall',
    '.': 'ground'
  };
  return tileNames[tile] || 'terrain';
}

/**
 * Execute a throw at the target position
 * @async
 */
export async function executeThrow(state, targetX, targetY) {
  try {
    // Validate target coordinates
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      console.error('Invalid target coordinates:', { targetX, targetY });
      if (state.log) state.log("Invalid target position!", "bad");
      return false;
    }
    
    if (!state.pendingThrowable) {
      if (state.log) state.log("No item selected to throw!", "bad");
      return false;
    }
    
    const { item: inventoryItem, inventoryIndex } = state.pendingThrowable;
    
    // Validate inventory index
    if (!state.player.inventory[inventoryIndex]) {
      if (state.log) state.log("Item no longer in inventory!", "bad");
      state.pendingThrowable = null;
      return false;
    }
    
    // Get the full pot configuration (merge inventory item with pot definition)
    const potId = inventoryItem.id || inventoryItem.type;
    const potDefinition = getThrowablePot(potId);
    const item = potDefinition ? { ...potDefinition, ...inventoryItem } : inventoryItem;
    
    // Get projectile configuration from item or use defaults
    const projectileConfig = item.projectileConfig || {
      type: 'default',
      speed: 100,
      trail: false,
      arcHeight: 0.5
    };
    
    // Validate player exists and has position
    if (!state.player || !Number.isFinite(state.player.x) || !Number.isFinite(state.player.y)) {
      if (state.log) state.log("Invalid player position!", "bad");
      state.pendingThrowable = null;
      return false;
    }
    
    // Launch projectile with configuration
    const impactResult = await launchProjectile({
      fromX: state.player.x,
      fromY: state.player.y,
      toX: targetX,
      toY: targetY,
      ...projectileConfig,
      checkCollision: (x, y) => isBlockedByTerrain(state, x, y),
      onImpact: (x, y) => handleImpactEffects(state, x, y, item)
    });
    
    // Process the actual throw effects after animation (use actual impact position)
    await processThrowEffects(state, impactResult.x, impactResult.y, item, inventoryIndex);
    
    return true;
  } catch (error) {
    console.error('Error executing throw:', error);
    if (state.log) state.log("Failed to throw item!", "bad");
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
    // Check for tile interactions
    const tileInteraction = item.tileInteractions?.[targetTile];
    
    if (tileInteraction) {
      // Handle configured tile interaction
      state.log(`You throw the ${item.name} at the ${getTileName(targetTile)}!`, "combat");
      
      if (tileInteraction.message) {
        state.log(tileInteraction.message, "danger");
      }
      
      // Apply area effect if configured
      if (tileInteraction.areaEffect) {
        import('../engine/adapters/cavesOfOoo.js').then(module => {
          module.applyAreaEffectPublic(state, state.player, {
            x: targetX,
            y: targetY,
            ...tileInteraction.areaEffect
          });
          
          // Emit visual effect
          if (tileInteraction.areaEffect.effect) {
            emit(tileInteraction.areaEffect.effect, { x: targetX, y: targetY });
          }
          
          // The explosion event automatically triggers particle effects
        });
      }
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
    
    // Apply status effect if the pot has one AND target is still alive
    if (item.statusEffect && target.alive && Math.random() < (item.statusChance || 0.2)) {
      applyStatusEffect(target, item.statusEffect, item.statusDuration || 3, item.statusValue || 0);
      const statusMsg = item.statusEffect === 'burn' ? 'burning' : 
                       item.statusEffect === 'freeze' ? 'frozen' :
                       item.statusEffect === 'poison' ? 'poisoned' :
                       item.statusEffect === 'shock' ? 'shocked' : item.statusEffect;
      state.log(`${target.name} is ${statusMsg}!`, "magic");
      
      // Extra visual feedback for electric shock
      if (item.statusEffect === 'shock') {
        emit(EventType.FloatingText, {
          x: targetX,
          y: targetY,
          text: 'ZAP!',
          kind: 'crit',
          duration: 600
        });
      }
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