import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handlePlayerMove, waitTurn } from '../../src/js/movement/playerMovement.js';
import { W, H } from '../../src/js/core/config.js';
import { createMockState, createMockEntity } from '../helpers/testUtils.js';
import { setupEntityWithEffects, clearAllStatusEffects } from '../helpers/statusTestHelper.js';
import * as events from '../../src/js/utils/events.js';
import * as movePipeline from '../../src/js/movement/movePipeline.js';

// Mock dependencies
vi.mock('../../src/js/movement/movePipeline.js', () => ({
  runPlayerMove: vi.fn()
}));

vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn(),
  EventType: {
    MovementBlocked: 'movementBlocked'
  }
}));

vi.mock('../../src/js/core/game.js', () => ({
  log: vi.fn()
}));

describe('Player Movement', () => {
  let state;
  let player;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllStatusEffects();
    
    player = createMockEntity({
      id: 'player',
      x: 5,
      y: 5,
      hp: 80,
      hpMax: 100,
      turnsSinceRest: 5
    });
    
    state = createMockState({
      player,
      over: false,
      openVendorShop: vi.fn(),
      FETCH_ITEMS: []
    });
    
    // Setup default mock return
    movePipeline.runPlayerMove.mockReturnValue(true);
  });

  describe('handlePlayerMove', () => {
    it('should process normal movement', () => {
      const result = handlePlayerMove(state, 1, 0);
      
      expect(movePipeline.runPlayerMove).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          W: W,
          H: H
        }),
        expect.objectContaining({
          type: 'move',
          dx: 1,
          dy: 0
        })
      );
      expect(result).toBe(true);
    });

    it('should not move if game is over', () => {
      state.over = true;
      
      const result = handlePlayerMove(state, 1, 0);
      
      expect(movePipeline.runPlayerMove).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should block movement when player is frozen', () => {
      setupEntityWithEffects(player, [
        { type: 'freeze', turns: 2, value: 0 }
      ]);
      
      const result = handlePlayerMove(state, 1, 0);
      
      expect(movePipeline.runPlayerMove).not.toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith(
        'movementBlocked',
        expect.objectContaining({
          reason: 'frozen',
          player
        })
      );
      expect(result).toBe(true); // Action consumed
    });

    it('should add required state properties for pipeline', () => {
      handlePlayerMove(state, 0, 1);
      
      expect(state.W).toBe(W);
      expect(state.H).toBe(H);
      expect(state.FETCH_ITEMS).toEqual([]);
      expect(typeof state.interactTile).toBe('function');
    });

    it('should handle diagonal movement', () => {
      handlePlayerMove(state, 1, 1);
      
      expect(movePipeline.runPlayerMove).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dx: 1,
          dy: 1
        })
      );
    });

    it('should handle negative movement', () => {
      handlePlayerMove(state, -1, -1);
      
      expect(movePipeline.runPlayerMove).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dx: -1,
          dy: -1
        })
      );
    });
  });

  describe('waitTurn', () => {
    it('should allow player to wait and heal', () => {
      const result = waitTurn(state);
      
      expect(player.turnsSinceRest).toBe(0);
      expect(player.hp).toBe(81); // Healed 1 HP
      expect(result).toBe(true);
    });

    it('should not heal beyond max HP', () => {
      player.hp = player.hpMax;
      
      waitTurn(state);
      
      expect(player.hp).toBe(player.hpMax);
    });

    it('should not wait if game is over', () => {
      state.over = true;
      
      const result = waitTurn(state);
      
      expect(result).toBeUndefined();
      expect(player.turnsSinceRest).toBe(5); // Unchanged
    });

    it('should block waiting when frozen', () => {
      setupEntityWithEffects(player, [
        { type: 'freeze', turns: 1, value: 0 }
      ]);
      
      const result = waitTurn(state);
      
      expect(player.turnsSinceRest).toBe(5); // Unchanged
      expect(player.hp).toBe(80); // No heal
      expect(result).toBe(true); // Action still consumed
    });

    it('should reset turns since rest counter', () => {
      player.turnsSinceRest = 10;
      
      waitTurn(state);
      
      expect(player.turnsSinceRest).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined movement deltas', () => {
      const result = handlePlayerMove(state, undefined, undefined);
      
      expect(movePipeline.runPlayerMove).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dx: undefined,
          dy: undefined
        })
      );
    });

    it('should handle zero movement', () => {
      const result = handlePlayerMove(state, 0, 0);
      
      expect(movePipeline.runPlayerMove).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dx: 0,
          dy: 0
        })
      );
    });

    it('should handle player without ID', () => {
      delete player.id;
      
      const result = handlePlayerMove(state, 1, 0);
      
      expect(result).toBe(true);
      expect(movePipeline.runPlayerMove).toHaveBeenCalled();
    });
  });
});