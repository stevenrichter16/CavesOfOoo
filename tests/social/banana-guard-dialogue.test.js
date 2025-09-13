// tests/social/banana-guard-dialogue.test.js
// Test Banana Guard dialogue interaction issue

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { candyKingdomDialoguesV3 } from '../../src/js/data/candyKingdomDialoguesV3.js';
import { openNPCInteraction } from '../../src/js/ui/social.js';
import { openDialogueTree } from '../../src/js/ui/dialogueTree.js';

describe('Banana Guard Dialogue', () => {
  let state;
  let player;
  let mockRender;

  beforeEach(() => {
    // Set to use original pipeline
    process.env.USE_NEW_MOVEMENT = 'false';
    
    mockRender = vi.fn();
    
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
        socialMenuOpen: false,
        selectedNPCId: null,
        socialActionIndex: 0
      },
      openNPCInteraction: (s, npc) => openNPCInteraction(s, npc)
    };

    // Register V3 dialogue trees
    candyKingdomDialoguesV3.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('Banana Guard Setup', () => {
    it('should have banana_guard dialogue registered', () => {
      const bananaGuardData = {
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
      
      const guard = spawnSocialNPC(state, bananaGuardData);
      expect(guard).toBeTruthy();
      expect(guard.dialogueType).toBe('banana_guard');
      
      // Test that dialogue can be started
      const dialogue = startDialogue(state, player, guard, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.npcLine).toContain('HALT');
    });

    it('should find banana_guard dialogue tree', () => {
      // Check if the banana_guard tree is in V3 dialogues
      const bananaGuardTree = candyKingdomDialoguesV3.trees.find(
        tree => tree.npcType === 'banana_guard'
      );
      
      expect(bananaGuardTree).toBeTruthy();
      expect(bananaGuardTree.biome).toBe('candy_kingdom');
      expect(bananaGuardTree.nodes).toBeTruthy();
      expect(bananaGuardTree.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Dialogue Opening on Bump', () => {
    it('should trigger openNPCInteraction when bumping into Banana Guard', async () => {
      const mockOpenNPCInteraction = vi.fn();
      state.openNPCInteraction = mockOpenNPCInteraction;
      
      // Create Banana Guard
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
      state.npcs = [guard];
      
      // Try to move into guard
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(mockOpenNPCInteraction).toHaveBeenCalled();
      expect(mockOpenNPCInteraction).toHaveBeenCalledWith(state, guard);
      expect(player.x).toBe(10); // Player shouldn't move
    });

    it('should set dialogue UI state when opening dialogue', () => {
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
      
      // Call openNPCInteraction directly
      openNPCInteraction(state, guard);
      
      // Should set dialogue tree open
      expect(state.ui.dialogueTreeOpen).toBe(true);
      expect(state.ui.socialMenuOpen).toBe(false);
    });

    it('should create dialogue UI container', () => {
      // Mock document methods
      const mockContainer = {
        id: 'dialogue-tree',
        style: { display: 'none', cssText: '' },
        innerHTML: ''
      };
      
      global.document = {
        getElementById: vi.fn((id) => {
          if (id === 'dialogue-tree') return null; // First time, no container
          return mockContainer;
        }),
        createElement: vi.fn(() => mockContainer),
        body: {
          appendChild: vi.fn()
        }
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
      
      // Open dialogue tree
      openDialogueTree(state, guard);
      
      // Check that container was created
      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockContainer);
      expect(mockContainer.style.display).toBe('block');
    });
  });

  describe('Movement During Dialogue', () => {
    it('should not restrict movement when dialogue is not open', async () => {
      // No dialogue open
      state.ui.dialogueTreeOpen = false;
      state.ui.socialMenuOpen = false;
      
      // Try vertical movement
      player.y = 10;
      const moveUp = { type: 'move', dx: 0, dy: -1 };
      let consumed = await runPlayerMove(state, moveUp);
      expect(consumed).toBe(true);
      expect(player.y).toBe(9);
      
      // Try horizontal movement
      player.x = 10;
      const moveRight = { type: 'move', dx: 1, dy: 0 };
      consumed = await runPlayerMove(state, moveRight);
      expect(consumed).toBe(true);
      expect(player.x).toBe(11);
    });

    it('should handle stuck state after failed dialogue opening', async () => {
      // Simulate what happens when dialogue fails to open properly
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
      state.npcs = [guard];
      
      // Simulate partial dialogue state (what might cause the bug)
      state.ui.dialogueTreeOpen = false; // Dialogue didn't fully open
      state.ui.socialMenuOpen = false;   // But no menu either
      state.ui.selectedNPCId = guard.id; // But NPC is selected
      
      // Try vertical movement - should still work
      const moveUp = { type: 'move', dx: 0, dy: -1 };
      const consumed = await runPlayerMove(state, moveUp);
      expect(consumed).toBe(true);
      expect(player.y).toBe(9);
    });

    it('should properly clean up dialogue state on ESC', () => {
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
      
      // Open dialogue
      openNPCInteraction(state, guard);
      
      // Simulate ESC key
      const { closeDialogueTree } = require('../../src/js/ui/dialogueTree.js');
      closeDialogueTree(state);
      
      // Check state is cleaned up
      expect(state.ui.dialogueTreeOpen).toBe(false);
      expect(state.ui.socialMenuOpen).toBe(false);
    });
  });

  describe('Blue NPC Color Guards', () => {
    it('should identify blue NPCs as guards', () => {
      // Guards should be blue colored
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
        chunkY: 0,
        color: 'blue' // Explicitly set or check
      };
      
      const guard = spawnSocialNPC(state, guardData);
      
      // Guards faction should be recognized
      expect(guard.faction).toBe('guards');
      expect(['banana_guard', 'guards'].includes(guard.dialogueType)).toBe(true);
    });
  });
});