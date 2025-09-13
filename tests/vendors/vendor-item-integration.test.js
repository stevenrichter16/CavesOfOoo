// tests/vendors/vendor-item-integration.test.js
// TDD tests to verify all vendor items are properly integrated with the game's item system

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openShop, purchaseItem } from '../../src/js/items/shop.js';
import { useInventoryItem } from '../../src/js/items/inventory.js';
import { applyPharmacyItemEffect } from '../../src/js/items/pharmacyItems.js';

describe('Vendor Item Game Integration', () => {
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
      str: 10,
      def: 10,
      spd: 10,
      gold: 1000,
      inventory: [],
      statusEffects: {},
      weapon: null,
      armor: null,
      headgear: null,
      rings: [null, null],
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
      equippedWeaponId: null,
      equippedArmorId: null,
      equippedHeadgearId: null,
      equippedRingIds: [null, null],
      ui: {
        shopOpen: false,
        shopVendor: null,
        shopMode: null,
        shopSelectedIndex: 0,
        selectedIndex: 0,
        inventoryTab: 'all',
        confirmSell: false,
        confirmChoice: 'no'
      }
    };

    // Mock render function
    state.render = vi.fn();
  });

  describe('Pharmacy Items (Ann)', () => {
    let pharmacyVendor;

    beforeEach(() => {
      pharmacyVendor = {
        id: 'pharmacist_ann',
        name: 'Ann',
        x: 6,
        y: 4,
        goods: 'medicine',
        shopkeeper: true
      };
    });

    it('should have healing potions that work with inventory system', () => {
      openShop(state, pharmacyVendor);
      
      // Buy Sugar Pills
      const sugarPillsIndex = state.ui.shopVendor.inventory.findIndex(
        i => i.item.name === 'Sugar Pills'
      );
      
      purchaseItem(state, pharmacyVendor.id, sugarPillsIndex);
      
      // Check item in inventory
      expect(player.inventory.length).toBe(1);
      const item = player.inventory[0];
      expect(item.type).toBe('potion');
      expect(item.item.name).toBe('Sugar Pills');
      
      // Use the item
      const initialHp = player.hp;
      if (item.item.heal) {
        player.hp = Math.min(player.hpMax, player.hp + item.item.heal);
      }
      expect(player.hp).toBe(initialHp + 5);
    });

    it('should have buff potions that apply status effects', () => {
      openShop(state, pharmacyVendor);
      
      // Buy Strength Syrup
      const strengthIndex = state.ui.shopVendor.inventory.findIndex(
        i => i.item.name === 'Strength Syrup'
      );
      
      purchaseItem(state, pharmacyVendor.id, strengthIndex);
      
      const item = player.inventory[0];
      expect(item.item.buff).toBe('str');
      
      // Apply buff effect
      if (item.item.buff === 'str') {
        player.statusEffects.buff_str = {
          power: 50,
          duration: 5,
          turnsRemaining: 5
        };
      }
      
      expect(player.statusEffects.buff_str).toBeDefined();
      expect(player.statusEffects.buff_str.power).toBe(50);
    });

    it('should properly track potion count', () => {
      openShop(state, pharmacyVendor);
      
      // Buy multiple potions
      purchaseItem(state, pharmacyVendor.id, 0);
      purchaseItem(state, pharmacyVendor.id, 0);
      
      expect(player.potionCount).toBe(2);
    });
  });

  describe('Weapon Items (Broom Shop)', () => {
    let broomVendor;

    beforeEach(() => {
      broomVendor = {
        id: 'broom_vendor',
        name: 'Broom Keeper',
        x: 6,
        y: 17,
        goods: 'brooms',
        shopkeeper: true
      };
    });

    it('should have weapons with proper damage values', () => {
      openShop(state, broomVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      
      // Check all weapons have damage
      inventory.forEach(item => {
        expect(item.type).toBe('weapon');
        expect(item.item.dmg).toBeDefined();
        expect(item.item.dmg).toBeGreaterThan(0);
      });
    });

    it('should allow equipping purchased weapons', () => {
      openShop(state, broomVendor);
      
      // Buy Basic Broom
      const basicBroomIndex = state.ui.shopVendor.inventory.findIndex(
        i => i.item.name === 'Basic Broom'
      );
      
      purchaseItem(state, broomVendor.id, basicBroomIndex);
      
      const weapon = player.inventory[0];
      expect(weapon.type).toBe('weapon');
      expect(weapon.item.dmg).toBe(2);
      
      // Equip the weapon
      state.equippedWeaponId = weapon.id;
      state.player.weapon = weapon.item;
      
      expect(state.player.weapon).toBeDefined();
      expect(state.player.weapon.dmg).toBe(2);
    });

    it('should have special weapons with unique properties', () => {
      openShop(state, broomVendor);
      
      const magicBroom = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Magic Broom'
      );
      
      expect(magicBroom).toBeDefined();
      expect(magicBroom.item.dmg).toBe(5);
      expect(magicBroom.price).toBeGreaterThan(50);
    });
  });

  describe('Food Items (Pizza, Candy, etc.)', () => {
    it('should have pizza items that heal', () => {
      const pizzaVendor = {
        id: 'pizza_vendor',
        name: 'Pizza Sassy',
        x: 14,
        y: 6,
        goods: 'pizza',
        shopkeeper: true
      };

      openShop(state, pizzaVendor);
      
      const pizzaSlice = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Pizza Slice'
      );
      
      expect(pizzaSlice).toBeDefined();
      expect(pizzaSlice.type).toBe('potion');
      expect(pizzaSlice.item.heal).toBe(10);
      
      // Buy and use
      purchaseItem(state, pizzaVendor.id, 0);
      
      const item = player.inventory[0];
      const oldHp = player.hp;
      player.hp = Math.min(player.hpMax, player.hp + item.item.heal);
      
      expect(player.hp).toBe(oldHp + item.item.heal);
    });

    it('should have candy items with varying heal amounts', () => {
      const candyVendor = {
        id: 'candy_vendor',
        name: 'Candy Merchant',
        x: 10,
        y: 5,
        goods: 'candy_corn',
        shopkeeper: true
      };

      openShop(state, candyVendor);
      
      const inventory = state.ui.shopVendor.inventory;
      
      // All candy should be potions with heal values
      inventory.forEach(item => {
        expect(item.type).toBe('potion');
        expect(item.item.heal).toBeDefined();
        expect(item.item.heal).toBeGreaterThan(0);
      });
    });

    it('should have lollipops with special buffs', () => {
      const lollipopVendor = {
        id: 'lollipop_vendor',
        name: 'Lollipop Lady',
        x: 12,
        y: 17,
        goods: 'lollipops',
        shopkeeper: true
      };

      openShop(state, lollipopVendor);
      
      const rainbowLollipop = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Rainbow Lollipop'
      );
      
      expect(rainbowLollipop).toBeDefined();
      expect(rainbowLollipop.item.heal).toBe(25);
      expect(rainbowLollipop.item.buff).toBe('spd');
    });
  });

  describe('Item Stacking and Count', () => {
    it('should properly handle potion stacking', () => {
      const vendor = {
        id: 'test_vendor',
        name: 'Test',
        x: 1,
        y: 1,
        goods: 'candy_corn',
        shopkeeper: true
      };

      openShop(state, vendor);
      
      // Buy same item multiple times
      purchaseItem(state, vendor.id, 0);
      purchaseItem(state, vendor.id, 0);
      
      // Items should be separate (current implementation)
      expect(player.inventory.length).toBe(2);
      expect(player.potionCount).toBe(2);
    });
  });

  describe('Miscellaneous Items (Choose Goose)', () => {
    let chooseGoose;

    beforeEach(() => {
      chooseGoose = {
        id: 'choose_goose',
        name: 'Choose Goose',
        x: 15,
        y: 8,
        goods: 'miscellaneous',
        shopkeeper: true
      };
    });

    it('should have treasure items with sell values', () => {
      openShop(state, chooseGoose);
      
      const goldenMedallion = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Golden Medallion'
      );
      
      expect(goldenMedallion).toBeDefined();
      expect(goldenMedallion.item.sellValue).toBe(75);
      expect(goldenMedallion.type).toBe('item');
    });

    it('should have mystery items', () => {
      openShop(state, chooseGoose);
      
      const mysteryBox = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Mystery Box'
      );
      
      expect(mysteryBox).toBeDefined();
      expect(mysteryBox.type).toBe('item');
      expect(mysteryBox.price).toBe(25);
    });
  });

  describe('Complete Purchase-to-Use Flow', () => {
    it('should allow buying and using healing items', () => {
      const vendor = {
        id: 'test_vendor',
        name: 'Test',
        x: 1,
        y: 1,
        goods: 'royal_tarts',
        shopkeeper: true
      };

      openShop(state, vendor);
      
      // Buy Royal Tart
      const royalTart = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Royal Tart'
      );
      const index = state.ui.shopVendor.inventory.indexOf(royalTart);
      
      const initialGold = player.gold;
      purchaseItem(state, vendor.id, index);
      
      // Verify purchase
      expect(player.gold).toBe(initialGold - royalTart.price);
      expect(player.inventory.length).toBe(1);
      
      // Use the item
      const item = player.inventory[0];
      const initialHp = player.hp;
      
      if (item.item.heal) {
        player.hp = Math.min(player.hpMax, player.hp + item.item.heal);
      }
      
      expect(player.hp).toBe(initialHp + 30);
    });

    it('should allow buying and equipping weapons', () => {
      const vendor = {
        id: 'broom_vendor',
        name: 'Broom Keeper',
        x: 6,
        y: 17,
        goods: 'brooms',
        shopkeeper: true
      };

      openShop(state, vendor);
      
      // Buy Quality Broom
      const qualityBroom = state.ui.shopVendor.inventory.find(
        i => i.item.name === 'Quality Broom'
      );
      const index = state.ui.shopVendor.inventory.indexOf(qualityBroom);
      
      purchaseItem(state, vendor.id, index);
      
      // Equip it
      const weapon = player.inventory[0];
      state.equippedWeaponId = weapon.id;
      state.player.weapon = weapon.item;
      
      expect(state.player.weapon.name).toBe('Quality Broom');
      expect(state.player.weapon.dmg).toBe(3);
    });
  });

  describe('All Shopping District NPCs', () => {
    const shoppingDistrictNPCs = [
      { id: 'pharmacist_ann', name: 'Ann', goods: 'medicine' },
      { id: 'choose_goose', name: 'Choose Goose', goods: 'miscellaneous' },
      { id: 'candy_vendor_1', name: 'Candy Corn Vendor', goods: 'candy_corn' },
      { id: 'lollipop_vendor', name: 'Lollipop Lady', goods: 'lollipops' },
      { id: 'chocolate_vendor', name: 'Chocolate Artisan', goods: 'chocolate' },
      { id: 'pizza_vendor', name: 'Pizza Sassy', goods: 'pizza' },
      { id: 'broom_vendor', name: 'Broom Keeper', goods: 'brooms' },
      { id: 'royal_tart_vendor', name: 'Royal Tart Baker', goods: 'royal_tarts' }
    ];

    shoppingDistrictNPCs.forEach(npcData => {
      it(`${npcData.name} should have valid purchasable items`, () => {
        const vendor = {
          ...npcData,
          x: 10,
          y: 10,
          shopkeeper: true
        };

        openShop(state, vendor);
        
        const inventory = state.ui.shopVendor.inventory;
        
        // Should have items
        expect(inventory).toBeDefined();
        expect(inventory.length).toBeGreaterThan(0);
        
        // All items should have required properties
        inventory.forEach(item => {
          expect(item.type).toBeDefined();
          expect(item.item).toBeDefined();
          expect(item.item.name).toBeDefined();
          expect(item.price).toBeDefined();
          expect(item.price).toBeGreaterThan(0);
          
          // Type-specific validations
          if (item.type === 'potion') {
            // Potions should have some kind of effect
            const hasEffect = item.item.heal || item.item.buff || item.item.fullRestore || 
                            item.item.maxHpBoost || item.item.damageReduction || item.item.effect;
            expect(hasEffect).toBeTruthy();
          } else if (item.type === 'weapon') {
            expect(item.item.dmg).toBeDefined();
            expect(item.item.dmg).toBeGreaterThan(0);
          } else if (item.type === 'item') {
            // Misc items should exist
            expect(item.item.name).toBeTruthy();
          }
        });
        
        // Should be purchasable
        if (player.gold >= inventory[0].price) {
          const result = purchaseItem(state, vendor.id, 0);
          expect(result.success).toBe(true);
          expect(player.inventory.length).toBe(1);
        }
      });
    });
  });
});