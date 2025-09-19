/**
 * GenericObjectiveHandler - Handles event-based quest objective evaluation
 * Listens to game events and automatically updates quest objectives when conditions are met
 */
export class GenericObjectiveHandler {
  constructor(questService, questEvents) {
    this.questService = questService;
    this.questEvents = questEvents;
    this.activeObjectives = new Map(); // Map of "questId.objectiveId" -> objective data
    this.eventListeners = new Map(); // Map of eventType -> Set of objective keys
  }

  /**
   * Register an objective to be monitored
   * @param {Object} quest - The quest object
   * @param {Object} objective - The objective to monitor
   */
  register(quest, objective) {
    const key = `${quest.id}.${objective.id}`;
    console.log(`[OBJECTIVE_HANDLER] Registering objective: ${key}`, objective);
    
    // Store objective data
    this.activeObjectives.set(key, {
      questId: quest.id,
      objective: objective,
      conditions: objective.conditions, // Store conditions separately for easy access
      listeners: []
    });

    // Register event listeners if conditions exist
    if (objective.conditions && objective.conditions.events) {
      const events = Array.isArray(objective.conditions.events) 
        ? objective.conditions.events 
        : [objective.conditions.events];

      console.log(`[OBJECTIVE_HANDLER] Objective ${key} will listen for events:`, events);

      events.forEach(eventType => {
        // Track which objectives are listening to which events
        if (!this.eventListeners.has(eventType)) {
          this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(key);

        // Create handler for this objective
        const handler = (eventData) => this.handleEvent(eventType, eventData);
        
        console.log(`[OBJECTIVE_HANDLER] Subscribing to event: ${eventType} for objective: ${key}`);
        // Subscribe to the event
        const unsubscribe = this.questEvents.on(eventType, handler);
        
        // Store the listener info for cleanup
        const objectiveData = this.activeObjectives.get(key);
        objectiveData.listeners.push({ eventType, handler, unsubscribe });
      });
      
      console.log(`[OBJECTIVE_HANDLER] Objective ${key} registered successfully with ${events.length} event listener(s)`);
    } else {
      console.log(`[OBJECTIVE_HANDLER] Objective ${key} has no event conditions`);
    }
  }

  /**
   * Handle an event and check if any objectives should be updated
   * @param {string} eventType - The type of event that occurred
   * @param {*} eventData - Data associated with the event
   */
  handleEvent(eventType, eventData) {
    console.log(`[OBJECTIVE_HANDLER] handleEvent called for event: ${eventType}`, eventData);
    
    const objectiveKeys = this.eventListeners.get(eventType);
    if (!objectiveKeys) {
      console.log(`[OBJECTIVE_HANDLER] No objectives listening for event: ${eventType}`);
      return;
    }

    console.log(`[OBJECTIVE_HANDLER] Found ${objectiveKeys.size} objective(s) listening for event: ${eventType}`);

    objectiveKeys.forEach(key => {
      console.log(`[OBJECTIVE_HANDLER] Checking objective: ${key}`);
      const objectiveData = this.activeObjectives.get(key);
      if (!objectiveData) {
        console.log(`[OBJECTIVE_HANDLER] WARNING: Objective data not found for key: ${key}`);
        return;
      }

      const { questId, objective } = objectiveData;

      // Evaluate if this event matches the objective's conditions
      console.log(`[OBJECTIVE_HANDLER] Evaluating conditions for objective: ${key}`);
      if (this.evaluateConditions(objective.conditions, eventType, eventData)) {
        console.log(`[OBJECTIVE_HANDLER] Conditions matched! Updating objective: ${key}`);
        // Determine update type
        let update = {};
        
        if (objective.count !== undefined && objective.count > 1) {
          // Countable objective - increment progress
          update.increment = true;
        } else {
          // Simple objective (count = 1) - mark as completed and set progress
          update.completed = true;
          update.progress = 1;  // Set progress to 1 for single-completion objectives
          
          // Remove from active objectives if completed (non-countable)
          this.unregisterObjectiveInternal(key);
        }

        // Update the objective through the quest service
        console.log(`[OBJECTIVE_HANDLER] Calling questService.updateObjective for quest: ${questId}, objective: ${objective.id}`, update);
        this.questService.updateObjective(questId, objective.id, update);
      } else {
        console.log(`[OBJECTIVE_HANDLER] Conditions did not match for objective: ${key}`);
      }
    });
    
    console.log(`[OBJECTIVE_HANDLER] Finished processing event: ${eventType}`);
  }

  /**
   * Evaluate if event data matches objective conditions
   * @param {Object} conditions - The conditions to evaluate
   * @param {string} eventType - The type of event that occurred
   * @param {*} eventData - Data from the event
   * @returns {boolean} True if conditions are met
   */
  evaluateConditions(conditions, eventType, eventData) {
    // No conditions means always match
    if (!conditions) {
      return true;
    }

    // Check if event type matches
    if (conditions.events) {
      const events = Array.isArray(conditions.events) 
        ? conditions.events 
        : [conditions.events];
      
      if (!events.includes(eventType)) {
        return false;
      }
    }

    // Check match conditions
    if (conditions.match) {
      for (const [key, value] of Object.entries(conditions.match)) {
        // Support nested property access with dot notation
        const actualValue = this.getNestedProperty(eventData, key);
        if (actualValue !== value) {
          return false;
        }
      }
    }

    // Check custom evaluator function
    if (conditions.evaluator && typeof conditions.evaluator === 'function') {
      return conditions.evaluator(eventData);
    }

    return true;
  }

  /**
   * Get nested property from an object using dot notation
   * @param {Object} obj - The object to get property from
   * @param {string} path - The property path (e.g., "player.level")
   * @returns {*} The property value
   */
  getNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Unregister an objective from monitoring
   * @param {string} questId - The quest ID
   * @param {string} objectiveId - The objective ID
   */
  unregister(questId, objectiveId) {
    const key = `${questId}.${objectiveId}`;
    this.unregisterObjectiveInternal(key);
  }

  /**
   * Internal method to unregister an objective
   * @param {string} key - The objective key
   */
  unregisterObjectiveInternal(key) {
    const objectiveData = this.activeObjectives.get(key);
    if (!objectiveData) return;

    // Unsubscribe from all events
    objectiveData.listeners.forEach(({ eventType, unsubscribe }) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      
      // Remove from event listeners map
      const objectives = this.eventListeners.get(eventType);
      if (objectives) {
        objectives.delete(key);
        if (objectives.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    });

    // Remove from active objectives
    this.activeObjectives.delete(key);
  }

  /**
   * Unregister all objectives for a quest
   * @param {string} questId - The quest ID
   */
  unregisterQuest(questId) {
    const keysToRemove = [];
    
    for (const key of this.activeObjectives.keys()) {
      if (key.startsWith(`${questId}.`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.unregisterObjectiveInternal(key));
  }

  /**
   * Clear all registered objectives
   */
  clear() {
    // Unregister all objectives
    const keys = Array.from(this.activeObjectives.keys());
    keys.forEach(key => this.unregisterObjectiveInternal(key));
    
    // Clear maps
    this.activeObjectives.clear();
    this.eventListeners.clear();
  }
}