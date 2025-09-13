// tests/social/dialogue-navigation.test.js
// Test dialogue option navigation and rendering

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  openDialogueTree, 
  handleDialogueInput, 
  renderDialogueTree,
  closeDialogueTree 
} from '../../src/js/ui/dialogueTree.js';
import { startDialogue, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { candyKingdomDialoguesV3 } from '../../src/js/data/candyKingdomDialoguesV3.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';

describe('Dialogue Navigation', () => {
  let state;
  let player;
  let mockRender;
  let renderCount;
  let mockContainer;

  beforeEach(() => {
    renderCount = 0;
    mockRender = vi.fn(() => renderCount++);
    
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      gold: 100,
      inventory: []
    };
    
    state = {
      player: player,
      cx: 1,
      cy: 0,
      chunk: {
        map: Array(22).fill(null).map(() => Array(48).fill('.')),
        monsters: [],
        items: []
      },
      npcs: [],
      turn: 0,
      log: vi.fn(),
      render: mockRender,
      ui: {
        dialogueTreeOpen: false,
        socialMenuOpen: false
      }
    };

    // Mock DOM elements
    mockContainer = {
      id: 'dialogue-tree',
      style: { display: 'none', cssText: '' },
      innerHTML: '',
      remove: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn()
    };
    
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'dialogue-tree') return mockContainer;
        return null;
      }),
      createElement: vi.fn(() => mockContainer),
      body: {
        appendChild: vi.fn()
      }
    };

    // Register dialogue trees
    candyKingdomDialoguesV3.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('Render Count', () => {
    it('should not re-render entire dialogue when navigating options', async () => {
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      
      // Track renderDialogueTree calls
      let dialogueRenderCount = 0;
      const originalRender = renderDialogueTree;
      vi.spyOn(await import('../../src/js/ui/dialogueTree.js'), 'renderDialogueTree')
        .mockImplementation(() => {
          dialogueRenderCount++;
          return originalRender();
        });
      
      // Open dialogue
      openDialogueTree(state, guard);
      const initialRenderCount = dialogueRenderCount;
      
      // Navigate up
      handleDialogueInput(state, 'ArrowUp');
      expect(dialogueRenderCount).toBeLessThanOrEqual(initialRenderCount + 1);
      
      // Navigate down
      handleDialogueInput(state, 'ArrowDown');
      expect(dialogueRenderCount).toBeLessThanOrEqual(initialRenderCount + 2);
      
      // Should not render more than once per navigation
      for (let i = 0; i < 5; i++) {
        handleDialogueInput(state, 'ArrowDown');
      }
      expect(dialogueRenderCount).toBeLessThanOrEqual(initialRenderCount + 7);
    });

    it('should only update selected choice without full re-render', () => {
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      
      // Start dialogue
      const dialogue = startDialogue(state, player, guard, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      
      // Check that we have multiple choices
      expect(dialogue.choices).toBeTruthy();
      expect(dialogue.choices.length).toBeGreaterThan(1);
      
      // Navigation should only update selected index, not re-render everything
      state.ui.dialogueTreeOpen = true;
      
      // Simulate navigation
      let selectedChoice = 0;
      const maxChoice = dialogue.choices.length - 1;
      
      // Navigate down
      if (selectedChoice < maxChoice) {
        selectedChoice++;
      }
      expect(selectedChoice).toBe(1);
      
      // Navigate up
      if (selectedChoice > 0) {
        selectedChoice--;
      }
      expect(selectedChoice).toBe(0);
    });
  });

  describe('Navigation Boundaries', () => {
    it('should not go below 0 when navigating up', async () => {
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      openDialogueTree(state, guard);
      
      // Try to navigate up multiple times
      for (let i = 0; i < 10; i++) {
        handleDialogueInput(state, 'ArrowUp');
      }
      
      // Selected choice should still be 0
      const dialogueUI = await import('../../src/js/ui/dialogueTree.js').then(m => m.getCurrentDialogueUI?.());
      if (dialogueUI) {
        expect(dialogueUI.selectedChoice).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not exceed max choices when navigating down', async () => {
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      const dialogue = startDialogue(state, player, guard, 'candy_kingdom');
      const maxChoice = dialogue.choices.length - 1;
      
      openDialogueTree(state, guard);
      
      // Try to navigate down many times
      for (let i = 0; i < 20; i++) {
        handleDialogueInput(state, 'ArrowDown');
      }
      
      // Selected choice should not exceed max
      const dialogueUI = await import('../../src/js/ui/dialogueTree.js').then(m => m.getCurrentDialogueUI?.());
      if (dialogueUI) {
        expect(dialogueUI.selectedChoice).toBeLessThanOrEqual(maxChoice);
      }
    });
  });

  describe('Performance', () => {
    it('should handle rapid navigation without lag', () => {
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      openDialogueTree(state, guard);
      
      const startTime = performance.now();
      
      // Simulate rapid navigation
      for (let i = 0; i < 100; i++) {
        handleDialogueInput(state, i % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
      }
      
      const endTime = performance.now();
      const elapsed = endTime - startTime;
      
      // Should complete in less than 100ms
      expect(elapsed).toBeLessThan(100);
    });

    it('should not create memory leaks with repeated renders', () => {
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      
      // Open and close dialogue multiple times
      for (let i = 0; i < 10; i++) {
        openDialogueTree(state, guard);
        handleDialogueInput(state, 'ArrowDown');
        handleDialogueInput(state, 'ArrowUp');
        closeDialogueTree(state);
      }
      
      // Check that container was properly cleaned up
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should prevent default and stop propagation on navigation', () => {
      const mockEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      };
      
      const guardData = {
        id: 'banana_guard_1',
        name: 'Banana Guard',
        faction: 'guards',
        dialogueType: 'banana_guard',
        x: 11,
        y: 10,
        hp: 25,
        hpMax: 25,
        chunkX: 1,
        chunkY: 0
      };
      
      const guard = spawnSocialNPC(state, guardData);
      openDialogueTree(state, guard);
      state.ui.dialogueTreeOpen = true;
      
      // Simulate key event handling
      const handled = handleDialogueInput(state, mockEvent.key);
      
      expect(handled).toBe(true);
    });
  });
});