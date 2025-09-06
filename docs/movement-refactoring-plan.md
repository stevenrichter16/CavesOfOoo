# Movement System Refactoring Plan

## Overview
The current movement system has several architectural issues:
- Mixed responsibilities (movement, inventory, quests, etc.)
- Global state dependencies
- Inefficient algorithms (A* with array sorting)
- Tightly coupled components

## Phase 1: Pipeline Separation (movePipeline.js)

### Current Issues
- Single monolithic function handling all movement logic
- Hard to test individual steps
- No clear cancellation mechanism

### Proposed Solution
```javascript
class MovementPipeline {
  constructor(eventBus) {
    this.steps = [
      this.preMove.bind(this),
      this.checkCollisions.bind(this),
      this.handleInteraction.bind(this),
      this.applyMovement.bind(this),
      this.postMove.bind(this)
    ];
  }

  async execute(state, action) {
    const context = { state, action, cancelled: false };
    
    for (const step of this.steps) {
      await step(context);
      if (context.cancelled) return false;
    }
    
    return true;
  }

  async preMove(context) {
    // Emit WillMove event
    // Check for freeze, stun, etc.
  }

  async checkCollisions(context) {
    // Check terrain passability
    // Check entity collisions
  }

  async handleInteraction(context) {
    // NPC interactions
    // Item pickups
    // Door interactions
  }

  async applyMovement(context) {
    // Update player position
    // Handle edge transitions
  }

  async postMove(context) {
    // Emit DidMove event
    // Trigger terrain effects
  }
}
```

## Phase 2: System Extraction

### TerrainSystem
Handles all terrain-related logic:
```javascript
class TerrainSystem {
  constructor() {
    this.terrainTypes = new Map();
    this.registerDefaultTerrains();
  }

  registerTerrain(tile, config) {
    this.terrainTypes.set(tile, {
      passable: config.passable ?? true,
      moveCost: config.moveCost ?? 1,
      onEnter: config.onEnter ?? null,
      onExit: config.onExit ?? null,
      effect: config.effect ?? null
    });
  }

  getMoveCost(tile) {
    return this.terrainTypes.get(tile)?.moveCost ?? 1;
  }

  isPassable(tile) {
    return this.terrainTypes.get(tile)?.passable ?? false;
  }

  async onEnterTile(state, x, y) {
    const tile = state.chunk?.map?.[y]?.[x];
    const terrain = this.terrainTypes.get(tile);
    if (terrain?.onEnter) {
      await terrain.onEnter(state, x, y);
    }
  }
}
```

### LootSystem
Manages item pickups and inventory:
```javascript
class LootSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  async checkForItems(state, x, y) {
    const items = state.chunk?.items?.filter(
      item => item.x === x && item.y === y
    );
    
    if (items?.length > 0) {
      for (const item of items) {
        await this.pickupItem(state, item);
      }
    }
  }

  async pickupItem(state, item) {
    this.eventBus.emit('ItemPickup', { item });
    
    // Add to inventory with proper stacking
    if (item.stackable) {
      this.stackItem(state.player.inventory, item);
    } else {
      state.player.inventory.push(item);
    }
    
    // Remove from world
    const index = state.chunk.items.indexOf(item);
    if (index > -1) {
      state.chunk.items.splice(index, 1);
    }
  }

  stackItem(inventory, newItem) {
    const existing = inventory.find(
      i => i.id === newItem.id && i.stackable
    );
    
    if (existing) {
      existing.count = (existing.count || 1) + (newItem.count || 1);
    } else {
      inventory.push(newItem);
    }
  }
}
```

## Phase 3: Separate Concerns (playerMovement.js)

### QuestSpawner
Extract quest logic to dedicated system:
```javascript
class QuestSpawner {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.eventBus.on('ChunkLoaded', this.onChunkLoaded.bind(this));
  }

  onChunkLoaded({ state, chunk, x, y }) {
    // Check if quest should spawn
    if (this.shouldSpawnQuest(state, x, y)) {
      this.spawnQuest(state, chunk);
    }
  }

  shouldSpawnQuest(state, cx, cy) {
    // Quest spawn logic
    return Math.random() < 0.1; // Example
  }

  spawnQuest(state, chunk) {
    // Quest generation logic
  }
}
```

### InventorySystem
Centralize inventory management:
```javascript
class InventorySystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  addItem(inventory, item) {
    if (item.stackable) {
      return this.stackItem(inventory, item);
    }
    
    inventory.push(item);
    this.eventBus.emit('ItemAdded', { item });
    return true;
  }

  removeItem(inventory, item, count = 1) {
    const index = inventory.indexOf(item);
    if (index === -1) return false;
    
    if (item.count && item.count > count) {
      item.count -= count;
    } else {
      inventory.splice(index, 1);
    }
    
    this.eventBus.emit('ItemRemoved', { item, count });
    return true;
  }

  useItem(state, item) {
    // Item usage logic
    this.eventBus.emit('ItemUsed', { item });
  }
}
```

## Phase 4: Pathfinding Improvements

### PriorityQueue Implementation
```javascript
class PriorityQueue {
  constructor(compareFn = (a, b) => a.priority - b.priority) {
    this.heap = [];
    this.compare = compareFn;
  }

  push(item) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return top;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
        [this.heap[index], this.heap[parentIndex]] = 
        [this.heap[parentIndex], this.heap[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  bubbleDown(index) {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      
      if (left < this.heap.length && 
          this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      
      if (right < this.heap.length && 
          this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      
      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = 
        [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}
```

### PathFinder Class
```javascript
class PathFinder {
  constructor(options = {}) {
    this.isPassable = options.isPassable || (() => true);
    this.getCost = options.getCost || (() => 1);
    this.heuristic = options.heuristic || this.manhattan;
  }

  manhattan(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  findPath(startX, startY, endX, endY, maxSteps = 1000) {
    const openSet = new PriorityQueue((a, b) => a.f - b.f);
    const closedSet = new Set();
    const startNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    
    openSet.push(startNode);
    let steps = 0;
    
    while (!openSet.isEmpty() && steps < maxSteps) {
      steps++;
      const current = openSet.pop();
      
      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }
      
      const key = `${current.x},${current.y}`;
      if (closedSet.has(key)) continue;
      closedSet.add(key);
      
      for (const neighbor of this.getNeighbors(current.x, current.y)) {
        if (!this.isPassable(neighbor.x, neighbor.y)) continue;
        if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
        
        const g = current.g + this.getCost(neighbor.x, neighbor.y);
        const h = this.heuristic(neighbor.x, neighbor.y, endX, endY);
        const f = g + h;
        
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g, h, f,
          parent: current
        });
      }
    }
    
    return null; // No path found
  }

  getNeighbors(x, y) {
    return [
      { x: x, y: y - 1 },
      { x: x + 1, y: y },
      { x: x, y: y + 1 },
      { x: x - 1, y: y }
    ];
  }

  reconstructPath(node) {
    const path = [];
    let current = node;
    
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    
    return path;
  }
}
```

## Phase 5: Cursor System Refactoring

### Cursor Class
```javascript
class CursorSystem {
  constructor(eventBus, renderer) {
    this.eventBus = eventBus;
    this.renderer = renderer;
    
    this.state = {
      active: false,
      x: 0,
      y: 0,
      mode: 'examine',
      range: null,
      validTiles: null
    };
    
    this.modes = {
      examine: { color: '#FFD700', cursor: '+' },
      target: { color: '#FF0000', cursor: 'X' },
      select: { color: '#00FF00', cursor: 'O' }
    };
  }

  activate(mode = 'examine', options = {}) {
    this.state.active = true;
    this.state.mode = mode;
    this.state.range = options.range || null;
    this.state.validTiles = options.validTiles || null;
    
    this.eventBus.emit('CursorActivated', { mode, options });
    return this;
  }

  deactivate() {
    this.state.active = false;
    this.eventBus.emit('CursorDeactivated');
    return this;
  }

  move(dx, dy) {
    if (!this.state.active) return false;
    
    const newX = Math.max(0, Math.min(W - 1, this.state.x + dx));
    const newY = Math.max(0, Math.min(H - 1, this.state.y + dy));
    
    if (this.isValidPosition(newX, newY)) {
      this.state.x = newX;
      this.state.y = newY;
      this.eventBus.emit('CursorMoved', { x: newX, y: newY });
      return true;
    }
    
    return false;
  }

  select() {
    if (!this.state.active) return false;
    
    this.eventBus.emit('CursorSelect', {
      x: this.state.x,
      y: this.state.y,
      mode: this.state.mode
    });
    
    return { x: this.state.x, y: this.state.y };
  }

  isValidPosition(x, y) {
    // Check bounds
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    
    // Check range if specified
    if (this.state.range !== null) {
      const dist = this.getDistance(x, y);
      if (dist > this.state.range) return false;
    }
    
    // Check valid tiles if specified
    if (this.state.validTiles) {
      return this.state.validTiles.some(
        tile => tile.x === x && tile.y === y
      );
    }
    
    return true;
  }

  getDistance(x, y) {
    // Implement distance calculation from player or origin
    return Math.abs(x - this.originX) + Math.abs(y - this.originY);
  }

  render() {
    if (!this.state.active) return;
    
    const mode = this.modes[this.state.mode];
    this.renderer.drawCursor(
      this.state.x,
      this.state.y,
      mode.color,
      mode.cursor
    );
  }
}
```

## Implementation Order

### Week 1: Foundation
1. Create EventBus system for decoupled communication
2. Implement PriorityQueue data structure
3. Write comprehensive tests for both

### Week 2: Core Systems
1. Implement TerrainSystem
2. Implement LootSystem
3. Implement InventorySystem
4. Write tests for each system

### Week 3: Movement Pipeline
1. Refactor movePipeline.js to class-based system
2. Implement async pipeline steps
3. Add cancellation support
4. Write integration tests

### Week 4: Pathfinding
1. Implement new PathFinder class
2. Replace old A* implementation
3. Add pathfinding tests
4. Performance benchmarks

### Week 5: Cursor System
1. Convert cursor to class-based system
2. Remove global state dependencies
3. Add event emissions
4. Write cursor tests

### Week 6: Integration
1. Wire up all systems together
2. Update game loop to use new systems
3. Comprehensive integration testing
4. Performance optimization

## Testing Strategy

### Unit Tests
- Each system class should have 100% coverage
- Test edge cases and error conditions
- Mock dependencies

### Integration Tests
- Test system interactions
- Test event flow
- Test state management

### Performance Tests
- Benchmark pathfinding improvements
- Measure memory usage
- Profile hot paths

## Migration Strategy

1. **Parallel Implementation**: Build new systems alongside old ones
2. **Feature Flags**: Use flags to switch between old/new systems
3. **Gradual Rollout**: Migrate one system at a time
4. **Rollback Plan**: Keep old code until new systems are stable

## Success Metrics

- **Code Quality**
  - Reduced coupling (measure with dependency analysis)
  - Improved testability (>80% test coverage)
  - Better separation of concerns

- **Performance**
  - Pathfinding 50% faster on large maps
  - Reduced memory allocation
  - Smoother frame rate

- **Maintainability**
  - Easier to add new features
  - Simpler debugging
  - Clear documentation

## Risks and Mitigations

### Risk: Breaking existing functionality
**Mitigation**: Comprehensive test suite before refactoring

### Risk: Performance regression
**Mitigation**: Benchmark before and after each change

### Risk: Scope creep
**Mitigation**: Strict phase boundaries, defer nice-to-haves

## Future Enhancements

After the core refactoring:
- Add diagonal movement support
- Implement movement animations
- Add terrain modification system
- Support for flying/swimming movement modes
- Advanced pathfinding (Jump Point Search)
- Multi-level pathfinding