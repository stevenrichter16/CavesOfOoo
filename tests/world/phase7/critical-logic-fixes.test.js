/**
 * Tests for Critical Logic Error Fixes in Phase 7
 * Using TDD approach - write tests first, then implement fixes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { QuestManager } from '../../../src/js/world/quests/QuestManager.js';
import { QuestGenerator } from '../../../src/js/world/quests/QuestGenerator.js';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';
import { WorldPersistence } from '../../../src/js/world/persistence/WorldPersistence.js';

describe('Critical Logic Error Fixes', () => {
  let mockEventBus;
  let chunkSystem;
  let eventSystem;
  let questManager;
  let questGenerator;
  let chunk;
  
  beforeEach(() => {
    mockEventBus = { 
      emit: vi.fn(), 
      on: vi.fn(), 
      off: vi.fn() 
    };
    chunk = new Chunk(0, 0);
  });
  
  describe('Fix 1: Passability Checks for Item/Objective Placement', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      questGenerator = new QuestGenerator(chunkSystem);
      questManager = new QuestManager(questGenerator, mockEventBus);
    });
    
    it('should only place event items on passable tiles', async () => {
      // Create chunk with only one passable tile
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#'); // Wall
        }
      }
      chunk.setTile(10, 10, '.'); // One passable tile
      
      // Apply event that spawns items
      const event = {
        id: 'test_event',
        effects: {
          spawnItems: ['candy', 'gold', 'potion']
        }
      };
      
      await eventSystem.applyEventToChunk(event, chunk);
      
      // All items should be at the only passable position
      expect(chunk.items).toHaveLength(3);
      chunk.items.forEach(item => {
        expect(item.x).toBe(10);
        expect(item.y).toBe(10);
      });
    });
    
    it('should not place items if no passable tiles available', async () => {
      // Fill entire chunk with walls
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      const event = {
        id: 'test_event',
        effects: {
          spawnItems: ['candy']
        }
      };
      
      await eventSystem.applyEventToChunk(event, chunk);
      
      // No items should be placed
      expect(chunk.items).toHaveLength(0);
    });
    
    it('should place quest objectives only on passable tiles', async () => {
      // Create chunk with limited passable tiles
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      // Create a 3x3 passable area
      for (let y = 5; y <= 7; y++) {
        for (let x = 5; x <= 7; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const quest = {
        id: 'quest_1',
        objectives: [{
          type: 'collect',
          target: 'candy',
          count: 5
        }]
      };
      
      await questManager.applyQuestToChunk(quest, chunk);
      
      // All items should be in passable area
      expect(chunk.items).toHaveLength(5);
      chunk.items.forEach(item => {
        expect(item.x).toBeGreaterThanOrEqual(5);
        expect(item.x).toBeLessThanOrEqual(7);
        expect(item.y).toBeGreaterThanOrEqual(5);
        expect(item.y).toBeLessThanOrEqual(7);
        
        // Verify tile is actually passable
        const tile = chunk.getTile(item.x, item.y);
        expect(tile).toBe('.');
      });
    });
    
    it('should distribute items across multiple passable tiles', async () => {
      // Create chunk with scattered passable tiles
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      // Add 10 passable tiles
      const passableTiles = [
        {x: 1, y: 1}, {x: 5, y: 5}, {x: 10, y: 10},
        {x: 15, y: 15}, {x: 20, y: 20}, {x: 3, y: 7},
        {x: 8, y: 2}, {x: 12, y: 18}, {x: 18, y: 8},
        {x: 22, y: 12}
      ];
      passableTiles.forEach(({x, y}) => chunk.setTile(x, y, '.'));
      
      const quest = {
        id: 'quest_2',
        objectives: [{
          type: 'collect',
          target: 'gems',
          count: 20
        }]
      };
      
      await questManager.applyQuestToChunk(quest, chunk);
      
      // Items should be distributed (though some tiles may have multiple)
      const positions = new Set();
      chunk.items.forEach(item => {
        positions.add(`${item.x},${item.y}`);
        // Verify each is on a passable tile
        const isOnPassable = passableTiles.some(
          tile => tile.x === item.x && tile.y === item.y
        );
        expect(isOnPassable).toBe(true);
      });
      
      // Should use multiple tiles if available
      expect(positions.size).toBeGreaterThan(1);
    });
  });
  
  describe('Fix 2: Event Reapplication After Chunk Reload', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should reapply events when chunk is reloaded', async () => {
      // Create and cache a chunk
      chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Apply an event
      const event = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      event.effects = {
        tileChanges: { '.': '·' },
        spawnItems: ['candy']
      };
      await eventSystem.applyEventToChunk(event, chunk);
      eventSystem.startEvent(event);
      
      // Count modified tiles
      let modifiedCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) === '·') modifiedCount++;
        }
      }
      const originalItemCount = chunk.items.length;
      
      // Simulate cache eviction
      eventSystem.handleChunkEviction({ cx: 0, cy: 0 });
      
      // Create new chunk (simulating reload)
      const reloadedChunk = new Chunk(0, 0);
      
      // Reapply events marked for reapplication
      const events = eventSystem.getActiveEventsAt(0, 0);
      for (const evt of events) {
        if (evt.needsReapplication) {
          await eventSystem.reapplyEventToChunk(evt, reloadedChunk);
        }
      }
      
      // Verify event effects were reapplied
      let reloadedModifiedCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (reloadedChunk.getTile(x, y) === '·') reloadedModifiedCount++;
        }
      }
      
      expect(reloadedModifiedCount).toBe(modifiedCount);
      expect(reloadedChunk.items.length).toBe(originalItemCount);
    });
    
    it('should clear needsReapplication flag after reapplying', async () => {
      const event = await eventSystem.generateBiomeEvent('ice_kingdom', 1, 1);
      eventSystem.startEvent(event);
      
      // Mark for reapplication
      eventSystem.handleChunkEviction({ cx: 1, cy: 1 });
      
      const events = eventSystem.getActiveEventsAt(1, 1);
      expect(events[0].needsReapplication).toBe(true);
      
      // Reapply
      const newChunk = new Chunk(1, 1);
      await eventSystem.reapplyEventToChunk(events[0], newChunk);
      
      // Flag should be cleared
      expect(events[0].needsReapplication).toBe(false);
    });
    
    it('should handle multiple events needing reapplication', async () => {
      // Start multiple events at same location
      const event1 = await eventSystem.generateBiomeEvent('candy_kingdom', 2, 2);
      const event2 = await eventSystem.generateBiomeEvent('candy_kingdom', 2, 2);
      event1.effects = { spawnItems: ['candy'] };
      event2.effects = { spawnItems: ['gold'] };
      
      eventSystem.startEvent(event1);
      eventSystem.startEvent(event2);
      
      // Mark for reapplication
      eventSystem.handleChunkEviction({ cx: 2, cy: 2 });
      
      // Reload and reapply
      const newChunk = new Chunk(2, 2);
      const events = eventSystem.getActiveEventsAt(2, 2);
      
      for (const event of events) {
        if (event.needsReapplication) {
          await eventSystem.reapplyEventToChunk(event, newChunk);
        }
      }
      
      // Both events should have been reapplied
      const itemTypes = newChunk.items.map(item => item.type);
      expect(itemTypes).toContain('candy');
      expect(itemTypes).toContain('gold');
    });
  });
  
  describe('Fix 3: Diagonal Chunk Transitions', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
    });
    
    it('should handle diagonal transition from top-left corner', () => {
      const transition = chunkSystem.getChunkTransition(0, 0, -1, -1);
      
      expect(transition.shouldTransition).toBe(true);
      expect(transition.toCx).toBe(-1);
      expect(transition.toCy).toBe(-1);
      expect(transition.finalX).toBe(23); // CHUNK_WIDTH - 1
      expect(transition.finalY).toBe(21); // CHUNK_HEIGHT - 1
    });
    
    it('should handle diagonal transition from bottom-right corner', () => {
      const transition = chunkSystem.getChunkTransition(23, 21, 1, 1);
      
      expect(transition.shouldTransition).toBe(true);
      expect(transition.toCx).toBe(1);
      expect(transition.toCy).toBe(1);
      expect(transition.finalX).toBe(0);
      expect(transition.finalY).toBe(0);
    });
    
    it('should handle diagonal transition from top-right corner', () => {
      const transition = chunkSystem.getChunkTransition(23, 0, 1, -1);
      
      expect(transition.shouldTransition).toBe(true);
      expect(transition.toCx).toBe(1);
      expect(transition.toCy).toBe(-1);
      expect(transition.finalX).toBe(0);
      expect(transition.finalY).toBe(21);
    });
    
    it('should handle diagonal transition from bottom-left corner', () => {
      const transition = chunkSystem.getChunkTransition(0, 21, -1, 1);
      
      expect(transition.shouldTransition).toBe(true);
      expect(transition.toCx).toBe(-1);
      expect(transition.toCy).toBe(1);
      expect(transition.finalX).toBe(23);
      expect(transition.finalY).toBe(0);
    });
    
    it('should not transition when moving diagonally within bounds', () => {
      const transition = chunkSystem.getChunkTransition(10, 10, 1, 1);
      
      expect(transition.shouldTransition).toBe(false);
      expect(transition.finalX).toBe(11);
      expect(transition.finalY).toBe(11);
    });
  });
  
  describe('Fix 4: Event History Pruning', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should limit event history size', async () => {
      // Set max history size (we'll check for this in implementation)
      eventSystem.maxHistorySize = 100;
      
      // Create many events that expire immediately
      for (let i = 0; i < 150; i++) {
        const event = {
          id: `event_${i}`,
          type: 'test',
          duration: 0, // Expires immediately
          cx: 0,
          cy: 0
        };
        eventSystem.startEvent(event);
        eventSystem.tick(1); // Process expiration
      }
      
      // History should be pruned to max size
      expect(eventSystem.eventHistory.length).toBeLessThanOrEqual(100);
      
      // Should keep the most recent events
      const lastEvent = eventSystem.eventHistory[eventSystem.eventHistory.length - 1];
      expect(lastEvent.id).toContain('149'); // Most recent
    });
    
    it('should maintain sliding window of history', async () => {
      eventSystem.maxHistorySize = 50;
      
      // Add 50 events
      for (let i = 0; i < 50; i++) {
        const event = {
          id: `event_${i}`,
          duration: 0
        };
        eventSystem.startEvent(event);
        eventSystem.tick(1);
      }
      
      expect(eventSystem.eventHistory.length).toBe(50);
      
      // Add 10 more
      for (let i = 50; i < 60; i++) {
        const event = {
          id: `event_${i}`,
          duration: 0
        };
        eventSystem.startEvent(event);
        eventSystem.tick(1);
      }
      
      // Should still be 50
      expect(eventSystem.eventHistory.length).toBe(50);
      
      // First event should now be event_10
      expect(eventSystem.eventHistory[0].id).toBe('event_10');
      expect(eventSystem.eventHistory[49].id).toBe('event_59');
    });
  });
  
  describe('Fix 5: Chain Events Spatial Index', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should add chain events to spatial index', () => {
      const parentEvent = {
        id: 'parent_event',
        cx: 5,
        cy: 5,
        chainEvents: ['chain_1', 'chain_2']
      };
      
      eventSystem.startEvent(parentEvent);
      
      // Get events at the parent location
      const eventsAtLocation = eventSystem.getActiveEventsAt(5, 5);
      
      // Should find parent and chain events
      expect(eventsAtLocation.length).toBe(3);
      
      const eventTypes = eventsAtLocation.map(e => e.type || e.id);
      expect(eventTypes).toContain('parent_event');
      expect(eventTypes).toContain('chain_1');
      expect(eventTypes).toContain('chain_2');
    });
    
    it('should inherit location from parent event', () => {
      const parentEvent = {
        id: 'parent',
        cx: 10,
        cy: 15,
        chainEvents: ['child_event']
      };
      
      eventSystem.startEvent(parentEvent);
      
      // Chain event should be at parent location
      const events = eventSystem.getActiveEventsAt(10, 15);
      const chainEvent = events.find(e => e.type === 'child_event');
      
      expect(chainEvent).toBeDefined();
      expect(chainEvent.cx).toBe(10);
      expect(chainEvent.cy).toBe(15);
    });
  });
  
  describe('Fix 6: Array Bounds Checking', () => {
    let persistence;
    
    beforeEach(() => {
      chunkSystem = new ChunkSystem(mockEventBus);
      persistence = new WorldPersistence(chunkSystem);
    });
    
    it('should handle negative version numbers safely', async () => {
      const chunk = new Chunk(0, 0);
      chunk.version = -1;
      
      const result = await persistence.saveChunk(chunk);
      expect(result.success).toBe(true);
      
      // Should not crash or create invalid array
      const loaded = await persistence.loadChunkVersion(0, 0, -1);
      expect(loaded).toBeDefined();
    });
    
    it('should handle very large version numbers safely', async () => {
      const chunk = new Chunk(0, 0);
      chunk.version = 999999;
      
      const result = await persistence.saveChunk(chunk);
      expect(result.success).toBe(true);
      
      // Should handle gracefully
      const loaded = await persistence.loadChunkVersion(0, 0, 999999);
      expect(loaded).toBeDefined();
    });
    
    it('should limit version array size', async () => {
      persistence.maxVersions = 10;
      
      // Try to save many versions
      for (let i = 1; i <= 20; i++) {
        const chunk = new Chunk(0, 0);
        chunk.version = i;
        await persistence.saveChunk(chunk);
      }
      
      // Should only keep last 10 versions
      const versions = persistence.getVersionCount(0, 0);
      expect(versions).toBeLessThanOrEqual(10);
    });
  });
  
  describe('Fix 7: Quest Progress Validation', () => {
    beforeEach(() => {
      questGenerator = new QuestGenerator();
      questManager = new QuestManager(questGenerator, mockEventBus);
    });
    
    it('should not allow negative progress', () => {
      const quest = {
        id: 'quest_1',
        objectives: [{
          id: 'obj_1',
          type: 'collect',
          count: 5,
          progress: 3
        }]
      };
      
      questManager.addQuest(quest);
      questManager.updateObjective('quest_1', 'obj_1', { progress: -10 });
      
      const updatedQuest = questManager.getQuest('quest_1');
      expect(updatedQuest.objectives[0].progress).toBe(0);
    });
    
    it('should not allow progress to exceed count', () => {
      const quest = {
        id: 'quest_2',
        objectives: [{
          id: 'obj_1',
          type: 'defeat',
          count: 10,
          progress: 5
        }]
      };
      
      questManager.addQuest(quest);
      questManager.updateObjective('quest_2', 'obj_1', { progress: 20 });
      
      const updatedQuest = questManager.getQuest('quest_2');
      expect(updatedQuest.objectives[0].progress).toBe(10);
    });
    
    it('should handle objectives without count limit', () => {
      const quest = {
        id: 'quest_3',
        objectives: [{
          id: 'obj_1',
          type: 'explore',
          progress: 0
        }]
      };
      
      questManager.addQuest(quest);
      questManager.updateObjective('quest_3', 'obj_1', { progress: 9999 });
      
      const updatedQuest = questManager.getQuest('quest_3');
      expect(updatedQuest.objectives[0].progress).toBe(9999); // No limit
    });
  });
  
  describe('Fix 8: Event System Cleanup', () => {
    beforeEach(async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should have destroy method that removes listeners', () => {
      expect(eventSystem.destroy).toBeDefined();
      expect(typeof eventSystem.destroy).toBe('function');
      
      // Should not throw
      expect(() => eventSystem.destroy()).not.toThrow();
    });
    
    it('should remove cache eviction listener on destroy', () => {
      const offSpy = vi.spyOn(chunkSystem.cache, 'off');
      
      eventSystem.destroy();
      
      expect(offSpy).toHaveBeenCalledWith('evicted', expect.any(Function));
    });
    
    it('should clear spatial index on destroy', () => {
      // Add some events
      eventSystem.startEvent({ id: 'test', cx: 0, cy: 0 });
      expect(eventSystem.spatialIndex.size).toBeGreaterThan(0);
      
      eventSystem.destroy();
      
      expect(eventSystem.spatialIndex.size).toBe(0);
    });
    
    it('should clear active events on destroy', () => {
      eventSystem.startEvent({ id: 'test1' });
      eventSystem.startEvent({ id: 'test2' });
      expect(eventSystem.activeEvents.length).toBe(2);
      
      eventSystem.destroy();
      
      expect(eventSystem.activeEvents.length).toBe(0);
    });
  });
});