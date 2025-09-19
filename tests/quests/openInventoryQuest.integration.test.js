import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestManager } from '../../src/js/world/quests/QuestManager.js';
import { openInventory } from '../../src/js/items/inventory.js';

// Mock DOM elements
const mockElement = {
  style: { display: 'none', cssText: '' },
  innerHTML: '',
  className: '',
  appendChild: vi.fn(),
  addEventListener: vi.fn(),
  querySelector: vi.fn(() => null)
};

global.document = {
  getElementById: vi.fn(() => mockElement),
  createElement: vi.fn(() => ({
    className: '',
    style: { cssText: '' },
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    innerHTML: ''
  })),
  querySelector: vi.fn(() => null),
  addEventListener: vi.fn()
};

describe('Open Inventory Quest Integration', () => {
  let mockState;

  beforeEach(() => {
    // Reset QuestManager state
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
        inventoryOpen: false,
        selectedIndex: 0,
        inventoryTab: null
      },
      log: vi.fn(),
      render: vi.fn()
    };
  });

  it('should complete full quest flow from start to completion', async () => {
    // Initialize quest system
    QuestManager.initialize(mockState);

    // Start the quest
    const started = QuestManager.startQuest(mockState, 'open_inventory_quest');
    expect(started).toBe(true);
    expect(mockState.player.quests.active).toContain('open_inventory_quest');

    // Verify quest is active
    expect(QuestManager.isQuestActive('open_inventory_quest')).toBe(true);
    
    // Get quest to check initial state
    const quest = QuestManager.getQuest('open_inventory_quest');
    expect(quest).toBeDefined();
    expect(quest.objectives[0].completed).toBe(false);

    // Simulate opening inventory
    openInventory(mockState);
    
    // Give the event system time to process
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that objective was completed
    const updatedQuest = QuestManager.getQuest('open_inventory_quest');
    expect(updatedQuest.objectives[0].completed).toBe(true);
    expect(updatedQuest.state).toBe('COMPLETED');

    // Verify quest can be turned in
    expect(QuestManager.canTurnInQuest('open_inventory_quest')).toBe(true);

    // Complete the quest and get rewards
    const rewards = QuestManager.completeQuest(mockState, 'open_inventory_quest');
    expect(rewards).toEqual({
      gold: 2000,
      experience: 10,
      items: []
    });

    // Verify rewards were applied
    expect(mockState.player.gold).toBe(2000);
    expect(mockState.player.experience).toBe(10);
    
    // Verify quest moved to completed
    expect(mockState.player.quests.active).not.toContain('open_inventory_quest');
    expect(mockState.player.quests.completed).toContain('open_inventory_quest');
    
    // Verify quest is marked as completed
    expect(QuestManager.isQuestCompleted('open_inventory_quest')).toBe(true);
    expect(QuestManager.isQuestActive('open_inventory_quest')).toBe(false);
  });

  it('should not start quest twice', () => {
    QuestManager.initialize(mockState);

    // Start quest first time
    const firstStart = QuestManager.startQuest(mockState, 'open_inventory_quest');
    expect(firstStart).toBe(true);

    // Try to start again
    const secondStart = QuestManager.startQuest(mockState, 'open_inventory_quest');
    expect(secondStart).toBe(false);
    
    // Should still only have one active quest
    expect(mockState.player.quests.active).toHaveLength(1);
  });

  it('should track quest progress', () => {
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'open_inventory_quest');

    const progress = QuestManager.questService.getQuestProgress('open_inventory_quest');
    
    expect(progress).toBeDefined();
    expect(progress.totalObjectives).toBe(1);
    expect(progress.completedObjectives).toBe(0);
    expect(progress.percentComplete).toBe(0);
    
    // Open inventory to complete objective
    openInventory(mockState);
    
    // Wait for event processing
    setTimeout(() => {
      const updatedProgress = QuestManager.questService.getQuestProgress('open_inventory_quest');
      expect(updatedProgress.completedObjectives).toBe(1);
      expect(updatedProgress.percentComplete).toBe(100);
    }, 10);
  });

  it('should call onStart and onComplete callbacks', () => {
    const startLogSpy = vi.spyOn(mockState, 'log');
    
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'open_inventory_quest');

    // Check onStart was called
    expect(startLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Steven: 'Ah, you look new here!"),
      "quest"
    );
    expect(mockState.flags.inventory_quest_started).toBe(true);

    // Complete the quest
    openInventory(mockState);
    
    setTimeout(() => {
      QuestManager.completeQuest(mockState, 'open_inventory_quest');
      
      // Check onComplete was called
      expect(startLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Steven: 'Excellent!"),
        "quest"
      );
      expect(mockState.flags.inventory_tutorial_completed).toBe(true);
    }, 10);
  });
});