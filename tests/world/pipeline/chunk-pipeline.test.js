/**
 * Tests for ChunkPipeline
 * Testing the chunk generation pipeline orchestration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChunkPipeline', () => {
  let ChunkPipeline, PipelineStep, Chunk;
  
  beforeEach(async () => {
    const pipelineModule = await import('../../../src/js/world/pipeline/ChunkPipeline.js');
    const stepModule = await import('../../../src/js/world/pipeline/PipelineStep.js');
    const chunkModule = await import('../../../src/js/world/core/Chunk.js');
    
    ChunkPipeline = pipelineModule.ChunkPipeline;
    PipelineStep = stepModule.PipelineStep;
    Chunk = chunkModule.Chunk;
  });
  
  describe('Pipeline Setup', () => {
    it('should initialize with default steps', () => {
      const pipeline = new ChunkPipeline();
      
      expect(pipeline.steps).toBeDefined();
      expect(pipeline.steps.length).toBeGreaterThan(0);
      
      // Should have the standard steps
      const stepNames = pipeline.steps.map(s => s.name);
      expect(stepNames).toContain('BiomeStep');
      expect(stepNames).toContain('StructureStep');
      expect(stepNames).toContain('FeatureStep');
      expect(stepNames).toContain('PopulationStep');
      expect(stepNames).toContain('ValidationStep');
    });
    
    it('should allow custom pipeline configuration', () => {
      const pipeline = new ChunkPipeline();
      
      const customStep = new PipelineStep('CustomStep');
      pipeline.addStep(customStep);
      
      expect(pipeline.steps).toContain(customStep);
    });
    
    it('should clear and rebuild pipeline', () => {
      const pipeline = new ChunkPipeline();
      const originalLength = pipeline.steps.length;
      
      pipeline.clearSteps();
      expect(pipeline.steps.length).toBe(0);
      
      pipeline.setupDefaultPipeline();
      expect(pipeline.steps.length).toBe(originalLength);
    });
  });
  
  describe('Context Management', () => {
    it('should create context with required fields', async () => {
      const pipeline = new ChunkPipeline();
      
      const seed = 'test-seed';
      const cx = 5;
      const cy = -3;
      
      // Mock a step to capture context
      let capturedContext;
      const testStep = {
        name: 'TestStep',
        process: async (context) => {
          capturedContext = context;
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(testStep);
      
      await pipeline.generate(seed, cx, cy);
      
      expect(capturedContext).toBeDefined();
      expect(capturedContext.seed).toBe(seed);
      expect(capturedContext.cx).toBe(cx);
      expect(capturedContext.cy).toBe(cy);
      expect(capturedContext.chunk).toBeInstanceOf(Chunk);
      expect(capturedContext.chunk.cx).toBe(cx);
      expect(capturedContext.chunk.cy).toBe(cy);
      expect(capturedContext.rng).toBeDefined();
      expect(capturedContext.params).toBeDefined();
    });
    
    it('should pass context between steps', async () => {
      const pipeline = new ChunkPipeline();
      
      const step1 = {
        name: 'Step1',
        process: async (context) => {
          context.params.fromStep1 = 'data1';
        }
      };
      
      const step2 = {
        name: 'Step2',
        process: async (context) => {
          context.params.fromStep2 = context.params.fromStep1 + '-data2';
        }
      };
      
      let finalContext;
      const step3 = {
        name: 'Step3',
        process: async (context) => {
          finalContext = context;
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(step1);
      pipeline.addStep(step2);
      pipeline.addStep(step3);
      
      await pipeline.generate('seed', 0, 0);
      
      expect(finalContext.params.fromStep1).toBe('data1');
      expect(finalContext.params.fromStep2).toBe('data1-data2');
    });
  });
  
  describe('Step Execution', () => {
    it('should execute steps in order', async () => {
      const pipeline = new ChunkPipeline();
      const executionOrder = [];
      
      const createStep = (name) => ({
        name,
        process: async () => {
          executionOrder.push(name);
        }
      });
      
      pipeline.clearSteps();
      pipeline.addStep(createStep('First'));
      pipeline.addStep(createStep('Second'));
      pipeline.addStep(createStep('Third'));
      
      await pipeline.generate('seed', 0, 0);
      
      expect(executionOrder).toEqual(['First', 'Second', 'Third']);
    });
    
    it('should handle async steps', async () => {
      const pipeline = new ChunkPipeline();
      
      let completed = false;
      const asyncStep = {
        name: 'AsyncStep',
        process: async (context) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          completed = true;
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(asyncStep);
      
      const chunk = await pipeline.generate('seed', 0, 0);
      
      expect(completed).toBe(true);
      expect(chunk).toBeInstanceOf(Chunk);
    });
    
    it('should stop execution when context is cancelled', async () => {
      const pipeline = new ChunkPipeline();
      const executed = [];
      
      const step1 = {
        name: 'Step1',
        process: async (context) => {
          executed.push('Step1');
          context.cancelled = true; // Cancel pipeline
        }
      };
      
      const step2 = {
        name: 'Step2',
        process: async () => {
          executed.push('Step2'); // Should not execute
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(step1);
      pipeline.addStep(step2);
      
      await pipeline.generate('seed', 0, 0);
      
      expect(executed).toEqual(['Step1']);
      expect(executed).not.toContain('Step2');
    });
  });
  
  describe('Error Handling', () => {
    it('should catch step errors and continue', async () => {
      const pipeline = new ChunkPipeline();
      const executed = [];
      
      const errorStep = {
        name: 'ErrorStep',
        process: async () => {
          executed.push('ErrorStep');
          throw new Error('Step failed');
        }
      };
      
      const nextStep = {
        name: 'NextStep',
        process: async () => {
          executed.push('NextStep');
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(errorStep);
      pipeline.addStep(nextStep);
      
      const chunk = await pipeline.generate('seed', 0, 0);
      
      // Should handle error and continue
      expect(executed).toContain('ErrorStep');
      expect(executed).toContain('NextStep');
      expect(chunk).toBeInstanceOf(Chunk);
    });
    
    it('should apply fallback generation on critical error', async () => {
      const pipeline = new ChunkPipeline();
      
      const criticalError = {
        name: 'CriticalStep',
        process: async () => {
          throw new Error('Critical failure');
        },
        critical: true // Marks step as critical
      };
      
      pipeline.clearSteps();
      pipeline.addStep(criticalError);
      
      const chunk = await pipeline.generate('seed', 0, 0);
      
      // Should have fallback generation (floor tiles)
      let hasFloorTiles = false;
      for (let y = 1; y < 21; y++) {
        for (let x = 1; x < 23; x++) {
          if (chunk.getTile(x, y) === '.') {
            hasFloorTiles = true;
            break;
          }
        }
      }
      
      expect(hasFloorTiles).toBe(true);
    });
    
    it('should emit error events', async () => {
      const eventBus = { emit: vi.fn() };
      const pipeline = new ChunkPipeline(eventBus);
      
      const errorStep = {
        name: 'ErrorStep',
        process: async () => {
          throw new Error('Test error');
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(errorStep);
      
      await pipeline.generate('seed', 5, -3);
      
      expect(eventBus.emit).toHaveBeenCalledWith('ChunkGenerationError', {
        step: 'ErrorStep',
        error: expect.any(Error),
        cx: 5,
        cy: -3
      });
    });
  });
  
  describe('Pipeline Return Value', () => {
    it('should return the generated chunk', async () => {
      const pipeline = new ChunkPipeline();
      
      const chunk = await pipeline.generate('seed', 10, 20);
      
      expect(chunk).toBeInstanceOf(Chunk);
      expect(chunk.cx).toBe(10);
      expect(chunk.cy).toBe(20);
    });
    
    it('should allow steps to modify the chunk', async () => {
      const pipeline = new ChunkPipeline();
      
      const modifyStep = {
        name: 'ModifyStep',
        process: async (context) => {
          context.chunk.setTile(5, 5, '.');
          context.chunk.biome = 'test-biome';
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(modifyStep);
      
      const chunk = await pipeline.generate('seed', 0, 0);
      
      expect(chunk.getTile(5, 5)).toBe('.');
      expect(chunk.biome).toBe('test-biome');
    });
  });
  
  describe('Seeded Random', () => {
    it('should provide consistent RNG for same seed and coordinates', async () => {
      const pipeline = new ChunkPipeline();
      
      const values1 = [];
      const values2 = [];
      
      const rngStep = {
        name: 'RNGStep',
        process: async (context) => {
          const values = context.params.values || [];
          values.push(context.rng.next());
          values.push(context.rng.next());
          values.push(context.rng.next());
          context.params.values = values;
        }
      };
      
      pipeline.clearSteps();
      pipeline.addStep(rngStep);
      
      // Generate with same seed and coords
      const chunk1 = await pipeline.generate('test-seed', 5, 5);
      values1.push(...chunk1.metadata.values || []);
      
      const chunk2 = await pipeline.generate('test-seed', 5, 5);
      values2.push(...chunk2.metadata.values || []);
      
      // Should produce same random values
      expect(values1).toEqual(values2);
      
      // Different coords should produce different values
      const chunk3 = await pipeline.generate('test-seed', 6, 5);
      const values3 = chunk3.metadata.values || [];
      
      expect(values3).not.toEqual(values1);
    });
  });
});