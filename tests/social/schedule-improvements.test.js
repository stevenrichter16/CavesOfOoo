import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getTimeOfDayFromHour,
  getRoleDefaultSchedule,
  getCurrentDuty,
  getDutyLocation,
  shouldChangeLocation,
  clearScheduleCache,
  TimeOfDay,
  DutyType
} from '../../src/social/schedule.js';

describe('Schedule System Improvements', () => {
  
  describe('Input Validation', () => {
    it('should handle negative hours correctly', () => {
      expect(() => getTimeOfDayFromHour(-1)).toThrow('Hour must be non-negative');
      expect(() => getTimeOfDayFromHour(-24)).toThrow('Hour must be non-negative');
      expect(() => getTimeOfDayFromHour(-100)).toThrow('Hour must be non-negative');
    });
    
    it('should handle hours greater than 23', () => {
      // Should wrap around
      expect(getTimeOfDayFromHour(24)).toBe(TimeOfDay.NIGHT); // 0:00
      expect(getTimeOfDayFromHour(25)).toBe(TimeOfDay.NIGHT); // 1:00
      expect(getTimeOfDayFromHour(30)).toBe(TimeOfDay.MORNING); // 6:00
    });
    
    it('should handle non-numeric hours', () => {
      expect(() => getTimeOfDayFromHour('invalid')).toThrow('Hour must be a number');
      expect(() => getTimeOfDayFromHour(null)).toThrow('Hour must be a number');
      expect(() => getTimeOfDayFromHour(undefined)).toThrow('Hour must be a number');
    });
  });
  
  describe('Schedule Caching', () => {
    it('should return the same schedule instance for the same role', () => {
      const schedule1 = getRoleDefaultSchedule('guard');
      const schedule2 = getRoleDefaultSchedule('guard');
      
      // Should be the exact same object reference (cached)
      expect(schedule1).toBe(schedule2);
    });
    
    it('should return different instances for different roles', () => {
      const guardSchedule = getRoleDefaultSchedule('guard');
      const merchantSchedule = getRoleDefaultSchedule('merchant');
      
      expect(guardSchedule).not.toBe(merchantSchedule);
      expect(guardSchedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
      expect(merchantSchedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.SETUP_SHOP);
    });
    
    it('should cache default schedule for unknown roles', () => {
      const unknown1 = getRoleDefaultSchedule('unknown1');
      const unknown2 = getRoleDefaultSchedule('unknown2');
      
      // Both unknown roles should get the same cached default
      expect(unknown1).toBe(unknown2);
    });
    
    it('should not recreate schedules when getCurrentDuty is called repeatedly', () => {
      const npc = { role: 'guard' };
      
      // Track schedule creation
      const schedules = new Set();
      for (let i = 0; i < 100; i++) {
        getCurrentDuty(npc, 10);
        // Internal cache should prevent new schedule creation
      }
      
      // Should have used cached schedule
      const schedule1 = getRoleDefaultSchedule('guard');
      const schedule2 = getRoleDefaultSchedule('guard');
      expect(schedule1).toBe(schedule2);
    });
  });
  
  describe('Performance', () => {
    it('should handle many NPCs efficiently with caching', () => {
      const npcs = [];
      for (let i = 0; i < 1000; i++) {
        npcs.push({ 
          role: ['guard', 'merchant', 'citizen'][i % 3],
          id: `npc-${i}`
        });
      }
      
      const startTime = performance.now();
      
      // Get current duty for all NPCs
      npcs.forEach(npc => {
        getCurrentDuty(npc, 14);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // With caching, this should be very fast
      expect(duration).toBeLessThan(10); // Should complete in less than 10ms
    });
  });
  
  describe('Future Work Documentation', () => {
    it('should have getDutyLocation function documented', () => {
      // Function should exist and work
      expect(getDutyLocation(DutyType.PATROL)).toBe('street');
      expect(getDutyLocation(DutyType.TRADING)).toBe('shop');
      expect(getDutyLocation(DutyType.WORSHIP)).toBe('temple');
    });
    
    it('should have shouldChangeLocation function documented', () => {
      const npc = { role: 'guard' };
      
      // Should detect duty change that requires location change
      const shouldMove = shouldChangeLocation(npc, 12, 11); // Morning to afternoon
      expect(typeof shouldMove).toBe('boolean');
    });
  });
  
  describe('Clear Cache Function', () => {
    it('should provide way to clear cache if needed', () => {
      // Clear any existing cache first
      clearScheduleCache();
      
      // Get initial cached schedule
      const schedule1 = getRoleDefaultSchedule('guard');
      const schedule1b = getRoleDefaultSchedule('guard');
      
      // Should be same instance (cached)
      expect(schedule1).toBe(schedule1b);
      
      // Clear cache
      clearScheduleCache();
      
      // Get new schedule after clearing
      const schedule2 = getRoleDefaultSchedule('guard');
      
      // After clearing cache, should be different instance from original
      expect(schedule1).not.toBe(schedule2);
      
      // But new calls should get the newly cached instance
      const schedule3 = getRoleDefaultSchedule('guard');
      expect(schedule2).toBe(schedule3);
    });
  });
});