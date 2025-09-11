/**
 * World Simulation System
 * Manages autonomous world updates, entity behaviors, and time progression
 */

import { EventEmitter } from '../core/EventEmitter.js';

export class WorldSimulation extends EventEmitter {
  constructor(chunkSystem, eventBus, config = {}) {
    super();
    
    this.chunkSystem = chunkSystem;
    this.eventBus = eventBus;
    
    // Configuration
    this.config = {
      tickRate: config.tickRate || 20, // Ticks per second
      maxSimDistance: config.maxSimDistance || 10, // Max distance to simulate chunks
      batchSize: config.batchSize || 10, // Chunks to update per batch
      ...config
    };
    
    // State
    this.isRunning = false;
    this.isPaused = false;
    this.tickCount = 0;
    this.speed = 1.0;
    this.intervalId = null;
    
    // Players for distance-based simulation
    this.players = new Map();
    
    // Statistics
    this.stats = {
      ticksPerSecond: 0,
      averageTickTime: 0,
      totalTicks: 0,
      chunkUpdateRates: {},
      lastTickTimes: []
    };
    
    // Chunk update tracking
    this.chunkLastUpdate = new Map();
    this.chunkUpdatePriority = new Map();
  }
  
  /**
   * Start the simulation
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    
    const tickInterval = 1000 / (this.config.tickRate * this.speed);
    
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.tick();
      }
    }, tickInterval);
    
    this.emit('started');
  }
  
  /**
   * Stop the simulation
   */
  stop() {
    if (!this.isRunning) return;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    
    this.emit('stopped');
  }
  
  /**
   * Pause the simulation
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.emit('paused');
  }
  
  /**
   * Resume the simulation
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    
    this.isPaused = false;
    this.emit('resumed');
  }
  
  /**
   * Set simulation speed
   */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(10.0, speed));
    
    // Restart with new speed if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
  
  /**
   * Get current simulation speed
   */
  getSpeed() {
    return this.speed;
  }
  
  /**
   * Perform one simulation tick
   */
  tick() {
    const tickStart = performance.now();
    
    this.tickCount++;
    this.stats.totalTicks++;
    
    // Emit tick event
    this.emit('tick', {
      tickNumber: this.tickCount,
      timestamp: Date.now()
    });
    
    // Update chunks
    this.updateChunks();
    
    // Update statistics
    const tickTime = performance.now() - tickStart;
    this.updateStats(tickTime);
  }
  
  /**
   * Update loaded chunks
   */
  updateChunks() {
    const loadedChunks = this.getLoadedChunks();
    const chunksToUpdate = this.prioritizeChunks(loadedChunks);
    
    // Batch update for efficiency
    const batch = chunksToUpdate.slice(0, this.config.batchSize);
    
    if (batch.length > 0) {
      this.emit('batchUpdate', {
        chunks: batch,
        tickNumber: this.tickCount
      });
    }
    
    for (const chunk of batch) {
      this.updateChunk(chunk);
    }
  }
  
  /**
   * Update a single chunk
   */
  updateChunk(chunk) {
    const key = `${chunk.cx},${chunk.cy}`;
    
    // Track update rate
    const lastUpdate = this.chunkLastUpdate.get(key) || 0;
    const timeSinceUpdate = this.tickCount - lastUpdate;
    this.chunkLastUpdate.set(key, this.tickCount);
    
    // Update rate statistics
    if (!this.stats.chunkUpdateRates[key]) {
      this.stats.chunkUpdateRates[key] = 0;
    }
    this.stats.chunkUpdateRates[key]++;
    
    // Call chunk's update method if it exists
    if (chunk.onUpdate) {
      chunk.onUpdate(this.tickCount);
    }
    
    // Emit chunk update event
    this.emit('chunkUpdate', {
      chunk,
      tickNumber: this.tickCount,
      timeSinceLastUpdate: timeSinceUpdate
    });
  }
  
  /**
   * Get all loaded chunks from the chunk system
   */
  getLoadedChunks() {
    const chunks = [];
    
    if (this.chunkSystem && this.chunkSystem.cache) {
      // Get all chunks from cache
      if (this.chunkSystem.cache.chunks) {
        for (const item of this.chunkSystem.cache.chunks.values()) {
          // Check if it's an LRUNode or direct chunk
          const chunk = item.value || item;
          if (chunk && chunk.cx !== undefined && chunk.cy !== undefined) {
            chunks.push(chunk);
          }
        }
      } else if (this.chunkSystem.cache.cache) {
        for (const item of this.chunkSystem.cache.cache.values()) {
          // Check if it's an LRUNode or direct chunk
          const chunk = item.value || item;
          if (chunk && chunk.cx !== undefined && chunk.cy !== undefined) {
            chunks.push(chunk);
          }
        }
      }
    }
    
    return chunks;
  }
  
  /**
   * Prioritize chunks based on player distance
   */
  prioritizeChunks(chunks) {
    if (this.players.size === 0) {
      // No players, update all chunks equally
      return chunks;
    }
    
    // Calculate priorities based on minimum distance to any player
    const priorities = chunks.map(chunk => {
      let minDistance = Infinity;
      
      for (const player of this.players.values()) {
        // Player position is already in tile coordinates
        // We need to compare chunk center with player position in same coordinate system
        const chunkCenterX = chunk.cx * 24 + 12; // Center of chunk in world tiles
        const chunkCenterY = chunk.cy * 22 + 11;
        
        // Player position needs to be in world tiles too
        // But player.x/y are LOCAL tile coords, we need the chunk they're in
        // For now, assume player coords are world tiles (fixed in gameIntegration)
        const dx = chunkCenterX - player.x;
        const dy = chunkCenterY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }
      
      return {
        chunk,
        priority: 1 / (1 + minDistance)
      };
    });
    
    // Sort by priority (highest first)
    priorities.sort((a, b) => b.priority - a.priority);
    
    return priorities.map(p => p.chunk);
  }
  
  /**
   * Add a player for distance-based simulation
   */
  addPlayer(player) {
    this.players.set(player.id, player);
    this.emit('playerAdded', player);
  }
  
  /**
   * Remove a player
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.emit('playerRemoved', player);
    }
  }
  
  /**
   * Update statistics
   */
  updateStats(tickTime) {
    this.stats.lastTickTimes.push(tickTime);
    
    // Keep only last 100 tick times
    if (this.stats.lastTickTimes.length > 100) {
      this.stats.lastTickTimes.shift();
    }
    
    // Calculate average tick time
    const sum = this.stats.lastTickTimes.reduce((a, b) => a + b, 0);
    this.stats.averageTickTime = sum / this.stats.lastTickTimes.length;
    
    // Calculate ticks per second
    this.stats.ticksPerSecond = 1000 / this.stats.averageTickTime;
  }
  
  /**
   * Get simulation statistics
   */
  getSimulationStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      tickCount: this.tickCount,
      speed: this.speed,
      playerCount: this.players.size
    };
  }
  
  /**
   * Get performance metrics
   */
  getMetrics() {
    const loadedChunks = this.getLoadedChunks();
    
    return {
      ticksPerSecond: this.stats.ticksPerSecond,
      averageTickTime: this.stats.averageTickTime,
      activeChunks: loadedChunks.length,
      totalEntities: this.countEntities(),
      simulationLoad: this.calculateLoad()
    };
  }
  
  /**
   * Count total entities across all chunks
   */
  countEntities() {
    let total = 0;
    const chunks = this.getLoadedChunks();
    
    for (const chunk of chunks) {
      if (chunk.entities) {
        total += chunk.entities.length;
      }
      if (chunk.monsters) {
        total += chunk.monsters.length;
      }
      if (chunk.npcs) {
        total += chunk.npcs.length;
      }
    }
    
    return total;
  }
  
  /**
   * Calculate simulation load (0-1)
   */
  calculateLoad() {
    // Simple load calculation based on tick time
    const targetTickTime = 1000 / this.config.tickRate;
    const load = this.stats.averageTickTime / targetTickTime;
    
    return Math.min(1.0, load);
  }
  
  /**
   * Destroy the simulation
   */
  destroy() {
    this.stop();
    this.players.clear();
    this.chunkLastUpdate.clear();
    this.chunkUpdatePriority.clear();
    this.removeAllListeners();
  }
}