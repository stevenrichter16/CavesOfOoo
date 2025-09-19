/**
 * QuestEventBus - Centralized event system for quest-related events
 * Provides pub/sub functionality for decoupling quest logic from game systems
 */
export class QuestEventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register an event handler
   * @param {string} eventType - The type of event to listen for
   * @param {Function} handler - The callback function to invoke
   * @returns {Function} Unsubscribe function
   */
  on(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(handler);
    
    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Register a one-time event handler
   * @param {string} eventType - The type of event to listen for
   * @param {Function} handler - The callback function to invoke once
   */
  once(eventType, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(eventType, wrappedHandler);
    };
    
    this.on(eventType, wrappedHandler);
  }

  /**
   * Remove a specific event handler
   * @param {string} eventType - The type of event
   * @param {Function} handler - The handler to remove
   */
  off(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      return;
    }
    
    this.listeners.get(eventType).delete(handler);
    
    // Clean up empty sets
    if (this.listeners.get(eventType).size === 0) {
      this.listeners.delete(eventType);
    }
  }

  /**
   * Emit an event to all registered handlers
   * @param {string} eventType - The type of event to emit
   * @param {*} data - Data to pass to handlers
   */
  emit(eventType, data) {
    console.log(`[QUEST_EVENT_BUS] Emit called for event: ${eventType}`, data);
    
    if (!this.listeners.has(eventType)) {
      console.log(`[QUEST_EVENT_BUS] No listeners registered for event: ${eventType}`);
      return;
    }
    
    // Create a copy to avoid issues with handlers modifying the set
    const handlers = Array.from(this.listeners.get(eventType));
    console.log(`[QUEST_EVENT_BUS] Found ${handlers.length} handler(s) for event: ${eventType}`);
    
    handlers.forEach((handler, index) => {
      try {
        console.log(`[QUEST_EVENT_BUS] Calling handler ${index + 1} for event: ${eventType}`);
        handler(data);
      } catch (error) {
        console.error(`[QUEST_EVENT_BUS] Error in event handler for ${eventType}:`, error);
      }
    });
    
    console.log(`[QUEST_EVENT_BUS] Finished emitting event: ${eventType}`);
  }

  /**
   * Remove all handlers for a specific event type
   * @param {string} eventType - The type of event to clear
   */
  clear(eventType) {
    this.listeners.delete(eventType);
  }

  /**
   * Remove all handlers for all events
   */
  clearAll() {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for an event type
   * @param {string} eventType - The type of event
   * @returns {number} Number of listeners
   */
  listenerCount(eventType) {
    return this.listeners.has(eventType) ? this.listeners.get(eventType).size : 0;
  }
}