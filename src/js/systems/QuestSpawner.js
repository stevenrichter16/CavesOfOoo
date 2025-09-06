/**
 * QuestSpawner - Manages spawning of quest-related content when entering chunks
 * Handles monsters, items, destructibles, locations, and harvestables for quests
 */
import { getGameEventBus } from './EventBus.js';

// Configuration constants
export const QUEST_SPAWNER_CONFIG = {
  spawnTypes: ['monsters', 'items', 'destructibles', 'locations', 'harvestables', 'containers'],
  specialLocations: {
    pupGang: { x: 0, y: 1 },
    licoriceWoods: { x: -1, y: 1 },
    cottonCandyForest: { x: 0, y: -1 },
    cemetery: { x: 1, y: 0 },
    caves: { x: -1, y: 0 },
    summerEstate: { x: 2, y: 0 }
  }
};

export class QuestSpawner {
  constructor(eventBus = null) {
    this.eventBus = eventBus || getGameEventBus();
    this.spawnConfigs = new Map();
    this.handlers = {}; // Store handler references for cleanup
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Store handlers for cleanup
    this.handlers.chunkEntered = (event) => {
      try {
        const { chunk, state } = event;
        if (chunk && state) {
          this.checkAndSpawn(state, chunk.x, chunk.y);
        }
      } catch (error) {
        console.error('[QuestSpawner] Error in ChunkEntered handler:', error);
      }
    };

    this.handlers.questStarted = (event) => {
      try {
        const { questId, state } = event;
        this.prepareQuestSpawns(state, questId);
      } catch (error) {
        console.error('[QuestSpawner] Error in QuestStarted handler:', error);
      }
    };

    this.handlers.questCompleted = (event) => {
      try {
        const { questId, state } = event;
        this.cleanupRemainingSpawns(state, questId);
      } catch (error) {
        console.error('[QuestSpawner] Error in QuestCompleted handler:', error);
      }
    };

    // Register handlers
    this.eventBus.on('ChunkEntered', this.handlers.chunkEntered);
    this.eventBus.on('QuestStarted', this.handlers.questStarted);
    this.eventBus.on('QuestCompleted', this.handlers.questCompleted);
  }

  /**
   * Register a spawn configuration for a quest
   * @param {string} questId - Quest identifier
   * @param {Object} config - Spawn configuration
   */
  registerSpawnConfig(questId, config) {
    this.spawnConfigs.set(questId, config);
  }

  /**
   * Check and spawn quest content for a chunk
   * @param {Object} state - Game state
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   */
  checkAndSpawn(state, chunkX, chunkY) {
    // Validate coordinates
    if (!Number.isInteger(chunkX) || !Number.isInteger(chunkY)) {
      console.warn('[QuestSpawner] Invalid chunk coordinates:', chunkX, chunkY);
      return;
    }
    
    const chunkKey = `${chunkX},${chunkY}`;
    
    // Check for general quest spawns
    if (state.questSpawns && state.questSpawns[chunkKey]) {
      // Store reference before modification
      const spawnsData = state.questSpawns[chunkKey];
      
      // Spawn content
      this.spawnContent(state, spawnsData);
      
      // Clear the spawns first
      delete state.questSpawns[chunkKey];
      
      // Then emit event with cloned data
      this.eventBus.emit('QuestContentSpawned', {
        chunkKey,
        spawns: Array.isArray(spawnsData) ? [...spawnsData] : { ...spawnsData }
      });
    }
    
    // Handle location-specific spawns
    this.handleLocationSpawns(state, chunkX, chunkY);
  }

  /**
   * Spawn content into the current chunk
   * @param {Object} state - Game state
   * @param {Object} spawns - Content to spawn
   */
  spawnContent(state, spawns) {
    // Validate spawns
    if (!spawns || (typeof spawns !== 'object' && !Array.isArray(spawns))) {
      console.warn('[QuestSpawner] Invalid spawns data:', spawns);
      return;
    }
    
    // Handle both array format (legacy) and object format
    if (Array.isArray(spawns)) {
      // Legacy format - assume monsters, validate each
      const validSpawns = spawns.filter(spawn => 
        spawn && typeof spawn === 'object'
      );
      state.chunk.monsters = state.chunk.monsters || [];
      state.chunk.monsters.push(...validSpawns);
      return;
    }
    
    // Object format with multiple spawn types
    QUEST_SPAWNER_CONFIG.spawnTypes.forEach(type => {
      if (spawns[type]) {
        state.chunk[type] = state.chunk[type] || [];
        state.chunk[type].push(...spawns[type]);
      }
    });
  }

  /**
   * Handle location-specific spawns
   * @param {Object} state - Game state
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   */
  handleLocationSpawns(state, chunkX, chunkY) {
    // Pup Gang near Convenience Store (0, 1)
    if (chunkX === 0 && chunkY === 1) {
      if (state.questSpawns?.pupGang) {
        state.chunk.monsters = state.chunk.monsters || [];
        state.chunk.monsters.push(...state.questSpawns.pupGang);
        delete state.questSpawns.pupGang;
        
        this.eventBus.emit('LocationSpawned', {
          location: 'pupGang',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
    
    // Licorice Woods bandits (-1, 1)
    if (chunkX === -1 && chunkY === 1) {
      if (state.licoriceWoodsSpawns) {
        this.spawnContent(state, state.licoriceWoodsSpawns);
        delete state.licoriceWoodsSpawns;
        
        this.eventBus.emit('LocationSpawned', {
          location: 'licoriceWoods',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
    
    // Cotton Candy Forest (0, -1)
    if (chunkX === 0 && chunkY === -1) {
      if (state.forestSpawns) {
        this.spawnContent(state, state.forestSpawns);
        delete state.forestSpawns;
        
        this.eventBus.emit('LocationSpawned', {
          location: 'cottonCandyForest',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
    
    // Cemetery (1, 0)
    if (chunkX === 1 && chunkY === 0) {
      const cemeteryKey = `${chunkX},${chunkY}`;
      if (state.questSpawns && state.questSpawns[cemeteryKey]) {
        this.spawnContent(state, state.questSpawns[cemeteryKey]);
        delete state.questSpawns[cemeteryKey];
        
        this.eventBus.emit('LocationSpawned', {
          location: 'cemetery',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
    
    // Caves (-1, 0)
    if (chunkX === -1 && chunkY === 0) {
      if (state.caveSpawns) {
        this.spawnContent(state, state.caveSpawns);
        delete state.caveSpawns;
        
        this.eventBus.emit('LocationSpawned', {
          location: 'caves',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
    
    // Summer Estate (2, 0)
    if (chunkX === 2 && chunkY === 0) {
      if (state.estateSpawns) {
        this.spawnContent(state, state.estateSpawns);
        delete state.estateSpawns;
        
        this.eventBus.emit('LocationSpawned', {
          location: 'summerEstate',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
    
    // Sewers (special handling)
    if (state.inSewers) {
      if (state.sewerSpawns) {
        this.spawnContent(state, state.sewerSpawns);
        delete state.sewerSpawns;
        
        this.eventBus.emit('LocationSpawned', {
          location: 'sewers',
          chunk: { x: chunkX, y: chunkY }
        });
      }
    }
  }

  /**
   * Spawn dungeon-specific content
   * @param {Object} state - Game state
   * @param {number} dungeonLevel - Dungeon level
   */
  spawnDungeonContent(state, dungeonLevel) {
    if (!state.dungeonSpawns) return;
    
    const levelSpawns = state.dungeonSpawns[dungeonLevel];
    if (!levelSpawns) return;
    
    this.spawnContent(state, levelSpawns);
    
    // Emit event
    this.eventBus.emit('DungeonContentSpawned', {
      level: dungeonLevel,
      spawns: levelSpawns
    });
    
    // Clear the spawns for this level
    delete state.dungeonSpawns[dungeonLevel];
  }

  /**
   * Spawn content for a specific quest
   * @param {Object} state - Game state
   * @param {string} questId - Quest identifier
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {boolean} True if spawned
   */
  spawnForQuest(state, questId, chunkX, chunkY) {
    // Check if quest is active
    const quest = state.activeQuests?.find(q => q.id === questId);
    if (!quest || quest.status !== 'active') {
      return false;
    }
    
    // Get spawn config
    const config = this.spawnConfigs.get(questId);
    if (!config) {
      return false;
    }
    
    // Check if this is the right chunk
    const chunkKey = `${chunkX},${chunkY}`;
    if (config.chunkKey !== chunkKey) {
      return false;
    }
    
    // Spawn the content
    this.spawnContent(state, config.spawns);
    
    // Emit event
    this.eventBus.emit('QuestSpecificSpawn', {
      questId,
      chunkKey,
      spawns: config.spawns
    });
    
    return true;
  }

  /**
   * Prepare spawns when a quest starts
   * @param {Object} state - Game state
   * @param {string} questId - Quest identifier
   */
  prepareQuestSpawns(state, questId) {
    const config = this.spawnConfigs.get(questId);
    if (!config) return;
    
    // Initialize questSpawns if needed
    state.questSpawns = state.questSpawns || {};
    
    // Add spawns to state
    if (config.chunkKey && config.spawns) {
      state.questSpawns[config.chunkKey] = config.spawns;
    }
    
    // Handle multiple spawn locations
    if (config.multipleLocations) {
      config.multipleLocations.forEach(loc => {
        state.questSpawns[loc.chunkKey] = loc.spawns;
      });
    }
  }

  /**
   * Clean up quest spawns
   * @param {Object} state - Game state
   * @param {Array<string>} chunkKeys - Chunk keys to clean up
   */
  cleanupQuestSpawns(state, chunkKeys) {
    if (!state.questSpawns) return;
    
    chunkKeys.forEach(key => {
      delete state.questSpawns[key];
    });
    
    this.eventBus.emit('QuestSpawnsCleanedUp', {
      chunkKeys
    });
  }

  /**
   * Clean up remaining spawns when quest completes
   * @param {Object} state - Game state
   * @param {string} questId - Quest identifier
   */
  cleanupRemainingSpawns(state, questId) {
    const config = this.spawnConfigs.get(questId);
    if (!config) return;
    
    const keysToClean = [];
    
    if (config.chunkKey) {
      keysToClean.push(config.chunkKey);
    }
    
    if (config.multipleLocations) {
      config.multipleLocations.forEach(loc => {
        keysToClean.push(loc.chunkKey);
      });
    }
    
    this.cleanupQuestSpawns(state, keysToClean);
  }

  /**
   * Check if a chunk has quest spawns pending
   * @param {Object} state - Game state
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {boolean} True if spawns are pending
   */
  hasSpawnsPending(state, chunkX, chunkY) {
    const chunkKey = `${chunkX},${chunkY}`;
    
    // Check general spawns
    if (state.questSpawns?.[chunkKey]) {
      return true;
    }
    
    // Check location-specific spawns
    if (chunkX === 0 && chunkY === 1 && state.questSpawns?.pupGang) return true;
    if (chunkX === -1 && chunkY === 1 && state.licoriceWoodsSpawns) return true;
    if (chunkX === 0 && chunkY === -1 && state.forestSpawns) return true;
    if (chunkX === -1 && chunkY === 0 && state.caveSpawns) return true;
    if (chunkX === 2 && chunkY === 0 && state.estateSpawns) return true;
    if (state.inSewers && state.sewerSpawns) return true;
    
    return false;
  }
  /**
   * Clean up event handlers
   */
  cleanup() {
    if (this.handlers.chunkEntered) {
      this.eventBus.off('ChunkEntered', this.handlers.chunkEntered);
    }
    if (this.handlers.questStarted) {
      this.eventBus.off('QuestStarted', this.handlers.questStarted);
    }
    if (this.handlers.questCompleted) {
      this.eventBus.off('QuestCompleted', this.handlers.questCompleted);
    }
    this.handlers = {};
  }
}

// Factory function for creating quest spawner
let _questSpawner = null;

/**
 * Get or create the quest spawner instance
 * @param {EventBus} eventBus - Optional event bus
 * @returns {QuestSpawner} The quest spawner instance
 */
export function getQuestSpawner(eventBus = null) {
  if (!_questSpawner) {
    _questSpawner = new QuestSpawner(eventBus);
  }
  return _questSpawner;
}

/**
 * Reset the quest spawner (useful for testing)
 */
export function resetQuestSpawner() {
  if (_questSpawner) {
    _questSpawner.cleanup();
  }
  _questSpawner = null;
}