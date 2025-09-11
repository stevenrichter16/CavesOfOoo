/**
 * ChunkStreaming - Efficient chunk loading/unloading for infinite worlds
 * Manages viewport-based streaming, memory optimization, and LOD
 */

// Node.js imports for compression (for Node.js environment)
let gzip, gunzip;
let STREAMING_CONSTANTS;

try {
  // Try to import Node.js zlib
  const zlib = await import('zlib');
  const { promisify } = await import('util');
  gzip = promisify(zlib.gzip);
  gunzip = promisify(zlib.gunzip);
} catch {
  // Fallback for browser environment - use fake compression
  gzip = async (data, options) => {
    // Fake compression for browser
    return Buffer.from(JSON.stringify({ compressed: true, data: data.toString() }));
  };
  gunzip = async (data) => {
    // Fake decompression for browser
    const obj = JSON.parse(data.toString());
    return Buffer.from(obj.data);
  };
}

try {
  // Import constants
  const constantsModule = await import('../constants.js');
  STREAMING_CONSTANTS = constantsModule.STREAMING_CONSTANTS;
} catch {
  // Fallback constants
  STREAMING_CONSTANTS = {
    DEFAULT_MAX_CHUNKS: 100,
    DEFAULT_MEMORY_LIMIT: 50 * 1024 * 1024,
    DEFAULT_BATCH_SIZE: 10,
    DEFAULT_VIEWPORT_RADIUS: 5,
    MOVEMENT_HISTORY_DURATION: 5000,
    MOVEMENT_HISTORY_MAX_SIZE: 100,
    MEMORY_CLEANUP_THRESHOLD: 0.9,
    BASE_CHUNK_MEMORY: 1024,
    TILE_MEMORY_SIZE: 1,
    ENTITY_MEMORY_SIZE: 100,
    ITEM_MEMORY_SIZE: 50,
    REQUEST_BATCH_HISTORY_LIMIT: 10,
    CANCELLED_REQUESTS_LIMIT: 100,
    STREAMING_ISSUES_LIMIT: 100,
    LARGE_VIEWPORT_WARNING: 20,
    DEFAULT_LOD_DISTANCES: [3, 6, 10],
    PREDICTIVE_CHUNK_RADIUS: 2
  };
}

/**
 * Chunk streaming system for infinite world support
 */
export class ChunkStreaming {
  constructor(chunkSystem, eventBus, config = {}) {
    this.chunkSystem = chunkSystem;
    this.eventBus = eventBus;
    
    // Configuration
    this.config = {
      maxLoadedChunks: config.maxLoadedChunks || 100,
      memoryLimit: config.memoryLimit || 50 * 1024 * 1024, // 50MB default
      batchSize: config.batchSize || 10,
      requestThrottle: config.requestThrottle || 0,
      loadingStrategy: config.loadingStrategy || 'distance', // distance, progressive
      enableLOD: config.enableLOD || false,
      enablePredictive: config.enablePredictive || false,
      enableNetworkMode: config.enableNetworkMode || false,
      enableDeltaUpdates: config.enableDeltaUpdates || false,
      enableMetrics: config.enableMetrics || true,
      compressionLevel: config.compressionLevel || 6,
      ...config
    };
    
    // Viewport
    this.viewport = {
      centerX: 0,
      centerY: 0,
      radius: 5
    };
    
    // Active chunks
    this.activeChunks = new Map(); // key -> chunk
    this.chunkAccessTime = new Map(); // key -> timestamp
    
    // Loading management
    this.loadingQueue = [];
    this.pendingRequests = new Map();
    this.cancelledRequests = new Set();
    
    // LOD configuration
    this.lodDistances = [3, 6, 10]; // high, medium, low
    this.lodEnabled = false;
    
    // Statistics
    this.stats = {
      chunksLoaded: 0,
      chunksUnloaded: 0,
      bytesTransferred: 0,
      totalLoadTime: 0,
      loadCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      compressionSavings: 0
    };
    
    // Performance tracking
    this.performanceMetrics = {
      peakMemoryUsage: 0,
      averageLoadTime: 0,
      totalBytesTransferred: 0
    };
    
    // Movement prediction
    this.movementHistory = [];
    this.predictedDirection = { x: 0, y: 0 };
    
    // Request batching
    this.requestBatches = [];
    this.currentBatch = [];
    
    // World type
    this.worldType = 'infinite';
    this.worldBounds = null;
    
    // Issues tracking
    this.streamingIssues = [];
    
    // Setup integration
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for integration
   */
  setupEventListeners() {
    if (this.eventBus) {
      this.eventBus.on('PlayerMoved', this.handlePlayerMove.bind(this));
      this.eventBus.on('ChunkRequested', this.handleChunkRequest.bind(this));
    }
  }
  
  /**
   * Set viewport position and radius
   */
  setViewport(centerX, centerY, radius) {
    const oldViewport = { ...this.viewport };
    
    this.viewport.centerX = centerX;
    this.viewport.centerY = centerY;
    this.viewport.radius = radius;
    
    // Check for issues
    if (radius > 20) {
      this.streamingIssues.push({
        type: 'VIEWPORT_TOO_LARGE',
        severity: 'warning',
        message: `Viewport radius ${radius} may cause performance issues`
      });
    }
    
    // Cancel pending requests if viewport changed significantly
    if (Math.abs(oldViewport.centerX - centerX) > radius ||
        Math.abs(oldViewport.centerY - centerY) > radius) {
      this.cancelPendingRequests();
    }
  }
  
  /**
   * Get current viewport
   */
  getViewport() {
    return { ...this.viewport };
  }
  
  /**
   * Get visible chunks based on viewport
   */
  getVisibleChunks() {
    const chunks = [];
    const { centerX, centerY, radius } = this.viewport;
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const cx = centerX + dx;
        const cy = centerY + dy;
        
        // Apply world wrapping if needed
        const coords = this.worldType === 'toroidal' 
          ? this.wrapCoordinates(cx, cy)
          : { cx, cy };
        
        chunks.push(coords);
      }
    }
    
    return chunks;
  }
  
  /**
   * Move viewport to new position
   */
  async moveViewport(newX, newY) {
    const oldChunks = new Set(
      this.getVisibleChunks().map(c => `${c.cx},${c.cy}`)
    );
    
    // Update movement history for prediction
    if (this.config.enablePredictive) {
      this.updateMovementHistory(newX - this.viewport.centerX, newY - this.viewport.centerY);
    }
    
    this.setViewport(newX, newY, this.viewport.radius);
    
    const newChunks = this.getVisibleChunks();
    const newChunkSet = new Set(newChunks.map(c => `${c.cx},${c.cy}`));
    
    // Find chunks to unload
    const toUnload = [];
    for (const key of oldChunks) {
      if (!newChunkSet.has(key)) {
        toUnload.push(key);
      }
    }
    
    // Unload old chunks
    for (const key of toUnload) {
      this.unloadChunk(key);
    }
    
    // Load new chunks
    if (this.chunkSystem) {
      const toLoad = newChunks.filter(c => {
        const key = `${c.cx},${c.cy}`;
        return !oldChunks.has(key) && !this.activeChunks.has(key);
      });
      
      // Sort by distance for priority loading
      toLoad.sort((a, b) => {
        const distA = Math.abs(a.cx - newX) + Math.abs(a.cy - newY);
        const distB = Math.abs(b.cx - newX) + Math.abs(b.cy - newY);
        return distA - distB;
      });
      
      // Load chunks
      for (const coord of toLoad) {
        await this.loadChunk('world-seed', coord.cx, coord.cy);
      }
    }
  }
  
  /**
   * Get chunks that were reused in last viewport update
   */
  getReusedChunks() {
    const visible = this.getVisibleChunks();
    const reused = visible.filter(c => {
      const key = `${c.cx},${c.cy}`;
      return this.activeChunks.has(key);
    });
    return reused;
  }
  
  /**
   * Load all visible chunks
   */
  async loadVisibleChunks(seed) {
    const chunks = this.getVisibleChunks();
    
    if (this.config.loadingStrategy === 'progressive') {
      return this.loadProgressively(seed);
    }
    
    // Sort by distance from center
    chunks.sort((a, b) => {
      const distA = Math.abs(a.cx - this.viewport.centerX) + 
                   Math.abs(a.cy - this.viewport.centerY);
      const distB = Math.abs(b.cx - this.viewport.centerX) + 
                   Math.abs(b.cy - this.viewport.centerY);
      return distA - distB;
    });
    
    // Load chunks
    const loaded = [];
    for (const coord of chunks) {
      const chunk = await this.loadChunk(seed, coord.cx, coord.cy);
      if (chunk) loaded.push(chunk);
    }
    
    return loaded;
  }
  
  /**
   * Load chunks progressively in rings
   */
  async loadProgressively(seed) {
    const rings = [];
    const { centerX, centerY, radius } = this.viewport;
    
    for (let r = 0; r <= radius; r++) {
      const ring = [];
      
      if (r === 0) {
        // Center chunk
        ring.push(await this.loadChunk(seed, centerX, centerY));
      } else {
        // Ring chunks
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            // Only chunks at exact distance r
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
              const chunk = await this.loadChunk(seed, centerX + dx, centerY + dy);
              if (chunk) ring.push(chunk);
            }
          }
        }
      }
      
      rings.push(ring);
    }
    
    return rings;
  }
  
  /**
   * Load a single chunk
   */
  async loadChunk(seed, cx, cy) {
    const key = `${cx},${cy}`;
    
    // Check if already loaded
    if (this.activeChunks.has(key)) {
      this.chunkAccessTime.set(key, Date.now());
      this.stats.cacheHits++;
      return this.activeChunks.get(key);
    }
    
    // Check if pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Apply throttling
    if (this.config.requestThrottle > 0) {
      await this.throttle();
    }
    
    const startTime = Date.now();
    
    try {
      // Create loading promise
      const loadPromise = this.chunkSystem 
        ? this.chunkSystem.generateChunk(seed, cx, cy)
        : Promise.resolve(this.createFallbackChunk(cx, cy));
      
      this.pendingRequests.set(key, loadPromise);
      
      const chunk = await loadPromise;
      
      // Apply LOD if enabled
      if (this.lodEnabled) {
        const distance = Math.abs(cx - this.viewport.centerX) + 
                        Math.abs(cy - this.viewport.centerY);
        chunk.lod = this.getLODLevel(distance);
        
        if (chunk.lod === 'low') {
          chunk.simplified = true;
          delete chunk.monsters;
          delete chunk.items;
        } else if (chunk.lod === 'medium') {
          chunk.simplified = true;
          // Keep monsters but remove items
          delete chunk.items;
        } else {
          chunk.lod = 'high';
        }
      }
      
      // Check memory before adding
      this.enforceMemoryLimit();
      
      // Add to active chunks
      this.activeChunks.set(key, chunk);
      this.chunkAccessTime.set(key, Date.now());
      
      // Update stats
      this.stats.chunksLoaded++;
      this.stats.totalLoadTime += Date.now() - startTime;
      this.stats.loadCount++;
      this.stats.cacheMisses++;
      
      // Update metrics
      const memUsage = this.getMemoryUsage();
      if (memUsage > this.performanceMetrics.peakMemoryUsage) {
        this.performanceMetrics.peakMemoryUsage = memUsage;
      }
      
      return chunk;
      
    } catch (error) {
      // Return fallback chunk on error
      console.error(`Failed to load chunk ${cx},${cy}:`, error);
      return this.createFallbackChunk(cx, cy);
      
    } finally {
      this.pendingRequests.delete(key);
    }
  }
  
  /**
   * Create fallback chunk
   */
  createFallbackChunk(cx, cy) {
    return {
      cx,
      cy,
      map: Array(22).fill().map(() => Array(24).fill('#')),
      fallback: true,
      biome: 'void'
    };
  }
  
  /**
   * Unload a chunk
   */
  unloadChunk(key) {
    if (this.activeChunks.has(key)) {
      this.activeChunks.delete(key);
      this.chunkAccessTime.delete(key);
      this.stats.chunksUnloaded++;
    }
  }
  
  /**
   * Get unloaded chunks list
   */
  getUnloadedChunks() {
    const unloaded = [];
    const visible = new Set(
      this.getVisibleChunks().map(c => `${c.cx},${c.cy}`)
    );
    
    for (const [key, chunk] of this.activeChunks) {
      if (!visible.has(key)) {
        unloaded.push(chunk);
      }
    }
    
    return unloaded;
  }
  
  /**
   * Enforce memory limit by unloading LRU chunks
   */
  enforceMemoryLimit() {
    // Check chunk count limit
    if (this.activeChunks.size >= this.config.maxLoadedChunks) {
      // Find LRU chunk
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [key, time] of this.chunkAccessTime) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.unloadChunk(oldestKey);
      }
    }
    
    // Check memory limit
    const memUsage = this.getMemoryUsage();
    if (memUsage > this.config.memoryLimit) {
      // Unload chunks until under limit
      const sorted = Array.from(this.chunkAccessTime.entries())
        .sort((a, b) => a[1] - b[1]);
      
      for (const [key] of sorted) {
        this.unloadChunk(key);
        if (this.getMemoryUsage() < this.config.memoryLimit * STREAMING_CONSTANTS.MEMORY_CLEANUP_THRESHOLD) {
          break;
        }
      }
    }
  }
  
  /**
   * Get memory usage estimate
   */
  getMemoryUsage() {
    // Rough estimate: 1KB per chunk base + map data
    let totalBytes = 0;
    
    for (const chunk of this.activeChunks.values()) {
      // Base chunk data
      totalBytes += 1024;
      
      // Map data (22x24 tiles, ~1 byte per tile)
      if (chunk.map) {
        totalBytes += 22 * 24;
      }
      
      // Entities
      if (chunk.monsters) totalBytes += chunk.monsters.length * 100;
      if (chunk.npcs) totalBytes += chunk.npcs.length * 100;
      if (chunk.items) totalBytes += chunk.items.length * 50;
    }
    
    return totalBytes;
  }
  
  /**
   * Get active chunks
   */
  getActiveChunks() {
    return Array.from(this.activeChunks.values());
  }
  
  /**
   * Set maximum loaded chunks
   */
  setMaxLoadedChunks(max) {
    this.config.maxLoadedChunks = max;
    this.enforceMemoryLimit();
  }
  
  /**
   * Set memory limit
   */
  setMemoryLimit(bytes) {
    this.config.memoryLimit = bytes;
    this.enforceMemoryLimit();
  }
  
  /**
   * Set loading strategy
   */
  setLoadingStrategy(strategy) {
    this.config.loadingStrategy = strategy;
  }
  
  /**
   * Enable predictive loading
   */
  enablePredictiveLoading(enabled) {
    this.config.enablePredictive = enabled;
  }
  
  /**
   * Get predicted chunks based on movement
   */
  getPredictedChunks() {
    if (!this.config.enablePredictive) return [];
    
    const predicted = [];
    const { centerX, centerY, radius } = this.viewport;
    
    // Predict based on movement direction
    const nextX = centerX + Math.round(this.predictedDirection.x * radius);
    const nextY = centerY + Math.round(this.predictedDirection.y * radius);
    
    // Get chunks in predicted direction
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        predicted.push({
          cx: nextX + dx,
          cy: nextY + dy
        });
      }
    }
    
    return predicted;
  }
  
  /**
   * Update movement history for prediction
   */
  updateMovementHistory(dx, dy) {
    this.movementHistory.push({ dx, dy, time: Date.now() });
    
    // Limit history size to prevent memory leak
    if (this.movementHistory.length > STREAMING_CONSTANTS.MOVEMENT_HISTORY_MAX_SIZE) {
      this.movementHistory = this.movementHistory.slice(-STREAMING_CONSTANTS.MOVEMENT_HISTORY_MAX_SIZE);
    }
    
    // Keep only recent history
    const cutoff = Date.now() - STREAMING_CONSTANTS.MOVEMENT_HISTORY_DURATION;
    this.movementHistory = this.movementHistory.filter(m => m.time > cutoff);
    
    // Calculate average movement direction
    if (this.movementHistory.length > 2) {
      let totalDx = 0, totalDy = 0;
      for (const move of this.movementHistory) {
        totalDx += move.dx;
        totalDy += move.dy;
      }
      
      const length = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
      if (length > 0) {
        this.predictedDirection.x = totalDx / length;
        this.predictedDirection.y = totalDy / length;
      }
    }
  }
  
  /**
   * Request a chunk (for batching)
   */
  async requestChunk(seed, cx, cy) {
    this.currentBatch.push({ seed, cx, cy });
    
    if (this.currentBatch.length >= this.config.batchSize) {
      const batch = this.currentBatch;
      this.currentBatch = [];
      this.requestBatches.push(batch);
      
      // Limit batch history to prevent memory leak
      if (this.requestBatches.length > STREAMING_CONSTANTS.REQUEST_BATCH_HISTORY_LIMIT) {
        this.requestBatches = this.requestBatches.slice(-STREAMING_CONSTANTS.REQUEST_BATCH_HISTORY_LIMIT);
      }
      
      // Process batch
      const results = [];
      for (const req of batch) {
        results.push(await this.loadChunk(req.seed, req.cx, req.cy));
      }
      return results[results.length - 1];
    }
    
    // Return promise for this specific chunk
    return this.loadChunk(seed, cx, cy);
  }
  
  /**
   * Get request batches
   */
  getRequestBatches() {
    return this.requestBatches;
  }
  
  /**
   * Set batch size
   */
  setBatchSize(size) {
    this.config.batchSize = size;
  }
  
  /**
   * Set request throttle
   */
  setRequestThrottle(ms) {
    this.config.requestThrottle = ms;
  }
  
  /**
   * Throttle requests
   */
  async throttle() {
    if (this.lastRequestTime) {
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < this.config.requestThrottle) {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.requestThrottle - elapsed)
        );
      }
    }
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Cancel pending requests
   */
  cancelPendingRequests() {
    for (const key of this.pendingRequests.keys()) {
      this.cancelledRequests.add(key);
    }
    this.pendingRequests.clear();
    
    // Cleanup old cancelled requests to prevent memory leak
    this.cleanupCancelledRequests();
  }
  
  /**
   * Cleanup cancelled requests to prevent memory leak
   */
  cleanupCancelledRequests() {
    if (this.cancelledRequests.size > STREAMING_CONSTANTS.CANCELLED_REQUESTS_LIMIT) {
      const toKeep = Array.from(this.cancelledRequests)
        .slice(-STREAMING_CONSTANTS.CANCELLED_REQUESTS_LIMIT);
      this.cancelledRequests = new Set(toKeep);
    }
  }
  
  /**
   * Cleanup issues log to prevent memory leak
   */
  cleanupIssues() {
    if (this.streamingIssues.length > STREAMING_CONSTANTS.STREAMING_ISSUES_LIMIT) {
      this.streamingIssues = this.streamingIssues.slice(-STREAMING_CONSTANTS.STREAMING_ISSUES_LIMIT);
    }
  }
  
  /**
   * Get cancelled requests
   */
  getCancelledRequests() {
    return Array.from(this.cancelledRequests);
  }
  
  /**
   * Enable LOD system
   */
  enableLOD(enabled) {
    this.lodEnabled = enabled;
  }
  
  /**
   * Set LOD distances
   */
  setLODDistances(distances) {
    this.lodDistances = distances;
  }
  
  /**
   * Get LOD level for distance
   */
  getLODLevel(distance) {
    if (distance <= this.lodDistances[0]) return 'high';
    if (distance <= this.lodDistances[1]) return 'medium';
    return 'low';
  }
  
  /**
   * Load chunk with specific LOD
   */
  async loadChunkWithLOD(seed, cx, cy, lod) {
    const chunk = await this.loadChunk(seed, cx, cy);
    
    if (lod === 'low') {
      chunk.simplified = true;
      delete chunk.monsters;
      delete chunk.items;
      chunk.lod = 'low';
    } else if (lod === 'medium') {
      chunk.simplified = true;
      delete chunk.items;
      chunk.lod = 'medium';
    } else {
      chunk.lod = 'high';
    }
    
    return chunk;
  }
  
  /**
   * Enable network mode
   */
  enableNetworkMode(enabled) {
    this.config.enableNetworkMode = enabled;
  }
  
  /**
   * Set compression level
   */
  setCompressionLevel(level) {
    this.config.compressionLevel = level;
  }
  
  /**
   * Compress chunk for network
   */
  async compressChunk(chunk) {
    const original = JSON.stringify(chunk);
    const originalBuffer = Buffer.from(original);
    
    // Use real compression
    const compressedData = await gzip(originalBuffer, {
      level: this.config.compressionLevel
    });
    
    const compressed = {
      size: compressedData.length,
      originalSize: originalBuffer.length,
      compressionRatio: compressedData.length / originalBuffer.length,
      data: compressedData
    };
    
    this.stats.compressionSavings += originalBuffer.length - compressedData.length;
    
    return compressed;
  }
  
  /**
   * Decompress chunk data
   */
  async decompressChunk(compressedData) {
    const decompressed = await gunzip(compressedData);
    return JSON.parse(decompressed.toString());
  }
  
  /**
   * Enable delta updates
   */
  enableDeltaUpdates(enabled) {
    this.config.enableDeltaUpdates = enabled;
  }
  
  /**
   * Get chunk delta
   */
  getChunkDelta(cx, cy, newChunk) {
    const key = `${cx},${cy}`;
    const oldChunk = this.activeChunks.get(key);
    
    if (!oldChunk) {
      return {
        size: JSON.stringify(newChunk).length,
        operations: [{ op: 'replace', path: '/', value: newChunk }]
      };
    }
    
    // Calculate delta (simplified)
    const operations = [];
    
    // Check monsters
    if (newChunk.monsters?.length !== oldChunk.monsters?.length) {
      operations.push({
        op: 'add',
        path: '/monsters/-',
        value: newChunk.monsters[newChunk.monsters.length - 1]
      });
    }
    
    return {
      size: JSON.stringify(operations).length,
      operations
    };
  }
  
  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    const avgLoadTime = this.stats.loadCount > 0 
      ? this.stats.totalLoadTime / this.stats.loadCount 
      : 0;
    
    const cacheHitRate = (this.stats.cacheHits + this.stats.cacheMisses) > 0
      ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
      : 0;
    
    return {
      chunksLoaded: this.stats.chunksLoaded,
      chunksInMemory: this.activeChunks.size,
      memoryUsage: this.getMemoryUsage(),
      averageLoadTime: avgLoadTime,
      cacheHitRate,
      chunksUnloaded: this.stats.chunksUnloaded,
      compressionSavings: this.stats.compressionSavings
    };
  }
  
  /**
   * Enable metrics
   */
  enableMetrics(enabled) {
    this.config.enableMetrics = enabled;
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      averageLoadTime: this.stats.loadCount > 0 
        ? this.stats.totalLoadTime / this.stats.loadCount 
        : 0,
      peakMemoryUsage: this.performanceMetrics.peakMemoryUsage,
      totalBytesTransferred: this.stats.bytesTransferred
    };
  }
  
  /**
   * Get streaming issues
   */
  getStreamingIssues() {
    return this.streamingIssues;
  }
  
  /**
   * Integrate with chunk system
   */
  integrateWithChunkSystem(chunkSystem) {
    this.chunkSystem = chunkSystem;
    return true;
  }
  
  /**
   * Handle player movement
   */
  async handlePlayerMove(event) {
    const { x, y } = event;
    await this.moveViewport(x, y);
  }
  
  /**
   * Handle chunk request
   */
  async handleChunkRequest(event) {
    const { seed, cx, cy, callback } = event;
    const chunk = await this.loadChunk(seed, cx, cy);
    if (callback) callback(chunk);
  }
  
  /**
   * Set world type
   */
  setWorldType(type, bounds = null) {
    this.worldType = type;
    this.worldBounds = bounds;
  }
  
  /**
   * Wrap coordinates for toroidal worlds
   */
  wrapCoordinates(cx, cy) {
    if (this.worldType !== 'toroidal' || !this.worldBounds) {
      return { cx, cy };
    }
    
    const { width, height } = this.worldBounds;
    
    let wrappedX = cx % width;
    let wrappedY = cy % height;
    
    if (wrappedX < 0) wrappedX += width;
    if (wrappedY < 0) wrappedY += height;
    
    return { cx: wrappedX, cy: wrappedY };
  }
}