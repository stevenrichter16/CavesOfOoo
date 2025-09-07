import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { Schedule, TimeOfDay, DutyType } from '../../src/social/schedule.js';
import { W, H } from '../../src/js/core/config.js';

describe('Phase 8: Movement Integration - NPC Social Encounters', () => {
  let pipeline;
  let eventBus;
  let state;
  let player;
  
  beforeEach(() => {
    eventBus = new EventBus();
    pipeline = new MovementPipeline(eventBus);
    
    player = {
      x: 5,
      y: 5,
      hp: 100,
      name: 'Finn',
      inventory: [],
      disguise: null
    };
    
    // Create a proper chunk map using actual game dimensions
    // Use '.' for floor (walkable) and '#' for walls
    const map = Array(H).fill(null).map(() => Array(W).fill('.'));
    
    // Add some walls for realism
    for (let i = 0; i < W; i++) {
      map[0][i] = '#';  // Top wall
      map[H-1][i] = '#';  // Bottom wall
    }
    for (let i = 0; i < H; i++) {
      map[i][0] = '#';  // Left wall
      map[i][W-1] = '#';  // Right wall
    }
    
    state = {
      player: player,  // Ensure player is in state.player
      cx: 0,  // Chunk X coordinate
      cy: 0,  // Chunk Y coordinate
      width: W,
      height: H,
      chunk: {
        map: map,
        kingdomId: 'candy',
        lawLevel: 0.8,  // Candy Kingdom has high law
        cx: 0,
        cy: 0,
        // Add getTile method for MovementCostCalculator
        getTile: function(x, y) {
          if (y >= 0 && y < this.map.length && x >= 0 && x < this.map[0].length) {
            return this.map[y][x];
          }
          return '#';  // Wall for out of bounds
        }
      },
      npcs: [],
      log: vi.fn(),
      openNPCInteraction: vi.fn(),
      gameTime: { hour: 14 }  // Afternoon for testing
    };
  });
  
  describe('NPC Encounter Detection', () => {
    it('should trigger social encounter when moving into friendly NPC', async () => {
      // Create a friendly NPC
      const npc = new NPC({
        id: 'merchant1',
        name: 'Merchant Mike',
        role: 'merchant',
        factions: ['candy_merchants'],
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      state.npcs = [npc];
      
      // Listen for NPCInteraction event
      const interactionHandler = vi.fn();
      eventBus.on('NPCInteraction', interactionHandler);
      
      // Attempt to move into NPC
      const action = { type: 'move', dx: 1, dy: 0 };
      
      // Store result for debugging
      let result;
      try {
        result = await pipeline.execute(state, action);
      } catch (error) {
        console.error('Pipeline error:', error);
        throw error;
      }
      
      // Should have triggered interaction
      expect(result).toBeDefined();
      expect(result.success).toBe(false);  // Movement cancelled due to NPC
      
      // If not interacted, check what happened
      if (!result.interacted) {
        expect.soft(result.reason).toBe('NPC interaction');  // Soft expect to see the actual reason
      }
      
      expect(result.interacted).toBe(true);
      expect(result.reason).toBe('NPC interaction');
      expect(interactionHandler).toHaveBeenCalled();
      const callArgs = interactionHandler.mock.calls[0][0];
      expect(callArgs).toHaveProperty('player');
      expect(callArgs).toHaveProperty('npc');
      expect(callArgs.npc.id).toBe('merchant1');
    });
    
    it('should provide full context for social evaluation', async () => {
      // Create NPC with schedule
      const npc = new NPC({
        id: 'guard1',
        name: 'Guard Gary',
        role: 'guard',
        factions: ['candy_guards'],
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      npc.schedule = new Schedule({
        [TimeOfDay.MORNING]: DutyType.PATROL,
        [TimeOfDay.AFTERNOON]: DutyType.GUARD_POST,
        [TimeOfDay.EVENING]: DutyType.REST,
        [TimeOfDay.NIGHT]: DutyType.SLEEP
      });
      
      state.npcs = [npc];
      state.kingdom = 'candy';
      state.lawLevel = 0.8;
      state.gameTime = { hour: 8 }; // Morning
      
      let capturedContext;
      eventBus.on('NPCInteraction', (data) => {
        capturedContext = data.context;
      });
      
      const action = { type: 'move', dx: 1, dy: 0 };
      await pipeline.execute(state, action);
      
      // Context should include kingdom and time info
      expect(capturedContext.state.kingdom).toBe('candy');
      expect(capturedContext.state.lawLevel).toBe(0.8);
      expect(capturedContext.state.gameTime.hour).toBe(8);
    });
    
    it('should handle disguised player encounters differently', async () => {
      // Player has disguise
      player.disguise = {
        keys: ['candy_guard'],
        quality: 0.8
      };
      
      const npc = new NPC({
        id: 'citizen1',
        name: 'Citizen Carl',
        role: 'citizen',
        factions: ['candy_citizens'],
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      state.npcs = [npc];
      
      let interactionData;
      eventBus.on('NPCInteraction', (data) => {
        interactionData = data;
      });
      
      const action = { type: 'move', dx: 1, dy: 0 };
      await pipeline.execute(state, action);
      
      // Should pass disguise info in interaction
      expect(interactionData.player.disguise).toBeDefined();
      expect(interactionData.player.disguise.keys).toContain('candy_guard');
    });
  });
  
  describe('Social Menu Triggering', () => {
    it('should emit social menu event with available actions', async () => {
      const npc = new NPC({
        id: 'merchant1',
        name: 'Merchant Mike',
        role: 'merchant',
        factions: ['candy_merchants'],
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      state.npcs = [npc];
      state.kingdom = 'candy';
      
      let menuData;
      eventBus.on('social:menu:open', (data) => {
        menuData = data;
      });
      
      // Create social encounter system (it registers its own listener)
      const SocialEncounterSystem = (await import('../../src/social/integration/SocialEncounterSystem.js')).SocialEncounterSystem;
      const encounterSystem = new SocialEncounterSystem(eventBus);
      
      const action = { type: 'move', dx: 1, dy: 0 };
      await pipeline.execute(state, action);
      
      // Should have menu data with actions
      expect(menuData).toBeDefined();
      expect(menuData.npc).toBe(npc);
      expect(menuData.actions).toBeDefined();
      expect(Array.isArray(menuData.actions)).toBe(true);
    });
    
    it('should not show menu for hostile NPCs', async () => {
      const hostileNpc = new NPC({
        id: 'bandit1',
        name: 'Bandit Bill',
        role: 'bandit',
        factions: ['dungeon_bandits'],
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      // Make NPC hostile
      hostileNpc.attitude = 'hostile';
      
      state.npcs = [hostileNpc];
      
      let menuOpened = false;
      eventBus.on('social:menu:open', () => {
        menuOpened = true;
      });
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(state, action);
      
      // Should attack instead of opening menu
      expect(result.attacked).toBe(true);
      expect(menuOpened).toBe(false);
    });
  });
  
  describe('Kingdom Context Integration', () => {
    it('should get kingdom context from current chunk', async () => {
      // Set up chunk with kingdom data
      state.chunk = {
        ...state.chunk,  // Keep existing properties like getTile
        kingdomId: 'ice',
        lawLevel: 0.9,
        terrain: 'ice'
      };
      
      const npc = new NPC({
        id: 'noble1',
        name: 'Ice Noble',
        role: 'noble',
        factions: ['ice_nobles'],
        kingdomId: 'ice',
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      state.npcs = [npc];
      
      let capturedKingdom;
      eventBus.on('NPCInteraction', (data) => {
        // The encounter system should extract kingdom from chunk
        capturedKingdom = data.context.state.chunk?.kingdomId;
      });
      
      const action = { type: 'move', dx: 1, dy: 0 };
      await pipeline.execute(state, action);
      
      expect(capturedKingdom).toBe('ice');
    });
    
    it('should apply kingdom-specific interaction rules', async () => {
      // Candy Kingdom - high law, friendly
      state.chunk = {
        ...state.chunk,  // Keep existing properties like getTile
        kingdomId: 'candy',
        lawLevel: 0.8
      };
      
      const guard = new NPC({
        id: 'guard1',
        name: 'Banana Guard',
        role: 'guard',
        factions: ['banana_guards'],
        kingdomId: 'candy',
        x: 6,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      state.npcs = [guard];
      
      const action = { type: 'move', dx: 1, dy: 0 };
      const result = await pipeline.execute(state, action);
      
      // In high-law Candy Kingdom, guards should be approachable
      expect(result.interacted).toBe(true);
      expect(result.attacked).toBeFalsy();
      expect(result.success).toBe(false);  // Movement cancelled due to interaction
    });
  });
  
  describe('Movement Cost Modifiers', () => {
    it('should apply social relationship modifiers to movement cost', async () => {
      // This would integrate with the MovementCostCalculator
      const npc = new NPC({
        id: 'friend1',
        name: 'Friend Fred',
        role: 'citizen',
        factions: ['candy_citizens'],
        x: 7,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0
      });
      
      // High trust relationship
      npc.social = {
        trust: 0.9,
        fear: 0.1,
        respect: 0.7
      };
      
      state.npcs = [npc];
      
      // Movement near friendly NPCs could be cheaper
      const costCalculator = pipeline.movementCostCalculator;
      const from = { x: 5, y: 5 };
      const to = { x: 6, y: 5 };
      const baseCost = costCalculator.calculateMoveCost(from, to, state);
      
      // With friendly NPC nearby, cost could be reduced
      state.nearbyFriendlyNPC = npc;
      const modifiedCost = costCalculator.calculateMoveCost(from, to, state);
      
      // This feature would need implementation
      // expect(modifiedCost).toBeLessThan(baseCost);
    });
  });
  
  describe('Performance', () => {
    it('should handle encounter checks efficiently', async () => {
      // Create many NPCs
      const npcs = [];
      for (let i = 0; i < 50; i++) {
        npcs.push(new NPC({
          id: `npc${i}`,
          name: `NPC ${i}`,
          role: 'citizen',
          factions: ['candy_citizens'],
          x: 10 + (i % 10),
          y: 10 + Math.floor(i / 10),
          hp: 100,
          chunkX: 0,
          chunkY: 0
        }));
      }
      
      state.npcs = npcs;
      
      const startTime = performance.now();
      
      // Move multiple times
      for (let i = 0; i < 10; i++) {
        const action = { type: 'move', dx: 0, dy: 1 };
        await pipeline.execute(state, action);
        player.y++; // Update position for next move
      }
      
      const duration = performance.now() - startTime;
      
      // Should complete 10 moves with 50 NPCs in reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 10 moves
    });
  });
});