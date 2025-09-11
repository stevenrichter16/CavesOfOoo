/**
 * Phase 8: Real-time World Simulation Tests
 * Testing autonomous world updates, entity behaviors, and time progression
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { DynamicEventSystem } from '../../../src/js/world/events/DynamicEventSystem.js';
import { WorldSimulation } from '../../../src/js/world/simulation/WorldSimulation.js';
import { EntityManager } from '../../../src/js/world/entities/EntityManager.js';
import { TimeSystem } from '../../../src/js/world/time/TimeSystem.js';
import { WeatherSystem } from '../../../src/js/world/weather/WeatherSystem.js';
import { EcosystemManager } from '../../../src/js/world/ecosystem/EcosystemManager.js';
import { Chunk } from '../../../src/js/world/core/Chunk.js';

describe('Phase 8: World Simulation', () => {
  let worldSim;
  let chunkSystem;
  let eventSystem;
  let mockEventBus;
  
  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
  });
  
  afterEach(() => {
    if (worldSim) {
      worldSim.stop();
    }
  });
  
  describe('World Simulation Core', () => {
    it('should create and start world simulation', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      expect(worldSim).toBeDefined();
      expect(worldSim.isRunning).toBe(false);
      
      worldSim.start();
      expect(worldSim.isRunning).toBe(true);
    });
    
    it('should tick simulation at configured rate', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus, {
        tickRate: 10 // 10 ticks per second
      });
      
      const tickSpy = vi.fn();
      worldSim.on('tick', tickSpy);
      
      worldSim.start();
      
      // Wait for multiple ticks
      await new Promise(resolve => setTimeout(resolve, 250));
      
      worldSim.stop();
      
      // Should have ticked approximately 2-3 times
      expect(tickSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(tickSpy.mock.calls.length).toBeLessThanOrEqual(4);
    });
    
    it('should pause and resume simulation', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      worldSim.start();
      expect(worldSim.isRunning).toBe(true);
      expect(worldSim.isPaused).toBe(false);
      
      worldSim.pause();
      expect(worldSim.isRunning).toBe(true);
      expect(worldSim.isPaused).toBe(true);
      
      worldSim.resume();
      expect(worldSim.isPaused).toBe(false);
    });
    
    it('should handle simulation speed changes', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      expect(worldSim.getSpeed()).toBe(1.0);
      
      worldSim.setSpeed(2.0); // Double speed
      expect(worldSim.getSpeed()).toBe(2.0);
      
      worldSim.setSpeed(0.5); // Half speed
      expect(worldSim.getSpeed()).toBe(0.5);
    });
  });
  
  describe('Time System', () => {
    it('should track game time independently from real time', () => {
      const timeSystem = new TimeSystem();
      
      expect(timeSystem.getGameTime()).toBeDefined();
      expect(timeSystem.getDay()).toBe(1);
      expect(timeSystem.getHour()).toBeDefined();
      expect(timeSystem.getMinute()).toBeDefined();
    });
    
    it('should advance time with ticks', () => {
      const timeSystem = new TimeSystem({
        minutesPerTick: 5
      });
      
      const initialTime = timeSystem.getGameTime();
      
      timeSystem.tick();
      timeSystem.tick();
      timeSystem.tick();
      
      const newTime = timeSystem.getGameTime();
      expect(newTime).toBeGreaterThan(initialTime);
      
      // Should have advanced 15 minutes
      const timeDiff = newTime - initialTime;
      expect(timeDiff).toBe(15 * 60 * 1000); // 15 minutes in ms
    });
    
    it('should emit time-based events', () => {
      const timeSystem = new TimeSystem();
      const events = [];
      
      timeSystem.on('dawn', () => events.push('dawn'));
      timeSystem.on('noon', () => events.push('noon'));
      timeSystem.on('dusk', () => events.push('dusk'));
      timeSystem.on('midnight', () => events.push('midnight'));
      
      // Advance through a full day
      for (let i = 0; i < 288; i++) { // 288 * 5 minutes = 24 hours
        timeSystem.tick();
      }
      
      expect(events).toContain('dawn');
      expect(events).toContain('noon');
      expect(events).toContain('dusk');
      expect(events).toContain('midnight');
    });
    
    it('should support scheduled events', () => {
      const timeSystem = new TimeSystem();
      const callback = vi.fn();
      
      // Schedule event for specific game time
      timeSystem.scheduleAt({
        day: 2,
        hour: 12,
        minute: 0
      }, callback);
      
      // Advance to that time
      while (timeSystem.getDay() < 2 || timeSystem.getHour() < 12) {
        timeSystem.tick();
      }
      
      expect(callback).toHaveBeenCalled();
    });
  });
  
  describe('Entity Management', () => {
    it('should manage entities across chunks', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const entityManager = new EntityManager(chunkSystem, mockEventBus);
      
      const entity = entityManager.createEntity({
        type: 'npc',
        name: 'Jake',
        x: 100,
        y: 100
      });
      
      expect(entity.id).toBeDefined();
      expect(entity.chunkX).toBe(4); // 100 / 24 = 4
      expect(entity.chunkY).toBe(4); // 100 / 22 = 4
      
      const entitiesInChunk = entityManager.getEntitiesInChunk(4, 4);
      expect(entitiesInChunk).toContain(entity);
    });
    
    it('should update entity positions and handle chunk transitions', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const entityManager = new EntityManager(chunkSystem, mockEventBus);
      
      const entity = entityManager.createEntity({
        type: 'mob',
        x: 23, // Right edge of chunk 0
        y: 10
      });
      
      expect(entity.chunkX).toBe(0);
      
      // Move entity to next chunk
      entityManager.moveEntity(entity.id, 25, 10);
      
      expect(entity.x).toBe(25);
      expect(entity.chunkX).toBe(1);
      
      // Should emit chunk transition event
      expect(mockEventBus.emit).toHaveBeenCalledWith('EntityChangedChunk', 
        expect.objectContaining({
          entity,
          fromChunk: { x: 0, y: 0 },
          toChunk: { x: 1, y: 0 }
        })
      );
    });
    
    it('should support entity behaviors and AI', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const entityManager = new EntityManager(chunkSystem, mockEventBus);
      
      const entity = entityManager.createEntity({
        type: 'mob',
        behavior: 'wander',
        x: 50,
        y: 50
      });
      
      const initialX = entity.x;
      const initialY = entity.y;
      
      // Simulate behavior updates
      for (let i = 0; i < 10; i++) {
        entityManager.updateBehaviors();
      }
      
      // Entity should have moved
      expect(entity.x !== initialX || entity.y !== initialY).toBe(true);
    });
    
    it('should handle entity lifecycle (spawn, live, die)', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const entityManager = new EntityManager(chunkSystem, mockEventBus);
      
      const entity = entityManager.createEntity({
        type: 'mob',
        health: 100,
        x: 0,
        y: 0
      });
      
      expect(entity.alive).toBe(true);
      
      // Damage entity
      entityManager.damageEntity(entity.id, 50);
      expect(entity.health).toBe(50);
      expect(entity.alive).toBe(true);
      
      // Kill entity
      entityManager.damageEntity(entity.id, 60);
      expect(entity.health).toBe(0);
      expect(entity.alive).toBe(false);
      
      // Should emit death event
      expect(mockEventBus.emit).toHaveBeenCalledWith('EntityDied',
        expect.objectContaining({ entity })
      );
    });
  });
  
  describe('Weather System', () => {
    it('should simulate weather patterns', () => {
      const weatherSystem = new WeatherSystem();
      
      const weather = weatherSystem.getCurrentWeather();
      expect(weather.type).toBeDefined();
      expect(['clear', 'cloudy', 'rain', 'storm', 'snow']).toContain(weather.type);
      expect(weather.intensity).toBeGreaterThanOrEqual(0);
      expect(weather.intensity).toBeLessThanOrEqual(1);
    });
    
    it('should transition between weather states', () => {
      const weatherSystem = new WeatherSystem();
      
      weatherSystem.setWeather('clear');
      expect(weatherSystem.getCurrentWeather().type).toBe('clear');
      
      // Start transition to rain
      weatherSystem.transitionTo('rain', 100); // 100 tick transition
      
      // Should be transitioning
      expect(weatherSystem.isTransitioning).toBe(true);
      
      // Advance through transition
      for (let i = 0; i < 100; i++) {
        weatherSystem.update();
      }
      
      expect(weatherSystem.getCurrentWeather().type).toBe('rain');
      expect(weatherSystem.isTransitioning).toBe(false);
    });
    
    it('should affect chunks based on weather', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const weatherSystem = new WeatherSystem(chunkSystem);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Apply rain effects
      weatherSystem.setWeather('rain');
      weatherSystem.applyWeatherToChunk(chunk);
      
      expect(chunk.metadata.wetness).toBeGreaterThan(0);
      expect(chunk.metadata.visibility).toBeLessThan(1.0);
    });
    
    it('should generate weather events', () => {
      const weatherSystem = new WeatherSystem();
      const events = [];
      
      weatherSystem.on('lightning', (e) => events.push(e));
      
      weatherSystem.setWeather('storm');
      
      // Simulate storm for many ticks
      for (let i = 0; i < 100; i++) {
        weatherSystem.update();
      }
      
      // Should have generated lightning events
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('lightning');
      expect(events[0].x).toBeDefined();
      expect(events[0].y).toBeDefined();
    });
  });
  
  describe('Ecosystem Simulation', () => {
    it('should simulate resource regeneration', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const ecosystem = new EcosystemManager(chunkSystem);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Deplete resources
      chunk.resources = { trees: 5, stones: 3 };
      
      // Simulate ecosystem recovery
      for (let i = 0; i < 10; i++) {
        ecosystem.updateChunk(chunk);
      }
      
      // Resources should regenerate
      expect(chunk.resources.trees).toBeGreaterThan(5);
    });
    
    it('should simulate population dynamics', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const ecosystem = new EcosystemManager(chunkSystem);
      
      const population = {
        rabbits: 10,
        wolves: 2
      };
      
      // Simulate predator-prey dynamics
      for (let i = 0; i < 100; i++) {
        ecosystem.updatePopulation(population);
      }
      
      // Population should fluctuate but remain balanced
      expect(population.rabbits).toBeGreaterThan(0);
      expect(population.wolves).toBeGreaterThan(0);
    });
    
    it('should handle seasonal changes', () => {
      const ecosystem = new EcosystemManager();
      
      expect(ecosystem.getSeason()).toBeDefined();
      expect(['spring', 'summer', 'fall', 'winter']).toContain(ecosystem.getSeason());
      
      // Advance through seasons
      const startSeason = ecosystem.getSeason();
      
      // Each season lasts 90 days
      for (let i = 0; i < 90 * 288; i++) { // 90 days * 288 ticks/day
        ecosystem.tick();
      }
      
      const newSeason = ecosystem.getSeason();
      expect(newSeason).not.toBe(startSeason);
    });
    
    it('should affect growth rates based on conditions', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      const ecosystem = new EcosystemManager(chunkSystem);
      const weatherSystem = new WeatherSystem();
      
      ecosystem.setWeatherSystem(weatherSystem);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      chunk.resources = { trees: 10 };
      
      // Good conditions
      weatherSystem.setWeather('clear');
      ecosystem.setSeason('spring');
      
      const goodGrowthRate = ecosystem.calculateGrowthRate(chunk);
      
      // Poor conditions
      weatherSystem.setWeather('storm');
      ecosystem.setSeason('winter');
      
      const poorGrowthRate = ecosystem.calculateGrowthRate(chunk);
      
      expect(goodGrowthRate).toBeGreaterThan(poorGrowthRate);
    });
  });
  
  describe('Autonomous Chunk Updates', () => {
    it('should update loaded chunks automatically', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      const updateSpy = vi.fn();
      
      worldSim.on('chunkUpdate', updateSpy);
      worldSim.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      worldSim.stop();
      
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chunk: expect.objectContaining({ cx: 0, cy: 0 })
        })
      );
    });
    
    it('should simulate chunks near players at higher fidelity', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      // Add player
      worldSim.addPlayer({
        id: 'player1',
        x: 50,
        y: 50
      });
      
      const chunk1 = await chunkSystem.generateChunk('seed', 2, 2); // Near player
      const chunk2 = await chunkSystem.generateChunk('seed', 10, 10); // Far from player
      
      worldSim.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = worldSim.getSimulationStats();
      
      expect(stats.chunkUpdateRates[`2,2`]).toBeGreaterThan(
        stats.chunkUpdateRates[`10,10`] || 0
      );
      
      worldSim.stop();
    });
    
    it('should handle chunk unloading and state preservation', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      const chunk = await chunkSystem.generateChunk('seed', 0, 0);
      
      // Add dynamic state
      chunk.dynamicState = {
        fireSpread: 0.5,
        grassGrowth: 0.3
      };
      
      // Simulate for a bit
      worldSim.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      worldSim.stop();
      
      // Unload chunk
      chunkSystem.cache.delete(0, 0);
      
      // Reload chunk
      const reloaded = await chunkSystem.loadChunk('seed', 0, 0);
      
      // Dynamic state should be preserved
      expect(reloaded.dynamicState).toBeDefined();
      expect(reloaded.dynamicState.fireSpread).toBeCloseTo(0.5, 1);
    });
  });
  
  describe('Performance & Optimization', () => {
    it('should throttle updates for distant chunks', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus, {
        maxSimDistance: 5
      });
      
      worldSim.addPlayer({ id: 'p1', x: 0, y: 0 });
      
      const nearChunk = await chunkSystem.generateChunk('seed', 0, 0);
      const farChunk = await chunkSystem.generateChunk('seed', 10, 10);
      
      const nearUpdates = vi.fn();
      const farUpdates = vi.fn();
      
      nearChunk.onUpdate = nearUpdates;
      farChunk.onUpdate = farUpdates;
      
      worldSim.start();
      await new Promise(resolve => setTimeout(resolve, 500));
      worldSim.stop();
      
      expect(nearUpdates.mock.calls.length).toBeGreaterThan(
        farUpdates.mock.calls.length
      );
    });
    
    it('should batch updates for efficiency', async () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      // Load multiple chunks
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          await chunkSystem.generateChunk('seed', x, y);
        }
      }
      
      const batchSpy = vi.fn();
      worldSim.on('batchUpdate', batchSpy);
      
      worldSim.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      worldSim.stop();
      
      // Should batch updates
      expect(batchSpy).toHaveBeenCalled();
      const batch = batchSpy.mock.calls[0][0];
      expect(batch.chunks.length).toBeGreaterThan(1);
    });
    
    it('should provide simulation metrics', () => {
      chunkSystem = new ChunkSystem(mockEventBus);
      worldSim = new WorldSimulation(chunkSystem, mockEventBus);
      
      const metrics = worldSim.getMetrics();
      
      expect(metrics.ticksPerSecond).toBeDefined();
      expect(metrics.averageTickTime).toBeDefined();
      expect(metrics.activeChunks).toBeDefined();
      expect(metrics.totalEntities).toBeDefined();
      expect(metrics.simulationLoad).toBeDefined();
    });
  });
});