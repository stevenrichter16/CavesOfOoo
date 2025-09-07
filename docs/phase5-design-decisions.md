# Phase 5 Design Decisions

## Critical Design Fix: Rumor ID Persistence

### The Problem
Initial implementation created new IDs when rumors spread:
```javascript
// BAD - Original implementation
createSpreadCopy() {
  return new Rumor({
    ...this,
    id: `${this.id}_spread_${this.spreadCount + 1}`, // NEW ID!
    accuracy: this.accuracy - 0.15,
    spreadCount: this.spreadCount + 1
  });
}
```

This caused several issues:
1. **Duplicate Storage**: Same rumor stored multiple times with different IDs
2. **Memory Bloat**: NPC memory filled with copies of same rumor
3. **Failed Deduplication**: NPCs couldn't recognize they already knew a rumor
4. **Broken Tracking**: Couldn't track how a single rumor spread through population

### The Solution
Keep the same ID for spread copies:
```javascript
// GOOD - Fixed implementation
createSpreadCopy() {
  return new Rumor({
    ...this,
    id: this.id, // SAME ID - it's the same rumor!
    accuracy: Math.max(0.1, this.accuracy - 0.15),
    spreadCount: this.spreadCount + 1,
    timestamp: this.timestamp // Preserve original time
  });
}
```

### Why This Is Correct

1. **Real-World Analogy**: When you tell someone a story, it doesn't become a different story - it's the same story with potentially less accuracy.

2. **Efficient Memory**: NPCs only store each unique rumor once, regardless of how many times they hear it.

3. **Proper Deduplication**: The Set-based ID tracking (`memory.rumorIds`) correctly prevents duplicates.

4. **Trackable Propagation**: Can follow a single rumor's path through the social network.

### What Changes With Each Retelling

While the ID stays the same, these properties change:
- **accuracy**: Decreases by 0.15 per retelling (min 0.1)
- **spreadCount**: Increments to track generations
- **position**: Could drift if implementation adds noise

### Implementation Impact

```javascript
// Example: Rumor spreading through 3 NPCs
Original: { id: 'rumor_123', accuracy: 1.0, spreadCount: 0 }
NPC1→NPC2: { id: 'rumor_123', accuracy: 0.85, spreadCount: 1 }
NPC2→NPC3: { id: 'rumor_123', accuracy: 0.70, spreadCount: 2 }

// NPC2 already has rumor_123, so this is blocked:
NPC3→NPC2: No sharing (duplicate check succeeds)
```

### Benefits

1. **Memory Efficiency**: O(unique rumors) instead of O(total shares)
2. **Accurate Simulation**: Matches real gossip behavior
3. **Performance**: Fast O(1) duplicate checking with Set
4. **Analytics**: Can track rumor reach and degradation

### Test Verification

All 34 tests pass with this change:
- ✅ Phase 5 rumor tests (21/21)
- ✅ Movement integration tests (13/13)
- ✅ No duplicate storage
- ✅ Proper accuracy degradation

## Other Key Design Decisions

### 1. Event-Driven Architecture
Used EventBus for loose coupling between Movement and Rumor systems rather than direct dependencies.

### 2. Cooldown System
5-second cooldown between rumor shares for same NPC pairs to prevent spam and infinite loops.

### 3. Distance-Based Sharing
5-unit range for sharing, 10-unit range for witnessing - balances realism with gameplay.

### 4. Faction-Based Filtering
Hostile NPCs don't share rumors - maintains faction loyalties and prevents information leaks.

### 5. Memory Limits
10 rumor maximum per NPC with priority system - prevents memory bloat while keeping important information.

---

*Design decisions documented 2025-09-06*
*Critical fix: Rumor ID persistence*