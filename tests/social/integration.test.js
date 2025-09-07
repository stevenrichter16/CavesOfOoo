import { describe, it, expect, beforeEach } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { NPCSpawner } from '../../src/social/npcSpawner.js';
import { getEffectiveRelation, evaluateFactionHostility } from '../../src/social/factionRegistry.js';
import { clearAllCaches, getCacheStats } from '../../src/social/relationCache.js';
import { rebuildFactionCache } from '../../src/data/kingdoms/index.js';

describe('Phase 1-2 Integration Tests', () => {
  beforeEach(() => {
    clearAllCaches();
    rebuildFactionCache();
  });

  describe('Data Flow Integration', () => {
    it('should properly flow context from NPC through to faction registry', () => {
      const guard = new NPC({
        id: 'guard1',
        factions: ['banana_guard'],
        kingdomId: 'candy',
        role: 'guard'
      });

      const merchant = new NPC({
        id: 'merchant1',
        factions: ['candy_merchants', 'slime_traders'],
        kingdomId: 'candy',
        role: 'merchant'
      });

      // Test with additional context
      const relation = guard.getRelationTo(merchant, {
        timeOfDay: 'night',
        alertState: 'high'
      });

      expect(typeof relation).toBe('number');
      expect(relation).toBeGreaterThanOrEqual(-1);
      expect(relation).toBeLessThanOrEqual(1);
    });

    it('should handle multi-faction NPCs with proper weight calculations', () => {
      const doubleAgent = new NPC({
        id: 'spy',
        factions: ['banana_guard', 'ice_spies', 'bandits'],
        factionWeights: {
          'banana_guard': 0.5,
          'ice_spies': 0.3,
          'bandits': 0.2
        },
        kingdomId: 'candy'
      });

      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens'],
        kingdomId: 'candy'
      });

      const relation = doubleAgent.getRelationTo(citizen);
      
      // Should be weighted average of all faction relations
      expect(typeof relation).toBe('number');
      // Guard-citizen is positive, spy-citizen neutral, bandit-citizen negative
      // Weighted toward guard faction (0.5 weight)
      expect(relation).toBeGreaterThan(0);
    });

    it('should properly handle disguise data structures', () => {
      const bandit = new NPC({
        id: 'bandit1',
        factions: ['bandits'],
        disguise: {
          keys: ['candy_merchants'],
          quality: 0.8
        }
      });

      const guard = new NPC({
        id: 'guard1',
        factions: ['banana_guard'],
        kingdomId: 'candy',
        perception: 0.6
      });

      // Disguise should affect hostility
      const hostility = guard.evaluateHostilityTo(bandit, { lawLevel: 0.7 });
      
      // High quality disguise should reduce hostility
      expect(hostility.hostilityLevel).toBeLessThan(0.5);
    });
  });

  describe('Cache Integration', () => {
    it('should efficiently cache faction lookups', () => {
      const npc1 = new NPC({
        id: 'npc1',
        factions: ['banana_guard', 'candy_citizens'],
        kingdomId: 'candy'
      });

      const npc2 = new NPC({
        id: 'npc2',
        factions: ['candy_merchants'],
        kingdomId: 'candy'
      });

      // First call - cache miss
      const relation1 = npc1.getRelationTo(npc2);
      const stats1 = getCacheStats();
      const initialMisses = stats1.relation.misses;

      // Second call - should be cached
      const relation2 = npc1.getRelationTo(npc2);
      const stats2 = getCacheStats();
      
      expect(relation2).toBe(relation1); // Same result
      expect(stats2.relation.hits).toBeGreaterThan(stats1.relation.hits);
      expect(stats2.relation.misses).toBe(initialMisses); // No new misses
    });

    it('should handle cache with many NPCs', () => {
      const spawner = new NPCSpawner();
      const npcs = [];
      
      // Create 20 NPCs
      for (let i = 0; i < 20; i++) {
        npcs.push(spawner.spawnNPC({
          location: 'candy_market',
          kingdomId: 'candy'
        }));
      }

      // Calculate relations between all pairs (190 combinations)
      const relations = [];
      for (let i = 0; i < npcs.length; i++) {
        for (let j = i + 1; j < npcs.length; j++) {
          relations.push(npcs[i].getRelationTo(npcs[j]));
        }
      }

      const stats = getCacheStats();
      
      // Should have good cache usage
      expect(stats.relation.size).toBeGreaterThan(0);
      expect(stats.relation.hitRate).toBeGreaterThan(0); // Some cache hits from repeated faction combos
    });
  });

  describe('Bidirectional Hostility', () => {
    it('should have symmetric hostility between guards', () => {
      const guard1 = new NPC({
        id: 'guard1',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      const guard2 = new NPC({
        id: 'guard2',
        factions: ['fire_guards'],
        kingdomId: 'fire'
      });

      const context = { lawLevel: 0.5 };
      
      const hostility1to2 = evaluateFactionHostility(
        guard1.factions,
        guard2.factions,
        context
      );
      
      const hostility2to1 = evaluateFactionHostility(
        guard2.factions,
        guard1.factions,
        context
      );

      // Both directions should have similar hostility (within 0.25)
      // Some asymmetry is expected as different kingdoms have different relations
      expect(Math.abs(hostility1to2.hostilityLevel - hostility2to1.hostilityLevel)).toBeLessThan(0.25);
    });

    it('should detect criminals from both directions', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      const bandit = new NPC({
        id: 'bandit',
        factions: ['bandits']
      });

      const context = { lawLevel: 0.8, kingdomId: 'candy' };

      // Guard evaluating bandit
      const guardToBandit = evaluateFactionHostility(
        guard.factions,
        bandit.factions,
        context
      );

      // Bandit evaluating guard
      const banditToGuard = evaluateFactionHostility(
        bandit.factions,
        guard.factions,
        context
      );

      // Both should be hostile
      expect(guardToBandit.hostile).toBe(true);
      expect(banditToGuard.hostile).toBe(true);
      
      // Both should detect criminal interaction
      expect(guardToBandit.reason).toContain('criminal');
      expect(banditToGuard.reason).toContain('criminal');
    });
  });

  describe('Spawner Integration', () => {
    it('should spawn NPCs with valid factions from Phase 1', () => {
      const spawner = new NPCSpawner();
      
      const locations = ['candy_castle', 'fire_temple', 'ice_palace', 'slime_underground'];
      
      for (const location of locations) {
        const npc = spawner.spawnNPC({
          location,
          kingdomId: location.split('_')[0] // Extract kingdom from location
        });
        
        expect(npc).toBeDefined();
        expect(npc.factions.length).toBeGreaterThan(0);
        
        // All factions should be valid in Phase 1 system
        for (const faction of npc.factions) {
          const relation = getEffectiveRelation([faction], [faction], {});
          expect(relation).toBe(0); // Faction to itself should be neutral
        }
      }
    });

    it('should create NPCs that work with Phase 1 hostility system', () => {
      const spawner = new NPCSpawner();
      
      const npc1 = spawner.spawnNPC({
        location: 'candy_market',
        kingdomId: 'candy'
      });
      
      const npc2 = spawner.spawnNPC({
        location: 'wilderness',
        kingdomId: null
      });
      
      // Should be able to evaluate hostility
      const hostility = npc1.evaluateHostilityTo(npc2, { lawLevel: 0.5 });
      
      expect(hostility).toBeDefined();
      expect(typeof hostility.hostile).toBe('boolean');
      expect(typeof hostility.hostilityLevel).toBe('number');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle 100 NPCs efficiently', () => {
      const spawner = new NPCSpawner();
      const npcs = [];
      
      const startTime = performance.now();
      
      // Create 100 NPCs
      for (let i = 0; i < 100; i++) {
        npcs.push(spawner.spawnNPC({
          location: 'candy_market',
          kingdomId: 'candy'
        }));
      }
      
      const creationTime = performance.now() - startTime;
      
      // Should create 100 NPCs in reasonable time
      expect(creationTime).toBeLessThan(100); // Less than 100ms
      
      // Calculate some relations
      const relationStart = performance.now();
      const sampleRelations = [];
      
      // Sample 100 random pairs
      for (let i = 0; i < 100; i++) {
        const npc1 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc2 = npcs[Math.floor(Math.random() * npcs.length)];
        sampleRelations.push(npc1.getRelationTo(npc2));
      }
      
      const relationTime = performance.now() - relationStart;
      
      // Should calculate 100 relations quickly with caching
      expect(relationTime).toBeLessThan(50); // Less than 50ms
    });

    it('should have good cache hit rates with repeated calculations', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });
      
      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens'],
        kingdomId: 'candy'
      });
      
      clearAllCaches();
      
      // Calculate same relation 10 times
      for (let i = 0; i < 10; i++) {
        guard.getRelationTo(citizen);
      }
      
      const stats = getCacheStats();
      
      // Should have 1 miss and 9 hits
      expect(stats.relation.hits).toBe(9);
      expect(stats.relation.misses).toBe(1);
      expect(stats.relation.hitRate).toBeGreaterThan(0.85);
    });
  });

  describe('Edge Cases', () => {
    it('should handle NPCs with 5+ factions', () => {
      const complexNPC = new NPC({
        id: 'complex',
        factions: [
          'banana_guard',
          'candy_citizens', 
          'candy_merchants',
          'candy_nobles',
          'bandits'
        ],
        factionWeights: {
          'banana_guard': 0.3,
          'candy_citizens': 0.2,
          'candy_merchants': 0.2,
          'candy_nobles': 0.2,
          'bandits': 0.1
        },
        kingdomId: 'candy'
      });
      
      const simple = new NPC({
        id: 'simple',
        factions: ['fire_court'],
        kingdomId: 'fire'
      });
      
      const relation = complexNPC.getRelationTo(simple);
      const hostility = complexNPC.evaluateHostilityTo(simple, { lawLevel: 0.5 });
      
      expect(typeof relation).toBe('number');
      expect(relation).toBeGreaterThanOrEqual(-1);
      expect(relation).toBeLessThanOrEqual(1);
      expect(hostility).toBeDefined();
    });

    it('should handle NPCs with no factions gracefully', () => {
      const emptyNPC = new NPC({
        id: 'empty',
        factions: [],
        kingdomId: 'candy'
      });
      
      const normal = new NPC({
        id: 'normal',
        factions: ['candy_citizens'],
        kingdomId: 'candy'
      });
      
      const relation = emptyNPC.getRelationTo(normal);
      const hostility = emptyNPC.evaluateHostilityTo(normal);
      
      expect(relation).toBe(0); // Neutral
      expect(hostility.hostile).toBe(false);
    });

    it('should handle invalid faction IDs gracefully', () => {
      const invalid = new NPC({
        id: 'invalid',
        factions: ['completely_fake_faction', 'another_fake'],
        kingdomId: 'candy'
      });
      
      const valid = new NPC({
        id: 'valid',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });
      
      const relation = invalid.getRelationTo(valid);
      const hostility = invalid.evaluateHostilityTo(valid);
      
      expect(relation).toBe(0); // Should default to neutral
      expect(hostility).toBeDefined();
    });
  });
});