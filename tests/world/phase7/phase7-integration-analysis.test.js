/**
 * Phase 7 Integration Analysis
 * Tests how Phase 7 features integrate with Phases 1-6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { QuestGenerator } from '../../../src/js/world/quests/QuestGenerator.js';
import { QuestManager } from '../../../src/js/world/quests/QuestManager.js';
import { WorldPersistence } from '../../../src/js/world/persistence/WorldPersistence.js';

describe('Phase 7 Integration with Previous Phases', () => {
  let mockEventBus;
  let chunkSystem;
  let eventSystem;
  let questGenerator;
  let questManager;
  let worldPersistence;
  
  beforeEach(() => {
    mockEventBus = { 
      emit: vi.fn(), 
      on: vi.fn(), 
      off: vi.fn() 
    };
  });
  
  describe('Phase 1 Integration: Core Chunk System', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
    });
    
    it('should generate chunks with Phase 7 event modifications', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Phase 1 chunk structure should support Phase 7 events
      expect(chunk.cx).toBeDefined();
      expect(chunk.cy).toBeDefined();
      expect(chunk.map).toBeDefined();
      
      // Apply Phase 7 event
      const event = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Chunk should be modified
      expect(chunk.items).toBeDefined();
      expect(chunk.temporaryModifications).toBeDefined();
    });
    
    it('should maintain chunk cache with event data', async () => {
      const chunk = await chunkSystem.generateChunk('test', 5, 5);
      
      // Add quest markers (Phase 7)
      chunk.questMarkers = { quest_1: { x: 10, y: 10 } };
      
      // Phase 1 cache should preserve Phase 7 data
      const cached = chunkSystem.cache.get(5, 5);
      expect(cached).toBe(chunk);
      expect(cached.questMarkers).toBeDefined();
    });
    
    it('should handle chunk boundaries with quest objectives', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Phase 1 boundary checking should work with Phase 7 features
      const transition = chunkSystem.getChunkTransition(23, 21, 1, 1);
      expect(transition.shouldTransition).toBe(true);
      
      // Quest objectives should respect boundaries
      questGenerator = new QuestGenerator(chunkSystem);
      const quest = questGenerator.generateQuest({ biome: 'candy_kingdom' });
      
      if (quest.objectives[0].location) {
        expect(quest.objectives[0].location.x).toBeLessThan(24);
        expect(quest.objectives[0].location.y).toBeLessThan(22);
      }
    });
  });
  
  describe('Phase 2 Integration: Biome System', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus, {
        useAdventureTimeBiomes: true
      });
    });
    
    it('should generate biome-appropriate events', async () => {
      await chunkSystem.initializeBiomeManager();
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Phase 2 biome should determine Phase 7 events
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      const event = await eventSystem.generateBiomeEvent(chunk.biome, 0, 0);
      
      expect(event.biome).toBe(chunk.biome);
      
      // Candy Kingdom should have candy events
      if (chunk.biome === 'candy_kingdom') {
        expect(['candy_rain', 'sugar_storm', 'princess_parade', 
                'banana_guard_drill', 'gumball_invasion']).toContain(event.type);
      }
    });
    
    it('should generate biome-appropriate quests', async () => {
      await chunkSystem.initializeBiomeManager();
      const chunk = await chunkSystem.generateChunk('test', -50, 50);
      
      questGenerator = new QuestGenerator(chunkSystem);
      const quest = questGenerator.generateQuest({ 
        biome: chunk.biome 
      });
      
      // Phase 2 biomes should influence Phase 7 quests
      expect(quest.biome).toBe(chunk.biome);
      
      // Ice Kingdom should have ice-themed objectives
      if (chunk.biome === 'ice_kingdom') {
        const collectObjective = quest.objectives.find(o => o.type === 'collect');
        if (collectObjective) {
          expect(['ice_shard', 'frozen_tear', 'penguin_feather'])
            .toContain(collectObjective.target);
        }
      }
    });
    
    it('should respect biome territories for events', async () => {
      await chunkSystem.initializeBiomeManager();
      
      // Candy Kingdom territory (0,0)
      const candyChunk = await chunkSystem.generateChunk('test', 0, 0);
      expect(candyChunk.biome).toBe('candy_kingdom');
      
      // Events should match territory
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      const candyEvent = await eventSystem.generateBiomeEvent(candyChunk.biome, 0, 0);
      expect(candyEvent.biome).toBe('candy_kingdom');
    });
  });
  
  describe('Phase 3 Integration: Pipeline System', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
    });
    
    it('should apply events through pipeline steps', async () => {
      // Pipeline should support event modifications
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Phase 3 pipeline generated the chunk
      expect(chunk.metadata).toBeDefined();
      expect(chunk.metadata.generationParams).toBeDefined();
      
      // Phase 7 can modify pipeline-generated chunks
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      const event = {
        id: 'test_event',
        type: 'candy_rain',
        cx: 0,
        cy: 0,
        effects: {
          spawnItems: ['candy']
        }
      };
      
      await eventSystem.applyEventToChunk(event, chunk);
      expect(chunk.items.length).toBeGreaterThan(0);
    });
    
    it('should preserve pipeline metadata with quest modifications', async () => {
      const chunk = await chunkSystem.generateChunk('test', 5, 5);
      const originalMetadata = { ...chunk.metadata };
      
      // Apply quest modifications
      questManager = new QuestManager(null, mockEventBus);
      const quest = {
        id: 'quest_1',
        objectives: [{
          type: 'collect',
          target: 'candy',
          count: 5
        }]
      };
      
      await questManager.applyQuestToChunk(quest, chunk);
      
      // Pipeline metadata should be preserved
      expect(chunk.metadata.generationParams).toEqual(originalMetadata.generationParams);
      expect(chunk.metadata.questModified).toBe(true);
    });
  });
  
  describe('Phase 4 Integration: Cache & Registry', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus, {
        cacheSize: 10
      });
    });
    
    it('should cache chunks with event modifications', async () => {
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Apply event
      const event = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Phase 4 cache should maintain event data
      const cached = chunkSystem.cache.get(0, 0);
      expect(cached.items).toBeDefined();
      expect(cached.temporaryModifications).toBeDefined();
    });
    
    it('should handle cache eviction with quest data', async () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        const chunk = await chunkSystem.generateChunk('test', i, 0);
        chunk.questMarkers = { [`quest_${i}`]: { x: 5, y: 5 } };
      }
      
      // This should evict the first chunk
      const newChunk = await chunkSystem.generateChunk('test', 10, 0);
      
      // Evicted chunk's quest data should be persisted if needed
      expect(chunkSystem.cache.size).toBeLessThanOrEqual(10);
    });
    
    it('should register special quest locations', async () => {
      // Phase 4 registry should support Phase 7 quest locations
      const questTemplate = {
        id: 'dungeon_quest',
        matches: (cx, cy) => cx === 10 && cy === 10,
        generate: async (seed, cx, cy) => {
          const chunk = await chunkSystem.pipeline.generate(seed, cx, cy);
          chunk.special = 'quest_dungeon';
          return chunk;
        }
      };
      
      chunkSystem.registerTemplate('dungeon_quest', questTemplate);
      
      const questChunk = await chunkSystem.generateChunk('test', 10, 10);
      expect(questChunk.special).toBe('quest_dungeon');
    });
  });
  
  describe('Phase 5 Integration: Persistence', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus, {
        persistChunks: true
      });
      worldPersistence = new WorldPersistence(chunkSystem);
    });
    
    it('should persist event modifications', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Apply event
      const event = {
        id: 'persist_event',
        type: 'candy_rain',
        cx: 0,
        cy: 0,
        effects: {
          tileChanges: { '.': '·' }
        }
      };
      
      await eventSystem.applyEventToChunk(event, chunk);
      chunk.modified = true;
      
      // Phase 5 persistence should save Phase 7 modifications
      await worldPersistence.saveChunk(chunk);
      const loaded = await worldPersistence.loadChunkModifications(0, 0);
      
      expect(loaded).toBeDefined();
      if (loaded && loaded.tiles) {
        expect(Object.keys(loaded.tiles).length).toBeGreaterThan(0);
      }
    });
    
    it('should persist quest state with world', async () => {
      questManager = new QuestManager(null, mockEventBus);
      
      const quest = {
        id: 'persist_quest',
        state: 'active',
        objectives: [{ type: 'collect', progress: 3, count: 5 }]
      };
      
      questManager.addQuest(quest);
      
      // Save quest state
      const questSave = questManager.serialize();
      
      // Phase 5 world persistence should include Phase 7 quests
      const worldSave = await worldPersistence.createSaveGame('Test Save');
      worldSave.quests = questSave;
      
      expect(worldSave.quests.activeQuests).toContain(quest);
    });
    
    it('should persist active events', async () => {
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const event = {
        id: 'eternal_event',
        type: 'eternal_flame',
        cx: 50,
        cy: -50,
        persistent: true
      };
      
      eventSystem.startEvent(event);
      
      // Save event state
      const eventSave = eventSystem.serialize();
      
      // Create world save
      const worldSave = await worldPersistence.createSaveGame('Event Save');
      worldSave.events = eventSave;
      
      expect(worldSave.events.activeEvents).toContain(event);
    });
  });
  
  describe('Phase 6 Integration: Performance', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
    });
    
    it('should maintain performance with events and quests', async () => {
      const startTime = Date.now();
      
      // Generate chunk (Phase 1-6)
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Add Phase 7 features
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      questManager = new QuestManager(null, mockEventBus);
      
      // Apply event
      const event = await eventSystem.generateBiomeEvent('candy_kingdom', 0, 0);
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Apply quest
      const quest = { 
        id: 'perf_quest',
        objectives: [{ type: 'collect', target: 'candy', count: 5 }]
      };
      await questManager.applyQuestToChunk(quest, chunk);
      
      const elapsed = Date.now() - startTime;
      
      // Should still meet Phase 6 performance targets
      expect(elapsed).toBeLessThan(50); // Phase 6 target: <50ms
    });
    
    it('should efficiently handle many events', async () => {
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      const startTime = Date.now();
      
      // Create many events (Phase 7)
      for (let i = 0; i < 100; i++) {
        eventSystem.startEvent({
          id: `perf_event_${i}`,
          type: 'ambient_effect',
          cx: i % 10,
          cy: Math.floor(i / 10)
        });
      }
      
      // Process events
      for (let tick = 0; tick < 10; tick++) {
        eventSystem.tick(tick);
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should maintain Phase 6 performance
      expect(elapsed).toBeLessThan(100);
      expect(eventSystem.activeEvents.length).toBeGreaterThan(0);
    });
    
    it('should use spatial indexing for events', async () => {
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Add events at different locations
      for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
          eventSystem.startEvent({
            id: `spatial_${x}_${y}`,
            type: 'test',
            cx: x,
            cy: y
          });
        }
      }
      
      const startTime = Date.now();
      
      // Query specific location (should be fast with spatial index)
      for (let i = 0; i < 100; i++) {
        const events = eventSystem.getActiveEventsAt(10, 10);
        expect(events).toBeDefined();
      }
      
      const elapsed = Date.now() - startTime;
      
      // Spatial indexing should maintain Phase 6 performance
      expect(elapsed).toBeLessThan(20);
    });
  });
  
  describe('Cross-Phase Data Flow', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus, {
        useAdventureTimeBiomes: true,
        cacheSize: 50,
        persistChunks: true
      });
    });
    
    it('should flow data from Phase 2 biomes to Phase 7 events', async () => {
      await chunkSystem.initializeBiomeManager();
      
      // Phase 2: Generate biome
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      const biome = chunk.biome;
      
      // Phase 7: Generate biome-appropriate event
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      const event = await eventSystem.generateBiomeEvent(biome, 0, 0);
      
      expect(event.biome).toBe(biome);
    });
    
    it('should flow data from Phase 3 pipeline to Phase 7 quests', async () => {
      // Phase 3: Pipeline generates chunk with metadata
      const chunk = await chunkSystem.generateChunk('test', 5, 5);
      
      // Phase 7: Quest uses chunk data
      questGenerator = new QuestGenerator(chunkSystem);
      const quest = questGenerator.generateQuest({
        biome: chunk.biome,
        targetChunk: { cx: chunk.cx, cy: chunk.cy }
      });
      
      expect(quest.biome).toBe(chunk.biome);
    });
    
    it('should flow from Phase 4 cache through Phase 7 to Phase 5 persistence', async () => {
      worldPersistence = new WorldPersistence(chunkSystem);
      
      // Phase 4: Chunk in cache
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Phase 7: Modify with event
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      const event = {
        id: 'flow_event',
        type: 'test',
        effects: { spawnItems: ['test_item'] }
      };
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Phase 5: Persist modified chunk
      chunk.modified = true;
      await worldPersistence.saveChunk(chunk);
      
      // Data should flow through all phases
      const cached = chunkSystem.cache.get(0, 0);
      expect(cached.items).toBeDefined();
    });
  });
  
  describe('Integration Issues and Conflicts', () => {
    it('should handle conflicting biome events and quests', async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      questManager = new QuestManager(null, mockEventBus);
      
      // Start an event that modifies tiles
      const event = {
        id: 'tile_event',
        type: 'ice_storm',
        cx: 0,
        cy: 0,
        effects: {
          temporaryTiles: { '.': '≈' }
        }
      };
      
      await eventSystem.applyEventToChunk(event, chunk);
      
      // Quest should work with modified chunk
      const quest = {
        id: 'quest_1',
        objectives: [{
          type: 'explore',
          location: { cx: 0, cy: 0, x: 10, y: 10 }
        }]
      };
      
      await questManager.applyQuestToChunk(quest, chunk);
      
      // Both modifications should coexist
      expect(chunk.temporaryModifications).toBeDefined();
      expect(chunk.questMarkers).toBeDefined();
    });
    
    it('should handle cache eviction with active events', async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus, { cacheSize: 2 });
      eventSystem = new DynamicEventSystem(chunkSystem, mockEventBus);
      
      // Generate chunks with events
      const chunk1 = await chunkSystem.generateChunk('test', 0, 0);
      const event1 = {
        id: 'event_1',
        type: 'candy_rain',
        cx: 0,
        cy: 0,
        duration: 1000
      };
      eventSystem.startEvent(event1);
      
      const chunk2 = await chunkSystem.generateChunk('test', 1, 0);
      const chunk3 = await chunkSystem.generateChunk('test', 2, 0); // Evicts chunk1
      
      // Event should still be active even if chunk was evicted
      expect(eventSystem.activeEvents).toContain(event1);
    });
  });
});