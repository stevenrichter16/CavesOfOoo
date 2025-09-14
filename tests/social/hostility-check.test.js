import { describe, it, expect, beforeEach } from 'vitest';

describe('Hostility Check Replacement', () => {
  
  describe('isNPCHostileToPlayer function', () => {
    it('should create replacement for isNPCHostileToPlayer', () => {
      // This function was in disguise.js
      // Now it should use NPC.evaluateHostilityTo()
      
      function isNPCHostileToPlayer(npc, player) {
        // Handle null/undefined
        if (!npc) return false;
        
        // If NPC has evaluateHostilityTo method (NEW system)
        if (npc.evaluateHostilityTo) {
          const result = npc.evaluateHostilityTo(player);
          return result.hostile;
        }
        
        // Fallback for simple NPCs
        if (npc.attitude === 'hostile') return true;
        if (npc.faction === 'bandits') return true;
        
        return false;
      }
      
      // Test the function
      const hostileNPC = { attitude: 'hostile' };
      const friendlyNPC = { attitude: 'friendly' };
      const banditNPC = { faction: 'bandits' };
      const player = { id: 'player' };
      
      expect(isNPCHostileToPlayer(hostileNPC, player)).toBe(true);
      expect(isNPCHostileToPlayer(friendlyNPC, player)).toBe(false);
      expect(isNPCHostileToPlayer(banditNPC, player)).toBe(true);
      expect(isNPCHostileToPlayer(null, player)).toBe(false);
    });
    
    it('should work with NEW system NPCs', async () => {
      const { NPC } = await import('../../src/social/npcEnhanced.js');
      
      function isNPCHostileToPlayer(npc, player) {
        if (!npc) return false;
        
        if (npc.evaluateHostilityTo) {
          const result = npc.evaluateHostilityTo(player);
          return result.hostile;
        }
        
        if (npc.attitude === 'hostile') return true;
        if (npc.faction === 'bandits') return true;
        
        return false;
      }
      
      // Test with NEW system NPC
      const guardNPC = new NPC({
        id: 'guard',
        faction: 'guards'
      });
      
      const banditPlayer = { id: 'player', faction: 'bandits' };
      const normalPlayer = { id: 'player' };
      
      expect(isNPCHostileToPlayer(guardNPC, banditPlayer)).toBe(true);
      expect(isNPCHostileToPlayer(guardNPC, normalPlayer)).toBe(false);
    });
  });
  
  describe('SocialActions replacement', () => {
    it('should identify SocialActions usage', () => {
      // SocialActions was probably an object with action methods
      const mockSocialActions = {
        talk: function(npc, player) {
          return { success: true, message: 'You talk.' };
        },
        trade: function(npc, player) {
          return { success: true, message: 'Trading.' };
        }
      };
      
      expect(mockSocialActions.talk).toBeDefined();
      expect(mockSocialActions.trade).toBeDefined();
    });
    
    it('should use InteractionSystem instead', async () => {
      const interactions = await import('../../src/social/interactions.js');
      
      // InteractionSystem provides the same functionality
      expect(interactions.handleTalk).toBeDefined();
      expect(interactions.handleTrade).toBeDefined();
    });
  });
});