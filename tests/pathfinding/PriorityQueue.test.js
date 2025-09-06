import { describe, it, expect, beforeEach } from 'vitest';
import { PriorityQueue } from '../../src/js/pathfinding/PriorityQueue.js';

describe('PriorityQueue', () => {
  let pq;

  beforeEach(() => {
    pq = new PriorityQueue();
  });

  describe('constructor', () => {
    it('should create an empty queue', () => {
      expect(pq.isEmpty()).toBe(true);
      expect(pq.size()).toBe(0);
    });

    it('should accept a custom comparator', () => {
      const customPQ = new PriorityQueue((a, b) => b.priority - a.priority);
      customPQ.enqueue('first', 1);
      customPQ.enqueue('second', 3);
      customPQ.enqueue('third', 2);
      
      expect(customPQ.dequeue().value).toBe('second');
      expect(customPQ.dequeue().value).toBe('third');
      expect(customPQ.dequeue().value).toBe('first');
    });
  });

  describe('enqueue', () => {
    it('should add items to the queue', () => {
      pq.enqueue(5, 5);
      expect(pq.isEmpty()).toBe(false);
      expect(pq.size()).toBe(1);
    });

    it('should maintain min heap property', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      pq.enqueue('d', 1);
      
      expect(pq.peek().value).toBe('d');
    });

    it('should handle duplicate priorities', () => {
      pq.enqueue('first', 5);
      pq.enqueue('second', 5);
      pq.enqueue('third', 5);
      
      expect(pq.size()).toBe(3);
    });

    it('should handle negative priorities', () => {
      pq.enqueue('a', -5);
      pq.enqueue('b', 3);
      pq.enqueue('c', -10);
      
      expect(pq.peek().value).toBe('c');
    });
  });

  describe('dequeue', () => {
    it('should return null from empty queue', () => {
      expect(pq.dequeue()).toBeNull();
    });

    it('should remove and return min priority item', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      
      const item = pq.dequeue();
      expect(item.value).toBe('b');
      expect(item.priority).toBe(3);
      expect(pq.size()).toBe(2);
    });

    it('should maintain heap property after removal', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      pq.enqueue('d', 1);
      pq.enqueue('e', 9);
      
      expect(pq.dequeue().value).toBe('d'); // 1
      expect(pq.dequeue().value).toBe('b'); // 3
      expect(pq.dequeue().value).toBe('a'); // 5
      expect(pq.dequeue().value).toBe('c'); // 7
      expect(pq.dequeue().value).toBe('e'); // 9
      expect(pq.isEmpty()).toBe(true);
    });
  });

  describe('peek', () => {
    it('should return null for empty queue', () => {
      expect(pq.peek()).toBeNull();
    });

    it('should return min item without removing', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      
      const item = pq.peek();
      expect(item.value).toBe('b');
      expect(pq.size()).toBe(2);
      
      // Verify item wasn't removed
      expect(pq.peek().value).toBe('b');
    });
  });

  describe('contains', () => {
    it('should find items by value', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      
      expect(pq.contains('a')).toBe(true);
      expect(pq.contains('b')).toBe(true);
      expect(pq.contains('c')).toBe(false);
    });

    it('should work with object values', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      
      pq.enqueue(obj1, 5);
      pq.enqueue(obj2, 3);
      
      expect(pq.contains(obj1)).toBe(true);
      expect(pq.contains(obj2)).toBe(true);
      expect(pq.contains({ id: 1 })).toBe(false); // Different object reference
    });
  });

  describe('updatePriority', () => {
    it('should update priority of existing item', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      
      pq.updatePriority('a', 1);
      
      expect(pq.dequeue().value).toBe('a');
      expect(pq.dequeue().value).toBe('b');
      expect(pq.dequeue().value).toBe('c');
    });

    it('should handle updating to higher priority', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      
      pq.updatePriority('b', 10);
      
      expect(pq.dequeue().value).toBe('a');
      expect(pq.dequeue().value).toBe('c');
      expect(pq.dequeue().value).toBe('b');
    });

    it('should return false for non-existent item', () => {
      pq.enqueue('a', 5);
      
      expect(pq.updatePriority('b', 3)).toBe(false);
    });

    it('should return true for successful update', () => {
      pq.enqueue('a', 5);
      
      expect(pq.updatePriority('a', 3)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      
      pq.clear();
      
      expect(pq.isEmpty()).toBe(true);
      expect(pq.size()).toBe(0);
      expect(pq.dequeue()).toBeNull();
    });
  });

  describe('toArray', () => {
    it('should return array of items in priority order', () => {
      pq.enqueue('a', 5);
      pq.enqueue('b', 3);
      pq.enqueue('c', 7);
      pq.enqueue('d', 1);
      
      const arr = pq.toArray();
      
      expect(arr).toHaveLength(4);
      expect(arr[0].value).toBe('d');
      expect(arr[1].value).toBe('b');
      expect(arr[2].value).toBe('a');
      expect(arr[3].value).toBe('c');
      
      // Original queue should be unchanged
      expect(pq.size()).toBe(4);
    });

    it('should return empty array for empty queue', () => {
      expect(pq.toArray()).toEqual([]);
    });
  });

  describe('performance', () => {
    it('should handle large number of items efficiently', () => {
      const n = 10000;
      const start = performance.now();
      
      // Insert n items with random priorities
      for (let i = 0; i < n; i++) {
        pq.enqueue(i, Math.random() * 1000);
      }
      
      // Remove all items
      let lastPriority = -Infinity;
      while (!pq.isEmpty()) {
        const item = pq.dequeue();
        expect(item.priority).toBeGreaterThanOrEqual(lastPriority);
        lastPriority = item.priority;
      }
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('edge cases', () => {
    it('should handle single item', () => {
      pq.enqueue('only', 42);
      expect(pq.size()).toBe(1);
      expect(pq.peek().value).toBe('only');
      expect(pq.dequeue().value).toBe('only');
      expect(pq.isEmpty()).toBe(true);
    });

    it('should handle infinity priorities', () => {
      pq.enqueue('a', Infinity);
      pq.enqueue('b', -Infinity);
      pq.enqueue('c', 0);
      
      expect(pq.dequeue().value).toBe('b');
      expect(pq.dequeue().value).toBe('c');
      expect(pq.dequeue().value).toBe('a');
    });

    it('should handle null values', () => {
      pq.enqueue(null, 5);
      pq.enqueue(undefined, 3);
      pq.enqueue('valid', 7);
      
      expect(pq.dequeue().value).toBe(undefined);
      expect(pq.dequeue().value).toBe(null);
      expect(pq.dequeue().value).toBe('valid');
    });
  });
});