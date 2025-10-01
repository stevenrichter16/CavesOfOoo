import { expect } from 'vitest';
import { Status, getEntityId } from '../../src/js/combat/statusSystem.js';
import { createTileGrid, createGlyphAwareMap } from '../../src/js/world/tileUtils.js';

function buildChunkFromGlyphMap(glyphMap) {
  const height = glyphMap?.length ?? 0;
  const width = height > 0 ? glyphMap[0]?.length ?? 0 : 0;
  const { map: baseMap, tileIds } = createTileGrid(width || 1, height || 1, 'floor.default');
  const mapProxy = createGlyphAwareMap(baseMap, tileIds);

  if (glyphMap) {
    for (let y = 0; y < glyphMap.length; y++) {
      const row = glyphMap[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < row.length; x++) {
        mapProxy[y][x] = row[x];
      }
    }
  }

  return { map: mapProxy, tileIds };
}

export function createTestChunk(width, height, fillGlyph = '.') {
  const glyphMap = Array.from({ length: height }, () => Array(width).fill(fillGlyph));
  const { map, tileIds } = buildChunkFromGlyphMap(glyphMap);
  return {
    map,
    tileIds,
    monsters: [],
    items: [],
  };
}

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
  const chunkOverrides = overrides.chunk;
  let chunk;

  if (chunkOverrides) {
    const sourceMap = chunkOverrides.map;
    const height = sourceMap?.length ?? 20;
    const width = height > 0 ? sourceMap[0]?.length ?? 20 : 20;
    const built = buildChunkFromGlyphMap(sourceMap ?? Array.from({ length: height }, () => Array(width).fill('.')));
    chunk = {
      monsters: [],
      items: [],
      ...chunkOverrides,
      map: built.map,
      tileIds: built.tileIds
    };
  } else {
    chunk = createTestChunk(20, 20);
  }

  const state = {
    player: createMockEntity({ id: 'player' }),
    chunk,
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
    ...overrides,
    chunk
  };

  if (!Array.isArray(state.chunk.monsters)) {
    state.chunk.monsters = [];
  }
  if (!Array.isArray(state.chunk.items)) {
    state.chunk.items = [];
  }

  return state;
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
