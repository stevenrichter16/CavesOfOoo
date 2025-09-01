# JavaScript Folder Reorganization Plan

## New Structure:

```
src/js/
├── core/           # Core game loop and initialization
│   ├── game.js
│   ├── config.js
│   └── actions.js
│
├── entities/       # Entity management and creation
│   ├── entities.js
│   ├── player.js (extracted from entities.js)
│   └── monsters.js (moved from systems)
│
├── combat/         # Combat and damage systems
│   ├── combat.js
│   ├── effects.js (from gear/effects.js)
│   └── statusSystem.js (from systems/)
│
├── world/          # World generation and management (existing)
│   ├── worldGen.js
│   ├── worldMap.js
│   └── [existing world files]
│
├── movement/       # Movement and pathfinding
│   ├── movePipeline.js
│   ├── playerMovement.js (from systems/)
│   ├── pathfinding.js (from systems/)
│   └── cursor.js (from systems/)
│
├── items/          # Items, inventory, and shops
│   ├── inventory.js
│   ├── shop.js (from systems/)
│   └── gear/ (existing folder)
│
├── quests/         # Quest system
│   ├── quests.js
│   ├── questTurnIn.js (from systems/)
│   └── vendorQuests.js (from systems/)
│
├── ui/             # UI components (existing, already organized)
│   └── [existing UI files]
│
├── renderer/       # Rendering (existing)
│   └── canvas.js
│
├── input/          # Input handling (existing)
│   └── keys.js
│
├── engine/         # Rule engine (existing, already organized)
│   └── [existing engine files]
│
├── utils/          # Utilities and helpers
│   ├── utils.js
│   ├── log.js
│   ├── events.js
│   ├── eventTypes.js
│   ├── queries.js
│   └── persistence.js
│
└── systems/        # Remaining complex systems
    └── combat/ (if needed for complex combat systems)
```

## Benefits:
1. **Clear separation of concerns** - Each folder has a specific purpose
2. **Easier navigation** - Related files are grouped together
3. **Scalability** - Easy to add new features in appropriate folders
4. **Intuitive** - New developers can quickly understand the structure
5. **Minimal nesting** - Most imports will be 1-2 levels deep

## Migration Order:
1. Create new folders
2. Move files in groups to maintain working state
3. Update imports in moved files
4. Test after each group
5. Clean up empty folders