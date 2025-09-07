# Phase 7 Integration Gaps - TDD Implementation Plan

## Overview
This document outlines a Test-Driven Development (TDD) approach to addressing three minor gaps identified in the Phase 7 integration with previous phases of the NPC social system.

## Gap 1: Multi-Faction Visibility Action Filtering

### Problem
Currently, actions check if an NPC has a faction (`npc.factions.includes()`), but don't consider which faction the NPC is currently presenting as (`visibleFaction`).

### Test-First Approach

#### Step 1: Write Failing Tests
```javascript
// Test that actions should filter based on visible faction
it('should filter actions based on visible faction only', () => {
  const spy = new NPC({
    factions: ['candy_citizens', 'ice_spies']
  });
  
  const context = {
    npc: spy,
    visibleFaction: 'candy_citizens' // Currently appearing as candy citizen
  };
  
  const actions = registry.getAvailable(context);
  
  // Should NOT have spy-specific actions when appearing as citizen
  expect(actions.some(a => a.id === 'exchange_intel')).toBe(false);
});
```

#### Step 2: Implementation
```javascript
// In ActionRegistry.getAvailable()
getAvailable(context) {
  for (const action of this.actions.values()) {
    // NEW: Check visible faction instead of all factions
    if (action.requiresFaction) {
      const effectiveFaction = context.visibleFaction || 
                              (context.npc.factions && context.npc.factions[0]);
      if (!effectiveFaction || !action.requiresFaction(effectiveFaction)) {
        continue;
      }
    }
    // ... rest of logic
  }
}
```

#### Step 3: Refactor Actions
```javascript
// Update faction-specific actions
{
  id: 'exchange_intel',
  requiresFaction: (faction) => faction === 'ice_spies',
  // Instead of: requires: ({ npc }) => npc.factions.includes('ice_spies')
}
```

## Gap 2: Duty-Based Action Success Modifiers

### Problem
Actions don't modify their success rates or effects based on the NPC's current duty.

### Test-First Approach

#### Step 1: Write Failing Tests
```javascript
it('should apply duty modifiers to action success rates', () => {
  const guard = new NPC({ role: 'guard' });
  guard.schedule = new Schedule({
    [TimeOfDay.MORNING]: DutyType.PATROL
  });
  
  const context = {
    npc: guard,
    hour: 8, // Morning - patrol time
    currentDuty: DutyType.PATROL
  };
  
  const result = ACTIONS.compliment.apply(context);
  
  // During patrol, guard is suspicious - reduced trust gain
  expect(result.trustGain).toBeLessThan(0.05);
  expect(result.modifiers).toContain('suspicious_duty');
});
```

#### Step 2: Implementation
```javascript
// In schedule.js - Add duty modifier system
export const DUTY_MODIFIERS = {
  [DutyType.PATROL]: {
    suspicion: 1.5,
    friendliness: 0.8,
    trustGainMultiplier: 0.5
  },
  [DutyType.REST]: {
    suspicion: 0.5,
    friendliness: 1.2,
    trustGainMultiplier: 1.5
  },
  [DutyType.TRADING]: {
    priceModifier: 0.9,
    inventoryBonus: 1.2
  }
};

export function applyDutyModifiers(context, baseResult) {
  if (!context.currentDuty) return baseResult;
  
  const modifiers = DUTY_MODIFIERS[context.currentDuty];
  if (!modifiers) return baseResult;
  
  const modifiedResult = { ...baseResult };
  
  // Apply trust gain modifier
  if (modifiedResult.trustGain && modifiers.trustGainMultiplier) {
    modifiedResult.trustGain *= modifiers.trustGainMultiplier;
    modifiedResult.modifiers = modifiedResult.modifiers || [];
    modifiedResult.modifiers.push(
      modifiers.trustGainMultiplier < 1 ? 'suspicious_duty' : 'relaxed_duty'
    );
  }
  
  // Apply price modifier for trade
  if (modifiedResult.price && modifiers.priceModifier) {
    modifiedResult.price *= modifiers.priceModifier;
    modifiedResult.priceModifier = modifiers.priceModifier;
  }
  
  return modifiedResult;
}
```

#### Step 3: Update Actions
```javascript
// In each action's apply method
apply: ({ state, player, npc, hour }) => {
  const baseResult = {
    success: true,
    trustGain: 0.05
  };
  
  // NEW: Get current duty and apply modifiers
  const currentDuty = npc.schedule?.getCurrentDuty(hour);
  const context = { currentDuty };
  
  return applyDutyModifiers(context, baseResult);
}
```

## Gap 3: Enhanced Rumor-Action Integration

### Problem
Limited rumor-related actions beyond basic `share_rumor`.

### Test-First Approach

#### Step 1: Write Failing Tests
```javascript
it('should have multiple rumor-related actions', () => {
  const gossip = new NPC({ role: 'gossip' });
  gossip.memory.addRumor({ type: 'scandal' });
  
  const context = {
    npc: gossip,
    attitude: 'friendly',
    relationship: { trust: 0.7 }
  };
  
  const actions = registry.getAvailable(context);
  
  expect(actions.some(a => a.id === 'ask_for_rumors')).toBe(true);
  expect(actions.some(a => a.id === 'verify_rumor')).toBe(true);
  expect(actions.some(a => a.id === 'spread_false_rumor')).toBe(true);
});
```

#### Step 2: Implementation
```javascript
// New rumor actions
const RUMOR_ACTIONS = {
  ask_for_rumors: {
    id: 'ask_for_rumors',
    label: 'Ask for Rumors',
    cooldown: 2,
    category: 'rumor',
    requires: ({ attitude }) => attitude !== 'hostile',
    apply: ({ npc }) => {
      const rumors = npc.memory.rumors.slice(0, 3);
      return {
        success: true,
        rumors: rumors,
        message: rumors.length > 0 ? 'Here\'s what I\'ve heard...' : 'I haven\'t heard anything interesting.'
      };
    }
  },
  
  verify_rumor: {
    id: 'verify_rumor',
    label: 'Verify Rumor',
    cooldown: 3,
    category: 'rumor',
    requires: ({ relationship, npc }) => {
      return relationship?.trust > 0.5 && npc.memory.rumors.length > 0;
    },
    apply: ({ npc, params }) => {
      const rumor = params.rumor;
      const verification = Math.random() > 0.5;
      return {
        success: true,
        verified: verification,
        message: verification ? 'Yes, that\'s true!' : 'No, that\'s just gossip.'
      };
    }
  },
  
  share_sensitive_rumor: {
    id: 'share_sensitive_rumor',
    label: 'Share Sensitive Information',
    cooldown: 5,
    category: 'rumor',
    requires: ({ relationship, npc }) => {
      return relationship?.trust > 0.7 && 
             (npc.role === 'guard' || npc.role === 'spy');
    },
    apply: ({ npc, player }) => {
      // Create high-value rumor
      const sensitiveRumor = {
        type: 'intelligence',
        severity: 'critical',
        content: 'Secret guard patrol routes',
        restricted: true
      };
      
      return {
        success: true,
        rumor: sensitiveRumor,
        trustGain: 0.1,
        message: 'I shouldn\'t be telling you this, but...'
      };
    }
  },
  
  spread_false_rumor: {
    id: 'spread_false_rumor',
    label: 'Spread False Rumor',
    cooldown: 4,
    category: 'rumor',
    requires: ({ npc }) => npc.role === 'spy' || npc.role === 'criminal',
    apply: ({ npc, params }) => {
      const falseRumor = {
        type: 'misinformation',
        content: params.content || 'The princess is planning something...',
        false: true,
        spreaderId: npc.id
      };
      
      npc.memory.addRumor(falseRumor);
      
      return {
        success: true,
        message: 'Interesting... I\'ll spread the word.',
        trustLoss: 0.1 // Risk if caught
      };
    }
  },
  
  debunk_rumor: {
    id: 'debunk_rumor',
    label: 'Debunk Rumor',
    cooldown: 3,
    category: 'rumor',
    requires: ({ npc, params }) => {
      return npc.memory.rumors.some(r => r.id === params?.rumorId);
    },
    apply: ({ npc, params }) => {
      // Remove false rumor from memory
      npc.memory.rumors = npc.memory.rumors.filter(
        r => r.id !== params.rumorId
      );
      
      return {
        success: true,
        respectGain: 0.05,
        message: 'You\'re right, that was just gossip.'
      };
    }
  }
};
```

#### Step 3: Rumor Impact on Behavior
```javascript
// Add to action requirements
requires: ({ npc, player }) => {
  // Check if NPC has negative rumors about player
  const negativeRumors = npc.memory.rumors.filter(
    r => r.target === player.name && r.impact === 'negative'
  );
  
  if (negativeRumors.length > 0) {
    return false; // Won't interact positively
  }
  
  return true;
}
```

## Implementation Timeline

### Phase 1: Setup (Day 1)
1. Create test file with all failing tests
2. Run tests to confirm current behavior
3. Document expected vs actual results

### Phase 2: Core Implementation (Days 2-3)
1. Implement visible faction filtering
2. Add duty modifier system
3. Create new rumor actions

### Phase 3: Integration (Day 4)
1. Update existing actions to use new systems
2. Ensure backward compatibility
3. Performance optimization

### Phase 4: Testing & Polish (Day 5)
1. Make all tests pass
2. Add edge case tests
3. Update documentation
4. Performance benchmarks

## Success Criteria
- All tests pass
- No performance regression (action filtering < 50ms for 100 actions)
- Backward compatible with existing game code
- Clear documentation for content creators

## Code Quality Standards
- 100% test coverage for new code
- JSDoc comments for all public methods
- Consistent naming conventions
- No magic numbers (use named constants)

## Risk Mitigation
- Feature flags for gradual rollout
- Fallback to current behavior if errors
- Comprehensive logging for debugging
- A/B testing capability for balance tuning