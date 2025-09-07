/**
 * Faction Index - O(1) lookup optimization for faction data
 * Builds and maintains an index of all factions for fast access
 */

import { KINGDOMS } from './index.js';

/**
 * @typedef {Object} IndexedFaction
 * @property {import('./_types.js').FactionDef} faction
 * @property {import('./_types.js').KingdomPack} kingdom
 */

class FactionIndex {
  constructor() {
    this.index = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the index with all factions
   * Called automatically on first access
   */
  initialize() {
    if (this.initialized) return;
    
    this.index.clear();
    
    // Index all factions from all kingdoms
    for (const [kingdomId, kingdom] of Object.entries(KINGDOMS)) {
      if (!kingdom.factions) continue;
      
      for (const faction of kingdom.factions) {
        this.index.set(faction.id, {
          faction,
          kingdom
        });
      }
    }
    
    this.initialized = true;
  }

  /**
   * Get faction data by ID - O(1) lookup
   * @param {string} factionId 
   * @returns {IndexedFaction|null}
   */
  get(factionId) {
    if (!this.initialized) this.initialize();
    return this.index.get(factionId) || null;
  }

  /**
   * Get multiple factions at once
   * @param {string[]} factionIds 
   * @returns {IndexedFaction[]}
   */
  getMany(factionIds) {
    if (!this.initialized) this.initialize();
    return factionIds
      .map(id => this.index.get(id))
      .filter(Boolean);
  }

  /**
   * Check if a faction exists
   * @param {string} factionId 
   * @returns {boolean}
   */
  has(factionId) {
    if (!this.initialized) this.initialize();
    return this.index.has(factionId);
  }

  /**
   * Get all faction IDs
   * @returns {string[]}
   */
  getAllIds() {
    if (!this.initialized) this.initialize();
    return Array.from(this.index.keys());
  }

  /**
   * Get factions by kingdom
   * @param {string} kingdomId 
   * @returns {IndexedFaction[]}
   */
  getByKingdom(kingdomId) {
    if (!this.initialized) this.initialize();
    const results = [];
    for (const entry of this.index.values()) {
      if (entry.kingdom.id === kingdomId) {
        results.push(entry);
      }
    }
    return results;
  }

  /**
   * Get factions by kind
   * @param {import('./_types.js').FactionKind} kind 
   * @returns {IndexedFaction[]}
   */
  getByKind(kind) {
    if (!this.initialized) this.initialize();
    const results = [];
    for (const entry of this.index.values()) {
      if (entry.faction.kind === kind) {
        results.push(entry);
      }
    }
    return results;
  }

  /**
   * Clear and rebuild the index
   * Useful for testing or hot-reloading
   */
  rebuild() {
    this.initialized = false;
    this.index.clear();
    this.initialize();
  }

  /**
   * Get size of index
   * @returns {number}
   */
  get size() {
    if (!this.initialized) this.initialize();
    return this.index.size;
  }
}

// Singleton instance
const factionIndex = new FactionIndex();

/**
 * Get faction using the index (O(1) lookup)
 * @param {string} factionId 
 * @returns {IndexedFaction|null}
 */
export function getFactionFast(factionId) {
  return factionIndex.get(factionId);
}

/**
 * Get multiple factions efficiently
 * @param {string[]} factionIds 
 * @returns {IndexedFaction[]}
 */
export function getFactionsFast(factionIds) {
  return factionIndex.getMany(factionIds);
}

/**
 * Check if faction exists (O(1))
 * @param {string} factionId 
 * @returns {boolean}
 */
export function factionExists(factionId) {
  return factionIndex.has(factionId);
}

/**
 * Get the faction index instance (for advanced usage)
 * @returns {FactionIndex}
 */
export function getFactionIndex() {
  return factionIndex;
}

/**
 * Rebuild the index (useful for testing)
 */
export function rebuildFactionIndex() {
  factionIndex.rebuild();
}