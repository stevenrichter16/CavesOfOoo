import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventorySystem } from '../../src/js/systems/InventorySystem.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('InventorySystem', () => {
  let inventorySystem;
  let eventBus;
  let mockInventory;

  beforeEach(() => {
    eventBus = new EventBus();
    inventorySystem = new InventorySystem(eventBus);
    mockInventory = [];
  });

  describe('Initialization', () => {
    it('should create an InventorySystem instance', () => {
      expect(inventorySystem).toBeInstanceOf(InventorySystem);
      expect(inventorySystem.eventBus).toBe(eventBus);
    });

    it('should work without eventBus', () => {
      const systemWithoutBus = new InventorySystem();
      expect(systemWithoutBus).toBeInstanceOf(InventorySystem);
      expect(systemWithoutBus.eventBus).toBeDefined();
    });

    it('should have default max inventory size', () => {
      expect(inventorySystem.maxSize).toBe(50);
    });
  });

  describe('addItem', () => {
    it('should add non-stackable item to inventory', () => {
      const item = { id: 'sword', name: 'Iron Sword', stackable: false };
      
      const result = inventorySystem.addItem(mockInventory, item);
      
      expect(result).toBe(true);
      expect(mockInventory).toHaveLength(1);
      expect(mockInventory[0]).toBe(item);
    });

    it('should stack stackable items', () => {
      const item1 = { id: 'arrow', stackable: true, count: 10 };
      const item2 = { id: 'arrow', stackable: true, count: 5 };
      
      inventorySystem.addItem(mockInventory, item1);
      inventorySystem.addItem(mockInventory, item2);
      
      expect(mockInventory).toHaveLength(1);
      expect(mockInventory[0].count).toBe(15);
    });

    it('should emit ItemAdded event', () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      const eventSpy = vi.fn();
      eventBus.on('ItemAdded', eventSpy);
      
      inventorySystem.addItem(mockInventory, item);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ item }),
        expect.any(Object)
      );
    });

    it('should respect inventory max size', () => {
      inventorySystem.maxSize = 2;
      
      inventorySystem.addItem(mockInventory, { id: 'item1' });
      inventorySystem.addItem(mockInventory, { id: 'item2' });
      const result = inventorySystem.addItem(mockInventory, { id: 'item3' });
      
      expect(result).toBe(false);
      expect(mockInventory).toHaveLength(2);
    });

    it('should not count stackable items toward max size limit', () => {
      inventorySystem.maxSize = 2;
      
      inventorySystem.addItem(mockInventory, { id: 'arrow', stackable: true, count: 10 });
      inventorySystem.addItem(mockInventory, { id: 'sword' });
      
      // Adding more arrows should work (stacking)
      const result = inventorySystem.addItem(mockInventory, { id: 'arrow', stackable: true, count: 5 });
      
      expect(result).toBe(true);
      expect(mockInventory).toHaveLength(2);
      expect(mockInventory[0].count).toBe(15);
    });
  });

  describe('removeItem', () => {
    it('should remove non-stackable item from inventory', () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      mockInventory.push(item);
      
      const result = inventorySystem.removeItem(mockInventory, item);
      
      expect(result).toBe(true);
      expect(mockInventory).toHaveLength(0);
    });

    it('should decrease stack count for stackable items', () => {
      const item = { id: 'arrow', stackable: true, count: 10 };
      mockInventory.push(item);
      
      const result = inventorySystem.removeItem(mockInventory, item, 3);
      
      expect(result).toBe(true);
      expect(mockInventory).toHaveLength(1);
      expect(item.count).toBe(7);
    });

    it('should remove stack when count reaches zero', () => {
      const item = { id: 'arrow', stackable: true, count: 5 };
      mockInventory.push(item);
      
      const result = inventorySystem.removeItem(mockInventory, item, 5);
      
      expect(result).toBe(true);
      expect(mockInventory).toHaveLength(0);
    });

    it('should emit ItemRemoved event', () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      mockInventory.push(item);
      
      const eventSpy = vi.fn();
      eventBus.on('ItemRemoved', eventSpy);
      
      inventorySystem.removeItem(mockInventory, item);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ item, count: 1 }),
        expect.any(Object)
      );
    });

    it('should return false if item not in inventory', () => {
      const item = { id: 'sword' };
      
      const result = inventorySystem.removeItem(mockInventory, item);
      
      expect(result).toBe(false);
    });

    it('should handle items without count property', () => {
      const item = { id: 'arrow', stackable: true }; // No count
      mockInventory.push(item);
      
      const result = inventorySystem.removeItem(mockInventory, item, 1);
      
      expect(result).toBe(true);
      expect(mockInventory).toHaveLength(0);
    });
  });

  describe('findItem', () => {
    it('should find item by id', () => {
      mockInventory.push(
        { id: 'sword', name: 'Iron Sword' },
        { id: 'shield', name: 'Wooden Shield' },
        { id: 'potion', name: 'Health Potion' }
      );
      
      const item = inventorySystem.findItem(mockInventory, 'shield');
      
      expect(item).toBeDefined();
      expect(item.id).toBe('shield');
    });

    it('should find item by predicate function', () => {
      mockInventory.push(
        { id: 'sword', name: 'Iron Sword', damage: 10 },
        { id: 'sword2', name: 'Steel Sword', damage: 15 },
        { id: 'dagger', name: 'Dagger', damage: 5 }
      );
      
      const item = inventorySystem.findItem(
        mockInventory, 
        item => item.damage > 12
      );
      
      expect(item).toBeDefined();
      expect(item.id).toBe('sword2');
    });

    it('should return null if item not found', () => {
      mockInventory.push({ id: 'sword' });
      
      const item = inventorySystem.findItem(mockInventory, 'shield');
      
      expect(item).toBeNull();
    });
  });

  describe('findItems', () => {
    it('should find all items matching predicate', () => {
      mockInventory.push(
        { id: 'sword1', type: 'weapon', damage: 10 },
        { id: 'armor1', type: 'armor', defense: 5 },
        { id: 'sword2', type: 'weapon', damage: 15 },
        { id: 'potion', type: 'consumable' }
      );
      
      const weapons = inventorySystem.findItems(
        mockInventory,
        item => item.type === 'weapon'
      );
      
      expect(weapons).toHaveLength(2);
      expect(weapons[0].id).toBe('sword1');
      expect(weapons[1].id).toBe('sword2');
    });

    it('should return empty array if no matches', () => {
      mockInventory.push({ id: 'sword', type: 'weapon' });
      
      const items = inventorySystem.findItems(
        mockInventory,
        item => item.type === 'armor'
      );
      
      expect(items).toEqual([]);
    });
  });

  describe('hasItem', () => {
    it('should return true if item exists', () => {
      mockInventory.push({ id: 'sword' });
      
      expect(inventorySystem.hasItem(mockInventory, 'sword')).toBe(true);
    });

    it('should return false if item does not exist', () => {
      mockInventory.push({ id: 'sword' });
      
      expect(inventorySystem.hasItem(mockInventory, 'shield')).toBe(false);
    });

    it('should check count for stackable items', () => {
      mockInventory.push({ id: 'arrow', stackable: true, count: 10 });
      
      expect(inventorySystem.hasItem(mockInventory, 'arrow', 5)).toBe(true);
      expect(inventorySystem.hasItem(mockInventory, 'arrow', 15)).toBe(false);
    });
  });

  describe('getItemCount', () => {
    it('should return count for stackable items', () => {
      mockInventory.push({ id: 'arrow', stackable: true, count: 25 });
      
      expect(inventorySystem.getItemCount(mockInventory, 'arrow')).toBe(25);
    });

    it('should return 1 for non-stackable items', () => {
      mockInventory.push({ id: 'sword' });
      
      expect(inventorySystem.getItemCount(mockInventory, 'sword')).toBe(1);
    });

    it('should return 0 for missing items', () => {
      expect(inventorySystem.getItemCount(mockInventory, 'missing')).toBe(0);
    });

    it('should sum counts across multiple stacks', () => {
      mockInventory.push(
        { id: 'arrow', stackable: true, count: 20 },
        { id: 'arrow', stackable: true, count: 15 }
      );
      
      expect(inventorySystem.getItemCount(mockInventory, 'arrow')).toBe(35);
    });
  });

  describe('useItem', () => {
    it('should emit ItemUsed event', async () => {
      const item = { id: 'potion', name: 'Health Potion' };
      const state = { player: { hp: 50 } };
      
      const eventSpy = vi.fn();
      eventBus.on('ItemUsed', eventSpy);
      
      await inventorySystem.useItem(state, item);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ item, state }),
        expect.any(Object)
      );
    });

    it('should call item use handler if provided', async () => {
      const useHandler = vi.fn();
      const item = { 
        id: 'potion', 
        name: 'Health Potion',
        use: useHandler
      };
      const state = { player: { hp: 50 } };
      
      await inventorySystem.useItem(state, item);
      
      expect(useHandler).toHaveBeenCalledWith(state, item);
    });

    it('should return result from use handler', async () => {
      const item = { 
        id: 'potion',
        use: () => ({ success: true, message: 'Healed!' })
      };
      const state = {};
      
      const result = await inventorySystem.useItem(state, item);
      
      expect(result).toEqual({ success: true, message: 'Healed!' });
    });

    it('should return false if item has no use handler', async () => {
      const item = { id: 'sword' }; // No use handler
      const state = {};
      
      const result = await inventorySystem.useItem(state, item);
      
      expect(result).toBe(false);
    });
  });

  describe('sortInventory', () => {
    it('should sort inventory by type', () => {
      mockInventory.push(
        { id: 'potion', type: 'consumable' },
        { id: 'sword', type: 'weapon' },
        { id: 'armor', type: 'armor' },
        { id: 'herb', type: 'consumable' },
        { id: 'shield', type: 'armor' }
      );
      
      inventorySystem.sortInventory(mockInventory, 'type');
      
      expect(mockInventory[0].type).toBe('armor');
      expect(mockInventory[1].type).toBe('armor');
      expect(mockInventory[2].type).toBe('consumable');
      expect(mockInventory[3].type).toBe('consumable');
      expect(mockInventory[4].type).toBe('weapon');
    });

    it('should sort by custom comparator', () => {
      mockInventory.push(
        { id: 'sword1', damage: 10 },
        { id: 'sword2', damage: 25 },
        { id: 'sword3', damage: 15 }
      );
      
      inventorySystem.sortInventory(
        mockInventory,
        (a, b) => b.damage - a.damage // Sort by damage descending
      );
      
      expect(mockInventory[0].damage).toBe(25);
      expect(mockInventory[1].damage).toBe(15);
      expect(mockInventory[2].damage).toBe(10);
    });
  });

  describe('getInventoryWeight', () => {
    it('should calculate total weight', () => {
      mockInventory.push(
        { id: 'sword', weight: 5 },
        { id: 'armor', weight: 15 },
        { id: 'potion', weight: 0.5 }
      );
      
      const weight = inventorySystem.getInventoryWeight(mockInventory);
      
      expect(weight).toBe(20.5);
    });

    it('should multiply weight by stack count', () => {
      mockInventory.push(
        { id: 'arrow', weight: 0.1, stackable: true, count: 50 }
      );
      
      const weight = inventorySystem.getInventoryWeight(mockInventory);
      
      expect(weight).toBe(5); // 0.1 * 50
    });

    it('should use default weight of 1 if not specified', () => {
      mockInventory.push(
        { id: 'item1' },
        { id: 'item2' }
      );
      
      const weight = inventorySystem.getInventoryWeight(mockInventory);
      
      expect(weight).toBe(2);
    });
  });

  describe('isInventoryFull', () => {
    it('should return true when at max size', () => {
      inventorySystem.maxSize = 2;
      mockInventory.push({ id: 'item1' }, { id: 'item2' });
      
      expect(inventorySystem.isInventoryFull(mockInventory)).toBe(true);
    });

    it('should return false when below max size', () => {
      inventorySystem.maxSize = 5;
      mockInventory.push({ id: 'item1' }, { id: 'item2' });
      
      expect(inventorySystem.isInventoryFull(mockInventory)).toBe(false);
    });

    it('should return false when maxSize is null (unlimited)', () => {
      inventorySystem.maxSize = null;
      
      for (let i = 0; i < 100; i++) {
        mockInventory.push({ id: `item${i}` });
      }
      
      expect(inventorySystem.isInventoryFull(mockInventory)).toBe(false);
    });
  });
});