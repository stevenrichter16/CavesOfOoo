// src/js/social/relationship.js - Directional relationship matrix system

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

class RelationshipMatrix {
  constructor() {
    this.relations = new Map();       // "from->to" -> RelationshipData
    this.factionStanding = new Map(); // "entity:faction" -> standing
  }
  
  makeKeyDir(fromId, toId) {
    return `${fromId}->${toId}`;
  }
  
  createDefault() {
    return {
      value: 0,      // -100..100 (general affinity)
      trust: 0,      // -100..100 (reliability perception)
      fear: 0,       // 0..100 (intimidation level)
      respect: 0,    // -100..100 (admiration/contempt)
      history: [],   // Recent interaction history
      lastInteraction: 0,
      cooldownUntil: 0
    };
  }
  
  getRelation(from, to) {
    const fromId = typeof from === 'string' ? from : from.id;
    const toId = typeof to === 'string' ? to : to.id;
    const k = this.makeKeyDir(fromId, toId);
    
    if (!this.relations.has(k)) {
      this.relations.set(k, this.createDefault());
    }
    return this.relations.get(k);
  }
  
  modifyRelation(from, to, changes) {
    const r = this.getRelation(from, to);
    const fromId = typeof from === 'string' ? from : from.id;
    const toId = typeof to === 'string' ? to : to.id;
    
    // Apply changes with clamping
    if (changes.value !== undefined) {
      r.value = clamp(r.value + changes.value, -100, 100);
    }
    if (changes.trust !== undefined) {
      r.trust = clamp(r.trust + changes.trust, -100, 100);
    }
    if (changes.fear !== undefined) {
      r.fear = clamp(r.fear + changes.fear, 0, 100);
    }
    if (changes.respect !== undefined) {
      r.respect = clamp(r.respect + changes.respect, -100, 100);
    }
    
    // Add to history
    const turn = window.STATE?.turn || 0;
    r.history.push({
      turn,
      changes,
      reason: changes.reason || "unknown"
    });
    
    // Keep history limited
    if (r.history.length > 20) {
      r.history.shift();
    }
    
    r.lastInteraction = turn;
    
    // Emit event
    emit(EventType.RelationshipChanged, {
      from: fromId,
      to: toId,
      deltas: changes,
      rel: { ...r }
    });
    
    return r;
  }
  
  // Decay relationships over time
  decayRelations() {
    for (const r of this.relations.values()) {
      r.value *= 0.995;   // 0.5% decay per turn
      r.trust *= 0.996;   // 0.4% decay
      r.fear *= 0.997;    // 0.3% decay (fear fades slower)
      r.respect *= 0.996; // 0.4% decay
    }
  }
  
  // Check if interaction is allowed (cooldown)
  canInteract(a, b) {
    const rel = this.getRelation(a, b);
    const t = window.STATE?.turn || 0;
    return !rel.cooldownUntil || rel.cooldownUntil <= t;
  }
  
  // Set interaction cooldown
  setCooldown(a, b, turns = 2) {
    const rel = this.getRelation(a, b);
    rel.cooldownUntil = (window.STATE?.turn || 0) + turns;
  }
  
  // Faction standing management
  getFactionStanding(entityId, factionId) {
    const k = `${entityId}:${factionId}`;
    return this.factionStanding.get(k) || 0;
  }
  
  modifyFactionStanding(entityId, factionId, delta) {
    const k = `${entityId}:${factionId}`;
    const cur = this.getFactionStanding(entityId, factionId);
    const nv = clamp(cur + delta, -100, 100);
    this.factionStanding.set(k, nv);
    
    emit(EventType.FactionStandingChanged, {
      entity: entityId,
      faction: factionId,
      change: delta,
      newValue: nv
    });
    
    return nv;
  }
  
  // Get overall attitude (combines all factors)
  getOverallAttitude(from, to) {
    const rel = this.getRelation(from, to);
    const fromEntity = typeof from === 'object' ? from : null;
    const toEntity = typeof to === 'object' ? to : null;
    
    let score = rel.value;
    
    // Factor in faction standings if applicable
    if (fromEntity?.faction && toEntity) {
      const toId = typeof to === 'string' ? to : to.id;
      const factionStanding = this.getFactionStanding(toId, fromEntity.faction);
      score += factionStanding * 0.3;
    }
    
    // Adjust for trust and fear
    score += rel.trust * 0.2;
    score -= rel.fear * 0.1;
    score += rel.respect * 0.2;
    
    return score;
  }
}

// Singleton instance
export const RelationshipSystem = new RelationshipMatrix();