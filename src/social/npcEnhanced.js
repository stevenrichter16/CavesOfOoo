/**
 * Enhanced NPC Class - Merges OLD and NEW social systems
 * This enhanced version maintains backward compatibility while providing
 * the advanced features of the multi-faction system
 */

import { NPC as BaseNPC } from './npc.js';
import { NPCMemory } from './memory.js';
import { NPCTraits, areTraitsOpposed } from './traits.js';

/**
 * Enhanced NPC class that combines OLD and NEW system features
 */
export class NPC extends BaseNPC {
  constructor(config) {
    // Call parent constructor for multi-faction support
    super(config);
    
    // === OLD System Features ===
    
    // Traits system from OLD
    if (config.traits) {
      this.traits = config.traits;
    } else {
      this.traits = this.generateTraits(config.traitCount || 2);
    }
    
    // Replace memory with NPCMemory from OLD system
    this.memory = new NPCMemory(this.id);
    
    // Restore memory if provided
    if (config.memory) {
      // If it's already an NPCMemory instance, use it
      if (config.memory instanceof NPCMemory) {
        this.memory = config.memory;
      } else if (config.memory.memories) {
        // Restore from saved data
        this.memory.memories = config.memory.memories;
        this.memory.relationships = config.memory.relationships || {};
      }
    }
    
    // Inventory from OLD system (with defaults)
    this.inventory = config.inventory || [];
    
    // Dialogue properties
    this.dialogueType = config.dialogueType || config.type || null;
    this.dialogue = config.dialogue !== undefined ? config.dialogue : true;
    
    // Shop properties
    this.shopkeeper = config.shopkeeper || false;
    this.goods = config.goods || [];
    
    // Quest properties
    this.questGiver = config.questGiver || false;
    this.quests = config.quests || [];
    
    // Visual properties
    this.glyph = config.glyph || config.name?.[0] || '?';
    this.color = config.color || '#ffffff';
    
    // Type property (used by some systems)
    this.type = config.type || config.dialogueType || null;
    
    // Backward compatibility for single faction
    if (config.faction && !config.factions) {
      this.faction = config.faction;
      // Ensure it's in factions array
      if (!this.factions.includes(config.faction)) {
        this.factions = [config.faction];
      }
    } else if (this.factions && this.factions.length > 0) {
      // Set single faction for backward compat
      this.faction = this.factions[0];
    }
    
    // Attitude (for immediate hostility)
    this.attitude = config.attitude || 'neutral';
    
    // Additional visual properties
    this.sprite = config.sprite || null;
    this.char = config.char || null;
    
    // Role property (used by some NPCs)
    this.role = config.role || null;
  }
  
  /**
   * Generate random traits avoiding oppositions
   */
  generateTraits(count = 2) {
    const traits = [];
    const traitKeys = Object.keys(NPCTraits);
    const maxAttempts = 50; // Prevent infinite loop
    let attempts = 0;
    
    while (traits.length < count && attempts < maxAttempts) {
      attempts++;
      const trait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
      
      // Check if trait opposes existing traits
      let canAdd = true;
      for (const existing of traits) {
        if (areTraitsOpposed(trait, existing)) {
          canAdd = false;
          break;
        }
      }
      
      if (canAdd && !traits.includes(trait)) {
        traits.push(trait);
      }
    }
    
    return traits;
  }
  
  /**
   * Check if NPC has a specific trait (OLD system compatibility)
   */
  hasTrait(trait) {
    return this.traits?.includes(trait) || false;
  }
  
  /**
   * Static method to convert OLD format NPC to NEW class
   */
  static fromOldFormat(oldNPC) {
    if (!oldNPC) return null;
    
    // If already an NPC instance, return as-is
    if (oldNPC instanceof NPC) return oldNPC;
    
    // Build config from old NPC
    const config = {
      id: oldNPC.id,
      name: oldNPC.name,
      x: oldNPC.x,
      y: oldNPC.y,
      hp: oldNPC.hp,
      hpMax: oldNPC.hpMax,
      chunkX: oldNPC.chunkX,
      chunkY: oldNPC.chunkY,
      faction: oldNPC.faction,
      factions: oldNPC.factions,
      traits: oldNPC.traits,
      memory: oldNPC.memory,
      inventory: oldNPC.inventory,
      dialogueType: oldNPC.dialogueType,
      dialogue: oldNPC.dialogue,
      shopkeeper: oldNPC.shopkeeper,
      goods: oldNPC.goods,
      questGiver: oldNPC.questGiver,
      quests: oldNPC.quests,
      glyph: oldNPC.glyph,
      color: oldNPC.color,
      type: oldNPC.type,
      attitude: oldNPC.attitude,
      sprite: oldNPC.sprite,
      char: oldNPC.char,
      role: oldNPC.role
    };
    
    // Remove undefined values
    Object.keys(config).forEach(key => {
      if (config[key] === undefined) {
        delete config[key];
      }
    });
    
    return new NPC(config);
  }
  
  /**
   * Static spawn method to replace spawnSocialNPC
   */
  static spawn(state, config) {
    // Generate ID if not provided
    if (!config.id) {
      config.id = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Use state chunk coordinates if not provided
    if (config.chunkX === undefined) config.chunkX = state.cx || 0;
    if (config.chunkY === undefined) config.chunkY = state.cy || 0;
    
    // Set defaults matching OLD system
    if (config.hp === undefined) config.hp = 20;
    if (config.hpMax === undefined) config.hpMax = config.hp || 20;
    if (!config.name) config.name = "Unnamed NPC";
    
    // Create new NPC instance
    const npc = new NPC(config);
    
    // Add to state (matching OLD system behavior)
    if (!state.npcs) {
      state.npcs = [];
    }
    state.npcs.push(npc);
    
    return npc;
  }
  
  /**
   * Migration helper - check if object is OLD format NPC
   */
  static isOldFormat(obj) {
    // OLD format NPCs are plain objects, not NPC instances
    // They must have at least id or name to be valid NPCs
    if (!obj || typeof obj !== 'object' || obj instanceof NPC) {
      return false;
    }
    
    // Empty objects are not NPCs
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return false;
    }
    
    // Must have some NPC-like properties
    return (typeof obj.hasTrait === 'function' || 
            obj.traits !== undefined ||
            obj.faction !== undefined ||
            obj.dialogue !== undefined ||
            obj.name !== undefined ||
            obj.id !== undefined);
  }
  
  /**
   * Backward compatible faction getter
   */
  getFaction() {
    return this.faction || (this.factions && this.factions[0]) || null;
  }
  
  /**
   * Evaluate hostility towards another entity
   * @param {Object} target - The target to evaluate hostility towards
   * @returns {Object} Hostility result with hostile flag and reason
   */
  evaluateHostilityTo(target) {
    // Check if explicitly hostile attitude
    if (this.attitude === 'hostile') {
      return { hostile: true, reason: 'hostile_attitude' };
    }
    
    // Check if explicitly friendly attitude
    if (this.attitude === 'friendly') {
      return { hostile: false, reason: 'friendly_attitude' };
    }
    
    // Check faction-based hostility
    const targetFactions = target.factions || (target.faction ? [target.faction] : ['player']);
    const npcFactions = this.factions || (this.faction ? [this.faction] : []);
    
    // Guards are hostile to bandits
    if (npcFactions.includes('guards') && targetFactions.includes('bandits')) {
      return { hostile: true, reason: 'faction_enemy' };
    }
    
    // Bandits are hostile to guards and players
    if (npcFactions.includes('bandits') && 
        (targetFactions.includes('guards') || targetFactions.includes('player'))) {
      return { hostile: true, reason: 'faction_enemy' };
    }
    
    // Check memory-based hostility (grudges)
    if (this.memory && this.memory.grudges) {
      const targetId = target.id || 'player';
      if (this.memory.grudges.has(targetId)) {
        return { hostile: true, reason: 'has_grudge' };
      }
    }
    
    // Check relationship-based hostility
    if (this.memory) {
      const relationship = this.memory.getRelationship(target.id || 'player');
      if (relationship < -50) {
        return { hostile: true, reason: 'hated' };
      }
    }
    
    // Default to non-hostile
    return { hostile: false, reason: 'neutral' };
  }
  
  /**
   * Export for dialogue system compatibility
   */
  toDialogueContext() {
    return {
      id: this.id,
      name: this.name,
      faction: this.getFaction(),
      dialogueType: this.dialogueType,
      traits: this.traits,
      hasTrait: (trait) => this.hasTrait(trait),
      memory: this.memory,
      inventory: this.inventory,
      shopkeeper: this.shopkeeper,
      goods: this.goods,
      questGiver: this.questGiver,
      quests: this.quests
    };
  }
}

/**
 * Drop-in replacement for spawnSocialNPC
 * This function provides 100% backward compatibility
 */
export function spawnSocialNPC(state, config) {
  return NPC.spawn(state, config);
}

/**
 * Drop-in replacement for initializeNPC
 * Converts existing object to NPC class
 */
export function initializeNPC(npcData, config = {}) {
  // If it's already an NPC class, just return it
  if (npcData instanceof NPC) {
    return npcData;
  }
  
  // Merge npcData with config
  const fullConfig = {
    ...npcData,
    ...config,
    // Preserve original properties
    traits: config.traits || npcData.traits,
    faction: config.faction || npcData.faction,
    inventory: config.inventory || npcData.inventory || []
  };
  
  // If npcData has an id, preserve it
  if (npcData.id) {
    fullConfig.id = npcData.id;
  }
  
  return new NPC(fullConfig);
}

/**
 * Helper to check if NPC should be converted
 */
export function shouldConvertNPC(obj) {
  return NPC.isOldFormat(obj);
}

/**
 * Batch conversion helper for migration
 */
export function convertAllNPCs(state) {
  if (!state.npcs) return;
  
  state.npcs = state.npcs.map(npc => {
    if (shouldConvertNPC(npc)) {
      return NPC.fromOldFormat(npc);
    }
    return npc;
  });
}

// Export enhanced NPC as default
export default NPC;