import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { W, H } from '../../src/js/core/config.js';

describe('Phase 8: Movement Integration Debug', () => {
  it('should detect NPC and cancel movement', async () => {
    const eventBus = new EventBus();
    const pipeline = new MovementPipeline(eventBus);
    
    const player = {
      x: 5,
      y: 5,
      hp: 100,
      name: 'Finn'
    };
    
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
    
    const map = Array(H).fill(null).map(() => Array(W).fill('.'));
    
    const state = {
      player: player,
      cx: 0,
      cy: 0,
      chunk: {
        map: map,
        kingdomId: 'candy',
        lawLevel: 0.8
      },
      npcs: [npc],
      log: vi.fn(),
      openNPCInteraction: vi.fn()
    };
    
    // Log NPC search
    console.log('Looking for NPC at (6, 5) in chunk (0, 0)');
    console.log('NPCs in state:', state.npcs.map(n => ({
      name: n.name,
      x: n.x,
      y: n.y,
      chunkX: n.chunkX,
      chunkY: n.chunkY,
      hp: n.hp
    })));
    
    let interactionFired = false;
    let interactionData = null;
    eventBus.on('NPCInteraction', (data) => {
      console.log('NPCInteraction fired with:', data);
      interactionFired = true;
      interactionData = data;
    });
    
    const action = { type: 'move', dx: 1, dy: 0 };
    const result = await pipeline.execute(state, action);
    
    console.log('Result:', {
      success: result.success,
      moved: result.moved,
      interacted: result.interacted,
      attacked: result.attacked,
      reason: result.reason
    });
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('NPC interaction');
    expect(result.interacted).toBe(true);
    expect(interactionFired).toBe(true);
  });
});