# Proximity Trigger System

## Overview

The Proximity Trigger System is a scalable solution for handling location-based quest objectives without flooding the event system with movement events. Instead of emitting events for every player movement, this system registers specific locations of interest and only checks relevant triggers when the player is in the same chunk.

## Problem Statement

### Current Challenge
- Player movement happens frequently (hundreds of times per minute)
- Emitting events for each movement would create thousands of events
- Having all objectives check every movement event would be O(n*m) complexity
- Example: "Go to tile (4, 17) in chunk (-10, 5)" shouldn't require checking on every step

### Why Not Use Events for Movement
```javascript
// BAD: This creates performance issues
PlayerMovement.move() {
  player.x = newX;
  player.y = newY;
  QuestManager.emitEvent('PLAYER_MOVED', { x: newX, y: newY, chunk: ... });
  // Problem: 500 objectives all check if player is at their location!
}
```

## Proposed Solution

### Core Architecture

```javascript
// ProximityTriggerSystem.js
class ProximityTriggerSystem {
  constructor() {
    // Map of "cx,cy,x,y" -> trigger data
    this.activeTriggers = new Map();
    
    // Index by chunk for O(1) chunk filtering
    this.chunkTriggers = new Map(); // "cx,cy" -> Set of trigger keys
    
    // Optional: Track one-time vs repeatable triggers
    this.oneTimeTriggers = new Set();
  }

  /**
   * Register a location that should trigger an objective
   * @param {string} questId - Quest identifier
   * @param {string} objectiveId - Objective identifier
   * @param {Object} location - Target location
   * @param {number} location.x - X coordinate
   * @param {number} location.y - Y coordinate
   * @param {number} location.cx - Chunk X
   * @param {number} location.cy - Chunk Y
   * @param {number} radius - Trigger radius (0 = exact tile, 1 = adjacent tiles ok)
   * @param {boolean} oneTime - Remove trigger after activation
   */
  registerLocationObjective(questId, objectiveId, location, radius = 0, oneTime = true) {
    const key = `${location.cx},${location.cy},${location.x},${location.y}`;
    const chunkKey = `${location.cx},${location.cy}`;
    
    // Store trigger data
    this.activeTriggers.set(key, {
      questId,
      objectiveId,
      x: location.x,
      y: location.y,
      radius,
      chunk: { cx: location.cx, cy: location.cy }
    });
    
    // Index by chunk for efficient filtering
    if (!this.chunkTriggers.has(chunkKey)) {
      this.chunkTriggers.set(chunkKey, new Set());
    }
    this.chunkTriggers.get(chunkKey).add(key);
    
    // Track if one-time
    if (oneTime) {
      this.oneTimeTriggers.add(key);
    }
  }

  /**
   * Check if player has reached any trigger points
   * Called by PlayerMovement system, NOT through events
   */
  checkProximity(player, currentChunk) {
    const chunkKey = `${currentChunk.cx},${currentChunk.cy}`;
    const triggers = this.chunkTriggers.get(chunkKey);
    
    // Early exit if no triggers in this chunk - O(1) check!
    if (!triggers || triggers.size === 0) return;
    
    const triggersToRemove = [];
    
    // Only check triggers in current chunk
    triggers.forEach(triggerKey => {
      const trigger = this.activeTriggers.get(triggerKey);
      if (!trigger) return;
      
      // Calculate distance (Manhattan or Euclidean)
      const dx = Math.abs(player.x - trigger.x);
      const dy = Math.abs(player.y - trigger.y);
      const distance = Math.max(dx, dy); // Chebyshev distance
      
      if (distance <= trigger.radius) {
        // Player reached the trigger point!
        QuestManager.emitEvent('LOCATION_REACHED', {
          questId: trigger.questId,
          objectiveId: trigger.objectiveId,
          location: {
            x: trigger.x,
            y: trigger.y,
            chunk: trigger.chunk
          }
        });
        
        // Remove if one-time trigger
        if (this.oneTimeTriggers.has(triggerKey)) {
          triggersToRemove.push(triggerKey);
        }
      }
    });
    
    // Clean up one-time triggers
    triggersToRemove.forEach(key => this.unregisterTrigger(key));
  }

  /**
   * Remove a trigger
   */
  unregisterTrigger(triggerKey) {
    const trigger = this.activeTriggers.get(triggerKey);
    if (!trigger) return;
    
    const chunkKey = `${trigger.chunk.cx},${trigger.chunk.cy}`;
    
    // Remove from main map
    this.activeTriggers.delete(triggerKey);
    
    // Remove from chunk index
    const chunkTriggers = this.chunkTriggers.get(chunkKey);
    if (chunkTriggers) {
      chunkTriggers.delete(triggerKey);
      if (chunkTriggers.size === 0) {
        this.chunkTriggers.delete(chunkKey);
      }
    }
    
    // Remove from one-time set
    this.oneTimeTriggers.delete(triggerKey);
  }

  /**
   * Clean up all triggers for a quest
   */
  unregisterQuest(questId) {
    const keysToRemove = [];
    
    this.activeTriggers.forEach((trigger, key) => {
      if (trigger.questId === questId) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.unregisterTrigger(key));
  }

  /**
   * Check if any triggers exist at a specific location
   */
  hasTriggerAt(x, y, chunk) {
    const key = `${chunk.cx},${chunk.cy},${x},${y}`;
    return this.activeTriggers.has(key);
  }

  /**
   * Get all triggers in a chunk (for debugging/visualization)
   */
  getTriggersInChunk(cx, cy) {
    const chunkKey = `${cx},${cy}`;
    const triggerKeys = this.chunkTriggers.get(chunkKey);
    if (!triggerKeys) return [];
    
    return Array.from(triggerKeys).map(key => this.activeTriggers.get(key)).filter(Boolean);
  }
}

export default ProximityTriggerSystem;
```

## Integration Points

### 1. QuestManager Integration

```javascript
// In QuestManager.js
import ProximityTriggerSystem from './ProximityTriggerSystem.js';

class QuestManagerImpl {
  initialize(state) {
    // ... existing initialization ...
    
    this.proximityTriggers = new ProximityTriggerSystem();
    
    // Listen for location-reached events
    this.questEvents.on('LOCATION_REACHED', (data) => {
      // This only fires when player actually reaches a registered location
      console.log(`[QUEST_MANAGER] Player reached location for ${data.questId}.${data.objectiveId}`);
    });
  }
}
```

### 2. PlayerMovement Integration

```javascript
// In PlayerMovement.js
export function handlePlayerMove(state, dx, dy) {
  const oldX = state.player.x;
  const oldY = state.player.y;
  
  // ... existing movement logic ...
  
  // After movement is complete and valid
  if (state.player.x !== oldX || state.player.y !== oldY) {
    // Check proximity triggers - lightweight operation
    QuestManager.proximityTriggers?.checkProximity(state.player, state.chunk);
  }
}

// Also check when changing chunks
export function changeChunk(state, newCx, newCy) {
  // ... existing chunk change logic ...
  
  // Check triggers in new chunk
  QuestManager.proximityTriggers?.checkProximity(state.player, state.chunk);
}
```

### 3. Quest Definition Integration

```javascript
// Example quest definition with location objective
export const deliveryQuestDef = {
  id: 'deliver_package',
  
  create: () => ({
    // ... quest properties ...
    
    objectives: [
      {
        id: 'reach_destination',
        type: 'LOCATION',  // New type for proximity triggers
        description: 'Deliver package to the Ice King\'s castle',
        location: {
          x: 4,
          y: 17,
          cx: -10,
          cy: 5
        },
        radius: 1,  // Allow adjacent tiles
        progress: 0,
        completed: false
      }
    ]
  }),
  
  onStart: (state, quest) => {
    // Register proximity trigger when quest starts
    quest.objectives.forEach(obj => {
      if (obj.type === 'LOCATION') {
        QuestManager.proximityTriggers.registerLocationObjective(
          quest.id,
          obj.id,
          obj.location,
          obj.radius || 0
        );
      }
    });
  },
  
  onComplete: (state, quest) => {
    // Clean up triggers
    QuestManager.proximityTriggers.unregisterQuest(quest.id);
  }
};
```

## Advanced Features

### Zone-Based Triggers

```javascript
class ZoneTrigger {
  constructor(bounds) {
    this.minX = bounds.minX;
    this.maxX = bounds.maxX;
    this.minY = bounds.minY;
    this.maxY = bounds.maxY;
    this.chunk = bounds.chunk;
    this.playersInside = new Set();
  }
  
  checkPlayer(playerId, x, y) {
    const wasInside = this.playersInside.has(playerId);
    const isInside = x >= this.minX && x <= this.maxX &&
                     y >= this.minY && y <= this.maxY;
    
    if (!wasInside && isInside) {
      this.playersInside.add(playerId);
      return 'entered';
    } else if (wasInside && !isInside) {
      this.playersInside.delete(playerId);
      return 'exited';
    }
    
    return null; // No change
  }
}
```

### Path Tracking

```javascript
// Track if player follows a specific path
class PathObjective {
  constructor(waypoints) {
    this.waypoints = waypoints; // Array of {x, y, cx, cy}
    this.currentIndex = 0;
    this.completed = false;
  }
  
  checkProgress(player, chunk) {
    const target = this.waypoints[this.currentIndex];
    
    if (player.x === target.x && player.y === target.y &&
        chunk.cx === target.cx && chunk.cy === target.cy) {
      this.currentIndex++;
      
      if (this.currentIndex >= this.waypoints.length) {
        this.completed = true;
        return 'PATH_COMPLETED';
      }
      
      return 'WAYPOINT_REACHED';
    }
    
    return null;
  }
}
```

## Performance Characteristics

### Time Complexity
- **Registration**: O(1) to register a trigger
- **Chunk change**: O(1) to check if chunk has triggers
- **Movement check**: O(k) where k = triggers in current chunk (typically 0-5)
- **Unregister**: O(1) to remove a trigger

### Space Complexity
- **Memory**: O(n) where n = total active triggers
- **Typical usage**: ~100-500 triggers active at once = minimal memory

### Comparison with Event-Based Approach

| Metric | Event Every Move | Proximity Triggers |
|--------|-----------------|-------------------|
| Events per minute | 1000+ | ~5-10 |
| Checks per movement | O(n) all objectives | O(k) chunk triggers |
| Memory usage | Low | Low + trigger maps |
| Code complexity | Simple | Moderate |
| Scalability | Poor | Excellent |

## Implementation Checklist

- [ ] Create `ProximityTriggerSystem.js` class
- [ ] Add to QuestManager initialization
- [ ] Integrate with PlayerMovement.handlePlayerMove()
- [ ] Integrate with chunk change logic
- [ ] Update QuestService to handle LOCATION type objectives
- [ ] Create helper method for quest definitions
- [ ] Add debug visualization (show triggers on map)
- [ ] Write tests for proximity detection
- [ ] Document in quest creation guide
- [ ] Add examples of location-based quests

## Example Use Cases

1. **Delivery Quests**: "Take this item to location X"
2. **Exploration**: "Discover the hidden temple at coordinates Y"
3. **Patrol Routes**: "Visit all guard posts in order"
4. **Area Defense**: "Don't let enemies reach the town center"
5. **Racing**: "Reach the finish line within time limit"
6. **Territory Control**: "Capture and hold three strategic points"

## Notes

- This system is **optional** - simple quests still use events
- Can coexist with current event-based objectives
- Consider adding visual indicators for trigger locations
- May want to persist triggers in save games
- Could extend to support 3D games with height/layer checks