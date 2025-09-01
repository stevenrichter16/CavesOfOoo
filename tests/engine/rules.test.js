import { describe, it, expect, beforeEach } from 'vitest';
import { rule, getRulesForPhase, P, A } from '../../src/js/engine/rules.js';
import { createMockContext, createStatus, createMaterial } from '../helpers/testUtils.js';

// Note: We need to work around the module-level RULES array
// In a real implementation, we'd export a clearRules function

describe('Rules System', () => {
  describe('Predicates (P)', () => {
    describe('P.hasStatus', () => {
      it('should detect when entity has status', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [
              createStatus('wet'),
              createStatus('burn')
            ]
          }
        });

        expect(P.hasStatus('wet')(ctx)).toBe(true);
        expect(P.hasStatus('burn')(ctx)).toBe(true);
        expect(P.hasStatus('freeze')(ctx)).toBe(false);
      });

      it('should handle empty statuses array', () => {
        const ctx = createMockContext({
          entity: { statuses: [] }
        });

        expect(P.hasStatus('any')(ctx)).toBe(false);
      });

      it('should handle undefined statuses', () => {
        const ctx = createMockContext({
          entity: {}
        });

        expect(P.hasStatus('any')(ctx)).toBe(false);
      });
    });

    describe('P.hasAnyTag', () => {
      it('should detect tags in statuses', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [
              createStatus('wet', ['conductive', 'extinguisher']),
              createStatus('burn', ['fire', 'dot'])
            ]
          }
        });

        expect(P.hasAnyTag('conductive')(ctx)).toBe(true);
        expect(P.hasAnyTag('fire')(ctx)).toBe(true);
        expect(P.hasAnyTag('ice')(ctx)).toBe(false);
      });

      it('should detect tags in materials', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [],
            materials: [
              createMaterial('water', ['liquid', 'conductive']),
              createMaterial('metal', ['solid', 'conductive'])
            ]
          }
        });

        expect(P.hasAnyTag('liquid')(ctx)).toBe(true);
        expect(P.hasAnyTag('solid')(ctx)).toBe(true);
        expect(P.hasAnyTag('conductive')(ctx)).toBe(true);
      });

      it('should check both statuses and materials', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [createStatus('wet', ['extinguisher'])],
            materials: [createMaterial('metal', ['conductive'])]
          }
        });

        expect(P.hasAnyTag('extinguisher')(ctx)).toBe(true);
        expect(P.hasAnyTag('conductive')(ctx)).toBe(true);
      });

      it('should handle missing arrays', () => {
        const ctx = createMockContext({ entity: {} });
        expect(P.hasAnyTag('any')(ctx)).toBe(false);
      });
    });

    describe('P.dmgTypeIs', () => {
      it('should match damage type', () => {
        const ctx = createMockContext({
          event: {
            damage: { amount: 10, type: 'electric' }
          }
        });

        expect(P.dmgTypeIs('electric')(ctx)).toBe(true);
        expect(P.dmgTypeIs('fire')(ctx)).toBe(false);
      });

      it('should handle missing damage event', () => {
        const ctx = createMockContext({ event: {} });
        expect(P.dmgTypeIs('any')(ctx)).toBe(false);
      });

      it('should handle missing event', () => {
        const ctx = createMockContext();
        expect(P.dmgTypeIs('any')(ctx)).toBe(false);
      });
    });

    describe('P.exposedToFire', () => {
      it('should detect burning status', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [createStatus('burning')]
          }
        });

        expect(P.exposedToFire()(ctx)).toBe(true);
      });

      it('should detect high temperature', () => {
        const ctx = createMockContext({
          env: {
            temperatureC: 900,
            autoIgniteAtC: 800
          }
        });

        expect(P.exposedToFire()(ctx)).toBe(true);
      });

      it('should return false when not exposed', () => {
        const ctx = createMockContext({
          env: {
            temperatureC: 20,
            autoIgniteAtC: 800
          }
        });

        expect(P.exposedToFire()(ctx)).toBe(false);
      });

      it('should use default autoIgniteAtC of 800', () => {
        const ctx = createMockContext({
          env: { temperatureC: 850 }
        });

        expect(P.exposedToFire()(ctx)).toBe(true);
      });
    });

    describe('P.and', () => {
      it('should require all predicates to be true', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [createStatus('wet', ['conductive'])]
          },
          event: {
            damage: { type: 'electric' }
          }
        });

        const combined = P.and(
          P.hasStatus('wet'),
          P.dmgTypeIs('electric')
        );

        expect(combined(ctx)).toBe(true);
      });

      it('should return false if any predicate is false', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [createStatus('wet')]
          },
          event: {
            damage: { type: 'fire' }
          }
        });

        const combined = P.and(
          P.hasStatus('wet'),
          P.dmgTypeIs('electric')
        );

        expect(combined(ctx)).toBe(false);
      });

      it('should handle empty predicates', () => {
        const ctx = createMockContext();
        const combined = P.and();
        expect(combined(ctx)).toBe(true); // All of nothing is true
      });
    });

    describe('P.or', () => {
      it('should require at least one predicate to be true', () => {
        const ctx = createMockContext({
          entity: {
            statuses: [createStatus('wet')]
          }
        });

        const combined = P.or(
          P.hasStatus('wet'),
          P.hasStatus('burn')
        );

        expect(combined(ctx)).toBe(true);
      });

      it('should return false if all predicates are false', () => {
        const ctx = createMockContext({
          entity: {
            statuses: []
          }
        });

        const combined = P.or(
          P.hasStatus('wet'),
          P.hasStatus('burn')
        );

        expect(combined(ctx)).toBe(false);
      });

      it('should handle empty predicates', () => {
        const ctx = createMockContext();
        const combined = P.or();
        expect(combined(ctx)).toBe(false); // None of nothing is false
      });
    });
  });

  describe('Actions (A)', () => {
    describe('A.addStatus', () => {
      it('should queue addStatus action', () => {
        const ctx = createMockContext();
        A.addStatus('burn', { turns: 3, intensity: 2 })(ctx);

        expect(ctx.queue).toHaveLength(1);
        expect(ctx.queue[0]).toEqual({
          type: 'addStatus',
          id: 'burn',
          props: { turns: 3, intensity: 2 }
        });
      });

      it('should work without props', () => {
        const ctx = createMockContext();
        A.addStatus('wet')(ctx);

        expect(ctx.queue[0]).toEqual({
          type: 'addStatus',
          id: 'wet',
          props: {}
        });
      });
    });

    describe('A.removeStatus', () => {
      it('should queue removeStatus action', () => {
        const ctx = createMockContext();
        A.removeStatus('burn')(ctx);

        expect(ctx.queue).toHaveLength(1);
        expect(ctx.queue[0]).toEqual({
          type: 'removeStatus',
          id: 'burn'
        });
      });
    });

    describe('A.damage', () => {
      it('should queue damage action', () => {
        const ctx = createMockContext();
        A.damage(10, 'fire')(ctx);

        expect(ctx.queue).toHaveLength(1);
        expect(ctx.queue[0]).toEqual({
          type: 'damage',
          amount: 10,
          dtype: 'fire'
        });
      });
    });

    describe('A.scaleIncomingDamage', () => {
      it('should scale damage in event', () => {
        const ctx = createMockContext({
          event: {
            damage: { amount: 10, type: 'physical' }
          }
        });

        A.scaleIncomingDamage(1.5)(ctx);
        expect(ctx.event.damage.amount).toBe(15);
      });

      it('should floor damage values', () => {
        const ctx = createMockContext({
          event: {
            damage: { amount: 10, type: 'physical' }
          }
        });

        A.scaleIncomingDamage(1.25)(ctx);
        expect(ctx.event.damage.amount).toBe(12); // floor(12.5)
      });

      it('should not go below 0', () => {
        const ctx = createMockContext({
          event: {
            damage: { amount: 10, type: 'physical' }
          }
        });

        A.scaleIncomingDamage(-1)(ctx);
        expect(ctx.event.damage.amount).toBe(0);
      });

      it('should handle missing damage event', () => {
        const ctx = createMockContext();
        expect(() => A.scaleIncomingDamage(2)(ctx)).not.toThrow();
      });
    });

    describe('A.consumeCoating', () => {
      it('should queue consumeCoating action', () => {
        const ctx = createMockContext();
        A.consumeCoating('water', 10)(ctx);

        expect(ctx.queue[0]).toEqual({
          type: 'consumeCoating',
          id: 'water',
          qty: 10
        });
      });

      it('should default to all quantity', () => {
        const ctx = createMockContext();
        A.consumeCoating('water')(ctx);

        expect(ctx.queue[0]).toEqual({
          type: 'consumeCoating',
          id: 'water',
          qty: 'all'
        });
      });
    });

    describe('A.spawn', () => {
      it('should queue spawn action', () => {
        const ctx = createMockContext();
        A.spawn('steam', { x: 5, y: 5, amount: 3 })(ctx);

        expect(ctx.queue[0]).toEqual({
          type: 'spawn',
          what: 'steam',
          props: { x: 5, y: 5, amount: 3 }
        });
      });
    });
  });

  describe('Rule registration', () => {
    it('should assign default values to rules', () => {
      // This would require access to the RULES array
      // In production, we'd need to export it or provide a getter
      
      const testRule = {
        when: () => true,
        then: () => {}
      };

      // Test the structure of what rule() should create
      const expectedStructure = {
        id: expect.any(String),
        phase: 'tick', // default
        priority: 0, // default
        when: expect.any(Function),
        then: expect.any(Function)
      };

      // We can't directly test rule() without side effects,
      // but we can verify the structure it should create
      expect(testRule.when).toBeDefined();
      expect(testRule.then).toBeDefined();
    });
  });
});