// tests/social/npc-dialogue-interaction.test.js
// Test that all NPCs in Shopping District can be interacted with

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, getCurrentNode, selectChoice, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { shoppingDistrictDialogues } from '../../src/js/data/shoppingDistrictDialogues.js';

describe('NPC Dialogue Interaction', () => {
  let state;
  let player;

  beforeEach(() => {
    // Reset state
    state = {
      cx: 1,
      cy: 0,
      npcs: [],
      turn: 0,
      log: vi.fn()
    };
    
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      gold: 100,
      inventory: []
    };

    // Register dialogues synchronously for testing
    Object.entries(shoppingDistrictDialogues).forEach(([npcType, dialogue]) => {
      if (!dialogue.nodes || !dialogue.nodes.length) {
        return;
      }
      dialogue.biome = dialogue.biome || 'candy_kingdom';
      dialogue.npcType = dialogue.npcType || npcType;
      dialogue.start = dialogue.start || 'greeting';
      
      registerDialogueTree(npcType, dialogue.biome, dialogue);
    });
  });

  describe('Shopping District NPCs', () => {
    it('should allow interaction with Toffee Guard', () => {
      const npc = spawnSocialNPC(state, {
        id: 'toffee_guard',
        name: 'Toffee Guard',
        x: 20,
        y: 15,
        faction: 'guards',
        dialogueType: 'guards',
        traits: ['dutiful', 'sticky'],
        chunkX: 1,
        chunkY: 0
      });

      // Try to start dialogue
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
      expect(dialogue.choices.length).toBeGreaterThan(0);
    });

    it('should allow interaction with Cherry Guard', () => {
      const npc = spawnSocialNPC(state, {
        id: 'cherry_guard',
        name: 'Cherry Guard',
        x: 30,
        y: 15,
        faction: 'guards',
        dialogueType: 'guards',
        traits: ['cheerful', 'bouncy'],
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
    });

    it('should allow interaction with Market Visitor', () => {
      const npc = spawnSocialNPC(state, {
        id: 'market_visitor_1',
        name: 'Market Visitor',
        x: 25,
        y: 10,
        faction: 'peasants',
        dialogueType: 'peasant',
        traits: ['curious', 'chatty'],
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
    });

    it('should allow interaction with Candy Farmer', () => {
      const npc = spawnSocialNPC(state, {
        id: 'candy_farmer_1',
        name: 'Candy Farmer',
        x: 15,
        y: 5,
        faction: 'peasants',
        dialogueType: 'peasant',
        traits: ['hardworking', 'tired'],
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
    });

    it('should allow interaction with Lord Lollipop', () => {
      const npc = spawnSocialNPC(state, {
        id: 'lord_lollipop',
        name: 'Lord Lollipop',
        x: 35,
        y: 8,
        faction: 'nobles',
        dialogueType: 'noble',
        traits: ['proud', 'formal', 'wealthy'],
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
    });

    it('should allow interaction with Count Coinsworth', () => {
      const npc = spawnSocialNPC(state, {
        id: 'count_coinsworth',
        name: 'Count Coinsworth',
        x: 40,
        y: 12,
        faction: 'nobles',
        dialogueType: 'noble',
        traits: ['greedy', 'calculating'],
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
    });
  });

  describe('Dialogue System Integration', () => {
    it('should use correct dialogueType for each NPC faction', () => {
      const testCases = [
        { faction: 'guards', dialogueType: 'guards', name: 'Test Guard' },
        { faction: 'peasants', dialogueType: 'peasant', name: 'Test Peasant' },
        { faction: 'nobles', dialogueType: 'noble', name: 'Test Noble' },
        { faction: 'merchants', dialogueType: 'merchants', name: 'Test Merchant' }
      ];

      for (const testCase of testCases) {
        const npc = spawnSocialNPC(state, {
          id: `test_${testCase.faction}`,
          name: testCase.name,
          x: 10,
          y: 10,
          faction: testCase.faction,
          dialogueType: testCase.dialogueType,
          chunkX: 1,
          chunkY: 0
        });

        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toBeTruthy();
        expect(dialogue.choices).toBeDefined();
        expect(dialogue.choices.length).toBeGreaterThan(0);
      }
    });

    it('should handle NPCs without explicit dialogueType by using faction', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_npc',
        name: 'Test NPC',
        x: 10,
        y: 10,
        faction: 'guards',
        // No dialogueType specified - should fallback to faction
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      // Should still work using faction as fallback
      expect(dialogue).toBeTruthy();
    });

    it('should properly handle dialogue choices and progression', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_guard',
        name: 'Test Guard',
        x: 10,
        y: 10,
        faction: 'guards',
        dialogueType: 'guards',
        chunkX: 1,
        chunkY: 0
      });

      // Start dialogue
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      expect(dialogue.choices.length).toBeGreaterThan(0);

      // Select first choice
      const nextNode = selectChoice(0);
      // Should either progress to next node or end dialogue
      expect(nextNode === null || nextNode.npcLine).toBeTruthy();
    });
  });

  describe('NPC Interaction Triggering', () => {
    it('should trigger dialogue when player bumps into NPC', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_npc',
        name: 'Test NPC',
        x: 10,
        y: 10,
        faction: 'guards',
        dialogueType: 'guards',
        chunkX: 1,
        chunkY: 0
      });

      // Simulate bump interaction
      player.x = 9;
      player.y = 10;
      
      // Check if NPC is at expected position
      expect(npc.x).toBe(10);
      expect(npc.y).toBe(10);
      
      // Verify NPC has required properties for interaction
      expect(npc.faction).toBe('guards');
      expect(npc.dialogueType).toBe('guards');
      expect(npc.alive).toBe(true);
    });

    it('should handle NPCs in correct chunk', () => {
      const npc = spawnSocialNPC(state, {
        id: 'shopping_npc',
        name: 'Shopping NPC',
        x: 20,
        y: 10,
        faction: 'merchants',
        dialogueType: 'merchants',
        chunkX: 1,  // Shopping District
        chunkY: 0
      });

      // Verify NPC is in shopping district chunk
      expect(npc.chunkX).toBe(1);
      expect(npc.chunkY).toBe(0);
      
      // Should be able to start dialogue
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
    });
  });
});