import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Dialogue System Migration to NEW System', () => {
  let dialogueModule;
  
  beforeEach(() => {
    vi.resetModules();
    // Clear any global state
    if (global.window) {
      delete global.window.STATE;
    }
  });

  describe('DialogueTreesV2 in NEW location', () => {
    it('should export dialogue functions from new location', async () => {
      dialogueModule = await import('../../../src/social/dialogue.js');
      
      // Core dialogue functions
      expect(dialogueModule.getDialogueTree).toBeDefined();
      expect(typeof dialogueModule.getDialogueTree).toBe('function');
      
      expect(dialogueModule.registerDialogueTree).toBeDefined();
      expect(typeof dialogueModule.registerDialogueTree).toBe('function');
      
      expect(dialogueModule.evaluateDialogueConditions).toBeDefined();
      expect(typeof dialogueModule.evaluateDialogueConditions).toBe('function');
    });

    it('should export story flag functions', async () => {
      const { setStoryFlag, getStoryFlag, hasStoryFlag } = await import('../../../src/social/dialogue.js');
      
      expect(setStoryFlag).toBeDefined();
      expect(getStoryFlag).toBeDefined();
      expect(hasStoryFlag).toBeDefined();
      
      // Test flag operations
      setStoryFlag('test_flag', true);
      expect(getStoryFlag('test_flag')).toBe(true);
      expect(hasStoryFlag('test_flag')).toBe(true);
      
      setStoryFlag('test_flag', false);
      expect(getStoryFlag('test_flag')).toBe(false);
      expect(hasStoryFlag('test_flag')).toBe(false);
    });

    it('should register and retrieve dialogue trees', async () => {
      const { registerDialogueTree, getDialogueTree } = await import('../../../src/social/dialogue.js');
      
      const testTree = {
        id: 'test_tree',
        nodes: {
          start: {
            text: 'Hello there!',
            responses: [
              { text: 'Hi!', next: 'greeting' },
              { text: 'Goodbye', next: 'end' }
            ]
          },
          greeting: {
            text: 'How are you?',
            responses: [
              { text: 'Good', next: 'end' }
            ]
          },
          end: {
            text: 'Farewell!',
            responses: []
          }
        }
      };
      
      registerDialogueTree('test_npc', testTree);
      const retrieved = getDialogueTree('test_npc');
      
      expect(retrieved).toEqual(testTree);
      expect(retrieved.nodes.start.text).toBe('Hello there!');
    });

    it('should evaluate dialogue conditions', async () => {
      const { evaluateDialogueConditions } = await import('../../../src/social/dialogue.js');
      
      const state = {
        player: {
          gold: 100,
          level: 5,
          inventory: [{ id: 'sword' }]
        }
      };
      
      const npc = {
        id: 'test_npc',
        hasTrait: (trait) => trait === 'friendly'
      };
      
      // Test various condition types
      const conditions = {
        hasGold: { type: 'gold', amount: 50 },
        lacksGold: { type: 'gold', amount: 200 },
        hasItem: { type: 'item', item: 'sword' },
        lacksItem: { type: 'item', item: 'shield' },
        hasTrait: { type: 'trait', trait: 'friendly' },
        lacksTrait: { type: 'trait', trait: 'hostile' }
      };
      
      expect(evaluateDialogueConditions(conditions.hasGold, state, state.player, npc)).toBe(true);
      expect(evaluateDialogueConditions(conditions.lacksGold, state, state.player, npc)).toBe(false);
      expect(evaluateDialogueConditions(conditions.hasItem, state, state.player, npc)).toBe(true);
      expect(evaluateDialogueConditions(conditions.lacksItem, state, state.player, npc)).toBe(false);
      expect(evaluateDialogueConditions(conditions.hasTrait, state, state.player, npc)).toBe(true);
      expect(evaluateDialogueConditions(conditions.lacksTrait, state, state.player, npc)).toBe(false);
    });

    it('should handle dialogue with response conditions', async () => {
      const { registerDialogueTree, getDialogueTree, evaluateDialogueConditions } = 
        await import('../../../src/social/dialogue.js');
      
      const conditionalTree = {
        id: 'conditional_tree',
        nodes: {
          start: {
            text: 'Need help?',
            responses: [
              {
                text: 'Yes, I need gold',
                next: 'give_gold',
                condition: { type: 'gold', amount: 50, operator: '<' }
              },
              {
                text: 'No thanks',
                next: 'end'
              }
            ]
          },
          give_gold: {
            text: 'Here, take some gold!',
            action: { type: 'give_gold', amount: 10 },
            responses: [
              { text: 'Thanks!', next: 'end' }
            ]
          },
          end: {
            text: 'Goodbye!',
            responses: []
          }
        }
      };
      
      registerDialogueTree('helper_npc', conditionalTree);
      const tree = getDialogueTree('helper_npc');
      
      const state = { player: { gold: 30 } };
      const npc = { id: 'helper_npc' };
      
      // Check if poor player sees the help option
      const poorPlayerCanSeeHelp = evaluateDialogueConditions(
        tree.nodes.start.responses[0].condition,
        state,
        state.player,
        npc
      );
      expect(poorPlayerCanSeeHelp).toBe(true);
      
      // Rich player shouldn't see help option
      state.player.gold = 100;
      const richPlayerCanSeeHelp = evaluateDialogueConditions(
        tree.nodes.start.responses[0].condition,
        state,
        state.player,
        npc
      );
      expect(richPlayerCanSeeHelp).toBe(false);
    });

    it('should support dialogue effects and actions', async () => {
      const { processDialogueAction } = await import('../../../src/social/dialogue.js');
      
      const state = {
        player: {
          gold: 50,
          inventory: [],
          quests: { active: [] }
        }
      };
      
      const npc = {
        id: 'merchant',
        memory: {
          updateRelationship: vi.fn(),
          remember: vi.fn()
        }
      };
      
      // Test gold giving action
      processDialogueAction({ type: 'give_gold', amount: 25 }, state, npc);
      expect(state.player.gold).toBe(75);
      
      // Test item giving action
      processDialogueAction({ type: 'give_item', item: { id: 'potion', name: 'Health Potion' } }, state, npc);
      expect(state.player.inventory).toHaveLength(1);
      expect(state.player.inventory[0].id).toBe('potion');
      
      // Test quest giving action
      processDialogueAction({ type: 'give_quest', quest: 'find_artifact' }, state, npc);
      expect(state.player.quests.active).toContain('find_artifact');
      
      // Test relationship change
      processDialogueAction({ type: 'relationship', change: 10 }, state, npc);
      expect(npc.memory.updateRelationship).toHaveBeenCalledWith('player', 10);
    });

    it('should load dialogue data files', async () => {
      const { loadExpandedCandyKingdomDialogues } = await import('../../../src/social/dialogue.js');
      
      // Should be able to load dialogue data
      const loaded = await loadExpandedCandyKingdomDialogues();
      expect(loaded).toBe(true);
      
      // After loading, should have registered dialogues
      const { getDialogueTree } = await import('../../../src/social/dialogue.js');
      
      // Check that some expected dialogues are loaded
      const bananaGuardDialogue = getDialogueTree('candy_kingdom:banana_guard');
      if (bananaGuardDialogue) {
        expect(bananaGuardDialogue).toBeDefined();
        expect(bananaGuardDialogue.nodes).toBeDefined();
      }
    });

    it('should maintain backward compatibility with OLD dialogue format', async () => {
      const { registerDialogueTree, getDialogueForNPC } = await import('../../../src/social/dialogue.js');
      
      // OLD format dialogue
      const oldFormatDialogue = {
        start: {
          text: 'Hello, traveler!',
          responses: [
            { text: 'Hello', next: 'greeting' }
          ]
        },
        greeting: {
          text: 'Welcome to our village.',
          responses: []
        }
      };
      
      // Should accept OLD format (without id and nodes wrapper)
      registerDialogueTree('old_npc', oldFormatDialogue);
      
      const dialogue = getDialogueForNPC({ 
        dialogueType: 'old_npc',
        faction: 'peasants'
      }, 'village');
      
      expect(dialogue).toBeDefined();
      if (dialogue.nodes) {
        expect(dialogue.nodes.start.text).toBe('Hello, traveler!');
      } else {
        expect(dialogue.start.text).toBe('Hello, traveler!');
      }
    });

    it('should integrate with enhanced NPC class', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      const { getDialogueForNPC, registerDialogueTree } = await import('../../../src/social/dialogue.js');
      
      const testDialogue = {
        id: 'test_dialogue',
        nodes: {
          start: {
            text: 'Greetings!',
            responses: []
          }
        }
      };
      
      registerDialogueTree('test_type', testDialogue);
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        dialogueType: 'test_type',
        faction: 'peasants'
      });
      
      const dialogue = getDialogueForNPC(npc, 'test_biome');
      expect(dialogue).toBeDefined();
    });
  });

  describe('Dialogue lookup system', () => {
    it('should look up dialogue by biome and type', async () => {
      const { registerDialogueTree, getDialogueForNPC } = await import('../../../src/social/dialogue.js');
      
      // Register dialogues with biome keys
      registerDialogueTree('forest:animal', { 
        id: 'forest_animal',
        nodes: { start: { text: 'Forest creature speaks' } }
      });
      
      registerDialogueTree('candy_kingdom:guard', {
        id: 'candy_guard',
        nodes: { start: { text: 'Halt! Who goes there?' } }
      });
      
      // Test forest animal
      const forestAnimal = { dialogueType: 'animal', faction: 'forest_animals' };
      const forestDialogue = getDialogueForNPC(forestAnimal, 'forest');
      expect(forestDialogue).toBeDefined();
      expect(forestDialogue.nodes.start.text).toBe('Forest creature speaks');
      
      // Test candy kingdom guard
      const candyGuard = { dialogueType: 'guard', faction: 'guards' };
      const candyDialogue = getDialogueForNPC(candyGuard, 'candy_kingdom');
      expect(candyDialogue).toBeDefined();
      expect(candyDialogue.nodes.start.text).toBe('Halt! Who goes there?');
    });

    it('should fall back to faction dialogue if specific type not found', async () => {
      const { registerDialogueTree, getDialogueForNPC } = await import('../../../src/social/dialogue.js');
      
      // Register faction fallback
      registerDialogueTree('candy_kingdom:merchants', {
        id: 'merchant_generic',
        nodes: { start: { text: 'Want to trade?' } }
      });
      
      // NPC without specific dialogue type
      const merchant = { 
        faction: 'merchants',
        // No dialogueType specified
      };
      
      const dialogue = getDialogueForNPC(merchant, 'candy_kingdom');
      expect(dialogue).toBeDefined();
      expect(dialogue.nodes.start.text).toBe('Want to trade?');
    });

    it('should handle complex dialogue conditions', async () => {
      const { evaluateConditionInternal } = await import('../../../src/social/dialogue.js');
      
      const state = {
        player: {
          level: 10,
          gold: 100,
          inventory: [{ id: 'sword' }, { id: 'shield' }]
        }
      };
      
      const npc = {
        hasTrait: (t) => ['brave', 'loyal'].includes(t),
        memory: {
          getRelationship: () => 50
        }
      };
      
      // Test AND condition
      const andCondition = {
        and: [
          { type: 'level', level: 5, operator: '>=' },
          { type: 'gold', amount: 50, operator: '>=' }
        ]
      };
      expect(evaluateConditionInternal(andCondition, state, state.player, npc)).toBe(true);
      
      // Test OR condition
      const orCondition = {
        or: [
          { type: 'item', item: 'sword' },
          { type: 'item', item: 'bow' }
        ]
      };
      expect(evaluateConditionInternal(orCondition, state, state.player, npc)).toBe(true);
      
      // Test NOT condition
      const notCondition = {
        not: { type: 'trait', trait: 'evil' }
      };
      expect(evaluateConditionInternal(notCondition, state, state.player, npc)).toBe(true);
      
      // Test nested conditions
      const nestedCondition = {
        and: [
          { type: 'level', level: 5, operator: '>=' },
          {
            or: [
              { type: 'item', item: 'sword' },
              { type: 'gold', amount: 200, operator: '>=' }
            ]
          }
        ]
      };
      expect(evaluateConditionInternal(nestedCondition, state, state.player, npc)).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain same API as OLD dialogueTreesV2', async () => {
      const dialogueModule = await import('../../../src/social/dialogue.js');
      
      // All OLD functions should exist
      expect(dialogueModule.getDialogueTree).toBeDefined();
      expect(dialogueModule.registerDialogueTree).toBeDefined();
      expect(dialogueModule.setStoryFlag).toBeDefined();
      expect(dialogueModule.getStoryFlag).toBeDefined();
      expect(dialogueModule.loadExpandedCandyKingdomDialogues).toBeDefined();
      expect(dialogueModule.getDialogueForNPC).toBeDefined();
      expect(dialogueModule.evaluateDialogueConditions).toBeDefined();
      expect(dialogueModule.processDialogueAction).toBeDefined();
    });

    it('should work with existing dialogue data structures', async () => {
      const { registerDialogueTree, getDialogueTree } = await import('../../../src/social/dialogue.js');
      
      // OLD structure from candyKingdomDialoguesV3.js
      const oldDialogueStructure = {
        'candy_kingdom:banana_guard': {
          start: {
            text: "Halt! State your business in the Candy Kingdom.",
            responses: [
              {
                text: "I'm here to see Princess Bubblegum",
                next: "princess_business"
              },
              {
                text: "Just exploring",
                next: "exploring"
              }
            ]
          },
          princess_business: {
            text: "The Princess is very busy. Do you have an appointment?",
            responses: [
              {
                text: "No, but it's important",
                next: "end"
              }
            ]
          },
          exploring: {
            text: "Well, stay out of trouble!",
            responses: []
          },
          end: {
            text: "Move along then.",
            responses: []
          }
        }
      };
      
      // Register OLD format
      Object.entries(oldDialogueStructure).forEach(([key, tree]) => {
        registerDialogueTree(key, tree);
      });
      
      // Should be retrievable
      const retrieved = getDialogueTree('candy_kingdom:banana_guard');
      expect(retrieved).toBeDefined();
      
      // Should have the dialogue content
      if (retrieved.nodes) {
        expect(retrieved.nodes.start.text).toContain("Halt!");
      } else {
        expect(retrieved.start.text).toContain("Halt!");
      }
    });
  });
});