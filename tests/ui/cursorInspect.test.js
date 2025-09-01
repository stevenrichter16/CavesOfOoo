import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getInfoAtCursor, initCursor, activateCursor } from '../../src/js/movement/cursor.js';
import { Status, applyStatusEffect, getEntityId } from '../../src/js/combat/statusSystem.js';
import { W, H } from '../../src/js/core/config.js';

describe('Enhanced Cursor Inspect', () => {
  let state;
  let monster;
  
  beforeEach(() => {
    // Clear Status Map
    Status.clear();
    
    // Create test state
    state = {
      player: {
        x: 5,
        y: 5,
        hp: 100,
        hpMax: 100,
        alive: true
      },
      chunk: {
        map: Array(H).fill(null).map(() => Array(W).fill('.')),
        monsters: [],
        items: []
      }
    };
    
    // Create test monster
    monster = {
      id: 'monster_test_1',
      name: 'Fire Goober',
      x: 7,
      y: 5,
      hp: 25,
      hpMax: 30,
      alive: true,
      dmg: 5,
      ai: 'chase',
      statusEffects: []
    };
    
    state.chunk.monsters.push(monster);
    
    // Set up window.STATE for cursor system
    window.STATE = state;
  });
  
  describe('Basic monster inspection', () => {
    it('should show monster HP when cursor is over it', () => {
      // Initialize cursor at monster position
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      // Get info at cursor
      const info = getInfoAtCursor();
      
      expect(info).toBeDefined();
      expect(info.monster).toBeDefined();
      expect(info.monster.name).toBe('Fire Goober');
      expect(info.monster.hp).toBe(25);
      expect(info.monster.hpMax).toBe(30);
    });
    
    it('should show empty status array for healthy monster', () => {
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster.statuses).toBeDefined();
      expect(info.monster.statuses).toEqual([]);
    });
  });
  
  describe('Monster with status effects', () => {
    it('should show single status effect', () => {
      // Apply burn status to monster
      applyStatusEffect(monster, 'burn', 5, 3);
      
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster.statuses).toHaveLength(1);
      expect(info.monster.statuses[0]).toMatchObject({
        type: 'burn',
        name: 'Burning',
        turns: 5,
        value: 3
      });
    });
    
    it('should show multiple status effects', () => {
      // Apply multiple statuses
      applyStatusEffect(monster, 'burn', 5, 3);
      applyStatusEffect(monster, 'poison', 8, 2);
      applyStatusEffect(monster, 'weaken', 3, 0);
      
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster.statuses).toHaveLength(3);
      
      const statusTypes = info.monster.statuses.map(s => s.type);
      expect(statusTypes).toContain('burn');
      expect(statusTypes).toContain('poison');
      expect(statusTypes).toContain('weaken');
      
      // Check display names
      const burnStatus = info.monster.statuses.find(s => s.type === 'burn');
      expect(burnStatus.name).toBe('Burning');
      
      const poisonStatus = info.monster.statuses.find(s => s.type === 'poison');
      expect(poisonStatus.name).toBe('Poisoned');
      
      const weakenStatus = info.monster.statuses.find(s => s.type === 'weaken');
      expect(weakenStatus.name).toBe('Weakened');
    });
    
    it('should show wet status with conductivity', () => {
      // Apply wet status
      applyStatusEffect(monster, 'wet', 4, 1);
      
      // Set conductivity quantity
      const monsterId = getEntityId(monster);
      const effects = Status.get(monsterId);
      effects['wet'].quantity = 40;
      
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster.statuses).toHaveLength(1);
      expect(info.monster.statuses[0]).toMatchObject({
        type: 'wet',
        name: 'Wet',
        turns: 4,
        value: 1
      });
    });
    
    it('should show frozen status', () => {
      applyStatusEffect(monster, 'freeze', 2, 0);
      
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster.statuses).toHaveLength(1);
      expect(info.monster.statuses[0]).toMatchObject({
        type: 'freeze',
        name: 'Frozen',
        turns: 2,
        value: 0
      });
    });
    
    it('should show buff and debuff status effects', () => {
      applyStatusEffect(monster, 'buff_str', 5, 3);
      applyStatusEffect(monster, 'debuff_def', 4, 2);
      
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster.statuses).toHaveLength(2);
      
      const buffStr = info.monster.statuses.find(s => s.type === 'buff_str');
      expect(buffStr.name).toBe('+str');
      
      const debuffDef = info.monster.statuses.find(s => s.type === 'debuff_def');
      expect(debuffDef.name).toBe('-def');
    });
    
    it('should show water_slow from old statusEffects array', () => {
      // Add water_slow to old statusEffects array
      monster.statusEffects.push({
        type: 'water_slow',
        duration: 3,
        speedReduction: 2
      });
      
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      // Should find water_slow in the statuses
      const waterSlow = info.monster.statuses.find(s => s.type === 'water_slow');
      expect(waterSlow).toBeDefined();
      expect(waterSlow.name).toBe('Slowed (Water)');
      expect(waterSlow.turns).toBe(3);
      expect(waterSlow.value).toBe(2);
    });
  });
  
  describe('Distance calculation', () => {
    it('should calculate correct distance from player', () => {
      // Monster at (7,5), player at (5,5)
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.distance).toBe(2); // 2 tiles away horizontally
    });
    
    it('should calculate diagonal distance correctly', () => {
      // Move monster diagonally
      monster.x = 8;
      monster.y = 8;
      
      // Player at (5,5), monster at (8,8)
      // Distance = sqrt((8-5)^2 + (8-5)^2) = sqrt(9+9) = sqrt(18) ≈ 4.24
      initCursor(monster.x, monster.y);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.distance).toBe(4); // Rounded
    });
  });
  
  describe('Non-monster tiles', () => {
    it('should return null monster for empty tiles', () => {
      initCursor(3, 3); // Empty floor tile
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info).toBeDefined();
      expect(info.monster).toBeNull();
      expect(info.tile).toBe('.');
    });
    
    it('should show item info if present', () => {
      state.chunk.items.push({
        x: 4,
        y: 4,
        type: 'potion',
        name: 'Health Potion'
      });
      
      initCursor(4, 4);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.item).toBeDefined();
      expect(info.item.type).toBe('potion');
      expect(info.item.name).toBe('Health Potion');
      expect(info.monster).toBeNull();
    });
    
    it('should identify water tiles', () => {
      state.chunk.map[6][6] = '~';
      
      initCursor(6, 6);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.tile).toBe('~');
      expect(info.monster).toBeNull();
    });
  });
  
  describe('Multiple monsters at different positions', () => {
    it('should inspect the correct monster at cursor position', () => {
      // Add second monster
      const monster2 = {
        id: 'monster_test_2',
        name: 'Ice Goober',
        x: 10,
        y: 10,
        hp: 40,
        hpMax: 40,
        alive: true,
        statusEffects: []
      };
      
      state.chunk.monsters.push(monster2);
      
      // Apply different statuses to each
      applyStatusEffect(monster, 'burn', 5, 3);
      applyStatusEffect(monster2, 'freeze', 3, 0);
      
      // Check first monster
      initCursor(monster.x, monster.y);
      let info = getInfoAtCursor();
      
      expect(info.monster.name).toBe('Fire Goober');
      expect(info.monster.statuses[0].type).toBe('burn');
      
      // Check second monster
      initCursor(monster2.x, monster2.y);
      info = getInfoAtCursor();
      
      expect(info.monster.name).toBe('Ice Goober');
      expect(info.monster.statuses[0].type).toBe('freeze');
    });
  });
});