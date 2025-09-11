/**
 * Game Integration Module
 * Bridges Phase 7/8 systems with the existing game
 */

import { ChunkSystem } from './ChunkSystem.js';
import { DynamicEventSystem } from './events/DynamicEventSystem.js';
import { WorldSimulation } from './simulation/WorldSimulation.js';
import { EntityManager } from './entities/EntityManager.js';
import { TimeSystem } from './time/TimeSystem.js';
import { WeatherSystem } from './weather/WeatherSystem.js';
import { EcosystemManager } from './ecosystem/EcosystemManager.js';
import { EventEmitter } from './core/EventEmitter.js';
import { W, H } from '../core/config.js';

// Global instances
let gameEventBus = null;
let chunkSystem = null;
let dynamicEventSystem = null;
let worldSimulation = null;
let entityManager = null;
let timeSystem = null;
let weatherSystem = null;
let ecosystemManager = null;

/**
 * Initialize all Phase 7/8 systems
 */
export async function initWorldSystems() {
  // Create event bus
  gameEventBus = new EventEmitter();
  
  // Initialize core systems
  chunkSystem = new ChunkSystem(gameEventBus);
  
  // Wait for async persistence setup
  await chunkSystem.setupPersistence();
  chunkSystem._detectPersistenceCapabilities();
  
  dynamicEventSystem = new DynamicEventSystem(gameEventBus);
  entityManager = new EntityManager(chunkSystem, gameEventBus);
  
  // Initialize simulation systems
  timeSystem = new TimeSystem({
    minutesPerTick: 5,
    startTime: new Date(1000, 0, 1, 6, 0, 0) // Start at 6 AM
  });
  
  weatherSystem = new WeatherSystem(chunkSystem);
  ecosystemManager = new EcosystemManager(chunkSystem);
  ecosystemManager.setWeatherSystem(weatherSystem);
  
  // Initialize world simulation
  worldSimulation = new WorldSimulation(chunkSystem, gameEventBus, {
    tickRate: 20, // 20 ticks per second
    maxSimDistance: 10
  });
  
  // Connect systems
  setupEventListeners();
  
  console.log('[GameIntegration] World systems initialized');
  
  return {
    chunkSystem,
    dynamicEventSystem,
    worldSimulation,
    entityManager,
    timeSystem,
    weatherSystem,
    ecosystemManager
  };
}

/**
 * Setup event listeners between systems
 */
function setupEventListeners() {
  // Time system events
  timeSystem.on('dawn', () => {
    console.log('[Time] Dawn breaks');
    gameEventBus.emit('time:dawn');
  });
  
  timeSystem.on('dusk', () => {
    console.log('[Time] Dusk falls');
    gameEventBus.emit('time:dusk');
  });
  
  // Weather events
  weatherSystem.on('weatherChanged', (data) => {
    console.log(`[Weather] Changed to ${data.weather.type}`);
    gameEventBus.emit('weather:changed', data);
  });
  
  weatherSystem.on('lightning', (data) => {
    console.log('[Weather] Lightning strike!');
    gameEventBus.emit('weather:lightning', data);
  });
  
  // Entity events
  gameEventBus.on('EntityDied', (data) => {
    console.log(`[Entity] ${data.entity.name || data.entity.type} died`);
  });
  
  // Chunk events
  gameEventBus.on('ChunkGenerated', (data) => {
    if (data.chunk) {
      console.log(`[Chunk] Generated ${data.chunk.cx},${data.chunk.cy}`);
    } else {
      console.log('[Chunk] Generated chunk (coordinates not available)');
    }
  });
}

/**
 * Generate a chunk using the new system
 * Compatible with old genChunk signature
 */
export async function genChunk(seed, cx, cy, options = {}) {
  if (!chunkSystem) {
    throw new Error('World systems not initialized. Call initWorldSystems() first');
  }
  
  const originalChunk = await chunkSystem.generateChunk(seed, cx, cy);
  
  // Debug logging
  if (!originalChunk) {
    console.error('[GameIntegration] ChunkSystem.generateChunk returned null/undefined for', cx, cy);
  }
  if (!originalChunk?.map) {
    console.error('[GameIntegration] Generated chunk has no map!', originalChunk);
  }
  
  // Create a new chunk object to avoid modifying frozen/read-only chunks
  const chunk = {
    ...originalChunk,
    cx: cx,
    cy: cy,
    // Ensure arrays exist and are mutable
    monsters: originalChunk.monsters ? [...originalChunk.monsters] : [],
    npcs: originalChunk.npcs ? [...originalChunk.npcs] : [],
    items: originalChunk.items ? [...originalChunk.items] : []
  };
  
  // Convert NPCs to entities if needed
  // IMPORTANT: Only create entities for NPCs that don't already have one
  chunk.npcs.forEach(npc => {
    if (!npc.entityId) {
      const entity = entityManager.createEntity({
        type: 'npc',
        name: npc.name,
        x: npc.x,
        y: npc.y,
        dialogue: npc.dialogue,
        faction: npc.faction,
        behavior: 'wander'
      });
      npc.entityId = entity.id;
    }
  });
  
  return chunk;
}

/**
 * Save a chunk using the new system
 * Fixed: Now uses worldSeed properly
 */
export async function saveChunk(worldSeed, cx, cy, chunk) {
  if (!chunkSystem) {
    throw new Error('World systems not initialized');
  }
  
  // Ensure chunk has correct coordinates
  chunk.cx = cx;
  chunk.cy = cy;
  
  // ChunkSystem.saveChunk expects (seed, chunk)
  // Use the actual worldSeed, not coordinates!
  await chunkSystem.saveChunk(worldSeed, chunk);
}

/**
 * Load a chunk using the new system
 */
export async function loadChunk(seed, cx, cy) {
  if (!chunkSystem) {
    throw new Error('World systems not initialized');
  }
  
  // Don't generate if not found - return null so caller knows to generate
  const chunk = await chunkSystem.loadChunk(seed, cx, cy, false);
  
  // If chunk has NPCs with entityIds, restore their entities
  if (chunk && chunk.npcs) {
    chunk.npcs.forEach(npc => {
      if (npc.entityId) {
        // Check if entity still exists
        const existingEntity = entityManager.getEntity(npc.entityId);
        if (!existingEntity) {
          // Restore entity with saved state
          const entity = entityManager.createEntity({
            type: 'npc',
            name: npc.name,
            x: npc.x,
            y: npc.y,
            dialogue: npc.dialogue,
            faction: npc.faction,
            behavior: npc.behavior || 'wander',
            id: npc.entityId // Preserve the ID
          });
        }
      } else {
        // This NPC doesn't have an entity yet, create one
        const entity = entityManager.createEntity({
          type: 'npc',
          name: npc.name,
          x: npc.x,
          y: npc.y,
          dialogue: npc.dialogue,
          faction: npc.faction,
          behavior: 'wander'
        });
        npc.entityId = entity.id;
      }
    });
  }
  
  return chunk;
}

/**
 * Start the world simulation
 */
export function startSimulation() {
  if (!worldSimulation) {
    throw new Error('World systems not initialized');
  }
  
  worldSimulation.start();
  console.log('[GameIntegration] World simulation started');
}

/**
 * Stop the world simulation
 */
export function stopSimulation() {
  if (worldSimulation && worldSimulation.isRunning) {
    worldSimulation.stop();
    console.log('[GameIntegration] World simulation stopped');
  }
}

// Throttling variables
let lastTimeUpdate = 0;
let lastWeatherCheck = 0;
const TIME_UPDATE_INTERVAL = 5000; // Update time every 5 seconds
const WEATHER_CHECK_INTERVAL = 5000; // Check weather every 5 seconds

// Chunk update throttling
const chunkUpdateMap = new Map(); // chunk key -> last update time
const CHUNK_UPDATE_INTERVAL = 1000; // Update chunks at most once per second

/**
 * Update world systems (call from game loop)
 * This is called every frame, so we need to throttle expensive operations
 */
export function updateWorld() {
  if (!worldSimulation || !worldSimulation.isRunning) {
    return;
  }
  
  const now = Date.now();
  
  // DON'T update time every frame - that's way too fast!
  // Time should advance on player actions, not renders
  
  // Update weather occasionally
  if (now - lastTimeUpdate > TIME_UPDATE_INTERVAL) {
    weatherSystem.update();
    lastTimeUpdate = now;
  }
  
  // Update entities (this is ok every frame for smooth movement)
  entityManager.updateBehaviors();
  
  // Update chunks near players (throttled)
  const loadedChunks = worldSimulation.getLoadedChunks();
  loadedChunks.forEach(chunk => {
    // Only update chunks that need updating (throttled)
    if (shouldUpdateChunk(chunk)) {
      // Apply weather effects
      weatherSystem.applyWeatherToChunk(chunk);
      
      // Update ecosystem
      ecosystemManager.updateChunk(chunk);
    }
  });
}

/**
 * Called when player takes an action (move, attack, etc)
 * This is when game time should advance
 */
export function onPlayerAction() {
  if (!timeSystem) return;
  
  // Advance time by one tick (5 minutes)
  timeSystem.tick();
  
  // Also tick ecosystem
  ecosystemManager.tick();
}

/**
 * Get current time for HUD display
 */
export function getTimeDisplay() {
  if (!timeSystem) return 'Day 1, 06:00';
  
  return timeSystem.getFormattedTime();
}

/**
 * Get current weather for HUD display
 */
export function getWeatherDisplay() {
  if (!weatherSystem) return 'Clear';
  
  const weather = weatherSystem.getCurrentWeather();
  const icons = {
    clear: '☀️',
    cloudy: '☁️',
    rain: '🌧️',
    storm: '⛈️',
    snow: '❄️'
  };
  
  return `${icons[weather.type] || ''} ${weather.type}`;
}

/**
 * Add player for simulation tracking
 */
export function addPlayer(player) {
  if (!worldSimulation) return;
  
  worldSimulation.addPlayer({
    id: 'player',
    x: player.x, // Already in tile coordinates
    y: player.y
  });
}

/**
 * Update player position for simulation
 * Fixed: Now properly converts to world coordinates
 */
export function updatePlayerPosition(player, chunkX = 0, chunkY = 0) {
  if (!worldSimulation) return;
  
  // Remove old position
  worldSimulation.removePlayer('player');
  
  // Convert local tile coordinates to world coordinates
  // player.x/y are tile position within chunk (0-23, 0-21)
  // chunkX/Y are the chunk coordinates
  const worldX = chunkX * W + player.x;
  const worldY = chunkY * H + player.y;
  
  // Add new position in world coordinates
  worldSimulation.addPlayer({
    id: 'player',
    x: worldX,
    y: worldY
  });
}

/**
 * Sync a single NPC with its entity
 */
export function syncNPCWithEntity(npc) {
  if (!entityManager || !npc.entityId) return;
  
  const entity = entityManager.getEntity(npc.entityId);
  if (entity) {
    // Update NPC position to match entity
    npc.x = entity.x;
    npc.y = entity.y;
    
    // Update other properties if needed
    if (entity.health !== undefined) {
      npc.hp = entity.health;
    }
  }
}

/**
 * Sync all NPCs in state with their entities
 */
export function syncNPCsWithEntities(state) {
  if (!state.npcs || !entityManager) return;
  
  state.npcs.forEach(npc => {
    syncNPCWithEntity(npc);
  });
}

/**
 * Check if rain should make player wet
 */
export function checkWeatherEffects(player) {
  if (!weatherSystem) return null;
  
  const weather = weatherSystem.getCurrentWeather();
  
  if (weather.type === 'rain' || weather.type === 'storm') {
    return {
      type: 'wet',
      duration: 4,
      reason: `Got wet from ${weather.type}`
    };
  }
  
  return null;
}

/**
 * Throttled version of weather check
 */
export function checkWeatherEffectsThrottled(player) {
  const now = Date.now();
  
  // Only check every 5 seconds
  if (now - lastWeatherCheck < WEATHER_CHECK_INTERVAL) {
    return null;
  }
  
  lastWeatherCheck = now;
  return checkWeatherEffects(player);
}

/**
 * Check if a chunk should be updated based on throttling
 */
export function shouldUpdateChunk(chunk) {
  if (!chunk) return false;
  
  const key = `${chunk.cx},${chunk.cy}`;
  const now = Date.now();
  const lastUpdate = chunkUpdateMap.get(key) || 0;
  
  // Check if enough time has passed since last update
  if (now - lastUpdate < CHUNK_UPDATE_INTERVAL) {
    return false;
  }
  
  // Mark this chunk as updated
  chunkUpdateMap.set(key, now);
  return true;
}

/**
 * Destroy/cleanup world systems
 */
export function destroyWorldSystems() {
  if (worldSimulation && worldSimulation.isRunning) {
    worldSimulation.stop();
  }
  
  if (timeSystem) {
    timeSystem.removeAllListeners();
  }
  
  if (weatherSystem) {
    weatherSystem.removeAllListeners();
  }
  
  if (gameEventBus) {
    gameEventBus.removeAllListeners();
  }
  
  // Clear references
  gameEventBus = null;
  chunkSystem = null;
  dynamicEventSystem = null;
  worldSimulation = null;
  entityManager = null;
  timeSystem = null;
  weatherSystem = null;
  ecosystemManager = null;
  
  console.log('[GameIntegration] World systems destroyed');
}

/**
 * Modify a chunk tile and mark it as modified
 */
export function modifyChunkTile(chunk, x, y, value) {
  if (!chunk || !chunk.map) return;
  
  // Bounds check
  if (y >= 0 && y < chunk.map.length && x >= 0 && x < chunk.map[0].length) {
    chunk.map[y][x] = value;
    chunk.modified = true;
    
    // Mark chunk as dirty in the cache if available
    if (chunkSystem && chunkSystem.cache) {
      // This would need to be implemented in ChunkSystem
      // For now just mark the chunk
      chunk.needsSave = true;
    }
  }
}

/**
 * Get all systems for debugging
 */
export function getSystems() {
  return {
    chunkSystem,
    dynamicEventSystem,
    worldSimulation,
    entityManager,
    timeSystem,
    weatherSystem,
    ecosystemManager,
    eventBus: gameEventBus
  };
}

// Export individual systems for direct access if needed
export {
  chunkSystem,
  dynamicEventSystem,
  worldSimulation,
  entityManager,
  timeSystem,
  weatherSystem,
  ecosystemManager
};