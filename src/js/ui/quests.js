// ui/quests.js - Quest UI module
import { on, emit } from '../events.js';
import { EventType } from '../eventTypes.js';
import { esc } from '../utils.js';
import { QUEST_TEMPLATES } from '../config.js';

// Quest UI state
let questState = {
  isOpen: false,
  selectedIndex: 0,
  mode: 'list' // 'list', 'turnin', 'offer'
};

// Event types for quests
export const QuestEvents = {
  OpenQuestList: 'openQuestList',
  CloseQuestList: 'closeQuestList',
  QuestOffered: 'questOffered',
  QuestAccepted: 'questAccepted',
  QuestTurnInOpened: 'questTurnInOpened',
  QuestTurnedIn: 'questTurnedIn'
};

/**
 * Initialize quest UI and event listeners
 */
export function initQuestUI() {
  // Listen for quest events
  on(QuestEvents.OpenQuestList, ({ state }) => {
    openQuestList(state);
  });
  
  on(QuestEvents.CloseQuestList, () => {
    closeQuestList();
  });
  
  on(QuestEvents.QuestOffered, ({ quest, vendor, state }) => {
    // Handle quest offer from vendor
    emit(EventType.Log, { 
      text: `${vendor.name || 'Vendor'} offers: ${quest.name}`, 
      cls: 'quest' 
    });
  });
  
  on(QuestEvents.QuestAccepted, ({ quest, state }) => {
    emit(EventType.Log, { 
      text: `Quest accepted: ${quest.name}`, 
      cls: 'good' 
    });
  });
  
  on(QuestEvents.QuestTurnInOpened, ({ vendor, quests, state }) => {
    // Open quest turn-in UI
    questState.isOpen = true;
    questState.mode = 'turnin';
    questState.vendor = vendor;
    questState.questsToTurnIn = quests;
    questState.selectedIndex = 0;
    renderQuestUI(state);
  });
  
  on(QuestEvents.QuestTurnedIn, ({ quest, rewards, state }) => {
    emit(EventType.Log, { 
      text: `Quest completed: ${quest.name}! Gained ${rewards.gold}g and ${rewards.xp} XP`, 
      cls: 'good' 
    });
  });
}

/**
 * Open quest list UI
 */
export function openQuestList(state) {
  questState.isOpen = true;
  questState.mode = 'list';
  questState.selectedIndex = 0;
  renderQuestUI(state);
}

/**
 * Close quest list UI
 */
export function closeQuestList() {
  questState.isOpen = false;
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Render quest UI based on current mode
 */
export function renderQuestUI(state) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlayContent');
  const title = document.getElementById('overlayTitle');
  const hint = document.getElementById('overlayHint');
  
  if (!overlay || !content) return;
  
  overlay.style.display = 'flex';
  
  if (questState.mode === 'list') {
    title.textContent = '📜 Active Quests';
    content.innerHTML = renderActiveQuests(state);
    hint.textContent = 'Esc to close';
  } else if (questState.mode === 'turnin') {
    title.textContent = '📜 Quest Turn-In';
    content.innerHTML = renderQuestTurnIn(state);
    hint.textContent = '↑↓ Navigate • Enter to turn in • Esc to cancel';
  }
}

/**
 * Render active quests list
 */
function renderActiveQuests(state) {
  const activeQuests = state.player.quests.active || [];
  
  if (activeQuests.length === 0) {
    return '<div style="color: var(--dim); text-align: center; padding: 20px;">No active quests</div>';
  }
  
  let html = '<div class="quest-list">';
  
  activeQuests.forEach(questId => {
    const quest = QUEST_TEMPLATES[questId] || state.player.quests.fetchQuests?.[questId];
    if (!quest) return;
    
    const progress = state.player.quests.progress[questId] || 0;
    const isComplete = progress >= (quest.targetCount || 1);
    
    html += `
      <div class="quest-item" style="padding: 10px; margin: 5px 0; border: 1px solid var(--dim);">
        <div style="color: ${isComplete ? 'var(--ok)' : 'var(--accent)'};">
          ${isComplete ? '✓' : '○'} ${quest.name}
        </div>
        <div style="color: var(--dim); font-size: 0.9em;">${quest.description}</div>
        ${quest.targetCount ? `
          <div style="color: var(--fg); margin-top: 5px;">
            Progress: ${progress}/${quest.targetCount}
          </div>
        ` : ''}
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Render quest turn-in UI
 */
function renderQuestTurnIn(state) {
  const quests = questState.questsToTurnIn || [];
  
  if (quests.length === 0) {
    return '<div style="color: var(--dim); text-align: center; padding: 20px;">No quests to turn in</div>';
  }
  
  let html = '<div class="quest-list">';
  
  quests.forEach((questId, idx) => {
    const quest = QUEST_TEMPLATES[questId] || state.player.quests.fetchQuests?.[questId];
    if (!quest) return;
    
    const selected = idx === questState.selectedIndex;
    
    html += `
      <div class="quest-item ${selected ? 'selected' : ''}" style="padding: 10px; margin: 5px 0; border: 1px solid ${selected ? 'var(--accent)' : 'var(--dim)'};">
        <div style="color: var(--accent);">📜 ${quest.name}</div>
        <div style="color: var(--dim); font-size: 0.9em;">${quest.description}</div>
        <div style="color: var(--gold); margin-top: 5px;">
          Reward: ${quest.goldReward || 0}g, ${quest.xpReward || 0} XP
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Check if quest UI is open
 */
export function isQuestUIOpen() {
  return questState.isOpen;
}

/**
 * Get quest UI state
 */
export function getQuestState() {
  return questState;
}