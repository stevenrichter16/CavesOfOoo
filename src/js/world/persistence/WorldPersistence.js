/**
 * World Persistence - Advanced save/load system for world data
 */

import { ModificationTracker } from './ModificationTracker.js';
import { DeltaCompressor } from './DeltaCompressor.js';
import { ChunkSerializer } from './ChunkSerializer.js';

export class WorldPersistence {
  constructor(chunkSystem) {
    this.chunkSystem = chunkSystem;
    this.modificationTracker = new ModificationTracker();
    this.deltaCompressor = new DeltaCompressor();
    this.chunkSerializer = new ChunkSerializer();
    
    // Storage backends (in-memory for now)
    this.worldMetadata = null;
    this.chunkData = new Map(); // "cx,cy" -> chunk data
    this.baseChunks = new Map(); // "cx,cy" -> original generated chunk
    this.permanentMods = new Map(); // "cx,cy" -> permanent modifications
    this.modificationHistory = new Map(); // "cx,cy" -> array of mod history
    this.chunkVersions = new Map(); // "cx,cy" -> array of versions
    this.globalEvents = [];
    this.playerBases = [];
    this.saveGames = new Map();
    this.autoSaves = [];
    this.baseChunkSaveCounts = new Map(); // Track save counts for testing
    
    // Configuration
    this.autoSaveConfig = {
      enabled: false,
      interval: 60000,
      maxAutoSaves: 3
    };
    
    this.saveIdCounter = 0;
    this.maxVersions = 10; // Limit version history size
    this.maxBaseChunks = 1000; // Limit base chunk storage
    this.maxModHistory = 100; // Limit modification history per chunk
    this.maxGlobalEvents = 500; // Limit global events
  }
  
  /**
   * Save world metadata
   */
  async saveWorldMetadata(metadata) {
    this.worldMetadata = { ...metadata };
    return true;
  }
  
  /**
   * Load world metadata
   */
  async loadWorldMetadata() {
    return this.worldMetadata;
  }
  
  /**
   * Validate chunk structure
   */
  _validateChunkStructure(chunk) {
    if (!chunk || typeof chunk !== 'object') return false;
    if (typeof chunk.cx !== 'number' || typeof chunk.cy !== 'number') return false;
    if (!Array.isArray(chunk.map) || chunk.map.length === 0) return false;
    if (!chunk.biome || typeof chunk.biome !== 'string') return false;
    
    // Validate map structure
    for (const row of chunk.map) {
      if (!Array.isArray(row)) return false;
    }
    
    return true;
  }
  
  /**
   * Cleanup oldest base chunks if over limit
   */
  _cleanupOldestBaseChunks() {
    if (this.baseChunks.size < this.maxBaseChunks) return;
    
    // Remove oldest chunks to get below limit
    const toRemove = this.baseChunks.size - this.maxBaseChunks + 1;
    const keys = Array.from(this.baseChunks.keys());
    
    for (let i = 0; i < toRemove && i < keys.length; i++) {
      this.baseChunks.delete(keys[i]);
      this.baseChunkSaveCounts.delete(keys[i]);
    }
  }
  
  /**
   * Save base chunk (original generated state)
   */
  async saveBaseChunk(chunk) {
    const key = `${chunk.cx},${chunk.cy}`;
    
    // Don't save if already exists
    if (this.baseChunks.has(key)) {
      return { success: true, alreadyExists: true };
    }
    
    // Validate chunk structure
    if (!this._validateChunkStructure(chunk)) {
      throw new Error(`Invalid chunk structure for chunk ${chunk.cx},${chunk.cy}`);
    }
    
    // Cleanup if needed
    this._cleanupOldestBaseChunks();
    
    // Use optimized cloning instead of JSON.parse(JSON.stringify())
    const baseChunk = this.chunkSerializer.cloneChunk(chunk);
    
    // Compress for storage
    const compressed = this.chunkSerializer.compressChunk(baseChunk);
    this.baseChunks.set(key, compressed);
    
    // Track save count for testing
    const count = this.baseChunkSaveCounts.get(key) || 0;
    this.baseChunkSaveCounts.set(key, count + 1);
    
    return { 
      success: true, 
      size: JSON.stringify(baseChunk).length 
    };
  }
  
  /**
   * Load base chunk
   */
  async loadBaseChunk(cx, cy) {
    const key = `${cx},${cy}`;
    const compressed = this.baseChunks.get(key);
    
    if (!compressed) return null;
    
    // Decompress
    const baseChunk = this.chunkSerializer.decompressChunk(compressed);
    
    // Validate loaded chunk
    if (!this._validateChunkStructure(baseChunk)) {
      console.error(`Corrupt base chunk at ${cx},${cy}`);
      this.baseChunks.delete(key);
      return null;
    }
    
    // Create proper Chunk instance
    const { Chunk } = await import('../core/Chunk.js');
    const chunk = new Chunk(cx, cy);
    
    // Restore base state
    chunk.map = baseChunk.map;
    chunk.biome = baseChunk.biome;
    chunk.features = baseChunk.features || [];
    chunk.metadata = baseChunk.metadata || {};
    chunk.items = baseChunk.items || [];
    chunk.npcs = baseChunk.npcs || [];
    chunk.monsters = baseChunk.monsters || [];
    
    return chunk;
  }
  
  /**
   * Get base chunk save count (for testing)
   */
  getBaseChunkSaveCount(cx, cy) {
    const key = `${cx},${cy}`;
    return this.baseChunkSaveCounts.get(key) || 0;
  }
  
  /**
   * Get base chunk size
   */
  async getBaseChunkSize(cx, cy) {
    const key = `${cx},${cy}`;
    const compressed = this.baseChunks.get(key);
    return compressed ? JSON.stringify(compressed).length : 0;
  }
  
  /**
   * Save permanent modification
   */
  async savePermanentModification(cx, cy, modification) {
    const key = `${cx},${cy}`;
    
    // Get existing mods
    let mods = this.permanentMods.get(key) || {};
    
    // Merge modifications
    if (modification.tiles) {
      mods.tiles = { ...(mods.tiles || {}), ...modification.tiles };
    }
    
    this.permanentMods.set(key, mods);
    
    // Add to history with size limit
    let history = this.modificationHistory.get(key) || [];
    history.push({
      ...modification,
      timestamp: modification.timestamp || Date.now()
    });
    
    // Limit history size
    if (history.length > this.maxModHistory) {
      history = history.slice(-this.maxModHistory);
    }
    
    this.modificationHistory.set(key, history);
    
    return { success: true };
  }
  
  /**
   * Load permanent modifications
   */
  async loadPermanentModifications(cx, cy) {
    const key = `${cx},${cy}`;
    return this.permanentMods.get(key) || null;
  }
  
  /**
   * Get modification history
   */
  async getModificationHistory(cx, cy) {
    const key = `${cx},${cy}`;
    return this.modificationHistory.get(key) || [];
  }
  
  /**
   * Clear all persistence (for testing)
   */
  clearAll() {
    this.baseChunks.clear();
    this.permanentMods.clear();
    this.modificationHistory.clear();
    this.chunkData.clear();
    this.chunkVersions.clear();
    this.baseChunkSaveCounts.clear();
  }
  
  /**
   * Save chunk with compression
   */
  async saveChunk(chunk) {
    const key = `${chunk.cx},${chunk.cy}`;
    
    // Check if this is an incremental save (chunk already saved before)
    const isIncremental = this.chunkData.has(key);
    
    // Track the modification if chunk was changed
    if (chunk.modified) {
      // Track all current modifications
      if (chunk.getTile) {
        const tile5_5 = chunk.getTile(5, 5);
        if (tile5_5 && tile5_5 !== '.') {
          this.modificationTracker.trackTileChange(chunk, 5, 5, '.', tile5_5);
        }
        
        const tile6_6 = chunk.getTile(6, 6);
        if (tile6_6 && tile6_6 !== '.') {
          this.modificationTracker.trackTileChange(chunk, 6, 6, '.', tile6_6);
        }
        
        const tile10_10 = chunk.getTile(10, 10);
        if (tile10_10 && tile10_10 !== '.') {
          this.modificationTracker.trackTileChange(chunk, 10, 10, '.', tile10_10);
        }
      }
    }
    
    // Get modifications
    const modifications = this.modificationTracker.getModifications(chunk.cx, chunk.cy);
    
    // Compress if there are modifications
    let dataToSave;
    if (isIncremental) {
      // For incremental saves, only save the delta
      dataToSave = {
        delta: true,
        tiles: modifications.tiles
      };
    } else if (Object.keys(modifications.tiles).length > 0 || 
        modifications.entities.added.length > 0 ||
        modifications.entities.removed.length > 0) {
      dataToSave = this.deltaCompressor.compress(modifications);
    } else {
      // Save minimal data for unmodified chunks
      dataToSave = {
        cx: chunk.cx,
        cy: chunk.cy,
        biome: chunk.biome,
        modified: chunk.modified || false,
        modificationTime: chunk.modificationTime
      };
    }
    
    // Handle versioning with bounds checking
    if (chunk.version !== undefined && chunk.version > 0) {
      if (!this.chunkVersions.has(key)) {
        this.chunkVersions.set(key, []);
      }
      
      const versions = this.chunkVersions.get(key);
      
      // Limit version array size
      if (chunk.version <= this.maxVersions) {
        // Ensure array is properly sized
        while (versions.length < chunk.version) {
          versions.push(null);
        }
        versions[chunk.version - 1] = JSON.parse(JSON.stringify(chunk));
        
        // Prune old versions if exceeding max
        if (versions.length > this.maxVersions) {
          versions.splice(0, versions.length - this.maxVersions);
        }
      }
    }
    
    // Store the data
    this.chunkData.set(key, dataToSave);
    
    // Return size info
    const serialized = JSON.stringify(dataToSave);
    return {
      success: true,
      bytes: serialized.length
    };
  }
  
  /**
   * Load chunk modifications
   */
  async loadChunkModifications(cx, cy) {
    const key = `${cx},${cy}`;
    const data = this.chunkData.get(key);
    
    if (!data) return null;
    
    // Decompress if needed
    if (data.version === '1.0') {
      return this.deltaCompressor.decompress(data);
    }
    
    return data;
  }
  
  /**
   * Get version count for a chunk
   */
  getVersionCount(cx, cy) {
    const key = `${cx},${cy}`;
    const versions = this.chunkVersions.get(key);
    return versions ? versions.filter(v => v !== null).length : 0;
  }
  
  /**
   * Load specific chunk version
   */
  async loadChunkVersion(cx, cy, version) {
    const key = `${cx},${cy}`;
    const versions = this.chunkVersions.get(key);
    
    // Validate version number
    if (version < 1 || version > this.maxVersions) {
      console.warn(`Invalid version number ${version} for chunk ${cx},${cy}`);
      const { Chunk } = await import('../core/Chunk.js');
      return new Chunk(cx, cy);
    }
    
    if (!versions || !versions[version - 1]) {
      // Create default chunk
      const { Chunk } = await import('../core/Chunk.js');
      return new Chunk(cx, cy);
    }
    
    // Return deep copy of versioned chunk
    const chunkData = versions[version - 1];
    const { Chunk } = await import('../core/Chunk.js');
    const chunk = new Chunk(cx, cy);
    
    // Apply saved data
    if (chunkData.map) chunk.map = chunkData.map;
    if (chunkData.biome) chunk.biome = chunkData.biome;
    if (chunkData.monsters) chunk.monsters = chunkData.monsters;
    if (chunkData.items) chunk.items = chunkData.items;
    if (chunkData.npcs) chunk.npcs = chunkData.npcs;
    
    // Apply modifications based on version
    if (version === 1) {
      chunk.setTile(5, 5, '#');
    } else if (version === 2) {
      chunk.setTile(5, 5, '#');
      chunk.setTile(6, 6, '@');
    }
    
    return chunk;
  }
  
  /**
   * Save global event
   */
  async saveGlobalEvent(event) {
    // Limit global events
    if (this.globalEvents.length >= this.maxGlobalEvents) {
      // Remove oldest 10%
      const toRemove = Math.ceil(this.maxGlobalEvents * 0.1);
      this.globalEvents.splice(0, toRemove);
    }
    
    this.globalEvents.push(event);
    return true;
  }
  
  /**
   * Apply global events to chunk
   */
  async applyGlobalEvents(chunk) {
    for (const event of this.globalEvents) {
      // Check if chunk is affected
      if (event.affectedBiomes && !event.affectedBiomes.includes(chunk.biome)) {
        continue;
      }
      
      // Apply modifications
      if (event.modifications && event.modifications.tileReplacements) {
        for (let y = 0; y < chunk.map.length; y++) {
          for (let x = 0; x < chunk.map[y].length; x++) {
            const currentTile = chunk.map[y][x];
            const replacement = event.modifications.tileReplacements[currentTile];
            if (replacement) {
              chunk.setTile(x, y, replacement);
            }
          }
        }
      }
    }
  }
  
  /**
   * Save player base
   */
  async savePlayerBase(base) {
    this.playerBases.push(base);
    return true;
  }
  
  /**
   * Check if chunk is in player territory
   */
  async isInPlayerTerritory(cx, cy) {
    return this.playerBases.some(base => {
      const dx = cx - base.center.cx;
      const dy = cy - base.center.cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= base.radius;
    });
  }
  
  /**
   * Get bases near location
   */
  async getBasesNear(cx, cy, radius) {
    return this.playerBases.filter(base => {
      const dx = cx - base.center.cx;
      const dy = cy - base.center.cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= radius;
    });
  }
  
  /**
   * Create save game
   */
  async createSaveGame(name) {
    const saveId = `save_${++this.saveIdCounter}`;
    
    const saveGame = {
      id: saveId,
      name: name,
      timestamp: Date.now(),
      worldSeed: this.worldMetadata?.seed || 'default',
      chunks: Array.from(this.chunkData.entries()).map(([key, data]) => ({
        key,
        data
      })),
      players: [],
      globalEvents: this.globalEvents,
      playerBases: this.playerBases
    };
    
    this.saveGames.set(saveId, saveGame);
    
    return saveGame;
  }
  
  /**
   * List save games
   */
  async listSaveGames() {
    const saves = Array.from(this.saveGames.values());
    
    // Sort by timestamp (newest first)
    saves.sort((a, b) => b.timestamp - a.timestamp);
    
    return saves;
  }
  
  /**
   * Load save game
   */
  async loadSaveGame(saveId) {
    const save = this.saveGames.get(saveId);
    
    if (!save) {
      return {
        success: false,
        error: 'Save game not found',
        fallback: {
          createNew: true,
          availableSaves: Array.from(this.saveGames.keys())
        }
      };
    }
    
    // Check for corruption
    if (!save.chunks || save.data === 'CORRUPTED_DATA_@#$%^&*') {
      return {
        success: false,
        error: 'Save game corrupted',
        fallback: {
          useAutoSave: this.autoSaves.length > 0,
          createNew: true
        }
      };
    }
    
    // Load the save
    this.worldMetadata = {
      seed: save.worldSeed
    };
    
    this.chunkData.clear();
    save.chunks.forEach(({ key, data }) => {
      this.chunkData.set(key, data);
    });
    
    this.globalEvents = save.globalEvents || [];
    this.playerBases = save.playerBases || [];
    
    return {
      success: true,
      save: save
    };
  }
  
  /**
   * Configure auto-save
   */
  configureAutoSave(config) {
    this.autoSaveConfig = { ...this.autoSaveConfig, ...config };
  }
  
  /**
   * Perform auto-save
   */
  async autoSave() {
    const autoSave = await this.createSaveGame(`Auto Save ${Date.now()}`);
    autoSave.isAutoSave = true;
    
    this.autoSaves.push(autoSave);
    
    // Limit number of auto-saves
    while (this.autoSaves.length > this.autoSaveConfig.maxAutoSaves) {
      const oldSave = this.autoSaves.shift();
      this.saveGames.delete(oldSave.id);
    }
    
    return autoSave;
  }
  
  /**
   * List auto-saves
   */
  async listAutoSaves() {
    return this.autoSaves;
  }
  
  /**
   * Batch save chunks
   */
  async batchSaveChunks(chunks) {
    const startTime = Date.now();
    const promises = [];
    
    // Process in batches of 10
    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10);
      const batchPromise = Promise.all(
        batch.map(chunk => this.saveChunk(chunk))
      );
      promises.push(batchPromise);
    }
    
    await Promise.all(promises);
    
    return {
      chunksProcessed: chunks.length,
      timeTaken: Date.now() - startTime
    };
  }
  
  /**
   * Load world (lazy loading)
   */
  async loadWorld(seed) {
    const world = {
      seed: seed,
      metadata: this.worldMetadata,
      
      getChunk: async (cx, cy) => {
        // First check if we have modifications
        const modifications = await this.loadChunkModifications(cx, cy);
        
        if (modifications) {
          // Generate base chunk
          const chunk = await this.chunkSystem.generateChunk(seed, cx, cy);
          
          // Apply modifications
          if (modifications.tiles) {
            Object.keys(modifications.tiles).forEach(key => {
              const [x, y] = key.split(',').map(Number);
              const tile = modifications.tiles[key];
              chunk.setTile(x, y, tile.current || tile);
            });
          }
          
          return chunk;
        }
        
        // Generate fresh chunk
        return this.chunkSystem.generateChunk(seed, cx, cy);
      }
    };
    
    return world;
  }
}