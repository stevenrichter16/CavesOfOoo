// src/js/ui/dialogueTree.js - UI for branching dialogue trees

import { 
  startDialogue, 
  getCurrentNode, 
  selectChoice, 
  endDialogue 
} from '../social/dialogueTreesV2.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

let currentDialogueUI = null;

/**
 * Open dialogue tree UI for an NPC
 */
export function openDialogueTree(state, npc) {
  // Start the dialogue
  const node = startDialogue(state, state.player, npc);
  if (!node) {
    // Fallback to simple social menu if no dialogue tree
    if (state.openNPCInteraction) {
      state.openNPCInteraction(state, npc);
    }
    return;
  }
  
  // Store UI state
  currentDialogueUI = {
    state,
    npc,
    selectedChoice: 0
  };
  
  // Set UI flags
  state.ui.dialogueTreeOpen = true;
  state.ui.socialMenuOpen = false; // Disable simple menu
  
  renderDialogueTree();
}

/**
 * Close dialogue tree UI
 */
export function closeDialogueTree(state) {
  endDialogue();
  currentDialogueUI = null;
  state.ui.dialogueTreeOpen = false;
  
  // Clear UI
  const container = document.getElementById('dialogue-tree');
  if (container) {
    container.style.display = 'none';
  }
  
  state.render();
}

/**
 * Render the dialogue tree UI
 */
export function renderDialogueTree() {
  if (!currentDialogueUI) return;
  
  const { state, npc } = currentDialogueUI;
  const node = getCurrentNode();
  
  if (!node) {
    closeDialogueTree(state);
    return;
  }
  
  // Get or create container
  let container = document.getElementById('dialogue-tree');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dialogue-tree';
    container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 600px;
      background: rgba(34, 34, 34, 0.95);
      border: 2px solid var(--primary, #4af);
      border-radius: 8px;
      padding: 20px;
      z-index: 1000;
      color: var(--fg, #fff);
      font-family: monospace;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(container);
  }
  
  // Build HTML
  let html = '';
  
  // NPC portrait and name
  html += `<div style="display: flex; align-items: center; margin-bottom: 15px;">`;
  html += `<div style="width: 60px; height: 60px; background: ${getNPCColor(npc)}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin-right: 15px;">`;
  html += getNPCGlyph(npc);
  html += `</div>`;
  html += `<div>`;
  html += `<div style="font-size: 18px; color: var(--primary, #4af); margin-bottom: 5px;">${npc.name}</div>`;
  if (npc.faction) {
    html += `<div style="font-size: 12px; color: #888;">${formatFaction(npc.faction)}</div>`;
  }
  html += `</div>`;
  html += `</div>`;
  
  // Dialogue line (handle multi-line arrays)
  html += `<div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 0, 0, 0.3); border-left: 3px solid ${getNPCColor(npc)}; line-height: 1.6;">`;
  if (Array.isArray(node.npcLine)) {
    // Multi-line dialogue
    node.npcLine.forEach((line, i) => {
      if (i > 0) html += '<br/>';
      html += `"${line}"`;
    });
  } else {
    html += `"${node.npcLine}"`;
  }
  html += `</div>`;
  
  // Player choices
  if (node.choices && node.choices.length > 0) {
    html += `<div style="margin-top: 15px;">`;
    html += `<div style="color: #888; font-size: 12px; margin-bottom: 10px;">Your response:</div>`;
    
    node.choices.forEach((choice, index) => {
      const selected = index === currentDialogueUI.selectedChoice;
      const bgColor = selected ? 'rgba(68, 170, 255, 0.2)' : 'transparent';
      const borderColor = selected ? 'var(--primary, #4af)' : 'transparent';
      const textColor = selected ? '#fff' : '#ccc';
      
      // Check if choice has special conditions
      const hasConditions = choice.conditions && choice.conditions.length > 0;
      const isConditional = hasConditions && choice.conditions.some(c => 
        c.relationAtLeast || c.hasItem || c.hasGold || c.flagTrue
      );
      
      html += `<div style="
        padding: 10px 15px;
        margin: 5px 0;
        background: ${bgColor};
        border-left: 3px solid ${borderColor};
        cursor: pointer;
        transition: all 0.2s;
        color: ${textColor};
        position: relative;
      " data-choice="${index}">`;
      
      if (selected) {
        html += `<span style="color: var(--primary, #4af);">▶ </span>`;
      } else {
        html += `<span style="opacity: 0;">▶ </span>`;
      }
      
      html += `[${index + 1}] ${choice.text}`;
      
      // Add indicator for conditional choices
      if (isConditional) {
        html += ` <span style="color: #ffcc00; font-size: 11px;">[Special]</span>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
  } else {
    // No choices, conversation ending
    html += `<div style="text-align: center; color: #888; font-style: italic;">`;
    html += `[Press any key to end conversation]`;
    html += `</div>`;
  }
  
  // Instructions
  html += `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444; color: #666; font-size: 12px; text-align: center;">`;
  html += `Use [↑/↓] or number keys to select • [Enter] to confirm • [ESC] to exit`;
  html += `</div>`;
  
  container.innerHTML = html;
  container.style.display = 'block';
  
  // Add click handlers for choices
  const choiceElements = container.querySelectorAll('[data-choice]');
  choiceElements.forEach(el => {
    el.addEventListener('click', () => {
      const index = parseInt(el.dataset.choice);
      currentDialogueUI.selectedChoice = index;
      handleDialogueChoice();
    });
    
    // Hover effect
    el.addEventListener('mouseenter', () => {
      const index = parseInt(el.dataset.choice);
      currentDialogueUI.selectedChoice = index;
      renderDialogueTree();
    });
  });
}

/**
 * Handle dialogue input
 */
export function handleDialogueInput(state, key) {
  if (!state.ui.dialogueTreeOpen || !currentDialogueUI) return false;
  
  const node = getCurrentNode();
  
  // If no choices, any key ends conversation
  if (!node || !node.choices || node.choices.length === 0) {
    closeDialogueTree(state);
    return true;
  }
  
  switch(key) {
    case 'Escape':
      closeDialogueTree(state);
      return true;
      
    case 'ArrowUp':
      if (currentDialogueUI.selectedChoice > 0) {
        currentDialogueUI.selectedChoice--;
        renderDialogueTree();
      }
      return true;
      
    case 'ArrowDown':
      if (currentDialogueUI.selectedChoice < node.choices.length - 1) {
        currentDialogueUI.selectedChoice++;
        renderDialogueTree();
      }
      return true;
      
    case 'Enter':
      handleDialogueChoice();
      return true;
      
    default:
      // Number key selection
      const num = parseInt(key);
      if (!isNaN(num) && num >= 1 && num <= node.choices.length) {
        currentDialogueUI.selectedChoice = num - 1;
        handleDialogueChoice();
        return true;
      }
  }
  
  return false;
}

/**
 * Process selected dialogue choice
 */
function handleDialogueChoice() {
  if (!currentDialogueUI) return;
  
  const { state, npc } = currentDialogueUI;
  const choice = currentDialogueUI.selectedChoice;
  
  // Log the player's choice
  const node = getCurrentNode();
  if (node && node.choices && node.choices[choice]) {
    if (state.log) {
      state.log(`You: "${node.choices[choice].text}"`, 'dialogue');
    }
  }
  
  // Select the choice and get next node
  const nextNode = selectChoice(choice);
  
  if (!nextNode) {
    // Dialogue ended
    closeDialogueTree(state);
  } else {
    // Reset selection and render next node
    currentDialogueUI.selectedChoice = 0;
    renderDialogueTree();
    
    // Log the NPC's response
    if (state.log && nextNode.npcLine) {
      const line = Array.isArray(nextNode.npcLine) 
        ? nextNode.npcLine.join(' ') 
        : nextNode.npcLine;
      state.log(`${npc.name}: "${line}"`, 'dialogue');
    }
  }
}

/**
 * Get color for NPC based on faction
 */
function getNPCColor(npc) {
  if (npc.faction === 'merchants') return '#ffcc00';
  if (npc.faction === 'guards') return '#ffee00';
  if (npc.faction === 'bandits') return '#ff4444';
  if (npc.faction === 'nobles') return '#ff44ff';
  if (npc.faction === 'peasants') return '#888888';
  if (npc.faction === 'wildlings') return '#44ff44';
  if (npc.faction === 'royalty') return '#ff88ff';
  return '#8888ff';
}

/**
 * Get display glyph for NPC
 */
function getNPCGlyph(npc) {
  if (npc.faction === 'merchants') return '💰';
  if (npc.faction === 'guards') return '🍌';
  if (npc.faction === 'nobles') return '👑';
  if (npc.faction === 'peasants') return '🍬';
  if (npc.faction === 'royalty') return '🎩';
  return '@';
}

/**
 * Format faction name for display
 */
function formatFaction(faction) {
  return faction.charAt(0).toUpperCase() + faction.slice(1);
}