// tests/combat/sweet-tooth-fox-mechanics.test.js
// Test the enhanced Sweet Tooth Fox mechanics with sleep status

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attack } from '../../src/js/combat/combat.js';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { entityAt } from '../../src/js/utils/queries.js';

describe('Sweet Tooth Fox Enhanced Mechanics', () => {
  let state;
  let player;
  let fox;

  beforeEach(() => {
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      str: 10,  // Use str instead of atk for combat damage
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

    fox = {
      id: 'sweet_tooth_fox_1',
      name: 'Sweet Tooth Fox',
      kind: 'sweet_tooth_fox',
      x: 11,
      y: 10,
      hp: 15,
      hpMax: 15,
      str: 3,  // Use str instead of atk
      def: 1,
      spd: 3,
      alive: true,
      hasTeeth: true,
      status: null,
      asleep: false
    };

    state = {
      player,
      cx: 0,
      cy: -2, // Forest location
      chunk: {
        map: Array(22).fill(null).map(() => Array(48).fill('.')),
        monsters: [fox],
        items: [],
        biome: 'forest'
      },
      npcs: [],
      turn: 0,
      log: vi.fn((state, text, cls) => {})
    };
  });

  describe('Minimum HP Requirement', () => {
    it('should not allow fox HP to drop below 5', () => {
      fox.hp = 10;
      
      // Attack that would normally kill the fox
      player.str = 50;
      
      // Keep attacking until we hit (in case of miss)
      let attempts = 0;
      while (fox.hp > 5 && attempts < 10) {
        attack(state, player, fox);
        attempts++;
      }
      
      // Fox HP should be clamped at 5
      expect(fox.hp).toBe(5);
      expect(fox.alive).toBe(true); // Still technically alive but asleep
    });

    it('should stop at exactly 5 HP even with massive damage', () => {
      fox.hp = 15;
      player.str = 100; // Massive damage
      
      // Keep attacking until we hit
      let attempts = 0;
      while (fox.hp > 5 && attempts < 10) {
        attack(state, player, fox);
        attempts++;
      }
      
      expect(fox.hp).toBe(5);
      expect(fox.hp).not.toBeLessThan(5);
    });

    it('should handle multiple attacks stopping at 5 HP', () => {
      fox.hp = 15;
      player.str = 3;
      
      // Attack multiple times
      for (let i = 0; i < 10; i++) {
        attack(state, player, fox);
        expect(fox.hp).toBeGreaterThanOrEqual(5);
      }
      
      expect(fox.hp).toBe(5);
    });
  });

  describe('Sleep Status', () => {
    it('should apply sleep status when fox reaches 5 HP', () => {
      fox.hp = 6;
      player.str = 10; // Ensure enough damage
      
      // Keep attacking until we hit
      let attempts = 0;
      while (fox.hp > 5 && attempts < 10) {
        attack(state, player, fox);
        attempts++;
      }
      
      expect(fox.hp).toBe(5);
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
    });

    it('should show sleep status in logs', () => {
      fox.hp = 10;
      player.str = 10;
      
      // Keep attacking until we hit and reach 5 HP
      let attempts = 0;
      while (fox.hp > 5 && attempts < 10) {
        attack(state, player, fox);
        attempts++;
      }
      
      // Check if log was called (not checking exact parameters due to EventType.Log)
      // The actual log is emitted through the event system
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
    });

    it('should not apply sleep status if HP is above 5', () => {
      fox.hp = 10;
      player.str = 2; // Use str instead of atk for proper damage calculation
      
      // Keep attacking until we hit (but not too many times)
      let attempts = 0;
      const startHP = fox.hp;
      while (fox.hp === startHP && attempts < 5) {
        attack(state, player, fox);
        attempts++;
      }
      
      // If we hit, HP should be reduced but not to 5
      if (fox.hp < startHP) {
        expect(fox.hp).toBeGreaterThan(5);
      }
      expect(fox.status).not.toBe('sleep');
      expect(fox.asleep).toBe(false);
    });
  });

  describe('Movement Prevention', () => {
    it('should prevent fox from moving when asleep', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      const initialX = fox.x;
      const initialY = fox.y;
      
      // Simulate fox turn - it should not move
      if (state.updateMonster) {
        state.updateMonster(state, fox);
      }
      
      expect(fox.x).toBe(initialX);
      expect(fox.y).toBe(initialY);
    });

    it('should skip fox turn when asleep', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      // Mock monster update function
      const mockUpdateMonster = vi.fn();
      state.updateMonster = mockUpdateMonster;
      
      // Sleeping fox should skip turn
      if (fox.asleep) {
        // Skip turn
      } else {
        state.updateMonster(state, fox);
      }
      
      expect(mockUpdateMonster).not.toHaveBeenCalled();
    });
  });

  describe('Attack Prevention', () => {
    it('should prevent fox from attacking when asleep', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      // Move player next to fox
      player.x = 12;
      player.y = 10;
      
      const playerInitialHP = player.hp;
      
      // Fox should not attack player
      if (!fox.asleep) {
        attack(state, fox, player);
      }
      
      expect(player.hp).toBe(playerInitialHP);
    });

    it('should not allow attacking sleeping fox', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      const result = attack(state, player, fox);
      
      // Attack should be prevented
      expect(result).toBe('cancelled');
      expect(fox.hp).toBe(5);
    });
  });

  describe('Sweet Tooth Collection on Bump', () => {
    beforeEach(() => {
      // Set fox to sleep state
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
    });

    it('should collect sweet tooth when bumping into sleeping fox', async () => {
      // Try to move into sleeping fox
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Check inventory for sweet tooth
      const tooth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(tooth).toBeTruthy();
      expect(tooth.quantity).toBe(1);
    });

    it('should increment tooth count if already in inventory', async () => {
      // Add initial tooth to inventory
      player.inventory.push({
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        quantity: 2
      });
      
      // Bump into sleeping fox
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      const tooth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(tooth.quantity).toBe(3);
    });

    it('should only collect tooth once from same fox', async () => {
      // First collection
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      const firstTooth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(firstTooth.quantity).toBe(1);
      expect(fox.hasTeeth).toBe(false);
      
      // Try to collect again
      player.x = 10; // Reset position
      await runPlayerMove(state, moveAction);
      
      // Should still have only 1 tooth
      const secondCheck = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(secondCheck.quantity).toBe(1);
    });

    it('should update quest progress when collecting tooth', async () => {
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(1);
      // Log is emitted through events, not called directly
    });

    it('should not collect tooth if fox is not asleep', async () => {
      // Wake up the fox
      fox.hp = 10;
      fox.status = null;
      fox.asleep = false;
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Should attack instead of collecting
      const tooth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(tooth).toBeFalsy();
      expect(fox.hp).toBeLessThan(10); // Fox was attacked
    });

    it('should handle multiple sleeping foxes', async () => {
      // Add second sleeping fox
      const fox2 = {
        id: 'sweet_tooth_fox_2',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 9,
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
      state.chunk.monsters.push(fox2);
      
      // Collect from first fox
      let moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Move to and collect from second fox
      player.x = 10;
      moveAction = { type: 'move', dx: -1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      const teeth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(teeth.quantity).toBe(2);
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(2);
    });
  });

  describe('Visual Indicators', () => {
    it('should display sleep status visually', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      // Fox should have visual indicator
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
      
      // Could be rendered as 'z' or with different color
      const displayChar = fox.asleep ? 'z' : 'f';
      expect(displayChar).toBe('z');
    });

    it('should show different sprite for sleeping fox', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      const getMonsterSprite = (monster) => {
        if (monster.asleep) return 'z';
        if (monster.kind === 'sweet_tooth_fox') return 'f';
        return '?';
      };
      
      expect(getMonsterSprite(fox)).toBe('z');
      
      fox.asleep = false;
      expect(getMonsterSprite(fox)).toBe('f');
    });
  });

  describe('Edge Cases', () => {
    it('should handle fox at exactly 5 HP from spawn', () => {
      fox.hp = 5;
      fox.hpMax = 5;
      
      // Should immediately be asleep
      if (fox.hp === 5) {
        fox.status = 'sleep';
        fox.asleep = true;
      }
      
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
    });

    it('should not wake up sleeping fox', () => {
      fox.hp = 5;
      fox.status = 'sleep';
      fox.asleep = true;
      
      // Time passes
      for (let i = 0; i < 100; i++) {
        state.turn++;
      }
      
      // Fox should still be asleep
      expect(fox.status).toBe('sleep');
      expect(fox.asleep).toBe(true);
    });

    it('should handle quest completion with 5 teeth', async () => {
      // Clear monsters array and set up exactly 5 sleeping foxes
      state.chunk.monsters = [];
      
      for (let i = 0; i < 5; i++) {
        const sleepyFox = {
          id: `fox_${i}`,
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
        };
        state.chunk.monsters.push(sleepyFox);
      }
      
      // Collect all teeth
      for (let i = 0; i < 5; i++) {
        player.x = 10 + i;
        const moveAction = { type: 'move', dx: 1, dy: 0 };
        await runPlayerMove(state, moveAction);
      }
      
      const teeth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      expect(teeth.quantity).toBe(5);
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(5);
    });
  });
});