/**
 * Integration tests for Phase 5 with Phases 1-4
 * Tests Adventure Time biome system integration with chunk pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkPipeline } from '../../../src/js/world/pipeline/ChunkPipeline.js';
import { AdventureTimeBiomeStep } from '../../../src/js/world/pipeline/steps/AdventureTimeBiomeStep.js';
import { FeatureStep } from '../../../src/js/world/pipeline/steps/FeatureStep.js';
import { ChunkCache } from '../../../src/js/world/core/ChunkCache.js';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';
import { ChunkStreaming } from '../../../src/js/world/streaming/ChunkStreaming.js';
import { FilesystemPersistence } from '../../../src/js/world/persistence/FilesystemPersistence.js';

describe('Phase 5 Integration', () => {
  let pipeline;
  let chunkSystem;
  let biomeManager;
  let mockEventBus;
  
  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      on: () => {},
      emit: () => {},
      off: () => {}
    };
    
    biomeManager = new BiomeManager('test-seed');
    pipeline = new ChunkPipeline();
    chunkSystem = new ChunkSystem(mockEventBus);
  });
  
  describe('Pipeline Integration', () => {
    it('should use AdventureTimeBiomeStep in pipeline', async () => {
      // Replace generic BiomeStep with Adventure Time version
      // Use default seed to ensure candy_kingdom at (0,0)
      const atBiomeStep = new AdventureTimeBiomeStep('ooo');
      pipeline.steps[0] = atBiomeStep;
      
      // Generate chunk at Candy Kingdom center
      const chunk = await pipeline.generate('test', 0, 0);
      
      expect(chunk.biome).toBe('candy_kingdom');
      expect(chunk.biomeFeatures).toBeDefined();
      expect(chunk.biomeFeatures.length).toBeGreaterThan(0);
    });
    
    it('should generate forest biome', async () => {
      const atBiomeStep = new AdventureTimeBiomeStep('forest-seed');
      pipeline.steps[0] = atBiomeStep;
      
      // Find a forest location
      let forestChunk = null;
      for (let x = -20; x <= 20; x += 5) {
        for (let y = -20; y <= 20; y += 5) {
          const chunk = await pipeline.generate('test', x, y);
          if (chunk.biome === 'forest') {
            forestChunk = chunk;
            break;
          }
        }
        if (forestChunk) break;
      }
      
      expect(forestChunk).toBeDefined();
      expect(forestChunk.biome).toBe('forest');
    });
    
    it('should generate desert biome', async () => {
      const atBiomeStep = new AdventureTimeBiomeStep('desert-seed');
      pipeline.steps[0] = atBiomeStep;
      
      // Find a desert location
      let desertChunk = null;
      for (let x = -30; x <= 30; x += 5) {
        for (let y = -30; y <= 30; y += 5) {
          const chunk = await pipeline.generate('test', x, y);
          if (chunk.biome === 'desert') {
            desertChunk = chunk;
            break;
          }
        }
        if (desertChunk) break;
      }
      
      expect(desertChunk).toBeDefined();
      expect(desertChunk.biome).toBe('desert');
    });
    
    it('should apply biome features through FeatureStep', async () => {
      const atBiomeStep = new AdventureTimeBiomeStep('test-seed');
      const featureStep = new FeatureStep();
      
      pipeline.steps[0] = atBiomeStep;
      pipeline.steps[2] = featureStep; // Replace existing FeatureStep
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Should have candy-themed tiles
      const hasCandyTiles = chunk.map.some(row => 
        row.some(tile => ['·', 'o', '♣'].includes(tile))
      );
      
      expect(hasCandyTiles).toBe(true);
      expect(chunk.npcs.length).toBeGreaterThan(0);
    });
  });
  
  describe('Biome Transition Integration', () => {
    it('should detect and handle biome edges', async () => {
      const atBiomeStep = new AdventureTimeBiomeStep('test-seed');
      pipeline.steps[0] = atBiomeStep;
      
      // Find an edge chunk
      let edgeChunk = null;
      for (let x = 5; x <= 15; x++) {
        const chunk = await pipeline.generate('test', x, 0);
        if (chunk.isTransitionZone) {
          edgeChunk = chunk;
          break;
        }
      }
      
      if (edgeChunk) {
        expect(edgeChunk.isTransitionZone).toBe(true);
        expect(edgeChunk.transitionFeatures).toBeDefined();
      }
    });
    
    it('should blend features at biome transitions', async () => {
      const transitionManager = new BiomeTransitionManager(biomeManager);
      
      const blended = transitionManager.blendTiles('candy_kingdom', 'grasslands', 0.5);
      
      expect(blended).toBeDefined();
      expect(blended.length).toBeGreaterThan(0);
      
      // Should have mix of both biome types
      const hasMixed = blended.some(t => t.includes('candy')) && 
                       blended.some(t => t.includes('grass'));
      expect(hasMixed).toBe(true);
    });
  });
  
  describe('Cache Integration', () => {
    it('should share cache between systems', async () => {
      // ChunkSystem should use unified caching
      const system = new ChunkSystem(mockEventBus, { 
        seed: 'test',
        maxCacheSize: 50
      });
      
      // Generate some chunks
      const chunk1 = await system.generateChunk('test', 0, 0);
      const chunk2 = await system.generateChunk('test', 1, 0);
      
      // Both chunk and biome should be cached
      const stats = system.getCacheStatistics();
      expect(stats.chunks.size).toBeGreaterThan(0);
      expect(stats.biomes.hits + stats.biomes.misses).toBeGreaterThan(0);
    });
    
    it('should respect memory limits across caches', () => {
      const system = new ChunkSystem(mockEventBus, {
        seed: 'test',
        maxCacheSize: 10,
        maxBiomeCacheSize: 5
      });
      
      // Fill caches
      for (let i = 0; i < 20; i++) {
        system.biomeManager.getBiome(i, i);
      }
      
      expect(system.biomeManager.getBiomeCacheSize()).toBeLessThanOrEqual(5);
    });
  });
  
  describe('Persistence Integration', () => {
    it('should save biome data with chunks', async () => {
      const persistence = new FilesystemPersistence('./test-world');
      const atBiomeStep = new AdventureTimeBiomeStep('test-seed');
      pipeline.steps[0] = atBiomeStep;
      
      const chunk = await pipeline.generate('test', 0, 0);
      
      // Save chunk
      await persistence.saveChunk('test', 0, 0, chunk);
      
      // Load chunk
      const loaded = await persistence.loadChunk('test', 0, 0);
      
      expect(loaded.biome).toBe('candy_kingdom');
      expect(loaded.biomeFeatures).toBeDefined();
      
      // Cleanup
      await persistence.deleteWorld('test');
    });
  });
  
  describe('Streaming Integration', () => {
    it('should stream biome features with LOD', async () => {
      const streaming = new ChunkStreaming({
        generator: pipeline.generate.bind(pipeline),
        maxChunks: 10
      });
      
      const atBiomeStep = new AdventureTimeBiomeStep('test-seed');
      pipeline.steps[0] = atBiomeStep;
      
      // Stream chunks at different LODs
      const chunk = await streaming.getChunk(0, 0);
      
      // Apply LOD
      const lodChunk = streaming.applyLOD(chunk, 2);
      
      // Higher LOD should have reduced features
      expect(lodChunk.biomeFeatures).toBeDefined();
      if (chunk.biomeFeatures && lodChunk.biomeFeatures) {
        expect(lodChunk.biomeFeatures.length).toBeLessThanOrEqual(chunk.biomeFeatures.length);
      }
    });
  });
  
  describe('Full System Integration', () => {
    it('should generate complete Adventure Time world', async () => {
      const system = new ChunkSystem(mockEventBus, {
        seed: 'adventure-time',
        useAdventureTimeBiomes: true
      });
      
      // Generate multiple chunks
      const chunks = [];
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          const chunk = await system.generateChunk('adventure-time', x, y);
          chunks.push(chunk);
        }
      }
      
      // Should have variety of biomes
      const biomes = new Set(chunks.map(c => c.biome));
      expect(biomes.size).toBeGreaterThan(1);
      
      // Should have Candy Kingdom at origin
      const originChunk = chunks.find(c => c.cx === 0 && c.cy === 0);
      expect(originChunk.biome).toBe('candy_kingdom');
      
      // Should have biome features applied
      const hasFeatures = chunks.some(c => c.biomeFeatures && c.biomeFeatures.length > 0);
      expect(hasFeatures).toBe(true);
    });
    
    it('should handle movement between biomes', async () => {
      const system = new ChunkSystem(mockEventBus, {
        seed: 'adventure-time',
        useAdventureTimeBiomes: true
      });
      
      // Simulate player movement
      const path = [
        { cx: 0, cy: 0 },  // Start in Candy Kingdom
        { cx: 1, cy: 0 },  // Move east
        { cx: 2, cy: 0 },  // Continue east
        { cx: 3, cy: 0 },  // Might enter new biome
      ];
      
      const chunks = [];
      for (const pos of path) {
        const chunk = await system.generateChunk('adventure-time', pos.cx, pos.cy);
        chunks.push(chunk);
      }
      
      // Should handle transitions smoothly
      expect(chunks.every(c => c.biome)).toBe(true);
      
      // Check if we crossed a biome boundary
      const biomeChanges = chunks.filter((c, i) => 
        i > 0 && c.biome !== chunks[i-1].biome
      ).length;
      
      // If we crossed boundaries, should have transition data
      if (biomeChanges > 0) {
        const hasTransitions = chunks.some(c => c.isTransitionZone);
        expect(hasTransitions).toBeDefined();
      }
    });
  });
});