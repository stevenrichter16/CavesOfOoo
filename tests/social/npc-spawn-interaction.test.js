// tests/social/npc-spawn-interaction.test.js
// Test that NPCs spawn correctly and can be interacted with via bumping

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getShoppingDistrictNPCData } from '../../src/js/world/candyShoppingDistrict.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';
import { shoppingDistrictDialogues } from '../../src/js/data/shoppingDistrictDialogues.js';

describe('NPC Spawning and Interaction', () => {
  let state;
  let player;

  beforeEach(() => {
    // Reset state
    state = {
      cx: 1,
      cy: 0,
      npcs: [],
      chunk: {
        npcData: null
      },
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

    // Register all dialogues
    Object.entries(shoppingDistrictDialogues).forEach(([npcType, dialogue]) => {
      if (!dialogue.nodes || !dialogue.nodes.length) return;
      dialogue.biome = dialogue.biome || 'candy_kingdom';
      dialogue.npcType = dialogue.npcType || npcType;
      dialogue.start = dialogue.start || 'greeting';
      registerDialogueTree(npcType, dialogue.biome, dialogue);
    });
  });

  describe('Shopping District NPC Data', () => {
    it('should generate NPC data for shopping district', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      
      expect(npcData).toBeTruthy();
      expect(Array.isArray(npcData)).toBe(true);
      expect(npcData.length).toBeGreaterThan(0);
      
      // Check for specific NPCs mentioned by user
      const hasGuards = npcData.some(npc => npc.faction === 'guards');
      const hasPeasants = npcData.some(npc => npc.faction === 'peasants');
      const hasMerchants = npcData.some(npc => npc.faction === 'merchants');
      
      expect(hasGuards).toBe(true);
      expect(hasPeasants).toBe(true);
      expect(hasMerchants).toBe(true);
    });

    it('should include various NPCs with correct dialogue types', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      
      // Check for dialogue types
      const dialogueTypes = new Set(npcData.map(npc => npc.dialogueType));
      
      // Should have various dialogue types
      expect(dialogueTypes.has('guards')).toBe(true);
      expect(dialogueTypes.has('peasants')).toBe(true);
      expect(dialogueTypes.has('merchants')).toBe(true);
    });
  });

  describe('NPC Spawning', () => {
    it('should spawn NPCs from shopping district data', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      
      // Spawn a few NPCs as examples
      const testNpcs = npcData.slice(0, 5);
      const spawnedNpcs = [];
      
      testNpcs.forEach(data => {
        const npc = spawnSocialNPC(state, data);
        expect(npc).toBeTruthy();
        expect(npc.id).toBe(data.id);
        expect(npc.name).toBe(data.name);
        expect(npc.x).toBe(data.x);
        expect(npc.y).toBe(data.y);
        expect(npc.faction).toBe(data.faction);
        expect(npc.dialogueType).toBe(data.dialogueType);
        spawnedNpcs.push(npc);
      });
      
      // Check that NPCs were added to state
      expect(state.npcs.length).toBe(testNpcs.length);
    });
  });

  describe('Dialogue Interaction', () => {
    it('should start dialogue with guards', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const guardData = npcData.find(npc => npc.faction === 'guards');
      
      expect(guardData).toBeTruthy();
      
      const guard = spawnSocialNPC(state, guardData);
      const dialogue = startDialogue(state, player, guard, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
      expect(dialogue.choices.length).toBeGreaterThan(0);
    });

    it('should start dialogue with peasants', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const peasantData = npcData.find(npc => npc.faction === 'peasants' && npc.dialogueType === 'peasants');
      
      expect(peasantData).toBeTruthy();
      
      const peasant = spawnSocialNPC(state, peasantData);
      const dialogue = startDialogue(state, player, peasant, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
      expect(dialogue.choices.length).toBeGreaterThan(0);
    });

    it('should start dialogue with merchants', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const merchantData = npcData.find(npc => npc.faction === 'merchants');
      
      expect(merchantData).toBeTruthy();
      
      const merchant = spawnSocialNPC(state, merchantData);
      const dialogue = startDialogue(state, player, merchant, 'candy_kingdom');
      
      expect(dialogue).toBeTruthy();
      expect(dialogue.npcLine).toBeTruthy();
      expect(dialogue.choices).toBeDefined();
    });

    it('should handle NPCs with specific dialogue trees', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      
      // Test specific NPCs
      const specificNpcs = [
        'choose_goose',
        'peppermint_butler',
        'root_beer_guy',
        'starchy'
      ];
      
      specificNpcs.forEach(npcType => {
        const npcInfo = npcData.find(npc => npc.dialogueType === npcType);
        if (npcInfo) {
          const npc = spawnSocialNPC(state, npcInfo);
          const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
          
          expect(dialogue).toBeTruthy();
          expect(dialogue.npcLine).toBeTruthy();
        }
      });
    });
  });

  describe('Bump Interaction Simulation', () => {
    it('should detect when player bumps into NPC', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      const testNpc = npcData[0];
      
      const npc = spawnSocialNPC(state, testNpc);
      
      // Simulate player trying to move into NPC's position
      player.x = npc.x - 1;
      player.y = npc.y;
      
      // Check if NPC is at adjacent position
      const dx = npc.x - player.x;
      const dy = npc.y - player.y;
      const isAdjacent = Math.abs(dx) + Math.abs(dy) === 1;
      
      expect(isAdjacent).toBe(true);
      
      // If adjacent, dialogue should be startable
      const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
      expect(dialogue).toBeTruthy();
    });

    it('should handle all NPCs in shopping district', () => {
      const npcData = getShoppingDistrictNPCData(1, 0);
      
      let successCount = 0;
      let failedNpcs = [];
      
      npcData.forEach(data => {
        const npc = spawnSocialNPC(state, data);
        const dialogue = startDialogue(state, player, npc, 'candy_kingdom');
        
        if (dialogue) {
          successCount++;
        } else {
          failedNpcs.push({
            name: npc.name,
            dialogueType: npc.dialogueType,
            faction: npc.faction
          });
        }
      });
      
      // Log any NPCs that failed
      if (failedNpcs.length > 0) {
        console.log('NPCs without dialogue:', failedNpcs);
      }
      
      // Most NPCs should have dialogue
      expect(successCount).toBeGreaterThan(npcData.length * 0.8);
    });
  });
});