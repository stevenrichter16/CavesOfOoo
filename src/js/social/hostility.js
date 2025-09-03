// src/js/social/hostility.js - Handle NPC hostility based on faction reputation

import { isNPCHostileToPlayer } from './disguise.js';
import { attack } from '../combat/combat.js';

/**
 * Process hostile NPCs attacking the player
 * Called each turn to check if faction NPCs should attack
 */
export function processHostileNPCs(state) {
  if (!state.npcs || state.npcs.length === 0) return;
  
  for (const npc of state.npcs) {
    // Skip dead, frozen NPCs
    if (!npc || npc.hp <= 0 || npc.frozen) continue;
    
    // Skip NPCs without faction
    if (!npc.faction) continue;
    
    // Check if NPC should be hostile to player
    if (isNPCHostileToPlayer(state, npc)) {
      // Calculate distance to player
      const dx = Math.abs(npc.x - state.player.x);
      const dy = Math.abs(npc.y - state.player.y);
      const distance = Math.max(dx, dy);
      
      // Attack if adjacent
      if (distance === 1) {
        console.log(`⚔️ [HOSTILITY] ${npc.name || npc.faction} attacks player due to faction hostility!`);
        attack(state, npc, state.player, 'melee');
        
        // Check if player died
        if (state.player.hp <= 0) {
          state.player.alive = false;
          state.over = true;
          if (state.log) {
            state.log(`You were killed by ${npc.name || 'a hostile ' + npc.faction}!`, 'bad');
          }
        }
      } 
      // Move towards player if not adjacent
      else if (distance <= 5) {
        moveNPCTowardsPlayer(state, npc);
      }
    }
  }
}

/**
 * Move an NPC towards the player
 */
function moveNPCTowardsPlayer(state, npc) {
  const dx = state.player.x - npc.x;
  const dy = state.player.y - npc.y;
  
  // Determine movement direction
  let moveX = 0;
  let moveY = 0;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    moveX = dx > 0 ? 1 : -1;
  } else if (dy !== 0) {
    moveY = dy > 0 ? 1 : -1;
  } else if (dx !== 0) {
    moveX = dx > 0 ? 1 : -1;
  }
  
  // Try to move
  const newX = npc.x + moveX;
  const newY = npc.y + moveY;
  
  // Check if the new position is valid
  if (canNPCMoveTo(state, newX, newY)) {
    npc.x = newX;
    npc.y = newY;
    console.log(`🎯 [HOSTILITY] ${npc.name || npc.faction} moves towards player`);
  }
}

/**
 * Check if an NPC can move to a position
 */
function canNPCMoveTo(state, x, y) {
  // Get dimensions (fallback to config if not in state)
  const W = state.W || 30;
  const H = state.H || 20;
  
  // Check bounds
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  
  // Check if tile is walkable
  const tile = state.chunk?.map?.[y]?.[x];
  if (!tile || tile === '#' || tile === '~') return false;
  
  // Check if player is there
  if (x === state.player.x && y === state.player.y) return false;
  
  // Check if another NPC is there
  for (const otherNpc of state.npcs) {
    if (otherNpc.x === x && otherNpc.y === y) return false;
  }
  
  // Check if a monster is there
  if (state.monsters) {
    for (const monster of state.monsters) {
      if (monster.alive && monster.x === x && monster.y === y) return false;
    }
  }
  
  return true;
}

/**
 * Update faction reputation and check for new hostilities
 */
export function updateFactionReputation(state, faction, amount) {
  state.factionReputation = state.factionReputation || {};
  const oldRep = state.factionReputation[faction] || 0;
  const newRep = oldRep + amount;
  state.factionReputation[faction] = newRep;
  
  // Check if this crosses the hostility threshold (-50)
  if (oldRep >= -50 && newRep < -50) {
    if (state.log) {
      state.log(`⚠️ The ${faction} faction is now hostile to you!`, 'bad');
    }
  } else if (oldRep < -50 && newRep >= -50) {
    if (state.log) {
      state.log(`The ${faction} faction is no longer hostile to you.`, 'good');
    }
  }
  
  return newRep;
}