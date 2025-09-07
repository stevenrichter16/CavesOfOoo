import { describe, it, expect } from 'vitest';
import { NPC } from '../../src/social/npc.js';

describe('NPC Properties Test', () => {
  it('should store position and chunk coordinates', () => {
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
    
    console.log('NPC created:', {
      id: npc.id,
      name: npc.name,
      x: npc.x,
      y: npc.y,
      hp: npc.hp,
      chunkX: npc.chunkX,
      chunkY: npc.chunkY,
      hasHp: 'hp' in npc,
      hasChunkX: 'chunkX' in npc,
      hasChunkY: 'chunkY' in npc
    });
    
    expect(npc.x).toBe(6);
    expect(npc.y).toBe(5);
    expect(npc.hp).toBe(100);
    expect(npc.chunkX).toBe(0);
    expect(npc.chunkY).toBe(0);
    
    // Test the find operation
    const npcs = [npc];
    const targetX = 6;
    const targetY = 5;
    const cx = 0;
    const cy = 0;
    
    const found = npcs.find(n => {
      console.log('Checking NPC:', {
        name: n.name,
        xMatch: n.x === targetX,
        yMatch: n.y === targetY,
        hpOk: n.hp > 0,
        chunkXMatch: n.chunkX === cx,
        chunkYMatch: n.chunkY === cy
      });
      return n.x === targetX && 
             n.y === targetY && 
             n.hp > 0 &&
             n.chunkX === cx &&
             n.chunkY === cy;
    });
    
    expect(found).toBeDefined();
    expect(found).toBe(npc);
  });
});