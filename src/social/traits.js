/**
 * NPCTraits - Personality trait definitions for NPCs
 * Migrated from OLD system with enhancements
 */

export const NPCTraits = {
  // === Core Personality Traits ===
  brave: {
    category: 'personality',
    description: 'Faces danger without hesitation',
    opposes: 'cowardly',
    effects: {
      combatBonus: 2,
      fearResistance: 0.8,
      intimidationResist: 0.5,
      fleeThreshold: -0.3
    },
    tags: ['personality', 'courage'],
    modifiers: {
      intimidationResist: 0.5,
      fleeThreshold: -0.3
    }
  },
  
  cowardly: {
    category: 'personality',
    description: 'Easily frightened and avoids danger',
    opposes: 'brave',
    effects: {
      combatPenalty: -2,
      fearResistance: -0.5,
      fleeThreshold: 0.7,
      intimidationResist: -0.5
    },
    tags: ['personality', 'fear'],
    modifiers: {
      intimidationResist: -0.5,
      fleeThreshold: 0.3
    }
  },
  
  friendly: {
    category: 'personality',
    description: 'Warm and approachable',
    opposes: 'suspicious',
    effects: {
      relationshipBonus: 5,
      trustModifier: 0.3,
      initialDisposition: 10
    },
    tags: ['personality', 'social']
  },
  
  suspicious: {
    category: 'personality',
    description: 'Distrustful of others',
    opposes: 'friendly',
    effects: {
      relationshipPenalty: -5,
      trustModifier: -0.5,
      initialDisposition: -10
    },
    tags: ['personality', 'social']
  },
  
  honest: {
    category: 'personality',
    description: 'Always tells the truth',
    opposes: 'deceptive',
    effects: {
      lieDetection: 0.7,
      trustworthiness: 0.8
    },
    tags: ['personality', 'morality']
  },
  
  deceptive: {
    category: 'personality',
    description: 'Prone to lying and trickery',
    opposes: 'honest',
    effects: {
      lieSuccess: 0.6,
      trustworthiness: -0.5
    },
    tags: ['personality', 'morality']
  },
  
  greedy: {
    category: 'personality',
    description: 'Obsessed with wealth and possessions',
    opposes: 'generous',
    effects: {
      priceModifier: 1.5,
      giftEffectiveness: 2.0,
      bribeResist: -0.5
    },
    tags: ['personality', 'material'],
    influences: ['barterPrices', 'questRewards'],
    modifiers: {
      giftEffectiveness: 2.0,
      bribeResist: -0.5
    }
  },
  
  generous: {
    category: 'personality',
    description: 'Willing to share and help others',
    opposes: 'greedy',
    effects: {
      priceModifier: 0.8,
      giftChance: 0.3,
      shareChance: 0.3,
      giftEffectiveness: 0.5
    },
    tags: ['personality', 'material'],
    modifiers: {
      giftEffectiveness: 0.5,
      shareChance: 0.3
    }
  },
  
  // === Social Traits ===
  gossip: {
    category: 'social',
    description: 'Loves to share information and rumors',
    effects: {
      rumorSpreadChance: 0.8,
      secretKeeping: -0.7,
      informationGathering: 0.5
    },
    tags: ['personality', 'social'],
    spreadsInfo: true
  },
  
  gossipy: {
    category: 'social',
    description: 'Loves to share information and rumors',
    opposes: 'secretive',
    effects: {
      rumorSpreadChance: 0.8,
      secretKeeping: -0.7,
      informationGathering: 0.5
    },
    tags: ['personality', 'social'],
    spreadsInfo: true,
    modifiers: {
      rumorSpreadChance: 0.8,
      secretKeeping: -0.7
    }
  },
  
  secretive: {
    category: 'social',
    description: 'Keeps information to themselves',
    opposes: 'gossipy',
    effects: {
      rumorSpreadChance: 0.1,
      secretKeeping: 0.9
    },
    tags: ['personality', 'social'],
    modifiers: {
      rumorSpreadChance: 0.1,
      secretKeeping: 0.9
    }
  },
  
  talkative: {
    category: 'social',
    description: 'Loves to chat and converse',
    opposes: 'quiet',
    effects: {
      dialogueLength: 1.5,
      conversationChance: 0.8
    },
    tags: ['personality', 'communication']
  },
  
  quiet: {
    category: 'social',
    description: 'Speaks little and listens more',
    opposes: 'talkative',
    effects: {
      dialogueLength: 0.5,
      conversationChance: 0.2
    },
    tags: ['personality', 'communication']
  },
  
  helpful: {
    category: 'social',
    description: 'Always willing to assist others',
    effects: {
      questGiveChance: 0.6,
      assistanceModifier: 0.8
    },
    tags: ['personality', 'altruism']
  },
  
  // === Combat Traits ===
  aggressive: {
    category: 'combat',
    description: 'Quick to violence',
    opposes: 'peaceful',
    effects: {
      attackBonus: 3,
      combatInitiation: 0.3,
      peacefulResolution: -0.5
    },
    tags: ['personality', 'conflict'],
    modifiers: {
      combatInitiation: 0.3,
      peacefulResolution: -0.5
    }
  },
  
  peaceful: {
    category: 'combat',
    description: 'Avoids conflict whenever possible',
    opposes: 'aggressive',
    effects: {
      combatInitiation: -0.3,
      peacefulResolution: 0.5,
      negotiationBonus: 0.4
    },
    tags: ['personality', 'conflict'],
    modifiers: {
      combatInitiation: -0.3,
      peacefulResolution: 0.5
    }
  },
  
  defensive: {
    category: 'combat',
    description: 'Focuses on protection over offense',
    effects: {
      defenseBonus: 3,
      counterChance: 0.4
    },
    tags: ['combat', 'tactical']
  },
  
  // === Loyalty Traits ===
  loyal: {
    category: 'personality',
    description: 'Steadfastly faithful to allies',
    opposes: 'treacherous',
    effects: {
      betrayalResist: 0.9,
      factionLoyalty: 1.5,
      allyBonus: 0.5
    },
    tags: ['personality', 'trust'],
    modifiers: {
      betrayalResist: 0.9,
      factionLoyalty: 1.5
    }
  },
  
  treacherous: {
    category: 'personality',
    description: 'Prone to betrayal',
    opposes: 'loyal',
    effects: {
      betrayalResist: -0.5,
      backstabChance: 0.3,
      trustPenalty: -0.6
    },
    tags: ['personality', 'trust'],
    modifiers: {
      betrayalResist: -0.5,
      backstabChance: 0.3
    }
  },
  
  // === Ego Traits ===
  proud: {
    category: 'personality',
    description: 'Has high self-regard',
    opposes: 'humble',
    effects: {
      insultSensitivity: 2.0,
      praiseEffect: 1.5,
      statusImportance: 0.8
    },
    tags: ['personality', 'ego'],
    modifiers: {
      insultSensitivity: 2.0,
      praiseEffect: 1.5
    }
  },
  
  humble: {
    category: 'personality',
    description: 'Modest and unassuming',
    opposes: 'proud',
    effects: {
      insultSensitivity: 0.5,
      praiseEffect: 0.7,
      statusImportance: -0.3
    },
    tags: ['personality', 'ego'],
    modifiers: {
      insultSensitivity: 0.5,
      praiseEffect: 0.7
    }
  },
  
  // === Intelligence Traits ===
  smart: {
    category: 'personality',
    description: 'Quick-witted and intelligent',
    opposes: 'dumb',
    effects: {
      puzzleSolving: 0.8,
      learningSpeed: 1.5,
      deceptionDetection: 0.6
    },
    tags: ['personality', 'intelligence']
  },
  
  dumb: {
    category: 'personality',
    description: 'Slow to understand',
    opposes: 'smart',
    effects: {
      puzzleSolving: -0.5,
      learningSpeed: 0.5,
      gullibility: 0.7
    },
    tags: ['personality', 'intelligence']
  },
  
  // === Curiosity Traits ===
  curious: {
    category: 'personality',
    description: 'Interested in everything',
    opposes: 'indifferent',
    effects: {
      explorationBonus: 0.5,
      questionFrequency: 1.8,
      knowledgeGain: 0.3
    },
    tags: ['personality', 'interest']
  },
  
  indifferent: {
    category: 'personality',
    description: 'Shows little interest in things',
    opposes: 'curious',
    effects: {
      explorationPenalty: -0.3,
      questionFrequency: 0.3,
      motivationPenalty: -0.4
    },
    tags: ['personality', 'interest']
  },
  
  // === Special/Unique Traits ===
  paranoid: {
    category: 'special',
    description: 'Believes everyone is out to get them',
    effects: {
      trustModifier: -0.8,
      perceptionBonus: 0.5,
      stressLevel: 0.7
    },
    tags: ['special', 'mental']
  },
  
  conspiracy_theorist: {
    category: 'special',
    description: 'Sees hidden plots everywhere',
    effects: {
      rumorBelief: 0.9,
      authorityTrust: -0.7,
      theoryGeneration: 0.8
    },
    tags: ['special', 'mental']
  },
  
  eccentric: {
    category: 'special',
    description: 'Peculiar and unconventional',
    effects: {
      unpredictability: 0.7,
      creativeSolutions: 0.6,
      socialPenalty: -0.2
    },
    tags: ['special', 'personality']
  },
  
  // Additional traits for variety
  playful: {
    category: 'personality',
    description: 'Enjoys games and fun',
    effects: {
      gameParticipation: 0.8,
      moodBonus: 0.3
    },
    tags: ['personality', 'mood']
  },
  
  energetic: {
    category: 'personality',
    description: 'Full of energy and enthusiasm',
    effects: {
      movementSpeed: 0.2,
      actionFrequency: 1.3
    },
    tags: ['personality', 'energy']
  },
  
  shy: {
    category: 'social',
    description: 'Timid and reserved',
    effects: {
      socialInitiation: -0.6,
      crowdDiscomfort: 0.7
    },
    tags: ['social', 'introvert']
  },
  
  creative: {
    category: 'personality',
    description: 'Imaginative and artistic',
    effects: {
      problemSolving: 0.5,
      artisticAppreciation: 0.8
    },
    tags: ['personality', 'creativity']
  },
  
  kind: {
    category: 'personality',
    description: 'Compassionate and caring',
    effects: {
      empathy: 0.8,
      helpfulness: 0.6
    },
    tags: ['personality', 'compassion']
  },
  
  wise: {
    category: 'personality',
    description: 'Experienced and insightful',
    effects: {
      adviceQuality: 0.9,
      decisionMaking: 0.7
    },
    tags: ['personality', 'wisdom']
  },
  
  nostalgic: {
    category: 'personality',
    description: 'Fond of the past',
    effects: {
      storyTelling: 0.8,
      changeResistance: 0.5
    },
    tags: ['personality', 'memory']
  },
  
  storyteller: {
    category: 'social',
    description: 'Loves to tell tales',
    effects: {
      narrativeSkill: 0.9,
      entertainmentValue: 0.7
    },
    tags: ['social', 'entertainment']
  },
  
  // === Monster Traits ===
  territorial: {
    category: 'monster',
    description: 'Defends territory aggressively',
    effects: {
      territoryDefense: 0.8,
      outsiderHostility: 0.6
    },
    tags: ['monster', 'defensive']
  },
  
  hungry: {
    category: 'monster',
    description: 'Driven by hunger',
    effects: {
      foodSeeking: 0.9,
      aggressionWhenHungry: 0.5
    },
    tags: ['monster', 'motivation']
  },
  
  cunning: {
    category: 'monster',
    description: 'Clever and calculating',
    effects: {
      ambushChance: 0.6,
      trapDetection: 0.7
    },
    tags: ['monster', 'intelligence']
  },
  
  brutal: {
    category: 'monster',
    description: 'Exceptionally violent',
    effects: {
      damageBonus: 4,
      mercyChance: -0.9
    },
    tags: ['monster', 'combat']
  },
  
  savage: {
    category: 'monster',
    description: 'Wild and untamed',
    effects: {
      civilizationPenalty: -0.8,
      wildernessBonus: 0.5
    },
    tags: ['monster', 'nature']
  },
  
  predatory: {
    category: 'monster',
    description: 'Natural hunter',
    effects: {
      stalkingBonus: 0.7,
      ambushDamage: 3
    },
    tags: ['monster', 'hunter']
  },
  
  vicious: {
    category: 'monster',
    description: 'Cruel and malicious',
    effects: {
      crueltyBonus: 0.6,
      intimidationBonus: 0.5
    },
    tags: ['monster', 'cruelty']
  }
};

/**
 * Check if two traits are opposed to each other
 */
export function areTraitsOpposed(trait1, trait2) {
  if (!trait1 || !trait2) return false;
  const t1 = NPCTraits[trait1];
  const t2 = NPCTraits[trait2];
  if (!t1 || !t2) return false;
  return t1.opposes === trait2 || t2.opposes === trait1;
}

/**
 * Get the effects of a trait
 */
export function getTraitEffects(trait) {
  const traitDef = NPCTraits[trait];
  return traitDef?.effects || {};
}

/**
 * Get modifier value for a trait (backward compatibility)
 */
export function getTraitModifier(trait, modifierName) {
  const traitDef = NPCTraits[trait];
  // Check both effects and modifiers for backward compatibility
  return traitDef?.effects?.[modifierName] || 
         traitDef?.modifiers?.[modifierName] || 
         0;
}

/**
 * Get all traits in a category
 */
export function getTraitsByCategory(category) {
  return Object.entries(NPCTraits)
    .filter(([_, trait]) => trait.category === category)
    .map(([name, _]) => name);
}

/**
 * Get a random trait avoiding oppositions
 */
export function getRandomTrait(excludeTraits = []) {
  const availableTraits = Object.keys(NPCTraits).filter(trait => {
    // Exclude specified traits
    if (excludeTraits.includes(trait)) return false;
    
    // Exclude traits that oppose existing traits
    for (const existing of excludeTraits) {
      if (areTraitsOpposed(trait, existing)) return false;
    }
    
    return true;
  });
  
  if (availableTraits.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * availableTraits.length);
  return availableTraits[randomIndex];
}

/**
 * Generate a set of compatible traits
 */
export function generateTraitSet(count = 2, category = null) {
  const traits = [];
  const maxAttempts = 50;
  let attempts = 0;
  
  while (traits.length < count && attempts < maxAttempts) {
    attempts++;
    
    let candidateTraits = Object.keys(NPCTraits);
    
    // Filter by category if specified
    if (category) {
      candidateTraits = candidateTraits.filter(t => 
        NPCTraits[t].category === category
      );
    }
    
    // Filter out opposed traits
    candidateTraits = candidateTraits.filter(trait => {
      if (traits.includes(trait)) return false;
      for (const existing of traits) {
        if (areTraitsOpposed(trait, existing)) return false;
      }
      return true;
    });
    
    if (candidateTraits.length === 0) break;
    
    const randomTrait = candidateTraits[
      Math.floor(Math.random() * candidateTraits.length)
    ];
    traits.push(randomTrait);
  }
  
  return traits;
}

// Export for backward compatibility
export default NPCTraits;