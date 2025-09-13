// tests/social/shopping-district-v3-integration.test.js
// Verify that Shopping District NPCs use V3 dialogues correctly

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getShoppingDistrictNPCData } from '../../src/js/world/candyShoppingDistrict.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { candyKingdomDialoguesV3 } from '../../src/js/data/candyKingdomDialoguesV3.js';
import { shoppingDistrictDialogues } from '../../src/js/data/shoppingDistrictDialogues.js';

describe('Shopping District V3 Integration', () => {
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
    
    // Register Shopping District specific dialogues
    Object.entries(shoppingDistrictDialogues).forEach(([npcType, dialogue]) => {
      if (!dialogue.nodes || !dialogue.nodes.length) return;
      dialogue.biome = dialogue.biome || 'candy_kingdom';
      dialogue.npcType = dialogue.npcType || npcType;
      dialogue.start = dialogue.start || 'greeting';
      registerDialogueTree(npcType, dialogue.biome, dialogue);
    });
  });

  describe('V3 Dialogue Usage', () => {
    it('should use banana_guard dialogue for guards', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const guards = npcData.filter(npc => npc.faction === 'guards');
      
      expect(guards.length).toBeGreaterThan(0);
      
      guards.forEach(guardData => {
        expect(guardData.dialogueType).toBe('banana_guard');
        
        const npc = spawnSocialNPC(state, guardData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toContain('HALT');
        expect(dialogue.npcLine).toContain('Princess Bubblegum');
      });
    });

    it('should use candy_peasant dialogue for visitors and peasants', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const peasants = npcData.filter(npc => 
        npc.faction === 'peasants' && 
        !['starchy', 'cinnamon_bun', 'root_beer_guy'].includes(npc.dialogueType)
      );
      
      expect(peasants.length).toBeGreaterThan(0);
      
      peasants.forEach(peasantData => {
        expect(peasantData.dialogueType).toBe('candy_peasant');
        
        const npc = spawnSocialNPC(state, peasantData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toContain('Oh my Glob');
      });
    });

    it('should use candy_merchant dialogue for generic merchants', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const merchants = npcData.filter(npc => 
        npc.faction === 'merchants' && 
        npc.dialogueType === 'candy_merchant'
      );
      
      expect(merchants.length).toBeGreaterThan(0);
      
      merchants.forEach(merchantData => {
        const npc = spawnSocialNPC(state, merchantData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        expect(dialogue.npcLine).toContain('mathematical shop');
      });
    });

    it('should have candy_noble NPCs in shopping district', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const nobles = npcData.filter(npc => 
        npc.faction === 'nobles' && 
        npc.dialogueType === 'candy_noble'
      );
      
      expect(nobles.length).toBeGreaterThan(0);
      
      // Check for specific nobles we added
      const lordLollipop = nobles.find(n => n.id === 'lord_lollipop');
      const countCoinsworth = nobles.find(n => n.id === 'count_coinsworth');
      const duchessSweetington = nobles.find(n => n.id === 'duchess_sweetington');
      
      expect(lordLollipop).toBeTruthy();
      expect(countCoinsworth).toBeTruthy();
      expect(duchessSweetington).toBeTruthy();
      
      nobles.forEach(nobleData => {
        const npc = spawnSocialNPC(state, nobleData);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        expect(dialogue).toBeTruthy();
        // Check for either default or variant
        const hasNobleDialogue = 
          dialogue.npcLine.includes('UNACCEPTABLE') || 
          dialogue.npcLine.includes('DARE') ||
          dialogue.npcLine.includes('unexpected');
        expect(hasNobleDialogue).toBe(true);
      });
    });
  });

  describe('Special NPCs Preserve Their Dialogues', () => {
    it('should keep Choose Goose rhyming dialogue', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const chooseGoose = npcData.find(npc => npc.id === 'choose_goose');
      
      expect(chooseGoose).toBeTruthy();
      expect(chooseGoose.dialogueType).toBe('choose_goose');
      
      const npc = spawnSocialNPC(state, chooseGoose);
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('Choose Goose');
    });

    it('should keep Peppermint Butler dialogue', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const pb = npcData.find(npc => npc.id === 'peppermint_butler');
      
      expect(pb).toBeTruthy();
      expect(pb.dialogueType).toBe('peppermint_butler');
      
      const npc = spawnSocialNPC(state, pb);
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('visitor');
    });

    it('should keep Pizza Sassy dialogue', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const sassy = npcData.find(npc => npc.dialogueType === 'sassy_people');
      
      expect(sassy).toBeTruthy();
      
      const npc = spawnSocialNPC(state, sassy);
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toContain('Pizza Sassy');
    });
  });

  describe('NPC Count and Distribution', () => {
    it('should have appropriate mix of NPC types', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      
      const guards = npcData.filter(n => n.faction === 'guards');
      const peasants = npcData.filter(n => n.faction === 'peasants');
      const merchants = npcData.filter(n => n.faction === 'merchants');
      const nobles = npcData.filter(n => n.faction === 'nobles');
      
      // Should have at least some of each type
      expect(guards.length).toBeGreaterThan(0);
      expect(peasants.length).toBeGreaterThan(0);
      expect(merchants.length).toBeGreaterThan(0);
      expect(nobles.length).toBeGreaterThan(0);
      
      // Merchants should be most common in shopping district
      expect(merchants.length).toBeGreaterThan(guards.length);
      expect(merchants.length).toBeGreaterThan(nobles.length);
    });

    it('should have all NPCs interactable via dialogue', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      let successCount = 0;
      let failedNpcs = [];
      
      npcData.forEach(data => {
        const npc = spawnSocialNPC(state, data);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        if (dialogue && dialogue.npcLine) {
          successCount++;
        } else {
          failedNpcs.push({
            id: data.id,
            name: data.name,
            dialogueType: data.dialogueType
          });
        }
      });
      
      // Log any failures for debugging
      if (failedNpcs.length > 0) {
        console.log('NPCs without working dialogue:', failedNpcs);
      }
      
      // All NPCs should have dialogue
      expect(successCount).toBe(npcData.length);
      expect(failedNpcs.length).toBe(0);
    });
  });
});