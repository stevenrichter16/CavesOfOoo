/**
 * Phase 7: World Persistence Enhancements
 * Test-Driven Development for persistent world modifications
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { WorldPersistence } from '../../../src/js/world/persistence/WorldPersistence.js';
import { ModificationTracker } from '../../../src/js/world/persistence/ModificationTracker.js';
import { DeltaCompressor } from '../../../src/js/world/persistence/DeltaCompressor.js';

describe('Phase 7: World Persistence Enhancements', () => {
  let mockEventBus;
  let chunkSystem;
  let worldPersistence;
  let modificationTracker;
  
  beforeEach(() => {
    mockEventBus = { 
      emit: vi.fn(), 
      on: vi.fn(), 
      off: vi.fn() 
    };
  });
  
  describe('Modification Tracking', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      modificationTracker = new ModificationTracker();
    });
    
    it('should track tile modifications', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      const originalTile = chunk.getTile(10, 10);
      
      // Modify tile
      chunk.setTile(10, 10, '#');
      modificationTracker.trackTileChange(chunk, 10, 10, originalTile, '#');
      
      const modifications = modificationTracker.getModifications(0, 0);
      expect(modifications.tiles).toBeDefined();
      expect(modifications.tiles['10,10']).toEqual({
        original: originalTile,
        current: '#',
        timestamp: expect.any(Number)
      });
    });
    
    it('should track entity additions and removals', async () => {
      const chunk = await chunkSystem.generateChunk('test', 5, 5);
      
      // Add monster
      const monster = { 
        id: 'monster_1',
        type: 'skeleton', 
        x: 12, 
        y: 10,
        hp: 20
      };
      chunk.monsters.push(monster);
      modificationTracker.trackEntityAdded(chunk, 'monsters', monster);
      
      // Remove NPC
      const removedNPC = chunk.npcs.shift();
      if (removedNPC) {
        modificationTracker.trackEntityRemoved(chunk, 'npcs', removedNPC);
      }
      
      const modifications = modificationTracker.getModifications(5, 5);
      expect(modifications.entities.added).toContainEqual({
        type: 'monsters',
        entity: monster,
        timestamp: expect.any(Number)
      });
      
      if (removedNPC) {
        expect(modifications.entities.removed).toContainEqual({
          type: 'npcs',
          entity: removedNPC,
          timestamp: expect.any(Number)
        });
      }
    });
    
    it('should track item interactions', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Player picks up item
      const item = { id: 'item_1', type: 'sword', x: 5, y: 5 };
      chunk.items.push(item);
      
      // Simulate pickup
      const itemIndex = chunk.items.indexOf(item);
      chunk.items.splice(itemIndex, 1);
      modificationTracker.trackItemPickup(chunk, item, 'player_1');
      
      const modifications = modificationTracker.getModifications(0, 0);
      expect(modifications.items.pickedUp).toContainEqual({
        item: item,
        playerId: 'player_1',
        timestamp: expect.any(Number)
      });
    });
    
    it('should track player-built structures', async () => {
      const chunk = await chunkSystem.generateChunk('test', 10, 10);
      
      const structure = {
        type: 'wall',
        tiles: [
          { x: 5, y: 5, tile: '#' },
          { x: 6, y: 5, tile: '#' },
          { x: 7, y: 5, tile: '#' }
        ],
        builder: 'player_1',
        timestamp: Date.now()
      };
      
      // Apply structure
      structure.tiles.forEach(t => {
        chunk.setTile(t.x, t.y, t.tile);
      });
      
      modificationTracker.trackStructureBuilt(chunk, structure);
      
      const modifications = modificationTracker.getModifications(10, 10);
      expect(modifications.structures).toContainEqual(structure);
    });
  });
  
  describe('Delta Compression', () => {
    beforeEach(() => {
      modificationTracker = new ModificationTracker();
    });
    
    it('should compress modification deltas', () => {
      const compressor = new DeltaCompressor();
      
      const modifications = {
        tiles: {
          '5,5': { original: '.', current: '#' },
          '5,6': { original: '.', current: '#' },
          '5,7': { original: '.', current: '#' },
          '6,5': { original: '.', current: '#' }
        }
      };
      
      const compressed = compressor.compress(modifications);
      
      // Should be smaller than original
      const originalSize = JSON.stringify(modifications).length;
      const compressedSize = JSON.stringify(compressed).length;
      expect(compressedSize).toBeLessThan(originalSize);
      
      // Should be reversible
      const decompressed = compressor.decompress(compressed);
      expect(decompressed).toEqual(modifications);
    });
    
    it('should efficiently store tile runs', () => {
      const compressor = new DeltaCompressor();
      
      // Long horizontal wall
      const modifications = {
        tiles: {}
      };
      
      for (let x = 0; x < 20; x++) {
        modifications.tiles[`${x},10`] = { original: '.', current: '#' };
      }
      
      const compressed = compressor.compress(modifications);
      
      // Should recognize the pattern
      expect(compressed.runs).toBeDefined();
      expect(compressed.runs[0]).toEqual({
        start: [0, 10],
        end: [19, 10],
        original: '.',
        current: '#'
      });
    });
  });
  
  describe('Persistent World State', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      worldPersistence = new WorldPersistence(chunkSystem);
    });
    
    it('should save world metadata', async () => {
      const worldMeta = {
        seed: 'adventure-time-123',
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        playTime: 3600, // 1 hour in seconds
        version: '1.0.0',
        difficulty: 'normal',
        customSettings: {
          biomeSize: 'large',
          eventFrequency: 'medium'
        }
      };
      
      await worldPersistence.saveWorldMetadata(worldMeta);
      const loaded = await worldPersistence.loadWorldMetadata();
      
      expect(loaded).toEqual(worldMeta);
    });
    
    it('should save modified chunks separately from generated chunks', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      const originalData = JSON.parse(JSON.stringify(chunk));
      
      // Modify chunk
      chunk.setTile(10, 10, '@'); // Player built something
      chunk.modified = true;
      chunk.modificationTime = Date.now();
      
      // Save
      await worldPersistence.saveChunk(chunk);
      
      // Should save only modifications, not entire chunk
      const savedData = await worldPersistence.loadChunkModifications(0, 0);
      expect(savedData).toBeDefined();
      expect(savedData.tiles).toBeDefined();
      expect(savedData.tiles['10,10']).toBe('@');
      
      // Should not duplicate base generation data
      expect(savedData.fullChunk).toBeUndefined();
    });
    
    it('should handle chunk versioning', async () => {
      const chunk = await chunkSystem.generateChunk('test', 5, 5);
      
      // Version 1
      chunk.setTile(5, 5, '#');
      chunk.version = 1;
      await worldPersistence.saveChunk(chunk);
      
      // Version 2
      chunk.setTile(6, 6, '@');
      chunk.version = 2;
      await worldPersistence.saveChunk(chunk);
      
      // Should be able to load specific version
      const v1 = await worldPersistence.loadChunkVersion(5, 5, 1);
      expect(v1.getTile(5, 5)).toBe('#');
      expect(v1.getTile(6, 6)).not.toBe('@');
      
      const v2 = await worldPersistence.loadChunkVersion(5, 5, 2);
      expect(v2.getTile(5, 5)).toBe('#');
      expect(v2.getTile(6, 6)).toBe('@');
    });
  });
  
  describe('Global World Changes', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      worldPersistence = new WorldPersistence(chunkSystem);
    });
    
    it('should track global events affecting multiple chunks', async () => {
      const globalEvent = {
        id: 'global_event_1',
        type: 'eternal_winter',
        affectedBiomes: ['grasslands', 'candy_kingdom'],
        modifications: {
          tileReplacements: {
            '.': '≈', // Grass becomes ice
            '~': '▓'  // Water freezes
          }
        },
        startTime: Date.now()
      };
      
      await worldPersistence.saveGlobalEvent(globalEvent);
      
      // Generate chunk and apply global effects
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      await worldPersistence.applyGlobalEvents(chunk);
      
      // Should have modified tiles
      const hasIce = chunk.map.some(row => row.some(tile => tile === '≈'));
      expect(hasIce).toBe(true);
    });
    
    it('should persist player bases and territories', async () => {
      const playerBase = {
        playerId: 'player_1',
        name: 'Fort Awesome',
        center: { cx: 10, cy: 10 },
        radius: 3, // 3 chunk radius
        structures: [
          { cx: 10, cy: 10, type: 'town_hall' },
          { cx: 11, cy: 10, type: 'wall' },
          { cx: 9, cy: 10, type: 'farm' }
        ],
        established: Date.now()
      };
      
      await worldPersistence.savePlayerBase(playerBase);
      
      // Check if chunk is in player territory
      const isInTerritory = await worldPersistence.isInPlayerTerritory(11, 10);
      expect(isInTerritory).toBe(true);
      
      // Load bases near location
      const nearbyBases = await worldPersistence.getBasesNear(10, 10, 5);
      expect(nearbyBases).toContain(playerBase);
    });
  });
  
  describe('Save File Management', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      worldPersistence = new WorldPersistence(chunkSystem);
    });
    
    it('should create save game snapshots', async () => {
      const saveGame = await worldPersistence.createSaveGame('My Adventure');
      
      expect(saveGame.id).toBeDefined();
      expect(saveGame.name).toBe('My Adventure');
      expect(saveGame.timestamp).toBeDefined();
      expect(saveGame.worldSeed).toBeDefined();
      expect(saveGame.chunks).toBeDefined();
      expect(saveGame.players).toBeDefined();
    });
    
    it('should list available save games', async () => {
      await worldPersistence.createSaveGame('Save 1');
      await worldPersistence.createSaveGame('Save 2');
      await worldPersistence.createSaveGame('Save 3');
      
      const saves = await worldPersistence.listSaveGames();
      
      expect(saves.length).toBeGreaterThanOrEqual(3);
      expect(saves[0].name).toBeDefined();
      expect(saves[0].timestamp).toBeDefined();
      
      // Should be sorted by timestamp (newest first)
      if (saves.length > 1) {
        expect(saves[0].timestamp).toBeGreaterThanOrEqual(saves[1].timestamp);
      }
    });
    
    it('should support auto-save functionality', async () => {
      const autoSaveConfig = {
        enabled: true,
        interval: 60000, // 1 minute
        maxAutoSaves: 3
      };
      
      worldPersistence.configureAutoSave(autoSaveConfig);
      
      // Simulate auto-saves
      for (let i = 0; i < 5; i++) {
        await worldPersistence.autoSave();
      }
      
      const autoSaves = await worldPersistence.listAutoSaves();
      
      // Should only keep 3 most recent
      expect(autoSaves.length).toBe(3);
    });
    
    it('should handle save corruption gracefully', async () => {
      // Create corrupted save data
      const corruptedSave = {
        id: 'corrupted_1',
        data: 'CORRUPTED_DATA_@#$%^&*',
        chunks: null
      };
      
      // Try to load corrupted save
      const result = await worldPersistence.loadSaveGame(corruptedSave.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fallback).toBeDefined(); // Should provide fallback options
    });
  });
  
  describe('Performance Optimizations', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      worldPersistence = new WorldPersistence(chunkSystem);
    });
    
    it('should batch chunk saves efficiently', async () => {
      const chunks = [];
      
      // Generate 100 modified chunks
      for (let i = 0; i < 100; i++) {
        const chunk = await chunkSystem.generateChunk('test', i, 0);
        chunk.setTile(5, 5, '#');
        chunk.modified = true;
        chunks.push(chunk);
      }
      
      const startTime = Date.now();
      
      // Batch save
      await worldPersistence.batchSaveChunks(chunks);
      
      const elapsed = Date.now() - startTime;
      
      // Should be fast with batching
      expect(elapsed).toBeLessThan(1000); // Under 1 second for 100 chunks
    });
    
    it('should use incremental saves', async () => {
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // First save - full
      chunk.setTile(5, 5, '#');
      const firstSaveSize = await worldPersistence.saveChunk(chunk);
      
      // Second save - incremental
      chunk.setTile(6, 6, '@');
      const secondSaveSize = await worldPersistence.saveChunk(chunk);
      
      // Incremental save should be smaller
      expect(secondSaveSize.bytes).toBeLessThan(firstSaveSize.bytes);
    });
    
    it('should lazy-load chunk modifications', async () => {
      // Save many chunks
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const chunk = await chunkSystem.generateChunk('test', x, y);
          chunk.setTile(5, 5, '#');
          await worldPersistence.saveChunk(chunk);
        }
      }
      
      // Load world without loading all chunks
      const startTime = Date.now();
      const world = await worldPersistence.loadWorld('test');
      const loadTime = Date.now() - startTime;
      
      // Should be fast - not loading all chunk data
      expect(loadTime).toBeLessThan(100);
      
      // Chunks load on demand
      const chunk = await world.getChunk(5, 5);
      expect(chunk).toBeDefined();
      expect(chunk.getTile(5, 5)).toBe('#');
    });
  });
});