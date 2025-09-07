/**
 * Faction Registry - Kingdom-aware faction system
 * Handles multi-faction entities, contextual relations, and hostility checks
 */

import { KINGDOMS, getFactionDef, getKingdomById } from '../data/kingdoms/index.js';
import { getCachedRelation, getCachedHostility } from './relationCache.js';
import { 
  RELATION_WEIGHTS, 
  HOSTILITY_FACTORS, 
  STANDING_IMPACTS,
  STANDING_PROPAGATION,
  DEFAULTS,
  SPECIAL_FACTIONS,
  WEIGHT_LIMITS 
} from './constants.js';

/**
 * Clamp a value between min and max
 * @param {number} v - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Check if a faction is law enforcement
 * @param {Object} faction - Faction definition
 * @returns {boolean} True if law enforcement
 */
function isLawEnforcementFaction(faction) {
  if (!faction) return false;
  
  // Explicit law enforcement check
  if (faction.isLawEnforcement) return true;
  
  // Check if it's a guard faction (ends with guard/guards)
  const guardPattern = /^.*_?guards?$/i;
  if (guardPattern.test(faction.id)) return true;
  
  // Check for state factions with law enforcement values
  if (faction.kind === 'state') {
    const lawValues = ['order', 'law', 'justice', 'protection'];
    if (faction.values?.some(v => lawValues.includes(v))) {
      // But exclude courts and nobility
      if (!faction.id.includes('court') && !faction.id.includes('noble')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get blended relation between two multi-faction entities given context
 * @param {string[]} sideA - Player visible factions (incl. disguise)
 * @param {string[]} sideB - NPC factions
 * @param {{ kingdomId: string, lawLevel?: number, tradeContext?: boolean }} ctx
 * @returns {number} Relation score (-1 to 1)
 */
export function getEffectiveRelation(sideA, sideB, ctx = {}) {
  // Validate inputs
  if (!sideA?.length || !sideB?.length) return DEFAULTS.NEUTRAL_RELATION;
  if (!ctx || typeof ctx !== 'object') ctx = {};
  
  // Try to get from cache
  return getCachedRelation(sideA, sideB, ctx, (a, b, context) => {
    return calculateEffectiveRelation(a, b, context);
  });
}

/**
 * Internal function to calculate relation (uncached)
 */
function calculateEffectiveRelation(sideA, sideB, ctx) {
  let totalScore = 0;
  let totalWeight = 0; // Track total weight for proper weighted average
  
  // Pre-fetch all faction definitions for performance
  const defsA = sideA.map(f => ({ id: f, def: getFactionDef(f) })).filter(item => item.def);
  const defsB = sideB.map(f => ({ id: f, def: getFactionDef(f) })).filter(item => item.def);
  
  // Validate that we have valid factions
  if (defsA.length === 0 || defsB.length === 0) {
    return DEFAULTS.NEUTRAL_RELATION;
  }
  
  for (const itemA of defsA) {
    const defA = itemA.def;
    const factionA = itemA.id;
    
    for (const itemB of defsB) {
      const defB = itemB.def;
      const factionB = itemB.id;
      
      // Check direct relation with null safety
      const directRelation = defA.faction.relations?.[factionB] ?? DEFAULTS.NEUTRAL_RELATION;
      
      // Calculate weight based on context (additive bonuses to prevent compounding)
      let weightBonus = 0;
      
      // Emphasize relations in home kingdom
      if (defA.kingdom.id === ctx.kingdomId) {
        weightBonus += (RELATION_WEIGHTS.HOME_KINGDOM_BONUS - 1); // Add 0.25
      }
      if (defB.kingdom.id === ctx.kingdomId) {
        weightBonus += (RELATION_WEIGHTS.HOME_KINGDOM_BONUS - 1); // Add 0.25
      }
      
      // Trade context boosts merchant relations
      if (ctx.tradeContext) {
        if ((defA.faction.kind === 'guild' && factionA.includes('merchant')) ||
            (defB && defB.faction.kind === 'guild' && factionB.includes('merchant'))) {
          weightBonus += (RELATION_WEIGHTS.TRADE_CONTEXT_BONUS - 1); // Add 0.2
        }
      }
      
      // Cap total weight to prevent extreme values
      const weight = 1 + Math.min(weightBonus, WEIGHT_LIMITS.MAX_BONUS); // Max 1.5x weight
      
      totalScore += directRelation * weight;
      totalWeight += weight; // Accumulate weight for proper average
    }
  }
  
  if (totalWeight === 0) return DEFAULTS.NEUTRAL_RELATION;
  
  // Use weighted average instead of simple average
  let weightedAverage = totalScore / totalWeight;
  
  // Apply kingdom bonus only if both factions are from the same kingdom
  // and we're in that kingdom (this preserves symmetry)
  if (ctx.kingdomId && defsA.length > 0 && defsB.length > 0) {
    const allFromSameKingdom = 
      defsA.every(item => item.def.kingdom.id === ctx.kingdomId) &&
      defsB.every(item => item.def.kingdom.id === ctx.kingdomId);
    
    if (allFromSameKingdom && weightedAverage > 0) {
      // Both sides are in their home kingdom - slightly boost positive relations
      // But don't boost negative or neutral relations
      weightedAverage += 0.05;
    }
  }
  
  return clamp(weightedAverage, -1, 1);
}

/**
 * Evaluate hostility between factions with context
 * @param {string[]} sideA - Faction list A
 * @param {string[]} sideB - Faction list B
 * @param {Object} context - Context including kingdom, law level, disguise
 * @returns {{ hostile: boolean, hostilityLevel: number, reason?: string }}
 */
export function evaluateFactionHostility(sideA, sideB, context) {
  const baseRelation = getEffectiveRelation(sideA, sideB, context);
  let hostilityLevel = -baseRelation; // Convert relation to hostility
  
  // Cache faction definitions at function scope for reuse
  const sideBDefs = sideB.map(f => getFactionDef(f)).filter(Boolean);
  
  // Check for disguise
  if (context.disguise?.keys?.length) {
    const disguiseQuality = context.disguise.quality || DEFAULTS.DEFAULT_DISGUISE_QUALITY;
    
    // Check if any disguise key matches trusted uniforms
    let disguiseApplied = false;
    disguiseCheck: for (const disguiseKey of context.disguise.keys) {
      for (const defB of sideBDefs) {
        if (defB.kingdom.disguiseUniforms?.includes(disguiseKey)) {
          // Disguise reduces hostility but can't make it negative
          hostilityLevel = Math.max(0, hostilityLevel - disguiseQuality);
          disguiseApplied = true;
          break disguiseCheck; // Exit both loops
        }
      }
    }
  }
  
  // Law level affects guard hostility (bidirectional)
  if (context.lawLevel !== undefined) {
    // Check if sideA is law enforcement evaluating sideB
    const sideADefs = sideA.map(f => getFactionDef(f)).filter(Boolean);
    let sideAHasLaw = false;
    let sideBHasLaw = false;
    
    // Check sideA for law enforcement
    for (const def of sideADefs) {
      if (isLawEnforcementFaction(def.faction)) {
        sideAHasLaw = true;
        break;
      }
    }
    
    // Check sideB for law enforcement
    for (const def of sideBDefs) {
      if (isLawEnforcementFaction(def.faction)) {
        sideBHasLaw = true;
        break;
      }
    }
    
    // Check for criminals on either side
    const sideAHasCriminals = sideA.some(f => 
      f === SPECIAL_FACTIONS.BANDITS || 
      f === SPECIAL_FACTIONS.CRIMINALS ||
      f.includes('bandit') || 
      f.includes('criminal')
    );
    
    const sideBHasCriminals = sideB.some(f => 
      f === SPECIAL_FACTIONS.BANDITS || 
      f === SPECIAL_FACTIONS.CRIMINALS ||
      f.includes('bandit') || 
      f.includes('criminal')
    );
    
    // Apply law enforcement hostility only if guards vs criminals
    if ((sideAHasLaw && sideBHasCriminals) || (sideBHasLaw && sideAHasCriminals)) {
      // Base hostility for law enforcement
      hostilityLevel += context.lawLevel * HOSTILITY_FACTORS.LAW_BASE_FACTOR;
      // Extra hostility for criminal detection
      hostilityLevel += context.lawLevel * HOSTILITY_FACTORS.CRIMINAL_LAW_FACTOR;
    }
  }
  
  // Check for taboo violations
  if (context.tabooViolations?.length) {
    for (const factionB of sideB) {
      const defB = getFactionDef(factionB);
      if (defB) {
        for (const taboo of context.tabooViolations) {
          if (defB.faction.taboos?.includes(taboo)) {
            hostilityLevel += HOSTILITY_FACTORS.TABOO_VIOLATION_FACTOR;
          }
        }
      }
    }
  }
  
  // Clamp and determine if hostile
  hostilityLevel = clamp(hostilityLevel, 0, 1);
  const hostile = hostilityLevel > HOSTILITY_FACTORS.HOSTILITY_THRESHOLD;
  
  let reason = null;
  if (hostile) {
    // Check for criminal detection by guards
    const hasLawEnforcement = sideA.some(f => {
      const def = getFactionDef(f);
      return def && isLawEnforcementFaction(def.faction);
    }) || sideB.some(f => {
      const def = getFactionDef(f);
      return def && isLawEnforcementFaction(def.faction);
    });
    
    const hasCriminals = sideA.some(f => f.includes('bandit') || f.includes('criminal')) ||
                        sideB.some(f => f.includes('bandit') || f.includes('criminal'));
    
    if (hasLawEnforcement && hasCriminals && context.lawLevel > 0.5) {
      reason = 'criminal_detection';
    } else if (baseRelation < -0.5) {
      reason = 'faction_conflict';
    } else if (context.tabooViolations?.length) {
      reason = 'taboo_violation';
    } else {
      reason = 'general_hostility';
    }
  }
  
  return {
    hostile,
    hostilityLevel,
    reason
  };
}

/**
 * Get contextual modifier for faction relations
 * @param {string} factionA 
 * @param {string} factionB 
 * @param {Object} context 
 * @returns {number} Modifier to apply to base relation
 */
export function getContextualRelationModifier(factionA, factionB, context) {
  let modifier = 0;
  
  const defA = getFactionDef(factionA);
  const defB = getFactionDef(factionB);
  
  if (!defA || !defB) return 0;
  
  // Home kingdom bonus
  if (defA.kingdom.id === context.kingdomId && defB.kingdom.id === context.kingdomId) {
    modifier += RELATION_WEIGHTS.SAME_KINGDOM_BONUS;
  } else if (defA.kingdom.id !== context.kingdomId && defB.kingdom.id !== context.kingdomId) {
    modifier += RELATION_WEIGHTS.FOREIGN_PENALTY;
  }
  
  // Time of day effects for guards
  if (context.timeOfDay) {
    if (factionA.includes('guard') || factionB.includes('guard')) {
      if (context.timeOfDay === 'night') {
        modifier += RELATION_WEIGHTS.NIGHT_GUARD_PENALTY;
      }
    }
  }
  
  // Alert state effects
  if (context.alertState) {
    if (context.alertState === 'high') {
      if (defA.faction.kind === 'state' || defB.faction.kind === 'state') {
        modifier += RELATION_WEIGHTS.HIGH_ALERT_PENALTY;
      }
    } else if (context.alertState === 'low') {
      modifier += RELATION_WEIGHTS.LOW_ALERT_BONUS;
    }
  }
  
  // Ritual context for cults
  if (context.ritualContext) {
    if (defA.faction.kind === 'cult' || defB.faction.kind === 'cult') {
      modifier += RELATION_WEIGHTS.RITUAL_CULT_BONUS;
    }
  }
  
  return modifier;
}

/**
 * Check if factions are hostile (simplified for backwards compatibility)
 * @param {string} faction1 
 * @param {string} faction2 
 * @param {Object} entity1 - Optional entity for disguise check
 * @param {Object} entity2 - Optional entity
 * @returns {boolean}
 */
export function areFactionsHostile(faction1, faction2, entity1 = null, entity2 = null) {
  // Handle old single-faction format
  const factions1 = Array.isArray(faction1) ? faction1 : [faction1];
  const factions2 = Array.isArray(faction2) ? faction2 : [faction2];
  
  // Build context from entities
  const context = {
    kingdomId: entity1?.kingdomId || entity2?.kingdomId || 'candy',
    lawLevel: 0.5
  };
  
  // Check for disguise on entity1
  if (entity1?.armor?.disguise) {
    context.disguise = {
      keys: [entity1.armor.disguise],
      quality: 0.75
    };
  } else if (entity1?.disguise) {
    context.disguise = entity1.disguise;
  }
  
  const result = evaluateFactionHostility(factions1, factions2, context);
  return result.hostile;
}

/**
 * Get all factions for an entity (including disguises)
 * @param {Object} entity 
 * @returns {string[]} Array of visible factions
 */
export function getVisibleFactions(entity) {
  const factions = [];
  
  // Base factions
  if (entity.factions) {
    factions.push(...entity.factions);
  } else if (entity.faction) {
    factions.push(entity.faction);
  }
  
  // Add disguise factions if convincing
  if (entity.disguise?.keys && entity.disguise.quality > WEIGHT_LIMITS.DISGUISE_QUALITY_THRESHOLD) {
    factions.push(...entity.disguise.keys);
  } else if (entity.armor?.disguise) {
    factions.push(entity.armor.disguise);
  }
  
  return [...new Set(factions)]; // Remove duplicates
}

/**
 * Calculate faction standing change based on action
 * @param {string} actionType 
 * @param {string[]} actorFactions 
 * @param {string[]} targetFactions 
 * @returns {{ faction: string, change: number }[]} Standing changes
 */
export function calculateStandingChanges(actionType, actorFactions, targetFactions) {
  const changes = [];
  
  const impact = STANDING_IMPACTS[actionType] || 0;
  if (impact === 0) return changes;
  
  // Apply changes to all target factions
  for (const faction of targetFactions) {
    changes.push({ faction, change: impact });
    
    // Also affect allied factions (at reduced strength)
    const def = getFactionDef(faction);
    if (def) {
      for (const [alliedFaction, relation] of Object.entries(def.faction.relations)) {
        if (relation > STANDING_PROPAGATION.ALLIANCE_THRESHOLD) {
          changes.push({ 
            faction: alliedFaction, 
            change: impact * STANDING_PROPAGATION.ALLIED_FACTION_MULTIPLIER * relation 
          });
        }
      }
    }
  }
  
  return changes;
}