/**
 * Tests for Error Handler Improvements
 * Testing the fixes for silent failures, memory limits, and singleton validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  ErrorHandler,
  ErrorCode,
  getErrorHandler,
  resetErrorHandler
} from '../../src/social/utils/ErrorHandler.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('Error Handler Improvements', () => {
  
  beforeEach(() => {
    resetErrorHandler();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Recursion Guard Improvements', () => {
    it('should emit event when max depth reached', async () => {
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, {
        logToConsole: false,
        debugMode: true,
        maxRecoveryDepth: 1
      });
      
      const maxDepthSpy = vi.fn();
      eventBus.on('error:max-recovery-depth', maxDepthSpy);
      
      // Create nested recovery
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, () => {
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Nested error');
      });
      
      // Trigger error
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Initial error');
      
      // Should have emitted max depth event
      expect(maxDepthSpy).toHaveBeenCalled();
      const eventData = maxDepthSpy.mock.calls[0][0];
      expect(eventData.code).toBe(ErrorCode.NPC_NOT_FOUND);
      expect(eventData.depth).toBe(1);
    });
    
    it('should mark _maxDepthReached on error record', async () => {
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, {
        logToConsole: false,
        maxRecoveryDepth: 1
      });
      
      let capturedRecord = null;
      
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, () => {
        // This will trigger a nested error
        const nestedRecord = errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Nested');
        capturedRecord = nestedRecord;
      });
      
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Initial');
      
      // The nested error should have maxDepthReached flag
      expect(capturedRecord).toBeTruthy();
      expect(capturedRecord._maxDepthReached).toBe(true);
    });
    
    it('should emit event for circular recovery', async () => {
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, {
        logToConsole: false,
        debugMode: true
      });
      
      const circularSpy = vi.fn();
      eventBus.on('error:circular-recovery', circularSpy);
      
      // Create circular recovery
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, () => {
        // Try to recover from same error type (circular)
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Circular');
      });
      
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Initial');
      
      // Should have detected circular recovery
      expect(circularSpy).toHaveBeenCalled();
      const eventData = circularSpy.mock.calls[0][0];
      expect(eventData.code).toBe(ErrorCode.NPC_NOT_FOUND);
      expect(eventData.stack).toContain(ErrorCode.NPC_NOT_FOUND);
    });
  });
  
  describe('Memory Management Improvements', () => {
    it('should limit error counts Map size', () => {
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, {
        logToConsole: false,
        collectMetrics: true,
        maxErrorTypes: 5  // Small limit for testing
      });
      
      // Log many different error types
      for (let i = 0; i < 10; i++) {
        errorHandler.logError(`ERROR_TYPE_${i}`, `Error ${i}`);
      }
      
      // Should have pruned to stay within limit
      const stats = errorHandler.getStatistics();
      const errorTypeCount = Object.keys(stats.errorsByCode).length;
      
      // Should be at or below maxErrorTypes
      expect(errorTypeCount).toBeLessThanOrEqual(5);
    });
    
    it('should prune least frequent error types', () => {
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, {
        logToConsole: false,
        collectMetrics: true,
        maxErrorTypes: 3
      });
      
      // Log errors with different frequencies
      for (let i = 0; i < 5; i++) {
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Common error');
      }
      for (let i = 0; i < 3; i++) {
        errorHandler.logError(ErrorCode.ENCOUNTER_INVALID, 'Medium error');
      }
      errorHandler.logError(ErrorCode.NPC_CONVERSION_FAILED, 'Rare error');
      
      // Add more error types to trigger pruning
      errorHandler.logError('RARE_ERROR_1', 'Very rare');
      errorHandler.logError('RARE_ERROR_2', 'Also rare');
      
      const stats = errorHandler.getStatistics();
      
      // Most common errors should be kept
      expect(stats.errorsByCode[ErrorCode.NPC_NOT_FOUND]).toBeDefined();
      expect(stats.errorsByCode[ErrorCode.ENCOUNTER_INVALID]).toBeDefined();
      
      // Least frequent might be pruned
      const hasRareErrors = 
        stats.errorsByCode['RARE_ERROR_1'] !== undefined ||
        stats.errorsByCode['RARE_ERROR_2'] !== undefined;
      
      // At least one rare error should have been pruned
      expect(Object.keys(stats.errorsByCode).length).toBeLessThanOrEqual(3);
    });
  });
  
  describe('Singleton Validation', () => {
    it('should warn when different EventBus provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const eventBus1 = new EventBus();
      const eventBus2 = new EventBus();
      
      // First call
      const handler1 = getErrorHandler(eventBus1, { debugMode: true });
      
      // Second call with different EventBus
      const handler2 = getErrorHandler(eventBus2, { debugMode: false });
      
      // Should be same instance
      expect(handler1).toBe(handler2);
      
      // Should have warned about different EventBus
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('different EventBus')
      );
      
      warnSpy.mockRestore();
    });
    
    it('should warn when different config provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // First call
      const handler1 = getErrorHandler(null, { debugMode: true, maxErrorHistory: 50 });
      
      // Second call with different config
      const handler2 = getErrorHandler(null, { debugMode: false, maxErrorHistory: 100 });
      
      // Should be same instance
      expect(handler1).toBe(handler2);
      
      // Should have warned about different config
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('different config')
      );
      
      // Original config should be preserved
      expect(handler1.config.debugMode).toBe(true);
      expect(handler1.config.maxErrorHistory).toBe(50);
      
      warnSpy.mockRestore();
    });
    
    it('should cleanup when resetting singleton', () => {
      const handler = getErrorHandler(null, { logToConsole: false });
      
      // Add some data
      handler.logError(ErrorCode.NPC_NOT_FOUND, 'Test error');
      handler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, vi.fn());
      
      // Reset should cleanup
      resetErrorHandler();
      
      // New instance should be clean
      const newHandler = getErrorHandler(null, { logToConsole: false });
      
      expect(newHandler).not.toBe(handler);
      
      const stats = newHandler.getStatistics();
      expect(stats.totalErrors).toBe(0);
    });
  });
  
  describe('Browser Compatibility', () => {
    it('should handle missing process.env gracefully', async () => {
      // Save original process
      const originalProcess = global.process;
      
      try {
        // Remove process to simulate browser environment
        delete global.process;
        
        // Should not throw when importing constants
        const constants = await import('../../src/social/integration/constants.js');
        
        expect(constants.INTERACTION_DISTANCE).toBeDefined();
        expect(constants.DEFAULT_NPC_HP).toBeDefined();
      } finally {
        // Restore process
        global.process = originalProcess;
      }
    });
  });
  
  describe('Debug Mode Logging', () => {
    it('should log warnings in debug mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, {
        logToConsole: false,
        debugMode: true,
        maxRecoveryDepth: 1
      });
      
      // Create situation that triggers max depth
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, () => {
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Nested');
      });
      
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Initial');
      
      // Should have logged warning about max depth
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max recovery depth')
      );
      
      warnSpy.mockRestore();
    });
  });
});