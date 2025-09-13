// tests/ui/dialogue-ui-simple.test.js
// Simple test to verify dialogue UI consistency

import { describe, it, expect, beforeEach } from 'vitest';
import { registerDialogueTree, startDialogue } from '../../src/js/social/dialogueTreesV2.js';
import { forestDialogues } from '../../src/js/data/forestDialogues.js';

describe('Dialogue UI Simple Test', () => {
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
      ui: {}
    };

    // Register forest dialogues
    forestDialogues.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('All Forest NPCs Have Dialogue Trees', () => {
    it('should have dialogue trees for all forest NPCs', () => {
      const forestNPCs = [
        'momma_bear',
        'teenage_bear',
        'mr_fox',
        'boobafina',
        'mr_goose',      // New
        'mrs_cow',
        'forest_wizard',
        'mrs_yoder',     // New  
        'squirrel',
        'bird',          // New
        'ants'
      ];

      const results = {};
      
      forestNPCs.forEach(npcType => {
        const testNPC = {
          id: npcType,
          name: npcType,
          dialogueType: npcType,
          faction: 'forest_animals'
        };
        
        const dialogue = startDialogue(state, player, testNPC, 'forest');
        results[npcType] = !!dialogue;
      });

      // All NPCs should have dialogue trees
      Object.entries(results).forEach(([npc, hasDialogue]) => {
        expect(hasDialogue, `${npc} should have dialogue tree`).toBe(true);
      });
    });

    it('should return proper dialogue structure for Mr. Goose', () => {
      const mrGoose = {
        id: 'mr_goose',
        name: 'Mr. Goose',
        dialogueType: 'mr_goose',
        faction: 'forest_animals'
      };
      
      const dialogue = startDialogue(state, player, mrGoose, 'forest');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('old chap');
      expect(dialogue.options).toBeTruthy();
      expect(dialogue.options.length).toBeGreaterThanOrEqual(4);
      
      // Check for expected dialogue options
      const hatOption = dialogue.options.find(opt => opt.text.includes('fine hat'));
      expect(hatOption).toBeTruthy();
      
      const wifeOption = dialogue.options.find(opt => opt.text.includes('Boobafina'));
      expect(wifeOption).toBeTruthy();
    });

    it('should return proper dialogue structure for Mrs. Yoder', () => {
      const mrsYoder = {
        id: 'mrs_yoder',
        name: 'Mrs. Yoder',
        dialogueType: 'mrs_yoder',
        faction: 'forest_animals'
      };
      
      const dialogue = startDialogue(state, player, mrsYoder, 'forest');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('bird seed');
      expect(dialogue.options).toBeTruthy();
      expect(dialogue.options.length).toBeGreaterThanOrEqual(3);
    });

    it('should return proper dialogue structure for Bird', () => {
      const bird = {
        id: 'bird',
        name: 'Forest Bird',
        dialogueType: 'bird',
        faction: 'forest_animals'
      };
      
      const dialogue = startDialogue(state, player, bird, 'forest');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('chirp');
      expect(dialogue.options).toBeTruthy();
      expect(dialogue.options.length).toBeGreaterThanOrEqual(3);
      
      // Check for whistle option
      const whistleOption = dialogue.options.find(opt => opt.text.includes('whistle'));
      expect(whistleOption).toBeTruthy();
    });

    it('should handle quest conditions for Mr. Goose', () => {
      // Give player the sweet tooth fox quest
      player.quests.active.push('sweet_tooth_foxes');
      
      const mrGoose = {
        id: 'mr_goose',
        name: 'Mr. Goose',
        dialogueType: 'mr_goose',
        faction: 'forest_animals'
      };
      
      const dialogue = startDialogue(state, player, mrGoose, 'forest');
      
      expect(dialogue).toBeTruthy();
      const foxOption = dialogue.options.find(opt => 
        opt.text.includes('Sweet Tooth Foxes')
      );
      expect(foxOption, 'Quest-specific option should appear').toBeTruthy();
    });
  });

  describe('Dialogue Consistency', () => {
    it('should use consistent dialogue structure for all NPCs', () => {
      const allForestNPCs = [
        'momma_bear', 'teenage_bear', 'mr_fox', 'boobafina',
        'mr_goose', 'mrs_cow', 'forest_wizard', 'mrs_yoder',
        'squirrel', 'bird', 'ants'
      ];

      allForestNPCs.forEach(npcType => {
        const npc = {
          id: npcType,
          name: npcType,
          dialogueType: npcType,
          faction: 'forest_animals'
        };
        
        const dialogue = startDialogue(state, player, npc, 'forest');
        
        // All dialogues should have consistent structure
        expect(dialogue).toBeTruthy();
        expect(dialogue).toHaveProperty('npcLine');
        expect(dialogue).toHaveProperty('options');
        expect(dialogue).toHaveProperty('npc');
        expect(dialogue).toHaveProperty('player');
        
        // Options should be properly formatted
        expect(Array.isArray(dialogue.options)).toBe(true);
        dialogue.options.forEach(option => {
          expect(option).toHaveProperty('text');
          expect(typeof option.text).toBe('string');
        });
      });
    });
  });
});