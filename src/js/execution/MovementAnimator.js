/**
 * MovementAnimator - Handles smooth animation of movement between tiles
 * Provides visual feedback during path execution
 */
import { getGameEventBus } from '../systems/EventBus.js';

// Configuration constants
export const MOVEMENT_ANIMATOR_CONFIG = {
  defaultDuration: 200,
  defaultEasing: 'linear',
  defaultShowTrail: false,
  trailSymbol: '·',
  trailFadeDuration: 300,
  frameRate: 60
};

export class MovementAnimator {
  /**
   * Create a new movement animator
   * @param {EventBus} eventBus - Event bus for communication
   * @param {Object} renderer - Renderer for drawing
   * @param {Object} options - Configuration options
   */
  constructor(eventBus = null, renderer = null, options = {}) {
    this.eventBus = eventBus || getGameEventBus();
    this.renderer = renderer;
    
    // Configuration
    this.defaultDuration = options.defaultDuration || MOVEMENT_ANIMATOR_CONFIG.defaultDuration;
    this.easing = options.easing || MOVEMENT_ANIMATOR_CONFIG.defaultEasing;
    this.showTrail = options.showTrail !== undefined ? 
      options.showTrail : MOVEMENT_ANIMATOR_CONFIG.defaultShowTrail;
    this.trailFadeDuration = options.trailFadeDuration || MOVEMENT_ANIMATOR_CONFIG.trailFadeDuration;
    this.allowConcurrent = options.allowConcurrent !== undefined ? options.allowConcurrent : true;
    
    // Animation state
    this.isAnimating = false;
    this.currentAnimation = null;
    this.cancelled = false;
    this.trails = [];
  }

  /**
   * Animate movement between two positions
   * @param {Object} from - Starting position {x, y}
   * @param {Object} to - Target position {x, y}
   * @param {Object} state - Game state
   * @param {Object} options - Animation options
   * @returns {Promise<Object>} Animation result
   */
  async animateMovement(from, to, state, options = {}) {
    // Check if already animating and concurrent not allowed
    if (this.isAnimating && !this.allowConcurrent) {
      return { skipped: true, reason: 'already_animating' };
    }
    
    const duration = options.duration !== undefined ? options.duration : this.defaultDuration;
    
    // Skip animation if duration is 0
    if (duration === 0) {
      return { completed: true, duration: 0 };
    }
    
    // Calculate pixel offsets
    const tileSize = state.tileSize || 16;
    const deltaX = (to.x - from.x) * tileSize;
    const deltaY = (to.y - from.y) * tileSize;
    
    // Start animation
    this.isAnimating = true;
    this.cancelled = false;
    
    const animationId = Date.now();
    this.currentAnimation = {
      id: animationId,
      from,
      to,
      deltaX,
      deltaY,
      startTime: Date.now(),
      duration
    };
    
    // Emit start event
    await this.eventBus?.emitAsync('AnimationStart', {
      from,
      to,
      duration
    });
    
    // Show trail if enabled
    if (this.showTrail) {
      this.addTrail(from, to, state);
    }
    
    // Perform animation
    const result = await this.animate(state);
    
    // Clean up
    if (this.currentAnimation?.id === animationId) {
      this.currentAnimation = null;
      this.isAnimating = false;
    }
    
    // Reset offset
    if (this.renderer?.resetOffset) {
      this.renderer.resetOffset();
    }
    
    // Emit complete event
    await this.eventBus?.emitAsync('AnimationComplete', {
      from,
      to,
      cancelled: result.cancelled
    });
    
    return result;
  }

  /**
   * Perform the actual animation
   * @private
   * @param {Object} state - Game state
   * @returns {Promise<Object>} Animation result
   */
  async animate(state) {
    const animation = this.currentAnimation;
    if (!animation) return { completed: true };
    
    return new Promise((resolve) => {
      const startTime = animation.startTime;
      const duration = animation.duration;
      let animationFrame = null;
      
      const frame = () => {
        if (this.cancelled || !this.currentAnimation) {
          if (animationFrame) {
            if (typeof cancelAnimationFrame !== 'undefined') {
              cancelAnimationFrame(animationFrame);
            }
          }
          resolve({ cancelled: true });
          return;
        }
        
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const easedProgress = this.getEasedProgress(progress);
        
        // Calculate current offset
        const offsetX = animation.deltaX * easedProgress;
        const offsetY = animation.deltaY * easedProgress;
        
        // Update renderer offset
        if (this.renderer?.setOffset) {
          this.renderer.setOffset({ x: offsetX, y: offsetY });
        }
        
        // Update sprite if using frames
        if (state.player?.animationFrames && this.renderer?.drawSprite) {
          const frameIndex = Math.floor(easedProgress * state.player.animationFrames.length);
          const symbol = state.player.animationFrames[frameIndex % state.player.animationFrames.length];
          
          this.renderer.drawSprite({
            symbol,
            x: animation.from.x,
            y: animation.from.y,
            color: state.player.color
          });
        }
        
        // Emit update event
        this.eventBus?.emitAsync('AnimationUpdate', {
          progress: easedProgress,
          offset: { x: offsetX, y: offsetY }
        });
        
        if (progress < 1) {
          // Continue animation
          animationFrame = this.requestFrame(frame);
        } else {
          // Animation complete
          resolve({ completed: true, duration: elapsed });
        }
      };
      
      // Start animation - ensure at least one frame
      frame();
    });
  }

  /**
   * Request animation frame with fallback
   * @private
   * @param {Function} callback - Frame callback
   * @returns {number} Frame ID
   */
  requestFrame(callback) {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(callback);
    } else {
      return setTimeout(callback, 1000 / MOVEMENT_ANIMATOR_CONFIG.frameRate);
    }
  }

  /**
   * Get eased progress value
   * @param {number} t - Linear progress (0-1)
   * @returns {number} Eased progress (0-1)
   */
  getEasedProgress(t) {
    if (typeof this.easing === 'function') {
      return this.easing(t);
    }
    
    switch (this.easing) {
      case 'ease-in':
        return t * t;
      
      case 'ease-out':
        return t * (2 - t);
      
      case 'ease-in-out':
        return t < 0.5 ? 
          2 * t * t : 
          -1 + (4 - 2 * t) * t;
      
      case 'linear':
      default:
        return t;
    }
  }

  /**
   * Add trail effect
   * @private
   * @param {Object} from - Start position
   * @param {Object} to - End position
   * @param {Object} state - Game state
   */
  addTrail(from, to, state) {
    // Calculate intermediate positions
    const positions = this.getIntermediatePositions(from, to);
    
    positions.forEach((pos, index) => {
      if (index === 0) return; // Skip start position
      
      // Draw trail marker
      if (this.renderer?.drawTile) {
        this.renderer.drawTile(
          MOVEMENT_ANIMATOR_CONFIG.trailSymbol,
          pos.x,
          pos.y,
          { alpha: 0.5 }
        );
      }
      
      // Store trail for cleanup
      const trail = {
        position: pos,
        timestamp: Date.now()
      };
      this.trails.push(trail);
      
      // Schedule fade out
      setTimeout(() => {
        this.fadeTrail(trail);
      }, this.trailFadeDuration);
    });
  }

  /**
   * Get intermediate positions between two points
   * @private
   * @param {Object} from - Start position
   * @param {Object} to - End position
   * @returns {Array} Array of positions
   */
  getIntermediatePositions(from, to) {
    const positions = [];
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    
    let x = from.x;
    let y = from.y;
    
    while (x !== to.x || y !== to.y) {
      positions.push({ x, y });
      if (x !== to.x) x += dx;
      if (y !== to.y) y += dy;
    }
    
    positions.push({ x: to.x, y: to.y });
    return positions;
  }

  /**
   * Fade out trail
   * @private
   * @param {Object} trail - Trail object
   */
  fadeTrail(trail) {
    // Clear tile
    if (this.renderer?.clearTile) {
      this.renderer.clearTile(trail.position.x, trail.position.y);
    }
    
    // Remove from trails array
    const index = this.trails.indexOf(trail);
    if (index > -1) {
      this.trails.splice(index, 1);
    }
  }

  /**
   * Cancel current animation
   */
  cancel() {
    this.cancelled = true;
    this.currentAnimation = null;
    this.isAnimating = false;
    
    // Reset renderer
    if (this.renderer?.resetOffset) {
      this.renderer.resetOffset();
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.cancel();
    this.isAnimating = false;
    
    // Clear all trails
    this.trails.forEach(trail => {
      if (this.renderer?.clearTile) {
        this.renderer.clearTile(trail.position.x, trail.position.y);
      }
    });
    this.trails = [];
  }
}

// Factory function for creating movement animator
let _movementAnimator = null;

/**
 * Get or create the movement animator instance
 * @param {EventBus} eventBus - Event bus
 * @param {Object} renderer - Renderer
 * @param {Object} options - Configuration options
 * @returns {MovementAnimator} The movement animator instance
 */
export function getMovementAnimator(eventBus = null, renderer = null, options = {}) {
  if (!_movementAnimator) {
    _movementAnimator = new MovementAnimator(eventBus, renderer, options);
  }
  return _movementAnimator;
}

/**
 * Reset the movement animator (useful for testing)
 */
export function resetMovementAnimator() {
  if (_movementAnimator) {
    _movementAnimator.cleanup();
  }
  _movementAnimator = null;
}