import { expect } from 'vitest';
import { Status, getEntityId } from '../../src/js/combat/statusSystem.js';

/**
 * Create a mock entity for testing
 */
export function createMockEntity(overrides = {}) {
  return {
    id: overrides.id || 'test-entity',
    hp: 100,
    hpMax: 100,
    x: 0,
    y: 0,
    // statusEffects removed - using Status Map
    alive: true,
    str: 10,
    def: 10,
    spd: 10,
    ...overrides
  };
}

/**
 * Create a mock game state
 */
export function createMockState(overrides = {}) {
  return {
    player: createMockEntity({ id: 'player' }),
    chunk: {
      map: Array(20).fill(null).map(() => Array(20).fill('.'))
    },
    time: 'day',
    weather: 'clear',
    log: () => {},
    applyStatus: (entity, type, turns, value) => {
      const entityId = getEntityId(entity);
      if (!entityId) return;
      
      let effects = Status.get(entityId);
      if (!effects) {
        effects = {};
        Status.set(entityId, effects);
      }
      
      if (effects[type]) {
        // Update existing status
        effects[type].turns += turns;
        effects[type].value = Math.max(effects[type].value || 0, value || 0);
      } else {
        // Add new status
        effects[type] = {
          turns: turns || 0,
          value: value || 0,
          sourceId: null
        };
      }
    },
    ...overrides
  };
}

/**
 * Create a mock context for engine testing
 */
export function createMockContext(overrides = {}) {
  return {
    entity: {
      id: 'test',
      hp: 100,
      hpMax: 100,
      statuses: [],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {},
    queue: [],
    rand: () => 0.5, // Deterministic for tests
    ...overrides
  };
}

/**
 * Assert that an action was queued
 */
export function assertActionQueued(queue, type, props = {}) {
  const action = queue.find(a => a.type === type);
  expect(action).toBeDefined();
  if (action) {
    Object.entries(props).forEach(([key, value]) => {
      expect(action[key]).toBe(value);
    });
  }
  return action;
}

/**
 * Assert that no action of a type was queued
 */
export function assertNoAction(queue, type) {
  const action = queue.find(a => a.type === type);
  expect(action).toBeUndefined();
}

/**
 * Create a status with proper structure
 */
export function createStatus(id, tags = [], props = {}) {
  return {
    id,
    tags,
    props: {
      turns: 3,
      value: 1,
      ...props
    }
  };
}

/**
 * Create a material with proper structure
 */
export function createMaterial(id, tags = [], props = {}) {
  return {
    id,
    tags,
    props
  };
}

/**
 * Clear all registered rules (useful for test isolation)
 */
export function clearRules() {
  // This would need to be implemented in the rules module
  // For now, we'll handle it in individual tests
}

/**
 * Wait for async operations
 */
export async function waitFor(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}