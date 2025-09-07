# Phase 5 Rumor System - Movement Integration Plan

## Current State: **3/10 Integration** ❌

### Executive Summary
The Rumor & Memory System and Movement System exist as **isolated silos** with no meaningful integration. NPCs move without spreading rumors, rumors spread without respecting movement constraints, and movement events don't generate rumors.

## 🚨 **Critical Missing Integrations**

### **1. NPCs Don't Spread Rumors While Moving**
**Problem:** NPCs patrol and move but never share information
**Impact:** Rumors don't naturally propagate through the world
**Solution Required:** Proximity-based automatic sharing during movement

### **2. Movement Events Don't Generate Rumors**
**Problem:** Player movement, combat, discoveries create no rumors
**Impact:** No emergent storytelling from player actions
**Solution Required:** Event listeners for movement outcomes

### **3. Rumors Ignore Physical Barriers**
**Problem:** Rumors spread through walls as if they don't exist
**Impact:** Unrealistic information flow
**Solution Required:** Pathfinding-aware propagation

### **4. NPCs Don't Move Based on Rumors**
**Problem:** Critical information doesn't influence NPC behavior
**Impact:** NPCs seem unaware of important events
**Solution Required:** Rumor-driven movement behaviors

## 🔧 **Integration Architecture**

```
┌─────────────────┐         ┌──────────────────┐
│ Movement System │ ──────> │ Event Bus        │
│                 │         │                  │
│ - NPC Movement  │         │ - MovementComplete
│ - Player Move   │         │ - CombatStarted  │
│ - Patrol Logic  │         │ - NPCEncounter   │
└─────────────────┘         └──────────────────┘
                                    │
                                    v
                            ┌──────────────────┐
                            │ Rumor Bridge     │ <- MISSING!
                            │                  │
                            │ - Event Listeners│
                            │ - Rumor Generator│
                            │ - Spread Manager │
                            └──────────────────┘
                                    │
                                    v
                            ┌──────────────────┐
                            │ Rumor System     │
                            │                  │
                            │ - Create Rumors  │
                            │ - NPC Memory     │
                            │ - Propagation    │
                            └──────────────────┘
```

## 📋 **Implementation Tasks**

### **Priority 1: Movement-Based Rumor Spreading**

```javascript
// src/social/movement/RumorMovementBridge.js
export class RumorMovementBridge {
  constructor(eventBus, rumorEngine) {
    this.eventBus = eventBus;
    this.rumorEngine = rumorEngine;
    this.setupEventListeners();
  }

  onNPCMove(event) {
    const { npc, position, nearbyNPCs } = event;
    
    // Share rumors with NPCs in range
    for (const other of nearbyNPCs) {
      if (this.canShareRumors(npc, other)) {
        npc.shareRumorsWith(other);
      }
    }
  }

  canShareRumors(npc1, npc2) {
    const SHARING_DISTANCE = 5;
    const distance = npc1.distanceTo(npc2.x, npc2.y);
    return distance <= SHARING_DISTANCE;
  }
}
```

### **Priority 2: Movement Event Rumor Generation**

```javascript
// Add to RumorMovementBridge
onMovementComplete(event) {
  const { entity, result, witnesses } = event;
  
  if (result.combat) {
    this.generateCombatRumor(entity, result, witnesses);
  }
  
  if (result.discovered) {
    this.generateDiscoveryRumor(entity, result, witnesses);
  }
  
  if (entity.type === 'player' && witnesses.length > 0) {
    this.generateSightingRumor(entity, witnesses);
  }
}

generateSightingRumor(player, witnesses) {
  const rumor = createRumor({
    type: RumorType.SIGHTING,
    severity: RumorSeverity.MINOR,
    factions: ['player'],
    position: { x: player.x, y: player.y },
    details: `Player spotted in the area`
  });
  
  // Witnesses immediately learn the rumor
  witnesses.forEach(npc => npc.hearRumor(rumor));
}
```

### **Priority 3: Rumor-Influenced Movement**

```javascript
// Extend NPCMovementExecutor
getRumorInfluencedBehavior(npc, state) {
  const criticalRumors = npc.memory.rumors.filter(r => 
    r.severity === RumorSeverity.CRITICAL
  );
  
  if (criticalRumors.length > 0) {
    // Guards investigate threats
    if (npc.hasFactionType('guard')) {
      const threatLocation = criticalRumors[0].position;
      return {
        action: 'investigate',
        target: threatLocation,
        priority: 'high'
      };
    }
    
    // Citizens flee from danger
    if (npc.hasFactionType('citizen')) {
      return {
        action: 'flee',
        away_from: criticalRumors[0].position,
        priority: 'high'
      };
    }
  }
  
  // Merchants seek trade opportunities
  if (npc.hasFactionType('merchant')) {
    const tradeRumors = npc.memory.rumors.filter(r => 
      r.type === RumorType.TRADE
    );
    
    if (tradeRumors.length > 0) {
      return {
        action: 'travel',
        target: tradeRumors[0].position,
        priority: 'normal'
      };
    }
  }
  
  return null;
}
```

### **Priority 4: Pathfinding-Aware Propagation**

```javascript
// Enhance rumor spreading to respect walls
canRumorReach(from, to, state) {
  // Don't just check distance - check if path exists
  const path = pathfindingSystem.findPath(
    from, to, 
    state.currentLevel,
    { maxCost: rumor.maxSpreadDistance }
  );
  
  return path !== null && path.length <= rumor.maxSpreadDistance;
}
```

## 🧪 **Test Requirements**

### **Integration Tests Needed**

1. **Test: NPCs share rumors during patrol**
```javascript
it('should share rumors when NPCs meet during patrol', () => {
  const guard1 = createNPC({ role: 'guard', x: 0, y: 0 });
  const guard2 = createNPC({ role: 'guard', x: 10, y: 0 });
  
  guard1.hearRumor(testRumor);
  
  // Move guard1 toward guard2
  moveNPC(guard1, { x: 8, y: 0 });
  
  // Should trigger sharing
  expect(guard2.memory.rumors).toHaveLength(1);
});
```

2. **Test: Movement generates sighting rumors**
```javascript
it('should generate sighting rumor when player moves past NPC', () => {
  const citizen = createNPC({ role: 'citizen', x: 5, y: 5 });
  
  movePlayer({ x: 4, y: 5 });
  
  expect(citizen.memory.rumors).toHaveLength(1);
  expect(citizen.memory.rumors[0].type).toBe(RumorType.SIGHTING);
});
```

3. **Test: Guards investigate threat rumors**
```javascript
it('should move guard toward threat rumor location', () => {
  const guard = createNPC({ role: 'guard', x: 0, y: 0 });
  
  const threatRumor = createRumor({
    type: RumorType.COMBAT,
    severity: RumorSeverity.CRITICAL,
    position: { x: 20, y: 20 }
  });
  
  guard.hearRumor(threatRumor);
  const behavior = getRumorInfluencedBehavior(guard);
  
  expect(behavior.action).toBe('investigate');
  expect(behavior.target).toEqual({ x: 20, y: 20 });
});
```

## 📊 **Expected Outcomes**

### **After Integration**

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| **Rumor Spread** | Static/Manual | Dynamic/Automatic | Natural information flow |
| **NPC Behavior** | Fixed patterns | Rumor-responsive | Emergent behaviors |
| **Player Impact** | Limited | Every move matters | Enhanced storytelling |
| **World Reactivity** | Low | High | Living world feel |

### **Performance Considerations**

- Rumor sharing checks: O(n²) for n NPCs in range
- Optimize with spatial indexing for large NPC counts
- Cache pathfinding results for rumor spread checks
- Limit sharing frequency (cooldown timers)

## 🎯 **Success Metrics**

### **Integration Complete When:**

1. ✅ NPCs automatically share rumors during movement
2. ✅ Movement events generate appropriate rumors
3. ✅ Rumors respect physical barriers (walls)
4. ✅ NPCs alter movement based on rumor content
5. ✅ Integration tests pass (minimum 10 tests)
6. ✅ Performance acceptable (< 5ms per movement turn)

## 🚀 **Implementation Priority**

### **Phase 1 (Critical)**
- Movement-triggered rumor sharing
- Basic movement event rumors

### **Phase 2 (Important)**
- Rumor-influenced movement behaviors
- Witness system for sightings

### **Phase 3 (Enhancement)**
- Pathfinding-aware propagation
- Performance optimizations
- Advanced behaviors (gossip chains)

## 📈 **Expected Integration Score**

**Current:** 3/10
**After Phase 1:** 6/10
**After Phase 2:** 8/10
**After Phase 3:** 10/10

---

*Integration plan created 2025-09-06*
*Estimated implementation time: 4-6 hours for full integration*