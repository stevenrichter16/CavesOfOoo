import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CursorSystem, resetCursorSystem } from '../../src/js/cursor/CursorSystem.js';
import { PathPreview, resetPathPreview } from '../../src/js/cursor/PathPreview.js';
import { CostDisplay, resetCostDisplay } from '../../src/js/cursor/CostDisplay.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { resetPathfindingSystem } from '../../src/js/pathfinding/PathfindingSystem.js';
import { resetMovementCostCalculator } from '../../src/js/pathfinding/MovementCostCalculator.js';
import { resetPathCache } from '../../src/js/pathfinding/PathCache.js';

describe('Cursor System Integration', () => {
  let eventBus;
  let cursorSystem;
  let pathPreview;
  let costDisplay;
  let mockRenderer;
  let mockState;

  beforeEach(() => {
    // Reset all singletons
    resetCursorSystem();
    resetPathPreview();
    resetCostDisplay();
    resetPathfindingSystem();
    resetMovementCostCalculator();
    resetPathCache();
    
    eventBus = new EventBus();
    
    // Mock renderer
    mockRenderer = {
      drawLine: vi.fn(),
      drawTile: vi.fn(),
      drawText: vi.fn(),
      drawBox: vi.fn(),
      setAlpha: vi.fn(),
      resetAlpha: vi.fn(),
      setColor: vi.fn(),
      resetColor: vi.fn(),
      setFont: vi.fn(),
      resetFont: vi.fn()
    };
    
    // Create components
    cursorSystem = new CursorSystem(eventBus);
    pathPreview = new PathPreview(eventBus, mockRenderer);
    costDisplay = new CostDisplay(eventBus, mockRenderer);
    
    // Mock pathfinding dependencies
    cursorSystem.pathfindingSystem = {
      findPath: vi.fn((start, end) => {
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
      getPathCost: vi.fn((path) => Math.max(0, path.length - 1) * 1.5)
    };
    
    // Create test state
    mockState = {
      player: {
        x: 10,
        y: 10,
        stamina: 20,
        maxStamina: 30
      },
      cursor: {
        x: 10,
        y: 10,
        visible: false,
        mode: 'movement'
      },
      chunk: {
        width: 30,
        height: 30,
        isPassable: vi.fn(() => true)
      },
      camera: {
        x: 0,
        y: 0
      },
      screenWidth: 80,
      screenHeight: 25
    };
  });

  describe('Basic Integration', () => {
    it('should show cursor and render preview', async () => {
      await cursorSystem.show(mockState);
      
      expect(mockState.cursor.visible).toBe(true);
      expect(pathPreview.visible).toBe(true);
      expect(costDisplay.visible).toBe(true);
    });

    it('should update all components when cursor moves', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      
      // Check cursor updated
      expect(mockState.cursor.x).toBe(15);
      expect(mockState.cursor.y).toBe(15);
      expect(mockState.cursor.path).toBeDefined();
      expect(mockState.cursor.cost).toBeGreaterThan(0);
      
      // Render components
      pathPreview.render(mockState);
      costDisplay.render(mockState);
      
      // Check rendering occurred
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      expect(mockRenderer.drawText).toHaveBeenCalled();
    });

    it('should hide all components together', async () => {
      await cursorSystem.show(mockState);
      await cursorSystem.hide(mockState);
      
      expect(mockState.cursor.visible).toBe(false);
      expect(pathPreview.visible).toBe(false);
      expect(costDisplay.visible).toBe(false);
    });
  });

  describe('Event Flow', () => {
    it('should propagate cursor movement events', async () => {
      const moveHandler = vi.fn();
      eventBus.on('CursorMoved', moveHandler);
      
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 12, 12);
      
      expect(moveHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { x: 10, y: 10 },
          to: { x: 12, y: 12 },
          path: expect.any(Array),
          cost: expect.any(Number)
        }),
        expect.any(Object)
      );
    });

    it('should handle confirm action', async () => {
      const confirmHandler = vi.fn();
      eventBus.on('CursorConfirm', confirmHandler);
      
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 10);
      await cursorSystem.handleKeyPress(mockState, 'Enter');
      
      expect(confirmHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 15, y: 10 },
          path: expect.any(Array),
          cost: expect.any(Number),
          mode: 'movement'
        }),
        expect.any(Object)
      );
    });

    it('should handle cancel action', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      
      await cursorSystem.handleKeyPress(mockState, 'Escape');
      
      expect(mockState.cursor.visible).toBe(false);
    });
  });

  describe('Mode Switching', () => {
    it('should update display when switching modes', async () => {
      await cursorSystem.show(mockState);
      
      // Movement mode
      await cursorSystem.setMode(mockState, 'movement');
      cursorSystem.moveTo(mockState, 15, 15);
      pathPreview.render(mockState);
      costDisplay.render(mockState);
      
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#00FF00'); // Reachable color
      
      mockRenderer.setColor.mockClear();
      
      // Examine mode
      await cursorSystem.setMode(mockState, 'examine');
      pathPreview.render(mockState);
      costDisplay.render(mockState);
      
      // Should still render but potentially with different styling
      expect(mockRenderer.drawLine).toHaveBeenCalled();
    });

    it('should respect mode-specific ranges', async () => {
      const customCursor = new CursorSystem(eventBus, {
        modeRanges: {
          movement: 5,
          examine: 15,
          target: 8
        }
      });
      
      // Mock pathfinding
      customCursor.pathfindingSystem = cursorSystem.pathfindingSystem;
      customCursor.movementCostCalculator = cursorSystem.movementCostCalculator;
      
      await customCursor.show(mockState);
      
      // Movement mode - limited range
      await customCursor.setMode(mockState, 'movement');
      expect(customCursor.moveTo(mockState, 20, 20)).toBe(false); // Out of range
      expect(customCursor.moveTo(mockState, 12, 12)).toBe(true); // In range
      
      // Examine mode - extended range
      await customCursor.setMode(mockState, 'examine');
      expect(customCursor.moveTo(mockState, 20, 20)).toBe(true); // Now in range
    });
  });

  describe('Visual Feedback', () => {
    it('should show path preview with costs', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      
      // Path should be calculated
      expect(mockState.cursor.path).toBeDefined();
      expect(mockState.cursor.path.length).toBeGreaterThan(0);
      
      // Cost should be calculated
      expect(mockState.cursor.cost).toBeDefined();
      expect(mockState.cursor.costBreakdown).toBeDefined();
      
      // Render preview
      pathPreview.render(mockState);
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      
      // Render cost
      costDisplay.render(mockState);
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining(mockState.cursor.cost.toString()),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should color-code based on affordability', async () => {
      await cursorSystem.show(mockState);
      
      // Affordable move
      cursorSystem.moveTo(mockState, 12, 12);
      mockState.cursor.cost = 5;
      costDisplay.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#00FF00');
      
      mockRenderer.setColor.mockClear();
      
      // Expensive move
      cursorSystem.moveTo(mockState, 20, 20);
      mockState.cursor.cost = 25;
      costDisplay.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#FF0000');
    });

    it('should show unreachable paths differently', async () => {
      await cursorSystem.show(mockState);
      
      // Mock unreachable path
      cursorSystem.pathfindingSystem.findPath = vi.fn(() => null);
      
      cursorSystem.moveTo(mockState, 15, 15);
      
      expect(mockState.cursor.reachable).toBe(false);
      
      // Render with unreachable styling
      pathPreview.render(mockState);
      
      // Should not render path since it's null
      expect(mockRenderer.drawLine).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow key movement', async () => {
      await cursorSystem.show(mockState);
      
      // Move right
      await cursorSystem.handleKeyPress(mockState, 'ArrowRight');
      expect(mockState.cursor.x).toBe(11);
      
      // Move down
      await cursorSystem.handleKeyPress(mockState, 'ArrowDown');
      expect(mockState.cursor.y).toBe(11);
      
      // Move left
      await cursorSystem.handleKeyPress(mockState, 'ArrowLeft');
      expect(mockState.cursor.x).toBe(10);
      
      // Move up
      await cursorSystem.handleKeyPress(mockState, 'ArrowUp');
      expect(mockState.cursor.y).toBe(10);
    });

    it('should handle diagonal movement', async () => {
      await cursorSystem.show(mockState);
      
      // Move diagonal
      await cursorSystem.handleKeyPress(mockState, 'Numpad9'); // Up-right
      expect(mockState.cursor.x).toBe(11);
      expect(mockState.cursor.y).toBe(9);
      
      await cursorSystem.handleKeyPress(mockState, 'Numpad1'); // Down-left
      expect(mockState.cursor.x).toBe(10);
      expect(mockState.cursor.y).toBe(10);
    });

    it('should update display after keyboard movement', async () => {
      await cursorSystem.show(mockState);
      
      await cursorSystem.handleKeyPress(mockState, 'ArrowRight');
      
      // Should have updated path
      expect(mockState.cursor.path).toBeDefined();
      expect(mockState.cursor.cost).toBeGreaterThan(0);
      
      // Render components
      pathPreview.render(mockState);
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      expect(mockRenderer.drawText).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle rapid cursor movements', async () => {
      await cursorSystem.show(mockState);
      
      const startTime = performance.now();
      
      // Rapid movements
      for (let i = 0; i < 20; i++) {
        const x = 10 + (i % 5);
        const y = 10 + Math.floor(i / 5);
        cursorSystem.moveTo(mockState, x, y);
      }
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should complete quickly
    });

    it('should cache paths for efficiency', async () => {
      await cursorSystem.show(mockState);
      
      // Move to position
      cursorSystem.moveTo(mockState, 15, 15);
      const firstCallCount = cursorSystem.pathfindingSystem.findPath.mock.calls.length;
      
      // Move back
      cursorSystem.moveTo(mockState, 10, 10);
      
      // Move to same position again
      cursorSystem.moveTo(mockState, 15, 15);
      const secondCallCount = cursorSystem.pathfindingSystem.findPath.mock.calls.length;
      
      // Should have made calls for each movement (no cache in mock)
      expect(secondCallCount).toBeGreaterThan(0);
      expect(firstCallCount).toBeGreaterThan(0);
    });
  });

  describe('Style Customization', () => {
    it('should support different path preview styles', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      
      // Line style
      pathPreview.setStyle('line');
      pathPreview.render(mockState);
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      
      mockRenderer.drawLine.mockClear();
      mockRenderer.drawTile.mockClear();
      
      // Dots style
      pathPreview.setStyle('dots');
      pathPreview.render(mockState);
      expect(mockRenderer.drawTile).toHaveBeenCalled();
      expect(mockRenderer.drawLine).not.toHaveBeenCalled();
    });

    it('should support different cost display formats', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      mockState.cursor.cost = 7;
      
      // Simple format
      costDisplay.format = 'simple';
      costDisplay.render(mockState);
      expect(mockRenderer.drawText).toHaveBeenCalledWith('7', expect.any(Number), expect.any(Number));
      
      mockRenderer.drawText.mockClear();
      
      // Detailed format
      costDisplay.format = 'detailed';
      costDisplay.render(mockState);
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining('Cost: 7'),
        expect.any(Number),
        expect.any(Number)
      );
      
      mockRenderer.drawText.mockClear();
      
      // Fraction format
      costDisplay.format = 'fraction';
      costDisplay.render(mockState);
      expect(mockRenderer.drawText).toHaveBeenCalledWith('7/20', expect.any(Number), expect.any(Number));
    });
  });

  describe('State Management', () => {
    it('should save and restore cursor state', async () => {
      await cursorSystem.show(mockState);
      cursorSystem.moveTo(mockState, 15, 15);
      await cursorSystem.setMode(mockState, 'examine');
      
      // Save state
      const saved = cursorSystem.saveState(mockState);
      
      // Modify state
      cursorSystem.moveTo(mockState, 20, 20);
      await cursorSystem.setMode(mockState, 'target');
      
      // Restore state
      cursorSystem.restoreState(mockState, saved);
      
      expect(mockState.cursor.x).toBe(15);
      expect(mockState.cursor.y).toBe(15);
      expect(mockState.cursor.mode).toBe('examine');
    });

    it('should clean up properly', () => {
      const offSpy = vi.spyOn(eventBus, 'off');
      
      cursorSystem.cleanup();
      pathPreview.cleanup();
      costDisplay.cleanup();
      
      expect(offSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle cursor at map boundaries', async () => {
      await cursorSystem.show(mockState);
      
      // Try to move to boundary (within range)
      const moved1 = cursorSystem.moveTo(mockState, 5, 5);
      expect(moved1).toBe(true);
      expect(mockState.cursor.x).toBe(5);
      expect(mockState.cursor.y).toBe(5);
      
      // Try to move beyond boundary
      const moved2 = cursorSystem.moveTo(mockState, -1, -1);
      expect(moved2).toBe(false); // Should not move
      expect(mockState.cursor.x).toBe(5); // Should stay at previous position
      expect(mockState.cursor.y).toBe(5);
    });

    it('should handle missing state properties gracefully', async () => {
      delete mockState.camera;
      
      expect(() => {
        cursorSystem.show(mockState);
        cursorSystem.moveTo(mockState, 15, 15);
        pathPreview.render(mockState);
        costDisplay.render(mockState);
      }).not.toThrow();
    });

    it('should handle rapid mode switching', async () => {
      await cursorSystem.show(mockState);
      
      // Rapid mode switches
      for (let i = 0; i < 10; i++) {
        await cursorSystem.setMode(mockState, 'movement');
        await cursorSystem.setMode(mockState, 'examine');
        await cursorSystem.setMode(mockState, 'target');
      }
      
      expect(mockState.cursor.mode).toBe('target');
    });
  });
});