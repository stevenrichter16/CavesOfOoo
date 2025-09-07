/**
 * ErrorHandler - Centralized error handling for the social system
 * Provides structured logging, error recovery, and event emission
 */

import { EventBus } from '../../js/systems/EventBus.js';

// Error severity levels
export const ErrorSeverity = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Error codes for categorization
export const ErrorCode = {
  // NPC-related errors
  NPC_INVALID_DATA: 'NPC_INVALID_DATA',
  NPC_CONVERSION_FAILED: 'NPC_CONVERSION_FAILED',
  NPC_NOT_FOUND: 'NPC_NOT_FOUND',
  NPC_MOVEMENT_FAILED: 'NPC_MOVEMENT_FAILED',
  
  // Encounter-related errors
  ENCOUNTER_INVALID: 'ENCOUNTER_INVALID',
  ENCOUNTER_SYSTEM_ERROR: 'ENCOUNTER_SYSTEM_ERROR',
  ENCOUNTER_REGISTRY_ERROR: 'ENCOUNTER_REGISTRY_ERROR',
  
  // Social system errors
  SOCIAL_CONTEXT_BUILD_FAILED: 'SOCIAL_CONTEXT_BUILD_FAILED',
  SOCIAL_ACTION_FAILED: 'SOCIAL_ACTION_FAILED',
  SOCIAL_DIALOGUE_ERROR: 'SOCIAL_DIALOGUE_ERROR',
  
  // Spatial index errors
  SPATIAL_INDEX_CORRUPTION: 'SPATIAL_INDEX_CORRUPTION',
  SPATIAL_INDEX_UPDATE_FAILED: 'SPATIAL_INDEX_UPDATE_FAILED',
  
  // General errors
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  STATE_CORRUPTION: 'STATE_CORRUPTION',
  MEMORY_LEAK_DETECTED: 'MEMORY_LEAK_DETECTED',
  RECOVERY_FAILED: 'RECOVERY_FAILED',
  RECURSION_DETECTED: 'RECURSION_DETECTED'
};

/**
 * ErrorHandler class for structured error management
 */
export class ErrorHandler {
  constructor(eventBus = null, config = {}) {
    this.eventBus = eventBus || new EventBus();
    this.config = {
      logToConsole: config.logToConsole !== false,
      emitEvents: config.emitEvents !== false,
      collectMetrics: config.collectMetrics !== false,
      maxErrorHistory: config.maxErrorHistory || 100,
      maxErrorTypes: config.maxErrorTypes || 50,
      debugMode: config.debugMode || false,
      maxRecoveryDepth: config.maxRecoveryDepth || 2
    };
    
    // Error history for debugging
    this.errorHistory = [];
    
    // Error counts by code
    this.errorCounts = new Map();
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    
    // Recursion prevention
    this._recoveryDepth = 0;
    this._recoveryStack = new Set();
  }
  
  /**
   * Log an error with structured information
   * @param {string} code - Error code from ErrorCode enum
   * @param {Error|string} error - The error object or message
   * @param {Object} context - Additional context
   * @param {string} severity - Severity level
   * @returns {Object} Error record
   */
  logError(code, error, context = {}, severity = ErrorSeverity.ERROR) {
    const errorRecord = this._createErrorRecord(code, error, context, severity);
    
    // Add to history
    this._addToHistory(errorRecord);
    
    // Update metrics
    this._updateMetrics(code);
    
    // Console logging
    if (this.config.logToConsole) {
      this._logToConsole(errorRecord);
    }
    
    // Event emission
    if (this.config.emitEvents) {
      this._emitErrorEvent(errorRecord);
    }
    
    // Try recovery (with recursion protection)
    this._attemptRecovery(code, errorRecord);
    
    return errorRecord;
  }
  
  /**
   * Log a warning
   */
  logWarning(code, message, context = {}) {
    return this.logError(code, message, context, ErrorSeverity.WARNING);
  }
  
  /**
   * Log info
   */
  logInfo(code, message, context = {}) {
    return this.logError(code, message, context, ErrorSeverity.INFO);
  }
  
  /**
   * Log debug information
   */
  logDebug(code, message, context = {}) {
    if (this.config.debugMode) {
      return this.logError(code, message, context, ErrorSeverity.DEBUG);
    }
  }
  
  /**
   * Log critical error and attempt recovery
   */
  logCritical(code, error, context = {}) {
    const record = this.logError(code, error, context, ErrorSeverity.CRITICAL);
    
    // Emit critical error event for system-wide handling
    this.eventBus.emit('system:critical-error', record);
    
    return record;
  }
  
  /**
   * Register a recovery strategy for an error code
   */
  registerRecoveryStrategy(code, strategy) {
    this.recoveryStrategies.set(code, strategy);
  }
  
  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByCode: {},
      errorsBySeverity: {},
      recentErrors: this.errorHistory.slice(-10),
      topErrors: []
    };
    
    // Count by code
    for (const [code, count] of this.errorCounts) {
      stats.errorsByCode[code] = count;
    }
    
    // Count by severity
    for (const error of this.errorHistory) {
      stats.errorsBySeverity[error.severity] = 
        (stats.errorsBySeverity[error.severity] || 0) + 1;
    }
    
    // Get top errors
    const sorted = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    stats.topErrors = sorted.map(([code, count]) => ({ code, count }));
    
    return stats;
  }
  
  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
  }
  
  /**
   * Clean up all error data and strategies
   */
  cleanup() {
    this.errorHistory = [];
    this.errorCounts.clear();
    this.recoveryStrategies.clear();
  }
  
  /**
   * Trim old errors based on age
   * @param {number} maxAge - Maximum age in milliseconds
   */
  trimOldErrors(maxAge = 3600000) {
    const cutoff = Date.now() - maxAge;
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > cutoff);
  }
  
  /**
   * Create structured error record
   * @private
   */
  _createErrorRecord(code, error, context, severity) {
    const record = {
      code,
      severity,
      timestamp: Date.now(),
      context
    };
    
    // Handle different error types
    if (error instanceof Error) {
      record.message = error.message;
      record.stack = error.stack;
      record.name = error.name;
    } else {
      record.message = String(error);
    }
    
    // Add system context
    record.systemContext = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
      timestamp: new Date().toISOString()
    };
    
    return record;
  }
  
  /**
   * Add error to history
   * @private
   */
  _addToHistory(errorRecord) {
    this.errorHistory.push(errorRecord);
    
    // Trim history if needed
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }
  
  /**
   * Update error metrics
   * @private
   */
  _updateMetrics(code) {
    if (this.config.collectMetrics) {
      const count = this.errorCounts.get(code) || 0;
      this.errorCounts.set(code, count + 1);
      
      // Prevent unbounded growth of error types
      if (this.errorCounts.size > this.config.maxErrorTypes) {
        this._pruneErrorCounts();
      }
    }
  }
  
  /**
   * Prune least frequent error codes to maintain size limit
   * @private
   */
  _pruneErrorCounts() {
    // Sort by count (ascending) to find least frequent
    const sorted = Array.from(this.errorCounts.entries())
      .sort((a, b) => a[1] - b[1]);
    
    // Remove the least frequent error codes (bottom 10%)
    const removeCount = Math.max(1, Math.floor(this.config.maxErrorTypes * 0.1));
    
    for (let i = 0; i < removeCount && i < sorted.length; i++) {
      this.errorCounts.delete(sorted[i][0]);
    }
    
    if (this.config.debugMode) {
      console.log(`[ErrorHandler] Pruned ${removeCount} error types to maintain limit`);
    }
  }
  
  /**
   * Log to console with appropriate method
   * @private
   */
  _logToConsole(errorRecord) {
    const prefix = `[${errorRecord.code}]`;
    const message = errorRecord.message;
    const context = errorRecord.context;
    
    switch (errorRecord.severity) {
      case ErrorSeverity.DEBUG:
        if (this.config.debugMode) {
          console.debug(prefix, message, context);
        }
        break;
      case ErrorSeverity.INFO:
        console.info(prefix, message, context);
        break;
      case ErrorSeverity.WARNING:
        console.warn(prefix, message, context);
        break;
      case ErrorSeverity.ERROR:
        console.error(prefix, message, context);
        if (errorRecord.stack && this.config.debugMode) {
          console.error(errorRecord.stack);
        }
        break;
      case ErrorSeverity.CRITICAL:
        console.error(`🚨 CRITICAL ${prefix}`, message, context);
        if (errorRecord.stack) {
          console.error(errorRecord.stack);
        }
        break;
    }
  }
  
  /**
   * Emit error event
   * @private
   */
  _emitErrorEvent(errorRecord) {
    // Emit specific error event
    this.eventBus.emit(`error:${errorRecord.code}`, errorRecord);
    
    // Emit general error event by severity
    this.eventBus.emit(`error:${errorRecord.severity}`, errorRecord);
    
    // Emit to UI if it's user-facing
    if (errorRecord.severity === ErrorSeverity.ERROR || 
        errorRecord.severity === ErrorSeverity.CRITICAL) {
      this.eventBus.emit('ui:error', {
        message: this._getUserFriendlyMessage(errorRecord),
        severity: errorRecord.severity
      });
    }
  }
  
  /**
   * Get user-friendly error message
   * @private
   */
  _getUserFriendlyMessage(errorRecord) {
    const messages = {
      [ErrorCode.NPC_NOT_FOUND]: "The character seems to have wandered off.",
      [ErrorCode.ENCOUNTER_INVALID]: "Cannot interact with this character right now.",
      [ErrorCode.SOCIAL_ACTION_FAILED]: "That action didn't work as expected.",
      [ErrorCode.NPC_MOVEMENT_FAILED]: "The character couldn't move there.",
      [ErrorCode.SPATIAL_INDEX_CORRUPTION]: "Having trouble tracking characters. Reloading may help."
    };
    
    return messages[errorRecord.code] || "Something went wrong. Please try again.";
  }
  
  /**
   * Attempt recovery based on error code
   * @private
   */
  _attemptRecovery(code, errorRecord) {
    // Check recursion depth
    if (this._recoveryDepth >= this.config.maxRecoveryDepth) {
      // Mark that max depth was reached
      errorRecord._maxDepthReached = true;
      
      // Log warning in debug mode
      if (this.config.debugMode) {
        console.warn(`[ErrorHandler] Max recovery depth ${this.config.maxRecoveryDepth} reached for ${code}`);
      }
      
      // Emit event for monitoring
      if (this.config.emitEvents) {
        this.eventBus.emit('error:max-recovery-depth', {
          code,
          depth: this._recoveryDepth,
          errorRecord
        });
      }
      
      return;
    }
    
    // Check if we're already recovering from this specific error code
    if (this._recoveryStack.has(code)) {
      // Detected circular recovery - mark in record and exit
      errorRecord._circularRecovery = true;
      
      // Log warning about circular recovery
      if (this.config.debugMode) {
        console.warn(`[ErrorHandler] Circular recovery detected for ${code}`);
      }
      
      // Emit event for monitoring
      if (this.config.emitEvents) {
        this.eventBus.emit('error:circular-recovery', {
          code,
          stack: Array.from(this._recoveryStack),
          errorRecord
        });
      }
      
      return;
    }
    
    // Mark record as having recovery attempted
    errorRecord._recoveryAttempted = true;
    
    const strategy = this.recoveryStrategies.get(code);
    
    if (strategy) {
      // Enter recovery context
      this._recoveryDepth++;
      this._recoveryStack.add(code);
      
      try {
        strategy(errorRecord);
        
        // Log success only if not at max depth
        if (this._recoveryDepth < this.config.maxRecoveryDepth) {
          this.logInfo(code, 'Recovery strategy executed', { 
            recovered: true,
            originalError: errorRecord.message,
            recoveryDepth: this._recoveryDepth
          });
        }
      } catch (recoveryError) {
        // Log recovery failure only if not at max depth
        if (this._recoveryDepth < this.config.maxRecoveryDepth) {
          this.logError(
            ErrorCode.RECOVERY_FAILED,
            recoveryError,
            { 
              originalCode: code,
              recoveryDepth: this._recoveryDepth 
            }
          );
        }
      } finally {
        // Exit recovery context
        this._recoveryDepth--;
        this._recoveryStack.delete(code);
      }
    }
  }
}

// Singleton instance and configuration
let defaultErrorHandler = null;
let singletonEventBus = null;
let singletonConfig = null;

/**
 * Get or create default error handler
 */
export function getErrorHandler(eventBus = null, config = {}) {
  if (!defaultErrorHandler) {
    // First initialization - store the configuration
    singletonEventBus = eventBus;
    singletonConfig = config;
    defaultErrorHandler = new ErrorHandler(eventBus, config);
  } else {
    // Already initialized - warn if different parameters provided
    if (eventBus && eventBus !== singletonEventBus) {
      console.warn(
        '[ErrorHandler] Singleton already initialized with different EventBus. ' +
        'Ignoring new EventBus parameter.'
      );
    }
    
    if (Object.keys(config).length > 0 && JSON.stringify(config) !== JSON.stringify(singletonConfig)) {
      console.warn(
        '[ErrorHandler] Singleton already initialized with different config. ' +
        'Ignoring new config parameter. Use resetErrorHandler() to reinitialize.'
      );
    }
  }
  return defaultErrorHandler;
}

/**
 * Quick error logging helper
 */
export function logError(code, error, context = {}) {
  return getErrorHandler().logError(code, error, context);
}

/**
 * Quick warning logging helper
 */
export function logWarning(code, message, context = {}) {
  return getErrorHandler().logWarning(code, message, context);
}

/**
 * Quick info logging helper
 */
export function logInfo(code, message, context = {}) {
  return getErrorHandler().logInfo(code, message, context);
}

/**
 * Reset error handler singleton (for testing)
 */
export function resetErrorHandler() {
  if (defaultErrorHandler) {
    // Clean up before resetting
    defaultErrorHandler.cleanup();
  }
  defaultErrorHandler = null;
  singletonEventBus = null;
  singletonConfig = null;
}