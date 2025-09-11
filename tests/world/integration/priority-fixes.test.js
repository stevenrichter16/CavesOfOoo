/**
 * TDD Tests for Priority Fixes in Phase 5 Integration
 * Tests async initialization, imports, error handling, and dependency injection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { ChunkPipeline } from '../../../src/js/world/pipeline/ChunkPipeline.js';
import { AdventureTimeBiomeStep } from '../../../src/js/world/pipeline/steps/AdventureTimeBiomeStep.js';
import { BiomeManager } from '../../../src/js/world/biome/BiomeManager.js';
import { BiomeFeatureGenerator } from '../../../src/js/world/biome/BiomeFeatureGenerator.js';
import { BiomeTransitionManager } from '../../../src/js/world/biome/BiomeTransitionManager.js';

describe('Priority Fixes', () => {
  
  describe('Async Initialization Fix', () => {
    it('should properly initialize BiomeManager asynchronously', async () => {
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true
      });
      
      expect(system.biomeManager).toBeDefined();
      expect(system.biomeManager).toBeInstanceOf(BiomeManager);
    });
    
    it('should wait for BiomeManager before setting up pipeline', async () => {
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true
      });
      
      // Check that pipeline has Adventure Time biome step
      const biomeStep = system.pipeline.steps[0];
      expect(biomeStep).toBeInstanceOf(AdventureTimeBiomeStep);
    });
    
    it('should handle initialization errors gracefully', async () => {
      // Mock import failure
      const originalImport = global.import;
      global.import = vi.fn().mockRejectedValue(new Error('Module not found'));
      
      let error;
      try {
        await ChunkSystem.create(null, {
          seed: 'test',
          useAdventureTimeBiomes: true,
          throwOnInitError: true
        });
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(error.message).toContain('Failed to initialize');
      
      global.import = originalImport;
    });
    
    it('should initialize in correct order', async () => {
      const initOrder = [];
      
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true,
        onInit: (component) => initOrder.push(component)
      });
      
      expect(initOrder).toEqual(['biomeManager', 'pipeline', 'cache']);
    });
  });
  
  describe('Standardized ES6 Imports', () => {
    it('should use consistent ES6 imports', async () => {
      // All imports should be ES6 style
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true
      });
      
      // Should not have any require() calls
      const sourceCode = ChunkSystem.toString();
      expect(sourceCode).not.toContain('require(');
    });
    
    it('should handle module loading failures', async () => {
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true,
        fallbackBiomeSystem: 'generic'
      });
      
      // Even if Adventure Time biomes fail, should fall back
      expect(system.pipeline.steps[0]).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle getBiome errors gracefully', async () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      // Mock biomeManager to throw error
      biomeStep.biomeManager.getBiome = vi.fn().mockImplementation(() => {
        throw new Error('Biome calculation failed');
      });
      
      const context = {
        cx: 0,
        cy: 0,
        chunk: { map: [], biome: null },
        params: {}
      };
      
      // Should not throw, should use fallback
      await biomeStep.process(context);
      
      expect(context.chunk.biome).toBe('grasslands'); // Fallback biome
      expect(context.params.biomeError).toBeDefined();
    });
    
    it('should handle feature generation errors', async () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      // Mock featureGenerator to throw error
      biomeStep.featureGenerator.generateFeatures = vi.fn().mockImplementation(() => {
        throw new Error('Feature generation failed');
      });
      
      const context = {
        cx: 0,
        cy: 0,
        chunk: { map: [], biome: 'candy_kingdom' },
        params: {}
      };
      
      await biomeStep.process(context);
      
      // Should continue without features
      expect(context.chunk.biomeFeatures).toEqual([]);
      expect(context.params.featureError).toBeDefined();
    });
    
    it('should handle empty chunk.map safely', async () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      const context = {
        cx: 0,
        cy: 0,
        chunk: { map: [] }, // Empty map
        params: {}
      };
      
      // Should not crash
      await biomeStep.process(context);
      
      expect(context.chunk.biome).toBeDefined();
    });
    
    it('should validate context before processing', async () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      // Invalid context
      const invalidContexts = [
        null,
        undefined,
        {},
        { chunk: null },
        { cx: 0, cy: 0 } // Missing chunk
      ];
      
      for (const context of invalidContexts) {
        const result = await biomeStep.process(context);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid context');
      }
    });
  });
  
  describe('Dependency Injection', () => {
    it('should accept managers via constructor', () => {
      const mockBiomeManager = new BiomeManager('test');
      const mockFeatureGenerator = new BiomeFeatureGenerator('test');
      
      const biomeStep = new AdventureTimeBiomeStep('test', {
        biomeManager: mockBiomeManager,
        featureGenerator: mockFeatureGenerator
      });
      
      expect(biomeStep.biomeManager).toBe(mockBiomeManager);
      expect(biomeStep.featureGenerator).toBe(mockFeatureGenerator);
    });
    
    it('should create default managers if not provided', () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      expect(biomeStep.biomeManager).toBeInstanceOf(BiomeManager);
      expect(biomeStep.featureGenerator).toBeInstanceOf(BiomeFeatureGenerator);
    });
    
    it('should share managers between steps', async () => {
      const sharedBiomeManager = new BiomeManager('test');
      
      const pipeline = new ChunkPipeline();
      pipeline.steps[0] = new AdventureTimeBiomeStep('test', {
        biomeManager: sharedBiomeManager
      });
      
      // Same manager should be used
      const step = pipeline.steps[0];
      expect(step.biomeManager).toBe(sharedBiomeManager);
    });
    
    it('should allow mocking for tests', () => {
      const mockBiomeManager = {
        getBiome: vi.fn().mockReturnValue('test_biome'),
        getBiomeDefinition: vi.fn().mockReturnValue({ name: 'Test Biome' })
      };
      
      const biomeStep = new AdventureTimeBiomeStep('test', {
        biomeManager: mockBiomeManager
      });
      
      const context = {
        cx: 0,
        cy: 0,
        chunk: { map: [] },
        params: {}
      };
      
      biomeStep.process(context);
      
      expect(mockBiomeManager.getBiome).toHaveBeenCalledWith(0, 0);
      expect(context.chunk.biome).toBe('test_biome');
    });
  });
  
  describe('Pipeline Step Replacement', () => {
    it('should find and replace BiomeStep by name', async () => {
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true
      });
      
      // Should replace by finding BiomeStep, not assuming index
      const biomeSteps = system.pipeline.steps.filter(
        step => step.name === 'BiomeStep' || step.name === 'AdventureTimeBiomeStep'
      );
      
      expect(biomeSteps.length).toBe(1);
      expect(biomeSteps[0].name).toBe('AdventureTimeBiomeStep');
    });
    
    it('should handle missing BiomeStep gracefully', async () => {
      const pipeline = new ChunkPipeline();
      pipeline.steps = []; // No steps
      
      const system = await ChunkSystem.create(null, {
        seed: 'test',
        useAdventureTimeBiomes: true,
        pipeline: pipeline
      });
      
      // Should add Adventure Time biome step
      expect(system.pipeline.steps.length).toBeGreaterThan(0);
      expect(system.pipeline.steps[0]).toBeInstanceOf(AdventureTimeBiomeStep);
    });
  });
  
  describe('Safe Array Access', () => {
    it('should safely check chunk map dimensions', () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      const testCases = [
        { map: [] },
        { map: [[]] },
        { map: null },
        { map: undefined },
        { map: [['#', '.'], ['#', '.']] }
      ];
      
      for (const chunk of testCases) {
        const dims = biomeStep.getChunkDimensions(chunk);
        expect(dims.width).toBeGreaterThanOrEqual(0);
        expect(dims.height).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should not crash on empty map when applying tiles', () => {
      const biomeStep = new AdventureTimeBiomeStep('test');
      
      const chunk = { map: [] };
      const features = {
        tiles: [{ x: 0, y: 0, char: '#' }]
      };
      
      // Should not throw
      expect(() => {
        biomeStep.applyBiomeTiles(chunk, features);
      }).not.toThrow();
    });
  });
  
  describe('Seeded Random Usage', () => {
    it('should use seeded random for consistency', () => {
      const biomeStep = new AdventureTimeBiomeStep('test-seed');
      
      const context1 = {
        cx: 0,
        cy: 0,
        chunk: { map: Array(22).fill().map(() => Array(24).fill('.')) },
        params: {},
        rng: biomeStep.createSeededRandom(0, 0)
      };
      
      const context2 = {
        cx: 0,
        cy: 0,
        chunk: { map: Array(22).fill().map(() => Array(24).fill('.')) },
        params: {},
        rng: biomeStep.createSeededRandom(0, 0)
      };
      
      biomeStep.process(context1);
      biomeStep.process(context2);
      
      // Should produce identical results
      expect(context1.chunk.biome).toBe(context2.chunk.biome);
    });
  });
});