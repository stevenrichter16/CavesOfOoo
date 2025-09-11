/**
 * Comprehensive mocks for ChunkSystem testing
 * Provides proper implementations for all dependencies
 */

import { vi } from 'vitest';

/**
 * Mock Chunk implementation matching Phase 1
 */
export class MockChunk {
  constructor(cx, cy) {
    this.cx = cx;
    this.cy = cy;
    this.map = Array(22).fill().map(() => Array(24).fill('#'));
    this.monsters = [];
    this.npcs = [];
    this.items = [];
    this.metadata = {};
    this.modified = false;
    this.biome = null;
    this.spatialIndex = new Map();
  }
  
  getTile(x, y) {
    if (x < 0 || x >= 24 || y < 0 || y >= 22) return null;
    return this.map[y][x];
  }
  
  setTile(x, y, tile) {
    if (x >= 0 && x < 24 && y >= 0 && y < 22) {
      this.map[y][x] = tile;
      this.modified = true;
    }
  }
  
  addMonster(monster) {
    this.monsters.push(monster);
    this.spatialIndex.set(`${monster.x},${monster.y}`, monster);
    this.modified = true;
  }
  
  addNPC(npc) {
    this.npcs.push(npc);
    this.spatialIndex.set(`${npc.x},${npc.y}`, npc);
    this.modified = true;
  }
  
  addItem(item) {
    this.items.push(item);
    this.modified = true;
  }
  
  getEntityAt(x, y) {
    return this.spatialIndex.get(`${x},${y}`);
  }
}

/**
 * Mock ChunkCache implementation matching Phase 1
 */
export class MockChunkCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
    this.eventHandlers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  get(cx, cy) {
    const key = `${cx},${cy}`;
    const chunk = this.cache.get(key);
    
    if (chunk) {
      this.stats.hits++;
      // Update access order for LRU
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
      return chunk;
    }
    
    this.stats.misses++;
    return undefined;
  }
  
  set(cx, cy, chunk) {
    const key = `${cx},${cy}`;
    
    // Check if we need to evict
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      const lru = this.accessOrder.shift();
      const evicted = this.cache.get(lru);
      this.cache.delete(lru);
      this.stats.evictions++;
      
      // Emit eviction event
      this.emit('evict', evicted);
    }
    
    this.cache.set(key, chunk);
    if (!this.accessOrder.includes(key)) {
      this.accessOrder.push(key);
    }
  }
  
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }
  
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }
  
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(h => h(data));
  }
  
  getAllChunks() {
    return Array.from(this.cache.values());
  }
  
  has(cx, cy) {
    return this.cache.has(`${cx},${cy}`);
  }
  
  get size() {
    return this.cache.size;
  }
}

/**
 * Mock ChunkRegistry implementation matching Phase 1
 */
export class MockChunkRegistry {
  constructor() {
    this.templates = new Map();
    this.priorityList = [];
  }
  
  register(name, template) {
    this.templates.set(name, template);
    this.updatePriorityList();
  }
  
  unregister(name) {
    this.templates.delete(name);
    this.updatePriorityList();
  }
  
  findTemplate(cx, cy) {
    // Check templates in priority order
    for (const template of this.priorityList) {
      if (template.matches && template.matches(cx, cy)) {
        return template;
      }
    }
    return null;
  }
  
  updatePriorityList() {
    this.priorityList = Array.from(this.templates.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  getTemplate(name) {
    return this.templates.get(name);
  }
  
  clear() {
    this.templates.clear();
    this.priorityList = [];
  }
}

/**
 * Mock ChunkPipeline implementation matching Phase 2
 */
export class MockChunkPipeline {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.steps = [];
    this.setupDefaultSteps();
  }
  
  setupDefaultSteps() {
    this.steps = [
      { name: 'BiomeStep', process: this.biomeStep.bind(this) },
      { name: 'StructureStep', process: this.structureStep.bind(this) },
      { name: 'FeatureStep', process: this.featureStep.bind(this) },
      { name: 'PopulationStep', process: this.populationStep.bind(this) },
      { name: 'ValidationStep', process: this.validationStep.bind(this) }
    ];
  }
  
  async generate(seed, cx, cy) {
    const chunk = new MockChunk(cx, cy);
    
    const context = {
      seed,
      cx,
      cy,
      chunk,
      params: {},
      rng: new MockSeededRandom(seed, cx, cy)
    };
    
    // Run pipeline steps
    for (const step of this.steps) {
      await step.process(context);
    }
    
    return chunk;
  }
  
  async biomeStep(context) {
    const biomes = ['grassland', 'forest', 'desert', 'tundra', 'swamp', 'mountains'];
    const index = Math.abs(context.cx + context.cy) % biomes.length;
    context.chunk.biome = biomes[index];
    context.params.biome = context.chunk.biome;
  }
  
  async structureStep(context) {
    // Add some rooms
    context.params.rooms = [
      { x: 5, y: 5, width: 8, height: 8 },
      { x: 15, y: 10, width: 6, height: 6 }
    ];
    
    // Carve out rooms
    for (const room of context.params.rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          if (x < 24 && y < 22) {
            context.chunk.setTile(x, y, '.');
          }
        }
      }
    }
  }
  
  async featureStep(context) {
    context.params.features = {
      doors: [{ x: 5, y: 5, type: '+' }],
      chests: [{ x: 10, y: 10, type: 'C' }],
      stairs: context.chunk.biome === 'mountains' ? [{ x: 20, y: 20, type: '>' }] : []
    };
    
    // Place features
    for (const door of context.params.features.doors) {
      context.chunk.setTile(door.x, door.y, door.type);
    }
  }
  
  async populationStep(context) {
    // Add some monsters
    if (context.params.rooms && context.params.rooms.length > 0) {
      const room = context.params.rooms[0];
      context.chunk.addMonster({
        x: room.x + 2,
        y: room.y + 2,
        type: 'goblin',
        hp: 10,
        level: 1
      });
    }
    
    // Add NPCs
    context.chunk.addNPC({
      x: 12,
      y: 11,
      type: 'merchant',
      name: 'Bob'
    });
  }
  
  async validationStep(context) {
    // Mark as validated
    context.chunk.validated = true;
    context.chunk.metadata.validated = true;
    
    // Fix any out of bounds entities
    for (const monster of context.chunk.monsters) {
      if (monster.x < 0 || monster.x >= 24 || monster.y < 0 || monster.y >= 22) {
        monster.x = Math.max(0, Math.min(23, monster.x));
        monster.y = Math.max(0, Math.min(21, monster.y));
      }
    }
  }
}

/**
 * Mock SeededRandom implementation matching Phase 2
 */
export class MockSeededRandom {
  constructor(seed, cx, cy) {
    // Simple deterministic hash
    let hash = 0;
    const str = `${seed}-${cx}-${cy}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    this.state = Math.abs(hash) || 1;
  }
  
  next() {
    // Simple LCG
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }
  
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  choose(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

/**
 * Mock EventBus implementation
 */
export class MockEventBus {
  constructor() {
    this.handlers = new Map();
    this.emitHistory = [];
  }
  
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
    return this; // For chaining
  }
  
  off(event, handler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this; // For chaining
  }
  
  // Add mock for vitest
  get mock() {
    return {
      calls: Array.from(this.handlers.entries()).map(([event, handlers]) => 
        handlers.map(h => [event, h])
      ).flat()
    };
  }
  
  emit(event, data) {
    this.emitHistory.push({ event, data });
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(h => h(data));
  }
  
  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
  
  clear() {
    this.handlers.clear();
    this.emitHistory = [];
  }
  
  getEmitHistory(event) {
    return this.emitHistory.filter(h => h.event === event);
  }
}

/**
 * Create a fully mocked ChunkSystem environment
 */
export function createMockEnvironment() {
  const eventBus = new MockEventBus();
  const cache = new MockChunkCache(100);
  const registry = new MockChunkRegistry();
  const pipeline = new MockChunkPipeline(eventBus);
  
  return {
    eventBus,
    cache,
    registry,
    pipeline,
    Chunk: MockChunk,
    SeededRandom: MockSeededRandom
  };
}

/**
 * Setup ChunkSystem with proper mocks
 */
export function setupMockedChunkSystem(ChunkSystem, config = {}) {
  const env = createMockEnvironment();
  const system = new ChunkSystem(env.eventBus, config);
  
  // Replace internals with mocks
  system.cache = env.cache;
  system.registry = env.registry;
  system.pipeline = env.pipeline;
  
  // Add spy functions - store original methods to avoid infinite recursion
  const originalGenerateChunk = system.generateChunk.bind(system);
  const originalPreloadAdjacentChunks = system.preloadAdjacentChunks.bind(system);
  
  system.generateChunk = vi.fn(originalGenerateChunk);
  system.preloadAdjacentChunks = vi.fn(originalPreloadAdjacentChunks);
  system.loadChunk = vi.fn(async (seed, cx, cy) => {
    // Simulate persistence
    if (system.persistedChunks && system.persistedChunks.has(`${cx},${cy}`)) {
      return system.persistedChunks.get(`${cx},${cy}`);
    }
    return null;
  });
  
  system.saveChunk = vi.fn(async (seed, chunk) => {
    if (!system.persistedChunks) {
      system.persistedChunks = new Map();
    }
    system.persistedChunks.set(`${chunk.cx},${chunk.cy}`, chunk);
    chunk.saved = true;
  });
  
  return { system, env };
}