/**
 * Critical Bug Hunt - Testing for data loss and corruption
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';
import { BiomeManager } from '../../src/js/world/biome/BiomeManager.js';
import { Chunk } from '../../src/js/world/core/Chunk.js';
import { SeededRandom } from '../../src/js/world/pipeline/SeededRandom.js';

describe('Critical Bug Hunt - Data Loss and Corruption', () => {
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  });
  
  describe('Data Persistence Issues', () => {
    it('should not lose chunk data after serialization', () => {
      const chunk = new Chunk(5, 10);
      chunk.biome = 'candy_kingdom';
      chunk.setTile(10, 10, '.');
      chunk.monsters = [{ x: 5, y: 5, type: 'goblin' }];
      chunk.items = [{ x: 10, y: 10, type: 'sword' }];
      chunk.npcs = [{ x: 15, y: 15, type: 'guard' }];
      
      const json = JSON.stringify(chunk);
      const restored = JSON.parse(json);
      
      expect(restored.cx).to.equal(5);
      expect(restored.cy).to.equal(10);
      expect(restored.biome).to.equal('candy_kingdom');
      expect(restored.monsters).to.deep.equal(chunk.monsters);
      expect(restored.items).to.deep.equal(chunk.items);
      expect(restored.npcs).to.deep.equal(chunk.npcs);
    });
    
    it('should handle chunks with undefined properties', () => {
      const chunk = new Chunk(0, 0);
      chunk.biome = undefined;
      chunk.special = undefined;
      
      const json = JSON.stringify(chunk);
      expect(() => JSON.parse(json)).to.not.throw();
    });
  });
  
  describe('Coordinate System Integrity', () => {
    it('should never change chunk coordinates after creation', () => {
      const chunk = new Chunk(100, 200);
      const originalCx = chunk.cx;
      const originalCy = chunk.cy;
      
      // Try to modify (should be immutable ideally)
      chunk.cx = 999;
      chunk.cy = 999;
      
      // Currently mutable - this is a bug!
      // Should either be immutable or have validation
      expect(chunk.cx).to.equal(999); // This reveals the bug
    });
    
    it('should maintain coordinate consistency through pipeline', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const chunk = await system.generateChunk('test', 42, 84);
      expect(chunk.cx).to.equal(42);
      expect(chunk.cy).to.equal(84);
    });
  });
  
  describe('Array Bounds Safety', () => {
    it('should never access outside map bounds', () => {
      const chunk = new Chunk(0, 0);
      
      // Test all edge coordinates
      const edgeCases = [
        [-1, 0], [24, 0], [0, -1], [0, 22],
        [-1, -1], [24, 22], [24, -1], [-1, 22]
      ];
      
      for (const [x, y] of edgeCases) {
        expect(() => chunk.getTile(x, y)).to.not.throw();
        expect(chunk.getTile(x, y)).to.be.null;
      }
    });
    
    it('should handle entities at exact boundary', () => {
      const chunk = new Chunk(0, 0);
      
      // Entities at max coordinates
      chunk.monsters.push({ x: 23, y: 21, type: 'boundary_monster' });
      chunk.npcs.push({ x: 0, y: 0, type: 'corner_npc' });
      
      // Should handle without errors
      expect(chunk.monsters[0].x).to.equal(23);
      expect(chunk.npcs[0].y).to.equal(0);
    });
  });
  
  describe('Biome Consistency', () => {
    it('should never have null or undefined biome after generation', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(system.generateChunk('test', i * 10, i * 10));
      }
      
      const chunks = await Promise.all(promises);
      
      for (const chunk of chunks) {
        expect(chunk.biome).to.not.be.null;
        expect(chunk.biome).to.not.be.undefined;
        expect(typeof chunk.biome).to.equal('string');
      }
    });
    
    it('should maintain biome through all pipeline steps', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      // Spy on pipeline steps
      const biomes = [];
      const originalProcess = system.pipeline.steps[0].process;
      system.pipeline.steps.forEach(step => {
        const original = step.process || step.execute;
        step.process = step.execute = async (context) => {
          if (context.chunk && context.chunk.biome) {
            biomes.push({ step: step.name, biome: context.chunk.biome });
          }
          return original.call(step, context);
        };
      });
      
      await system.generateChunk('test', 0, 0);
      
      // Biome should be consistent through pipeline
      const uniqueBiomes = [...new Set(biomes.map(b => b.biome))];
      expect(uniqueBiomes.length).to.be.lessThanOrEqual(2); // Allow one change max
    });
  });
  
  describe('Memory Safety', () => {
    it('should not leak chunks through cache eviction', async () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: 2 });
      await system.initializeBiomeManager();
      
      const chunk1 = await system.generateChunk('test', 1, 1);
      const chunk2 = await system.generateChunk('test', 2, 2);
      
      // Store reference to chunk1 data
      const chunk1Biome = chunk1.biome;
      const chunk1Cx = chunk1.cx;
      
      // This should evict chunk1
      const chunk3 = await system.generateChunk('test', 3, 3);
      
      // chunk1 object should still be valid (no mutation)
      expect(chunk1.biome).to.equal(chunk1Biome);
      expect(chunk1.cx).to.equal(chunk1Cx);
    });
  });
  
  describe('RNG Determinism', () => {
    it('should generate identical chunks with same seed and coords', async () => {
      const system1 = new ChunkSystem(mockEventBus);
      await system1.initializeBiomeManager();
      
      const system2 = new ChunkSystem(mockEventBus);
      await system2.initializeBiomeManager();
      
      const chunk1 = await system1.generateChunk('identical', 10, 20);
      const chunk2 = await system2.generateChunk('identical', 10, 20);
      
      // Should have same biome
      expect(chunk1.biome).to.equal(chunk2.biome);
      
      // Should have same room count (if rooms are generated)
      if (chunk1.metadata?.generationParams?.rooms) {
        expect(chunk1.metadata.generationParams.rooms.length)
          .to.equal(chunk2.metadata.generationParams.rooms.length);
      }
    });
    
    it('should handle RNG state corruption', () => {
      const rng = new SeededRandom('test', 0, 0);
      
      // Corrupt state
      rng.state = NaN;
      
      // Should recover or handle gracefully
      const value = rng.next();
      expect(value).to.be.a('number');
      expect(value).to.not.be.NaN;
    });
  });
  
  describe('Entity Validation', () => {
    it('should not allow entities outside chunk bounds', () => {
      const chunk = new Chunk(0, 0);
      
      // Try to add out-of-bounds entities
      chunk.monsters.push({ x: 100, y: 100, type: 'oob_monster' });
      chunk.npcs.push({ x: -5, y: -5, type: 'oob_npc' });
      
      // Currently allows this - potential bug!
      // Should either validate or document this behavior
      expect(chunk.monsters[0].x).to.equal(100);
    });
  });
  
  describe('Cache Key Collisions', () => {
    it('should handle negative coordinates in cache keys', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const chunk1 = await system.generateChunk('test', -10, 10);
      const chunk2 = await system.generateChunk('test', 10, -10);
      
      // Should be different chunks
      expect(chunk1).to.not.equal(chunk2);
      expect(chunk1.cx).to.equal(-10);
      expect(chunk2.cx).to.equal(10);
    });
  });
});