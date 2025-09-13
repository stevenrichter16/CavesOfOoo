// tests/social/forest-animal-dialogue.test.js
// Test that forest animal dialogues properly open when bumping into NPCs
// This test is designed to reproduce and fix the bug where dialogue windows
// don't open but movement is still blocked

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { forestDialogues } from '../../src/js/data/forestDialogues.js';
import { generateForestChunk, spawnForestNPCs } from '../../src/js/world/theForest.js';

describe('Forest Animal Dialogue Bug', () => {
  let state;
  let player;
  let mockOpenNPCInteraction;
  let mockLog;
  let mockRender;

  beforeEach(() => {
    // Set to use original pipeline
    process.env.USE_NEW_MOVEMENT = 'false';
    
    mockOpenNPCInteraction = vi.fn();
    mockLog = vi.fn();
    mockRender = vi.fn();
    
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
    
    // Generate actual forest chunk
    const forestChunk = generateForestChunk(12345, 0, -2);
    // The chunk should already have both biome: 'forest' and isForest: true from generateForestChunk
    
    state = {
      player: player,
      cx: 0,
      cy: -2,
      chunk: forestChunk,
      npcs: [],
      openNPCInteraction: mockOpenNPCInteraction,
      log: mockLog,
      render: mockRender,
      turn: 0,
      ui: {
        dialogueOpen: false,
        socialMenuOpen: false
      }
    };

    // Register forest dialogue trees
    forestDialogues.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('Forest NPC Registration', () => {
    it('should have all forest animal dialogue types registered', () => {
      const expectedTypes = [
        'momma_bear',
        'teenage_bear',
        'mr_fox',
        'boobafina',
        'forest_wizard',
        'mrs_cow',
        'squirrel',
        'ants'
      ];

      expectedTypes.forEach(npcType => {
        const tree = forestDialogues.trees.find(t => t.npcType === npcType);
        expect(tree, `Missing dialogue tree for ${npcType}`).toBeTruthy();
        expect(tree.biome).toBe('forest');
        expect(tree.start).toBe('greeting');
        expect(tree.nodes).toBeTruthy();
        expect(tree.nodes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Forest NPC Spawning', () => {
    it('should spawn forest NPCs with correct dialogue types', () => {
      spawnForestNPCs(state);
      
      expect(state.npcs.length).toBeGreaterThan(0);
      
      // Check specific NPCs
      const mommaBear = state.npcs.find(npc => npc.id === 'momma_bear');
      expect(mommaBear).toBeTruthy();
      expect(mommaBear.dialogueType).toBe('momma_bear');
      expect(mommaBear.faction).toBe('forest_animals');
      
      const mrFox = state.npcs.find(npc => npc.id === 'mr_fox');
      expect(mrFox).toBeTruthy();
      expect(mrFox.dialogueType).toBe('mr_fox');
      expect(mrFox.faction).toBe('forest_animals');
    });
  });

  describe('Bumping into Forest Animals', () => {
    it('should call openNPCInteraction when bumping into Momma Bear', async () => {
      const mommaBear = spawnSocialNPC(state, {
        id: 'momma_bear',
        name: 'Momma Bear',
        type: 'npc',
        faction: 'forest_animals',
        dialogueType: 'momma_bear',
        x: 11,
        y: 10,
        hp: 40,
        hpMax: 40,
        traits: ['protective', 'nurturing', 'stern'],
        sprite: 'B',
        color: 'brown'
      });
      
      state.npcs = [mommaBear];
      
      // Try to move into Momma Bear
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(mockOpenNPCInteraction).toHaveBeenCalledWith(state, mommaBear);
      expect(player.x).toBe(10); // Player shouldn't move
      expect(player.y).toBe(10);
    });

    it('should trigger dialogue for all forest animals', async () => {
      const forestNPCTypes = [
        { id: 'momma_bear', name: 'Momma Bear', dialogueType: 'momma_bear' },
        { id: 'teenage_bear', name: 'Teenage Bear', dialogueType: 'teenage_bear' },
        { id: 'mr_fox', name: 'Mr. Fox', dialogueType: 'mr_fox' },
        { id: 'boobafina', name: 'Boobafina', dialogueType: 'boobafina' },
        { id: 'mrs_cow', name: 'Mrs. Cow', dialogueType: 'mrs_cow' },
        { id: 'squirrel_0', name: 'Squirrel', dialogueType: 'squirrel' },
        { id: 'bird_0', name: 'Forest Bird', dialogueType: 'bird' },
        { id: 'ant_colony', name: 'Ant Colony', dialogueType: 'ants' }
      ];

      for (const npcType of forestNPCTypes) {
        // Reset player position
        player.x = 10;
        player.y = 10;
        
        // Create NPC
        const npcData = {
          ...npcType,
          type: 'npc',
          faction: 'forest_animals',
          x: 11,
          y: 10,
          hp: 20,
          hpMax: 20
        };
        
        const npc = spawnSocialNPC(state, npcData);
        state.npcs = [npc];
        
        // Clear previous calls
        mockOpenNPCInteraction.mockClear();
        
        // Try to move into NPC
        const moveAction = { type: 'move', dx: 1, dy: 0 };
        const consumed = await runPlayerMove(state, moveAction);
        
        expect(consumed, `Failed for ${npcType.name}`).toBe(true);
        expect(mockOpenNPCInteraction, `openNPCInteraction not called for ${npcType.name}`).toHaveBeenCalledWith(state, npc);
        
        // Clear NPCs for next test
        state.npcs = [];
      }
    });
  });

  describe('Dialogue State Management for Forest NPCs', () => {
    it('should properly initialize dialogue for Momma Bear', () => {
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
      
      // Start dialogue directly
      const dialogue = startDialogue(state, player, mommaBear, 'forest');
      
      expect(dialogue).toBeTruthy();
      if (dialogue) {
        expect(dialogue.npcLine).toContain('Oh my! A visitor!');
        expect(dialogue.options).toBeTruthy();
        expect(dialogue.options.length).toBeGreaterThan(0);
      
        // Check for expected dialogue options
        const passOption = dialogue.options.find(opt => opt.text.includes('passing through'));
        expect(passOption).toBeTruthy();
      }
    });

    it('should show quest-specific dialogue when Sweet Tooth Fox quest is active', () => {
      // Give player the quest
      player.quests.active.push('sweet_tooth_foxes');
      
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
      
      const dialogue = startDialogue(state, player, mommaBear, 'forest');
      
      expect(dialogue).toBeTruthy();
      if (dialogue && dialogue.options) {
        const foxOption = dialogue.options.find(opt => opt.text.includes('foxes with sweet teeth'));
        expect(foxOption, 'Quest-specific dialogue option missing').toBeTruthy();
      }
    });

    it('should handle missing dialogue type gracefully', () => {
      // Create NPC with unregistered dialogue type
      const unknownNPC = spawnSocialNPC(state, {
        id: 'unknown_creature',
        name: 'Unknown Creature',
        dialogueType: 'unknown_forest_creature', // Not registered
        faction: 'forest_animals',
        x: 11,
        y: 10,
        hp: 20,
        hpMax: 20
      });
      
      // Should not throw, but return null or fallback dialogue
      const dialogue = startDialogue(state, player, unknownNPC, 'forest');
      
      // Depending on implementation, might return null or generic dialogue
      if (dialogue) {
        expect(dialogue.npcLine).toBeTruthy();
      }
    });
  });

  describe('Movement Blocking During Forest Dialogue', () => {
    it('should block movement when dialogue is open', async () => {
      const mommaBear = spawnSocialNPC(state, {
        id: 'momma_bear',
        name: 'Momma Bear',
        dialogueType: 'momma_bear',
        faction: 'forest_animals',
        x: 15, // Far enough away to not bump
        y: 10,
        hp: 40,
        hpMax: 40
      });
      
      state.npcs = [mommaBear];
      
      // Simulate dialogue being open
      state.ui.dialogueOpen = true;
      state.ui.currentDialogue = {
        npc: mommaBear,
        npcLine: 'Oh my! A visitor!',
        options: []
      };
      
      // Try to move while dialogue is open
      const initialX = player.x;
      const initialY = player.y;
      
      const moveAction = { type: 'move', dx: 0, dy: 1 };
      const consumed = await runPlayerMove(state, moveAction);
      
      // Movement should be blocked
      expect(player.x).toBe(initialX);
      expect(player.y).toBe(initialY);
    });

    it('should allow movement after dialogue closes', async () => {
      // Start with dialogue open
      state.ui.dialogueOpen = true;
      
      // Close dialogue
      state.ui.dialogueOpen = false;
      state.ui.currentDialogue = null;
      
      // Try to move
      const moveAction = { type: 'move', dx: 0, dy: 1 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(player.y).toBe(11); // Should have moved
    });
  });

  describe('Bug Reproduction: Dialogue Window Not Opening', () => {
    it('should set UI flags when opening dialogue', async () => {
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
      
      // Override openNPCInteraction to simulate what should happen
      state.openNPCInteraction = (state, npc) => {
        const dialogue = startDialogue(state, player, npc, 'forest');
        if (dialogue) {
          state.ui.dialogueOpen = true;
          state.ui.currentDialogue = dialogue;
          state.ui.socialMenuOpen = true;
        }
      };
      
      // Try to bump into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Check that UI flags are set
      expect(state.ui.dialogueOpen).toBe(true);
      expect(state.ui.currentDialogue).toBeTruthy();
      expect(state.ui.socialMenuOpen).toBe(true);
    });

    it('should call render after opening dialogue', async () => {
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
      
      // Override openNPCInteraction to track render calls
      state.openNPCInteraction = (state, npc) => {
        const dialogue = startDialogue(state, player, npc, 'forest');
        if (dialogue) {
          state.ui.dialogueOpen = true;
          state.ui.currentDialogue = dialogue;
          if (state.render) {
            state.render(state);
          }
        }
      };
      
      // Try to bump into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Check that render was called
      expect(mockRender).toHaveBeenCalledWith(state);
    });
  });
});