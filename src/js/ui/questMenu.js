// Quest Menu UI Component
// Displays active quests organized by priority (MAIN/SIDE)

import { QuestManager } from '../world/quests/QuestManager.js';

/**
 * Open the quest menu to display active quests
 * @param {Object} state - Game state
 */
export function openQuestMenu(state) {
  console.log('[QUEST_MENU] Opening quest menu');
  
  // Set UI state
  state.ui = state.ui || {};
  state.ui.questMenuOpen = true;
  
  // Render the menu
  renderQuestMenu(state);
}

/**
 * Close the quest menu
 * @param {Object} state - Game state
 */
export function closeQuestMenu(state) {
  console.log('[QUEST_MENU] Closing quest menu');
  
  state.ui.questMenuOpen = false;
  
  // Hide overlay
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  
  // Re-render the main game
  if (state.render && typeof state.render === 'function') {
    state.render();
  }
}

/**
 * Render the quest menu
 * @param {Object} state - Game state
 */
export function renderQuestMenu(state) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlayContent');
  const titleEl = document.getElementById('overlayTitle');
  const hintEl = document.getElementById('overlayHint');
  
  if (!overlay || !content) {
    console.error('[QUEST_MENU] Overlay elements not found');
    return;
  }
  
  // Show overlay
  overlay.style.display = 'flex';
  
  // Set title
  titleEl.innerHTML = '📜 ACTIVE QUESTS';
  hintEl.textContent = 'Press Q or Escape to close';
  
  // Get all quests in progress (including completed but not turned in)
  const questsInProgress = QuestManager.getQuestsInProgress();
  console.log(`[QUEST_MENU] Found ${questsInProgress.length} quest(s) in progress`);
  
  // Clear content
  content.innerHTML = '';
  
  // Create container with scrolling if needed
  const container = document.createElement('div');
  container.className = 'quest-menu-container';
  container.style.cssText = `
    max-height: 500px;
    overflow-y: auto;
    padding: 10px;
    font-family: monospace;
  `;
  
  if (!questsInProgress || questsInProgress.length === 0) {
    // No quests in progress
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = `
      color: var(--dim);
      text-align: center;
      padding: 40px;
      font-size: 14px;
    `;
    emptyMsg.textContent = 'No active quests';
    container.appendChild(emptyMsg);
  } else {
    // Separate quests by priority
    const mainQuests = questsInProgress.filter(q => 
      q.priority === 'MAIN' || q.priority === 'TUTORIAL'
    );
    const sideQuests = questsInProgress.filter(q => 
      !q.priority || q.priority === 'SIDE' || q.priority === 'OPTIONAL'
    );
    
    // Render MAIN quests
    if (mainQuests.length > 0) {
      const mainSection = createQuestSection('MAIN QUESTS', mainQuests, '#FFD700');
      container.appendChild(mainSection);
    }
    
    // Add spacing between sections if both exist
    if (mainQuests.length > 0 && sideQuests.length > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = '20px';
      container.appendChild(spacer);
    }
    
    // Render SIDE quests
    if (sideQuests.length > 0) {
      const sideSection = createQuestSection('SIDE QUESTS', sideQuests, '#B0B0B0');
      container.appendChild(sideSection);
    }
  }
  
  content.appendChild(container);
}

/**
 * Create a section for a group of quests
 * @param {string} title - Section title (MAIN/SIDE)
 * @param {Array} quests - Array of quest objects
 * @param {string} color - Color for the section header
 * @returns {HTMLElement} Section element
 */
function createQuestSection(title, quests, color) {
  const section = document.createElement('div');
  section.className = 'quest-section';
  section.style.cssText = 'margin-bottom: 10px;';
  
  // Section header
  const header = document.createElement('div');
  header.style.cssText = `
    color: ${color};
    font-size: 12px;
    margin-bottom: 15px;
    text-align: center;
    font-weight: bold;
    letter-spacing: 1px;
  `;
  header.innerHTML = `━━━ ${title} ━━━`;
  section.appendChild(header);
  
  // Add each quest
  quests.forEach((quest, index) => {
    const questEl = createQuestElement(quest);
    section.appendChild(questEl);
    
    // Add spacing between quests
    if (index < quests.length - 1) {
      const divider = document.createElement('div');
      divider.style.cssText = `
        margin: 15px 0;
        border-bottom: 1px solid #2c2f33;
        opacity: 0.3;
      `;
      section.appendChild(divider);
    }
  });
  
  return section;
}

/**
 * Create a display element for a single quest
 * @param {Object} quest - Quest object
 * @returns {HTMLElement} Quest element
 */
function createQuestElement(quest) {
  const questEl = document.createElement('div');
  questEl.className = 'quest-item';
  questEl.style.cssText = 'margin-bottom: 10px;';
  
  // Quest name (header) - show if ready to turn in
  const nameEl = document.createElement('div');
  nameEl.className = 'quest-name';
  nameEl.style.cssText = `
    color: var(--accent);
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
  `;
  
  // Add "Ready to turn in" indicator if quest is completed
  let nameText = quest.name || quest.id;
  if (quest.state === 'COMPLETED') {
    nameText += ' <span style="color: var(--good); font-size: 12px;">[Ready to turn in]</span>';
  }
  nameEl.innerHTML = nameText;
  questEl.appendChild(nameEl);
  
  // Quest description (smaller text)
  const descEl = document.createElement('div');
  descEl.className = 'quest-description';
  descEl.style.cssText = `
    color: var(--text);
    font-size: 12px;
    margin-bottom: 8px;
    line-height: 1.4;
    opacity: 0.9;
  `;
  descEl.textContent = quest.description || 'No description available';
  questEl.appendChild(descEl);
  
  // Objectives
  if (quest.objectives && quest.objectives.length > 0) {
    const objContainer = document.createElement('div');
    objContainer.className = 'quest-objectives';
    objContainer.style.cssText = 'margin-left: 10px; font-size: 11px;';
    
    quest.objectives.forEach(obj => {
      const objEl = createObjectiveElement(obj);
      objContainer.appendChild(objEl);
    });
    
    questEl.appendChild(objContainer);
  }
  
  return questEl;
}

/**
 * Create a display element for a quest objective
 * @param {Object} objective - Objective object
 * @returns {HTMLElement} Objective element
 */
function createObjectiveElement(objective) {
  const objEl = document.createElement('div');
  objEl.className = 'objective-item';
  objEl.style.cssText = 'margin: 3px 0; color: var(--dim);';
  
  // Determine icon and color based on completion
  let icon = '•';
  let color = 'var(--dim)';
  let progressText = '';
  
  if (objective.completed) {
    icon = '✓';
    color = 'var(--good)';
  } else if (objective.progress !== undefined && objective.count !== undefined) {
    // Show progress for countable objectives
    progressText = ` [${objective.progress}/${objective.count}]`;
    if (objective.progress > 0) {
      color = 'var(--text)'; // Partially complete is brighter
    }
  }
  
  objEl.innerHTML = `
    <span style="color: ${color}; margin-right: 5px;">${icon}</span>
    <span style="color: ${color};">
      ${objective.description || objective.id}${progressText}
    </span>
  `;
  
  return objEl;
}

/**
 * Handle keyboard input for quest menu
 * @param {Object} state - Game state
 * @param {string} key - Key pressed
 * @returns {boolean} Whether the input was handled
 */
export function handleQuestMenuInput(state, key) {
  if (!state.ui?.questMenuOpen) return false;
  
  if (key.toLowerCase() === 'q' || key === 'Escape') {
    closeQuestMenu(state);
    return true;
  }
  
  return false;
}