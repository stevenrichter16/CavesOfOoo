// ui/questTurnIn.js - Quest turn-in UI rendering
// Pure UI module for displaying quest completion interface

import { QUEST_TEMPLATES } from '../config.js';
import { checkFetchQuestItem } from '../quests.js';
import { esc } from '../utils.js';
import { on } from '../events.js';
import { getMatchingItemsForQuest, isItemEquipped } from '../systems/questTurnIn.js';

/**
 * Initialize quest turn-in UI event listeners
 */
export function initQuestTurnInUI() {
  // Listen for quest turn-in events
  on('questTurnIn:open', ({ vendor, completedQuests }) => {
    // UI will be rendered by explicit render calls
  });
  
  on('questTurnIn:update', ({ remainingQuests }) => {
    // Re-render the quest turn-in UI with updated quests
    if (window.STATE) {
      renderQuestTurnIn(window.STATE);
    }
  });
  
  on('questTurnIn:close', () => {
    closeQuestTurnInUI();
  });
}

/**
 * Close the quest turn-in overlay
 */
function closeQuestTurnInUI() {
  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

/**
 * Render the quest turn-in UI
 */
export function renderQuestTurnIn(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  const title = document.getElementById("overlayTitle");
  const hint = document.getElementById("overlayHint");
  
  if (!overlay || !content) return;
  
  overlay.style.display = "flex";
  
  // Check if we need to select an item for a fetch quest
  if (state.ui.selectingFetchItem) {
    renderItemSelection(state, content, title, hint);
    return;
  }
  
  // Quest selection menu
  if (state.ui.selectingQuest) {
    renderQuestSelection(state, content, title, hint);
    return;
  }
  
  // Default quest complete view
  renderQuestComplete(state, content, title, hint);
}

/**
 * Render item selection for fetch quest
 */
function renderItemSelection(state, content, title, hint) {
  title.textContent = "SELECT ITEM TO GIVE";
  
  const fetchQuest = state.player.quests.fetchQuests[state.ui.selectingFetchItem];
  const matchingItems = getMatchingItemsForQuest(state, state.ui.selectingFetchItem);
  
  let itemsHtml = '<div class="item-list">';
  matchingItems.forEach((item, idx) => {
    const isSelected = idx === state.ui.fetchItemSelectedIndex;
    const isEquipped = isItemEquipped(state, item);
    
    const typeSymbol = item.type === "potion" ? "!" : 
                       item.type === "weapon" ? "/" : 
                       item.type === "armor" ? "]" : "^";
    
    let statsText = "";
    if (item.type === "weapon") {
      statsText = ` [DMG: ${item.item.dmg}]`;
      if (item.item.effect) statsText += ` [${item.item.effect}]`;
    } else if (item.type === "armor") {
      statsText = ` [DEF: ${item.item.def}]`;
    } else if (item.type === "headgear") {
      const stats = [];
      if (item.item.def) stats.push(`DEF: ${item.item.def}`);
      if (item.item.str) stats.push(`STR: ${item.item.str}`);
      if (item.item.spd) stats.push(`SPD: ${item.item.spd}`);
      if (item.item.magic) stats.push(`MAG: ${item.item.magic}`);
      if (stats.length > 0) statsText = ` [${stats.join(", ")}]`;
    }
    
    itemsHtml += `
      <div class="item ${isSelected ? 'selected' : ''}" style="padding: 5px; ${isSelected ? 'border: 1px solid var(--accent);' : ''}">
        <div>${typeSymbol} ${esc(item.item.name)}${statsText} ${isEquipped ? '<span style="color: var(--ok)">[EQUIPPED]</span>' : ''}</div>
        ${item.item.desc ? `<div style="color: var(--dim); font-size: 0.9em;">${esc(item.item.desc)}</div>` : ''}
      </div>
    `;
  });
  itemsHtml += '</div>';
  
  content.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="color: var(--note);">The vendor needs: ${esc(fetchQuest.targetItem.name)}</div>
      <div style="color: var(--dim); margin-top: 10px;">Select which item to give:</div>
    </div>
    ${itemsHtml}
  `;
  
  hint.textContent = "[↑↓] Select • [Enter] Give Item • [Esc] Cancel";
}

/**
 * Render quest selection menu
 */
function renderQuestSelection(state, content, title, hint) {
  title.textContent = "SELECT QUEST TO TURN IN";
  
  const quests = state.ui.completedQuests.map((qId, idx) => {
    const isSelected = idx === state.ui.selectedQuestIndex;
    
    // Check if it's a fetch quest
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest) {
      const hasItem = checkFetchQuestItem(state.player, fetchQuest);
      return `
        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--dim)'}; border-radius: 4px; ${isSelected ? 'background: rgba(255, 255, 255, 0.05);' : ''}">
          <div style="color: var(--good); font-weight: bold;">✓ ${esc(fetchQuest.name)}</div>
          <div style="color: var(--dim); margin: 5px 0;">${esc(fetchQuest.objective)}</div>
          ${!hasItem ? '<div style="color: var(--danger);">⚠️ Missing required item!</div>' : ''}
          <div style="color: var(--accent);">
            Rewards: ${fetchQuest.rewards.gold} gold, ${fetchQuest.rewards.xp} XP
            ${fetchQuest.rewards.item ? `, ${esc(fetchQuest.rewards.item.item.name)}` : ''}
          </div>
        </div>
      `;
    } else {
      // Regular quest
      const quest = QUEST_TEMPLATES[qId];
      if (!quest) return ''; // Skip if quest doesn't exist
      return `
        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--dim)'}; border-radius: 4px; ${isSelected ? 'background: rgba(255, 255, 255, 0.05);' : ''}">
          <div style="color: var(--good); font-weight: bold;">✓ ${esc(quest.name)}</div>
          <div style="color: var(--dim); margin: 5px 0;">${esc(quest.objective)}</div>
          <div style="color: var(--accent);">
            Rewards: ${quest.rewards.gold} gold, ${quest.rewards.xp} XP
            ${quest.rewards.item ? `, ${esc(quest.rewards.item.item.name)}` : ''}
          </div>
        </div>
      `;
    }
  }).join('');
  
  content.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="color: var(--note);">You have multiple completed quests. Select which one to turn in:</div>
    </div>
    ${quests}
  `;
  
  hint.textContent = "[↑↓] Select • [Enter] Turn In Quest • [A] Turn In All • [Esc] Cancel";
}

/**
 * Render quest complete view
 */
function renderQuestComplete(state, content, title, hint) {
  title.textContent = "QUEST COMPLETE!";
  
  const quests = state.ui.completedQuests.map(qId => {
    // Check if it's a fetch quest
    const fetchQuest = state.player.quests.fetchQuests?.[qId];
    if (fetchQuest) {
      return `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--dim); border-radius: 4px;">
          <div style="color: var(--good); font-weight: bold;">✓ ${esc(fetchQuest.name)}</div>
          <div style="color: var(--dim); margin: 5px 0;">${esc(fetchQuest.objective)}</div>
          <div style="color: var(--accent);">
            Rewards: ${fetchQuest.rewards.gold} gold, ${fetchQuest.rewards.xp} XP
            ${fetchQuest.rewards.item ? `, ${esc(fetchQuest.rewards.item.item.name)}` : ''}
          </div>
        </div>
      `;
    } else {
      // Regular quest
      const quest = QUEST_TEMPLATES[qId];
      if (!quest) return ''; // Skip if quest doesn't exist
      return `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--dim); border-radius: 4px;">
          <div style="color: var(--good); font-weight: bold;">✓ ${esc(quest.name)}</div>
          <div style="color: var(--dim); margin: 5px 0;">${esc(quest.objective)}</div>
          <div style="color: var(--accent);">
            Rewards: ${quest.rewards.gold} gold, ${quest.rewards.xp} XP
            ${quest.rewards.item ? `, ${esc(quest.rewards.item.item.name)}` : ''}
          </div>
        </div>
      `;
    }
  }).join('');
  
  content.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="color: var(--xp); font-size: 1.2em;">The vendor is impressed!</div>
    </div>
    ${quests}
  `;
  
  hint.textContent = "Press Enter to claim rewards • Esc to skip to shop";
}

/**
 * Render confirmation dialog for giving equipped items
 */
export function renderQuestTurnInConfirm(state) {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlayContent");
  const title = document.getElementById("overlayTitle");
  const hint = document.getElementById("overlayHint");
  
  if (!overlay || !content) return;
  
  overlay.style.display = "flex";
  title.textContent = "⚠️ WARNING ⚠️";
  
  content.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <p style="color: var(--fg); margin-bottom: 20px;">You are about to give away an <span style="color: var(--ok)">EQUIPPED</span> item!</p>
      <p style="color: var(--accent); margin-bottom: 30px;">Are you sure you want to give it to the vendor?</p>
      <div style="display: flex; gap: 40px; justify-content: center; font-size: 18px;">
        <div style="padding: 10px 20px; border: 2px solid ${state.ui.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'}; border-radius: 4px; color: ${state.ui.confirmChoice === 'yes' ? 'var(--danger)' : 'var(--dim)'};">
          YES
        </div>
        <div style="padding: 10px 20px; border: 2px solid ${state.ui.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'}; border-radius: 4px; color: ${state.ui.confirmChoice === 'no' ? 'var(--ok)' : 'var(--dim)'};">
          NO
        </div>
      </div>
    </div>
  `;
  
  hint.textContent = "[←→] Select • [Enter] Confirm • [Esc] Cancel";
}