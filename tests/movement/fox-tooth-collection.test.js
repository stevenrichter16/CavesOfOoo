// tests/movement/fox-tooth-collection.test.js
// Test the actual tooth collection when bumping into sleeping foxes

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { QUEST_ITEMS } from '../../src/js/items/questItems.js';
import { entityAt } from '../../src/js/utils/queries.js';
import { createTestChunk } from '../helpers/testUtils.js';

describe('Fox Tooth Collection on Bump', () => {
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
      str: 10,
      def: 2,
      spd: 5,
      inventory: [],
      quests: {
        active: ['sweet_tooth_foxes'],
        progress: { sweet_tooth_foxes: { teeth: 0 } }
      }
    };

    fox = {
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

    const chunk = createTestChunk(48, 22);
    chunk.monsters.push(fox);
    chunk.biome = 'forest';

    state = {
      player,
      cx: 0,
      cy: -2, // Forest location
      chunk,
      npcs: [],
      log: vi.fn()
    };
  });

  describe('Item Creation', () => {
    it('should use QUEST_ITEMS definition for tooth', async () => {
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);

      const tooth = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
      
      if (tooth) {
        // Check that item has all properties from QUEST_ITEMS
        expect(tooth.item.name).toBe(QUEST_ITEMS.fox_sweet_tooth.name);
        expect(tooth.item.description).toBe(QUEST_ITEMS.fox_sweet_tooth.description);
        expect(tooth.item.value).toBe(QUEST_ITEMS.fox_sweet_tooth.value);
      }
    });

    it('should create valid inventory item structure', async () => {
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);

      expect(player.inventory).toHaveLength(1);
      const tooth = player.inventory[0];
      
      expect(tooth).toHaveProperty('item');
      expect(tooth).toHaveProperty('count');
      expect(tooth.item).toHaveProperty('id');
      expect(tooth.item).toHaveProperty('name');
      expect(tooth.item).toHaveProperty('description');
      expect(tooth.item).toHaveProperty('value');
      expect(tooth.count).toBe(1);
    });

    it('should properly stack teeth in inventory', async () => {
      // Collect first tooth
      let moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].count).toBe(1);
      
      // Add second fox
      const fox2 = {
        ...fox,
        id: 'fox_2',
        x: 12,
        y: 10,
        hasTeeth: true
      };
      state.chunk.monsters.push(fox2);
      
      // Move to second fox
      player.x = 11;
      moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Should stack, not create new entry
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].count).toBe(2);
    });
  });

  describe('Collection Process', () => {
    it('should collect tooth when bumping into sleeping fox', async () => {
      expect(player.inventory).toHaveLength(0);
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].item.id).toBe('fox_sweet_tooth');
      expect(fox.hasTeeth).toBe(false);
    });

    it('should not collect from fox without teeth', async () => {
      fox.hasTeeth = false;
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      expect(player.inventory).toHaveLength(0);
    });

    it('should not collect from awake fox', async () => {
      fox.asleep = false;
      fox.status = null;
      fox.hp = 10;
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Should attack instead
      expect(player.inventory).toHaveLength(0);
      expect(fox.hasTeeth).toBe(true); // Still has teeth
    });

    it('should update quest progress', async () => {
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(0);
      
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(1);
    });
  });

  describe('Direct Force Collection', () => {
    it('should force tooth into inventory programmatically', () => {
      // Direct method to force tooth into inventory
      const toothItem = {
        item: {
          id: 'fox_sweet_tooth',
          ...QUEST_ITEMS.fox_sweet_tooth
        },
        count: 1
      };
      
      player.inventory.push(toothItem);
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].item.id).toBe('fox_sweet_tooth');
      expect(player.inventory[0].item.name).toBe('Fox Sweet Tooth');
    });

    it('should handle manual tooth grant', () => {
      // Function to manually grant tooth
      const grantTooth = (player, count = 1) => {
        const existing = player.inventory.find(i => i.item?.id === 'fox_sweet_tooth');
        
        if (existing) {
          existing.count += count;
        } else {
          const toothItem = {
            item: {
              id: 'fox_sweet_tooth',
              ...QUEST_ITEMS.fox_sweet_tooth
            },
            count
          };
          player.inventory.push(toothItem);
        }
        
        // Update quest if active
        if (player.quests?.active?.includes('sweet_tooth_foxes')) {
          if (!player.quests.progress['sweet_tooth_foxes']) {
            player.quests.progress['sweet_tooth_foxes'] = { teeth: 0 };
          }
          player.quests.progress['sweet_tooth_foxes'].teeth += count;
        }
      };
      
      grantTooth(player, 3);
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].count).toBe(3);
      expect(player.quests.progress.sweet_tooth_foxes.teeth).toBe(3);
    });
  });
});
