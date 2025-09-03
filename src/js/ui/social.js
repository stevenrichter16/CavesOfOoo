// src/js/ui/social.js - Social interaction UI

import { emit, on } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { getAvailableInteractions, runPlayerNPCInteraction } from '../social/index.js';
import { RelationshipSystem } from '../social/relationship.js';
import { openDialogueTree } from './dialogueTree.js';

// Create social interaction menu
export function openNPCInteraction(state, npc) {
  // Check if NPC has a dialogue tree (nobles, guards, merchants, peasants in Candy Kingdom)
  const hasDialogueTree = (npc.faction && 
    ['nobles', 'guards', 'merchants', 'peasants'].includes(npc.faction)) ||
    npc.dialogueType;
  
  if (hasDialogueTree) {
    // Use dialogue tree system
    openDialogueTree(state, npc);
    return;
  }
  
  // Otherwise use simple social menu
  state.ui.socialMenuOpen = true;
  state.ui.selectedNPCId = npc.id;
  state.ui.socialActionIndex = 0;
  
  // Get available actions
  const actions = getAvailableInteractions(state.player, npc);
  state.ui.availableActions = actions;
  
  renderSocialMenu(state, npc);
}

// Close social menu
export function closeSocialMenu(state) {
  state.ui.socialMenuOpen = false;
  state.ui.selectedNPCId = null;
  state.ui.socialActionIndex = 0;
  state.ui.availableActions = null;
  
  // Clear UI
  const menu = document.getElementById('social-menu');
  if (menu) {
    menu.style.display = 'none';
  }
  
  state.render();
}

// Render social interaction menu
export function renderSocialMenu(state, npc) {
  // Get or create menu container
  let menu = document.getElementById('social-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'social-menu';
    menu.className = 'ui-panel';
    menu.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg, #222);
      border: 2px solid var(--primary, #4af);
      padding: 20px;
      z-index: 1000;
      min-width: 300px;
      color: var(--fg, #fff);
      font-family: monospace;
    `;
    document.body.appendChild(menu);
  }
  
  // Get relationship info
  const rel = RelationshipSystem.getRelation(state.player, npc);
  const attitude = RelationshipSystem.getOverallAttitude(state.player, npc);
  
  // Build menu HTML
  let html = `<h3>Interacting with ${npc.name}</h3>`;
  
  // Show faction and traits
  if (npc.faction) {
    html += `<div style="color: #888">Faction: ${npc.faction}</div>`;
  }
  if (npc.traits?.length) {
    html += `<div style="color: #888">Traits: ${npc.traits.join(', ')}</div>`;
  }
  
  // Show relationship status
  html += `<div style="margin: 10px 0; color: ${getAttitudeColor(attitude)}">`;
  html += `Relationship: ${getAttitudeText(attitude)} (${Math.floor(attitude)})`;
  html += `</div>`;
  
  // Show available actions
  html += `<div style="margin: 15px 0">`;
  html += `<div style="color: #aaa; margin-bottom: 5px">Actions:</div>`;
  
  const actions = state.ui.availableActions || [];
  if (actions.length === 0) {
    html += `<div style="color: #666">No actions available</div>`;
  } else {
    actions.forEach((action, index) => {
      const selected = index === state.ui.socialActionIndex;
      const color = action.available ? (selected ? '#ff0' : '#fff') : '#666';
      const prefix = selected ? '> ' : '  ';
      
      html += `<div style="color: ${color}">`;
      html += `${prefix}[${index + 1}] ${action.label}`;
      if (!action.available && action.reason) {
        html += ` (${action.reason})`;
      }
      html += `</div>`;
    });
  }
  html += `</div>`;
  
  // Instructions
  html += `<div style="margin-top: 15px; color: #888; font-size: 0.9em">`;
  html += `Use number keys or arrows to select, Enter to perform, ESC to cancel`;
  html += `</div>`;
  
  menu.innerHTML = html;
  menu.style.display = 'block';
}

// Handle social menu input
export function handleSocialInput(state, key) {
  if (!state.ui.socialMenuOpen) return false;
  
  const actions = state.ui.availableActions || [];
  const npc = state.npcs.find(n => n.id === state.ui.selectedNPCId);
  
  if (!npc) {
    closeSocialMenu(state);
    return true;
  }
  
  switch(key) {
    case 'Escape':
      closeSocialMenu(state);
      return true;
      
    case 'ArrowUp':
      if (state.ui.socialActionIndex > 0) {
        state.ui.socialActionIndex--;
        renderSocialMenu(state, npc);
      }
      return true;
      
    case 'ArrowDown':
      if (state.ui.socialActionIndex < actions.length - 1) {
        state.ui.socialActionIndex++;
        renderSocialMenu(state, npc);
      }
      return true;
      
    case 'Enter':
      const selectedAction = actions[state.ui.socialActionIndex];
      if (selectedAction && selectedAction.available) {
        // Execute the social action
        const result = runPlayerNPCInteraction(
          state,
          state.player,
          npc,
          selectedAction.type
        );
        
        if (result.success) {
          // Log the interaction
          if (state.log) {
            state.log(`You ${selectedAction.label.toLowerCase()} ${npc.name}.`, "note");
            if (result.dialogue) {
              state.log(`${npc.name}: "${result.dialogue}"`, "dialogue");
            }
          }
          
          // Close menu after successful action
          closeSocialMenu(state);
        } else {
          // Show error
          if (state.log) {
            state.log(result.message || "Action failed", "bad");
          }
        }
      }
      return true;
      
    default:
      // Number key selection
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1 && num <= actions.length) {
        state.ui.socialActionIndex = num - 1;
        renderSocialMenu(state, npc);
        return true;
      }
  }
  
  return false;
}

// Helper to get attitude color
function getAttitudeColor(attitude) {
  if (attitude < -50) return '#f44'; // Hostile - red
  if (attitude < -20) return '#fa4'; // Unfriendly - orange
  if (attitude < 20) return '#aaa';  // Neutral - gray
  if (attitude < 50) return '#4f4';  // Friendly - green
  return '#4ff';                     // Devoted - cyan
}

// Helper to get attitude text
function getAttitudeText(attitude) {
  if (attitude < -50) return 'Hostile';
  if (attitude < -20) return 'Unfriendly';
  if (attitude < 20) return 'Neutral';
  if (attitude < 50) return 'Friendly';
  return 'Devoted';
}

// Listen for dialogue events to log them
on(EventType.DialogueLine, ({ speakerName, text }) => {
  // This will be picked up by the log system
  emit(EventType.Log, {
    text: `${speakerName}: "${text}"`,
    cls: 'dialogue'
  });
});

// Listen for social action events
on(EventType.SocialActionPerformed, ({ actorName, targetName, action }) => {
  // Log social actions for visibility
  const actionText = action.replace(/_/g, ' ');
  emit(EventType.Log, {
    text: `${actorName || 'Someone'} ${actionText}s ${targetName || 'someone'}.`,
    cls: 'note'
  });
});