import { describe, it, expect, beforeEach } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { NPCSpawner } from '../../src/social/npcSpawner.js';
import { getEffectiveRelation, evaluateFactionHostility } from '../../src/social/factionRegistry.js';
import { clearAllCaches } from '../../src/social/relationCache.js';

describe('Phase 2: Multi-faction NPC System', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('NPC Class - Basic Structure', () => {
    it('should create NPC with single faction', () => {
      const npc = new NPC({
        id: 'guard_1',
        name: 'Banana Guard Captain',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      expect(npc.id).toBe('guard_1');
      expect(npc.name).toBe('Banana Guard Captain');
      expect(npc.factions).toEqual(['banana_guard']);
      expect(npc.kingdomId).toBe('candy');
    });

    it('should create NPC with multiple factions', () => {
      const npc = new NPC({
        id: 'merchant_spy',
        name: 'Suspicious Merchant',
        factions: ['candy_merchants', 'bandits'],
        kingdomId: 'candy',
        factionWeights: {
          'candy_merchants': 0.7,
          'bandits': 0.3
        }
      });

      expect(npc.factions).toEqual(['candy_merchants', 'bandits']);
      expect(npc.factionWeights['candy_merchants']).toBe(0.7);
      expect(npc.factionWeights['bandits']).toBe(0.3);
    });

    it('should auto-generate faction weights if not provided', () => {
      const npc = new NPC({
        id: 'test',
        name: 'Test NPC',
        factions: ['faction1', 'faction2', 'faction3']
      });

      // Should have equal weights
      expect(npc.factionWeights['faction1']).toBeCloseTo(0.333, 2);
      expect(npc.factionWeights['faction2']).toBeCloseTo(0.333, 2);
      expect(npc.factionWeights['faction3']).toBeCloseTo(0.333, 2);
    });

    it('should validate faction weights sum to 1', () => {
      expect(() => {
        new NPC({
          id: 'invalid',
          name: 'Invalid NPC',
          factions: ['faction1', 'faction2'],
          factionWeights: {
            'faction1': 0.6,
            'faction2': 0.6 // Sum > 1
          }
        });
      }).toThrow('Faction weights must sum to 1');
    });
  });

  describe('NPC Faction Inheritance', () => {
    it('should inherit primary faction from location if not specified', () => {
      const npc = new NPC({
        id: 'citizen_1',
        name: 'Random Citizen',
        inheritFaction: true,
        kingdomId: 'candy'
      });

      // Should inherit default citizen faction for kingdom
      expect(npc.factions).toContain('candy_citizens');
    });

    it('should inherit faction from parent NPC', () => {
      const parent = new NPC({
        id: 'parent',
        name: 'Parent Noble',
        factions: ['candy_nobles', 'candy_court'],
        kingdomId: 'candy'
      });

      const child = new NPC({
        id: 'child',
        name: 'Child Noble',
        inheritFrom: parent,
        kingdomId: 'candy'
      });

      // Should inherit parent's factions
      expect(child.factions).toContain('candy_nobles');
      expect(child.factions).toContain('candy_court');
    });

    it('should allow faction additions on top of inheritance', () => {
      const npc = new NPC({
        id: 'guard_merchant',
        name: 'Entrepreneurial Guard',
        inheritFaction: true,
        additionalFactions: ['candy_merchants'],
        kingdomId: 'candy',
        role: 'guard'
      });

      expect(npc.factions).toContain('banana_guard'); // From role
      expect(npc.factions).toContain('candy_merchants'); // Additional
    });

    it('should handle faction conflicts with priority system', () => {
      const npc = new NPC({
        id: 'double_agent',
        name: 'Double Agent',
        factions: ['banana_guard'],
        additionalFactions: ['bandits'],
        factionPriority: 'additional' // Prioritize additional factions
      });

      // Bandits faction should have higher weight
      expect(npc.factionWeights['bandits']).toBeGreaterThan(npc.factionWeights['banana_guard']);
    });
  });

  describe('NPC Relations and Hostility', () => {
    it('should calculate relations based on all factions', () => {
      const npc1 = new NPC({
        id: 'multi_1',
        factions: ['banana_guard', 'candy_citizens'],
        kingdomId: 'candy'
      });

      const npc2 = new NPC({
        id: 'multi_2',
        factions: ['candy_merchants'],
        kingdomId: 'candy'
      });

      const relation = npc1.getRelationTo(npc2);
      
      // Should be positive (guards and citizens both friendly to merchants)
      expect(relation).toBeGreaterThan(0);
      expect(relation).toBeLessThanOrEqual(1);
    });

    it('should evaluate hostility considering all factions', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      const spy = new NPC({
        id: 'spy',
        factions: ['candy_merchants', 'bandits'],
        kingdomId: 'candy'
      });

      const hostility = guard.evaluateHostilityTo(spy, { lawLevel: 0.8 });
      
      // Should be hostile due to bandit faction despite merchant facade
      expect(hostility.hostile).toBe(true);
      expect(hostility.reason).toContain('criminal');
    });

    it('should apply faction weights in relation calculations', () => {
      const npc = new NPC({
        id: 'weighted',
        factions: ['candy_nobles', 'candy_merchants'],
        factionWeights: {
          'candy_nobles': 0.8,
          'candy_merchants': 0.2
        },
        kingdomId: 'candy'
      });

      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens'],
        kingdomId: 'candy'
      });

      const relation = npc.getRelationTo(citizen);
      
      // Should be weighted more toward noble-citizen relation
      expect(relation).toBeLessThan(0.5); // Nobles look down on citizens
    });

    it('should handle disguised NPCs properly', () => {
      const bandit = new NPC({
        id: 'bandit',
        factions: ['bandits'],
        disguise: {
          keys: ['candy_merchants'],
          quality: 0.8
        }
      });

      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      // Guard should see merchant disguise first
      const visibleFactions = bandit.getVisibleFactions();
      expect(visibleFactions).toContain('candy_merchants');
      
      const hostility = guard.evaluateHostilityTo(bandit, { lawLevel: 0.5 });
      
      // Disguise should reduce hostility
      expect(hostility.hostilityLevel).toBeLessThan(0.5);
    });
  });

  describe('NPC Spawn System', () => {
    it('should spawn NPCs with appropriate factions for location', () => {
      const spawner = new NPCSpawner();
      
      const npc = spawner.spawnNPC({
        location: 'candy_castle',
        kingdomId: 'candy',
        role: 'guard'
      });

      expect(npc.factions).toContain('banana_guard');
      expect(npc.kingdomId).toBe('candy');
    });

    it('should spawn diverse NPCs in markets', () => {
      const spawner = new NPCSpawner();
      
      const npcs = spawner.spawnMultiple({
        location: 'candy_market',
        kingdomId: 'candy',
        count: 10
      });

      // Should have mix of merchants, citizens, maybe guards
      const factionTypes = new Set();
      npcs.forEach(npc => {
        npc.factions.forEach(f => factionTypes.add(f));
      });

      expect(factionTypes.has('candy_merchants')).toBe(true);
      expect(factionTypes.has('candy_citizens')).toBe(true);
    });

    it('should spawn faction-appropriate NPCs in temples', () => {
      const spawner = new NPCSpawner();
      
      const npc = spawner.spawnNPC({
        location: 'fire_temple',
        kingdomId: 'fire',
        role: 'priest'
      });

      expect(npc.factions).toContain('flame_priests');
    });

    it('should allow custom spawn configurations', () => {
      const spawner = new NPCSpawner();
      
      const npc = spawner.spawnNPC({
        template: 'double_agent',
        factions: ['banana_guard', 'ice_spies'],
        factionWeights: {
          'banana_guard': 0.6,
          'ice_spies': 0.4
        }
      });

      expect(npc.factions).toEqual(['banana_guard', 'ice_spies']);
      expect(npc.factionWeights['banana_guard']).toBe(0.6);
    });
  });

  describe('NPC Dialogue System', () => {
    it('should select dialogue based on faction relations', () => {
      const merchant = new NPC({
        id: 'merchant',
        factions: ['candy_merchants'],
        kingdomId: 'candy'
      });

      const player = { factions: ['candy_citizens'] };
      
      const dialogue = merchant.getDialogue(player);
      
      expect(dialogue.tone).toBe('friendly');
      expect(dialogue.options).toContain('trade');
    });

    it('should have hostile dialogue for enemies', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      const player = { factions: ['bandits'] };
      
      const dialogue = guard.getDialogue(player, { lawLevel: 0.8 });
      
      expect(dialogue.tone).toBe('hostile');
      expect(dialogue.options).toContain('arrest');
    });

    it('should modify dialogue based on faction weights', () => {
      const conflicted = new NPC({
        id: 'conflicted',
        factions: ['candy_merchants', 'bandits'],
        factionWeights: {
          'candy_merchants': 0.9,
          'bandits': 0.1
        }
      });

      const player = { factions: ['banana_guard'] };
      
      const dialogue = conflicted.getDialogue(player);
      
      // Mostly merchant, so should be nervous but not hostile
      expect(dialogue.tone).toBe('nervous');
      expect(dialogue.hints).toContain('suspicious');
    });

    it('should have special dialogue for same factions', () => {
      const guard1 = new NPC({
        id: 'guard1',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      const player = { factions: ['banana_guard'] };
      
      const dialogue = guard1.getDialogue(player);
      
      expect(dialogue.tone).toBe('collegial');
      expect(dialogue.options).toContain('faction_business');
    });

    it('should react to disguises in dialogue', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy',
        perception: 0.7 // Can sometimes see through disguises
      });

      const player = { 
        factions: ['bandits'],
        disguise: {
          keys: ['candy_merchants'],
          quality: 0.6
        }
      };
      
      const dialogue = guard.getDialogue(player);
      
      // Guard might be suspicious
      expect(dialogue.hints).toContain('disguise_suspected');
      expect(dialogue.tone).toBe('suspicious');
    });
  });

  describe('NPC Behavior System', () => {
    it('should determine behavior based on factions', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        kingdomId: 'candy'
      });

      const behavior = guard.getBehavior({ timeOfDay: 'night' });
      
      expect(behavior.primary).toBe('patrol');
      expect(behavior.alertLevel).toBe('high');
    });

    it('should have mixed behaviors for multi-faction NPCs', () => {
      const merchantGuard = new NPC({
        id: 'merchant_guard',
        factions: ['banana_guard', 'candy_merchants'],
        factionWeights: {
          'banana_guard': 0.4,
          'candy_merchants': 0.6
        }
      });

      const behavior = merchantGuard.getBehavior({ timeOfDay: 'day' });
      
      // Should prioritize merchant behavior during day
      expect(behavior.primary).toBe('trade');
      expect(behavior.secondary).toBe('watch');
    });

    it('should flee from hostile factions', () => {
      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens'],
        kingdomId: 'candy'
      });

      const threat = new NPC({
        id: 'bandit',
        factions: ['bandits']
      });

      const behavior = citizen.getBehaviorToward(threat);
      
      expect(behavior.action).toBe('flee');
      expect(behavior.priority).toBe('high');
    });

    it('should cooperate with allied factions', () => {
      const merchant1 = new NPC({
        id: 'merchant1',
        factions: ['candy_merchants'],
        kingdomId: 'candy'
      });

      const merchant2 = new NPC({
        id: 'merchant2',
        factions: ['slime_traders'],
        kingdomId: 'slime'
      });

      const behavior = merchant1.getBehaviorToward(merchant2);
      
      expect(behavior.action).toBe('trade');
      expect(behavior.cooperation).toBeGreaterThan(0.5);
    });
  });
});

