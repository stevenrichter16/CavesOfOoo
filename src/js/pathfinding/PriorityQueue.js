/**
 * PriorityQueue - Min-heap based priority queue for efficient pathfinding
 * Used for A* algorithm implementation
 */
export class PriorityQueue {
  /**
   * Create a new priority queue
   * @param {Function} comparator - Optional custom comparator function
   */
  constructor(comparator = null) {
    this.heap = [];
    this.valueToIndex = new Map();
    this.comparator = comparator || ((a, b) => a.priority - b.priority);
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Get number of items in queue
   * @returns {number} Size of queue
   */
  size() {
    return this.heap.length;
  }

  /**
   * Add item to queue with priority
   * @param {*} value - Item to add
   * @param {number} priority - Priority (lower is higher priority)
   */
  enqueue(value, priority = 0) {
    const item = { value, priority };
    this.heap.push(item);
    const index = this.heap.length - 1;
    this.valueToIndex.set(value, index);
    this.bubbleUp(index);
  }

  /**
   * Remove and return highest priority item
   * @returns {Object|null} Item with {value, priority} or null if empty
   */
  dequeue() {
    if (this.isEmpty()) return null;

    const first = this.heap[0];
    const last = this.heap.pop();
    
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.valueToIndex.set(last.value, 0);
      this.bubbleDown(0);
    }
    
    this.valueToIndex.delete(first.value);
    return first;
  }

  /**
   * Peek at highest priority item without removing
   * @returns {Object|null} Item with {value, priority} or null if empty
   */
  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  /**
   * Check if queue contains a value
   * @param {*} value - Value to check for
   * @returns {boolean} True if value exists in queue
   */
  contains(value) {
    return this.valueToIndex.has(value);
  }

  /**
   * Update priority of existing item
   * @param {*} value - Value to update
   * @param {number} newPriority - New priority
   * @returns {boolean} True if updated, false if not found
   */
  updatePriority(value, newPriority) {
    if (!this.contains(value)) return false;

    const index = this.valueToIndex.get(value);
    const oldPriority = this.heap[index].priority;
    this.heap[index].priority = newPriority;

    // Bubble in appropriate direction
    if (newPriority < oldPriority) {
      this.bubbleUp(index);
    } else if (newPriority > oldPriority) {
      this.bubbleDown(index);
    }

    return true;
  }

  /**
   * Clear all items from queue
   */
  clear() {
    this.heap = [];
    this.valueToIndex.clear();
  }

  /**
   * Get array of items in priority order
   * @returns {Array} Items sorted by priority
   */
  toArray() {
    // Create a copy and sort it
    const copy = [...this.heap];
    copy.sort(this.comparator);
    return copy;
  }

  /**
   * Bubble item up to maintain heap property
   * @private
   * @param {number} index - Index to bubble up from
   */
  bubbleUp(index) {
    const item = this.heap[index];
    
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      
      if (this.comparator(item, parent) >= 0) break;
      
      // Swap with parent
      this.heap[index] = parent;
      this.heap[parentIndex] = item;
      this.valueToIndex.set(parent.value, index);
      this.valueToIndex.set(item.value, parentIndex);
      
      index = parentIndex;
    }
  }

  /**
   * Bubble item down to maintain heap property
   * @private
   * @param {number} index - Index to bubble down from
   */
  bubbleDown(index) {
    const length = this.heap.length;
    const item = this.heap[index];
    
    while (true) {
      let swapIndex = null;
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;
      
      if (leftIndex < length) {
        const left = this.heap[leftIndex];
        if (this.comparator(left, item) < 0) {
          swapIndex = leftIndex;
        }
      }
      
      if (rightIndex < length) {
        const right = this.heap[rightIndex];
        const compareWith = swapIndex === null ? item : this.heap[swapIndex];
        if (this.comparator(right, compareWith) < 0) {
          swapIndex = rightIndex;
        }
      }
      
      if (swapIndex === null) break;
      
      // Swap with smaller child
      const swapItem = this.heap[swapIndex];
      this.heap[index] = swapItem;
      this.heap[swapIndex] = item;
      this.valueToIndex.set(swapItem.value, index);
      this.valueToIndex.set(item.value, swapIndex);
      
      index = swapIndex;
    }
  }
}