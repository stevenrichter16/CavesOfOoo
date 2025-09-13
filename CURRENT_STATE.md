# CavesOfOoo - Current System State Documentation

## Overview
This document describes the current active systems in the CavesOfOoo game as of the latest codebase state. The game uses a hybrid of older and newer systems, with ongoing refactoring to modernize the architecture.

---

## 1. MOVEMENT SYSTEM

### Core Architecture
The movement system uses a **Pipeline Adapter Pattern** that bridges old and new implementations:

#### Active Files:
- `/src/js/movement/pipelineAdapter.js` - Controls which pipeline to use (NEW is forced enabled)
- `/src/js/movement/MovementPipeline.js` - New pipeline implementation (ACTIVE)
- `/src/js/movement/playerMovement.js` - Player movement handlers
- `/src/js/movement/movePipeline.js` - Old pipeline (DEPRECATED but still referenced)
- `/src/social/movement/MovementAdapter.js` - NPC movement adapter
- `/src/social/movement/NPCMovementExecutor.js` - NPC movement execution

#### Pipeline Selection:
```javascript
// pipelineAdapter.js forces NEW pipeline
export function isNewPipelineEnabled() {
  return true; // Forced to use NEW pipeline for fox tooth collection
}
```

### Player Movement Flow:
1. **Input** → `handlePlayerMove()` in playerMovement.js
2. **Pipeline Adapter** → Routes to NEW MovementPipeline
3. **Pipeline Steps**:
   - validation
   - preMove
   - checkStatus (frozen, etc.)
   - checkCollisions
   - handleNPC (social interactions)
   - handleMonster (combat/tooth collection)
   - checkTerrain (passability via TerrainSystem)
   - handleItems (pickup)
   - applyMovement
   - handleEdgeTransition
   - postMove

### NPC Movement:
- **Triggered**: After player movement completes
- **Handler**: `processNPCMovement()` in MovementAdapter.js
- **Executor**: NPCMovementExecutor class handles pathfinding and execution
- **AI Types**: Hostile (chase player), Neutral (random walk), Social (context-aware)

### Monster Movement:
- Handled within chunks as part of NPC system
- Special handling for sleeping foxes (tooth collection)
- Combat triggers when bumping awake monsters

---

## 2. SOCIAL SYSTEM

### ⚠️ CRITICAL: DUAL SOCIAL SYSTEMS DETECTED

The codebase contains **TWO parallel social/NPC systems** that are partially integrated:

#### System 1: Original Social System (`/src/js/social/`)
**Status**: ACTIVE for NPC creation and basic interactions
**Files**:
- `/src/js/social/init.js` - NPC initialization (simple objects)
- `/src/js/social/dialogue.js` - Template-based dialogue generation
- `/src/js/social/dialogueTreesV2.js` - Dialogue tree system (PRIMARY)
- `/src/js/social/dialogueTrees.js` - Old dialogue tree system (UNUSED)
- `/src/js/social/relationship.js` - Relationship tracking
- `/src/js/social/factions.js` - Single faction definitions
- `/src/js/social/traits.js` - NPC personality traits
- `/src/js/social/memory.js` - NPC memory system

#### System 2: New Multi-Faction System (`/src/social/`)
**Status**: PARTIALLY INTEGRATED for movement and hostility
**Files**:
- `/src/social/npc.js` - NPC class with multi-faction support
- `/src/social/npcSpawner.js` - Spawner using NPC class
- `/src/social/movement/MovementAdapter.js` - Adapts new NPCs to movement
- `/src/social/movement/NPCMovementExecutor.js` - NPC movement AI
- `/src/social/factionRegistry.js` - Multi-faction management
- `/src/social/relationCache.js` - Relationship caching

### How They're Mixed:

1. **NPC Creation**: Uses OLD system (`spawnSocialNPC` in `/src/js/social/init.js`)
   - Creates simple objects, NOT NPC class instances
   - Adds traits, memory, inventory as properties
   - No multi-faction support

2. **Dialogue**: Uses V2 from OLD system (`dialogueTreesV2.js`)
   - ALL imports use `dialogueTreesV2.js`
   - `dialogueTrees.js` exists but is NEVER imported
   - Dialogue bootstrap uses OLD system

3. **Movement**: Uses NEW system adapter
   - `MovementAdapter.js` converts old NPCs to new format on-the-fly
   - `isNPCHostileToPlayer()` checks if NPC is instance of new NPC class
   - Falls back to conversion if needed

4. **UI Integration**: Uses OLD system
   - `openNPCInteraction()` in `/src/js/ui/social.js`
   - Checks for dialogue trees, falls back to social menu
   - `openDialogueTree()` uses V2 dialogue system

### NPC Structure (What's Actually Used):

#### OLD System NPCs (CURRENTLY ACTIVE):
```javascript
// Created by spawnSocialNPC() in /src/js/social/init.js
{
  id: 'npc_<timestamp>_<random>',
  name: 'Banana Guard',
  type: 'banana_guard',        // Used for dialogue lookup
  dialogueType: 'guard',        // Dialogue variant  
  faction: 'guards',            // Single faction ONLY
  traits: ['brave', 'loyal'],   // Added by initializeNPC()
  memory: NPCMemory instance,   // Added by initializeNPC()
  hasTrait: function(trait),   // Method added directly to object
  inventory: [],
  stats: { str: 10, def: 10, spd: 10 },
  x: 10, y: 10,
  hp: 20, hpMax: 20,
  chunkX: 0, chunkY: 0,        // Chunk coordinates
  glyph: 'B',
  color: 'yellow',
  dialogue: true,               // Has dialogue tree
  shopkeeper: true,             // Is vendor (if applicable)
  goods: []                     // Shop inventory
}
```

#### NEW System NPCs (NOT USED IN GAME):
```javascript
// Would be created by: new NPC(config)
// Only exists in tests and unused files
{
  // NPC class instance with methods
  id: 'npc_123',
  factions: ['guards', 'candy_kingdom'],  // Multi-faction
  perception: 50,                         // Detection range
  evaluateHostilityTo(entity, context),   // Method
  getVisibleFactions(observer),           // Method
  canSeeThrough(disguise),               // Method
  // ... many more class methods
}
```

### NPC Creation (How It Actually Works):

#### PRIMARY METHOD (Used Everywhere):
```javascript
// spawnSocialNPC in /src/js/social/init.js
const npc = spawnSocialNPC(state, {
  id: 'guard_1',
  name: 'Banana Guard',
  type: 'banana_guard',
  faction: 'guards',      // Single faction only
  x: 10, y: 10,
  dialogue: true
});

// This creates a PLAIN OBJECT, not an NPC class instance
// Then calls initializeNPC() to add traits, memory, etc.
```

#### What initializeNPC() Does:
1. Generates ID if missing
2. Adds random traits (checking for oppositions)
3. Creates NPCMemory instance
4. Adds `hasTrait()` method directly to object
5. Sets faction (single string)
6. Initializes inventory, stats, position

#### NEW System (NOT USED):
```javascript
// This exists but is NEVER called in actual game:
const npc = new NPC({
  id: 'guard_1',
  factions: ['guards', 'candy_kingdom'],  // Multi-faction
  perception: 50
});
```

### Dialogue System (CONFIRMED ACTIVE):

#### dialogueTreesV2.js (PRIMARY - ALL CODE USES THIS):
- **File**: `/src/js/social/dialogueTreesV2.js`
- **Registration**: `registerDialogueTree(npcType, biome, tree)`
- **Lookup Key**: `${biome}:${npcType}` (e.g., "candy_kingdom:banana_guard")
- **Start**: `startDialogue(state, player, npc, biome)`
- **Storage**: `const DIALOGUE_TREES = new Map()`
- **Used By**:
  - ALL test files import from dialogueTreesV2.js
  - game.js imports from dialogueTreesV2.js
  - ui/dialogueTree.js imports from dialogueTreesV2.js
  - quests import from dialogueTreesV2.js

#### dialogueTrees.js (DEAD CODE - NEVER IMPORTED):
- **File**: `/src/js/social/dialogueTrees.js`
- **Status**: EXISTS but ZERO imports found
- **Note**: Similar API but completely unused

#### Dialogue Loading Flow:
1. `game.js` loads dialogue data files
2. Calls `loadExpandedCandyKingdomDialogues()` for V3 dialogues
3. Calls `registerDialogueTree()` for each tree
4. Trees stored in V2's DIALOGUE_TREES Map
5. UI calls `startDialogue()` from V2 when bumping NPC

#### Dialogue Conditions:
```javascript
{
  hasItem: 'fox_sweet_tooth',
  minCount: 5,                 // For stackable items
  hasActiveQuest: 'quest_id',
  hasGold: 100,
  flagTrue: 'story_flag',
  relationAtLeast: { target: 'player', metric: 'trust', value: 50 },
  hasTrait: 'brave'
}
```

#### Dialogue Effects:
```javascript
{
  grantItem: { id: 'item_id', qty: 1 },
  takeItem: { id: 'item_id', qty: 5 },
  startQuest: { id: 'quest_id' },
  completeQuest: { id: 'quest_id' },
  setFlag: { flag: 'flag_name', value: true },
  relationDelta: { target: 'player', deltas: { trust: 10 } },
  grantReward: { type: 'gold', amount: 100 }
}
```

### Interaction Flow (Actual Implementation):

#### Movement Pipeline Trigger:
1. Player moves into NPC tile
2. `MovementPipeline.handleNPCInteraction()` called
3. Checks for NPC at target position (uses spatial index or linear search)
4. Checks if hostile via `isNPCHostileToPlayer()`
   - This uses MovementAdapter from NEW system
   - Converts old NPC to new format if needed
5. If friendly, calls `state.openNPCInteraction(state, npc)`

#### UI Flow:
1. `openNPCInteraction()` in `/src/js/ui/social.js` called
2. Checks if NPC has dialogue tree:
   ```javascript
   const hasDialogueTree = (npc.faction && 
     ['nobles', 'guards', 'merchants', 'peasants', 'forest_animals', 'wizards'].includes(npc.faction)) ||
     npc.dialogueType;
   ```
3. If has tree: calls `openDialogueTree(state, npc)`
4. If no tree: opens simple social menu

#### Dialogue Tree UI:
1. `openDialogueTree()` in `/src/js/ui/dialogueTree.js`
2. Determines biome from chunk
3. Calls `startDialogue()` from dialogueTreesV2.js
4. If no node returned, falls back to social menu
5. Renders dialogue with choices

### Reputation & Factions:
- **Factions**: guards, peasants, nobles, merchants, etc.
- **Reputation**: Tracked per faction
- **Propagation**: Actions affect faction standing
- **Hostility**: Evaluated based on faction relationships

---

## 3. QUEST SYSTEM

### Core Files:
- `/src/js/quests/candyKingdomQuests.js` - Main quest definitions
- `/src/js/quests/starchyQuests.js` - Starchy-specific quests
- `/src/js/items/questItems.js` - Quest item definitions

### Quest Structure:
```javascript
{
  id: 'sweet_tooth_foxes',
  name: 'Sweet Tooth Menace',
  description: 'Collect 5 fox teeth',
  giver: 'banana_guard',
  objectives: [{
    type: 'collect',
    item: 'fox_sweet_tooth',
    count: 5,
    current: 0,
    completed: false
  }],
  rewards: {
    gold: 100,
    xp: 50,
    reputation: { guards: 10 },
    items: ['reward_item']
  },
  onStart: (state) => { /* spawn enemies/items */ },
  onComplete: (state) => { /* grant rewards */ }
}
```

### Quest Tracking:
```javascript
player.quests = {
  active: ['quest_id_1', 'quest_id_2'],
  completed: ['old_quest_id'],
  progress: {
    'quest_id_1': { 
      teeth: 3,        // Custom progress tracking
      objectives: {}   // Objective completion
    }
  }
}
```

### Quest Flow:
1. **Start**: Via dialogue effect or `startQuest()`
2. **Progress**: Updated during gameplay (item pickup, NPC defeat)
3. **Check**: Dialogue conditions check completion
4. **Turn-In**: Special dialogue options when complete
5. **Complete**: Via dialogue effect or `completeQuest()`
6. **Rewards**: Applied automatically on completion

### Quest Items:
- Defined in QUEST_ITEMS constant
- Special handling in inventory (stackable, etc.)
- Collection tracked in quest progress
- Removed on quest turn-in

---

## 4. INTEGRATION POINTS

### Movement → Social:
- `handleNPCInteraction()` in pipeline triggers dialogue
- `processNPCMovement()` called after player moves
- Hostile NPCs chase via movement system

### Social → Quest:
- Dialogue starts quests via `startQuest` effect
- Dialogue checks quest progress via conditions
- Dialogue completes quests via `completeQuest` effect

### Quest → Movement:
- Fox tooth collection in `handleMonsterCollision()`
- Item pickup updates quest progress
- Quest spawns NPCs/monsters on start

### Dialogue → Vendor:
- `openShop` action in dialogue opens vendor UI
- Vendor NPCs have `shopkeeper: true` flag
- Shop inventory in `npc.goods` array

---

## 5. KEY SYSTEMS STATUS

### ✅ ACTIVE (Working):
- NEW MovementPipeline (forced enabled)
- DialogueTreesV2 system
- Quest system with turn-in
- Fox tooth collection mechanics
- NPC spawning and initialization
- Faction/reputation system
- Vendor shop integration

### ⚠️ HYBRID (Mixed old/new):
- **NPC Format**: OLD plain objects (not NPC class)
- **NPC Movement**: NEW MovementAdapter converts on-the-fly
- **Hostility Check**: NEW system via adapter
- **Dialogue Storage**: V2 from OLD system
- **Dialogue UI**: OLD system with V2 trees
- **Combat**: OLD system, integrated with new pipeline
- **Faction System**: OLD single-faction (string) not NEW multi-faction (array)

### 🔧 IN PROGRESS:
- Chunk refactoring (mentioned in git status)
- Shopping district implementation
- Forest dialogue completion

### ❌ DEPRECATED/UNUSED:
- Old movement pipeline (disabled but code remains)
- `/src/js/social/dialogueTrees.js` (NO IMPORTS FOUND)
- NEW NPC class system (`/src/social/npc.js` - never instantiated)
- Multi-faction system (code exists but not used)
- NPCSpawner class (exists but not used)

---

## 6. CONFIGURATION & CONSTANTS

### Key Constants:
- `MIN_HP_FOR_INTERACTION`: 5
- `INTERACTION_DISTANCE`: 1
- `DEFAULT_NPC_HP`: 20
- `DEFAULT_NPC_HP_MAX`: 20
- `HOSTILE_ATTACK_RANGE`: 5

### Feature Flags:
- `isNewPipelineEnabled()`: true (forced)
- `DEBUG_MOVEMENT`: Environment variable
- `USE_NEW_MOVEMENT`: Environment variable (ignored)

---

## 7. TESTING INFRASTRUCTURE

### Test Pages:
- `test-quest-turn-in.html` - Quest turn-in testing
- `test-shopping-district-npcs.html` - NPC spawning test

### Test Coverage:
- Movement pipeline: ✅ Comprehensive
- Quest system: ✅ Full flow tests
- Dialogue conditions: ✅ Unit tests
- NPC interactions: ✅ Integration tests

---

## 8. KNOWN ISSUES & NOTES

1. **DUAL SOCIAL SYSTEMS**: Two parallel NPC systems partially integrated
2. **Pipeline Forcing**: NEW pipeline forced due to fox tooth collection requirement  
3. **Input Lag Fix**: Using `executeSync()` instead of async
4. **Terrain Passability**: Default changed to passable for unknown tiles
5. **Inventory Format**: Items need `type: 'item'` and `count` (not `quantity`)
6. **Quest Items**: Special handling for stackable quest items
7. **Dialogue Lookup**: Uses `${biome}:${npcType}` key format in V2 system
8. **Memory Leaks**: Potential in NPC memory system (unbounded growth)
9. **Dead Code**: dialogueTrees.js exists but is never imported
10. **NPC Class Unused**: NEW NPC class system implemented but not used
11. **Conversion Overhead**: Movement system converts NPCs on every hostility check

---

## 9. RECOMMENDED NEXT STEPS

### CRITICAL - Choose ONE Social System:
1. **Option A**: Stick with OLD system (current)
   - Remove `/src/social/` directory entirely
   - Delete dialogueTrees.js (unused)
   - Document OLD system as canonical
   
2. **Option B**: Migrate to NEW system
   - Replace `spawnSocialNPC()` to use `new NPC()`
   - Update all dialogue to work with NPC class
   - Remove OLD social system files

### Other Improvements:
3. **Complete Chunk Refactor**: Finish the chunk-refactor branch work
4. **Remove Dead Code**: Delete dialogueTrees.js and unused NEW system
5. **Remove Old Pipeline**: Delete deprecated movement pipeline code
6. **Optimize Conversions**: Cache NPC conversions in MovementAdapter
7. **Fix Memory System**: Add memory size limits and cleanup
8. **Document Vendor System**: Add vendor shop documentation
9. **Standardize Quest Format**: Ensure all quests follow same structure
10. **Add Error Recovery**: Better error handling in dialogue effects

---

*Last Updated: Based on current branch `chunk-refactor` state*