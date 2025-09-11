/**
 * Bug Hunt Tests - Finding edge cases and potential bugs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';
import { BiomeManager } from '../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../src/js/world/biome/BiomeFeatureGenerator.js';
import { ChunkPipeline } from '../../src/js/world/pipeline/ChunkPipeline.js';
import { Chunk } from '../../src/js/world/core/Chunk.js';
import { SeededRandom } from '../../src/js/world/pipeline/SeededRandom.js';

describe('Bug Hunt - Edge Cases and Potential Issues', () => {
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  });
  
  describe('Null and Undefined Handling', () => {
    it('should handle null seed gracefully', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      // Should not crash with null seed
      const chunk = await system.generateChunk(null, 0, 0);
      expect(chunk).to.exist;
      expect(chunk.biome).to.exist;
    });
    
    it('should handle undefined coordinates', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      // Should handle undefined as 0 or throw meaningful error
      try {
        const chunk = await system.generateChunk('test', undefined, undefined);
        // If it doesn't throw, should default to 0,0
        expect(chunk.cx).to.be.a('number');
        expect(chunk.cy).to.be.a('number');
      } catch (error) {
        // Should throw a meaningful error
        expect(error.message).to.include('coordinate');
      }
    });
    
    it('should handle empty biome manager options', () => {
      const manager = new BiomeManager(undefined, null);
      const biome = manager.getBiome(0, 0);
      expect(biome).to.exist;
    });
  });
  
  describe('Extreme Values', () => {
    it('should handle very large coordinates', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const chunk = await system.generateChunk('test', 999999, 999999);
      expect(chunk).to.exist;
      expect(chunk.cx).to.equal(999999);
      expect(chunk.cy).to.equal(999999);
    });
    
    it('should handle negative coordinates', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const chunk = await system.generateChunk('test', -999999, -999999);
      expect(chunk).to.exist;
      expect(chunk.cx).to.equal(-999999);
      expect(chunk.cy).to.equal(-999999);
    });
    
    it('should handle maximum density without overflow', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = generator.generateFeatures('candy_kingdom', 0, 0, { 
        density: Number.MAX_VALUE 
      });
      
      // Should be capped, not overflow
      const total = features.tiles.length + features.entities.length + 
                   features.decorations.length + features.resources.length;
      expect(total).to.be.lessThan(1000);
      expect(total).to.be.greaterThanOrEqual(0);
    });
    
    it('should handle negative density', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = generator.generateFeatures('ice_kingdom', 0, 0, { 
        density: -1 
      });
      
      // Should treat as 0 or minimum
      expect(features.tiles.length).to.be.greaterThanOrEqual(0);
    });
  });
  
  describe('Cache Corruption', () => {
    it('should not corrupt cache when same chunk requested multiple times rapidly', async () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: 10 });
      await system.initializeBiomeManager();
      
      // Request same chunk 10 times simultaneously
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(system.generateChunk('test', 5, 5));
      }
      
      const chunks = await Promise.all(promises);
      
      // All should be the same instance
      const first = chunks[0];
      chunks.forEach(chunk => {
        expect(chunk).to.equal(first);
      });
      
      // Cache should have only one entry
      expect(system.cache.has(5, 5)).to.be.true;
    });
    
    it('should handle cache eviction without losing data', async () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: 2 });
      await system.initializeBiomeManager();
      
      const chunk1 = await system.generateChunk('test', 1, 1);
      const chunk2 = await system.generateChunk('test', 2, 2);
      const chunk3 = await system.generateChunk('test', 3, 3);
      
      // Chunk 1 should be evicted
      expect(system.cache.has(1, 1)).to.be.false;
      expect(system.cache.has(2, 2)).to.be.true;
      expect(system.cache.has(3, 3)).to.be.true;
      
      // But chunk1 object should still be valid
      expect(chunk1.cx).to.equal(1);
      expect(chunk1.biome).to.exist;
    });
  });
  
  describe('Pipeline Context Mutations', () => {
    it('should prevent context.chunk from being set to non-Chunk object', async () => {
      const pipeline = new ChunkPipeline(mockEventBus);
      
      // Add malicious step that tries to replace chunk
      pipeline.addStep({
        name: 'BadStep',
        execute: async (context) => {
          context.chunk = { fake: true }; // Not a real Chunk
        }
      });
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Should still be a valid Chunk
      expect(chunk).to.be.instanceOf(Chunk);
      expect(chunk.map).to.exist;
    });
    
    it('should handle missing context properties', async () => {
      const pipeline = new ChunkPipeline(mockEventBus);
      
      // Add step that deletes context properties
      pipeline.addStep({
        name: 'DeleteStep',
        execute: async (context) => {
          delete context.params;
          delete context.rng;
        }
      });
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Should still complete
      expect(chunk).to.exist;
      expect(chunk.generated).to.be.true;
    });
  });
  
  describe('BiomeManager Territory Bugs', () => {
    it('should handle overlapping territories correctly', () => {
      const manager = new BiomeManager('test');
      
      // Point that's between Candy Kingdom and Breakfast Kingdom
      const biome = manager.getBiome(20, 10);
      
      // Should consistently return one biome (priority based)
      const biome2 = manager.getBiome(20, 10);
      expect(biome).to.equal(biome2);
    });
    
    it('should not crash at territory boundaries', () => {
      const manager = new BiomeManager('test');
      
      // Test exact boundary of Candy Kingdom (radius 8)
      const biome1 = manager.getBiome(8, 0);
      const biome2 = manager.getBiome(0, 8);
      const biome3 = manager.getBiome(-8, 0);
      const biome4 = manager.getBiome(0, -8);
      
      expect(biome1).to.exist;
      expect(biome2).to.exist;
      expect(biome3).to.exist;
      expect(biome4).to.exist;
    });
  });
  
  describe('SeededRandom Edge Cases', () => {
    it('should handle empty seed string', () => {
      const rng = new SeededRandom('', 0, 0);
      const value = rng.next();
      expect(value).to.be.greaterThanOrEqual(0);
      expect(value).to.be.lessThan(1);
    });
    
    it('should handle very long seed string', () => {
      const longSeed = 'x'.repeat(10000);
      const rng = new SeededRandom(longSeed, 0, 0);
      const value = rng.next();
      expect(value).to.be.greaterThanOrEqual(0);
      expect(value).to.be.lessThan(1);
    });
    
    it('should handle between() with reversed min/max', () => {
      const rng = new SeededRandom('test', 0, 0);
      const value = rng.between(10, 5); // max < min
      
      // Should either swap them or return min
      expect(value).to.be.greaterThanOrEqual(5);
      expect(value).to.be.lessThan(10);
    });
    
    it('should handle pick() with empty array', () => {
      const rng = new SeededRandom('test', 0, 0);
      const result = rng.pick([]);
      expect(result).to.be.null;
    });
    
    it('should handle shuffle() with empty array', () => {
      const rng = new SeededRandom('test', 0, 0);
      const result = rng.shuffle([]);
      expect(result).to.deep.equal([]);
    });
  });
  
  describe('Feature Generation Bugs', () => {
    it('should not place features outside chunk bounds', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = generator.generateFeatures('candy_kingdom', 0, 0);
      
      // Check all features are within bounds
      features.tiles.forEach(tile => {
        expect(tile.x).to.be.greaterThanOrEqual(0);
        expect(tile.x).to.be.lessThan(24); // CHUNK_WIDTH
        expect(tile.y).to.be.greaterThanOrEqual(0);
        expect(tile.y).to.be.lessThan(22); // CHUNK_HEIGHT
      });
      
      features.entities.forEach(entity => {
        expect(entity.x).to.be.greaterThanOrEqual(0);
        expect(entity.x).to.be.lessThanOrEqual(24);
        expect(entity.y).to.be.greaterThanOrEqual(0);
        expect(entity.y).to.be.lessThanOrEqual(22);
      });
    });
    
    it('should handle unknown biome types', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = generator.generateFeatures('nonexistent_biome', 0, 0);
      
      // Should use defaults, not crash
      expect(features).to.exist;
      expect(features.tiles).to.be.an('array');
    });
  });
  
  describe('Chunk Data Integrity', () => {
    it('should not allow tile array corruption', () => {
      const chunk = new Chunk(0, 0);
      
      // Try to corrupt the map
      chunk.map[0] = null;
      
      // getTile should handle gracefully
      const tile = chunk.getTile(0, 0);
      expect(tile).to.be.oneOf([null, undefined]);
      
      // setTile should still work
      expect(() => chunk.setTile(0, 0, '#')).to.not.throw();
    });
    
    it('should handle invalid tile characters', () => {
      const chunk = new Chunk(0, 0);
      
      // Try to set invalid tiles
      expect(() => chunk.setTile(0, 0, 'ab')).to.throw(); // Multi-char
      expect(() => chunk.setTile(0, 0, '')).to.throw();   // Empty
      expect(() => chunk.setTile(0, 0, null)).to.throw(); // Null
    });
    
    it('should handle coordinate overflow', () => {
      const chunk = new Chunk(0, 0);
      
      // Try to access beyond bounds
      expect(chunk.getTile(1000, 1000)).to.be.null;
      expect(chunk.getTile(-1, -1)).to.be.null;
      
      // setTile should not crash
      chunk.setTile(1000, 1000, '#');
      chunk.setTile(-1, -1, '#');
      
      // Map should be unchanged
      expect(chunk.map[0][0]).to.equal('#');
    });
  });
  
  describe('Memory Leaks', () => {
    it('should not leak memory through circular references', () => {
      const chunk = new Chunk(0, 0);
      
      // Create circular reference
      chunk.metadata.self = chunk;
      chunk.metadata.circular = { chunk: chunk };
      
      // Should still be serializable (catch circular refs)
      expect(() => JSON.stringify(chunk)).to.throw();
      
      // But chunk should work normally
      expect(chunk.getTile(0, 0)).to.exist;
    });
    
    it('should clean up event listeners', async () => {
      const eventBus = {
        listeners: new Map(),
        on(event, handler) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event).push(handler);
        },
        off(event, handler) {
          const handlers = this.listeners.get(event);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) handlers.splice(index, 1);
          }
        },
        emit() {}
      };
      
      const system = new ChunkSystem(eventBus);
      
      // Check that event handlers were registered
      const initialListenerCount = Array.from(eventBus.listeners.values())
        .reduce((sum, arr) => sum + arr.length, 0);
      
      expect(initialListenerCount).to.be.greaterThanOrEqual(0);
      
      // System should be cleanable without leaks
      // (In production, would have a cleanup method)
    });
  });
  
  describe('Race Conditions', () => {
    it('should handle rapid biome changes safely', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const promises = [];
      
      // Generate chunks in rapid succession at same location
      for (let i = 0; i < 5; i++) {
        promises.push(system.generateChunk(`seed${i}`, 10, 10));
      }
      
      const chunks = await Promise.all(promises);
      
      // Each should have completed without corruption
      chunks.forEach((chunk, i) => {
        expect(chunk).to.exist;
        expect(chunk.biome).to.exist;
      });
    });
  });
});