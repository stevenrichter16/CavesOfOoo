import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestManager } from '../../src/js/world/quests/QuestManager.js';
import { evaluateConditionInternal } from '../../src/social/dialogue.js';

describe('Quest Dialogue Integration', () => {
  let mockState;
  let mockPlayer;
  let mockNPC;

  beforeEach(() => {
    // Reset QuestManager
    if (QuestManager.initialized) {
      QuestManager.questService?.clear();
      QuestManager.initialized = false;
    }

    mockPlayer = {
      gold: 0,
      experience: 0,
      inventory: [],
      quests: {
        active: [],
        completed: []
      }
    };

    mockState = {
      player: mockPlayer,
      flags: {},
      log: vi.fn()
    };

    mockNPC = {
      name: 'Steven',
      memory: null
    };

    // Initialize quest system
    QuestManager.initialize(mockState);
  });

  describe('Open Inventory Quest Dialogue Conditions', () => {
    it('should show quest offer when quest not started', () => {
      // Test the quest offer condition
      const offerCondition = {
        and: [
          { type: 'not', condition: { type: 'quest', quest: 'open_inventory_quest' } },
          { type: 'not', condition: { hasCompletedQuest: 'open_inventory_quest' } }
        ]
      };

      const result = evaluateConditionInternal(offerCondition, mockState, mockPlayer, mockNPC);
      expect(result).toBe(true);
    });

    it('should not show quest offer when quest is active', () => {
      // Start the quest
      QuestManager.startQuest(mockState, 'open_inventory_quest');

      const offerCondition = {
        and: [
          { type: 'not', condition: { type: 'quest', quest: 'open_inventory_quest' } },
          { type: 'not', condition: { hasCompletedQuest: 'open_inventory_quest' } }
        ]
      };

      const result = evaluateConditionInternal(offerCondition, mockState, mockPlayer, mockNPC);
      expect(result).toBe(false);
    });

    it('should show turn-in option when quest can be turned in', () => {
      // Start quest
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      
      // Complete the objective manually (simulating inventory opened)
      const quest = QuestManager.getQuest('open_inventory_quest');
      QuestManager.updateObjective('open_inventory_quest', 'open_inventory', {
        completed: true,
        progress: 1
      });

      // Test turn-in condition
      const turnInCondition = {
        type: 'questCanTurnIn',
        quest: 'open_inventory_quest'
      };

      const result = evaluateConditionInternal(turnInCondition, mockState, mockPlayer, mockNPC);
      expect(result).toBe(true);
    });

    it('should not show turn-in option when quest not ready', () => {
      // Start quest but don't complete it
      QuestManager.startQuest(mockState, 'open_inventory_quest');

      const turnInCondition = {
        type: 'questCanTurnIn',
        quest: 'open_inventory_quest'
      };

      const result = evaluateConditionInternal(turnInCondition, mockState, mockPlayer, mockNPC);
      expect(result).toBe(false);
    });

    it('should not show either option when quest is fully completed', () => {
      // Start and complete quest
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      
      // Complete objective
      QuestManager.updateObjective('open_inventory_quest', 'open_inventory', {
        completed: true,
        progress: 1
      });
      
      // Turn in for rewards
      QuestManager.completeQuest(mockState, 'open_inventory_quest');

      // Test offer condition - should be false
      const offerCondition = {
        and: [
          { type: 'not', condition: { type: 'quest', quest: 'open_inventory_quest' } },
          { type: 'not', condition: { hasCompletedQuest: 'open_inventory_quest' } }
        ]
      };
      expect(evaluateConditionInternal(offerCondition, mockState, mockPlayer, mockNPC)).toBe(false);

      // Test turn-in condition - should be false
      const turnInCondition = {
        type: 'questCanTurnIn',
        quest: 'open_inventory_quest'
      };
      expect(evaluateConditionInternal(turnInCondition, mockState, mockPlayer, mockNPC)).toBe(false);
    });
  });

  describe('Condition Operators', () => {
    it('should handle AND conditions correctly', () => {
      mockPlayer.gold = 100;
      mockPlayer.level = 5;

      const condition = {
        and: [
          { type: 'gold', amount: 50 },
          { type: 'level', level: 3 }
        ]
      };

      expect(evaluateConditionInternal(condition, mockState, mockPlayer, mockNPC)).toBe(true);

      // Should fail if one condition fails
      mockPlayer.gold = 10;
      expect(evaluateConditionInternal(condition, mockState, mockPlayer, mockNPC)).toBe(false);
    });

    it('should handle OR conditions correctly', () => {
      mockPlayer.gold = 100;
      mockPlayer.level = 1;

      const condition = {
        or: [
          { type: 'gold', amount: 50 },
          { type: 'level', level: 10 }
        ]
      };

      // Should pass because gold condition passes
      expect(evaluateConditionInternal(condition, mockState, mockPlayer, mockNPC)).toBe(true);

      // Should fail if both conditions fail
      mockPlayer.gold = 10;
      expect(evaluateConditionInternal(condition, mockState, mockPlayer, mockNPC)).toBe(false);
    });

    it('should handle NOT conditions correctly', () => {
      const condition1 = {
        type: 'not',
        condition: { type: 'quest', quest: 'some_quest' }
      };

      // Should pass because quest is not active
      expect(evaluateConditionInternal(condition1, mockState, mockPlayer, mockNPC)).toBe(true);

      // Alternative NOT format
      const condition2 = {
        not: { type: 'quest', quest: 'some_quest' }
      };
      expect(evaluateConditionInternal(condition2, mockState, mockPlayer, mockNPC)).toBe(true);
    });

    it('should handle nested conditions', () => {
      mockPlayer.gold = 100;
      mockPlayer.level = 5;

      const condition = {
        and: [
          { type: 'gold', amount: 50 },
          {
            or: [
              { type: 'level', level: 10 },
              { type: 'not', condition: { hasCompletedQuest: 'tutorial' } }
            ]
          }
        ]
      };

      // Should pass (gold >= 50 AND (level >= 10 OR NOT completed tutorial))
      expect(evaluateConditionInternal(condition, mockState, mockPlayer, mockNPC)).toBe(true);
    });
  });
});