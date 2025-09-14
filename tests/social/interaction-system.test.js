import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('InteractionSystem - NEW social interaction handler', () => {
  let InteractionSystem;
  let NPC;
  
  beforeEach(async () => {
    // We'll create this module next
    InteractionSystem = await import('../../src/social/interactions.js');
    const npcModule = await import('../../src/social/npcEnhanced.js');
    NPC = npcModule.NPC;
  });
  
  describe('Get available interactions', () => {
    it('should return talk option for all NPCs', () => {
      const npc = new NPC({ id: 'test', name: 'Test NPC' });
      const player = { id: 'player' };
      
      const interactions = InteractionSystem.getAvailableInteractions(player, npc);
      
      const talkOption = interactions.find(i => i.type === 'talk');
      expect(talkOption).toBeDefined();
      expect(talkOption.label).toBe('Talk');
    });
    
    it('should return trade option for shopkeepers', () => {
      const shopkeeper = new NPC({
        id: 'shop',
        name: 'Shopkeeper',
        shopkeeper: true,
        goods: []
      });
      const player = { id: 'player' };
      
      const interactions = InteractionSystem.getAvailableInteractions(player, shopkeeper);
      
      const tradeOption = interactions.find(i => i.type === 'trade');
      expect(tradeOption).toBeDefined();
      expect(tradeOption.label).toBe('Trade');
    });
    
    it('should return trade option for merchant faction', () => {
      const merchant = new NPC({
        id: 'merchant',
        name: 'Merchant',
        faction: 'merchants'
      });
      const player = { id: 'player' };
      
      const interactions = InteractionSystem.getAvailableInteractions(player, merchant);
      
      const tradeOption = interactions.find(i => i.type === 'trade');
      expect(tradeOption).toBeDefined();
    });
    
    it('should return quest option for quest givers', () => {
      const questGiver = new NPC({
        id: 'quest_npc',
        name: 'Quest Giver',
        questGiver: true,
        quests: ['test_quest']
      });
      const player = { id: 'player' };
      
      const interactions = InteractionSystem.getAvailableInteractions(player, questGiver);
      
      const questOption = interactions.find(i => i.type === 'quest');
      expect(questOption).toBeDefined();
      expect(questOption.label).toBe('Quest');
    });
    
    it('should return gift option if player has items', () => {
      const npc = new NPC({ id: 'npc', name: 'NPC' });
      const player = { 
        id: 'player',
        inventory: [{ id: 'item1', name: 'Gift' }]
      };
      
      const interactions = InteractionSystem.getAvailableInteractions(player, npc);
      
      const giftOption = interactions.find(i => i.type === 'gift');
      expect(giftOption).toBeDefined();
      expect(giftOption.label).toBe('Give Gift');
    });
    
    it('should return fight option for hostile NPCs', () => {
      const hostile = new NPC({
        id: 'enemy',
        name: 'Enemy',
        attitude: 'hostile'
      });
      const player = { id: 'player', factions: ['player'] };
      
      const interactions = InteractionSystem.getAvailableInteractions(player, hostile);
      
      const fightOption = interactions.find(i => i.type === 'fight');
      expect(fightOption).toBeDefined();
      expect(fightOption.label).toBe('Fight');
    });
  });
  
  describe('Run interactions', () => {
    it('should handle talk interaction', () => {
      const npc = new NPC({
        id: 'talker',
        name: 'Talker',
        dialogue: true
      });
      const player = { id: 'player' };
      const state = {};
      
      const result = InteractionSystem.runInteraction(state, player, npc, 'talk');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('talk');
      expect(result.dialogue).toBe(true);
    });
    
    it('should handle trade interaction for shopkeepers', () => {
      const shopkeeper = new NPC({
        id: 'shop',
        name: 'Shop',
        shopkeeper: true,
        goods: [{ id: 'item1', price: 10 }]
      });
      const player = { id: 'player' };
      const state = {};
      
      const result = InteractionSystem.runInteraction(state, player, shopkeeper, 'trade');
      
      expect(result.success).toBe(true);
      expect(result.shopOpen).toBe(true);
      expect(result.goods).toEqual(shopkeeper.goods);
    });
    
    it('should reject trade for non-merchants', () => {
      const npc = new NPC({
        id: 'peasant',
        name: 'Peasant',
        faction: 'peasants'
      });
      const player = { id: 'player' };
      const state = {};
      
      const result = InteractionSystem.runInteraction(state, player, npc, 'trade');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_merchant');
    });
    
    it('should handle gift interaction', () => {
      const npc = new NPC({
        id: 'receiver',
        name: 'Receiver'
      });
      const player = { 
        id: 'player',
        inventory: [{ id: 'gift', name: 'Flower' }]
      };
      const state = {};
      
      const result = InteractionSystem.runInteraction(
        state, player, npc, 'gift', 
        { item: { id: 'gift', name: 'Flower' } }
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('gift');
      
      // Should update relationship
      expect(npc.memory.getRelationship('player')).toBeGreaterThan(0);
    });
    
    it('should handle quest interaction', () => {
      const questGiver = new NPC({
        id: 'quest_giver',
        name: 'Quest Giver',
        questGiver: true,
        quests: ['fetch_quest']
      });
      const player = { id: 'player' };
      const state = {};
      
      const result = InteractionSystem.runInteraction(state, player, questGiver, 'quest');
      
      expect(result.success).toBe(true);
      expect(result.quests).toEqual(['fetch_quest']);
    });
  });
  
  describe('Backward compatibility', () => {
    it('should handle OLD format NPCs', () => {
      // OLD format NPC
      const oldNPC = {
        id: 'old',
        name: 'Old NPC',
        faction: 'guards',
        traits: ['brave'],
        hasTrait: function(t) { return this.traits.includes(t); }
      };
      
      const player = { id: 'player' };
      
      // Should auto-convert and handle
      const interactions = InteractionSystem.getAvailableInteractions(player, oldNPC);
      expect(interactions).toBeDefined();
      expect(interactions.find(i => i.type === 'talk')).toBeDefined();
    });
  });
});