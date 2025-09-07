import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementPipeline } from '../../src/js/movement/MovementPipeline.js';
import { EventBus } from '../../src/js/systems/EventBus.js';

describe('Phase 8: Movement Debug Test', () => {
  it('should return a result object', async () => {
    const eventBus = new EventBus();
    const pipeline = new MovementPipeline(eventBus);
    
    // Minimal state
    const state = {
      player: { x: 5, y: 5, hp: 100 },
      chunk: { map: Array(22).fill(null).map(() => Array(48).fill('.')) },
      npcs: []
    };
    
    // Try to move
    const action = { type: 'move', dx: 1, dy: 0 };
    const result = await pipeline.execute(state, action);
    
    // Result should exist
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);  // Movement succeeded
    expect(result.moved).toBe(true);  // Player moved
  });
  
  it('should detect NPC at target position', async () => {
    const eventBus = new EventBus();
    const pipeline = new MovementPipeline(eventBus);
    
    // Create simple NPC object (not using NPC class)
    const npc = {
      id: 'test',
      name: 'Test NPC',
      x: 6,
      y: 5,
      hp: 100,
      chunkX: 0,
      chunkY: 0
    };
    
    const state = {
      player: { x: 5, y: 5, hp: 100 },
      cx: 0,
      cy: 0,
      chunk: { map: Array(22).fill(null).map(() => Array(48).fill('.')) },
      npcs: [npc],
      log: vi.fn()
    };
    
    let interactionFired = false;
    eventBus.on('NPCInteraction', () => {
      interactionFired = true;
    });
    
    // Try to move into NPC
    const action = { type: 'move', dx: 1, dy: 0 };
    const result = await pipeline.execute(state, action);
    
    // Should have detected NPC
    expect(result).toBeDefined();
    expect(result.success).toBe(false);  // Movement was cancelled
    expect(result.reason).toBe('NPC interaction');
    expect(result.interacted).toBe(true);
    expect(interactionFired).toBe(true);
  });
});