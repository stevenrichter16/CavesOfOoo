/**
 * Phase 7: Dynamic World Events
 * Test-Driven Development for Adventure Time world events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { BiomeEventGenerator } from '../../../src/js/world/events/BiomeEventGenerator.js';
import { EventTypes, EventPriority } from '../../../src/js/world/events/constants.js';

describe('Phase 7: Dynamic World Events', () => {
  let mockEventBus;
  let chunkSystem;
  let eventSystem;
  
  beforeEach(() => {
    mockEventBus = { 
      emit: vi.fn(), 
      on: vi.fn(), 
      off: vi.fn(),
      once: vi.fn()
    };
  });
  
  describe('Dynamic Event System Core', () => {
    it('should initialize event system with chunk system', async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      expect(eventSystem).toBeDefined();
      expect(eventSystem.chunkSystem).toBe(chunkSystem);
      expect(eventSystem.activeEvents).toEqual([]);
    });
    
    it('should generate biome-specific events', async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Generate event for Candy Kingdom
      const candyEvent = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      
      expect(candyEvent).toBeDefined();
      expect(candyEvent.biome).toBe('candy_kingdom');
      expect(candyEvent.type).toMatch(/candy_rain|sugar_storm|gumball_invasion/);
      expect(candyEvent.cx).toBe(0);
      expect(candyEvent.cy).toBe(0);
    });
    
    it('should track active events with duration', async () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
      
      const event = {
        id: 'event_1',
        type: 'candy_rain',
        duration: 100, // ticks
        startTick: 0,
        cx: 0,
        cy: 0
      };
      
      eventSystem.startEvent(event);
      expect(eventSystem.activeEvents).toContain(event);
      
      // Advance time
      eventSystem.tick(50);
      expect(eventSystem.activeEvents).toContain(event);
      
      // Event should expire
      eventSystem.tick(101);
      expect(eventSystem.activeEvents).not.toContain(event);
    });
    
    it('should emit events to event bus', async () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
      
      const event = {
        id: 'event_2',
        type: 'ice_storm',
        cx: -50,
        cy: 50
      };
      
      eventSystem.startEvent(event);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('WorldEventStarted', {
        event: event
      });
    });
  });
  
  describe('Biome-Specific Events', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus, {
        useAdventureTimeBiomes: true
      });
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should generate Candy Kingdom events', () => {
      const generator = new BiomeEventGenerator('candy_kingdom');
      const events = generator.getPossibleEvents();
      
      expect(events).toContain('candy_rain');
      expect(events).toContain('sugar_storm');
      expect(events).toContain('princess_parade');
      expect(events).toContain('banana_guard_drill');
    });
    
    it('should generate Ice Kingdom events', () => {
      const generator = new BiomeEventGenerator('ice_kingdom');
      const events = generator.getPossibleEvents();
      
      expect(events).toContain('ice_storm');
      expect(events).toContain('penguin_migration');
      expect(events).toContain('aurora_borealis');
      expect(events).toContain('ice_king_tantrum');
    });
    
    it('should generate Fire Kingdom events', () => {
      const generator = new BiomeEventGenerator('fire_kingdom');
      const events = generator.getPossibleEvents();
      
      expect(events).toContain('lava_eruption');
      expect(events).toContain('flame_dance');
      expect(events).toContain('heat_wave');
      expect(events).toContain('flambit_swarm');
    });
    
    it('should handle event rarity and probability', () => {
      const generator = new BiomeEventGenerator('candy_kingdom');
      
      // Common events should be more likely
      const commonEvent = generator.generateEvent({ rarity: 'common' });
      expect(commonEvent.rarity).toBe('common');
      
      // Rare events should have special properties
      const rareEvent = generator.generateEvent({ rarity: 'rare' });
      if (rareEvent.rarity === 'rare') {
        expect(rareEvent.rewards).toBeDefined();
        expect(rareEvent.difficulty).toBeGreaterThan(5);
      }
    });
  });
  
  describe('Event Effects on Chunks', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should modify chunk during candy rain', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      const candyRainEvent = {
        id: 'candy_rain_1',
        type: 'candy_rain',
        cx: 0,
        cy: 0,
        effects: {
          spawnItems: ['candy', 'lollipop', 'gumdrop'],
          tileChanges: { '.': '·' } // Normal floor becomes candy floor
        }
      };
      
      await eventSystem.applyEventToChunk(candyRainEvent, chunk);
      
      // Should have candy items
      expect(chunk.items.some(item => item.type === 'candy')).toBe(true);
      
      // Should have modified tiles
      const hasCandyFloor = chunk.map.some(row => 
        row.some(tile => tile === '·')
      );
      expect(hasCandyFloor).toBe(true);
    });
    
    it('should spawn NPCs during events', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      const originalNPCCount = chunk.npcs.length;
      
      const paradeEvent = {
        id: 'parade_1',
        type: 'princess_parade',
        cx: 0,
        cy: 0,
        effects: {
          spawnNPCs: [
            { type: 'banana_guard', count: 3 },
            { type: 'candy_citizen', count: 5 }
          ]
        }
      };
      
      await eventSystem.applyEventToChunk(paradeEvent, chunk);
      
      expect(chunk.npcs.length).toBeGreaterThan(originalNPCCount);
      expect(chunk.npcs.some(npc => npc.type === 'banana_guard')).toBe(true);
    });
    
    it('should create temporary terrain modifications', async () => {
      const chunk = await chunkSystem.generateChunk('test', -50, 50);
      
      const iceStormEvent = {
        id: 'ice_storm_1',
        type: 'ice_storm',
        cx: -50,
        cy: 50,
        duration: 50,
        effects: {
          temporaryTiles: {
            '.': '≈', // Floor becomes ice
            '~': '▓'  // Water freezes
          }
        }
      };
      
      const originalTiles = JSON.parse(JSON.stringify(chunk.map));
      
      await eventSystem.applyEventToChunk(iceStormEvent, chunk);
      
      // Tiles should be modified
      expect(chunk.map).not.toEqual(originalTiles);
      
      // Should track temporary changes
      expect(chunk.temporaryModifications).toBeDefined();
      expect(chunk.temporaryModifications[iceStormEvent.id]).toBeDefined();
    });
  });
  
  describe('Event Scheduling and Triggers', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
    });
    
    it('should schedule events based on time', () => {
      const scheduler = eventSystem.getScheduler();
      
      // Schedule morning event
      scheduler.scheduleEvent({
        type: 'sunrise_ceremony',
        triggerTime: { hour: 6, minute: 0 },
        biome: 'candy_kingdom'
      });
      
      // Simulate time passing
      scheduler.setTime(6, 0);
      const triggered = scheduler.getTriggeredEvents();
      
      expect(triggered.some(e => e.type === 'sunrise_ceremony')).toBe(true);
    });
    
    it('should trigger events based on player actions', async () => {
      const triggerManager = eventSystem.getTriggerManager();
      
      // Register action trigger
      triggerManager.registerTrigger({
        action: 'enter_dungeon',
        eventType: 'dungeon_guardian_awakens',
        probability: 0.5
      });
      
      // Simulate player action
      const event = triggerManager.checkTrigger('enter_dungeon');
      
      // With 0.5 probability, might or might not trigger
      if (event) {
        expect(event.type).toBe('dungeon_guardian_awakens');
      }
    });
    
    it('should chain events together', async () => {
      const candyRainEvent = {
        id: 'candy_rain_1',
        type: 'candy_rain',
        chainEvents: ['rainbow_appears', 'candy_citizens_celebrate']
      };
      
      const chainedEvents = await eventSystem.startEvent(candyRainEvent);
      
      expect(eventSystem.activeEvents.length).toBeGreaterThan(1);
      expect(eventSystem.activeEvents.some(e => e.type === 'rainbow_appears')).toBe(true);
    });
  });
  
  describe('Event Priority and Conflicts', () => {
    beforeEach(async () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
    });
    
    it('should handle event priorities', () => {
      const lowPriorityEvent = {
        id: 'event_low',
        type: 'gentle_breeze',
        priority: EventPriority.LOW,
        cx: 0,
        cy: 0
      };
      
      const highPriorityEvent = {
        id: 'event_high',
        type: 'cosmic_owl_visit',
        priority: EventPriority.HIGH,
        cx: 0,
        cy: 0
      };
      
      eventSystem.startEvent(lowPriorityEvent);
      eventSystem.startEvent(highPriorityEvent);
      
      // High priority event should override low priority at same location
      const activeAtLocation = eventSystem.getActiveEventsAt(0, 0);
      expect(activeAtLocation[0].id).toBe('event_high');
    });
    
    it('should prevent conflicting events', () => {
      const fireEvent = {
        id: 'fire_1',
        type: 'lava_eruption',
        cx: 10,
        cy: 10,
        conflicts: ['ice_storm', 'rain']
      };
      
      const iceEvent = {
        id: 'ice_1',
        type: 'ice_storm',
        cx: 10,
        cy: 10
      };
      
      eventSystem.startEvent(fireEvent);
      const started = eventSystem.startEvent(iceEvent);
      
      // Ice event should not start due to conflict
      expect(started).toBe(false);
      expect(eventSystem.activeEvents).not.toContain(iceEvent);
    });
  });
  
  describe('Event Persistence', () => {
    it('should serialize active events', () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
      
      const event = {
        id: 'persist_1',
        type: 'eternal_flame',
        cx: 50,
        cy: -50,
        persistent: true,
        data: { intensity: 10 }
      };
      
      eventSystem.startEvent(event);
      
      const serialized = eventSystem.serialize();
      expect(serialized.activeEvents).toContain(event);
      expect(serialized.version).toBeDefined();
    });
    
    it('should restore events from save data', () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
      
      const saveData = {
        version: '1.0',
        activeEvents: [
          {
            id: 'restored_1',
            type: 'ancient_curse',
            cx: 0,
            cy: 0,
            remainingDuration: 1000
          }
        ],
        eventHistory: []
      };
      
      eventSystem.deserialize(saveData);
      
      expect(eventSystem.activeEvents.length).toBe(1);
      expect(eventSystem.activeEvents[0].id).toBe('restored_1');
    });
  });
  
  describe('Performance', () => {
    it('should handle many simultaneous events efficiently', () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
      
      const startTime = Date.now();
      
      // Create 100 events
      for (let i = 0; i < 100; i++) {
        eventSystem.startEvent({
          id: `perf_${i}`,
          type: 'ambient_effect',
          cx: i % 10,
          cy: Math.floor(i / 10),
          duration: 100
        });
      }
      
      // Tick through 10 game ticks
      for (let tick = 0; tick < 10; tick++) {
        eventSystem.tick(tick);
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should process 100 events in under 50ms
      expect(elapsed).toBeLessThan(50);
      expect(eventSystem.activeEvents.length).toBe(100);
    });
    
    it('should efficiently query events by location', () => {
      eventSystem = new DynamicEventSystem(null, mockEventBus);
      
      // Add events at different locations
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          eventSystem.startEvent({
            id: `loc_${x}_${y}`,
            type: 'test',
            cx: x,
            cy: y
          });
        }
      }
      
      const startTime = Date.now();
      
      // Query specific location 100 times
      for (let i = 0; i < 100; i++) {
        const events = eventSystem.getActiveEventsAt(5, 5);
        expect(events.length).toBe(1);
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should be very fast with spatial indexing
      expect(elapsed).toBeLessThan(10);
    });
  });
});