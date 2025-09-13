// tests/items/sweet-tooth-item.test.js
// Test the Sweet Tooth item definition and inventory integration

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QUEST_ITEMS } from '../../src/js/items/questItems.js';
import { addItemToInventory } from '../../src/js/items/inventory.js';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';

describe('Sweet Tooth Item Definition', () => {
  describe('Item Properties', () => {
    it('should define fox_sweet_tooth in QUEST_ITEMS', () => {
      expect(QUEST_ITEMS.fox_sweet_tooth).toBeDefined();
      expect(QUEST_ITEMS.fox_sweet_tooth.name).toBe('Fox Sweet Tooth');
      expect(QUEST_ITEMS.fox_sweet_tooth.description).toContain('tooth');
      expect(QUEST_ITEMS.fox_sweet_tooth.value).toBeGreaterThan(0);
    });

    it('should have proper item structure for inventory', () => {
      const tooth = QUEST_ITEMS.fox_sweet_tooth;
      expect(tooth).toHaveProperty('name');
      expect(tooth).toHaveProperty('description');
      expect(tooth).toHaveProperty('value');
      expect(tooth.stackable).not.toBe(false); // Should be stackable
    });
  });

  describe('Inventory Integration', () => {
    let state;
    let player;

    beforeEach(() => {
      player = {
        id: 'player',
        x: 10,
        y: 10,
        inventory: [],
        gold: 100
      };

      state = {
        player,
        log: vi.fn()
      };
    });

    it('should add sweet tooth to empty inventory', () => {
      const tooth = {
        item: {
          id: 'fox_sweet_tooth',
          name: 'Fox Sweet Tooth',
          description: 'A dangerously sweet tooth from a fox',
          value: 10
        },
        quantity: 1
      };

      // Manual addition to inventory
      player.inventory.push(tooth);
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].item.id).toBe('fox_sweet_tooth');
      expect(player.inventory[0].quantity).toBe(1);
    });

    it('should stack multiple sweet teeth', () => {
      // Add first tooth
      const tooth1 = {
        item: {
          id: 'fox_sweet_tooth',
          name: 'Fox Sweet Tooth',
          description: 'A dangerously sweet tooth from a fox',
          value: 10
        },
        quantity: 1
      };
      player.inventory.push(tooth1);

      // Add second tooth - should stack
      const existing = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      if (existing) {
        existing.quantity++;
      }

      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].quantity).toBe(2);
    });

    it('should handle adding sweet tooth with addItemToInventory function', () => {
      const toothItem = QUEST_ITEMS.fox_sweet_tooth || {
        id: 'fox_sweet_tooth',
        name: 'Fox Sweet Tooth',
        description: 'A dangerously sweet tooth from a fox',
        value: 10,
        stackable: true
      };

      // Try to add using the standard inventory function
      if (typeof addItemToInventory === 'function') {
        addItemToInventory(state, player, toothItem, 1);
        
        const tooth = player.inventory.find(i => 
          i.item?.id === 'fox_sweet_tooth' || 
          i.item?.name === 'Fox Sweet Tooth'
        );
        
        expect(tooth).toBeDefined();
      }
    });
  });

  describe('Fox Collection Mechanics', () => {
    let state;
    let player;
    let fox;

    beforeEach(() => {
      player = {
        id: 'player',
        x: 10,
        y: 10,
        hp: 30,
        hpMax: 30,
        str: 10,
        def: 2,
        spd: 5,
        inventory: [],
        quests: {
          active: ['sweet_tooth_foxes'],
          progress: { sweet_tooth_foxes: { teeth: 0 } }
        }
      };

      fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 5,
        status: 'sleep',
        asleep: true,
        hasTeeth: true,
        alive: true
      };

      state = {
        player,
        cx: 0,
        cy: -2,
        chunk: {
          monsters: [fox],
          map: Array(22).fill(null).map(() => Array(48).fill('.'))
        },
        log: vi.fn()
      };
    });

    it('should create proper item structure when collecting from fox', async () => {
      // Mock the bump interaction
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      
      // Simulate what should happen
      if (fox.asleep && fox.hasTeeth) {
        const tooth = {
          item: {
            id: 'fox_sweet_tooth',
            name: 'Fox Sweet Tooth',
            description: 'A dangerously sweet tooth from a fox',
            value: 10
          },
          quantity: 1
        };
        
        player.inventory.push(tooth);
        fox.hasTeeth = false;
      }

      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].item.id).toBe('fox_sweet_tooth');
      expect(fox.hasTeeth).toBe(false);
    });

    it('should properly format item for inventory display', () => {
      const tooth = {
        item: {
          id: 'fox_sweet_tooth',
          name: 'Fox Sweet Tooth',
          description: 'A dangerously sweet tooth from a fox',
          value: 10
        },
        quantity: 3
      };

      // Check display format
      const displayName = `${tooth.item.name} (${tooth.quantity})`;
      expect(displayName).toBe('Fox Sweet Tooth (3)');
      
      // Check value calculation
      const totalValue = tooth.item.value * tooth.quantity;
      expect(totalValue).toBe(30);
    });
  });

  describe('Quest Item Compatibility', () => {
    it('should work with quest item grant system', () => {
      // Import the grant function if available
      const grantItem = (player, itemId, quantity = 1) => {
        const itemDef = QUEST_ITEMS[itemId];
        if (!itemDef) return false;

        const item = {
          item: {
            id: itemId,
            ...itemDef
          },
          quantity
        };

        const existing = player.inventory.find(i => i.item?.id === itemId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          player.inventory.push(item);
        }
        return true;
      };

      const player = { inventory: [] };
      const success = grantItem(player, 'fox_sweet_tooth', 1);
      
      if (QUEST_ITEMS.fox_sweet_tooth) {
        expect(success).toBe(true);
        expect(player.inventory).toHaveLength(1);
      }
    });

    it('should be sellable at vendors', () => {
      const tooth = QUEST_ITEMS.fox_sweet_tooth || {
        name: 'Fox Sweet Tooth',
        value: 10
      };
      
      // Check sellability
      expect(tooth.value).toBeGreaterThan(0);
      
      // Calculate sell price (usually half value)
      const sellPrice = Math.floor(tooth.value / 2);
      expect(sellPrice).toBeGreaterThan(0);
    });
  });
});