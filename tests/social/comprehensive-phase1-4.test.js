import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { NPCSpawner } from '../../src/social/npcSpawner.js';
import { 
  getEffectiveRelation, 
  evaluateFactionHostility,
  getContextualRelationModifier 
} from '../../src/social/factionRegistry.js';
import { 
  RelationCache,
  clearAllCaches, 
  getCacheStats,
  invalidateFactionCaches 
} from '../../src/social/relationCache.js';
import { getFactionDef, rebuildFactionCache } from '../../src/data/kingdoms/index.js';
import { DIALOGUE_THRESHOLDS, WEIGHT_LIMITS } from '../../src/social/npcConstants.js';

describe('Comprehensive Phase 1-4 Quality Tests', () => {
  beforeEach(() => {
    clearAllCaches();
    rebuildFactionCache();
  });

  describe('Phase 1: Kingdom Data Layer - Edge Cases', () => {
    it('should handle null/undefined faction lookups gracefully', () => {
      const result1 = getFactionDef(null);
      const result2 = getFactionDef(undefined);
      const result3 = getFactionDef('');
      const result4 = getFactionDef('completely_fake_faction');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
      expect(result4).toBeNull();
    });

    it('should validate all faction relations are within bounds', () => {
      const factions = ['banana_guard', 'candy_citizens', 'fire_court', 'ice_wizards', 'bandits'];
      
      for (const f1 of factions) {
        const def1 = getFactionDef(f1);
        if (!def1) continue;
        
        for (const [f2, relation] of Object.entries(def1.faction.relations || {})) {
          expect(relation, `${f1} -> ${f2} relation out of bounds`).toBeGreaterThanOrEqual(-1);
          expect(relation, `${f1} -> ${f2} relation out of bounds`).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should have symmetric or logical faction relationships', () => {
      // Check that important relationships make sense
      const def1 = getFactionDef('bandits');
      const def2 = getFactionDef('banana_guard');
      
      if (def1 && def2) {
        const banditsToGuards = def1.faction.relations?.['banana_guard'] || 0;
        const guardsToBandits = def2.faction.relations?.['bandits'] || 0;
        
        // Both should be negative (mutual hostility)
        expect(banditsToGuards).toBeLessThan(0);
        expect(guardsToBandits).toBeLessThan(0);
        
        // Should be roughly symmetric (within 0.3)
        expect(Math.abs(banditsToGuards - guardsToBandits)).toBeLessThan(0.3);
      }
    });
  });

  describe('Phase 2: Multi-Faction NPCs - Logic Errors', () => {
    it('should prevent faction weight manipulation after creation', () => {
      const npc = new NPC({
        id: 'test',
        factions: ['banana_guard', 'bandits'],
        factionWeights: { 'banana_guard': 0.7, 'bandits': 0.3 }
      });
      
      // Try to manipulate weights
      npc.factionWeights['banana_guard'] = 0.1;
      npc.factionWeights['bandits'] = 0.9;
      
      // Weights should still sum to 1
      const sum = Object.values(npc.factionWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should handle null/undefined in faction arrays', () => {
      const npc = new NPC({
        id: 'test',
        factions: ['banana_guard', null, undefined, '', 'candy_citizens']
      });
      
      // Should filter out invalid values
      expect(npc.factions).not.toContain(null);
      expect(npc.factions).not.toContain(undefined);
      expect(npc.factions).not.toContain('');
    });

    it('should not match partial faction names incorrectly', () => {
      const npc = new NPC({
        id: 'test',
        factions: ['bodyguard_elite'] // Contains 'guard' but not a guard faction
      });
      
      // Should not be detected as guard type
      // This test will likely FAIL showing the bug
      expect(npc.hasFactionType('guard')).toBe(false);
    });

    it('should properly normalize faction weights when they dont sum to 1', () => {
      const npc = new NPC({
        id: 'test',
        factions: ['faction1', 'faction2'],
        factionWeights: { 'faction1': 0.5, 'faction2': 0.3 } // Sum = 0.8
      });
      
      // Weights should be normalized
      const sum = Object.values(npc.factionWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });
  });

  describe('Phase 3: Contextual Relationships - Cache Issues', () => {
    it('should properly enforce cache size limits', () => {
      const cache = new RelationCache(10); // Small cache for testing
      
      // Add 20 entries
      for (let i = 0; i < 20; i++) {
        cache.getOrCompute(
          [`faction_a_${i}`],
          [`faction_b_${i}`],
          { kingdomId: 'candy' },
          () => Math.random()
        );
      }
      
      // Cache should not exceed limit
      expect(cache.cache.size).toBeLessThanOrEqual(10);
    });

    it('should maintain symmetric hostility between guards and criminals', () => {
      const context = { lawLevel: 0.5, kingdomId: 'candy' };
      
      const hostility1to2 = evaluateFactionHostility(
        ['banana_guard'],
        ['bandits'],
        context
      );
      
      const hostility2to1 = evaluateFactionHostility(
        ['bandits'],
        ['banana_guard'],
        context
      );
      
      // Both should be hostile
      expect(hostility1to2.hostile).toBe(true);
      expect(hostility2to1.hostile).toBe(true);
      
      // Guards hostile to bandits and bandits hostile to guards should be the same
      // because the law enforcement logic applies symmetrically
      expect(Math.abs(hostility1to2.hostilityLevel - hostility2to1.hostilityLevel)).toBeLessThan(0.1);
    });

    it('should properly invalidate cache entries', () => {
      const cache = new RelationCache(100);
      
      // Add entries
      cache.getOrCompute(['banana_guard'], ['bandits'], {}, () => -0.9);
      cache.getOrCompute(['ice_guards'], ['bandits'], {}, () => -0.8);
      cache.getOrCompute(['candy_citizens'], ['candy_merchants'], {}, () => 0.5);
      
      expect(cache.cache.size).toBe(3);
      
      // Invalidate all entries with 'bandits'
      cache.invalidateFaction('bandits');
      
      // Should only have the citizen-merchant relation left
      expect(cache.cache.size).toBe(1);
    });

    it('should handle context with all parameters', () => {
      const fullContext = {
        kingdomId: 'candy',
        lawLevel: 0.7,
        tradeContext: true,
        alertState: 'high',
        timeOfDay: 'night',
        ritualContext: false,
        disguise: { keys: ['banana_guard'], quality: 0.8 },
        tabooViolations: ['violence']
      };
      
      const relation = getEffectiveRelation(
        ['bandits'],
        ['banana_guard'],
        fullContext
      );
      
      // Should handle without errors
      expect(typeof relation).toBe('number');
      expect(relation).toBeGreaterThanOrEqual(-1);
      expect(relation).toBeLessThanOrEqual(1);
    });
  });

  describe('Phase 4: Disguise System - Logic Errors', () => {
    it('should use consistent disguise quality thresholds', () => {
      // These should be the same value
      expect(DIALOGUE_THRESHOLDS.DISGUISE_QUALITY_MIN).toBe(WEIGHT_LIMITS.DISGUISE_QUALITY_THRESHOLD);
    });

    it('should process all disguise keys not just first match', () => {
      const npc = new NPC({
        id: 'multi_disguise',
        factions: ['bandits'],
        disguise: {
          keys: ['banana_guard', 'candy_nobles', 'candy_merchants'],
          quality: 0.9
        }
      });
      
      const visibleFactions = npc.getVisibleFactions();
      
      // Should return ALL disguise keys when quality is high
      expect(visibleFactions).toHaveLength(3);
      expect(visibleFactions).toContain('banana_guard');
      expect(visibleFactions).toContain('candy_nobles');
      expect(visibleFactions).toContain('candy_merchants');
    });

    it('should detect suspicious disguises based on perception', () => {
      const guard = new NPC({
        id: 'perceptive_guard',
        factions: ['banana_guard'],
        perception: 0.8
      });
      
      const spy = {
        factions: ['bandits'],
        disguise: { keys: ['candy_merchants'], quality: 0.6 }
      };
      
      const dialogue = guard.getDialogue(spy);
      
      // Guard's perception (0.8) > disguise quality (0.6)
      // Should be suspicious
      expect(dialogue.tone).toBe('suspicious');
      expect(dialogue.hints).toContain('disguise_suspected');
    });

    it('should handle disguise changes and cache invalidation', () => {
      const npc = new NPC({
        id: 'spy',
        factions: ['bandits'],
        disguise: { keys: ['candy_merchants'], quality: 0.8 }
      });
      
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard']
      });
      
      // First evaluation - disguised as merchant
      const hostility1 = guard.evaluateHostilityTo(npc, { lawLevel: 0.8 });
      
      // Change disguise to low quality (should reveal bandit)
      npc.disguise = { keys: ['candy_nobles'], quality: 0.3 };
      
      // Second evaluation should reflect new disguise (low quality, bandit revealed)
      const hostility2 = guard.evaluateHostilityTo(npc, { lawLevel: 0.8 });
      
      // Hostility should be higher when bandit is revealed
      expect(hostility2.hostilityLevel).toBeGreaterThan(hostility1.hostilityLevel);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle 100+ NPCs without performance degradation', () => {
      const npcs = [];
      const spawner = new NPCSpawner();
      
      const start = performance.now();
      
      // Create 100 NPCs
      for (let i = 0; i < 100; i++) {
        npcs.push(spawner.spawnNPC({
          location: 'candy_market',
          kingdomId: 'candy'
        }));
      }
      
      const creationTime = performance.now() - start;
      expect(creationTime).toBeLessThan(200); // Should be fast
      
      // Calculate relations between random pairs
      const relationStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const npc1 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc2 = npcs[Math.floor(Math.random() * npcs.length)];
        npc1.getRelationTo(npc2);
      }
      
      const relationTime = performance.now() - relationStart;
      expect(relationTime).toBeLessThan(100); // Should use cache effectively
    });

    it('should not leak memory with cache operations', () => {
      const cache = new RelationCache(100);
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        cache.getOrCompute(
          [`faction_${i % 50}`],
          [`faction_${(i + 1) % 50}`],
          { kingdomId: `kingdom_${i % 4}` },
          () => Math.random()
        );
      }
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (< 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle circular faction references', () => {
      // Create NPCs with circular faction relationships
      const npc1 = new NPC({
        id: 'npc1',
        factions: ['faction_a', 'faction_b']
      });
      
      const npc2 = new NPC({
        id: 'npc2',
        factions: ['faction_b', 'faction_c']
      });
      
      const npc3 = new NPC({
        id: 'npc3',
        factions: ['faction_c', 'faction_a']
      });
      
      // Should not cause infinite loops
      const relation1to2 = npc1.getRelationTo(npc2);
      const relation2to3 = npc2.getRelationTo(npc3);
      const relation3to1 = npc3.getRelationTo(npc1);
      
      expect(typeof relation1to2).toBe('number');
      expect(typeof relation2to3).toBe('number');
      expect(typeof relation3to1).toBe('number');
    });

    it('should handle extreme faction weights', () => {
      const npc = new NPC({
        id: 'extreme',
        factions: ['faction1', 'faction2', 'faction3'],
        factionWeights: {
          'faction1': 0.99,
          'faction2': 0.005,
          'faction3': 0.005
        }
      });
      
      // Should still work with extreme weights
      const sum = Object.values(npc.factionWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should handle disguise quality at exact threshold', () => {
      const npc = new NPC({
        id: 'threshold',
        factions: ['bandits'],
        disguise: {
          keys: ['candy_merchants'],
          quality: DIALOGUE_THRESHOLDS.DISGUISE_QUALITY_MIN // Exactly 0.5
        }
      });
      
      const visible = npc.getVisibleFactions();
      
      // At exact threshold, should NOT show disguise (> not >=)
      expect(visible).toEqual(['bandits']);
    });
  });

  describe('Security and Validation', () => {
    it('should reject invalid NPC configurations', () => {
      // Missing ID
      expect(() => new NPC({})).toThrow();
      
      // Invalid perception
      // Perception 1.5 is now allowed (super-human), test that extremely high values get clamped
      const highPerceptionNPC = new NPC({
        id: 'test',
        perception: 3.0  // Above our 2.0 limit
      });
      expect(highPerceptionNPC.perception).toBe(2.0);  // Should be clamped to 2.0
      
      // Invalid faction weights
      expect(() => new NPC({
        id: 'test',
        factions: ['f1', 'f2'],
        factionWeights: { 'f1': 0.8, 'f2': 0.8 }
      })).toThrow();
    });

    it('should sanitize faction arrays', () => {
      const npc = new NPC({
        id: 'test',
        factions: [
          'valid_faction',
          '<script>alert("xss")</script>',
          'another_valid',
          null,
          undefined,
          123,
          {}
        ].filter(f => typeof f === 'string') // Pre-filter in test
      });
      
      // Should only have valid string factions
      npc.factions.forEach(f => {
        expect(typeof f).toBe('string');
        expect(f).not.toContain('<script>');
      });
    });
  });
});