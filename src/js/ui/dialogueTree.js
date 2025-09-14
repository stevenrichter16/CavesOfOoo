// src/js/ui/dialogueTree.js - UI for branching dialogue trees

import { 
  startDialogue, 
  getCurrentNode, 
  selectChoice, 
  endDialogue 
} from '../../social/dialogue.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { getAvailableInteractions } from '../../social/migrationAdapter.js';
import { renderSocialMenu } from './social.js';

let currentDialogueUI = null;

/**
 * Open dialogue tree UI for an NPC
 */
export function openDialogueTree(state, npc) {
  console.log('🎭 [DIALOGUE-UI] Opening dialogue tree for:', npc.name, 'dialogueType:', npc.dialogueType);
  
  // Determine the biome based on the current chunk
  let biome = 'candy_kingdom'; // default
  if (state.chunk?.biome) {
    biome = state.chunk.biome;
  } else if (state.chunk?.isForest) {
    biome = 'forest';
  } else if (state.cx === 0 && state.cy === -2) {
    // The Forest location
    biome = 'forest';
  } else if (state.cx === 0 && state.cy === 0) {
    biome = 'candy_kingdom';
  }
  
  console.log('🎭 [DIALOGUE-UI] Using biome:', biome);
  
  // Start the dialogue with the correct biome
  const node = startDialogue(state, state.player, npc, biome);
  console.log('🎭 [DIALOGUE-UI] startDialogue returned:', node);
  
  if (!node) {
    console.warn('🎭 [DIALOGUE-UI] No dialogue node returned, falling back to social menu');
    // Fallback to simple social menu if no dialogue tree
    // Open social menu directly to avoid infinite loop
    state.ui.socialMenuOpen = true;
    state.ui.selectedNPCId = npc.id;
    state.ui.socialActionIndex = 0;
    
    // Get available actions
    const actions = getAvailableInteractions(state.player, npc);
    state.ui.availableActions = actions;
    
    // Render social menu
    renderSocialMenu(state, npc);
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
  
  // Close any open dropdown to prevent input conflicts
  import('../ui/dropdown.js').then(module => {
    if (module.isDropdownOpen()) {
      console.log('🎭 [DIALOGUE-UI] Closing dropdown before rendering dialogue');
      module.closeDropdown();
    }
    // Render dialogue tree after dropdown is closed
    renderDialogueTree();
  }).catch(err => {
    console.warn('🎭 [DIALOGUE-UI] Could not check dropdown state:', err);
    // Still render dialogue even if dropdown check fails
    renderDialogueTree();
  });
}

/**
 * Close dialogue tree UI
 */
export function closeDialogueTree(state) {
  console.log('🎭 [DIALOGUE-UI] Closing dialogue tree');
  
  endDialogue();
  currentDialogueUI = null;
  state.ui.dialogueTreeOpen = false;
  
  // Clear UI
  const container = document.getElementById('dialogue-tree');
  if (container) {
    container.style.display = 'none';
    // Remove container from DOM to ensure clean state
    container.remove();
  }
  
  // Close any dropdown that might be stuck open
  import('../ui/dropdown.js').then(module => {
    if (module.isDropdownOpen()) {
      console.log('🎭 [DIALOGUE-UI] Also closing dropdown that was stuck open');
      module.closeDropdown();
    }
  });
  
  // Clear any other UI state that might be stuck
  state.ui.socialMenuOpen = false;
  state.ui.selectedNPCId = null;
  
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
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg, #222);
      border: 2px solid var(--primary, #4af);
      padding: 20px;
      z-index: 1000;
      min-width: 400px;
      max-width: 600px;
      color: var(--fg, #fff);
      font-family: monospace;
      font-size: 14px;
    `;
    document.body.appendChild(container);
  }
  
  // Build HTML
  let html = '';
  
  // Simple NPC name header
  html += `<h3>${npc.name}</h3>`;
  
  // Show faction if present
  if (npc.faction) {
    html += `<div style="color: #888; font-size: 12px; margin-bottom: 10px;">Faction: ${formatFaction(npc.faction)}</div>`;
  }
  
  // Dialogue line (handle multi-line arrays)
  html += `<div style="margin-bottom: 20px; padding: 10px 0; border-bottom: 1px solid #444; line-height: 1.4;">`;
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
    html += `<div style="color: #888; font-size: 12px; margin-bottom: 8px;">Choose:</div>`;
    
    node.choices.forEach((choice, index) => {
      const selected = index === currentDialogueUI.selectedChoice;
      const textColor = selected ? 'var(--primary, #4af)' : '#ccc';
      
      html += `<div style="
        padding: 5px 0;
        margin: 2px 0;
        cursor: pointer;
        color: ${textColor};
      " data-choice="${index}">`;
      
      // Indent selected choice with arrow
      // Use &nbsp; for non-breaking spaces to ensure they render
      if (selected) {
        html += `&nbsp;&nbsp;&nbsp;&nbsp;> [${index + 1}] ${choice.text}`;
      } else {
        html += `[${index + 1}] ${choice.text}`;
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
  
  // Force the container to be visible and on top
  container.style.visibility = 'visible';
  container.style.opacity = '1';
  container.style.pointerEvents = 'auto';
  
  console.log('🎭 [DIALOGUE-UI] Container display set to:', container.style.display);
  
  // Add click handlers for choices - check if container is valid DOM element
  if (!container.querySelectorAll) {
    console.error('🎭 [DIALOGUE-UI] Container is not a valid DOM element:', container);
    return;
  }
  
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
      updateSelectedChoice(); // Use efficient update
    });
  });
}

/**
 * Update only the selected choice highlighting
 */
function updateSelectedChoice() {
  if (!currentDialogueUI) return;
  
  const container = document.getElementById('dialogue-tree');
  if (!container) return;
  
  // Find all choice elements
  const choiceElements = container.querySelectorAll('[data-choice]');
  if (!choiceElements || choiceElements.length === 0) return;
  
  // Get the current node to access choice text
  const node = getCurrentNode();
  if (!node || !node.choices) return;
  
  choiceElements.forEach((el, index) => {
    const selected = index === currentDialogueUI.selectedChoice;
    const choice = node.choices[index];
    
    if (selected) {
      el.style.color = 'var(--primary, #4af)';
      // Update text with indentation (4 spaces for more visibility)
      el.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;> [${index + 1}] ${choice.text}`;
    } else {
      el.style.color = '#ccc';
      // Update text without indentation
      el.innerHTML = `[${index + 1}] ${choice.text}`;
    }
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
        updateSelectedChoice(); // Only update selection, not full re-render
      }
      return true;
      
    case 'ArrowDown':
      if (currentDialogueUI.selectedChoice < node.choices.length - 1) {
        currentDialogueUI.selectedChoice++;
        updateSelectedChoice(); // Only update selection, not full re-render
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