/**
 * QuestSpawner - Manages spawning of quest-related content when entering chunks
 * Handles monsters, items, destructibles, locations, harvestables, and NPCs for quests
 */
import { getGameEventBus } from './EventBus.js';
import { NPCSpawner } from '../../social/npcSpawner.js';
import { NPC } from '../../social/npc.js';

// Configuration constants
export const QUEST_SPAWNER_CONFIG = {
  spawnTypes: ['monsters', 'items', 'destructibles', 'locations', 'harvestables', 'containers', 'npcs'],
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
    this.questNPCConfigs = new Map(); // Quest-specific NPC spawn configs
    this.locationConfigs = new Map(); // Location-based spawn configs
    this.npcSpawner = new NPCSpawner(); // Instance for faction-aware NPC spawning
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
   * Register quest-specific NPC spawn configuration
   * @param {string} questId - Quest identifier
   * @param {Object} config - NPC spawn configuration
   */
  registerQuestNPCSpawn(questId, config) {
    this.questNPCConfigs.set(questId, config);
  }

  /**
   * Register location-based NPC spawn configuration for quests
   * @param {string} locationId - Location identifier
   * @param {Object} config - Location spawn configuration
   */
  registerLocationSpawn(locationId, config) {
    this.locationConfigs.set(locationId, config);
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
   * Spawn quest-specific NPCs
   * @param {Object} state - Game state
   * @param {string} questId - Quest identifier
   */
  spawnQuestNPCs(state, questId) {
    const config = this.questNPCConfigs.get(questId);
    if (!config) {
      console.warn(`[QuestSpawner] No NPC config found for quest: ${questId}`);
      return;
    }

    try {
      if (!state.npcs) {
        state.npcs = [];
      }

      const spawnedNPCs = [];

      // Process each NPC type in the config
      for (const npcConfig of config.npcs) {
        const count = npcConfig.count || 1;
        
        for (let i = 0; i < count; i++) {
          // Create NPC using Phase 1 system
          const npcData = {
            id: `quest_${questId}_${npcConfig.role}_${i}`,
            name: npcConfig.name || `${npcConfig.role}_${i}`,
            factions: npcConfig.factions || [],
            role: npcConfig.role,
            kingdomId: npcConfig.kingdomId || config.location,
            x: npcConfig.position?.x || Math.floor(Math.random() * 20),
            y: npcConfig.position?.y || Math.floor(Math.random() * 20),
            chunkX: state.cx || 0,
            chunkY: state.cy || 0,
            questId: questId // Mark as quest NPC for cleanup
          };

          // Add faction weights if specified
          if (npcConfig.factionWeights) {
            npcData.factionWeights = npcConfig.factionWeights;
          }

          // Add disguise if specified
          if (npcConfig.disguise) {
            npcData.disguise = npcConfig.disguise;
          }

          // Add movement properties if specified
          if (npcConfig.patrolCenter) {
            npcData.patrolCenter = npcConfig.patrolCenter;
          }
          if (npcConfig.patrolRadius) {
            npcData.patrolRadius = npcConfig.patrolRadius;
          }
          if (npcConfig.perception) {
            npcData.perception = npcConfig.perception;
          }

          // Create NPC instance
          const npc = new NPC(npcData);
          
          // Set stats after creation if specified
          if (npcConfig.stats?.hp) {
            npc.hp = npcConfig.stats.hp;
          }
          if (npcConfig.stats?.hpMax) {
            npc.hpMax = npcConfig.stats.hpMax;
          } else if (npcConfig.stats?.hp) {
            npc.hpMax = npcConfig.stats.hp;
          }
          
          spawnedNPCs.push(npc);
          state.npcs.push(npc);
        }
      }

      // Emit spawn event
      this.eventBus.emit('QuestNPCsSpawned', {
        questId,
        npcs: [...spawnedNPCs], // Clone array
        location: config.location
      });

    } catch (error) {
      console.error(`[QuestSpawner] Error spawning quest NPCs for ${questId}:`, error);
    }
  }

  /**
   * Spawn NPCs for a location with modifications
   * @param {Object} state - Game state
   * @param {string} locationId - Location identifier
   */
  spawnLocationNPCs(state, locationId) {
    const config = this.locationConfigs.get(locationId);
    if (!config) {
      console.warn(`[QuestSpawner] No location config found for: ${locationId}`);
      return;
    }

    try {
      if (!state.npcs) {
        state.npcs = [];
      }

      // Create a modified spawner config based on location modifications
      const baseLocation = config.location;
      const modifications = config.modifications || {};
      const npcCount = config.npcCount || 5;

      // Get base roles from NPCSpawner if available, or use modifications
      let roleConfig = [];
      
      if (modifications.roleModifications) {
        // Build role config from modifications
        for (const roleMod of modifications.roleModifications) {
          roleConfig.push({
            role: roleMod.role,
            weight: roleMod.weight || (roleMod.weightMultiplier ? 0.1 * roleMod.weightMultiplier : 0.1),
            factions: roleMod.factions || [`${baseLocation}_citizens`],
            behavior: roleMod.behavior
          });
        }
      } else {
        // Default role config for unknown locations
        roleConfig = [
          { role: 'citizen', weight: 0.6, factions: [`${baseLocation}_citizens`] },
          { role: 'guard', weight: 0.4, factions: [`${baseLocation}_guard`] }
        ];
      }

      // Spawn NPCs using the role configuration
      const spawnedNPCs = [];
      for (let i = 0; i < npcCount; i++) {
        // Select role based on weights
        const totalWeight = roleConfig.reduce((sum, r) => sum + r.weight, 0);
        let randomValue = Math.random() * totalWeight;
        let selectedRole = roleConfig[0];

        for (const roleConf of roleConfig) {
          randomValue -= roleConf.weight;
          if (randomValue <= 0) {
            selectedRole = roleConf;
            break;
          }
        }

        // Create NPC
        const npcData = {
          id: `location_${locationId}_${selectedRole.role}_${i}`,
          name: `${selectedRole.role}_${i}`,
          factions: selectedRole.factions,
          role: selectedRole.role,
          kingdomId: baseLocation,
          x: Math.floor(Math.random() * 20),
          y: Math.floor(Math.random() * 20),
          chunkX: state.cx || 0,
          chunkY: state.cy || 0,
          locationSpawn: locationId // Mark as location spawn
        };

        const npc = new NPC(npcData);
        spawnedNPCs.push(npc);
        state.npcs.push(npc);
      }

      // Emit spawn event
      this.eventBus.emit('LocationNPCsSpawned', {
        locationId,
        npcs: [...spawnedNPCs], // Clone array
        location: config.location
      });

    } catch (error) {
      console.error(`[QuestSpawner] Error spawning location NPCs for ${locationId}:`, error);
    }
  }

  /**
   * Clean up quest-specific NPCs
   * @param {Object} state - Game state
   * @param {string} questId - Quest identifier
   */
  cleanupQuestNPCs(state, questId) {
    if (!state.npcs) return;

    try {
      // Mark quest NPCs as removed instead of deleting them immediately
      // to avoid array mutation issues during iteration
      for (const npc of state.npcs) {
        if (npc.questId === questId) {
          npc.removed = true;
          npc.hp = 0; // Also mark as dead for safety
        }
      }

      // Actually remove them in a separate pass
      state.npcs = state.npcs.filter(npc => npc.questId !== questId);

      // Emit cleanup event
      this.eventBus.emit('QuestNPCsCleaned', {
        questId
      });

    } catch (error) {
      console.error(`[QuestSpawner] Error cleaning up quest NPCs for ${questId}:`, error);
    }
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