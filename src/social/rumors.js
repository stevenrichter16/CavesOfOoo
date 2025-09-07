/**
 * Phase 5: Rumor & Memory System
 * Handles information propagation through NPC networks
 */

// Rumor types enum
export const RumorType = {
  COMBAT: 'combat',
  THEFT: 'theft',
  DISCOVERY: 'discovery',
  SIGHTING: 'sighting',
  ASSASSINATION: 'assassination',
  TRADE: 'trade',
  CORRUPTION: 'corruption',
  HEROIC_ACT: 'heroic_act',
  BETRAYAL: 'betrayal',
  QUEST: 'quest'
};

// Rumor severity levels
export const RumorSeverity = {
  MINOR: 1,
  MODERATE: 2,
  MAJOR: 3,
  CRITICAL: 4
};

// Time constants
const TIME_CONSTANTS = {
  HOUR_MS: 3600000,
  DAY_MS: 86400000,
  WEEK_MS: 86400000 * 7
};

// Configuration constants
const RUMOR_CONFIG = {
  // Base spread distances by severity
  SPREAD_DISTANCE: {
    [RumorSeverity.MINOR]: 30,     // Very local rumors (can reach nearby at 10)
    [RumorSeverity.MODERATE]: 50,  // Regional rumors
    [RumorSeverity.MAJOR]: 100,    // Kingdom-wide rumors
    [RumorSeverity.CRITICAL]: 500  // Cross-kingdom rumors (can reach far NPCs at 100)
  },
  
  // Accuracy decay rates
  ACCURACY_DECAY_RATE: 0.02, // Per unit distance
  SPREAD_ACCURACY_LOSS: 0.15, // Per retelling
  MIN_ACCURACY: 0.1, // Never goes below this
  
  // Memory limits
  MAX_RUMORS_IN_MEMORY: 10,
  MAX_RUMOR_HISTORY: 1000, // Prevent memory leak
  RUMOR_STALE_TIME: TIME_CONSTANTS.WEEK_MS, // 7 days in milliseconds
  
  // Faction modifiers
  MERCHANT_TRADE_RUMOR_BONUS: 1.5, // Merchants spread trade rumors better
  HOSTILE_SHARE_THRESHOLD: -0.3, // Won't share with relations below this
  
  // Impact modifiers
  SENTIMENT_IMPACT_BASE: 0.1, // Base sentiment impact rate
  SENTIMENT_IMPACT_AFFECTED: 0.05, // Impact for affected factions
  SEVERITY_MULTIPLIER_BASE: 0.1, // Base severity multiplier
  CRITICAL_RUMOR_PRIORITY: 10 // Priority weight for critical rumors
};

/**
 * Rumor class representing a piece of information
 */
export class Rumor {
  constructor(config) {
    this.id = config.id || `rumor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.severity = config.severity;
    this.factions = config.factions || [];
    this.position = config.position;
    this.details = config.details || '';
    this.timestamp = config.timestamp || Date.now();
    this.accuracy = config.accuracy !== undefined ? config.accuracy : 1.0;
    this.spreadCount = config.spreadCount || 0;
    this.isPublic = config.isPublic !== undefined ? config.isPublic : true;
    this.sentiment = config.sentiment || 0; // -1 to 1, negative is bad
    this.affectedFactions = config.affectedFactions || [];
    
    // Calculate max spread distance based on severity
    this.maxSpreadDistance = RUMOR_CONFIG.SPREAD_DISTANCE[this.severity] || 50;
  }
  
  /**
   * Get the age of the rumor in milliseconds
   */
  getAge() {
    return Date.now() - this.timestamp;
  }
  
  /**
   * Check if the rumor is stale
   */
  isStale() {
    // Minor rumors stay fresh longer, critical rumors go stale faster
    const staleMultiplier = {
      [RumorSeverity.MINOR]: 2.0,    // 14 days
      [RumorSeverity.MODERATE]: 1.0, // 7 days
      [RumorSeverity.MAJOR]: 0.5,    // 3.5 days
      [RumorSeverity.CRITICAL]: 0.25  // 1.75 days
    };
    
    const multiplier = staleMultiplier[this.severity] || 1.0;
    const adjustedStaleTime = RUMOR_CONFIG.RUMOR_STALE_TIME * multiplier;
    
    return this.getAge() > adjustedStaleTime;
  }
  
  /**
   * Calculate accuracy at a given distance from origin
   */
  getAccuracyAtDistance(distance) {
    const decay = distance * RUMOR_CONFIG.ACCURACY_DECAY_RATE;
    const accuracy = this.accuracy - decay;
    return Math.max(RUMOR_CONFIG.MIN_ACCURACY, accuracy);
  }
  
  /**
   * Check if rumor can spread to a position
   */
  canSpreadToPosition(targetPosition) {
    if (!this.position || !targetPosition) return true;
    
    const distance = Math.sqrt(
      Math.pow(targetPosition.x - this.position.x, 2) +
      Math.pow(targetPosition.y - this.position.y, 2)
    );
    
    return distance <= this.maxSpreadDistance;
  }
  
  /**
   * Create a degraded copy for spreading
   */
  createSpreadCopy() {
    return new Rumor({
      ...this,
      id: this.id, // KEEP THE SAME ID - it's the same rumor!
      accuracy: Math.max(
        RUMOR_CONFIG.MIN_ACCURACY,
        this.accuracy - RUMOR_CONFIG.SPREAD_ACCURACY_LOSS
      ),
      spreadCount: this.spreadCount + 1,
      timestamp: this.timestamp // Preserve original timestamp
    });
  }
  
  /**
   * Create rumors from quest events
   */
  static fromQuestEvent(questEvent) {
    const rumors = [];
    
    if (questEvent.type === 'quest_complete') {
      rumors.push(new Rumor({
        type: RumorType.QUEST,
        severity: questEvent.outcome === 'success' ? 
          RumorSeverity.MODERATE : RumorSeverity.MAJOR,
        factions: questEvent.participants || ['player'],
        position: questEvent.position,
        details: `Quest ${questEvent.questId} completed: ${questEvent.outcome}`,
        sentiment: questEvent.outcome === 'success' ? 0.5 : -0.3
      }));
    }
    
    return rumors;
  }
  
  /**
   * Create rumors from combat events
   */
  static fromCombatEvent(combatEvent) {
    const rumors = [];
    
    if (combatEvent.type === 'combat') {
      const winnerFactions = combatEvent.outcome === 'defender_victory' ?
        combatEvent.defender.factions : combatEvent.attacker.factions;
      
      rumors.push(new Rumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: winnerFactions,
        position: combatEvent.position,
        details: `Combat between ${combatEvent.attacker.factions.join(',')} and ${combatEvent.defender.factions.join(',')}`,
        sentiment: 0 // Neutral sentiment for combat
      }));
    }
    
    return rumors;
  }
  
  /**
   * Get priority score for memory retention
   */
  getPriorityScore() {
    let score = this.severity;
    
    // Critical rumors get bonus priority
    if (this.severity === RumorSeverity.CRITICAL) {
      score += RUMOR_CONFIG.CRITICAL_RUMOR_PRIORITY;
    }
    
    // Reduce priority based on age
    const ageDays = this.getAge() / 86400000;
    score -= ageDays * 0.5;
    
    // Reduce priority based on accuracy
    score *= this.accuracy;
    
    return Math.max(0, score);
  }
}

/**
 * Factory function to create rumors
 */
export function createRumor(config) {
  return new Rumor(config);
}

/**
 * Rumor propagation engine
 */
export class RumorPropagationEngine {
  constructor() {
    this.activeRumors = new Map();
    this.rumorHistory = [];
    this.maxHistory = RUMOR_CONFIG.MAX_RUMOR_HISTORY;
  }
  
  /**
   * Add a new rumor to the system
   */
  addRumor(rumor) {
    if (!rumor || !rumor.id) {
      console.warn('Attempted to add invalid rumor');
      return false;
    }
    
    this.activeRumors.set(rumor.id, rumor);
    this.rumorHistory.push(rumor);
    
    // Prevent memory leak - maintain max history
    if (this.rumorHistory.length > this.maxHistory) {
      this.rumorHistory.shift();
    }
    
    return true;
  }
  
  /**
   * Process rumor propagation for a game tick
   */
  tickRumors(state, npcs) {
    const toRemove = [];
    
    for (const [id, rumor] of this.activeRumors) {
      // Remove stale rumors
      if (rumor.isStale()) {
        toRemove.push(id);
        continue;
      }
      
      // Propagate rumor through NPCs
      this.propagateRumor(rumor, npcs);
    }
    
    // Clean up stale rumors
    toRemove.forEach(id => this.activeRumors.delete(id));
  }
  
  /**
   * Propagate a single rumor through NPCs
   */
  propagateRumor(rumor, npcs) {
    const knowledgeableNPCs = npcs.filter(npc => 
      npc.memory?.rumors?.some(r => r.id === rumor.id)
    );
    
    for (const spreader of knowledgeableNPCs) {
      // Find nearby NPCs to share with
      const nearbyNPCs = npcs.filter(npc => {
        if (npc.id === spreader.id) return false;
        if (!rumor.canSpreadToPosition(npc.position)) return false;
        
        // Check if they already know this rumor
        if (npc.memory?.rumors?.some(r => r.id === rumor.id)) return false;
        
        return true;
      });
      
      // Share with nearby NPCs
      for (const recipient of nearbyNPCs) {
        spreader.shareRumorsWith(recipient);
      }
    }
  }
  
  /**
   * Get rumors at a specific location
   */
  getRumorsAtLocation(x, y, radius) {
    const rumors = [];
    
    for (const rumor of this.activeRumors.values()) {
      if (!rumor.position) {
        rumors.push(rumor);
        continue;
      }
      
      const distance = Math.sqrt(
        Math.pow(rumor.position.x - x, 2) +
        Math.pow(rumor.position.y - y, 2)
      );
      
      if (distance <= radius) {
        rumors.push(rumor);
      }
    }
    
    return rumors;
  }
  
  /**
   * Clear all rumors
   */
  clearRumors() {
    this.activeRumors.clear();
    this.rumorHistory = [];
  }
}

// Global rumor engine instance
export const rumorEngine = new RumorPropagationEngine();