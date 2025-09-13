// tests/vendors/pharmacy-vendor.test.js
// TDD tests for pharmacy vendor (Ann) inventory integration

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openVendorShop } from '../../src/js/core/game.js';
import { openShop } from '../../src/js/items/shop.js';
import { PharmacyItems } from '../../src/js/items/pharmacyItems.js';

describe('Pharmacy Vendor Integration', () => {
  let state;
  let ann;
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

    ann = {
      id: 'pharmacist_ann',
      name: 'Ann',
      x: 6,
      y: 4,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'medicine',
      traits: ['helpful', 'knowledgeable', 'serious'],
      hp: 25,
      hpMax: 25,
      shopkeeper: true,
      chunkX: 1,
      chunkY: 0
    };

    state = {
      player,
      npcs: [ann],
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

  describe('Ann NPC Configuration', () => {
    it('should have correct vendor properties', () => {
      expect(ann.shopkeeper).toBe(true);
      expect(ann.goods).toBe('medicine');
      expect(ann.id).toBe('pharmacist_ann');
      expect(ann.name).toBe('Ann');
    });

    it('should be located in shopping district', () => {
      expect(ann.chunkX).toBe(1);
      expect(ann.chunkY).toBe(0);
    });
  });

  describe('Vendor Shop Initialization', () => {
    it('should initialize vendor with items when shop opens', () => {
      // Simulate opening Ann's shop
      openShop(state, ann);
      
      // Shop vendor should have inventory array
      expect(state.ui.shopVendor).toBeDefined();
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(Array.isArray(state.ui.shopVendor.inventory)).toBe(true);
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
    });

    it('should have pharmacy items in inventory', () => {
      openShop(state, ann);
      
      // Check for specific pharmacy items
      const itemNames = state.ui.shopVendor.inventory.map(item => item.item.name);
      
      expect(itemNames).toContain('Sugar Pills');
      expect(itemNames).toContain('Candy Medicine');
      expect(itemNames).toContain('Strength Syrup');
      expect(itemNames).toContain('Defense Drops');
      expect(itemNames).toContain('Speed Soda');
      expect(itemNames).toContain('Pain Pops');
      expect(itemNames).toContain('Max Health Mints');
      expect(itemNames).toContain('Energy Elixir');
    });

    it('should have correct item properties', () => {
      openShop(state, ann);
      
      const sugarPills = state.ui.shopVendor.inventory.find(item => item.item.name === 'Sugar Pills');
      expect(sugarPills).toBeDefined();
      expect(sugarPills.price).toBe(5);
      expect(sugarPills.type).toBe('potion');
    });

    it('should have correct costs for all items', () => {
      openShop(state, ann);
      
      const items = state.ui.shopVendor.inventory;
      const sugarPills = items.find(i => i.item.name === 'Sugar Pills');
      const candyMedicine = items.find(i => i.item.name === 'Candy Medicine');
      const energyElixir = items.find(i => i.item.name === 'Energy Elixir');
      
      expect(sugarPills?.price).toBe(5);
      expect(candyMedicine?.price).toBe(20);
      expect(energyElixir?.price).toBe(200);
    });
  });

  describe('Shop Inventory Generation', () => {
    it('should generate items for medicine goods type', () => {
      const medicineVendor = {
        ...ann,
        goods: 'medicine'
      };
      
      openShop(state, medicineVendor);
      
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBe(8); // All 8 pharmacy items
    });

    it('should handle pharmacy items with correct properties', () => {
      openShop(state, ann);
      
      const strengthSyrup = state.ui.shopVendor.inventory.find(i => i.item.name === 'Strength Syrup');
      expect(strengthSyrup).toBeDefined();
      expect(strengthSyrup.item.buff).toBe('str');
    });

    it('should mark items as potion type', () => {
      openShop(state, ann);
      
      state.ui.shopVendor.inventory.forEach(item => {
        expect(item.type).toBe('potion');
      });
    });
  });

  describe('Item Purchase and Use', () => {
    beforeEach(() => {
      openShop(state, ann);
    });

    it('should allow purchasing items with sufficient gold', () => {
      const sugarPills = state.ui.shopVendor.inventory.find(i => i.item.name === 'Sugar Pills');
      const initialGold = player.gold;
      
      // Simulate purchase
      if (player.gold >= sugarPills.price) {
        player.gold -= sugarPills.price;
        player.inventory.push({ ...sugarPills.item, count: 1 });
      }
      
      expect(player.gold).toBe(initialGold - sugarPills.price);
      expect(player.inventory.length).toBe(1);
      expect(player.inventory[0].name).toBe('Sugar Pills');
    });

    it('should apply item effects when used', async () => {
      const sugarPills = state.ui.shopVendor.inventory.find(i => i.item.name === 'Sugar Pills');
      
      // Add to inventory
      player.inventory.push({ ...sugarPills.item, count: 1 });
      
      // Apply the pharmacy item effect directly
      const { applyPharmacyItemEffect, PharmacyItems } = await import('../../src/js/items/pharmacyItems.js');
      const pharmacyItem = PharmacyItems['sugar_pills'];
      applyPharmacyItemEffect(state, player, pharmacyItem);
      
      // Check effect was applied
      expect(player.hp).toBe(55); // Healed 5 HP
    });

    it('should handle stat-boosting items', async () => {
      const strengthSyrup = state.ui.shopVendor.inventory.find(i => i.item.name === 'Strength Syrup');
      
      if (strengthSyrup) {
        const { applyPharmacyItemEffect, PharmacyItems } = await import('../../src/js/items/pharmacyItems.js');
        const pharmacyItem = PharmacyItems['strength_syrup'];
        applyPharmacyItemEffect(state, player, pharmacyItem);
      }
      
      expect(player.statusEffects).toHaveProperty('buff_str');
      expect(player.statusEffects.buff_str.power).toBe(50);
      expect(player.statusEffects.buff_str.duration).toBe(5);
    });
  });

  describe('Vendor Restock', () => {
    it('should have items available on each visit', () => {
      // First visit
      openShop(state, ann);
      const firstVisitItems = [...state.ui.shopVendor.inventory];
      expect(firstVisitItems.length).toBeGreaterThan(0);
      
      // Reset shop state (simulate leaving shop)
      state.ui.shopOpen = false;
      state.ui.shopVendor = null;
      
      // Second visit
      openShop(state, ann);
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
    });

    it('should maintain consistent item list', () => {
      openShop(state, ann);
      const itemNames1 = state.ui.shopVendor.inventory.map(i => i.item.name);
      
      state.ui.shopOpen = false;
      state.ui.shopVendor = null;
      
      openShop(state, ann);
      const itemNames2 = state.ui.shopVendor.inventory.map(i => i.item.name);
      
      // Should have same items available
      expect(itemNames2).toEqual(expect.arrayContaining(itemNames1));
    });
  });

  describe('Error Handling', () => {
    it('should handle vendor without goods type gracefully', () => {
      const vendorNoGoods = { ...ann };
      delete vendorNoGoods.goods;
      
      openShop(state, vendorNoGoods);
      
      // Should still work but maybe with default items
      expect(state.ui.shopVendor.inventory).toBeDefined();
    });

    it('should handle vendor with unknown goods type', () => {
      const vendorUnknown = { ...ann, goods: 'unknown_type' };
      
      openShop(state, vendorUnknown);
      
      // Should fall back to default items
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
    });
  });
});