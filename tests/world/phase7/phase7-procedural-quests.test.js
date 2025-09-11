/**
 * Phase 7: Procedural Quest Generation
 * Test-Driven Development for Adventure Time quest system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkSystem } from '../../../src/js/world/ChunkSystem.js';
import { QuestGenerator } from '../../../src/js/world/quests/QuestGenerator.js';
import { QuestManager } from '../../../src/js/world/quests/QuestManager.js';
import { QuestObjective, QuestReward, QuestState } from '../../../src/js/world/quests/constants.js';

describe('Phase 7: Procedural Quest Generation', () => {
  let mockEventBus;
  let chunkSystem;
  let questGenerator;
  let questManager;
  
  beforeEach(() => {
    mockEventBus = { 
      emit: vi.fn(), 
      on: vi.fn(), 
      off: vi.fn() 
    };
  });
  
  describe('Quest Generator Core', () => {
    it('should generate biome-appropriate quests', async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      questGenerator = new QuestGenerator(chunkSystem);
      
      const candyQuest = questGenerator.generateQuest({
        biome: 'candy_kingdom',
        playerLevel: 5
      });
      
      expect(candyQuest).toBeDefined();
      expect(candyQuest.id).toMatch(/^quest_/);
      expect(candyQuest.biome).toBe('candy_kingdom');
      expect(candyQuest.title).toBeDefined();
      expect(candyQuest.description).toBeDefined();
      expect(candyQuest.objectives).toBeInstanceOf(Array);
      expect(candyQuest.objectives.length).toBeGreaterThan(0);
    });
    
    it('should create multi-stage quests', () => {
      questGenerator = new QuestGenerator();
      
      const multiStageQuest = questGenerator.generateQuest({
        type: 'multi_stage',
        stages: 3
      });
      
      expect(multiStageQuest.stages).toBeDefined();
      expect(multiStageQuest.stages.length).toBe(3);
      expect(multiStageQuest.currentStage).toBe(0);
      
      // Each stage should have its own objectives
      multiStageQuest.stages.forEach(stage => {
        expect(stage.objectives).toBeDefined();
        expect(stage.description).toBeDefined();
      });
    });
    
    it('should generate Adventure Time themed objectives', () => {
      questGenerator = new QuestGenerator();
      
      const quest = questGenerator.generateQuest({
        biome: 'candy_kingdom',
        theme: 'adventure_time'
      });
      
      // Should have AT-themed objectives
      const validObjectiveTypes = [
        'rescue_candy_person',
        'collect_royal_tarts', 
        'defeat_candy_zombies',
        'find_princess_bubblegum',
        'deliver_message_to_peppermint_butler'
      ];
      
      quest.objectives.forEach(obj => {
        expect(validObjectiveTypes).toContain(obj.type);
      });
    });
  });
  
  describe('Quest Objectives', () => {
    beforeEach(() => {
      questGenerator = new QuestGenerator();
    });
    
    it('should generate collection objectives', () => {
      const objective = questGenerator.generateObjective({
        type: QuestObjective.COLLECT,
        biome: 'candy_kingdom'
      });
      
      expect(objective.type).toBe(QuestObjective.COLLECT);
      expect(objective.target).toBeDefined();
      expect(objective.count).toBeGreaterThan(0);
      expect(objective.progress).toBe(0);
      expect(objective.description).toContain('Collect');
    });
    
    it('should generate combat objectives', () => {
      const objective = questGenerator.generateObjective({
        type: QuestObjective.DEFEAT,
        biome: 'dungeon'
      });
      
      expect(objective.type).toBe(QuestObjective.DEFEAT);
      expect(objective.enemyType).toBeDefined();
      expect(objective.count).toBeGreaterThan(0);
      expect(['skeleton', 'zombie', 'monster']).toContain(objective.enemyType);
    });
    
    it('should generate exploration objectives', () => {
      const objective = questGenerator.generateObjective({
        type: QuestObjective.EXPLORE,
        biome: 'grasslands'
      });
      
      expect(objective.type).toBe(QuestObjective.EXPLORE);
      expect(objective.location).toBeDefined();
      expect(objective.location.cx).toBeDefined();
      expect(objective.location.cy).toBeDefined();
      expect(objective.discovered).toBe(false);
    });
    
    it('should generate delivery objectives', () => {
      const objective = questGenerator.generateObjective({
        type: QuestObjective.DELIVER,
        biome: 'candy_kingdom'
      });
      
      expect(objective.type).toBe(QuestObjective.DELIVER);
      expect(objective.item).toBeDefined();
      expect(objective.recipient).toBeDefined();
      expect(objective.recipientLocation).toBeDefined();
    });
    
    it('should generate escort objectives', () => {
      const objective = questGenerator.generateObjective({
        type: QuestObjective.ESCORT,
        biome: 'ice_kingdom'
      });
      
      expect(objective.type).toBe(QuestObjective.ESCORT);
      expect(objective.npcId).toBeDefined();
      expect(objective.startLocation).toBeDefined();
      expect(objective.destination).toBeDefined();
      expect(objective.npcHealth).toBe(100);
    });
  });
  
  describe('Quest Manager', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      questGenerator = new QuestGenerator(chunkSystem);
      questManager = new QuestManager(questGenerator, mockEventBus);
    });
    
    it('should track active quests', () => {
      const quest1 = questGenerator.generateQuest({ biome: 'candy_kingdom' });
      const quest2 = questGenerator.generateQuest({ biome: 'ice_kingdom' });
      
      questManager.addQuest(quest1);
      questManager.addQuest(quest2);
      
      expect(questManager.getActiveQuests().length).toBe(2);
      expect(questManager.getQuest(quest1.id)).toBe(quest1);
    });
    
    it('should update quest progress', () => {
      const quest = {
        id: 'quest_collect_1',
        state: QuestState.ACTIVE,
        objectives: [{
          id: 'obj_1',
          type: QuestObjective.COLLECT,
          target: 'candy',
          count: 5,
          progress: 0,
          completed: false
        }]
      };
      
      questManager.addQuest(quest);
      
      // Simulate collecting items
      questManager.updateObjective(quest.id, 'obj_1', {
        progress: 3
      });
      
      expect(quest.objectives[0].progress).toBe(3);
      expect(quest.objectives[0].completed).toBe(false);
      
      // Complete the objective
      questManager.updateObjective(quest.id, 'obj_1', {
        progress: 5
      });
      
      expect(quest.objectives[0].completed).toBe(true);
    });
    
    it('should complete quests and grant rewards', () => {
      const quest = {
        id: 'quest_complete_1',
        state: QuestState.ACTIVE,
        objectives: [{
          id: 'obj_1',
          completed: true
        }],
        rewards: {
          experience: 100,
          items: [{ type: 'sword', count: 1 }],
          gold: 50
        }
      };
      
      questManager.addQuest(quest);
      const rewards = questManager.completeQuest(quest.id);
      
      expect(quest.state).toBe(QuestState.COMPLETED);
      expect(rewards).toEqual(quest.rewards);
      expect(mockEventBus.emit).toHaveBeenCalledWith('QuestCompleted', {
        questId: quest.id,
        rewards: quest.rewards
      });
    });
    
    it('should handle quest failure conditions', () => {
      const quest = {
        id: 'quest_escort_1',
        state: QuestState.ACTIVE,
        failureConditions: {
          npcDeath: true,
          timeLimit: 300 // seconds
        },
        startTime: Date.now() - 400000 // Started 400 seconds ago
      };
      
      questManager.addQuest(quest);
      questManager.checkFailureConditions(quest.id);
      
      expect(quest.state).toBe(QuestState.FAILED);
      expect(mockEventBus.emit).toHaveBeenCalledWith('QuestFailed', {
        questId: quest.id,
        reason: 'timeLimit'
      });
    });
  });
  
  describe('Quest Integration with Chunks', () => {
    beforeEach(async () => {
      chunkSystem = await ChunkSystem.create(mockEventBus);
      questGenerator = new QuestGenerator(chunkSystem);
      questManager = new QuestManager(questGenerator, mockEventBus);
    });
    
    it('should spawn quest objectives in chunks', async () => {
      const quest = questGenerator.generateQuest({
        biome: 'candy_kingdom',
        type: 'fetch'
      });
      
      // Quest should specify target chunk
      expect(quest.targetChunk).toBeDefined();
      
      const chunk = await chunkSystem.generateChunk('test', 
        quest.targetChunk.cx, 
        quest.targetChunk.cy
      );
      
      // Apply quest modifications to chunk
      await questManager.applyQuestToChunk(quest, chunk);
      
      // Chunk should have quest items/NPCs
      if (quest.objectives[0].type === QuestObjective.COLLECT) {
        expect(chunk.items.some(i => i.questId === quest.id)).toBe(true);
      }
    });
    
    it('should create quest markers in chunks', async () => {
      const quest = {
        id: 'quest_marker_1',
        targetChunk: { cx: 10, cy: 10 },
        objectives: [{
          type: QuestObjective.EXPLORE,
          location: { cx: 10, cy: 10, x: 12, y: 11 }
        }]
      };
      
      const chunk = await chunkSystem.generateChunk('test', 10, 10);
      await questManager.applyQuestToChunk(quest, chunk);
      
      expect(chunk.questMarkers).toBeDefined();
      expect(chunk.questMarkers[quest.id]).toBeDefined();
      expect(chunk.questMarkers[quest.id].x).toBe(12);
      expect(chunk.questMarkers[quest.id].y).toBe(11);
    });
    
    it('should dynamically spawn quest enemies', async () => {
      const quest = {
        id: 'quest_combat_1',
        objectives: [{
          type: QuestObjective.DEFEAT,
          enemyType: 'candy_zombie',
          count: 5,
          spawnLocation: { cx: 0, cy: 0 }
        }]
      };
      
      const chunk = await chunkSystem.generateChunk('test', 0, 0);
      const originalMonsterCount = chunk.monsters.length;
      
      await questManager.applyQuestToChunk(quest, chunk);
      
      expect(chunk.monsters.length).toBe(originalMonsterCount + 5);
      expect(chunk.monsters.filter(m => m.type === 'candy_zombie').length).toBe(5);
      chunk.monsters.filter(m => m.type === 'candy_zombie').forEach(m => {
        expect(m.questId).toBe(quest.id);
      });
    });
  });
  
  describe('Quest Templates and Variations', () => {
    beforeEach(() => {
      questGenerator = new QuestGenerator();
    });
    
    it('should use predefined quest templates', () => {
      const templates = questGenerator.getTemplates();
      
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      // Should have Adventure Time themed templates
      const templateNames = templates.map(t => t.name);
      expect(templateNames).toContain('Dungeon Crawl');
      expect(templateNames).toContain('Royal Decree');
      expect(templateNames).toContain('Rescue Mission');
      expect(templateNames).toContain('Ancient Artifact');
    });
    
    it('should generate variations of templates', () => {
      const template = {
        name: 'Rescue Mission',
        baseObjectives: [
          { type: QuestObjective.EXPLORE },
          { type: QuestObjective.DEFEAT },
          { type: QuestObjective.ESCORT }
        ]
      };
      
      const quest1 = questGenerator.generateFromTemplate(template, { biome: 'candy_kingdom' });
      const quest2 = questGenerator.generateFromTemplate(template, { biome: 'candy_kingdom' });
      
      // Same template, different details
      expect(quest1.objectives.length).toBe(quest2.objectives.length);
      expect(quest1.title).not.toBe(quest2.title); // Different titles
      expect(quest1.objectives[0].location).not.toEqual(quest2.objectives[0].location);
    });
  });
  
  describe('Quest Persistence', () => {
    beforeEach(() => {
      questManager = new QuestManager(null, mockEventBus);
    });
    
    it('should serialize quest state', () => {
      const quest = {
        id: 'quest_save_1',
        state: QuestState.ACTIVE,
        objectives: [{
          id: 'obj_1',
          progress: 3,
          completed: false
        }],
        startTime: Date.now(),
        customData: { npcMet: true }
      };
      
      questManager.addQuest(quest);
      const serialized = questManager.serialize();
      
      expect(serialized.activeQuests).toContain(quest);
      expect(serialized.completedQuests).toBeDefined();
      expect(serialized.version).toBeDefined();
    });
    
    it('should restore quest state from save', () => {
      const saveData = {
        version: '1.0',
        activeQuests: [{
          id: 'quest_load_1',
          state: QuestState.ACTIVE,
          objectives: [{
            id: 'obj_1',
            progress: 7,
            completed: false
          }]
        }],
        completedQuests: ['quest_old_1', 'quest_old_2']
      };
      
      questManager.deserialize(saveData);
      
      expect(questManager.getActiveQuests().length).toBe(1);
      expect(questManager.getQuest('quest_load_1')).toBeDefined();
      expect(questManager.isQuestCompleted('quest_old_1')).toBe(true);
    });
  });
  
  describe('Performance', () => {
    it('should efficiently generate many quests', () => {
      questGenerator = new QuestGenerator();
      
      const startTime = Date.now();
      const quests = [];
      
      for (let i = 0; i < 100; i++) {
        quests.push(questGenerator.generateQuest({
          biome: 'candy_kingdom',
          playerLevel: 10
        }));
      }
      
      const elapsed = Date.now() - startTime;
      
      expect(quests.length).toBe(100);
      expect(elapsed).toBeLessThan(100); // Should generate 100 quests in under 100ms
      
      // All quests should be unique
      const questIds = quests.map(q => q.id);
      expect(new Set(questIds).size).toBe(100);
    });
  });
});