// src/js/social/index.js - Main social system module exports

// Import everything we need for the default export
import { NPCTraits, areTraitsOpposed, getTraitModifier } from './traits.js';
import { Factions, getFactionRelation, areFactionsAllied, areFactionsHostile } from './factions.js';
import { RelationshipSystem } from './relationship.js';
import { NPCMemory } from './memory.js';
import { DialogueGenerator } from './dialogue.js';
import { SocialActions, isActionAvailable } from './actions.js';
import { executeSocialAction, processNPCSocialTurn, propagateReputation } from './behavior.js';
import {
  initializeNPC,
  getAvailableInteractions,
  runPlayerNPCInteraction,
  spawnSocialNPC,
  initializeSocialSystem
} from './init.js';

// Re-export everything
export { NPCTraits, areTraitsOpposed, getTraitModifier } from './traits.js';
export { Factions, getFactionRelation, areFactionsAllied, areFactionsHostile } from './factions.js';
export { RelationshipSystem } from './relationship.js';
export { NPCMemory } from './memory.js';
export { DialogueGenerator } from './dialogue.js';
export { SocialActions, isActionAvailable } from './actions.js';
export { executeSocialAction, processNPCSocialTurn, propagateReputation } from './behavior.js';
export {
  initializeNPC,
  getAvailableInteractions,
  runPlayerNPCInteraction,
  spawnSocialNPC,
  initializeSocialSystem
} from './init.js';
export { 
  isNPCHostileToPlayer, 
  isPlayerDisguised, 
  getPlayerApparentFaction, 
  doesDisguiseFool 
} from './disguise.js';

// Default export with all systems
export default {
  // Data
  NPCTraits,
  Factions,
  
  // Systems
  RelationshipSystem,
  NPCMemory,
  DialogueGenerator,
  SocialActions,
  
  // Functions
  executeSocialAction,
  processNPCSocialTurn,
  propagateReputation,
  initializeNPC,
  getAvailableInteractions,
  runPlayerNPCInteraction,
  spawnSocialNPC,
  initializeSocialSystem,
  
  // Helpers
  areTraitsOpposed,
  getTraitModifier,
  getFactionRelation,
  areFactionsAllied,
  areFactionsHostile,
  isActionAvailable
};