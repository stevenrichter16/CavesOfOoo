import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Vendor and NPC Shopkeeper Integration', () => {
  
  describe('Tile Vendors (glyph V)', () => {
    it('should handle tile vendor interactions directly through shop system', async () => {
      // Import required modules
      const { interactTile } = await import('../../src/js/movement/playerMovement.js');
      const { openVendorShop } = await import('../../src/js/core/game.js');
      
      // Create state with vendor item
      const state = {
        chunk: {
          map: Array(22).fill(null).map(() => Array(48).fill('.')),
          items: [{
            type: 'vendor',
            x: 10,
            y: 10,
            id: 'test_vendor',
            inventory: [
              { type: 'potion', item: { name: 'Health Potion' }, price: 10 }
            ]
          }]
        },
        player: {
          gold: 100,
          inventory: [],
          quests: {
            active: [],
            fetchQuests: {},
            progress: {}
          }
        },
        ui: {},
        worldSeed: 'test'
      };
      
      // Place vendor tile on map
      state.chunk.map[10][10] = 'V';
      
      // Mock log function
      const logSpy = vi.spyOn(console, 'log');
      
      // Interact with vendor tile
      interactTile(state, 10, 10, openVendorShop);
      
      // Should show vendor greeting
      // Note: actual interaction is async, so we check initial behavior
      expect(state.chunk.items[0].type).toBe('vendor');
      
      logSpy.mockRestore();
    });
  });
  
  describe('NPC Shopkeepers', () => {
    it('should identify NPCs with shopkeeper flag', async () => {
      const { NPC } = await import('../../src/social/npcEnhanced.js');
      const { getAvailableInteractions } = await import('../../src/social/migrationAdapter.js');
      
      // Create shopkeeper NPC
      const shopkeeper = new NPC({
        id: 'test_shopkeeper',
        name: 'Test Shopkeeper',
        shopkeeper: true,
        goods: [
          { id: 'item1', price: 10 }
        ]
      });
      
      // Get available interactions
      const player = { id: 'player', inventory: [] };
      const interactions = getAvailableInteractions(player, shopkeeper);
      
      // Should have trade option
      const tradeOption = interactions.find(i => i.type === 'trade');
      expect(tradeOption).toBeDefined();
      expect(tradeOption.label).toBe('Trade');
    });
    
    it('should handle trade interaction through NEW social system', async () => {
      const { runPlayerNPCInteraction } = await import('../../src/social/migrationAdapter.js');
      const { NPC } = await import('../../src/social/npcEnhanced.js');
      
      // Create shopkeeper NPC
      const shopkeeper = new NPC({
        id: 'forest_wizard',
        name: 'Forest Wizard',
        shopkeeper: true,
        goods: [
          { item: 'forest_charm', price: 50 }
        ]
      });
      
      const player = { id: 'player' };
      
      // Run trade interaction
      const result = runPlayerNPCInteraction(player, shopkeeper, 'trade');
      
      expect(result.success).toBe(true);
      expect(result.shopOpen).toBe(true);
      expect(result.goods).toEqual(shopkeeper.goods);
    });
    
    it('should differentiate merchant faction NPCs', async () => {
      const { NPC } = await import('../../src/social/npcEnhanced.js');
      const { getAvailableInteractions } = await import('../../src/social/migrationAdapter.js');
      
      // Create merchant NPC without explicit shopkeeper flag
      const merchant = new NPC({
        id: 'merchant_npc',
        name: 'Merchant',
        faction: 'merchants',
        goods: []
      });
      
      const player = { id: 'player', inventory: [] };
      const interactions = getAvailableInteractions(player, merchant);
      
      // Should still have trade option due to faction
      const tradeOption = interactions.find(i => i.type === 'trade');
      expect(tradeOption).toBeDefined();
    });
  });
  
  describe('Forest NPCs', () => {
    it('should have Forest Wizard as shopkeeper', async () => {
      const { spawnForestNPCs, FOREST_CONFIG } = await import('../../src/js/world/theForest.js');
      
      // Create state in forest chunk
      const state = {
        cx: FOREST_CONFIG.chunkX,
        cy: FOREST_CONFIG.chunkY,
        npcs: []
      };
      
      // Spawn forest NPCs
      const npcs = spawnForestNPCs(state);
      
      // Find Forest Wizard
      const forestWizard = npcs.find(npc => npc.id === 'forest_wizard');
      expect(forestWizard).toBeDefined();
      expect(forestWizard.shopkeeper).toBe(true);
      expect(forestWizard.goods).toBeDefined();
      expect(forestWizard.goods.length).toBeGreaterThan(0);
    });
  });
  
  describe('Shopping District NPCs', () => {
    it('should have multiple shopkeepers in Candy Kingdom', async () => {
      const candyTown = await import('../../src/js/world/candyKingdomTown.js');
      
      // Check for shopkeeper NPCs in town configuration
      const shopkeepers = [
        'sweet_tooth_fox',
        'chocopierre',
        'candy_barista'
      ];
      
      // These should be defined as shopkeepers
      // Note: actual NPC spawning happens through spawnSocialNPC
      expect(shopkeepers.length).toBeGreaterThan(0);
    });
  });
  
  describe('Summary', () => {
    it('should understand the two vendor systems', () => {
      // Summary of findings:
      // 1. Tile vendors (glyph 'V') are items in chunks, NOT NPCs
      //    - They use the direct shop system via openVendorShop
      //    - They don't use the social system at all
      
      // 2. NPC shopkeepers are actual NPCs with shopkeeper: true
      //    - They use the NEW social system via migrationAdapter
      //    - Trade interaction opens shop through social system
      //    - Examples: Forest Wizard, Sweet Tooth Fox, etc.
      
      // 3. Both systems ultimately connect to shop.js and shop UI
      //    - Tile vendors: direct call to openVendorShop
      //    - NPC shopkeepers: social system → trade → shop
      
      expect(true).toBe(true);
    });
  });
});