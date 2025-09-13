// tests/movement/street-movement-gameplay.test.js
// Real-world gameplay test for movement on street tiles

import { describe, it, expect, beforeEach } from 'vitest';
import { isPassable } from '../../src/js/utils/queries.js';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { generateShoppingDistrictChunk } from '../../src/js/world/candyShoppingDistrict.js';

describe('Street Movement Gameplay', () => {
  let state;
  let player;

  beforeEach(() => {
    // Set to use original pipeline for testing
    process.env.USE_NEW_MOVEMENT = 'false';
    
    player = {
      id: 'player',
      x: 20,
      y: 11,
      hp: 30,
      hpMax: 30
    };
    
    state = {
      player: player,
      cx: 1,
      cy: 0,
      chunk: null,
      npcs: [],
      log: () => {}
    };
  });

  it('should allow unrestricted movement along main commercial boulevard', async () => {
    // Generate the actual shopping district
    const chunk = generateShoppingDistrictChunk(0, 1, 0);
    state.chunk = chunk;
    
    // Find a street tile on the main boulevard (rows 10-12)
    let streetTile = null;
    for (let y = 10; y <= 12; y++) {
      for (let x = 15; x <= 30; x++) {
        if (chunk.map[y][x] === '=') {
          streetTile = { x, y };
          break;
        }
      }
      if (streetTile) break;
    }
    
    expect(streetTile).not.toBeNull();
    
    // Place player on street tile
    player.x = streetTile.x;
    player.y = streetTile.y;
    
    // Try moving in all four directions
    const movements = [
      { dx: 0, dy: -1, name: 'north' },
      { dx: 0, dy: 1, name: 'south' },
      { dx: -1, dy: 0, name: 'west' },
      { dx: 1, dy: 0, name: 'east' }
    ];
    
    for (const { dx, dy, name } of movements) {
      const targetX = player.x + dx;
      const targetY = player.y + dy;
      
      // Check if target is in bounds
      if (targetX >= 0 && targetX < 48 && targetY >= 0 && targetY < 22) {
        const targetTile = chunk.map[targetY][targetX];
        
        // If target is not a wall or door, movement should be allowed
        if (targetTile !== '#' && targetTile !== '+') {
          const passable = isPassable(state, targetX, targetY);
          expect(passable).toBe(true);
          
          // Try actual movement
          const moveAction = { type: 'move', dx, dy };
          const prevX = player.x;
          const prevY = player.y;
          
          const consumed = await runPlayerMove(state, moveAction);
          expect(consumed).toBe(true);
          
          // Check if player moved (they should if tile is passable)
          if (passable) {
            expect(player.x).toBe(targetX);
            expect(player.y).toBe(targetY);
          }
          
          // Reset position for next test
          player.x = streetTile.x;
          player.y = streetTile.y;
        }
      }
    }
  });

  it('should handle continuous movement along streets', async () => {
    const chunk = generateShoppingDistrictChunk(0, 1, 0);
    state.chunk = chunk;
    
    // Start at a known street position
    player.x = 20;
    player.y = 11;
    
    // Move east along the street 5 times
    for (let i = 0; i < 5; i++) {
      const targetX = player.x + 1;
      
      // Check if next position is still a street
      if (targetX < 48 && chunk.map[player.y][targetX] === '=') {
        const moveAction = { type: 'move', dx: 1, dy: 0 };
        const consumed = await runPlayerMove(state, moveAction);
        
        expect(consumed).toBe(true);
        expect(player.x).toBe(targetX);
      } else {
        break; // Hit non-street tile
      }
    }
    
    // Player should have moved at least some distance
    expect(player.x).toBeGreaterThan(20);
  });

  it('should block movement when NPCs are on street tiles', async () => {
    const chunk = generateShoppingDistrictChunk(0, 1, 0);
    state.chunk = chunk;
    
    // Place player on street
    player.x = 20;
    player.y = 11;
    
    // Add an NPC blocking the path
    const npc = {
      id: 'test_guard',
      name: 'Test Guard',
      x: 21,
      y: 11,
      hp: 20,
      chunkX: 1,
      chunkY: 0
    };
    state.npcs = [npc];
    
    // Street tile should be passable without NPC
    const tileType = chunk.map[11][21];
    if (tileType !== '#' && tileType !== '+') {
      // But not passable with NPC there
      expect(isPassable(state, 21, 11)).toBe(false);
      
      // Try to move into NPC
      const moveAction = { type: 'move', dx: 1, dy: 0 };
      const consumed = await runPlayerMove(state, moveAction);
      
      expect(consumed).toBe(true);
      // Player should not have moved (blocked by NPC)
      expect(player.x).toBe(20);
      expect(player.y).toBe(11);
    }
  });
  
  it('should verify = tiles are actually passable terrain', () => {
    const chunk = generateShoppingDistrictChunk(0, 1, 0);
    state.chunk = chunk;
    
    // Count passable vs non-passable = tiles
    let passableStreets = 0;
    let blockedStreets = 0;
    
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 48; x++) {
        if (chunk.map[y][x] === '=') {
          // Place player elsewhere to not interfere
          player.x = (x + 10) % 48;
          player.y = (y + 10) % 22;
          
          if (isPassable(state, x, y)) {
            passableStreets++;
          } else {
            blockedStreets++;
          }
        }
      }
    }
    
    // All = tiles should be passable (unless blocked by entities)
    expect(passableStreets).toBeGreaterThan(0);
    expect(blockedStreets).toBe(0);
  });
});