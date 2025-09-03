// src/js/social/init.js - Initialization and integration helpers

import { NPCTraits, areTraitsOpposed } from './traits.js';
import { Factions } from './factions.js';
import { NPCMemory } from './memory.js';
import { RelationshipSystem } from './relationship.js';
import { SocialActions, isActionAvailable } from './actions.js';
import { executeSocialAction } from './behavior.js';
import { DialogueGenerator } from './dialogue.js';

// Initialize an NPC with social features
export function initializeNPC(npc, config = {}) {
  // Ensure NPC has an ID
  if (!npc.id) {
    npc.id = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Initialize traits if not present
  if (!npc.traits) {
    npc.traits = [];
    const traitCount = config.traitCount || 2;
    const traitKeys = Object.keys(NPCTraits);
    
    for (let i = 0; i < traitCount && npc.traits.length < traitCount; i++) {
      const trait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
      
      // Check if trait is opposed to existing traits
      let canAdd = true;
      for (const existing of npc.traits) {
        if (areTraitsOpposed(trait, existing)) {
          canAdd = false;
          break;
        }
      }
      
      if (canAdd && !npc.traits.includes(trait)) {
        npc.traits.push(trait);
      }
    }
  } else if (config.additionalTraits) {
    // Add additional traits if specified
    for (const trait of config.additionalTraits) {
      if (!npc.traits.includes(trait)) {
        // Check opposition
        let canAdd = true;
        for (const existing of npc.traits) {
          if (areTraitsOpposed(trait, existing)) {
            console.warn(`Cannot add trait ${trait} - opposes existing trait ${existing}`);
            canAdd = false;
            break;
          }
        }
        if (canAdd) {
          npc.traits.push(trait);
        }
      }
    }
  }
  
  // Add hasTrait helper method
  if (!npc.hasTrait) {
    npc.hasTrait = function(trait) {
      return this.traits?.includes(trait);
    };
  }
  
  // Initialize memory
  if (!npc.memory) {
    npc.memory = new NPCMemory(npc.id);
  }
  
  // Set faction
  if (!npc.faction && config.faction) {
    npc.faction = config.faction;
  } else if (!npc.faction && config.randomFaction) {
    const factionKeys = Object.keys(Factions);
    npc.faction = factionKeys[Math.floor(Math.random() * factionKeys.length)];
  }
  
  // Initialize inventory if not present
  if (!npc.inventory) {
    npc.inventory = [];
  }
  
  // Initialize stats if not present
  if (!npc.stats) {
    npc.stats = {
      str: config.str || 10,
      def: config.def || 10,
      spd: config.spd || 10
    };
  }
  
  // Initialize position if needed
  if (npc.x === undefined) npc.x = config.x || 0;
  if (npc.y === undefined) npc.y = config.y || 0;
  
  // Initialize HP if needed
  if (npc.hp === undefined) npc.hp = config.hp || 20;
  if (npc.hpMax === undefined) npc.hpMax = config.hpMax || npc.hp;
  
  return npc;
}

// Get available interactions between player and NPC
export function getAvailableInteractions(player, npc) {
  const options = [];
  const rel = RelationshipSystem.getRelation(player, npc);
  
  for (const [type, action] of Object.entries(SocialActions)) {
    const context = {
      actor: player,
      target: npc,
      relation: rel
    };
    
    // Check base requirements
    if (isActionAvailable(player, npc, type, context)) {
      // Check additional context requirements
      let available = true;
      
      // Gift requires an item
      if (type === "gift" && (!player.inventory || player.inventory.length === 0)) {
        available = false;
      }
      
      // Bribe requires money/valuable
      if (type === "bribe" && (!player.inventory || !player.inventory.some(i => i.value >= 10))) {
        available = false;
      }
      
      // Trade requires items on both sides
      if (type === "trade" && (!player.inventory?.length || !npc.inventory?.length)) {
        available = false;
      }
      
      if (available) {
        options.push({
          type,
          label: action.description || type.replace(/_/g, " "),
          cost: action.baseCost || 0,
          available: true
        });
      }
    }
  }
  
  // Always add some options even if requirements not met (show as disabled)
  if (options.length === 0) {
    options.push({
      type: "chat",
      label: "Chat",
      cost: 0,
      available: rel.value > -30,
      reason: rel.value <= -30 ? "Too hostile" : null
    });
    
    options.push({
      type: "compliment",
      label: "Compliment",
      cost: 0,
      available: true
    });
    
    options.push({
      type: "insult",
      label: "Insult",
      cost: 0,
      available: true
    });
  }
  
  return options;
}

// Execute player-NPC interaction
export function runPlayerNPCInteraction(state, player, npc, actionType, params = {}) {
  const action = SocialActions[actionType];
  if (!action) {
    return {
      success: false,
      reason: "invalid_action",
      message: "Unknown action type"
    };
  }
  
  // Build context
  const context = {
    actor: player,
    target: npc,
    relation: RelationshipSystem.getRelation(player, npc),
    action: actionType,
    ...params
  };
  
  // Check requirements
  if (!action.requirements(context)) {
    return {
      success: false,
      reason: "requirements_not_met",
      message: "You can't do that right now"
    };
  }
  
  // Check cooldown
  if (!RelationshipSystem.canInteract(player, npc)) {
    return {
      success: false,
      reason: "cooldown",
      message: "You interacted with them too recently"
    };
  }
  
  // Execute the action
  const success = executeSocialAction(state, player, npc, actionType, params);
  
  if (success) {
    // Generate response dialogue
    const dialogueGen = new DialogueGenerator();
    const dialogue = dialogueGen.generate(npc, player, context);
    
    return {
      success: true,
      dialogue,
      newRelation: RelationshipSystem.getRelation(player, npc)
    };
  }
  
  return {
    success: false,
    reason: "execution_failed",
    message: "The interaction failed"
  };
}

// Spawn a new NPC with social features
export function spawnSocialNPC(state, config) {
  const npc = {
    id: config.id || `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: config.name || "Unnamed NPC",
    x: config.x || 0,
    y: config.y || 0,
    hp: config.hp || 20,
    hpMax: config.hpMax || config.hp || 20,
    alive: true,
    chunkX: config.chunkX !== undefined ? config.chunkX : state.cx,  // Use config chunk if provided
    chunkY: config.chunkY !== undefined ? config.chunkY : state.cy,
    ...config
  };
  
  // Initialize social features
  initializeNPC(npc, config);
  
  // Add to state
  if (!state.npcs) {
    state.npcs = [];
  }
  state.npcs.push(npc);
  
  return npc;
}

// Initialize social system for existing NPCs
export function initializeSocialSystem(state) {
  // Ensure npcs array exists
  if (!state.npcs) {
    state.npcs = [];
  }
  
  // Initialize existing monsters as NPCs if needed
  if (state.chunk?.monsters) {
    for (const monster of state.chunk.monsters) {
      // Skip if already initialized
      if (monster.hasTrait) continue;
      
      // Convert monster to social NPC
      initializeNPC(monster, {
        faction: guessFactionFromMonster(monster),
        traitCount: 1 + Math.floor(Math.random() * 2)
      });
    }
  }
  
  // Ensure player has ID for relationships
  if (state.player && !state.player.id) {
    state.player.id = 'player';
  }
  
  return state;
}

// Helper to guess faction from monster type
function guessFactionFromMonster(monster) {
  const name = monster.name?.toLowerCase() || "";
  
  if (name.includes("guard") || name.includes("knight")) return "guards";
  if (name.includes("bandit") || name.includes("thief")) return "bandits";
  if (name.includes("merchant") || name.includes("trader")) return "merchants";
  if (name.includes("noble") || name.includes("lord")) return "nobles";
  if (name.includes("peasant") || name.includes("farmer")) return "peasants";
  if (name.includes("wild") || name.includes("beast")) return "wildlings";
  
  // Default to peasants for unknown types
  return "peasants";
}