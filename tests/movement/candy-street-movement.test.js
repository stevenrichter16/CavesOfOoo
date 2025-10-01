// tests/movement/candy-street-movement.test.js
// Test movement on candy street tiles (=) in Shopping District

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isPassable, entityAt } from '../../src/js/utils/queries.js';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { generateShoppingDistrictChunk } from '../../src/js/world/candyShoppingDistrict.js';
import { createTestChunk } from '../helpers/testUtils.js';

describe('Candy Street Movement', () => {
  let state;
  let player;

  beforeEach(() => {
    // Set environment to use original pipeline for testing
    process.env.USE_NEW_MOVEMENT = 'false';
    // Create basic state
    player = {
      id: 'player',
      x: 5,  // Start player away from test positions
      y: 5,
      hp: 30,
      hpMax: 30
    };
    
    state = {
      player: player,
      cx: 1,
      cy: 0,
      chunk: null,
      npcs: [],
      log: vi.fn()
    };
  });

  describe('Tile Passability', () => {
    it('should allow movement on = (paved street) tiles', () => {
      state.chunk = createTestChunk(48, 22);
      
      // Place paved street tiles (map[y][x] format)
      state.chunk.map[10][10] = '=';
      state.chunk.map[10][11] = '=';
      state.chunk.map[10][12] = '=';
      
      // Debug: Check what tiles are at those positions
      console.log('Tile at map[10][10]:', state.chunk.map[10][10]);
      console.log('Tile at map[10][11]:', state.chunk.map[10][11]);
      console.log('Tile at map[10][12]:', state.chunk.map[10][12]);
      
      // Test that = tiles are passable (isPassable takes x,y)
      const result1 = isPassable(state, 10, 10);
      const result2 = isPassable(state, 11, 10);
      const result3 = isPassable(state, 12, 10);
      
      console.log('isPassable(10, 10):', result1);
      console.log('isPassable(11, 10):', result2);
      console.log('isPassable(12, 10):', result3);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should allow movement in all directions from = tiles', () => {
      state.chunk = createTestChunk(48, 22);
      
      // Create a cross of paved streets
      state.chunk.map[10][10] = '='; // Center
      state.chunk.map[9][10] = '=';  // North
      state.chunk.map[11][10] = '='; // South
      state.chunk.map[10][9] = '=';  // West
      state.chunk.map[10][11] = '='; // East
      
      // Place player on center street tile
      player.x = 10;
      player.y = 10;
      
      // Test movement in all directions
      expect(isPassable(state, 10, 9)).toBe(true);  // North
      expect(isPassable(state, 10, 11)).toBe(true); // South
      expect(isPassable(state, 9, 10)).toBe(true);  // West
      expect(isPassable(state, 11, 10)).toBe(true); // East
    });

    it('should not confuse = with walls or other blocking tiles', () => {
      state.chunk = createTestChunk(48, 22);
      
      // Mix of different tiles
      state.chunk.map[10][10] = '='; // Paved street - passable
      state.chunk.map[10][11] = '#'; // Wall - not passable
      state.chunk.map[10][12] = '+'; // Door - not passable
      state.chunk.map[10][13] = '.'; // Floor - passable
      state.chunk.map[10][14] = '~'; // Water - passable
      
      expect(isPassable(state, 10, 10)).toBe(true);  // = is passable
      expect(isPassable(state, 11, 10)).toBe(false); // # is not passable
      expect(isPassable(state, 12, 10)).toBe(false); // + is not passable
      expect(isPassable(state, 13, 10)).toBe(true);  // . is passable
      expect(isPassable(state, 14, 10)).toBe(true);  // ~ is passable
    });
  });

  describe('Shopping District Streets', () => {
    it('should generate passable street tiles in shopping district', () => {
      const chunk = generateShoppingDistrictChunk(0, 1, 0);
      state.chunk = chunk;
      
      // Find street tiles (=)
      const streetTiles = [];
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 48; x++) {
          if (chunk.map[y][x] === '=') {
            streetTiles.push({ x, y });
          }
        }
      }
      
      expect(streetTiles.length).toBeGreaterThan(0);
      
      // All street tiles should be passable
      streetTiles.forEach(({ x, y }) => {
        expect(isPassable(state, x, y)).toBe(true);
      });
    });

    it('should have continuous horizontal streets', () => {
      const chunk = generateShoppingDistrictChunk(0, 1, 0);
      state.chunk = chunk;
      
      // Check main commercial boulevard (rows 10-12)
      for (let y = 10; y <= 12; y++) {
        let streetCount = 0;
        for (let x = 0; x < 48; x++) {
          if (chunk.map[y][x] === '=') {
            streetCount++;
            expect(isPassable(state, x, y)).toBe(true);
          }
        }
        // Should have significant street coverage
        expect(streetCount).toBeGreaterThan(20);
      }
    });
  });

  describe('Movement Pipeline', () => {
    it('should allow player to move onto = tiles', async () => {
      state.chunk = createTestChunk(48, 22);
      
      // Create street
      for (let x = 8; x < 13; x++) {
        state.chunk.map[10][x] = '=';
      }
      
      // Place player next to street
      player.x = 9;
      player.y = 10;
      
      // Try to move onto street tile
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      console.log('Before move: player at', player.x, player.y);
      const consumed = await runPlayerMove(state, moveAction);
      console.log('After move: player at', player.x, player.y, 'consumed:', consumed);
      
      expect(consumed).toBe(true);
      expect(player.x).toBe(10);
      expect(player.y).toBe(10);
    });

    it('should allow vertical movement from = tiles', async () => {
      state.chunk = createTestChunk(48, 22);
      
      // Create vertical path
      for (let y = 8; y < 13; y++) {
        state.chunk.map[y][10] = '=';
      }
      
      // Place player on street
      player.x = 10;
      player.y = 10;
      
      // Try to move north
      let moveAction = { type: 'move', dx: 0, dy: -1 };
      let consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(player.x).toBe(10);
      expect(player.y).toBe(9);
      
      // Reset and try to move south
      player.x = 10;
      player.y = 10;
      moveAction = { type: 'move', dx: 0, dy: 1 };
      consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      expect(player.x).toBe(10);
      expect(player.y).toBe(11);
    });

    it('should handle NPCs on street tiles', async () => {
      state.chunk = createTestChunk(48, 22, '=');
      
      // Add NPC on street
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
      
      // Place player next to NPC
      player.x = 10;
      player.y = 10;
      
      // Street tile with NPC should not be passable
      expect(isPassable(state, 11, 10)).toBe(false);
      
      // Try to move into NPC (should trigger interaction)
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      // Player shouldn't move (blocked by NPC)
      expect(player.x).toBe(10);
      expect(player.y).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle = tiles at chunk boundaries', () => {
      state.chunk = createTestChunk(48, 22);
      
      // Place street tiles at edges
      state.chunk.map[0][10] = '=';  // Top edge
      state.chunk.map[21][10] = '='; // Bottom edge
      state.chunk.map[10][0] = '=';  // Left edge
      state.chunk.map[10][47] = '='; // Right edge
      
      // All should be passable
      expect(isPassable(state, 10, 0)).toBe(true);
      expect(isPassable(state, 10, 21)).toBe(true);
      expect(isPassable(state, 0, 10)).toBe(true);
      expect(isPassable(state, 47, 10)).toBe(true);
    });

    it('should not have invisible barriers on street tiles', () => {
      const chunk = generateShoppingDistrictChunk(0, 1, 0);
      state.chunk = chunk;
      
      // Find a street tile
      let streetTile = null;
      for (let y = 10; y <= 12; y++) {
        for (let x = 10; x <= 20; x++) {
          if (chunk.map[y][x] === '=') {
            streetTile = { x, y };
            break;
          }
        }
        if (streetTile) break;
      }
      
      expect(streetTile).not.toBeNull();
      
      // Place player on street
      player.x = streetTile.x;
      player.y = streetTile.y;
      
      // Check all adjacent tiles
      const adjacent = [
        { dx: 0, dy: -1 }, // North
        { dx: 0, dy: 1 },  // South
        { dx: -1, dy: 0 }, // West
        { dx: 1, dy: 0 }   // East
      ];
      
      adjacent.forEach(({ dx, dy }) => {
        const nx = player.x + dx;
        const ny = player.y + dy;
        
        // If adjacent tile is not a wall, movement should be possible
        if (nx >= 0 && nx < 48 && ny >= 0 && ny < 22) {
          const adjacentTile = chunk.map[ny][nx];
          if (adjacentTile !== '#' && adjacentTile !== '+') {
            expect(isPassable(state, nx, ny)).toBe(true);
          }
        }
      });
    });
  });
});
