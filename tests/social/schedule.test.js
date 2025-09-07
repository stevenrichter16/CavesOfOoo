import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TimeOfDay,
  DutyType,
  Schedule,
  getRoleDefaultSchedule,
  getCurrentDuty,
  getDutyBehaviorModifiers,
  getTimeOfDayFromHour
} from '../../src/social/schedule.js';

describe('Schedule System - Phase 6', () => {
  describe('TimeOfDay Constants', () => {
    it('should define all time periods', () => {
      expect(TimeOfDay.MORNING).toBe('morning');
      expect(TimeOfDay.AFTERNOON).toBe('afternoon');
      expect(TimeOfDay.EVENING).toBe('evening');
      expect(TimeOfDay.NIGHT).toBe('night');
    });
  });

  describe('DutyType Constants', () => {
    it('should define all duty types', () => {
      expect(DutyType.PATROL).toBe('patrol');
      expect(DutyType.GUARD_POST).toBe('guard_post');
      expect(DutyType.TRADING).toBe('trading');
      expect(DutyType.SETUP_SHOP).toBe('setup_shop');
      expect(DutyType.REST).toBe('rest');
      expect(DutyType.SOCIALIZE).toBe('socialize');
      expect(DutyType.WORSHIP).toBe('worship');
      expect(DutyType.GATHER_RUMORS).toBe('gather_rumors');
      expect(DutyType.SPREAD_RUMORS).toBe('spread_rumors');
      expect(DutyType.HOME).toBe('home');
      expect(DutyType.SLEEP).toBe('sleep');
      expect(DutyType.EAT).toBe('eat');
      expect(DutyType.WORK).toBe('work');
    });
  });

  describe('getTimeOfDayFromHour', () => {
    it('should return correct time period for hour', () => {
      expect(getTimeOfDayFromHour(6)).toBe(TimeOfDay.MORNING);
      expect(getTimeOfDayFromHour(9)).toBe(TimeOfDay.MORNING);
      expect(getTimeOfDayFromHour(12)).toBe(TimeOfDay.AFTERNOON);
      expect(getTimeOfDayFromHour(15)).toBe(TimeOfDay.AFTERNOON);
      expect(getTimeOfDayFromHour(18)).toBe(TimeOfDay.EVENING);
      expect(getTimeOfDayFromHour(20)).toBe(TimeOfDay.EVENING);
      expect(getTimeOfDayFromHour(22)).toBe(TimeOfDay.NIGHT);
      expect(getTimeOfDayFromHour(3)).toBe(TimeOfDay.NIGHT);
    });

    it('should handle 24-hour wraparound', () => {
      expect(getTimeOfDayFromHour(0)).toBe(TimeOfDay.NIGHT);
      expect(getTimeOfDayFromHour(24)).toBe(TimeOfDay.NIGHT);
      expect(getTimeOfDayFromHour(25)).toBe(TimeOfDay.NIGHT); // 1 AM
    });
  });

  describe('Schedule Class', () => {
    let schedule;

    beforeEach(() => {
      schedule = new Schedule({
        [TimeOfDay.MORNING]: DutyType.PATROL,
        [TimeOfDay.AFTERNOON]: DutyType.GUARD_POST,
        [TimeOfDay.EVENING]: DutyType.PATROL,
        [TimeOfDay.NIGHT]: DutyType.REST
      });
    });

    it('should create schedule with duties for each time period', () => {
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.GUARD_POST);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.PATROL);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.REST);
    });

    it('should get current duty based on hour', () => {
      expect(schedule.getCurrentDuty(7)).toBe(DutyType.PATROL);
      expect(schedule.getCurrentDuty(14)).toBe(DutyType.GUARD_POST);
      expect(schedule.getCurrentDuty(19)).toBe(DutyType.PATROL);
      expect(schedule.getCurrentDuty(23)).toBe(DutyType.REST);
    });

    it('should create new schedule with modified duty', () => {
      const modified = schedule.withDuty(TimeOfDay.MORNING, DutyType.TRADING);
      expect(modified.getDuty(TimeOfDay.MORNING)).toBe(DutyType.TRADING);
      // Original unchanged
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
    });

    it('should validate schedule has all time periods', () => {
      expect(() => {
        new Schedule({
          [TimeOfDay.MORNING]: DutyType.PATROL
          // Missing other periods
        });
      }).toThrow('Schedule must define duties for all time periods');
    });
  });

  describe('Role-Based Default Schedules', () => {
    it('should provide guard schedule', () => {
      const schedule = getRoleDefaultSchedule('guard');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.GUARD_POST);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.PATROL);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.GUARD_POST);
    });

    it('should provide merchant schedule', () => {
      const schedule = getRoleDefaultSchedule('merchant');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.SETUP_SHOP);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.TRADING);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.TRADING);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.HOME);
    });

    it('should provide citizen schedule', () => {
      const schedule = getRoleDefaultSchedule('citizen');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.WORK);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.WORK);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.SOCIALIZE);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.SLEEP);
    });

    it('should provide gossip schedule', () => {
      const schedule = getRoleDefaultSchedule('gossip');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.GATHER_RUMORS);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.SPREAD_RUMORS);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.SOCIALIZE);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.SLEEP);
    });

    it('should provide priest schedule', () => {
      const schedule = getRoleDefaultSchedule('priest');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.WORSHIP);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.WORSHIP);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.REST);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.SLEEP);
    });

    it('should provide noble schedule', () => {
      const schedule = getRoleDefaultSchedule('noble');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.REST);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.SOCIALIZE);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.SOCIALIZE);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.REST);
    });

    it('should provide criminal schedule', () => {
      const schedule = getRoleDefaultSchedule('criminal');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.SLEEP);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.REST);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.WORK);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.WORK);
    });

    it('should provide spy schedule', () => {
      const schedule = getRoleDefaultSchedule('spy');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.GATHER_RUMORS);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.WORK);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.GATHER_RUMORS);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.WORK);
    });

    it('should provide default schedule for unknown roles', () => {
      const schedule = getRoleDefaultSchedule('unknown');
      expect(schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.WORK);
      expect(schedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.WORK);
      expect(schedule.getDuty(TimeOfDay.EVENING)).toBe(DutyType.REST);
      expect(schedule.getDuty(TimeOfDay.NIGHT)).toBe(DutyType.SLEEP);
    });
  });

  describe('Duty-Based Behavior Modifiers', () => {
    it('should provide modifiers for patrol duty', () => {
      const modifiers = getDutyBehaviorModifiers(DutyType.PATROL);
      expect(modifiers.suspicion).toBe(1.5);
      expect(modifiers.alertness).toBe(1.5);
      expect(modifiers.friendliness).toBe(0.8);
      expect(modifiers.tradeWillingness).toBe(0);
      expect(modifiers.rumorSpreading).toBe(0.5);
    });

    it('should provide modifiers for guard post duty', () => {
      const modifiers = getDutyBehaviorModifiers(DutyType.GUARD_POST);
      expect(modifiers.suspicion).toBe(1.2);
      expect(modifiers.alertness).toBe(1.0);
      expect(modifiers.friendliness).toBe(0.9);
      expect(modifiers.tradeWillingness).toBe(0);
      expect(modifiers.rumorSpreading).toBe(0.3);
    });

    it('should provide modifiers for trading duty', () => {
      const modifiers = getDutyBehaviorModifiers(DutyType.TRADING);
      expect(modifiers.suspicion).toBe(0.8);
      expect(modifiers.alertness).toBe(1.0);
      expect(modifiers.friendliness).toBe(1.5);
      expect(modifiers.tradeWillingness).toBe(2.0);
      expect(modifiers.rumorSpreading).toBe(1.2);
    });

    it('should provide modifiers for socializing', () => {
      const modifiers = getDutyBehaviorModifiers(DutyType.SOCIALIZE);
      expect(modifiers.suspicion).toBe(0.5);
      expect(modifiers.alertness).toBe(0.8);
      expect(modifiers.friendliness).toBe(1.8);
      expect(modifiers.tradeWillingness).toBe(0.5);
      expect(modifiers.rumorSpreading).toBe(2.0);
    });

    it('should provide modifiers for sleeping', () => {
      const modifiers = getDutyBehaviorModifiers(DutyType.SLEEP);
      expect(modifiers.suspicion).toBe(0.1);
      expect(modifiers.alertness).toBe(0.1);
      expect(modifiers.friendliness).toBe(0.1);
      expect(modifiers.tradeWillingness).toBe(0);
      expect(modifiers.rumorSpreading).toBe(0);
      expect(modifiers.grumpiness).toBe(3.0); // Very grumpy if woken!
    });

    it('should provide modifiers for gathering rumors', () => {
      const modifiers = getDutyBehaviorModifiers(DutyType.GATHER_RUMORS);
      expect(modifiers.suspicion).toBe(0.7);
      expect(modifiers.alertness).toBe(1.5);
      expect(modifiers.friendliness).toBe(1.3);
      expect(modifiers.tradeWillingness).toBe(0.3);
      expect(modifiers.rumorSpreading).toBe(0.3); // Gathering, not spreading
      expect(modifiers.rumorReceptiveness).toBe(2.0);
    });

    it('should provide default modifiers for unknown duty', () => {
      const modifiers = getDutyBehaviorModifiers('unknown');
      expect(modifiers.suspicion).toBe(1.0);
      expect(modifiers.alertness).toBe(1.0);
      expect(modifiers.friendliness).toBe(1.0);
      expect(modifiers.tradeWillingness).toBe(1.0);
      expect(modifiers.rumorSpreading).toBe(1.0);
    });
  });

  describe('getCurrentDuty Helper', () => {
    it('should get current duty for NPC with schedule', () => {
      const npc = {
        schedule: new Schedule({
          [TimeOfDay.MORNING]: DutyType.PATROL,
          [TimeOfDay.AFTERNOON]: DutyType.GUARD_POST,
          [TimeOfDay.EVENING]: DutyType.PATROL,
          [TimeOfDay.NIGHT]: DutyType.REST
        })
      };

      expect(getCurrentDuty(npc, 8)).toBe(DutyType.PATROL);
      expect(getCurrentDuty(npc, 14)).toBe(DutyType.GUARD_POST);
    });

    it('should return default duty for NPC without schedule', () => {
      const npc = { role: 'guard' };
      expect(getCurrentDuty(npc, 8)).toBe(DutyType.PATROL);
    });

    it('should return WORK for NPC without schedule or role', () => {
      const npc = {};
      expect(getCurrentDuty(npc, 12)).toBe(DutyType.WORK);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should modify rumor spreading based on duty', () => {
      const npc = {
        role: 'gossip',
        schedule: getRoleDefaultSchedule('gossip')
      };

      // During spread_rumors duty (afternoon)
      const afternoonDuty = getCurrentDuty(npc, 14);
      const afternoonModifiers = getDutyBehaviorModifiers(afternoonDuty);
      expect(afternoonModifiers.rumorSpreading).toBe(2.5);

      // During gather_rumors duty (morning)  
      const morningDuty = getCurrentDuty(npc, 8);
      const morningModifiers = getDutyBehaviorModifiers(morningDuty);
      expect(morningModifiers.rumorSpreading).toBe(0.3);
    });

    it('should affect hostility evaluation based on guard duty', () => {
      const guard = {
        role: 'guard',
        schedule: getRoleDefaultSchedule('guard')
      };

      // More suspicious during patrol
      const patrolDuty = getCurrentDuty(guard, 8);
      const patrolModifiers = getDutyBehaviorModifiers(patrolDuty);
      expect(patrolModifiers.suspicion).toBeGreaterThan(1.0);

      // Less suspicious at guard post
      const postDuty = getCurrentDuty(guard, 14);
      const postModifiers = getDutyBehaviorModifiers(postDuty);
      expect(postModifiers.suspicion).toBeLessThan(patrolModifiers.suspicion);
    });

    it('should affect trade willingness for merchants', () => {
      const merchant = {
        role: 'merchant',
        schedule: getRoleDefaultSchedule('merchant')
      };

      // High trade willingness during trading hours
      const tradingDuty = getCurrentDuty(merchant, 14);
      const tradingModifiers = getDutyBehaviorModifiers(tradingDuty);
      expect(tradingModifiers.tradeWillingness).toBe(2.0);

      // No trade willingness at home
      const homeDuty = getCurrentDuty(merchant, 23);
      const homeModifiers = getDutyBehaviorModifiers(homeDuty);
      expect(homeModifiers.tradeWillingness).toBeLessThan(1.0);
    });
  });
});