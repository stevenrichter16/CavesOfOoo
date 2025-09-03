// test/graveyardChunk.test.js
// Unit tests for graveyard chunk functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateGraveyardChunk, populateGraveyard, GRAVEYARD_COORDS } from '../src/js/world/graveyardChunk.js';
import { W, H } from '../src/js/core/config.js';

// Mock the spawnSocialNPC function
vi.mock('../src/js/social/init.js', () => ({
  spawnSocialNPC: vi.fn((state, config) => {
    // Simple mock implementation that adds NPC to state
    const npc = {
      ...config,
      chunkX: config.chunkX !== undefined ? config.chunkX : state.cx,
      chunkY: config.chunkY !== undefined ? config.chunkY : state.cy
    };
    state.npcs.push(npc);
    return npc;
  })
}));

describe('Graveyard Chunk', () => {
  let mockState;

  beforeEach(() => {
    // Create a fresh mock state for each test
    mockState = {
      cx: -1,
      cy: 0,
      player: {
        x: 10,
        y: 10,
        hp: 100,
        hpMax: 100,
        inventory: []
      },
      npcs: [],
      chunk: {
        map: Array(H).fill().map(() => Array(W).fill('.')),
        monsters: [],
        items: [],
        biome: 'candy_kingdom',
        isGraveyard: true
      },
      timeIndex: 3,
      log: vi.fn(),
      activeQuests: [],
      flags: {}
    };
  });

  describe('Graveyard Generation', () => {
    it('should generate graveyard chunk only at coordinates (-1, 0)', () => {
      const chunk = generateGraveyardChunk('test-seed', -1, 0);
      expect(chunk).not.toBeNull();
      expect(chunk.isGraveyard).toBe(true);
      expect(chunk.special).toBe('graveyard');
      expect(chunk.cx).toBe(-1);
      expect(chunk.cy).toBe(0);
    });

    it('should return null for non-graveyard coordinates', () => {
      const chunk = generateGraveyardChunk('test-seed', 0, 0);
      expect(chunk).toBeNull();
    });

    it('should contain gravestones in the generated map', () => {
      const chunk = generateGraveyardChunk('test-seed', -1, 0);
      let gravestoneCount = 0;
      
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (chunk.map[y][x] === 'T') {
            gravestoneCount++;
          }
        }
      }
      
      expect(gravestoneCount).toBeGreaterThan(0);
    });

    it('should contain a shed with door', () => {
      const chunk = generateGraveyardChunk('test-seed', -1, 0);
      let hasSheddDoor = false;
      
      // Check for shed door tile (▓)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (chunk.map[y][x] === '▓') {
            hasSheddDoor = true;
            break;
          }
        }
      }
      
      expect(hasSheddDoor).toBe(true);
    });
  });

  describe('Starchy NPC Spawning', () => {
    it('should spawn Starchy when populating the graveyard', () => {
      // This test should FAIL with current implementation
      populateGraveyard(mockState);
      
      // Check that Starchy was spawned
      const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
      
      expect(starchy).toBeDefined();
      expect(starchy.name).toBe('Starchy');
      expect(starchy.faction).toBe('peasants');
      expect(starchy.dialogueType).toBe('starchy');
    });

    it('should spawn Starchy at the correct chunk coordinates', () => {
      // This test should FAIL - Starchy should have correct chunk coords
      populateGraveyard(mockState);
      
      const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
      
      expect(starchy).toBeDefined();
      expect(starchy.chunkX).toBe(-1);
      expect(starchy.chunkY).toBe(0);
    });

    it('should spawn Starchy near his shed', () => {
      // This test should FAIL if Starchy doesn't spawn
      populateGraveyard(mockState);
      
      const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
      
      expect(starchy).toBeDefined();
      expect(starchy.x).toBe(6);
      expect(starchy.y).toBe(H - 5);
    });

    it('should not spawn duplicate Starchys', () => {
      // First spawn
      populateGraveyard(mockState);
      const firstCount = mockState.npcs.filter(npc => npc.id === 'starchy').length;
      
      // Try to spawn again
      populateGraveyard(mockState);
      const secondCount = mockState.npcs.filter(npc => npc.id === 'starchy').length;
      
      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });

    it('should log a message when Starchy spawns', () => {
      populateGraveyard(mockState);
      
      expect(mockState.log).toHaveBeenCalledWith(
        "You see Starchy digging a fresh grave nearby.",
        "note"
      );
    });
  });

  describe('Graveyard Chunk Visibility', () => {
    it('should only show Starchy in the graveyard chunk', () => {
      // Populate graveyard
      populateGraveyard(mockState);
      
      const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
      
      // Starchy should be visible in graveyard chunk
      expect(starchy).toBeDefined();
      expect(starchy.chunkX).toBe(-1);
      expect(starchy.chunkY).toBe(0);
      
      // Simulate being in graveyard - Starchy should be visible
      const visibleInGraveyard = starchy.chunkX === mockState.cx && 
                                  starchy.chunkY === mockState.cy;
      expect(visibleInGraveyard).toBe(true);
      
      // Simulate moving to different chunk - Starchy should not be visible
      mockState.cx = 0;
      mockState.cy = 0;
      const visibleInMarket = starchy.chunkX === mockState.cx && 
                               starchy.chunkY === mockState.cy;
      expect(visibleInMarket).toBe(false);
    });
  });

  describe('Night Time Ghosts', () => {
    it('should potentially spawn candy ghosts at night', () => {
      mockState.timeIndex = 5; // Night time
      
      // Run populate multiple times to increase chance of ghost spawn
      for (let i = 0; i < 10; i++) {
        mockState.chunk.monsters = [];
        populateGraveyard(mockState);
        
        if (mockState.chunk.monsters.length > 0) {
          const ghost = mockState.chunk.monsters[0];
          expect(ghost.name).toBe('Candy Ghost');
          expect(ghost.isGhost).toBe(true);
          expect(ghost.undead).toBe(true);
          break;
        }
      }
    });
  });
});

// Test runner configuration
describe('Test Environment', () => {
  it('should have access to required modules', () => {
    expect(generateGraveyardChunk).toBeDefined();
    expect(populateGraveyard).toBeDefined();
    expect(GRAVEYARD_COORDS).toEqual({ x: -1, y: 0 });
  });
});