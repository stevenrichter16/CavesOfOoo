import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Shop Opening from Dialogue', () => {
  let dialogue;
  let ShopSystem;
  
  beforeEach(() => {
    vi.resetModules();
  });

  describe('Shop action handling', () => {
    it('should handle openShop string action', async () => {
      dialogue = await import('../../../src/social/dialogue.js');
      const { processDialogueAction } = dialogue;
      
      const state = {
        player: {
          gold: 100,
          inventory: []
        },
        ui: {}
      };
      
      const npc = {
        id: 'merchant',
        name: 'Test Merchant',
        shopkeeper: true,
        goods: [
          { id: 'potion', name: 'Potion', price: 10 }
        ]
      };
      
      // Test string action
      const result = processDialogueAction('openShop', state, npc);
      
      expect(result).toBeDefined();
      expect(result.opensShop).toBe(true);
      expect(result.closesDialogue).toBe(true);
      expect(result.goods).toEqual(npc.goods);
    });

    it('should handle openShop object action', async () => {
      const { processDialogueAction } = await import('../../../src/social/dialogue.js');
      
      const state = {
        player: { gold: 100 },
        ui: {}
      };
      
      const npc = {
        shopkeeper: true,
        goods: []
      };
      
      // Test object action
      const result = processDialogueAction({ type: 'shop', open: true }, state, npc);
      
      expect(result).toBeDefined();
      expect(result.opensShop).toBe(true);
    });

    it('should close dialogue when opening shop', async () => {
      const { startDialogue, selectChoice, getCurrentDialogue } = 
        await import('../../../src/social/dialogue.js');
      const { registerDialogueTree } = await import('../../../src/social/dialogue.js');
      
      // Register a test dialogue with shop option
      registerDialogueTree('test_merchant', {
        id: 'test_merchant',
        nodes: {
          start: {
            text: 'Welcome to my shop!',
            responses: [
              {
                text: 'Show me what you have',
                action: 'openShop'
              },
              {
                text: 'Goodbye',
                next: 'end'
              }
            ]
          },
          end: {
            text: 'Come back anytime!',
            responses: []
          }
        }
      });
      
      const state = { player: { gold: 100 } };
      const npc = {
        dialogueType: 'test_merchant',
        shopkeeper: true,
        goods: []
      };
      
      // Start dialogue
      startDialogue(state, state.player, npc);
      expect(getCurrentDialogue()).toBeDefined();
      
      // Select shop option
      const result = selectChoice(0);
      
      // Dialogue should be closed
      expect(result).toBe(null);
      expect(getCurrentDialogue()).toBe(null);
    });

    it('should handle shop dialogue in shopping district format', async () => {
      const { processDialogueAction } = await import('../../../src/social/dialogue.js');
      
      const state = {
        player: { gold: 100 },
        ui: {}
      };
      
      const npc = {
        id: 'sweet_tooth_fox',
        name: 'Sweet Tooth Fox',
        shopkeeper: true,
        goods: ['candy']
      };
      
      // Shopping district uses string actions
      const result = processDialogueAction('openShop', state, npc);
      
      expect(result).toBeDefined();
      expect(result.opensShop).toBe(true);
      expect(result.closesDialogue).toBe(true);
    });
  });

  describe('Integration with shop system', () => {
    it('should trigger shop opening through dialogue', async () => {
      const { startDialogue, selectChoice, registerDialogueTree } = 
        await import('../../../src/social/dialogue.js');
      
      // Mock console.log to check if shop opening is triggered
      const logSpy = vi.spyOn(console, 'log');
      
      registerDialogueTree('vendor', {
        id: 'vendor',
        nodes: {
          start: {
            text: 'Looking to buy something?',
            responses: [
              { text: 'Yes', action: 'openShop' },
              { text: 'No', next: 'end' }
            ]
          },
          end: {
            text: 'Maybe next time.',
            responses: []
          }
        }
      });
      
      const state = {
        player: { gold: 50 },
        ui: {}
      };
      
      const vendor = {
        dialogueType: 'vendor',
        shopkeeper: true,
        goods: [
          { id: 'item1', price: 10 }
        ]
      };
      
      startDialogue(state, state.player, vendor);
      selectChoice(0); // Choose "Yes"
      
      // Check that shop opening was logged
      expect(logSpy).toHaveBeenCalledWith(
        '[DIALOGUE] Opening shop for NPC:',
        undefined  // vendor.name is undefined in our test
      );
      
      logSpy.mockRestore();
    });
  });
});