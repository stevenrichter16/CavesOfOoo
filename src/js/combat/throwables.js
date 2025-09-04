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
 */
export function executeThrow(state, targetX, targetY) {
  if (!state.pendingThrowable) {
    state.log("No item selected to throw!", "bad");
    return false;
  }
  
  const { item, inventoryIndex } = state.pendingThrowable;
  
  // Create projectile animation and get animation duration
  const animationTime = createProjectileAnimation(state, state.player.x, state.player.y, targetX, targetY, item);
  
  // Delay the actual effect until projectile arrives
  setTimeout(() => {
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
    const invItem = state.player.inventory[inventoryIndex];
    if (invItem) {
      if (invItem.count && invItem.count > 1) {
        invItem.count--;
        state.log(`${item.name} x${invItem.count} remaining`, "dim");
      } else {
        state.player.inventory.splice(inventoryIndex, 1);
      }
    }
    
    // Clear pending throwable
    state.pendingThrowable = null;
    
    // Trigger render to update display
    state.render();
  }, animationTime); // End of setTimeout
  
  return true;
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

/**
 * Create a projectile animation for thrown pots
 */
function createProjectileAnimation(state, fromX, fromY, toX, toY, item) {
  // Calculate distance and steps
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(3, Math.floor(distance * 2)); // More steps for smoother animation
  const stepDelay = 30; // 30ms between steps for smooth flight
  
  // ASCII animation frames for different pot types
  const fireFrames = ['*', 'x', '+', 'X', '*']; // Fire spinning effect using basic ASCII
  const potFrames = ['o', 'O', '0', 'O', 'o'];  // Regular pot tumbling
  const frames = item.damageType === 'fire' ? fireFrames : potFrames;
  
  // Create projectile trail effect
  const trail = [];
  
  // Animate the projectile
  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      // Calculate interpolated position
      const progress = i / steps;
      const currentX = Math.round(fromX + dx * progress);
      const currentY = Math.round(fromY + dy * progress);
      
      // Get animation frame based on progress
      const frameIndex = Math.floor(progress * frames.length) % frames.length;
      const symbol = frames[frameIndex];
      
      // For fire pots, create a flaming trail
      if (item.damageType === 'fire') {
        // Add trail particles behind the projectile
        if (i > 1) {
          const prevProgress = (i - 1) / steps;
          const prevX = Math.round(fromX + dx * prevProgress);
          const prevY = Math.round(fromY + dy * prevProgress);
          
          // Show diminishing trail using basic ASCII
          const trailSymbols = ['.', '.', '.'];  // Simple dots for trail
          const trailIndex = Math.min(2, Math.floor((i - 1) / 2));
          
          // Varying shades of red for trail (darker as it fades)
          const trailColors = ['#ff4444', '#cc3333', '#992222'];
          
          emit(EventType.FloatingText, {
            x: prevX,
            y: prevY,
            text: trailSymbols[trailIndex],
            kind: 'magic',  // Use 'magic' kind which should be styled red/purple
            duration: stepDelay * 3
          });
        }
      }
      
      // Create main projectile with varying red intensity for fire
      const fireColors = ['#ff0000', '#ff3333', '#ff5555', '#ff3333', '#ff0000']; // Pulsing red effect
      const projectileColor = item.damageType === 'fire' 
        ? fireColors[frameIndex] 
        : '#8B4513'; // Brown for regular
        
      emit(EventType.FloatingText, {
        x: currentX,
        y: currentY,
        text: symbol,
        kind: item.damageType === 'fire' ? 'crit' : 'damage',  // 'crit' is usually red
        duration: stepDelay * 2
      });
      
      // On the last step, trigger impact
      if (i === steps) {
        // Small delay before impact effects
        setTimeout(() => {
          // ASCII impact burst using basic characters
          const impactSymbols = item.damageType === 'fire' 
            ? ['*', 'x', 'X', '+'] // Fire burst with basic ASCII
            : ['x', '+', '*'];      // Regular shatter
          
          // Create multiple impact particles
          impactSymbols.forEach((sym, idx) => {
            setTimeout(() => {
              const offsetX = idx % 2 === 0 ? 0 : (idx - 1.5) / 2;
              const offsetY = idx < 2 ? 0 : (idx - 2) / 2;
              
              // Different shades of red for fire impact explosion
              const fireImpactColors = ['#ff0000', '#dd0000', '#bb0000', '#990000'];
              const impactColor = item.damageType === 'fire' 
                ? fireImpactColors[idx % fireImpactColors.length]
                : '#666666';
                
              emit(EventType.FloatingText, {
                x: toX + Math.round(offsetX),
                y: toY + Math.round(offsetY),
                text: sym,
                kind: item.damageType === 'fire' ? 'crit' : 'damage',  // Use existing styled kinds
                duration: 150 - (idx * 20)
              });
            }, idx * 15);
          });
        }, stepDelay);
      }
    }, i * stepDelay);
  }
  
  // Return total animation time so we can delay the actual effect
  return steps * stepDelay + 100;
}