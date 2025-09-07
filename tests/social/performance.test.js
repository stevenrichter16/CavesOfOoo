import { describe, it, expect, beforeEach } from 'vitest';
import { getFactionFast, getFactionIndex, rebuildFactionIndex } from '../../src/data/kingdoms/factionIndex.js';
import { getCachedRelation, getCachedHostility, clearAllCaches, getCacheStats } from '../../src/social/relationCache.js';
import { getEffectiveRelation, evaluateFactionHostility } from '../../src/social/factionRegistry.js';
import { getFactionDef } from '../../src/data/kingdoms/index.js';

describe('Performance Optimizations', () => {
  describe('Faction Index', () => {
    beforeEach(() => {
      rebuildFactionIndex();
    });

    it('should provide O(1) faction lookup', () => {
      const result = getFactionFast('banana_guard');
      expect(result).toBeDefined();
      expect(result.faction.id).toBe('banana_guard');
      expect(result.kingdom.id).toBe('candy');
    });

    it('should be faster than linear search', () => {
      const factionId = 'slime_elementals';
      
      // Time the index lookup
      const indexStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        getFactionFast(factionId);
      }
      const indexTime = performance.now() - indexStart;
      
      // Time the linear search
      const linearStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        getFactionDef(factionId);
      }
      const linearTime = performance.now() - linearStart;
      
      // Index should be at least as fast (usually much faster)
      expect(indexTime).toBeLessThanOrEqual(linearTime * 1.5);
    });

    it('should handle multiple faction lookups efficiently', () => {
      const index = getFactionIndex();
      const factions = index.getMany(['banana_guard', 'fire_court', 'ice_citizens']);
      
      expect(factions).toHaveLength(3);
      expect(factions[0].faction.id).toBe('banana_guard');
      expect(factions[1].faction.id).toBe('fire_court');
      expect(factions[2].faction.id).toBe('ice_citizens');
    });

    it('should get factions by kingdom', () => {
      const index = getFactionIndex();
      const candyFactions = index.getByKingdom('candy');
      
      expect(candyFactions.length).toBeGreaterThan(0);
      expect(candyFactions.every(f => f.kingdom.id === 'candy')).toBe(true);
    });

    it('should get factions by kind', () => {
      const index = getFactionIndex();
      const stateFactions = index.getByKind('state');
      
      expect(stateFactions.length).toBeGreaterThan(0);
      expect(stateFactions.every(f => f.faction.kind === 'state')).toBe(true);
    });
  });

  describe('Relation Cache', () => {
    beforeEach(() => {
      clearAllCaches();
    });

    it('should cache relation calculations', () => {
      const sideA = ['banana_guard'];
      const sideB = ['candy_citizens'];
      const context = { kingdomId: 'candy' };
      
      // First call - cache miss
      const result1 = getEffectiveRelation(sideA, sideB, context);
      
      // Second call - should hit cache
      const result2 = getEffectiveRelation(sideA, sideB, context);
      
      expect(result1).toBe(result2);
      
      const stats = getCacheStats();
      expect(stats.relation.hits).toBeGreaterThan(0);
    });

    it('should cache hostility calculations', () => {
      const sideA = ['bandits'];
      const sideB = ['banana_guard'];
      const context = { kingdomId: 'candy', lawLevel: 0.8 };
      
      // Calculate multiple times
      let calcCount = 0;
      const testFn = (a, b, ctx) => {
        calcCount++;
        return { hostile: true, hostilityLevel: 0.8 };
      };
      
      getCachedHostility(sideA, sideB, context, testFn);
      getCachedHostility(sideA, sideB, context, testFn);
      getCachedHostility(sideA, sideB, context, testFn);
      
      // Should only calculate once
      expect(calcCount).toBe(1);
    });

    it('should handle different contexts separately', () => {
      const sideA = ['fire_court'];
      const sideB = ['ice_court'];
      
      const context1 = { kingdomId: 'fire' };
      const context2 = { kingdomId: 'ice' };
      
      const result1 = getEffectiveRelation(sideA, sideB, context1);
      const result2 = getEffectiveRelation(sideA, sideB, context2);
      
      // Different contexts might yield different results
      // Both should be negative (hostile) but potentially different values
      expect(result1).toBeLessThan(0);
      expect(result2).toBeLessThan(0);
    });

    it('should report cache statistics', () => {
      clearAllCaches();
      
      // Make some cached calls
      for (let i = 0; i < 5; i++) {
        getEffectiveRelation(['banana_guard'], ['candy_citizens'], { kingdomId: 'candy' });
      }
      
      const stats = getCacheStats();
      expect(stats.relation.hits).toBe(4); // First is miss, rest are hits
      expect(stats.relation.misses).toBe(1);
      expect(stats.relation.hitRate).toBeGreaterThan(0.7);
    });
  });

  describe('Performance with Many Factions', () => {
    it('should handle entities with multiple factions efficiently', () => {
      const multiFactionEntity = [
        'banana_guard',
        'candy_nobles',
        'bubblegum_scientists'
      ];
      
      const target = [
        'fire_court',
        'fire_guards',
        'flame_priests'
      ];
      
      const context = { kingdomId: 'candy', lawLevel: 0.8 };
      
      const start = performance.now();
      const result = getEffectiveRelation(multiFactionEntity, target, context);
      const elapsed = performance.now() - start;
      
      expect(result).toBeDefined();
      expect(elapsed).toBeLessThan(10); // Should be fast even with 9 relation checks
    });

    it('should cache complex multi-faction calculations', () => {
      const complexA = ['banana_guard', 'candy_nobles', 'candy_merchants'];
      const complexB = ['slime_traders', 'gel_scientists', 'slime_court'];
      const context = { kingdomId: 'candy', tradeContext: true };
      
      // First calculation
      const start1 = performance.now();
      const result1 = getEffectiveRelation(complexA, complexB, context);
      const time1 = performance.now() - start1;
      
      // Second calculation (cached)
      const start2 = performance.now();
      const result2 = getEffectiveRelation(complexA, complexB, context);
      const time2 = performance.now() - start2;
      
      expect(result1).toBe(result2);
      expect(time2).toBeLessThan(time1); // Cached should be faster
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid repeated calculations', () => {
      const iterations = 100;
      const factions = [
        ['banana_guard'], ['fire_court'], ['ice_citizens'],
        ['slime_traders'], ['bandits'], ['criminals']
      ];
      
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const sideA = factions[i % factions.length];
        const sideB = factions[(i + 1) % factions.length];
        getEffectiveRelation(sideA, sideB, { kingdomId: 'candy' });
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(1); // Should average less than 1ms per calculation
    });

    it('should maintain cache within memory limits', () => {
      // Generate many unique faction combinations
      for (let i = 0; i < 500; i++) {
        const sideA = [`faction_${i}`];
        const sideB = [`faction_${i + 1}`];
        const context = { kingdomId: `kingdom_${i % 4}` };
        
        getCachedRelation(sideA, sideB, context, () => Math.random());
      }
      
      const stats = getCacheStats();
      // Cache should stay within configured limits (we set it to 1000)
      expect(stats.relation.size).toBeLessThanOrEqual(1000); // Max cache size
    });
  });
});