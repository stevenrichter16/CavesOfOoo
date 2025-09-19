import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestManager } from '../../src/js/world/quests/QuestManager.js';
import { potThrowingQuestDef } from '../../src/js/world/quests/definitions/potThrowingQuest.js';

describe('Pot Throwing Practice Quest', () => {
  let mockState;

  beforeEach(() => {
    // Reset QuestManager
    if (QuestManager.initialized) {
      QuestManager.questService?.clear();
      QuestManager.initialized = false;
    }

    // Create mock state
    mockState = {
      player: {
        gold: 0,
        experience: 0,
        inventory: [],
        quests: {
          active: [],
          completed: []
        }
      },
      flags: {},
      log: vi.fn()
    };

    // Initialize quest system
    QuestManager.initialize(mockState);
  });

  describe('Quest Definition', () => {
    it('should create quest with correct properties', () => {
      const quest = potThrowingQuestDef.create();
      
      expect(quest.id).toBe('pot_throwing_practice');
      expect(quest.name).toBe('Throwing Practice');
      expect(quest.objectives).toHaveLength(2);
      expect(quest.rewards.gold).toBe(1500);
      expect(quest.rewards.experience).toBe(25);
    });

    it('should have two objectives for different pot types', () => {
      const quest = potThrowingQuestDef.create();
      
      const sugarPotObjective = quest.objectives.find(o => o.id === 'throw_sugar_pot');
      expect(sugarPotObjective).toBeDefined();
      expect(sugarPotObjective.conditions.match['item.id']).toBe('sugar_pot');
      
      const clayPotObjective = quest.objectives.find(o => o.id === 'throw_clay_pot');
      expect(clayPotObjective).toBeDefined();
      expect(clayPotObjective.conditions.match['item.id']).toBe('clay_pot');
    });
  });

  describe('Quest Flow', () => {
    it('should start quest and give pots if player has none', () => {
      const success = QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      expect(success).toBe(true);
      expect(mockState.player.quests.active).toContain('pot_throwing_practice');
      
      // Should give pots if player doesn't have them
      const sugarPot = mockState.player.inventory.find(i => i.id === 'sugar_pot');
      const clayPot = mockState.player.inventory.find(i => i.id === 'clay_pot');
      
      expect(sugarPot).toBeDefined();
      expect(sugarPot.count).toBe(2);
      expect(clayPot).toBeDefined();
      expect(clayPot.count).toBe(2);
    });

    it('should not give pots if player already has them', () => {
      // Give player pots first
      mockState.player.inventory = [
        { id: 'sugar_pot', type: 'throwable', name: 'Sugar Pot', count: 5 },
        { id: 'clay_pot', type: 'throwable', name: 'Clay Pot', count: 3 }
      ];
      
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Should still have original amounts
      const sugarPot = mockState.player.inventory.find(i => i.id === 'sugar_pot');
      const clayPot = mockState.player.inventory.find(i => i.id === 'clay_pot');
      
      expect(sugarPot.count).toBe(5);
      expect(clayPot.count).toBe(3);
    });

    it('should update objectives when pots are thrown', () => {
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Simulate throwing sugar pot
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'sugar_pot', name: 'Sugar Pot' },
        targetX: 5,
        targetY: 5,
        hit: true
      });
      
      // Check sugar pot objective completed
      const quest = QuestManager.getQuest('pot_throwing_practice');
      const sugarObjective = quest.objectives.find(o => o.id === 'throw_sugar_pot');
      expect(sugarObjective.completed).toBe(true);
      expect(sugarObjective.progress).toBe(1);
      
      // Clay pot objective should still be incomplete
      const clayObjective = quest.objectives.find(o => o.id === 'throw_clay_pot');
      expect(clayObjective.completed).toBe(false);
    });

    it('should complete quest when both pots are thrown', async () => {
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Throw sugar pot
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'sugar_pot', name: 'Sugar Pot' },
        targetX: 5,
        targetY: 5
      });
      
      // Give event time to process
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Throw clay pot
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'clay_pot', name: 'Clay Pot' },
        targetX: 6,
        targetY: 6
      });
      
      // Give event time to process
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check quest is ready for turn-in
      const quest = QuestManager.getQuest('pot_throwing_practice');
      expect(quest.state).toBe('COMPLETED');
      expect(QuestManager.canTurnInQuest('pot_throwing_practice')).toBe(true);
    });

    it('should give rewards when quest is turned in', () => {
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Complete both objectives
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'sugar_pot', name: 'Sugar Pot' }
      });
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'clay_pot', name: 'Clay Pot' }
      });
      
      // Turn in quest
      const rewards = QuestManager.completeQuest(mockState, 'pot_throwing_practice');
      
      expect(rewards).toEqual({
        gold: 1500,
        experience: 25,
        items: []
      });
      
      expect(mockState.player.gold).toBe(1500);
      expect(mockState.player.experience).toBe(25);
      expect(mockState.player.quests.completed).toContain('pot_throwing_practice');
    });
  });

  describe('Event Matching', () => {
    it('should not count wrong pot types', () => {
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Throw a fire pot (wrong type)
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'fire_pot', name: 'Fire Pot' }
      });
      
      // Neither objective should be complete
      const quest = QuestManager.getQuest('pot_throwing_practice');
      const sugarObjective = quest.objectives.find(o => o.id === 'throw_sugar_pot');
      const clayObjective = quest.objectives.find(o => o.id === 'throw_clay_pot');
      
      expect(sugarObjective.completed).toBe(false);
      expect(clayObjective.completed).toBe(false);
    });

    it('should handle multiple throws of same type', () => {
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Throw sugar pot twice
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'sugar_pot', name: 'Sugar Pot' }
      });
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'sugar_pot', name: 'Sugar Pot' }
      });
      
      // Sugar objective should complete only once
      const quest = QuestManager.getQuest('pot_throwing_practice');
      const sugarObjective = quest.objectives.find(o => o.id === 'throw_sugar_pot');
      
      expect(sugarObjective.completed).toBe(true);
      expect(sugarObjective.progress).toBe(1); // Should cap at count
    });
  });
});