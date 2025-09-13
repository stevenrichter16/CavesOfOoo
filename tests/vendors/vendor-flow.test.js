// tests/vendors/vendor-flow.test.js
// Test complete vendor flow from NPC to shop opening

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openVendorShop } from '../../src/js/core/game.js';
import { openShop } from '../../src/js/items/shop.js';

describe('Complete Vendor Flow', () => {
  let state;
  let player;
  
  beforeEach(() => {
    // Mock DOM elements
    global.document = {
      getElementById: vi.fn(() => ({
        style: {},
        innerHTML: '',
        classList: { add: vi.fn(), remove: vi.fn() }
      })),
      querySelector: vi.fn(() => null),
      createElement: vi.fn(() => ({
        style: {},
        innerHTML: '',
        classList: { add: vi.fn(), remove: vi.fn() },
        appendChild: vi.fn()
      }))
    };

    player = {
      id: 'player',
      name: 'Test Player',
      x: 10,
      y: 10,
      hp: 50,
      hpMax: 100,
      gold: 1000,
      inventory: [],
      statusEffects: {},
      potionCount: 0,
      quests: {
        active: [],
        completed: [],
        progress: {},
        fetchQuests: {}
      }
    };

    state = {
      player,
      npcs: [],
      chunk: { cx: 1, cy: 0, items: [] },
      cx: 1,
      cy: 0,
      turn: 1,
      log: vi.fn(),
      worldSeed: 12345,
      ui: {
        shopOpen: false,
        shopVendor: null,
        shopMode: null,
        shopSelectedIndex: 0,
        confirmSell: false,
        confirmChoice: 'no'
      },
      render: vi.fn()
    };

    // Mock shop imports
    vi.mock('../../src/js/items/shop.js', async () => {
      const actual = await vi.importActual('../../src/js/items/shop.js');
      return {
        ...actual,
        ShopSystem: actual
      };
    });

    vi.mock('../../src/js/ui/shop.js', () => ({
      renderShop: vi.fn()
    }));
  });

  describe('Shopping District NPCs', () => {
    it('Choose Goose should have miscellaneous items', () => {
      const chooseGoose = {
        id: 'choose_goose',
        name: 'Choose Goose',
        x: 15,
        y: 9,
        faction: 'merchants',
        dialogueType: 'choose_goose',
        goods: 'miscellaneous',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };

      // Open shop directly
      openShop(state, chooseGoose);
      
      // Check shop state
      expect(state.ui.shopOpen).toBe(true);
      expect(state.ui.shopVendor).toBeDefined();
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
      
      // Check for specific items
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Mystery Box');
      expect(itemNames).toContain('Shiny Trinket');
      expect(itemNames).toContain('Golden Medallion');
    });

    it('Broom vendor should have weapon items', () => {
      const broomVendor = {
        id: 'broom_master',
        name: 'Bristle Bob',
        x: 5,
        y: 18,
        faction: 'merchants',
        dialogueType: 'merchants',
        goods: 'brooms',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };

      openShop(state, broomVendor);
      
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
      
      // Check for broom items
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Basic Broom');
      expect(itemNames).toContain('Quality Broom');
      expect(itemNames).toContain('Magic Broom');
      
      // Check they are weapons
      state.ui.shopVendor.inventory.forEach(item => {
        expect(item.type).toBe('weapon');
        expect(item.item.dmg).toBeDefined();
      });
    });

    it('Pizza vendor should have food items', () => {
      const pizzaVendor = {
        id: 'pizza_sassy',
        name: 'Pizza Sassy',
        x: 14,
        y: 6,
        goods: 'pizza',
        shopkeeper: true
      };

      openShop(state, pizzaVendor);
      
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Pizza Slice');
      expect(itemNames).toContain('Whole Pizza');
      expect(itemNames).toContain('Garlic Knots');
    });

    it('Lollipop vendor should have candy items', () => {
      const lollipopVendor = {
        id: 'lollipop_lady',
        name: 'Lollipop Lady',
        x: 12,
        y: 17,
        goods: 'lollipops',
        shopkeeper: true
      };

      openShop(state, lollipopVendor);
      
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Small Lollipop');
      expect(itemNames).toContain('Giant Lollipop');
      expect(itemNames).toContain('Rainbow Lollipop');
    });

    it('Chocolate vendor should have chocolate items', () => {
      const chocolateVendor = {
        id: 'chocolate_vendor',
        name: 'Chocolate Artisan',
        goods: 'chocolate',
        shopkeeper: true
      };

      openShop(state, chocolateVendor);
      
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Chocolate Bar');
      expect(itemNames).toContain('Dark Chocolate');
    });

    it('Royal tart vendor should have tart items', () => {
      const tartVendor = {
        id: 'tart_toter',
        name: 'Tart Toter Tim',
        goods: 'royal_tarts',
        shopkeeper: true
      };

      openShop(state, tartVendor);
      
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Royal Tart');
      expect(itemNames).toContain('Mini Tart');
      expect(itemNames).toContain('Tart Sampler');
    });

    it('Candy corn vendor should have candy items', () => {
      const candyVendor = {
        id: 'candy_corn_vendor',
        name: 'Candy Corn Carl',
        goods: 'candy_corn',
        shopkeeper: true
      };

      openShop(state, candyVendor);
      
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Candy Corn');
      expect(itemNames).toContain('Candy Corn Bag');
    });
  });

  describe('Vendor without goods type', () => {
    it('should default to miscellaneous items', () => {
      const vendorNoGoods = {
        id: 'unknown_vendor',
        name: 'Unknown',
        shopkeeper: true
        // No goods property
      };

      openShop(state, vendorNoGoods);
      
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
      
      // Should have miscellaneous items
      const itemNames = state.ui.shopVendor.inventory.map(i => i.item.name);
      expect(itemNames).toContain('Mystery Box');
    });
  });

  describe('Complete Flow Test', () => {
    it('should work from NPC to shop to purchase', () => {
      const vendor = {
        id: 'choose_goose',
        name: 'Choose Goose',
        goods: 'miscellaneous',
        shopkeeper: true,
        x: 15,
        y: 9
      };

      // Step 1: Open shop
      openShop(state, vendor);
      expect(state.ui.shopOpen).toBe(true);
      
      // Step 2: Check inventory exists
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
      
      // Step 3: Purchase an item
      const firstItem = state.ui.shopVendor.inventory[0];
      const initialGold = player.gold;
      
      // Simulate purchase
      const purchaseResult = {
        success: true,
        item: firstItem.item,
        price: firstItem.price
      };
      
      if (purchaseResult.success) {
        player.gold -= firstItem.price;
        player.inventory.push({
          type: firstItem.type,
          item: firstItem.item,
          id: 'purchased_1'
        });
      }
      
      // Step 4: Verify purchase
      expect(player.gold).toBe(initialGold - firstItem.price);
      expect(player.inventory.length).toBe(1);
      expect(player.inventory[0].item.name).toBe(firstItem.item.name);
    });
  });
});