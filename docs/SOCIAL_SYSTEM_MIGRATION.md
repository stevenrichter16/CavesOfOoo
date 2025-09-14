# Social System Migration Guide

## Overview
This document describes the migration from the OLD social system (`/src/js/social/`) to the NEW multi-faction social system (`/src/social/`) while maintaining 100% backward compatibility.

## Migration Strategy

### 1. Enhanced NPC Class
Created `/src/social/npcEnhanced.js` that:
- Extends the NEW multi-faction NPC class
- Adds OLD system features (traits, memory, inventory, dialogue)
- Provides static conversion methods for OLD format NPCs
- Maintains all existing APIs

### 2. Migration Adapter
Created `/src/social/migrationAdapter.js` that:
- Provides drop-in replacements for OLD system functions
- Auto-converts OLD format NPCs to NEW class instances
- Uses WeakMap caching for performance
- Tracks migration progress

### 3. File-by-File Migration
Instead of updating all files at once, we can migrate files gradually:
1. Update import from `../social/init.js` to `../../social/migrationAdapter.js`
2. All existing code continues working without changes
3. NPCs are automatically converted to NEW format

## Migration Steps Completed

### Phase 1: Core Infrastructure (✅ Complete)
- [x] Created enhanced NPC class with OLD system features
- [x] Created migration adapter with conversion logic
- [x] Added comprehensive test suite (86 tests)
- [x] Verified backward compatibility

### Phase 2: Game Integration (✅ Complete)
- [x] Updated `game.js` to use migration adapter
- [x] Added automatic NPC conversion on game init
- [x] Tested save/load compatibility

### Phase 3: World Files (✅ Complete)
- [x] Migrated `candyKingdomTown.js` as proof of concept
- [x] Migrated all 9 world files to use adapter
- [x] Verified NPC spawning works correctly

### Phase 4: Testing (✅ Complete)
- [x] Created unit tests for NPC class enhancements
- [x] Created integration tests for migration adapter
- [x] Created browser integration tests
- [x] Verified performance (< 100ms for 100 NPCs)

## Key Features Preserved

### OLD System Features
- **Traits System**: NPCs have personality traits that affect dialogue
- **Memory System**: NPCs remember interactions and events
- **Inventory Management**: NPCs can hold and trade items
- **Dialogue Trees**: Complex branching dialogue with conditions
- **Shop System**: Merchant NPCs with goods to sell
- **Quest System**: Quest giver NPCs with quest management

### NEW System Features
- **Multi-Faction Support**: NPCs can belong to multiple factions
- **Dynamic Hostility**: Faction-based hostility evaluation
- **Disguise System**: Players can disguise as different factions
- **Faction Relations**: Complex inter-faction relationships
- **Kingdom Support**: Faction kingdoms with unique properties

## API Compatibility

### Functions That Work Without Changes
```javascript
// OLD API - Still works
spawnSocialNPC(state, config)
initializeNPC(npcData)
getAvailableInteractions(npc, player)
runPlayerNPCInteraction(npc, player, action)
```

### NPC Methods That Work
```javascript
// OLD methods - Still available
npc.hasTrait('brave')
npc.memory.remember(event)
npc.toDialogueContext()

// NEW methods - Also available
npc.evaluateHostilityTo(player)
npc.getVisibleFactions()
npc.getAllFactions()
```

## Performance Metrics

- **Conversion Speed**: < 1ms per NPC
- **Memory Overhead**: Minimal (uses WeakMap caching)
- **Runtime Performance**: < 100ms for 100 NPCs with full evaluation
- **Save/Load**: Fully compatible with existing save system

## Migration Checklist for New Files

When creating new files that use NPCs:

1. **Import from migration adapter**:
   ```javascript
   import { spawnSocialNPC } from '../../social/migrationAdapter.js';
   ```

2. **Use existing API**: No code changes needed

3. **NPCs are automatically enhanced**: Get both OLD and NEW features

## Rollback Plan

If issues arise, rollback is simple:
1. Change imports back to `../social/init.js`
2. NPCs revert to OLD format
3. No data loss or corruption

## Future Steps

### Phase 5: Gradual Feature Migration
- [ ] Update dialogue system to use NEW faction relations
- [ ] Enhance memory system with faction-aware memories
- [ ] Add disguise UI for players

### Phase 6: Cleanup (After Full Testing)
- [ ] Remove OLD system files
- [ ] Update all direct references to use NEW system
- [ ] Optimize performance with direct NEW system calls

## Testing Commands

```bash
# Run all migration tests
npm test tests/social/migration/

# Test specific migration component
npm test tests/social/migration/npc-class-enhanced.test.js
npm test tests/social/migration/migration-adapter.test.js
npm test tests/social/migration/browser-integration.test.js

# Test migrated world file
npm test tests/social/migration/candyKingdomTown-migration.test.js
```

## Benefits of This Approach

1. **Zero Breaking Changes**: All existing code continues working
2. **Gradual Migration**: Files can be migrated one at a time
3. **Feature Addition**: NPCs get NEW features without losing OLD ones
4. **Performance**: Caching prevents redundant conversions
5. **Testability**: Each component has comprehensive tests
6. **Rollback Safety**: Easy to revert if issues found

## Conclusion

The migration successfully merges both social systems while maintaining 100% backward compatibility. The game now has a more powerful NPC system with multi-faction support, dynamic hostility, and enhanced dialogue capabilities, all while preserving the existing gameplay experience.