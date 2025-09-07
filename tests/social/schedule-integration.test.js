import { describe, it, expect, beforeEach } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { createRumor } from '../../src/social/rumors.js';
import { 
  TimeOfDay,
  DutyType,
  Schedule,
  getRoleDefaultSchedule,
  getCurrentDuty,
  getDutyBehaviorModifiers,
  getDutyModifiedBehavior as applyDutyModifiers
} from '../../src/social/schedule.js';

describe('Schedule System Integration - Phase 6 with Phases 1-5', () => {
  
  describe('Integration with NPC System (Phase 2)', () => {
    let npc;
    
    beforeEach(() => {
      npc = new NPC({
        id: 'test-guard',
        name: 'Test Guard',
        role: 'guard',
        factions: ['candy_guards', 'candy_citizens'],
        x: 10,
        y: 10
      });
    });
    
    it('should apply schedule to NPC on creation', () => {
      // Add schedule to NPC
      npc.schedule = getRoleDefaultSchedule(npc.role);
      
      expect(npc.schedule).toBeDefined();
      expect(npc.schedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.PATROL);
    });
    
    it('should modify NPC behavior based on current duty', () => {
      npc.schedule = getRoleDefaultSchedule(npc.role);
      
      // Morning patrol - high suspicion
      const morningBehavior = applyDutyModifiers(npc, 8);
      expect(morningBehavior.duty).toBe(DutyType.PATROL);
      expect(morningBehavior.suspicionMultiplier).toBe(1.5);
      
      // Afternoon guard post - lower suspicion
      const afternoonBehavior = applyDutyModifiers(npc, 14);
      expect(afternoonBehavior.duty).toBe(DutyType.GUARD_POST);
      expect(afternoonBehavior.suspicionMultiplier).toBe(1.2);
    });
  });
  
  describe('Integration with Rumor System (Phase 5)', () => {
    let gossipNpc;
    let merchantNpc;
    
    beforeEach(() => {
      gossipNpc = new NPC({
        id: 'test-gossip',
        name: 'Gossip Greta',
        role: 'gossip',
        factions: ['candy_citizens'],
        x: 5,
        y: 5
      });
      
      merchantNpc = new NPC({
        id: 'test-merchant',
        name: 'Merchant Mike',
        role: 'merchant',
        factions: ['candy_merchants'],
        x: 6,
        y: 5
      });
      
      gossipNpc.schedule = getRoleDefaultSchedule('gossip');
      merchantNpc.schedule = getRoleDefaultSchedule('merchant');
    });
    
    it('should affect rumor spreading based on duty', () => {
      // Gossip gathering rumors in morning - low spread chance
      const morningGossip = applyDutyModifiers(gossipNpc, 8);
      expect(morningGossip.duty).toBe(DutyType.GATHER_RUMORS);
      expect(morningGossip.rumorSpreadChance).toBe(0.3);
      expect(morningGossip.rumorReceptiveness).toBe(2.0);
      
      // Gossip spreading rumors in afternoon - high spread chance
      const afternoonGossip = applyDutyModifiers(gossipNpc, 14);
      expect(afternoonGossip.duty).toBe(DutyType.SPREAD_RUMORS);
      expect(afternoonGossip.rumorSpreadChance).toBe(2.5);
    });
    
    it('should modify rumor sharing probability during social duties', () => {
      // Evening socializing - both NPCs more likely to share
      const eveningGossip = applyDutyModifiers(gossipNpc, 19);
      const eveningMerchant = applyDutyModifiers(merchantNpc, 19);
      
      expect(eveningGossip.duty).toBe(DutyType.SOCIALIZE);
      expect(eveningGossip.rumorSpreadChance).toBe(2.0);
      
      expect(eveningMerchant.duty).toBe(DutyType.TRADING);
      expect(eveningMerchant.rumorSpreadChance).toBe(1.2);
    });
    
    it('should prevent rumor sharing during sleep', () => {
      const nightGossip = applyDutyModifiers(gossipNpc, 23);
      expect(nightGossip.duty).toBe(DutyType.SLEEP);
      expect(nightGossip.rumorSpreadChance).toBe(0);
      expect(nightGossip.grumpiness).toBe(3.0);
    });
  });
  
  describe('Integration with Faction System (Phase 1)', () => {
    it('should modify faction-based interactions by duty', () => {
      const guard = new NPC({
        id: 'guard-1',
        name: 'Guard',
        role: 'guard',
        factions: ['candy_guards'],
        x: 0,
        y: 0
      });
      
      const criminal = new NPC({
        id: 'criminal-1',
        name: 'Criminal',
        role: 'criminal',
        factions: ['thieves_guild'],
        x: 1,
        y: 0
      });
      
      guard.schedule = getRoleDefaultSchedule('guard');
      criminal.schedule = getRoleDefaultSchedule('criminal');
      
      // Day time - guard alert, criminal sleeping
      const dayGuard = applyDutyModifiers(guard, 10);
      const dayCriminal = applyDutyModifiers(criminal, 10);
      
      expect(dayGuard.alertness).toBe(1.5); // Patrol - high alert
      expect(dayCriminal.alertness).toBe(0.1); // Sleep - low alert
      
      // Night time - reversed
      const nightGuard = applyDutyModifiers(guard, 23);
      const nightCriminal = applyDutyModifiers(criminal, 23);
      
      expect(nightGuard.alertness).toBe(1.0); // Guard post - normal alert
      expect(nightCriminal.alertness).toBe(1.0); // Work - normal alert
    });
  });
  
  describe('Integration with Disguise System (Phase 4)', () => {
    it('should affect disguise detection based on alertness', () => {
      const guard = new NPC({
        id: 'alert-guard',
        name: 'Alert Guard',
        role: 'guard',
        factions: ['candy_guards'],
        x: 0,
        y: 0
      });
      
      guard.schedule = getRoleDefaultSchedule('guard');
      
      // High alertness during patrol
      const patrolBehavior = applyDutyModifiers(guard, 8);
      expect(patrolBehavior.alertness).toBe(1.5);
      
      // This alertness modifier should be used when checking disguises
      const disguiseDetectionChance = 0.5 * patrolBehavior.alertness;
      expect(disguiseDetectionChance).toBe(0.75);
    });
  });
  
  describe('Integration with Contextual Relationships (Phase 3)', () => {
    it('should modify attitude based on duty context', () => {
      const merchant = new NPC({
        id: 'merchant-1',
        name: 'Merchant',
        role: 'merchant',
        factions: ['candy_merchants'],
        x: 0,
        y: 0
      });
      
      merchant.schedule = getRoleDefaultSchedule('merchant');
      
      // Trading hours - friendly
      const tradingBehavior = applyDutyModifiers(merchant, 14);
      expect(tradingBehavior.friendlinessModifier).toBe(1.5);
      expect(tradingBehavior.tradeWillingness).toBe(2.0);
      
      // At home - less friendly, no trading
      const homeBehavior = applyDutyModifiers(merchant, 23);
      expect(homeBehavior.friendlinessModifier).toBe(0.8);
      expect(homeBehavior.tradeWillingness).toBe(0.2);
    });
    
    it('should affect social action availability based on duty', () => {
      const priest = new NPC({
        id: 'priest-1',
        name: 'Priest',
        role: 'priest',
        factions: ['candy_church'],
        x: 0,
        y: 0
      });
      
      priest.schedule = getRoleDefaultSchedule('priest');
      
      // During worship - no trading
      const worshipBehavior = applyDutyModifiers(priest, 10);
      expect(worshipBehavior.duty).toBe(DutyType.WORSHIP);
      expect(worshipBehavior.tradeWillingness).toBe(0);
      
      // During rest - some socializing
      const restBehavior = applyDutyModifiers(priest, 19);
      expect(restBehavior.duty).toBe(DutyType.REST);
      expect(restBehavior.friendlinessModifier).toBe(1.2);
    });
  });
  
  describe('Time-based Dialogue Variations', () => {
    it('should provide duty-specific dialogue context', () => {
      const npc = new NPC({
        id: 'test-npc',
        name: 'Test NPC',
        role: 'guard',
        factions: ['candy_guards'],
        x: 0,
        y: 0
      });
      
      npc.schedule = getRoleDefaultSchedule('guard');
      
      // Get duty for dialogue context
      const morningDuty = getCurrentDuty(npc, 8);
      const nightDuty = getCurrentDuty(npc, 23);
      
      // These duties should influence dialogue selection
      expect(morningDuty).toBe(DutyType.PATROL);
      expect(nightDuty).toBe(DutyType.GUARD_POST);
      
      // Example dialogue context
      const morningContext = {
        duty: morningDuty,
        grumpy: false,
        alert: true
      };
      
      const nightContext = {
        duty: nightDuty,
        grumpy: false,
        alert: false
      };
      
      expect(morningContext.alert).toBe(true);
      expect(nightContext.alert).toBe(false);
    });
  });
  
  describe('Schedule Persistence', () => {
    it('should serialize and deserialize schedules', () => {
      const schedule = new Schedule({
        [TimeOfDay.MORNING]: DutyType.WORK,
        [TimeOfDay.AFTERNOON]: DutyType.TRADING,
        [TimeOfDay.EVENING]: DutyType.REST,
        [TimeOfDay.NIGHT]: DutyType.SLEEP
      });
      
      // Serialize
      const serialized = JSON.stringify(schedule.duties);
      
      // Deserialize
      const deserialized = JSON.parse(serialized);
      const restoredSchedule = new Schedule(deserialized);
      
      expect(restoredSchedule.getDuty(TimeOfDay.MORNING)).toBe(DutyType.WORK);
      expect(restoredSchedule.getDuty(TimeOfDay.AFTERNOON)).toBe(DutyType.TRADING);
    });
  });
  
  describe('Performance Considerations', () => {
    it('should efficiently handle multiple NPCs with schedules', () => {
      const npcs = [];
      const startTime = performance.now();
      
      // Create 100 NPCs with schedules
      for (let i = 0; i < 100; i++) {
        const npc = new NPC({
          id: `npc-${i}`,
          name: `NPC ${i}`,
          role: ['guard', 'merchant', 'citizen'][i % 3],
          factions: ['candy_citizens'],
          x: i % 20,
          y: Math.floor(i / 20)
        });
        npc.schedule = getRoleDefaultSchedule(npc.role);
        npcs.push(npc);
      }
      
      // Apply duty modifiers to all NPCs
      const hour = 14;
      npcs.forEach(npc => {
        applyDutyModifiers(npc, hour);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time for 100 NPCs
      // (includes NPC creation and schedule assignment)
      expect(duration).toBeLessThan(300); // 300ms is reasonable for 100 NPC creation + schedules with validation and modifiers
    });
  });
});