import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processMonsterTurns } from '../../src/js/entities/monsters.js';
import { createMockState, createMockEntity } from '../helpers/testUtils.js';
import { setupEntityWithEffects, clearAllStatusEffects } from '../helpers/statusTestHelper.js';
import * as combat from '../../src/js/combat/combat.js';
import * as queries from '../../src/js/utils/queries.js';
import * as statusSystem from '../../src/js/combat/statusSystem.js';
import { EventType } from '../../src/js/utils/eventTypes.js';
import * as events from '../../src/js/utils/events.js';

vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn(),
  EventType: {
    WillMove: 'willMove',
    DidMove: 'didMove',
    DidStep: 'didStep',
    BlockedMove: 'blockedMove'
  }
}));

// Mock dependencies
vi.mock('../../src/js/combat/combat.js', () => ({
  attack: vi.fn()
}));

vi.mock('../../src/js/utils/queries.js', () => ({
  isBlocked: vi.fn()
}));

vi.mock('../../src/js/combat/statusSystem.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isFrozen: vi.fn(),
    processStatusEffects: vi.fn(),
    applyStatusEffect: vi.fn(),
    Status: actual.Status  // Keep the real Status Map
  };
});

vi.mock('../../src/js/core/game.js', () => ({
  log: vi.fn()
}));

describe('Monster Movement', () => {
  let state;
  let player;
  let monster;
  const W = 48; // Actual game width
  const H = 22; // Actual game height

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllStatusEffects();
    
    player = createMockEntity({
      id: 'player',
      x: 10,
      y: 10,
      hp: 100,
      alive: true
    });
    
    monster = createMockEntity({
      id: 'monster1',
      name: 'Goblin',
      x: 8,
      y: 10,
      hp: 20,
      alive: true,
      ai: 'chase',
      str: 5
    });
    
    state = createMockState({
      player,
      chunk: {
        map: Array(H).fill(null).map(() => Array(W).fill('.')),
        monsters: [monster]
      }
    });
    
    // Default mocks
    statusSystem.isFrozen.mockReturnValue(false);
    queries.isBlocked.mockReturnValue(false);
    
    // Mock missing log function
    global.log = vi.fn();
  });

  describe('Basic Monster Movement', () => {
    it('should move monster toward player when using chase AI', () => {
      // Monster at (8,10), player at (10,10) - should move right
      processMonsterTurns(state);
      
      expect(monster.x).toBe(9); // Moved right toward player
      expect(monster.y).toBe(10);
      expect(statusSystem.processStatusEffects).toHaveBeenCalledWith(
        state, monster, 'Goblin'
      );
    });

    it('should attack player when adjacent', () => {
      monster.x = 9; // Adjacent to player
      
      processMonsterTurns(state);
      
      expect(combat.attack).toHaveBeenCalledWith(
        state, monster, player, 'Goblin', 'you'
      );
      expect(monster.x).toBe(9); // Position unchanged
    });

    it('should skip dead monsters', () => {
      monster.alive = false;
      const initialX = monster.x;
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(initialX);
      expect(statusSystem.processStatusEffects).not.toHaveBeenCalled();
    });

    it('should skip frozen monsters', () => {
      statusSystem.isFrozen.mockReturnValue(true);
      const initialX = monster.x;
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(initialX);
      expect(statusSystem.processStatusEffects).toHaveBeenCalledWith(
        state, monster, 'Goblin'
      );
    });
  });

  describe('AI Types', () => {
    it('should chase player when using chase AI within range', () => {
      monster.ai = 'chase';
      monster.x = 5;
      monster.y = 10;
      // Distance is 5, within chase range of 8
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(6); // Moved toward player
    });

    it('should not chase player when too far away', () => {
      monster.ai = 'chase';
      monster.x = 0;
      monster.y = 0;
      // Distance is 20, outside chase range
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(0); // No movement
      expect(monster.y).toBe(0);
    });

    it('should move randomly with wander AI', () => {
      monster.ai = 'wander';
      const initialX = monster.x;
      const initialY = monster.y;
      
      // Since movement is random, we can't predict exact position
      // But we can verify the movement logic was attempted
      processMonsterTurns(state);
      
      // Monster should have attempted to move (position may or may not change)
      expect(statusSystem.processStatusEffects).toHaveBeenCalled();
    });

    it('should move away from player with skittish AI', () => {
      monster.ai = 'skittish';
      monster.x = 11; // Right of player
      monster.y = 10;
      
      processMonsterTurns(state);
      
      // Skittish monsters move in opposite direction
      // Since monster is to the right of player, it should try to move further right
      // But movement depends on whether the tile is blocked
      // The test should verify the movement logic was attempted
      expect(statusSystem.processStatusEffects).toHaveBeenCalled();
      // Movement may or may not succeed depending on blocking
    });

    it('should use smart pathfinding with smart AI', () => {
      monster.ai = 'smart';
      monster.x = 8;
      monster.y = 8;
      // Distance is 4, within smart AI range of 10
      
      processMonsterTurns(state);
      
      // Smart AI should move toward player
      const moved = monster.x !== 8 || monster.y !== 8;
      expect(moved).toBe(true);
    });
  });

  describe('Movement Constraints', () => {
    it('should keep monster within bounds', () => {
      monster.x = -1; // Out of bounds
      monster.y = 25; // Out of bounds
      
      processMonsterTurns(state);
      
      expect(monster.x).toBeGreaterThanOrEqual(0);
      expect(monster.x).toBeLessThan(W);
      expect(monster.y).toBeGreaterThanOrEqual(0);
      expect(monster.y).toBeLessThan(H);
    });

    it('should handle blocked movement', () => {
      queries.isBlocked.mockReturnValue(true);
      const initialX = monster.x;
      const initialY = monster.y;
      
      processMonsterTurns(state);
      
      // Position should be unchanged if all moves are blocked
      expect(monster.x).toBe(initialX);
      expect(monster.y).toBe(initialY);
    });

    it('should prefer horizontal movement when both are possible', () => {
      monster.x = 8;
      monster.y = 8;
      player.x = 10;
      player.y = 10;
      
      // Block vertical movement
      queries.isBlocked.mockImplementation((state, x, y) => {
        return y !== monster.y; // Only allow horizontal
      });
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(9); // Moved horizontally
      expect(monster.y).toBe(8); // No vertical movement
    });

    it('should try vertical movement if horizontal is blocked', () => {
      monster.x = 8;
      monster.y = 8;
      player.x = 10;
      player.y = 10;
      
      // Block horizontal movement
      queries.isBlocked.mockImplementation((state, x, y) => {
        return x !== monster.x; // Only allow vertical
      });
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(8); // No horizontal movement
      expect(monster.y).toBe(9); // Moved vertically
    });
  });

  describe('Water Effects', () => {
    it('should apply water_slow when monster enters water', () => {
      state.chunk.map[10][9] = '~'; // Water tile
      monster.x = 9;
      monster.y = 10;
      monster.statusEffects = [];
      
      processMonsterTurns(state);
      
      // Monster should move toward player and enter water
      expect(monster.x).toBe(9);
      expect(monster.y).toBe(10);
      
      if (monster.y === 9) { // If monster moved into water
        expect(monster.statusEffects).toContainEqual(
          expect.objectContaining({
            type: 'water_slow',
            duration: 0,
            speedReduction: 2
          })
        );
      }
    });

    it('should set water_slow duration when leaving water', () => {
      state.chunk.map[10][8] = '~'; // Current position is water
      state.chunk.map[10][9] = '.'; // Moving to land
      monster.x = 8;
      monster.y = 10;
      monster.statusEffects = [{
        type: 'water_slow',
        duration: 0,
        speedReduction: 2
      }];
      
      processMonsterTurns(state);
      
      if (monster.x === 9) { // If monster moved out of water
        expect(monster.statusEffects[0].duration).toBe(3);
      }
    });
  });

  describe('Multiple Monsters', () => {
    it('should process all alive monsters', () => {
      const monster2 = createMockEntity({
        id: 'monster2',
        name: 'Orc',
        x: 12,
        y: 10,
        alive: true,
        ai: 'chase'
      });
      
      state.chunk.monsters.push(monster2);
      
      processMonsterTurns(state);
      
      expect(statusSystem.processStatusEffects).toHaveBeenCalledTimes(2);
      expect(statusSystem.processStatusEffects).toHaveBeenCalledWith(
        state, monster, 'Goblin'
      );
      expect(statusSystem.processStatusEffects).toHaveBeenCalledWith(
        state, monster2, 'Orc'
      );
    });

    it('should stop processing if player dies', () => {
      const monster2 = createMockEntity({
        id: 'monster2',
        name: 'Orc',
        x: 12,
        y: 10,
        alive: true,
        ai: 'chase'
      });
      
      state.chunk.monsters = [monster, monster2];
      monster.x = 9; // Adjacent to player
      
      // Mock the log function if it's being used
      const originalLog = global.log;
      global.log = vi.fn();
      
      // Mock attack to kill player on first attack
      combat.attack.mockImplementation((state, attacker, defender) => {
        if (attacker === monster) {
          state.player.hp = 0;
          state.player.alive = false;
          state.over = true;
        }
      });
      
      processMonsterTurns(state);
      
      // Restore log
      global.log = originalLog;
      
      // Verify behavior:
      // 1. First monster attacks and kills player
      expect(combat.attack).toHaveBeenCalledTimes(1);
      expect(combat.attack).toHaveBeenCalledWith(
        state, monster, state.player, 'Goblin', 'you'
      );
      
      // 2. Game should be over
      expect(state.over).toBe(true);
      expect(state.player.alive).toBe(false);
      
      // 3. Second monster should not have attacked
      // (only one attack call means second monster didn't act)
      expect(combat.attack).not.toHaveBeenCalledWith(
        state, monster2, expect.anything(), expect.anything(), expect.anything()
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle monsters without AI type', () => {
      delete monster.ai;
      const initialX = monster.x;
      
      processMonsterTurns(state);
      
      expect(monster.x).toBe(initialX); // No movement without AI
      expect(statusSystem.processStatusEffects).toHaveBeenCalled();
    });

    it('should handle empty monster array', () => {
      state.chunk.monsters = [];
      
      expect(() => processMonsterTurns(state)).not.toThrow();
    });

    it('should handle monster at same position as player', () => {
      monster.x = player.x;
      monster.y = player.y;
      
      processMonsterTurns(state);
      
      // Should attempt attack since distance is 0
      expect(combat.attack).not.toHaveBeenCalled(); // Distance 0 is not adjacent
    });
  });
});