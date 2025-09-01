// src/engine/candyDustRule.js
// Rule for candy dust explosions when exposed to fire/burning

import { rule, P, A } from './rules.js';

// Main explosion rule - triggers when burning entity steps on candy dust
rule({
  id: 'candy_dust_explosion',
  phase: 'movement',
  priority: 10,
  when: P.and(
    // Check if this is a movement event
    (ctx) => ctx.event?.kind === 'move',
    // Check if entity is on candy dust tile
    (ctx) => ctx.env?.tileMaterial?.id === 'candy_dust',
    // Check if entity is burning or hot enough to ignite
    P.or(
      P.hasStatus('burn'),
      P.hasStatus('burning'),
      (ctx) => ctx.env?.temperatureC >= 100,
      // Also check for fire-based attacks
      (ctx) => ctx.event?.damage?.type === 'fire'
    )
  ),
  then: (ctx) => {
    console.log('[CANDY DUST RULE] Explosion triggered!');
    
    // Get explosion properties from tile material
    const explosionDamage = ctx.env?.tileMaterial?.props?.explosionDamage || 15;
    const explosionRadius = ctx.env?.tileMaterial?.props?.explosionRadius || 2;
    
    // Get position from event or state
    const x = ctx.event?.to?.x ?? ctx.state?.player?.x ?? 0;
    const y = ctx.event?.to?.y ?? ctx.state?.player?.y ?? 0;
    
    // Queue explosion actions
    // 1. Damage the triggering entity
    A.damage(explosionDamage, 'explosion')(ctx);
    
    // 2. Remove burn status (consumed in explosion)
    A.removeStatus('burn')(ctx);
    A.removeStatus('burning')(ctx);
    
    // 3. Create area effect for splash damage
    ctx.queue.push({ 
      type: 'areaEffect', 
      effect: 'explosion',
      x: x,
      y: y,
      radius: explosionRadius,
      damage: explosionDamage,
      damageType: 'explosion',
      excludeSource: false // Source takes full damage
    });
    
    // 4. Remove the candy dust tile
    ctx.queue.push({ 
      type: 'removeTile',
      x: x,
      y: y
    });
    
    // 5. Trigger visual and audio effects
    ctx.queue.push({
      type: 'visualEffect',
      effect: 'explosion',
      x: x,
      y: y
    });
    
    // 6. Log the explosion
    ctx.queue.push({
      type: 'log',
      message: '💥 KABOOM! The candy dust ignites explosively!',
      style: 'danger'
    });
    
    ctx.queue.push({
      type: 'log',
      message: ctx.entity.id === 'player' || ctx.state?.player === ctx.entity ? 'You are caught in the blast!' : `${ctx.entity.name || 'The creature'} is caught in the blast!`,
      style: 'bad'
    });
  }
});

// Chain reaction rule - explosions can trigger nearby candy dust
rule({
  id: 'candy_dust_chain_reaction',
  phase: 'postdamage',
  priority: 5,
  when: P.and(
    // Check if damage was from explosion
    (ctx) => ctx.event?.damage?.type === 'explosion',
    // Check if entity is on candy dust
    (ctx) => ctx.env?.tileMaterial?.id === 'candy_dust',
    // Prevent infinite loops - check if not already exploding
    (ctx) => !ctx.entity._exploding
  ),
  then: (ctx) => {
    console.log('[CANDY DUST RULE] Chain reaction triggered!');
    
    // Mark as exploding to prevent loops
    ctx.entity._exploding = true;
    
    // Queue delayed chain explosion
    ctx.queue.push({ 
      type: 'delayedAction',
      delay: 100,
      action: {
        type: 'triggerExplosion',
        x: ctx.entity.x,
        y: ctx.entity.y
      }
    });
  }
});

// Environmental ignition rule - high temperature ignites candy dust
rule({
  id: 'candy_dust_environmental_ignition',
  phase: 'tick',
  priority: 5,
  when: P.and(
    // Check if on candy dust
    (ctx) => ctx.env?.tileMaterial?.id === 'candy_dust',
    // Check if environment is hot enough
    (ctx) => ctx.env?.temperatureC >= (ctx.env?.tileMaterial?.props?.ignitionThreshold || 100)
  ),
  then: (ctx) => {
    console.log('[CANDY DUST RULE] Environmental ignition!');
    
    // Trigger explosion from heat
    ctx.queue.push({
      type: 'triggerExplosion',
      x: ctx.entity.x,
      y: ctx.entity.y,
      source: 'environmental'
    });
  }
});

// Projectile impact rule - fire projectiles ignite candy dust
rule({
  id: 'candy_dust_projectile_ignition',
  phase: 'predamage',
  priority: 8,
  when: P.and(
    // Check if on candy dust
    (ctx) => ctx.env?.tileMaterial?.id === 'candy_dust',
    // Check if hit by fire damage
    (ctx) => ctx.event?.damage?.type === 'fire',
    // Check if from projectile
    (ctx) => ctx.event?.damage?.source === 'projectile'
  ),
  then: (ctx) => {
    console.log('[CANDY DUST RULE] Projectile ignition!');
    
    // Convert damage to explosion
    ctx.event.damage.type = 'explosion';
    ctx.event.damage.amount *= 2; // Double damage from explosion
    
    // Trigger full explosion
    ctx.queue.push({
      type: 'triggerExplosion',
      x: ctx.entity.x,
      y: ctx.entity.y,
      source: 'projectile'
    });
  }
});