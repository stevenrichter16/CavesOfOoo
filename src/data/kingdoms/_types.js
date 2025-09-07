/**
 * Type definitions for Kingdom and Faction data structures
 * @module KingdomTypes
 */

/**
 * @typedef {'state'|'guild'|'civilian'|'cult'|'criminal'} FactionKind
 * The type of faction - determines behavior patterns and interactions
 */

/**
 * @typedef {Object} FactionDef
 * @property {string} id - Unique faction identifier
 * @property {string} name - Display name
 * @property {FactionKind} kind - Type of faction
 * @property {string[]} values - Core values this faction holds
 * @property {string[]} taboos - Actions/behaviors this faction forbids
 * @property {Record<string, number>} relations - Relations to other factions (-1 to 1)
 * @property {number} [lawfulness] - How much they respect law (0-1)
 * @property {string[]} [specialActions] - Unique social actions available
 */

/**
 * @typedef {Object} RealmWeights
 * @property {number} trust - Weight for trust in relationships
 * @property {number} respect - Weight for respect
 * @property {number} fear - Weight for fear
 * @property {number} law - Weight for lawfulness
 * @property {number} rumor - Weight for rumor influence
 */

/**
 * @typedef {Object} KingdomPack
 * @property {string} id - Unique kingdom identifier
 * @property {string} name - Display name (e.g., "Candy Kingdom")
 * @property {string[]} tags - Tags for content selection
 * @property {number} lawLevel - Overall law enforcement (0-1)
 * @property {RealmWeights} realmWeights - Relationship scoring weights
 * @property {Record<string, number>} terrainCost - Movement costs by terrain
 * @property {string[]} disguiseUniforms - Recognized uniform types
 * @property {FactionDef[]} factions - Sub-factions within kingdom
 * @property {string} [ruler] - Current ruler name
 * @property {string} [capital] - Capital city/location name
 * @property {string[]} [enemies] - Traditional enemy kingdoms
 * @property {string[]} [allies] - Traditional ally kingdoms
 * @property {Record<string, any>} [customs] - Kingdom-specific behaviors
 */

/**
 * @typedef {Object} FactionResult
 * @property {FactionDef} faction - The faction definition
 * @property {KingdomPack} kingdom - The parent kingdom
 */

export default {};