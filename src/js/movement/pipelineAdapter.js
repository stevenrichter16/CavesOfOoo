/**
 * Pipeline Adapter - Integrates the new MovementPipeline with existing code
 * This module provides a bridge between the old runPlayerMove function
 * and the new class-based MovementPipeline system
 */

import { movementPipeline } from './MovementPipeline.js';
import { gameEventBus } from '../systems/EventBus.js';

// Store original runPlayerMove for fallback
let originalRunPlayerMove = null;

/**
 * Feature flag to enable/disable new pipeline
 * Can be controlled via environment or settings
 */
export function isNewPipelineEnabled() {
  return process.env.USE_NEW_MOVEMENT !== 'false';
}

/**
 * Initialize the pipeline adapter
 * Sets up event listeners and prepares the system
 */
export function initializePipelineAdapter() {
  // Subscribe to movement events
  gameEventBus.on('WillMove', handleWillMove);
  gameEventBus.on('DidMove', handleDidMove);
  gameEventBus.on('MovementBlocked', handleMovementBlocked);
  gameEventBus.on('MovementComplete', handleMovementComplete);
  
  console.log(`Movement Pipeline Adapter initialized (new pipeline: ${isNewPipelineEnabled() ? 'enabled' : 'disabled'})`);
}

/**
 * Adapt the existing runPlayerMove to use the new pipeline
 * @param {Function} originalFunc - The original runPlayerMove function
 * @returns {Function} The adapted function
 */
export function adaptRunPlayerMove(originalFunc) {
  originalRunPlayerMove = originalFunc;
  
  return async function(state, action) {
    if (!isNewPipelineEnabled()) {
      // Use original implementation
      return originalFunc(state, action);
    }
    
    try {
      // Use new pipeline
      const result = await movementPipeline.execute(state, action);
      
      // Convert result to match expected return value
      // Original returns true if action was consumed
      return result.success || result.attacked || result.interacted || result.cancelled;
      
    } catch (error) {
      console.error('Error in new movement pipeline, falling back to original:', error);
      
      // Record error metrics
      errorMetrics.record(error, { state, action });
      
      // Check error rate for alerting
      const errorRate = errorMetrics.getErrorRate();
      if (errorRate.count > 10) {
        console.warn(`High error rate in movement pipeline: ${errorRate.count} errors in last minute`);
      }
      
      // Fallback to original implementation
      return originalFunc(state, action);
    }
  };
}

/**
 * Event Handlers
 */

function handleWillMove(data, result) {
  // Log pre-movement for debugging
  if (process.env.DEBUG_MOVEMENT) {
    console.log('WillMove:', data);
  }
}

function handleDidMove(data, result) {
  // Log successful movement
  if (process.env.DEBUG_MOVEMENT) {
    console.log('DidMove:', data);
  }
}

function handleMovementBlocked(data, result) {
  // Log blocked movement
  if (process.env.DEBUG_MOVEMENT) {
    console.log('Movement blocked:', data);
  }
}

function handleMovementComplete(data, result) {
  // Log movement completion with metrics
  if (process.env.DEBUG_MOVEMENT) {
    console.log('Movement complete:', data);
    if (data.result?.metrics) {
      console.log('Pipeline metrics:', data.result.metrics);
    }
  }
}

/**
 * Error tracking for pipeline failures
 */
export class ErrorMetrics {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }
  
  record(error, context) {
    const errorRecord = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      state: context?.state ? {
        playerPos: { x: context.state.player?.x, y: context.state.player?.y },
        chunkPos: { x: context.state.cx, y: context.state.cy }
      } : null,
      action: context?.action
    };
    
    this.errors.push(errorRecord);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }
  
  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }
  
  getErrorRate(windowMs = 60000) {
    const now = Date.now();
    const recentErrors = this.errors.filter(e => 
      now - e.timestamp < windowMs
    );
    return {
      count: recentErrors.length,
      rate: recentErrors.length / (windowMs / 1000), // errors per second
      window: windowMs
    };
  }
  
  clear() {
    this.errors = [];
  }
}

// Global error metrics instance
export const errorMetrics = new ErrorMetrics();

/**
 * Performance monitoring utilities
 */

export class MovementMetrics {
  constructor() {
    this.measurements = [];
    this.maxMeasurements = 100;
  }
  
  record(metrics) {
    this.measurements.push({
      timestamp: Date.now(),
      metrics
    });
    
    // Keep only recent measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }
  }
  
  getAverages() {
    if (this.measurements.length === 0) return {};
    
    const sums = {};
    const counts = {};
    
    for (const measurement of this.measurements) {
      for (const [step, duration] of Object.entries(measurement.metrics)) {
        sums[step] = (sums[step] || 0) + duration;
        counts[step] = (counts[step] || 0) + 1;
      }
    }
    
    const averages = {};
    for (const step in sums) {
      averages[step] = sums[step] / counts[step];
    }
    
    return averages;
  }
  
  getReport() {
    const averages = this.getAverages();
    const total = Object.values(averages).reduce((sum, val) => sum + val, 0);
    
    return {
      stepAverages: averages,
      totalAverage: total,
      sampleSize: this.measurements.length
    };
  }
}

// Global metrics instance
export const movementMetrics = new MovementMetrics();

// Subscribe to movement completion to record metrics
gameEventBus.on('MovementComplete', (data) => {
  if (data.result?.metrics) {
    movementMetrics.record(data.result.metrics);
  }
});

/**
 * Get pipeline health status
 * @returns {Object} Health status with metrics and error information
 */
export function getPipelineHealth() {
  const performanceReport = movementMetrics.getReport();
  const errorRate = errorMetrics.getErrorRate();
  const recentErrors = errorMetrics.getRecentErrors(5);
  
  return {
    enabled: isNewPipelineEnabled(),
    performance: {
      averageMs: performanceReport.totalAverage,
      sampleSize: performanceReport.sampleSize,
      stepBreakdown: performanceReport.stepAverages
    },
    errors: {
      rate: errorRate.rate,
      count: errorRate.count,
      recent: recentErrors.map(e => ({
        message: e.message,
        timestamp: new Date(e.timestamp).toISOString()
      }))
    },
    status: errorRate.count > 10 ? 'unhealthy' : 
            errorRate.count > 5 ? 'degraded' : 'healthy'
  };
}