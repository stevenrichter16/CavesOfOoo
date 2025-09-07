/**
 * NPCMovementExecutor - Bridges NPC behaviors with actual movement
 * Interprets behavior decisions from the social system and executes movement
 */

import { NPC } from '../npc.js';
import { evaluateFactionHostility } from '../factionRegistry.js';
import { BEHAVIOR_THRESHOLDS } from '../npcConstants.js';
import { getFactionDef } from '../../data/kingdoms/index.js';

export class NPCMovementExecutor {
  constructor() {
    // Movement constants
    this.INTERACTION_DISTANCE = 1.5;
    this.FLEE_DISTANCE = 5;
    this.PATROL_VARIANCE = 0.3; // Random variance in patrol movement
    this.MAX_VISION_RANGE = 10;
  }

  /**
   * Execute a turn for an NPC based on their behavior
   * @param {NPC} npc - The NPC to move
   * @param {Object} state - Game state
   * @param {Object} context - Additional context (timeOfDay, etc)
   */
  executeNPCTurn(npc, state, context = {}) {
    if (!npc || npc.hp <= 0) return;

    // Determine threats first (might override behavior)
    const threats = this.identifyThreats(npc, state);
    
    // Get behavior toward threats if any
    let behavior;
    if (threats.length > 0) {
      // Check behavior toward primary threat
      const behaviorToward = npc.getBehaviorToward(threats[0]);
      if (behaviorToward.action === 'flee') {
        behavior = { primary: 'flee' };
      } else if (behaviorToward.action === 'confront') {
        behavior = { primary: 'confront' };
      } else {
        behavior = npc.getBehavior(context);
      }
    } else {
      behavior = npc.getBehavior(context);
    }
    
    const target = this.identifyTarget(npc, state, behavior);

    // Execute movement based on behavior
    switch (behavior.primary) {
      case 'patrol':
        this.executePatrol(npc, state);
        break;
      case 'flee':
      case 'rest':
        if (threats.length > 0) {
          this.executeFlee(npc, threats, state);
        }
        break;
      case 'trade':
        if (target) {
          this.executeApproach(npc, target, state, this.INTERACTION_DISTANCE);
        }
        break;
      case 'watch':
        // Guards watch but don't necessarily move
        if (threats.length > 0) {
          this.executeIntercept(npc, threats[0], state);
        }
        break;
      case 'confront':
        if (threats.length > 0) {
          this.executeApproach(npc, threats[0], state, 1);
        }
        break;
      default:
        // Idle or unknown behavior - no movement
        break;
    }
  }

  /**
   * Execute patrol movement pattern
   */
  executePatrol(npc, state) {
    // Use patrol center if defined, otherwise current position
    const centerX = npc.patrolCenter?.x ?? npc.x;
    const centerY = npc.patrolCenter?.y ?? npc.y;
    
    // Calculate distance from patrol center
    const distFromCenter = Math.sqrt(
      Math.pow(npc.x - centerX, 2) + 
      Math.pow(npc.y - centerY, 2)
    );

    let dx = 0, dy = 0;

    // If too far from center, move back
    if (distFromCenter > npc.patrolRadius) {
      // Move back toward center
      dx = Math.sign(centerX - npc.x);
      dy = Math.sign(centerY - npc.y);
    } else {
      // Random patrol movement
      const angle = Math.random() * Math.PI * 2;
      dx = Math.round(Math.cos(angle));
      dy = Math.round(Math.sin(angle));
      
      // Check if this move would take us outside patrol radius
      const newDist = Math.sqrt(
        Math.pow((npc.x + dx) - centerX, 2) + 
        Math.pow((npc.y + dy) - centerY, 2)
      );
      
      // If it would, try moving toward center instead
      if (newDist > npc.patrolRadius) {
        dx = Math.sign(centerX - npc.x) || 0;
        dy = Math.sign(centerY - npc.y) || 0;
      }
    }

    // Try to move
    const newX = npc.x + dx;
    const newY = npc.y + dy;
    
    if (this.validateMove(npc, newX, newY, state).valid) {
      npc.moveTo(newX, newY);
    } else {
      // Try alternative directions
      this.tryAlternativeMove(npc, dx, dy, state);
    }
  }

  /**
   * Execute flee movement away from threats
   */
  executeFlee(npc, threats, state) {
    if (!threats || threats.length === 0) return;

    // Calculate average threat position
    let avgX = 0, avgY = 0;
    for (const threat of threats) {
      avgX += threat.x;
      avgY += threat.y;
    }
    avgX /= threats.length;
    avgY /= threats.length;

    // Move away from average threat position
    const dx = Math.sign(npc.x - avgX);
    const dy = Math.sign(npc.y - avgY);

    // Look for safe areas (near guards)
    const safeArea = this.findSafeArea(npc, state);
    let targetX = npc.x + dx;
    let targetY = npc.y + dy;

    if (safeArea) {
      // Adjust movement toward safe area
      targetX = npc.x + Math.sign(safeArea.x - npc.x);
      targetY = npc.y + Math.sign(safeArea.y - npc.y);
    }

    if (this.validateMove(npc, targetX, targetY, state).valid) {
      npc.moveTo(targetX, targetY);
    } else {
      this.tryAlternativeMove(npc, targetX - npc.x, targetY - npc.y, state);
    }
  }

  /**
   * Execute approach movement toward target
   */
  executeApproach(npc, target, state, stopDistance = 1) {
    const distance = npc.distanceTo(target.x, target.y);
    
    // Already close enough
    if (distance <= stopDistance) return;

    // Calculate direction to target
    const dx = Math.sign(target.x - npc.x);
    const dy = Math.sign(target.y - npc.y);

    const newX = npc.x + dx;
    const newY = npc.y + dy;

    if (this.validateMove(npc, newX, newY, state).valid) {
      npc.moveTo(newX, newY);
    } else {
      this.tryAlternativeMove(npc, dx, dy, state);
    }
  }

  /**
   * Execute intercept movement (guards moving to block threats)
   */
  executeIntercept(npc, threat, state) {
    // Move between threat and likely target (player)
    const player = state.player;
    if (!player) {
      this.executeApproach(npc, threat, state, 2);
      return;
    }

    // Calculate intercept point
    const interceptX = Math.round((threat.x + player.x) / 2);
    const interceptY = Math.round((threat.y + player.y) / 2);

    this.executeApproach(npc, { x: interceptX, y: interceptY }, state, 0);
  }

  /**
   * Try alternative movement directions
   */
  tryAlternativeMove(npc, preferredDx, preferredDy, state) {
    // Try perpendicular directions
    const alternatives = [
      { dx: preferredDy, dy: -preferredDx },  // Rotate 90 degrees
      { dx: -preferredDy, dy: preferredDx },  // Rotate -90 degrees
      { dx: preferredDx, dy: 0 },             // Only X
      { dx: 0, dy: preferredDy },             // Only Y
      { dx: -preferredDx, dy: -preferredDy }  // Opposite direction
    ];

    for (const alt of alternatives) {
      if (alt.dx === 0 && alt.dy === 0) continue;
      
      const newX = npc.x + alt.dx;
      const newY = npc.y + alt.dy;
      
      if (this.validateMove(npc, newX, newY, state).valid) {
        npc.moveTo(newX, newY);
        return;
      }
    }
  }

  /**
   * Validate if a move is possible
   */
  validateMove(npc, x, y, state) {
    // Check map boundaries
    if (x < 0 || y < 0 || x >= 20 || y >= 20) {
      return { valid: false, reason: 'out_of_bounds' };
    }

    // Check for walls/obstacles
    if (state.map && state.map[x] && state.map[x][y] === 1) {
      return { valid: false, reason: 'blocked' };
    }

    // Check for other NPCs
    const occupant = state.npcs?.find(other => 
      other.id !== npc.id && 
      other.x === x && 
      other.y === y &&
      other.chunkX === npc.chunkX &&
      other.chunkY === npc.chunkY
    );
    
    if (occupant) {
      return { valid: false, reason: 'occupied', occupant };
    }

    // Check for player
    if (state.player && 
        state.player.x === x && 
        state.player.y === y &&
        state.cx === npc.chunkX &&
        state.cy === npc.chunkY) {
      return { valid: false, reason: 'player_occupied' };
    }

    return { valid: true };
  }

  /**
   * Identify threats to this NPC
   */
  identifyThreats(npc, state) {
    const threats = [];
    
    // Check other NPCs
    for (const other of state.npcs || []) {
      if (other.id === npc.id || other.hp <= 0) continue;
      if (!npc.canSee(other.x, other.y)) continue;
      
      const hostility = npc.evaluateHostilityTo(other);
      if (hostility.hostile) {
        threats.push(other);
      }
    }

    // Check player
    if (state.player && npc.canSee(state.player.x, state.player.y)) {
      const playerEntity = {
        factions: state.player.factions || ['player'],
        x: state.player.x,
        y: state.player.y
      };
      
      const hostility = npc.evaluateHostilityTo(playerEntity);
      if (hostility.hostile) {
        threats.push(state.player);
      }
    }

    return threats;
  }

  /**
   * Identify target for this NPC (for trade, approach, etc)
   */
  identifyTarget(npc, state, behavior) {
    // Merchants target the player for trade
    if (behavior.primary === 'trade' && state.player) {
      if (npc.canSee(state.player.x, state.player.y)) {
        return state.player;
      }
    }

    // Guards might target suspicious NPCs
    if (behavior.primary === 'watch') {
      for (const other of state.npcs || []) {
        if (other.id === npc.id) continue;
        if (!npc.canSee(other.x, other.y)) continue;
        
        const relation = npc.getRelationTo(other);
        if (relation < 0) {
          return other;
        }
      }
    }

    return null;
  }

  /**
   * Find safe area for fleeing NPCs (near guards)
   */
  findSafeArea(npc, state) {
    let nearestGuard = null;
    let minDistance = Infinity;

    for (const other of state.npcs || []) {
      if (other.id === npc.id || other.hp <= 0) continue;
      
      // Check if it's a guard
      if (other.hasFactionType && other.hasFactionType('guard')) {
        const relation = npc.getRelationTo(other);
        if (relation > 0) {
          const distance = npc.distanceTo(other.x, other.y);
          if (distance < minDistance) {
            minDistance = distance;
            nearestGuard = other;
          }
        }
      }
    }

    return nearestGuard;
  }

  /**
   * Get movement cost for terrain (for future pathfinding)
   */
  getMovementCost(npc, x, y, state) {
    if (!state.terrain) return 1;
    
    const terrain = state.terrain[x]?.[y];
    if (!terrain) return 1;

    // Get terrain costs from NPC's kingdom data
    if (npc.kingdomId) {
      const factionDef = getFactionDef(npc.factions[0]);
      if (factionDef?.kingdom?.terrainCost) {
        return factionDef.kingdom.terrainCost[terrain] || 1;
      }
    }

    // Default terrain costs
    const defaultCosts = {
      'grass': 1,
      'ice': 1.5,
      'lava': 5,
      'water': 3,
      'sand': 1.2
    };

    return defaultCosts[terrain] || 1;
  }
}