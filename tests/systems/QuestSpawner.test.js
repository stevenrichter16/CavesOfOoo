import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestSpawner } from '../../src/js/systems/QuestSpawner.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('QuestSpawner', () => {
  let questSpawner;
  let eventBus;
  let mockState;

  beforeEach(() => {
    eventBus = new EventBus();
    questSpawner = new QuestSpawner(eventBus);
    
    mockState = {
      cx: 0,
      cy: 0,
      chunk: {
        monsters: [],
        items: [],
        destructibles: [],
        locations: [],
        harvestables: []
      },
      activeQuests: [],
      questSpawns: {},
      log: vi.fn()
    };
  });

  describe('constructor', () => {
    it('should initialize with event bus', () => {
      expect(questSpawner.eventBus).toBe(eventBus);
    });

    it('should register spawn configurations', () => {
      expect(questSpawner.spawnConfigs).toBeDefined();
      expect(questSpawner.spawnConfigs).toBeInstanceOf(Map);
    });
  });

  describe('registerSpawnConfig', () => {
    it('should register a spawn configuration', () => {
      const config = {
        questId: 'test_quest',
        chunkKey: '0,1',
        spawns: {
          monsters: [{ type: 'goblin', x: 5, y: 5 }]
        }
      };

      questSpawner.registerSpawnConfig('test_quest', config);
      expect(questSpawner.spawnConfigs.has('test_quest')).toBe(true);
    });

    it('should override existing configuration', () => {
      const config1 = { questId: 'test', spawns: { monsters: [] } };
      const config2 = { questId: 'test', spawns: { items: [] } };

      questSpawner.registerSpawnConfig('test', config1);
      questSpawner.registerSpawnConfig('test', config2);

      expect(questSpawner.spawnConfigs.get('test')).toBe(config2);
    });
  });

  describe('checkAndSpawn', () => {
    it('should spawn quest content for matching chunk', () => {
      // Setup quest spawn in state
      mockState.questSpawns['0,0'] = {
        monsters: [
          { type: 'wolf', x: 10, y: 10, hp: 20 }
        ],
        items: [
          { id: 'sword', x: 5, y: 5 }
        ]
      };

      questSpawner.checkAndSpawn(mockState, 0, 0);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.monsters[0].type).toBe('wolf');
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.items[0].id).toBe('sword');
    });

    it('should clear spawns after spawning', () => {
      mockState.questSpawns['0,0'] = {
        monsters: [{ type: 'wolf', x: 10, y: 10 }]
      };

      questSpawner.checkAndSpawn(mockState, 0, 0);
      
      expect(mockState.questSpawns['0,0']).toBeUndefined();
    });

    it('should not spawn if chunk key does not match', () => {
      mockState.questSpawns['1,1'] = {
        monsters: [{ type: 'wolf', x: 10, y: 10 }]
      };

      questSpawner.checkAndSpawn(mockState, 0, 0);

      expect(mockState.chunk.monsters).toHaveLength(0);
      expect(mockState.questSpawns['1,1']).toBeDefined();
    });

    it('should handle multiple spawn types', () => {
      mockState.questSpawns['0,0'] = {
        monsters: [{ type: 'wolf' }],
        items: [{ id: 'potion' }],
        destructibles: [{ type: 'barrel' }],
        locations: [{ name: 'cave' }],
        harvestables: [{ type: 'crystal' }]
      };

      questSpawner.checkAndSpawn(mockState, 0, 0);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.destructibles).toHaveLength(1);
      expect(mockState.chunk.locations).toHaveLength(1);
      expect(mockState.chunk.harvestables).toHaveLength(1);
    });

    it('should emit events when spawning', () => {
      const spawnSpy = vi.fn();
      eventBus.on('QuestContentSpawned', spawnSpy);

      mockState.questSpawns['0,0'] = {
        monsters: [{ type: 'wolf' }]
      };

      questSpawner.checkAndSpawn(mockState, 0, 0);

      expect(spawnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkKey: '0,0',
          spawns: expect.objectContaining({
            monsters: expect.arrayContaining([{ type: 'wolf' }])
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('spawnForQuest', () => {
    it('should spawn content for a specific quest', () => {
      const questId = 'pup_gang';
      mockState.activeQuests = [{ id: questId, status: 'active' }];

      // Register spawn config
      questSpawner.registerSpawnConfig(questId, {
        chunkKey: '0,1',
        spawns: {
          monsters: [
            { type: 'jake_jr', x: 10, y: 10, hp: 30 },
            { type: 'tv', x: 11, y: 10, hp: 25 }
          ]
        }
      });

      // Add to state questSpawns
      mockState.questSpawns['0,1'] = questSpawner.spawnConfigs.get(questId).spawns;

      questSpawner.checkAndSpawn(mockState, 0, 1);

      expect(mockState.chunk.monsters).toHaveLength(2);
      expect(mockState.chunk.monsters[0].type).toBe('jake_jr');
      expect(mockState.chunk.monsters[1].type).toBe('tv');
    });

    it('should not spawn if quest is not active', () => {
      const questId = 'pup_gang';
      mockState.activeQuests = [{ id: questId, status: 'completed' }];

      questSpawner.registerSpawnConfig(questId, {
        chunkKey: '0,1',
        spawns: {
          monsters: [{ type: 'jake_jr' }]
        }
      });

      const result = questSpawner.spawnForQuest(mockState, questId, 0, 1);

      expect(result).toBe(false);
      expect(mockState.chunk.monsters).toHaveLength(0);
    });
  });

  describe('location-specific spawns', () => {
    it('should handle Pup Gang spawn near convenience store', () => {
      mockState.questSpawns.pupGang = [
        { type: 'jake_jr', x: 10, y: 10 },
        { type: 'tv', x: 11, y: 10 }
      ];

      questSpawner.handleLocationSpawns(mockState, 0, 1);

      expect(mockState.chunk.monsters).toHaveLength(2);
      expect(mockState.questSpawns.pupGang).toBeUndefined();
    });

    it('should handle Licorice Woods bandits', () => {
      mockState.licoriceWoodsSpawns = {
        monsters: [{ type: 'bandit' }],
        destructibles: [{ type: 'camp' }],
        locations: [{ name: 'hideout' }]
      };

      questSpawner.handleLocationSpawns(mockState, -1, 1);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.destructibles).toHaveLength(1);
      expect(mockState.chunk.locations).toHaveLength(1);
      expect(mockState.licoriceWoodsSpawns).toBeUndefined();
    });

    it('should handle Cotton Candy Forest spawns', () => {
      mockState.forestSpawns = {
        monsters: [{ type: 'cotton_candy_wolf' }],
        harvestables: [{ type: 'cotton_candy' }],
        locations: [{ name: 'clearing' }]
      };

      questSpawner.handleLocationSpawns(mockState, 0, -1);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.harvestables).toHaveLength(1);
      expect(mockState.chunk.locations).toHaveLength(1);
      expect(mockState.forestSpawns).toBeUndefined();
    });

    it('should handle Cemetery spawns', () => {
      mockState.questSpawns['1,0'] = {
        monsters: [{ type: 'ghost' }],
        destructibles: [{ type: 'gravestone' }]
      };

      questSpawner.handleLocationSpawns(mockState, 1, 0);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.destructibles).toHaveLength(1);
      expect(mockState.questSpawns['1,0']).toBeUndefined();
    });

    it('should handle Cave spawns', () => {
      mockState.caveSpawns = {
        harvestables: [{ type: 'crystal', x: 5, y: 5 }]
      };

      questSpawner.handleLocationSpawns(mockState, -1, 0);

      expect(mockState.chunk.harvestables).toHaveLength(1);
      expect(mockState.caveSpawns).toBeUndefined();
    });

    it('should handle Summer Estate spawns', () => {
      mockState.estateSpawns = {
        monsters: [{ type: 'guard' }],
        locations: [{ name: 'garden' }]
      };

      questSpawner.handleLocationSpawns(mockState, 2, 0);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.locations).toHaveLength(1);
      expect(mockState.estateSpawns).toBeUndefined();
    });

    it('should handle Sewer spawns when in sewers', () => {
      mockState.inSewers = true;
      mockState.sewerSpawns = {
        monsters: [{ type: 'rat' }],
        containers: [{ type: 'chest' }]
      };

      questSpawner.handleLocationSpawns(mockState, 0, 0);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.containers).toHaveLength(1);
      expect(mockState.sewerSpawns).toBeUndefined();
    });
  });

  describe('dungeon spawns', () => {
    it('should spawn dungeon content for specific level', () => {
      mockState.dungeonSpawns = {
        1: {
          monsters: [{ type: 'skeleton' }],
          items: [{ id: 'key' }],
          destructibles: [{ type: 'pot' }]
        }
      };

      questSpawner.spawnDungeonContent(mockState, 1);

      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.destructibles).toHaveLength(1);
      expect(mockState.dungeonSpawns[1]).toBeUndefined();
    });

    it('should not spawn if no spawns for level', () => {
      mockState.dungeonSpawns = {
        2: { monsters: [{ type: 'skeleton' }] }
      };

      questSpawner.spawnDungeonContent(mockState, 1);

      expect(mockState.chunk.monsters).toHaveLength(0);
      expect(mockState.dungeonSpawns[2]).toBeDefined();
    });
  });

  describe('event handling', () => {
    it('should listen for ChunkEntered event', () => {
      const chunkSpy = vi.spyOn(questSpawner, 'checkAndSpawn');
      
      eventBus.emit('ChunkEntered', {
        chunk: { x: 0, y: 1 },
        state: mockState
      });

      expect(chunkSpy).toHaveBeenCalledWith(mockState, 0, 1);
    });

    it('should listen for QuestStarted event', () => {
      const questConfig = {
        chunkKey: '0,1',
        spawns: {
          monsters: [{ type: 'boss' }]
        }
      };

      questSpawner.registerSpawnConfig('boss_quest', questConfig);

      eventBus.emit('QuestStarted', {
        questId: 'boss_quest',
        state: mockState
      });

      expect(mockState.questSpawns['0,1']).toBeDefined();
      expect(mockState.questSpawns['0,1'].monsters).toHaveLength(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up all spawns for a quest', () => {
      mockState.questSpawns = {
        '0,0': { monsters: [] },
        '0,1': { items: [] },
        '1,0': { destructibles: [] }
      };

      questSpawner.cleanupQuestSpawns(mockState, ['0,0', '0,1']);

      expect(mockState.questSpawns['0,0']).toBeUndefined();
      expect(mockState.questSpawns['0,1']).toBeUndefined();
      expect(mockState.questSpawns['1,0']).toBeDefined();
    });

    it('should emit cleanup event', () => {
      const cleanupSpy = vi.fn();
      eventBus.on('QuestSpawnsCleanedUp', cleanupSpy);

      mockState.questSpawns = {
        '0,0': { monsters: [] }
      };

      questSpawner.cleanupQuestSpawns(mockState, ['0,0']);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});