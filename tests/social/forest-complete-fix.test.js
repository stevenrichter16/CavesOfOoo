// tests/social/forest-complete-fix.test.js
// Complete test to verify forest animal dialogue fix

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree, getCurrentNode } from '../../src/js/social/dialogueTreesV2.js';
import { forestDialogues } from '../../src/js/data/forestDialogues.js';
import { generateForestChunk } from '../../src/js/world/theForest.js';

describe('Forest Complete Fix Test', () => {
  let state;
  let player;

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
    
    // Generate actual forest chunk at correct coordinates
    const forestChunk = generateForestChunk(12345, 0, -2);
    
    state = {
      player: player,
      cx: 0,
      cy: -2, // Forest coordinates
      chunk: forestChunk,
      npcs: [],
      turn: 0,
      ui: {
        dialogueOpen: false,
        dialogueTreeOpen: false,
        socialMenuOpen: false
      },
      log: vi.fn(),
      render: vi.fn()
    };

    // Register ALL forest dialogue trees properly
    forestDialogues.trees.forEach(tree => {
      console.log(`Registering ${tree.npcType} for biome ${tree.biome}`);
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('Forest Chunk Properties', () => {
    it('should have correct biome and forest flag', () => {
      expect(state.chunk.biome).toBe('forest');
      expect(state.chunk.isForest).toBe(true);
      expect(state.cx).toBe(0);
      expect(state.cy).toBe(-2);
    });
  });

  describe('Dialogue Registration and Retrieval', () => {
    it('should successfully start dialogue with Momma Bear', () => {
      const mommaBear = {
        id: 'momma_bear',
        name: 'Momma Bear',
        dialogueType: 'momma_bear',
        faction: 'forest_animals',
        x: 11,
        y: 10,
        hp: 40,
        hpMax: 40
      };
      
      // This is what happens when you bump into an NPC
      const dialogue = startDialogue(state, player, mommaBear, 'forest');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('Oh my! A visitor!');
      expect(dialogue.options.length).toBeGreaterThanOrEqual(3); // At least 3 options (quest option is conditional)
      const passingOption = dialogue.options.find(opt => opt.text.includes('passing through'));
      expect(passingOption).toBeTruthy();
    });

    it('should work for all forest NPCs', () => {
      const forestNPCs = [
        { id: 'momma_bear', dialogueType: 'momma_bear', expectedText: 'visitor' },
        { id: 'teenage_bear', dialogueType: 'teenage_bear', expectedText: 'cool' },
        { id: 'mr_fox', dialogueType: 'mr_fox', expectedText: 'monocle' },
        { id: 'boobafina', dialogueType: 'boobafina', expectedText: 'HONK' },
        { id: 'mrs_cow', dialogueType: 'mrs_cow', expectedText: 'Moooo' },
        { id: 'squirrel', dialogueType: 'squirrel', expectedText: 'NUTS' },
        { id: 'ants', dialogueType: 'ants', expectedText: 'WE ARE MANY' },
        { id: 'forest_wizard', dialogueType: 'forest_wizard', expectedText: 'whisper' }
      ];

      forestNPCs.forEach(({ id, dialogueType, expectedText }) => {
        const npc = {
          id,
          name: id,
          dialogueType,
          faction: 'forest_animals',
          x: 11,
          y: 10,
          hp: 20,
          hpMax: 20
        };
        
        const dialogue = startDialogue(state, player, npc, 'forest');
        expect(dialogue, `Failed for ${id}`).toBeTruthy();
        expect(dialogue.npcLine, `Wrong text for ${id}`).toContain(expectedText);
      });
    });
  });

  describe('Movement and Interaction', () => {
    it('should open dialogue when bumping into forest animal', async () => {
      // Create mock for openNPCInteraction
      const mockOpenNPCInteraction = vi.fn((state, npc) => {
        // Simulate what the actual function does
        const dialogue = startDialogue(state, player, npc, 'forest');
        if (dialogue) {
          state.ui.dialogueTreeOpen = true;
          state.ui.currentDialogue = dialogue;
        }
      });
      
      state.openNPCInteraction = mockOpenNPCInteraction;
      
      const mommaBear = spawnSocialNPC(state, {
        id: 'momma_bear',
        name: 'Momma Bear',
        dialogueType: 'momma_bear',
        faction: 'forest_animals',
        x: 11,
        y: 10,
        hp: 40,
        hpMax: 40
      });
      
      state.npcs = [mommaBear];
      
      // Try to move into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(mockOpenNPCInteraction).toHaveBeenCalledWith(state, mommaBear);
      expect(state.ui.dialogueTreeOpen).toBe(true);
      expect(state.ui.currentDialogue).toBeTruthy();
      expect(player.x).toBe(10); // Player shouldn't move
    });

    it('should block movement while dialogue is open', async () => {
      // Set to use original pipeline which has the dialogue check
      process.env.USE_NEW_MOVEMENT = 'false';
      
      state.ui.dialogueTreeOpen = true;
      
      const initialX = player.x;
      const initialY = player.y;
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true); // Action consumed
      expect(player.x).toBe(initialX); // But player didn't move
      expect(player.y).toBe(initialY);
    });

    it('should allow movement after dialogue closes', async () => {
      // Start with dialogue open
      state.ui.dialogueTreeOpen = true;
      
      // Close dialogue
      state.ui.dialogueTreeOpen = false;
      state.ui.currentDialogue = null;
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(player.x).toBe(11); // Player moved
    });
  });

  describe('Quest-Specific Dialogue', () => {
    it('should show Sweet Tooth Fox quest options when quest is active', () => {
      player.quests.active.push('sweet_tooth_foxes');
      
      const mommaBear = {
        id: 'momma_bear',
        name: 'Momma Bear',
        dialogueType: 'momma_bear',
        faction: 'forest_animals',
        x: 11,
        y: 10,
        hp: 40,
        hpMax: 40
      };
      
      const dialogue = startDialogue(state, player, mommaBear, 'forest');
      
      expect(dialogue).toBeTruthy();
      if (dialogue && dialogue.options) {
        const foxOption = dialogue.options.find(opt => 
          opt.text.includes('foxes with sweet teeth')
        );
        expect(foxOption).toBeTruthy();
      }
    });
  });
});