/**
 * PathExecutor - Executes movement along calculated paths
 * Handles step-by-step movement, interruptions, and animations
 */
import { getGameEventBus } from '../systems/EventBus.js';
import { getMovementPipeline } from '../movement/MovementPipeline.js';

// Configuration constants
export const PATH_EXECUTOR_CONFIG = {
  defaultStepDelay: 200,
  defaultAnimateMovement: true,
  defaultStopOnCombat: true,
  defaultConsumeStamina: true,
  minStepDelay: 10,
  maxStepDelay: 1000
};

export class PathExecutor {
  /**
   * Create a new path executor
   * @param {EventBus} eventBus - Event bus for communication
   * @param {MovementPipeline} movementPipeline - Movement pipeline for executing steps
   * @param {Object} options - Configuration options
   */
  constructor(eventBus = null, movementPipeline = null, options = {}) {
    this.eventBus = eventBus || getGameEventBus();
    this.movementPipeline = movementPipeline || getMovementPipeline();
    
    // Configuration
    this.stepDelay = options.stepDelay || PATH_EXECUTOR_CONFIG.defaultStepDelay;
    this.animateMovement = options.animateMovement !== undefined ? 
      options.animateMovement : PATH_EXECUTOR_CONFIG.defaultAnimateMovement;
    this.stopOnCombat = options.stopOnCombat !== undefined ? 
      options.stopOnCombat : PATH_EXECUTOR_CONFIG.defaultStopOnCombat;
    this.consumeStamina = options.consumeStamina !== undefined ? 
      options.consumeStamina : PATH_EXECUTOR_CONFIG.defaultConsumeStamina;
    
    // Execution state
    this.isExecuting = false;
    this.currentPath = null;
    this.currentStep = 0;
    this.cancelled = false;
    
    // Event handlers
    this.handlers = {};
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   * @private
   */
  setupEventHandlers() {
    // Could listen for interruption events here
    this.handlers.pause = () => {
      this.pause();
    };
    
    this.handlers.cancel = () => {
      this.cancel();
    };
    
    if (this.eventBus) {
      this.eventBus.on('PausePathExecution', this.handlers.pause);
      this.eventBus.on('CancelPathExecution', this.handlers.cancel);
    }
  }

  /**
   * Execute movement along a path
   * @param {Object} state - Game state
   * @param {Array} path - Array of positions to move through
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executePath(state, path, options = {}) {
    // Validate inputs
    if (!state || !state.player) {
      return {
        success: false,
        reason: 'invalid_state',
        stepsCompleted: 0
      };
    }
    
    if (!path || !Array.isArray(path)) {
      return {
        success: false,
        reason: 'invalid_path',
        stepsCompleted: 0
      };
    }
    
    // Check if already executing
    if (this.isExecuting) {
      return {
        success: false,
        reason: 'already_executing',
        stepsCompleted: 0
      };
    }
    
    // Initialize execution
    this.isExecuting = true;
    this.currentPath = [...path];
    this.currentStep = 0;
    this.cancelled = false;
    
    // Calculate costs
    const totalCost = options.totalCost || 
      (options.costPerStep ? options.costPerStep * (path.length - 1) : 0);
    
    // Check initial stamina
    if (this.consumeStamina && totalCost > 0) {
      if (!state.player.stamina || state.player.stamina < totalCost) {
        // Check if we can do partial execution
        const affordableSteps = Math.floor((state.player.stamina || 0) / (options.costPerStep || 1));
        if (affordableSteps === 0) {
          this.isExecuting = false;
          return {
            success: false,
            reason: 'insufficient_stamina',
            stepsCompleted: 0
          };
        }
      }
    }
    
    // Emit start event
    await this.eventBus?.emitAsync('PathExecutionStarted', {
      path: [...path],
      totalSteps: path.length - 1,
      totalCost
    });
    
    // Execute path
    const result = await this.executeSteps(state, path, options);
    
    // Clean up
    this.isExecuting = false;
    this.currentPath = null;
    this.currentStep = 0;
    
    // Emit complete event
    await this.eventBus?.emitAsync('PathExecutionComplete', result);
    
    return result;
  }

  /**
   * Execute individual steps along path
   * @private
   * @param {Object} state - Game state
   * @param {Array} path - Path array
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeSteps(state, path, options) {
    let stepsCompleted = 0;
    let totalStaminaConsumed = 0;
    
    // Skip first position (current position)
    for (let i = 1; i < path.length; i++) {
      // Check cancellation
      if (this.cancelled) {
        return {
          success: false,
          cancelled: true,
          stepsCompleted,
          reason: 'user_cancelled'
        };
      }
      
      // Check pause state
      if (state.paused) {
        return {
          success: false,
          paused: true,
          stepsCompleted,
          reason: 'game_paused'
        };
      }
      
      const from = i === 1 ? 
        { x: state.player.x, y: state.player.y } : 
        path[i - 1];
      const to = path[i];
      
      // Calculate movement delta
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      
      // Check stamina for this step
      const stepCost = options.costPerStep || 1;
      if (this.consumeStamina && stepCost > 0) {
        if (!state.player.stamina || state.player.stamina < stepCost) {
          return {
            success: false,
            stepsCompleted,
            interrupted: true,
            reason: 'insufficient_stamina'
          };
        }
      }
      
      // Animate if enabled
      if (this.animateMovement && !options.skipAnimation) {
        await this.animateStep(from, to, options);
      }
      
      // Execute movement
      let moveResult;
      try {
        moveResult = await this.movementPipeline.execute(state, {
          type: 'move',
          dx,
          dy
        });
      } catch (error) {
        return {
          success: false,
          stepsCompleted,
          error: error.message,
          reason: 'movement_error'
        };
      }
      
      // Update position (movement pipeline should do this, but ensure it)
      if (moveResult.moved) {
        state.player.x = to.x;
        state.player.y = to.y;
      }
      
      // Consume stamina
      if (this.consumeStamina && stepCost > 0 && moveResult.moved) {
        state.player.stamina = Math.max(0, (state.player.stamina || 0) - stepCost);
        totalStaminaConsumed += stepCost;
      }
      
      // Emit step event
      await this.eventBus?.emitAsync('PathExecutionStep', {
        step: i,
        from,
        to,
        result: moveResult,
        stepsRemaining: path.length - i - 1
      });
      
      // Call custom callback
      if (options.onStep) {
        options.onStep({
          step: i,
          position: to,
          result: moveResult
        });
      }
      
      // Check for interruptions
      if (!moveResult.success) {
        return {
          success: false,
          stepsCompleted: stepsCompleted + (moveResult.moved ? 1 : 0),
          interrupted: true,
          reason: moveResult.reason || 'blocked'
        };
      }
      
      // Check for combat
      if (moveResult.attacked && this.stopOnCombat) {
        return {
          success: false,
          stepsCompleted: stepsCompleted + (moveResult.moved ? 1 : 0),
          interrupted: true,
          reason: 'combat'
        };
      }
      
      stepsCompleted++;
      this.currentStep = i;
      
      // Add delay between steps
      if (this.animateMovement && !options.skipAnimation && i < path.length - 1) {
        const delay = options.stepDelay || this.stepDelay;
        await this.delay(delay);
      }
    }
    
    // Handle total cost if provided (deduct difference)
    if (this.consumeStamina && options.totalCost && !options.costPerStep) {
      const remainingCost = options.totalCost - totalStaminaConsumed;
      if (remainingCost > 0) {
        state.player.stamina = Math.max(0, (state.player.stamina || 0) - remainingCost);
      }
    }
    
    return {
      success: true,
      stepsCompleted,
      staminaConsumed: totalStaminaConsumed
    };
  }

  /**
   * Animate a single step
   * @private
   * @param {Object} from - Starting position
   * @param {Object} to - Target position
   * @param {Object} options - Animation options
   */
  async animateStep(from, to, options) {
    await this.eventBus?.emitAsync('PathStepAnimate', {
      from,
      to,
      progress: 0,
      duration: options.stepDelay || this.stepDelay
    });
  }

  /**
   * Delay for animation
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel current execution
   */
  cancel() {
    this.cancelled = true;
  }

  /**
   * Pause current execution
   */
  pause() {
    // Could implement pause logic here
    // For now, just cancel
    this.cancelled = true;
  }

  /**
   * Resume from saved state
   * @param {Object} state - Game state
   * @returns {Promise<Object>} Execution result
   */
  async resume(state, options = {}) {
    if (!this.currentPath || this.currentStep === 0) {
      return {
        success: false,
        reason: 'nothing_to_resume'
      };
    }
    
    // Create sub-path from current position
    const remainingPath = this.currentPath.slice(this.currentStep);
    
    // Reset state for new execution
    this.currentPath = null;
    this.currentStep = 0;
    this.isExecuting = false;
    
    // Execute remaining path
    const result = await this.executePath(state, remainingPath, options);
    
    // Adjust steps completed to account for already completed steps
    if (result.stepsCompleted !== undefined) {
      result.stepsCompleted = result.stepsCompleted;
    }
    
    return result;
  }

  /**
   * Save execution state
   * @returns {Object} Saved state
   */
  saveState() {
    return {
      isExecuting: this.isExecuting,
      currentPath: this.currentPath ? [...this.currentPath] : null,
      currentStep: this.currentStep,
      cancelled: this.cancelled
    };
  }

  /**
   * Restore execution state
   * @param {Object} saved - Saved state
   */
  restoreState(saved) {
    if (!saved) return;
    
    this.isExecuting = saved.isExecuting || false;
    this.currentPath = saved.currentPath ? [...saved.currentPath] : null;
    this.currentStep = saved.currentStep || 0;
    this.cancelled = saved.cancelled || false;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Cancel any ongoing execution
    this.cancelled = true;
    
    // Clear state
    this.currentPath = null;
    this.currentStep = 0;
    this.isExecuting = false;
    
    // Remove event handlers
    if (this.eventBus) {
      if (this.handlers.pause) {
        this.eventBus.off('PausePathExecution', this.handlers.pause);
      }
      if (this.handlers.cancel) {
        this.eventBus.off('CancelPathExecution', this.handlers.cancel);
      }
    }
    
    this.handlers = {};
  }
}

// Factory function for creating path executor
let _pathExecutor = null;

/**
 * Get or create the path executor instance
 * @param {EventBus} eventBus - Event bus
 * @param {MovementPipeline} movementPipeline - Movement pipeline
 * @param {Object} options - Configuration options
 * @returns {PathExecutor} The path executor instance
 */
export function getPathExecutor(eventBus = null, movementPipeline = null, options = {}) {
  if (!_pathExecutor) {
    _pathExecutor = new PathExecutor(eventBus, movementPipeline, options);
  }
  return _pathExecutor;
}

/**
 * Reset the path executor (useful for testing)
 */
export function resetPathExecutor() {
  if (_pathExecutor) {
    _pathExecutor.cleanup();
  }
  _pathExecutor = null;
}