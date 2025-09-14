// Relationship system stubs for NEW social system
// These are temporary stubs to maintain compatibility while the NEW system is being built

/**
 * RelationshipSystem stub - manages NPC relationships
 */
export const RelationshipSystem = {
  // Get relationship between two entities
  getRelation(entity1, entity2) {
    return {
      value: 0,
      type: 'neutral',
      trust: 0,
      fear: 0,
      respect: 0
    };
  },

  // Modify relationship between entities
  modifyRelation(entity1, entity2, changes) {
    console.log(`[STUB] Modifying relation between ${entity1} and ${entity2}:`, changes);
    return true;
  },

  // Get overall attitude
  getOverallAttitude(entity1, entity2) {
    return 'neutral';
  },

  // Get faction standing
  getFactionStanding(faction1, faction2) {
    return 0;
  },

  // Decay relations over time
  decayRelations() {
    // No-op for now
    console.log('[STUB] Decaying relations...');
  }
};

/**
 * Export for compatibility
 */
export default RelationshipSystem;