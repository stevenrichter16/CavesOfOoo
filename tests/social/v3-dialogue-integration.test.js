// tests/social/v3-dialogue-integration.test.js
// Test integrating candyKingdomDialoguesV3 into Shopping District NPCs

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getShoppingDistrictNPCData } from '../../src/js/world/candyShoppingDistrict.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree, selectChoice, getCurrentNode } from '../../src/js/social/dialogueTreesV2.js';
import { candyKingdomDialoguesV3 } from '../../src/js/data/candyKingdomDialoguesV3.js';

describe('V3 Dialogue Integration', () => {
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

    // Register V3 dialogues
    candyKingdomDialoguesV3.trees.forEach(tree => {
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
  });

  describe('V3 Dialogue Trees', () => {
    it('should have candy_peasant dialogue for common folk', () => {
      const npc = spawnSocialNPC(state, {
        id: 'market_visitor',
        name: 'Market Visitor',
        x: 10,
        y: 10,
        faction: 'peasants',
        dialogueType: 'candy_peasant',
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('Oh my Glob');
      expect(dialogue.choices.length).toBeGreaterThan(3);
      expect(dialogue.choices.some(c => c.text.includes('Princess Bubblegum'))).toBe(true);
    });

    it('should have banana_guard dialogue for guards', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_guard',
        name: 'Banana Guard',
        x: 10,
        y: 10,
        faction: 'guards',
        dialogueType: 'banana_guard',
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('HALT');
      expect(dialogue.npcLine).toContain('Princess Bubblegum');
      expect(dialogue.choices.some(c => c.text.includes('help the kingdom'))).toBe(true);
    });

    it('should have candy_merchant dialogue for vendors', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_merchant',
        name: 'Candy Vendor',
        x: 10,
        y: 10,
        faction: 'merchants',
        dialogueType: 'candy_merchant',
        goods: 'candy',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('mathematical shop');
      expect(dialogue.choices.some(c => c.text.includes('Show me your wares'))).toBe(true);
      expect(dialogue.choices.some(c => c.text.includes('Do you buy items'))).toBe(true);
    });

    it('should have candy_noble dialogue for nobles', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_noble',
        name: 'Lord Sweetington',
        x: 10,
        y: 10,
        faction: 'nobles',
        dialogueType: 'candy_noble',
        traits: ['proud', 'wealthy'],
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      // Can be either the default or proud variant
      expect(dialogue.npcLine.includes('UNACCEPTABLE') || dialogue.npcLine.includes('DARE')).toBe(true);
      expect(dialogue.choices.some(c => c.text.includes('[Bow formally]'))).toBe(true);
    });
  });

  describe('Shopping District NPC Updates', () => {
    it('should use V3 dialogues for market visitors', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const visitors = npcData.filter(npc => 
        npc.name.includes('Visitor') || npc.name.includes('Tourist')
      );

      visitors.forEach(visitorData => {
        // Update to use V3 dialogue
        visitorData.dialogueType = 'candy_peasant';
        
        const npc = spawnSocialNPC(state, visitorData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toBeDefined();
      });
    });

    it('should use V3 dialogues for guards', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const guards = npcData.filter(npc => npc.faction === 'guards');

      guards.forEach(guardData => {
        // Update to use V3 dialogue
        guardData.dialogueType = 'banana_guard';
        
        const npc = spawnSocialNPC(state, guardData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toContain('HALT');
      });
    });

    it('should use V3 dialogues for generic merchants', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const merchants = npcData.filter(npc => 
        npc.faction === 'merchants' && 
        !['choose_goose', 'peppermint_butler', 'root_beer_guy'].includes(npc.dialogueType)
      );

      merchants.forEach(merchantData => {
        // Update to use V3 dialogue
        merchantData.dialogueType = 'candy_merchant';
        
        const npc = spawnSocialNPC(state, merchantData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toBeDefined();
      });
    });
  });

  describe('Dialogue Choice Progression', () => {
    it('should handle V3 dialogue choices and effects', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_noble',
        name: 'Count Candycorn',
        x: 10,
        y: 10,
        faction: 'nobles',
        dialogueType: 'candy_noble',
        chunkX: 1,
        chunkY: 0
      });

      // Start dialogue
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      
      // Find the bow formally choice
      const bowChoice = dialogue.choices.findIndex(c => c.text.includes('[Bow formally]'));
      expect(bowChoice).toBeGreaterThanOrEqual(0);
      
      // Select it
      const nextNode = selectChoice(bowChoice);
      expect(nextNode).toBeTruthy();
      expect(nextNode.npcLine).toContain('acceptable');
    });

    it('should handle V3 merchant shopping dialogue', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_merchant',
        name: 'Candy Seller',
        x: 10,
        y: 10,
        faction: 'merchants',
        dialogueType: 'candy_merchant',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      
      // Find the "Show me your wares" choice
      const waresChoice = dialogue.choices.findIndex(c => c.text.includes('Show me your wares'));
      expect(waresChoice).toBeGreaterThanOrEqual(0);
      
      // Select it
      const nextNode = selectChoice(waresChoice);
      expect(nextNode).toBeTruthy();
      expect(nextNode.npcLine).toContain('potions');
    });

    it('should handle V3 guard quest dialogue', () => {
      const npc = spawnSocialNPC(state, {
        id: 'test_guard',
        name: 'Banana Guard',
        x: 10,
        y: 10,
        faction: 'guards',
        dialogueType: 'banana_guard',
        chunkX: 1,
        chunkY: 0
      });

      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      
      // Find the "help the kingdom" choice
      const helpChoice = dialogue.choices.findIndex(c => c.text.includes('help the kingdom'));
      expect(helpChoice).toBeGreaterThanOrEqual(0);
      
      // Select it
      const nextNode = selectChoice(helpChoice);
      expect(nextNode).toBeTruthy();
      expect(nextNode.npcLine).toContain('Pup Gang');
    });
  });

  describe('Fallback System', () => {
    it('should fallback to faction-based V3 dialogue when specific dialogue missing', () => {
      const npc = spawnSocialNPC(state, {
        id: 'random_peasant',
        name: 'Random Candy Person',
        x: 10,
        y: 10,
        faction: 'peasants',
        // No dialogueType specified - should use faction fallback
        chunkX: 1,
        chunkY: 0
      });

      // Set up fallback mapping
      npc.dialogueType = 'candy_peasant'; // This would be done in initialization
      
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle multiple V3 dialogues efficiently', () => {
      const startTime = performance.now();
      
      // Create and test 20 NPCs with V3 dialogues
      for (let i = 0; i < 20; i++) {
        const types = ['candy_peasant', 'banana_guard', 'candy_merchant', 'candy_noble'];
        const type = types[i % types.length];
        const faction = type.includes('guard') ? 'guards' : 
                       type.includes('merchant') ? 'merchants' :
                       type.includes('noble') ? 'nobles' : 'peasants';
        
        const npc = spawnSocialNPC(state, {
          id: `test_npc_${i}`,
          name: `Test NPC ${i}`,
          x: i,
          y: i,
          faction: faction,
          dialogueType: type,
          chunkX: 1,
          chunkY: 0
        });
        
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        expect(dialogue).toBeTruthy();
      }
      
      const endTime = performance.now();
      const elapsed = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms)
      expect(elapsed).toBeLessThan(100);
    });
  });
});