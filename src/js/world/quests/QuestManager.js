/**
 * Quest Manager - Tracks and manages active quests
 */

import { QuestState, QuestObjective } from './constants.js';

export class QuestManager {
  constructor(questGenerator, eventBus) {
    this.questGenerator = questGenerator;
    this.eventBus = eventBus;
    this.activeQuests = [];
    this.completedQuests = [];
    this.failedQuests = [];
    this.abandonedQuests = [];
    this.questMap = new Map(); // id -> quest
    
    // Statistics tracking
    this.statistics = {
      totalStarted: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalAbandoned: 0,
      totalExperience: 0,
      totalGold: 0,
      averageCompletionTime: 0,
      completionTimes: []
    };
  }
  
  /**
   * Add a quest to active quests
   */
  addQuest(state, quest) {
    if (!quest.state) {
      quest.state = QuestState.ACTIVE;
    }
    
    // Add timestamps
    quest.startedAt = Date.now();
    
    this.activeQuests.push(quest);
    this.questMap.set(quest.id, quest);
    quest.start(state, this, quest);
    // Update statistics
    this.statistics.totalStarted++;
    
    if (this.eventBus) {
      this.eventBus.emit('QuestAdded', { quest });
    }
  }
  
  /**
   * Get active quests
   */
  getActiveQuests() {
    return this.activeQuests;
  }
  
  /**
   * Get quest by ID
   */
  getQuest(questId) {
    return this.questMap.get(questId);
  }
  
  /**
   * Update objective progress
   */
  updateObjective(questId, objectiveId, updates) {
    const quest = this.getQuest(questId);
    if (!quest) return false;
    
    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective) return false;
    
    // Update progress
    if (updates.progress !== undefined) {
      objective.progress = updates.progress;
      
      // Check if completed
      if (objective.count && objective.progress >= objective.count) {
        objective.completed = true;
      }
    }
    
    // Update other properties
    Object.keys(updates).forEach(key => {
      if (key !== 'progress') {
        objective[key] = updates[key];
      }
    });
    
    // Check if quest is complete
    if (quest.objectives.every(o => o.completed)) {
      this.completeQuest(questId);
    }
    
    return true;
  }
  
  /**
   * Complete a quest
   */
  completeQuest(questId) {
    const quest = this.getQuest(questId);
    if (!quest) return null;
    
    quest.state = QuestState.COMPLETED;
    quest.completedAt = Date.now();
    
    // Calculate completion time
    if (quest.startedAt) {
      const completionTime = quest.completedAt - quest.startedAt;
      this.statistics.completionTimes.push(completionTime);
      this.statistics.averageCompletionTime = 
        this.statistics.completionTimes.reduce((a, b) => a + b, 0) / 
        this.statistics.completionTimes.length;
    }
    
    // Move from active to completed
    const index = this.activeQuests.indexOf(quest);
    if (index !== -1) {
      this.activeQuests.splice(index, 1);
      this.completedQuests.push(quest);
    }
    
    // Update statistics
    this.statistics.totalCompleted++;
    if (quest.rewards) {
      this.statistics.totalExperience += quest.rewards.experience || 0;
      this.statistics.totalGold += quest.rewards.gold || 0;
    }
    
    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('QuestCompleted', {
        questId: quest.id,
        rewards: quest.rewards
      });
    }
    
    return quest.rewards;
  }
  
  /**
   * Check failure conditions
   */
  checkFailureConditions(questId) {
    const quest = this.getQuest(questId);
    if (!quest || !quest.failureConditions) return;
    
    let failureReason = null;
    
    // Check time limit
    if (quest.failureConditions.timeLimit && quest.startTime) {
      const elapsed = (Date.now() - quest.startTime) / 1000; // Convert to seconds
      if (elapsed > quest.failureConditions.timeLimit) {
        failureReason = 'timeLimit';
      }
    }
    
    // Check NPC death
    if (quest.failureConditions.npcDeath && quest.objectives) {
      const escortObjective = quest.objectives.find(o => o.type === QuestObjective.ESCORT);
      if (escortObjective && escortObjective.npcHealth <= 0) {
        failureReason = 'npcDeath';
      }
    }
    
    if (failureReason) {
      this.failQuest(questId, failureReason);
    }
  }
  
  /**
   * Fail a quest
   */
  failQuest(questId, reason) {
    const quest = this.getQuest(questId);
    if (!quest) return;
    
    quest.state = QuestState.FAILED;
    quest.failureReason = reason;
    
    // Move from active to failed
    const index = this.activeQuests.indexOf(quest);
    if (index !== -1) {
      this.activeQuests.splice(index, 1);
      this.failedQuests.push(quest);
    }
    
    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('QuestFailed', {
        questId: quest.id,
        reason: reason
      });
    }
  }
  
  /**
   * Abandon a quest
   */
  abandonQuest(questId) {
    const quest = this.getQuest(questId);
    if (!quest) return false;
    
    quest.state = QuestState.ABANDONED;
    quest.abandonedAt = Date.now();
    
    // Move from active to abandoned list
    const index = this.activeQuests.indexOf(quest);
    if (index !== -1) {
      this.activeQuests.splice(index, 1);
      
      // Track abandoned quests
      if (!this.abandonedQuests) {
        this.abandonedQuests = [];
      }
      this.abandonedQuests.push(quest);
    }
    
    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('QuestAbandoned', {
        questId: quest.id
      });
    }
    
    return true;
  }
  
  /**
   * Apply quest modifications to chunk
   */
  async applyQuestToChunk(quest, chunk) {
    if (!chunk) return;
    
    // Initialize arrays if missing
    if (!chunk.items) chunk.items = [];
    if (!chunk.monsters) chunk.monsters = [];
    if (!chunk.questMarkers) chunk.questMarkers = {};
    
    // Use constants for dimensions
    const CHUNK_WIDTH = 24;
    const CHUNK_HEIGHT = 22;
    
    // Add quest items
    quest.objectives.forEach(obj => {
      if (obj.type === QuestObjective.COLLECT) {
        // Get passable tiles for item placement
        const emptyTiles = chunk.findEmptyTiles ? chunk.findEmptyTiles() : [];
        
        if (emptyTiles.length === 0) {
          console.warn('No passable tiles available for quest items');
          return;
        }
        
        // Add collectible items
        for (let i = 0; i < obj.count; i++) {
          // Pick random passable tile
          const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
          
          chunk.items.push({
            type: obj.target,
            x: tile.x,
            y: tile.y,
            questId: quest.id
          });
        }
      } else if (obj.type === QuestObjective.DEFEAT) {
        // Spawn quest enemies
        for (let i = 0; i < obj.count; i++) {
          const x = Math.floor(Math.random() * CHUNK_WIDTH);
          const y = Math.floor(Math.random() * CHUNK_HEIGHT);
          
          chunk.monsters.push({
            type: obj.enemyType,
            x: x,
            y: y,
            questId: quest.id,
            hp: 20,
            alive: true
          });
        }
      } else if (obj.type === QuestObjective.EXPLORE) {
        // Add quest marker
        chunk.questMarkers[quest.id] = {
          x: obj.location.x || 12,
          y: obj.location.y || 11,
          type: 'explore'
        };
      }
    });
    
    // Mark chunk as quest-modified
    if (!chunk.metadata) {
      chunk.metadata = {};
    }
    chunk.metadata.questModified = true;
    chunk.metadata.questIds = chunk.metadata.questIds || [];
    chunk.metadata.questIds.push(quest.id);
  }
  
  /**
   * Check if quest is completed
   */
  isQuestCompleted(questId) {
    return this.completedQuests.some(q => q.id === questId);
  }
  
  /**
   * Get quest statistics
   */
  getStatistics() {
    return { ...this.statistics };
  }
  
  /**
   * Get quests by priority
   */
  getQuestsByPriority(priority) {
    return this.activeQuests.filter(q => q.priority === priority);
  }
  
  /**
   * Get recommended quests for player level
   */
  getRecommendedQuests(playerLevel) {
    return this.activeQuests.filter(q => {
      const questLevel = q.level || 1;
      return Math.abs(questLevel - playerLevel) <= 2;
    });
  }
  
  /**
   * Serialize for saving
   */
  serialize() {
    return {
      version: '1.0',
      activeQuests: this.activeQuests,
      completedQuests: this.completedQuests.map(q => q.id),
      failedQuests: this.failedQuests.map(q => q.id)
    };
  }
  
  /**
   * Deserialize from save data
   */
  deserialize(data) {
    if (data.activeQuests) {
      this.activeQuests = data.activeQuests;
      this.activeQuests.forEach(quest => {
        this.questMap.set(quest.id, quest);
      });
    }
    
    if (data.completedQuests) {
      // Store just the IDs for completed quests
      this.completedQuests = data.completedQuests.map(id => ({ id, state: QuestState.COMPLETED }));
    }
    
    if (data.failedQuests) {
      this.failedQuests = data.failedQuests.map(id => ({ id, state: QuestState.FAILED }));
    }
  }
}