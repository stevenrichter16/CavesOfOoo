import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementAnimator } from '../../src/js/execution/MovementAnimator.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('MovementAnimator', () => {
  let animator;
  let eventBus;
  let mockRenderer;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    
    // Mock renderer
    mockRenderer = {
      drawSprite: vi.fn(),
      drawTile: vi.fn(),
      clearTile: vi.fn(),
      setOffset: vi.fn(),
      resetOffset: vi.fn()
    };
    
    animator = new MovementAnimator(eventBus, mockRenderer);
    
    // Create test state
    mockState = {
      player: {
        x: 5,
        y: 5,
        symbol: '@',
        color: '#FFFFFF'
      },
      camera: {
        x: 0,
        y: 0
      },
      tileSize: 16,
      animations: {
        moveSpeed: 200
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with event bus and renderer', () => {
      expect(animator.eventBus).toBe(eventBus);
      expect(animator.renderer).toBe(mockRenderer);
      expect(animator.isAnimating).toBe(false);
    });

    it('should have default configuration', () => {
      expect(animator.defaultDuration).toBe(200);
      expect(animator.easing).toBe('linear');
      expect(animator.showTrail).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customAnimator = new MovementAnimator(eventBus, mockRenderer, {
        defaultDuration: 300,
        easing: 'ease-in-out',
        showTrail: true
      });
      
      expect(customAnimator.defaultDuration).toBe(300);
      expect(customAnimator.easing).toBe('ease-in-out');
      expect(customAnimator.showTrail).toBe(true);
    });
  });

  describe('animateMovement', () => {
    it('should animate movement between two positions', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      // Should have called renderer methods
      expect(mockRenderer.setOffset).toHaveBeenCalled();
      expect(mockRenderer.resetOffset).toHaveBeenCalled();
    });

    it('should calculate correct pixel offsets', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 7, y: 5 }; // 2 tiles right
      
      await animator.animateMovement(from, to, mockState, { duration: 50 });
      
      // Should animate from 0 to 32 pixels (2 * 16)
      const calls = mockRenderer.setOffset.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // First call should be near start
      const firstOffset = calls[0][0];
      expect(firstOffset.x).toBeCloseTo(0, 0);
      
      // Should have progressed
      const hasProgression = calls.some(call => call[0].x > 0 && call[0].x < 32);
      expect(hasProgression).toBe(true);
    });

    it('should handle diagonal movement', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 6 };
      
      await animator.animateMovement(from, to, mockState);
      
      const calls = mockRenderer.setOffset.mock.calls;
      expect(calls.some(call => call[0].x > 0 && call[0].y > 0)).toBe(true);
    });

    it('should respect custom duration', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      const startTime = Date.now();
      await animator.animateMovement(from, to, mockState, { duration: 100 });
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('should emit animation events', async () => {
      const startSpy = vi.fn();
      const updateSpy = vi.fn();
      const completeSpy = vi.fn();
      
      eventBus.on('AnimationStart', startSpy);
      eventBus.on('AnimationUpdate', updateSpy);
      eventBus.on('AnimationComplete', completeSpy);
      
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      expect(startSpy).toHaveBeenCalledOnce();
      expect(updateSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalledOnce();
    });

    it('should handle instant movement (no animation)', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState, { duration: 0 });
      
      expect(mockRenderer.setOffset).not.toHaveBeenCalled();
    });
  });

  describe('easing functions', () => {
    it('should support linear easing', () => {
      animator.easing = 'linear';
      const progress = animator.getEasedProgress(0.5);
      expect(progress).toBe(0.5);
    });

    it('should support ease-in', () => {
      animator.easing = 'ease-in';
      const progress = animator.getEasedProgress(0.5);
      expect(progress).toBeLessThan(0.5); // Starts slow
    });

    it('should support ease-out', () => {
      animator.easing = 'ease-out';
      const progress = animator.getEasedProgress(0.5);
      expect(progress).toBeGreaterThan(0.5); // Ends slow
    });

    it('should support ease-in-out', () => {
      animator.easing = 'ease-in-out';
      const progress = animator.getEasedProgress(0.5);
      expect(progress).toBeCloseTo(0.5, 1); // S-curve
    });

    it('should support custom easing function', () => {
      animator.easing = (t) => t * t * t; // Cubic ease-in
      const progress = animator.getEasedProgress(0.5);
      expect(progress).toBe(0.125);
    });
  });

  describe('trail effects', () => {
    it('should show trail when enabled', async () => {
      animator.showTrail = true;
      
      const from = { x: 5, y: 5 };
      const to = { x: 7, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      // Should draw trail markers
      expect(mockRenderer.drawTile).toHaveBeenCalledWith(
        expect.any(String), // Trail symbol
        6, 5, // Middle position
        expect.any(Object) // Style
      );
    });

    it('should fade trail over time', async () => {
      animator.showTrail = true;
      animator.trailFadeDuration = 100;
      
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      // Trail should be drawn
      expect(mockRenderer.drawTile).toHaveBeenCalled();
      
      // Wait for fade
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trail should be cleared
      expect(mockRenderer.clearTile).toHaveBeenCalled();
    });

    it('should not show trail when disabled', async () => {
      animator.showTrail = false;
      
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      // Should not draw trail
      const trailCalls = mockRenderer.drawTile.mock.calls.filter(
        call => call[0] === '·' || call[0] === '•'
      );
      expect(trailCalls.length).toBe(0);
    });
  });

  describe('sprite animation', () => {
    it('should animate sprite position smoothly', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState, { duration: 100 });
      
      // Should update sprite position multiple times
      const offsetCalls = mockRenderer.setOffset.mock.calls;
      expect(offsetCalls.length).toBeGreaterThan(2);
      
      // Check for smooth progression
      for (let i = 1; i < offsetCalls.length; i++) {
        const prevX = offsetCalls[i - 1][0].x;
        const currX = offsetCalls[i][0].x;
        expect(currX).toBeGreaterThanOrEqual(prevX);
      }
    });

    it('should handle sprite frames', async () => {
      mockState.player.animationFrames = ['@', '&'];
      
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      // Should alternate frames
      expect(mockRenderer.drawSprite).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: expect.stringMatching(/[@&]/)
        })
      );
    });
  });

  describe('cancellation', () => {
    it('should cancel ongoing animation', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 10, y: 5 }; // Long distance
      
      // Start animation
      const promise = animator.animateMovement(from, to, mockState, { duration: 500 });
      
      // Cancel after short delay to ensure animation has started
      await new Promise(resolve => setTimeout(resolve, 10));
      animator.cancel();
      
      const result = await promise;
      
      expect(result.cancelled).toBe(true);
      expect(animator.isAnimating).toBe(false);
    });

    it('should clean up on cancellation', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      const promise = animator.animateMovement(from, to, mockState);
      animator.cancel();
      
      await promise;
      
      expect(mockRenderer.resetOffset).toHaveBeenCalled();
    });
  });

  describe('multiple animations', () => {
    it('should queue animations', async () => {
      const anim1 = animator.animateMovement(
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        mockState,
        { duration: 50 }
      );
      
      const anim2 = animator.animateMovement(
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        mockState,
        { duration: 50 }
      );
      
      await Promise.all([anim1, anim2]);
      
      // Both should complete
      expect(mockRenderer.resetOffset).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent animation requests', async () => {
      animator.allowConcurrent = false;
      
      const anim1 = animator.animateMovement(
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        mockState,
        { duration: 100 }
      );
      
      const anim2 = animator.animateMovement(
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        mockState
      );
      
      const result2 = await anim2;
      
      expect(result2.skipped).toBe(true);
      
      await anim1; // Let first complete
    });
  });

  describe('performance', () => {
    it('should use requestAnimationFrame when available', async () => {
      const rafSpy = vi.spyOn(global, 'requestAnimationFrame');
      
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      expect(rafSpy).toHaveBeenCalled();
      
      rafSpy.mockRestore();
    });

    it('should fall back to setTimeout without RAF', async () => {
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = undefined;
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      
      await animator.animateMovement(from, to, mockState);
      
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      global.requestAnimationFrame = originalRAF;
      setTimeoutSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      animator.currentAnimation = { id: 1 };
      animator.isAnimating = true;
      
      animator.cleanup();
      
      expect(animator.currentAnimation).toBeNull();
      expect(animator.isAnimating).toBe(false);
    });

    it('should cancel ongoing animations on cleanup', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 10, y: 5 };
      
      const promise = animator.animateMovement(from, to, mockState, { duration: 500 });
      
      // Let animation start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      animator.cleanup();
      
      const result = await promise;
      expect(result.cancelled).toBe(true);
    });
  });
});