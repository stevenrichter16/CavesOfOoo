// src/js/social/traits.js - NPC personality trait definitions

export const NPCTraits = {
  brave: {
    tags: ["personality", "courage"],
    opposes: "cowardly",
    modifiers: {
      intimidationResist: 0.5,
      fleeThreshold: -0.3
    }
  },
  
  cowardly: {
    tags: ["personality", "fear"],
    opposes: "brave",
    modifiers: {
      intimidationResist: -0.5,
      fleeThreshold: 0.3
    }
  },
  
  greedy: {
    tags: ["personality", "material"],
    influences: ["barterPrices", "questRewards"],
    modifiers: {
      giftEffectiveness: 2.0,
      bribeResist: -0.5
    }
  },
  
  generous: {
    tags: ["personality", "material"],
    opposes: "greedy",
    modifiers: {
      giftEffectiveness: 0.5,
      shareChance: 0.3
    }
  },
  
  gossipy: {
    tags: ["personality", "social"],
    spreadsInfo: true,
    modifiers: {
      rumorSpreadChance: 0.8,
      secretKeeping: -0.7
    }
  },
  
  secretive: {
    tags: ["personality", "social"],
    opposes: "gossipy",
    modifiers: {
      rumorSpreadChance: 0.1,
      secretKeeping: 0.9
    }
  },
  
  loyal: {
    tags: ["personality", "trust"],
    modifiers: {
      betrayalResist: 0.9,
      factionLoyalty: 1.5
    }
  },
  
  treacherous: {
    tags: ["personality", "trust"],
    opposes: "loyal",
    modifiers: {
      betrayalResist: -0.5,
      backstabChance: 0.3
    }
  },
  
  proud: {
    tags: ["personality", "ego"],
    modifiers: {
      insultSensitivity: 2.0,
      praiseEffect: 1.5
    }
  },
  
  humble: {
    tags: ["personality", "ego"],
    opposes: "proud",
    modifiers: {
      insultSensitivity: 0.5,
      praiseEffect: 0.7
    }
  },
  
  aggressive: {
    tags: ["personality", "conflict"],
    modifiers: {
      combatInitiation: 0.3,
      peacefulResolution: -0.5
    }
  },
  
  peaceful: {
    tags: ["personality", "conflict"],
    opposes: "aggressive",
    modifiers: {
      combatInitiation: -0.3,
      peacefulResolution: 0.5
    }
  }
};

// Helper to check trait opposition
export function areTraitsOpposed(trait1, trait2) {
  const t1 = NPCTraits[trait1];
  const t2 = NPCTraits[trait2];
  return t1?.opposes === trait2 || t2?.opposes === trait1;
}

// Get modifier value for a trait
export function getTraitModifier(trait, modifierName) {
  return NPCTraits[trait]?.modifiers?.[modifierName] || 0;
}