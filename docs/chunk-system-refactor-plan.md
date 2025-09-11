# CavesOfOoo - World Map & Chunk System Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring of the chunk generation and world map system for CavesOfOoo. The goal is to transform the current monolithic, hardcoded system into a modular, extensible architecture while maintaining exact visual compatibility with the existing game.

## Current State Analysis

### File Structure
```
src/js/world/
├── worldGen.js (1000+ lines, monolithic)
├── worldMap.js (world map display/navigation)
├── candyMarketChunk.js (hardcoded special chunk)
├── graveyardChunk.js (hardcoded special chunk)
└── questChunks.js (quest-specific spawning)
```

### Critical Issues

1. **Monolithic Design**: `worldGen.js` handles everything in a single 1000+ line file
2. **Poor Separation of Concerns**: Generation, biome selection, monster spawning, and item placement are tangled
3. **Hardcoded Special Cases**: Special chunks checked inline with `if (cx === 0 && cy === 0)`
4. **Limited Extensibility**: Adding new chunk types requires modifying core generation logic
5. **No Clear Pipeline**: Generation steps aren't modular or reusable
6. **Difficult Testing**: Can't test individual components in isolation
7. **Code Duplication**: Similar patterns repeated across special chunks

### Technical Constraints

- **Chunk Dimensions**: 24 tiles wide (W) × 22 tiles tall (H)
- **Coordinate System**: Chunk-based with (0,0) as starting position
- **Persistence**: Chunks saved to localStorage with key pattern `ooo_enhanced_v1:${seed}:${cx}:${cy}`
- **Visual Requirements**: Must maintain exact appearance of current chunks

## Design Goals

### Primary Objectives

1. **Maintain Visual Consistency**: Zero changes to how chunks look and feel
2. **Improve Modularity**: Each component should have a single, clear responsibility
3. **Enable Easy Extension**: Adding new chunk types should be trivial
4. **Integrate Seamlessly**: Work perfectly with refactored movement and NPC systems
5. **Support Both Procedural & Static**: Mix random and hand-crafted content
6. **Improve Performance**: Better caching and generation strategies

### Integration Requirements

The new system must integrate with:
- **Movement Pipeline**: Handle chunk transitions through event system
- **NPC/Social System**: Spawn and manage NPCs per chunk
- **Quest System**: Support quest-specific chunk modifications
- **Persistence System**: Maintain save/load compatibility

## Proposed Architecture

### Directory Structure
```
src/js/world/
├── ChunkSystem.js              // Main orchestrator & facade
├── core/
│   ├── Chunk.js               // Chunk data model
│   ├── ChunkCache.js          // Caching layer
│   └── ChunkRegistry.js       // Registration system
├── generators/
│   ├── ChunkGenerator.js      // Base generator class
│   ├── ProceduralGenerator.js // Random generation
│   ├── TemplateGenerator.js   // Template-based generation
│   └── BiomeGenerator.js      // Biome-specific generation
├── templates/
│   ├── ChunkTemplate.js       // Base template class
│   ├── static/
│   │   ├── CandyMarket.js    // Candy market template
│   │   ├── Graveyard.js      // Graveyard template
│   │   └── DungeonEntrance.js // Example new template
│   └── registry.json          // Template configuration
├── features/
│   ├── ChunkFeature.js        // Base feature class
│   ├── terrain/
│   │   ├── WaterFeature.js   // Water generation
│   │   ├── WallFeature.js    // Wall/room generation
│   │   └── PathFeature.js    // Path/corridor generation
│   └── population/
│       ├── TreasureSpawner.js // Item placement
│       ├── MonsterSpawner.js  // Monster placement
│       └── NPCSpawner.js      // NPC placement
├── biomes/
│   ├── BiomeManager.js        // Biome selection logic
│   ├── BiomeConfig.js         // Biome definitions
│   └── BiomeFeatures.js       // Biome-specific features
├── pipeline/
│   ├── ChunkPipeline.js       // Generation pipeline
│   ├── PipelineStep.js        // Base pipeline step
│   └── steps/
│       ├── BiomeStep.js       // Biome selection
│       ├── StructureStep.js   // Structure generation
│       ├── FeatureStep.js     // Feature application
│       ├── PopulationStep.js  // Entity population
│       └── ValidationStep.js  // Validation & fixes
└── utils/
    ├── ChunkValidator.js      // Chunk validation
    ├── ConnectivityChecker.js // Ensure walkable paths
    └── NoiseGenerator.js      // Perlin noise for biomes
```

## Core Components

### 1. Chunk Data Model

```javascript
// src/js/world/core/Chunk.js
export class Chunk {
  constructor(cx, cy) {
    this.cx = cx;
    this.cy = cy;
    this.map = Array(H).fill().map(() => Array(W).fill('#'));
    this.monsters = [];
    this.items = [];
    this.npcs = [];
    this.biome = null;
    this.special = null;  // For special/unique chunks
    this.features = [];   // Applied features
    this.metadata = {};   // Extensible metadata
  }

  getTile(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return null;
    return this.map[y][x];
  }

  setTile(x, y, tile) {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      this.map[y][x] = tile;
    }
  }

  isPassable(x, y) {
    const tile = this.getTile(x, y);
    return tile === '.' || tile === '·' || tile === '~';
  }

  findEmptyTiles() {
    const tiles = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.isPassable(x, y) && !this.hasEntityAt(x, y)) {
          tiles.push({ x, y });
        }
      }
    }
    return tiles;
  }

  hasEntityAt(x, y) {
    return this.monsters.some(m => m.x === x && m.y === y && m.alive) ||
           this.npcs.some(n => n.x === x && n.y === y);
  }
}
```

### 2. Main Orchestrator

```javascript
// src/js/world/ChunkSystem.js
import { ChunkCache } from './core/ChunkCache.js';
import { ChunkRegistry } from './core/ChunkRegistry.js';
import { ChunkPipeline } from './pipeline/ChunkPipeline.js';
import { loadChunk, saveChunk } from '../utils/persistence.js';

export class ChunkSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.cache = new ChunkCache(100); // Cache up to 100 chunks
    this.registry = new ChunkRegistry();
    this.pipeline = new ChunkPipeline();
    
    this.setupEventListeners();
    this.registerDefaultTemplates();
  }

  setupEventListeners() {
    // Integration with movement system
    this.eventBus.on('WillChangeChunk', this.handleChunkTransition.bind(this));
    this.eventBus.on('DidChangeChunk', this.handleChunkActivation.bind(this));
    
    // Integration with quest system
    this.eventBus.on('QuestAccepted', this.handleQuestModification.bind(this));
  }

  async generateChunk(seed, cx, cy) {
    // Check cache first
    const cached = this.cache.get(cx, cy);
    if (cached) return cached;

    // Check persistence
    const saved = loadChunk(seed, cx, cy);
    if (saved) {
      this.cache.set(cx, cy, saved);
      return saved;
    }

    // Check for registered templates
    const template = this.registry.findTemplate(cx, cy);
    if (template) {
      const chunk = await template.generate(seed, cx, cy);
      this.cache.set(cx, cy, chunk);
      return chunk;
    }

    // Use pipeline for procedural generation
    const chunk = await this.pipeline.generate(seed, cx, cy);
    this.cache.set(cx, cy, chunk);
    return chunk;
  }

  async handleChunkTransition(event) {
    const { to } = event;
    
    // Pre-load the target chunk
    const chunk = await this.generateChunk(
      event.state.worldSeed,
      to.cx,
      to.cy
    );
    
    // Notify other systems
    this.eventBus.emit('ChunkPreparing', { 
      chunk,
      from: event.from,
      to: event.to 
    });
  }

  async handleChunkActivation(event) {
    const { cx, cy } = event;
    const chunk = this.cache.get(cx, cy);
    
    if (!chunk) {
      console.error(`Chunk ${cx},${cy} not in cache during activation`);
      return;
    }

    // Spawn NPCs and activate features
    await this.populateChunk(chunk);
    
    // Notify systems that chunk is ready
    this.eventBus.emit('ChunkActivated', { chunk });
  }

  async populateChunk(chunk) {
    // Integration point for NPC system
    if (chunk.special === 'graveyard') {
      const { populateGraveyard } = await import('./templates/static/Graveyard.js');
      populateGraveyard(chunk);
    } else if (chunk.special === 'candy_market') {
      const { populateCandyMarket } = await import('./templates/static/CandyMarket.js');
      populateCandyMarket(chunk);
    }
    
    // Standard population for other chunks
    // This would be handled by PopulationStep in the pipeline
  }

  saveChunk(seed, cx, cy, chunk) {
    saveChunk(seed, cx, cy, chunk);
    this.cache.set(cx, cy, chunk);
  }
}
```

### 3. Generation Pipeline

```javascript
// src/js/world/pipeline/ChunkPipeline.js
export class ChunkPipeline {
  constructor() {
    this.steps = [];
    this.setupDefaultPipeline();
  }

  setupDefaultPipeline() {
    this.steps = [
      new BiomeSelectionStep(),
      new StructureGenerationStep(),
      new FeatureApplicationStep(),
      new PopulationStep(),
      new ValidationStep()
    ];
  }

  async generate(seed, cx, cy) {
    const context = {
      seed,
      cx,
      cy,
      chunk: new Chunk(cx, cy),
      rng: new SeededRandom(seed, cx, cy),
      params: {}
    };

    for (const step of this.steps) {
      try {
        await step.process(context);
        
        if (context.cancelled) {
          console.log(`Pipeline cancelled at step ${step.name}`);
          break;
        }
      } catch (error) {
        console.error(`Pipeline error at step ${step.name}:`, error);
        this.handleError(context, step, error);
      }
    }

    return context.chunk;
  }

  handleError(context, step, error) {
    // Emit error event for logging
    this.eventBus?.emit('ChunkGenerationError', {
      step: step.name,
      error,
      cx: context.cx,
      cy: context.cy
    });

    // Apply fallback generation
    this.applyFallbackGeneration(context.chunk);
  }

  applyFallbackGeneration(chunk) {
    // Create a simple, guaranteed-valid chunk
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        chunk.setTile(x, y, '.');
      }
    }
  }
}
```

### 4. Template System

```javascript
// src/js/world/templates/ChunkTemplate.js
export class ChunkTemplate {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.coordinates = config.coordinates || [];
    this.condition = config.condition || null;
    this.layout = config.layout;
    this.features = config.features || [];
    this.npcs = config.npcs || [];
    this.items = config.items || [];
    this.monsters = config.monsters || [];
  }

  matches(cx, cy, context = {}) {
    // Check fixed coordinates
    if (this.coordinates.length > 0) {
      return this.coordinates.some(c => c.x === cx && c.y === cy);
    }

    // Check custom condition
    if (this.condition) {
      return this.condition(cx, cy, context);
    }

    return false;
  }

  async generate(seed, cx, cy) {
    const chunk = new Chunk(cx, cy);
    const rng = new SeededRandom(seed, cx, cy);

    // Parse layout
    chunk.map = this.parseLayout(this.layout);
    chunk.special = this.id;

    // Apply features
    for (const feature of this.features) {
      await feature.apply(chunk, rng);
    }

    // Add entities
    this.spawnEntities(chunk, rng);

    return chunk;
  }

  parseLayout(layout) {
    if (typeof layout === 'string') {
      return this.parseASCIILayout(layout);
    } else if (typeof layout === 'function') {
      return layout();
    } else if (Array.isArray(layout)) {
      return layout;
    }
    throw new Error(`Invalid layout type for template ${this.id}`);
  }

  parseASCIILayout(asciiLayout) {
    const lines = asciiLayout.trim().split('\n');
    
    if (lines.length !== H) {
      throw new Error(`Template ${this.id} height must be ${H}, got ${lines.length}`);
    }

    const map = [];
    for (let y = 0; y < H; y++) {
      const line = lines[y];
      if (line.length !== W) {
        throw new Error(`Template ${this.id} width must be ${W} at line ${y}, got ${line.length}`);
      }
      map[y] = line.split('');
    }

    return map;
  }

  spawnEntities(chunk, rng) {
    // Spawn monsters
    for (const monsterConfig of this.monsters) {
      const pos = this.resolvePosition(monsterConfig.position, chunk, rng);
      if (pos) {
        chunk.monsters.push({
          ...monsterConfig,
          x: pos.x,
          y: pos.y,
          alive: true
        });
      }
    }

    // Items and NPCs handled similarly
  }

  resolvePosition(posConfig, chunk, rng) {
    if (Array.isArray(posConfig)) {
      return { x: posConfig[0], y: posConfig[1] };
    }
    
    if (posConfig === 'random') {
      const emptyTiles = chunk.findEmptyTiles();
      return rng.pick(emptyTiles);
    }

    if (typeof posConfig === 'function') {
      return posConfig(chunk, rng);
    }

    return posConfig;
  }
}
```

### 5. Feature System

```javascript
// src/js/world/features/ChunkFeature.js
export class ChunkFeature {
  constructor(config = {}) {
    this.name = config.name || this.constructor.name;
    this.priority = config.priority || 0;
    this.probability = config.probability || 1.0;
    this.config = config;
  }

  shouldApply(chunk, rng) {
    return rng.next() < this.probability;
  }

  async apply(chunk, rng) {
    if (!this.shouldApply(chunk, rng)) {
      return;
    }

    try {
      await this.doApply(chunk, rng);
      chunk.features.push(this.name);
    } catch (error) {
      console.error(`Feature ${this.name} failed:`, error);
    }
  }

  async doApply(chunk, rng) {
    // Override in subclasses
    throw new Error(`Feature ${this.name} must implement doApply`);
  }
}

// Example: Water Feature
export class WaterFeature extends ChunkFeature {
  async doApply(chunk, rng) {
    const type = rng.pick(['pond', 'river', 'pools']);
    
    switch(type) {
      case 'pond':
        this.generatePond(chunk, rng);
        break;
      case 'river':
        this.generateRiver(chunk, rng);
        break;
      case 'pools':
        this.generatePools(chunk, rng);
        break;
    }
  }

  generatePond(chunk, rng) {
    const centerX = rng.between(5, W - 5);
    const centerY = rng.between(5, H - 5);
    const radiusX = rng.between(1, 3);
    const radiusY = rng.between(1, 2);

    for (let y = Math.max(1, centerY - radiusY); y < Math.min(H - 1, centerY + radiusY); y++) {
      for (let x = Math.max(1, centerX - radiusX); x < Math.min(W - 1, centerX + radiusX); x++) {
        const distX = Math.abs(x - centerX) / radiusX;
        const distY = Math.abs(y - centerY) / radiusY;
        const dist = Math.sqrt(distX * distX + distY * distY);
        
        if (dist < 0.7 || (dist < 1.0 && rng.next() < 0.4)) {
          chunk.setTile(x, y, '~');
        }
      }
    }
  }

  // generateRiver and generatePools implementations...
}
```

## Integration Points

### Movement System Integration

```javascript
// In MovementPipeline.js or movement adapter
class ChunkTransitionHandler {
  constructor(chunkSystem, eventBus) {
    this.chunkSystem = chunkSystem;
    this.eventBus = eventBus;
  }

  async handleEdgeTransition(state, player, direction) {
    const targetCoords = this.getTargetCoords(state, direction);
    
    // Notify chunk system
    this.eventBus.emit('WillChangeChunk', {
      from: { cx: state.cx, cy: state.cy },
      to: targetCoords,
      state
    });

    // Load new chunk
    const newChunk = await this.chunkSystem.generateChunk(
      state.worldSeed,
      targetCoords.cx,
      targetCoords.cy
    );

    // Update state
    state.cx = targetCoords.cx;
    state.cy = targetCoords.cy;
    state.chunk = newChunk;

    // Position player on opposite edge
    this.positionPlayerAtEdge(player, direction);

    // Notify completion
    this.eventBus.emit('DidChangeChunk', targetCoords);
  }
}
```

### NPC System Integration

```javascript
// In NPCSpawner feature
export class NPCSpawner extends ChunkFeature {
  async doApply(chunk, rng) {
    // Get NPCs for this chunk type/biome
    const npcConfigs = this.getNPCsForChunk(chunk);
    
    for (const config of npcConfigs) {
      const pos = this.findSpawnPosition(chunk, rng);
      if (!pos) continue;

      // Create NPC using social system
      const npc = await this.createNPC({
        ...config,
        x: pos.x,
        y: pos.y,
        chunkX: chunk.cx,
        chunkY: chunk.cy
      });

      chunk.npcs.push(npc);
    }
  }

  async createNPC(config) {
    // Import social system dynamically
    const { spawnSocialNPC } = await import('../../social/init.js');
    return spawnSocialNPC(null, config);
  }
}
```

## Example Templates

### Candy Market Template

```javascript
// src/js/world/templates/static/CandyMarket.js
export class CandyMarketTemplate extends ChunkTemplate {
  constructor() {
    super({
      id: 'candy_market',
      name: 'Candy Market',
      coordinates: [{ x: 0, y: 0 }], // Fixed at origin
      layout: `
########################
#......................#
#..╬══..╤══..≡══..¤══..#
#....................║..#
#....................║..#
#.♣..................♣.#
#......................#
#......................#
#..╤══..☐....╬══....¤.#
#.......☐...........║..#
#........○○............#
#........○○............#
#......................#
#......................#
#..≡══..☐....╤══..╬══.#
#.......☐..............#
#......................#
#......................#
#.♣..................♣.#
#......................#
#......................#
########......##########
      `,
      features: [
        new MarketDecorationFeature(),
        new VendorSpawner()
      ],
      npcs: [
        {
          id: 'candy_vendor_1',
          name: 'Peppermint Butler',
          type: 'vendor',
          position: [3, 3],
          dialogue: 'candy_vendor',
          inventory: 'candy_shop'
        }
      ]
    });
  }
}
```

### Dungeon Entrance Template

```javascript
// src/js/world/templates/static/DungeonEntrance.js
export class DungeonEntranceTemplate extends ChunkTemplate {
  constructor() {
    super({
      id: 'dungeon_entrance',
      name: 'Dungeon Entrance',
      condition: (cx, cy) => {
        // Generate at specific locations based on world seed
        return (cx === 5 && cy === -5) || (cx === -8 && cy === 3);
      },
      layout: `
########################
#......................#
#..◊◊◊◊◊◊....◊◊◊◊◊◊..#
#..◊....†......†....◊..#
#..◊................◊..#
#..◊................◊..#
#..◊................◊..#
#..◊◊◊◊◊◊....◊◊◊◊◊◊..#
#......................#
#.......S....S.........#
#........≫≫≫≫≫.........#
#........≫≫≫≫≫.........#
#........≫≫≫≫≫.........#
#.......S....S.........#
#......................#
#..◊◊◊◊◊◊....◊◊◊◊◊◊..#
#..◊................◊..#
#..◊................◊..#
#..◊................◊..#
#..◊....†......†....◊..#
#..◊◊◊◊◊◊....◊◊◊◊◊◊..#
######..........########
      `,
      features: [
        new TorchLightingFeature(),
        new StairsFeature({ target: 'dungeon_level_1' })
      ],
      monsters: [
        { type: 'skeleton_guard', position: [8, 9] },
        { type: 'skeleton_guard', position: [15, 9] },
        { type: 'skeleton_guard', position: [8, 13] },
        { type: 'skeleton_guard', position: [15, 13] }
      ]
    });
  }
}
```

## Migration Strategy

### Phase 1: Foundation (Days 1-3)
1. Create directory structure
2. Implement core classes (Chunk, ChunkCache, ChunkRegistry)
3. Create ChunkSystem with basic functionality
4. Add comprehensive tests for core components

### Phase 2: Pipeline Implementation (Days 4-6)
1. Implement ChunkPipeline and base PipelineStep
2. Create pipeline steps (Biome, Structure, Feature, Population, Validation)
3. Wrap existing generation logic in pipeline steps
4. Test pipeline with existing generation

### Phase 3: Feature Extraction (Days 7-9)
1. Extract water generation → WaterFeature
2. Extract room/corridor generation → StructureFeature
3. Extract item placement → TreasureSpawner
4. Extract monster spawning → MonsterSpawner
5. Test each feature independently

### Phase 4: Template System (Days 10-12)
1. Implement ChunkTemplate base class
2. Convert CandyMarket to template
3. Convert Graveyard to template
4. Create template registry and loader
5. Test template generation

### Phase 5: Biome Improvements (Days 13-15)
1. Implement BiomeManager with Perlin noise
2. Create biome-specific features
3. Add biome clustering for natural boundaries
4. Test biome distribution

### Phase 6: Integration (Days 16-18)
1. Wire up with movement pipeline
2. Integrate with NPC/social system
3. Update quest system integration
4. Performance optimization

### Phase 7: Testing & Polish (Days 19-21)
1. Comprehensive integration testing
2. Performance benchmarking
3. Save/load compatibility testing
4. Documentation updates

## Testing Strategy

### Unit Tests
```javascript
// Example test for ChunkTemplate
describe('ChunkTemplate', () => {
  it('should generate chunk with correct dimensions', () => {
    const template = new TestTemplate();
    const chunk = template.generate('seed', 0, 0);
    
    expect(chunk.map.length).toBe(H);
    expect(chunk.map[0].length).toBe(W);
  });

  it('should match coordinates correctly', () => {
    const template = new ChunkTemplate({
      coordinates: [{ x: 0, y: 0 }, { x: 5, y: -3 }]
    });
    
    expect(template.matches(0, 0)).toBe(true);
    expect(template.matches(5, -3)).toBe(true);
    expect(template.matches(1, 1)).toBe(false);
  });
});
```

### Integration Tests
```javascript
describe('ChunkSystem Integration', () => {
  it('should handle chunk transitions', async () => {
    const eventBus = new EventBus();
    const chunkSystem = new ChunkSystem(eventBus);
    
    const chunk = await chunkSystem.generateChunk('seed', 0, 0);
    expect(chunk.special).toBe('candy_market');
    
    eventBus.emit('WillChangeChunk', {
      from: { cx: 0, cy: 0 },
      to: { cx: -1, cy: 0 }
    });
    
    const graveyard = await chunkSystem.generateChunk('seed', -1, 0);
    expect(graveyard.special).toBe('graveyard');
  });
});
```

## Performance Considerations

### Caching Strategy
- Cache up to 100 chunks in memory
- Use LRU eviction policy
- Pre-load adjacent chunks during idle time
- Compress chunks in cache if needed

### Generation Optimization
- Use worker threads for heavy generation
- Stream chunk data for large operations
- Batch entity spawning
- Use object pools for frequently created objects

## Backwards Compatibility

### Save Format
- Maintain existing localStorage key format
- Add version field to chunks for migration
- Provide migration utilities for old saves

```javascript
class ChunkMigrator {
  migrate(oldChunk) {
    const newChunk = new Chunk(oldChunk.cx, oldChunk.cy);
    
    // Copy existing data
    newChunk.map = oldChunk.map;
    newChunk.monsters = oldChunk.monsters || [];
    newChunk.items = oldChunk.items || [];
    newChunk.biome = oldChunk.biome;
    
    // Add new fields
    newChunk.features = [];
    newChunk.metadata = {};
    
    return newChunk;
  }
}
```

## Success Metrics

1. **Code Quality**
   - Reduce worldGen.js from 1000+ lines to < 200
   - Achieve 80% test coverage
   - Zero regression bugs

2. **Performance**
   - Chunk generation < 50ms average
   - Memory usage < 100MB for cache
   - Smooth chunk transitions (no frame drops)

3. **Extensibility**
   - Add new chunk template in < 30 minutes
   - Add new feature in < 1 hour
   - Zero core code changes for new content

4. **Maintainability**
   - Clear separation of concerns
   - Self-documenting code structure
   - Comprehensive documentation

## Conclusion

This refactoring transforms the chunk system from a monolithic, hard-to-maintain codebase into a modular, extensible architecture. It maintains 100% visual compatibility while enabling rapid content creation and seamless integration with other game systems.

The key benefits are:
- **Modularity**: Each component has a single responsibility
- **Extensibility**: New content can be added without touching core code
- **Testability**: All components can be tested in isolation
- **Performance**: Better caching and generation strategies
- **Integration**: Seamless with movement and NPC systems

Implementation should proceed incrementally, maintaining working code at each phase while gradually replacing the old system.