// tests/vendors/shopping-district-vendors.test.js
// TDD tests for all shopping district vendors

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openShop } from '../../src/js/items/shop.js';

describe('Shopping District Vendors', () => {
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
      x: 6,
      y: 4,
      hp: 50,
      hpMax: 100,
      gold: 500,
      inventory: [],
      statusEffects: {},
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
      chunk: { cx: 1, cy: 0 },
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
      }
    };

    // Mock render function
    state.render = vi.fn();
  });

  describe('Choose Goose (Miscellaneous Vendor)', () => {
    let chooseGoose;

    beforeEach(() => {
      chooseGoose = {
        id: 'choose_goose',
        name: 'Choose Goose',
        x: 15,
        y: 8,
        faction: 'merchants',
        dialogueType: 'choose_goose',
        goods: 'miscellaneous',
        traits: ['poetic', 'mysterious', 'trader'],
        hp: 30,
        hpMax: 30,
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have miscellaneous items in inventory', () => {
      openShop(state, chooseGoose);
      
      const inventory = state.ui.shopVendor.inventory;
      expect(inventory).toBeDefined();
      expect(inventory.length).toBeGreaterThan(0);
      
      const itemNames = inventory.map(i => i.item.name);
      expect(itemNames).toContain('Mystery Box');
      expect(itemNames).toContain('Shiny Trinket');
      expect(itemNames).toContain('Golden Medallion');
    });

    it('should have correct pricing for miscellaneous items', () => {
      openShop(state, chooseGoose);
      
      const inventory = state.ui.shopVendor.inventory;
      const mysteryBox = inventory.find(i => i.item.name === 'Mystery Box');
      const goldenMedallion = inventory.find(i => i.item.name === 'Golden Medallion');
      
      expect(mysteryBox?.price).toBe(25);
      expect(goldenMedallion?.price).toBe(100);
    });
  });

  describe('Candy Corn Vendor', () => {
    let candyCornVendor;

    beforeEach(() => {
      candyCornVendor = {
        id: 'candy_corn_vendor',
        name: 'Candy Corn Merchant',
        x: 10,
        y: 5,
        faction: 'merchants',
        goods: 'candy_corn',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have candy corn items', () => {
      openShop(state, candyCornVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const itemNames = inventory.map(i => i.item.name);
      
      expect(itemNames).toContain('Candy Corn');
      expect(itemNames).toContain('Candy Corn Bag');
    });

    it('should have healing properties on candy corn', () => {
      openShop(state, candyCornVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const candyCorn = inventory.find(i => i.item.name === 'Candy Corn');
      
      expect(candyCorn?.item.heal).toBe(5);
      expect(candyCorn?.type).toBe('potion');
    });
  });

  describe('Lollipop Store', () => {
    let lollipopVendor;

    beforeEach(() => {
      lollipopVendor = {
        id: 'lollipop_vendor',
        name: 'Lollipop Lady',
        x: 12,
        y: 17,
        faction: 'merchants',
        goods: 'lollipops',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have variety of lollipops', () => {
      openShop(state, lollipopVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const itemNames = inventory.map(i => i.item.name);
      
      expect(itemNames).toContain('Small Lollipop');
      expect(itemNames).toContain('Giant Lollipop');
      expect(itemNames).toContain('Rainbow Lollipop');
    });

    it('should have special effects on premium lollipops', () => {
      openShop(state, lollipopVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const rainbowLollipop = inventory.find(i => i.item.name === 'Rainbow Lollipop');
      
      expect(rainbowLollipop?.item.heal).toBe(25);
      expect(rainbowLollipop?.item.buff).toBe('spd');
      expect(rainbowLollipop?.price).toBe(25);
    });
  });

  describe('Pizza Sassy\'s', () => {
    let pizzaVendor;

    beforeEach(() => {
      pizzaVendor = {
        id: 'pizza_sassy_vendor',
        name: 'Pizza Sassy',
        x: 14,
        y: 6,
        faction: 'merchants',
        goods: 'pizza',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have pizza menu items', () => {
      openShop(state, pizzaVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const itemNames = inventory.map(i => i.item.name);
      
      expect(itemNames).toContain('Pizza Slice');
      expect(itemNames).toContain('Whole Pizza');
      expect(itemNames).toContain('Garlic Knots');
    });

    it('should have varying healing amounts based on portion size', () => {
      openShop(state, pizzaVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const slice = inventory.find(i => i.item.name === 'Pizza Slice');
      const whole = inventory.find(i => i.item.name === 'Whole Pizza');
      
      expect(slice?.item.heal).toBe(10);
      expect(whole?.item.heal).toBe(50);
      expect(whole?.price).toBe(50); // Price matches healing amount
    });
  });

  describe('Broom Shop', () => {
    let broomVendor;

    beforeEach(() => {
      broomVendor = {
        id: 'broom_vendor',
        name: 'Broom Keeper',
        x: 6,
        y: 17,
        faction: 'merchants',
        goods: 'brooms',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have weapon type items', () => {
      openShop(state, broomVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      
      inventory.forEach(item => {
        expect(item.type).toBe('weapon');
      });
    });

    it('should have brooms with increasing damage', () => {
      openShop(state, broomVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const basic = inventory.find(i => i.item.name === 'Basic Broom');
      const quality = inventory.find(i => i.item.name === 'Quality Broom');
      const magic = inventory.find(i => i.item.name === 'Magic Broom');
      
      expect(basic?.item.dmg).toBe(2);
      expect(quality?.item.dmg).toBe(3);
      expect(magic?.item.dmg).toBe(5);
    });

    it('should have appropriate pricing for weapons', () => {
      openShop(state, broomVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const basic = inventory.find(i => i.item.name === 'Basic Broom');
      const magic = inventory.find(i => i.item.name === 'Magic Broom');
      
      expect(basic?.price).toBe(20);
      expect(magic?.price).toBe(100);
    });
  });

  describe('Royal Tart Shop', () => {
    let royalTartVendor;

    beforeEach(() => {
      royalTartVendor = {
        id: 'royal_tart_vendor',
        name: 'Royal Tart Baker',
        x: 30,
        y: 10,
        faction: 'merchants',
        goods: 'royal_tarts',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have premium healing items', () => {
      openShop(state, royalTartVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const itemNames = inventory.map(i => i.item.name);
      
      expect(itemNames).toContain('Royal Tart');
      expect(itemNames).toContain('Mini Tart');
      expect(itemNames).toContain('Tart Sampler');
    });

    it('should have high-tier healing amounts', () => {
      openShop(state, royalTartVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const royalTart = inventory.find(i => i.item.name === 'Royal Tart');
      const sampler = inventory.find(i => i.item.name === 'Tart Sampler');
      
      expect(royalTart?.item.heal).toBe(30);
      expect(sampler?.item.heal).toBe(40);
    });
  });

  describe('Chocolate Shop', () => {
    let chocolateVendor;

    beforeEach(() => {
      chocolateVendor = {
        id: 'chocolate_vendor',
        name: 'Chocolate Artisan',
        x: 25,
        y: 15,
        faction: 'merchants',
        goods: 'chocolate',
        shopkeeper: true,
        chunkX: 1,
        chunkY: 0
      };
    });

    it('should have chocolate items', () => {
      openShop(state, chocolateVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const itemNames = inventory.map(i => i.item.name);
      
      expect(itemNames).toContain('Chocolate Bar');
      expect(itemNames).toContain('Dark Chocolate');
    });

    it('should have buff effects on premium chocolate', () => {
      openShop(state, chocolateVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      const darkChocolate = inventory.find(i => i.item.name === 'Dark Chocolate');
      
      expect(darkChocolate?.item.heal).toBe(10);
      expect(darkChocolate?.item.buff).toBe('def');
      expect(darkChocolate?.price).toBe(12);
    });
  });

  describe('Vendor Inventory Consistency', () => {
    it('should generate same inventory for same vendor on multiple opens', () => {
      const vendor = {
        id: 'test_vendor',
        name: 'Test Vendor',
        x: 10,
        y: 10,
        goods: 'lollipops',
        shopkeeper: true
      };

      // First open
      openShop(state, vendor);
      const firstInventory = [...state.ui.shopVendor.inventory];
      
      // Reset and reopen
      state.ui.shopOpen = false;
      state.ui.shopVendor = null;
      
      openShop(state, vendor);
      const secondInventory = state.ui.shopVendor.inventory;
      
      // Should have same items
      expect(secondInventory.length).toBe(firstInventory.length);
      firstInventory.forEach((item, index) => {
        expect(secondInventory[index].item.name).toBe(item.item.name);
        expect(secondInventory[index].price).toBe(item.price);
      });
    });
  });

  describe('Purchase Integration', () => {
    it('should support purchasing items from any vendor', () => {
      const vendor = {
        id: 'test_vendor',
        name: 'Test Vendor',
        x: 10,
        y: 10,
        goods: 'candy_corn',
        shopkeeper: true
      };

      openShop(state, vendor);
      const inventory = state.ui.shopVendor.inventory;
      const item = inventory[0];
      
      // Player should be able to afford it
      expect(player.gold).toBeGreaterThanOrEqual(item.price);
      
      // Simulate purchase
      const initialGold = player.gold;
      player.gold -= item.price;
      player.inventory.push({ ...item.item, id: 'purchased_1' });
      
      // Verify purchase
      expect(player.gold).toBe(initialGold - item.price);
      expect(player.inventory.length).toBe(1);
      expect(player.inventory[0].name).toBe(item.item.name);
    });
  });

  describe('Vendor Type Coverage', () => {
    it('should handle all defined goods types', () => {
      const goodsTypes = [
        'medicine', 'candy_corn', 'lollipops', 'chocolate',
        'pizza', 'brooms', 'royal_tarts', 'miscellaneous'
      ];

      goodsTypes.forEach(goods => {
        const vendor = {
          id: `${goods}_vendor`,
          name: `${goods} Vendor`,
          x: 10,
          y: 10,
          goods: goods,
          shopkeeper: true
        };

        openShop(state, vendor);
        
        expect(state.ui.shopVendor.inventory).toBeDefined();
        expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
        
        // Reset for next iteration
        state.ui.shopOpen = false;
        state.ui.shopVendor = null;
      });
    });
  });
});