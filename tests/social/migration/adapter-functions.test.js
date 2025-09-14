import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Migration Adapter Functions', () => {
  let getAvailableInteractions, runPlayerNPCInteraction, initializeSocialSystem;
  let NPC;
  
  beforeEach(async () => {
    const adapter = await import('../../../src/social/migrationAdapter.js');
    getAvailableInteractions = adapter.getAvailableInteractions;
    runPlayerNPCInteraction = adapter.runPlayerNPCInteraction;
    initializeSocialSystem = adapter.initializeSocialSystem;
    
    const npcModule = await import('../../../src/social/npcEnhanced.js');
    NPC = npcModule.NPC;
  });

  describe('getAvailableInteractions', () => {
    it('should be exported from migration adapter', () => {
      expect(getAvailableInteractions).toBeDefined();
      expect(typeof getAvailableInteractions).toBe('function');
    });

    it('should return interaction options for player and NPC', () => {
      const player = {
        id: 'player',
        name: 'Finn',
        factions: ['player']
      };
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        faction: 'merchants',
        shopkeeper: true
      });
      
      const interactions = getAvailableInteractions(player, npc);
      expect(Array.isArray(interactions)).toBe(true);
      
      // Should have basic interactions
      const interactionTypes = interactions.map(i => i.type);
      expect(interactionTypes).toContain('talk');
      expect(interactionTypes).toContain('trade');
    });

    it('should handle hostile NPCs', () => {
      const player = {
        id: 'player',
        factions: ['player']
      };
      
      const hostileNpc = new NPC({
        id: 'bandit',
        name: 'Bandit',
        factions: ['bandits'],
        attitude: 'hostile'
      });
      
      const interactions = getAvailableInteractions(player, hostileNpc);
      const interactionTypes = interactions.map(i => i.type);
      
      // Hostile NPCs might have limited interactions
      expect(interactionTypes).toContain('fight');
    });

    it('should handle quest giver NPCs', () => {
      const player = {
        id: 'player',
        factions: ['player'],
        quests: { active: [], completed: [] }
      };
      
      const questGiver = new NPC({
        id: 'quest_npc',
        name: 'Quest Giver',
        questGiver: true,
        quests: ['test_quest']
      });
      
      const interactions = getAvailableInteractions(player, questGiver);
      const interactionTypes = interactions.map(i => i.type);
      
      expect(interactionTypes).toContain('talk');
      expect(interactionTypes).toContain('quest');
    });
  });

  describe('runPlayerNPCInteraction', () => {
    it('should be exported from migration adapter', () => {
      expect(runPlayerNPCInteraction).toBeDefined();
      expect(typeof runPlayerNPCInteraction).toBe('function');
    });

    it('should execute talk interaction', () => {
      const state = {
        npcs: [],
        log: vi.fn()
      };
      
      const player = {
        id: 'player',
        name: 'Finn'
      };
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        faction: 'peasants'
      });
      
      const result = runPlayerNPCInteraction(state, player, npc, 'talk');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      
      if (result.success) {
        expect(result.message).toBeDefined();
      }
    });

    it('should handle invalid action types', () => {
      const state = { npcs: [] };
      const player = { id: 'player' };
      const npc = new NPC({ id: 'npc' });
      
      const result = runPlayerNPCInteraction(state, player, npc, 'invalid_action');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_action');
    });

    it('should execute trade interaction for merchants', () => {
      const state = {
        npcs: [],
        player: { gold: 100 }
      };
      
      const player = state.player;
      
      const merchant = new NPC({
        id: 'merchant',
        name: 'Merchant',
        faction: 'merchants',
        shopkeeper: true,
        goods: [
          { id: 'potion', name: 'Potion', price: 10 }
        ]
      });
      
      const result = runPlayerNPCInteraction(state, player, merchant, 'trade');
      
      expect(result).toBeDefined();
      // Trade might open a shop UI or return available goods
      if (result.success) {
        expect(result.goods || result.shopOpen).toBeDefined();
      }
    });

    it('should update NPC memory on interaction', () => {
      const state = { npcs: [] };
      const player = { id: 'player', name: 'Finn' };
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC'
      });
      
      const initialEventCount = npc.memory.events.length;
      
      runPlayerNPCInteraction(state, player, npc, 'talk');
      
      // Should remember the interaction
      expect(npc.memory.events.length).toBeGreaterThan(initialEventCount);
    });
  });

  describe('initializeSocialSystem', () => {
    it('should be exported from migration adapter', () => {
      expect(initializeSocialSystem).toBeDefined();
      expect(typeof initializeSocialSystem).toBe('function');
    });

    it('should initialize state.npcs if missing', () => {
      const state = {};
      
      initializeSocialSystem(state);
      
      expect(state.npcs).toBeDefined();
      expect(Array.isArray(state.npcs)).toBe(true);
    });

    it('should convert existing monsters to social NPCs', () => {
      const state = {
        chunk: {
          monsters: [
            {
              id: 'monster1',
              name: 'Goblin',
              hp: 20,
              x: 10,
              y: 10
            },
            {
              id: 'monster2',
              name: 'Orc',
              hp: 30,
              x: 15,
              y: 15
            }
          ]
        }
      };
      
      initializeSocialSystem(state);
      
      // Monsters should be converted to NPCs
      state.chunk.monsters.forEach(monster => {
        expect(typeof monster.hasTrait).toBe('function');
        expect(monster.memory).toBeDefined();
        expect(Array.isArray(monster.traits)).toBe(true);
      });
    });

    it('should not re-initialize already converted NPCs', () => {
      const existingNpc = new NPC({
        id: 'existing',
        name: 'Existing NPC',
        traits: ['brave', 'loyal']
      });
      
      const state = {
        npcs: [existingNpc],
        chunk: {
          monsters: [existingNpc]
        }
      };
      
      const originalTraits = [...existingNpc.traits];
      
      initializeSocialSystem(state);
      
      // Should not change existing NPC
      expect(existingNpc.traits).toEqual(originalTraits);
    });

    it('should handle mixed OLD and NEW NPCs', () => {
      const oldNpc = {
        id: 'old',
        name: 'Old NPC',
        faction: 'guards'
      };
      
      const newNpc = new NPC({
        id: 'new',
        name: 'New NPC',
        faction: 'merchants'
      });
      
      const state = {
        npcs: [oldNpc, newNpc]
      };
      
      initializeSocialSystem(state);
      
      // Old NPC should be converted
      expect(state.npcs[0]).toBeInstanceOf(NPC);
      expect(state.npcs[0].name).toBe('Old NPC');
      
      // New NPC should remain unchanged
      expect(state.npcs[1]).toBe(newNpc);
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain same function signatures as OLD system', () => {
      // getAvailableInteractions(player, npc)
      expect(getAvailableInteractions.length).toBe(2);
      
      // runPlayerNPCInteraction(state, player, npc, actionType, params)
      expect(runPlayerNPCInteraction.length).toBe(5);
      
      // initializeSocialSystem(state)
      expect(initializeSocialSystem.length).toBe(1);
    });

    it('should work with OLD system data structures', () => {
      const oldPlayer = {
        id: 'player',
        name: 'Finn',
        inventory: [],
        gold: 50
      };
      
      const oldNpc = {
        id: 'old_npc',
        name: 'Old NPC',
        faction: 'peasants',
        traits: ['friendly'],
        hasTrait: function(t) { return this.traits.includes(t); }
      };
      
      // Should work without errors
      const interactions = getAvailableInteractions(oldPlayer, oldNpc);
      expect(Array.isArray(interactions)).toBe(true);
    });
  });
});