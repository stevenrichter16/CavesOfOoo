/**
 * Hostility utility functions
 * Replaces the OLD disguise.js hostility checking
 */

/**
 * Check if an NPC is hostile to the player
 * @param {Object} npc - The NPC to check
 * @param {Object} player - The player object
 * @returns {boolean} True if hostile, false otherwise
 */
export function isNPCHostileToPlayer(npc, player) {
  // Handle null/undefined
  if (!npc) return false;
  
  // If NPC has evaluateHostilityTo method (NEW system)
  if (typeof npc.evaluateHostilityTo === 'function') {
    const result = npc.evaluateHostilityTo(player || { id: 'player', factions: ['player'] });
    return result.hostile;
  }
  
  // Fallback for simple NPCs or OLD format
  if (npc.attitude === 'hostile') return true;
  
  // Bandits are hostile to players
  if (npc.faction === 'bandits') return true;
  
  // Monsters are typically hostile
  if (npc.type === 'monster' || npc.isMonster) return true;
  
  // Check if NPC has negative relationship with player
  if (npc.memory && npc.memory.getRelationship) {
    const relationship = npc.memory.getRelationship(player?.id || 'player');
    if (relationship < -50) return true;
  }
  
  // Default to non-hostile
  return false;
}

/**
 * Check if player has a disguise active
 * @param {Object} player - The player object
 * @returns {boolean} True if disguised
 */
export function isPlayerDisguised(player) {
  return player?.disguise?.active === true;
}

/**
 * Get player's current disguise type
 * @param {Object} player - The player object
 * @returns {string|null} Disguise type or null
 */
export function getPlayerDisguise(player) {
  if (!isPlayerDisguised(player)) return null;
  return player.disguise.type;
}

/**
 * Apply a disguise to the player
 * @param {Object} player - The player object
 * @param {string} disguiseType - Type of disguise (e.g., 'guard', 'merchant')
 */
export function applyDisguise(player, disguiseType) {
  if (!player) return;
  
  player.disguise = {
    type: disguiseType,
    active: true,
    startedAt: player.turn || 0
  };
  
  console.log(`[DISGUISE] Player disguised as ${disguiseType}`);
}

/**
 * Remove player's disguise
 * @param {Object} player - The player object
 */
export function removeDisguise(player) {
  if (!player) return;
  
  const wasDisguised = isPlayerDisguised(player);
  player.disguise = null;
  
  if (wasDisguised) {
    console.log('[DISGUISE] Player disguise removed');
  }
}

/**
 * Check if NPC can see through player's disguise
 * @param {Object} npc - The NPC checking
 * @param {Object} player - The player object
 * @returns {boolean} True if NPC sees through disguise
 */
export function canSeeThrough(npc, player) {
  if (!isPlayerDisguised(player)) return true;
  
  // Smart NPCs might see through disguises
  if (npc.hasTrait && npc.hasTrait('clever')) {
    return Math.random() < 0.3; // 30% chance
  }
  
  // Guards are trained to spot fake guards
  if (npc.faction === 'guards' && getPlayerDisguise(player) === 'guard') {
    return Math.random() < 0.2; // 20% chance
  }
  
  // Most NPCs are fooled
  return false;
}

// Export all functions for convenience
export default {
  isNPCHostileToPlayer,
  isPlayerDisguised,
  getPlayerDisguise,
  applyDisguise,
  removeDisguise,
  canSeeThrough
};