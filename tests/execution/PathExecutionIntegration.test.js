import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathExecutor, resetPathExecutor } from '../../src/js/execution/PathExecutor.js';
import { MovementAnimator, resetMovementAnimator } from '../../src/js/execution/MovementAnimator.js';
import { CursorSystem, resetCursorSystem } from '../../src/js/cursor/CursorSystem.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { resetPathfindingSystem } from '../../src/js/pathfinding/PathfindingSystem.js';
import { resetMovementCostCalculator } from '../../src/js/pathfinding/MovementCostCalculator.js';

describe('Path Execution Integration', () => {
  let eventBus;
  let pathExecutor;
  let movementAnimator;
  let cursorSystem;
  let mockMovementPipeline;
  let mockRenderer;
  let mockState;

  beforeEach(() => {
    // Reset all singletons
    resetPathExecutor();
    resetMovementAnimator();
    resetCursorSystem();
    resetPathfindingSystem();
    resetMovementCostCalculator();
    
    eventBus = new EventBus();
    
    // Mock movement pipeline
    mockMovementPipeline = {
      execute: vi.fn(async (state, action) => ({
        success: true,
        moved: true,
        step: 'completed'
      }))
    };
    
    // Mock renderer
    mockRenderer = {
      drawSprite: vi.fn(),
      drawTile: vi.fn(),
      drawText: vi.fn(),
      drawLine: vi.fn(),
      clearTile: vi.fn(),
      setOffset: vi.fn(),
      resetOffset: vi.fn(),
      setColor: vi.fn(),
      resetColor: vi.fn()
    };
    
    // Create components
    pathExecutor = new PathExecutor(eventBus, mockMovementPipeline, {
      stepDelay: 10,
      animateMovement: false // Disable for faster tests
    });
    
    movementAnimator = new MovementAnimator(eventBus, mockRenderer, {
      defaultDuration: 10
    });
    
    cursorSystem = new CursorSystem(eventBus);
    
    // Mock pathfinding for cursor
    cursorSystem.pathfindingSystem = {
      findPath: vi.fn((start, end) => {
        // Simple straight-line path
        const path = [];
        let x = start.x;
        let y = start.y;
        
        while (x !== end.x || y !== end.y) {
          path.push({ x, y });
          if (x < end.x) x++;
          else if (x > end.x) x--;
          if (y < end.y) y++;
          else if (y > end.y) y--;
        }
        path.push({ x: end.x, y: end.y });
        
        return path;
      })
    };
    
    cursorSystem.movementCostCalculator = {
      getPathCost: vi.fn((path) => (path.length - 1) * 2)
    };
    
    // Create test state
    mockState = {
      player: {
        x: 5,
        y: 5,
        stamina: 50,
        maxStamina: 50,
        hp: 10,
        symbol: '@'
      },
      cursor: {
        x: 5,
        y: 5,
        visible: false,
        mode: 'movement'
      },
      chunk: {
        width: 20,
        height: 20,
        isPassable: vi.fn(() => true)
      },
      camera: { x: 0, y: 0 },
      tileSize: 16,
      paused: false
    };
  });

  describe('Cursor to Execution Flow', () => {
    it('should execute path when cursor confirms movement', async () => {
      // Show cursor
      await cursorSystem.show(mockState);
      
      // Move cursor to target
      cursorSystem.moveTo(mockState, 8, 8);
      
      // Verify path was calculated
      expect(mockState.cursor.path).toBeDefined();
      expect(mockState.cursor.path.length).toBeGreaterThan(0);
      
      // Setup listener for confirm event
      let confirmedPath = null;
      eventBus.on('CursorConfirm', async (event) => {
        confirmedPath = event.path;
        
        // Execute the path
        if (event.path && event.mode === 'movement') {
          await pathExecutor.executePath(mockState, event.path);
        }
      });
      
      // Simulate Enter key to confirm
      await cursorSystem.handleKeyPress(mockState, 'Enter');
      
      // Verify execution
      expect(confirmedPath).toBeDefined();
      expect(mockMovementPipeline.execute).toHaveBeenCalled();
      expect(mockState.player.x).toBe(8);
      expect(mockState.player.y).toBe(8);
    });

    it('should not execute when path is unreachable', async () => {
      // Mock unreachable path
      cursorSystem.pathfindingSystem.findPath = vi.fn(() => null);
      
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      
      // Path should be null
      expect(mockState.cursor.path).toBeNull();
      expect(mockState.cursor.reachable).toBeFalsy(); // Could be false or undefined
      
      // Try to confirm
      let eventFired = false;
      eventBus.on('CursorConfirm', () => {
        eventFired = true;
      });
      
      await cursorSystem.handleKeyPress(mockState, 'Enter');
      
      // Should not fire confirm event for unreachable in movement mode
      expect(eventFired).toBe(false);
    });

    it('should handle cursor cancellation during execution', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 10, 10);
      
      // Start execution
      eventBus.on('CursorConfirm', async (event) => {
        if (event.path) {
          const promise = pathExecutor.executePath(mockState, event.path, {
            stepDelay: 50
          });
          
          // Cancel after starting
          setTimeout(() => {
            pathExecutor.cancel();
          }, 20);
          
          const result = await promise;
          expect(result.cancelled).toBe(true);
        }
      });
      
      await cursorSystem.handleKeyPress(mockState, 'Enter');
    });
  });

  describe('Animation Integration', () => {
    it('should animate movement during path execution', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      // Listen for animation events
      const animationSpy = vi.fn();
      eventBus.on('PathStepAnimate', animationSpy);
      
      // Execute with animation
      pathExecutor.animateMovement = true;
      await pathExecutor.executePath(mockState, path);
      
      // Should emit animation events
      expect(animationSpy).toHaveBeenCalled();
    });

    it('should coordinate animator with executor', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 6 }
      ];
      
      // Listen for step animation
      eventBus.on('PathStepAnimate', async (event) => {
        // Animator responds to step events
        await movementAnimator.animateMovement(
          event.from,
          event.to,
          mockState,
          { duration: event.duration }
        );
      });
      
      pathExecutor.animateMovement = true;
      await pathExecutor.executePath(mockState, path);
      
      // Animator should have been used
      expect(mockRenderer.setOffset).toHaveBeenCalled();
      expect(mockRenderer.resetOffset).toHaveBeenCalled();
    });

    it('should show visual feedback during execution', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      // Track visual updates
      const visualUpdates = [];
      eventBus.on('PathExecutionStep', (event) => {
        visualUpdates.push(event);
      });
      
      await pathExecutor.executePath(mockState, path);
      
      // Should have visual feedback for each step
      expect(visualUpdates.length).toBe(2);
      expect(visualUpdates[0].step).toBe(1);
      expect(visualUpdates[1].step).toBe(2);
    });
  });

  describe('Cost and Stamina Integration', () => {
    it('should consume stamina based on path cost', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 8, 8);
      
      const initialStamina = mockState.player.stamina;
      const pathCost = mockState.cursor.cost;
      
      // Execute path with cost
      eventBus.on('CursorConfirm', async (event) => {
        if (event.path) {
          await pathExecutor.executePath(mockState, event.path, {
            totalCost: pathCost
          });
        }
      });
      
      await cursorSystem.handleKeyPress(mockState, 'Enter');
      
      // Stamina should be reduced
      expect(mockState.player.stamina).toBe(initialStamina - pathCost);
    });

    it('should stop execution when stamina runs out', async () => {
      mockState.player.stamina = 5; // Very low stamina
      
      const longPath = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
        { x: 9, y: 5 },
        { x: 10, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, longPath, {
        costPerStep: 2
      });
      
      // Should stop early due to stamina
      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient_stamina');
      expect(result.stepsCompleted).toBeLessThan(5);
      expect(mockState.player.stamina).toBeLessThanOrEqual(1);
    });
  });

  describe('Interruption Handling', () => {
    it('should handle combat interruption', async () => {
      // Mock combat on second step
      mockMovementPipeline.execute = vi.fn()
        .mockResolvedValueOnce({ success: true, moved: true })
        .mockResolvedValueOnce({ success: true, moved: false, attacked: true });
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('combat');
      expect(result.stepsCompleted).toBe(1);
    });

    it('should handle blocked movement', async () => {
      // Mock blocked on third step
      mockMovementPipeline.execute = vi.fn()
        .mockResolvedValueOnce({ success: true, moved: true })
        .mockResolvedValueOnce({ success: true, moved: true })
        .mockResolvedValueOnce({ success: false, moved: false, reason: 'wall' });
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('wall');
      expect(result.stepsCompleted).toBe(2);
    });

    it('should handle game pause', async () => {
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
    });
  });

  describe('Event Flow', () => {
    it('should emit correct event sequence', async () => {
      const events = [];
      
      eventBus.on('PathExecutionStarted', () => events.push('started'));
      eventBus.on('PathExecutionStep', () => events.push('step'));
      eventBus.on('PathStepAnimate', () => events.push('animate'));
      eventBus.on('PathExecutionComplete', () => events.push('complete'));
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ];
      
      pathExecutor.animateMovement = true;
      await pathExecutor.executePath(mockState, path);
      
      // Check event order
      expect(events[0]).toBe('started');
      expect(events[events.length - 1]).toBe('complete');
      expect(events.filter(e => e === 'step').length).toBe(2);
      expect(events.filter(e => e === 'animate').length).toBe(2);
    });

    it('should propagate cursor events through execution', async () => {
      const eventSequence = [];
      
      eventBus.on('CursorShown', () => eventSequence.push('cursor-shown'));
      eventBus.on('CursorMoved', () => eventSequence.push('cursor-moved'));
      eventBus.on('CursorConfirm', () => eventSequence.push('cursor-confirm'));
      eventBus.on('PathExecutionStarted', () => eventSequence.push('execution-started'));
      
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      
      eventBus.on('CursorConfirm', async (event) => {
        if (event.path) {
          await pathExecutor.executePath(mockState, event.path);
        }
      });
      
      await cursorSystem.handleKeyPress(mockState, 'Enter');
      
      // Verify event sequence
      expect(eventSequence).toContain('cursor-shown');
      expect(eventSequence).toContain('cursor-moved');
      expect(eventSequence).toContain('cursor-confirm');
      expect(eventSequence).toContain('execution-started');
    });
  });

  describe('State Management', () => {
    it('should maintain consistent state throughout execution', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 6 },
        { x: 7, y: 7 }
      ];
      
      const stateSnapshots = [];
      
      eventBus.on('PathExecutionStep', () => {
        stateSnapshots.push({
          playerX: mockState.player.x,
          playerY: mockState.player.y,
          stamina: mockState.player.stamina
        });
      });
      
      await pathExecutor.executePath(mockState, path, {
        costPerStep: 1
      });
      
      // Verify progressive state changes
      expect(stateSnapshots[0].playerX).toBe(6);
      expect(stateSnapshots[0].playerY).toBe(6);
      expect(stateSnapshots[1].playerX).toBe(7);
      expect(stateSnapshots[1].playerY).toBe(7);
      
      // Stamina should decrease
      expect(stateSnapshots[0].stamina).toBe(49);
      expect(stateSnapshots[1].stamina).toBe(48);
    });

    it('should clean up properly after execution', async () => {
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 }
      ];
      
      await pathExecutor.executePath(mockState, path);
      
      // Executor should be reset
      expect(pathExecutor.isExecuting).toBe(false);
      expect(pathExecutor.currentPath).toBeNull();
      expect(pathExecutor.currentStep).toBe(0);
      
      // Cursor should still be functional
      await cursorSystem.show(mockState);
      expect(mockState.cursor.visible).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle long paths efficiently', async () => {
      // Create a long path
      const longPath = [];
      for (let i = 5; i <= 15; i++) {
        longPath.push({ x: i, y: 5 });
      }
      
      const startTime = Date.now();
      
      // Execute without animation for speed
      pathExecutor.animateMovement = false;
      const result = await pathExecutor.executePath(mockState, longPath);
      
      const elapsed = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(10);
      expect(elapsed).toBeLessThan(100); // Should be fast without animation
    });

    it('should cache paths when using cursor repeatedly', async () => {
      await cursorSystem.show(mockState);
      
      // Move to same position multiple times
      cursorSystem.moveTo(mockState, 10, 10);
      const firstPath = [...mockState.cursor.path];
      
      cursorSystem.moveTo(mockState, 5, 5);
      cursorSystem.moveTo(mockState, 10, 10);
      const secondPath = [...mockState.cursor.path];
      
      // Paths should be identical
      expect(secondPath).toEqual(firstPath);
    });
  });

  describe('Error Handling', () => {
    it('should handle movement pipeline errors gracefully', async () => {
      mockMovementPipeline.execute = vi.fn()
        .mockRejectedValueOnce(new Error('Pipeline error'));
      
      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 }
      ];
      
      const result = await pathExecutor.executePath(mockState, path);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Pipeline error');
    });

    it('should handle invalid state gracefully', async () => {
      const path = [{ x: 5, y: 5 }, { x: 6, y: 5 }];
      
      const result = await pathExecutor.executePath(null, path);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_state');
    });
  });
});