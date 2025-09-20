import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestManager } from '../../src/js/world/quests/QuestManager.js';

// Mock DOM elements for the quest menu
const mockElement = {
  style: { display: 'none', cssText: '' },
  innerHTML: '',
  className: '',
  appendChild: vi.fn(),
  textContent: ''
};

global.document = {
  getElementById: vi.fn((id) => {
    if (id === 'overlay' || id === 'overlayContent' || id === 'overlayTitle' || id === 'overlayHint') {
      return mockElement;
    }
    return null;
  }),
  createElement: vi.fn(() => ({
    className: '',
    style: { cssText: '' },
    appendChild: vi.fn(),
    innerHTML: '',
    textContent: ''
  }))
};

describe('Quest Menu Display', () => {
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
      ui: {
        questMenuOpen: false
      },
      log: vi.fn(),
      render: vi.fn()
    };

    // Initialize quest system
    QuestManager.initialize(mockState);
  });

  describe('Quest visibility in menu', () => {
    it('should show active quests in getQuestsInProgress', () => {
      // Start a quest
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      
      // Check both methods
      const activeQuests = QuestManager.getActiveQuests();
      const questsInProgress = QuestManager.getQuestsInProgress();
      
      expect(activeQuests).toHaveLength(1);
      expect(questsInProgress).toHaveLength(1);
      expect(questsInProgress[0].state).toBe('ACTIVE');
    });

    it('should show completed-but-not-turned-in quests in getQuestsInProgress', async () => {
      // Start quest
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      
      // Complete the objective
      QuestManager.emitEvent('INVENTORY_OPENED', { timestamp: Date.now() });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check methods
      const activeQuests = QuestManager.getActiveQuests();
      const questsInProgress = QuestManager.getQuestsInProgress();
      
      // Active quests should be empty (quest is COMPLETED)
      expect(activeQuests).toHaveLength(0);
      
      // Quests in progress should still show the completed quest
      expect(questsInProgress).toHaveLength(1);
      expect(questsInProgress[0].state).toBe('COMPLETED');
      expect(questsInProgress[0].name).toBe('Tutorial: Open Your Inventory');
    });

    it('should not show turned-in quests in getQuestsInProgress', async () => {
      // Start quest
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      
      // Complete the objective
      QuestManager.emitEvent('INVENTORY_OPENED', { timestamp: Date.now() });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Turn in the quest
      QuestManager.completeQuest(mockState, 'open_inventory_quest');
      
      // Both should be empty now
      const activeQuests = QuestManager.getActiveQuests();
      const questsInProgress = QuestManager.getQuestsInProgress();
      
      expect(activeQuests).toHaveLength(0);
      expect(questsInProgress).toHaveLength(0);
      
      // Quest should be in completed list
      expect(mockState.player.quests.completed).toContain('open_inventory_quest');
    });

    it('should handle multiple quests with different states', async () => {
      // Start two quests
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      // Complete inventory quest
      QuestManager.emitEvent('INVENTORY_OPENED', { timestamp: Date.now() });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Partially complete pot throwing
      QuestManager.emitEvent('ITEM_THROWN', {
        item: { id: 'sugar_pot', name: 'Sugar Pot' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const questsInProgress = QuestManager.getQuestsInProgress();
      
      // Should have both quests
      expect(questsInProgress).toHaveLength(2);
      
      // Find each quest
      const inventoryQuest = questsInProgress.find(q => q.id === 'open_inventory_quest');
      const potQuest = questsInProgress.find(q => q.id === 'pot_throwing_practice');
      
      // Inventory quest should be completed
      expect(inventoryQuest.state).toBe('COMPLETED');
      
      // Pot quest should still be active
      expect(potQuest.state).toBe('ACTIVE');
      
      // Check pot quest objectives
      const sugarObj = potQuest.objectives.find(o => o.id === 'throw_sugar_pot');
      const clayObj = potQuest.objectives.find(o => o.id === 'throw_clay_pot');
      
      expect(sugarObj.completed).toBe(true);
      expect(clayObj.completed).toBe(false);
    });
  });

  describe('Quest priority filtering', () => {
    it('should correctly identify MAIN quests', () => {
      QuestManager.startQuest(mockState, 'open_inventory_quest');
      
      const questsInProgress = QuestManager.getQuestsInProgress();
      const mainQuests = questsInProgress.filter(q => 
        q.priority === 'MAIN' || q.priority === 'TUTORIAL'
      );
      
      expect(mainQuests).toHaveLength(1);
      expect(mainQuests[0].priority).toBe('MAIN');
    });

    it('should correctly identify SIDE quests', () => {
      QuestManager.startQuest(mockState, 'pot_throwing_practice');
      
      const questsInProgress = QuestManager.getQuestsInProgress();
      const sideQuests = questsInProgress.filter(q => 
        !q.priority || q.priority === 'SIDE' || q.priority === 'OPTIONAL'
      );
      
      // Pot throwing quest has no priority set, so it defaults to SIDE
      expect(sideQuests).toHaveLength(1);
    });
  });
});