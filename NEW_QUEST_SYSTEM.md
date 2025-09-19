# New Quest System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Quest Flow Example](#quest-flow-example)
5. [Creating Multi-Objective Quests](#creating-multi-objective-quests)
6. [Integration Points](#integration-points)

## System Overview

The new quest system is a modular, event-driven architecture that decouples quest logic from game systems. Instead of quests polling game state or game systems directly updating quests, the system uses an event bus where:

1. **Game systems emit events** when things happen (inventory opened, enemy killed, item collected)
2. **Quest objectives listen for events** that match their conditions
3. **Objectives automatically update** when their conditions are met
4. **Quests complete automatically** when all objectives are done

### Key Benefits
- **Decoupled**: Game systems don't need to know about quests
- **Extensible**: Easy to add new quest types and objectives
- **Testable**: Each component can be tested independently
- **Maintainable**: Clear separation of concerns

## Architecture

```
┌─────────────────────┐
│   Game Systems      │
│ (inventory, combat) │
└──────────┬──────────┘
           │ emit events
           ▼
┌─────────────────────┐
│   QuestManager      │ (Singleton facade)
│                     │
└──────────┬──────────┘
           │ delegates to
           ▼
┌─────────────────────┐
│   QuestEventBus     │ (Event pub/sub)
│                     │
└──────────┬──────────┘
           │ notifies
           ▼
┌─────────────────────┐
│ GenericObjectiveHandler │ (Event → Objective mapping)
│                     │
└──────────┬──────────┘
           │ updates
           ▼
┌─────────────────────┐
│   QuestService      │ (Quest lifecycle management)
│                     │
└─────────────────────┘
```

## File-by-File Breakdown

### 1. QuestEventBus.js
**Purpose**: Centralized event system for publishing/subscribing to quest-related events.

```javascript
export class QuestEventBus {
  constructor() {
    // Map of eventType -> Set of handler functions
    this.listeners = new Map();
  }

  // Register a handler for an event type
  on(eventType, handler) {
    // Create Set for this event type if doesn't exist
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    // Add handler to the Set
    this.listeners.get(eventType).add(handler);
    
    // Return unsubscribe function for cleanup
    return () => this.off(eventType, handler);
  }

  // Register a one-time handler
  once(eventType, handler) {
    // Wrap handler to auto-unsubscribe after first call
    const wrappedHandler = (data) => {
      handler(data);
      this.off(eventType, wrappedHandler);
    };
    
    this.on(eventType, wrappedHandler);
  }

  // Remove a specific handler
  off(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      return;
    }
    
    this.listeners.get(eventType).delete(handler);
    
    // Clean up empty Sets to prevent memory leaks
    if (this.listeners.get(eventType).size === 0) {
      this.listeners.delete(eventType);
    }
  }

  // Emit an event to all registered handlers
  emit(eventType, data) {
    if (!this.listeners.has(eventType)) {
      return; // No listeners for this event
    }
    
    // Copy handlers array to avoid issues if handlers modify the set
    const handlers = Array.from(this.listeners.get(eventType));
    
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });
  }

  // Clear all handlers for an event type
  clear(eventType) {
    this.listeners.delete(eventType);
  }

  // Clear all handlers for all events
  clearAll() {
    this.listeners.clear();
  }
}
```

### 2. QuestService.js
**Purpose**: Manages quest lifecycle (start, update, complete) and reward distribution.

```javascript
export class QuestService {
  constructor(questEvents) {
    this.questEvents = questEvents;                    // Reference to event bus
    this.quests = new Map();                          // questId -> quest instance
    this.questDefinitions = new Map();                // questId -> quest definition
    this.completedQuests = new Set();                 // Set of completed quest IDs
    this.objectiveHandler = new GenericObjectiveHandler(this, questEvents);
  }

  // Register a quest definition (template for creating quests)
  registerQuestDefinition(questId, questDefinition) {
    this.questDefinitions.set(questId, questDefinition);
  }

  // Start a new quest
  startQuest(state, questId, params = {}) {
    // Prevent duplicate active quests
    if (this.quests.has(questId)) {
      return false;
    }

    // Get quest definition
    const definition = this.questDefinitions.get(questId);
    if (!definition) {
      return false;
    }

    // Create quest instance from definition
    const quest = definition.create ? definition.create(params) : { ...definition };
    
    // Set quest metadata
    quest.id = questId;
    quest.state = quest.state || 'ACTIVE';
    quest.startedAt = Date.now();

    // Initialize objectives
    if (quest.objectives) {
      quest.objectives.forEach(objective => {
        // Set default progress for countable objectives
        if (objective.count && objective.progress === undefined) {
          objective.progress = 0;
        }
        
        // Set default completed state
        if (objective.completed === undefined) {
          objective.completed = false;
        }

        // Register event-based objectives with handler
        if (objective.type === 'EVENT_BASED' || objective.conditions) {
          this.objectiveHandler.register(quest, objective);
        }
      });
    }

    // Store quest instance
    this.quests.set(questId, quest);

    // Update player's active quest list
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

    return true;
  }

  // Update an objective's progress
  updateObjective(questId, objectiveId, update) {
    const quest = this.quests.get(questId);
    
    // Only update active quests
    if (!quest || quest.state !== 'ACTIVE') {
      return;
    }

    // Find the objective
    const objective = quest.objectives?.find(o => o.id === objectiveId);
    if (!objective) {
      return;
    }

    // Handle increment updates (for countable objectives)
    if (update.increment) {
      objective.progress = (objective.progress || 0) + 1;
      
      // Check if count reached
      if (objective.count && objective.progress >= objective.count) {
        objective.completed = true;
        objective.progress = objective.count; // Cap at max
      }
    } 
    // Handle direct progress updates
    else if (update.progress !== undefined) {
      objective.progress = update.progress;
      
      // Check completion for countable objectives
      if (objective.count) {
        objective.completed = objective.progress >= objective.count;
      }
    }

    // Handle direct completed flag updates
    if (update.completed !== undefined) {
      objective.completed = update.completed;
    }

    // Emit objective update event
    this.questEvents.emit('OBJECTIVE_UPDATED', {
      questId,
      objectiveId,
      objective,
      update
    });

    // Check if objective just completed
    if (objective.completed && !update.wasCompleted) {
      this.questEvents.emit('OBJECTIVE_COMPLETED', {
        questId,
        objectiveId,
        objective
      });

      // Check if all objectives complete
      if (this.areAllObjectivesComplete(quest)) {
        this.markQuestAsCompleted(quest);
      }
    }
  }

  // Check if all objectives are complete
  areAllObjectivesComplete(quest) {
    if (!quest.objectives || quest.objectives.length === 0) {
      return true;
    }
    
    return quest.objectives.every(obj => obj.completed);
  }

  // Mark quest as ready for turn-in
  markQuestAsCompleted(quest) {
    quest.state = 'COMPLETED';  // Can be turned in but rewards not given yet
    quest.completedAt = Date.now();

    this.questEvents.emit('QUEST_READY_FOR_COMPLETION', {
      questId: quest.id,
      quest
    });
  }

  // Complete quest and give rewards
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

    // Move quest from active to completed
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
    
    // Unregister objective handlers
    this.objectiveHandler.unregisterQuest(questId);

    // Remove from active quests
    this.quests.delete(questId);

    // Emit completion event
    this.questEvents.emit('QUEST_COMPLETED', {
      questId,
      quest,
      rewards
    });

    return rewards;
  }

  // Helper methods
  getQuest(questId) {
    return this.quests.get(questId) || null;
  }

  isQuestActive(questId) {
    const quest = this.quests.get(questId);
    return !!(quest && quest.state === 'ACTIVE');
  }

  isQuestCompleted(questId) {
    return this.completedQuests.has(questId);
  }
}
```

### 3. GenericObjectiveHandler.js
**Purpose**: Listens for game events and updates objectives when their conditions are met.

```javascript
export class GenericObjectiveHandler {
  constructor(questService, questEvents) {
    this.questService = questService;                 // Reference to quest service
    this.questEvents = questEvents;                   // Reference to event bus
    this.activeObjectives = new Map();                // "questId.objectiveId" -> objective data
    this.eventListeners = new Map();                  // eventType -> Set of objective keys
  }

  // Register an objective to monitor
  register(quest, objective) {
    const key = `${quest.id}.${objective.id}`;
    
    // Store objective data
    this.activeObjectives.set(key, {
      questId: quest.id,
      objective: objective,
      conditions: objective.conditions,
      listeners: []  // Track event subscriptions for cleanup
    });

    // Register event listeners if conditions exist
    if (objective.conditions && objective.conditions.events) {
      const events = Array.isArray(objective.conditions.events) 
        ? objective.conditions.events 
        : [objective.conditions.events];

      events.forEach(eventType => {
        // Track which objectives listen to which events
        if (!this.eventListeners.has(eventType)) {
          this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(key);

        // Create handler for this objective
        const handler = (eventData) => this.handleEvent(eventType, eventData);
        
        // Subscribe to the event
        const unsubscribe = this.questEvents.on(eventType, handler);
        
        // Store listener info for cleanup
        const objectiveData = this.activeObjectives.get(key);
        objectiveData.listeners.push({ eventType, handler, unsubscribe });
      });
    }
  }

  // Handle incoming events
  handleEvent(eventType, eventData) {
    // Get all objectives listening for this event
    const objectiveKeys = this.eventListeners.get(eventType);
    if (!objectiveKeys) return;

    objectiveKeys.forEach(key => {
      const objectiveData = this.activeObjectives.get(key);
      if (!objectiveData) return;

      const { questId, objective } = objectiveData;

      // Check if event matches objective conditions
      if (this.evaluateConditions(objective.conditions, eventType, eventData)) {
        let update = {};
        
        // Countable objectives increment progress
        if (objective.count !== undefined && objective.count > 1) {
          update.increment = true;
        } else {
          // Simple objectives just complete
          update.completed = true;
          
          // Remove from active monitoring (no longer needed)
          this.unregisterObjectiveInternal(key);
        }

        // Update objective through quest service
        this.questService.updateObjective(questId, objective.id, update);
      }
    });
  }

  // Evaluate if event matches objective conditions
  evaluateConditions(conditions, eventType, eventData) {
    // No conditions = always match
    if (!conditions) {
      return true;
    }

    // Check event type matches
    if (conditions.events) {
      const events = Array.isArray(conditions.events) 
        ? conditions.events 
        : [conditions.events];
      
      if (!events.includes(eventType)) {
        return false;
      }
    }

    // Check match conditions (exact property matches)
    if (conditions.match) {
      for (const [key, value] of Object.entries(conditions.match)) {
        // Support nested properties with dot notation
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

  // Get nested property from object (supports "player.level" notation)
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

  // Unregister objective from monitoring
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
}
```

### 4. QuestManager.js
**Purpose**: Singleton facade that provides a simple API for the quest system.

```javascript
class QuestManagerImpl {
  constructor() {
    this.initialized = false;
    this.questEvents = null;
    this.questService = null;
  }

  // Initialize the quest system
  initialize(state) {
    if (this.initialized) {
      return;
    }

    // Create core components
    this.questEvents = new QuestEventBus();
    this.questService = new QuestService(this.questEvents);
    
    // Register all quest definitions
    this.registerQuestDefinitions();
    
    // Set up game system integrations
    this.setupGameIntegrations(state);
    
    this.initialized = true;
  }

  // Register all quest definitions
  registerQuestDefinitions() {
    // Register each quest definition
    this.questService.registerQuestDefinition(
      openInventoryQuestDef.id,
      openInventoryQuestDef
    );
    
    // Add more quest definitions here...
  }

  // Set up integrations with game systems
  setupGameIntegrations(state) {
    // Inventory system already emits events directly
    this.setupInventoryIntegration();
    
    // Add more integrations as needed
    this.setupCombatIntegration();
    this.setupDialogueIntegration();
    this.setupMovementIntegration();
  }

  // Public API methods
  startQuest(state, questId) {
    if (!this.initialized) {
      this.initialize(state);
    }
    
    const success = this.questService.startQuest(state, questId);
    
    // Call onStart callback if exists
    if (success) {
      const questDef = this.questService.questDefinitions.get(questId);
      const quest = this.questService.getQuest(questId);
      
      if (questDef && questDef.onStart) {
        questDef.onStart(state, quest);
      }
    }
    
    return success;
  }

  completeQuest(state, questId) {
    const quest = this.questService.getQuest(questId);
    const questDef = this.questService.questDefinitions.get(questId);
    
    const rewards = this.questService.completeQuest(state, questId);
    
    // Call onComplete callback if exists
    if (rewards && questDef && questDef.onComplete) {
      questDef.onComplete(state, quest, rewards);
    }
    
    return rewards;
  }

  // Check if quest can be turned in (completed but not rewarded)
  canTurnInQuest(questId) {
    if (!this.questService) return false;
    const quest = this.questService.getQuest(questId);
    return !!(quest && quest.state === 'COMPLETED');
  }

  // Emit a custom event
  emitEvent(eventType, data) {
    if (this.questEvents) {
      this.questEvents.emit(eventType, data);
    }
  }
}

// Export singleton instance
export const QuestManager = new QuestManagerImpl();
```

### 5. Quest Definition: openInventoryQuest.js
**Purpose**: Defines the "Open Inventory" tutorial quest.

```javascript
export const openInventoryQuestDef = {
  id: 'open_inventory_quest',
  
  // Factory function to create quest instances
  create: (params = {}) => ({
    id: 'open_inventory_quest',
    name: 'Tutorial: Open Your Inventory',
    description: 'Learn how to open your inventory by pressing the "i" key.',
    
    // Quest metadata
    giver: 'Steven',
    giverLocation: { cx: 0, cy: 0, biome: 'candy_kingdom' },
    priority: 'MAIN',
    difficulty: 'TRIVIAL',
    level: 1,
    
    // Quest objectives
    objectives: [
      {
        id: 'open_inventory',
        type: 'EVENT_BASED',           // This objective listens for events
        description: 'Open your inventory by pressing "i"',
        progress: 0,                    // Current progress
        count: 1,                       // Target count (1 = do once)
        completed: false,               // Completion flag
        conditions: {
          events: ['INVENTORY_OPENED'], // Listen for this event
          // No match conditions = any INVENTORY_OPENED event counts
        }
      }
    ],
    
    // Quest rewards
    rewards: {
      gold: 2000,
      experience: 10,
      items: []
    },
    
    // Quest state
    state: 'ACTIVE',
    startedAt: null,
    completedAt: null
  }),
  
  // Called when quest starts
  onStart: (state, quest) => {
    if (state.flags) {
      state.flags.inventory_quest_started = true;
    }
    
    if (state.log) {
      state.log("Steven: 'Press the 'i' key to open your inventory!'", "quest");
      state.log("Quest Started: Open Your Inventory", "good");
    }
  },
  
  // Called when quest is turned in
  onComplete: (state, quest, rewards) => {
    if (state.flags) {
      state.flags.inventory_tutorial_completed = true;
    }
    
    if (state.log) {
      state.log("Steven: 'Excellent! Here's your reward.'", "quest");
    }
  }
};
```

## Quest Flow Example

Let's trace the complete flow of the "Open Inventory" quest:

### 1. Quest Start
```
Player talks to Steven → Selects "[QUEST] Can you teach me something?"
↓
dialogue.js: processDialogueAction() 
  → case 'start_quest': QuestManager.startQuest(state, 'open_inventory_quest')
↓
QuestManager.startQuest()
  → QuestService.startQuest()
    → Creates quest instance from definition
    → Sets quest state to 'ACTIVE'
    → Initializes objective (progress: 0, completed: false)
    → Calls GenericObjectiveHandler.register(quest, objective)
      → Subscribes to 'INVENTORY_OPENED' event
    → Adds quest to player.quests.active
    → Emits 'QUEST_STARTED' event
  → Calls onStart callback (logs message)
```

### 2. Player Presses 'i'
```
Player presses 'i' key
↓
keys.js: handleGameControls() detects 'i' key
  → Calls openInventory(STATE)
↓
inventory.js: openInventory()
  → Sets UI state
  → Renders inventory
  → QuestManager.emitEvent('INVENTORY_OPENED', { timestamp })
↓
QuestManager.emitEvent()
  → QuestEventBus.emit('INVENTORY_OPENED', data)
↓
QuestEventBus.emit()
  → Finds all handlers for 'INVENTORY_OPENED'
  → Calls each handler with event data
↓
GenericObjectiveHandler.handleEvent('INVENTORY_OPENED', data)
  → Finds objectives listening for 'INVENTORY_OPENED'
  → For each objective:
    → evaluateConditions(conditions, eventType, data)
      → Checks event type matches ✓
      → No match conditions, so passes ✓
    → Creates update: { completed: true }
    → Calls QuestService.updateObjective()
↓
QuestService.updateObjective()
  → Sets objective.completed = true
  → Emits 'OBJECTIVE_COMPLETED' event
  → Checks if all objectives complete (yes)
  → Calls markQuestAsCompleted()
    → Sets quest.state = 'COMPLETED'
    → Emits 'QUEST_READY_FOR_COMPLETION' event
```

### 3. Quest Turn-In
```
Player talks to Steven again
↓
dialogue.js: getCurrentNode()
  → Evaluates dialogue conditions
  → Condition { type: 'questCanTurnIn', quest: 'open_inventory_quest' }
  → QuestManager.canTurnInQuest() returns true
  → Shows "[QUEST] I've opened my inventory!" option
↓
Player selects turn-in option
↓
dialogue.js: processDialogueAction()
  → case 'complete_quest': QuestManager.completeQuest(state, 'open_inventory_quest')
↓
QuestManager.completeQuest()
  → QuestService.completeQuest()
    → Applies rewards (gold: 2000, experience: 10)
    → Moves quest from active to completed
    → Unregisters objective handlers
    → Removes quest from active quests
    → Emits 'QUEST_COMPLETED' event
  → Calls onComplete callback (logs message, sets flag)
```

## Creating Multi-Objective Quests

Here's how to create a quest with multiple objectives:

### Example: "Hero's Journey" Quest

```javascript
export const heroJourneyQuestDef = {
  id: 'hero_journey',
  
  create: (params = {}) => ({
    id: 'hero_journey',
    name: "A Hero's Journey",
    description: 'Prove yourself as a true hero by completing multiple challenges.',
    
    giver: 'Princess Bubblegum',
    priority: 'MAIN',
    difficulty: 'MODERATE',
    level: 5,
    
    objectives: [
      // Objective 1: Kill enemies (countable)
      {
        id: 'defeat_enemies',
        type: 'EVENT_BASED',
        description: 'Defeat 10 enemies',
        progress: 0,
        count: 10,              // Need to kill 10 enemies
        completed: false,
        conditions: {
          events: ['ENTITY_KILLED'],
          match: {
            entityType: 'monster'  // Only monsters count
          }
        }
      },
      
      // Objective 2: Collect items (countable)
      {
        id: 'collect_gems',
        type: 'EVENT_BASED',
        description: 'Collect 5 magic gems',
        progress: 0,
        count: 5,               // Need 5 gems
        completed: false,
        conditions: {
          events: ['ITEM_COLLECTED'],
          match: {
            'item.type': 'gem',
            'item.magical': true
          }
        }
      },
      
      // Objective 3: Visit location (single completion)
      {
        id: 'visit_dungeon',
        type: 'EVENT_BASED',
        description: 'Enter the Dark Dungeon',
        completed: false,
        conditions: {
          events: ['LOCATION_ENTERED'],
          match: {
            locationId: 'dark_dungeon'
          }
        }
      },
      
      // Objective 4: Talk to NPC (single completion)
      {
        id: 'talk_to_wizard',
        type: 'EVENT_BASED',
        description: 'Speak with the Ancient Wizard',
        completed: false,
        conditions: {
          events: ['DIALOGUE_STARTED'],
          match: {
            npcId: 'ancient_wizard'
          }
        }
      },
      
      // Objective 5: Custom condition with evaluator
      {
        id: 'reach_level',
        type: 'EVENT_BASED',
        description: 'Reach level 10',
        completed: false,
        conditions: {
          events: ['LEVEL_UP', 'PLAYER_STATS_CHANGED'],
          evaluator: (eventData) => {
            // Custom logic to check level
            return eventData.player?.level >= 10;
          }
        }
      }
    ],
    
    rewards: {
      gold: 10000,
      experience: 500,
      items: [
        { id: 'legendary_sword', name: 'Excalibur', type: 'weapon', damage: 50 }
      ]
    }
  }),
  
  onStart: (state, quest) => {
    state.log("Princess Bubblegum: 'Hero, I have multiple tasks for you!'", "quest");
    state.log("Quest Started: A Hero's Journey", "quest");
    
    // Could spawn special enemies or items for the quest
    spawnQuestEnemies(state);
    spawnQuestGems(state);
  },
  
  onComplete: (state, quest, rewards) => {
    state.log("Princess Bubblegum: 'You are a true hero!'", "quest");
    state.flags.hero_journey_completed = true;
    
    // Could unlock new areas or features
    unlockSecretArea(state);
  }
};
```

### Integrating Game Events

To make multi-objective quests work, ensure your game systems emit the necessary events:

```javascript
// In combat system
function defeatEnemy(state, enemy) {
  // ... combat logic ...
  
  // Emit event for quest system
  QuestManager.emitEvent('ENTITY_KILLED', {
    entityType: enemy.type,
    entityId: enemy.id,
    location: state.currentLocation,
    player: state.player
  });
}

// In item system
function collectItem(state, item) {
  // ... item collection logic ...
  
  QuestManager.emitEvent('ITEM_COLLECTED', {
    item: item,
    location: state.currentLocation,
    player: state.player
  });
}

// In movement system
function enterLocation(state, locationId) {
  // ... location entry logic ...
  
  QuestManager.emitEvent('LOCATION_ENTERED', {
    locationId: locationId,
    previousLocation: state.previousLocation,
    player: state.player
  });
}

// In dialogue system
function startDialogue(state, npc) {
  // ... dialogue start logic ...
  
  QuestManager.emitEvent('DIALOGUE_STARTED', {
    npcId: npc.id,
    npcName: npc.name,
    location: state.currentLocation,
    player: state.player
  });
}
```

### Progress Tracking

For multi-objective quests, you can display progress:

```javascript
function displayQuestProgress(questId) {
  const quest = QuestManager.getQuest(questId);
  if (!quest) return;
  
  console.log(`Quest: ${quest.name}`);
  quest.objectives.forEach(obj => {
    if (obj.count) {
      // Countable objective
      console.log(`  ${obj.description}: ${obj.progress}/${obj.count}`);
    } else {
      // Simple objective
      console.log(`  ${obj.description}: ${obj.completed ? '✓' : '○'}`);
    }
  });
}
```

### Advanced Features

#### Conditional Objectives
You can make objectives that only activate after others complete:

```javascript
{
  id: 'boss_fight',
  type: 'EVENT_BASED',
  description: 'Defeat the Dark Lord',
  prerequisites: ['defeat_enemies', 'collect_gems'], // Only active after these complete
  conditions: {
    events: ['BOSS_DEFEATED'],
    match: { bossId: 'dark_lord' }
  }
}
```

#### Branching Objectives
Create objectives where completing one locks out another:

```javascript
objectives: [
  {
    id: 'save_village',
    type: 'EVENT_BASED',
    description: 'Save the village from bandits',
    mutex: 'join_bandits',  // Can't complete both
    conditions: {
      events: ['VILLAGE_SAVED']
    }
  },
  {
    id: 'join_bandits',
    type: 'EVENT_BASED',
    description: 'Join the bandit clan',
    mutex: 'save_village',  // Can't complete both
    conditions: {
      events: ['JOINED_FACTION'],
      match: { faction: 'bandits' }
    }
  }
]
```

#### Time-Limited Objectives
Add time constraints:

```javascript
{
  id: 'timed_delivery',
  type: 'EVENT_BASED',
  description: 'Deliver package within 5 minutes',
  timeLimit: 300000,  // 5 minutes in milliseconds
  startTime: null,     // Set when objective activates
  conditions: {
    events: ['ITEM_DELIVERED'],
    evaluator: (eventData, objective) => {
      const elapsed = Date.now() - objective.startTime;
      return elapsed <= objective.timeLimit;
    }
  }
}
```

## Integration Points

### Game Initialization
```javascript
// In game.js newWorld() function
export async function newWorld() {
  // ... create state ...
  
  // Initialize quest system
  QuestManager.initialize(state);
  
  // ... rest of initialization ...
}
```

### Inventory System
```javascript
// In inventory.js
export function openInventory(state) {
  // ... open inventory UI ...
  
  // Emit event for quest system
  QuestManager.emitEvent('INVENTORY_OPENED', {
    timestamp: Date.now()
  });
}
```

### Dialogue System
```javascript
// In dialogue.js processDialogueAction()
case 'start_quest':
  const success = QuestManager.startQuest(state, action.id);
  break;

case 'complete_quest':
  const rewards = QuestManager.completeQuest(state, action.quest);
  break;
```

### Dialogue Conditions
```javascript
// In dialogue.js evaluateConditionInternal()
if (condition.type === 'questCanTurnIn' || condition.canTurnInQuest) {
  const questId = condition.quest || condition.canTurnInQuest;
  return QuestManager.canTurnInQuest(questId);
}
```

## Best Practices

1. **Always emit events** when something happens in your game
2. **Use descriptive event names** like 'INVENTORY_OPENED' not 'INV_OPN'
3. **Include relevant data** in events for flexible condition matching
4. **Keep objectives focused** - one clear goal per objective
5. **Use match conditions** for simple equality checks
6. **Use evaluator functions** for complex logic
7. **Test each objective** independently before combining
8. **Document prerequisites** and special conditions clearly
9. **Consider save/load** - ensure quest state persists properly
10. **Plan for edge cases** - what if player abandons quest?

## Debugging Tips

1. **Enable console logs** (already added) to trace quest flow
2. **Check event emission** - Is the event being emitted?
3. **Verify event data** - Does it match objective conditions?
4. **Check quest state** - Use `QuestManager.getQuest(questId)`
5. **Test conditions** - Use evaluateConditions() directly
6. **Monitor objective progress** - Log after each update
7. **Verify rewards** - Check player state after completion

## Summary

The new quest system provides a robust, extensible framework for creating complex quests without coupling game systems to quest logic. By using events as the communication mechanism, you can add new quests without modifying existing game code, and game systems can be updated without breaking quests.

The key is thinking in terms of **events** rather than direct updates. Instead of "when player opens inventory, update quest", think "inventory system emits event, quest system listens and reacts".