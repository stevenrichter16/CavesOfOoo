import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { QUEST_ITEMS } from '../../src/js/items/questItems.js';

describe('Fox Sweet Tooth Collection - New Pipeline', () => {
  let pipeline;
  let state;
  let action;

  beforeEach(() => {
    // Create a new pipeline instance
    pipeline = new MovementPipeline();
    
    // Create base state with player and sleeping fox
    state = {
      player: {
        x: 10,
        y: 10,
        inventory: [],
        quests: {
          active: ['sweet_tooth_foxes'],
          progress: {
            'sweet_tooth_foxes': { teeth: 0 }
          }
        }
      },
      chunk: {
        monsters: [
          {
            x: 11,
            y: 10,
            kind: 'sweet_tooth_fox',
            name: 'Sweet Tooth Fox',
            hp: 5,
            hpMax: 15,
            asleep: true,
            hasTeeth: true,
            alive: true
          }
        ],
        map: Array(20).fill(null).map(() => Array(40).fill('.'))
      },
      npcs: [],
      cx: 0,
      cy: 0,
      W: 40,
      H: 20,
      log: vi.fn()
    };
    
    // Move right into the fox
    action = { type: 'move', dx: 1, dy: 0 };
  });

  describe('Basic tooth collection', () => {
    it('should add tooth to empty inventory when bumping sleeping fox', () => {
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should not move (blocked by fox)
      expect(state.player.x).toBe(10);
      expect(state.player.y).toBe(10);
      
      // Should have tooth in inventory
      expect(state.player.inventory).toHaveLength(1);
      expect(state.player.inventory[0]).toMatchObject({
        type: 'item',
        item: {
          id: 'fox_sweet_tooth',
          name: QUEST_ITEMS.fox_sweet_tooth.name,
          description: QUEST_ITEMS.fox_sweet_tooth.description
        },
        count: 1
      });
      
      // Fox should no longer have teeth
      expect(state.chunk.monsters[0].hasTeeth).toBe(false);
    });

    it('should stack teeth with existing ones in inventory', () => {
      // Add one tooth to inventory first
      state.player.inventory = [{
        type: 'item',
        item: {
          id: 'fox_sweet_tooth',
          ...QUEST_ITEMS.fox_sweet_tooth
        },
        id: 'item_test_1',
        count: 2
      }];
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should still have one inventory slot
      expect(state.player.inventory).toHaveLength(1);
      
      // Count should increase
      expect(state.player.inventory[0].count).toBe(3);
    });

    it('should update quest progress when collecting tooth', () => {
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Quest progress should update
      expect(state.player.quests.progress['sweet_tooth_foxes'].teeth).toBe(1);
    });

    it('should not collect tooth from awake fox', () => {
      // Make fox awake
      state.chunk.monsters[0].asleep = false;
      state.chunk.monsters[0].hp = 10;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should not have tooth
      expect(state.player.inventory).toHaveLength(0);
      
      // Fox should still have teeth
      expect(state.chunk.monsters[0].hasTeeth).toBe(true);
    });

    it('should not collect tooth from fox that already had teeth removed', () => {
      // Fox already had teeth removed
      state.chunk.monsters[0].hasTeeth = false;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should not have tooth
      expect(state.player.inventory).toHaveLength(0);
    });

    it('should handle multiple foxes correctly', () => {
      // Add another sleeping fox
      state.chunk.monsters.push({
        x: 12,
        y: 10,
        kind: 'sweet_tooth_fox',
        name: 'Sweet Tooth Fox',
        hp: 5,
        asleep: true,
        hasTeeth: true,
        alive: true
      });
      
      // Collect from first fox
      let result = pipeline.executeSync(state, action);
      expect(state.player.inventory[0].count).toBe(1);
      expect(state.chunk.monsters[0].hasTeeth).toBe(false);
      expect(state.chunk.monsters[1].hasTeeth).toBe(true);
      
      // Move to second fox
      state.player.x = 11;
      result = pipeline.executeSync(state, action);
      
      // Should have 2 teeth now
      expect(state.player.inventory[0].count).toBe(2);
      expect(state.chunk.monsters[1].hasTeeth).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle fox at chunk boundary', () => {
      // Place fox at edge
      state.chunk.monsters[0].x = 39;
      state.chunk.monsters[0].y = 10;
      state.player.x = 38;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should collect tooth
      expect(state.player.inventory).toHaveLength(1);
    });

    it('should work without active quest', () => {
      // Remove quest
      state.player.quests = { active: [], progress: {} };
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should still collect tooth
      expect(state.player.inventory).toHaveLength(1);
    });

    it('should work with null inventory', () => {
      // Start with null inventory
      state.player.inventory = null;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should create inventory and add tooth
      expect(state.player.inventory).toBeInstanceOf(Array);
      expect(state.player.inventory).toHaveLength(1);
      expect(state.player.inventory[0].item.id).toBe('fox_sweet_tooth');
    });

    it('should only collect from fox at exact target position', () => {
      // Add another fox nearby but not at target
      state.chunk.monsters.push({
        x: 11,
        y: 11,
        kind: 'sweet_tooth_fox',
        hp: 5,
        asleep: true,
        hasTeeth: true
      });
      
      // Execute movement (targeting 11, 10)
      const result = pipeline.executeSync(state, action);
      
      // Should only collect from fox at target position
      expect(state.player.inventory[0].count).toBe(1);
      expect(state.chunk.monsters[0].hasTeeth).toBe(false);
      expect(state.chunk.monsters[1].hasTeeth).toBe(true);
    });
  });

  describe('Logging and feedback', () => {
    it('should log extraction message', () => {
      const mockLog = vi.fn();
      state.log = mockLog;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should log extraction - log is called with (state, message, class)
      expect(mockLog).toHaveBeenCalledWith(
        state,
        expect.stringContaining('extract'),
        expect.any(String)
      );
    });

    it('should log quest progress', () => {
      const mockLog = vi.fn();
      state.log = mockLog;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should log progress - log is called with (state, message, class)
      expect(mockLog).toHaveBeenCalledWith(
        state,
        expect.stringContaining('1/5'),
        expect.any(String)
      );
    });

    it('should log when fox has no teeth', () => {
      const mockLog = vi.fn();
      state.log = mockLog;
      state.chunk.monsters[0].hasTeeth = false;
      
      // Execute movement
      const result = pipeline.executeSync(state, action);
      
      // Should log no teeth message - log is called with (state, message, class)
      expect(mockLog).toHaveBeenCalledWith(
        state,
        expect.stringContaining('already'),
        expect.any(String)
      );
    });
  });
});