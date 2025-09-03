// src/js/social/behavior.js - NPC social AI and action execution

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { RelationshipSystem } from './relationship.js';
import { SocialActions } from './actions.js';
import { DialogueGenerator } from './dialogue.js';
import { Factions } from './factions.js';

// Random helpers
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(list /* [{ item, weight }] */) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return list[0]?.item;
  
  let r = Math.random() * total;
  for (const { item, weight } of list) {
    r -= weight;
    if (r <= 0) return item;
  }
  return list[list.length - 1]?.item;
}

// Execute a social action between two entities
export function executeSocialAction(state, actor, target, actionType, params = {}) {
  const action = SocialActions[actionType];
  if (!action) {
    console.warn(`Unknown social action: ${actionType}`);
    return false;
  }
  
  // Build context
  const context = {
    actor,
    target,
    relation: RelationshipSystem.getRelation(actor, target),
    action: actionType,
    ...params
  };
  
  // Check requirements
  if (!action.requirements(context)) {
    return false;
  }
  
  // Check cooldown
  if (!RelationshipSystem.canInteract(actor, target)) {
    return false;
  }
  
  // Calculate effects
  const effects = action.effects(context) || {};
  
  // Apply actor -> target relationship changes
  RelationshipSystem.modifyRelation(actor, target, {
    ...effects,
    reason: actionType
  });
  
  // Apply mirrored target -> actor changes if defined
  if (typeof action.mirror === "function") {
    const mirrored = action.mirror(context, effects) || {};
    RelationshipSystem.modifyRelation(target, actor, {
      ...mirrored,
      reason: `${actionType}_response`
    });
  }
  
  // Execute special side effects
  if (typeof action.special === "function") {
    action.special(context, state);
  }
  
  // Generate dialogue response
  const dialogueGen = new DialogueGenerator();
  const dialogue = dialogueGen.generate(target, actor, context);
  
  // Update target's memory
  if (target.memory) {
    target.memory.remember({
      type: `${actionType}_by`,
      actor: actor.id,
      actorName: actor.name,
      ...effects
    });
  }
  
  // Emit events
  emit(EventType.SocialActionPerformed, {
    actor: actor.id,
    actorName: actor.name,
    target: target.id,
    targetName: target.name,
    action: actionType,
    effects,
    dialogue
  });
  
  emit(EventType.DialogueLine, {
    speakerId: target.id,
    speakerName: target.name,
    text: dialogue
  });
  
  // Set interaction cooldown
  RelationshipSystem.setCooldown(actor, target, 2);
  
  // Log to game log if available
  if (state?.log) {
    // Action log
    const actionDesc = action.description || actionType;
    if (actor === state.player || actor.id === 'player') {
      state.log(`You ${actionDesc} ${target.name}`, "note");
    } else if (target === state.player || target.id === 'player') {
      state.log(`${actor.name} ${actionDesc}s you`, "note");
    } else {
      state.log(`${actor.name} ${actionDesc}s ${target.name}`, "note");
    }
    
    // Dialogue log
    state.log(`${target.name}: "${dialogue}"`, "dialogue");
  }
  
  return true;
}

// Process NPC social turns
export function processNPCSocialTurn(state) {
  if (!state?.npcs?.length) return;
  
  for (const npc of state.npcs) {
    // Skip dead, frozen, or combat-engaged NPCs
    if (!npc || npc.hp <= 0 || npc.frozen || npc.inCombat) {
      continue;
    }
    
    // Check if NPC wants to socialize this turn
    if (Math.random() < getSocialChance(npc)) {
      // Find nearby entities
      const nearby = getNearbyEntities(state, npc, 5);
      if (!nearby.length) continue;
      
      // Select a target
      const target = selectSocialTarget(npc, nearby);
      if (!target) continue;
      
      // Check cooldown
      if (!RelationshipSystem.canInteract(npc, target)) {
        continue;
      }
      
      // Pick an action
      const actionType = pickSocialAction(state, npc, target);
      if (actionType) {
        executeSocialAction(state, npc, target, actionType);
      }
    }
  }
}

// Calculate chance NPC will initiate social interaction
function getSocialChance(npc) {
  let chance = 0.1; // Base 10% chance
  
  // Trait modifiers
  if (npc.hasTrait?.("gossipy")) chance += 0.1;
  if (npc.hasTrait?.("secretive")) chance -= 0.05;
  if (npc.hasTrait?.("aggressive")) chance += 0.05;
  if (npc.hasTrait?.("peaceful")) chance += 0.05;
  
  // Faction values
  if (npc.faction) {
    const faction = Factions[npc.faction];
    if (faction?.values?.includes("community")) chance += 0.05;
    if (faction?.values?.includes("isolation")) chance -= 0.05;
  }
  
  return Math.max(0, Math.min(0.3, chance)); // Cap at 30%
}

// Get entities within range of NPC
function getNearbyEntities(state, npc, radius) {
  const entities = [];
  
  // Add other NPCs
  if (state.npcs) {
    for (const other of state.npcs) {
      if (other && other.id !== npc.id && other.hp > 0) {
        const dist = Math.abs(other.x - npc.x) + Math.abs(other.y - npc.y);
        if (dist <= radius) {
          entities.push(other);
        }
      }
    }
  }
  
  // Add player
  if (state.player && state.player.hp > 0) {
    const dist = Math.abs(state.player.x - npc.x) + Math.abs(state.player.y - npc.y);
    if (dist <= radius) {
      entities.push(state.player);
    }
  }
  
  return entities;
}

// Select target for social interaction
function selectSocialTarget(npc, candidates) {
  if (!candidates.length) return null;
  
  // Weight by relationship intensity (more likely to interact with strong relationships)
  const weighted = candidates.map(target => {
    const rel = RelationshipSystem.getRelation(npc, target);
    const intensity = Math.abs(rel.value) + Math.abs(rel.trust) + 
                     Math.abs(rel.fear) + Math.abs(rel.respect);
    
    // Minimum weight of 10 to ensure some randomness
    return {
      item: target,
      weight: intensity + 10
    };
  });
  
  return weightedPick(weighted);
}

// Pick which social action to perform
function pickSocialAction(state, actor, target) {
  const rel = RelationshipSystem.getRelation(actor, target);
  const actions = [];
  
  // Get faction values
  const factionValues = actor.faction ? 
    (Factions[actor.faction]?.values || []) : [];
  
  // Relationship-based action selection
  if (rel.value > 50) {
    // Very friendly
    actions.push({ item: "chat", weight: 10 });
    actions.push({ item: "compliment", weight: 5 });
    
    if (actor.hasTrait?.("gossipy") && actor.memory?.getShareableRumors?.()?.length) {
      actions.push({ item: "share_rumor", weight: 12 });
    }
    
    if (factionValues.includes("wealth") && actor.inventory?.length && target.inventory?.length) {
      actions.push({ item: "trade", weight: 8 });
    }
    
    if (actor.hasTrait?.("generous") && actor.inventory?.length) {
      actions.push({ item: "gift", weight: 5 });
    }
    
  } else if (rel.value > -20) {
    // Neutral to slightly negative
    actions.push({ item: "chat", weight: 10 });
    
    if (actor.hasTrait?.("gossipy") && actor.memory?.getShareableRumors?.()?.length) {
      actions.push({ item: "share_rumor", weight: 6 });
    }
    
    if (factionValues.includes("wealth") && actor.inventory?.length && target.inventory?.length) {
      actions.push({ item: "trade", weight: 5 });
    }
    
    // May try to improve relationship
    if (Math.random() < 0.3) {
      actions.push({ item: "compliment", weight: 3 });
    }
    
  } else {
    // Hostile
    if (actor.hasTrait?.("aggressive")) {
      actions.push({ item: "insult", weight: 10 });
      actions.push({ item: "threaten", weight: 15 });
    } else {
      actions.push({ item: "insult", weight: 6 });
      if (rel.value < -40) {
        actions.push({ item: "threaten", weight: 5 });
      }
    }
    
    // Peaceful NPCs might still try to mend
    if (actor.hasTrait?.("peaceful") && Math.random() < 0.2) {
      actions.push({ item: "chat", weight: 5 });
    }
  }
  
  // Default to chat if no other actions
  if (!actions.length) {
    actions.push({ item: "chat", weight: 10 });
  }
  
  return weightedPick(actions);
}

// Propagate reputation changes through faction network
export function propagateReputation(state, entityId, factionId, change, reason) {
  const faction = Factions[factionId];
  if (!faction) return;
  
  // Apply direct reputation change
  const newStanding = RelationshipSystem.modifyFactionStanding(
    entityId,
    factionId,
    change
  );
  
  // IMPORTANT: Also update state.factionReputation to keep both systems in sync
  if (entityId === 'player' && state.factionReputation) {
    state.factionReputation[factionId] = (state.factionReputation[factionId] || 0) + change;
    console.log(`📊 [REPUTATION] Synced state.factionReputation[${factionId}] = ${state.factionReputation[factionId]}`);
  }
  
  // Propagate to allied/enemy factions
  for (const [otherFaction, relation] of Object.entries(faction.relations)) {
    const propagated = change * (relation / 200); // Dampened by relation strength
    
    if (Math.abs(propagated) > 0.5) {
      RelationshipSystem.modifyFactionStanding(
        entityId,
        otherFaction,
        propagated
      );
      
      // Also update state.factionReputation for allied/enemy factions
      if (entityId === 'player' && state.factionReputation) {
        state.factionReputation[otherFaction] = (state.factionReputation[otherFaction] || 0) + propagated;
      }
    }
  }
  
  // Update personal relationships with faction members
  if (state.npcs) {
    for (const npc of state.npcs) {
      if (npc?.faction === factionId) {
        // Find the entity
        const entity = entityId === 'player' ? state.player :
                      state.npcs.find(n => n.id === entityId);
        
        if (entity) {
          RelationshipSystem.modifyRelation(npc, entity, {
            value: change * 0.3,
            reason: `faction_${reason || "change"}`
          });
        }
      }
    }
  }
  
  // Log faction change
  if (state?.log) {
    const factionName = factionId.charAt(0).toUpperCase() + factionId.slice(1);
    const changeStr = change > 0 ? `+${change}` : `${change}`;
    state.log(`${factionName} reputation: ${changeStr} (now ${newStanding})`, change > 0 ? "good" : "bad");
  }
}