/**
 * CursorSystem - Manages cursor movement, pathfinding preview, and cost display
 * Integrates with pathfinding system to show movement paths and costs
 */
import { getPathfindingSystem } from '../pathfinding/PathfindingSystem.js';
import { getMovementCostCalculator } from '../pathfinding/MovementCostCalculator.js';
import { getGameEventBus } from '../systems/EventBus.js';

// Configuration constants
export const CURSOR_CONFIG = {
  defaultMaxRange: 10,
  defaultShowPath: true,
  defaultShowCost: true,
  defaultDistanceMetric: 'euclidean',
  defaultModes: ['movement', 'examine', 'target'],
  defaultModeRanges: {
    movement: 10,
    examine: 15,
    target: 8
  },
  keyBindings: {
    'ArrowUp': { dx: 0, dy: -1 },
    'ArrowDown': { dx: 0, dy: 1 },
    'ArrowLeft': { dx: -1, dy: 0 },
    'ArrowRight': { dx: 1, dy: 0 },
    'Numpad7': { dx: -1, dy: -1 },
    'Numpad9': { dx: 1, dy: -1 },
    'Numpad1': { dx: -1, dy: 1 },
    'Numpad3': { dx: 1, dy: 1 },
    'Numpad8': { dx: 0, dy: -1 },
    'Numpad2': { dx: 0, dy: 1 },
    'Numpad4': { dx: -1, dy: 0 },
    'Numpad6': { dx: 1, dy: 0 },
    'Enter': 'confirm',
    'Escape': 'cancel',
    ' ': 'confirm' // Spacebar
  }
};

export class CursorSystem {
  /**
   * Create a new cursor system
   * @param {EventBus} eventBus - Event bus for communication
   * @param {Object} options - Configuration options
   */
  constructor(eventBus = null, options = {}) {
    this.eventBus = eventBus || getGameEventBus();
    
    // Configuration
    this.maxRange = options.maxRange || CURSOR_CONFIG.defaultMaxRange;
    this.showPath = options.showPath !== undefined ? options.showPath : CURSOR_CONFIG.defaultShowPath;
    this.showCost = options.showCost !== undefined ? options.showCost : CURSOR_CONFIG.defaultShowCost;
    this.distanceMetric = options.distanceMetric || CURSOR_CONFIG.defaultDistanceMetric;
    this.modeRanges = options.modeRanges || CURSOR_CONFIG.defaultModeRanges;
    
    // Systems
    this.pathfindingSystem = getPathfindingSystem();
    this.movementCostCalculator = getMovementCostCalculator();
    
    // Event handlers
    this.handlers = {};
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   * @private
   */
  setupEventHandlers() {
    // Store handlers for cleanup
    this.handlers.playerMoved = (event) => {
      if (event.state && event.state.cursor && event.state.cursor.visible) {
        this.updatePath(event.state);
      }
    };
    
    this.eventBus.on('PlayerMoved', this.handlers.playerMoved);
  }

  /**
   * Show the cursor at player position
   * @param {Object} state - Game state
   */
  async show(state) {
    if (!state) {
      throw new Error('State is required');
    }
    
    // Initialize cursor object if missing
    if (!state.cursor) {
      state.cursor = {};
    }
    
    // Set cursor to player position
    state.cursor.visible = true;
    state.cursor.x = state.player.x;
    state.cursor.y = state.player.y;
    state.cursor.mode = state.cursor.mode || 'movement';
    
    // Clear any existing path
    state.cursor.path = null;
    state.cursor.cost = 0;
    
    // Emit event
    await this.eventBus.emitAsync('CursorShown', {
      position: { x: state.cursor.x, y: state.cursor.y },
      mode: state.cursor.mode
    });
  }

  /**
   * Hide the cursor
   * @param {Object} state - Game state
   */
  async hide(state) {
    if (!state) {
      throw new Error('State is required');
    }
    
    if (!state.cursor) {
      state.cursor = {};
    }
    
    state.cursor.visible = false;
    delete state.cursor.path;
    delete state.cursor.cost;
    delete state.cursor.pathPreview;
    delete state.cursor.costBreakdown;
    
    // Emit event
    await this.eventBus.emitAsync('CursorHidden', {});
  }

  /**
   * Move cursor to specific position
   * @param {Object} state - Game state
   * @param {number} x - Target x position
   * @param {number} y - Target y position
   * @returns {boolean} True if moved successfully
   */
  moveTo(state, x, y) {
    if (!state) {
      throw new Error('State is required');
    }
    
    // Check if position is in range
    if (!this.isInRange(state, x, y)) {
      return false;
    }
    
    // Check if position is passable (for movement mode)
    if (state.cursor.mode === 'movement' && state.chunk) {
      if (!state.chunk.isPassable(x, y)) {
        return false;
      }
    }
    
    const oldX = state.cursor.x;
    const oldY = state.cursor.y;
    
    // Update position
    state.cursor.x = x;
    state.cursor.y = y;
    
    // Update path and cost
    this.updatePath(state);
    
    // Emit movement event
    this.eventBus.emitAsync('CursorMoved', {
      from: { x: oldX, y: oldY },
      to: { x, y },
      path: state.cursor.path,
      cost: state.cursor.cost
    });
    
    return true;
  }

  /**
   * Move cursor relative to current position
   * @param {Object} state - Game state
   * @param {number} dx - Delta x
   * @param {number} dy - Delta y
   * @returns {boolean} True if moved successfully
   */
  moveRelative(state, dx, dy) {
    if (!state || !state.cursor) {
      return false;
    }
    
    return this.moveTo(state, state.cursor.x + dx, state.cursor.y + dy);
  }

  /**
   * Update path and cost for current cursor position
   * @private
   * @param {Object} state - Game state
   */
  updatePath(state) {
    if (!state.cursor) {
      return;
    }
    
    // Check if cursor is at player position
    if (state.cursor.x === state.player.x && state.cursor.y === state.player.y) {
      state.cursor.path = null;
      state.cursor.cost = 0;
      state.cursor.reachable = true;
      return;
    }
    
    try {
      // Calculate path
      const start = { x: state.player.x, y: state.player.y };
      const end = { x: state.cursor.x, y: state.cursor.y };
      
      const path = this.pathfindingSystem.findPath(start, end, state);
      
      if (path) {
        state.cursor.path = path;
        state.cursor.pathPreview = path; // For rendering
        state.cursor.reachable = true;
        
        // Calculate total cost
        if (this.showCost && path.length > 0) {
          const cost = this.movementCostCalculator.getPathCost(path, state);
          state.cursor.cost = cost;
          
          // Calculate cost breakdown
          const baseCost = Math.max(0, path.length - 1);
          state.cursor.costBreakdown = {
            base: baseCost,
            terrain: cost - baseCost,
            total: cost
          };
        }
      } else {
        state.cursor.path = null;
        state.cursor.cost = undefined;
        state.cursor.reachable = false;
      }
    } catch (error) {
      // If pathfinding fails, just clear the path
      state.cursor.path = null;
      state.cursor.cost = undefined;
      state.cursor.reachable = false;
    }
  }

  /**
   * Check if position is in range
   * @param {Object} state - Game state
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {boolean} True if in range
   */
  isInRange(state, x, y) {
    const maxRange = this.getMaxRange(state);
    const distance = this.getDistance(
      { x: state.player.x, y: state.player.y },
      { x, y }
    );
    
    return distance <= maxRange;
  }

  /**
   * Get maximum range for current mode
   * @param {Object} state - Game state
   * @returns {number} Maximum range
   */
  getMaxRange(state) {
    const mode = state.cursor?.mode || 'movement';
    return this.modeRanges[mode] || this.maxRange;
  }

  /**
   * Calculate distance between two points
   * @param {Object} from - Starting position
   * @param {Object} to - Target position
   * @returns {number} Distance
   */
  getDistance(from, to) {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    
    switch (this.distanceMetric) {
      case 'manhattan':
        return dx + dy;
      case 'chebyshev':
        return Math.max(dx, dy);
      case 'euclidean':
      default:
        return Math.sqrt(dx * dx + dy * dy);
    }
  }

  /**
   * Set cursor mode
   * @param {Object} state - Game state
   * @param {string} mode - New mode
   */
  async setMode(state, mode) {
    if (!state.cursor) {
      state.cursor = {};
    }
    
    const oldMode = state.cursor.mode || 'movement';
    state.cursor.mode = mode;
    
    // Update path for new mode
    if (state.cursor.visible) {
      this.updatePath(state);
    }
    
    // Emit event
    await this.eventBus.emitAsync('CursorModeChanged', {
      oldMode,
      newMode: mode
    });
  }

  /**
   * Handle keyboard input
   * @param {Object} state - Game state
   * @param {string} key - Key pressed
   */
  async handleKeyPress(state, key) {
    if (!state.cursor || !state.cursor.visible) {
      return;
    }
    
    const binding = CURSOR_CONFIG.keyBindings[key];
    
    if (!binding) {
      return;
    }
    
    if (typeof binding === 'object') {
      // Movement key
      this.moveRelative(state, binding.dx, binding.dy);
    } else if (binding === 'confirm') {
      // Confirm action - only emit if we have a valid path or in non-movement mode
      if (state.cursor.path || state.cursor.mode !== 'movement') {
        await this.eventBus.emitAsync('CursorConfirm', {
          position: { x: state.cursor.x, y: state.cursor.y },
          path: state.cursor.path,
          cost: state.cursor.cost,
          mode: state.cursor.mode,
          reachable: state.cursor.reachable
        });
      }
    } else if (binding === 'cancel') {
      // Cancel action
      await this.hide(state);
    }
  }

  /**
   * Save cursor state
   * @param {Object} state - Game state
   * @returns {Object} Saved state
   */
  saveState(state) {
    if (!state.cursor) {
      return null;
    }
    
    return {
      x: state.cursor.x,
      y: state.cursor.y,
      visible: state.cursor.visible,
      mode: state.cursor.mode,
      path: state.cursor.path ? [...state.cursor.path] : null,
      cost: state.cursor.cost,
      reachable: state.cursor.reachable,
      pathPreview: state.cursor.pathPreview ? [...state.cursor.pathPreview] : null,
      costBreakdown: state.cursor.costBreakdown ? {...state.cursor.costBreakdown} : null
    };
  }

  /**
   * Restore cursor state
   * @param {Object} state - Game state
   * @param {Object} saved - Saved state
   */
  restoreState(state, saved) {
    if (!saved) {
      return;
    }
    
    if (!state.cursor) {
      state.cursor = {};
    }
    
    state.cursor.x = saved.x;
    state.cursor.y = saved.y;
    state.cursor.visible = saved.visible;
    state.cursor.mode = saved.mode;
    state.cursor.path = saved.path ? [...saved.path] : null;
    state.cursor.cost = saved.cost;
    state.cursor.reachable = saved.reachable !== undefined ? saved.reachable : true;
    state.cursor.pathPreview = saved.pathPreview ? [...saved.pathPreview] : null;
    state.cursor.costBreakdown = saved.costBreakdown ? {...saved.costBreakdown} : null;
  }

  /**
   * Clean up event handlers
   */
  cleanup() {
    if (this.handlers.playerMoved) {
      this.eventBus.off('PlayerMoved', this.handlers.playerMoved);
    }
    
    this.handlers = {};
  }
}

// Factory function for creating cursor system
let _cursorSystem = null;

/**
 * Get or create the cursor system instance
 * @param {EventBus} eventBus - Event bus
 * @param {Object} options - Configuration options
 * @returns {CursorSystem} The cursor system instance
 */
export function getCursorSystem(eventBus = null, options = {}) {
  if (!_cursorSystem) {
    _cursorSystem = new CursorSystem(eventBus, options);
  }
  return _cursorSystem;
}

/**
 * Reset the cursor system (useful for testing)
 */
export function resetCursorSystem() {
  if (_cursorSystem) {
    _cursorSystem.cleanup();
  }
  _cursorSystem = null;
}