/**
 * MovementAdapter - Adapts the new social/NPC system to work with existing Movement Pipeline
 */

import { NPC } from '../npc.js';
import { NPCMovementExecutor } from './NPCMovementExecutor.js';
import { getErrorHandler, ErrorCode } from '../utils/ErrorHandler.js';
import { 
  INTERACTION_DISTANCE,
  DEFAULT_LAW_LEVEL,
  DEFAULT_NPC_HP,
  DEFAULT_NPC_HP_MAX,
  HOSTILE_ATTACK_RANGE
} from '../integration/constants.js';

// Singleton instances
let executorInstance = null;
let errorHandler = null;

/**
 * Get or create the NPC movement executor
 */
export function getMovementExecutor() {
  if (!executorInstance) {
    executorInstance = new NPCMovementExecutor();
  }
  return executorInstance;
}

/**
 * Get or create error handler instance
 */
function getErrorHandlerInstance() {
  if (!errorHandler) {
    errorHandler = getErrorHandler();
  }
  return errorHandler;
}

/**
 * Check if an NPC is hostile to the player using the new faction system
 * @param {Object} state - Game state
 * @param {Object} npcData - NPC data (might be old format or new NPC instance)
 * @returns {boolean}
 */
export function isNPCHostileToPlayer(state, npcData) {
  // Check explicit attitude first
  if (npcData.attitude === 'hostile') {
    return true;
  }
  
  // If it's already a new NPC instance, use it directly
  if (npcData instanceof NPC) {
    const playerEntity = {
      factions: state.player?.factions || ['player'],
      disguise: state.player?.disguise
    };
    
    const hostility = npcData.evaluateHostilityTo(playerEntity, {
      lawLevel: state.lawLevel || DEFAULT_LAW_LEVEL,
      kingdomId: state.currentKingdom
    });
    
    return hostility.hostile;
  }
  
  // Convert old NPC data to new system
  const npc = convertOldNPCToNew(npcData);
  if (!npc) return false;
  
  const playerEntity = {
    factions: state.player?.factions || ['player'],
    disguise: state.player?.disguise
  };
  
  const hostility = npc.evaluateHostilityTo(playerEntity, {
    lawLevel: state.lawLevel || DEFAULT_LAW_LEVEL,
    kingdomId: state.currentKingdom
  });
  
  return hostility.hostile;
}

/**
 * Convert old NPC format to new NPC instance
 * @param {Object} oldNPC - Old format NPC data
 * @returns {NPC|null}
 */
export function convertOldNPCToNew(oldNPC) {
  if (!oldNPC) return null;
  
  // If already converted, return as-is
  if (oldNPC instanceof NPC) return oldNPC;
  
  try {
    // Map old faction to new multi-faction system
    const factions = [];
    if (oldNPC.faction) {
      // Map old single faction to new system
      const factionMap = {
        'CANDY_KINGDOM': ['banana_guard', 'candy_citizens'],
        'FIRE_KINGDOM': ['fire_guards', 'fire_citizens'],
        'ICE_KINGDOM': ['ice_guards', 'ice_citizens'],
        'SLIME_KINGDOM': ['slime_guards', 'slime_citizens'],
        'BANDITS': ['bandits'],
        'MERCHANTS': ['candy_merchants']
      };
      
      factions.push(...(factionMap[oldNPC.faction] || [oldNPC.faction.toLowerCase()]));
    } else if (oldNPC.factions) {
      factions.push(...oldNPC.factions);
    } else {
      // Default to citizen of current area
      factions.push('candy_citizens');
    }
    
    return new NPC({
      id: oldNPC.id || `converted_${Date.now()}`,
      name: oldNPC.name || 'Unknown NPC',
      factions: factions,
      x: oldNPC.x || 0,
      y: oldNPC.y || 0,
      chunkX: oldNPC.chunkX || 0,
      chunkY: oldNPC.chunkY || 0,
      role: oldNPC.role || 'citizen',
      kingdomId: oldNPC.kingdomId || 'candy',
      hp: oldNPC.hp ?? DEFAULT_NPC_HP,
      hpMax: oldNPC.hpMax ?? DEFAULT_NPC_HP_MAX
    });
  } catch (error) {
    const errorHandler = getErrorHandler();
    errorHandler.logError(
      ErrorCode.NPC_CONVERSION_FAILED,
      error,
      { 
        npcId: oldNPC.id,
        npcName: oldNPC.name,
        faction: oldNPC.faction 
      }
    );
    return null;
  }
}

/**
 * Process NPC turns using the new movement system
 * @param {Object} state - Game state
 * @param {Object} context - Additional context
 */
export function processNPCMovement(state, context = {}) {
  if (!state.npcs || state.npcs.length === 0) return;
  
  const executor = getMovementExecutor();
  
  for (let i = 0; i < state.npcs.length; i++) {
    const npcData = state.npcs[i];
    
    // Skip dead NPCs
    if (npcData.hp <= 0) continue;
    
    // Convert to new NPC if needed
    let npc = npcData;
    if (!(npcData instanceof NPC)) {
      npc = convertOldNPCToNew(npcData);
      if (!npc) continue;
      
      // Replace old data with new NPC instance
      state.npcs[i] = npc;
    }
    
    // Execute movement
    executor.executeNPCTurn(npc, state, context);
  }
}

/**
 * Create a new NPC using the new system
 * @param {Object} config - NPC configuration
 * @returns {NPC}
 */
export function createNPC(config) {
  return new NPC(config);
}

/**
 * Check if player can interact with NPC
 * @param {Object} player - Player data
 * @param {NPC} npc - NPC instance
 * @returns {boolean}
 */
export function canInteract(player, npc) {
  if (!player || !npc) return false;
  
  const distance = Math.sqrt(
    Math.pow(player.x - npc.x, 2) + 
    Math.pow(player.y - npc.y, 2)
  );
  
  return distance <= INTERACTION_DISTANCE;
}

/**
 * Get available interactions between player and NPC
 * @param {Object} player - Player data
 * @param {NPC} npc - NPC instance
 * @returns {Array} Available interaction options
 */
export function getAvailableInteractions(player, npc) {
  if (!canInteract(player, npc)) return [];
  
  const playerEntity = {
    factions: player.factions || ['player'],
    role: player.role || 'adventurer',
    disguise: player.disguise
  };
  
  const dialogue = npc.getDialogue(playerEntity);
  
  return dialogue.options || ['talk'];
}