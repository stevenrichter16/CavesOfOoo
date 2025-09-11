/**
 * ChunkPipeline - Orchestrates chunk generation through pipeline steps
 * Manages the sequence of generation steps and error handling
 */

import { Chunk } from '../core/Chunk.js';
import { SeededRandom } from './SeededRandom.js';
import { BiomeStep } from './steps/BiomeStep.js';
import { StructureStep } from './steps/StructureStep.js';
import { FeatureStep } from './steps/FeatureStep.js';
import { PopulationStep } from './steps/PopulationStep.js';
import { ValidationStep } from './steps/ValidationStep.js';

/**
 * Pipeline for chunk generation
 */
export class ChunkPipeline {
  /**
   * Create a new chunk pipeline
   * @param {EventBus} eventBus - Optional event bus for error events
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.steps = [];
    this.setupDefaultPipeline();
  }
  
  /**
   * Setup the default generation pipeline
   */
  setupDefaultPipeline() {
    this.steps = [
      new BiomeStep(),
      new StructureStep(),
      new FeatureStep(),
      new PopulationStep(),
      new ValidationStep()
    ];
  }
  
  /**
   * Add a step to the pipeline
   * @param {PipelineStep} step - Step to add
   */
  addStep(step) {
    this.steps.push(step);
  }
  
  /**
   * Clear all steps from the pipeline
   */
  clearSteps() {
    this.steps = [];
  }
  
  /**
   * Generate a chunk using the pipeline
   * @param {string} seed - Generation seed
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @param {Object} options - Additional options
   * @returns {Promise<Chunk>} Generated chunk
   */
  async generate(seed, cx, cy, options = {}) {
    // Create context
    const context = {
      seed,
      cx,
      cy,
      chunk: new Chunk(cx, cy),
      rng: new SeededRandom(seed, cx, cy),
      params: {},
      cancelled: false,
      biomeManager: options.biomeManager || null
    };
    
    // Execute pipeline steps
    for (const step of this.steps) {
      try {
        // Check for cancellation
        if (context.cancelled) {
          console.log(`Pipeline cancelled at step ${step.name}`);
          break;
        }
        
        // Protect critical context properties
        const protectedChunk = context.chunk;
        const protectedCx = context.cx;
        const protectedCy = context.cy;
        
        // Execute step - handle both PipelineStep instances and plain objects
        if (step.execute) {
          await step.execute(context);
        } else if (step.process) {
          await step.process(context);
        }
        
        // Restore critical properties if corrupted
        if (!context.chunk) {
          console.warn(`Step ${step.name} corrupted context.chunk, restoring`);
          context.chunk = protectedChunk;
        }
        if (context.cx !== protectedCx || context.cy !== protectedCy) {
          console.warn(`Step ${step.name} modified coordinates, restoring`);
          context.cx = protectedCx;
          context.cy = protectedCy;
        }
        if (!context.params) {
          context.params = {};
        }
        
      } catch (error) {
        console.error(`Pipeline error at step ${step.name}:`, error);
        
        // Emit error event if eventBus available
        if (this.eventBus) {
          this.eventBus.emit('ChunkGenerationError', {
            step: step.name,
            error,
            cx: context.cx,
            cy: context.cy
          });
        }
        
        // Apply fallback if critical step failed
        if (step.critical) {
          this.applyFallbackGeneration(context.chunk);
          break;
        }
        
        // Otherwise continue with next step
      }
    }
    
    // Store generation params in metadata (if chunk still exists)
    if (context.chunk && context.chunk.metadata) {
      context.chunk.metadata.generationParams = context.params;
      if (context.params && context.params.values) {
        context.chunk.metadata.values = context.params.values;
      }
      // Mark chunk as generated
      context.chunk.generated = true;
    } else {
      // Chunk was corrupted, create fallback
      console.error('Chunk was corrupted during pipeline, creating fallback');
      context.chunk = new Chunk(context.cx, context.cy);
      this.applyFallbackGeneration(context.chunk);
    }
    
    return context.chunk;
  }
  
  /**
   * Apply fallback generation for critical failures
   * Creates a simple, guaranteed-valid chunk
   * @param {Chunk} chunk - Chunk to apply fallback to
   */
  applyFallbackGeneration(chunk) {
    // Create a simple open area with walls around edges
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 24; x++) {
        if (y === 0 || y === 21 || x === 0 || x === 23) {
          chunk.setTile(x, y, '#');
        } else {
          chunk.setTile(x, y, '.');
        }
      }
    }
    
    // Mark as fallback generated
    chunk.metadata.fallbackGenerated = true;
  }
}