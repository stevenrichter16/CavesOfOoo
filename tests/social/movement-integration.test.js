import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { NPCMovementExecutor } from '../../src/social/movement/NPCMovementExecutor.js';
import { clearAllCaches } from '../../src/social/relationCache.js';

describe('NPC Movement Integration', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('NPC Position Tracking', () => {
    it('should initialize NPC with position properties', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['banana_guard'],
        x: 10,
        y: 15,
        chunkX: 0,
        chunkY: 0
      });

      expect(npc.x).toBe(10);
      expect(npc.y).toBe(15);
      expect(npc.chunkX).toBe(0);
      expect(npc.chunkY).toBe(0);
    });

    it('should have default position if not specified', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['candy_citizens']
      });

      expect(npc.x).toBe(0);
      expect(npc.y).toBe(0);
      expect(npc.chunkX).toBe(0);
      expect(npc.chunkY).toBe(0);
    });

    it('should track movement history', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['banana_guard'],
        x: 5,
        y: 5
      });

      npc.moveTo(6, 5);
      expect(npc.x).toBe(6);
      expect(npc.y).toBe(5);
      expect(npc.lastX).toBe(5);
      expect(npc.lastY).toBe(5);
    });
  });

  describe('NPCMovementExecutor', () => {
    let executor;
    let mockState;

    beforeEach(() => {
      executor = new NPCMovementExecutor();
      mockState = {
        player: { x: 10, y: 10 },
        npcs: [],
        map: Array(20).fill(null).map(() => Array(20).fill(0)),
        cx: 0,
        cy: 0
      };
    });

    describe('Patrol Behavior', () => {
      it('should move guard NPC on patrol route', () => {
        const guard = new NPC({
          id: 'guard-1',
          factions: ['banana_guard'],
          x: 5,
          y: 5
        });

        mockState.npcs.push(guard);
        
        // Execute patrol movement
        executor.executeNPCTurn(guard, mockState, { timeOfDay: 'night' });

        // Guard should have moved (patrol pattern)
        expect(guard.x !== 5 || guard.y !== 5).toBe(true);
        expect(Math.abs(guard.x - 5) <= 1).toBe(true); // Within 1 tile
        expect(Math.abs(guard.y - 5) <= 1).toBe(true);
      });

      it('should avoid obstacles during patrol', () => {
        const guard = new NPC({
          id: 'guard-1',
          factions: ['banana_guard'],
          x: 5,
          y: 5
        });

        // Add walls around guard
        mockState.map[4][5] = 1; // Wall west
        mockState.map[6][5] = 1; // Wall east
        mockState.map[5][4] = 1; // Wall north
        // South is open

        mockState.npcs.push(guard);
        executor.executeNPCTurn(guard, mockState, { timeOfDay: 'night' });

        // Should move south (only open direction)
        expect(guard.x).toBe(5);
        expect(guard.y).toBe(6);
      });

      it('should stay within patrol area boundaries', () => {
        const guard = new NPC({
          id: 'guard-1',
          factions: ['banana_guard'],
          x: 10,
          y: 10,
          patrolCenter: { x: 10, y: 10 },
          patrolRadius: 3
        });

        mockState.npcs.push(guard);
        
        // Execute multiple patrol movements
        for (let i = 0; i < 10; i++) {
          executor.executeNPCTurn(guard, mockState, { timeOfDay: 'night' });
        }

        // Should stay within patrol radius
        const distance = Math.sqrt(
          Math.pow(guard.x - 10, 2) + 
          Math.pow(guard.y - 10, 2)
        );
        expect(distance).toBeLessThanOrEqual(3);
      });
    });

    describe('Flee Behavior', () => {
      it('should move citizen away from threat', () => {
        const citizen = new NPC({
          id: 'citizen-1',
          factions: ['candy_citizens'],
          x: 8,
          y: 8
        });

        const threat = new NPC({
          id: 'bandit-1',
          factions: ['bandits'],
          x: 10,
          y: 10
        });

        mockState.npcs.push(citizen, threat);
        
        // Execute flee movement
        executor.executeNPCTurn(citizen, mockState);

        // Citizen should move away from threat
        const oldDistance = Math.sqrt(4 + 4); // Was 2 tiles away
        const newDistance = Math.sqrt(
          Math.pow(citizen.x - 10, 2) + 
          Math.pow(citizen.y - 10, 2)
        );
        expect(newDistance).toBeGreaterThan(oldDistance);
      });

      it('should flee toward safe areas', () => {
        const citizen = new NPC({
          id: 'citizen-1',
          factions: ['candy_citizens'],
          x: 10,
          y: 10
        });

        const guard = new NPC({
          id: 'guard-1',
          factions: ['banana_guard'],
          x: 5,
          y: 5
        });

        const threat = new NPC({
          id: 'bandit-1',
          factions: ['bandits'],
          x: 15,
          y: 15
        });

        mockState.npcs.push(citizen, guard, threat);
        executor.executeNPCTurn(citizen, mockState);

        // Should move toward guard (safe area)
        const distanceToGuard = Math.sqrt(
          Math.pow(citizen.x - 5, 2) + 
          Math.pow(citizen.y - 5, 2)
        );
        expect(distanceToGuard).toBeLessThan(7.07); // Was ~7.07 away
      });
    });

    describe('Trade/Approach Behavior', () => {
      it('should move merchant toward player for trade', () => {
        const merchant = new NPC({
          id: 'merchant-1',
          factions: ['candy_merchants'],
          x: 5,
          y: 5
        });

        mockState.npcs.push(merchant);
        executor.executeNPCTurn(merchant, mockState, { timeOfDay: 'day' });

        // Should move toward player
        const oldDistance = Math.sqrt(25 + 25);
        const newDistance = Math.sqrt(
          Math.pow(merchant.x - 10, 2) + 
          Math.pow(merchant.y - 10, 2)
        );
        expect(newDistance).toBeLessThan(oldDistance);
      });

      it('should stop at interaction distance', () => {
        const merchant = new NPC({
          id: 'merchant-1',
          factions: ['candy_merchants'],
          x: 9,
          y: 9
        });

        mockState.npcs.push(merchant);
        executor.executeNPCTurn(merchant, mockState, { timeOfDay: 'day' });

        // Should stay close but not on same tile
        const distance = Math.sqrt(
          Math.pow(merchant.x - 10, 2) + 
          Math.pow(merchant.y - 10, 2)
        );
        expect(distance).toBeGreaterThanOrEqual(1);
        expect(distance).toBeLessThanOrEqual(2);
      });
    });

    describe('Movement Validation', () => {
      it('should not move through walls', () => {
        const npc = new NPC({
          id: 'test-npc',
          factions: ['candy_citizens'],
          x: 5,
          y: 5
        });

        mockState.map[6][5] = 1; // Wall to the east
        mockState.npcs.push(npc);

        // Try to move east (toward player at 10,10)
        const result = executor.validateMove(npc, 6, 5, mockState);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('blocked');
      });

      it('should not move onto other NPCs', () => {
        const npc1 = new NPC({
          id: 'npc-1',
          factions: ['candy_citizens'],
          x: 5,
          y: 5
        });

        const npc2 = new NPC({
          id: 'npc-2',
          factions: ['candy_merchants'],
          x: 6,
          y: 5
        });

        mockState.npcs.push(npc1, npc2);

        const result = executor.validateMove(npc1, 6, 5, mockState);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('occupied');
      });

      it('should respect movement costs from terrain', () => {
        const npc = new NPC({
          id: 'ice-guard',
          factions: ['ice_guards'],
          kingdomId: 'ice',
          x: 5,
          y: 5
        });

        mockState.terrain = Array(20).fill(null).map(() => Array(20).fill('grass'));
        mockState.terrain[5][6] = 'ice'; // Ice terrain to the south
        mockState.terrain[6][5] = 'lava'; // Lava to the east

        mockState.npcs.push(npc);

        const iceCost = executor.getMovementCost(npc, 5, 6, mockState);
        const lavaCost = executor.getMovementCost(npc, 6, 5, mockState);

        // Ice guard prefers ice over lava
        expect(iceCost).toBeLessThan(lavaCost);
      });
    });

    describe('Multi-faction Movement', () => {
      it('should blend movement behaviors for multi-faction NPCs', () => {
        const hybridNPC = new NPC({
          id: 'merchant-guard',
          factions: ['banana_guard', 'candy_merchants'],
          factionWeights: {
            'banana_guard': 0.4,
            'candy_merchants': 0.6
          },
          x: 5,
          y: 5
        });

        mockState.npcs.push(hybridNPC);
        
        // During day, should prioritize trade (merchant behavior)
        executor.executeNPCTurn(hybridNPC, mockState, { timeOfDay: 'day' });
        
        // Should move toward player for trade
        const distance = Math.sqrt(
          Math.pow(hybridNPC.x - 10, 2) + 
          Math.pow(hybridNPC.y - 10, 2)
        );
        expect(distance).toBeLessThan(7.07); // Moved closer
      });
    });

    describe('Performance', () => {
      it('should handle 100+ NPCs efficiently', () => {
        // Create 100 NPCs
        for (let i = 0; i < 100; i++) {
          mockState.npcs.push(new NPC({
            id: `npc-${i}`,
            factions: ['candy_citizens'],
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20)
          }));
        }

        const start = performance.now();
        
        // Process all NPC turns
        for (const npc of mockState.npcs) {
          executor.executeNPCTurn(npc, mockState);
        }
        
        const elapsed = performance.now() - start;
        
        // Should process 100 NPCs in under 100ms
        expect(elapsed).toBeLessThan(100);
      });
    });
  });

  describe('Movement Pipeline Integration', () => {
    it('should detect bandits as hostile to player', () => {
      const { isNPCHostileToPlayer } = require('../../src/social/movement/MovementAdapter.js');
      
      const bandit = new NPC({
        id: 'bandit-1', 
        factions: ['bandits'],
        x: 11,
        y: 10
      });
      
      const state = {
        player: { factions: ['player'] },
        currentKingdom: 'candy'
      };
      
      expect(isNPCHostileToPlayer(state, bandit)).toBe(true);
    });
    
    it.skip('should use new faction system for hostility checks', async () => {
      const { MovementPipeline } = await import('../../src/js/movement/MovementPipeline.js');
      const pipeline = new MovementPipeline();
      
      const guard = new NPC({
        id: 'guard-1',
        factions: ['banana_guard'],
        x: 11,
        y: 10,
        chunkX: 0,
        chunkY: 0,
        hp: 100
      });

      const bandit = new NPC({
        id: 'bandit-1', 
        factions: ['bandits'],
        x: 11,
        y: 10,
        chunkX: 0,
        chunkY: 0,
        hp: 100
      });

      const state = {
        player: { x: 10, y: 10, factions: ['player'] },
        npcs: [guard, bandit],
        cx: 0,
        cy: 0
      };

      // Try to move onto guard (should be non-hostile)
      const guardResult = await pipeline.execute(state, { 
        type: 'move', 
        dx: 1, 
        dy: 0 
      });
      expect(guardResult.success).toBe(true);

      // Try to move onto bandit (should be hostile)
      state.npcs = [bandit];
      const banditResult = await pipeline.execute(state, { 
        type: 'move', 
        dx: 1, 
        dy: 0 
      });
      
      // Check if it's a movement success but should be combat
      expect(banditResult.combat || banditResult.attacked).toBe(true);
    });
  });
});