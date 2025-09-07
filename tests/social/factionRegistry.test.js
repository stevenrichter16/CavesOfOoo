import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getEffectiveRelation, 
  evaluateFactionHostility,
  getContextualRelationModifier,
  clamp 
} from '../../src/social/factionRegistry.js';

describe('Faction Registry Upgrade', () => {
  describe('getEffectiveRelation', () => {
    it('should calculate relation between single-faction entities', () => {
      const sideA = ['banana_guard'];
      const sideB = ['fire_court'];
      const context = { kingdomId: 'candy', lawLevel: 0.8 };
      
      const relation = getEffectiveRelation(sideA, sideB, context);
      
      // Banana guards have negative relation with fire court
      expect(relation).toBeLessThan(0);
      expect(relation).toBeGreaterThan(-1);
    });

    it('should handle multi-faction entities', () => {
      const sideA = ['banana_guard', 'candy_merchants'];
      const sideB = ['slime_traders'];
      const context = { kingdomId: 'candy' };
      
      const relation = getEffectiveRelation(sideA, sideB, context);
      
      // Should be average of relations
      expect(relation).toBeGreaterThan(0); // Merchants have positive trade relations
    });

    it('should apply kingdom context weighting', () => {
      const sideA = ['ice_court'];
      const sideB = ['ice_citizens'];
      const contextInIce = { kingdomId: 'ice' };
      const contextInFire = { kingdomId: 'fire' };
      
      const relationInIce = getEffectiveRelation(sideA, sideB, contextInIce);
      const relationInFire = getEffectiveRelation(sideA, sideB, contextInFire);
      
      // Same factions should have better relation in their home kingdom
      expect(relationInIce).toBeGreaterThan(relationInFire);
    });

    it('should handle unknown factions gracefully', () => {
      const sideA = ['unknown_faction'];
      const sideB = ['banana_guard'];
      const context = { kingdomId: 'candy' };
      
      const relation = getEffectiveRelation(sideA, sideB, context);
      
      expect(relation).toBe(0); // Default to neutral
    });

    it('should handle empty faction arrays', () => {
      const sideA = [];
      const sideB = ['banana_guard'];
      const context = { kingdomId: 'candy' };
      
      const relation = getEffectiveRelation(sideA, sideB, context);
      
      expect(relation).toBe(0);
    });

    it('should clamp results between -1 and 1', () => {
      const sideA = ['fire_court', 'fire_guards', 'flame_priests'];
      const sideB = ['ice_court', 'ice_guards', 'ice_wizards'];
      const context = { kingdomId: 'fire' };
      
      const relation = getEffectiveRelation(sideA, sideB, context);
      
      expect(relation).toBeGreaterThanOrEqual(-1);
      expect(relation).toBeLessThanOrEqual(1);
    });
  });

  describe('evaluateFactionHostility', () => {
    it('should detect hostility between enemy factions', () => {
      const result = evaluateFactionHostility(
        ['fire_court'],
        ['ice_court'],
        { kingdomId: 'fire', lawLevel: 0.75 }
      );
      
      expect(result.hostile).toBe(true);
      expect(result.reason).toContain('faction_conflict');
    });

    it('should not be hostile between allied factions', () => {
      const result = evaluateFactionHostility(
        ['candy_merchants'],
        ['slime_traders'],
        { kingdomId: 'candy' }
      );
      
      expect(result.hostile).toBe(false);
    });

    it('should consider law level for guard factions', () => {
      // Test with bandits - guards should be more hostile with higher law
      const criminalHighLaw = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        { kingdomId: 'candy', lawLevel: 0.9 }
      );
      
      const criminalLowLaw = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        { kingdomId: 'candy', lawLevel: 0.1 }
      );
      
      // Both should be hostile to bandits
      expect(criminalHighLaw.hostile).toBe(true);
      expect(criminalLowLaw.hostile).toBe(true);
      
      // Higher law should result in higher hostility
      // Note: May be clamped at 1.0, so check if they're different or both at max
      if (criminalHighLaw.hostilityLevel < 1.0) {
        expect(criminalHighLaw.hostilityLevel).toBeGreaterThan(criminalLowLaw.hostilityLevel);
      } else {
        // If high law is at max, low law should be less
        expect(criminalLowLaw.hostilityLevel).toBeLessThanOrEqual(criminalHighLaw.hostilityLevel);
      }
    });

    it('should handle disguises in hostility check', () => {
      const withoutDisguise = evaluateFactionHostility(
        ['player'],
        ['banana_guard'],
        { kingdomId: 'candy' }
      );
      
      const withDisguise = evaluateFactionHostility(
        ['player'],
        ['banana_guard'],
        { 
          kingdomId: 'candy',
          disguise: { keys: ['banana_guard'], quality: 0.8 }
        }
      );
      
      // Disguise should reduce hostility
      expect(withDisguise.hostile).toBe(false);
    });

    it('should escalate hostility for taboo violations', () => {
      const result = evaluateFactionHostility(
        ['ice_wizards'],  // Uses ice magic
        ['fire_court'],   // Taboo: ice_magic
        { 
          kingdomId: 'fire',
          tabooViolations: ['ice_magic']
        }
      );
      
      expect(result.hostile).toBe(true);
      expect(result.hostilityLevel).toBeGreaterThan(0.8);
    });
  });

  describe('getContextualRelationModifier', () => {
    it('should apply kingdom-specific modifiers', () => {
      const fireModifier = getContextualRelationModifier(
        'fire_court',
        'fire_citizens',
        { kingdomId: 'fire' }
      );
      
      const iceModifier = getContextualRelationModifier(
        'fire_court',
        'fire_citizens',
        { kingdomId: 'ice' }
      );
      
      // Relations should be better in home kingdom
      expect(fireModifier).toBeGreaterThan(iceModifier);
    });

    it('should apply time of day modifiers for guards', () => {
      const dayModifier = getContextualRelationModifier(
        'banana_guard',
        'candy_citizens',
        { kingdomId: 'candy', timeOfDay: 'day' }
      );
      
      const nightModifier = getContextualRelationModifier(
        'banana_guard',
        'candy_citizens',
        { kingdomId: 'candy', timeOfDay: 'night' }
      );
      
      // Guards might be more strict during night
      expect(dayModifier).toBeGreaterThanOrEqual(nightModifier);
    });

    it('should consider alert states', () => {
      const normalModifier = getContextualRelationModifier(
        'banana_guard',
        'candy_merchants',
        { kingdomId: 'candy', alertState: 'normal' }
      );
      
      const alertModifier = getContextualRelationModifier(
        'banana_guard',
        'candy_merchants',
        { kingdomId: 'candy', alertState: 'high' }
      );
      
      // Guards should be more suspicious during alerts
      expect(normalModifier).toBeGreaterThan(alertModifier);
    });
  });

  describe('Multi-faction interactions', () => {
    it('should handle complex multi-faction scenarios', () => {
      // Player with multiple affiliations
      const player = ['candy_citizens', 'candy_merchants'];
      // NPC with multiple roles
      const npc = ['banana_guard', 'candy_nobles'];
      
      const relation = getEffectiveRelation(
        player,
        npc,
        { kingdomId: 'candy' }
      );
      
      // Should be positive (all candy factions)
      expect(relation).toBeGreaterThan(0);
    });

    it('should handle cross-kingdom dual citizens', () => {
      // Rare NPC with dual citizenship
      const dualCitizen = ['candy_citizens', 'slime_citizens'];
      const candyGuard = ['banana_guard'];
      const slimeGuard = ['slime_guards'];
      
      const candyRelation = getEffectiveRelation(
        dualCitizen,
        candyGuard,
        { kingdomId: 'candy' }
      );
      
      const slimeRelation = getEffectiveRelation(
        dualCitizen,
        slimeGuard,
        { kingdomId: 'slime' }
      );
      
      // Both should be somewhat positive
      expect(candyRelation).toBeGreaterThan(0);
      expect(slimeRelation).toBeGreaterThan(0);
    });
  });

  describe('clamp utility', () => {
    it('should clamp values correctly', () => {
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.5, 0, 1)).toBe(0);
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(-2, -1, 1)).toBe(-1);
      expect(clamp(2, -1, 1)).toBe(1);
    });
  });

  describe('Faction-specific behaviors', () => {
    it('should identify merchant factions for trade', () => {
      const candyMerchant = ['candy_merchants'];
      const slimeTrader = ['slime_traders'];
      const context = { kingdomId: 'candy', tradeContext: true };
      
      const relation = getEffectiveRelation(candyMerchant, slimeTrader, context);
      
      // Merchants should have positive trade relations
      expect(relation).toBeGreaterThan(0.5);
    });

    it('should identify guard factions for law enforcement', () => {
      const guards = ['banana_guard', 'fire_guards', 'ice_guards'];
      
      guards.forEach(guard => {
        const result = evaluateFactionHostility(
          ['bandits'],
          [guard],
          { lawLevel: 0.8 }
        );
        
        // All guards should be hostile to bandits
        expect(result.hostile).toBe(true);
      });
    });

    it('should identify cult factions for special interactions', () => {
      const flamePriests = ['flame_priests'];
      const slimeElementals = ['slime_elementals'];
      const context = { kingdomId: 'fire', ritualContext: true };
      
      const relation = getEffectiveRelation(flamePriests, slimeElementals, context);
      
      // Different cults should have complex relations
      expect(Math.abs(relation)).toBeGreaterThan(0); // Not neutral
    });
  });
});