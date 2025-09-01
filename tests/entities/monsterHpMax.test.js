import { describe, it, expect } from 'vitest';
import { makeMonster } from '../../src/js/entities/entities.js';
import { getInfoAtCursor, initCursor, activateCursor } from '../../src/js/movement/cursor.js';
import { W, H } from '../../src/js/core/config.js';

describe('Monster HP Display Fix', () => {
  describe('Monster creation with hpMax', () => {
    it('should set hpMax equal to hp for basic monsters', () => {
      const goober = makeMonster('goober', 5, 5, 1);
      
      expect(goober.hp).toBe(6);
      expect(goober.hpMax).toBe(6);
      expect(goober.name).toBe('candy goober');
    });
    
    it('should scale hpMax with tier modifiers', () => {
      // Tier 1 (normal)
      const normalGoober = makeMonster('goober', 5, 5, 1);
      expect(normalGoober.hp).toBe(6);
      expect(normalGoober.hpMax).toBe(6);
      
      // Tier 2 (veteran)
      const veteranGoober = makeMonster('goober', 5, 5, 2);
      expect(veteranGoober.hp).toBe(9); // 6 * 1.5
      expect(veteranGoober.hpMax).toBe(9);
      expect(veteranGoober.name).toBe('veteran candy goober');
      
      // Tier 3 (elite)
      const eliteGoober = makeMonster('goober', 5, 5, 3);
      expect(eliteGoober.hp).toBe(15); // 6 * 2.5
      expect(eliteGoober.hpMax).toBe(15);
      expect(eliteGoober.name).toBe('elite candy goober');
    });
    
    it('should handle boss monsters with hpMax', () => {
      const boss = makeMonster('boss', 10, 10);
      
      expect(boss.hp).toBe(30);
      expect(boss.hpMax).toBe(30);
      expect(boss.name).toBe('Lich King');
      expect(boss.tier).toBe(3); // Bosses are always tier 3
    });
    
    it('should set hpMax for all monster types', () => {
      const monsters = [
        { type: 'icething', expectedHp: 8 },
        { type: 'sootling', expectedHp: 5 },
        { type: 'firefly', expectedHp: 3 },
        { type: 'flamepup', expectedHp: 7 },
        { type: 'frostbite', expectedHp: 8 }
      ];
      
      for (const { type, expectedHp } of monsters) {
        const monster = makeMonster(type, 0, 0, 1);
        expect(monster.hp).toBe(expectedHp);
        expect(monster.hpMax).toBe(expectedHp);
        expect(monster.hpMax).toBeDefined();
      }
    });
  });
  
  describe('Cursor inspection with proper HP display', () => {
    it('should display hp/hpMax correctly for monsters', () => {
      const state = {
        player: { x: 5, y: 5 },
        chunk: {
          map: Array(H).fill(null).map(() => Array(W).fill('.')),
          monsters: [],
          items: []
        }
      };
      
      // Create a monster with damaged HP
      const monster = makeMonster('goober', 7, 5, 1);
      monster.hp = 4; // Damaged
      state.chunk.monsters.push(monster);
      
      window.STATE = state;
      initCursor(7, 5);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster).toBeDefined();
      expect(info.monster.hp).toBe(4);
      expect(info.monster.hpMax).toBe(6);
    });
    
    it('should handle legacy monsters without hpMax', () => {
      const state = {
        player: { x: 5, y: 5 },
        chunk: {
          map: Array(H).fill(null).map(() => Array(W).fill('.')),
          monsters: [],
          items: []
        }
      };
      
      // Create a legacy monster without hpMax
      const legacyMonster = {
        name: 'Old Goober',
        x: 7,
        y: 5,
        hp: 10,
        // No hpMax defined
        alive: true,
        statusEffects: []
      };
      
      state.chunk.monsters.push(legacyMonster);
      
      window.STATE = state;
      initCursor(7, 5);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster).toBeDefined();
      expect(info.monster.hp).toBe(10);
      expect(info.monster.hpMax).toBe(10); // Should default to hp value
    });
    
    it('should display correct HP for damaged monsters', () => {
      const state = {
        player: { x: 5, y: 5 },
        chunk: {
          map: Array(H).fill(null).map(() => Array(W).fill('.')),
          monsters: [],
          items: []
        }
      };
      
      // Create an elite monster with damage
      const eliteMonster = makeMonster('icething', 8, 8, 3);
      eliteMonster.hp = 12; // Damaged from 20 (8 * 2.5)
      
      state.chunk.monsters.push(eliteMonster);
      
      window.STATE = state;
      initCursor(8, 8);
      activateCursor('examine');
      
      const info = getInfoAtCursor();
      
      expect(info.monster).toBeDefined();
      expect(info.monster.name).toBe('elite ice-thing');
      expect(info.monster.hp).toBe(12);
      expect(info.monster.hpMax).toBe(20); // 8 * 2.5 for elite tier
    });
  });
});