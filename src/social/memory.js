/**
 * NPCMemory - Enhanced memory system for NPCs
 * Migrated from OLD system with backward compatibility
 */

export class NPCMemory {
  constructor(npcId) {
    this.npcId = npcId;
    this.events = [];         // Recent events (was 'memories' in some OLD code)
    this.memories = this.events; // Alias for backward compatibility
    this.maxEvents = 100;     // Increased from OLD system's 20
    this.relationships = {};  // Simple relationship scores
    this.knownFacts = {};     // Facts about the world
    
    // Advanced features from OLD system
    this.grudges = new Map(); // entityId -> grievances[]
    this.favors = new Map();  // entityId -> favors[]
    this.knowledge = new Map(); // Facts with metadata
    this.rumors = [];         // Spreadable information
  }
  
  /**
   * Remember an event
   */
  remember(event) {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      turn: (typeof window !== 'undefined' && window.STATE?.turn) || 0
    };
    
    this.events.push(enrichedEvent);
    
    // Keep events limited
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Process event for grudges/favors if type is recognized
    if (event.type) {
      this.processEvent(enrichedEvent);
    }
    
    return enrichedEvent;
  }
  
  /**
   * Process events for grudges and favors
   */
  processEvent(event) {
    switch (event.type) {
      case "attacked_by":
        this.addGrudge(event.attacker, "violence", event.damage || 10);
        break;
      case "stolen_from":
        this.addGrudge(event.thief, "theft", event.value || 5);
        break;
      case "insulted_by":
        this.addGrudge(event.insulter, "insult", 3);
        break;
      case "threatened_by":
        this.addGrudge(event.threatener, "intimidation", 5);
        break;
      case "healed_by":
        this.addFavor(event.healer, "healing", event.amount || 10);
        break;
      case "gift_from":
        this.addFavor(event.giver, "gift", event.value || 5);
        break;
      case "saved_by":
        this.addFavor(event.savior, "rescue", 20);
        break;
      case "helped_by":
        this.addFavor(event.helper, "assistance", event.value || 5);
        break;
      case "complimented_by":
        this.addFavor(event.complimenter, "compliment", 2);
        break;
    }
  }
  
  /**
   * Add a grudge
   */
  addGrudge(entityId, type, severity) {
    if (!this.grudges.has(entityId)) {
      this.grudges.set(entityId, []);
    }
    
    this.grudges.get(entityId).push({
      type,
      severity,
      turn: (typeof window !== 'undefined' && window.STATE?.turn) || 0,
      resolved: false
    });
    
    // Update simple relationship score
    this.updateRelationship(entityId, -severity);
  }
  
  /**
   * Add a favor
   */
  addFavor(entityId, type, value) {
    if (!this.favors.has(entityId)) {
      this.favors.set(entityId, []);
    }
    
    this.favors.get(entityId).push({
      type,
      value,
      turn: (typeof window !== 'undefined' && window.STATE?.turn) || 0,
      repaid: false
    });
    
    // Update simple relationship score
    this.updateRelationship(entityId, value);
  }
  
  /**
   * Update relationship score (simple system)
   */
  updateRelationship(entityId, change) {
    if (!this.relationships[entityId]) {
      this.relationships[entityId] = 0;
    }
    this.relationships[entityId] += change;
    return this.relationships[entityId];
  }
  
  /**
   * Get relationship score
   */
  getRelationship(entityId) {
    return this.relationships[entityId] || 0;
  }
  
  /**
   * Learn a fact
   */
  learnFact(key, value) {
    this.knownFacts[key] = value;
    // Also store in knowledge map with metadata
    this.setKnowledge(key, value);
  }
  
  /**
   * Check if knows a fact
   */
  knowsFact(key) {
    return key in this.knownFacts;
  }
  
  /**
   * Get a fact
   */
  getFact(key) {
    return this.knownFacts[key];
  }
  
  /**
   * Set knowledge with metadata
   */
  setKnowledge(key, value) {
    this.knowledge.set(key, {
      value,
      turn: (typeof window !== 'undefined' && window.STATE?.turn) || 0,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get knowledge value
   */
  getKnowledge(key) {
    return this.knowledge.get(key)?.value;
  }
  
  /**
   * Calculate current grudge score with time decay
   */
  calculateGrudgeScore(entityId) {
    const turn = (typeof window !== 'undefined' && window.STATE?.turn) || 0;
    const arr = this.grudges.get(entityId) || [];
    
    return arr.filter(g => !g.resolved).reduce((sum, g) => {
      const age = Math.max(0, turn - g.turn);
      const decay = Math.pow(0.985, age); // 1.5% decay per turn
      return sum + g.severity * decay;
    }, 0);
  }
  
  /**
   * Calculate current favor score with time decay
   */
  calculateFavorScore(entityId) {
    const turn = (typeof window !== 'undefined' && window.STATE?.turn) || 0;
    const arr = this.favors.get(entityId) || [];
    
    return arr.filter(f => !f.repaid).reduce((sum, f) => {
      const age = Math.max(0, turn - f.turn);
      const decay = Math.pow(0.99, age); // 1% decay per turn
      return sum + f.value * decay;
    }, 0);
  }
  
  /**
   * Get overall attitude toward an entity
   */
  getAttitude(towardEntityId) {
    const favor = this.calculateFavorScore(towardEntityId);
    const grudge = this.calculateGrudgeScore(towardEntityId);
    return favor - grudge;
  }
  
  /**
   * Add a rumor
   */
  addRumor(rumor) {
    const exists = this.rumors.find(r => 
      r.subject === rumor.subject && r.detail === rumor.detail
    );
    
    if (!exists) {
      this.rumors.push({
        ...rumor,
        learnedTurn: (typeof window !== 'undefined' && window.STATE?.turn) || 0,
        spreadCount: 0
      });
    }
  }
  
  /**
   * Get shareable rumors
   */
  getShareableRumors() {
    return this.rumors.filter(r => r.spreadCount < 3);
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(maxAge = 5000) {
    const now = Date.now();
    return this.events
      .filter(e => (now - e.timestamp) <= maxAge)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.events.filter(e => e.type === type);
  }
  
  /**
   * Check if remembers a specific event
   */
  remembersEvent(type, entityId, maxAge = 100) {
    const turn = (typeof window !== 'undefined' && window.STATE?.turn) || 0;
    return this.events.some(e => 
      e.type === type && 
      e.entityId === entityId && 
      (turn - e.turn) <= maxAge
    );
  }
  
  /**
   * Prune old memories
   */
  pruneOldMemories(maxAge = 500) {
    const turn = (typeof window !== 'undefined' && window.STATE?.turn) || 0;
    
    // Prune old events
    this.events = this.events.filter(e => (turn - e.turn) <= maxAge);
    
    // Mark very old grudges/favors as resolved/repaid
    for (const grudges of this.grudges.values()) {
      for (const g of grudges) {
        if ((turn - g.turn) > maxAge && !g.resolved) {
          g.resolved = true;
        }
      }
    }
    
    for (const favors of this.favors.values()) {
      for (const f of favors) {
        if ((turn - f.turn) > maxAge && !f.repaid) {
          f.repaid = true;
        }
      }
    }
  }
  
  /**
   * Serialize memory for saving
   */
  serialize() {
    return {
      npcId: this.npcId,
      events: this.events,
      memories: this.events, // Include both for compatibility
      relationships: this.relationships,
      knownFacts: this.knownFacts,
      grudges: Array.from(this.grudges.entries()),
      favors: Array.from(this.favors.entries()),
      knowledge: Array.from(this.knowledge.entries()),
      rumors: this.rumors
    };
  }
  
  /**
   * Deserialize memory from saved data
   */
  static deserialize(data) {
    const memory = new NPCMemory(data.npcId);
    
    // Handle both 'events' and 'memories' for backward compatibility
    memory.events = data.events || data.memories || [];
    memory.memories = memory.events; // Maintain alias
    
    memory.relationships = data.relationships || {};
    memory.knownFacts = data.knownFacts || {};
    
    // Restore maps
    if (data.grudges) {
      memory.grudges = new Map(data.grudges);
    }
    if (data.favors) {
      memory.favors = new Map(data.favors);
    }
    if (data.knowledge) {
      memory.knowledge = new Map(data.knowledge);
    }
    
    memory.rumors = data.rumors || [];
    
    return memory;
  }
}

// Export additional utilities for compatibility
export function createNPCMemory(npcId) {
  return new NPCMemory(npcId);
}

export default NPCMemory;