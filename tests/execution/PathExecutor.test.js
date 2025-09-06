import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathExecutor } from '../../src/js/execution/PathExecutor.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';

describe('PathExecutor', () => {
  let pathExecutor;
  let eventBus;
  let mockMovementPipeline;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Mock movement pipeline
    mockMovementPipeline = {
      execute: vi.fn(async (state, action) => ({
        success: true,
        moved: true,
        step: 'completed',
        metrics: {}
      }))
    };
    
    pathExecutor = new PathExecutor(eventBus, mockMovementPipeline);
    
    // Create test state
    mockState = {
      player: {
        x: 5,
        y: 5,
        stamina: 20,
        maxStamina: 30,
        hp: 10,
        maxHp: 10
      },
      cursor: {
        visible: false
      },
      chunk: {
        width: 20,
        height: 20
      },
      entities: [],
      npcs: [],
      paused: false
    };
  });

  describe('constructor', () => {
    it('should initialize with event bus and movement pipeline', () => {
      expect(pathExecutor.eventBus).toBe(eventBus);
      expect(pathExecutor.movementPipeline).toBe(mockMovementPipeline);
      expect(pathExecutor.isExecuting).toBe(false);
    });

    it('should have default configuration', () => {
      expect(pathExecutor.stepDelay).toBe(200);
      expect(pathExecutor.animateMovement).toBe(true);
      expect(pathExecutor.stopOnCombat).toBe(true);
      expect(pathExecutor.consumeStamina).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customExecutor = new PathExecutor(eventBus, mockMovementPipeline, {
        stepDelay: 100,
        animateMovement: false,
        stopOnCombat: false,
        consumeStamina: false
      });
      
      expect(customExecutor.stepDelay).toBe(100);
      expect(customExecutor.animateMovement).toBe(false);
      expect(customExecutor.stopOnCombat).toBe(false);
      expect(customExecutor.consumeStamina).toBe(false);
    });
  });

  describe('executePath', () => {
    it('should execute movement along path', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(3); // 3 moves (excluding start)
      expect(mockMovementPipeline.execute).toHaveBeenCalledTimes(3);
    });

    it('should skip first position (current position)', async () => {
      const path = [
        { x: 5, y: 5 }, // Current position
        { x: 6, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path);
      
      expect(mockMovementPipeline.execute).toHaveBeenCalledTimes(1);
      expect(mockMovementPipeline.execute).toHaveBeenCalledWith(
        mockState,
        expect.objectContaining({
          type: 'move',
          dx: 1,
          dy: 0
        })
      );
    });

    it('should handle empty path', async () => {
      const result = await pathExecutor.executePath(mockState, []);
      
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(0);
      expect(mockMovementPipeline.execute).not.toHaveBeenCalled();
    });

    it('should handle single position path', async () => {
      const path = [{ x: 5, y: 5 }]; // Just current position
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(0);
      expect(mockMovementPipeline.execute).not.toHaveBeenCalled();
    });

    it('should emit events during execution', async () => {
      const startSpy = vi.fn();
      const stepSpy = vi.fn();
      const completeSpy = vi.fn();
      
      eventBus.on('PathExecutionStarted', startSpy);
      eventBus.on('PathExecutionStep', stepSpy);
      eventBus.on('PathExecutionComplete', completeSpy);
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path);
      
      expect(startSpy).toHaveBeenCalledOnce();
      expect(stepSpy).toHaveBeenCalledTimes(2);
      expect(completeSpy).toHaveBeenCalledOnce();
    });

    it('should update player position after each step', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path);
      
      // Player should end at last position
      expect(mockState.player.x).toBe(7);
      expect(mockState.player.y).toBe(5);
    });
  });

  describe('interruption handling', () => {
    it('should stop on failed movement', async () => {
      mockMovementPipeline.execute = vi.fn()
        .mockResolvedValueOnce({ success: true, moved: true })
        .mockResolvedValueOnce({ success: false, moved: false, reason: 'blocked' });
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.stepsCompleted).toBe(1);
      expect(result.interrupted).toBe(true);
      expect(result.reason).toBe('blocked');
    });

    it('should stop on combat if configured', async () => {
      mockMovementPipeline.execute = vi.fn()
        .mockResolvedValueOnce({ success: true, moved: true })
        .mockResolvedValueOnce({ success: true, moved: false, attacked: true });
      
      pathExecutor.stopOnCombat = true;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.stepsCompleted).toBe(1);
      expect(result.interrupted).toBe(true);
      expect(result.reason).toBe('combat');
    });

    it('should continue through combat if configured', async () => {
      mockMovementPipeline.execute = vi.fn()
        .mockResolvedValueOnce({ success: true, moved: true })
        .mockResolvedValueOnce({ success: true, moved: false, attacked: true })
        .mockResolvedValueOnce({ success: true, moved: true });
      
      pathExecutor.stopOnCombat = false;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(3);
    });

    it('should handle cancellation', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      // Cancel after first step
      mockMovementPipeline.execute = vi.fn(async () => {
        if (mockMovementPipeline.execute.mock.calls.length === 1) {
          pathExecutor.cancel();
        }
        return { success: true, moved: true };
      });
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.stepsCompleted).toBe(1);
    });

    it('should check pause state', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      // Pause after first step
      mockMovementPipeline.execute = vi.fn(async () => {
        if (mockMovementPipeline.execute.mock.calls.length === 1) {
          mockState.paused = true;
        }
        return { success: true, moved: true };
      });
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.paused).toBe(true);
      expect(result.stepsCompleted).toBe(1);
    });
  });

  describe('stamina consumption', () => {
    it('should consume stamina per step if configured', async () => {
      pathExecutor.consumeStamina = true;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path, { costPerStep: 2 });
      
      expect(mockState.player.stamina).toBe(16); // 20 - (2 * 2 steps)
    });

    it('should stop when stamina runs out', async () => {
      pathExecutor.consumeStamina = true;
      mockState.player.stamina = 3;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path, { costPerStep: 2 });
      
      expect(result.success).toBe(false);
      expect(result.stepsCompleted).toBe(1); // Only 1 step (cost 2)
      expect(result.reason).toBe('insufficient_stamina');
      expect(mockState.player.stamina).toBe(1);
    });

    it('should not consume stamina if disabled', async () => {
      pathExecutor.consumeStamina = false;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path, { costPerStep: 2 });
      
      expect(mockState.player.stamina).toBe(20); // Unchanged
    });

    it('should use path cost from options', async () => {
      pathExecutor.consumeStamina = true;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path, { 
        totalCost: 5 // Pre-calculated total cost
      });
      
      expect(mockState.player.stamina).toBe(15); // 20 - 5
    });
  });

  describe('animation', () => {
    it('should delay between steps if animated', async () => {
      pathExecutor.animateMovement = true;
      pathExecutor.stepDelay = 50;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      const startTime = Date.now();
      await pathExecutor.executePath(mockState, path);
      const elapsed = Date.now() - startTime;
      
      // Allow some tolerance for timing
      expect(elapsed).toBeGreaterThanOrEqual(45); // At least close to 50ms per step
    });

    it('should not delay if animation disabled', async () => {
      pathExecutor.animateMovement = false;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      const startTime = Date.now();
      await pathExecutor.executePath(mockState, path);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(50); // Should be nearly instant
    });

    it('should emit animation events', async () => {
      const animateSpy = vi.fn();
      eventBus.on('PathStepAnimate', animateSpy);
      
      pathExecutor.animateMovement = true;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path);
      
      expect(animateSpy).toHaveBeenCalledTimes(2);
      expect(animateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { x: 5, y: 5 },
          to: { x: 6, y: 5 },
          progress: 0
        }),
        expect.any(Object)
      );
    });
  });

  describe('state preservation', () => {
    it('should save and restore execution state', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      pathExecutor.isExecuting = true;
      pathExecutor.currentPath = path;
      pathExecutor.currentStep = 1;
      
      const saved = pathExecutor.saveState();
      
      expect(saved.isExecuting).toBe(true);
      expect(saved.currentPath).toEqual(path);
      expect(saved.currentStep).toBe(1);
      
      // Modify state
      pathExecutor.isExecuting = false;
      pathExecutor.currentPath = null;
      pathExecutor.currentStep = 0;
      
      // Restore
      pathExecutor.restoreState(saved);
      
      expect(pathExecutor.isExecuting).toBe(true);
      expect(pathExecutor.currentPath).toEqual(path);
      expect(pathExecutor.currentStep).toBe(1);
    });

    it('should resume execution from saved state', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      // Simulate partial execution
      const saved = {
        currentPath: path,
        currentStep: 2, // Already completed 2 steps
        isExecuting: false
      };
      
      pathExecutor.restoreState(saved);
      const result = await pathExecutor.resume(mockState);
      
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(1); // Complete remaining 1 step (from index 2 to 3)
      expect(mockMovementPipeline.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent execution prevention', () => {
    it('should prevent concurrent executions', async () => {
      const path1 = [
        { x: 5, y: 5 },
        { x: 6, y: 5 }
      ];
      
      const path2 = [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ];
      
      // Slow down first execution
      pathExecutor.stepDelay = 100;
      
      // Start first execution
      const promise1 = pathExecutor.executePath(mockState, path1);
      
      // Try to start second execution immediately
      const promise2 = pathExecutor.executePath(mockState, path2);
      
      const result2 = await promise2;
      
      expect(result2.success).toBe(false);
      expect(result2.reason).toBe('already_executing');
      
      // First should complete normally
      const result1 = await promise1;
      expect(result1.success).toBe(true);
    });

    it('should allow execution after previous completes', async () => {
      const path1 = [{ x: 5, y: 5 }, { x: 6, y: 5 }];
      const path2 = [{ x: 6, y: 5 }, { x: 7, y: 5 }];
      
      const result1 = await pathExecutor.executePath(mockState, path1);
      expect(result1.success).toBe(true);
      
      const result2 = await pathExecutor.executePath(mockState, path2);
      expect(result2.success).toBe(true);
    });
  });

  describe('options handling', () => {
    it('should respect skipAnimation option', async () => {
      pathExecutor.animateMovement = true;
      pathExecutor.stepDelay = 100;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      const startTime = Date.now();
      await pathExecutor.executePath(mockState, path, { skipAnimation: true });
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(50); // Should override animation
    });

    it('should use custom step delay', async () => {
      pathExecutor.animateMovement = true;
      pathExecutor.stepDelay = 100;
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      const startTime = Date.now();
      await pathExecutor.executePath(mockState, path, { stepDelay: 20 });
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(100); // Should be much less than default
      expect(elapsed).toBeGreaterThanOrEqual(15); // Allow some tolerance
    });

    it('should call onStep callback', async () => {
      const onStepSpy = vi.fn();
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path, {
        onStep: onStepSpy
      });
      
      expect(onStepSpy).toHaveBeenCalledTimes(2);
      expect(onStepSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 1,
          position: { x: 6, y: 5 },
          result: expect.any(Object)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle movement pipeline errors', async () => {
      mockMovementPipeline.execute = vi.fn()
        .mockRejectedValueOnce(new Error('Movement failed'));
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Movement failed');
      expect(result.stepsCompleted).toBe(0);
    });

    it('should handle invalid path', async () => {
      const result = await pathExecutor.executePath(mockState, null);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_path');
    });

    it('should handle invalid state', async () => {
      const path = [{ x: 5, y: 5 }, { x: 6, y: 5 }];
      
      const result = await pathExecutor.executePath(null, path);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_state');
    });
  });

  describe('cleanup', () => {
    it('should clean up on destroy', () => {
      pathExecutor.currentPath = [{ x: 5, y: 5 }];
      pathExecutor.isExecuting = true;
      
      pathExecutor.cleanup();
      
      expect(pathExecutor.currentPath).toBeNull();
      expect(pathExecutor.isExecuting).toBe(false);
      expect(pathExecutor.cancelled).toBe(true);
    });

    it('should remove event listeners', () => {
      const offSpy = vi.spyOn(eventBus, 'off');
      
      pathExecutor.cleanup();
      
      expect(offSpy).toHaveBeenCalled();
    });
  });
});