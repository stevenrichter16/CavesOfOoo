/**
 * Kingdom registry and helper functions
 * Central hub for all kingdom data
 */

import candy from './candy.kingdom.js';
import fire from './fire.kingdom.js';
import ice from './ice.kingdom.js';
import slime from './slime.kingdom.js';
import { COMMON_KINGDOM } from './common-factions.js';

/**
 * Registry of all kingdoms
 * @type {Record<string, import('./_types.js').KingdomPack>}
 */
export const KINGDOMS = { 
  candy, 
  fire, 
  ice, 
  slime,
  common: COMMON_KINGDOM  // Virtual kingdom for common factions
};

/**
 * Cache for faction definitions to avoid repeated lookups
 * @type {Map<string, import('./_types.js').FactionResult|null>}
 */
const factionDefCache = new Map();

/**
 * Build faction cache on initialization
 */
function buildFactionCache() {
  for (const [kingdomId, pack] of Object.entries(KINGDOMS)) {
    for (const faction of pack.factions) {
      factionDefCache.set(faction.id, {
        faction,
        kingdom: pack
      });
    }
  }
}

// Build cache immediately
buildFactionCache();

/**
 * Get a kingdom by ID
 * @param {string} kingdomId - The kingdom identifier
 * @returns {import('./_types.js').KingdomPack|null} The kingdom or null if not found
 */
export function getKingdomById(kingdomId) {
  return KINGDOMS[kingdomId] || null;
}

/**
 * Find a faction definition and its parent kingdom (cached)
 * @param {string} factionId - The faction identifier
 * @returns {import('./_types.js').FactionResult|null} Faction and kingdom or null
 */
export function getFactionDef(factionId) {
  // Check cache first
  if (factionDefCache.has(factionId)) {
    return factionDefCache.get(factionId);
  }
  
  // Not in cache means it doesn't exist
  factionDefCache.set(factionId, null); // Cache the miss
  return null;
}

/**
 * Clear and rebuild faction cache (useful for testing or hot reload)
 */
export function rebuildFactionCache() {
  factionDefCache.clear();
  buildFactionCache();
}

/**
 * Get all faction IDs across all kingdoms
 * @returns {string[]} Array of all faction IDs
 */
export function getAllFactionIds() {
  const ids = [];
  for (const kingdom of Object.values(KINGDOMS)) {
    for (const faction of kingdom.factions) {
      ids.push(faction.id);
    }
  }
  return ids;
}

/**
 * Get all factions of a specific kind
 * @param {import('./_types.js').FactionKind} kind - The faction kind to filter by
 * @returns {Array<{faction: import('./_types.js').FactionDef, kingdom: import('./_types.js').KingdomPack}>}
 */
export function getFactionsByKind(kind) {
  const results = [];
  for (const kingdom of Object.values(KINGDOMS)) {
    for (const faction of kingdom.factions) {
      if (faction.kind === kind) {
        results.push({ faction, kingdom });
      }
    }
  }
  return results;
}

/**
 * Check if two kingdoms are enemies
 * @param {string} kingdom1Id 
 * @param {string} kingdom2Id 
 * @returns {boolean}
 */
export function areKingdomsEnemies(kingdom1Id, kingdom2Id) {
  const k1 = getKingdomById(kingdom1Id);
  const k2 = getKingdomById(kingdom2Id);
  
  if (!k1 || !k2) return false;
  
  return (k1.enemies?.includes(kingdom2Id) || 
          k2.enemies?.includes(kingdom1Id)) || false;
}

/**
 * Check if two kingdoms are allies
 * @param {string} kingdom1Id 
 * @param {string} kingdom2Id 
 * @returns {boolean}
 */
export function areKingdomsAllies(kingdom1Id, kingdom2Id) {
  const k1 = getKingdomById(kingdom1Id);
  const k2 = getKingdomById(kingdom2Id);
  
  if (!k1 || !k2) return false;
  
  return (k1.allies?.includes(kingdom2Id) || 
          k2.allies?.includes(kingdom1Id)) || false;
}

/**
 * Get the relation value between two factions
 * @param {string} faction1Id 
 * @param {string} faction2Id 
 * @returns {number} Relation value (-1 to 1), or 0 if not found
 */
export function getFactionRelation(faction1Id, faction2Id) {
  if (faction1Id === faction2Id) return 1; // Same faction = perfect relation
  
  const faction1Data = getFactionDef(faction1Id);
  if (!faction1Data) return 0;
  
  return faction1Data.faction.relations[faction2Id] || 0;
}

/**
 * Get a kingdom's terrain cost for a specific terrain type
 * @param {string} kingdomId 
 * @param {string} terrainType 
 * @returns {number} Movement cost multiplier (1 is normal)
 */
export function getTerrainCost(kingdomId, terrainType) {
  const kingdom = getKingdomById(kingdomId);
  if (!kingdom) return 1;
  
  return kingdom.terrainCost[terrainType] || 1;
}

/**
 * Check if a disguise key is recognized by a kingdom
 * @param {string} kingdomId 
 * @param {string} disguiseKey 
 * @returns {boolean}
 */
export function isDisguiseRecognized(kingdomId, disguiseKey) {
  const kingdom = getKingdomById(kingdomId);
  if (!kingdom) return false;
  
  return kingdom.disguiseUniforms.includes(disguiseKey);
}

/**
 * Get custom greetings for a kingdom
 * @param {string} kingdomId 
 * @returns {string[]} Array of greeting phrases
 */
export function getKingdomGreetings(kingdomId) {
  const kingdom = getKingdomById(kingdomId);
  return kingdom?.customs?.greetings || ['Hello there!'];
}

/**
 * Get custom farewells for a kingdom
 * @param {string} kingdomId 
 * @returns {string[]} Array of farewell phrases
 */
export function getKingdomFarewells(kingdomId) {
  const kingdom = getKingdomById(kingdomId);
  return kingdom?.customs?.farewells || ['Goodbye!'];
}

/**
 * Get realm weights for a kingdom (used in attitude calculation)
 * @param {string} kingdomId 
 * @returns {import('./_types.js').RealmWeights}
 */
export function getRealmWeights(kingdomId) {
  const kingdom = getKingdomById(kingdomId);
  return kingdom?.realmWeights || {
    trust: 1,
    respect: 1,
    fear: 1,
    law: 1,
    rumor: 1
  };
}