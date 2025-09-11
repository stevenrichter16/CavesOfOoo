/**
 * Phase 7/8 Game Integration Tests
 * Testing that the new systems actually work with the game
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../src/js/world/events/DynamicEventSystem.js';
import { WorldSimulation } from '../../src/js/world/simulation/WorldSimulation.js';
import { TimeSystem } from '../../src/js/world/time/TimeSystem.js';
import { WeatherSystem } from '../../src/js/world/weather/WeatherSystem.js';

describe('Phase 7/8 Game Integration', () => {
  
  describe('Chunk Generation Compatibility', () => {
    it('should generate chunks compatible with existing game format', async () => {
      const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
      const chunkSystem = new ChunkSystem(eventBus);
      
      const chunk = await chunkSystem.generateChunk('test-seed', 0, 0);
      
      // Should have the expected game properties
      expect(chunk.map).toBeDefined();
      expect(Array.isArray(chunk.map)).toBe(true);
      expect(chunk.map.length).toBe(22); // H from config
      expect(chunk.map[0].length).toBe(24); // W from config
      
      // Should have monsters array like old system
      expect(Array.isArray(chunk.monsters)).toBe(true);
      
      // Should have items array
      expect(Array.isArray(chunk.items)).toBe(true);
      
      // Should have NPCs array
      expect(Array.isArray(chunk.npcs)).toBe(true);
      
      // Should have biome
      expect(chunk.biome).toBeDefined();
    });
    
    it('should maintain compatibility with existing save/load', async () => {
      const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
      const chunkSystem = new ChunkSystem(eventBus);
      
      const chunk = await chunkSystem.generateChunk('test-seed', 0, 0);
      
      // Add player modifications
      chunk.map[10][10] = '.'; // Player dug here
      chunk.items.push({ x: 10, y: 10, type: 'potion' });
      
      // Save chunk
      await chunkSystem.saveChunk('test-seed', chunk);
      
      // Load chunk
      const loaded = await chunkSystem.loadChunk('test-seed', 0, 0);
      
      // Modifications should persist
      expect(loaded.map[10][10]).toBe('.');
      expect(loaded.items).toContainEqual({ x: 10, y: 10, type: 'potion' });
    });
  });
  
  describe('Game Loop Integration', () => {
    it('should integrate WorldSimulation with game tick', () => {
      const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
      const chunkSystem = new ChunkSystem(eventBus);
      const worldSim = new WorldSimulation(chunkSystem, eventBus, {
        tickRate: 20 // 20 ticks per second
      });
      
      const tickSpy = vi.fn();
      worldSim.on('tick', tickSpy);
      
      // Start simulation
      worldSim.start();
      expect(worldSim.isRunning).toBe(true);
      
      // Should be callable from game loop
      worldSim.tick();
      expect(tickSpy).toHaveBeenCalled();
      
      worldSim.stop();
    });
    
    it('should update time system with game ticks', () => {
      const timeSystem = new TimeSystem({
        minutesPerTick: 5,
        startTime: new Date(1000, 0, 1, 6, 0, 0) // 6 AM
      });
      
      expect(timeSystem.getHour()).toBe(6);
      expect(timeSystem.getMinute()).toBe(0);
      
      // Advance time
      timeSystem.tick();
      expect(timeSystem.getMinute()).toBe(5);
      
      // Should format for HUD display
      const formatted = timeSystem.getFormattedTime();
      expect(formatted).toBe('Day 1, 06:05');
    });
  });
  
  describe('NPC Movement Integration', () => {
    it('should make NPCs actually move', async () => {
      const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
      const chunkSystem = new ChunkSystem(eventBus);
      const { EntityManager } = await import('../../src/js/world/entities/EntityManager.js');
      const entityManager = new EntityManager(chunkSystem, eventBus);
      
      // Create NPC at specific position
      const npc = entityManager.createEntity({
        type: 'npc',
        name: 'Bob',
        x: 10,
        y: 10,
        behavior: 'wander'
      });
      
      const initialX = npc.x;
      const initialY = npc.y;
      
      // Update behaviors (should move)
      entityManager.updateBehaviors();
      
      // NPC should have moved
      expect(npc.x !== initialX || npc.y !== initialY).toBe(true);
    });
  });
  
  describe('Weather/Time HUD Display', () => {
    it('should provide weather data for HUD', () => {
      const weatherSystem = new WeatherSystem();
      weatherSystem.setWeather('rain');
      
      const weather = weatherSystem.getCurrentWeather();
      expect(weather.type).toBe('rain');
      expect(weather.wetness).toBeGreaterThan(0);
      
      // Should affect player status
      const effects = weatherSystem.getRenderEffects();
      expect(effects.rainIntensity).toBeGreaterThan(0);
    });
    
    it('should provide formatted time for HUD', () => {
      const timeSystem = new TimeSystem();
      
      // Should show day/night status
      timeSystem.setGameTime(new Date(1000, 0, 1, 12, 0, 0)); // Noon
      expect(timeSystem.isDaytime()).toBe(true);
      expect(timeSystem.getCurrentPeriod()).toBe('noon');
      
      timeSystem.setGameTime(new Date(1000, 0, 1, 23, 0, 0)); // Night
      expect(timeSystem.isNighttime()).toBe(true);
      expect(timeSystem.getCurrentPeriod()).toBe('night');
    });
  });
  
  describe('Dynamic Events Integration', () => {
    it('should apply dynamic events to chunks', async () => {
      const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
      const chunkSystem = new ChunkSystem(eventBus);
      const eventSystem = new DynamicEventSystem(eventBus);
      
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      
      // Create a fire event
      const event = {
        id: 'fire-1',
        type: 'fire',
        x: 12, // Center of chunk (0,0)
        y: 11,
        intensity: 0.8,
        radius: 3,
        startTime: Date.now(),
        duration: 1000
      };
      
      // Register the event
      eventSystem.registerEvent(event);
      
      // Apply event to chunk
      const modified = eventSystem.applyEventToChunk(chunk, event);
      
      // Should have fire effects
      expect(modified.temporaryModifications).toBeDefined();
    });
  });
});