import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { W, H } from '../../src/js/core/config.js';

describe('Phase 8: Simple Movement Test', () => {
  it('should detect NPC collision', async () => {
    console.log('Starting test...');
    const eventBus = new EventBus();
    const pipeline = new MovementPipeline(eventBus);
    
    // Create map
    const map = Array(H).fill(null).map(() => Array(W).fill('.'));
    
    // Create player at (5, 5)
    const player = {
      x: 5,
      y: 5,
      hp: 100,
      name: 'Finn'
    };
    
    // Create NPC at (6, 5) - right of player
    const npc = new NPC({
      id: 'test_npc',
      name: 'Test NPC',
      x: 6,
      y: 5,
      hp: 100,
      chunkX: 0,
      chunkY: 0,
      factions: ['candy_citizens']
    });
    
    // NPC needs to be alive for interaction
    npc.hp = 100;
    
    // Create state with proper chunk coordinates
    const state = {
      player: player,
      cx: 0,  // Current chunk X
      cy: 0,  // Current chunk Y
      chunk: { 
        map: map,
        cx: 0,  // Chunk's own coordinates
        cy: 0
      },
      npcs: [npc],
      log: vi.fn(),
      openNPCInteraction: vi.fn()  // Add this for interaction handling
    };
    
    // Debug: Verify NPC is in the right place
    console.log('Initial state setup:');
    console.log('- Player at:', player.x, player.y);
    console.log('- NPC at:', npc.x, npc.y);
    console.log('- NPC chunk:', npc.chunkX, npc.chunkY);
    console.log('- State chunk:', state.cx, state.cy);
    
    // Track if NPCInteraction event fired
    let interactionFired = false;
    let interactionData = null;
    eventBus.on('NPCInteraction', (data) => {
      interactionFired = true;
      interactionData = data;
    });
    
    // First, let's manually check if we can find the NPC
    const targetX = player.x + 1;
    const targetY = player.y;
    console.log('Looking for NPC at target position:', targetX, targetY);
    
    const foundNpc = state.npcs?.find(n => 
      n.x === targetX && 
      n.y === targetY && 
      n.hp > 0 &&
      n.chunkX === state.cx &&
      n.chunkY === state.cy
    );
    
    console.log('Found NPC manually?', !!foundNpc);
    if (foundNpc) {
      console.log('Found NPC details:', {
        name: foundNpc.name,
        position: { x: foundNpc.x, y: foundNpc.y },
        chunk: { x: foundNpc.chunkX, y: foundNpc.chunkY },
        hp: foundNpc.hp
      });
    }
    
    // Try to move right into NPC
    const action = { type: 'move', dx: 1, dy: 0 };
    
    let result;
    try {
      console.log('About to execute pipeline...');
      result = await pipeline.execute(state, action);
      console.log('Pipeline executed successfully');
    } catch (error) {
      console.error('Pipeline execution error:', error);
      throw error;
    }
    
    // Make sure result is defined
    if (!result) {
      console.error('Result is undefined!');
      throw new Error('Pipeline.execute returned undefined');
    }
    
    console.log('Movement result:', {
      success: result.success,
      cancelled: result.cancelled,
      interacted: result.interacted,
      attacked: result.attacked,
      reason: result.reason,
      step: result.step
    });
    
    console.log('NPCs in state:', state.npcs);
    console.log('NPC position:', { x: npc.x, y: npc.y, chunkX: npc.chunkX, chunkY: npc.chunkY });
    console.log('Target position:', { x: 6, y: 5 });
    console.log('State chunk coords:', { cx: state.cx, cy: state.cy });
    console.log('Interaction fired:', interactionFired);
    if (interactionData) {
      console.log('Interaction data:', interactionData);
    }
    
    // Check results
    console.log('Full result object:', JSON.stringify(result, null, 2));
    
    // First check if result exists
    expect(result).toBeDefined();
    
    // Check if interaction was fired
    if (!interactionFired) {
      console.log('Interaction was not fired!');
      console.log('Result:', result);
    }
    
    expect(interactionFired).toBe(true);
    
    // Movement should have been cancelled due to NPC interaction
    expect(result.success).toBe(false);
    expect(result.reason).toBe('NPC interaction');
    
    // Should be interaction OR attack
    const wasHandled = result.interacted || result.attacked;
    expect(wasHandled).toBe(true);
  });
});