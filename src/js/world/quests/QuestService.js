import { GenericObjectiveHandler } from './handlers/GenericObjectiveHandler.js';

/**
 * QuestService - Central service for managing quests
 * Handles quest lifecycle, objective tracking, and reward distribution
 */
export class QuestService {
  constructor(questEvents) {
    this.questEvents = questEvents;
    this.quests = new Map(); // Active quest instances
    this.questDefinitions = new Map(); // Registered quest definitions
    this.completedQuests = new Set(); // Track completed quest IDs
    this.objectiveHandler = new GenericObjectiveHandler(this, questEvents);
  }

  /**
   * Register a quest definition
   * @param {string} questId - Unique identifier for the quest
   * @param {Object} questDefinition - Quest definition object with create method
   */
  registerQuestDefinition(questId, questDefinition) {
    this.questDefinitions.set(questId, questDefinition);
  }

  /**
   * Start a new quest
   * @param {Object} state - Game state object
   * @param {string} questId - ID of the quest to start
   * @param {Object} params - Optional parameters for quest creation
   * @returns {boolean} Success status
   */
  startQuest(state, questId, params = {}) {
    console.log(`[QUEST_SERVICE] startQuest called for quest: ${questId}`);
    
    // Check if quest is already active
    if (this.quests.has(questId)) {
      console.log(`[QUEST_SERVICE] Quest ${questId} is already active`);
      return false;
    }

    // Check if quest definition exists
    const definition = this.questDefinitions.get(questId);
    if (!definition) {
      console.log(`[QUEST_SERVICE] Quest definition not found for: ${questId}`);
      return false;
    }

    // Create quest instance
    const quest = definition.create ? definition.create(params) : { ...definition };
    
    // Set initial state
    quest.id = questId;
    quest.state = quest.state || 'ACTIVE';
    quest.startedAt = Date.now();

    // Initialize objectives
    if (quest.objectives) {
      console.log(`[QUEST_SERVICE] Initializing ${quest.objectives.length} objective(s) for quest ${questId}`);
      quest.objectives.forEach(objective => {
        // Initialize progress if not set
        if (objective.count && objective.progress === undefined) {
          objective.progress = 0;
        }
        
        // Initialize completed flag
        if (objective.completed === undefined) {
          objective.completed = false;
        }

        // Register objective with handler for event-based objectives
        if (objective.type === 'EVENT_BASED' || objective.conditions) {
          console.log(`[QUEST_SERVICE] Registering event-based objective: ${objective.id} with handler`);
          this.objectiveHandler.register(quest, objective);
        }
      });
    }

    // Store quest
    this.quests.set(questId, quest);

    // Update player state
    if (state.player && state.player.quests) {
      if (!state.player.quests.active) {
        state.player.quests.active = [];
      }
      state.player.quests.active.push(questId);
    }

    // Emit quest started event
    this.questEvents.emit('QUEST_STARTED', {
      questId,
      quest
    });

    // Log quest start if logging is available
    if (state.log && quest.name) {
      state.log(`Quest Started: ${quest.name}`, 'quest');
    }

    return true;
  }

  /**
   * Update an objective's progress
   * @param {string} questId - Quest ID
   * @param {string} objectiveId - Objective ID
   * @param {Object} update - Update data (progress, completed, increment)
   */
  updateObjective(questId, objectiveId, update) {
    console.log(`[QUEST_SERVICE] ===== UPDATE OBJECTIVE =====`);
    console.log(`[QUEST_SERVICE] Quest: ${questId}`);
    console.log(`[QUEST_SERVICE] Objective: ${objectiveId}`);
    console.log(`[QUEST_SERVICE] Update:`, update);
    
    const quest = this.quests.get(questId);
    if (!quest || quest.state !== 'ACTIVE') {
      console.log(`[QUEST_SERVICE] ERROR: Quest ${questId} not found or not active. State: ${quest?.state}`);
      return;
    }

    const objective = quest.objectives?.find(o => o.id === objectiveId);
    if (!objective) {
      console.log(`[QUEST_SERVICE] ERROR: Objective ${objectiveId} not found in quest ${questId}`);
      return;
    }
    
    console.log(`[QUEST_SERVICE] Current objective state:`, { 
      id: objective.id,
      description: objective.description,
      progress: objective.progress, 
      completed: objective.completed,
      count: objective.count 
    });

    // Handle different update types
    if (update.increment) {
      // Increment progress for countable objectives
      objective.progress = (objective.progress || 0) + 1;
      
      // Check if objective is now complete
      if (objective.count && objective.progress >= objective.count) {
        objective.completed = true;
        objective.progress = objective.count; // Cap at max
      }
    } else if (update.progress !== undefined) {
      // Set progress directly
      objective.progress = update.progress;
      
      // Check if objective is complete
      if (objective.count) {
        objective.completed = objective.progress >= objective.count;
      }
    }

    // Handle completed flag
    if (update.completed !== undefined) {
      objective.completed = update.completed;
      console.log(`[QUEST_SERVICE] Set objective completed to: ${objective.completed}`);
    }

    console.log(`[QUEST_SERVICE] Updated objective state:`, { 
      progress: objective.progress, 
      completed: objective.completed 
    });

    // Emit objective update event
    this.questEvents.emit('OBJECTIVE_UPDATED', {
      questId,
      objectiveId,
      objective,
      update
    });

    // Check if objective was completed
    if (objective.completed && !update.wasCompleted) {
      console.log(`[QUEST_SERVICE] Objective ${objectiveId} completed!`);
      this.questEvents.emit('OBJECTIVE_COMPLETED', {
        questId,
        objectiveId,
        objective
      });

      // Check if all objectives are complete
      if (this.areAllObjectivesComplete(quest)) {
        console.log(`[QUEST_SERVICE] ✓ ALL OBJECTIVES COMPLETE for quest ${questId}`);
        quest.objectives.forEach(o => {
          console.log(`[QUEST_SERVICE]   ✓ ${o.id}: COMPLETE (progress: ${o.progress}/${o.count || 1})`);
        });
        this.markQuestAsCompleted(quest);
      } else {
        console.log(`[QUEST_SERVICE] Quest ${questId} still has incomplete objectives:`);
        quest.objectives.forEach(o => {
          const status = o.completed ? '✓ COMPLETE' : '✗ INCOMPLETE';
          console.log(`[QUEST_SERVICE]   ${status} - ${o.id} (progress: ${o.progress}/${o.count || 1})`);
        });
      }
    }
    
    console.log(`[QUEST_SERVICE] ===== END UPDATE OBJECTIVE =====`);
  }

  /**
   * Check if all objectives in a quest are complete
   * @param {Object} quest - The quest to check
   * @returns {boolean} True if all objectives are complete
   */
  areAllObjectivesComplete(quest) {
    if (!quest.objectives || quest.objectives.length === 0) {
      return true;
    }
    
    return quest.objectives.every(obj => obj.completed);
  }

  /**
   * Mark a quest as completed
   * @param {Object} quest - The quest to mark as completed
   */
  markQuestAsCompleted(quest) {
    console.log(`[QUEST_SERVICE] Marking quest ${quest.id} as COMPLETED`);
    quest.state = 'COMPLETED';
    quest.completedAt = Date.now();

    // Emit quest completed event
    console.log(`[QUEST_SERVICE] Emitting QUEST_READY_FOR_COMPLETION event for quest ${quest.id}`);
    this.questEvents.emit('QUEST_READY_FOR_COMPLETION', {
      questId: quest.id,
      quest
    });
  }

  /**
   * Complete a quest and apply rewards
   * @param {Object} state - Game state
   * @param {string} questId - Quest ID
   * @returns {Object} Rewards that were applied
   */
  completeQuest(state, questId) {
    const quest = this.quests.get(questId);
    if (!quest) {
      return null;
    }

    // Apply rewards
    const rewards = quest.rewards || {};
    
    if (rewards.gold && state.player) {
      state.player.gold = (state.player.gold || 0) + rewards.gold;
    }
    
    if (rewards.experience && state.player) {
      state.player.experience = (state.player.experience || 0) + rewards.experience;
    }
    
    if (rewards.items && state.player && state.player.inventory) {
      rewards.items.forEach(item => {
        state.player.inventory.push({ ...item });
      });
    }

    // Move from active to completed
    if (state.player && state.player.quests) {
      const activeIndex = state.player.quests.active?.indexOf(questId);
      if (activeIndex > -1) {
        state.player.quests.active.splice(activeIndex, 1);
      }
      
      if (!state.player.quests.completed) {
        state.player.quests.completed = [];
      }
      state.player.quests.completed.push(questId);
    }

    // Track completion
    this.completedQuests.add(questId);
    
    // Unregister objectives
    this.objectiveHandler.unregisterQuest(questId);

    // Remove from active quests
    this.quests.delete(questId);

    // Log completion
    if (state.log && quest.name) {
      state.log(`Quest Complete: ${quest.name}`, 'quest');
      
      if (rewards.gold) {
        state.log(`Received ${rewards.gold} gold`, 'quest');
      }
      if (rewards.experience) {
        state.log(`Gained ${rewards.experience} experience`, 'quest');
      }
      if (rewards.items && rewards.items.length > 0) {
        rewards.items.forEach(item => {
          state.log(`Received ${item.name}`, 'quest');
        });
      }
    }

    // Emit completion event
    this.questEvents.emit('QUEST_COMPLETED', {
      questId,
      quest,
      rewards
    });

    return rewards;
  }

  /**
   * Get a quest by ID
   * @param {string} questId - Quest ID
   * @returns {Object} Quest instance or null
   */
  getQuest(questId) {
    return this.quests.get(questId) || null;
  }

  /**
   * Get all active quests
   * @returns {Array} Array of active quest objects
   */
  getActiveQuests() {
    return Array.from(this.quests.values()).filter(q => q.state === 'ACTIVE');
  }

  /**
   * Check if a quest is completed
   * @param {string} questId - Quest ID
   * @returns {boolean} True if quest is completed
   */
  isQuestCompleted(questId) {
    return this.completedQuests.has(questId);
  }

  /**
   * Check if a quest is active
   * @param {string} questId - Quest ID
   * @returns {boolean} True if quest is active
   */
  isQuestActive(questId) {
    const quest = this.quests.get(questId);
    return !!(quest && quest.state === 'ACTIVE');
  }

  /**
   * Get quest progress info
   * @param {string} questId - Quest ID
   * @returns {Object} Progress information
   */
  getQuestProgress(questId) {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    const totalObjectives = quest.objectives?.length || 0;
    const completedObjectives = quest.objectives?.filter(o => o.completed).length || 0;
    
    return {
      questId,
      state: quest.state,
      totalObjectives,
      completedObjectives,
      percentComplete: totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0,
      objectives: quest.objectives?.map(o => ({
        id: o.id,
        description: o.description,
        completed: o.completed,
        progress: o.progress,
        count: o.count
      }))
    };
  }

  /**
   * Clear all quests and handlers
   */
  clear() {
    this.objectiveHandler.clear();
    this.quests.clear();
    this.completedQuests.clear();
  }
}