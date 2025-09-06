import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CursorSystem } from '../../src/js/cursor/CursorSystem.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('CursorSystem', () => {
  let cursorSystem;
  let eventBus;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Create cursor system with mocked pathfinding dependencies
    cursorSystem = new CursorSystem(eventBus);
    
    // Mock the pathfinding system
    cursorSystem.pathfindingSystem = {
      findPath: vi.fn((start, end, state) => {
        // Simple mock path - straight line
        const path = [];
        const dx = Math.sign(end.x - start.x);
        const dy = Math.sign(end.y - start.y);
        let x = start.x;
        let y = start.y;
        
        while (x !== end.x || y !== end.y) {
          path.push({ x, y });
          if (x !== end.x) x += dx;
          if (y !== end.y) y += dy;
        }
        path.push({ x: end.x, y: end.y });
        
        return path;
      })
    };
    
    // Mock the movement cost calculator
    cursorSystem.movementCostCalculator = {
      getPathCost: vi.fn((path, state) => {
        // Simple cost - 1 per tile
        return Math.max(0, path.length - 1);
      })
    };
    
    mockState = {
      player: {
        x: 5,
        y: 5
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
        isPassable: vi.fn((x, y) => {
          // Create some obstacles for testing
          if (x === 10 && y === 10) return false;
          if (x === 11 && y === 10) return false;
          return x >= 0 && x < 20 && y >= 0 && y < 20;
        })
      },
      camera: {
        x: 0,
        y: 0
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with event bus', () => {
      expect(cursorSystem.eventBus).toBe(eventBus);
      expect(cursorSystem.pathfindingSystem).toBeDefined();
      expect(cursorSystem.movementCostCalculator).toBeDefined();
    });

    it('should have default configuration', () => {
      expect(cursorSystem.maxRange).toBe(10);
      expect(cursorSystem.showPath).toBe(true);
      expect(cursorSystem.showCost).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customCursor = new CursorSystem(eventBus, {
        maxRange: 15,
        showPath: false,
        showCost: false
      });
      
      expect(customCursor.maxRange).toBe(15);
      expect(customCursor.showPath).toBe(false);
      expect(customCursor.showCost).toBe(false);
    });
  });

  describe('show/hide', () => {
    it('should show cursor at player position', () => {
      cursorSystem.show(mockState);
      
      expect(mockState.cursor.visible).toBe(true);
      expect(mockState.cursor.x).toBe(mockState.player.x);
      expect(mockState.cursor.y).toBe(mockState.player.y);
    });

    it('should hide cursor', () => {
      mockState.cursor.visible = true;
      
      cursorSystem.hide(mockState);
      
      expect(mockState.cursor.visible).toBe(false);
      expect(mockState.cursor.path).toBeUndefined();
      expect(mockState.cursor.cost).toBeUndefined();
    });

    it('should emit events when showing/hiding', async () => {
      const showSpy = vi.fn();
      const hideSpy = vi.fn();
      
      eventBus.on('CursorShown', showSpy);
      eventBus.on('CursorHidden', hideSpy);
      
      await cursorSystem.show(mockState);
      expect(showSpy).toHaveBeenCalled();
      
      await cursorSystem.hide(mockState);
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('movement', () => {
    it('should move cursor within range', () => {
      cursorSystem.show(mockState);
      
      const moved = cursorSystem.moveTo(mockState, 7, 7);
      
      expect(moved).toBe(true);
      expect(mockState.cursor.x).toBe(7);
      expect(mockState.cursor.y).toBe(7);
    });

    it('should not move cursor beyond max range', () => {
      cursorSystem.show(mockState);
      
      const moved = cursorSystem.moveTo(mockState, 20, 20);
      
      expect(moved).toBe(false);
      expect(mockState.cursor.x).toBe(5); // Unchanged
      expect(mockState.cursor.y).toBe(5);
    });

    it('should handle relative movement', () => {
      cursorSystem.show(mockState);
      mockState.cursor.x = 6;
      mockState.cursor.y = 6;
      
      cursorSystem.moveRelative(mockState, 1, 0);
      expect(mockState.cursor.x).toBe(7);
      expect(mockState.cursor.y).toBe(6);
      
      cursorSystem.moveRelative(mockState, 0, -1);
      expect(mockState.cursor.x).toBe(7);
      expect(mockState.cursor.y).toBe(5);
    });

    it('should not move to impassable tiles', () => {
      cursorSystem.show(mockState);
      
      const moved = cursorSystem.moveTo(mockState, 10, 10); // Obstacle position
      
      expect(moved).toBe(false);
    });

    it('should emit movement events', async () => {
      const moveSpy = vi.fn();
      eventBus.on('CursorMoved', moveSpy);
      
      cursorSystem.show(mockState);
      await cursorSystem.moveTo(mockState, 6, 6);
      
      expect(moveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { x: 5, y: 5 },
          to: { x: 6, y: 6 }
        }),
        expect.any(Object)
      );
    });
  });

  describe('pathfinding integration', () => {
    it('should calculate path when cursor moves', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 8, 8);
      
      expect(mockState.cursor.path).toBeDefined();
      expect(Array.isArray(mockState.cursor.path)).toBe(true);
      expect(mockState.cursor.path[0]).toEqual({ x: 5, y: 5 });
    });

    it('should calculate movement cost', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      
      expect(mockState.cursor.cost).toBeDefined();
      expect(mockState.cursor.cost).toBeGreaterThan(0);
    });

    it('should clear path when cursor at player position', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 8, 8);
      
      expect(mockState.cursor.path).toBeDefined();
      
      cursorSystem.moveTo(mockState, 5, 5); // Back to player
      
      expect(mockState.cursor.path).toBeNull();
      expect(mockState.cursor.cost).toBe(0);
    });

    it('should handle no path available', () => {
      cursorSystem.show(mockState);
      
      // Mock pathfinding to return null
      cursorSystem.pathfindingSystem.findPath = vi.fn(() => null);
      
      cursorSystem.moveTo(mockState, 7, 7);
      
      expect(mockState.cursor.path).toBeNull();
      expect(mockState.cursor.cost).toBeUndefined();
    });
  });

  describe('modes', () => {
    it('should support different cursor modes', () => {
      cursorSystem.setMode(mockState, 'examine');
      expect(mockState.cursor.mode).toBe('examine');
      
      cursorSystem.setMode(mockState, 'target');
      expect(mockState.cursor.mode).toBe('target');
      
      cursorSystem.setMode(mockState, 'movement');
      expect(mockState.cursor.mode).toBe('movement');
    });

    it('should have different max ranges per mode', () => {
      const customCursor = new CursorSystem(eventBus, {
        modeRanges: {
          movement: 10,
          examine: 15,
          target: 8
        }
      });
      
      customCursor.setMode(mockState, 'examine');
      expect(customCursor.getMaxRange(mockState)).toBe(15);
      
      customCursor.setMode(mockState, 'target');
      expect(customCursor.getMaxRange(mockState)).toBe(8);
    });

    it('should emit mode change events', async () => {
      const modeSpy = vi.fn();
      eventBus.on('CursorModeChanged', modeSpy);
      
      await cursorSystem.setMode(mockState, 'examine');
      
      expect(modeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          oldMode: 'movement',
          newMode: 'examine'
        }),
        expect.any(Object)
      );
    });
  });

  describe('keyboard controls', () => {
    it('should handle arrow key movement', () => {
      cursorSystem.show(mockState);
      
      cursorSystem.handleKeyPress(mockState, 'ArrowRight');
      expect(mockState.cursor.x).toBe(6);
      
      cursorSystem.handleKeyPress(mockState, 'ArrowDown');
      expect(mockState.cursor.y).toBe(6);
      
      cursorSystem.handleKeyPress(mockState, 'ArrowLeft');
      expect(mockState.cursor.x).toBe(5);
      
      cursorSystem.handleKeyPress(mockState, 'ArrowUp');
      expect(mockState.cursor.y).toBe(5);
    });

    it('should handle diagonal movement with numpad', () => {
      cursorSystem.show(mockState);
      
      cursorSystem.handleKeyPress(mockState, 'Numpad9'); // Up-right
      expect(mockState.cursor.x).toBe(6);
      expect(mockState.cursor.y).toBe(4);
      
      cursorSystem.handleKeyPress(mockState, 'Numpad1'); // Down-left
      expect(mockState.cursor.x).toBe(5);
      expect(mockState.cursor.y).toBe(5);
    });

    it('should handle confirm action', async () => {
      const confirmSpy = vi.fn();
      eventBus.on('CursorConfirm', confirmSpy);
      
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      
      await cursorSystem.handleKeyPress(mockState, 'Enter');
      
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 7, y: 7 },
          path: expect.any(Array),
          cost: expect.any(Number)
        }),
        expect.any(Object)
      );
    });

    it('should handle cancel action', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      
      cursorSystem.handleKeyPress(mockState, 'Escape');
      
      expect(mockState.cursor.visible).toBe(false);
    });
  });

  describe('range validation', () => {
    it('should check if position is in range', () => {
      cursorSystem.show(mockState);
      
      expect(cursorSystem.isInRange(mockState, 6, 6)).toBe(true);
      expect(cursorSystem.isInRange(mockState, 15, 15)).toBe(false);
      expect(cursorSystem.isInRange(mockState, 5, 14)).toBe(true); // Edge of range
    });

    it('should calculate distance correctly', () => {
      const dist = cursorSystem.getDistance(
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      );
      
      expect(dist).toBe(5); // 3-4-5 triangle
    });

    it('should use Chebyshev distance for movement mode', () => {
      const customCursor = new CursorSystem(eventBus, {
        distanceMetric: 'chebyshev'
      });
      
      const dist = customCursor.getDistance(
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      );
      
      expect(dist).toBe(4); // max(3, 4)
    });
  });

  describe('visual feedback', () => {
    it('should update path preview when cursor moves', () => {
      cursorSystem.show(mockState);
      
      cursorSystem.moveTo(mockState, 7, 7);
      expect(mockState.cursor.pathPreview).toBeDefined();
      
      cursorSystem.moveTo(mockState, 8, 8);
      expect(mockState.cursor.pathPreview).toBeDefined();
      // Path should be different
    });

    it('should include cost breakdown in visual data', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      
      expect(mockState.cursor.costBreakdown).toBeDefined();
      expect(mockState.cursor.costBreakdown).toHaveProperty('base');
      expect(mockState.cursor.costBreakdown).toHaveProperty('terrain');
      expect(mockState.cursor.costBreakdown).toHaveProperty('total');
    });

    it('should indicate if target is reachable', () => {
      cursorSystem.show(mockState);
      
      cursorSystem.moveTo(mockState, 7, 7);
      expect(mockState.cursor.reachable).toBe(true);
      
      // Mock pathfinding to return null for unreachable
      cursorSystem.pathfindingSystem.findPath = vi.fn(() => null);
      cursorSystem.moveTo(mockState, 8, 8);
      expect(mockState.cursor.reachable).toBe(false);
    });
  });

  describe('state persistence', () => {
    it('should save and restore cursor state', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      cursorSystem.setMode(mockState, 'examine');
      
      const saved = cursorSystem.saveState(mockState);
      
      // Modify state
      cursorSystem.moveTo(mockState, 10, 10);
      cursorSystem.setMode(mockState, 'target');
      
      // Restore
      cursorSystem.restoreState(mockState, saved);
      
      expect(mockState.cursor.x).toBe(7);
      expect(mockState.cursor.y).toBe(7);
      expect(mockState.cursor.mode).toBe('examine');
    });
  });

  describe('cleanup', () => {
    it('should clean up event listeners', () => {
      const offSpy = vi.spyOn(eventBus, 'off');
      
      cursorSystem.cleanup();
      
      expect(offSpy).toHaveBeenCalled();
    });

    it('should reset cursor state on cleanup', () => {
      cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 7, 7);
      
      cursorSystem.cleanup();
      cursorSystem.hide(mockState);
      
      expect(mockState.cursor.path).toBeUndefined();
      expect(mockState.cursor.cost).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle cursor at chunk boundaries', () => {
      cursorSystem.show(mockState);
      
      const moved = cursorSystem.moveTo(mockState, 0, 0);
      expect(moved).toBe(true);
      
      const moved2 = cursorSystem.moveTo(mockState, 19, 19);
      expect(moved2).toBe(false); // Out of range from player
    });

    it('should handle null state gracefully', () => {
      expect(() => cursorSystem.show(null)).rejects.toThrow();
      expect(() => cursorSystem.moveTo(null, 5, 5)).toThrow();
    });

    it('should handle missing cursor object', () => {
      delete mockState.cursor;
      
      cursorSystem.show(mockState);
      
      expect(mockState.cursor).toBeDefined();
      expect(mockState.cursor.visible).toBe(true);
    });
  });
});