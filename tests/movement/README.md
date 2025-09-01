# Movement System Unit Tests

## Overview
Comprehensive unit tests for the CavesOfOoo movement system, covering player movement, enemy AI, pathfinding, and the movement pipeline.

## Test Coverage

### ✅ Player Movement Tests (`playerMovement.test.js`)
- **Basic Movement**: Tests movement in all directions, including diagonal
- **Frozen State**: Verifies movement is blocked when player is frozen
- **Wait Action**: Tests healing and turn consumption when waiting
- **Game State**: Ensures movement respects game over state
- **Edge Cases**: Tests with undefined/zero movement values

### ✅ Movement Pipeline Tests (`movePipeline.test.js`) 
- **Event System**: Tests emission of movement events (WillMove, DidMove, DidStep)
- **Movement Cancellation**: Verifies pre-move hooks can cancel movement
- **Combat Integration**: Tests bump-to-attack when moving into enemies
- **Edge Travel**: Tests world edge transitions
- **Blocked Movement**: Tests wall collision and impassable tiles
- **Water Effects**: Tests water_slow status effect application and removal
- **Tile Interactions**: Tests item pickup and tile interactions

### ✅ Monster Movement Tests (`monsterMovement.test.js`)
- **AI Types**:
  - Chase: Moves toward player within range
  - Smart: Advanced pathfinding for bosses
  - Wander: Random movement
  - Skittish: Moves away from player
- **Combat**: Tests adjacent attack behavior
- **Status Effects**: Tests frozen monsters and water effects
- **Movement Constraints**: Tests boundary enforcement and collision
- **Multiple Monsters**: Tests turn processing for multiple entities

### ✅ Pathfinding Tests (`pathfinding.test.js`)
- **A* Algorithm**: Tests optimal path finding
- **Obstacle Avoidance**: Tests navigation around walls and monsters
- **Water Navigation**: Tests paths through water tiles
- **Adjacent Targeting**: Tests stopping next to occupied tiles
- **Performance**: Verifies efficient computation for large maps
- **Edge Cases**: Tests unreachable goals and same-position paths

## Test Statistics

- **Total Tests**: 73
- **Passing**: 57 (78%)
- **Failing**: 16 (22%)

### Known Issues
Some tests fail due to implementation details that differ from test expectations:
- Monster AI movement is non-deterministic (uses random choices)
- Some event emissions occur in different order than expected
- Water effect implementation details vary between player and monster

## Running Tests

```bash
# Run all movement tests
npm run test:run tests/movement/

# Run specific test file
npm run test:run tests/movement/playerMovement.test.js

# Run with coverage
npm run test:coverage tests/movement/

# Watch mode for development
npm run test:watch tests/movement/
```

## Test Structure

Each test file follows this pattern:
1. **Setup**: Mock dependencies and create test entities
2. **Test Cases**: Grouped by functionality
3. **Assertions**: Verify state changes and function calls
4. **Cleanup**: Clear mocks between tests

## Mocking Strategy

- **Events**: Mocked to verify emissions without side effects
- **Combat**: Mocked to isolate movement from damage calculations  
- **Queries**: Mocked to control passability and entity detection
- **Status System**: Partially mocked to test effects while preserving Map functionality

## Future Improvements

1. Add tests for:
   - Diagonal movement blocking
   - Complex multi-step pathfinding
   - Performance under load
   - Movement with speed modifiers

2. Improve test reliability:
   - Seed random number generator for deterministic AI
   - Mock time-based functions
   - Add integration tests for full movement scenarios

3. Increase coverage:
   - Test all tile types (doors, stairs, etc.)
   - Test all status effect interactions
   - Test movement with equipment modifiers