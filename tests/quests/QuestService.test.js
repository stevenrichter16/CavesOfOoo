import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestService } from '../../src/js/world/quests/QuestService.js';
import { QuestEventBus } from '../../src/js/world/quests/QuestEventBus.js';

describe('QuestService', () => {
  let questService;
  let questEvents;
  let mockState;

  beforeEach(() => {
    questEvents = new QuestEventBus();
    questService = new QuestService(questEvents);
    
    mockState = {
      player: {
        gold: 100,
        experience: 0,
        inventory: [],
        quests: {
          active: [],
          completed: []
        }
      },
      log: vi.fn()
    };
  });

  describe('registerQuestDefinition', () => {
    it('should register a quest definition', () => {
      const questDef = {
        id: 'test_quest',
        create: () => ({ id: 'test_quest', name: 'Test Quest' })
      };

      questService.registerQuestDefinition(questDef.id, questDef);
      
      expect(questService.questDefinitions.has('test_quest')).toBe(true);
    });
  });

  describe('startQuest', () => {
    const testQuestDef = {
      id: 'test_quest',
      create: () => ({
        id: 'test_quest',
        name: 'Test Quest',
        objectives: [
          {
            id: 'objective_1',
            type: 'EVENT_BASED',
            description: 'Test objective',
            conditions: {
              events: ['TEST_EVENT'],
              match: { value: 42 }
            }
          }
        ],
        rewards: { gold: 100 }
      })
    };

    beforeEach(() => {
      questService.registerQuestDefinition(testQuestDef.id, testQuestDef);
    });

    it('should start a quest and add it to active quests', () => {
      const result = questService.startQuest(mockState, 'test_quest');

      expect(result).toBe(true);
      expect(questService.getQuest('test_quest')).toBeDefined();
      expect(questService.getQuest('test_quest').state).toBe('ACTIVE');
      expect(mockState.player.quests.active).toContain('test_quest');
    });

    it('should not start a quest that is already active', () => {
      questService.startQuest(mockState, 'test_quest');
      const result = questService.startQuest(mockState, 'test_quest');

      expect(result).toBe(false);
      expect(mockState.player.quests.active.length).toBe(1);
    });

    it('should return false for non-existent quest', () => {
      const result = questService.startQuest(mockState, 'non_existent');

      expect(result).toBe(false);
    });

    it('should register objective handlers when starting quest', () => {
      const spy = vi.spyOn(questService.objectiveHandler, 'register');
      questService.startQuest(mockState, 'test_quest');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('updateObjective', () => {
    beforeEach(() => {
      const questDef = {
        id: 'test_quest',
        create: () => ({
          id: 'test_quest',
          name: 'Test Quest',
          objectives: [
            {
              id: 'kill_goblins',
              type: 'EVENT_BASED',
              description: 'Kill 5 goblins',
              progress: 0,
              count: 5,
              completed: false
            }
          ],
          rewards: { gold: 100 }
        })
      };
      questService.registerQuestDefinition(questDef.id, questDef);
      questService.startQuest(mockState, 'test_quest');
    });

    it('should update objective progress', () => {
      questService.updateObjective('test_quest', 'kill_goblins', { 
        progress: 3 
      });

      const quest = questService.getQuest('test_quest');
      const objective = quest.objectives.find(o => o.id === 'kill_goblins');
      
      expect(objective.progress).toBe(3);
      expect(objective.completed).toBe(false);
    });

    it('should mark objective as completed when progress reaches count', () => {
      questService.updateObjective('test_quest', 'kill_goblins', { 
        progress: 5 
      });

      const quest = questService.getQuest('test_quest');
      const objective = quest.objectives.find(o => o.id === 'kill_goblins');
      
      expect(objective.progress).toBe(5);
      expect(objective.completed).toBe(true);
    });

    it('should emit OBJECTIVE_COMPLETED event when objective completes', () => {
      let eventEmitted = false;
      questEvents.on('OBJECTIVE_COMPLETED', (data) => {
        eventEmitted = true;
        expect(data.questId).toBe('test_quest');
        expect(data.objectiveId).toBe('kill_goblins');
      });

      questService.updateObjective('test_quest', 'kill_goblins', { 
        progress: 5 
      });

      expect(eventEmitted).toBe(true);
    });

    it('should check for quest completion when all objectives complete', () => {
      questService.updateObjective('test_quest', 'kill_goblins', { 
        progress: 5 
      });

      const quest = questService.getQuest('test_quest');
      expect(quest.state).toBe('COMPLETED');
    });
  });

  describe('completeQuest', () => {
    beforeEach(() => {
      const questDef = {
        id: 'reward_quest',
        create: () => ({
          id: 'reward_quest',
          name: 'Reward Quest',
          state: 'ACTIVE',
          objectives: [
            {
              id: 'objective_1',
              completed: true
            }
          ],
          rewards: { 
            gold: 500,
            experience: 100,
            items: [
              { id: 'sword', name: 'Iron Sword' }
            ]
          }
        })
      };
      questService.registerQuestDefinition(questDef.id, questDef);
      questService.startQuest(mockState, 'reward_quest');
    });

    it('should apply gold rewards', () => {
      const initialGold = mockState.player.gold;
      questService.completeQuest(mockState, 'reward_quest');

      expect(mockState.player.gold).toBe(initialGold + 500);
    });

    it('should apply experience rewards', () => {
      questService.completeQuest(mockState, 'reward_quest');

      expect(mockState.player.experience).toBe(100);
    });

    it('should add item rewards to inventory', () => {
      questService.completeQuest(mockState, 'reward_quest');

      expect(mockState.player.inventory).toHaveLength(1);
      expect(mockState.player.inventory[0].name).toBe('Iron Sword');
    });

    it('should move quest from active to completed', () => {
      questService.completeQuest(mockState, 'reward_quest');

      expect(mockState.player.quests.active).not.toContain('reward_quest');
      expect(mockState.player.quests.completed).toContain('reward_quest');
    });

    it('should emit QUEST_COMPLETED event', () => {
      let eventEmitted = false;
      questEvents.on('QUEST_COMPLETED', (data) => {
        eventEmitted = true;
        expect(data.questId).toBe('reward_quest');
        expect(data.rewards).toBeDefined();
      });

      questService.completeQuest(mockState, 'reward_quest');

      expect(eventEmitted).toBe(true);
    });

    it('should return rewards object', () => {
      const rewards = questService.completeQuest(mockState, 'reward_quest');

      expect(rewards).toEqual({
        gold: 500,
        experience: 100,
        items: [{ id: 'sword', name: 'Iron Sword' }]
      });
    });

    it('should log completion if state.log exists', () => {
      questService.completeQuest(mockState, 'reward_quest');

      expect(mockState.log).toHaveBeenCalledWith(
        expect.stringContaining('Quest Complete'),
        'quest'
      );
    });
  });

  describe('getActiveQuests', () => {
    it('should return all active quests', () => {
      const questDef1 = {
        id: 'quest_1',
        create: () => ({ id: 'quest_1', name: 'Quest 1', state: 'ACTIVE' })
      };
      const questDef2 = {
        id: 'quest_2',
        create: () => ({ id: 'quest_2', name: 'Quest 2', state: 'ACTIVE' })
      };

      questService.registerQuestDefinition('quest_1', questDef1);
      questService.registerQuestDefinition('quest_2', questDef2);
      
      questService.startQuest(mockState, 'quest_1');
      questService.startQuest(mockState, 'quest_2');

      const activeQuests = questService.getActiveQuests();
      
      expect(activeQuests).toHaveLength(2);
      expect(activeQuests.map(q => q.id)).toContain('quest_1');
      expect(activeQuests.map(q => q.id)).toContain('quest_2');
    });
  });

  describe('isQuestCompleted', () => {
    it('should return true for completed quests', () => {
      const questDef = {
        id: 'test_quest',
        create: () => ({
          id: 'test_quest',
          objectives: [{ id: 'obj1', completed: true }],
          rewards: { gold: 100 }
        })
      };
      questService.registerQuestDefinition('test_quest', questDef);
      questService.startQuest(mockState, 'test_quest');
      questService.completeQuest(mockState, 'test_quest');

      expect(questService.isQuestCompleted('test_quest')).toBe(true);
    });

    it('should return false for active quests', () => {
      const questDef = {
        id: 'test_quest',
        create: () => ({ id: 'test_quest', state: 'ACTIVE' })
      };
      questService.registerQuestDefinition('test_quest', questDef);
      questService.startQuest(mockState, 'test_quest');

      expect(questService.isQuestCompleted('test_quest')).toBe(false);
    });
  });
});