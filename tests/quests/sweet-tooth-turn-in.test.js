import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkDialogueCondition } from '../../src/js/social/dialogueTreesV2.js';
import { grantQuestItem } from '../../src/js/items/questItems.js';

describe('Sweet Tooth Fox Quest Turn-In', () => {
  let state;
  let npc;

  beforeEach(() => {
    // Create base state with player
    state = {
      player: {
        x: 10,
        y: 10,
        inventory: [],
        quests: {
          active: ['sweet_tooth_foxes'],
          completed: [],
          progress: {
            'sweet_tooth_foxes': { teeth: 0 }
          }
        }
      },
      npcs: [],
      log: vi.fn()
    };

    // Create Banana Guard NPC
    npc = {
      id: 'banana_guard_1',
      name: 'Banana Guard',
      type: 'banana_guard',
      x: 11,
      y: 10
    };
  });

  describe('Dialogue condition checks', () => {
    it('should not show turn-in option with 0 teeth', () => {
      const condition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const result = checkDialogueCondition(condition, state, npc);
      expect(result).toBe(false);
    });

    it('should not show turn-in option with less than 5 teeth', () => {
      // Add 3 teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 3
      });
      state.player.quests.progress['sweet_tooth_foxes'].teeth = 3;

      const condition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const result = checkDialogueCondition(condition, state, npc);
      expect(result).toBe(false);
    });

    it('should show turn-in option with exactly 5 teeth', () => {
      // Add 5 teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 5
      });
      state.player.quests.progress['sweet_tooth_foxes'].teeth = 5;

      const condition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const result = checkDialogueCondition(condition, state, npc);
      expect(result).toBe(true);
    });

    it('should show turn-in option with more than 5 teeth', () => {
      // Add 7 teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 7
      });
      state.player.quests.progress['sweet_tooth_foxes'].teeth = 7;

      const condition = { hasItem: 'fox_sweet_tooth', minCount: 5 };
      const result = checkDialogueCondition(condition, state, npc);
      expect(result).toBe(true);
    });

    it('should check quest is active', () => {
      // Add teeth but no active quest
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 5
      });
      state.player.quests.active = [];

      const condition = { hasActiveQuest: 'sweet_tooth_foxes' };
      const result = checkDialogueCondition(condition, state, npc);
      expect(result).toBe(false);
    });

    it('should handle combined conditions for turn-in', () => {
      // Has quest and teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 5
      });

      // Check both conditions
      const hasQuest = checkDialogueCondition(
        { hasActiveQuest: 'sweet_tooth_foxes' }, 
        state, 
        npc
      );
      const hasTeeth = checkDialogueCondition(
        { hasItem: 'fox_sweet_tooth', minCount: 5 }, 
        state, 
        npc
      );

      expect(hasQuest).toBe(true);
      expect(hasTeeth).toBe(true);
    });
  });

  describe('Quest completion effects', () => {
    beforeEach(() => {
      // Add 5 teeth for turn-in
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 5
      });
      state.player.quests.progress['sweet_tooth_foxes'].teeth = 5;
    });

    it('should remove teeth from inventory on turn-in', () => {
      // Import effect handler
      import('../../src/js/social/dialogueTreesV2.js').then(module => {
        const effect = { takeItem: { id: 'fox_sweet_tooth', qty: 5 } };
        module.applyDialogueEffect(effect, state, npc);
        
        // Check teeth were removed
        const remaining = state.player.inventory.find(i => 
          i.item?.id === 'fox_sweet_tooth'
        );
        expect(remaining).toBeUndefined();
      });
    });

    it('should complete the quest', () => {
      import('../../src/js/social/dialogueTreesV2.js').then(module => {
        const effect = { completeQuest: { id: 'sweet_tooth_foxes' } };
        module.applyDialogueEffect(effect, state, npc);
        
        // Check quest is completed
        expect(state.player.quests.active).not.toContain('sweet_tooth_foxes');
        expect(state.player.quests.completed).toContain('sweet_tooth_foxes');
      });
    });

    it('should grant rewards', () => {
      import('../../src/js/social/dialogueTreesV2.js').then(module => {
        const initialGold = state.player.gold || 0;
        const initialXP = state.player.xp || 0;
        
        const effect = { 
          grantReward: { 
            type: 'multi',
            rewards: [
              { type: 'gold', amount: 100 },
              { type: 'xp', amount: 50 },
              { type: 'item', id: 'banana_charm' }
            ]
          }
        };
        
        module.applyDialogueEffect(effect, state, npc);
        
        // Check rewards
        expect(state.player.gold).toBe(initialGold + 100);
        expect(state.player.xp).toBe(initialXP + 50);
        
        const charm = state.player.inventory.find(i => 
          i.item?.id === 'banana_charm'
        );
        expect(charm).toBeDefined();
      });
    });

    it('should set completion flag', () => {
      import('../../src/js/social/dialogueTreesV2.js').then(module => {
        const effect = { setFlag: { flag: 'sweet_tooth_foxes_complete', value: true } };
        module.applyDialogueEffect(effect, state, npc);
        
        // Check flag is set
        expect(module.getStoryFlag('sweet_tooth_foxes_complete')).toBe(true);
      });
    });
  });

  describe('Turn-in dialogue flow', () => {
    it('should show correct dialogue options based on teeth count', () => {
      // Mock dialogue tree
      const dialogueTree = {
        nodes: [
          {
            id: 'fox_quest',
            npcLine: 'How goes the fox hunt?',
            playerChoices: [
              {
                text: 'I have the teeth you need!',
                next: 'quest_complete',
                conditions: [
                  { hasActiveQuest: 'sweet_tooth_foxes' },
                  { hasItem: 'fox_sweet_tooth', minCount: 5 }
                ]
              },
              {
                text: 'Still working on it',
                next: 'quest_progress',
                conditions: [
                  { hasActiveQuest: 'sweet_tooth_foxes' }
                ]
              }
            ]
          }
        ]
      };

      // No teeth - should only show "Still working"
      const choices1 = dialogueTree.nodes[0].playerChoices.filter(choice => {
        if (!choice.conditions) return true;
        return choice.conditions.every(cond => 
          checkDialogueCondition(cond, state, npc)
        );
      });
      expect(choices1).toHaveLength(1);
      expect(choices1[0].text).toBe('Still working on it');

      // Add 5 teeth
      state.player.inventory.push({
        type: 'item',
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        id: 'item_test_1',
        count: 5
      });

      // Should show both options now
      const choices2 = dialogueTree.nodes[0].playerChoices.filter(choice => {
        if (!choice.conditions) return true;
        return choice.conditions.every(cond => 
          checkDialogueCondition(cond, state, npc)
        );
      });
      expect(choices2).toHaveLength(2);
      expect(choices2[0].text).toBe('I have the teeth you need!');
    });
  });
});