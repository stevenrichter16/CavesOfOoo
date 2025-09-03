// tests/graveyardChunk.async.test.js  
// Tests for async loading behavior that happens in the actual game

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadOrGenChunk } from '../src/js/movement/playerMovement.js';
import { W, H } from '../src/js/core/config.js';

describe('Graveyard Chunk Async Loading', () => {
  let mockState;

  beforeEach(() => {
    // Create a mock state similar to what the game uses
    mockState = {
      cx: 0,
      cy: 0,
      worldSeed: 'test-seed',
      player: {
        x: 10,
        y: 10,
        hp: 100,
        hpMax: 100,
        inventory: [],
        faction: 'player'
      },
      npcs: [], // This is the key - npcs array must exist
      chunk: null,
      timeIndex: 3,
      log: vi.fn(),
      activeQuests: [],
      flags: {},
      factionRelations: {},
      factions: {},
      FETCH_ITEMS: []
    };
    
    // Mock localStorage for chunk persistence
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  it('should test if NPCs array exists when loading graveyard', async () => {
    // Simulate loading the graveyard chunk
    loadOrGenChunk(mockState, -1, 0);
    
    // The initial state should have the chunk loaded
    expect(mockState.cx).toBe(-1);
    expect(mockState.cy).toBe(0);
    expect(mockState.chunk).toBeDefined();
    
    // Wait for async populateGraveyard to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.error('After async load:');
    console.error('NPCs array exists?', Array.isArray(mockState.npcs));
    console.error('NPCs count:', mockState.npcs.length);
    console.error('NPCs:', mockState.npcs.map(n => ({ 
      id: n.id, 
      name: n.name,
      chunkX: n.chunkX,
      chunkY: n.chunkY
    })));
    
    // Check if Starchy was spawned
    const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
    
    // THIS TEST SHOULD FAIL if Starchy doesn't spawn in async context
    expect(starchy).toBeDefined();
    if (starchy) {
      expect(starchy.name).toBe('Starchy');
      expect(starchy.chunkX).toBe(-1);
      expect(starchy.chunkY).toBe(0);
    }
  });

  it('should test if NPCs persist across chunk loads', async () => {
    // First, load graveyard
    loadOrGenChunk(mockState, -1, 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const starchyBefore = mockState.npcs.find(npc => npc.id === 'starchy');
    console.error('Starchy after first load:', starchyBefore);
    
    // Now load a different chunk
    loadOrGenChunk(mockState, 0, 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if Starchy still exists in NPCs array
    const starchyAfter = mockState.npcs.find(npc => npc.id === 'starchy');
    console.error('Starchy after loading different chunk:', starchyAfter);
    
    // Go back to graveyard
    loadOrGenChunk(mockState, -1, 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const starchyReturn = mockState.npcs.find(npc => npc.id === 'starchy');
    console.error('Starchy after returning to graveyard:', starchyReturn);
    
    // Starchy should persist across chunk transitions
    expect(starchyReturn).toBeDefined();
  });

  it('should check what happens when NPCs array is undefined', async () => {
    // Intentionally break the NPCs array
    delete mockState.npcs;
    
    console.error('State before load (no npcs array):', Object.keys(mockState));
    
    // Try to load graveyard
    loadOrGenChunk(mockState, -1, 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.error('State after load:', Object.keys(mockState));
    console.error('NPCs exists?', 'npcs' in mockState);
    console.error('NPCs value:', mockState.npcs);
    
    // The NPCs array should be created by spawnSocialNPC
    expect(mockState.npcs).toBeDefined();
    expect(Array.isArray(mockState.npcs)).toBe(true);
  });
});