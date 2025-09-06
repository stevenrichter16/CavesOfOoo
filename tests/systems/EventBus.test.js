import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Basic functionality', () => {
    it('should create an EventBus instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
      expect(eventBus.events).toBeInstanceOf(Map);
    });

    it('should subscribe to events with on()', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test', handler);
      
      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getHandlerCount('test')).toBe(1);
    });

    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      eventBus.on('test', handler);
      
      const result = eventBus.emit('test', { data: 'hello' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'hello' }, expect.any(Object));
      expect(result.cancelled).toBe(false);
    });

    it('should unsubscribe with off()', () => {
      const handler = vi.fn();
      eventBus.on('test', handler);
      eventBus.off('test', handler);
      
      eventBus.emit('test', { data: 'hello' });
      
      expect(handler).not.toHaveBeenCalled();
      expect(eventBus.getHandlerCount('test')).toBe(0);
    });

    it('should unsubscribe with returned function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test', handler);
      
      unsubscribe();
      eventBus.emit('test', { data: 'hello' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Once functionality', () => {
    it('should fire once handlers only once', () => {
      const handler = vi.fn();
      eventBus.once('test', handler);
      
      eventBus.emit('test', { data: 'first' });
      eventBus.emit('test', { data: 'second' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'first' }, expect.any(Object));
    });
  });

  describe('Priority handling', () => {
    it('should execute handlers by priority (highest first)', () => {
      const order = [];
      
      eventBus.on('test', () => order.push('low'), { priority: 1 });
      eventBus.on('test', () => order.push('high'), { priority: 10 });
      eventBus.on('test', () => order.push('medium'), { priority: 5 });
      eventBus.on('test', () => order.push('default'), {}); // priority: 0
      
      eventBus.emit('test');
      
      expect(order).toEqual(['high', 'medium', 'low', 'default']);
    });
  });

  describe('Event cancellation', () => {
    it('should allow handlers to cancel event propagation', () => {
      const handler1 = vi.fn((data, result) => {
        result.cancelled = true;
      });
      const handler2 = vi.fn();
      
      eventBus.on('test', handler1, { priority: 10 });
      eventBus.on('test', handler2, { priority: 5 });
      
      const result = eventBus.emit('test');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(result.cancelled).toBe(true);
    });
  });

  describe('Async functionality', () => {
    it('should handle async events with emitAsync()', async () => {
      const handler = vi.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      
      eventBus.on('test', handler, { async: true });
      
      const result = await eventBus.emitAsync('test', { data: 'hello' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'hello' }, expect.any(Object));
      expect(result.results).toContain('async result');
    });

    it('should handle async event cancellation', async () => {
      const handler1 = vi.fn(async (data, result) => {
        result.cancelled = true;
        return 'first';
      });
      const handler2 = vi.fn(async () => 'second');
      
      eventBus.on('test', handler1, { priority: 10 });
      eventBus.on('test', handler2, { priority: 5 });
      
      const result = await eventBus.emitAsync('test');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(result.cancelled).toBe(true);
      expect(result.results).toEqual(['first']);
    });

    it('should warn when async handler is called with sync emit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const handler = vi.fn(async () => {});
      
      eventBus.on('test', handler, { async: true });
      eventBus.emit('test');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Async handler called with sync emit'));
      expect(handler).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should catch and log errors in sync handlers', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalHandler = vi.fn();
      
      eventBus.on('test', errorHandler, { priority: 10 });
      eventBus.on('test', normalHandler, { priority: 5 });
      
      const result = eventBus.emit('test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler'),
        expect.any(Error)
      );
      expect(normalHandler).toHaveBeenCalled(); // Should continue after error
      expect(result.cancelled).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should catch and log errors in async handlers', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn(async () => {
        throw new Error('Async test error');
      });
      const normalHandler = vi.fn(async () => 'success');
      
      eventBus.on('test', errorHandler, { priority: 10 });
      eventBus.on('test', normalHandler, { priority: 5 });
      
      const result = await eventBus.emitAsync('test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in async event handler'),
        expect.any(Error)
      );
      expect(normalHandler).toHaveBeenCalled();
      expect(result.results).toContain('success');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utility methods', () => {
    it('should clear all event handlers', () => {
      eventBus.on('test1', vi.fn());
      eventBus.on('test2', vi.fn());
      eventBus.on('test3', vi.fn());
      
      expect(eventBus.getEvents().length).toBe(3);
      
      eventBus.clear();
      
      expect(eventBus.getEvents().length).toBe(0);
      expect(eventBus.events.size).toBe(0);
    });

    it('should get all registered events', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      eventBus.on('event3', vi.fn());
      
      const events = eventBus.getEvents();
      
      expect(events).toEqual(['event1', 'event2', 'event3']);
    });

    it('should get handler count for events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.on('other', vi.fn());
      
      expect(eventBus.getHandlerCount('test')).toBe(2);
      expect(eventBus.getHandlerCount('other')).toBe(1);
      expect(eventBus.getHandlerCount('nonexistent')).toBe(0);
    });
  });

  describe('Multiple handlers', () => {
    it('should handle multiple subscribers to same event', () => {
      const handler1 = vi.fn(() => 'result1');
      const handler2 = vi.fn(() => 'result2');
      const handler3 = vi.fn(() => 'result3');
      
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.on('test', handler3);
      
      const result = eventBus.emit('test', { data: 'hello' });
      
      expect(handler1).toHaveBeenCalledWith({ data: 'hello' }, expect.any(Object));
      expect(handler2).toHaveBeenCalledWith({ data: 'hello' }, expect.any(Object));
      expect(handler3).toHaveBeenCalledWith({ data: 'hello' }, expect.any(Object));
      // Order depends on insertion, no priority specified
      expect(result.results).toContain('result1');
      expect(result.results).toContain('result2');
      expect(result.results).toContain('result3');
      expect(result.results).toHaveLength(3);
    });

    it('should handle mixed sync and async handlers in emitAsync', async () => {
      const syncHandler = vi.fn(() => 'sync');
      const asyncHandler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async';
      });
      
      eventBus.on('test', syncHandler);
      eventBus.on('test', asyncHandler);
      
      const result = await eventBus.emitAsync('test');
      
      expect(syncHandler).toHaveBeenCalled();
      expect(asyncHandler).toHaveBeenCalled();
      expect(result.results).toContain('sync');
      expect(result.results).toContain('async');
    });
  });

  describe('Edge cases', () => {
    it('should handle emitting events with no subscribers', () => {
      const result = eventBus.emit('nonexistent', { data: 'hello' });
      
      expect(result.cancelled).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.data).toEqual({ data: 'hello' });
    });

    it('should handle async emit with no subscribers', async () => {
      const result = await eventBus.emitAsync('nonexistent', { data: 'hello' });
      
      expect(result.cancelled).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.data).toEqual({ data: 'hello' });
    });

    it('should handle removing non-existent handler', () => {
      const handler = vi.fn();
      
      // Should not throw
      expect(() => {
        eventBus.off('test', handler);
      }).not.toThrow();
    });

    it('should handle undefined data in emit', () => {
      const handler = vi.fn();
      eventBus.on('test', handler);
      
      const result = eventBus.emit('test');
      
      expect(handler).toHaveBeenCalledWith({}, expect.any(Object));
      expect(result.data).toEqual({});
    });
  });
});