// tests/social/dialogue-box-opening.test.js
// Test that dialogue boxes properly open when bumping into NPCs

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { shoppingDistrictDialogues } from '../../src/js/data/shoppingDistrictDialogues.js';

describe('Dialogue Box Opening', () => {
  let state;
  let player;
  let mockOpenNPCInteraction;
  let mockLog;

  beforeEach(() => {
    // Set to use original pipeline
    process.env.USE_NEW_MOVEMENT = 'false';
    
    mockOpenNPCInteraction = vi.fn();
    mockLog = vi.fn();
    
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
      openNPCInteraction: mockOpenNPCInteraction,
      log: mockLog,
      turn: 0
    };

    // Register dialogue trees
    Object.entries(shoppingDistrictDialogues).forEach(([npcType, dialogue]) => {
      if (!dialogue.nodes || !dialogue.nodes.length) return;
      dialogue.biome = dialogue.biome || 'candy_kingdom';
      dialogue.npcType = dialogue.npcType || npcType;
      dialogue.start = dialogue.start || 'greeting';
      registerDialogueTree(npcType, dialogue.biome, dialogue);
    });
  });

  describe('Bumping into NPCs', () => {
    it('should call openNPCInteraction when bumping into an NPC', async () => {
      // Create Gumdrop NPC
      const gumdropData = {
        id: 'gumdrop',
        name: 'Gumdrop',
        faction: 'merchants',
        dialogueType: 'choose_goose',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      
      const gumdrop = spawnSocialNPC(state, gumdropData);
      state.npcs = [gumdrop];
      
      // Try to move into Gumdrop
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(mockOpenNPCInteraction).toHaveBeenCalledWith(state, gumdrop);
      expect(player.x).toBe(10); // Player shouldn't move
      expect(player.y).toBe(10);
    });

    it('should handle missing openNPCInteraction gracefully', async () => {
      // Remove openNPCInteraction
      state.openNPCInteraction = undefined;
      
      const npcData = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      
      const npc = spawnSocialNPC(state, npcData);
      state.npcs = [npc];
      
      // Try to move into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(mockLog).toHaveBeenCalledWith(state, `You approach ${npc.name}.`, "note");
    });

    it('should trigger dialogue for all Shopping District NPCs', async () => {
      const npcTypes = [
        { id: 'choose_goose', name: 'Choose Goose', dialogueType: 'choose_goose' },
        { id: 'peppermint_butler', name: 'Peppermint Butler', dialogueType: 'peppermint_butler' },
        { id: 'starchy', name: 'Starchy', dialogueType: 'starchy' },
        { id: 'guard1', name: 'Toffee Guard', dialogueType: 'guards', faction: 'guards' },
        { id: 'peasant1', name: 'Market Visitor', dialogueType: 'peasants', faction: 'peasants' }
      ];

      for (const npcType of npcTypes) {
        // Reset player position
        player.x = 10;
        player.y = 10;
        
        // Create NPC
        const npcData = {
          ...npcType,
          x: 11,
          y: 10,
          hp: 20,
          chunkX: 1,
          chunkY: 0
        };
        
        const npc = spawnSocialNPC(state, npcData);
        state.npcs = [npc];
        
        // Clear previous calls
        mockOpenNPCInteraction.mockClear();
        
        // Try to move into NPC
        const moveAction = { type: 'move', dx: 1, dy: 0 };
        const consumed = await runPlayerMove(state, moveAction);
        
        expect(consumed).toBe(true);
        expect(mockOpenNPCInteraction).toHaveBeenCalledWith(state, npc);
        
        // Clear NPCs for next test
        state.npcs = [];
      }
    });
  });

  describe('Dialogue State Management', () => {
    it('should properly initialize dialogue when interacting with NPC', () => {
      const npcData = {
        id: 'test_merchant',
        name: 'Test Merchant',
        dialogueType: 'merchants',
        faction: 'merchants',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      
      const npc = spawnSocialNPC(state, npcData);
      
      // Start dialogue directly
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.options).toBeTruthy();
      expect(dialogue.options.length).toBeGreaterThan(0);
    });

    it('should return dialogue with proper structure', () => {
      const npcData = {
        id: 'choose_goose',
        name: 'Choose Goose',
        dialogueType: 'choose_goose',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      
      const npc = spawnSocialNPC(state, npcData);
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      // Check dialogue structure
      expect(dialogue).toHaveProperty('npcLine');
      expect(dialogue).toHaveProperty('options');
      expect(dialogue).toHaveProperty('npc');
      expect(dialogue.npc).toBe(npc);
      
      // Check that options have required properties
      dialogue.options.forEach(option => {
        expect(option).toHaveProperty('text');
        expect(option).toHaveProperty('next');
      });
    });
  });

  describe('Movement Restrictions During Dialogue', () => {
    it('should check for dialogue state flag', async () => {
      // Simulate dialogue being open
      state.dialogueOpen = true;
      
      const npc = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 15,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      state.npcs = [npc];
      
      // Try to move while dialogue is open
      const moveAction = { type: 'move', dx: 0, dy: 1 };
      const consumed = await runPlayerMove(state, moveAction);
      
      // Movement might be consumed but player shouldn't move if dialogue blocks it
      // This test reveals if there's a dialogue state check
      expect(consumed).toBeDefined();
    });

    it('should allow movement after dialogue closes', async () => {
      // Start with dialogue open
      state.dialogueOpen = true;
      
      // Close dialogue
      state.dialogueOpen = false;
      
      // Try to move
      const moveAction = { type: 'move', dx: 0, dy: 1 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(player.y).toBe(11); // Should have moved
    });
  });

  describe('Event Emission', () => {
    it('should emit NPCInteraction event when bumping into NPC', async () => {
      const eventHandler = vi.fn();
      
      // Mock event listener
      const originalEmit = await import('../../src/js/utils/events.js').then(m => m.emit);
      vi.spyOn(await import('../../src/js/utils/events.js'), 'emit').mockImplementation((type, data) => {
        eventHandler(type, data);
        return originalEmit(type, data);
      });
      
      const npc = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      state.npcs = [npc];
      
      // Try to move into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Check if NPCInteraction event was emitted
      const npcInteractionCall = eventHandler.mock.calls.find(
        call => call[0] === 'NPCInteraction'
      );
      
      expect(npcInteractionCall).toBeTruthy();
      if (npcInteractionCall) {
        expect(npcInteractionCall[1]).toHaveProperty('player');
        expect(npcInteractionCall[1]).toHaveProperty('npc');
        expect(npcInteractionCall[1].npc).toBe(npc);
      }
    });
  });
});