/**
 * Tests for Error Handler Critical Fixes
 * Following TDD approach - write tests first, then implement fixes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Error Handler Critical Fixes', () => {
  
  describe('Missing Error Codes', () => {
    it('should have RECOVERY_FAILED error code defined', async () => {
      const { ErrorCode } = await import('../../src/social/utils/ErrorHandler.js');
      
      // Test that RECOVERY_FAILED exists
      expect(ErrorCode.RECOVERY_FAILED).toBeDefined();
      expect(ErrorCode.RECOVERY_FAILED).toBe('RECOVERY_FAILED');
    });
    
    it('should handle recovery failures without crashing', async () => {
      const { ErrorHandler, ErrorCode } = await import('../../src/social/utils/ErrorHandler.js');
      const { EventBus } = await import('../../src/js/systems/EventBus.js');
      
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, { logToConsole: false });
      
      // Register a recovery strategy that fails
      const failingStrategy = vi.fn(() => {
        throw new Error('Recovery failed');
      });
      
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, failingStrategy);
      
      // This should not throw
      expect(() => {
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Test error');
      }).not.toThrow();
      
      // Strategy should have been called
      expect(failingStrategy).toHaveBeenCalled();
      
      // Should have logged the recovery failure
      const stats = errorHandler.getStatistics();
      expect(stats.errorsByCode[ErrorCode.RECOVERY_FAILED]).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Recursion Guard', () => {
    it('should prevent infinite recursion in recovery attempts', async () => {
      const { ErrorHandler, ErrorCode } = await import('../../src/social/utils/ErrorHandler.js');
      const { EventBus } = await import('../../src/js/systems/EventBus.js');
      
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, { 
        logToConsole: false,
        maxRecoveryDepth: 2  // Set explicit max depth for test
      });
      
      let recursionCount = 0;
      const maxRecursion = 10;
      
      // Create a recovery strategy that triggers another error
      const recursiveStrategy = vi.fn((errorRecord) => {
        recursionCount++;
        if (recursionCount > maxRecursion) {
          throw new Error('Max recursion reached - test failed!');
        }
        // This could cause infinite recursion without guard
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Recursive error');
      });
      
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, recursiveStrategy);
      
      // Trigger the error
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Initial error');
      
      // Should have stopped after detecting recursion
      expect(recursionCount).toBeLessThan(maxRecursion);
      // With maxRecoveryDepth=2, it should run up to 2 times
      expect(recursionCount).toBeLessThanOrEqual(2);
      expect(recursionCount).toBeGreaterThan(0);
    });
    
    it('should set _recoveryAttempted flag on error records', async () => {
      const { ErrorHandler, ErrorCode } = await import('../../src/social/utils/ErrorHandler.js');
      const { EventBus } = await import('../../src/js/systems/EventBus.js');
      
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, { logToConsole: false });
      
      let capturedRecord = null;
      const strategy = vi.fn((errorRecord) => {
        capturedRecord = errorRecord;
      });
      
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, strategy);
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Test');
      
      expect(capturedRecord).toBeTruthy();
      expect(capturedRecord._recoveryAttempted).toBe(true);
    });
  });
  
  describe('Singleton Pattern Fix', () => {
    it('should use consistent singleton instance', async () => {
      // Clear module cache to ensure fresh imports
      vi.resetModules();
      
      const { getErrorHandler } = await import('../../src/social/utils/ErrorHandler.js');
      
      const instance1 = getErrorHandler();
      const instance2 = getErrorHandler();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should properly initialize singleton with first call parameters', async () => {
      vi.resetModules();
      
      const { ErrorHandler, getErrorHandler } = await import('../../src/social/utils/ErrorHandler.js');
      const { EventBus } = await import('../../src/js/systems/EventBus.js');
      
      const customEventBus = new EventBus();
      const customConfig = { debugMode: true, maxErrorHistory: 50 };
      
      // First call should set the configuration
      const instance1 = getErrorHandler(customEventBus, customConfig);
      
      expect(instance1.eventBus).toBe(customEventBus);
      expect(instance1.config.debugMode).toBe(true);
      expect(instance1.config.maxErrorHistory).toBe(50);
      
      // Subsequent calls should return same instance regardless of params
      const instance2 = getErrorHandler(null, { debugMode: false });
      
      expect(instance2).toBe(instance1);
      expect(instance2.config.debugMode).toBe(true); // Should keep original config
    });
    
    it('should provide reset method for testing', async () => {
      vi.resetModules();
      
      const { getErrorHandler, resetErrorHandler } = await import('../../src/social/utils/ErrorHandler.js');
      
      const instance1 = getErrorHandler();
      resetErrorHandler();
      const instance2 = getErrorHandler();
      
      expect(instance1).not.toBe(instance2);
    });
  });
  
  describe('Memory Management', () => {
    it('should provide cleanup method', async () => {
      const { ErrorHandler, ErrorCode } = await import('../../src/social/utils/ErrorHandler.js');
      const { EventBus } = await import('../../src/js/systems/EventBus.js');
      
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, { logToConsole: false });
      
      // Add some errors
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Error 1');
      errorHandler.logError(ErrorCode.ENCOUNTER_INVALID, 'Error 2');
      
      // Add recovery strategy
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, vi.fn());
      
      const statsBefore = errorHandler.getStatistics();
      expect(statsBefore.totalErrors).toBe(2);
      
      // Cleanup should clear everything
      errorHandler.cleanup();
      
      const statsAfter = errorHandler.getStatistics();
      expect(statsAfter.totalErrors).toBe(0);
      expect(statsAfter.errorsByCode).toEqual({});
    });
    
    it('should trim old errors based on age', async () => {
      const { ErrorHandler, ErrorCode } = await import('../../src/social/utils/ErrorHandler.js');
      const { EventBus } = await import('../../src/js/systems/EventBus.js');
      
      const eventBus = new EventBus();
      const errorHandler = new ErrorHandler(eventBus, { logToConsole: false });
      
      // Add an old error (mock timestamp)
      const oldError = errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Old error');
      oldError.timestamp = Date.now() - 7200000; // 2 hours old
      
      // Add a recent error
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Recent error');
      
      // Trim errors older than 1 hour
      errorHandler.trimOldErrors(3600000);
      
      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(1);
      expect(stats.recentErrors[0].message).toBe('Recent error');
    });
  });
  
  describe('Import Path Validation', () => {
    it('should be able to import ErrorHandler from NPC using correct path', async () => {
      // This will fail until we fix the import paths
      const npcImportTest = async () => {
        // Test that NPC can import ErrorHandler correctly
        const { NPC } = await import('../../src/social/npc.js');
        
        // Create an NPC with invalid perception to trigger error handling
        const npc = new NPC({
          id: 'test',
          factions: ['test'],
          perception: -1 // Should trigger warning
        });
        
        expect(npc.perception).toBe(0); // Should be clamped
      };
      
      // This test will pass once import paths are fixed
      await expect(npcImportTest()).resolves.not.toThrow();
    });
  });
});