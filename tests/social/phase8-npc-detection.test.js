import { describe, it, expect, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { W, H } from '../../src/js/core/config.js';

describe('NPC Detection Debug', () => {
  it('should find NPC at target position', () => {
    // Create NPC using the NPC class
    const npc = new NPC({
      id: 'test',
      name: 'Test NPC',
      factions: ['candy_citizens'],
      x: 6,
      y: 5,
      hp: 100,
      chunkX: 0,
      chunkY: 0
    });
    
    const state = {
      cx: 0,
      cy: 0,
      npcs: [npc]
    };
    
    // Simulate the check from MovementPipeline handleNPCInteraction
    const targetX = 6;
    const targetY = 5;
    
    const foundNpc = state.npcs?.find(n => 
      n.x === targetX && 
      n.y === targetY && 
      n.hp > 0 &&
      n.chunkX === state.cx &&
      n.chunkY === state.cy
    );
    
    console.log('NPC properties:', {
      x: npc.x,
      y: npc.y,
      hp: npc.hp,
      chunkX: npc.chunkX,
      chunkY: npc.chunkY
    });
    
    console.log('Found NPC:', !!foundNpc);
    
    expect(foundNpc).toBeDefined();
    expect(foundNpc).toBe(npc);
  });
  
  it('should work with MovementPipeline', async () => {
    const eventBus = new EventBus();
    const pipeline = new MovementPipeline(eventBus);
    
    // Override handleNPCInteraction to add logging
    const originalHandle = pipeline.handleNPCInteraction.bind(pipeline);
    pipeline.handleNPCInteraction = async function(context) {
      const { targetX, targetY, state } = context;
      console.log('handleNPCInteraction called');
      console.log('Target:', targetX, targetY);
      console.log('State cx/cy:', state.cx, state.cy);
      console.log('NPCs:', state.npcs?.length);
      
      if (state.npcs) {
        state.npcs.forEach(n => {
          console.log('  NPC:', n.name, 'at', n.x, n.y, 'chunk', n.chunkX, n.chunkY, 'hp', n.hp);
        });
      }
      
      const npc = state.npcs?.find(n => 
        n.x === targetX && 
        n.y === targetY && 
        n.hp > 0 &&
        n.chunkX === state.cx &&
        n.chunkY === state.cy
      );
      
      console.log('Found NPC?', !!npc);
      
      return originalHandle(context);
    };
    
    const player = { x: 5, y: 5, hp: 100 };
    const npc = new NPC({
      id: 'test',
      name: 'Test NPC',
      factions: ['candy_citizens'],
      x: 6,
      y: 5,
      hp: 100,
      chunkX: 0,
      chunkY: 0
    });
    
    const state = {
      player,
      cx: 0,
      cy: 0,
      chunk: { map: Array(H).fill(null).map(() => Array(W).fill('.')) },
      npcs: [npc],
      log: vi.fn()
    };
    
    const action = { type: 'move', dx: 1, dy: 0 };
    const result = await pipeline.execute(state, action);
    
    console.log('Final result:', result.success, result.reason);
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('NPC interaction');
  });
});