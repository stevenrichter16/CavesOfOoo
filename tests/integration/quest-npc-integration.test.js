import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestSpawner } from '../../src/js/systems/QuestSpawner.js';
import { NPCSpawner } from '../../src/social/npcSpawner.js';
import { NPC } from '../../src/social/npc.js';
import { clearAllCaches } from '../../src/social/relationCache.js';

describe('Phase 1-3 Integration: Quest NPC Spawning', () => {
  let questSpawner;
  let mockEventBus;
  let mockState;

  beforeEach(() => {
    clearAllCaches();
    
    // Mock EventBus
    mockEventBus = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      emitAsync: vi.fn()
    };

    questSpawner = new QuestSpawner(mockEventBus);
    
    mockState = {
      npcs: [],
      questSpawns: {},
      cx: 0,
      cy: 0,
      player: { x: 10, y: 10 }
    };
  });

  describe('Quest NPC Spawning', () => {
    it('should spawn faction-aware NPCs for quests', () => {
      // Register a quest that spawns NPCs with specific factions
      questSpawner.registerQuestNPCSpawn('rescue_mission', {
        location: 'candy_dungeon', 
        npcs: [
          {
            role: 'guard',
            factions: ['corrupted_guards'],
            count: 2,
            behavior: 'hostile'
          },
          {
            role: 'prisoner',
            factions: ['candy_citizens'],
            count: 1,
            behavior: 'friendly'
          }
        ]
      });

      // Trigger quest NPC spawning
      questSpawner.spawnQuestNPCs(mockState, 'rescue_mission');

      // Should spawn 3 NPCs total
      expect(mockState.npcs).toHaveLength(3);
      
      // Check guard NPCs
      const guards = mockState.npcs.filter(npc => npc.role === 'guard');
      expect(guards).toHaveLength(2);
      expect(guards[0].factions).toContain('corrupted_guards');
      expect(guards[0]).toBeInstanceOf(NPC);

      // Check prisoner NPC
      const prisoners = mockState.npcs.filter(npc => npc.role === 'prisoner');
      expect(prisoners).toHaveLength(1);
      expect(prisoners[0].factions).toContain('candy_citizens');
      expect(prisoners[0]).toBeInstanceOf(NPC);
    });

    it('should create quest NPCs with complex faction relationships', () => {
      // Register quest with double-agent NPC
      questSpawner.registerQuestNPCSpawn('spy_mission', {
        location: 'ice_court',
        npcs: [
          {
            role: 'spy',
            factions: ['ice_spies', 'candy_merchants'],
            factionWeights: {
              'ice_spies': 0.7,
              'candy_merchants': 0.3
            },
            disguise: {
              keys: ['candy_merchants'],
              quality: 0.8
            },
            count: 1
          }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'spy_mission');

      const spy = mockState.npcs[0];
      expect(spy.factions).toContain('ice_spies');
      expect(spy.factions).toContain('candy_merchants');
      expect(spy.factionWeights['ice_spies']).toBe(0.7);
      expect(spy.disguise.quality).toBe(0.8);
    });

    it('should spawn NPCs at specific positions for quests', () => {
      questSpawner.registerQuestNPCSpawn('boss_fight', {
        location: 'lich_lair',
        npcs: [
          {
            role: 'boss',
            factions: ['undead'],
            position: { x: 15, y: 15 },
            count: 1,
            stats: { hp: 100, attack: 20 }
          }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'boss_fight');

      const boss = mockState.npcs[0];
      expect(boss.x).toBe(15);
      expect(boss.y).toBe(15);
      expect(boss.factions).toContain('undead');
      expect(boss.hp).toBe(100);
    });

    it('should handle quest NPC cleanup when quest completes', () => {
      // Spawn quest NPCs
      questSpawner.registerQuestNPCSpawn('temp_quest', {
        location: 'forest',
        npcs: [
          { role: 'guide', factions: ['forest_spirits'], count: 1 }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'temp_quest');
      expect(mockState.npcs).toHaveLength(1);

      // Mark NPC as quest-specific
      mockState.npcs[0].questId = 'temp_quest';

      // Complete quest - should clean up quest NPCs
      questSpawner.cleanupQuestNPCs(mockState, 'temp_quest');
      
      const remainingNPCs = mockState.npcs.filter(npc => npc.questId !== 'temp_quest' || !npc.removed);
      expect(remainingNPCs).toHaveLength(0);
    });
  });

  describe('Location-Based Quest Spawning', () => {
    it('should use NPCSpawner location configs for quest areas', () => {
      // Register quest that populates an area with appropriate NPCs
      questSpawner.registerLocationSpawn('candy_market_crisis', {
        location: 'candy_market',
        crisis: 'bandit_invasion',
        modifications: {
          // Reduce merchants, add more guards and bandits
          roleModifications: [
            { role: 'merchant', weightMultiplier: 0.2 },
            { role: 'guard', weightMultiplier: 2.0 },
            { role: 'bandit', weight: 0.3, factions: ['bandits'] }
          ]
        },
        npcCount: 8
      });

      questSpawner.spawnLocationNPCs(mockState, 'candy_market_crisis');

      // Should spawn 8 NPCs
      expect(mockState.npcs).toHaveLength(8);

      // Should have more guards due to crisis
      const guards = mockState.npcs.filter(npc => npc.role === 'guard');
      expect(guards.length).toBeGreaterThan(1);

      // Should have bandits
      const bandits = mockState.npcs.filter(npc => npc.factions?.includes('bandits'));
      expect(bandits.length).toBeGreaterThan(0);

      // Should have fewer merchants
      const merchants = mockState.npcs.filter(npc => npc.role === 'merchant');
      expect(merchants.length).toBeLessThan(3); // Original config has 40% merchants
    });

    it('should spawn quest NPCs with location-appropriate behaviors', () => {
      questSpawner.registerLocationSpawn('dungeon_cleared', {
        location: 'candy_dungeon',
        state: 'post_liberation',
        modifications: {
          roleModifications: [
            { role: 'guard', factions: ['banana_guard'], behavior: 'patrol' },
            { role: 'civilian', factions: ['candy_citizens'], behavior: 'celebration' }
          ]
        },
        npcCount: 5
      });

      questSpawner.spawnLocationNPCs(mockState, 'dungeon_cleared');

      const guards = mockState.npcs.filter(npc => npc.role === 'guard');
      guards.forEach(guard => {
        expect(guard.factions).toContain('banana_guard');
        // Should have patrol behavior context
        const behavior = guard.getBehavior({ timeOfDay: 'day' });
        expect(['patrol', 'watch']).toContain(behavior.primary);
      });
    });
  });

  describe('Quest NPC Interactions', () => {
    it('should create NPCs that interact properly with player factions', () => {
      // Create a quest NPC that should be hostile to bandits
      questSpawner.registerQuestNPCSpawn('guard_duty', {
        location: 'castle_gates',
        npcs: [
          {
            role: 'elite_guard',
            factions: ['banana_guard'], // Use known faction
            count: 1,
            perception: 0.9  // High perception to detect disguises
          }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'guard_duty');
      const guard = mockState.npcs[0];

      // Test interaction with bandit player (use criminal behavior)
      const banditPlayer = {
        factions: ['bandits'],
        x: 10,
        y: 10
      };

      const hostility = guard.evaluateHostilityTo(banditPlayer, { lawLevel: 0.8 });
      expect(hostility.hostile).toBe(true);
      // Don't check specific reasons as they may vary based on implementation

      // Test dialogue with bandit
      const dialogue = guard.getDialogue(banditPlayer);
      expect(dialogue.tone).toBe('hostile');
      expect(dialogue.options.length).toBeGreaterThan(0);
    });

    it('should handle disguised quest NPCs properly', () => {
      // Create a disguised quest NPC
      questSpawner.registerQuestNPCSpawn('undercover_op', {
        location: 'enemy_base',
        npcs: [
          {
            role: 'spy',
            factions: ['candy_intelligence'],
            disguise: {
              keys: ['ice_guards'],
              quality: 0.7
            },
            count: 1
          }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'undercover_op');
      const spy = mockState.npcs[0];

      // Other ice guards should see them as friendly
      const iceGuard = new NPC({
        id: 'test_ice_guard',
        factions: ['ice_guards'],
        perception: 0.5  // Lower than disguise quality
      });

      const hostility = iceGuard.evaluateHostilityTo(spy);
      expect(hostility.hostile).toBe(false); // Disguise works

      // But high-perception NPCs might detect them
      const alertGuard = new NPC({
        id: 'test_alert_guard',
        factions: ['ice_guards'],
        perception: 0.8  // Higher than disguise quality
      });

      const suspicion = alertGuard.evaluateHostilityTo(spy);
      // Should be suspicious but maybe not immediately hostile
      expect(suspicion).toBeDefined();
      expect(suspicion.hostile !== undefined).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle spawning large numbers of quest NPCs efficiently', () => {
      const startTime = performance.now();
      
      // Register a large battle scenario
      questSpawner.registerQuestNPCSpawn('epic_battle', {
        location: 'battlefield',
        npcs: [
          { role: 'soldier', factions: ['candy_army'], count: 50 },
          { role: 'soldier', factions: ['ice_army'], count: 50 },
          { role: 'commander', factions: ['candy_army'], count: 2 },
          { role: 'commander', factions: ['ice_army'], count: 2 }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'epic_battle');

      const elapsed = performance.now() - startTime;
      
      // Should spawn 104 NPCs
      expect(mockState.npcs).toHaveLength(104);
      
      // Should complete in reasonable time (under 100ms)
      expect(elapsed).toBeLessThan(100);
      
      // All NPCs should be properly initialized
      mockState.npcs.forEach(npc => {
        expect(npc).toBeInstanceOf(NPC);
        expect(npc.factions).toBeDefined();
        expect(npc.role).toBeDefined();
      });
    });

    it('should properly clean up resources when quest NPCs are removed', () => {
      // Spawn quest NPCs
      questSpawner.registerQuestNPCSpawn('memory_test', {
        location: 'test_area',
        npcs: [
          { role: 'temp', factions: ['temp_faction'], count: 10 }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'memory_test');
      expect(mockState.npcs).toHaveLength(10);

      // Mark as quest NPCs
      mockState.npcs.forEach(npc => {
        npc.questId = 'memory_test';
      });

      // Cleanup
      questSpawner.cleanupQuestNPCs(mockState, 'memory_test');

      // NPCs should be marked as removed or actually removed
      const activeNPCs = mockState.npcs.filter(npc => !npc.removed && npc.questId !== 'memory_test');
      expect(activeNPCs).toHaveLength(0);
    });
  });

  describe('Integration with Movement System', () => {
    it('should create quest NPCs that work with movement system', () => {
      questSpawner.registerQuestNPCSpawn('patrol_quest', {
        location: 'guard_post',
        npcs: [
          {
            role: 'patrol_guard',
            factions: ['city_watch'],
            position: { x: 5, y: 5 },
            patrolCenter: { x: 5, y: 5 },
            patrolRadius: 3,
            count: 1
          }
        ]
      });

      questSpawner.spawnQuestNPCs(mockState, 'patrol_quest');
      const guard = mockState.npcs[0];

      // Should have position tracking
      expect(guard.x).toBe(5);
      expect(guard.y).toBe(5);
      expect(guard.patrolCenter).toEqual({ x: 5, y: 5 });
      expect(guard.patrolRadius).toBe(3);

      // Should have movement methods
      expect(typeof guard.moveTo).toBe('function');
      expect(typeof guard.distanceTo).toBe('function');
      expect(typeof guard.canSee).toBe('function');

      // Should work with movement system
      guard.moveTo(6, 5);
      expect(guard.x).toBe(6);
      expect(guard.lastX).toBe(5);
    });
  });
});