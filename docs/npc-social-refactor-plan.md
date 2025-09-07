# NPC + Social System Refactoring Plan

## Executive Summary
Complete refactor of the NPC and social systems to support Adventure Time's kingdom-based world with multi-faction NPCs, contextual relationships, dynamic disguises, rumor propagation, and data-driven content creation.

## Current System Analysis

### Strengths (Keep & Enhance)
1. **Solid Foundation**
   - NPCMemory for event tracking
   - RelationshipMatrix with directional trust/fear/respect
   - Trait system with opposition checks
   - Action requirements and effects framework
   - Dialogue template pools

2. **Good Design Patterns**
   - Data-driven social actions
   - Faction standing separate from personal relations
   - Cooldown gates to prevent spam
   - Status effect integration (burning → intimidation)

### Critical Gaps
1. **No Kingdom Awareness** - Generic factions instead of AT kingdoms
2. **Single Faction Per NPC** - Can't represent dual affiliations
3. **Linear Relationship Scoring** - No context (location, time, role)
4. **Hard-coded Disguise** - Only Banana Guard, not extensible
5. **No Rumor Propagation** - Memory stays local to NPC
6. **No Schedules/Roles** - NPCs don't have duties or routines

## Implementation Phases

### Phase 1: Kingdom Data Layer (Foundation)
**Goal**: Create data-driven kingdom and faction system

#### 1.1 Kingdom Definitions
```javascript
// src/data/kingdoms/
- _types.js          // TypeScript-like type definitions
- index.js           // Kingdom registry and helpers
- candy.kingdom.js   // Candy Kingdom data pack
- fire.kingdom.js    // Fire Kingdom data pack  
- ice.kingdom.js     // Ice Kingdom data pack
- slime.kingdom.js   // Slime Kingdom data pack
```

Each kingdom pack includes:
- ID, name, tags (for content selection)
- Law level (affects guard behavior)
- Realm weights (trust/fear/respect modifiers)
- Terrain costs (movement in kingdom)
- Disguise uniforms (recognized outfits)
- Sub-factions with values, taboos, relations

#### 1.2 Faction Registry Upgrade
```javascript
// src/social/factionRegistry.js
- Import kingdom data
- getEffectiveRelation() for multi-faction entities
- Context-aware hostility checks
- Kingdom-specific relation modifiers
```

**Tests**: 50+ tests for kingdom data, faction relations, context modifiers

---

### Phase 2: Multi-Faction NPCs
**Goal**: Support NPCs with multiple affiliations and roles

#### 2.1 NPC Factory System
```javascript
// src/npc/createNpc.js
- createNpc(config) factory function
- Multi-faction support (factions: string[])
- Role-based initialization (guard/vendor/citizen/courtier)
- Schedule and duty management
- Kingdom-aware trait selection
```

#### 2.2 NPC Spawners by Location
```javascript
// src/world/chunks/
- candyMarket.spawn.js
- fireCourtyard.spawn.js
- iceVillage.spawn.js
- slimeBazaar.spawn.js
```

#### 2.3 Migration Layer
```javascript
// src/social/migration.js
- Convert existing NPCs to new format
- Preserve relationships and memory
- Map old factions to kingdoms
```

**Tests**: 60+ tests for NPC creation, spawning, migration

---

### Phase 3: Contextual Relationships
**Goal**: Make attitude scoring context-aware

#### 3.1 Attitude Calculator
```javascript
// src/social/attitude.js
- attitudeScore(player, npc, context)
- Context includes: kingdomId, lawLevel, rumorScore
- Dynamic weight calculation based on role/kingdom
- attitudeTier() for bucketing scores
```

#### 3.2 Encounter Evaluator
```javascript
// src/social/gates.js
- evaluateEncounter(state, player, npc, context)
- Integrate disguise resolution
- Calculate visible factions
- Return score, tier, disguise effectiveness
```

**Tests**: 40+ tests for attitude calculation, context handling

---

### Phase 4: Generic Disguise System
**Goal**: Extensible disguise mechanics for all kingdoms

#### 4.1 Disguise Resolution
```javascript
// src/social/disguise.js
- resolveDisguise(disguise, observerUniforms, context)
- Quality × distance × lighting calculation
- Perceptive trait detection bonus
- Support for partial disguises
```

#### 4.2 Equipment Integration
```javascript
// Update armor items with disguiseKeys
- Banana Guard Armor: ["banana_guard", "candy_guard"]
- Fire Court Robes: ["fire_court", "fire_noble"]
- Ice Citizen Parka: ["ice_citizen"]
```

**Tests**: 30+ tests for disguise mechanics, edge cases

---

### Phase 5: Rumor & Memory System
**Goal**: Information propagation through social networks

#### 5.1 Rumor Queue
```javascript
// src/social/rumors.js
- createRumor(type, severity, factions, pos)
- tickRumors(state) - propagate with decay
- NPCs share rumors based on alignment
- Affect faction standing over time
```

#### 5.2 Memory Enhancement
```javascript
// Extend NPCMemory
- Track rumors heard
- Shareable vs private memories
- Rumor distortion over distance
```

**Tests**: 35+ tests for rumor propagation, memory updates

---

### Phase 6: Schedules & Roles
**Goal**: NPCs with daily routines and contextual behavior

#### 6.1 Schedule System
```javascript
// src/social/schedule.js
- currentDuty(npc, timeOfDay)
- Role-based default schedules
- Location-based behavior changes
```

#### 6.2 Behavior Integration
```javascript
// Update behavior.js
- Check schedule before actions
- Duty-specific action preferences
- Time-of-day dialogue variations
```

**Tests**: 25+ tests for schedules, role behavior

---

### Phase 7: Data-Driven Actions & Dialogue
**Goal**: Easy content addition through configuration

#### 7.1 Action Registry
```javascript
// src/social/actions/registry.js
- Centralized ACTIONS object
- Auto-discovery via requirements
- Kingdom-specific actions
```

#### 7.2 Dialogue Templates
```javascript
// src/social/dialogue/templates/
- candy.dialogue.js
- fire.dialogue.js
- ice.dialogue.js
- slime.dialogue.js
```

**Tests**: 40+ tests for action discovery, dialogue generation

---

### Phase 8: Integration & Polish
**Goal**: Wire everything together seamlessly

#### 8.1 Movement Integration
```javascript
// Hook into movement pipeline
- Check encounters on NPC collision
- Context from current chunk/kingdom
- Social menu UI trigger
```

#### 8.2 Save/Load Support
```javascript
// Serialization for new data
- Kingdom states
- Multi-faction standings
- Rumor queues
- NPC schedules
```

#### 8.3 EventBus Integration
```javascript
// New events
- KingdomEntered
- RumorCreated/RumorSpread
- DisguiseDetected/DisguiseFailed
- ScheduleChanged
```

**Tests**: 50+ integration tests

---

## Implementation Order & Time Estimates

### Week 1: Foundation (Phases 1-2)
- Day 1-2: Kingdom data layer, types, registry
- Day 3-4: Multi-faction NPC factory, spawners
- Day 5: Migration layer, initial testing

### Week 2: Core Systems (Phases 3-5)
- Day 6-7: Contextual attitude system
- Day 8-9: Generic disguise system
- Day 10: Rumor propagation basics

### Week 3: Advanced Features (Phases 6-7)
- Day 11-12: Schedules and roles
- Day 13-14: Data-driven actions and dialogue
- Day 15: Kingdom-specific content

### Week 4: Integration (Phase 8)
- Day 16-17: Movement system hooks
- Day 18-19: Save/load, EventBus
- Day 20-21: Testing, polish, documentation

---

## Success Metrics
1. **Data-Driven**: 90% of new content added via config files
2. **Test Coverage**: 400+ tests, all passing
3. **Performance**: <2ms per social evaluation
4. **Extensibility**: Add new kingdom in <30 minutes
5. **Backwards Compatible**: Existing saves still work

## Risk Mitigation
1. **Save Compatibility**: Migration layer for old format
2. **Performance**: Cache faction lookups, limit rumor distance
3. **Complexity**: Incremental phases, each independently valuable
4. **Testing**: TDD approach, integration tests per phase

## Next Steps
1. Review and approve plan
2. Create feature branch 'npc-social-refactor'
3. Begin Phase 1 implementation with TDD
4. Daily progress updates with test metrics

---

## Code Examples

### Adding a New Kingdom (Post-Refactor)
```javascript
// src/data/kingdoms/dungeon.kingdom.js
export default {
  id: "dungeon",
  name: "Dungeon of the Crystal Eye",
  tags: ["dungeon", "dark", "lawless"],
  lawLevel: 0.1,
  realmWeights: {
    trust: 0.5, respect: 0.8, fear: 1.5, law: 0.2, rumor: 1.3
  },
  terrainCost: { stone: 1, trap: 10, darkness: 2 },
  disguiseUniforms: ["dungeon_keeper"],
  factions: [
    {
      id: "dungeon_keepers",
      name: "Dungeon Keepers",
      kind: "guild",
      values: ["order", "tradition", "punishment"],
      taboos: ["escape", "mercy"],
      relations: { prisoners: -0.9, candy_kingdom: -0.5 }
    }
  ]
}
```

### Adding a New Social Action
```javascript
// In ACTIONS object
dance: {
  id: "dance",
  label: "Invite to Dance",
  cooldown: 2,
  requires: ({attitude, npc}) => 
    attitude === "friendly" && npc.role !== "guard",
  apply: ({state, player, npc}) => {
    npc.social.trust += 0.1;
    npc.social.respect += 0.05;
    state.log(`${player.name} dances with ${npc.name}!`);
  }
}
```

## Conclusion
This refactor transforms the NPC/social system from hard-coded to data-driven, enabling rapid content creation while maintaining performance and test coverage. The phased approach ensures each milestone adds value independently.