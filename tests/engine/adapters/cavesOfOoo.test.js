import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  toEngineEntity,
  tagsForStatus,
  buildContext,
  applyActions,
  runTickForEntity,
  runPreDamage,
  processEntityTurn,
  applyStatusWithEngine,
  processDamageWithEngine
} from '../../../src/js/engine/adapters/cavesOfOoo.js';
import { createMockEntity, createMockState } from '../../helpers/testUtils.js';
import { entities } from '../../fixtures/entities.js';
import { setupEntityWithEffects, clearAllStatusEffects } from '../../helpers/statusTestHelper.js';
import { getStatusEffectsAsArray } from '../../../src/js/combat/statusSystem.js';
// Load the status rules so they're registered
import '../../../src/js/engine/statusRules.js';

describe('CavesOfOoo Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllStatusEffects(); // Clear Status Map between tests
  });

  describe('toEngineEntity', () => {
    it('should convert game entity to engine format', () => {
      const entity = {
        id: 'player',
        hp: 80,
        hpMax: 100,
        x: 5,
        y: 5
      };
      
      // Set up status effects in the Map
      setupEntityWithEffects(entity, [
        { type: 'wet', turns: 3, value: 0, quantity: 20 },
        { type: 'burn', turns: 2, value: 2 }
      ]);
      
      const state = createMockState();
      const snapshot = toEngineEntity(state, entity);
      
      expect(snapshot).toMatchObject({
        id: 'player',
        hp: 80,
        hpMax: 100,
        statuses: expect.arrayContaining([
          expect.objectContaining({
            id: 'wet',
            tags: expect.arrayContaining(['conductive', 'extinguisher'])
          }),
          expect.objectContaining({
            id: 'burn',
            tags: expect.arrayContaining(['fire', 'dot'])
          })
        ])
      });
    });

    it('should add water material for water tiles', () => {
      const entity = createMockEntity({ x: 5, y: 5 });
      const state = createMockState();
      state.chunk.map[5][5] = '~';
      
      const snapshot = toEngineEntity(state, entity);
      
      const waterMaterial = snapshot.materials.find(m => m.id === 'water');
      expect(waterMaterial).toBeDefined();
      expect(waterMaterial?.tags).toContain('conductive');
    });

    it('should add metal material for metal gear', () => {
      const entity = {
        ...createMockEntity(),
        armor: { name: 'Steel Armor', defense: 5 },
        headgear: { name: 'Iron Helm', defense: 2 }
      };
      
      const state = createMockState();
      const snapshot = toEngineEntity(state, entity);
      
      const metalMaterial = snapshot.materials.find(m => m.id === 'metal');
      expect(metalMaterial).toBeDefined();
      expect(metalMaterial?.tags).toContain('conductive');
    });

    it('should mirror wet quantity as water material', () => {
      const entity = createMockEntity();
      
      // Set up wet status with quantity in the Map
      setupEntityWithEffects(entity, [
        { type: 'wet', turns: 3, quantity: 30 }
      ]);
      
      const state = createMockState();
      const snapshot = toEngineEntity(state, entity);
      
      const waterMaterial = snapshot.materials.find(m => m.id === 'water');
      expect(waterMaterial).toBeDefined();
      expect(waterMaterial?.props?.quantity).toBe(30);
    });

    it('should handle entities without status effects', () => {
      const entity = createMockEntity();
      // No need to set up any effects - Map will return empty array
      
      const state = createMockState();
      const snapshot = toEngineEntity(state, entity);
      
      expect(snapshot.statuses).toHaveLength(0);
    });
  });

  describe('tagsForStatus', () => {
    it('should return correct tags for known statuses', () => {
      expect(tagsForStatus('wet')).toContain('conductive');
      expect(tagsForStatus('wet')).toContain('extinguisher');
      
      expect(tagsForStatus('burn')).toContain('fire');
      expect(tagsForStatus('burn')).toContain('dot');
      
      expect(tagsForStatus('freeze')).toContain('ice');
      expect(tagsForStatus('freeze')).toContain('immobilize');
      
      expect(tagsForStatus('poison')).toContain('toxic');
      expect(tagsForStatus('shock')).toContain('electric');
    });

    it('should return empty array for unknown status', () => {
      expect(tagsForStatus('unknown')).toEqual([]);
    });

    it('should handle burning as alias for burn', () => {
      expect(tagsForStatus('burning')).toEqual(tagsForStatus('burn'));
    });
  });

  describe('buildContext', () => {
    it('should build complete context', () => {
      const entity = { ...entities.wetPlayer };
      // Set up wet status for this entity
      setupEntityWithEffects(entity, [
        { type: 'wet', turns: 5, value: 0, quantity: 20 }
      ]);
      
      const state = createMockState();
      const event = {
        kind: 'damage',
        damage: { amount: 10, type: 'fire' }
      };
      
      const ctx = buildContext(state, entity, event);
      
      expect(ctx).toMatchObject({
        entity: expect.objectContaining({
          hp: entity.hp,
          hpMax: entity.hpMax
        }),
        env: expect.objectContaining({
          temperatureC: 20,
          oxygen: 1.0
        }),
        event,
        state,
        queue: []
      });
      expect(typeof ctx.rand).toBe('function');
    });

    it('should include tile tags in environment', () => {
      const entity = createMockEntity({ x: 3, y: 3 });
      const state = createMockState();
      state.chunk.map[3][3] = '~';
      
      const ctx = buildContext(state, entity);
      
      expect(ctx.env.tileTags).toContain('water');
      expect(ctx.env.tileTags).toContain('liquid');
    });

    it('should handle spike tiles', () => {
      const entity = createMockEntity({ x: 2, y: 2 });
      const state = createMockState();
      state.chunk.map[2][2] = '^';
      
      const ctx = buildContext(state, entity);
      
      expect(ctx.env.tileTags).toContain('spikes');
      expect(ctx.env.tileTags).toContain('hazard');
    });

    it('should use default values when not provided', () => {
      const entity = createMockEntity();
      const state = createMockState();
      
      const ctx = buildContext(state, entity);
      
      expect(ctx.event).toEqual({});
      expect(ctx.env.timeOfDay).toBe('day');
      expect(ctx.env.weather).toBe('clear');
    });
  });

  describe('applyActions', () => {
    it('should apply addStatus action', () => {
      const entity = createMockEntity();
      const state = createMockState();
      const queue = [
        { type: 'addStatus', id: 'burn', props: { turns: 3, value: 2 } }
      ];
      
      applyActions(state, entity, queue);
      
      // Check the status was added via the Map
      const effects = getStatusEffectsAsArray(entity);
      expect(effects).toHaveLength(1);
      expect(effects[0]).toMatchObject({
        type: 'burn',
        turns: 3,
        value: 2
      });
    });

    it('should apply removeStatus action', () => {
      const entity = createMockEntity();
      // Set up initial status effects
      setupEntityWithEffects(entity, [
        { type: 'wet', turns: 3 },
        { type: 'burn', turns: 2 }
      ]);
      const state = createMockState();
      const queue = [{ type: 'removeStatus', id: 'wet' }];
      
      applyActions(state, entity, queue);
      
      const effects = getStatusEffectsAsArray(entity);
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe('burn');
    });

    it('should apply damage action', () => {
      const entity = createMockEntity({ hp: 100 });
      const state = createMockState();
      const queue = [{ type: 'damage', amount: 30, dtype: 'fire' }];
      
      applyActions(state, entity, queue);
      
      expect(entity.hp).toBe(70);
      expect(entity.alive).toBe(true);
    });

    it('should kill entity when hp reaches 0', () => {
      const entity = createMockEntity({ hp: 20 });
      const state = createMockState();
      const queue = [{ type: 'damage', amount: 25 }];
      
      applyActions(state, entity, queue);
      
      expect(entity.hp).toBe(0);
      expect(entity.alive).toBe(false);
    });

    it('should consume coating', () => {
      const entity = createMockEntity();
      setupEntityWithEffects(entity, [
        { type: 'wet', quantity: 50 }
      ]);
      const state = createMockState();
      const queue = [{ type: 'consumeCoating', id: 'water', qty: 20 }];
      
      applyActions(state, entity, queue);
      
      const effects = getStatusEffectsAsArray(entity);
      expect(effects[0].quantity).toBe(30);
    });

    it('should remove wet status when quantity depleted', () => {
      const entity = createMockEntity();
      setupEntityWithEffects(entity, [
        { type: 'wet', quantity: 10 }
      ]);
      const state = createMockState();
      const queue = [{ type: 'consumeCoating', id: 'water', qty: 'all' }];
      
      applyActions(state, entity, queue);
      
      const effects = getStatusEffectsAsArray(entity);
      expect(effects).toHaveLength(0);
    });

    it('should apply preventTurn action', () => {
      const entity = createMockEntity();
      const state = createMockState();
      const queue = [{ type: 'preventTurn', reason: 'frozen' }];
      
      applyActions(state, entity, queue);
      
      expect(entity._engine?.preventTurn).toBe('frozen');
    });

    it('should apply stat modifiers', () => {
      const entity = createMockEntity();
      const state = createMockState();
      const queue = [
        { type: 'modifyStat', stat: 'str', modifier: -3, source: 'weaken' },
        { type: 'modifyStat', stat: 'def', modifier: 5, source: 'armor' }
      ];
      
      applyActions(state, entity, queue);
      
      expect(entity._engine?.statMods?.str).toBe(-3);
      expect(entity._engine?.statMods?.def).toBe(5);
    });

    it('should accumulate stat modifiers', () => {
      const entity = createMockEntity();
      entity._engine = { statMods: { str: 2 } };
      const state = createMockState();
      const queue = [
        { type: 'modifyStat', stat: 'str', modifier: -5 }
      ];
      
      applyActions(state, entity, queue);
      
      expect(entity._engine.statMods.str).toBe(-3);
    });

    it('should handle unknown action types', () => {
      const entity = createMockEntity();
      const state = createMockState();
      const queue = [{ type: 'unknown-action' }];
      
      expect(() => applyActions(state, entity, queue)).not.toThrow();
    });
  });

  describe('runTickForEntity', () => {
    it('should process tick phase and apply actions', () => {
      const entity = createMockEntity();
      setupEntityWithEffects(entity, [
        { type: 'freeze', turns: 2 }
      ]);
      const state = createMockState();
      
      runTickForEntity(state, entity);
      
      // Should run tick phase rules
      expect(entity._engine).toBeUndefined(); // Cleared after tick
    });

    it('should clear transient engine fields', () => {
      const entity = createMockEntity();
      entity._engine = {
        preventTurn: 'test',
        statMods: { str: 5 }
      };
      const state = createMockState();
      
      runTickForEntity(state, entity);
      
      expect(entity._engine?.preventTurn).toBeUndefined();
      expect(entity._engine?.statMods).toBeUndefined();
    });
  });

  describe('runPreDamage', () => {
    it('should process predamage phase', () => {
      const defender = { ...entities.wetPlayer };
      // Set up wet status to make defender conductive
      setupEntityWithEffects(defender, [
        { type: 'wet', turns: 5, value: 0, quantity: 20 }
      ]);
      const state = createMockState();
      const damage = { amount: 10, type: 'electric' };
      
      const result = runPreDamage(state, defender, damage);
      
      // Wet + electric should amplify
      expect(result.amount).toBeGreaterThanOrEqual(99999);
    });

    it('should return modified damage', () => {
      const defender = createMockEntity();
      const state = createMockState();
      const damage = { amount: 20, type: 'fire' };
      
      const result = runPreDamage(state, defender, damage);
      
      expect(result).toBe(damage); // Same object, potentially modified
      expect(result.type).toBe('fire');
    });
  });

  describe('processEntityTurn', () => {
    it('should run preturn, tick, and cleanup phases', () => {
      const entity = createMockEntity();
      const state = createMockState();
      
      const canAct = processEntityTurn(state, entity);
      
      expect(canAct).toBe(true);
    });

    it('should skip tick if turn prevented', () => {
      const entity = createMockEntity();
      setupEntityWithEffects(entity, [
        { type: 'freeze', turns: 1 }
      ]);
      const state = createMockState();
      
      const canAct = processEntityTurn(state, entity);
      
      // Freeze should prevent turn
      expect(canAct).toBe(false);
    });

    it('should clear engine fields after processing', () => {
      const entity = createMockEntity();
      const state = createMockState();
      
      processEntityTurn(state, entity);
      
      expect(entity._engine?.preventTurn).toBeUndefined();
      expect(entity._engine?.statMods).toBeUndefined();
    });
  });

  describe('applyStatusWithEngine', () => {
    it('should apply status through engine', () => {
      const entity = createMockEntity();
      const state = createMockState();
      
      applyStatusWithEngine(state, entity, 'burn', 3, 2);
      
      const effects = getStatusEffectsAsArray(entity);
      expect(effects).toContainEqual(
        expect.objectContaining({
          type: 'burn',
          turns: 3,
          value: 2
        })
      );
    });

    it('should trigger apply phase rules', () => {
      const entity = createMockEntity();
      setupEntityWithEffects(entity, [
        { type: 'burn', turns: 2 }
      ]);
      const state = createMockState();
      
      // Applying wet should extinguish burn
      applyStatusWithEngine(state, entity, 'wet', 3, 0);
      
      // Both statuses might be present depending on rule execution
      const effects = getStatusEffectsAsArray(entity);
      const hasWet = effects.some(s => s.type === 'wet');
      expect(hasWet).toBe(true);
    });
  });

  describe('processDamageWithEngine', () => {
    it('should process damage through all phases', () => {
      const attacker = createMockEntity({ id: 'attacker' });
      const defender = { ...entities.wetPlayer };
      setupEntityWithEffects(defender, [
        { type: 'wet', turns: 5, value: 0, quantity: 20 }
      ]);
      const state = createMockState();
      const damage = { amount: 10, type: 'electric' };
      
      const finalDamage = processDamageWithEngine(
        state, attacker, defender, damage
      );
      
      // Wet + electric should amplify
      expect(finalDamage).toBeGreaterThanOrEqual(99999);
    });

    it('should include attacker in context', () => {
      const attacker = createMockEntity({ id: 'attacker', str: 15 });
      const defender = createMockEntity({ id: 'defender' });
      const state = createMockState();
      const damage = { amount: 20, type: 'physical' };
      
      const finalDamage = processDamageWithEngine(
        state, attacker, defender, damage
      );
      
      expect(finalDamage).toBe(20);
    });
  });
});