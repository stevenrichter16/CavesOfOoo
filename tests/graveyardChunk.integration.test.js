// tests/graveyardChunk.integration.test.js
// Integration tests for graveyard chunk - tests actual implementation without mocks

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateGraveyardChunk, populateGraveyard, GRAVEYARD_COORDS } from '../src/js/world/graveyardChunk.js';
import { W, H } from '../src/js/core/config.js';
// Import the actual spawnSocialNPC - no mocking
import { spawnSocialNPC } from '../src/js/social/init.js';

describe('Graveyard Chunk Integration', () => {
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
        inventory: [],
        faction: 'player'
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
      flags: {},
      factionRelations: {},
      factions: {}
    };
  });

  describe('Starchy NPC Spawning (Real Implementation)', () => {
    it('should FAIL: Starchy should spawn when populating the graveyard', () => {
      // This test uses the real spawnSocialNPC implementation
      // We expect this to fail if Starchy is not spawning correctly
      populateGraveyard(mockState);
      
      // Check that Starchy was spawned
      const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
      
      // This assertion should FAIL if the real spawnSocialNPC has issues
      expect(starchy).toBeDefined();
      if (starchy) {
        expect(starchy.name).toBe('Starchy');
        expect(starchy.faction).toBe('peasants');
        expect(starchy.dialogueType).toBe('starchy');
      }
    });

    it('should FAIL: Starchy should have correct chunk coordinates', () => {
      populateGraveyard(mockState);
      
      const starchy = mockState.npcs.find(npc => npc.id === 'starchy');
      
      // This should fail if Starchy doesn't spawn
      expect(starchy).toBeDefined();
      if (starchy) {
        expect(starchy.chunkX).toBe(-1);
        expect(starchy.chunkY).toBe(0);
      }
    });

    it('should log debug info about NPC spawning', () => {
      // Add some debug logging to understand what's happening
      console.error('=== Before populateGraveyard ===');
      console.error('NPCs before:', mockState.npcs.length);
      
      populateGraveyard(mockState);
      
      console.error('=== After populateGraveyard ===');
      console.error('NPCs after:', mockState.npcs.length);
      console.error('NPCs:', mockState.npcs.map(n => ({ 
        id: n.id, 
        name: n.name,
        chunkX: n.chunkX,
        chunkY: n.chunkY
      })));
      
      // Always pass this test - it's just for debugging
      expect(true).toBe(true);
    });

    it('should check if spawnSocialNPC actually adds NPCs', () => {
      // Direct test of spawnSocialNPC
      const npcConfig = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 5,
        y: 5,
        faction: 'test',
        hp: 10,
        hpMax: 10,
        chunkX: -1,
        chunkY: 0
      };
      
      const initialCount = mockState.npcs.length;
      spawnSocialNPC(mockState, npcConfig);
      const afterCount = mockState.npcs.length;
      
      console.error('Direct spawnSocialNPC test:');
      console.error('Initial NPC count:', initialCount);
      console.error('After NPC count:', afterCount);
      console.error('NPCs:', mockState.npcs);
      
      expect(afterCount).toBeGreaterThan(initialCount);
      expect(mockState.npcs.some(n => n.id === 'test_npc')).toBe(true);
    });
  });

  describe('Check actual populateGraveyard implementation', () => {
    it('should examine the populateGraveyard function behavior', () => {
      // Check if function exists
      expect(populateGraveyard).toBeDefined();
      expect(typeof populateGraveyard).toBe('function');
      
      // Call it and check state changes
      const initialNPCCount = mockState.npcs.length;
      const logCalls = [];
      mockState.log = vi.fn((msg, type) => {
        logCalls.push({ msg, type });
      });
      
      populateGraveyard(mockState);
      
      console.error('populateGraveyard analysis:');
      console.error('Initial NPCs:', initialNPCCount);
      console.error('Final NPCs:', mockState.npcs.length);
      console.error('Log calls:', logCalls);
      console.error('State flags:', mockState.flags);
      
      // This will help us understand what's happening
      expect(true).toBe(true);
    });
  });
});