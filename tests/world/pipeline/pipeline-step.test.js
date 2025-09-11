/**
 * Tests for PipelineStep base class
 * Testing the base class for all pipeline steps
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PipelineStep', () => {
  let PipelineStep;
  
  beforeEach(async () => {
    const module = await import('../../../src/js/world/pipeline/PipelineStep.js');
    PipelineStep = module.PipelineStep;
  });
  
  describe('Step Creation', () => {
    it('should create step with name', () => {
      const step = new PipelineStep('TestStep');
      
      expect(step.name).toBe('TestStep');
    });
    
    it('should have default enabled state', () => {
      const step = new PipelineStep('TestStep');
      
      expect(step.enabled).toBe(true);
    });
    
    it('should accept configuration options', () => {
      const step = new PipelineStep('TestStep', {
        enabled: false,
        priority: 10,
        critical: true
      });
      
      expect(step.enabled).toBe(false);
      expect(step.priority).toBe(10);
      expect(step.critical).toBe(true);
    });
  });
  
  describe('Process Method', () => {
    it('should have process method that must be overridden', async () => {
      const step = new PipelineStep('BaseStep');
      
      // Base class should throw when process is called
      await expect(step.process({})).rejects.toThrow('must implement process method');
    });
    
    it('should allow subclass to override process', async () => {
      class CustomStep extends PipelineStep {
        async process(context) {
          context.processed = true;
          return context;
        }
      }
      
      const step = new CustomStep('CustomStep');
      const context = {};
      
      await step.process(context);
      
      expect(context.processed).toBe(true);
    });
  });
  
  describe('Step Validation', () => {
    it('should validate context before processing', async () => {
      class ValidatingStep extends PipelineStep {
        validate(context) {
          if (!context.chunk) {
            throw new Error('Context must have chunk');
          }
          return true;
        }
        
        async process(context) {
          context.validated = true;
        }
      }
      
      const step = new ValidatingStep('ValidatingStep');
      
      // Should fail validation
      await expect(step.execute({})).rejects.toThrow('Context must have chunk');
      
      // Should pass validation
      const validContext = { chunk: {} };
      await step.execute(validContext);
      expect(validContext.validated).toBe(true);
    });
  });
  
  describe('Step Execution', () => {
    it('should skip disabled steps', async () => {
      class TestStep extends PipelineStep {
        async process(context) {
          context.executed = true;
        }
      }
      
      const step = new TestStep('TestStep', { enabled: false });
      const context = {};
      
      await step.execute(context);
      
      expect(context.executed).toBeUndefined();
    });
    
    it('should execute enabled steps', async () => {
      class TestStep extends PipelineStep {
        async process(context) {
          context.executed = true;
        }
      }
      
      const step = new TestStep('TestStep');
      const context = {};
      
      await step.execute(context);
      
      expect(context.executed).toBe(true);
    });
    
    it('should handle pre and post processing hooks', async () => {
      const order = [];
      
      class HookedStep extends PipelineStep {
        async preProcess(context) {
          order.push('pre');
          context.pre = true;
        }
        
        async process(context) {
          order.push('process');
          context.process = true;
        }
        
        async postProcess(context) {
          order.push('post');
          context.post = true;
        }
      }
      
      const step = new HookedStep('HookedStep');
      const context = {};
      
      await step.execute(context);
      
      expect(order).toEqual(['pre', 'process', 'post']);
      expect(context.pre).toBe(true);
      expect(context.process).toBe(true);
      expect(context.post).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should wrap errors with step information', async () => {
      class ErrorStep extends PipelineStep {
        async process() {
          throw new Error('Step processing failed');
        }
      }
      
      const step = new ErrorStep('ErrorStep');
      
      try {
        await step.execute({});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Step processing failed');
        expect(error.step).toBe('ErrorStep');
      }
    });
    
    it('should allow error recovery', async () => {
      class RecoverableStep extends PipelineStep {
        async process(context) {
          throw new Error('Recoverable error');
        }
        
        async handleError(error, context) {
          context.recovered = true;
          context.errorMessage = error.message;
        }
      }
      
      const step = new RecoverableStep('RecoverableStep');
      const context = {};
      
      await step.execute(context);
      
      expect(context.recovered).toBe(true);
      expect(context.errorMessage).toBe('Recoverable error');
    });
  });
  
  describe('Step Metadata', () => {
    it('should track execution time', async () => {
      class TimedStep extends PipelineStep {
        async process() {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      const step = new TimedStep('TimedStep');
      const context = {};
      
      const start = Date.now();
      await step.execute(context);
      const elapsed = Date.now() - start;
      
      expect(step.lastExecutionTime).toBeGreaterThan(0);
      expect(step.lastExecutionTime).toBeLessThanOrEqual(elapsed + 5);
    });
    
    it('should track execution count', async () => {
      class CountedStep extends PipelineStep {
        async process() {
          // Do nothing
        }
      }
      
      const step = new CountedStep('CountedStep');
      
      expect(step.executionCount).toBe(0);
      
      await step.execute({});
      expect(step.executionCount).toBe(1);
      
      await step.execute({});
      expect(step.executionCount).toBe(2);
    });
  });
  
  describe('Step Dependencies', () => {
    it('should declare required context fields', () => {
      class DependentStep extends PipelineStep {
        get requires() {
          return ['chunk', 'rng', 'biome'];
        }
        
        async process(context) {
          context.processed = true;
        }
      }
      
      const step = new DependentStep('DependentStep');
      
      expect(step.requires).toContain('chunk');
      expect(step.requires).toContain('rng');
      expect(step.requires).toContain('biome');
    });
    
    it('should declare provided context fields', () => {
      class ProviderStep extends PipelineStep {
        get provides() {
          return ['biome', 'temperature'];
        }
        
        async process(context) {
          context.biome = 'forest';
          context.temperature = 'moderate';
        }
      }
      
      const step = new ProviderStep('ProviderStep');
      
      expect(step.provides).toContain('biome');
      expect(step.provides).toContain('temperature');
    });
  });
});