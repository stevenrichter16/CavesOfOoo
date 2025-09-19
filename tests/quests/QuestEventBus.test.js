import { describe, it, expect, beforeEach } from 'vitest';
import { QuestEventBus } from '../../src/js/world/quests/QuestEventBus.js';

describe('QuestEventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new QuestEventBus();
  });

  describe('emit and on', () => {
    it('should call registered handlers when event is emitted', () => {
      let called = false;
      let receivedData = null;

      eventBus.on('TEST_EVENT', (data) => {
        called = true;
        receivedData = data;
      });

      eventBus.emit('TEST_EVENT', { value: 42 });

      expect(called).toBe(true);
      expect(receivedData).toEqual({ value: 42 });
    });

    it('should support multiple handlers for same event', () => {
      const calls = [];

      eventBus.on('TEST_EVENT', () => calls.push('handler1'));
      eventBus.on('TEST_EVENT', () => calls.push('handler2'));
      eventBus.on('TEST_EVENT', () => calls.push('handler3'));

      eventBus.emit('TEST_EVENT', {});

      expect(calls).toEqual(['handler1', 'handler2', 'handler3']);
    });

    it('should not call handlers for different events', () => {
      let called = false;

      eventBus.on('EVENT_A', () => { called = true; });
      eventBus.emit('EVENT_B', {});

      expect(called).toBe(false);
    });

    it('should handle emitting events with no handlers gracefully', () => {
      expect(() => {
        eventBus.emit('NO_HANDLERS', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('off', () => {
    it('should remove specific handler', () => {
      let count = 0;
      const handler1 = () => count++;
      const handler2 = () => count += 10;

      eventBus.on('TEST', handler1);
      eventBus.on('TEST', handler2);

      eventBus.emit('TEST', {});
      expect(count).toBe(11);

      count = 0;
      eventBus.off('TEST', handler1);
      eventBus.emit('TEST', {});
      expect(count).toBe(10);
    });

    it('should handle removing non-existent handler gracefully', () => {
      expect(() => {
        eventBus.off('TEST', () => {});
      }).not.toThrow();
    });
  });

  describe('once', () => {
    it('should call handler only once', () => {
      let count = 0;

      eventBus.once('TEST', () => count++);

      eventBus.emit('TEST', {});
      eventBus.emit('TEST', {});
      eventBus.emit('TEST', {});

      expect(count).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all handlers for an event', () => {
      let count = 0;

      eventBus.on('TEST', () => count++);
      eventBus.on('TEST', () => count++);
      eventBus.on('TEST', () => count++);

      eventBus.clear('TEST');
      eventBus.emit('TEST', {});

      expect(count).toBe(0);
    });

    it('should remove all handlers when no event specified', () => {
      let countA = 0;
      let countB = 0;

      eventBus.on('EVENT_A', () => countA++);
      eventBus.on('EVENT_B', () => countB++);

      eventBus.clearAll();
      eventBus.emit('EVENT_A', {});
      eventBus.emit('EVENT_B', {});

      expect(countA).toBe(0);
      expect(countB).toBe(0);
    });
  });
});