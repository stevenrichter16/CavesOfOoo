# ChunkSystem API Documentation

## Overview
The ChunkSystem is the main orchestrator for chunk-based world generation in Caves of Ooo. It coordinates caching, generation pipeline, persistence, and metrics collection.

## Table of Contents
1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Core API](#core-api)
4. [Metrics](#metrics)
5. [Persistence](#persistence)
6. [Templates](#templates)
7. [Events](#events)
8. [Examples](#examples)

## Installation

```javascript
import { ChunkSystem } from './src/js/world/ChunkSystem.js';
import { EventBus } from './src/js/events/EventBus.js';

const eventBus = new EventBus();
const chunkSystem = new ChunkSystem(eventBus, {
  cacheSize: 100,
  preloadRadius: 1,
  enableMetrics: true
});
```

## Basic Usage

### Generate a Chunk
```javascript
// Generate or retrieve a chunk at coordinates (5, 5)
const chunk = await chunkSystem.generateChunk('world-seed', 5, 5);

console.log(chunk.biome); // 'forest', 'desert', etc.
console.log(chunk.map);    // 2D array of tiles
console.log(chunk.monsters); // Array of monsters
console.log(chunk.npcs);    // Array of NPCs
```

### Check Chunk Transitions
```javascript
// Check if player movement causes chunk transition
const playerX = 23, playerY = 10;
const moveX = 1, moveY = 0;

const transition = chunkSystem.getChunkTransition(
  playerX, playerY, moveX, moveY
);

if (transition.shouldTransition) {
  console.log(`Moving to chunk (${transition.toCx}, ${transition.toCy})`);
  console.log(`New position: (${transition.newX}, ${transition.newY})`);
}
```

## Core API

### Constructor
```javascript
new ChunkSystem(eventBus, config)
```

**Parameters:**
- `eventBus` (EventBus): Event bus for system integration
- `config` (Object): Configuration options
  - `cacheSize` (number): Maximum cached chunks (default: 100)
  - `preloadRadius` (number): Radius for chunk preloading (default: 1)
  - `persistChunks` (boolean): Enable persistence (default: true)
  - `worldSeed` (string): Default world seed (default: 'default-seed')
  - `enableMetrics` (boolean): Enable metrics collection (default: true)

### Methods

#### `generateChunk(seed, cx, cy)`
Generate or retrieve a chunk at the specified coordinates.

**Parameters:**
- `seed` (string): World seed for generation
- `cx` (number): Chunk X coordinate
- `cy` (number): Chunk Y coordinate

**Returns:** Promise<Chunk> - The generated or cached chunk

**Example:**
```javascript
const chunk = await chunkSystem.generateChunk('my-seed', 10, 10);
```

#### `preloadAdjacentChunks(seed, cx, cy)`
Preload chunks around a center point for smooth transitions.

**Parameters:**
- `seed` (string): World seed
- `cx` (number): Center chunk X
- `cy` (number): Center chunk Y

**Example:**
```javascript
// Preload 8 adjacent chunks
await chunkSystem.preloadAdjacentChunks('my-seed', 5, 5);
```

#### `getChunkTransition(x, y, dx, dy)`
Calculate if movement causes a chunk transition.

**Parameters:**
- `x` (number): Current X position in chunk
- `y` (number): Current Y position in chunk
- `dx` (number): Movement delta X
- `dy` (number): Movement delta Y

**Returns:** Object with:
- `shouldTransition` (boolean): Whether transition occurs
- `toCx` (number): Destination chunk X offset
- `toCy` (number): Destination chunk Y offset
- `newX` (number): New X position in destination chunk
- `newY` (number): New Y position in destination chunk

#### `registerTemplate(name, template)`
Register a special chunk generation template.

**Parameters:**
- `name` (string): Template identifier
- `template` (Object): Template definition
  - `matches(cx, cy)`: Function to check if template applies
  - `generate(seed, cx, cy)`: Async function to generate chunk

**Example:**
```javascript
chunkSystem.registerTemplate('boss-arena', {
  matches: (cx, cy) => cx === 100 && cy === 100,
  generate: async (seed, cx, cy) => ({
    cx, cy,
    map: generateBossArenaMap(),
    biome: 'arena',
    monsters: [createBoss()],
    special: 'boss-arena'
  })
});
```

## Metrics

### Enable Metrics
```javascript
const chunkSystem = new ChunkSystem(eventBus, {
  enableMetrics: true
});
```

### Get Metrics Report
```javascript
const report = chunkSystem.getMetricsReport();

console.log(report.generation); // Generation statistics
console.log(report.cache);      // Cache hit/miss rates
console.log(report.persistence); // Save/load statistics
console.log(report.recommendations); // Optimization suggestions
```

### Get Optimization Recommendations
```javascript
const recommendations = chunkSystem.getOptimizationRecommendations();

if (recommendations.includes('increaseCacheSize')) {
  console.log('Consider increasing cache size for better performance');
}
```

### Reset Metrics
```javascript
chunkSystem.resetMetrics();
```

## Persistence

### Enable Persistence
```javascript
const chunkSystem = new ChunkSystem(eventBus, {
  persistChunks: true
});
```

### Custom Persistence Implementation
```javascript
// Override loadChunk and saveChunk methods
chunkSystem.loadChunk = async (seed, cx, cy) => {
  // Load from database/filesystem
  return await myDatabase.loadChunk(seed, cx, cy);
};

chunkSystem.saveChunk = async (seed, chunk) => {
  // Save to database/filesystem
  await myDatabase.saveChunk(seed, chunk);
};
```

## Templates

### Basic Template
```javascript
const dungeonTemplate = {
  priority: 10,
  matches: (cx, cy) => {
    // Every 10th chunk is a dungeon
    return cx % 10 === 0 && cy % 10 === 0;
  },
  generate: async (seed, cx, cy) => {
    return {
      cx, cy,
      map: generateDungeonMap(),
      biome: 'dungeon',
      monsters: generateDungeonMonsters(),
      special: 'dungeon'
    };
  }
};

chunkSystem.registerTemplate('dungeon', dungeonTemplate);
```

### Quest-Specific Template
```javascript
chunkSystem.registerTemplate('quest-target', {
  matches: (cx, cy) => {
    return cx === questTargetX && cy === questTargetY;
  },
  generate: async (seed, cx, cy) => {
    const baseChunk = await generateNormalChunk(seed, cx, cy);
    
    // Add quest-specific modifications
    baseChunk.npcs.push(createQuestNPC());
    baseChunk.items.push(createQuestItem());
    
    return baseChunk;
  }
});
```

## Events

The ChunkSystem emits and listens to various events:

### Emitted Events

#### `ChunkGenerating`
Fired when chunk generation starts.
```javascript
eventBus.on('ChunkGenerating', ({ cx, cy }) => {
  console.log(`Generating chunk at (${cx}, ${cy})`);
});
```

#### `ChunkGenerated`
Fired when chunk generation completes.
```javascript
eventBus.on('ChunkGenerated', ({ chunk }) => {
  console.log(`Generated ${chunk.biome} chunk at (${chunk.cx}, ${chunk.cy})`);
});
```

#### `ChunkLoaded`
Fired when a chunk is loaded and ready.
```javascript
eventBus.on('ChunkLoaded', ({ chunk }) => {
  renderChunk(chunk);
});
```

#### `ChunkGenerationError`
Fired when generation fails.
```javascript
eventBus.on('ChunkGenerationError', ({ cx, cy, error }) => {
  console.error(`Failed to generate chunk at (${cx}, ${cy}):`, error);
});
```

### Listened Events

#### `PlayerChangedChunk`
Handles player chunk transitions.
```javascript
eventBus.emit('PlayerChangedChunk', {
  from: { cx: 0, cy: 0 },
  to: { cx: 1, cy: 0 },
  worldSeed: 'my-seed'
});
```

#### `QuestAccepted`
Modifies chunks for quest objectives.
```javascript
eventBus.emit('QuestAccepted', {
  quest: {
    id: 'dragon-slayer',
    targetChunk: { cx: 50, cy: 50 },
    modifications: {
      addMonster: { type: 'dragon', x: 12, y: 11, hp: 1000 }
    }
  }
});
```

## Examples

### Complete Integration Example
```javascript
import { ChunkSystem } from './src/js/world/ChunkSystem.js';
import { EventBus } from './src/js/events/EventBus.js';

// Initialize system
const eventBus = new EventBus();
const chunkSystem = new ChunkSystem(eventBus, {
  cacheSize: 200,
  preloadRadius: 2,
  enableMetrics: true
});

// Register special locations
chunkSystem.registerTemplate('spawn', {
  matches: (cx, cy) => cx === 0 && cy === 0,
  generate: async (seed, cx, cy) => ({
    cx, cy,
    map: generateSpawnArea(),
    biome: 'spawn',
    npcs: [createGuideNPC()],
    special: 'spawn-point'
  })
});

// Handle player movement
class Player {
  constructor(x, y, chunkX, chunkY) {
    this.x = x;
    this.y = y;
    this.chunkX = chunkX;
    this.chunkY = chunkY;
  }
  
  async move(dx, dy) {
    const transition = chunkSystem.getChunkTransition(
      this.x, this.y, dx, dy
    );
    
    if (transition.shouldTransition) {
      // Update chunk position
      this.chunkX += transition.toCx;
      this.chunkY += transition.toCy;
      this.x = transition.newX;
      this.y = transition.newY;
      
      // Load new chunk
      const newChunk = await chunkSystem.generateChunk(
        'game-seed', this.chunkX, this.chunkY
      );
      
      // Preload adjacent chunks
      await chunkSystem.preloadAdjacentChunks(
        'game-seed', this.chunkX, this.chunkY
      );
      
      // Emit event for other systems
      eventBus.emit('PlayerChangedChunk', {
        from: { cx: this.chunkX - transition.toCx, cy: this.chunkY - transition.toCy },
        to: { cx: this.chunkX, cy: this.chunkY }
      });
    } else {
      // Normal movement within chunk
      this.x += dx;
      this.y += dy;
    }
  }
}

// Monitor performance
setInterval(() => {
  const report = chunkSystem.getMetricsReport();
  
  if (report.cache.hitRate < 0.5) {
    console.warn('Low cache hit rate:', report.cache.hitRate);
  }
  
  if (report.generation.averageTime > 500) {
    console.warn('Slow generation:', report.generation.averageTime, 'ms');
  }
  
  const recommendations = chunkSystem.getOptimizationRecommendations();
  if (recommendations.length > 0) {
    console.log('Optimization recommendations:', recommendations);
  }
}, 30000); // Every 30 seconds

// Cleanup on exit
process.on('exit', async () => {
  await chunkSystem.destroy();
});
```

### Quest Integration Example
```javascript
// Quest system integration
class QuestManager {
  constructor(chunkSystem, eventBus) {
    this.chunkSystem = chunkSystem;
    this.eventBus = eventBus;
  }
  
  async acceptQuest(quest) {
    // Register quest-specific chunk template
    this.chunkSystem.registerTemplate(`quest-${quest.id}`, {
      matches: (cx, cy) => {
        return cx === quest.targetX && cy === quest.targetY;
      },
      generate: async (seed, cx, cy) => {
        // Generate base chunk
        const chunk = await defaultGenerator(seed, cx, cy);
        
        // Add quest objectives
        if (quest.type === 'boss') {
          chunk.monsters.push(createQuestBoss(quest));
        } else if (quest.type === 'rescue') {
          chunk.npcs.push(createRescueTarget(quest));
        } else if (quest.type === 'collect') {
          chunk.items.push(createQuestItem(quest));
        }
        
        chunk.metadata.questId = quest.id;
        return chunk;
      }
    });
    
    // Emit event for chunk system
    this.eventBus.emit('QuestAccepted', { quest });
  }
}
```

### Performance Monitoring Example
```javascript
// Create performance monitor
class ChunkPerformanceMonitor {
  constructor(chunkSystem) {
    this.chunkSystem = chunkSystem;
    this.thresholds = {
      generationTime: 200,    // ms
      cacheHitRate: 0.7,     // 70%
      errorRate: 0.01        // 1%
    };
  }
  
  analyze() {
    const report = this.chunkSystem.getMetricsReport();
    const alerts = [];
    
    // Check generation performance
    if (report.generation.averageTime > this.thresholds.generationTime) {
      alerts.push({
        type: 'SLOW_GENERATION',
        message: `Average generation time ${report.generation.averageTime}ms exceeds threshold`,
        severity: 'warning'
      });
    }
    
    // Check cache efficiency
    if (report.cache.hitRate < this.thresholds.cacheHitRate) {
      alerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        message: `Cache hit rate ${report.cache.hitRate} below threshold`,
        severity: 'warning',
        recommendation: 'Consider increasing cache size'
      });
    }
    
    // Check error rate
    const errorRate = report.errors.total / report.generation.count;
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        message: `Error rate ${errorRate} exceeds threshold`,
        severity: 'error'
      });
    }
    
    return {
      healthy: alerts.length === 0,
      alerts,
      report
    };
  }
  
  startMonitoring(intervalMs = 60000) {
    return setInterval(() => {
      const analysis = this.analyze();
      
      if (!analysis.healthy) {
        console.warn('Performance issues detected:');
        analysis.alerts.forEach(alert => {
          console.warn(`[${alert.severity}] ${alert.type}: ${alert.message}`);
          if (alert.recommendation) {
            console.warn(`  Recommendation: ${alert.recommendation}`);
          }
        });
      }
    }, intervalMs);
  }
}

// Usage
const monitor = new ChunkPerformanceMonitor(chunkSystem);
const monitoringHandle = monitor.startMonitoring(30000); // Check every 30s

// Stop monitoring when needed
// clearInterval(monitoringHandle);
```

## Best Practices

1. **Cache Size**: Set cache size based on expected player movement patterns
   ```javascript
   // For open world exploration
   { cacheSize: 200 }
   
   // For linear dungeons
   { cacheSize: 50 }
   ```

2. **Preload Radius**: Balance between smooth transitions and memory usage
   ```javascript
   // Fast-paced games
   { preloadRadius: 2 }
   
   // Turn-based games
   { preloadRadius: 1 }
   ```

3. **Template Priority**: Use priority to control template precedence
   ```javascript
   // Higher priority templates are checked first
   { priority: 100, matches: () => isMainQuest }
   { priority: 10, matches: () => isSideQuest }
   { priority: 1, matches: () => isRandomEvent }
   ```

4. **Error Handling**: Always handle generation failures
   ```javascript
   try {
     const chunk = await chunkSystem.generateChunk(seed, cx, cy);
   } catch (error) {
     // Fallback to safe chunk
     const chunk = createSafeDefaultChunk(cx, cy);
   }
   ```

5. **Metrics Usage**: Monitor and respond to performance issues
   ```javascript
   const recommendations = chunkSystem.getOptimizationRecommendations();
   
   if (recommendations.includes('increaseCacheSize')) {
     // Dynamically adjust cache size
     chunkSystem.cache.setMaxSize(chunkSystem.cache.maxSize * 1.5);
   }
   ```

## Phase 4 Ready

The ChunkSystem is now ready for Phase 4 (Persistence & Streaming) with:
- ✅ Metrics collection and analysis
- ✅ Persistence interface defined
- ✅ Event-driven architecture
- ✅ Template system for special chunks
- ✅ Comprehensive error handling
- ✅ Performance monitoring
- ✅ Batch operation support

Next steps for Phase 4:
1. Implement filesystem persistence
2. Add database persistence option
3. Implement chunk streaming for large worlds
4. Add chunk compression
5. Implement save file versioning