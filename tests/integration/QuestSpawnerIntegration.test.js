import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuestSpawner, getQuestSpawner, resetQuestSpawner } from '../../src/js/systems/QuestSpawner.js';
import { EventBus, getGameEventBus } from '../../src/js/systems/EventBus.js';

describe('QuestSpawner Integration', () => {
  let questSpawner;
  let eventBus;
  let mockState;

  beforeEach(() => {
    // Reset singletons
    resetQuestSpawner();
    
    // Create fresh event bus for testing
    eventBus = new EventBus();
    questSpawner = new QuestSpawner(eventBus);
    
    // Setup mock state
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
      player: {
        x: 5,
        y: 5,
        inventory: []
      },
      log: vi.fn()
    };
  });

  afterEach(() => {
    resetQuestSpawner();
  });

  describe('ChunkEntered event integration', () => {
    it('should spawn quest content when ChunkEntered event is emitted', () => {
      // Setup quest spawns
      mockState.questSpawns['0,1'] = {
        monsters: [
          { type: 'pup_gang_member', x: 10, y: 10, hp: 30 }
        ],
        items: [
          { id: 'diamond_shard', x: 12, y: 12 }
        ]
      };

      // Emit ChunkEntered event
      eventBus.emit('ChunkEntered', {
        chunk: { x: 0, y: 1 },
        state: mockState
      });

      // Move state to the new chunk
      mockState.cx = 0;
      mockState.cy = 1;

      // Verify spawns were added to chunk
      expect(mockState.chunk.monsters).toHaveLength(1);
      expect(mockState.chunk.monsters[0].type).toBe('pup_gang_member');
      expect(mockState.chunk.items).toHaveLength(1);
      expect(mockState.chunk.items[0].id).toBe('diamond_shard');
      
      // Verify spawns were cleared
      expect(mockState.questSpawns['0,1']).toBeUndefined();
    });

    it('should handle location-specific spawns', () => {
      // Setup Pup Gang spawn
      mockState.questSpawns.pupGang = [
        { type: 'jake_jr', x: 10, y: 10, hp: 35 },
        { type: 'tv', x: 11, y: 10, hp: 30 }
      ];

      // Emit ChunkEntered for convenience store area
      eventBus.emit('ChunkEntered', {
        chunk: { x: 0, y: 1 },
        state: mockState
      });

      // Verify Pup Gang was spawned
      expect(mockState.chunk.monsters).toHaveLength(2);
      expect(mockState.chunk.monsters[0].type).toBe('jake_jr');
      expect(mockState.chunk.monsters[1].type).toBe('tv');
      expect(mockState.questSpawns.pupGang).toBeUndefined();
    });
  });

  describe('QuestStarted event integration', () => {
    it('should prepare spawns when quest starts', () => {
      // Register a quest spawn config
      questSpawner.registerSpawnConfig('diamond_heist', {
        chunkKey: '0,1',
        spawns: {
          monsters: [
            { type: 'guard', x: 5, y: 5 }
          ],
          items: [
            { id: 'stolen_diamonds', x: 10, y: 10 }
          ]
        }
      });

      // Emit QuestStarted event
      eventBus.emit('QuestStarted', {
        questId: 'diamond_heist',
        state: mockState
      });

      // Verify spawns were prepared
      expect(mockState.questSpawns['0,1']).toBeDefined();
      expect(mockState.questSpawns['0,1'].monsters).toHaveLength(1);
      expect(mockState.questSpawns['0,1'].items).toHaveLength(1);
    });

    it('should handle multiple location quests', () => {
      // Register quest with multiple locations
      questSpawner.registerSpawnConfig('forest_investigation', {
        multipleLocations: [
          {
            chunkKey: '0,-1',
            spawns: {
              monsters: [{ type: 'cotton_candy_wolf' }]
            }
          },
          {
            chunkKey: '1,-1',
            spawns: {
              harvestables: [{ type: 'cotton_candy' }]
            }
          }
        ]
      });

      // Start quest
      eventBus.emit('QuestStarted', {
        questId: 'forest_investigation',
        state: mockState
      });

      // Verify multiple spawns were prepared
      expect(mockState.questSpawns['0,-1']).toBeDefined();
      expect(mockState.questSpawns['0,-1'].monsters).toHaveLength(1);
      expect(mockState.questSpawns['1,-1']).toBeDefined();
      expect(mockState.questSpawns['1,-1'].harvestables).toHaveLength(1);
    });
  });

  describe('QuestCompleted event integration', () => {
    it('should cleanup remaining spawns when quest completes', () => {
      // Setup quest config
      questSpawner.registerSpawnConfig('test_quest', {
        chunkKey: '1,1',
        multipleLocations: [
          { chunkKey: '2,2', spawns: { monsters: [] } },
          { chunkKey: '3,3', spawns: { items: [] } }
        ]
      });

      // Add spawns to state
      mockState.questSpawns = {
        '1,1': { monsters: [] },
        '2,2': { monsters: [] },
        '3,3': { items: [] },
        '4,4': { monsters: [] } // This one shouldn't be cleaned
      };

      // Complete quest
      eventBus.emit('QuestCompleted', {
        questId: 'test_quest',
        state: mockState
      });

      // Verify correct spawns were cleaned
      expect(mockState.questSpawns['1,1']).toBeUndefined();
      expect(mockState.questSpawns['2,2']).toBeUndefined();
      expect(mockState.questSpawns['3,3']).toBeUndefined();
      expect(mockState.questSpawns['4,4']).toBeDefined(); // Should remain
    });
  });

  describe('Event cascades', () => {
    it('should emit QuestContentSpawned after spawning', () => {
      const spawnedSpy = vi.fn();
      eventBus.on('QuestContentSpawned', spawnedSpy);

      mockState.questSpawns['0,0'] = {
        monsters: [{ type: 'skeleton' }]
      };

      eventBus.emit('ChunkEntered', {
        chunk: { x: 0, y: 0 },
        state: mockState
      });

      expect(spawnedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkKey: '0,0',
          spawns: expect.objectContaining({
            monsters: expect.arrayContaining([{ type: 'skeleton' }])
          })
        }),
        expect.any(Object)
      );
    });

    it('should emit LocationSpawned for special locations', () => {
      const locationSpy = vi.fn();
      eventBus.on('LocationSpawned', locationSpy);

      // Setup Cotton Candy Forest spawn
      mockState.forestSpawns = {
        monsters: [{ type: 'cotton_candy_wolf' }]
      };

      eventBus.emit('ChunkEntered', {
        chunk: { x: 0, y: -1 },
        state: mockState
      });

      expect(locationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'cottonCandyForest',
          chunk: { x: 0, y: -1 }
        }),
        expect.any(Object)
      );
    });
  });

  describe('Backward compatibility', () => {
    it('should handle legacy array format for monster spawns', () => {
      // Legacy format - just an array of monsters
      mockState.questSpawns['0,0'] = [
        { type: 'goblin', x: 5, y: 5 },
        { type: 'goblin', x: 6, y: 5 }
      ];

      questSpawner.checkAndSpawn(mockState, 0, 0);

      expect(mockState.chunk.monsters).toHaveLength(2);
      expect(mockState.chunk.monsters[0].type).toBe('goblin');
    });

    it('should handle special location spawns', () => {
      // Test all special locations
      const locations = [
        { coords: [0, 1], spawn: 'pupGang', monsters: [{ type: 'jake_jr' }] },
        { coords: [-1, 1], spawn: 'licoriceWoodsSpawns', data: { monsters: [{ type: 'bandit' }] } },
        { coords: [0, -1], spawn: 'forestSpawns', data: { monsters: [{ type: 'wolf' }] } },
        { coords: [-1, 0], spawn: 'caveSpawns', data: { harvestables: [{ type: 'crystal' }] } },
        { coords: [2, 0], spawn: 'estateSpawns', data: { monsters: [{ type: 'guard' }] } }
      ];

      locations.forEach(loc => {
        // Reset chunk
        mockState.chunk.monsters = [];
        mockState.chunk.harvestables = [];
        
        // Setup spawn
        if (loc.spawn === 'pupGang') {
          mockState.questSpawns = { pupGang: loc.monsters };
        } else {
          mockState[loc.spawn] = loc.data;
        }
        
        // Trigger spawn
        questSpawner.handleLocationSpawns(mockState, loc.coords[0], loc.coords[1]);
        
        // Verify
        if (loc.data?.harvestables) {
          expect(mockState.chunk.harvestables).toHaveLength(1);
        } else {
          expect(mockState.chunk.monsters.length).toBeGreaterThan(0);
        }
        
        // Verify cleanup
        if (loc.spawn === 'pupGang') {
          expect(mockState.questSpawns.pupGang).toBeUndefined();
        } else {
          expect(mockState[loc.spawn]).toBeUndefined();
        }
      });
    });
  });

  describe('hasSpawnsPending', () => {
    it('should detect pending spawns', () => {
      mockState.questSpawns['0,0'] = { monsters: [] };
      expect(questSpawner.hasSpawnsPending(mockState, 0, 0)).toBe(true);
      expect(questSpawner.hasSpawnsPending(mockState, 1, 1)).toBe(false);
    });

    it('should detect location-specific pending spawns', () => {
      mockState.questSpawns.pupGang = [];
      expect(questSpawner.hasSpawnsPending(mockState, 0, 1)).toBe(true);
      
      mockState.forestSpawns = {};
      expect(questSpawner.hasSpawnsPending(mockState, 0, -1)).toBe(true);
    });
  });
});