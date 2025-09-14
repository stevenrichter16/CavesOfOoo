// src/js/social/factions.js - Faction definitions and relations

export const Factions = {
  merchants: {
    tags: ["civilization", "trade"],
    relations: {
      bandits: -100,
      guards: 50,
      nobles: 30,
      peasants: 10,
      wildlings: -20
    },
    values: ["wealth", "safety", "reputation", "order"],
    traitPreferences: {
      greedy: 0.3,
      loyal: 0.2,
      gossipy: 0.4
    }
  },
  
  bandits: {
    tags: ["outlaw", "freedom"],
    relations: {
      merchants: -100,
      guards: -150,
      nobles: -80,
      peasants: -30,
      wildlings: 20
    },
    values: ["freedom", "wealth", "strength", "chaos"],
    traitPreferences: {
      aggressive: 0.4,
      treacherous: 0.3,
      greedy: 0.5
    }
  },
  
  guards: {
    tags: ["civilization", "order"],
    relations: {
      merchants: 50,
      bandits: -150,
      nobles: 80,
      peasants: 20,
      wildlings: -40
    },
    values: ["order", "justice", "safety", "honor"],
    traitPreferences: {
      brave: 0.4,
      loyal: 0.6,
      aggressive: 0.2
    }
  },
  
  nobles: {
    tags: ["civilization", "power"],
    relations: {
      merchants: 30,
      bandits: -80,
      guards: 80,
      peasants: -10,
      wildlings: -60
    },
    values: ["power", "reputation", "tradition", "wealth"],
    traitPreferences: {
      proud: 0.6,
      greedy: 0.3,
      gossipy: 0.3
    }
  },
  
  peasants: {
    tags: ["civilization", "common"],
    relations: {
      merchants: 10,
      bandits: -30,
      guards: 20,
      nobles: -10,
      wildlings: 0
    },
    values: ["safety", "community", "tradition", "survival"],
    traitPreferences: {
      humble: 0.4,
      gossipy: 0.5,
      peaceful: 0.3
    }
  },
  
  wildlings: {
    tags: ["nature", "freedom"],
    relations: {
      merchants: -20,
      bandits: 20,
      guards: -40,
      nobles: -60,
      peasants: 0
    },
    values: ["freedom", "nature", "strength", "spirits"],
    traitPreferences: {
      brave: 0.3,
      aggressive: 0.2,
      secretive: 0.4
    }
  }
};

// Get relationship between two factions
export function getFactionRelation(faction1, faction2) {
  if (faction1 === faction2) return 100;
  return Factions[faction1]?.relations?.[faction2] || 0;
}

// Check if factions are allied (positive relation)
export function areFactionsAllied(faction1, faction2) {
  return getFactionRelation(faction1, faction2) > 0;
}

// Check if factions are hostile (negative relation)
// Now accepts optional entities to check for disguises
export function areFactionsHostile(faction1, faction2, entity1 = null, entity2 = null) {
  // Check for disguise - if entity1 (usually player) is wearing a disguise
  if (entity1?.armor?.disguise) {
    const disguiseFaction = entity1.armor.disguise;
    console.log(`🎭 [DISGUISE] Entity wearing ${disguiseFaction} disguise`);
    
    // If wearing Banana Guard uniform and interacting with guards, no hostility
    if (disguiseFaction === 'banana_guard' && faction2 === 'guards') {
      console.log(`🎭 [DISGUISE] Banana Guard disguise prevents guard hostility!`);
      return false;
    }
    
    // Could add more disguise types here
    // e.g., if (disguiseFaction === 'bandit' && faction2 === 'bandits') return false;
  }
  
  // Normal hostility check
  return getFactionRelation(faction1, faction2) < -50;
}