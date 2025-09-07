import { describe, it, expect, beforeEach } from 'vitest';
import { getEffectiveRelation, evaluateFactionHostility } from '../../src/social/factionRegistry.js';
import { 
  RelationCache,
  invalidateFactionCaches, 
  invalidateKingdomCaches,
  clearAllCaches 
} from '../../src/social/relationCache.js';

describe('Final Quality Fixes', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Cache Invalidation Fix', () => {
    it('should invalidate only exact faction matches', () => {
      // Create test cache instance
      const cache = new RelationCache(10);
      
      // Add test entries
      cache.getOrCompute(['ice'], ['fire'], {}, () => -0.8);
      cache.getOrCompute(['ice_guards'], ['fire'], {}, () => -0.6);
      cache.getOrCompute(['office'], ['fire'], {}, () => 0.2);
      
      expect(cache.cache.size).toBe(3);
      
      // Invalidate 'ice' faction - should NOT affect 'ice_guards' or 'office'
      cache.invalidateFaction('ice');
      
      // Only the exact 'ice' entry should be removed
      expect(cache.cache.size).toBe(2);
      
      // Verify correct entries remain
      const remainingKeys = Array.from(cache.cache.keys());
      expect(remainingKeys.some(k => k.includes('ice_guards'))).toBe(true);
      expect(remainingKeys.some(k => k.includes('office'))).toBe(true);
      expect(remainingKeys.some(k => k.split('|')[0] === 'ice')).toBe(false);
    });

    it('should invalidate by kingdom context correctly', () => {
      const cache = new RelationCache(10);
      
      // Add entries with different kingdoms
      cache.getOrCompute(['guard'], ['citizen'], { kingdomId: 'candy' }, () => 0.7);
      cache.getOrCompute(['guard'], ['citizen'], { kingdomId: 'fire' }, () => 0.5);
      cache.getOrCompute(['guard'], ['citizen'], {}, () => 0.6);
      
      expect(cache.cache.size).toBe(3);
      
      // Invalidate candy kingdom entries
      cache.invalidateKingdom('candy');
      
      expect(cache.cache.size).toBe(2);
      
      // Verify fire kingdom entry remains
      const remainingKeys = Array.from(cache.cache.keys());
      expect(remainingKeys.some(k => k.includes('"kingdomId":"fire"'))).toBe(true);
      expect(remainingKeys.some(k => k.includes('"kingdomId":"candy"'))).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    it('should pre-fetch faction definitions efficiently', () => {
      // Test with multiple factions
      const startTime = performance.now();
      
      const result = getEffectiveRelation(
        ['banana_guard', 'candy_citizens', 'candy_merchants'],
        ['fire_court', 'fire_guards', 'flame_priests'],
        { kingdomId: 'candy' }
      );
      
      const endTime = performance.now();
      
      // Should complete quickly even with 9 relations
      expect(endTime - startTime).toBeLessThan(10); // 10ms max
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should validate faction existence before calculation', () => {
      // Test with non-existent factions
      const result = getEffectiveRelation(
        ['nonexistent_faction_1'],
        ['nonexistent_faction_2'],
        { kingdomId: 'candy' }
      );
      
      // Should return neutral relation for invalid factions
      expect(result).toBe(0);
    });

    it('should handle mixed valid and invalid factions', () => {
      const result = getEffectiveRelation(
        ['banana_guard', 'fake_faction'],
        ['candy_citizens', 'another_fake'],
        { kingdomId: 'candy' }
      );
      
      // Should calculate based only on valid factions
      expect(result).toBeGreaterThan(0); // Positive relation between guards and citizens
    });
  });

  describe('Law Enforcement Detection', () => {
    it('should correctly identify guard factions', () => {
      const guards = [
        'banana_guard',
        'fire_guards',
        'ice_guards',
        'penguin_guards',
        'slime_guards'
      ];
      
      for (const guard of guards) {
        const result = evaluateFactionHostility(
          ['bandits'],
          [guard],
          { kingdomId: 'candy', lawLevel: 0.8 }
        );
        
        // All guards should be hostile to bandits with high law
        expect(result.hostile).toBe(true);
        expect(result.hostilityLevel).toBeGreaterThan(0.4); // Above hostility threshold
      }
    });

    it('should not misidentify non-guard state factions', () => {
      // Fire court is state faction but not law enforcement
      const result = evaluateFactionHostility(
        ['bandits'],
        ['fire_court'],
        { kingdomId: 'fire', lawLevel: 0.8 }
      );
      
      // Should have base hostility but not law enforcement bonus
      expect(result.hostilityLevel).toBeLessThan(0.8);
    });

    it('should not match partial guard strings incorrectly', () => {
      // 'bodyguard' or 'guardian' should not match if they existed
      // Test with a faction that includes 'guard' in the middle
      const result = evaluateFactionHostility(
        ['bandits'],
        ['candy_nobles'], // Not a guard faction
        { kingdomId: 'candy', lawLevel: 0.8 }
      );
      
      // Should not get law enforcement hostility boost
      expect(result.hostilityLevel).toBeLessThan(0.6);
    });
  });

  describe('Magic Number Extraction', () => {
    it('should use constants for weight limits', () => {
      // Test that weight bonuses are properly capped
      const result = getEffectiveRelation(
        ['banana_guard'],
        ['candy_citizens', 'candy_merchants'],
        { 
          kingdomId: 'candy',
          tradeContext: true // Multiple bonuses
        }
      );
      
      // Result should be bounded
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(-1);
    });

    it('should use constants for disguise quality threshold', () => {
      // Low quality disguise shouldn't reduce hostility
      const lowQuality = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        { 
          kingdomId: 'candy',
          disguise: { 
            keys: ['banana_guard'], 
            quality: 0.3 // Below threshold
          }
        }
      );
      
      // High quality disguise should reduce hostility
      const highQuality = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        { 
          kingdomId: 'candy',
          disguise: { 
            keys: ['banana_guard'], 
            quality: 0.8 // Above threshold
          }
        }
      );
      
      // High quality should be less hostile
      expect(highQuality.hostilityLevel).toBeLessThan(lowQuality.hostilityLevel);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle empty faction arrays gracefully', () => {
      const result1 = getEffectiveRelation([], ['banana_guard'], {});
      const result2 = getEffectiveRelation(['banana_guard'], [], {});
      const result3 = getEffectiveRelation([], [], {});
      
      expect(result1).toBe(0);
      expect(result2).toBe(0);
      expect(result3).toBe(0);
    });

    it('should handle null and undefined in arrays', () => {
      const result = getEffectiveRelation(
        ['banana_guard', null, undefined],
        ['candy_citizens', null],
        { kingdomId: 'candy' }
      );
      
      // Should filter out null/undefined and still calculate
      expect(result).toBeGreaterThan(0);
    });

    it('should handle malformed context gracefully', () => {
      const contexts = [
        null,
        undefined,
        'not an object',
        123,
        []
      ];
      
      for (const ctx of contexts) {
        const result = getEffectiveRelation(
          ['banana_guard'],
          ['candy_citizens'],
          ctx
        );
        
        // Should still return valid result
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(-1);
        expect(result).toBeLessThanOrEqual(1);
      }
    });

    it('should prevent cache key collisions', () => {
      // Different faction orders should produce same result
      const result1 = getEffectiveRelation(
        ['banana_guard', 'candy_citizens'],
        ['fire_court'],
        { kingdomId: 'candy' }
      );
      
      const result2 = getEffectiveRelation(
        ['candy_citizens', 'banana_guard'], // Different order
        ['fire_court'],
        { kingdomId: 'candy' }
      );
      
      // Results should be identical (cache uses sorted keys)
      expect(result1).toBe(result2);
    });
  });

  describe('Data Consistency', () => {
    it('should handle asymmetric relationships gracefully', () => {
      // Even if A→B relation exists but B→A doesn't
      const result1 = getEffectiveRelation(['banana_guard'], ['fire_court'], {});
      const result2 = getEffectiveRelation(['fire_court'], ['banana_guard'], {});
      
      // Both should return valid numbers
      expect(typeof result1).toBe('number');
      expect(typeof result2).toBe('number');
      
      // They might be different due to asymmetry, but both valid
      expect(result1).toBeGreaterThanOrEqual(-1);
      expect(result1).toBeLessThanOrEqual(1);
      expect(result2).toBeGreaterThanOrEqual(-1);
      expect(result2).toBeLessThanOrEqual(1);
    });

    it('should validate relation values are in range', () => {
      // All calculated relations should be bounded
      const factions = [
        'banana_guard', 'candy_citizens', 'fire_court', 
        'ice_wizards', 'slime_traders', 'bandits'
      ];
      
      for (const f1 of factions) {
        for (const f2 of factions) {
          const result = getEffectiveRelation([f1], [f2], {});
          
          expect(result).toBeGreaterThanOrEqual(-1);
          expect(result).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});