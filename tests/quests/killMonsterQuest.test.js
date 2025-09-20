import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestManager } from '../../src/js/world/quests/QuestManager.js';

// Mock DOM elements
const mockElement = {
  style: { display: 'none', cssText: '' },
  innerHTML: '',
  className: '',
  appendChild: vi.fn()
};

global.document = {
  getElementById: vi.fn(() => mockElement),
  createElement: vi.fn(() => ({
    className: '',
    style: { cssText: '' },
    appendChild: vi.fn(),
    innerHTML: ''
  }))
};

describe('Kill Monster Quest', () => {
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
      ui: {},
      log: vi.fn(),
      render: vi.fn()
    };
  });

  it('should start kill monster quest successfully', () => {
    // Initialize quest system
    QuestManager.initialize(mockState);

    // Start the quest
    const started = QuestManager.startQuest(mockState, 'kill_monster_quest');
    expect(started).toBe(true);
    expect(mockState.player.quests.active).toContain('kill_monster_quest');
    
    // Verify quest state
    const quest = QuestManager.getQuest('kill_monster_quest');
    expect(quest).toBeDefined();
    expect(quest.name).toBe('Kill a Monster');
    expect(quest.state).toBe('ACTIVE');
    expect(quest.objectives).toHaveLength(1);
    expect(quest.objectives[0].id).toBe('kill_monster');
    expect(quest.objectives[0].completed).toBe(false);
    
    // Verify flag was set
    expect(mockState.flags.monster_kill_quest_started).toBe(true);
  });

  it('should complete objective when MONSTER_KILLED event is emitted', async () => {
    // Initialize and start quest
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'kill_monster_quest');

    // Verify quest is active
    expect(QuestManager.isQuestActive('kill_monster_quest')).toBe(true);

    // Emit monster killed event
    QuestManager.emitEvent('MONSTER_KILLED', {
      monster: {
        id: 'slime_1',
        name: 'Green Slime',
        kind: 'slime',
        x: 10,
        y: 10,
        tier: 1
      },
      timestamp: Date.now()
    });

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that objective was completed
    const quest = QuestManager.getQuest('kill_monster_quest');
    expect(quest.objectives[0].completed).toBe(true);
    expect(quest.objectives[0].progress).toBe(1);
    expect(quest.state).toBe('COMPLETED');

    // Verify quest can be turned in
    expect(QuestManager.canTurnInQuest('kill_monster_quest')).toBe(true);
  });

  it('should grant rewards when quest is completed', async () => {
    // Initialize and start quest
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'kill_monster_quest');

    // Complete the objective
    QuestManager.emitEvent('MONSTER_KILLED', {
      monster: {
        id: 'goblin_1',
        name: 'Goblin',
        kind: 'goblin',
        x: 5,
        y: 5,
        tier: 2
      },
      timestamp: Date.now()
    });

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Turn in the quest
    const rewards = QuestManager.completeQuest(mockState, 'kill_monster_quest');

    // Verify rewards
    expect(rewards).toEqual({
      gold: 5250,
      experience: 1000,
      items: []
    });

    // Verify rewards were applied
    expect(mockState.player.gold).toBe(5250);
    expect(mockState.player.experience).toBe(1000);

    // Verify quest is marked as completed
    expect(mockState.player.quests.active).not.toContain('kill_monster_quest');
    expect(mockState.player.quests.completed).toContain('kill_monster_quest');
    expect(QuestManager.isQuestCompleted('kill_monster_quest')).toBe(true);
    
    // Verify completion flag was set
    expect(mockState.flags.monster_kill_quest_completed).toBe(true);
  });

  it('should not start quest twice', () => {
    QuestManager.initialize(mockState);

    // Start quest first time
    const firstStart = QuestManager.startQuest(mockState, 'kill_monster_quest');
    expect(firstStart).toBe(true);

    // Try to start again
    const secondStart = QuestManager.startQuest(mockState, 'kill_monster_quest');
    expect(secondStart).toBe(false);
    
    // Should still only have one active quest
    expect(mockState.player.quests.active).toHaveLength(1);
  });

  it('should log appropriate messages during quest lifecycle', async () => {
    const logSpy = vi.spyOn(mockState, 'log');
    
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'kill_monster_quest');

    // Check onStart was called
    expect(logSpy).toHaveBeenCalledWith(
      "'Steven! Kill a monster!'",
      "quest"
    );

    // Complete the quest
    QuestManager.emitEvent('MONSTER_KILLED', {
      monster: { id: 'zombie_1', name: 'Zombie', kind: 'zombie' },
      timestamp: Date.now()
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    QuestManager.completeQuest(mockState, 'kill_monster_quest');
    
    // Check onComplete was called
    expect(logSpy).toHaveBeenCalledWith(
      "Steven: 'WOW! You're a natural killer!'",
      "quest"
    );
    expect(logSpy).toHaveBeenCalledWith(
      "'Here's your reward for killing that thing!'",
      "quest"
    );
  });

  it('should track quest progress correctly', async () => {
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'kill_monster_quest');

    // Check initial progress
    let progress = QuestManager.questService.getQuestProgress('kill_monster_quest');
    expect(progress.totalObjectives).toBe(1);
    expect(progress.completedObjectives).toBe(0);
    expect(progress.percentComplete).toBe(0);

    // Kill a monster
    QuestManager.emitEvent('MONSTER_KILLED', {
      monster: { id: 'bat_1', name: 'Bat', kind: 'bat' },
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Check updated progress
    progress = QuestManager.questService.getQuestProgress('kill_monster_quest');
    expect(progress.completedObjectives).toBe(1);
    expect(progress.percentComplete).toBe(100);
  });

  it('should appear in quest menu when active', () => {
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'kill_monster_quest');

    // Get quests in progress
    const questsInProgress = QuestManager.getQuestsInProgress();
    
    // Should find the quest
    const killQuest = questsInProgress.find(q => q.id === 'kill_monster_quest');
    expect(killQuest).toBeDefined();
    expect(killQuest.priority).toBe('SIDE');
    expect(killQuest.state).toBe('ACTIVE');
  });

  it('should show as ready to turn in after completing objective', async () => {
    QuestManager.initialize(mockState);
    QuestManager.startQuest(mockState, 'kill_monster_quest');

    // Kill a monster
    QuestManager.emitEvent('MONSTER_KILLED', {
      monster: { id: 'skeleton_1', name: 'Skeleton', kind: 'skeleton' },
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Get quests in progress
    const questsInProgress = QuestManager.getQuestsInProgress();
    const killQuest = questsInProgress.find(q => q.id === 'kill_monster_quest');
    
    // Should still be in progress but marked as completed
    expect(killQuest).toBeDefined();
    expect(killQuest.state).toBe('COMPLETED');
    
    // Should be ready to turn in
    expect(QuestManager.canTurnInQuest('kill_monster_quest')).toBe(true);
  });
});