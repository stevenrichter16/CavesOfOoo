/**
 * Simple EventEmitter implementation for ChunkCache
 * Provides basic event emission functionality
 */

export class EventEmitter {
  constructor() {
    this._events = new Map();
  }
  
  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push(handler);
  }
  
  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  off(event, handler) {
    const handlers = this._events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to handlers
   */
  emit(event, ...args) {
    const handlers = this._events.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
  
  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional)
   */
  removeAllListeners(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }
}