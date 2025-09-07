/**
 * Candy Kingdom Test World
 * A small test environment for NPC + Social System + Movement Pipeline
 */

import { NPC } from '../social/npc.js';
import { createRumor, RumorPropagationEngine } from '../social/rumors.js';
import { MovementPipeline } from '../js/movement/MovementPipeline.js';
import { EventBus } from '../js/systems/EventBus.js';

export class CandyTestWorld {
  constructor() {
    this.name = 'Candy Kingdom Town Square';
    this.width = 20;
    this.height = 20;
    
    // Initialize systems
    this.eventBus = new EventBus();
    this.movementPipeline = new MovementPipeline();
    this.rumorEngine = new RumorPropagationEngine();
    
    // Create terrain
    this.terrain = this.generateTerrain();
    
    // Create NPCs
    this.npcs = this.createNPCs();
    
    // Create player
    this.player = this.createPlayer();
    
    // Track time for updates
    this.lastUpdate = Date.now();
  }
  
  generateTerrain() {
    const terrain = [];
    for (let y = 0; y < this.height; y++) {
      terrain[y] = [];
      for (let x = 0; x < this.width; x++) {
        // Buildings on corners
        if ((x === 0 || x === 19) && (y === 0 || y === 19)) {
          terrain[y][x] = 'building';
        }
        // Shop on east side
        else if (x >= 16 && x <= 18 && y >= 9 && y <= 11) {
          terrain[y][x] = 'shop';
        }
        // Guard post at north gate
        else if (x >= 9 && x <= 11 && y >= 3 && y <= 4) {
          terrain[y][x] = 'guardpost';
        }
        // Main paths
        else if (
          (x >= 9 && x <= 11) || // North-south path
          (y >= 9 && y <= 11) || // East-west path
          (x >= 5 && x <= 15 && y >= 5 && y <= 15) // Town square
        ) {
          terrain[y][x] = 'path';
        }
        // Everything else is grass/decoration
        else {
          terrain[y][x] = 'grass';
        }
      }
    }
    return terrain;
  }
  
  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    const tile = this.terrain[y][x];
    return tile === 'path' || tile === 'grass';
  }
  
  createNPCs() {
    const npcs = [];
    
    // Guard Bob at the north gate
    const bob = new NPC({
      id: 'guard-bob',
      name: 'Guard Bob',
      role: 'guard',
      factions: ['banana_guard', 'candy_citizens'],
      x: 10,
      y: 5,
      perception: 0.7,
      hp: 100
    });
    
    // Add custom movement properties
    bob.movementType = 'patrol';
    bob.patrolRoute = [
      { x: 10, y: 5 },  // Gate
      { x: 8, y: 7 },   // West patrol
      { x: 12, y: 7 },  // East patrol
      { x: 10, y: 5 }   // Back to gate
    ];
    
    // Add dialogue method
    bob.getDialogue = function(player) {
      const combatRumors = this.memory.rumors.filter(r => r.type === 'combat');
      
      if (this.evaluateHostilityTo(player).hostile) {
        return "You're not welcome here! Leave now!";
      }
      
      if (combatRumors.length > 0) {
        return "There's been trouble lately. Watch yourself, traveler.";
      }
      
      const relation = this.getRelationTo(player);
      if (relation > 0.3) {
        return "Good to see you, friend. Keep the peace.";
      }
      
      return "Keep the peace, traveler.";
    };
    
    npcs.push(bob);
    
    // Merchant Sally at her shop
    const sally = new NPC({
      id: 'merchant-sally',
      name: 'Merchant Sally',
      role: 'merchant',
      factions: ['candy_merchants', 'candy_citizens'],
      x: 15,
      y: 10,
      perception: 0.5,
      hp: 100
    });
    
    sally.getDialogue = function(player) {
      const tradeRumors = this.memory.rumors.filter(r => r.type === 'trade');
      
      if (this.evaluateHostilityTo(player).hostile) {
        return "No goods for you! Get out of my shop!";
      }
      
      if (tradeRumors.length > 0) {
        return `Have you heard? ${tradeRumors[0].details} Looking to trade?`;
      }
      
      const relation = this.getRelationTo(player);
      if (relation > 0.3) {
        return "Welcome back! I've got the best deals in town!";
      }
      
      return "Looking to trade? I've got quality goods!";
    };
    
    npcs.push(sally);
    
    // Citizen Tim wandering the square
    const tim = new NPC({
      id: 'citizen-tim',
      name: 'Citizen Tim',
      role: 'citizen',
      factions: ['candy_citizens'],
      x: 8,
      y: 12,
      perception: 0.4,
      hp: 100
    });
    
    tim.movementType = 'wander';
    
    tim.getDialogue = function(player) {
      const allRumors = this.memory.rumors;
      
      if (this.evaluateHostilityTo(player).hostile) {
        return "Stay away from me!";
      }
      
      if (allRumors.length > 0) {
        const latestRumor = allRumors[allRumors.length - 1];
        return `Did you hear? ${latestRumor.details}`;
      }
      
      const relation = this.getRelationTo(player);
      if (relation > 0.3) {
        return "Hello friend! Lovely day in the Candy Kingdom!";
      }
      
      return "Hello there! Nice day for a stroll.";
    };
    
    npcs.push(tim);
    
    return npcs;
  }
  
  createPlayer() {
    return {
      x: 10,
      y: 15,
      factions: ['player'],
      hp: 100,
      name: 'Player'
    };
  }
  
  movePlayer(dx, dy) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    
    if (this.isWalkable(newX, newY)) {
      // Check for NPCs
      const npcAtPosition = this.npcs.find(npc => 
        npc.x === newX && npc.y === newY && npc.hp > 0
      );
      
      if (!npcAtPosition) {
        this.player.x = newX;
        this.player.y = newY;
        return true;
      }
    }
    return false;
  }
  
  movePlayerTo(x, y) {
    if (this.isWalkable(x, y)) {
      this.player.x = x;
      this.player.y = y;
      return true;
    }
    return false;
  }
  
  moveNPC(npc, x, y) {
    if (this.isWalkable(x, y)) {
      npc.x = x;
      npc.y = y;
      // position is a getter in NPC, don't set it
      return true;
    }
    return false;
  }
  
  async executePlayerMove(dx, dy) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    
    // Check bounds
    if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
      return { success: false, reason: 'Out of bounds' };
    }
    
    // Check terrain
    if (!this.isWalkable(newX, newY)) {
      return { success: false, reason: 'Terrain blocked' };
    }
    
    // Check for NPC collision
    const npcAtTarget = this.npcs.find(npc => 
      npc.x === newX && npc.y === newY && (!npc.hp || npc.hp > 0)
    );
    
    if (npcAtTarget) {
      // Check if hostile
      const hostility = npcAtTarget.evaluateHostilityTo ? 
        npcAtTarget.evaluateHostilityTo(this.player) :
        { hostile: false };
        
      if (hostility.hostile) {
        // Attack the NPC
        this.playerAttackNPC(npcAtTarget);
        return { 
          success: false, 
          combat: true, 
          attacked: true,
          reason: 'Attacked hostile NPC' 
        };
      } else {
        // Can't walk through friendly NPCs
        return { success: false, reason: 'NPC blocking' };
      }
    }
    
    // Move successful
    this.player.x = newX;
    this.player.y = newY;
    return { success: true };
  }
  
  createRumor(config) {
    return createRumor({
      ...config,
      timestamp: Date.now(),
      spreadCount: 0,
      accuracy: 1.0
    });
  }
  
  processRumorSharing() {
    // Check all NPC pairs for proximity
    for (let i = 0; i < this.npcs.length; i++) {
      for (let j = i + 1; j < this.npcs.length; j++) {
        const npc1 = this.npcs[i];
        const npc2 = this.npcs[j];
        
        const distance = Math.sqrt(
          Math.pow(npc1.x - npc2.x, 2) + 
          Math.pow(npc1.y - npc2.y, 2)
        );
        
        // Share rumors if within 5 units
        if (distance <= 5) {
          npc1.shareRumorsWith(npc2);
          npc2.shareRumorsWith(npc1);
        }
      }
    }
  }
  
  interactWithNPC(npc) {
    const distance = Math.sqrt(
      Math.pow(this.player.x - npc.x, 2) + 
      Math.pow(this.player.y - npc.y, 2)
    );
    
    if (distance <= 1.5) {
      return {
        type: 'dialogue',
        npc: npc,
        dialogue: npc.getDialogue(this.player)
      };
    }
    
    return null;
  }
  
  playerAttackNPC(npc) {
    // Damage the NPC
    npc.hp -= 10;
    
    // Adjust relations
    npc.adjustRelationTo(this.player, -0.5);
    
    // Alert other guards if attacking a guard
    if (npc.factions.includes('banana_guard')) {
      this.npcs.forEach(otherNpc => {
        if (otherNpc.factions.includes('banana_guard')) {
          otherNpc.adjustRelationTo(this.player, -0.3);
        }
      });
    }
    
    return {
      combat: true,
      damage: 10,
      npcHp: npc.hp
    };
  }
  
  playerStealFrom(npc) {
    const success = Math.random() > npc.perception;
    
    if (!success) {
      // Caught stealing
      npc.adjustRelationTo(this.player, -0.4);
      
      // Create theft rumor
      const rumor = this.createRumor({
        type: 'theft',
        severity: 'moderate',
        details: `Someone tried to steal from ${npc.name}!`,
        factions: ['player'],
        sentiment: -0.6,
        position: { x: npc.x, y: npc.y }
      });
      
      npc.hearRumor(rumor);
    }
    
    return { success };
  }
  
  playerHelpNPC(npc) {
    // Improve relations
    npc.adjustRelationTo(this.player, 0.3);
    
    // Spread good will to faction
    const merchantFaction = 'candy_merchants';
    if (npc.factions.includes(merchantFaction)) {
      this.npcs.forEach(otherNpc => {
        if (otherNpc.factions.includes(merchantFaction)) {
          otherNpc.adjustRelationTo(this.player, 0.1);
        }
      });
    }
    
    return { success: true };
  }
  
  makeFactionHostile(faction1, faction2) {
    // This would normally be done through FactionRegistry
    // For testing, we'll adjust NPC relations directly
    this.npcs.forEach(npc => {
      if (npc.factions.includes(faction1)) {
        npc.adjustRelationTo({ factions: [faction2] }, -0.8);
      }
    });
  }
  
  getFaction(factionId) {
    return { id: factionId, name: factionId };
  }
  
  update() {
    const now = Date.now();
    const dt = now - this.lastUpdate;
    this.lastUpdate = now;
    
    // Update NPCs (movement, etc.)
    this.npcs.forEach(npc => {
      if (npc.movementType === 'patrol' && npc.patrolRoute) {
        // Simple patrol logic
        if (!npc.patrolIndex) npc.patrolIndex = 0;
        
        const target = npc.patrolRoute[npc.patrolIndex];
        if (npc.x === target.x && npc.y === target.y) {
          npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolRoute.length;
        } else {
          // Move towards target
          const dx = Math.sign(target.x - npc.x);
          const dy = Math.sign(target.y - npc.y);
          this.moveNPC(npc, npc.x + dx, npc.y + dy);
        }
      } else if (npc.movementType === 'wander') {
        // Random wandering
        if (Math.random() < 0.1) {
          const dx = Math.floor(Math.random() * 3) - 1;
          const dy = Math.floor(Math.random() * 3) - 1;
          this.moveNPC(npc, npc.x + dx, npc.y + dy);
        }
      }
    });
    
    // Process rumor sharing
    this.processRumorSharing();
    
    // Emit update event
    this.eventBus.emit('worldUpdate', { world: this, dt });
  }
}

// Helper extensions to NPC for relations
NPC.prototype.getRelationTo = function(entity) {
  if (!this._relations) this._relations = new Map();
  
  const key = entity.factions ? entity.factions.join(',') : entity.name || entity.id;
  return this._relations.get(key) || 0;
};

NPC.prototype.adjustRelationTo = function(entity, amount) {
  if (!this._relations) this._relations = new Map();
  
  const key = entity.factions ? entity.factions.join(',') : entity.name || entity.id;
  const current = this._relations.get(key) || 0;
  this._relations.set(key, Math.max(-1, Math.min(1, current + amount)));
};

// Add evaluateHostilityTo if it doesn't exist
if (!NPC.prototype.evaluateHostilityTo) {
  NPC.prototype.evaluateHostilityTo = function(entity) {
    const relation = this.getRelationTo(entity);
    const hostile = relation < -0.3;
    return {
      hostile: hostile,
      hostilityLevel: hostile ? Math.abs(relation) : 0,
      reason: hostile ? 'low_relation' : null
    };
  };
}