/**
 * InventorySystem - Centralizes inventory management operations
 * Handles adding, removing, finding, and using items
 */
import { EventBus, getGameEventBus } from './EventBus.js';

// Configuration constants
export const INVENTORY_CONFIG = {
  maxSize: 50,
  defaults: {
    itemCount: 1,
    itemWeight: 1
  }
};

export class InventorySystem {
  constructor(eventBus = null) {
    this.eventBus = eventBus || getGameEventBus();
    this.maxSize = INVENTORY_CONFIG.maxSize;
  }

  /**
   * Add an item to inventory
   * @param {Array} inventory - Inventory array
   * @param {Object} item - Item to add
   * @returns {boolean} True if successful
   */
  addItem(inventory, item) {
    // Validate item structure
    if (!this.validateItem(item)) {
      console.warn('Invalid item structure:', item);
      return false;
    }
    
    // Check inventory size limit (but stackable items don't count if stacking)
    if (this.maxSize && !item.stackable && inventory.length >= this.maxSize) {
      return false;
    }
    
    if (item.stackable) {
      // Try to stack with existing item
      const existing = inventory.find(i => i.id === item.id && i.stackable);
      if (existing) {
        // Stacking doesn't increase inventory count
        existing.count = (existing.count || INVENTORY_CONFIG.defaults.itemCount) + 
                        (item.count || INVENTORY_CONFIG.defaults.itemCount);
        this.eventBus.emit('ItemAdded', { item });
        return true;
      }
      
      // New stack - check size limit
      if (this.maxSize && inventory.length >= this.maxSize) {
        return false;
      }
    }
    
    // Add as new item
    inventory.push(item);
    this.eventBus.emit('ItemAdded', { item });
    return true;
  }

  /**
   * Remove an item from inventory
   * @param {Array} inventory - Inventory array
   * @param {Object} item - Item to remove
   * @param {number} count - Number to remove (for stacks)
   * @returns {boolean} True if successful
   */
  removeItem(inventory, item, count = 1) {
    const index = inventory.indexOf(item);
    if (index === -1) return false;
    
    if (item.stackable && (item.count || INVENTORY_CONFIG.defaults.itemCount) > count) {
      // Decrease stack count
      item.count = (item.count || INVENTORY_CONFIG.defaults.itemCount) - count;
      this.eventBus.emit('ItemRemoved', { item, count });
      return true;
    } else {
      // Remove entire item/stack
      inventory.splice(index, 1);
      this.eventBus.emit('ItemRemoved', { item, count });
      return true;
    }
  }

  /**
   * Find an item in inventory
   * @param {Array} inventory - Inventory array
   * @param {string|Function} idOrPredicate - Item ID or predicate function
   * @returns {Object|null} Found item or null
   */
  findItem(inventory, idOrPredicate) {
    if (typeof idOrPredicate === 'string') {
      // Find by ID
      return inventory.find(item => item.id === idOrPredicate) || null;
    } else if (typeof idOrPredicate === 'function') {
      // Find by predicate
      return inventory.find(idOrPredicate) || null;
    }
    return null;
  }

  /**
   * Find all items matching a predicate
   * @param {Array} inventory - Inventory array
   * @param {Function} predicate - Filter function
   * @returns {Array} Matching items
   */
  findItems(inventory, predicate) {
    return inventory.filter(predicate);
  }

  /**
   * Check if inventory has an item
   * @param {Array} inventory - Inventory array
   * @param {string} itemId - Item ID
   * @param {number} count - Required count (for stackable items)
   * @returns {boolean} True if has item
   */
  hasItem(inventory, itemId, count = 1) {
    const item = this.findItem(inventory, itemId);
    if (!item) return false;
    
    if (item.stackable) {
      return (item.count || INVENTORY_CONFIG.defaults.itemCount) >= count;
    }
    
    return true;
  }

  /**
   * Get total count of an item
   * @param {Array} inventory - Inventory array
   * @param {string} itemId - Item ID
   * @returns {number} Total count
   */
  getItemCount(inventory, itemId) {
    const items = inventory.filter(item => item.id === itemId);
    if (items.length === 0) return 0;
    
    // Sum counts for stackable items
    return items.reduce((total, item) => {
      if (item.stackable) {
        return total + (item.count || INVENTORY_CONFIG.defaults.itemCount);
      }
      return total + 1;
    }, 0);
  }

  /**
   * Use an item
   * @param {Object} state - Game state
   * @param {Object} item - Item to use
   * @returns {any} Result of using the item
   */
  useItem(state, item) {
    // Emit event
    this.eventBus.emit('ItemUsed', { item, state });
    
    // Call item's use handler if it exists
    if (item.use && typeof item.use === 'function') {
      // Let the use function decide if it needs to be async
      return item.use(state, item);
    }
    
    return false;
  }

  /**
   * Sort inventory
   * @param {Array} inventory - Inventory array
   * @param {string|Function} sortBy - Property name or comparator function
   */
  sortInventory(inventory, sortBy) {
    if (typeof sortBy === 'string') {
      // Sort by property
      inventory.sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    } else if (typeof sortBy === 'function') {
      // Sort by custom comparator
      inventory.sort(sortBy);
    }
  }

  /**
   * Get total inventory weight
   * @param {Array} inventory - Inventory array
   * @returns {number} Total weight
   */
  getInventoryWeight(inventory) {
    return inventory.reduce((total, item) => {
      const weight = item.weight || INVENTORY_CONFIG.defaults.itemWeight;
      const count = item.stackable ? 
        (item.count || INVENTORY_CONFIG.defaults.itemCount) : 1;
      return total + (weight * count);
    }, 0);
  }

  /**
   * Check if inventory is full
   * @param {Array} inventory - Inventory array
   * @returns {boolean} True if full
   */
  isInventoryFull(inventory) {
    if (!this.maxSize) return false; // No limit
    return inventory.length >= this.maxSize;
  }

  /**
   * Validate item structure
   * @param {Object} item - Item to validate
   * @returns {boolean} True if valid
   */
  validateItem(item) {
    // Item must be an object
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    // Item must have an id
    if (!item.id || typeof item.id !== 'string') {
      return false;
    }
    
    // If stackable, count must be a positive number
    if (item.stackable && item.count !== undefined) {
      if (typeof item.count !== 'number' || item.count < 1) {
        return false;
      }
    }
    
    // If has weight, must be a positive number
    if (item.weight !== undefined) {
      if (typeof item.weight !== 'number' || item.weight < 0) {
        return false;
      }
    }
    
    return true;
  }
}

// Factory function for creating inventory system
let _inventorySystem = null;

/**
 * Get or create the inventory system instance
 * @param {EventBus} eventBus - Optional event bus
 * @returns {InventorySystem} The inventory system instance
 */
export function getInventorySystem(eventBus = null) {
  if (!_inventorySystem) {
    _inventorySystem = new InventorySystem(eventBus);
  }
  return _inventorySystem;
}

/**
 * Reset the inventory system (useful for testing)
 */
export function resetInventorySystem() {
  _inventorySystem = null;
}