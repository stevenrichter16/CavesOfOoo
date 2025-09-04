// src/js/systems/ProjectileSystem.js
// Centralized system for all projectile animations and ranged attacks

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

/**
 * ProjectileSystem - Handles all projectile animations for ranged attacks
 */
class ProjectileSystem {
  constructor() {
    this.activeProjectiles = new Map();
    this.animationFrameId = null;
    this.lastFrameTime = 0;
  }

  /**
   * Launch a projectile with animation
   * @param {Object} config - Projectile configuration
   * @returns {Promise} Resolves when projectile reaches target
   */
  async launch(config) {
    const {
      fromX,
      fromY,
      toX,
      toY,
      type = 'default',
      speed = 500, // tiles per second
      arcHeight = 0.3, // Arc height multiplier (relative to distance)
      trail = false,
      animationSymbols = null, // Custom animation symbols
      impactSymbols = null, // Custom impact symbols
      displayKind = null, // Custom display kind
      checkCollision = null, // Function to check if position is blocked
      onImpact = null
    } = config;

    // Validate inputs
    if (!Number.isFinite(fromX) || !Number.isFinite(fromY) || 
        !Number.isFinite(toX) || !Number.isFinite(toY)) {
      console.error('Invalid projectile coordinates:', { fromX, fromY, toX, toY });
      return Promise.reject(new Error('Invalid projectile coordinates'));
    }
    
    if (fromX === toX && fromY === toY) {
      // Instant impact if launching at same position
      if (onImpact) {
        onImpact(toX, toY);
      }
      return Promise.resolve({ x: toX, y: toY });
    }

    // Calculate trajectory
    const trajectory = this.calculateTrajectory(fromX, fromY, toX, toY);
    const distance = trajectory.distance;
    const duration = Math.max(100, (distance / speed) * 1000); // Min 100ms duration
    
    // Create projectile object
    const projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      startTime: performance.now(),
      duration,
      trajectory,
      type,
      trail,
      arcHeight,
      fromX,
      fromY,
      toX,
      toY,
      currentFrame: 0,
      trailPositions: [],
      animationSymbols,
      impactSymbols,
      displayKind,
      checkCollision,
      collided: false
    };

    // Store active projectile
    this.activeProjectiles.set(projectile.id, projectile);

    // Start animation loop if not running
    if (!this.animationFrameId) {
      this.startAnimationLoop();
    }

    // Return promise that resolves when projectile reaches target
    return new Promise((resolve) => {
      projectile.onComplete = () => {
        this.activeProjectiles.delete(projectile.id);
        // Use actual impact position (may have changed due to collision)
        const impactX = projectile.toX;
        const impactY = projectile.toY;
        if (onImpact) {
          onImpact(impactX, impactY);
        }
        resolve({ x: impactX, y: impactY });
      };
    });
  }

  /**
   * Calculate trajectory between two points
   */
  calculateTrajectory(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(3, Math.min(15, Math.floor(distance * 2))); // Optimize step count
    
    return {
      dx,
      dy,
      distance,
      steps,
      stepX: dx / steps,
      stepY: dy / steps
    };
  }

  /**
   * Start the animation loop using requestAnimationFrame
   */
  startAnimationLoop() {
    // Prevent multiple animation loops
    if (this.animationFrameId) {
      return;
    }
    
    const animate = (currentTime) => {
      // Initialize lastFrameTime on first frame
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }
      
      // Calculate delta time for smooth animation
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Update all active projectiles
      const completedProjectiles = [];
      
      for (const [id, projectile] of this.activeProjectiles) {
        const elapsed = currentTime - projectile.startTime;
        const progress = Math.min(1, elapsed / projectile.duration);
        
        // Update projectile position
        this.updateProjectile(projectile, progress);
        
        // Check if complete
        if (progress >= 1) {
          completedProjectiles.push(projectile);
        }
      }

      // Handle completed projectiles
      for (const projectile of completedProjectiles) {
        this.handleImpact(projectile);
        if (projectile.onComplete) {
          projectile.onComplete();
        }
      }

      // Continue animation if projectiles remain
      if (this.activeProjectiles.size > 0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
        this.lastFrameTime = 0; // Reset for next animation cycle
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Update projectile position and render
   */
  updateProjectile(projectile, progress) {
    const { fromX, fromY, trajectory, arcHeight, type, checkCollision } = projectile;
    
    // Calculate current position with arc
    const linearX = fromX + (trajectory.dx * progress);
    const linearY = fromY + (trajectory.dy * progress);
    
    // Add parabolic arc for height (scaled by distance for consistency)
    const arcScale = Math.min(1, trajectory.distance / 10); // Scale down arc for short throws
    const arcOffset = Math.sin(progress * Math.PI) * arcHeight * arcScale * trajectory.distance;
    
    const currentX = Math.round(linearX);
    const currentY = Math.round(linearY - arcOffset);
    
    // Check for collision if we have a collision checker and position changed
    if (checkCollision && (currentX !== projectile.lastX || currentY !== projectile.lastY)) {
      // Don't check collision at starting position
      if (!(currentX === fromX && currentY === fromY)) {
        if (checkCollision(currentX, currentY)) {
          // Collision detected! Impact at last valid position
          projectile.collided = true;
          // Use last valid position (before the wall)
          projectile.toX = projectile.lastX !== undefined ? projectile.lastX : fromX;
          projectile.toY = projectile.lastY !== undefined ? projectile.lastY : fromY;
          // Force completion on next frame
          projectile.startTime = performance.now() - projectile.duration;
          return; // Don't render at blocked position
        }
      }
    }

    // Only render if position changed (performance optimization)
    if (currentX !== projectile.lastX || currentY !== projectile.lastY) {
      // Clear previous position if needed
      if (projectile.lastRendered) {
        this.clearProjectile(projectile.lastX, projectile.lastY);
      }

      // Render projectile at new position
      this.renderProjectile(currentX, currentY, type, projectile);
      
      // Handle trail
      if (projectile.trail) {
        this.renderTrail(projectile, currentX, currentY);
      }

      projectile.lastX = currentX;
      projectile.lastY = currentY;
      projectile.lastRendered = true;
    }
  }

  /**
   * Render projectile at position
   */
  renderProjectile(x, y, type, projectile) {
    // Bounds checking - don't render outside map
    if (x < 0 || y < 0 || !Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    
    // Use custom symbols if provided, otherwise use defaults
    const symbols = projectile.animationSymbols || this.getProjectileSymbols(type);
    if (!symbols || symbols.length === 0) {
      return;
    }
    
    const frameIndex = Math.abs(projectile.currentFrame) % symbols.length;
    const symbol = symbols[frameIndex];
    
    // Increment frame for animation
    projectile.currentFrame++;

    // Emit floating text event for rendering
    emit(EventType.FloatingText, {
      x,
      y,
      text: symbol,
      kind: projectile.displayKind || this.getProjectileKind(type),
      duration: 100 // Short duration for smooth animation
    });
  }

  /**
   * Get projectile symbols based on type
   */
  getProjectileSymbols(type) {
    const symbolMap = {
      'fire': ['*', 'x', '+', 'X', '*'],
      'ice': ['*', 'o', 'O', '*'],
      'poison': ['o', '@', 'o', '@'],
      'default': ['o', 'O', '0', 'O', 'o'],
      'arrow': ['-', '>', '=', '>'],
      'magic': ['*', '+', 'x', '+']
    };
    
    return symbolMap[type] || symbolMap.default;
  }

  /**
   * Get projectile display kind for styling
   */
  getProjectileKind(type) {
    const kindMap = {
      'fire': 'crit',
      'ice': 'freeze',
      'poison': 'poison',
      'magic': 'magic',
      'default': 'damage'
    };
    
    return kindMap[type] || 'damage';
  }

  /**
   * Render trail effect
   */
  renderTrail(projectile, x, y) {
    // Store trail position
    projectile.trailPositions.push({ x, y, time: performance.now() });
    
    // Clean up old trail positions (prevent memory leak)
    const currentTime = performance.now();
    projectile.trailPositions = projectile.trailPositions.filter(pos => 
      (currentTime - pos.time) < 300 // Keep only last 300ms of trail
    );
    
    // Limit trail length
    const maxTrailLength = 5;
    if (projectile.trailPositions.length > maxTrailLength) {
      projectile.trailPositions = projectile.trailPositions.slice(-maxTrailLength);
    }

    // Render fading trail
    projectile.trailPositions.forEach((pos, index) => {
      const age = (currentTime - pos.time) / 1000; // Age in seconds
      if (age < 0.3) { // Trail lasts 0.3 seconds
        const trailSymbol = '.';
        const opacity = 1 - (age / 0.3);
        
        emit(EventType.FloatingText, {
          x: pos.x,
          y: pos.y,
          text: trailSymbol,
          kind: 'magic',
          duration: 50,
          opacity
        });
      }
    });
  }

  /**
   * Clear projectile at position (if needed)
   */
  clearProjectile(x, y) {
    // In this implementation, floating text auto-clears
    // This method is here for future canvas direct rendering
  }

  /**
   * Handle projectile impact
   */
  handleImpact(projectile) {
    const { toX, toY, type } = projectile;
    
    // Use custom impact symbols if provided, otherwise use defaults
    const impactSymbols = projectile.impactSymbols || this.getImpactSymbols(type);
    
    // Animate impact burst
    impactSymbols.forEach((symbol, index) => {
      setTimeout(() => {
        const offset = this.getImpactOffset(index);
        
        emit(EventType.FloatingText, {
          x: toX + offset.x,
          y: toY + offset.y,
          text: symbol,
          kind: projectile.displayKind || this.getProjectileKind(type),
          duration: 150 - (index * 30)
        });
      }, index * 20);
    });
  }

  /**
   * Get impact symbols based on type
   */
  getImpactSymbols(type) {
    const symbolMap = {
      'fire': ['*', 'x', 'X', '+'],
      'ice': ['*', '+', '*'],
      'poison': ['@', 'o', '@'],
      'default': ['x', '+', '*'],
      'magic': ['*', '+', 'x', '*']
    };
    
    return symbolMap[type] || symbolMap.default;
  }

  /**
   * Calculate impact particle offset
   */
  getImpactOffset(index) {
    const offsets = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 }
    ];
    
    return offsets[index] || { x: 0, y: 0 };
  }

  /**
   * Cancel all active projectiles
   * @returns {number} Number of projectiles canceled
   */
  cancelAll() {
    const canceledCount = this.activeProjectiles.size;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Call onComplete callbacks for cleanup
    for (const [id, projectile] of this.activeProjectiles) {
      if (projectile.onComplete && typeof projectile.onComplete === 'function') {
        try {
          projectile.onComplete();
        } catch (err) {
          console.error('Error in projectile onComplete:', err);
        }
      }
    }
    
    this.activeProjectiles.clear();
    this.lastFrameTime = 0; // Reset frame timing
    
    return canceledCount;
  }
}

// Export singleton instance
export const projectileSystem = new ProjectileSystem();

/**
 * Helper function to launch a projectile
 */
export async function launchProjectile(config) {
  return projectileSystem.launch(config);
}