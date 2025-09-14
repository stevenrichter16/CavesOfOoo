// src/js/social/memory.js - NPC memory system with time-discounted scoring

import { EventType } from '../utils/eventTypes.js';

export class NPCMemory {
  constructor(npcId) {
    this.npcId = npcId;
    this.events = [];         // Recent events
    this.maxEvents = 20;
    this.grudges = new Map(); // entityId -> grievances[]
    this.favors = new Map();  // entityId -> favors[]
    this.knowledge = new Map(); // Facts about the world
    this.rumors = [];         // Spreadable information
  }
  
  remember(event) {
    const turn = window.STATE?.turn || 0;
    this.events.push({
      ...event,
      turn,
      timestamp: Date.now()
    });
    
    // Keep events limited
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Process event for grudges/favors
    this.processEvent(event);
  }
  
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
  
  addGrudge(entityId, type, severity) {
    if (!this.grudges.has(entityId)) {
      this.grudges.set(entityId, []);
    }
    
    this.grudges.get(entityId).push({
      type,
      severity,
      turn: window.STATE?.turn || 0,
      resolved: false
    });
  }
  
  addFavor(entityId, type, value) {
    if (!this.favors.has(entityId)) {
      this.favors.set(entityId, []);
    }
    
    this.favors.get(entityId).push({
      type,
      value,
      turn: window.STATE?.turn || 0,
      repaid: false
    });
  }
  
  // Calculate current grudge score with time decay
  calculateGrudgeScore(entityId) {
    const turn = window.STATE?.turn || 0;
    const arr = this.grudges.get(entityId) || [];
    
    return arr.filter(g => !g.resolved).reduce((sum, g) => {
      const age = Math.max(0, turn - g.turn);
      const decay = Math.pow(0.985, age); // 1.5% decay per turn
      return sum + g.severity * decay;
    }, 0);
  }
  
  // Calculate current favor score with time decay
  calculateFavorScore(entityId) {
    const turn = window.STATE?.turn || 0;
    const arr = this.favors.get(entityId) || [];
    
    return arr.filter(f => !f.repaid).reduce((sum, f) => {
      const age = Math.max(0, turn - f.turn);
      const decay = Math.pow(0.99, age); // 1% decay per turn
      return sum + f.value * decay;
    }, 0);
  }
  
  // Get overall attitude toward an entity
  getAttitude(towardEntityId) {
    const favor = this.calculateFavorScore(towardEntityId);
    const grudge = this.calculateGrudgeScore(towardEntityId);
    return favor - grudge;
  }
  
  // Rumor management
  addRumor(rumor) {
    // Check if we already know this rumor
    const exists = this.rumors.find(r => 
      r.subject === rumor.subject && r.detail === rumor.detail
    );
    
    if (!exists) {
      this.rumors.push({
        ...rumor,
        learnedTurn: window.STATE?.turn || 0,
        spreadCount: 0
      });
    }
  }
  
  getShareableRumors() {
    // Only share rumors that haven't been spread too much
    return this.rumors.filter(r => r.spreadCount < 3);
  }
  
  // Knowledge management
  setKnowledge(key, value) {
    this.knowledge.set(key, {
      value,
      turn: window.STATE?.turn || 0
    });
  }
  
  getKnowledge(key) {
    return this.knowledge.get(key)?.value;
  }
  
  // Check if NPC remembers a specific event
  remembersEvent(type, entityId, maxAge = 100) {
    const turn = window.STATE?.turn || 0;
    return this.events.some(e => 
      e.type === type && 
      e.entityId === entityId && 
      (turn - e.turn) <= maxAge
    );
  }
  
  // Clear old memories (call periodically to save memory)
  pruneOldMemories(maxAge = 500) {
    const turn = window.STATE?.turn || 0;
    
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
}