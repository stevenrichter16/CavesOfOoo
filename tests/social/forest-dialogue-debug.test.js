// tests/social/forest-dialogue-debug.test.js
// Debug test to identify forest dialogue registration issue

import { describe, it, expect, beforeEach } from 'vitest';
import { registerDialogueTree, startDialogue } from '../../src/js/social/dialogueTreesV2.js';
import { forestDialogues } from '../../src/js/data/forestDialogues.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';

describe('Forest Dialogue Debug', () => {
  let state;
  let player;

  beforeEach(() => {
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
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
        isForest: true,
        map: Array(22).fill(null).map(() => Array(48).fill('.'))
      },
      npcs: [],
      turn: 0
    };
  });

  it('should have forest dialogues defined', () => {
    expect(forestDialogues).toBeTruthy();
    expect(forestDialogues.trees).toBeTruthy();
    expect(forestDialogues.trees.length).toBeGreaterThan(0);
    
    const mommaBearTree = forestDialogues.trees.find(t => t.npcType === 'momma_bear');
    expect(mommaBearTree).toBeTruthy();
    expect(mommaBearTree.biome).toBe('forest');
  });

  it('should register forest dialogue trees correctly', () => {
    // Register just Momma Bear's dialogue
    const mommaBearTree = forestDialogues.trees.find(t => t.npcType === 'momma_bear');
    
    console.log('Registering tree:', {
      npcType: mommaBearTree.npcType,
      biome: mommaBearTree.biome,
      start: mommaBearTree.start,
      nodeCount: mommaBearTree.nodes.length
    });
    
    registerDialogueTree(mommaBearTree.npcType, mommaBearTree.biome, mommaBearTree);
    
    // Create Momma Bear NPC
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
    
    console.log('Starting dialogue with NPC:', {
      name: mommaBear.name,
      dialogueType: mommaBear.dialogueType,
      faction: mommaBear.faction
    });
    
    // Try to start dialogue
    const dialogue = startDialogue(state, player, mommaBear, 'forest');
    
    console.log('Dialogue result:', dialogue);
    
    expect(dialogue).toBeTruthy();
    if (dialogue) {
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.npcLine).toContain('visitor');
    }
  });

  it('should handle all forest animal dialogue types', () => {
    // Register all forest dialogues
    forestDialogues.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
    
    const testCases = [
      { dialogueType: 'momma_bear', expectedLine: 'visitor' },
      { dialogueType: 'teenage_bear', expectedLine: 'cool' },
      { dialogueType: 'mr_fox', expectedLine: 'monocle' },
      { dialogueType: 'boobafina', expectedLine: 'HONK' },
      { dialogueType: 'mrs_cow', expectedLine: 'Moooo' },
      { dialogueType: 'forest_wizard', expectedLine: 'whisper' }
    ];
    
    testCases.forEach(({ dialogueType, expectedLine }) => {
      const npc = {
        id: dialogueType,
        name: dialogueType,
        dialogueType: dialogueType,
        faction: 'forest_animals',
        x: 11,
        y: 10,
        hp: 20,
        hpMax: 20
      };
      
      const dialogue = startDialogue(state, player, npc, 'forest');
      
      expect(dialogue, `Failed for ${dialogueType}`).toBeTruthy();
      if (dialogue) {
        expect(dialogue.npcLine, `Wrong line for ${dialogueType}`).toContain(expectedLine);
      }
    });
  });

  it('should use correct biome detection', () => {
    // Test with different biome configurations
    const mommaBearTree = forestDialogues.trees.find(t => t.npcType === 'momma_bear');
    registerDialogueTree(mommaBearTree.npcType, mommaBearTree.biome, mommaBearTree);
    
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
    
    // Test 1: With biome = 'forest'
    state.chunk.biome = 'forest';
    let dialogue = startDialogue(state, player, mommaBear, 'forest');
    expect(dialogue).toBeTruthy();
    
    // Test 2: Wrong biome should fail
    dialogue = startDialogue(state, player, mommaBear, 'candy_kingdom');
    expect(dialogue).toBeFalsy();
  });
});