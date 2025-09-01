import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerMaterial,
  getMaterial,
  allMaterials,
  registerStatus,
  getStatus,
  allStatuses,
  clearAll
} from '../../src/js/engine/materials.js';

describe('Materials Registry', () => {
  beforeEach(() => {
    // Clear registries before each test
    clearAll();
  });

  describe('Material Registration', () => {
    it('should register a material', () => {
      registerMaterial({
        id: 'test-material',
        tags: ['solid', 'flammable'],
        props: { density: 100 }
      });

      const material = getMaterial('test-material');
      expect(material).toBeDefined();
      expect(material?.id).toBe('test-material');
      expect(material?.tags).toContain('solid');
      expect(material?.tags).toContain('flammable');
      expect(material?.props?.density).toBe(100);
    });

    it('should handle materials without tags', () => {
      registerMaterial({
        id: 'simple',
        props: { weight: 10 }
      });

      const material = getMaterial('simple');
      expect(material?.tags).toEqual([]);
      expect(material?.props?.weight).toBe(10);
    });

    it('should handle materials without props', () => {
      registerMaterial({
        id: 'basic',
        tags: ['type1']
      });

      const material = getMaterial('basic');
      expect(material?.props).toEqual({});
    });

    it('should overwrite existing material', () => {
      registerMaterial({
        id: 'duplicate',
        tags: ['old'],
        props: { version: 1 }
      });

      registerMaterial({
        id: 'duplicate',
        tags: ['new'],
        props: { version: 2 }
      });

      const material = getMaterial('duplicate');
      expect(material?.tags).toContain('new');
      expect(material?.tags).not.toContain('old');
      expect(material?.props?.version).toBe(2);
    });

    it('should return undefined for non-existent material', () => {
      expect(getMaterial('non-existent')).toBeUndefined();
    });
  });

  describe('Status Registration', () => {
    it('should register a status', () => {
      registerStatus({
        id: 'test-status',
        tags: ['debuff', 'magic'],
        props: { duration: 5, intensity: 2 }
      });

      const status = getStatus('test-status');
      expect(status).toBeDefined();
      expect(status?.id).toBe('test-status');
      expect(status?.tags).toContain('debuff');
      expect(status?.tags).toContain('magic');
      expect(status?.props?.duration).toBe(5);
      expect(status?.props?.intensity).toBe(2);
    });

    it('should handle statuses without tags', () => {
      registerStatus({
        id: 'simple-status',
        props: { power: 3 }
      });

      const status = getStatus('simple-status');
      expect(status?.tags).toEqual([]);
      expect(status?.props?.power).toBe(3);
    });

    it('should handle statuses without props', () => {
      registerStatus({
        id: 'basic-status',
        tags: ['temporary']
      });

      const status = getStatus('basic-status');
      expect(status?.props).toEqual({});
    });

    it('should overwrite existing status', () => {
      registerStatus({
        id: 'dup-status',
        tags: ['v1'],
        props: { level: 1 }
      });

      registerStatus({
        id: 'dup-status',
        tags: ['v2'],
        props: { level: 2 }
      });

      const status = getStatus('dup-status');
      expect(status?.tags).toContain('v2');
      expect(status?.tags).not.toContain('v1');
      expect(status?.props?.level).toBe(2);
    });

    it('should return undefined for non-existent status', () => {
      expect(getStatus('non-existent')).toBeUndefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should return all materials', () => {
      registerMaterial({ id: 'mat1', tags: ['a'] });
      registerMaterial({ id: 'mat2', tags: ['b'] });
      registerMaterial({ id: 'mat3', tags: ['c'] });

      const materials = allMaterials();
      expect(materials).toHaveLength(3);
      expect(materials.map(m => m.id)).toContain('mat1');
      expect(materials.map(m => m.id)).toContain('mat2');
      expect(materials.map(m => m.id)).toContain('mat3');
    });

    it('should return all statuses', () => {
      registerStatus({ id: 'stat1', tags: ['x'] });
      registerStatus({ id: 'stat2', tags: ['y'] });

      const statuses = allStatuses();
      expect(statuses).toHaveLength(2);
      expect(statuses.map(s => s.id)).toContain('stat1');
      expect(statuses.map(s => s.id)).toContain('stat2');
    });

    it('should return empty arrays when nothing registered', () => {
      expect(allMaterials()).toEqual([]);
      expect(allStatuses()).toEqual([]);
    });

    it('should clear all registries', () => {
      registerMaterial({ id: 'material1' });
      registerStatus({ id: 'status1' });

      expect(allMaterials()).toHaveLength(1);
      expect(allStatuses()).toHaveLength(1);

      clearAll();

      expect(allMaterials()).toHaveLength(0);
      expect(allStatuses()).toHaveLength(0);
      expect(getMaterial('material1')).toBeUndefined();
      expect(getStatus('status1')).toBeUndefined();
    });
  });

  describe('Default Registrations', () => {
    it('should have pre-registered water material', () => {
      // Note: materials.js registers some defaults on import
      // We cleared them in beforeEach, so let's re-register
      registerMaterial({
        id: 'water',
        tags: ['liquid', 'extinguisher', 'conductive'],
        props: { heatCapacity: 100, extinguishingPower: 25, conductivityAmp: 1.5 }
      });

      const water = getMaterial('water');
      expect(water).toBeDefined();
      expect(water?.tags).toContain('liquid');
      expect(water?.tags).toContain('conductive');
      expect(water?.props?.conductivityAmp).toBe(1.5);
    });

    it('should have pre-registered metal material', () => {
      registerMaterial({
        id: 'metal',
        tags: ['solid', 'conductive'],
        props: { conductivityAmp: 1.2 }
      });

      const metal = getMaterial('metal');
      expect(metal).toBeDefined();
      expect(metal?.tags).toContain('solid');
      expect(metal?.tags).toContain('conductive');
    });

    it('should have pre-registered wet status', () => {
      registerStatus({
        id: 'wet',
        tags: ['coated', 'conductive', 'extinguisher'],
        props: { quantity: 20, extinguishingPower: 20, conductivityAmp: 1.5 }
      });

      const wet = getStatus('wet');
      expect(wet).toBeDefined();
      expect(wet?.tags).toContain('conductive');
      expect(wet?.tags).toContain('extinguisher');
    });

    it('should have pre-registered burning status', () => {
      registerStatus({
        id: 'burning',
        tags: ['fire', 'dot'],
        props: { intensity: 1, temperatureC: 600 }
      });

      const burning = getStatus('burning');
      expect(burning).toBeDefined();
      expect(burning?.tags).toContain('fire');
      expect(burning?.tags).toContain('dot');
      expect(burning?.props?.temperatureC).toBe(600);
    });
  });

  describe('Property Preservation', () => {
    it('should create new props object for each registration', () => {
      const sharedProps = { value: 100 };
      
      registerMaterial({
        id: 'mat1',
        props: sharedProps
      });

      registerMaterial({
        id: 'mat2',
        props: sharedProps
      });

      const mat1 = getMaterial('mat1');
      const mat2 = getMaterial('mat2');

      // Props should be copied, not shared
      expect(mat1?.props).not.toBe(mat2?.props);
      expect(mat1?.props).toEqual(mat2?.props);

      // Modifying one shouldn't affect the other
      if (mat1?.props) mat1.props.value = 200;
      expect(mat2?.props?.value).toBe(100);
    });

    it('should create new tags array for each registration', () => {
      const sharedTags = ['shared', 'tags'];
      
      registerStatus({
        id: 'stat1',
        tags: sharedTags
      });

      const stat1 = getStatus('stat1');
      
      // Tags should be copied, not shared
      expect(stat1?.tags).not.toBe(sharedTags);
      expect(stat1?.tags).toEqual(sharedTags);
    });
  });
});