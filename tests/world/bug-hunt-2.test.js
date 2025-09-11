/**
 * Bug Hunt 2 - Additional edge cases and security issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';
import { BiomeManager } from '../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../src/js/world/biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../src/js/world/biome/BiomeTransitionManager.js';
import { Chunk } from '../../src/js/world/core/Chunk.js';
import { SeededRandom } from '../../src/js/world/pipeline/SeededRandom.js';

describe('Bug Hunt 2 - More Edge Cases', () => {
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  });
  
  describe('Integer Overflow Protection', () => {
    it('should handle JavaScript MAX_SAFE_INTEGER coordinates', () => {
      const manager = new BiomeManager('test');
      const biome = manager.getBiome(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      expect(biome).to.exist;
      expect(typeof biome).to.equal('string');
    });
    
    it('should handle coordinate wrapping correctly', () => {
      const rng = new SeededRandom('test', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      const value = rng.next();
      expect(value).to.be.greaterThanOrEqual(0);
      expect(value).to.be.lessThan(1);
    });
  });
  
  describe('Transition Manager Edge Cases', () => {
    it('should handle same biome transitions', () => {
      const manager = new BiomeTransitionManager('test');
      const transition = manager.getTransitionZone('candy_kingdom', 'candy_kingdom', 0, 0);
      expect(transition).to.exist;
      expect(transition.from).to.equal('candy_kingdom');
      expect(transition.to).to.equal('candy_kingdom');
    });
    
    it('should handle unknown biome transitions', () => {
      const manager = new BiomeTransitionManager('test');
      const transition = manager.getTransitionZone('fake_biome', 'another_fake', 0, 0);
      expect(transition).to.exist;
      // Should not crash
    });
    
    it('should handle mixFeatures with missing parameters', () => {
      const manager = new BiomeTransitionManager('test');
      
      // Call with minimal parameters
      const result = manager.mixFeatures();
      expect(result).to.exist;
      expect(result.tiles).to.be.an('array');
    });
  });
  
  describe('Cache Edge Cases', () => {
    it('should handle cache size of 0', async () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: 0 });
      await system.initializeBiomeManager();
      
      // Should still work, just without caching
      const chunk = await system.generateChunk('test', 0, 0);
      expect(chunk).to.exist;
      
      // Cache should be empty
      expect(system.cache.size).to.equal(0);
    });
    
    it('should handle negative cache size', async () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: -10 });
      // Should treat as 0 or minimum valid size
      expect(system.cache).to.exist;
    });
    
    it('should handle cache.clear() when cache has circular references', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      const chunk = await system.generateChunk('test', 0, 0);
      // Create circular reference
      chunk.metadata.self = chunk;
      
      // Should not crash
      system.cache.clear();
      expect(system.cache.size).to.equal(0);
    });
  });
  
  describe('BiomeFeatureGenerator Robustness', () => {
    it('should handle generateFeatures with null biome', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = generator.generateFeatures(null, 0, 0);
      expect(features).to.exist;
      expect(features.tiles).to.be.an('array');
    });
    
    it('should handle applyToChunk with null chunk', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = { tiles: [], entities: [], decorations: [], resources: [], special: [] };
      
      // Should not crash
      expect(() => generator.applyToChunk(null, features)).to.not.throw();
    });
    
    it('should handle applyToChunk with missing chunk methods', () => {
      const generator = new BiomeFeatureGenerator('test');
      const features = generator.generateFeatures('candy_kingdom', 0, 0);
      const fakeChunk = { map: [] }; // Missing setTile method
      
      // Should handle gracefully
      generator.applyToChunk(fakeChunk, features);
      expect(fakeChunk).to.exist;
    });
  });
  
  describe('Pipeline Step Order Dependencies', () => {
    it('should handle FeatureStep before BiomeStep', async () => {
      const { ChunkPipeline } = await import('../../src/js/world/pipeline/ChunkPipeline.js');
      const { FeatureStep } = await import('../../src/js/world/pipeline/steps/FeatureStep.js');
      const { BiomeStep } = await import('../../src/js/world/pipeline/steps/BiomeStep.js');
      
      const pipeline = new ChunkPipeline(mockEventBus);
      pipeline.clearSteps();
      
      // Wrong order - features before biome
      pipeline.addStep(new FeatureStep());
      pipeline.addStep(new BiomeStep());
      
      const chunk = await pipeline.generate('test', 0, 0);
      expect(chunk).to.exist;
      // Should still produce valid chunk
    });
  });
  
  describe('Special Characters in Seeds', () => {
    it('should handle emoji in seed', () => {
      const rng = new SeededRandom('🎮🎯🎨', 0, 0);
      const value = rng.next();
      expect(value).to.be.a('number');
    });
    
    it('should handle unicode characters', () => {
      const manager = new BiomeManager('测试種子🌍');
      const biome = manager.getBiome(0, 0);
      expect(biome).to.exist;
    });
    
    it('should handle special characters in seed', () => {
      const rng = new SeededRandom('\n\t\r\0', 0, 0);
      const value = rng.next();
      expect(value).to.be.a('number');
    });
  });
  
  describe('Concurrent Modification', () => {
    it('should handle chunk modification during generation', async () => {
      const system = new ChunkSystem(mockEventBus);
      await system.initializeBiomeManager();
      
      // Start generation
      const promise = system.generateChunk('test', 10, 10);
      
      // Try to get same chunk immediately (might be mid-generation)
      const promise2 = system.generateChunk('test', 10, 10);
      
      const [chunk1, chunk2] = await Promise.all([promise, promise2]);
      
      // Should be same instance (deduplication worked)
      expect(chunk1).to.equal(chunk2);
    });
  });
  
  describe('BiomeManager Territory Calculation', () => {
    it('should handle territory with radius 0', () => {
      const manager = new BiomeManager('test');
      // Modify a territory to have 0 radius
      manager.kingdomTerritories.candy_kingdom.radius = 0;
      
      const biome = manager.getBiome(0, 0);
      expect(biome).to.exist;
    });
    
    it('should handle territory with negative radius', () => {
      const manager = new BiomeManager('test');
      manager.kingdomTerritories.ice_kingdom.radius = -10;
      
      const biome = manager.getBiome(-50, 50);
      expect(biome).to.exist;
    });
    
    it('should handle missing falloff value', () => {
      const manager = new BiomeManager('test');
      delete manager.kingdomTerritories.fire_kingdom.falloff;
      
      const biome = manager.getBiome(50, -50);
      expect(biome).to.exist;
    });
  });
  
  describe('Resource Limits', () => {
    it('should not create infinite recursion in corridor generation', () => {
      const { ValidationStep } = require('../../src/js/world/pipeline/steps/ValidationStep.js');
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create two points that would cause infinite loop if not handled
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 23, y: 21 }; // Max distance
      
      // Should complete without stack overflow
      step.createCorridor(chunk, p1, p2);
      expect(chunk).to.exist;
    });
  });
  
  describe('String Injection Protection', () => {
    it('should handle script injection attempts in biome names', () => {
      const chunk = new Chunk(0, 0);
      chunk.biome = '<script>alert("xss")</script>';
      
      // Should store as-is (escaping is presentation layer concern)
      expect(chunk.biome).to.equal('<script>alert("xss")</script>');
      
      // But should not execute or cause issues
      const serialized = JSON.stringify(chunk);
      expect(serialized).to.include('\\u003c'); // JSON escapes <
    });
  });
  
  describe('Memory Stress', () => {
    it('should handle rapid cache eviction', async () => {
      const system = new ChunkSystem(mockEventBus, { cacheSize: 1 });
      await system.initializeBiomeManager();
      
      // Generate many chunks with cache size of 1
      for (let i = 0; i < 100; i++) {
        await system.generateChunk('test', i, 0);
      }
      
      // Should not leak memory or crash
      expect(system.cache.size).to.equal(1);
    });
  });
});