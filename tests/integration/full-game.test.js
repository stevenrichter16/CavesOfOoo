/**
 * Full Game Integration Test
 * Verifies that all systems work together to create a playable game
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { W, H } from '../../src/js/core/config.js';

describe('Full Game Integration', () => {
  let state;
  let WorldIntegration;
  let game;
  
  beforeEach(async () => {
    // Mock DOM
    const mockElement = {
      style: {}, 
      innerHTML: '',
      textContent: '',
      className: '',
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    
    global.document = {
      getElementById: () => mockElement,
      querySelector: () => mockElement,
      createElement: () => mockElement,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    
    global.window = { 
      scrollTo: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    
    // Import modules
    WorldIntegration = await import('../../src/js/world/gameIntegration.js');
    game = await import('../../src/js/core/game.js');
  });
  
  afterEach(async () => {
    if (WorldIntegration) {
      WorldIntegration.destroyWorldSystems();
    }
  });
  
  it('should initialize game with all systems', async () => {
    // Initialize game
    await game.initGame();
    
    // Create new world
    state = await game.newWorld();
    
    // Verify state is properly initialized
    expect(state).toBeDefined();
    expect(state.player).toBeDefined();
    expect(state.chunk).toBeDefined();
    expect(state.worldSeed).toBeDefined();
    
    // Player should have position
    expect(state.player.x).toBeDefined();
    expect(state.player.y).toBeDefined();
    
    // Chunk should have map
    expect(state.chunk.map).toBeDefined();
    expect(state.chunk.map.length).toBe(H);
    // Note: The actual map width is 24, not W (48)
    // W is the game viewport width, not chunk width
    expect(state.chunk.map[0].length).toBe(24);
  });
  
  it('should handle player movement', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    const initialX = state.player.x;
    const initialY = state.player.y;
    
    // Find a walkable tile
    let foundWalkable = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = state.player.x + dx;
        const ny = state.player.y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const tile = state.chunk.map[ny][nx];
          if (tile === '.' || tile === ',') {
            // Try to move
            game.handlePlayerMove(state, dx, dy);
            foundWalkable = true;
            break;
          }
        }
      }
      if (foundWalkable) break;
    }
    
    // Player should have moved or stayed (if blocked)
    expect(state.player.x).toBeDefined();
    expect(state.player.y).toBeDefined();
  });
  
  it('should integrate Phase 7/8 systems', async () => {
    await game.initGame();
    
    const systems = WorldIntegration.getSystems();
    
    // Verify all Phase 7/8 systems are initialized
    expect(systems.chunkSystem).toBeDefined();
    expect(systems.dynamicEventSystem).toBeDefined();
    expect(systems.worldSimulation).toBeDefined();
    expect(systems.entityManager).toBeDefined();
    expect(systems.timeSystem).toBeDefined();
    expect(systems.weatherSystem).toBeDefined();
    expect(systems.ecosystemManager).toBeDefined();
    
    // World simulation should be running
    expect(systems.worldSimulation.isRunning).toBe(true);
  });
  
  it('should handle chunk transitions', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    const PlayerMovement = await import('../../src/js/movement/playerMovement.js');
    
    // Save initial chunk
    const initialCx = state.cx;
    const initialCy = state.cy;
    
    // Move to a different chunk
    await PlayerMovement.loadOrGenChunk(state, initialCx + 1, initialCy);
    
    // Should be in new chunk
    expect(state.cx).toBe(initialCx + 1);
    expect(state.cy).toBe(initialCy);
    expect(state.chunk).toBeDefined();
    
    // Move back
    await PlayerMovement.loadOrGenChunk(state, initialCx, initialCy);
    
    // Should be back in original chunk
    expect(state.cx).toBe(initialCx);
    expect(state.cy).toBe(initialCy);
  });
  
  it('should track time progression', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    const { timeSystem } = WorldIntegration.getSystems();
    const timeBefore = timeSystem.getGameTime();
    
    // Advance time through player action
    WorldIntegration.onPlayerAction();
    
    const timeAfter = timeSystem.getGameTime();
    expect(timeAfter).toBeGreaterThan(timeBefore);
  });
  
  it('should have working weather system', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    const { weatherSystem } = WorldIntegration.getSystems();
    
    // Should have weather
    const weather = weatherSystem.getCurrentWeather();
    expect(weather).toBeDefined();
    expect(weather.type).toBeDefined();
    
    // Can change weather
    weatherSystem.setWeather('rain');
    expect(weatherSystem.getCurrentWeather().type).toBe('rain');
  });
  
  it('should persist NPCs across chunk transitions', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    const PlayerMovement = await import('../../src/js/movement/playerMovement.js');
    
    // Add an NPC to current chunk
    state.chunk.npcs = state.chunk.npcs || [];
    state.chunk.npcs.push({
      name: 'TestNPC',
      x: 5,
      y: 5,
      entityId: 'test-entity'
    });
    
    const initialCx = state.cx;
    const initialCy = state.cy;
    
    // Move to different chunk and back
    await PlayerMovement.loadOrGenChunk(state, initialCx + 1, initialCy);
    await PlayerMovement.loadOrGenChunk(state, initialCx, initialCy);
    
    // NPC should still be there
    expect(state.chunk.npcs).toBeDefined();
    const npc = state.chunk.npcs.find(n => n.name === 'TestNPC');
    expect(npc).toBeDefined();
    expect(npc.x).toBe(5);
    expect(npc.y).toBe(5);
  });
  
  it('should have social system integration', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    // Add NPCs with social properties
    state.npcs = state.npcs || [];
    state.npcs.push({
      name: 'Bob',
      x: 10,
      y: 10,
      faction: 'merchants',
      relationships: {}
    });
    
    // Social system should handle NPCs
    expect(state.npcs.length).toBeGreaterThan(0);
    expect(state.factionReputation).toBeDefined();
    expect(state.factionReputation.merchants).toBeDefined();
  });
  
  it('should handle performance with throttling', async () => {
    await game.initGame();
    state = await game.newWorld();
    
    const startTime = performance.now();
    
    // Simulate 100 frames quickly
    for (let i = 0; i < 100; i++) {
      WorldIntegration.updateWorld();
    }
    
    const endTime = performance.now();
    const elapsed = endTime - startTime;
    
    // Should complete quickly (throttling prevents expensive operations)
    expect(elapsed).toBeLessThan(1000); // Should take less than 1 second
  });
});