import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler, ErrorCode, ErrorSeverity } from '../../src/social/utils/ErrorHandler.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { SocialEncounterSystem } from '../../src/social/integration/SocialEncounterSystem.js';
import { NPC } from '../../src/social/npc.js';
import { 
  INTERACTION_DISTANCE,
  MIN_PERCEPTION_VALUE,
  MAX_PERCEPTION_VALUE,
  DEFAULT_NPC_HP
} from '../../src/social/integration/constants.js';

describe('Error Handling Improvements', () => {
  let errorHandler;
  let eventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
    errorHandler = new ErrorHandler(eventBus, { 
      logToConsole: false,
      debugMode: true 
    });
  });
  
  describe('ErrorHandler', () => {
    it('should log errors with proper structure', () => {
      const error = new Error('Test error');
      const record = errorHandler.logError(
        ErrorCode.NPC_INVALID_DATA,
        error,
        { npcId: 'test-123' }
      );
      
      expect(record.code).toBe(ErrorCode.NPC_INVALID_DATA);
      expect(record.message).toBe('Test error');
      expect(record.context.npcId).toBe('test-123');
      expect(record.severity).toBe(ErrorSeverity.ERROR);
      expect(record.timestamp).toBeDefined();
    });
    
    it('should maintain error history', () => {
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Error 1');
      errorHandler.logError(ErrorCode.ENCOUNTER_INVALID, 'Error 2');
      errorHandler.logWarning(ErrorCode.NPC_INVALID_DATA, 'Warning 1');
      
      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCode[ErrorCode.NPC_NOT_FOUND]).toBe(1);
      expect(stats.errorsByCode[ErrorCode.ENCOUNTER_INVALID]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.ERROR]).toBe(2);
      expect(stats.errorsBySeverity[ErrorSeverity.WARNING]).toBe(1);
    });
    
    it('should emit error events', () => {
      const errorSpy = vi.fn();
      const uiErrorSpy = vi.fn();
      
      eventBus.on(`error:${ErrorCode.NPC_NOT_FOUND}`, errorSpy);
      eventBus.on('ui:error', uiErrorSpy);
      
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Test error');
      
      expect(errorSpy).toHaveBeenCalled();
      expect(uiErrorSpy).toHaveBeenCalled();
      const callArgs = uiErrorSpy.mock.calls[0][0];
      expect(callArgs.message).toBe("The character seems to have wandered off.");
      expect(callArgs.severity).toBe(ErrorSeverity.ERROR);
    });
    
    it('should execute recovery strategies', () => {
      const recoverySpy = vi.fn();
      errorHandler.registerRecoveryStrategy(ErrorCode.NPC_NOT_FOUND, recoverySpy);
      
      errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Test error');
      
      expect(recoverySpy).toHaveBeenCalled();
    });
    
    it('should limit error history size', () => {
      const handler = new ErrorHandler(eventBus, { 
        maxErrorHistory: 5,
        logToConsole: false 
      });
      
      for (let i = 0; i < 10; i++) {
        handler.logError(ErrorCode.NPC_NOT_FOUND, `Error ${i}`);
      }
      
      const stats = handler.getStatistics();
      expect(stats.totalErrors).toBe(5);
      expect(stats.recentErrors[0].message).toBe('Error 5');
    });
  });
  
  describe('Constants Usage', () => {
    it('should use INTERACTION_DISTANCE constant', async () => {
      // Import the canInteract function from MovementAdapter
      const { canInteract } = await import('../../src/social/movement/MovementAdapter.js');
      
      const player = { x: 0, y: 0 };
      const npcClose = new NPC({ 
        id: 'close', 
        x: INTERACTION_DISTANCE - 0.1, 
        y: 0,
        factions: ['test'] 
      });
      const npcFar = new NPC({ 
        id: 'far', 
        x: INTERACTION_DISTANCE + 0.1, 
        y: 0,
        factions: ['test'] 
      });
      
      expect(canInteract(player, npcClose)).toBe(true);
      expect(canInteract(player, npcFar)).toBe(false);
    });
    
    it('should use perception constants in NPC', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Test minimum perception clamping
      const npcLow = new NPC({
        id: 'low',
        perception: -1,
        factions: ['test']
      });
      expect(npcLow.perception).toBe(MIN_PERCEPTION_VALUE);
      
      // Test maximum perception clamping
      const npcHigh = new NPC({
        id: 'high',
        perception: 10,
        factions: ['test']
      });
      expect(npcHigh.perception).toBe(MAX_PERCEPTION_VALUE);
      
      consoleSpy.mockRestore();
    });
    
    it('should use default HP constants', () => {
      const npc = new NPC({
        id: 'test',
        factions: ['test']
      });
      
      expect(npc.hp).toBe(DEFAULT_NPC_HP);
      expect(npc.hpMax).toBe(DEFAULT_NPC_HP);
    });
  });
  
  describe('SocialEncounterSystem Error Handling', () => {
    it('should handle missing player gracefully', () => {
      const system = new SocialEncounterSystem(eventBus);
      const errorSpy = vi.fn();
      
      eventBus.on('ui:error', errorSpy);
      
      // Should not throw
      expect(() => {
        system.handleEncounter(null, new NPC({ id: 'test', factions: ['test'] }), {});
      }).not.toThrow();
    });
    
    it('should handle registry errors with fallback', () => {
      const system = new SocialEncounterSystem(eventBus);
      const menuSpy = vi.fn();
      
      eventBus.on('social:menu:open', menuSpy);
      
      // Mock registry to throw error
      system.registry = {
        getAvailable: () => { throw new Error('Registry error'); }
      };
      
      const player = { name: 'Finn', factions: ['player'] };
      const npc = new NPC({ id: 'test', name: 'Test NPC', factions: ['test'] });
      
      system.handleEncounter(player, npc, {});
      
      // Should emit menu with fallback actions
      expect(menuSpy).toHaveBeenCalled();
      const callArgs = menuSpy.mock.calls[0][0];
      expect(callArgs.actions).toEqual([{ id: 'talk', label: 'Talk', enabled: true }]);
    });
    
    it('should register recovery strategies', () => {
      const system = new SocialEncounterSystem(eventBus);
      
      // Check that recovery strategies are registered
      expect(system.errorHandler.recoveryStrategies.has(ErrorCode.ENCOUNTER_REGISTRY_ERROR)).toBe(true);
      expect(system.errorHandler.recoveryStrategies.has(ErrorCode.ENCOUNTER_INVALID)).toBe(true);
    });
  });
  
  describe('Error Statistics', () => {
    it('should track top errors', () => {
      // Generate various errors
      for (let i = 0; i < 5; i++) {
        errorHandler.logError(ErrorCode.NPC_NOT_FOUND, 'Not found');
      }
      for (let i = 0; i < 3; i++) {
        errorHandler.logError(ErrorCode.ENCOUNTER_INVALID, 'Invalid');
      }
      errorHandler.logError(ErrorCode.NPC_CONVERSION_FAILED, 'Failed');
      
      const stats = errorHandler.getStatistics();
      
      expect(stats.topErrors[0]).toEqual({
        code: ErrorCode.NPC_NOT_FOUND,
        count: 5
      });
      expect(stats.topErrors[1]).toEqual({
        code: ErrorCode.ENCOUNTER_INVALID,
        count: 3
      });
    });
    
    it('should provide user-friendly messages', () => {
      const uiErrorSpy = vi.fn();
      eventBus.on('ui:error', uiErrorSpy);
      
      errorHandler.logError(ErrorCode.SPATIAL_INDEX_CORRUPTION, 'Index corrupted');
      
      expect(uiErrorSpy).toHaveBeenCalled();
      const callArgs = uiErrorSpy.mock.calls[0][0];
      expect(callArgs.message).toBe("Having trouble tracking characters. Reloading may help.");
    });
  });
});