import { describe, it, expect, beforeEach } from 'vitest';
import { getEffectiveRelation, evaluateFactionHostility } from '../../src/social/factionRegistry.js';
import { getCachedRelation, clearAllCaches } from '../../src/social/relationCache.js';

describe('Logic Error Fixes', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Weight Compounding Fix', () => {
    it('should not compound weights multiplicatively', () => {
      // Test with multiple factions to see weight effects
      // When there are multiple relations, weights affect the average
      const baseResult = getEffectiveRelation(
        ['banana_guard'],
        ['candy_citizens', 'fire_court'], // Mix of home and foreign
        {} // No kingdom context
      );
      
      const boostedResult = getEffectiveRelation(
        ['banana_guard'],
        ['candy_citizens', 'fire_court'], // Mix of home and foreign
        { kingdomId: 'candy' } // In candy kingdom
      );
      
      // The relation to candy_citizens should be weighted more heavily
      // when in candy kingdom, improving the overall average
      expect(boostedResult).toBeGreaterThan(baseResult);
      // But not excessively (relations capped at -1 to 1)
      expect(boostedResult).toBeLessThanOrEqual(1);
      expect(boostedResult).toBeGreaterThanOrEqual(-1);
    });

    it('should use additive bonuses up to cap', () => {
      // Get base relation first
      const baseRelation = getEffectiveRelation(
        ['candy_merchants'],
        ['slime_traders'],
        {} // No bonuses
      );
      
      const homeBonus = getEffectiveRelation(
        ['candy_merchants'],
        ['slime_traders'],
        { kingdomId: 'candy' }
      );
      
      const tradeBonus = getEffectiveRelation(
        ['candy_merchants'],
        ['slime_traders'],
        { tradeContext: true }
      );
      
      const bothBonuses = getEffectiveRelation(
        ['candy_merchants'],
        ['slime_traders'],
        { kingdomId: 'candy', tradeContext: true }
      );
      
      // Each bonus should increase the value
      expect(homeBonus).toBeGreaterThanOrEqual(baseRelation);
      expect(tradeBonus).toBeGreaterThanOrEqual(baseRelation);
      expect(bothBonuses).toBeGreaterThanOrEqual(Math.max(homeBonus, tradeBonus));
      
      // But total should be capped
      expect(bothBonuses).toBeLessThanOrEqual(1);
    });
  });

  describe('Disguise Negative Hostility Fix', () => {
    it('should not allow disguise to create negative hostility', () => {
      // Start with slightly positive hostility
      const result = evaluateFactionHostility(
        ['player'],
        ['banana_guard'],
        { 
          kingdomId: 'candy',
          disguise: { 
            keys: ['banana_guard'], 
            quality: 0.9 // High quality disguise
          }
        }
      );
      
      // Hostility should be reduced but never negative
      expect(result.hostilityLevel).toBeGreaterThanOrEqual(0);
      expect(result.hostile).toBe(false);
    });

    it('should only apply disguise reduction once', () => {
      // Multiple matching disguises shouldn't stack
      const result = evaluateFactionHostility(
        ['player'],
        ['banana_guard'],
        { 
          kingdomId: 'candy',
          disguise: { 
            keys: ['banana_guard', 'candy_court', 'candy_citizen'], 
            quality: 0.5
          }
        }
      );
      
      // Should only reduce once even with multiple matching keys
      expect(result.hostilityLevel).toBeGreaterThanOrEqual(0);
      expect(result.hostilityLevel).toBeLessThan(1);
    });
  });

  describe('Cache Key Completeness', () => {
    it('should differentiate cache entries with different disguises', () => {
      // Use real factions that have negative relation
      const sideA = ['bandits']; // Hostile to guards
      const sideB = ['banana_guard'];
      const baseContext = { kingdomId: 'candy', lawLevel: 0.5 };
      
      // Test hostility where disguise makes a clear difference
      const hostileWithout = evaluateFactionHostility(sideA, sideB, baseContext);
      const hostileWith = evaluateFactionHostility(sideA, sideB, {
        ...baseContext,
        disguise: { keys: ['banana_guard'], quality: 0.8 }
      });
      
      // Disguise should reduce hostility
      expect(hostileWithout.hostile).toBe(true); // Bandits hostile to guards
      expect(hostileWith.hostilityLevel).toBeLessThan(hostileWithout.hostilityLevel);
      
      // Verify cache is working by calling again
      const hostileWithAgain = evaluateFactionHostility(sideA, sideB, {
        ...baseContext,
        disguise: { keys: ['banana_guard'], quality: 0.8 }
      });
      
      expect(hostileWithAgain.hostilityLevel).toBe(hostileWith.hostilityLevel);
    });

    it('should cache taboo violations separately', () => {
      const result1 = evaluateFactionHostility(
        ['ice_wizards'],
        ['fire_court'],
        { kingdomId: 'fire' }
      );
      
      const result2 = evaluateFactionHostility(
        ['ice_wizards'],
        ['fire_court'],
        { 
          kingdomId: 'fire',
          tabooViolations: ['ice_magic']
        }
      );
      
      // Taboo violation should increase hostility
      expect(result2.hostilityLevel).toBeGreaterThan(result1.hostilityLevel);
    });
  });

  describe('Weighted Average Fix', () => {
    it('should calculate proper weighted average', () => {
      // Multiple factions with different weights
      const result = getEffectiveRelation(
        ['banana_guard', 'candy_merchants'],
        ['slime_traders'],
        { kingdomId: 'candy', tradeContext: true }
      );
      
      // Should be a weighted average, not simple average
      expect(result).toBeGreaterThan(0); // Positive relations
      expect(result).toBeLessThan(1); // But not over 1
    });

    it('should handle zero total weight gracefully', () => {
      // Edge case: no valid factions
      const result = getEffectiveRelation(
        ['nonexistent_faction'],
        ['another_fake'],
        { kingdomId: 'candy' }
      );
      
      expect(result).toBe(0); // Should return neutral
    });
  });

  describe('Law Enforcement Detection', () => {
    it('should detect guards by role not just name', () => {
      // All guard types should be detected
      const guards = ['banana_guard', 'fire_guards', 'ice_guards', 'penguin_guards'];
      
      for (const guard of guards) {
        const result = evaluateFactionHostility(
          ['bandits'],
          [guard],
          { kingdomId: 'candy', lawLevel: 0.8 }
        );
        
        expect(result.hostile).toBe(true);
        expect(result.hostilityLevel).toBeGreaterThan(0.5);
      }
    });

    it('should not apply law bonus multiple times for multiple guards', () => {
      const singleGuard = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        { kingdomId: 'candy', lawLevel: 0.8 }
      );
      
      const multipleGuards = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard', 'fire_guards', 'ice_guards'],
        { kingdomId: 'candy', lawLevel: 0.8 }
      );
      
      // Law bonus should only apply once
      // With the break statement, multiple guards shouldn't compound
      expect(multipleGuards.hostilityLevel).toBeCloseTo(singleGuard.hostilityLevel, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty faction arrays', () => {
      const result = getEffectiveRelation([], [], { kingdomId: 'candy' });
      expect(result).toBe(0);
    });

    it('should handle duplicate factions in arrays', () => {
      const result = getEffectiveRelation(
        ['banana_guard', 'banana_guard'], // Duplicates
        ['candy_citizens'],
        { kingdomId: 'candy' }
      );
      
      // Should handle duplicates gracefully
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle very high law levels', () => {
      const result = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        { kingdomId: 'candy', lawLevel: 10 } // Extreme value
      );
      
      // Should still be clamped at 1
      expect(result.hostilityLevel).toBe(1);
    });

    it('should handle negative relations correctly', () => {
      const result = getEffectiveRelation(
        ['fire_court'],
        ['ice_court'],
        { kingdomId: 'fire' }
      );
      
      // Fire and Ice are enemies
      expect(result).toBeLessThan(0);
      expect(result).toBeGreaterThanOrEqual(-1);
    });
  });
});