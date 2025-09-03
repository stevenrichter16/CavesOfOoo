// tests/starchy.spawn.test.js
// Specific test for Starchy spawning issue in graveyard chunk (-1,0)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateGraveyardChunk, populateGraveyard } from '../src/js/world/graveyardChunk.js';
import { loadOrGenChunk } from '../src/js/movement/playerMovement.js';
import { spawnSocialNPC } from '../src/js/social/init.js';
import { W, H } from '../src/js/core/config.js';

describe('Starchy Spawning Bug', () => {
  let gameState;

  beforeEach(() => {
    // Create a game state that mimics the actual game
    gameState = {
      worldSeed: 'test-seed',
      cx: 0,  // Starting at candy market
      cy: 0,
      player: {
        x: 10,
        y: 10,
        hp: 100,
        hpMax: 100,
        inventory: [],
        faction: 'player'
      },
      npcs: [],  // NPCs array exists but empty
      chunk: null,
      timeIndex: 3,
      log: vi.fn(),
      activeQuests: [],
      flags: {},
      factionRelations: {},
      factions: {},
      FETCH_ITEMS: []
    };
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  describe('Direct populateGraveyard call', () => {
    it('EXPECTED TO FAIL: Starchy should spawn when populateGraveyard is called directly', () => {
      // First generate the graveyard chunk
      const chunk = generateGraveyardChunk('test-seed', -1, 0);
      gameState.chunk = chunk;
      gameState.cx = -1;
      gameState.cy = 0;
      
      console.error('=== DIRECT TEST ===');
      console.error('Before populateGraveyard:');
      console.error('  NPCs count:', gameState.npcs.length);
      console.error('  Chunk exists:', !!gameState.chunk);
      console.error('  Current coords:', gameState.cx, gameState.cy);
      
      // Call populateGraveyard directly
      populateGraveyard(gameState);
      
      console.error('After populateGraveyard:');
      console.error('  NPCs count:', gameState.npcs.length);
      console.error('  NPCs:', gameState.npcs.map(n => ({
        id: n.id,
        name: n.name,
        x: n.x,
        y: n.y,
        chunkX: n.chunkX,
        chunkY: n.chunkY
      })));
      
      // Check if Starchy spawned
      const starchy = gameState.npcs.find(npc => npc.id === 'starchy');
      
      // THIS ASSERTION SHOULD FAIL IF STARCHY DOESN'T SPAWN
      expect(starchy).toBeDefined();
      expect(starchy?.name).toBe('Starchy');
      expect(starchy?.chunkX).toBe(-1);
      expect(starchy?.chunkY).toBe(0);
    });
  });

  describe('Chunk transition simulation', () => {
    it('EXPECTED TO FAIL: Starchy should spawn when entering graveyard from candy market', async () => {
      console.error('=== CHUNK TRANSITION TEST ===');
      
      // Start at candy market (0, 0)
      loadOrGenChunk(gameState, 0, 0);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.error('After loading candy market:');
      console.error('  Current chunk:', gameState.cx, gameState.cy);
      console.error('  NPCs in market:', gameState.npcs.filter(n => 
        n.chunkX === 0 && n.chunkY === 0).length);
      
      // Move to graveyard (-1, 0)
      loadOrGenChunk(gameState, -1, 0);
      await new Promise(resolve => setTimeout(resolve, 200)); // More time for async
      
      console.error('After loading graveyard:');
      console.error('  Current chunk:', gameState.cx, gameState.cy);
      console.error('  Total NPCs:', gameState.npcs.length);
      console.error('  NPCs in graveyard:', gameState.npcs.filter(n => 
        n.chunkX === -1 && n.chunkY === 0).map(n => ({
          id: n.id,
          name: n.name
        })));
      
      // Find Starchy
      const starchy = gameState.npcs.find(npc => npc.id === 'starchy');
      
      // THIS ASSERTION SHOULD FAIL IF STARCHY DOESN'T SPAWN ON CHUNK ENTRY
      expect(starchy).toBeDefined();
      expect(starchy?.name).toBe('Starchy');
      expect(starchy?.chunkX).toBe(-1);
      expect(starchy?.chunkY).toBe(0);
    });
  });

  describe('Starchy visibility test', () => {
    it('Starchy should only be visible when in graveyard chunk', () => {
      // Spawn Starchy manually
      spawnSocialNPC(gameState, {
        id: 'starchy',
        name: 'Starchy',
        x: 6,
        y: H - 5,
        faction: 'peasants',
        dialogueType: 'starchy',
        traits: ['secretive', 'gossipy'],
        hp: 25,
        hpMax: 25,
        chunkX: -1,
        chunkY: 0
      });
      
      // Check visibility in graveyard
      gameState.cx = -1;
      gameState.cy = 0;
      
      const visibleInGraveyard = gameState.npcs.filter(npc => 
        npc.chunkX === gameState.cx && 
        npc.chunkY === gameState.cy
      );
      
      console.error('In graveyard (-1, 0):');
      console.error('  Visible NPCs:', visibleInGraveyard.map(n => n.name));
      expect(visibleInGraveyard.some(n => n.id === 'starchy')).toBe(true);
      
      // Check visibility in candy market
      gameState.cx = 0;
      gameState.cy = 0;
      
      const visibleInMarket = gameState.npcs.filter(npc => 
        npc.chunkX === gameState.cx && 
        npc.chunkY === gameState.cy
      );
      
      console.error('In candy market (0, 0):');
      console.error('  Visible NPCs:', visibleInMarket.map(n => n.name));
      expect(visibleInMarket.some(n => n.id === 'starchy')).toBe(false);
    });
  });

  describe('Debug: Check if issue is with spawnSocialNPC', () => {
    it('spawnSocialNPC should work with graveyard coordinates', () => {
      gameState.cx = -1;
      gameState.cy = 0;
      
      console.error('=== spawnSocialNPC Debug ===');
      console.error('State before spawn:', {
        cx: gameState.cx,
        cy: gameState.cy,
        npcsLength: gameState.npcs.length
      });
      
      const result = spawnSocialNPC(gameState, {
        id: 'debug_starchy',
        name: 'Debug Starchy',
        x: 6,
        y: 17,
        faction: 'peasants',
        hp: 25,
        hpMax: 25,
        chunkX: -1,
        chunkY: 0
      });
      
      console.error('Spawn result:', result);
      console.error('State after spawn:', {
        npcsLength: gameState.npcs.length,
        npcs: gameState.npcs
      });
      
      expect(gameState.npcs.length).toBe(1);
      expect(gameState.npcs[0].id).toBe('debug_starchy');
      expect(gameState.npcs[0].chunkX).toBe(-1);
      expect(gameState.npcs[0].chunkY).toBe(0);
    });
  });
});