# Phase 8: Integration & Polish - Implementation Plan

## Overview
Phase 8 is the final integration phase that wires together all 7 completed phases into a cohesive, production-ready system with proper persistence, event handling, and game integration.

## Status Check ✅
- **Phases 1-7:** Complete with 322/324 tests passing
- **Movement System:** Partial integration exists (MovementAdapter, NPCMovementExecutor, RumorMovementBridge)
- **Save/Load:** No serialization implemented yet
- **EventBus:** System exists but social events not integrated

## Phase 8 Components

### 8.1 Movement Integration 🚶
**Goal:** Seamless NPC encounters during player movement

#### Requirements:
- [ ] Detect NPC collisions during movement
- [ ] Trigger social encounters based on context
- [ ] Show social menu UI on interaction
- [ ] Handle movement costs in different kingdoms

#### Implementation:
```javascript
// src/social/movement/EncounterSystem.js
export class EncounterSystem {
  checkEncounter(player, npc, context) {
    // Get kingdom context from current chunk
    const kingdom = context.chunk.kingdomId;
    const lawLevel = context.chunk.lawLevel;
    
    // Evaluate encounter with full context
    const encounter = evaluateEncounter(player, npc, {
      kingdom,
      lawLevel,
      hour: context.gameTime.hour,
      visibleFaction: npc.getVisibleFaction(player)
    });
    
    // Trigger UI if interaction available
    if (encounter.canInteract) {
      this.triggerSocialMenu(player, npc, encounter);
    }
  }
  
  triggerSocialMenu(player, npc, encounter) {
    // Get available actions
    const actions = defaultRegistry.getAvailable(encounter.context);
    
    // Emit event for UI
    EventBus.emit('social:menu:open', {
      npc,
      actions,
      encounter
    });
  }
}
```

### 8.2 Save/Load Support 💾
**Goal:** Persist all social system state

#### Requirements:
- [ ] Serialize NPC states (factions, memory, schedule)
- [ ] Save relationship matrices
- [ ] Persist rumor queues
- [ ] Store faction standings
- [ ] Handle version migration

#### Implementation:
```javascript
// src/social/serialization/SocialSerializer.js
export class SocialSerializer {
  serialize(state) {
    return {
      version: '1.0.0',
      npcs: this.serializeNPCs(state.npcs),
      relationships: this.serializeRelationships(state.relationships),
      rumors: this.serializeRumors(state.rumors),
      factions: this.serializeFactions(state.factions),
      timestamp: Date.now()
    };
  }
  
  serializeNPCs(npcs) {
    return npcs.map(npc => ({
      id: npc.id,
      name: npc.name,
      factions: npc.factions,
      factionWeights: npc.factionWeights,
      memory: {
        rumors: npc.memory.rumors,
        events: npc.memory.events.slice(-100) // Last 100 events
      },
      schedule: npc.schedule ? npc.schedule.getAllDuties() : null,
      social: npc.social,
      position: { x: npc.x, y: npc.y },
      kingdomId: npc.kingdomId,
      role: npc.role
    }));
  }
  
  deserialize(data) {
    // Version check
    if (data.version !== '1.0.0') {
      data = this.migrate(data);
    }
    
    // Reconstruct NPCs
    const npcs = data.npcs.map(npcData => {
      const npc = new NPC(npcData);
      
      // Restore memory
      if (npcData.memory) {
        npcData.memory.rumors.forEach(r => npc.memory.addRumor(r));
      }
      
      // Restore schedule
      if (npcData.schedule) {
        npc.schedule = new Schedule(npcData.schedule);
      }
      
      return npc;
    });
    
    return {
      npcs,
      relationships: this.deserializeRelationships(data.relationships),
      rumors: this.deserializeRumors(data.rumors),
      factions: this.deserializeFactions(data.factions)
    };
  }
}
```

### 8.3 EventBus Integration 📢
**Goal:** Emit social events for other systems to react to

#### Requirements:
- [ ] Define social event types
- [ ] Emit events at key moments
- [ ] Handle event subscribers
- [ ] Document event contracts

#### Implementation:
```javascript
// src/social/events/SocialEvents.js
export const SocialEventTypes = {
  KINGDOM_ENTERED: 'social:kingdom:entered',
  RUMOR_CREATED: 'social:rumor:created',
  RUMOR_SPREAD: 'social:rumor:spread',
  DISGUISE_DETECTED: 'social:disguise:detected',
  DISGUISE_FAILED: 'social:disguise:failed',
  SCHEDULE_CHANGED: 'social:schedule:changed',
  RELATIONSHIP_CHANGED: 'social:relationship:changed',
  ACTION_PERFORMED: 'social:action:performed',
  FACTION_STANDING_CHANGED: 'social:faction:changed'
};

// src/social/events/SocialEventEmitter.js
export class SocialEventEmitter {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }
  
  emitKingdomEntered(player, kingdom, previousKingdom) {
    this.eventBus.emit(SocialEventTypes.KINGDOM_ENTERED, {
      player,
      kingdom,
      previousKingdom,
      timestamp: Date.now()
    });
  }
  
  emitRumorCreated(rumor, source) {
    this.eventBus.emit(SocialEventTypes.RUMOR_CREATED, {
      rumor,
      source,
      position: source.position,
      timestamp: Date.now()
    });
  }
  
  emitDisguiseDetected(player, npc, disguise, success) {
    const eventType = success 
      ? SocialEventTypes.DISGUISE_DETECTED 
      : SocialEventTypes.DISGUISE_FAILED;
      
    this.eventBus.emit(eventType, {
      player,
      npc,
      disguise,
      success,
      timestamp: Date.now()
    });
  }
}
```

### 8.4 UI Integration 🎮
**Goal:** Connect social system to game UI

#### Requirements:
- [ ] Social interaction menu
- [ ] Faction standing display
- [ ] Active rumors panel
- [ ] NPC schedule viewer
- [ ] Relationship indicators

#### Implementation:
```javascript
// src/ui/social/SocialMenu.js
export class SocialMenu {
  constructor(game) {
    this.game = game;
    this.currentNPC = null;
    
    // Listen for social menu events
    EventBus.on('social:menu:open', this.open.bind(this));
  }
  
  open({ npc, actions, encounter }) {
    this.currentNPC = npc;
    
    // Build menu HTML
    const menuHTML = this.buildMenu(npc, actions, encounter);
    
    // Display in game UI
    this.game.ui.showModal(menuHTML);
  }
  
  buildMenu(npc, actions, encounter) {
    return `
      <div class="social-menu">
        <h2>${npc.name}</h2>
        <p class="attitude">${encounter.attitude}</p>
        <div class="actions">
          ${actions.map(a => `
            <button data-action="${a.id}">${a.label}</button>
          `).join('')}
        </div>
      </div>
    `;
  }
}
```

## Implementation Tasks

### Week 1: Core Integration
- [ ] Day 1-2: Movement encounter system
- [ ] Day 3-4: Basic save/load serialization
- [ ] Day 5: EventBus event definitions

### Week 2: Polish & UI
- [ ] Day 6-7: UI components (menu, indicators)
- [ ] Day 8-9: Advanced serialization (migration, compression)
- [ ] Day 10: Event integration testing

### Week 3: Testing & Documentation
- [ ] Day 11-12: Integration test suite
- [ ] Day 13-14: Performance optimization
- [ ] Day 15: Documentation and examples

## Test Plan

### Integration Tests
```javascript
describe('Phase 8 Integration', () => {
  it('should trigger encounters on NPC collision');
  it('should save and restore full NPC state');
  it('should emit events for all social actions');
  it('should handle UI menu interactions');
  it('should migrate old save formats');
  it('should compress large rumor queues');
  it('should handle cross-kingdom movement');
});
```

### Performance Targets
- Encounter check: < 2ms
- Save serialization: < 50ms for 100 NPCs
- Load deserialization: < 100ms
- Event emission: < 0.5ms

## Success Criteria
1. ✅ All movement encounters working
2. ✅ Complete save/load cycle preserves all data
3. ✅ Events firing for all major interactions
4. ✅ UI fully integrated
5. ✅ 450+ total tests passing
6. ✅ Performance targets met

## Risks & Mitigation
1. **Save file size**: Compress rumor/event history
2. **Event performance**: Batch events, async processing
3. **UI complexity**: Start with minimal menu, enhance iteratively
4. **Migration issues**: Version checking, fallback values

## Next Steps
1. Create `phase8-integration` branch
2. Set up test files for each component
3. Implement movement encounters first (most visible)
4. Add save/load incrementally
5. Wire up events as features complete

## Deliverables
- [ ] EncounterSystem.js with tests
- [ ] SocialSerializer.js with tests  
- [ ] SocialEventEmitter.js with tests
- [ ] SocialMenu.js with tests
- [ ] Migration guide for existing saves
- [ ] Event documentation
- [ ] Performance benchmark results

The system is ready for Phase 8! All prerequisites are met and the foundation is solid.