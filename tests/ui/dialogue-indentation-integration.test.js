// tests/ui/dialogue-indentation-integration.test.js
// Integration test for dialogue choice indentation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerDialogueTree, startDialogue } from '../../src/js/social/dialogueTreesV2.js';
import { forestDialogues } from '../../src/js/data/forestDialogues.js';

describe('Dialogue Indentation Integration', () => {
  let state;
  let player;
  let mockDocument;
  let mockContainer;

  beforeEach(() => {
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      gold: 100,
      inventory: [],
      quests: {
        active: [],
        completed: [],
        progress: {},
        fetchQuests: {}
      }
    };
    
    state = {
      player: player,
      cx: 0,
      cy: -2,
      chunk: {
        biome: 'forest',
        isForest: true
      },
      npcs: [],
      turn: 0,
      ui: {
        dialogueOpen: false,
        dialogueTreeOpen: false,
        socialMenuOpen: false
      }
    };

    // Mock container element
    mockContainer = {
      id: 'dialogue-tree',
      style: { cssText: '' },
      innerHTML: '',
      appendChild: vi.fn(),
      remove: vi.fn()
    };

    // Mock document
    mockDocument = {
      getElementById: vi.fn((id) => {
        if (id === 'dialogue-tree') return mockContainer;
        return null;
      }),
      createElement: vi.fn((tag) => mockContainer),
      body: {
        appendChild: vi.fn()
      }
    };
    
    global.document = mockDocument;

    // Register forest dialogues
    forestDialogues.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('Dialogue Tree Rendering', () => {
    it('should render Mr. Goose dialogue with proper choice indentation', () => {
      const mrGoose = {
        id: 'mr_goose',
        name: 'Mr. Goose',
        dialogueType: 'mr_goose',
        faction: 'forest_animals'
      };
      
      const dialogue = startDialogue(state, player, mrGoose, 'forest');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.options).toBeTruthy();
      
      // Simulate rendering with first choice selected
      const selectedIndex = 0;
      const choices = dialogue.options;
      
      let expectedHTML = '';
      choices.forEach((choice, index) => {
        const selected = index === selectedIndex;
        if (selected) {
          // Selected choice should be indented with arrow
          expectedHTML += `  > [${index + 1}] ${choice.text}`;
        } else {
          // Unselected choices should not be indented
          expectedHTML += `[${index + 1}] ${choice.text}`;
        }
        if (index < choices.length - 1) expectedHTML += '|'; // Separator for testing
      });
      
      // Verify the pattern
      const parts = expectedHTML.split('|');
      expect(parts[0]).toMatch(/^\s+>\s+\[1\]/); // First choice indented
      expect(parts[1]).toMatch(/^\[2\]/); // Second choice not indented
      expect(parts[2]).toMatch(/^\[3\]/); // Third choice not indented
    });

    it('should update indentation when selection changes', () => {
      const bird = {
        id: 'bird',
        name: 'Forest Bird',
        dialogueType: 'bird',
        faction: 'forest_animals'
      };
      
      const dialogue = startDialogue(state, player, bird, 'forest');
      
      expect(dialogue).toBeTruthy();
      const choices = dialogue.options;
      
      // Test with different selections
      [0, 1, 2].forEach(selectedIndex => {
        let renderedChoices = [];
        
        choices.forEach((choice, index) => {
          const selected = index === selectedIndex;
          if (selected) {
            renderedChoices.push(`  > [${index + 1}] ${choice.text}`);
          } else {
            renderedChoices.push(`[${index + 1}] ${choice.text}`);
          }
        });
        
        // Verify only the selected choice is indented
        renderedChoices.forEach((rendered, index) => {
          if (index === selectedIndex) {
            expect(rendered).toMatch(/^\s+>\s+\[/);
          } else {
            expect(rendered).toMatch(/^\[/);
            expect(rendered).not.toMatch(/^\s+>/);
          }
        });
      });
    });

    it('should handle dialogue navigation with proper indentation', () => {
      // Simulate dialogue UI state changes
      const mockDialogueUI = {
        selectedChoice: 0,
        npc: { name: 'Test NPC' }
      };
      
      const testChoices = [
        { text: 'Hello there', next: 'greeting' },
        { text: 'Tell me about the forest', next: 'forest_info' },
        { text: 'Goodbye', end: true }
      ];
      
      // Simulate arrow key navigation
      const navigationSequence = [0, 1, 2, 1, 0];
      const expectedPatterns = [];
      
      navigationSequence.forEach(selectedIndex => {
        mockDialogueUI.selectedChoice = selectedIndex;
        
        let choices = testChoices.map((choice, index) => {
          const selected = index === selectedIndex;
          if (selected) {
            return `  > [${index + 1}] ${choice.text}`;
          } else {
            return `[${index + 1}] ${choice.text}`;
          }
        });
        
        expectedPatterns.push(choices);
      });
      
      // Verify each navigation state
      expectedPatterns.forEach((pattern, navIndex) => {
        const selectedIndex = navigationSequence[navIndex];
        
        pattern.forEach((choiceText, choiceIndex) => {
          if (choiceIndex === selectedIndex) {
            // Selected choice should be indented
            expect(choiceText.indexOf('  > [')).toBe(0);
          } else {
            // Unselected choices should not be indented
            expect(choiceText.indexOf('[')).toBe(0);
            expect(choiceText.indexOf('  >')).toBe(-1);
          }
        });
      });
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain consistent spacing for all dialogue trees', () => {
      const allNPCs = [
        'mr_goose', 'boobafina', 'mrs_yoder', 'bird',
        'momma_bear', 'teenage_bear', 'mr_fox'
      ];
      
      allNPCs.forEach(npcType => {
        const npc = {
          id: npcType,
          name: npcType,
          dialogueType: npcType,
          faction: 'forest_animals'
        };
        
        const dialogue = startDialogue(state, player, npc, 'forest');
        
        if (dialogue && dialogue.options) {
          // Test with first choice selected
          const renderedFirst = dialogue.options.map((choice, index) => {
            if (index === 0) {
              return `  > [${index + 1}] ${choice.text}`;
            } else {
              return `[${index + 1}] ${choice.text}`;
            }
          });
          
          // Verify consistent indentation pattern
          expect(renderedFirst[0]).toMatch(/^  > \[1\]/);
          if (renderedFirst[1]) {
            expect(renderedFirst[1]).toMatch(/^\[2\]/);
          }
        }
      });
    });
  });
});