/**
 * Integration tests for the fixed Error Handler system
 * Verifying all fixes work together properly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { SocialEncounterSystem } from '../../src/social/integration/SocialEncounterSystem.js';
import { NPC } from '../../src/social/npc.js';
import { 
  getErrorHandler, 
  resetErrorHandler,
  ErrorCode,
  ErrorSeverity 
} from '../../src/social/utils/ErrorHandler.js';
import {
  INTERACTION_DISTANCE,
  MIN_PERCEPTION_VALUE,
  MAX_PERCEPTION_VALUE,
  DEFAULT_NPC_HP
} from '../../src/social/constants/index.js';

describe('Error Handler Integration - All Fixes', () => {
  let eventBus;
  let errorHandler;
  
  beforeEach(() => {
    resetErrorHandler();
    eventBus = new EventBus();
    errorHandler = getErrorHandler(eventBus, { 
      logToConsole: false,
      maxRecoveryDepth: 3 
    });
  });
  
  describe('Complete Error Flow', () => {
    it('should handle errors with recovery, recursion protection, and proper logging', () => {
      let recoveryAttempts = 0;
      const maxAttempts = 5;
      
      // Register a recursive recovery strategy
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, (record) => {
        recoveryAttempts++;
        if (recoveryAttempts < maxAttempts) {
          // This would cause infinite recursion without protection
          errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Recursive error');
        }
      });
      
      // Trigger the initial error
      const record = errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Initial error');
      
      // Should have attempted recovery
      expect(record._recoveryAttempted).toBe(true);
      
      // Should have stopped recursion early
      expect(recoveryAttempts).toBeLessThanOrEqual(3); // maxRecoveryDepth
      
      // Should have logged RECOVERY_FAILED if recovery threw
      const stats = errorHandler.getStatistics();
      expect(stats.errorsByCode[ErrorCode.NPC_NOT_FOUND]).toBeGreaterThan(0);
    });
    
    it('should cleanup properly and reset state', () => {
      // Add some errors
      errorHandler.logError(ErrorCode.NPC_INVALID_DATA, 'Test 1');
      errorHandler.logError(ErrorCode.ENCOUNTER_INVALID, 'Test 2');
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, vi.fn());
      
      // Verify data exists
      let stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(2);
      
      // Cleanup
      errorHandler.cleanup();
      
      // Verify cleanup worked
      stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByCode).toEqual({});
    });
  });
  
  describe('SocialEncounterSystem with Fixed Error Handler', () => {
    it('should handle errors gracefully in production scenario', () => {
      const system = new SocialEncounterSystem(eventBus);
      const menuOpenSpy = vi.fn();
      const errorEventSpy = vi.fn();
      
      eventBus.on('social:menu:open', menuOpenSpy);
      eventBus.on('ui:error', errorEventSpy);
      
      // Create invalid scenario
      const player = { name: 'Finn', factions: ['player'] };
      const npc = new NPC({ 
        id: 'test', 
        name: 'Test NPC',
        factions: ['test'],
        perception: 10 // Will be clamped to MAX_PERCEPTION_VALUE
      });
      
      // Force registry to fail
      system.registry = {
        getAvailable: () => { 
          throw new Error('Registry database connection failed'); 
        }
      };
      
      // Should handle the error gracefully
      system.handleEncounter(player, npc, {});
      
      // Should have emitted menu with fallback
      expect(menuOpenSpy).toHaveBeenCalled();
      const menuCall = menuOpenSpy.mock.calls[0][0];
      expect(menuCall.actions).toEqual([
        { id: 'talk', label: 'Talk', enabled: true }
      ]);
      
      // NPC perception should have been clamped
      expect(npc.perception).toBe(MAX_PERCEPTION_VALUE);
    });
    
    it('should use recovery strategies effectively', () => {
      const system = new SocialEncounterSystem(eventBus);
      let registryFixed = false;
      
      // Verify recovery strategy is registered
      expect(system.errorHandler.recoveryStrategies.has(ErrorCode.ENCOUNTER_REGISTRY_ERROR)).toBe(true);
      
      // Simulate registry error and recovery
      system.registry = null;
      
      // The recovery strategy should restore the registry
      const strategy = system.errorHandler.recoveryStrategies.get(ErrorCode.ENCOUNTER_REGISTRY_ERROR);
      strategy({ code: ErrorCode.ENCOUNTER_REGISTRY_ERROR });
      
      // Registry should be restored
      expect(system.registry).toBeDefined();
      expect(system.registry.getAvailable).toBeDefined();
    });
  });
  
  describe('Constants Integration', () => {
    it('should use organized constants throughout the system', () => {
      // Test that constants are being used correctly
      const { canInteract } = require('../../src/social/movement/MovementAdapter.js');
      
      const player = { x: 0, y: 0 };
      const npcInRange = new NPC({
        id: 'close',
        x: INTERACTION_DISTANCE - 0.1,
        y: 0,
        factions: ['test']
      });
      const npcOutOfRange = new NPC({
        id: 'far',
        x: INTERACTION_DISTANCE + 0.1,
        y: 0,
        factions: ['test']
      });
      
      expect(canInteract(player, npcInRange)).toBe(true);
      expect(canInteract(player, npcOutOfRange)).toBe(false);
    });
    
    it('should handle NPC creation with proper defaults from constants', () => {
      const npc = new NPC({
        id: 'test',
        factions: ['test']
      });
      
      // Should use constant defaults
      expect(npc.hp).toBe(DEFAULT_NPC_HP);
      expect(npc.perception).toBeGreaterThanOrEqual(MIN_PERCEPTION_VALUE);
      expect(npc.perception).toBeLessThanOrEqual(MAX_PERCEPTION_VALUE);
    });
  });
  
  describe('Memory Management', () => {
    it('should trim old errors to prevent memory leaks', () => {
      const now = Date.now();
      
      // Add old errors
      for (let i = 0; i < 5; i++) {
        const record = errorHandler.logError(ErrorCode.NPC_NOT_FOUND, `Old error ${i}`);
        record.timestamp = now - 7200000; // 2 hours old
      }
      
      // Add recent errors
      for (let i = 0; i < 3; i++) {
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, `Recent error ${i}`);
      }
      
      // Should have all errors initially
      expect(errorHandler.getStatistics().totalErrors).toBe(8);
      
      // Trim old errors (older than 1 hour)
      errorHandler.trimOldErrors(3600000);
      
      // Should only have recent errors
      expect(errorHandler.getStatistics().totalErrors).toBe(3);
    });
  });
  
  describe('Singleton Pattern', () => {
    it('should maintain single instance across different imports', async () => {
      // Reset to ensure clean state
      resetErrorHandler();
      
      // Get instance from different contexts
      const instance1 = getErrorHandler(eventBus);
      
      // Import from different module
      const { SocialEncounterSystem: System2 } = await import('../../src/social/integration/SocialEncounterSystem.js');
      const system = new System2(eventBus);
      
      // Both should use the same error handler instance
      const instance2 = getErrorHandler();
      
      expect(instance1).toBe(instance2);
      expect(instance1.eventBus).toBe(eventBus);
    });
  });
});