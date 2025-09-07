/**
 * RumorMovementBridge - Integrates Rumor System with Movement System
 * Handles rumor spreading during movement and movement-based rumor generation
 */

import { createRumor, RumorType, RumorSeverity, rumorEngine } from '../rumors.js';

// Configuration
const BRIDGE_CONFIG = {
  SHARING_DISTANCE: 5,        // Units NPCs must be within to share rumors
  SHARING_COOLDOWN: 5000,     // ms between sharing attempts with same NPC
  WITNESS_RANGE: 10,          // Range to witness events
  INVESTIGATE_PRIORITY: 0.8,  // Priority threshold for investigation
  FLEE_PRIORITY: 0.9          // Priority threshold for fleeing
};

/**
 * Bridge between Movement and Rumor systems
 */
export class RumorMovementBridge {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.sharingCooldowns = new Map(); // Track NPC pair sharing cooldowns
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for movement events
   */
  setupEventListeners() {
    // Listen for NPC movement
    this.eventBus.on('DidMove', this.onEntityMove.bind(this));
    this.eventBus.on('MovementComplete', this.onMovementComplete.bind(this));
    
    // Listen for combat and discoveries
    this.eventBus.on('CombatStarted', this.onCombatStarted.bind(this));
    this.eventBus.on('DiscoveryMade', this.onDiscoveryMade.bind(this));
    
    // Listen for NPC encounters
    this.eventBus.on('NPCEncounter', this.onNPCEncounter.bind(this));
  }

  /**
   * Handle entity movement for rumor sharing
   */
  onEntityMove(event) {
    const { entity, position, state } = event;
    
    // Only process NPC movements (check for NPC class or type)
    if (!entity || (entity.type && entity.type !== 'npc')) return;
    
    // Check if it's an NPC instance
    if (!entity.memory || !entity.shareRumorsWith) return;
    
    // Find nearby NPCs
    const nearbyNPCs = this.findNearbyNPCs(entity, state);
    
    // Attempt to share rumors
    this.processRumorSharing(entity, nearbyNPCs);
  }

  /**
   * Handle movement completion for rumor generation
   */
  onMovementComplete(event) {
    const { entity, result, state } = event;
    
    // Generate rumors based on movement outcomes
    if (result.combat) {
      this.generateCombatRumor(entity, result, state);
    }
    
    if (result.discovered) {
      this.generateDiscoveryRumor(entity, result, state);
    }
    
    // Player sightings (check type or other player indicators)
    if (entity.type === 'player' || entity.factions?.includes('player')) {
      this.generatePlayerSightingRumor(entity, state);
    }
  }

  /**
   * Handle combat started events
   */
  onCombatStarted(event) {
    const { attacker, defender, position, witnesses } = event;
    
    const rumor = createRumor({
      type: RumorType.COMBAT,
      severity: RumorSeverity.MODERATE,
      factions: attacker.factions || ['unknown'],
      position: position || { x: attacker.x, y: attacker.y },
      details: `Combat between ${attacker.name || 'attacker'} and ${defender.name || 'defender'}`,
      sentiment: -0.3 // Combat is generally negative
    });
    
    // Add to rumor engine
    rumorEngine.addRumor(rumor);
    
    // Witnesses immediately learn
    if (witnesses && witnesses.length > 0) {
      witnesses.forEach(npc => {
        if (npc.hearRumor) {
          npc.hearRumor(rumor);
        }
      });
    }
  }

  /**
   * Handle discovery events
   */
  onDiscoveryMade(event) {
    const { discoverer, discovery, position } = event;
    
    const rumor = createRumor({
      type: RumorType.DISCOVERY,
      severity: discovery.importance || RumorSeverity.MINOR,
      factions: discoverer.factions || ['unknown'],
      position: position || { x: discoverer.x, y: discoverer.y },
      details: discovery.details || 'Something was discovered',
      sentiment: 0.5 // Discoveries are generally positive
    });
    
    rumorEngine.addRumor(rumor);
    
    // Discoverer learns immediately
    if (discoverer.hearRumor) {
      discoverer.hearRumor(rumor);
    }
  }

  /**
   * Handle NPC encounter events
   */
  onNPCEncounter(event) {
    const { npc1, npc2, state } = event;
    
    // Check if they should share rumors
    if (this.canShareRumors(npc1, npc2)) {
      // Share in both directions if friendly
      npc1.shareRumorsWith(npc2);
      npc2.shareRumorsWith(npc1);
      
      // Update cooldown
      this.updateSharingCooldown(npc1.id, npc2.id);
    }
  }

  /**
   * Find NPCs near the given entity
   */
  findNearbyNPCs(entity, state) {
    const nearbyNPCs = [];
    
    if (!state.npcs) return nearbyNPCs;
    
    for (const npc of state.npcs) {
      if (npc.id === entity.id) continue;
      
      const distance = this.calculateDistance(entity, npc);
      if (distance <= BRIDGE_CONFIG.WITNESS_RANGE) {
        nearbyNPCs.push(npc);
      }
    }
    
    return nearbyNPCs;
  }

  /**
   * Process rumor sharing between NPCs
   */
  processRumorSharing(npc, nearbyNPCs) {
    for (const other of nearbyNPCs) {
      // Check distance for sharing
      const distance = this.calculateDistance(npc, other);
      if (distance > BRIDGE_CONFIG.SHARING_DISTANCE) continue;
      
      // Check cooldown
      if (this.isOnSharingCooldown(npc.id, other.id)) continue;
      
      // Check if they can share
      if (this.canShareRumors(npc, other)) {
        // NPCs share rumors
        const shared = npc.shareRumorsWith(other);
        
        if (shared) {
          // Update cooldown
          this.updateSharingCooldown(npc.id, other.id);
          
          // Emit event for other systems
          this.eventBus.emit('RumorsShared', {
            from: npc,
            to: other,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Check if two NPCs can share rumors
   */
  canShareRumors(npc1, npc2) {
    if (!npc1.shareRumorsWith || !npc2.hearRumor) return false;
    
    // Check if they're hostile to each other
    if (npc1.evaluateHostilityTo) {
      const hostility = npc1.evaluateHostilityTo(npc2);
      if (hostility.hostile) return false;
    }
    
    return true;
  }

  /**
   * Generate player sighting rumor
   */
  generatePlayerSightingRumor(player, state) {
    // Find witnesses
    const witnesses = this.findNearbyNPCs(player, state);
    
    if (witnesses.length === 0) return;
    
    const rumor = createRumor({
      type: RumorType.SIGHTING,
      severity: RumorSeverity.MINOR,
      factions: ['player'],
      position: { x: player.x, y: player.y },
      details: `Player spotted in the area`,
      sentiment: 0 // Neutral
    });
    
    // Add to engine
    rumorEngine.addRumor(rumor);
    
    // Witnesses learn immediately
    witnesses.forEach(npc => {
      if (npc.hearRumor) {
        npc.hearRumor(rumor);
      }
    });
  }

  /**
   * Generate combat rumor from movement result
   */
  generateCombatRumor(entity, result, state) {
    const rumor = createRumor({
      type: RumorType.COMBAT,
      severity: result.lethal ? RumorSeverity.MAJOR : RumorSeverity.MODERATE,
      factions: entity.factions || ['unknown'],
      position: { x: entity.x, y: entity.y },
      details: result.details || 'Combat occurred',
      sentiment: -0.5
    });
    
    rumorEngine.addRumor(rumor);
    
    // Find and inform witnesses
    const witnesses = this.findNearbyNPCs(entity, state);
    witnesses.forEach(npc => {
      if (npc.hearRumor) {
        npc.hearRumor(rumor);
      }
    });
  }

  /**
   * Generate discovery rumor
   */
  generateDiscoveryRumor(entity, result, state) {
    const rumor = createRumor({
      type: RumorType.DISCOVERY,
      severity: result.importance || RumorSeverity.MINOR,
      factions: entity.factions || ['unknown'],
      position: { x: entity.x, y: entity.y },
      details: result.details || 'Discovery made',
      sentiment: 0.7
    });
    
    rumorEngine.addRumor(rumor);
    
    // Entity learns their own discovery
    if (entity.hearRumor) {
      entity.hearRumor(rumor);
    }
  }

  /**
   * Calculate distance between two entities
   */
  calculateDistance(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if NPCs are on sharing cooldown
   */
  isOnSharingCooldown(id1, id2) {
    const key = this.getCooldownKey(id1, id2);
    const lastShared = this.sharingCooldowns.get(key);
    
    if (!lastShared) return false;
    
    return Date.now() - lastShared < BRIDGE_CONFIG.SHARING_COOLDOWN;
  }

  /**
   * Update sharing cooldown
   */
  updateSharingCooldown(id1, id2) {
    const key = this.getCooldownKey(id1, id2);
    this.sharingCooldowns.set(key, Date.now());
    
    // Clean old cooldowns periodically
    if (this.sharingCooldowns.size > 100) {
      this.cleanOldCooldowns();
    }
  }

  /**
   * Get cooldown key for NPC pair
   */
  getCooldownKey(id1, id2) {
    // Sort IDs to ensure consistent key
    return [id1, id2].sort().join(':');
  }

  /**
   * Clean old cooldowns
   */
  cleanOldCooldowns() {
    const now = Date.now();
    const expired = [];
    
    for (const [key, timestamp] of this.sharingCooldowns.entries()) {
      if (now - timestamp > BRIDGE_CONFIG.SHARING_COOLDOWN * 2) {
        expired.push(key);
      }
    }
    
    expired.forEach(key => this.sharingCooldowns.delete(key));
  }

  /**
   * Get rumor-influenced movement behavior for NPC
   */
  getRumorInfluencedBehavior(npc, state) {
    if (!npc.memory || !npc.memory.rumors) return null;
    
    // Find critical rumors
    const criticalRumors = npc.memory.rumors.filter(r => 
      r.severity === RumorSeverity.CRITICAL
    );
    
    if (criticalRumors.length > 0) {
      const rumor = criticalRumors[0];
      
      // Guards investigate threats
      if (npc.hasFactionType && npc.hasFactionType('guard')) {
        return {
          action: 'investigate',
          target: rumor.position,
          priority: 'high',
          reason: 'critical_rumor'
        };
      }
      
      // Citizens flee from danger
      if (npc.hasFactionType && npc.hasFactionType('citizen')) {
        return {
          action: 'flee',
          awayFrom: rumor.position,
          priority: 'high',
          reason: 'danger_rumor'
        };
      }
    }
    
    // Merchants seek trade opportunities
    if (npc.hasFactionType && npc.hasFactionType('merchant')) {
      const tradeRumors = npc.memory.rumors.filter(r => 
        r.type === RumorType.TRADE && r.sentiment > 0
      );
      
      if (tradeRumors.length > 0) {
        return {
          action: 'travel',
          target: tradeRumors[0].position,
          priority: 'normal',
          reason: 'trade_opportunity'
        };
      }
    }
    
    return null;
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    // Remove all event listeners
    this.eventBus.off('DidMove', this.onEntityMove);
    this.eventBus.off('MovementComplete', this.onMovementComplete);
    this.eventBus.off('CombatStarted', this.onCombatStarted);
    this.eventBus.off('DiscoveryMade', this.onDiscoveryMade);
    this.eventBus.off('NPCEncounter', this.onNPCEncounter);
    
    // Clear cooldowns
    this.sharingCooldowns.clear();
  }
}

// Export singleton instance
export const createRumorMovementBridge = (eventBus) => {
  return new RumorMovementBridge(eventBus);
};