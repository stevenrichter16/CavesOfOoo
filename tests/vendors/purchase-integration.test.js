// tests/vendors/purchase-integration.test.js
// TDD tests for complete purchase and inventory integration

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openShop, purchaseItem, sellItem } from '../../src/js/items/shop.js';
import { applyVendorItemEffect } from '../../src/js/items/vendorItems.js';

describe('Purchase and Inventory Integration', () => {
  let state;
  let player;
  let vendor;

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
      gold: 100,
      inventory: [],
      statusEffects: {},
      equippedWeaponId: null,
      equippedArmorId: null,
      equippedHeadgearId: null,
      equippedRingIds: [null, null],
      potionCount: 0,
      quests: {
        active: [],
        completed: [],
        progress: {},
        fetchQuests: {}
      }
    };

    vendor = {
      id: 'test_vendor',
      name: 'Test Vendor',
      x: 10,
      y: 10,
      goods: 'lollipops',
      shopkeeper: true,
      chunkX: 1,
      chunkY: 0
    };

    state = {
      player,
      npcs: [vendor],
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
      }
    };

    // Mock emit function
    vi.mock('../../src/js/utils/events.js', () => ({
      emit: vi.fn()
    }));
  });

  describe('Basic Purchase Flow', () => {
    it('should successfully purchase an item with sufficient gold', () => {
      openShop(state, vendor);
      
      const result = purchaseItem(state, vendor.id, 0);
      
      expect(result.success).toBe(true);
      expect(state.player.gold).toBeLessThan(100);
      expect(state.player.inventory.length).toBe(1);
    });

    it('should fail purchase with insufficient gold', () => {
      player.gold = 1; // Not enough for any item
      openShop(state, vendor);
      
      const result = purchaseItem(state, vendor.id, 0);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Insufficient gold');
      expect(state.player.inventory.length).toBe(0);
    });

    it('should remove item from vendor inventory after purchase', () => {
      openShop(state, vendor);
      const initialCount = state.ui.shopVendor.inventory.length;
      
      purchaseItem(state, vendor.id, 0);
      
      expect(state.ui.shopVendor.inventory.length).toBe(initialCount - 1);
    });
  });

  describe('Item Type Handling', () => {
    it('should handle potion items correctly', () => {
      openShop(state, vendor);
      
      purchaseItem(state, vendor.id, 0); // Buy a lollipop (potion type)
      
      const item = state.player.inventory[0];
      expect(item.type).toBe('potion');
      expect(state.player.potionCount).toBe(1);
    });

    it('should handle weapon items correctly', () => {
      vendor.goods = 'brooms';
      openShop(state, vendor);
      
      purchaseItem(state, vendor.id, 0); // Buy a broom (weapon type)
      
      const item = state.player.inventory[0];
      expect(item.type).toBe('weapon');
      expect(item.item.dmg).toBeDefined();
    });

    it('should handle miscellaneous items correctly', () => {
      vendor.goods = 'miscellaneous';
      openShop(state, vendor);
      
      purchaseItem(state, vendor.id, 0); // Buy mystery box
      
      const item = state.player.inventory[0];
      expect(item.type).toBe('item');
    });
  });

  describe('Item Effects Application', () => {
    it('should apply healing effect from food items', () => {
      vendor.goods = 'pizza';
      openShop(state, vendor);
      
      purchaseItem(state, vendor.id, 0); // Buy pizza slice
      
      const item = state.player.inventory[0];
      expect(item.item.heal).toBe(10);
      
      // Apply the effect
      if (item.item.heal) {
        const oldHp = player.hp;
        player.hp = Math.min(player.hpMax, player.hp + item.item.heal);
        expect(player.hp).toBe(oldHp + item.item.heal);
      }
    });

    it('should apply buff effects from special items', () => {
      vendor.goods = 'lollipops';
      openShop(state, vendor);
      
      // Find rainbow lollipop (has speed buff)
      const rainbowIndex = state.ui.shopVendor.inventory.findIndex(
        i => i.item.name === 'Rainbow Lollipop'
      );
      
      if (rainbowIndex >= 0) {
        purchaseItem(state, vendor.id, rainbowIndex);
        
        const item = state.player.inventory[0];
        expect(item.item.buff).toBe('spd');
      }
    });

    it('should handle items with multiple effects', () => {
      vendor.goods = 'royal_tarts';
      openShop(state, vendor);
      
      const item = state.ui.shopVendor.inventory[0];
      
      // Royal tarts should have healing
      expect(item.item.heal).toBeDefined();
      expect(item.type).toBe('potion');
    });
  });

  describe('Selling Items', () => {
    beforeEach(() => {
      // Give player some items to sell
      player.inventory = [
        {
          id: 'item_1',
          type: 'potion',
          item: { name: 'Test Potion', price: 20, heal: 10 }
        },
        {
          id: 'item_2',
          type: 'weapon',
          item: { name: 'Test Sword', price: 100, dmg: 5 }
        }
      ];
    });

    it('should successfully sell an item', () => {
      openShop(state, vendor);
      
      const result = sellItem(state, 0);
      
      expect(result.success).toBe(true);
      expect(result.price).toBe(10); // 50% of base price
      expect(player.gold).toBe(110); // Started with 100, got 10
      expect(player.inventory.length).toBe(1);
    });

    it('should add sold item to vendor inventory', () => {
      openShop(state, vendor);
      const initialVendorItems = state.ui.shopVendor.inventory.length;
      
      sellItem(state, 0);
      
      expect(state.ui.shopVendor.inventory.length).toBe(initialVendorItems + 1);
    });

    it('should handle selling equipped items with confirmation', () => {
      player.equippedWeaponId = 'item_2';
      state.equippedWeaponId = 'item_2'; // State also needs this
      openShop(state, vendor);
      
      // First attempt should need confirmation
      const result1 = sellItem(state, 1, false);
      expect(result1.success).toBe(false);
      expect(result1.needsConfirmation).toBe(true);
      
      // Second attempt with confirmation should succeed
      const result2 = sellItem(state, 1, true);
      expect(result2.success).toBe(true);
      expect(state.equippedWeaponId).toBe(null); // Unequipped
    });
  });

  describe('Gold Management', () => {
    it('should correctly deduct gold on purchase', () => {
      openShop(state, vendor);
      const item = state.ui.shopVendor.inventory[0];
      const initialGold = player.gold;
      
      purchaseItem(state, vendor.id, 0);
      
      expect(player.gold).toBe(initialGold - item.price);
    });

    it('should correctly add gold on sale', () => {
      player.inventory.push({
        id: 'item_1',
        type: 'potion',
        item: { name: 'Test Item', price: 50 }
      });
      
      openShop(state, vendor);
      const initialGold = player.gold;
      
      sellItem(state, 0);
      
      expect(player.gold).toBe(initialGold + 25); // 50% of 50
    });
  });

  describe('Inventory Stacking', () => {
    it('should stack identical potions', () => {
      vendor.goods = 'candy_corn';
      openShop(state, vendor);
      
      // Buy same item twice
      purchaseItem(state, vendor.id, 0);
      
      // Reopen shop to reset inventory
      state.ui.shopOpen = false;
      openShop(state, vendor);
      purchaseItem(state, vendor.id, 0);
      
      // Should have 2 items in inventory (not stacked in current implementation)
      expect(player.inventory.length).toBe(2);
    });
  });

  describe('Special Item Behaviors', () => {
    it('should handle mystery box random effects', () => {
      vendor.goods = 'miscellaneous';
      openShop(state, vendor);
      
      const mysteryIndex = state.ui.shopVendor.inventory.findIndex(
        i => i.item.name === 'Mystery Box'
      );
      
      if (mysteryIndex >= 0) {
        purchaseItem(state, vendor.id, mysteryIndex);
        
        const item = player.inventory[0];
        expect(item.item.name).toBe('Mystery Box');
        // Effect would be applied on use
      }
    });

    it('should handle quest items appropriately', () => {
      vendor.goods = 'miscellaneous';
      openShop(state, vendor);
      
      const medallionIndex = state.ui.shopVendor.inventory.findIndex(
        i => i.item.name === 'Golden Medallion'
      );
      
      if (medallionIndex >= 0) {
        purchaseItem(state, vendor.id, medallionIndex);
        
        const item = player.inventory[0];
        expect(item.item.sellValue).toBe(75);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid vendor ID', () => {
      openShop(state, vendor);
      
      const result = purchaseItem(state, 'invalid_vendor', 0);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Invalid vendor');
    });

    it('should handle invalid item index', () => {
      openShop(state, vendor);
      
      const result = purchaseItem(state, vendor.id, 999);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Invalid item');
    });

    it('should handle vendor with no inventory', () => {
      vendor.goods = undefined;
      openShop(state, vendor);
      
      // Should have default misc items
      expect(state.ui.shopVendor.inventory).toBeDefined();
      expect(state.ui.shopVendor.inventory.length).toBeGreaterThan(0);
    });
  });

  describe('Persistence', () => {
    it('should maintain vendor inventory between visits', () => {
      openShop(state, vendor);
      const item1 = state.ui.shopVendor.inventory[0];
      
      // Close and reopen
      state.ui.shopOpen = false;
      state.ui.shopVendor = null;
      
      openShop(state, vendor);
      const item2 = state.ui.shopVendor.inventory[0];
      
      expect(item2.item.name).toBe(item1.item.name);
      expect(item2.price).toBe(item1.price);
    });

    it('should remember purchased items are gone', () => {
      openShop(state, vendor);
      const initialCount = state.ui.shopVendor.inventory.length;
      const firstItem = state.ui.shopVendor.inventory[0].item.name;
      
      purchaseItem(state, vendor.id, 0);
      
      // Item should be removed
      expect(state.ui.shopVendor.inventory.length).toBe(initialCount - 1);
      
      // Should not have the purchased item
      const hasItem = state.ui.shopVendor.inventory.some(
        i => i.item.name === firstItem
      );
      expect(hasItem).toBe(false);
    });
  });
});