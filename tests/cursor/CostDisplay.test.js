import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostDisplay } from '../../src/js/cursor/CostDisplay.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('CostDisplay', () => {
  let costDisplay;
  let eventBus;
  let mockRenderer;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Mock renderer
    mockRenderer = {
      drawText: vi.fn(),
      drawBox: vi.fn(),
      setColor: vi.fn(),
      resetColor: vi.fn(),
      setFont: vi.fn(),
      resetFont: vi.fn()
    };
    
    costDisplay = new CostDisplay(eventBus, mockRenderer);
    
    mockState = {
      cursor: {
        visible: true,
        x: 10,
        y: 10,
        cost: 5,
        costBreakdown: {
          base: 3,
          terrain: 2,
          total: 5
        },
        reachable: true,
        mode: 'movement'
      },
      player: {
        x: 5,
        y: 5,
        stamina: 10,
        maxStamina: 20
      },
      camera: {
        x: 0,
        y: 0
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(costDisplay.eventBus).toBe(eventBus);
      expect(costDisplay.renderer).toBe(mockRenderer);
      expect(costDisplay.visible).toBe(true);
      expect(costDisplay.position).toBe('cursor');
    });

    it('should accept custom options', () => {
      const customDisplay = new CostDisplay(eventBus, mockRenderer, {
        position: 'corner',
        showBreakdown: false,
        format: 'simple',
        color: '#0000FF'
      });
      
      expect(customDisplay.position).toBe('corner');
      expect(customDisplay.showBreakdown).toBe(false);
      expect(customDisplay.format).toBe('simple');
      expect(customDisplay.color).toBe('#0000FF');
    });
  });

  describe('render', () => {
    it('should render cost when visible', () => {
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalled();
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining('5'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should not render when cursor not visible', () => {
      mockState.cursor.visible = false;
      
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).not.toHaveBeenCalled();
    });

    it('should not render when no cost', () => {
      mockState.cursor.cost = 0;
      
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).not.toHaveBeenCalled();
    });

    it('should not render when display not visible', () => {
      costDisplay.visible = false;
      
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).not.toHaveBeenCalled();
    });
  });

  describe('positioning', () => {
    it('should position at cursor', () => {
      costDisplay.position = 'cursor';
      costDisplay.render(mockState);
      
      // Should render near cursor position
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.any(String),
        mockState.cursor.x - mockState.camera.x + 1,
        mockState.cursor.y - mockState.camera.y
      );
    });

    it('should position at corner', () => {
      costDisplay.position = 'corner';
      costDisplay.render(mockState);
      
      // Should render at fixed corner position
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should position at bottom', () => {
      costDisplay.position = 'bottom';
      mockState.screenHeight = 25;
      costDisplay.render(mockState);
      
      // Should render at bottom of screen
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle custom position function', () => {
      costDisplay.position = (state) => ({ x: 15, y: 20 });
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.any(String),
        15,
        20
      );
    });
  });

  describe('formatting', () => {
    it('should format as simple', () => {
      costDisplay.format = 'simple';
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        '5',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should format as detailed', () => {
      costDisplay.format = 'detailed';
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining('Cost: 5'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should format as fraction', () => {
      costDisplay.format = 'fraction';
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        '5/10',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should show breakdown when enabled', () => {
      costDisplay.showBreakdown = true;
      costDisplay.render(mockState);
      
      // Should render multiple lines
      const calls = mockRenderer.drawText.mock.calls;
      expect(calls.length).toBeGreaterThan(1);
      expect(calls.some(call => call[0].includes('Base'))).toBe(true);
      expect(calls.some(call => call[0].includes('Terrain'))).toBe(true);
    });

    it('should handle custom format function', () => {
      costDisplay.format = (cost, state) => `Movement: ${cost} AP`;
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        'Movement: 5 AP',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('colors', () => {
    it('should use color based on affordability', () => {
      // Affordable (cost < stamina)
      mockState.cursor.cost = 5;
      mockState.player.stamina = 10;
      costDisplay.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#00FF00');
      
      mockRenderer.setColor.mockClear();
      
      // Expensive (cost >= stamina)
      mockState.cursor.cost = 12;
      costDisplay.render(mockState);
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#FF0000');
    });

    it('should use warning color for borderline cost', () => {
      mockState.cursor.cost = 8;
      mockState.player.stamina = 10;
      costDisplay.render(mockState);
      
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#FFFF00');
    });

    it('should use custom color function', () => {
      costDisplay.colorFunction = (cost, state) => {
        return cost > 10 ? '#FF00FF' : '#00FFFF';
      };
      
      mockState.cursor.cost = 15;
      costDisplay.render(mockState);
      
      expect(mockRenderer.setColor).toHaveBeenCalledWith('#FF00FF');
    });
  });

  describe('icons', () => {
    it('should show icons when enabled', () => {
      costDisplay.showIcons = true;
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringMatching(/[⚡♦]/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should use stamina icon for movement', () => {
      costDisplay.showIcons = true;
      mockState.cursor.mode = 'movement';
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining('⚡'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should use action icon for abilities', () => {
      costDisplay.showIcons = true;
      mockState.cursor.mode = 'ability';
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining('♦'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('background', () => {
    it('should draw background box when enabled', () => {
      costDisplay.showBackground = true;
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawBox).toHaveBeenCalled();
      // Check that drawBox was called before drawText
      const boxCallOrder = mockRenderer.drawBox.mock.invocationCallOrder[0];
      const textCallOrder = mockRenderer.drawText.mock.invocationCallOrder[0];
      expect(boxCallOrder).toBeLessThan(textCallOrder);
    });

    it('should size background based on text', () => {
      costDisplay.showBackground = true;
      costDisplay.showBreakdown = true;
      costDisplay.render(mockState);
      
      // Should draw larger box for breakdown
      expect(mockRenderer.drawBox).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number)
        })
      );
    });
  });

  describe('visibility', () => {
    it('should toggle visibility', () => {
      costDisplay.show();
      expect(costDisplay.visible).toBe(true);
      
      costDisplay.hide();
      expect(costDisplay.visible).toBe(false);
      
      costDisplay.toggle();
      expect(costDisplay.visible).toBe(true);
    });

    it('should emit events when visibility changes', async () => {
      const showSpy = vi.fn();
      const hideSpy = vi.fn();
      
      eventBus.on('CostDisplayShown', showSpy);
      eventBus.on('CostDisplayHidden', hideSpy);
      
      await costDisplay.show();
      expect(showSpy).toHaveBeenCalled();
      
      await costDisplay.hide();
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    it('should update on cursor movement', async () => {
      const renderSpy = vi.spyOn(costDisplay, 'update');
      
      await eventBus.emitAsync('CursorMoved', {
        cost: 8,
        costBreakdown: { base: 5, terrain: 3, total: 8 }
      });
      
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should hide on cursor hidden', async () => {
      costDisplay.autoHide = true;
      costDisplay.visible = true;
      
      await eventBus.emitAsync('CursorHidden', {});
      
      expect(costDisplay.visible).toBe(false);
    });

    it('should show on cursor shown', async () => {
      costDisplay.autoHide = true;
      costDisplay.visible = false;
      
      await eventBus.emitAsync('CursorShown', {});
      
      expect(costDisplay.visible).toBe(true);
    });
  });

  describe('animation', () => {
    it('should animate value changes', () => {
      vi.useFakeTimers();
      
      costDisplay.enableAnimation({ duration: 500 });
      
      // Update to trigger animation
      costDisplay.update(10, null);
      costDisplay.currentValue = 5; // Override for testing
      
      // Start animation
      costDisplay.render(mockState);
      
      // Halfway through
      vi.advanceTimersByTime(250);
      mockState.cursor.cost = 10; // Update state to match target
      costDisplay.render(mockState);
      
      // Should render interpolated value (around 7-8)
      const calls = mockRenderer.drawText.mock.calls;
      const hasInterpolated = calls.some(call => {
        const text = call[0];
        return text.includes('7') || text.includes('8');
      });
      expect(hasInterpolated).toBe(true);
      
      vi.useRealTimers();
    });

    it('should pulse when cost exceeds stamina', () => {
      vi.useFakeTimers();
      
      costDisplay.enableAnimation({ pulse: true });
      mockState.cursor.cost = 15;
      mockState.player.stamina = 10;
      
      costDisplay.render(mockState);
      
      // Should use pulsing color
      const colorCalls = mockRenderer.setColor.mock.calls;
      
      vi.advanceTimersByTime(500);
      costDisplay.render(mockState);
      
      // Color should change over time
      expect(colorCalls.length).toBeGreaterThan(0);
      
      vi.useRealTimers();
    });
  });

  describe('tooltips', () => {
    it('should show tooltip on hover', () => {
      costDisplay.showTooltip = true;
      mockState.mouseX = mockState.cursor.x;
      mockState.mouseY = mockState.cursor.y;
      
      costDisplay.render(mockState);
      
      // Should render tooltip with detailed info
      const calls = mockRenderer.drawText.mock.calls;
      expect(calls.some(call => call[0].includes('Movement Cost'))).toBe(true);
    });

    it('should include stamina info in tooltip', () => {
      costDisplay.showTooltip = true;
      mockState.mouseX = mockState.cursor.x;
      mockState.mouseY = mockState.cursor.y;
      
      costDisplay.render(mockState);
      
      const calls = mockRenderer.drawText.mock.calls;
      expect(calls.some(call => call[0].includes('Stamina'))).toBe(true);
      expect(calls.some(call => call[0].includes('10/20'))).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners', () => {
      const offSpy = vi.spyOn(eventBus, 'off');
      
      costDisplay.cleanup();
      
      expect(offSpy).toHaveBeenCalled();
    });

    it('should stop animation', () => {
      costDisplay.enableAnimation({ duration: 500 });
      expect(costDisplay.animationEnabled).toBe(true);
      
      costDisplay.cleanup();
      
      expect(costDisplay.animationEnabled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing cost breakdown', () => {
      delete mockState.cursor.costBreakdown;
      costDisplay.showBreakdown = true;
      
      expect(() => costDisplay.render(mockState)).not.toThrow();
    });

    it('should handle missing stamina', () => {
      delete mockState.player.stamina;
      
      expect(() => costDisplay.render(mockState)).not.toThrow();
    });

    it('should handle undefined cost', () => {
      mockState.cursor.cost = undefined;
      
      costDisplay.render(mockState);
      
      expect(mockRenderer.drawText).not.toHaveBeenCalled();
    });

    it('should handle negative costs', () => {
      mockState.cursor.cost = -5;
      
      costDisplay.render(mockState);
      
      // Should still render but with special formatting
      expect(mockRenderer.drawText).toHaveBeenCalledWith(
        expect.stringContaining('-5'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});