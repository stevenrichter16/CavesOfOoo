import { Status } from '../../src/js/combat/statusSystem.js';

/**
 * Set up status effects in the Map for testing
 */
export function setupStatusEffects(entityId, effects) {
  // Clear any existing effects for this entity
  Status.delete(entityId);
  
  if (!effects || effects.length === 0) return;
  
  // Create the effects object
  const effectsMap = {};
  for (const effect of effects) {
    effectsMap[effect.type] = {
      turns: effect.turns || 0,
      value: effect.value || 0,
      sourceId: effect.sourceId || null,
      ...Object.fromEntries(
        Object.entries(effect).filter(([k]) => !['type', 'turns', 'value', 'sourceId'].includes(k))
      )
    };
  }
  
  // Set in the Map
  Status.set(entityId, effectsMap);
}

/**
 * Clear all status effects from the Map
 */
export function clearAllStatusEffects() {
  Status.clear();
}

/**
 * Set up an entity with status effects
 */
export function setupEntityWithEffects(entity, effects) {
  const entityId = entity.id || `test-entity-${Date.now()}`;
  entity.id = entityId;
  setupStatusEffects(entityId, effects);
  return entity;
}