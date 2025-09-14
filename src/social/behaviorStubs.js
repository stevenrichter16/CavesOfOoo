/**
 * Behavior Stubs - Replacement for OLD behavior.js
 * Provides stub functions for reputation propagation and NPC behavior
 * Most of this functionality is now handled by the NPC class itself
 */

/**
 * Propagate reputation changes through the social network
 * In the NEW system, this is handled by NPCMemory
 * @deprecated Use NPC.memory.updateRelationship() instead
 */
export function propagateReputation(state, npc, targetId, change) {
  console.log('[BEHAVIOR STUB] propagateReputation called - using NEW system instead');
  
  // In NEW system, reputation is handled by memory
  if (npc?.memory?.updateRelationship) {
    npc.memory.updateRelationship(targetId, change);
  }
  
  // Optionally propagate to nearby NPCs
  if (state?.npcs) {
    const nearbyNPCs = state.npcs.filter(n => 
      n.id !== npc.id && 
      Math.abs(n.x - npc.x) <= 5 && 
      Math.abs(n.y - npc.y) <= 5
    );
    
    nearbyNPCs.forEach(nearby => {
      if (nearby.memory?.updateRelationship) {
        // Reduced effect for indirect reputation
        nearby.memory.updateRelationship(targetId, Math.floor(change * 0.3));
      }
    });
  }
}

/**
 * Process NPC behavior for a turn
 * In the NEW system, NPCs handle their own behavior
 * @deprecated NPCs now handle behavior internally
 */
export function processNPCBehavior(state, npc) {
  console.log('[BEHAVIOR STUB] processNPCBehavior - NPCs handle this internally now');
  // NPCs in the NEW system handle their own behavior
  // This is just a stub for backward compatibility
  return null;
}

/**
 * Get NPC's next action based on behavior
 * @deprecated Use NPC's internal methods
 */
export function getNPCAction(npc, state) {
  console.log('[BEHAVIOR STUB] getNPCAction - use NPC methods instead');
  
  // Simple stub implementation
  if (npc.attitude === 'hostile') {
    return { type: 'attack' };
  }
  
  return { type: 'idle' };
}

/**
 * Update NPC behavior state
 * @deprecated NPCs manage their own state
 */
export function updateNPCBehavior(npc, state) {
  console.log('[BEHAVIOR STUB] updateNPCBehavior - NPCs manage their own state');
  // Stub - NPCs manage their own state in NEW system
}

// Export all for backward compatibility
export default {
  propagateReputation,
  processNPCBehavior,
  getNPCAction,
  updateNPCBehavior
};