/**
 * EventBus - A centralized event system for decoupled communication
 * Supports async event handlers and event cancellation
 */
export class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options for the handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const wrappedHandler = {
      handler,
      once: options.once || false,
      priority: options.priority || 0,
      async: options.async || false
    };

    const handlers = this.events.get(event);
    
    // Insert in sorted position instead of sorting entire array
    const insertIndex = this.findInsertIndex(handlers, wrappedHandler.priority);
    handlers.splice(insertIndex, 0, wrappedHandler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event that fires only once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    return this.on(event, handler, { once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  off(event, handler) {
    if (!this.events.has(event)) return;

    const handlers = this.events.get(event);
    const index = handlers.findIndex(h => h.handler === handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event synchronously
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Object} Event result with cancelled flag
   */
  emit(event, data = {}) {
    const result = {
      cancelled: false,
      results: [],
      data
    };

    if (!this.events.has(event)) {
      return result;
    }

    const handlers = this.events.get(event).slice();
    
    for (const wrappedHandler of handlers) {
      if (wrappedHandler.async) {
        console.warn(`Async handler called with sync emit for event: ${event}`);
        continue;
      }

      try {
        const handlerResult = wrappedHandler.handler(data, result);
        result.results.push(handlerResult);

        // Allow handlers to cancel event propagation
        if (result.cancelled) {
          break;
        }

        if (wrappedHandler.once) {
          this.off(event, wrappedHandler.handler);
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }

    return result;
  }

  /**
   * Emit an event asynchronously
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Promise<Object>} Event result with cancelled flag
   */
  async emitAsync(event, data = {}) {
    const result = {
      cancelled: false,
      results: [],
      data
    };

    if (!this.events.has(event)) {
      return result;
    }

    const handlers = this.events.get(event).slice();
    
    for (const wrappedHandler of handlers) {
      try {
        const handlerResult = await wrappedHandler.handler(data, result);
        result.results.push(handlerResult);

        // Allow handlers to cancel event propagation
        if (result.cancelled) {
          break;
        }

        if (wrappedHandler.once) {
          this.off(event, wrappedHandler.handler);
        }
      } catch (error) {
        console.error(`Error in async event handler for ${event}:`, error);
      }
    }

    return result;
  }

  /**
   * Clear all event handlers
   */
  clear() {
    this.events.clear();
  }

  /**
   * Get all registered events
   * @returns {Array<string>} Array of event names
   */
  getEvents() {
    return Array.from(this.events.keys());
  }

  /**
   * Get handler count for an event
   * @param {string} event - Event name
   * @returns {number} Number of handlers
   */
  getHandlerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }

  /**
   * Find insertion index for sorted priority (higher priority first)
   * @private
   */
  findInsertIndex(handlers, priority) {
    let left = 0;
    let right = handlers.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (handlers[mid].priority > priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return left;
  }
}

// Default instance getter - can be overridden for testing
let _gameEventBus = null;

/**
 * Get or create the game event bus instance
 * @returns {EventBus} The game event bus instance
 */
export function getGameEventBus() {
  if (!_gameEventBus) {
    _gameEventBus = new EventBus();
  }
  return _gameEventBus;
}

/**
 * Reset the game event bus (useful for testing)
 */
export function resetGameEventBus() {
  _gameEventBus = null;
}

// Export for backward compatibility (will deprecate)
export const gameEventBus = getGameEventBus();