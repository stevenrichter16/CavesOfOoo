import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LootSystem } from '../../src/js/systems/LootSystem.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('LootSystem', () => {
  let lootSystem;
  let eventBus;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    lootSystem = new LootSystem(eventBus);
    
    mockState = {
      player: {
        inventory: [],
        x: 5,
        y: 5
      },
      chunk: {
        items: []
      },
      log: vi.fn()
    };
  });

  describe('Initialization', () => {
    it('should create a LootSystem instance', () => {
      expect(lootSystem).toBeInstanceOf(LootSystem);
      expect(lootSystem.eventBus).toBe(eventBus);
    });

    it('should work without eventBus', () => {
      const systemWithoutBus = new LootSystem();
      expect(systemWithoutBus).toBeInstanceOf(LootSystem);
      expect(systemWithoutBus.eventBus).toBeDefined();
    });
  });

  describe('checkForItems', () => {
    it('should find items at specified position', async () => {
      const item1 = { id: 'sword', name: 'Iron Sword', x: 5, y: 5 };
      const item2 = { id: 'potion', name: 'Health Potion', x: 5, y: 5 };
      const item3 = { id: 'gold', name: 'Gold', x: 6, y: 5 }; // Different position
      
      mockState.chunk.items = [item1, item2, item3];
      
      const pickupSpy = vi.spyOn(lootSystem, 'pickupItem');
      
      await lootSystem.checkForItems(mockState, 5, 5);
      
      expect(pickupSpy).toHaveBeenCalledTimes(2);
      expect(pickupSpy).toHaveBeenCalledWith(mockState, item1);
      expect(pickupSpy).toHaveBeenCalledWith(mockState, item2);
      expect(pickupSpy).not.toHaveBeenCalledWith(mockState, item3);
    });

    it('should return found items', async () => {
      const item1 = { id: 'sword', name: 'Iron Sword', x: 5, y: 5 };
      const item2 = { id: 'potion', name: 'Health Potion', x: 5, y: 5 };
      
      mockState.chunk.items = [item1, item2];
      
      const result = await lootSystem.checkForItems(mockState, 5, 5);
      
      expect(result).toEqual([item1, item2]);
    });

    it('should return empty array when no items found', async () => {
      mockState.chunk.items = [
        { id: 'sword', name: 'Iron Sword', x: 6, y: 6 }
      ];
      
      const result = await lootSystem.checkForItems(mockState, 5, 5);
      
      expect(result).toEqual([]);
    });

    it('should handle missing chunk/items gracefully', async () => {
      const result1 = await lootSystem.checkForItems({}, 5, 5);
      expect(result1).toEqual([]);
      
      const result2 = await lootSystem.checkForItems({ chunk: {} }, 5, 5);
      expect(result2).toEqual([]);
    });
  });

  describe('pickupItem', () => {
    it('should add non-stackable item to inventory', async () => {
      const item = { id: 'sword', name: 'Iron Sword', stackable: false };
      
      await lootSystem.pickupItem(mockState, item);
      
      expect(mockState.player.inventory).toHaveLength(1);
      expect(mockState.player.inventory[0]).toBe(item);
    });

    it('should stack stackable items with same id', async () => {
      const existingPotion = { 
        id: 'health_potion', 
        name: 'Health Potion', 
        stackable: true,
        count: 3
      };
      mockState.player.inventory = [existingPotion];
      
      const newPotion = { 
        id: 'health_potion', 
        name: 'Health Potion', 
        stackable: true,
        count: 2
      };
      
      await lootSystem.pickupItem(mockState, newPotion);
      
      expect(mockState.player.inventory).toHaveLength(1);
      expect(mockState.player.inventory[0].count).toBe(5); // 3 + 2
    });

    it('should handle items without count property', async () => {
      const existingPotion = { 
        id: 'health_potion', 
        stackable: true
      };
      mockState.player.inventory = [existingPotion];
      
      const newPotion = { 
        id: 'health_potion', 
        stackable: true
      };
      
      await lootSystem.pickupItem(mockState, newPotion);
      
      expect(mockState.player.inventory).toHaveLength(1);
      expect(mockState.player.inventory[0].count).toBe(2); // 1 + 1 (default)
    });

    it('should not stack items with different ids', async () => {
      const potion1 = { 
        id: 'health_potion', 
        stackable: true,
        count: 1
      };
      mockState.player.inventory = [potion1];
      
      const potion2 = { 
        id: 'mana_potion', 
        stackable: true,
        count: 1
      };
      
      await lootSystem.pickupItem(mockState, potion2);
      
      expect(mockState.player.inventory).toHaveLength(2);
    });

    it('should emit ItemPickup event', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      const eventSpy = vi.fn();
      eventBus.on('ItemPickup', eventSpy);
      
      await lootSystem.pickupItem(mockState, item);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ item, player: mockState.player }),
        expect.any(Object)
      );
    });

    it('should remove item from world', async () => {
      const item = { id: 'sword', name: 'Iron Sword', x: 5, y: 5 };
      mockState.chunk.items = [item, { id: 'other', x: 6, y: 6 }];
      
      await lootSystem.pickupItem(mockState, item);
      
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.items[0].id).toBe('other');
    });

    it('should log pickup message', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      
      await lootSystem.pickupItem(mockState, item);
      
      expect(mockState.log).toHaveBeenCalledWith(
        'You pick up Iron Sword.',
        'good'
      );
    });

    it('should respect max stack size if specified', async () => {
      lootSystem.maxStackSize = 99;
      
      const existingItem = { 
        id: 'arrow', 
        stackable: true,
        count: 95
      };
      mockState.player.inventory = [existingItem];
      
      const newItem = { 
        id: 'arrow', 
        stackable: true,
        count: 10
      };
      
      await lootSystem.pickupItem(mockState, newItem);
      
      // Should create new stack since 95 + 10 > 99
      expect(mockState.player.inventory).toHaveLength(2);
      expect(mockState.player.inventory[0].count).toBe(99);
      expect(mockState.player.inventory[1].count).toBe(6); // Overflow
    });
  });

  describe('stackItem', () => {
    it('should stack items with same id', () => {
      const inventory = [
        { id: 'arrow', stackable: true, count: 10 }
      ];
      
      const newItem = { id: 'arrow', stackable: true, count: 5 };
      
      lootSystem.stackItem(inventory, newItem);
      
      expect(inventory).toHaveLength(1);
      expect(inventory[0].count).toBe(15);
    });

    it('should add new stack for different items', () => {
      const inventory = [
        { id: 'arrow', stackable: true, count: 10 }
      ];
      
      const newItem = { id: 'bolt', stackable: true, count: 5 };
      
      lootSystem.stackItem(inventory, newItem);
      
      expect(inventory).toHaveLength(2);
      expect(inventory[1]).toBe(newItem);
    });

    it('should handle non-stackable items', () => {
      const inventory = [];
      
      const item1 = { id: 'sword', stackable: false };
      const item2 = { id: 'sword', stackable: false };
      
      lootSystem.stackItem(inventory, item1);
      lootSystem.stackItem(inventory, item2);
      
      expect(inventory).toHaveLength(2); // Not stacked
    });
  });

  describe('dropItem', () => {
    it('should remove item from inventory and add to world', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      mockState.player.inventory = [item];
      
      await lootSystem.dropItem(mockState, item, 7, 8);
      
      expect(mockState.player.inventory).toHaveLength(0);
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.items[0]).toMatchObject({
        ...item,
        x: 7,
        y: 8
      });
    });

    it('should drop at player position if coordinates not provided', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      mockState.player.inventory = [item];
      mockState.player.x = 10;
      mockState.player.y = 15;
      
      await lootSystem.dropItem(mockState, item);
      
      expect(mockState.chunk.items[0]).toMatchObject({
        x: 10,
        y: 15
      });
    });

    it('should decrease stack count instead of removing if count > 1', async () => {
      const item = { id: 'arrow', stackable: true, count: 10 };
      mockState.player.inventory = [item];
      
      await lootSystem.dropItem(mockState, item, 5, 5, 3);
      
      expect(mockState.player.inventory).toHaveLength(1);
      expect(mockState.player.inventory[0].count).toBe(7);
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.items[0].count).toBe(3);
    });

    it('should emit ItemDropped event', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      mockState.player.inventory = [item];
      
      const eventSpy = vi.fn();
      eventBus.on('ItemDropped', eventSpy);
      
      await lootSystem.dropItem(mockState, item, 5, 5);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ 
          item: expect.any(Object),
          position: { x: 5, y: 5 }
        }),
        expect.any(Object)
      );
    });

    it('should log drop message', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      mockState.player.inventory = [item];
      
      await lootSystem.dropItem(mockState, item);
      
      expect(mockState.log).toHaveBeenCalledWith(
        'You drop Iron Sword.',
        'note'
      );
    });

    it('should return false if item not in inventory', async () => {
      const item = { id: 'sword', name: 'Iron Sword' };
      
      const result = await lootSystem.dropItem(mockState, item);
      
      expect(result).toBe(false);
      expect(mockState.chunk.items).toHaveLength(0);
    });
  });

  describe('getItemsAt', () => {
    it('should return items at specified position', () => {
      mockState.chunk.items = [
        { id: 'sword', x: 5, y: 5 },
        { id: 'potion', x: 5, y: 5 },
        { id: 'gold', x: 6, y: 6 }
      ];
      
      const items = lootSystem.getItemsAt(mockState, 5, 5);
      
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('sword');
      expect(items[1].id).toBe('potion');
    });

    it('should return empty array if no items', () => {
      const items = lootSystem.getItemsAt(mockState, 5, 5);
      expect(items).toEqual([]);
    });

    it('should handle missing chunk/items', () => {
      const items1 = lootSystem.getItemsAt({}, 5, 5);
      expect(items1).toEqual([]);
      
      const items2 = lootSystem.getItemsAt({ chunk: {} }, 5, 5);
      expect(items2).toEqual([]);
    });
  });
});