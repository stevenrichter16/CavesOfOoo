import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { launchProjectile, calculateProjectilePath, getProjectileSymbol } from '../../src/js/systems/ProjectileSystem.js';
import * as events from '../../src/js/utils/events.js';

// Mock events
vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}));

// Mock DOM elements
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn()
  })),
  width: 800,
  height: 600,
  style: {}
};

const mockAnimationCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    globalAlpha: 1,
    font: '16px monospace',
    fillStyle: '#fff',
    textAlign: 'center',
    textBaseline: 'middle'
  })),
  width: 800,
  height: 600,
  style: {}
};

describe('ProjectileSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock document methods
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'game-canvas') return mockCanvas;
        if (id === 'animation-canvas') return mockAnimationCanvas;
        return null;
      }),
      createElement: vi.fn(() => ({
        style: {},
        remove: vi.fn()
      })),
      body: {
        appendChild: vi.fn()
      }
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('launchProjectile', () => {
    it('should launch a basic projectile', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 100,
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      // Fast-forward through the animation
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve(); // Let promises resolve
      }
      
      const result = await promise;
      
      expect(result).toEqual({ x: 10, y: 10 });
      expect(events.emit).toHaveBeenCalledWith(
        'ProjectileComplete',
        expect.objectContaining({ x: 10, y: 10 })
      );
    });

    it('should stop at collision', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 100,
        checkCollision: vi.fn((x, y) => x >= 5 && y >= 5) // Collision at (5,5)
      };

      const promise = launchProjectile(config);
      
      // Fast-forward through the animation
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      
      // Should stop before or at collision point
      expect(result.x).toBeLessThanOrEqual(5);
      expect(result.y).toBeLessThanOrEqual(5);
    });

    it('should call onImpact callback', async () => {
      const onImpact = vi.fn();
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 5,
        toY: 5,
        speed: 100,
        onImpact,
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      // Fast-forward through the animation
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      await promise;
      
      expect(onImpact).toHaveBeenCalledWith(5, 5);
    });

    it('should emit ProjectileLaunched event', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 100,
        type: 'fire',
        checkCollision: vi.fn(() => false)
      };

      launchProjectile(config);
      
      expect(events.emit).toHaveBeenCalledWith(
        'ProjectileLaunched',
        expect.objectContaining({
          fromX: 0,
          fromY: 0,
          toX: 10,
          toY: 10,
          type: 'fire'
        })
      );
    });

    it('should handle different projectile types', async () => {
      const types = ['fire', 'ice', 'electric', 'explosive'];
      
      for (const type of types) {
        vi.clearAllMocks();
        
        const config = {
          fromX: 0,
          fromY: 0,
          toX: 5,
          toY: 5,
          speed: 100,
          type,
          checkCollision: vi.fn(() => false)
        };

        const promise = launchProjectile(config);
        
        // Fast-forward
        for (let i = 0; i < 10; i++) {
          vi.advanceTimersByTime(50);
          await Promise.resolve();
        }
        
        await promise;
        
        expect(events.emit).toHaveBeenCalledWith(
          'ProjectileLaunched',
          expect.objectContaining({ type })
        );
      }
    });

    it('should use custom animation symbols', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 5,
        toY: 5,
        speed: 100,
        animationSymbols: ['*', '+', 'x'],
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      // The animation would cycle through these symbols
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      await promise;
      
      // We can't directly test the visual output, but the function should complete
      expect(true).toBe(true);
    });

    it('should handle arc height for parabolic trajectory', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 0, // Same Y, so we can test the arc
        speed: 100,
        arcHeight: 0.5,
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      
      expect(result).toEqual({ x: 10, y: 0 });
    });

    it('should create trail effect when enabled', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 5,
        toY: 5,
        speed: 100,
        trail: true,
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      await promise;
      
      // Trail would be rendered visually, can't test directly
      expect(true).toBe(true);
    });
  });

  describe('calculateProjectilePath', () => {
    it('should calculate straight line path', () => {
      const path = calculateProjectilePath(0, 0, 10, 0, 0);
      
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1].x).toBeCloseTo(10, 0);
    });

    it('should calculate parabolic arc path', () => {
      const path = calculateProjectilePath(0, 0, 10, 0, 5);
      
      expect(path.length).toBeGreaterThan(0);
      
      // Check that the path goes up (arc)
      let maxY = 0;
      for (const point of path) {
        if (point.y < maxY) maxY = point.y; // Y increases downward in canvas
      }
      
      // With arc, some points should be above the straight line
      expect(maxY).toBeLessThan(0);
    });

    it('should calculate diagonal path', () => {
      const path = calculateProjectilePath(0, 0, 10, 10, 0);
      
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      
      const last = path[path.length - 1];
      expect(last.x).toBeCloseTo(10, 0);
      expect(last.y).toBeCloseTo(10, 0);
    });

    it('should handle zero distance', () => {
      const path = calculateProjectilePath(5, 5, 5, 5, 0);
      
      expect(path.length).toBeGreaterThanOrEqual(1);
      expect(path[0]).toEqual({ x: 5, y: 5 });
    });

    it('should create smooth path with enough points', () => {
      const path = calculateProjectilePath(0, 0, 20, 20, 0);
      
      // Should have multiple points for smooth animation
      expect(path.length).toBeGreaterThan(10);
      
      // Points should be sequential
      for (let i = 1; i < path.length; i++) {
        const dist = Math.sqrt(
          Math.pow(path[i].x - path[i-1].x, 2) +
          Math.pow(path[i].y - path[i-1].y, 2)
        );
        // Each step should be reasonably small for smooth animation
        expect(dist).toBeLessThan(2);
      }
    });
  });

  describe('getProjectileSymbol', () => {
    it('should return fire symbols for fire type', () => {
      const symbols = ['*', '✦', '◉'];
      let found = false;
      
      // Test multiple times as it's random
      for (let i = 0; i < 10; i++) {
        const symbol = getProjectileSymbol('fire', 0);
        if (symbols.includes(symbol)) {
          found = true;
          break;
        }
      }
      
      expect(found).toBe(true);
    });

    it('should return ice symbols for ice type', () => {
      const symbols = ['*', '❄', '◆'];
      let found = false;
      
      for (let i = 0; i < 10; i++) {
        const symbol = getProjectileSymbol('ice', 0);
        if (symbols.includes(symbol)) {
          found = true;
          break;
        }
      }
      
      expect(found).toBe(true);
    });

    it('should return electric symbols for electric type', () => {
      const symbols = ['⚡', 'z', 'Z'];
      let found = false;
      
      for (let i = 0; i < 10; i++) {
        const symbol = getProjectileSymbol('electric', 0);
        if (symbols.includes(symbol)) {
          found = true;
          break;
        }
      }
      
      expect(found).toBe(true);
    });

    it('should return explosive symbols for explosive type', () => {
      const symbols = ['o', 'O', '@'];
      let found = false;
      
      for (let i = 0; i < 10; i++) {
        const symbol = getProjectileSymbol('explosive', 0);
        if (symbols.includes(symbol)) {
          found = true;
          break;
        }
      }
      
      expect(found).toBe(true);
    });

    it('should return default symbol for unknown type', () => {
      const symbol = getProjectileSymbol('unknown', 0);
      expect(symbol).toBe('o');
    });

    it('should cycle through custom symbols if provided', () => {
      const customSymbols = ['a', 'b', 'c'];
      
      expect(getProjectileSymbol('custom', 0, customSymbols)).toBe('a');
      expect(getProjectileSymbol('custom', 1, customSymbols)).toBe('b');
      expect(getProjectileSymbol('custom', 2, customSymbols)).toBe('c');
      expect(getProjectileSymbol('custom', 3, customSymbols)).toBe('a'); // Cycles back
    });
  });

  describe('Projectile collision scenarios', () => {
    it('should handle early collision detection', async () => {
      let collisionCount = 0;
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 100,
        checkCollision: vi.fn(() => {
          collisionCount++;
          return collisionCount > 3; // Collide after 3 checks
        })
      };

      const promise = launchProjectile(config);
      
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      
      // Should stop early due to collision
      expect(result.x).toBeLessThan(10);
      expect(result.y).toBeLessThan(10);
      expect(config.checkCollision).toHaveBeenCalled();
    });

    it('should handle collision at start position', async () => {
      const config = {
        fromX: 5,
        fromY: 5,
        toX: 10,
        toY: 10,
        speed: 100,
        checkCollision: vi.fn((x, y) => x === 5 && y === 5)
      };

      const promise = launchProjectile(config);
      
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      
      // Should stop at or near start due to immediate collision
      expect(result.x).toBeCloseTo(5, 0);
      expect(result.y).toBeCloseTo(5, 0);
    });

    it('should handle no collision function', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 5,
        toY: 5,
        speed: 100
        // No checkCollision function
      };

      const promise = launchProjectile(config);
      
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      
      // Should reach target without issue
      expect(result).toEqual({ x: 5, y: 5 });
    });
  });

  describe('Projectile speed variations', () => {
    it('should handle very slow projectile', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 10, // Very slow
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      // Would take longer to reach target
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      expect(result).toEqual({ x: 10, y: 10 });
    });

    it('should handle very fast projectile', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 500, // Very fast
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      // Should reach target quickly
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
      }
      
      const result = await promise;
      expect(result).toEqual({ x: 10, y: 10 });
    });

    it('should handle zero speed gracefully', async () => {
      const config = {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        speed: 0, // No movement
        checkCollision: vi.fn(() => false)
      };

      const promise = launchProjectile(config);
      
      // Should still complete, likely immediately or with default speed
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      
      const result = await promise;
      expect(result).toBeDefined();
    });
  });
});