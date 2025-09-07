import { describe, it, expect, beforeEach } from 'vitest';
import { 
  Schedule,
  getRoleDefaultSchedule,
  getTimeOfDayFromHour,
  TimeOfDay,
  DutyType,
  clearScheduleCache
} from '../../src/social/schedule.js';

describe('Schedule System Logic Fixes', () => {
  
  beforeEach(() => {
    clearScheduleCache();
  });
  
  describe('Fixed: Immutable Schedules', () => {
    it('prevents mutation of cached schedules', () => {
      const schedule1 = getRoleDefaultSchedule('guard');
      const originalDuty = schedule1.getDuty(TimeOfDay.MORNING);
      expect(originalDuty).toBe(DutyType.PATROL);
      
      // Try to mutate - should throw error
      expect(() => {
        schedule1.setDuty(TimeOfDay.MORNING, DutyType.SLEEP);
      }).toThrow('Schedules are immutable');
      
      // Verify schedule wasn't changed
      expect(schedule1.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
      
      // Get another reference - should be unchanged
      const schedule2 = getRoleDefaultSchedule('guard');
      expect(schedule2.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
    });
    
    it('provides withDuty() for creating modified schedules', () => {
      const original = getRoleDefaultSchedule('guard');
      expect(original.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
      
      // Create modified version
      const modified = original.withDuty(TimeOfDay.MORNING, DutyType.REST);
      
      // Original unchanged
      expect(original.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
      
      // Modified has new duty
      expect(modified.getDuty(TimeOfDay.MORNING)).toBe(DutyType.REST);
      
      // Other duties unchanged
      expect(modified.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.GUARD_POST);
    });
    
    it('duties object is frozen and cannot be modified', () => {
      const schedule = getRoleDefaultSchedule('guard');
      
      // Verify duties object is frozen
      expect(Object.isFrozen(schedule.duties)).toBe(true);
      
      // Try to modify duties directly - should throw in strict mode
      expect(() => {
        'use strict';
        schedule.duties.morning = DutyType.SLEEP;
      }).toThrow();
      
      // Duty should be unchanged
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
    });
  });
  
  describe('Fixed: Input Validation', () => {
    it('rejects floating point hours', () => {
      expect(() => {
        getTimeOfDayFromHour(11.5);
      }).toThrow('Hour must be an integer');
    });
    
    it('rejects negative hours with clear message', () => {
      expect(() => {
        getTimeOfDayFromHour(-1);
      }).toThrow('Hour must be non-negative');
    });
    
    it('validates duty types in withDuty()', () => {
      const schedule = getRoleDefaultSchedule('guard');
      
      expect(() => {
        schedule.withDuty(TimeOfDay.MORNING, 'invalid_duty');
      }).toThrow('Invalid duty type: invalid_duty');
    });
    
    it('validates time periods in withDuty()', () => {
      const schedule = getRoleDefaultSchedule('guard');
      
      expect(() => {
        schedule.withDuty('invalid_period', DutyType.WORK);
      }).toThrow('Invalid time period: invalid_period');
    });
  });
  
  describe('Fixed: Constructor Validation', () => {
    it('rejects schedules with extra periods', () => {
      expect(() => {
        new Schedule({
          morning: DutyType.WORK,
          afternoon: DutyType.WORK,
          evening: DutyType.REST,
          night: DutyType.SLEEP,
          midnight: DutyType.PATROL // Invalid period!
        });
      }).toThrow('Invalid time period: midnight');
    });
    
    it('rejects schedules with missing periods', () => {
      expect(() => {
        new Schedule({
          morning: DutyType.WORK,
          afternoon: DutyType.WORK,
          evening: DutyType.REST
          // Missing night!
        });
      }).toThrow('Schedule must define duties for all time periods');
    });
  });
  
  describe('Helper Methods', () => {
    it('provides getAllDuties() for safe access', () => {
      const schedule = getRoleDefaultSchedule('guard');
      const duties = schedule.getAllDuties();
      
      // Should be a copy
      duties.morning = DutyType.SLEEP;
      
      // Original unchanged
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
    });
  });
});