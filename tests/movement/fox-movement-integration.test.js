// tests/movement/fox-movement-integration.test.js
// Integration tests for Sweet Tooth Fox mechanics with the movement pipeline

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { attack } from '../../src/js/combat/combat.js';
import { generateForestChunk } from '../../src/js/world/theForest.js';
import { createTestChunk } from '../helpers/testUtils.js';

describe('Fox Movement Pipeline Integration', () => {
  let state;
  let player;

  beforeEach(() => {
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      str: 15,
      def: 2,
      spd: 5,
      gold: 0,
      inventory: [],
      quests: {
        active: ['sweet_tooth_foxes'],
        completed: [],
        progress: { sweet_tooth_foxes: { teeth: 0 } },
        fetchQuests: {}
      }
    };

    const chunk = createTestChunk(48, 22);
    chunk.biome = 'forest';

    state = {
      player,
      cx: 0,
      cy: -2, // Forest location
      chunk,
      npcs: [],
      turn: 0,
      log: vi.fn((state, text, cls) => {})
    };
  });

  describe('Movement Pipeline with Sleeping Foxes', () => {
    it('should handle movement towards sleeping fox correctly', async () => {
      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 5,
        hpMax: 15,
        str: 3,
        def: 1,
        spd: 3,
        status: 'sleep',
        asleep: true,
        hasTeeth: true,
        alive: true
      };
      state.chunk.monsters.push(fox);

      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const result = await runPlayerMove(state, moveAction);

      expect(result).toBeTruthy(); // Move was consumed
      expect(player.x).toBe(10); // Player didn't move (bumped into fox)
      expect(player.inventory.some(i => i.item?.id === 'fox_sweet_tooth')).toBe(true);
      expect(fox.hasTeeth).toBe(false);
    });

    it('should handle movement towards awake fox correctly', async () => {
      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 15,
        hpMax: 15,
        str: 3,
        def: 1,
        spd: 3,
        status: null,
        asleep: false,
        hasTeeth: true,
        alive: true
      };
      state.chunk.monsters.push(fox);

      const initialFoxHP = fox.hp;
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const result = await runPlayerMove(state, moveAction);

      expect(result).toBeTruthy(); // Move was consumed
      expect(player.x).toBe(10); // Player didn't move (attacked fox)
      
      // Fox should be damaged or have HP clamped at 5
      expect(fox.hp).toBeLessThanOrEqual(initialFoxHP);
      if (fox.hp === 5) {
        expect(fox.status).toBe('sleep');
        expect(fox.asleep).toBe(true);
      }
    });

    it('should handle diagonal movement around sleeping foxes', async () => {
      // Place sleeping foxes in a pattern
      const foxPositions = [
        { x: 11, y: 10 },
        { x: 10, y: 11 },
        { x: 9, y: 10 }
      ];

      foxPositions.forEach((pos, i) => {
        state.chunk.monsters.push({
          id: `fox_${i}`,
          name: 'Sweet Tooth Fox',
          kind: 'sweet_tooth_fox',
          x: pos.x,
          y: pos.y,
          hp: 5,
          hpMax: 15,
          str: 3,
          def: 1,
          spd: 3,
          status: 'sleep',
          asleep: true,
          hasTeeth: true,
          alive: true
        });
      });

      // Try to move up (should be blocked by fox)
      let moveAction = { type: 'move', dx: 0, dy: 1 };
      await runPlayerMove(state, moveAction);

      expect(player.y).toBe(10); // Didn't move
      expect(player.inventory.some(i => i.item?.id === 'fox_sweet_tooth')).toBe(true);

      // Try to move right (should be blocked by fox)
      moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);

      expect(player.x).toBe(10); // Didn't move
      expect(player.inventory.filter(i => i.item?.id === 'fox_sweet_tooth')[0].count).toBe(2);
    });

    it('should handle sequential tooth collection', async () => {
      // Line up 3 sleeping foxes
      for (let i = 0; i < 3; i++) {
        state.chunk.monsters.push({
          id: `fox_${i}`,
          name: 'Sweet Tooth Fox',
          kind: 'sweet_tooth_fox',
          x: 11 + i,
          y: 10,
          hp: 5,
          hpMax: 15,
          str: 3,
          def: 1,
          spd: 3,
          status: 'sleep',
          asleep: true,
          hasTeeth: true,
          alive: true
        });
      }

      // Collect from all three
      for (let i = 0; i < 3; i++) {
        const moveAction = { type: 'move', dx: 1, dy: 0 };
        await runPlayerMove(state, moveAction);
        player.x = 10 + i + 1; // Manually move player after collection
      }

      const teeth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(teeth).toBeTruthy();
      expect(teeth.count).toBe(3);
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(3);
    });
  });

  describe('Combat to Sleep Transition', () => {
    it('should transition fox from combat to sleep at 5 HP', () => {
      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 8,
        hpMax: 15,
        str: 3,
        def: 1,
        spd: 3,
        status: null,
        asleep: false,
        hasTeeth: true,
        alive: true
      };
      state.chunk.monsters.push(fox);

      // Attack until fox reaches 5 HP
      player.str = 10;
      let attempts = 0;
      while (fox.hp > 5 && attempts < 10) {
        attack(state, player, fox);
        attempts++;
      }

      expect(fox.hp).toBe(5);
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
    });

    it('should handle multiple foxes transitioning to sleep', () => {
      const foxes = [];
      for (let i = 0; i < 3; i++) {
        const fox = {
          id: `fox_${i}`,
          name: 'Sweet Tooth Fox',
          kind: 'sweet_tooth_fox',
          x: 11 + i,
          y: 10,
          hp: 10,
          hpMax: 15,
          str: 3,
          def: 1,
          spd: 3,
          status: null,
          asleep: false,
          hasTeeth: true,
          alive: true
        };
        foxes.push(fox);
        state.chunk.monsters.push(fox);
      }

      player.str = 20;
      
      // Attack each fox until it sleeps
      foxes.forEach(fox => {
        let attempts = 0;
        while (fox.hp > 5 && attempts < 10) {
          attack(state, player, fox);
          attempts++;
        }
        
        expect(fox.hp).toBe(5);
        expect(fox.status).toBe('sleep');
        expect(fox.asleep).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not collect teeth from already harvested fox', async () => {
      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 5,
        hpMax: 15,
        str: 3,
        def: 1,
        spd: 3,
        status: 'sleep',
        asleep: true,
        hasTeeth: false, // Already harvested
        alive: true
      };
      state.chunk.monsters.push(fox);

      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);

      expect(player.inventory.some(i => i.item?.id === 'fox_sweet_tooth')).toBe(false);
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(0);
    });

    it('should handle fox at spawn with 5 HP', () => {
      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 5,
        hpMax: 5, // Spawned with 5 max HP
        str: 3,
        def: 1,
        spd: 3,
        status: null,
        asleep: false,
        hasTeeth: true,
        alive: true
      };
      state.chunk.monsters.push(fox);

      // Attack should immediately put it to sleep
      attack(state, player, fox);

      expect(fox.hp).toBe(5);
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
    });

    it('should not allow movement through sleeping fox', async () => {
      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 5,
        hpMax: 15,
        str: 3,
        def: 1,
        spd: 3,
        status: 'sleep',
        asleep: true,
        hasTeeth: true,
        alive: true
      };
      state.chunk.monsters.push(fox);

      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);

      // Player should not have moved through the fox
      expect(player.x).toBe(10);
      
      // But should have collected the tooth
      expect(fox.hasTeeth).toBe(false);
      expect(player.inventory.some(i => i.item?.id === 'fox_sweet_tooth')).toBe(true);
    });
  });

  describe('Quest Integration', () => {
    it('should track quest completion correctly', async () => {
      // Add exactly 5 sleeping foxes
      for (let i = 0; i < 5; i++) {
        state.chunk.monsters.push({
          id: `fox_${i}`,
          name: 'Sweet Tooth Fox',
          kind: 'sweet_tooth_fox',
          x: 11 + i,
          y: 10,
          hp: 5,
          hpMax: 15,
          str: 3,
          def: 1,
          spd: 3,
          status: 'sleep',
          asleep: true,
          hasTeeth: true,
          alive: true
        });
      }

      // Collect all teeth
      for (let i = 0; i < 5; i++) {
        player.x = 10 + i;
        const moveAction = { type: 'move', dx: 1, dy: 0 };
        await runPlayerMove(state, moveAction);
      }

      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(5);
      
      const teeth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(teeth).toBeTruthy();
      expect(teeth.count).toBe(5);
    });

    it('should handle quest without active quest', async () => {
      // Remove the quest
      player.quests.active = [];
      delete player.quests.progress.sweet_tooth_foxes;

      const fox = {
        id: 'fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 5,
        hpMax: 15,
        str: 3,
        def: 1,
        spd: 3,
        status: 'sleep',
        asleep: true,
        hasTeeth: true,
        alive: true
      };
      state.chunk.monsters.push(fox);

      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);

      // Should still collect tooth even without quest
      expect(player.inventory.some(i => i.item?.id === 'fox_sweet_tooth')).toBe(true);
      expect(fox.hasTeeth).toBe(false);
      
      // But no quest progress
      expect(player.quests.progress.sweet_tooth_foxes).toBeUndefined();
    });
  });
});
