# Chunk System Refactor - TDD Implementation Plan

## Overview
This document outlines the Test-Driven Development (TDD) approach for refactoring the CavesOfOoo chunk system from a monolithic 1000+ line file into a modular, extensible architecture.

## TDD Principles to Follow
1. **Red-Green-Refactor**: Write failing tests first, implement minimal code to pass, then refactor
2. **One Test at a Time**: Focus on single behaviors
3. **Test Behavior, Not Implementation**: Tests should describe what, not how
4. **Maintain Visual Compatibility**: All refactored chunks must look identical to current implementation

## Implementation Phases

### Phase 1: Core Data Models (Days 1-3)

#### 1.1 Chunk Data Model
**Test First (tests/world/core/chunk.test.js):**
```javascript
// Test 1: Basic chunk creation
- Should create chunk with correct dimensions (24x22)
- Should initialize with all wall tiles ('#')
- Should store chunk coordinates (cx, cy)

// Test 2: Tile manipulation
- getTile() should return correct tile at position
- getTile() should return null for out-of-bounds
- setTile() should update tile at position
- setTile() should ignore out-of-bounds

// Test 3: Passability checks
- isPassable() should return true for '.', '·', '~'
- isPassable() should return false for walls '#'
- isPassable() should handle out-of-bounds safely

// Test 4: Entity management
- Should track monsters array
- Should track items array  
- Should track NPCs array
- hasEntityAt() should detect monsters
- hasEntityAt() should detect NPCs
- hasEntityAt() should ignore dead monsters

// Test 5: Empty tile finding
- findEmptyTiles() should return passable tiles
- findEmptyTiles() should exclude occupied tiles
- findEmptyTiles() should return coordinates
```

**Then Implement (src/js/world/core/Chunk.js):**
- Basic Chunk class with map array
- Tile getters/setters with bounds checking
- Entity tracking arrays
- Passability and empty tile utilities

#### 1.2 ChunkCache
**Test First (tests/world/core/chunk-cache.test.js):**
```javascript
// Test 1: Basic caching
- Should store chunks by coordinates
- Should retrieve cached chunks
- Should return null for uncached chunks

// Test 2: LRU eviction
- Should evict least recently used when full
- Should update access time on get
- Should not evict recently accessed chunks

// Test 3: Cache operations
- clear() should remove all chunks
- has() should check existence
- delete() should remove specific chunk
- size should track chunk count

// Test 4: Memory limits (100 chunks max)
- Should enforce maximum size
- Should handle cache overflow gracefully
```

**Then Implement (src/js/world/core/ChunkCache.js):**
- Map-based cache with coordinate keys
- LRU eviction strategy
- Size limits and memory management

#### 1.3 ChunkRegistry
**Test First (tests/world/core/chunk-registry.test.js):**
```javascript
// Test 1: Template registration
- Should register chunk templates
- Should retrieve templates by ID
- Should handle duplicate registration

// Test 2: Template matching
- findTemplate() should match coordinates
- findTemplate() should evaluate conditions
- findTemplate() should prioritize fixed coords
- Should return null when no match

// Test 3: Registry management
- Should list all registered templates
- Should unregister templates
- Should clear registry
```

**Then Implement (src/js/world/core/ChunkRegistry.js):**
- Template storage and retrieval
- Coordinate and condition matching
- Registry management methods

### Phase 2: Generation Pipeline (Days 4-6)

#### 2.1 Pipeline Infrastructure
**Test First (tests/world/pipeline/chunk-pipeline.test.js):**
```javascript
// Test 1: Pipeline setup
- Should initialize with default steps
- Should execute steps in order
- Should pass context between steps

// Test 2: Error handling
- Should catch step errors
- Should apply fallback generation on error
- Should emit error events
- Should continue after non-critical errors

// Test 3: Context management
- Should create context with seed, coords, chunk
- Should provide seeded random generator
- Should track pipeline state

// Test 4: Step cancellation
- Should stop on cancelled context
- Should return partial chunk if cancelled
```

**Then Implement (src/js/world/pipeline/ChunkPipeline.js):**
- Pipeline orchestration
- Context creation and management
- Error recovery mechanisms
- Step execution flow

#### 2.2 Pipeline Steps
**Test First (tests/world/pipeline/steps/):**
```javascript
// BiomeStep tests:
- Should select biome based on noise
- Should apply biome to chunk metadata
- Should handle biome boundaries

// StructureStep tests:
- Should generate rooms
- Should create corridors
- Should ensure connectivity

// FeatureStep tests:
- Should apply registered features
- Should respect feature probability
- Should track applied features

// PopulationStep tests:
- Should spawn monsters
- Should place items
- Should add NPCs

// ValidationStep tests:
- Should ensure walkable paths
- Should fix isolated areas
- Should validate spawn points
```

**Then Implement (src/js/world/pipeline/steps/):**
- Each step as separate class
- Base PipelineStep class
- Step-specific logic

### Phase 3: Templates & Features (Days 7-9)

#### 3.1 Template System
**Test First (tests/world/templates/chunk-template.test.js):**
```javascript
// Test 1: Template configuration
- Should accept layout string
- Should accept layout function
- Should store coordinates
- Should store conditions

// Test 2: Layout parsing
- parseASCIILayout() should convert to 2D array
- Should validate dimensions (24x22)
- Should preserve special characters

// Test 3: Template matching
- matches() should check coordinates
- matches() should evaluate conditions
- Should handle multiple coordinates

// Test 4: Generation
- generate() should create chunk from template
- Should apply features
- Should spawn entities
- Should set special flag
```

**Then Implement (src/js/world/templates/ChunkTemplate.js):**
- Base template class
- Layout parsing utilities
- Matching logic
- Generation process

#### 3.2 Specific Templates
**Test First (tests/world/templates/static/):**
```javascript
// CandyMarket tests:
- Should generate at (0,0)
- Should have vendor NPCs
- Should have market layout
- Should preserve exit at bottom

// Graveyard tests:
- Should generate at (-1,0)
- Should have tombstones
- Should spawn undead
- Should have spooky atmosphere

// DungeonEntrance tests:
- Should match condition
- Should have stairs feature
- Should spawn guards
- Should connect to dungeon
```

**Then Implement (src/js/world/templates/static/):**
- CandyMarket.js
- Graveyard.js
- DungeonEntrance.js

#### 3.3 Feature System
**Test First (tests/world/features/):**
```javascript
// Base feature tests:
- Should check probability
- Should apply to chunk
- Should track in chunk.features
- Should handle errors gracefully

// WaterFeature tests:
- Should generate ponds
- Should create rivers
- Should add water tiles '~'

// TreasureSpawner tests:
- Should place items
- Should respect rarity
- Should find valid positions

// MonsterSpawner tests:
- Should spawn monsters
- Should respect difficulty
- Should avoid occupied tiles

// NPCSpawner tests:
- Should create NPCs
- Should integrate with social system
- Should set positions
```

**Then Implement (src/js/world/features/):**
- ChunkFeature base class
- Specific feature implementations
- Integration with existing systems

### Phase 4: System Integration (Days 10-12)

#### 4.1 ChunkSystem Orchestrator
**Test First (tests/world/chunk-system.test.js):**
```javascript
// Test 1: Chunk generation
- generateChunk() should check cache first
- Should load from persistence
- Should use templates
- Should use pipeline

// Test 2: Event integration
- Should handle WillChangeChunk
- Should handle DidChangeChunk  
- Should handle QuestAccepted
- Should emit chunk events

// Test 3: Persistence
- saveChunk() should persist data
- Should maintain cache on save
- Should load existing chunks

// Test 4: Population
- Should populate special chunks
- Should spawn NPCs
- Should activate features
```

**Then Implement (src/js/world/ChunkSystem.js):**
- Main orchestrator class
- Event listener setup
- Cache/persistence/pipeline coordination
- Integration points

#### 4.2 Movement Integration
**Test First (tests/world/integration/movement-integration.test.js):**
```javascript
// Test chunk transitions:
- Should detect edge crossing
- Should load new chunk
- Should position player correctly
- Should emit transition events
- Should preload adjacent chunks
```

**Then Implement:**
- ChunkTransitionHandler
- Edge detection logic
- Player repositioning

#### 4.3 NPC Integration
**Test First (tests/world/integration/npc-integration.test.js):**
```javascript
// Test NPC spawning:
- Should spawn NPCs in chunks
- Should integrate with social system
- Should track per-chunk NPCs
- Should handle chunk unloading
```

**Then Implement:**
- NPCSpawner feature
- Social system integration
- Chunk NPC management

### Phase 5: Migration & Compatibility (Days 13-15)

#### 5.1 Migration Utilities
**Test First (tests/world/utils/chunk-migrator.test.js):**
```javascript
// Test migration:
- Should convert old chunk format
- Should preserve visual appearance
- Should add new metadata
- Should handle missing fields
```

**Then Implement (src/js/world/utils/ChunkMigrator.js):**
- Format conversion
- Backward compatibility
- Data preservation

#### 5.2 Visual Compatibility Tests
**Test First (tests/world/compatibility/):**
```javascript
// Compare against current implementation:
- CandyMarket should look identical
- Graveyard should look identical
- Random chunks should match patterns
- Biome distribution should match
```

### Phase 6: Performance & Polish (Days 16-18)

#### 6.1 Performance Tests
```javascript
// Benchmark tests:
- Chunk generation < 50ms
- Cache operations < 1ms
- Memory usage < 100MB
- No memory leaks
```

#### 6.2 Integration Tests
```javascript
// Full system tests:
- Complete game loop
- Save/load cycle
- Multi-chunk exploration
- Quest modifications
```

## Testing Strategy

### Unit Test Structure
```javascript
describe('ComponentName', () => {
  describe('Initialization', () => {
    it('should initialize with default values', () => {});
    it('should accept configuration', () => {});
  });
  
  describe('Core Functionality', () => {
    it('should perform primary function', () => {});
    it('should handle edge cases', () => {});
  });
  
  describe('Error Handling', () => {
    it('should handle invalid input', () => {});
    it('should recover from errors', () => {});
  });
});
```

### Integration Test Structure
```javascript
describe('System Integration', () => {
  beforeEach(() => {
    // Setup complete system
  });
  
  it('should work with movement system', () => {});
  it('should work with NPC system', () => {});
  it('should maintain save compatibility', () => {});
});
```

## Success Criteria

### Code Quality Metrics
- ✅ 80% test coverage minimum
- ✅ All tests passing
- ✅ No regression bugs
- ✅ worldGen.js reduced from 1000+ to <200 lines

### Performance Metrics
- ✅ Chunk generation < 50ms average
- ✅ Memory usage < 100MB for cache
- ✅ Smooth chunk transitions (60 FPS)

### Functionality Metrics
- ✅ Visual compatibility 100%
- ✅ All existing features working
- ✅ New template in < 30 minutes
- ✅ New feature in < 1 hour

## Daily Development Flow

### Day 1-3: Core Models
- Morning: Write Chunk tests
- Afternoon: Implement Chunk
- Next: ChunkCache tests and implementation
- Finally: ChunkRegistry tests and implementation

### Day 4-6: Pipeline
- Morning: Pipeline infrastructure tests
- Afternoon: Pipeline implementation
- Next: Individual step tests
- Finally: Step implementations

### Day 7-9: Templates & Features
- Morning: Template system tests
- Afternoon: Template implementation
- Next: Specific template tests
- Finally: Feature system

### Day 10-12: Integration
- Morning: ChunkSystem tests
- Afternoon: ChunkSystem implementation
- Next: Movement integration
- Finally: NPC integration

### Day 13-15: Migration
- Morning: Migration tests
- Afternoon: Migration implementation
- Next: Compatibility testing
- Finally: Visual verification

### Day 16-18: Polish
- Morning: Performance testing
- Afternoon: Optimization
- Next: Documentation
- Finally: Final testing

## Risk Mitigation

### Technical Risks
1. **Visual Incompatibility**: Mitigate with side-by-side comparison tests
2. **Performance Regression**: Mitigate with benchmarks from day 1
3. **Save Format Breaking**: Mitigate with migration utilities
4. **Integration Failures**: Mitigate with incremental integration

### Process Risks
1. **Scope Creep**: Stick to plan, defer enhancements
2. **Test Fatigue**: Alternate testing and implementation
3. **Complex Debugging**: Use focused, descriptive tests

## Next Steps

1. Create test directory structure
2. Set up test utilities and helpers
3. Begin with Chunk model tests
4. Follow TDD cycle strictly

## Notes

- Always run existing tests before changes
- Commit after each green test
- Refactor only with green tests
- Document deviations from plan
- Keep original worldGen.js until fully migrated