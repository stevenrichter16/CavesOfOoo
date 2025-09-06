/**
 * PathPreview - Renders visual preview of movement paths
 * Supports multiple rendering styles and animations
 */
import { getGameEventBus } from '../systems/EventBus.js';

// Default configuration
export const PATH_PREVIEW_CONFIG = {
  defaultStyle: 'line',
  defaultAlpha: 0.6,
  defaultLineWidth: 2,
  defaultColors: {
    reachable: '#00FF00',
    unreachable: '#FF0000',
    neutral: '#FFFF00'
  },
  styles: ['line', 'dots', 'tiles'],
  tileSymbols: {
    path: '▪',
    destination: '◆',
    dot: '•'
  },
  animation: {
    defaultSpeed: 1000,
    minAlpha: 0.3,
    maxAlpha: 1.0
  }
};

export class PathPreview {
  /**
   * Create a new path preview renderer
   * @param {EventBus} eventBus - Event bus for communication
   * @param {Object} renderer - Renderer object with drawing methods
   * @param {Object} options - Configuration options
   */
  constructor(eventBus = null, renderer = null, options = {}) {
    this.eventBus = eventBus || getGameEventBus();
    this.renderer = renderer;
    
    // Configuration
    this.visible = options.visible !== undefined ? options.visible : true;
    this.style = options.style || PATH_PREVIEW_CONFIG.defaultStyle;
    this.alpha = options.alpha || PATH_PREVIEW_CONFIG.defaultAlpha;
    this.lineWidth = options.lineWidth || PATH_PREVIEW_CONFIG.defaultLineWidth;
    this.color = options.color || null;
    
    // Colors for different states
    this.colors = { ...PATH_PREVIEW_CONFIG.defaultColors, ...options.colors };
    this.modeColors = options.modeColors || null;
    
    // Animation
    this.animationEnabled = false;
    this.animationConfig = null;
    this.animationStartTime = 0;
    
    // Cache last rendered state to avoid redundant renders
    this.lastRenderedPath = null;
    
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
      if (event.path) {
        this.lastRenderedPath = event.path;
      }
    };
    
    this.handlers.cursorHidden = async () => {
      this.visible = false;
    };
    
    this.handlers.cursorShown = async () => {
      this.visible = true;
    };
    
    // Register handlers
    if (this.eventBus) {
      this.eventBus.on('CursorMoved', this.handlers.cursorMoved);
      this.eventBus.on('CursorHidden', this.handlers.cursorHidden);
      this.eventBus.on('CursorShown', this.handlers.cursorShown);
    }
  }

  /**
   * Render the path preview
   * @param {Object} state - Game state
   */
  render(state) {
    // Check if should render
    if (!this.visible || !state?.cursor?.visible || !state.cursor.path || state.cursor.path.length === 0) {
      return;
    }
    
    // Get current color based on reachability and mode
    const color = this.getColor(state);
    
    // Apply alpha and color
    if (this.renderer) {
      // Calculate animated alpha if enabled
      let alpha = this.alpha;
      if (this.animationEnabled && this.animationConfig) {
        alpha = this.calculateAnimatedAlpha();
      }
      
      this.renderer.setAlpha?.(alpha);
      this.renderer.setColor?.(color);
    }
    
    // Render based on style
    switch (this.style) {
      case 'line':
        this.renderLine(state);
        break;
      case 'dots':
        this.renderDots(state);
        break;
      case 'tiles':
        this.renderTiles(state);
        break;
      default:
        // Fallback to line
        this.renderLine(state);
    }
    
    // Reset renderer state
    if (this.renderer) {
      this.renderer.resetAlpha?.();
      this.renderer.resetColor?.();
    }
  }

  /**
   * Render path as connected lines
   * @private
   * @param {Object} state - Game state
   */
  renderLine(state) {
    if (!this.renderer?.drawLine) return;
    
    const path = state.cursor.path;
    const camera = state.camera || { x: 0, y: 0 };
    
    // Draw lines between consecutive points
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      
      // Check if points are adjacent (no teleportation)
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      
      if (dx <= 1 && dy <= 1) {
        this.renderer.drawLine({
          from: {
            x: from.x - camera.x,
            y: from.y - camera.y
          },
          to: {
            x: to.x - camera.x,
            y: to.y - camera.y
          },
          width: this.lineWidth
        });
      }
    }
  }

  /**
   * Render path as dots at each position
   * @private
   * @param {Object} state - Game state
   */
  renderDots(state) {
    if (!this.renderer?.drawTile) return;
    
    const path = state.cursor.path;
    const camera = state.camera || { x: 0, y: 0 };
    const symbol = PATH_PREVIEW_CONFIG.tileSymbols.dot;
    
    // Draw a dot at each path position
    for (const point of path) {
      this.renderer.drawTile(
        symbol,
        point.x - camera.x,
        point.y - camera.y
      );
    }
  }

  /**
   * Render path as highlighted tiles
   * @private
   * @param {Object} state - Game state
   */
  renderTiles(state) {
    if (!this.renderer?.drawTile) return;
    
    const path = state.cursor.path;
    const camera = state.camera || { x: 0, y: 0 };
    const pathSymbol = PATH_PREVIEW_CONFIG.tileSymbols.path;
    const destSymbol = PATH_PREVIEW_CONFIG.tileSymbols.destination;
    
    // Draw tiles for each path position
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      const isDestination = i === path.length - 1;
      const symbol = isDestination ? destSymbol : pathSymbol;
      
      this.renderer.drawTile(
        symbol,
        point.x - camera.x,
        point.y - camera.y
      );
    }
  }

  /**
   * Get color based on current state
   * @private
   * @param {Object} state - Game state
   * @returns {string} Color hex code
   */
  getColor(state) {
    // Use explicit color if set
    if (this.color) {
      return this.color;
    }
    
    // Check for mode-specific colors
    if (this.modeColors && state.cursor.mode) {
      const modeColor = this.modeColors[state.cursor.mode];
      if (modeColor) {
        return state.cursor.reachable ? 
          modeColor.reachable : 
          modeColor.unreachable;
      }
    }
    
    // Use default colors based on reachability
    if (state.cursor.reachable === false) {
      return this.colors.unreachable;
    } else if (state.cursor.reachable === true) {
      return this.colors.reachable;
    } else {
      return this.colors.neutral || this.colors.reachable;
    }
  }

  /**
   * Calculate animated alpha value
   * @private
   * @returns {number} Alpha value
   */
  calculateAnimatedAlpha() {
    if (!this.animationConfig) return this.alpha;
    
    const now = Date.now();
    if (!this.animationStartTime) {
      this.animationStartTime = now;
    }
    
    const elapsed = now - this.animationStartTime;
    const speed = this.animationConfig.speed || PATH_PREVIEW_CONFIG.animation.defaultSpeed;
    const progress = (elapsed % speed) / speed;
    
    const minAlpha = this.animationConfig.minAlpha || PATH_PREVIEW_CONFIG.animation.minAlpha;
    const maxAlpha = this.animationConfig.maxAlpha || PATH_PREVIEW_CONFIG.animation.maxAlpha;
    
    // Pulse animation
    if (this.animationConfig.type === 'pulse') {
      const sine = Math.sin(progress * Math.PI * 2);
      return minAlpha + (maxAlpha - minAlpha) * (sine + 1) / 2;
    }
    
    // Fade animation
    if (this.animationConfig.type === 'fade') {
      return minAlpha + (maxAlpha - minAlpha) * progress;
    }
    
    // Default to pulse
    const sine = Math.sin(progress * Math.PI * 2);
    return minAlpha + (maxAlpha - minAlpha) * (sine + 1) / 2;
  }

  /**
   * Show the path preview
   */
  async show() {
    this.visible = true;
    await this.eventBus?.emitAsync('PathPreviewShown', {});
  }

  /**
   * Hide the path preview
   */
  async hide() {
    this.visible = false;
    await this.eventBus?.emitAsync('PathPreviewHidden', {});
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
   * Set rendering style
   * @param {string} style - New style ('line', 'dots', 'tiles')
   */
  async setStyle(style) {
    const oldStyle = this.style;
    this.style = style;
    
    await this.eventBus?.emitAsync('PathPreviewStyleChanged', {
      oldStyle,
      newStyle: style
    });
  }

  /**
   * Set colors for different states
   * @param {Object} colors - Color configuration
   */
  setColors(colors) {
    this.colors = { ...this.colors, ...colors };
  }

  /**
   * Set mode-specific colors
   * @param {Object} modeColors - Mode color configuration
   */
  setModeColors(modeColors) {
    this.modeColors = modeColors;
  }

  /**
   * Enable animation
   * @param {Object} config - Animation configuration
   */
  enableAnimation(config = {}) {
    this.animationEnabled = true;
    this.animationConfig = config;
    this.animationStartTime = Date.now();
  }

  /**
   * Disable animation
   */
  disableAnimation() {
    this.animationEnabled = false;
    this.animationConfig = null;
    this.animationStartTime = 0;
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
    this.lastRenderedPath = null;
  }
}

// Factory function for creating path preview
let _pathPreview = null;

/**
 * Get or create the path preview instance
 * @param {EventBus} eventBus - Event bus
 * @param {Object} renderer - Renderer
 * @param {Object} options - Configuration options
 * @returns {PathPreview} The path preview instance
 */
export function getPathPreview(eventBus = null, renderer = null, options = {}) {
  if (!_pathPreview) {
    _pathPreview = new PathPreview(eventBus, renderer, options);
  }
  return _pathPreview;
}

/**
 * Reset the path preview (useful for testing)
 */
export function resetPathPreview() {
  if (_pathPreview) {
    _pathPreview.cleanup();
  }
  _pathPreview = null;
}