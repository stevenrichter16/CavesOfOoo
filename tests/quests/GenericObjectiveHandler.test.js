import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenericObjectiveHandler } from '../../src/js/world/quests/handlers/GenericObjectiveHandler.js';
import { QuestEventBus } from '../../src/js/world/quests/QuestEventBus.js';

describe('GenericObjectiveHandler', () => {
  let handler;
  let questService;
  let questEvents;

  beforeEach(() => {
    questEvents = new QuestEventBus();
    questService = {
      updateObjective: vi.fn()
    };
    handler = new GenericObjectiveHandler(questService, questEvents);
  });

  describe('register', () => {
    it('should register an objective and subscribe to its events', () => {
      const quest = { id: 'test_quest' };
      const objective = {
        id: 'kill_goblin',
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { entityType: 'goblin' }
        }
      };

      handler.register(quest, objective);

      expect(handler.activeObjectives.has('test_quest.kill_goblin')).toBe(true);
    });

    it('should handle multiple events for one objective', () => {
      const quest = { id: 'test_quest' };
      const objective = {
        id: 'multi_event',
        conditions: {
          events: ['ENTITY_KILLED', 'ENTITY_DEFEATED', 'COMBAT_WON'],
          match: { entityType: 'goblin' }
        }
      };

      handler.register(quest, objective);
      
      const registered = handler.activeObjectives.get('test_quest.multi_event');
      expect(registered.conditions.events).toHaveLength(3);
    });

    it('should handle objectives with no event conditions gracefully', () => {
      const quest = { id: 'test_quest' };
      const objective = {
        id: 'no_events',
        conditions: {}
      };

      expect(() => {
        handler.register(quest, objective);
      }).not.toThrow();
    });
  });

  describe('handleEvent', () => {
    it('should update objective when matching event occurs', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'kill_goblin',
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { entityType: 'goblin' }
        }
      };

      handler.register(quest, objective);
      questEvents.emit('ENTITY_KILLED', { entityType: 'goblin', entityId: 'goblin_1' });

      expect(questService.updateObjective).toHaveBeenCalledWith(
        'quest_1',
        'kill_goblin',
        expect.objectContaining({ completed: true })
      );
    });

    it('should not update objective when event data does not match', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'kill_goblin',
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { entityType: 'goblin' }
        }
      };

      handler.register(quest, objective);
      questEvents.emit('ENTITY_KILLED', { entityType: 'skeleton', entityId: 'skeleton_1' });

      expect(questService.updateObjective).not.toHaveBeenCalled();
    });

    it('should handle multiple match conditions', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'specific_kill',
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { 
            entityType: 'boss',
            location: 'dungeon'
          }
        }
      };

      handler.register(quest, objective);
      
      // Should not match - wrong location
      questEvents.emit('ENTITY_KILLED', { 
        entityType: 'boss', 
        location: 'forest' 
      });
      expect(questService.updateObjective).not.toHaveBeenCalled();

      // Should match - all conditions met
      questEvents.emit('ENTITY_KILLED', { 
        entityType: 'boss', 
        location: 'dungeon' 
      });
      expect(questService.updateObjective).toHaveBeenCalled();
    });

    it('should increment progress for countable objectives', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'kill_5_goblins',
        progress: 0,
        count: 5,
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { entityType: 'goblin' }
        }
      };

      handler.register(quest, objective);
      questEvents.emit('ENTITY_KILLED', { entityType: 'goblin' });

      expect(questService.updateObjective).toHaveBeenCalledWith(
        'quest_1',
        'kill_5_goblins',
        expect.objectContaining({ increment: true })
      );
    });

    it('should evaluate custom evaluator functions', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'complex_objective',
        conditions: {
          events: ['TRADE_COMPLETED'],
          evaluator: (eventData) => {
            const profit = eventData.sellPrice - eventData.buyPrice;
            return profit >= 50;
          }
        }
      };

      handler.register(quest, objective);

      // Should not match - profit too low
      questEvents.emit('TRADE_COMPLETED', { buyPrice: 100, sellPrice: 120 });
      expect(questService.updateObjective).not.toHaveBeenCalled();

      // Should match - profit high enough
      questEvents.emit('TRADE_COMPLETED', { buyPrice: 100, sellPrice: 200 });
      expect(questService.updateObjective).toHaveBeenCalled();
    });

    it('should remove objective from active list after completion', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'simple_objective',
        conditions: {
          events: ['TEST_EVENT']
        }
      };

      handler.register(quest, objective);
      expect(handler.activeObjectives.has('quest_1.simple_objective')).toBe(true);

      questEvents.emit('TEST_EVENT', {});

      // For non-countable objectives, should be removed after completion
      if (!objective.count) {
        expect(handler.activeObjectives.has('quest_1.simple_objective')).toBe(false);
      }
    });
  });

  describe('evaluateConditions', () => {
    it('should return true when no conditions specified', () => {
      const result = handler.evaluateConditions({}, 'ANY_EVENT', {});
      expect(result).toBe(true);
    });

    it('should return false when event type does not match', () => {
      const conditions = {
        events: ['SPECIFIC_EVENT']
      };
      const result = handler.evaluateConditions(conditions, 'OTHER_EVENT', {});
      expect(result).toBe(false);
    });

    it('should evaluate match conditions correctly', () => {
      const conditions = {
        events: ['TEST_EVENT'],
        match: { 
          value: 42,
          type: 'special'
        }
      };

      // All match conditions met
      expect(handler.evaluateConditions(
        conditions, 
        'TEST_EVENT', 
        { value: 42, type: 'special', extra: 'ignored' }
      )).toBe(true);

      // One match condition not met
      expect(handler.evaluateConditions(
        conditions,
        'TEST_EVENT',
        { value: 42, type: 'normal' }
      )).toBe(false);
    });

    it('should handle nested match values', () => {
      const conditions = {
        events: ['TEST_EVENT'],
        match: {
          'player.level': 10,
          'location.biome': 'forest'
        }
      };

      const eventData = {
        player: { level: 10, name: 'Hero' },
        location: { biome: 'forest', x: 100, y: 200 }
      };

      expect(handler.evaluateConditions(conditions, 'TEST_EVENT', eventData)).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove objective and clean up event listeners', () => {
      const quest = { id: 'quest_1' };
      const objective = {
        id: 'objective_1',
        conditions: {
          events: ['TEST_EVENT']
        }
      };

      handler.register(quest, objective);
      expect(handler.activeObjectives.has('quest_1.objective_1')).toBe(true);

      handler.unregister('quest_1', 'objective_1');
      expect(handler.activeObjectives.has('quest_1.objective_1')).toBe(false);
    });
  });

  describe('integration with multiple objectives', () => {
    it('should handle multiple objectives for same event type', () => {
      const quest1 = { id: 'quest_1' };
      const quest2 = { id: 'quest_2' };
      
      const objective1 = {
        id: 'kill_goblin',
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { entityType: 'goblin' }
        }
      };
      
      const objective2 = {
        id: 'kill_orc',
        conditions: {
          events: ['ENTITY_KILLED'],
          match: { entityType: 'orc' }
        }
      };

      handler.register(quest1, objective1);
      handler.register(quest2, objective2);

      questEvents.emit('ENTITY_KILLED', { entityType: 'goblin' });
      expect(questService.updateObjective).toHaveBeenCalledWith('quest_1', 'kill_goblin', expect.anything());
      expect(questService.updateObjective).toHaveBeenCalledTimes(1);

      questService.updateObjective.mockClear();

      questEvents.emit('ENTITY_KILLED', { entityType: 'orc' });
      expect(questService.updateObjective).toHaveBeenCalledWith('quest_2', 'kill_orc', expect.anything());
      expect(questService.updateObjective).toHaveBeenCalledTimes(1);
    });
  });
});