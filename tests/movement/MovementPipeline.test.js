import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

// Mock dependencies
vi.mock('../../src/js/utils/queries.js', () => ({
  entityAt: vi.fn(),
  isPassable: vi.fn(),
  tryEdgeTravel: vi.fn()
}));

vi.mock('../../src/js/combat/combat.js', () => ({
  attack: vi.fn()
}));

vi.mock('../../src/js/social/disguise.js', () => ({
  isNPCHostileToPlayer: vi.fn()
}));

vi.mock('../../src/js/combat/statusSystem.js', () => ({
  isFrozen: vi.fn()
}));

vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn()
}));

describe('MovementPipeline', () => {
  let pipeline;
  let eventBus;
  let mockState;
  let mockAction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    eventBus = new EventBus();
    pipeline = new MovementPipeline(eventBus);
    
    // Create a basic mock state
    mockState = {
      player: {
        x: 5,
        y: 5,
        hp: 10,
        hpMax: 10,
        inventory: []
      },
      chunk: {
        map: Array(10).fill(null).map(() => Array(10).fill('.')),
        items: [],
        monsters: []
      },
      npcs: [],
      cx: 0,
      cy: 0,
      log: vi.fn()
    };
    
    // Create a basic move action
    mockAction = {
      type: 'move',
      dx: 1,
      dy: 0
    };
  });

  describe('Pipeline creation and structure', () => {
    it('should create a pipeline with all expected steps', () => {
      expect(pipeline).toBeInstanceOf(MovementPipeline);
      expect(pipeline.steps).toHaveLength(11);
      
      const stepNames = pipeline.steps.map(s => s.name);
      expect(stepNames).toEqual([
        'validation',
        'preMove',
        'checkStatus',
        'checkCollisions',
        'handleNPC',
        'handleMonster',
        'checkTerrain',
        'handleItems',
        'applyMovement',
        'handleEdgeTransition',
        'postMove'
      ]);
    });

    it('should bind step handlers correctly', () => {
      pipeline.steps.forEach(step => {
        expect(typeof step.handler).toBe('function');
        // Bound functions will have the actual method name, not the step name
        expect(step.handler.name).toContain('bound');
      });
    });
  });

  describe('Context creation', () => {
    it('should create correct context from state and action', () => {
      const context = pipeline.createContext(mockState, mockAction);
      
      expect(context).toMatchObject({
        state: mockState,
        action: mockAction,
        player: mockState.player,
        fromX: 5,
        fromY: 5,
        targetX: 6,
        targetY: 5,
        cancelled: false,
        skipDefaultHandler: false,
        result: {
          success: true,
          moved: false,
          reason: null,
          step: null,
          interacted: false,
          attacked: false,
          pickedUpItems: [],
          changedChunk: false,
          metrics: {}
        },
        metrics: {}
      });
    });
  });

  describe('Validation step', () => {
    it('should pass valid move actions', async () => {
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.validateMove(context);
      
      expect(context.cancelled).toBe(false);
    });

    it('should cancel invalid action types', async () => {
      const invalidAction = { type: 'invalid', dx: 1, dy: 0 };
      const context = pipeline.createContext(mockState, invalidAction);
      await pipeline.validateMove(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.reason).toBe('Invalid move action');
    });

    it('should cancel missing movement deltas', async () => {
      const badAction = { type: 'move' };
      const context = pipeline.createContext(mockState, badAction);
      await pipeline.validateMove(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.reason).toBe('Invalid movement delta');
    });

    it('should cancel zero movement', async () => {
      const noMoveAction = { type: 'move', dx: 0, dy: 0 };
      const context = pipeline.createContext(mockState, noMoveAction);
      await pipeline.validateMove(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.reason).toBe('No movement');
    });
  });

  describe('Status effects step', () => {
    it('should block movement when frozen', async () => {
      const { isFrozen } = await import('../../src/js/combat/statusSystem.js');
      isFrozen.mockReturnValue(true);
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.checkStatusEffects(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.reason).toBe('Player is frozen');
      expect(mockState.log).toHaveBeenCalledWith("You're frozen and cannot move!", "bad");
    });

    it('should allow movement when not frozen', async () => {
      const { isFrozen } = await import('../../src/js/combat/statusSystem.js');
      isFrozen.mockReturnValue(false);
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.checkStatusEffects(context);
      
      expect(context.cancelled).toBe(false);
    });
  });

  describe('NPC interaction step', () => {
    it('should handle friendly NPC interaction', async () => {
      const { isNPCHostileToPlayer } = await import('../../src/js/social/disguise.js');
      isNPCHostileToPlayer.mockReturnValue(false);
      
      const npc = {
        x: 6,
        y: 5,
        hp: 10,
        name: 'Friendly NPC',
        chunkX: 0,
        chunkY: 0
      };
      mockState.npcs = [npc];
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleNPCInteraction(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.interacted).toBe(true);
      expect(context.result.reason).toBe('NPC interaction');
    });

    it('should attack hostile NPCs', async () => {
      const { isNPCHostileToPlayer } = await import('../../src/js/social/disguise.js');
      const { attack } = await import('../../src/js/combat/combat.js');
      isNPCHostileToPlayer.mockReturnValue(true);
      
      const hostileNpc = {
        x: 6,
        y: 5,
        hp: 10,
        name: 'Hostile NPC',
        chunkX: 0,
        chunkY: 0
      };
      mockState.npcs = [hostileNpc];
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleNPCInteraction(context);
      
      expect(attack).toHaveBeenCalledWith(mockState, mockState.player, hostileNpc);
      expect(context.cancelled).toBe(true);
      expect(context.result.attacked).toBe(true);
      expect(context.result.reason).toBe('Attacked hostile NPC');
    });

    it('should ignore NPCs not at target position', async () => {
      const npc = {
        x: 7, // Not at target position
        y: 5,
        hp: 10,
        name: 'Far NPC',
        chunkX: 0,
        chunkY: 0
      };
      mockState.npcs = [npc];
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleNPCInteraction(context);
      
      expect(context.cancelled).toBe(false);
    });
  });

  describe('Monster collision step', () => {
    it('should attack monster at target position', async () => {
      const { entityAt } = await import('../../src/js/utils/queries.js');
      const { attack } = await import('../../src/js/combat/combat.js');
      
      const monster = { name: 'Goober', hp: 5 };
      entityAt.mockReturnValue(monster);
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleMonsterCollision(context);
      
      expect(attack).toHaveBeenCalledWith(mockState, mockState.player, monster);
      expect(context.cancelled).toBe(true);
      expect(context.result.attacked).toBe(true);
      expect(context.result.reason).toBe('Monster collision');
    });

    it('should not attack if no monster at position', async () => {
      const { entityAt } = await import('../../src/js/utils/queries.js');
      entityAt.mockReturnValue(null);
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleMonsterCollision(context);
      
      expect(context.cancelled).toBe(false);
      expect(context.result.attacked).toBe(false);
    });
  });

  describe('Terrain passability step', () => {
    it('should allow movement to passable terrain', async () => {
      const { isPassable } = await import('../../src/js/utils/queries.js');
      isPassable.mockReturnValue(true);
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.checkTerrainPassability(context);
      
      expect(context.cancelled).toBe(false);
    });

    it('should block movement to impassable terrain', async () => {
      const { isPassable } = await import('../../src/js/utils/queries.js');
      isPassable.mockReturnValue(false);
      mockState.chunk.map[5][6] = '#'; // Wall
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.checkTerrainPassability(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.reason).toBe('Terrain not passable');
      expect(mockState.log).toHaveBeenCalledWith("You bump into a wall.", "note");
    });

    it('should handle locked doors', async () => {
      const { isPassable } = await import('../../src/js/utils/queries.js');
      isPassable.mockReturnValue(false);
      mockState.chunk.map[5][6] = '+'; // Locked door
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.checkTerrainPassability(context);
      
      expect(context.cancelled).toBe(true);
      expect(mockState.log).toHaveBeenCalledWith("The door is locked.", "note");
    });
  });

  describe('Item pickup step', () => {
    it('should detect items at target position', async () => {
      const item1 = { x: 6, y: 5, name: 'Sword' };
      const item2 = { x: 6, y: 5, name: 'Potion' };
      mockState.chunk.items = [item1, item2, { x: 7, y: 5, name: 'Other' }];
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleItemPickup(context);
      
      expect(context.itemsToPickup).toEqual([item1, item2]);
      expect(context.cancelled).toBe(false);
    });

    it('should not set items if none at position', async () => {
      mockState.chunk.items = [{ x: 7, y: 5, name: 'Far item' }];
      
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.handleItemPickup(context);
      
      expect(context.itemsToPickup).toBeUndefined();
    });
  });

  describe('Apply movement step', () => {
    it('should update player position', async () => {
      const context = pipeline.createContext(mockState, mockAction);
      await pipeline.applyMovement(context);
      
      expect(mockState.player.x).toBe(6);
      expect(mockState.player.y).toBe(5);
      expect(context.result.moved).toBe(true);
    });

    it('should pick up items after movement', async () => {
      const item = { x: 6, y: 5, name: 'Sword' };
      mockState.chunk.items = [item];
      
      const context = pipeline.createContext(mockState, mockAction);
      context.itemsToPickup = [item];
      await pipeline.applyMovement(context);
      
      expect(mockState.player.inventory).toContain(item);
      expect(context.result.pickedUpItems).toContain(item);
      expect(mockState.chunk.items).not.toContain(item);
      expect(mockState.log).toHaveBeenCalledWith('You pick up Sword.', 'good');
    });

    it('should not move if cancelled', async () => {
      const context = pipeline.createContext(mockState, mockAction);
      context.cancelled = true;
      const originalX = mockState.player.x;
      
      await pipeline.applyMovement(context);
      
      expect(mockState.player.x).toBe(originalX);
      expect(context.result.moved).toBe(false);
    });
  });

  describe('Edge transition step', () => {
    it('should handle successful edge transition', async () => {
      const { tryEdgeTravel } = await import('../../src/js/utils/queries.js');
      tryEdgeTravel.mockReturnValue(true);
      
      const context = pipeline.createContext(mockState, mockAction);
      context.isEdgeTransition = true;
      await pipeline.handleEdgeTransition(context);
      
      expect(context.result.moved).toBe(true);
      expect(context.result.changedChunk).toBe(true);
    });

    it('should handle failed edge transition', async () => {
      const { tryEdgeTravel } = await import('../../src/js/utils/queries.js');
      tryEdgeTravel.mockReturnValue(false);
      
      const context = pipeline.createContext(mockState, mockAction);
      context.isEdgeTransition = true;
      await pipeline.handleEdgeTransition(context);
      
      expect(context.cancelled).toBe(true);
      expect(context.result.reason).toBe('Edge transition failed');
      expect(mockState.log).toHaveBeenCalledWith("You can't go that way.", "note");
    });
  });

  describe('Full pipeline execution', () => {
    it('should execute all steps in order', async () => {
      const { isPassable } = await import('../../src/js/utils/queries.js');
      isPassable.mockReturnValue(true);
      
      const stepOrder = [];
      pipeline.steps.forEach(step => {
        const originalHandler = step.handler;
        step.handler = vi.fn(async (context) => {
          stepOrder.push(step.name);
          return originalHandler(context);
        });
      });
      
      await pipeline.execute(mockState, mockAction);
      
      expect(stepOrder).toEqual([
        'validation',
        'preMove',
        'checkStatus',
        'checkCollisions',
        'handleNPC',
        'handleMonster',
        'checkTerrain',
        'handleItems',
        'applyMovement',
        'handleEdgeTransition',
        'postMove'
      ]);
    });

    it('should stop execution when cancelled', async () => {
      const { isFrozen } = await import('../../src/js/combat/statusSystem.js');
      isFrozen.mockReturnValue(true); // Will cancel at checkStatus
      
      const stepsCalled = [];
      pipeline.steps.forEach(step => {
        const originalHandler = step.handler;
        step.handler = vi.fn(async (context) => {
          stepsCalled.push(step.name);
          return originalHandler(context);
        });
      });
      
      const result = await pipeline.execute(mockState, mockAction);
      
      expect(stepsCalled).toEqual([
        'validation',
        'preMove',
        'checkStatus' // Stops here
      ]);
      expect(result.success).toBe(false);
      expect(result.step).toBe('checkStatus');
    });

    it('should track metrics for each step', async () => {
      const { isPassable } = await import('../../src/js/utils/queries.js');
      isPassable.mockReturnValue(true);
      
      const result = await pipeline.execute(mockState, mockAction);
      
      // Check that metrics were recorded for steps that ran
      // When cancelled early, only steps up to cancellation are recorded
      expect(Object.keys(result.metrics).length).toBeGreaterThan(0);
      Object.values(result.metrics).forEach(metric => {
        expect(typeof metric).toBe('number');
        expect(metric).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Make a step throw an error
      pipeline.steps[2].handler = vi.fn(() => {
        throw new Error('Test error');
      });
      
      const result = await pipeline.execute(mockState, mockAction);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in movement step 'checkStatus'"),
        expect.any(Error)
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.step).toBe('checkStatus');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Terrain effects', () => {
    it('should handle water tiles', async () => {
      mockState.chunk.map[5][6] = '~';
      const context = pipeline.createContext(mockState, mockAction);
      context.player.x = 6; // Simulate being on water
      context.player.y = 5;
      
      await pipeline.handleTerrainEffects(context);
      
      // Water effects are handled by status system
      expect(context.cancelled).toBe(false); // Should not cancel
    });

    it('should handle spike damage', async () => {
      mockState.chunk.map[5][6] = '^';
      const context = pipeline.createContext(mockState, mockAction);
      context.player.x = 6;
      context.player.y = 5;
      
      await pipeline.handleTerrainEffects(context);
      
      expect(mockState.player.hp).toBe(9); // 10 - 1 damage
      expect(mockState.log).toHaveBeenCalledWith("Ouch! You step on spikes!", "bad");
    });
  });
});