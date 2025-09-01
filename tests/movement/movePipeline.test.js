import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { createMockState, createMockEntity } from '../helpers/testUtils.js';
import { EventType } from '../../src/js/utils/eventTypes.js';
import * as events from '../../src/js/utils/events.js';
import * as queries from '../../src/js/utils/queries.js';
import * as combat from '../../src/js/combat/combat.js';

// Mock dependencies
vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn()
}));

vi.mock('../../src/js/utils/queries.js', () => ({
  entityAt: vi.fn(),
  isPassable: vi.fn(),
  tryEdgeTravel: vi.fn()
}));

vi.mock('../../src/js/combat/combat.js', () => ({
  attack: vi.fn()
}));

describe('Movement Pipeline', () => {
  let state;
  let player;

  beforeEach(() => {
    vi.clearAllMocks();
    
    player = createMockEntity({
      id: 'player',
      x: 5,
      y: 5
    });
    
    state = createMockState({
      player,
      playerId: 'player',
      chunk: {
        map: Array(22).fill(null).map(() => Array(48).fill('.'))
      },
      log: vi.fn(),
      interactTile: vi.fn()
    });
    
    // Default mocks
    queries.entityAt.mockReturnValue(null);
    queries.isPassable.mockReturnValue(true);
    queries.tryEdgeTravel.mockReturnValue(false);
    
    // Default emit behavior - don't cancel movement
    events.emit.mockImplementation(() => {});
  });

  describe('Basic Movement', () => {
    it('should move player to new position', () => {
      const action = { type: 'move', dx: 1, dy: 0 };
      
      const result = runPlayerMove(state, action);
      
      expect(player.x).toBe(6);
      expect(player.y).toBe(5);
      expect(result).toBe(true);
    });

    it('should emit movement events', () => {
      const action = { type: 'move', dx: 0, dy: 1 };
      
      runPlayerMove(state, action);
      
      expect(events.emit).toHaveBeenCalledWith(EventType.WillMove, 
        expect.objectContaining({
          from: { x: 5, y: 5 },
          to: { x: 5, y: 6 }
        })
      );
      
      expect(events.emit).toHaveBeenCalledWith(EventType.DidMove,
        expect.objectContaining({
          from: { x: 5, y: 5 },
          to: { x: 5, y: 6 }
        })
      );
      
      expect(events.emit).toHaveBeenCalledWith(EventType.DidStep,
        expect.objectContaining({
          x: 5,
          y: 6
        })
      );
    });

    it('should handle cancelled movement', () => {
      const action = { type: 'move', dx: 1, dy: 0 };
      
      // Mock WillMove event to cancel movement
      events.emit.mockImplementation((eventType, data) => {
        if (eventType === EventType.WillMove) {
          data.cancel = true;
        }
      });
      
      const result = runPlayerMove(state, action);
      
      expect(player.x).toBe(5); // Position unchanged
      expect(player.y).toBe(5);
      expect(result).toBe(true); // Action consumed
      expect(events.emit).not.toHaveBeenCalledWith(EventType.DidMove, expect.anything());
    });
  });

  describe('Combat', () => {
    it('should attack entity at target position', () => {
      const enemy = createMockEntity({ x: 6, y: 5 });
      queries.entityAt.mockReturnValue(enemy);
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = runPlayerMove(state, action);
      
      expect(combat.attack).toHaveBeenCalledWith(state, player, enemy);
      expect(player.x).toBe(5); // Position unchanged
      expect(result).toBe(true);
    });
  });

  describe('Edge Travel', () => {
    it('should handle edge travel', () => {
      queries.tryEdgeTravel.mockReturnValue(true);
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = runPlayerMove(state, action);
      
      expect(queries.tryEdgeTravel).toHaveBeenCalledWith(state, player, 6, 5);
      expect(result).toBe(true);
      expect(player.x).toBe(5); // Position unchanged (edge travel handles it)
    });
  });

  describe('Blocked Movement', () => {
    it('should block movement on impassable tiles', () => {
      queries.isPassable.mockReturnValue(false);
      queries.entityAt.mockReturnValue(null); // No entity
      queries.tryEdgeTravel.mockReturnValue(false); // No edge travel
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = runPlayerMove(state, action);
      
      expect(player.x).toBe(5); // Position unchanged
      expect(events.emit).toHaveBeenCalledWith(EventType.BlockedMove,
        expect.objectContaining({
          to: { x: 6, y: 5 },
          blocker: 'wall'
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('Water Effects', () => {
    it('should apply water_slow when entering water', () => {
      state.chunk.map[5][6] = '~'; // Water tile at destination (map[y][x])
      state.player.statusEffects = []; // Use state.player, not local player
      
      const action = { type: 'move', dx: 1, dy: 0 };
      runPlayerMove(state, action);
      
      expect(state.player.statusEffects).toHaveLength(1);
      expect(state.player.statusEffects[0]).toMatchObject({
        type: 'water_slow',
        duration: 0,
        speedReduction: 2
      });
      expect(state.log).toHaveBeenCalledWith(
        state,
        "You wade into the water. Your movement slows.",
        "note"
      );
    });

    it('should not reapply water_slow when already in water', () => {
      state.chunk.map[5][6] = '~'; // map[y][x]
      state.player.statusEffects = [{
        type: 'water_slow',
        duration: 0,
        speedReduction: 2
      }];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      runPlayerMove(state, action);
      
      expect(state.player.statusEffects).toHaveLength(1);
      expect(state.log).not.toHaveBeenCalledWith(
        state,
        "You wade into the water. Your movement slows.",
        "note"
      );
    });

    it('should set duration when leaving water', () => {
      state.chunk.map[5][5] = '~'; // Current position is water
      state.chunk.map[6][5] = '.'; // Moving to land
      state.player.statusEffects = [{
        type: 'water_slow',
        duration: 0,
        speedReduction: 2
      }];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      runPlayerMove(state, action);
      
      expect(state.player.statusEffects[0].duration).toBe(3);
      expect(state.log).toHaveBeenCalledWith(
        state,
        "You emerge from the water, still dripping wet.",
        "note"
      );
    });
  });

  describe('Tile Interactions', () => {
    it('should call interactTile after movement', () => {
      const action = { type: 'move', dx: 1, dy: 0 };
      
      runPlayerMove(state, action);
      
      expect(state.interactTile).toHaveBeenCalledWith(
        state,
        6, // New x position
        5, // New y position
        state.openVendorShop
      );
    });
  });

  describe('Invalid Actions', () => {
    it('should return false for non-move actions', () => {
      const result = runPlayerMove(state, { type: 'attack' });
      expect(result).toBe(false);
    });

    it('should return false for null action', () => {
      const result = runPlayerMove(state, null);
      expect(result).toBe(false);
    });

    it('should return false for undefined action', () => {
      const result = runPlayerMove(state, undefined);
      expect(result).toBe(false);
    });
  });
});