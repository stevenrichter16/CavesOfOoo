// src/js/social/disguise.js - Disguise system for avoiding faction hostility

import { areFactionsHostile } from './factions.js';
import { RelationshipSystem } from './relationship.js';

/**
 * Check if an NPC should be hostile to the player
 * Takes disguises into account
 */
export function isNPCHostileToPlayer(state, npc) {
  // NPCs without faction are never hostile through faction system
  if (!npc.faction) return false;
  
  // Check for disguise first - if player is wearing appropriate disguise, no hostility
  if (state.player.armor?.disguise === 'banana_guard' && npc.faction === 'guards') {
    console.log(`🎭 [DISGUISE] ${npc.name || 'Guard'} fooled by Banana Guard disguise!`);
    return false;
  }
  
  // Check player's actual reputation with this faction
  const playerReputation = RelationshipSystem.getFactionStanding('player', npc.faction);
  
  // Also sync with state.factionReputation if it exists
  if (state.factionReputation && state.factionReputation[npc.faction] !== undefined) {
    // Use the lower of the two values to be conservative
    const stateRep = state.factionReputation[npc.faction];
    const actualRep = Math.min(playerReputation, stateRep);
    
    console.log(`🎯 [HOSTILITY] Checking ${npc.faction} hostility: RelSys=${playerReputation}, State=${stateRep}, Using=${actualRep}`);
    
    // Hostile if reputation is below -50
    return actualRep < -50;
  }
  
  console.log(`🎯 [HOSTILITY] Checking ${npc.faction} hostility: Reputation=${playerReputation}`);
  
  // Hostile if reputation is below -50
  return playerReputation < -50;
}

/**
 * Check if player is wearing a disguise
 */
export function isPlayerDisguised(state) {
  return !!state.player.armor?.disguise;
}

/**
 * Get the faction the player appears to be from their disguise
 */
export function getPlayerApparentFaction(state) {
  if (state.player.armor?.disguise === 'banana_guard') {
    return 'guards';
  }
  
  // Add more disguise mappings here as needed
  // if (state.player.armor?.disguise === 'bandit_mask') return 'bandits';
  
  return state.player.faction || 'player';
}

/**
 * Check if a disguise would fool a specific faction
 */
export function doesDisguiseFool(disguiseType, targetFaction) {
  const disguiseMappings = {
    'banana_guard': ['guards'],  // Banana Guard uniform fools guards
    // Add more mappings as needed
    // 'bandit_mask': ['bandits'],
    // 'noble_attire': ['nobles', 'guards'],
  };
  
  const fooledFactions = disguiseMappings[disguiseType] || [];
  return fooledFactions.includes(targetFaction);
}