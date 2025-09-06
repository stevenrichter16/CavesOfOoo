/**
 * LootSystem - Manages item pickups, drops, and inventory interactions
 * Handles item stacking, world items, and inventory management
 */
import { EventBus, getGameEventBus } from './EventBus.js';

// Configuration constants
export const LOOT_CONFIG = {
  maxStackSize: 99,
  defaults: {
    itemCount: 1
  }
};

export class LootSystem {
  constructor(eventBus = null) {
    this.eventBus = eventBus || getGameEventBus();
    this.maxStackSize = LOOT_CONFIG.maxStackSize;
  }

  /**
   * Check for items at a specific position and pick them up
   * @param {Object} state - Game state
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of picked up items
   */
  checkForItems(state, x, y) {
    // Get a copy of items to avoid modification during iteration
    const items = [...this.getItemsAt(state, x, y)];
    const pickedUpItems = [];
    
    if (items.length > 0) {
      for (const item of items) {
        // Synchronous pickup to avoid race conditions
        const success = this.pickupItem(state, item);
        if (success) {
          pickedUpItems.push(item);
        }
      }
    }
    
    return pickedUpItems;
  }

  /**
   * Pick up an item from the world
   * @param {Object} state - Game state
   * @param {Object} item - Item to pick up
   * @returns {boolean} True if successful
   */
  pickupItem(state, item) {
    if (!state?.player?.inventory) {
      return false;
    }
    
    // Emit pickup event
    this.eventBus.emit('ItemPickup', { item, player: state.player });
    
    // Add to inventory with proper stacking
    if (item.stackable) {
      this.stackItem(state.player.inventory, item);
    } else {
      state.player.inventory.push(item);
    }
    
    // Remove from world
    if (state.chunk?.items) {
      const index = state.chunk.items.indexOf(item);
      if (index > -1) {
        state.chunk.items.splice(index, 1);
      }
    }
    
    // Log the pickup
    if (state.log && item.name) {
      state.log(`You pick up ${item.name}.`, 'good');
    }
    
    return true;
  }

  /**
   * Stack an item with existing inventory items
   * @param {Array} inventory - Inventory array
   * @param {Object} newItem - Item to stack
   */
  stackItem(inventory, newItem) {
    // Only stack if item is marked as stackable
    if (!newItem.stackable) {
      inventory.push(newItem);
      return;
    }
    
    // Find existing stack
    const existing = inventory.find(
      i => i.id === newItem.id && i.stackable
    );
    
    if (existing) {
      const currentCount = existing.count || 1;
      const newCount = newItem.count || 1;
      const totalCount = currentCount + newCount;
      
      // Check max stack size
      if (this.maxStackSize && totalCount > this.maxStackSize) {
        // Fill current stack to max
        existing.count = this.maxStackSize;
        
        // Deep clone for overflow to avoid shared references
        const overflow = this.deepCloneItem(newItem);
        overflow.count = totalCount - this.maxStackSize;
        inventory.push(overflow);
      } else {
        // Add to existing stack
        existing.count = totalCount;
      }
    } else {
      // No existing stack, add as new item
      inventory.push(newItem);
    }
  }

  /**
   * Drop an item from inventory to the world
   * @param {Object} state - Game state
   * @param {Object} item - Item to drop
   * @param {number} x - X coordinate (optional, defaults to player position)
   * @param {number} y - Y coordinate (optional, defaults to player position)
   * @param {number} count - Number to drop (for stacks)
   * @returns {boolean} True if successful
   */
  dropItem(state, item, x = null, y = null, count = null) {
    if (!state?.player?.inventory) {
      return false;
    }
    
    // Check if item is in inventory
    const index = state.player.inventory.indexOf(item);
    if (index === -1) {
      return false;
    }
    
    // Use player position if not specified
    if (x === null || y === null) {
      x = state.player.x;
      y = state.player.y;
    }
    
    // Initialize chunk items if needed
    if (!state.chunk) {
      state.chunk = {};
    }
    if (!state.chunk.items) {
      state.chunk.items = [];
    }
    
    // Handle stacked items
    if (item.stackable && item.count > 1) {
      if (count && count < item.count) {
        // Drop partial stack
        item.count -= count;
        
        // Deep clone dropped item to avoid shared references
        const droppedItem = this.deepCloneItem(item);
        droppedItem.count = count;
        droppedItem.x = x;
        droppedItem.y = y;
        state.chunk.items.push(droppedItem);
      } else {
        // Drop entire stack
        state.player.inventory.splice(index, 1);
        item.x = x;
        item.y = y;
        state.chunk.items.push(item);
      }
    } else {
      // Drop single item
      state.player.inventory.splice(index, 1);
      item.x = x;
      item.y = y;
      state.chunk.items.push(item);
    }
    
    // Emit drop event
    this.eventBus.emit('ItemDropped', { 
      item: item,
      position: { x, y }
    });
    
    // Log the drop
    if (state.log && item.name) {
      state.log(`You drop ${item.name}.`, 'note');
    }
    
    return true;
  }

  /**
   * Get all items at a specific position
   * @param {Object} state - Game state
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of items at position
   */
  getItemsAt(state, x, y) {
    if (!state?.chunk?.items) {
      return [];
    }
    
    return state.chunk.items.filter(
      item => item.x === x && item.y === y
    );
  }

  /**
   * Deep clone an item to avoid reference sharing
   * @param {Object} item - Item to clone
   * @returns {Object} Cloned item
   */
  deepCloneItem(item) {
    // Handle null/undefined
    if (!item) return item;
    
    // Handle primitives
    if (typeof item !== 'object') return item;
    
    // Handle arrays
    if (Array.isArray(item)) {
      return item.map(i => this.deepCloneItem(i));
    }
    
    // Handle objects
    const cloned = {};
    for (const key in item) {
      if (item.hasOwnProperty(key)) {
        // Skip functions
        if (typeof item[key] === 'function') {
          cloned[key] = item[key];
        } else {
          cloned[key] = this.deepCloneItem(item[key]);
        }
      }
    }
    
    return cloned;
  }
}

// Factory function for creating loot system
let _lootSystem = null;

/**
 * Get or create the loot system instance
 * @param {EventBus} eventBus - Optional event bus
 * @returns {LootSystem} The loot system instance
 */
export function getLootSystem(eventBus = null) {
  if (!_lootSystem) {
    _lootSystem = new LootSystem(eventBus);
  }
  return _lootSystem;
}

/**
 * Reset the loot system (useful for testing)
 */
export function resetLootSystem() {
  _lootSystem = null;
}