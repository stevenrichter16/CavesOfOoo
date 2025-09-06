/**
 * CostDisplay - Renders movement and action costs with visual feedback
 * Supports multiple display formats and positions
 */
import { getGameEventBus } from '../systems/EventBus.js';

// Default configuration
export const COST_DISPLAY_CONFIG = {
  defaultPosition: 'cursor',
  defaultFormat: 'detailed',
  defaultShowBreakdown: false,
  defaultShowIcons: true,
  defaultShowBackground: false,
  defaultAutoHide: true,
  positions: ['cursor', 'corner', 'bottom', 'tooltip'],
  formats: ['simple', 'detailed', 'fraction'],
  colors: {
    affordable: '#00FF00',
    warning: '#FFFF00',
    expensive: '#FF0000',
    negative: '#00FFFF'
  },
  icons: {
    stamina: '⚡',
    action: '♦',
    mana: '✦',
    health: '♥'
  },
  warningThreshold: 0.8, // Show warning when cost is 80% of stamina
  animation: {
    duration: 300,
    pulseSpeed: 500
  }
};

export class CostDisplay {
  /**
   * Create a new cost display
   * @param {EventBus} eventBus - Event bus for communication
   * @param {Object} renderer - Renderer object with drawing methods
   * @param {Object} options - Configuration options
   */
  constructor(eventBus = null, renderer = null, options = {}) {
    this.eventBus = eventBus || getGameEventBus();
    this.renderer = renderer;
    
    // Configuration
    this.visible = options.visible !== undefined ? options.visible : true;
    this.position = options.position || COST_DISPLAY_CONFIG.defaultPosition;
    this.format = options.format || COST_DISPLAY_CONFIG.defaultFormat;
    this.showBreakdown = options.showBreakdown !== undefined ? 
      options.showBreakdown : COST_DISPLAY_CONFIG.defaultShowBreakdown;
    this.showIcons = options.showIcons !== undefined ? 
      options.showIcons : COST_DISPLAY_CONFIG.defaultShowIcons;
    this.showBackground = options.showBackground !== undefined ? 
      options.showBackground : COST_DISPLAY_CONFIG.defaultShowBackground;
    this.showTooltip = options.showTooltip || false;
    this.autoHide = options.autoHide !== undefined ? 
      options.autoHide : COST_DISPLAY_CONFIG.defaultAutoHide;
    
    // Custom colors and functions
    this.color = options.color || null;
    this.colorFunction = options.colorFunction || null;
    this.colors = { ...COST_DISPLAY_CONFIG.colors, ...options.colors };
    
    // Animation
    this.animationEnabled = false;
    this.animationConfig = null;
    this.animationStartTime = 0;
    this.currentValue = 0;
    this.targetValue = 0;
    
    // Cache
    this.lastCost = null;
    this.lastBreakdown = null;
    
    // Event handlers
    this.handlers = {};
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   * @private
   */
  setupEventHandlers() {
    this.handlers.cursorMoved = async (event) => {
      if (event.cost !== undefined) {
        this.update(event.cost, event.costBreakdown);
      }
    };
    
    this.handlers.cursorHidden = async () => {
      if (this.autoHide) {
        this.visible = false;
      }
    };
    
    this.handlers.cursorShown = async () => {
      if (this.autoHide) {
        this.visible = true;
      }
    };
    
    // Register handlers
    if (this.eventBus) {
      this.eventBus.on('CursorMoved', this.handlers.cursorMoved);
      this.eventBus.on('CursorHidden', this.handlers.cursorHidden);
      this.eventBus.on('CursorShown', this.handlers.cursorShown);
    }
  }

  /**
   * Update cost values
   * @param {number} cost - New cost value
   * @param {Object} breakdown - Cost breakdown
   */
  update(cost, breakdown) {
    this.lastCost = cost;
    this.lastBreakdown = breakdown;
    
    if (this.animationEnabled) {
      this.currentValue = this.targetValue;
      this.targetValue = cost;
      this.animationStartTime = Date.now();
    } else {
      this.currentValue = cost;
      this.targetValue = cost;
    }
  }

  /**
   * Render the cost display
   * @param {Object} state - Game state
   */
  render(state) {
    // Check if should render
    if (!this.visible || !state?.cursor?.visible) {
      return;
    }
    
    const cost = state.cursor.cost;
    if (cost === undefined || cost === null || cost === 0) {
      return;
    }
    
    // Get display position
    const pos = this.getPosition(state);
    if (!pos) return;
    
    // Calculate animated value if enabled
    let displayCost = cost;
    if (this.animationEnabled && this.animationConfig) {
      displayCost = this.getAnimatedValue();
    }
    
    // Get color
    const color = this.getColor(displayCost, state);
    
    // Draw background if enabled
    if (this.showBackground && this.renderer?.drawBox) {
      const boxSize = this.calculateBoxSize(state);
      this.renderer.drawBox({
        x: pos.x - 1,
        y: pos.y - 1,
        width: boxSize.width,
        height: boxSize.height,
        filled: true,
        color: '#000000',
        alpha: 0.7
      });
    }
    
    // Apply color
    if (this.renderer?.setColor) {
      this.renderer.setColor(color);
    }
    
    // Render cost text
    if (this.showBreakdown && state.cursor.costBreakdown) {
      this.renderBreakdown(pos, displayCost, state);
    } else {
      const text = this.formatCost(displayCost, state);
      if (this.renderer?.drawText) {
        this.renderer.drawText(text, pos.x, pos.y);
      }
    }
    
    // Render tooltip if needed
    if (this.showTooltip && this.isHovered(state, pos)) {
      this.renderTooltip(state);
    }
    
    // Reset color
    if (this.renderer?.resetColor) {
      this.renderer.resetColor();
    }
  }

  /**
   * Get display position
   * @private
   * @param {Object} state - Game state
   * @returns {Object} Position {x, y}
   */
  getPosition(state) {
    const camera = state.camera || { x: 0, y: 0 };
    
    if (typeof this.position === 'function') {
      return this.position(state);
    }
    
    switch (this.position) {
      case 'cursor':
        return {
          x: state.cursor.x - camera.x + 1,
          y: state.cursor.y - camera.y
        };
      
      case 'corner':
        return { x: 2, y: 2 };
      
      case 'bottom':
        const height = state.screenHeight || 25;
        return { x: 2, y: height - 2 };
      
      case 'tooltip':
        return {
          x: state.cursor.x - camera.x,
          y: state.cursor.y - camera.y - 2
        };
      
      default:
        return {
          x: state.cursor.x - camera.x + 1,
          y: state.cursor.y - camera.y
        };
    }
  }

  /**
   * Format cost for display
   * @private
   * @param {number} cost - Cost value
   * @param {Object} state - Game state
   * @returns {string} Formatted text
   */
  formatCost(cost, state) {
    // Custom format function
    if (typeof this.format === 'function') {
      return this.format(cost, state);
    }
    
    // Add icon if enabled
    let icon = '';
    if (this.showIcons) {
      const mode = state.cursor?.mode || 'movement';
      if (mode === 'movement') {
        icon = COST_DISPLAY_CONFIG.icons.stamina;
      } else if (mode === 'ability') {
        icon = COST_DISPLAY_CONFIG.icons.action;
      } else {
        icon = COST_DISPLAY_CONFIG.icons.action;
      }
    }
    
    // Format based on style
    switch (this.format) {
      case 'simple':
        return `${cost}`;
      
      case 'detailed':
        return `${icon}Cost: ${cost}`;
      
      case 'fraction':
        const stamina = state.player?.stamina || 0;
        return `${cost}/${stamina}`;
      
      default:
        return `${icon}${cost}`;
    }
  }

  /**
   * Render cost breakdown
   * @private
   * @param {Object} pos - Position
   * @param {number} cost - Total cost
   * @param {Object} state - Game state
   */
  renderBreakdown(pos, cost, state) {
    const breakdown = state.cursor.costBreakdown;
    if (!breakdown || !this.renderer?.drawText) return;
    
    let y = pos.y;
    
    // Total cost
    const icon = this.showIcons ? COST_DISPLAY_CONFIG.icons.stamina : '';
    this.renderer.drawText(`${icon}Total: ${cost}`, pos.x, y);
    y++;
    
    // Base cost
    if (breakdown.base !== undefined) {
      this.renderer.drawText(`Base: ${breakdown.base}`, pos.x + 2, y);
      y++;
    }
    
    // Terrain cost
    if (breakdown.terrain !== undefined && breakdown.terrain !== 0) {
      this.renderer.drawText(`Terrain: +${breakdown.terrain}`, pos.x + 2, y);
      y++;
    }
    
    // Other modifiers
    if (breakdown.status !== undefined && breakdown.status !== 0) {
      const sign = breakdown.status > 0 ? '+' : '';
      this.renderer.drawText(`Status: ${sign}${breakdown.status}`, pos.x + 2, y);
    }
  }

  /**
   * Render tooltip
   * @private
   * @param {Object} state - Game state
   */
  renderTooltip(state) {
    if (!this.renderer?.drawText) return;
    
    const camera = state.camera || { x: 0, y: 0 };
    const x = state.cursor.x - camera.x;
    const y = state.cursor.y - camera.y - 4;
    
    // Title
    this.renderer.drawText('Movement Cost', x, y);
    
    // Stamina info
    const stamina = state.player?.stamina || 0;
    const maxStamina = state.player?.maxStamina || 0;
    this.renderer.drawText(`Stamina: ${stamina}/${maxStamina}`, x, y + 1);
    
    // Affordability
    const affordable = stamina >= state.cursor.cost;
    const status = affordable ? 'Affordable' : 'Too Expensive';
    this.renderer.drawText(status, x, y + 2);
  }

  /**
   * Get color based on cost and state
   * @private
   * @param {number} cost - Cost value
   * @param {Object} state - Game state
   * @returns {string} Color hex code
   */
  getColor(cost, state) {
    // Use explicit color if set
    if (this.color) {
      return this.color;
    }
    
    // Use custom color function
    if (this.colorFunction) {
      return this.colorFunction(cost, state);
    }
    
    // Handle negative costs
    if (cost < 0) {
      return this.colors.negative;
    }
    
    // Handle zero cost - always affordable
    if (cost === 0) {
      return this.colors.affordable;
    }
    
    // Color based on affordability
    const stamina = state.player?.stamina || 0;
    
    // If no stamina, can't afford any positive cost
    if (stamina <= 0) {
      return this.colors.expensive;
    }
    
    const ratio = cost / stamina;
    
    if (ratio >= 1.0) {
      // Can't afford
      return this.colors.expensive;
    } else if (ratio >= COST_DISPLAY_CONFIG.warningThreshold) {
      // Warning threshold
      return this.colors.warning;
    } else {
      // Affordable
      return this.colors.affordable;
    }
  }

  /**
   * Get animated value
   * @private
   * @returns {number} Interpolated value
   */
  getAnimatedValue() {
    if (!this.animationConfig) return this.targetValue;
    
    const now = Date.now();
    const elapsed = now - this.animationStartTime;
    const duration = this.animationConfig.duration || COST_DISPLAY_CONFIG.animation.duration;
    
    if (elapsed >= duration) {
      this.currentValue = this.targetValue;
      return this.targetValue;
    }
    
    const progress = elapsed / duration;
    const diff = this.targetValue - this.currentValue;
    return Math.round(this.currentValue + diff * progress);
  }

  /**
   * Calculate box size for background
   * @private
   * @param {Object} state - Game state
   * @returns {Object} Size {width, height}
   */
  calculateBoxSize(state) {
    let width = 10;
    let height = 1;
    
    if (this.showBreakdown && state.cursor?.costBreakdown) {
      height = 3;
      const breakdown = state.cursor.costBreakdown;
      if (breakdown.status !== undefined && breakdown.status !== 0) {
        height = 4;
      }
    }
    
    if (this.format === 'detailed') {
      width = 12;
    }
    
    return { width, height };
  }

  /**
   * Check if position is hovered
   * @private
   * @param {Object} state - Game state
   * @param {Object} pos - Display position
   * @returns {boolean} True if hovered
   */
  isHovered(state, pos) {
    if (!state.mouseX || !state.mouseY) return false;
    
    const camera = state.camera || { x: 0, y: 0 };
    return state.mouseX === state.cursor.x - camera.x && 
           state.mouseY === state.cursor.y - camera.y;
  }

  /**
   * Show the cost display
   */
  async show() {
    this.visible = true;
    await this.eventBus?.emitAsync('CostDisplayShown', {});
  }

  /**
   * Hide the cost display
   */
  async hide() {
    this.visible = false;
    await this.eventBus?.emitAsync('CostDisplayHidden', {});
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Enable animation
   * @param {Object} config - Animation configuration
   */
  enableAnimation(config = {}) {
    this.animationEnabled = true;
    this.animationConfig = config;
  }

  /**
   * Disable animation
   */
  disableAnimation() {
    this.animationEnabled = false;
    this.animationConfig = null;
  }

  /**
   * Clean up event handlers
   */
  cleanup() {
    // Remove event handlers
    if (this.eventBus) {
      if (this.handlers.cursorMoved) {
        this.eventBus.off('CursorMoved', this.handlers.cursorMoved);
      }
      if (this.handlers.cursorHidden) {
        this.eventBus.off('CursorHidden', this.handlers.cursorHidden);
      }
      if (this.handlers.cursorShown) {
        this.eventBus.off('CursorShown', this.handlers.cursorShown);
      }
    }
    
    // Stop animation
    this.disableAnimation();
    
    // Clear cache
    this.lastCost = null;
    this.lastBreakdown = null;
  }
}

// Factory function for creating cost display
let _costDisplay = null;

/**
 * Get or create the cost display instance
 * @param {EventBus} eventBus - Event bus
 * @param {Object} renderer - Renderer
 * @param {Object} options - Configuration options
 * @returns {CostDisplay} The cost display instance
 */
export function getCostDisplay(eventBus = null, renderer = null, options = {}) {
  if (!_costDisplay) {
    _costDisplay = new CostDisplay(eventBus, renderer, options);
  }
  return _costDisplay;
}

/**
 * Reset the cost display (useful for testing)
 */
export function resetCostDisplay() {
  if (_costDisplay) {
    _costDisplay.cleanup();
  }
  _costDisplay = null;
}