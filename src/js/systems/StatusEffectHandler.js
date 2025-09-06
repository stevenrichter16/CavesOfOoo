/**
 * StatusEffectHandler - Handles status effect events from other systems
 * Bridges the gap between event-based systems and state mutations
 */
import { getGameEventBus } from './EventBus.js';

export class StatusEffectHandler {
  constructor(eventBus = null) {
    this.eventBus = eventBus || getGameEventBus();
    this.handlers = {};
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Store handlers for proper cleanup
    this.handlers.damageDealt = (event) => this.handleDamage(event);
    this.handlers.statusApplied = (event) => this.handleStatusApplied(event);
    this.handlers.statusUpdated = (event) => this.handleStatusUpdated(event);
    this.handlers.materialInteraction = (event) => this.handleMaterialInteraction(event);
    this.handlers.cleanupEffects = (event) => this.handleCleanupEffects(event);
    
    // Register handlers
    this.eventBus.on('DamageDealt', this.handlers.damageDealt);
    this.eventBus.on('StatusEffectApplied', this.handlers.statusApplied);
    this.eventBus.on('StatusEffectUpdated', this.handlers.statusUpdated);
    this.eventBus.on('MaterialInteraction', this.handlers.materialInteraction);
    this.eventBus.on('CleanupStatusEffects', this.handlers.cleanupEffects);
  }

  handleDamage(event) {
    const { target, amount, source, type } = event;
    
    // Validate inputs
    if (!target || typeof target.hp !== 'number') {
      console.warn('Invalid damage target:', target);
      return;
    }
    
    if (typeof amount !== 'number' || amount < 0 || isNaN(amount)) {
      console.warn('Invalid damage amount:', amount);
      return;
    }
    
    // Store previous HP for death detection
    const previousHp = target.hp;
    
    // Apply damage with bounds checking
    target.hp = Math.max(0, target.hp - amount);
    
    // Emit death event if entity died
    if (target.hp <= 0 && previousHp > 0) {
      this.eventBus.emit('EntityDied', {
        entity: target,
        source,
        damageType: type
      });
    }
  }

  handleStatusApplied(event) {
    const { entity, effect } = event;
    
    // Validate inputs
    if (!entity) {
      console.warn('No entity for status effect:', effect);
      return;
    }
    
    if (!effect || !effect.type) {
      console.warn('Invalid status effect:', effect);
      return;
    }
    
    // Initialize status effects array if needed
    entity.statusEffects = entity.statusEffects || [];
    
    // For water_slow with duration 0, check if already exists
    if (effect.type === 'water_slow' && effect.duration === 0) {
      const existing = entity.statusEffects.find(e => e.type === 'water_slow');
      if (!existing) {
        entity.statusEffects.push({ ...effect }); // Clone to avoid reference issues
      }
    } else {
      // Add the effect (cloned)
      entity.statusEffects.push({ ...effect });
    }
  }

  handleStatusUpdated(event) {
    const { entity, effectType, update } = event;
    
    if (!entity || !entity.statusEffects) {
      console.warn('No entity or status effects for update:', effectType);
      return;
    }
    
    const effect = entity.statusEffects.find(e => e.type === effectType);
    if (effect) {
      Object.assign(effect, update);
    }
  }

  handleMaterialInteraction(event) {
    // This would be handled by a material system
    // For now, just log it
    const { entity, material, position } = event;
    if (position && position.x !== undefined && position.y !== undefined) {
      console.debug(`Material interaction: ${material} at ${position.x},${position.y}`);
    }
  }

  handleCleanupEffects(event) {
    const { entity, filter } = event;
    
    if (!entity || !entity.statusEffects) return;
    
    if (typeof filter === 'function') {
      entity.statusEffects = entity.statusEffects.filter(filter);
    }
  }

  /**
   * Clean up event handlers (useful for testing)
   */
  cleanup() {
    // Remove handlers using stored references
    if (this.handlers.damageDealt) {
      this.eventBus.off('DamageDealt', this.handlers.damageDealt);
    }
    if (this.handlers.statusApplied) {
      this.eventBus.off('StatusEffectApplied', this.handlers.statusApplied);
    }
    if (this.handlers.statusUpdated) {
      this.eventBus.off('StatusEffectUpdated', this.handlers.statusUpdated);
    }
    if (this.handlers.materialInteraction) {
      this.eventBus.off('MaterialInteraction', this.handlers.materialInteraction);
    }
    if (this.handlers.cleanupEffects) {
      this.eventBus.off('CleanupStatusEffects', this.handlers.cleanupEffects);
    }
    
    // Clear handler references
    this.handlers = {};
  }
}

// Factory function
let _statusEffectHandler = null;

/**
 * Get or create the status effect handler instance
 * @param {EventBus} eventBus - Optional event bus
 * @returns {StatusEffectHandler} The handler instance
 */
export function getStatusEffectHandler(eventBus = null) {
  if (!_statusEffectHandler) {
    _statusEffectHandler = new StatusEffectHandler(eventBus);
  }
  return _statusEffectHandler;
}

/**
 * Reset the status effect handler (useful for testing)
 */
export function resetStatusEffectHandler() {
  if (_statusEffectHandler) {
    _statusEffectHandler.cleanup();
  }
  _statusEffectHandler = null;
}