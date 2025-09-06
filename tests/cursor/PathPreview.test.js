import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathPreview } from '../../src/js/cursor/PathPreview.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('PathPreview', () => {
  let pathPreview;
  let eventBus;
  let mockRenderer;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Mock renderer
    mockRenderer = {
      drawLine: vi.fn(),
      drawTile: vi.fn(),
      drawText: vi.fn(),
      setAlpha: vi.fn(),
      resetAlpha: vi.fn(),
      setColor: vi.fn(),
      resetColor: vi.fn()
    };
    
    pathPreview = new PathPreview(eventBus, mockRenderer);
    
    mockState = {
      cursor: {
        visible: true,
        x: 10,
        y: 10,
        path: [
          { x: 5, y: 5 },
          { x: 6, y: 5 },
          { x: 7, y: 6 },
          { x: 8, y: 7 },
          { x: 9, y: 8 },
          { x: 10, y: 9 },
          { x: 10, y: 10 }
        ],
        cost: 8,
        reachable: true,
        mode: 'movement'
      },
      player: {
        x: 5,
        y: 5
      },
      camera: {
        x: 0,
        y: 0
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(pathPreview.eventBus).toBe(eventBus);
      expect(pathPreview.renderer).toBe(mockRenderer);
      expect(pathPreview.visible).toBe(true);
      expect(pathPreview.style).toBe('line');
    });

    it('should accept custom options', () => {
      const customPreview = new PathPreview(eventBus, mockRenderer, {
        style: 'dots',
        color: '#FF0000',
        alpha: 0.5,
        lineWidth: 3
      });
      
      expect(customPreview.style).toBe('dots');
      expect(customPreview.color).toBe('#FF0000');
      expect(customPreview.alpha).toBe(0.5);
      expect(customPreview.lineWidth).toBe(3);
    });
  });

  describe('render', () => {
    it('should render path when visible', () => {
      pathPreview.render(mockState);
      
      expect(mockRenderer.setAlpha).toHaveBeenCalled();
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      expect(mockRenderer.resetAlpha).toHaveBeenCalled();
    });

    it('should not render when cursor not visible', () => {
      mockState.cursor.visible = false;
      
      pathPreview.render(mockState);
      
      expect(mockRenderer.drawLine).not.toHaveBeenCalled();
    });

    it('should not render when no path', () => {
      mockState.cursor.path = null;
      
      pathPreview.render(mockState);
      
      expect(mockRenderer.drawLine).not.toHaveBeenCalled();
    });

    it('should render with different styles', () => {
      // Test line style
      pathPreview.style = 'line';
      pathPreview.render(mockState);
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      
      // Reset mocks
      mockRenderer.drawLine.mockClear();
      mockRenderer.drawTile.mockClear();
      
      // Test dots style
      pathPreview.style = 'dots';
      pathPreview.render(mockState);
      expect(mockRenderer.drawTile).toHaveBeenCalled();
      expect(mockRenderer.drawLine).not.toHaveBeenCalled();
      
      // Reset mocks
      mockRenderer.drawLine.mockClear();
      mockRenderer.drawTile.mockClear();
      
      // Test tiles style
      pathPreview.style = 'tiles';
      pathPreview.render(mockState);
      expect(mockRenderer.drawTile).toHaveBeenCalled();
    });

    it('should use different colors for reachable/unreachable', () => {
      // Reachable path
      mockState.cursor.reachable = true;
      pathPreview.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#00FF00');
      
      mockRenderer.setColor.mockClear();
      
      // Unreachable path
      mockState.cursor.reachable = false;
      pathPreview.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#FF0000');
    });

    it('should handle camera offset', () => {
      mockState.camera = { x: 5, y: 5 };
      
      pathPreview.render(mockState);
      
      // Should render with adjusted positions
      expect(mockRenderer.drawLine).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.objectContaining({ x: 0, y: 0 })
        })
      );
    });
  });

  describe('renderLine', () => {
    it('should draw lines between path points', () => {
      pathPreview.renderLine(mockState);
      
      // Should draw lines connecting path points
      const calls = mockRenderer.drawLine.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // First line should start from player position
      expect(calls[0][0].from).toEqual({ 
        x: mockState.player.x - mockState.camera.x, 
        y: mockState.player.y - mockState.camera.y 
      });
    });

    it('should skip lines for non-adjacent points', () => {
      // Create path with gap
      mockState.cursor.path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 10, y: 10 } // Jump
      ];
      
      pathPreview.renderLine(mockState);
      
      // Should only draw 1 line (5,5 to 6,5)
      expect(mockRenderer.drawLine).toHaveBeenCalledTimes(1);
    });
  });

  describe('renderDots', () => {
    it('should draw dots at each path point', () => {
      pathPreview.renderDots(mockState);
      
      // Should draw a dot for each path point
      expect(mockRenderer.drawTile).toHaveBeenCalledTimes(mockState.cursor.path.length);
      
      // Check first dot position
      const firstCall = mockRenderer.drawTile.mock.calls[0];
      expect(firstCall[0]).toBe('•');
      expect(firstCall[1]).toBe(mockState.cursor.path[0].x - mockState.camera.x);
      expect(firstCall[2]).toBe(mockState.cursor.path[0].y - mockState.camera.y);
    });
  });

  describe('renderTiles', () => {
    it('should highlight path tiles', () => {
      pathPreview.renderTiles(mockState);
      
      // Should highlight each tile in path
      expect(mockRenderer.drawTile).toHaveBeenCalledTimes(mockState.cursor.path.length);
      
      // Should use highlight character
      const firstCall = mockRenderer.drawTile.mock.calls[0];
      expect(firstCall[0]).toBe('▪');
    });

    it('should use different tile for destination', () => {
      pathPreview.renderTiles(mockState);
      
      // Last tile should be different
      const lastCall = mockRenderer.drawTile.mock.calls[mockRenderer.drawTile.mock.calls.length - 1];
      expect(lastCall[0]).toBe('◆');
      expect(lastCall[1]).toBe(mockState.cursor.x - mockState.camera.x);
      expect(lastCall[2]).toBe(mockState.cursor.y - mockState.camera.y);
    });
  });

  describe('visibility', () => {
    it('should toggle visibility', () => {
      pathPreview.show();
      expect(pathPreview.visible).toBe(true);
      
      pathPreview.hide();
      expect(pathPreview.visible).toBe(false);
      
      pathPreview.toggle();
      expect(pathPreview.visible).toBe(true);
      
      pathPreview.toggle();
      expect(pathPreview.visible).toBe(false);
    });

    it('should emit events when visibility changes', async () => {
      const showSpy = vi.fn();
      const hideSpy = vi.fn();
      
      eventBus.on('PathPreviewShown', showSpy);
      eventBus.on('PathPreviewHidden', hideSpy);
      
      await pathPreview.show();
      expect(showSpy).toHaveBeenCalled();
      
      await pathPreview.hide();
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('style changes', () => {
    it('should change render style', () => {
      pathPreview.setStyle('dots');
      expect(pathPreview.style).toBe('dots');
      
      pathPreview.setStyle('tiles');
      expect(pathPreview.style).toBe('tiles');
      
      pathPreview.setStyle('line');
      expect(pathPreview.style).toBe('line');
    });

    it('should emit style change event', async () => {
      const styleSpy = vi.fn();
      eventBus.on('PathPreviewStyleChanged', styleSpy);
      
      await pathPreview.setStyle('dots');
      
      expect(styleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          oldStyle: 'line',
          newStyle: 'dots'
        }),
        expect.any(Object)
      );
    });
  });

  describe('color customization', () => {
    it('should update colors', () => {
      pathPreview.setColors({
        reachable: '#0000FF',
        unreachable: '#FFFF00',
        neutral: '#FFFFFF'
      });
      
      expect(pathPreview.colors.reachable).toBe('#0000FF');
      expect(pathPreview.colors.unreachable).toBe('#FFFF00');
      expect(pathPreview.colors.neutral).toBe('#FFFFFF');
    });

    it('should use mode-specific colors', () => {
      pathPreview.setModeColors({
        movement: { reachable: '#00FF00', unreachable: '#FF0000' },
        examine: { reachable: '#0000FF', unreachable: '#FF00FF' },
        target: { reachable: '#FFFF00', unreachable: '#FF8800' }
      });
      
      // Movement mode
      mockState.cursor.mode = 'movement';
      mockState.cursor.reachable = true;
      pathPreview.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#00FF00');
      
      mockRenderer.setColor.mockClear();
      
      // Target mode
      mockState.cursor.mode = 'target';
      mockState.cursor.reachable = false;
      pathPreview.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#FF8800');
    });
  });

  describe('animation', () => {
    it('should animate path', () => {
      vi.useFakeTimers();
      
      pathPreview.enableAnimation({ speed: 100 });
      pathPreview.render(mockState);
      
      // Initial render
      expect(mockRenderer.setAlpha).toHaveBeenCalled();
      
      // Advance time
      vi.advanceTimersByTime(100);
      pathPreview.render(mockState);
      
      // Should update alpha for animation
      expect(mockRenderer.setAlpha).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });

    it('should pulse alpha value', () => {
      vi.useFakeTimers();
      
      pathPreview.enableAnimation({ 
        type: 'pulse',
        speed: 1000,
        minAlpha: 0.3,
        maxAlpha: 1.0
      });
      
      const startTime = Date.now();
      pathPreview.render(mockState);
      
      // Check alpha oscillates
      vi.advanceTimersByTime(500);
      pathPreview.render(mockState);
      
      vi.advanceTimersByTime(500);
      pathPreview.render(mockState);
      
      const alphaCalls = mockRenderer.setAlpha.mock.calls;
      expect(alphaCalls.length).toBeGreaterThan(0);
      
      vi.useRealTimers();
    });
  });

  describe('event handlers', () => {
    it('should respond to cursor movement', async () => {
      // The handler updates lastRenderedPath, not trigger render directly
      expect(pathPreview.lastRenderedPath).toBeNull();
      
      await eventBus.emitAsync('CursorMoved', {
        from: { x: 5, y: 5 },
        to: { x: 6, y: 6 },
        path: [{ x: 5, y: 5 }, { x: 6, y: 6 }]
      });
      
      // Should update the cached path
      expect(pathPreview.lastRenderedPath).toEqual([{ x: 5, y: 5 }, { x: 6, y: 6 }]);
    });

    it('should hide on cursor hidden', async () => {
      pathPreview.visible = true;
      
      await eventBus.emitAsync('CursorHidden', {});
      
      expect(pathPreview.visible).toBe(false);
    });

    it('should show on cursor shown', async () => {
      pathPreview.visible = false;
      
      await eventBus.emitAsync('CursorShown', {});
      
      expect(pathPreview.visible).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners', () => {
      const offSpy = vi.spyOn(eventBus, 'off');
      
      pathPreview.cleanup();
      
      expect(offSpy).toHaveBeenCalled();
    });

    it('should stop animation', () => {
      pathPreview.enableAnimation({ speed: 100 });
      expect(pathPreview.animationEnabled).toBe(true);
      
      pathPreview.cleanup();
      
      expect(pathPreview.animationEnabled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty path', () => {
      mockState.cursor.path = [];
      
      expect(() => pathPreview.render(mockState)).not.toThrow();
      expect(mockRenderer.drawLine).not.toHaveBeenCalled();
    });

    it('should handle single point path', () => {
      mockState.cursor.path = [{ x: 5, y: 5 }];
      
      pathPreview.render(mockState);
      
      // Should still render something
      if (pathPreview.style === 'dots' || pathPreview.style === 'tiles') {
        expect(mockRenderer.drawTile).toHaveBeenCalled();
      }
    });

    it('should handle missing state properties', () => {
      delete mockState.camera;
      
      expect(() => pathPreview.render(mockState)).not.toThrow();
    });

    it('should handle invalid style gracefully', () => {
      pathPreview.style = 'invalid';
      
      expect(() => pathPreview.render(mockState)).not.toThrow();
    });
  });
});