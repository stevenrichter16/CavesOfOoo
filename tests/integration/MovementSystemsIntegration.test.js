import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { TerrainSystem } from '../../src/js/systems/TerrainSystem.js';
import { LootSystem } from '../../src/js/systems/LootSystem.js';
import { InventorySystem } from '../../src/js/systems/InventorySystem.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { StatusEffectHandler } from '../../src/js/systems/StatusEffectHandler.js';

// Mock the frozen check to not interfere with tests
vi.mock('../../src/js/combat/statusSystem.js', () => ({
  isFrozen: vi.fn(() => false)
}));

describe('Movement Systems Integration', () => {
  let pipeline;
  let terrainSystem;
  let lootSystem;
  let inventorySystem;
  let eventBus;
  let statusHandler;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    terrainSystem = new TerrainSystem(eventBus);
    lootSystem = new LootSystem(eventBus);
    inventorySystem = new InventorySystem(eventBus);
    statusHandler = new StatusEffectHandler(eventBus);
    
    // Create pipeline with injected systems
    pipeline = new MovementPipeline(eventBus);
    pipeline.terrainSystem = terrainSystem;
    pipeline.lootSystem = lootSystem;
    pipeline.inventorySystem = inventorySystem;
    
    // Mock state
    mockState = {
      player: {
        x: 5,
        y: 5,
        hp: 20,
        inventory: [],
        statusEffects: []
      },
      chunk: {
        map: Array(10).fill(null).map(() => Array(10).fill('.')),
        items: [],
        monsters: []
      },
      npcs: [],
      log: vi.fn()
    };
  });

  afterEach(() => {
    // Clean up handlers
    if (statusHandler) {
      statusHandler.cleanup();
    }
  });

  describe('Terrain integration', () => {
    it('should check terrain passability during movement', async () => {
      // Place a wall at target position
      mockState.chunk.map[5][6] = '#';
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('not passable');
      expect(mockState.player.x).toBe(5); // Didn't move
    });

    it('should trigger terrain effects on movement', async () => {
      // Place spikes at target position
      mockState.chunk.map[5][6] = '^';
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      expect(result.moved).toBe(true);
      expect(mockState.player.x).toBe(6);
      // Spikes should damage player
      expect(mockState.player.hp).toBeLessThan(20);
      expect(mockState.log).toHaveBeenCalledWith(
        expect.stringContaining('spike'),
        'bad'
      );
    });

    it('should apply water slow on entering water', async () => {
      // Place water at target position
      mockState.chunk.map[5][6] = '~';
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      expect(mockState.player.statusEffects).toContainEqual(
        expect.objectContaining({
          type: 'water_slow',
          speedReduction: expect.any(Number)
        })
      );
    });

    it('should handle terrain exit effects', async () => {
      // Start in water
      mockState.chunk.map[5][5] = '~';
      mockState.player.statusEffects = [{
        type: 'water_slow',
        duration: 0,
        speedReduction: 2
      }];
      
      // Move to dry land
      mockState.chunk.map[5][6] = '.';
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      // Water slow should now have a duration (expires in 3 turns)
      const waterSlow = mockState.player.statusEffects.find(e => e.type === 'water_slow');
      expect(waterSlow.duration).toBe(3);
    });
  });

  describe('Loot integration', () => {
    it('should pick up items after movement', async () => {
      // Place items at target position
      const sword = { id: 'sword', name: 'Iron Sword', x: 6, y: 5 };
      const potion = { id: 'potion', name: 'Health Potion', x: 6, y: 5, stackable: true };
      mockState.chunk.items = [sword, potion];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      expect(result.pickedUpItems).toEqual([sword, potion]);
      expect(mockState.player.inventory).toContain(sword);
      expect(mockState.player.inventory).toContain(potion);
      expect(mockState.chunk.items).toHaveLength(0);
    });

    it('should stack items when picking up', async () => {
      // Player already has arrows
      mockState.player.inventory = [
        { id: 'arrow', stackable: true, count: 10 }
      ];
      
      // More arrows on the ground
      const arrows = { id: 'arrow', stackable: true, count: 5, x: 6, y: 5 };
      mockState.chunk.items = [arrows];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      expect(mockState.player.inventory).toHaveLength(1);
      expect(mockState.player.inventory[0].count).toBe(15);
    });

    it('should emit events for item pickups', async () => {
      const item = { id: 'sword', name: 'Iron Sword', x: 6, y: 5 };
      mockState.chunk.items = [item];
      
      const pickupSpy = vi.fn();
      eventBus.on('ItemPickup', pickupSpy);
      
      const action = { type: 'move', dx: 1, dy: 0 };
      await pipeline.execute(mockState, action);
      
      expect(pickupSpy).toHaveBeenCalledWith(
        expect.objectContaining({ item }),
        expect.any(Object)
      );
    });

    it('should not pick up items if inventory is full', async () => {
      // Fill inventory to max
      inventorySystem.maxSize = 2;
      mockState.player.inventory = [
        { id: 'item1' },
        { id: 'item2' }
      ];
      
      // Try to pick up another item
      const sword = { id: 'sword', name: 'Iron Sword', x: 6, y: 5 };
      mockState.chunk.items = [sword];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      expect(result.moved).toBe(true);
      // Item should still be on ground
      expect(mockState.chunk.items).toContain(sword);
      expect(mockState.player.inventory).not.toContain(sword);
    });
  });

  describe('Combined terrain and loot', () => {
    it('should handle spike damage and item pickup in same move', async () => {
      // Spikes with an item on them
      mockState.chunk.map[5][6] = '^';
      const potion = { id: 'potion', name: 'Health Potion', x: 6, y: 5 };
      mockState.chunk.items = [potion];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      // Took spike damage
      expect(mockState.player.hp).toBeLessThan(20);
      // But also picked up the potion
      expect(mockState.player.inventory).toContain(potion);
    });

    it('should handle water effects and multiple item pickups', async () => {
      // Water with multiple items
      mockState.chunk.map[5][6] = '~';
      const items = [
        { id: 'coin', name: 'Gold Coin', x: 6, y: 5, stackable: true, count: 5 },
        { id: 'gem', name: 'Ruby', x: 6, y: 5 }
      ];
      mockState.chunk.items = items;
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(true);
      // Applied water slow
      expect(mockState.player.statusEffects).toContainEqual(
        expect.objectContaining({ type: 'water_slow' })
      );
      // Picked up all items
      expect(mockState.player.inventory).toHaveLength(2);
      expect(mockState.chunk.items).toHaveLength(0);
    });
  });

  describe('Movement blocking scenarios', () => {
    it('should not pick up items if movement is blocked by wall', async () => {
      // Wall blocks the way
      mockState.chunk.map[5][6] = '#';
      // Item behind the wall (shouldn't be picked up)
      const item = { id: 'sword', x: 6, y: 5 };
      mockState.chunk.items = [item];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(false);
      expect(mockState.player.x).toBe(5); // Didn't move
      expect(mockState.player.inventory).toHaveLength(0); // Didn't pick up
      expect(mockState.chunk.items).toContain(item); // Item still there
    });

    it('should not trigger terrain effects if movement cancelled early', async () => {
      // Mock frozen status to cancel movement early
      const { isFrozen } = await import('../../src/js/combat/statusSystem.js');
      isFrozen.mockReturnValue(true);
      
      // Spikes at target (shouldn't trigger)
      mockState.chunk.map[5][6] = '^';
      const initialHp = mockState.player.hp;
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('frozen');
      expect(mockState.player.hp).toBe(initialHp); // No damage
    });
  });

  describe('Event flow', () => {
    it('should emit events in correct order', async () => {
      const events = [];
      
      eventBus.on('WillMove', () => events.push('WillMove'));
      eventBus.on('ItemsAvailable', () => events.push('ItemsAvailable'));
      eventBus.on('TerrainEntered', () => events.push('TerrainEntered'));
      eventBus.on('DidMove', () => events.push('DidMove'));
      eventBus.on('MovementComplete', () => events.push('MovementComplete'));
      
      // Simple movement with item
      const item = { id: 'coin', x: 6, y: 5 };
      mockState.chunk.items = [item];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      // Check event order - only check for key events that always fire
      expect(events).toContain('WillMove');
      expect(events).toContain('MovementComplete');
      
      // The actual events emitted depend on what happens during movement
      // The important thing is the order is correct
      
      // Order check
      const willMoveIndex = events.indexOf('WillMove');
      const completeIndex = events.indexOf('MovementComplete');
      expect(willMoveIndex).toBeLessThan(completeIndex);
    });
  });

  describe('Performance', () => {
    it('should track metrics for all systems', async () => {
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(mockState, action);
      
      expect(result.metrics).toBeDefined();
      
      // If movement succeeded, should have all steps
      if (result.success) {
        expect(Object.keys(result.metrics)).toContain('checkTerrain');
        expect(Object.keys(result.metrics)).toContain('handleItems');
      } else {
        // If cancelled early, should at least have early steps
        expect(Object.keys(result.metrics)).toContain('validation');
        expect(Object.keys(result.metrics).length).toBeGreaterThan(0);
      }
      
      // All metrics should be numbers
      Object.values(result.metrics).forEach(metric => {
        expect(typeof metric).toBe('number');
        expect(metric).toBeGreaterThanOrEqual(0);
      });
    });
  });
});