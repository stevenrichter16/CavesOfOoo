// tests/social/movement-blocking-test.js
// Test for movement blocking issue after NPC interaction

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { emit, on } from '../../src/js/utils/events.js';
import { EventType } from '../../src/js/utils/eventTypes.js';

describe('Movement Blocking After NPC Interaction', () => {
  let state;
  let player;
  let eventLog;

  beforeEach(() => {
    // Set to use original pipeline
    process.env.USE_NEW_MOVEMENT = 'false';
    
    eventLog = [];
    
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30
    };
    
    state = {
      player: player,
      playerId: 'player',
      cx: 1,
      cy: 0,
      chunk: {
        map: Array(22).fill(null).map(() => Array(48).fill('.')),
        monsters: [],
        items: []
      },
      npcs: [],
      log: vi.fn(),
      openNPCInteraction: vi.fn()
    };

    // Track all events
    Object.values(EventType).forEach(eventType => {
      on(eventType, (data) => {
        eventLog.push({ type: eventType, data });
      });
    });
  });

  describe('Event Flow During NPC Bump', () => {
    it('should emit correct events when bumping into NPC', async () => {
      const npc = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      state.npcs = [npc];
      
      // Clear event log
      eventLog = [];
      
      // Try to move into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      await runPlayerMove(state, moveAction);
      
      // Check WillMove event was emitted
      const willMoveEvent = eventLog.find(e => e.type === EventType.WillMove);
      expect(willMoveEvent).toBeTruthy();
      expect(willMoveEvent.data.from).toEqual({ x: 10, y: 10 });
      expect(willMoveEvent.data.to).toEqual({ x: 11, y: 10 });
      
      // Check NPCInteraction event was emitted
      const interactionEvent = eventLog.find(e => e.type === EventType.NPCInteraction);
      expect(interactionEvent).toBeTruthy();
      expect(interactionEvent.data.npc).toBe(npc);
      
      // Should NOT emit DidMove (player didn't actually move)
      const didMoveEvent = eventLog.find(e => e.type === EventType.DidMove);
      expect(didMoveEvent).toBeFalsy();
    });

    it('should not have cancel flag stuck after NPC interaction', async () => {
      const npc = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 11,
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      state.npcs = [npc];
      
      // Bump into NPC
      await runPlayerMove(state, { type: 'move', dx: 1, dy: 0 });
      
      // Clear event log
      eventLog = [];
      
      // Try vertical movement after interaction
      const moveUp = { type: 'move', dx: 0, dy: -1 };
      await runPlayerMove(state, moveUp);
      
      // Check that WillMove wasn't cancelled
      const willMoveEvent = eventLog.find(e => e.type === EventType.WillMove);
      expect(willMoveEvent).toBeTruthy();
      expect(willMoveEvent.data.cancel).toBe(false);
      
      // Player should have moved
      expect(player.y).toBe(9);
    });
  });

  describe('Movement State After Failed Dialogue', () => {
    it('should allow all directional movement after NPC interaction', async () => {
      const npc = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 15, // Far from player
        y: 10,
        hp: 20,
        chunkX: 1,
        chunkY: 0
      };
      state.npcs = [npc];
      
      // Move into NPC position first
      player.x = 14;
      player.y = 10;
      
      // Bump into NPC
      await runPlayerMove(state, { type: 'move', dx: 1, dy: 0 });
      expect(state.openNPCInteraction).toHaveBeenCalled();
      
      // Reset player position for movement tests
      player.x = 10;
      player.y = 10;
      
      // Test all four directions
      const movements = [
        { dx: 0, dy: -1, expectedY: 9, name: 'up' },
        { dx: 0, dy: 1, expectedY: 11, name: 'down' },
        { dx: -1, dy: 0, expectedX: 9, name: 'left' },
        { dx: 1, dy: 0, expectedX: 11, name: 'right' }
      ];
      
      for (const move of movements) {
        // Reset position
        player.x = 10;
        player.y = 10;
        
        // Try movement
        const result = await runPlayerMove(state, { type: 'move', dx: move.dx, dy: move.dy });
        expect(result).toBe(true);
        
        // Check position changed
        if (move.expectedX) {
          expect(player.x).toBe(move.expectedX);
        }
        if (move.expectedY) {
          expect(player.y).toBe(move.expectedY);
        }
      }
    });

    it('should not have any hidden state blocking vertical movement', async () => {
      // Simulate what might happen with dialogue state
      state.ui = {
        dialogueTreeOpen: false,
        socialMenuOpen: false,
        selectedNPCId: 'some_npc' // Partially set state
      };
      
      // Movement should still work
      const moveUp = { type: 'move', dx: 0, dy: -1 };
      await runPlayerMove(state, moveUp);
      expect(player.y).toBe(9);
      
      const moveDown = { type: 'move', dx: 0, dy: 1 };
      await runPlayerMove(state, moveDown);
      expect(player.y).toBe(10);
    });
  });

  describe('Event Listener State', () => {
    it('should not have persistent event listeners blocking movement', async () => {
      // Create a mock event handler that might interfere
      let blockVertical = false;
      on(EventType.WillMove, (data) => {
        if (blockVertical && data.to.y !== data.from.y) {
          data.cancel = true;
        }
      });
      
      // Enable blocking
      blockVertical = true;
      
      // Vertical movement should be blocked
      let result = await runPlayerMove(state, { type: 'move', dx: 0, dy: -1 });
      expect(player.y).toBe(10); // Didn't move
      
      // Disable blocking
      blockVertical = false;
      
      // Vertical movement should work now
      result = await runPlayerMove(state, { type: 'move', dx: 0, dy: -1 });
      expect(player.y).toBe(9); // Did move
    });
  });
});