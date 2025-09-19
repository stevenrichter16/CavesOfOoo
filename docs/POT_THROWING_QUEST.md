# Pot Throwing Practice Quest

## Overview
A tutorial quest that teaches players how to use throwable items in combat. This quest requires throwing two different types of pots and rewards the player with 1500 gold.

## Quest Details

### Prerequisites
- Must complete `open_inventory_quest` first (teaches inventory basics)

### Quest Giver
- **NPC**: Steven (The Creator)
- **Location**: Candy Kingdom Town (chunk 0,0)

### Objectives
1. **Throw a Sugar Pot** - Throw one Sugar Pot anywhere
2. **Throw a Clay Pot** - Throw one Clay Pot anywhere

Both objectives must be completed to finish the quest. The order doesn't matter.

### Rewards
- **Gold**: 1500
- **Experience**: 25
- **Items**: None (but player receives free pots when starting quest)

## How It Works

### Starting the Quest
1. Complete the `open_inventory_quest` first
2. Talk to Steven and select "[QUEST] Can you teach me about throwing?"
3. Steven will:
   - Give you 2 Sugar Pots (if you don't have any)
   - Give you 2 Clay Pots (if you don't have any)
   - Explain how to throw (press 'T' then click target)

### Completing Objectives
1. Press 'T' to enter throw mode
2. Select a Sugar Pot from your inventory
3. Click anywhere to throw it
4. Repeat with a Clay Pot
5. Both objectives will be marked complete

### Turning In
1. Return to Steven after throwing both pots
2. Select "[QUEST] I've thrown both pots!"
3. Receive 1500 gold reward

## Technical Implementation

### Quest Definition File
`src/js/world/quests/definitions/potThrowingQuest.js`

### Key Components
- **Event Type**: `ITEM_THROWN`
- **Event Data**: Contains item.id to identify pot type
- **Objective Matching**: Uses `match` conditions to check specific pot IDs

### Event Flow
```
Player throws pot → executeThrow() in throwables.js
↓
Emits ITEM_THROWN event with item data
↓
QuestEventBus distributes to listeners
↓
GenericObjectiveHandler evaluates conditions
↓
If item.id matches 'sugar_pot' or 'clay_pot'
↓
Updates corresponding objective
↓
When both complete, quest state → 'COMPLETED'
```

### Dialogue Integration
Steven's dialogue includes:
- **Offer condition**: Shows after completing inventory quest, not active/completed
- **Turn-in condition**: Shows when quest can be turned in (state = 'COMPLETED')
- **Dialogue nodes**: `offer_throwing_quest` and `complete_throwing_quest`

## Testing
Run tests with:
```bash
npm test tests/quests/potThrowingQuest.test.js
```

Tests verify:
- Quest starts correctly
- Pots are given if player has none
- Each objective completes independently
- Wrong pot types don't count
- Rewards are applied correctly

## Console Logs
When throwing a pot, you'll see:
```
[THROWABLES] Emitting ITEM_THROWN event for sugar_pot
[QUEST_EVENT_BUS] Emit called for event: ITEM_THROWN
[OBJECTIVE_HANDLER] handleEvent called for event: ITEM_THROWN
[OBJECTIVE_HANDLER] Conditions matched! Updating objective: pot_throwing_practice.throw_sugar_pot
[QUEST_SERVICE] updateObjective called for quest: pot_throwing_practice, objective: throw_sugar_pot
```

## Future Enhancements
Could extend this quest to:
- Require hitting specific targets (enemies, training dummies)
- Track accuracy (hit vs miss)
- Teach about different pot effects (fire, ice, etc.)
- Add combo throws (throw 2 pots quickly)
- Give bonus rewards for perfect throws

## Code Changes Made

### 1. Created Quest Definition
- `potThrowingQuest.js` - Defines quest with two objectives

### 2. Modified Throwables System  
- Added `QuestManager` import
- Added `ITEM_THROWN` event emission in `processThrowEffects()`

### 3. Updated Quest Manager
- Added import for `potThrowingQuestDef`
- Registered quest in `registerQuestDefinitions()`

### 4. Enhanced Steven's Dialogue
- Added quest offer option (after inventory quest)
- Added quest turn-in option
- Created dialogue nodes for quest flow

### 5. Fixed GenericObjectiveHandler
- Set progress = 1 for single-completion objectives

## Design Decisions

### Why Two Separate Objectives?
- Teaches that quests can have multiple requirements
- Shows objectives can complete in any order
- Demonstrates the modular objective system

### Why Give Free Pots?
- Ensures player can complete quest immediately
- Removes need to find/buy pots first
- Focuses on teaching the throwing mechanic

### Why Require Inventory Quest First?
- Creates natural progression of tutorials
- Player needs inventory to manage throwables
- Establishes Steven as the tutorial NPC

### Why 1500 Gold Reward?
- Significant but not game-breaking amount
- Motivates completion
- Allows player to buy more pots or equipment

## Extending the System

To add more throwable quests, you could:

1. **Create a boss pot challenge**:
```javascript
objectives: [
  {
    id: 'damage_boss_with_pot',
    conditions: {
      events: ['ITEM_THROWN'],
      match: { 'hit': true, 'target.type': 'boss' }
    }
  }
]
```

2. **Add accuracy requirements**:
```javascript
objectives: [
  {
    id: 'perfect_throws',
    count: 5,  // Hit 5 targets
    conditions: {
      events: ['ITEM_THROWN'],
      match: { 'hit': true }
    }
  }
]
```

3. **Create element-specific challenges**:
```javascript
objectives: [
  {
    id: 'burn_enemy',
    conditions: {
      events: ['STATUS_APPLIED'],
      match: { 
        'status': 'burn',
        'source': 'fire_pot'
      }
    }
  }
]
```

The quest system's event-driven architecture makes it easy to add complex objectives without modifying core game systems!