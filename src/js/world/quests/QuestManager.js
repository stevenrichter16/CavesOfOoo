import { QuestEventBus } from './QuestEventBus.js';
import { QuestService } from './QuestService.js';
import { openInventoryQuestDef } from './definitions/openInventoryQuest.js';
import { potThrowingQuestDef } from './definitions/potThrowingQuest.js';
import { killMonsterQuestDef } from './definitions/killMonsterQuest.js';

/**
 * QuestManager - Singleton that manages the quest system
 * Integrates QuestService with game systems
 */
class QuestManagerImpl {
  constructor() {
    this.initialized = false;
    this.questEvents = null;
    this.questService = null;
  }

  /**
   * Initialize the quest system
   * @param {Object} state - Game state object
   */
  initialize(state) {
    if (this.initialized) {
      console.log("[QUEST_MANAGER] Already initialized, skipping");
      return;
    }

    console.log("[QUEST_MANAGER] Initializing quest system...");

    // Create event bus and service
    this.questEvents = new QuestEventBus();
    this.questService = new QuestService(this.questEvents);
    console.log("[QUEST_MANAGER] Created QuestEventBus and QuestService");
    
    // Register quest definitions
    this.registerQuestDefinitions();
    
    // Set up game event integrations
    this.setupGameIntegrations(state);
    
    this.initialized = true;
    console.log("[QUEST_MANAGER] Quest system initialization complete");
  }

  /**
   * Register all quest definitions
   */
  registerQuestDefinitions() {
    // Register open inventory quest
    this.questService.registerQuestDefinition(
      openInventoryQuestDef.id,
      openInventoryQuestDef
    );
    
    // Register pot throwing practice quest
    this.questService.registerQuestDefinition(
      potThrowingQuestDef.id,
      potThrowingQuestDef
    );
    
    // Register kill monster quest
    this.questService.registerQuestDefinition(
      killMonsterQuestDef.id,
      killMonsterQuestDef
    );
    
    // Additional quests can be registered here
  }

  /**
   * Set up integrations with game systems
   * @param {Object} state - Game state
   */
  setupGameIntegrations(state) {
    // Listen for inventory open events
    this.setupInventoryIntegration();
    
    // Listen for combat events
    this.setupCombatIntegration();
    
    // Listen for dialogue events
    this.setupDialogueIntegration();
    
    // Listen for movement events
    this.setupMovementIntegration();
  }

  /**
   * Set up inventory system integration
   */
  setupInventoryIntegration() {
    // The inventory.js file now directly emits INVENTORY_OPENED event
    // No need for additional keypress listeners
  }

  /**
   * Set up combat system integration
   */
  setupCombatIntegration() {
    // This would hook into combat system to emit events like:
    // - ENTITY_KILLED
    // - COMBAT_WON
    // - DAMAGE_DEALT
    // etc.
  }

  /**
   * Set up dialogue system integration
   */
  setupDialogueIntegration() {
    // Hook into dialogue system for events like:
    // - DIALOGUE_STARTED
    // - DIALOGUE_CHOICE_MADE
    // - DIALOGUE_COMPLETED
  }

  /**
   * Set up movement system integration
   */
  setupMovementIntegration() {
    // Hook into movement for events like:
    // - LOCATION_ENTERED
    // - DISTANCE_TRAVELED
  }

  /**
   * Start a quest
   * @param {Object} state - Game state
   * @param {string} questId - Quest ID
   * @returns {boolean} Success status
   */
  startQuest(state, questId) {
    if (!this.initialized) {
      this.initialize(state);
    }
    
    const success = this.questService.startQuest(state, questId);
    
    // Call onStart callback if it exists
    if (success) {
      const questDef = this.questService.questDefinitions.get(questId);
      const quest = this.questService.getQuest(questId);
      
      if (questDef && questDef.onStart) {
        questDef.onStart(state, quest);
      }
    }
    
    return success;
  }

  /**
   * Complete a quest
   * @param {Object} state - Game state
   * @param {string} questId - Quest ID
   * @returns {Object} Rewards or null
   */
  completeQuest(state, questId) {
    const quest = this.questService.getQuest(questId);
    const questDef = this.questService.questDefinitions.get(questId);
    
    const rewards = this.questService.completeQuest(state, questId);
    
    // Call onComplete callback if it exists
    if (rewards && questDef && questDef.onComplete) {
      questDef.onComplete(state, quest, rewards);
    }
    
    return rewards;
  }

  /**
   * Check if a quest can be turned in
   * @param {string} questId - Quest ID
   * @returns {boolean} True if quest can be turned in
   */
  canTurnInQuest(questId) {
    if (!this.questService) return false;
    const quest = this.questService.getQuest(questId);
    return !!(quest && quest.state === 'COMPLETED');
  }

  /**
   * Get quest by ID
   * @param {string} questId - Quest ID
   * @returns {Object} Quest or null
   */
  getQuest(questId) {
    return this.questService.getQuest(questId);
  }

  /**
   * Get all active quests (only those with ACTIVE state)
   * @returns {Array} Active quests
   */
  getActiveQuests() {
    return this.questService.getActiveQuests();
  }

  /**
   * Get all quests in progress (ACTIVE or COMPLETED but not turned in)
   * @returns {Array} Quests in progress
   */
  getQuestsInProgress() {
    return this.questService.getQuestsInProgress();
  }

  /**
   * Check if quest is completed
   * @param {string} questId - Quest ID
   * @returns {boolean} True if completed
   */
  isQuestCompleted(questId) {
    return this.questService.isQuestCompleted(questId);
  }

  /**
   * Check if quest is active
   * @param {string} questId - Quest ID
   * @returns {boolean} True if active
   */
  isQuestActive(questId) {
    return this.questService.isQuestActive(questId);
  }

  /**
   * Emit a custom event
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   */
  emitEvent(eventType, data) {
    console.log(`[QUEST_MANAGER] emitEvent called with type: ${eventType}`, data);
    if (this.questEvents) {
      console.log(`[QUEST_MANAGER] QuestEventBus exists, emitting event: ${eventType}`);
      this.questEvents.emit(eventType, data);
    } else {
      console.log(`[QUEST_MANAGER] WARNING: QuestEventBus not initialized! Event ${eventType} not emitted`);
    }
  }

  /**
   * Update an objective manually
   * @param {string} questId - Quest ID
   * @param {string} objectiveId - Objective ID
   * @param {Object} update - Update data
   */
  updateObjective(questId, objectiveId, update) {
    if (this.questService) {
      this.questService.updateObjective(questId, objectiveId, update);
    }
  }
}

// Export singleton instance
export const QuestManager = new QuestManagerImpl();