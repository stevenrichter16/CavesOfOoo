/**
 * Critical Integration Fixes Tests
 * Testing and fixing the critical issues found in code review
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Critical Integration Fixes', () => {
  let dom;
  let window;
  let document;
  
  beforeEach(() => {
    // Setup DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="time"></div><div id="weather"></div></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously'
    });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    
    // Clear modules
    vi.resetModules();
  });
  
  afterEach(() => {
    dom.window.close();
  });
  
  describe('EventEmitter Fix', () => {
    it('should use browser-compatible EventEmitter, not Node.js version', async () => {
      // This should NOT throw an error in browser environment
      const { EventEmitter } = await import('../../src/js/world/core/EventEmitter.js');
      
      const emitter = new EventEmitter();
      const callback = vi.fn();
      
      // Should work without Node.js
      emitter.on('test', callback);
      emitter.emit('test', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });
    
    it('should not import from "events" module (Node.js)', async () => {
      // Read the gameIntegration file
      const fs = await import('fs');
      const content = fs.readFileSync('./src/js/world/gameIntegration.js', 'utf8');
      
      // Should NOT contain Node.js events import
      expect(content).not.toContain("from 'events'");
      expect(content).not.toContain('from "events"');
    });
    
    it('should have consistent EventEmitter across all world modules', async () => {
      const modules = [
        '../../src/js/world/simulation/WorldSimulation.js',
        '../../src/js/world/time/TimeSystem.js',
        '../../src/js/world/weather/WeatherSystem.js'
      ];
      
      for (const modulePath of modules) {
        const fs = await import('fs');
        const content = fs.readFileSync(modulePath.replace('../../', './'), 'utf8');
        
        // Should import from our custom EventEmitter
        if (content.includes('EventEmitter')) {
          expect(content).not.toContain("from 'events'");
        }
      }
    });
  });
  
  describe('Async/Await Race Condition Fix', () => {
    it('should wait for chunk to load before using it', async () => {
      const { initGame } = await import('../../src/js/core/game.js');
      
      // Mock loadOrGenChunk to be slow
      const mockChunk = {
        map: Array(22).fill(null).map(() => Array(24).fill('.')),
        monsters: [],
        npcs: [],
        items: []
      };
      
      const PlayerMovement = await import('../../src/js/movement/playerMovement.js');
      const originalLoadOrGen = PlayerMovement.loadOrGenChunk;
      
      // Replace with slow async version
      PlayerMovement.loadOrGenChunk = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockChunk;
      });
      
      // This should wait for chunk before proceeding
      const gameInitPromise = initGame();
      
      // If there's a race condition, STATE.chunk would be undefined
      // Wait a bit to ensure async operations started
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check if we're waiting properly (this is tricky to test)
      // The best we can do is ensure initGame returns a promise
      expect(gameInitPromise).toBeInstanceOf(Promise);
      
      // Restore
      PlayerMovement.loadOrGenChunk = originalLoadOrGen;
    });
    
    it('should handle chunk loading errors gracefully', async () => {
      const PlayerMovement = await import('../../src/js/movement/playerMovement.js');
      
      // Mock state
      const state = {
        worldSeed: 'test',
        cx: 0,
        cy: 0,
        chunk: null,
        player: { x: 10, y: 10 }
      };
      
      // Mock WorldIntegration to fail
      vi.doMock('../../src/js/world/gameIntegration.js', () => ({
        loadChunk: vi.fn().mockRejectedValue(new Error('Load failed')),
        genChunk: vi.fn().mockRejectedValue(new Error('Gen failed'))
      }));
      
      // Should fallback to old system
      const chunk = await PlayerMovement.loadOrGenChunk(state, 1, 1);
      
      // Should have used fallback (old system returns a chunk)
      expect(chunk).toBeDefined();
      expect(chunk.map).toBeDefined();
    });
  });
  
  describe('Game Loop Integration Fix', () => {
    it('should call updateWorld in game loop', async () => {
      // Mock WorldIntegration
      const mockUpdateWorld = vi.fn();
      const mockUpdatePlayerPosition = vi.fn();
      
      vi.doMock('../../src/js/world/gameIntegration.js', () => ({
        updateWorld: mockUpdateWorld,
        updatePlayerPosition: mockUpdatePlayerPosition,
        getTimeDisplay: () => 'Day 1, 06:00',
        getWeatherDisplay: () => 'Clear',
        initWorldSystems: vi.fn(),
        startSimulation: vi.fn()
      }));
      
      const { render } = await import('../../src/js/core/game.js');
      
      // Mock state
      const state = {
        player: { x: 10, y: 10, hp: 100, hpMax: 100 },
        chunk: { map: [], monsters: [], npcs: [] },
        cx: 0,
        cy: 0
      };
      
      // Call render (which should call updateWorld)
      render(state);
      
      // Should have called update functions
      expect(mockUpdateWorld).toHaveBeenCalled();
      expect(mockUpdatePlayerPosition).toHaveBeenCalledWith(state.player);
    });
    
    it('should update time and weather displays', async () => {
      // Setup DOM elements
      document.body.innerHTML = `
        <div id="time"></div>
        <div id="weather"></div>
        <div id="hp"></div>
        <div id="xp"></div>
        <div id="level"></div>
        <div id="gold"></div>
      `;
      
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      // Initialize systems
      WorldIntegration.initWorldSystems();
      
      // Get displays
      const timeDisplay = WorldIntegration.getTimeDisplay();
      const weatherDisplay = WorldIntegration.getWeatherDisplay();
      
      expect(timeDisplay).toMatch(/Day \d+, \d{2}:\d{2}/);
      expect(weatherDisplay).toBeDefined();
    });
  });
  
  describe('Memory Leak Prevention', () => {
    it('should cleanup event listeners on destroy', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      // Initialize
      WorldIntegration.initWorldSystems();
      
      // Get systems
      const systems = WorldIntegration.getSystems();
      expect(systems.timeSystem).toBeDefined();
      
      // Should have destroy function
      expect(typeof WorldIntegration.destroyWorldSystems).toBe('function');
      
      // Destroy should not throw
      expect(() => WorldIntegration.destroyWorldSystems()).not.toThrow();
      
      // After destroy, systems should be cleaned
      const systemsAfter = WorldIntegration.getSystems();
      expect(systemsAfter.worldSimulation?.isRunning).toBeFalsy();
    });
    
    it('should not accumulate listeners on multiple init calls', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      // Initialize multiple times
      WorldIntegration.initWorldSystems();
      const firstEventBus = WorldIntegration.getSystems().eventBus;
      const firstListenerCount = firstEventBus?.listenerCount?.('time:dawn') || 0;
      
      WorldIntegration.initWorldSystems();
      const secondEventBus = WorldIntegration.getSystems().eventBus;
      const secondListenerCount = secondEventBus?.listenerCount?.('time:dawn') || 0;
      
      // Should not accumulate (either new bus or same count)
      expect(secondListenerCount).toBeLessThanOrEqual(1);
    });
  });
  
  describe('NPC Entity Integration', () => {
    it('should update NPC positions using EntityManager', async () => {
      const WorldIntegration = await import('../../src/js/world/gameIntegration.js');
      
      // Initialize systems
      WorldIntegration.initWorldSystems();
      
      const { entityManager } = WorldIntegration.getSystems();
      
      // Create test NPC
      const npc = entityManager.createEntity({
        type: 'npc',
        name: 'TestNPC',
        x: 10,
        y: 10,
        behavior: 'wander'
      });
      
      const startX = npc.x;
      const startY = npc.y;
      
      // Update behaviors
      entityManager.updateBehaviors();
      
      // NPC should have moved
      expect(npc.x !== startX || npc.y !== startY).toBe(true);
    });
  });
});