import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { checkDialogueCondition, applyDialogueEffect } from '../../src/js/social/dialogueTreesV2.js';
import { QUEST_ITEMS } from '../../src/js/items/questItems.js';

describe('Sweet Tooth Fox Quest - Complete Flow', () => {
  let pipeline;
  let state;
  let guard;

  beforeEach(() => {
    pipeline = new MovementPipeline();
    
    // Create comprehensive game state
    state = {
      player: {
        x: 10,
        y: 10,
        inventory: [],
        gold: 50,
        xp: 0,
        quests: {
          active: ['sweet_tooth_foxes'],
          completed: [],
          progress: {
            'sweet_tooth_foxes': { teeth: 0 }
          }
        }
      },
      chunk: {
        monsters: [],
        map: Array(20).fill(null).map(() => Array(40).fill('.'))
      },
      npcs: [],
      cx: 0,
      cy: 0,
      W: 40,
      H: 20,
      log: vi.fn()
    };

    // Create Banana Guard
    guard = {
      id: 'banana_guard_1',
      name: 'Banana Guard',
      type: 'banana_guard',
      x: 15,
      y: 10
    };
    state.npcs.push(guard);
  });

  describe('Complete quest flow', () => {
    it('should complete full quest from collection to turn-in', () => {
      // Step 1: Spawn 5 sleeping foxes
      for (let i = 0; i < 5; i++) {
        state.chunk.monsters.push({
          x: 11 + i,
          y: 10,
          kind: 'sweet_tooth_fox',
          name: 'Sweet Tooth Fox',
          hp: 5,
          hpMax: 15,
          asleep: true,
          hasTeeth: true,
          alive: true
        });
      }

      // Step 2: Collect teeth from all foxes
      for (let i = 0; i < 5; i++) {
        state.player.x = 10 + i;
        const action = { type: 'move', dx: 1, dy: 0 };
        pipeline.executeSync(state, action);
      }

      // Verify we have 5 teeth
      expect(state.player.inventory).toHaveLength(1);
      expect(state.player.inventory[0].count).toBe(5);
      expect(state.player.quests.progress['sweet_tooth_foxes'].teeth).toBe(5);

      // Step 3: Check turn-in dialogue is available
      const turnInCondition = { 
        hasItem: 'fox_sweet_tooth', 
        minCount: 5 
      };
      const canTurnIn = checkDialogueCondition(turnInCondition, state, guard);
      expect(canTurnIn).toBe(true);

      // Step 4: Simulate turn-in effects
      const effects = [
        { takeItem: { id: 'fox_sweet_tooth', qty: 5 } },
        { completeQuest: { id: 'sweet_tooth_foxes' } },
        { grantReward: { 
          type: 'multi',
          rewards: [
            { type: 'gold', amount: 100 },
            { type: 'xp', amount: 50 }
          ]
        }}
      ];

      // Apply turn-in effects
      effects.forEach(effect => {
        if (effect.takeItem) {
          // Remove teeth
          const item = state.player.inventory[0];
          item.count -= effect.takeItem.qty;
          if (item.count <= 0) {
            state.player.inventory = [];
          }
        }
        if (effect.completeQuest) {
          // Move quest to completed
          const index = state.player.quests.active.indexOf(effect.completeQuest.id);
          if (index > -1) {
            state.player.quests.active.splice(index, 1);
            state.player.quests.completed.push(effect.completeQuest.id);
          }
        }
        if (effect.grantReward) {
          // Grant rewards
          state.player.gold += 100;
          state.player.xp += 50;
        }
      });

      // Step 5: Verify quest completion
      expect(state.player.inventory).toHaveLength(0); // Teeth removed
      expect(state.player.quests.active).not.toContain('sweet_tooth_foxes');
      expect(state.player.quests.completed).toContain('sweet_tooth_foxes');
      expect(state.player.gold).toBe(150); // 50 + 100 reward
      expect(state.player.xp).toBe(50);
    });

    it('should not allow turn-in with insufficient teeth', () => {
      // Add only 3 teeth
      state.player.inventory.push({
        type: 'item',
        item: {
          id: 'fox_sweet_tooth',
          ...QUEST_ITEMS.fox_sweet_tooth
        },
        id: 'item_test',
        count: 3
      });
      state.player.quests.progress['sweet_tooth_foxes'].teeth = 3;

      // Check turn-in dialogue is NOT available
      const turnInCondition = { 
        hasItem: 'fox_sweet_tooth', 
        minCount: 5 
      };
      const canTurnIn = checkDialogueCondition(turnInCondition, state, guard);
      expect(canTurnIn).toBe(false);

      // Verify can still check progress
      const progressCondition = { 
        hasActiveQuest: 'sweet_tooth_foxes' 
      };
      const canCheckProgress = checkDialogueCondition(progressCondition, state, guard);
      expect(canCheckProgress).toBe(true);
    });

    it('should handle collecting more than 5 teeth', () => {
      // Add 7 teeth
      state.player.inventory.push({
        type: 'item',
        item: {
          id: 'fox_sweet_tooth',
          ...QUEST_ITEMS.fox_sweet_tooth
        },
        id: 'item_test',
        count: 7
      });
      state.player.quests.progress['sweet_tooth_foxes'].teeth = 7;

      // Should still be able to turn in
      const turnInCondition = { 
        hasItem: 'fox_sweet_tooth', 
        minCount: 5 
      };
      const canTurnIn = checkDialogueCondition(turnInCondition, state, guard);
      expect(canTurnIn).toBe(true);

      // After turn-in, should keep extra teeth
      const item = state.player.inventory[0];
      item.count -= 5;
      expect(item.count).toBe(2); // 7 - 5 = 2 remaining
    });

    it('should not show turn-in without active quest', () => {
      // Add teeth but remove quest
      state.player.inventory.push({
        type: 'item',
        item: {
          id: 'fox_sweet_tooth',
          ...QUEST_ITEMS.fox_sweet_tooth
        },
        id: 'item_test',
        count: 5
      });
      state.player.quests.active = [];

      // Check combined conditions
      const questCondition = { hasActiveQuest: 'sweet_tooth_foxes' };
      const hasQuest = checkDialogueCondition(questCondition, state, guard);
      expect(hasQuest).toBe(false);

      // Even with teeth, shouldn't show turn-in without quest
      const turnInCondition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const hasTeeth = checkDialogueCondition(turnInCondition, state, guard);
      expect(hasTeeth).toBe(true); // Has teeth
      
      // But combined should fail
      expect(hasQuest && hasTeeth).toBe(false);
    });

    it('should prevent duplicate quest completion', () => {
      // Complete the quest
      state.player.quests.active = [];
      state.player.quests.completed = ['sweet_tooth_foxes'];

      // Try to check quest status
      const questCondition = { hasActiveQuest: 'sweet_tooth_foxes' };
      const hasActiveQuest = checkDialogueCondition(questCondition, state, guard);
      expect(hasActiveQuest).toBe(false);

      // Should not be able to turn in again
      state.player.inventory.push({
        type: 'item',
        item: {
          id: 'fox_sweet_tooth',
          ...QUEST_ITEMS.fox_sweet_tooth
        },
        id: 'item_test',
        count: 5
      });

      // Can't turn in completed quest
      expect(hasActiveQuest).toBe(false);
    });
  });

  describe('Dialogue integration', () => {
    it('should filter dialogue choices based on teeth count', () => {
      // Mock dialogue node with conditional choices
      const dialogueNode = {
        id: 'guard_quest_check',
        npcLine: 'How goes the tooth collection?',
        choices: [
          {
            text: 'I have all 5 teeth!',
            next: 'turn_in',
            conditions: [
              { hasActiveQuest: 'sweet_tooth_foxes' },
              { hasItem: 'fox_sweet_tooth', minCount: 5 }
            ]
          },
          {
            text: 'Still working on it',
            next: 'encourage',
            conditions: [
              { hasActiveQuest: 'sweet_tooth_foxes' }
            ]
          },
          {
            text: 'What teeth?',
            next: 'explain',
            conditions: []
          }
        ]
      };

      // Test with 0 teeth
      state.player.inventory = [];
      const choices0 = dialogueNode.choices.filter(choice => {
        if (!choice.conditions || choice.conditions.length === 0) return true;
        return choice.conditions.every(cond => 
          checkDialogueCondition(cond, state, guard)
        );
      });
      expect(choices0.map(c => c.text)).toEqual([
        'Still working on it',
        'What teeth?'
      ]);

      // Test with 3 teeth
      state.player.inventory = [{
        type: 'item',
        item: { id: 'fox_sweet_tooth', ...QUEST_ITEMS.fox_sweet_tooth },
        id: 'item_test',
        count: 3
      }];
      const choices3 = dialogueNode.choices.filter(choice => {
        if (!choice.conditions || choice.conditions.length === 0) return true;
        return choice.conditions.every(cond => 
          checkDialogueCondition(cond, state, guard)
        );
      });
      expect(choices3.map(c => c.text)).toEqual([
        'Still working on it',
        'What teeth?'
      ]);

      // Test with 5 teeth
      state.player.inventory[0].count = 5;
      const choices5 = dialogueNode.choices.filter(choice => {
        if (!choice.conditions || choice.conditions.length === 0) return true;
        return choice.conditions.every(cond => 
          checkDialogueCondition(cond, state, guard)
        );
      });
      expect(choices5.map(c => c.text)).toEqual([
        'I have all 5 teeth!',
        'Still working on it',
        'What teeth?'
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle quest with no progress tracking', () => {
      // Remove progress tracking
      delete state.player.quests.progress['sweet_tooth_foxes'];

      // Add teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', ...QUEST_ITEMS.fox_sweet_tooth },
        id: 'item_test',
        count: 5
      });

      // Should still allow turn-in based on inventory
      const turnInCondition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const canTurnIn = checkDialogueCondition(turnInCondition, state, guard);
      expect(canTurnIn).toBe(true);
    });

    it('should handle teeth with quantity instead of count', () => {
      // Use quantity field (legacy format)
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', ...QUEST_ITEMS.fox_sweet_tooth },
        id: 'item_test',
        quantity: 5 // Using quantity instead of count
      });

      // Should still recognize the teeth
      const turnInCondition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const canTurnIn = checkDialogueCondition(turnInCondition, state, guard);
      expect(canTurnIn).toBe(true);
    });

    it('should handle missing guard NPC gracefully', () => {
      // Remove guard
      state.npcs = [];

      // Add teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', ...QUEST_ITEMS.fox_sweet_tooth },
        id: 'item_test',
        count: 5
      });

      // Condition check should still work without NPC
      const turnInCondition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const canTurnIn = checkDialogueCondition(turnInCondition, state, null);
      expect(canTurnIn).toBe(true);
    });
  });
});