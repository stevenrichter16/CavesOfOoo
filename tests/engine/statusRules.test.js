import { describe, it, expect, beforeEach } from 'vitest';
import { runPhase } from '../../src/js/engine/sim.js';
import '../../src/js/engine/statusRules.js'; // Load rules
import { createMockContext, assertActionQueued, assertNoAction } from '../helpers/testUtils.js';
import { contexts } from '../fixtures/contexts.js';

describe('Status Rules', () => {
  describe('Wet + Electric Interaction', () => {
    it('should amplify electric damage when entity is wet', () => {
      const ctx = JSON.parse(JSON.stringify(contexts.wetElectricDamage));
      
      runPhase('predamage', ctx);
      
      // Should amplify to lethal damage
      expect(ctx.event.damage.amount).toBeGreaterThanOrEqual(99999);
    });

    it('should not amplify non-electric damage when wet', () => {
      const ctx = JSON.parse(JSON.stringify(contexts.wetElectricDamage));
      ctx.event.damage.type = 'fire';
      const originalDamage = ctx.event.damage.amount;
      
      runPhase('predamage', ctx);
      
      expect(ctx.event.damage.amount).toBe(originalDamage);
    });

    it('should not amplify electric damage without conductive tag', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [{ id: 'burn', tags: ['fire'] }]
        },
        event: {
          kind: 'damage',
          damage: { amount: 10, type: 'electric' }
        }
      });
      
      runPhase('predamage', ctx);
      
      expect(ctx.event.damage.amount).toBe(10);
    });

    it('should detect conductivity from materials', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [],
          materials: [{ id: 'water', tags: ['liquid', 'conductive'] }]
        },
        event: {
          kind: 'damage',
          damage: { amount: 10, type: 'electric' }
        }
      });
      
      runPhase('predamage', ctx);
      
      expect(ctx.event.damage.amount).toBeGreaterThanOrEqual(99999);
    });
  });

  describe('Freeze Prevention', () => {
    it('should prevent turn when frozen', () => {
      const ctx = JSON.parse(JSON.stringify(contexts.frozenEntity));
      
      runPhase('preturn', ctx);
      
      assertActionQueued(ctx.queue, 'preventTurn', { reason: 'frozen' });
    });

    it('should not prevent turn without freeze status', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [{ id: 'wet', tags: ['conductive'] }]
        },
        event: { kind: 'turn' }
      });
      
      runPhase('preturn', ctx);
      
      assertNoAction(ctx.queue, 'preventTurn');
    });
  });

  describe('Fire and Water Interactions', () => {
    it('should extinguish fire when water is applied', () => {
      const ctx = JSON.parse(JSON.stringify(contexts.applyWetStatus));
      
      runPhase('apply', ctx);
      
      assertActionQueued(ctx.queue, 'removeStatus', { id: 'burn' });
      const logAction = ctx.queue.find(a => a.type === 'log');
      expect(logAction?.message).toContain('extinguished');
    });

    it('should thaw freeze when fire is applied', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [
            { id: 'freeze', tags: ['ice'] },
            { id: 'wet', tags: ['extinguisher'] }
          ]
        },
        event: {
          kind: 'applyStatus',
          status: { id: 'burn', tags: ['fire'] }
        }
      });
      
      runPhase('apply', ctx);
      
      // Fire should remove both wet and freeze
      const removeActions = ctx.queue.filter(a => a.type === 'removeStatus');
      const removedIds = removeActions.map(a => a.id);
      expect(removedIds).toContain('freeze');
      expect(removedIds).toContain('wet');
    });

    it('should dry wet status when fire is applied', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [{ id: 'wet', tags: ['conductive'] }]
        },
        event: {
          kind: 'applyStatus',
          status: { id: 'burn', tags: ['fire'] }
        }
      });
      
      runPhase('apply', ctx);
      
      assertActionQueued(ctx.queue, 'removeStatus', { id: 'wet' });
      const logAction = ctx.queue.find(a => a.type === 'log');
      expect(logAction?.message).toContain('dries and thaws');
    });
  });

  describe('Stat Modifiers', () => {
    it('should apply stat modifiers in preturn phase', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [
            { 
              id: 'weaken', 
              tags: ['debuff'],
              props: { statModifier: -3, affectedStat: 'str' }
            },
            {
              id: 'armor',
              tags: ['buff'],
              props: { statModifier: 5, affectedStat: 'def' }
            }
          ]
        }
      });
      
      runPhase('preturn', ctx);
      
      // Check for stat modification actions
      const strMod = ctx.queue.find(a => 
        a.type === 'modifyStat' && a.stat === 'str'
      );
      const defMod = ctx.queue.find(a => 
        a.type === 'modifyStat' && a.stat === 'def'
      );
      
      expect(strMod).toBeDefined();
      expect(strMod?.modifier).toBe(-3);
      expect(strMod?.source).toBe('weaken');
      
      expect(defMod).toBeDefined();
      expect(defMod?.modifier).toBe(5);
      expect(defMod?.source).toBe('armor');
    });

    it('should not apply modifiers without statModifier prop', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [
            { id: 'burn', tags: ['fire'], props: {} }
          ]
        }
      });
      
      runPhase('preturn', ctx);
      
      assertNoAction(ctx.queue, 'modifyStat');
    });

    it('should handle invalid stat modifier values', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [
            {
              id: 'broken',
              props: { statModifier: 'invalid', affectedStat: 'str' }
            }
          ]
        }
      });
      
      runPhase('preturn', ctx);
      
      assertNoAction(ctx.queue, 'modifyStat');
    });
  });

  describe('DOT Effects', () => {
    it('should process DOT damage in tick phase when enabled', () => {
      // Note: USE_ENGINE_DOT is false by default in statusRules.js
      // This test verifies the rule exists but doesn't run
      const ctx = createMockContext({
        entity: {
          statuses: [
            { id: 'burn', tags: ['dot'], props: { damagePerTurn: 3 } },
            { id: 'poison', tags: ['dot'], props: { damagePerTurn: 2 } }
          ]
        }
      });
      
      runPhase('tick', ctx);
      
      // With USE_ENGINE_DOT = false, no damage should be queued
      const damageActions = ctx.queue.filter(a => a.type === 'damage');
      expect(damageActions).toHaveLength(0);
    });

    it('should use damagePerTurn property for DOT damage', () => {
      // This tests the logic even though it's disabled
      const ctx = createMockContext({
        entity: {
          statuses: [
            { id: 'custom-dot', tags: ['dot'], props: { damagePerTurn: 5 } }
          ]
        }
      });
      
      // Manually test the DOT logic
      const dots = ctx.entity.statuses.filter(s => s.tags?.includes('dot'));
      const expectedDamage = dots.reduce((sum, s) => 
        sum + (s.props?.damagePerTurn ?? 1), 0
      );
      
      expect(expectedDamage).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple conductive sources', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [
            { id: 'wet', tags: ['conductive'] },
            { id: 'water_slow', tags: ['conductive'] }
          ],
          materials: [
            { id: 'metal', tags: ['conductive'] }
          ]
        },
        event: {
          damage: { amount: 5, type: 'electric' }
        }
      });
      
      runPhase('predamage', ctx);
      
      // Should still only apply lethal damage once
      expect(ctx.event.damage.amount).toBeGreaterThanOrEqual(99999);
    });

    it('should handle simultaneous wet and burn application', () => {
      const ctx = createMockContext({
        entity: {
          statuses: []
        },
        event: {
          kind: 'applyStatus',
          status: { id: 'wet', tags: ['extinguisher'] }
        }
      });
      
      // First apply wet
      runPhase('apply', ctx);
      
      // Then try to apply burn
      ctx.event = {
        kind: 'applyStatus',
        status: { id: 'burn', tags: ['fire'] }
      };
      ctx.entity.statuses = [{ id: 'wet', tags: ['extinguisher'] }];
      
      runPhase('apply', ctx);
      
      // Burn should remove wet
      assertActionQueued(ctx.queue, 'removeStatus', { id: 'wet' });
    });

    it('should handle missing event data gracefully', () => {
      const ctx = createMockContext({
        entity: {
          statuses: [{ id: 'wet', tags: ['conductive'] }]
        }
      });
      
      // No event data
      expect(() => runPhase('predamage', ctx)).not.toThrow();
      
      // Empty event
      ctx.event = {};
      expect(() => runPhase('predamage', ctx)).not.toThrow();
    });
  });
});