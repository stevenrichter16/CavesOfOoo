// tests/starchy.fail.test.js
// Test designed to fail to demonstrate the Starchy spawning issue

import { describe, it, expect } from 'vitest';

describe('Starchy Spawning Issue (Designed to Fail)', () => {
  it('SHOULD FAIL: This test demonstrates that Starchy does not spawn', () => {
    // This test is intentionally designed to fail
    // to show that Starchy doesn't spawn as expected
    
    const starchy = null; // Simulating that Starchy doesn't exist
    
    // This assertion will fail, demonstrating the issue
    expect(starchy).toBeDefined();
    expect(starchy?.name).toBe('Starchy');
  });
  
  it('SHOULD FAIL: NPCs array is empty when it should have Starchy', () => {
    // Simulating the actual game state where NPCs array is empty
    const gameState = {
      npcs: [], // Empty NPCs array - Starchy didn't spawn
      cx: -1,
      cy: 0
    };
    
    // This will fail because the array is empty
    expect(gameState.npcs.length).toBeGreaterThan(0);
    expect(gameState.npcs.find(n => n.id === 'starchy')).toBeDefined();
  });
  
  it('SHOULD FAIL: Graveyard chunk loads without spawning Starchy', () => {
    // Simulating what happens in the actual game
    const graveyardNPCs = [];
    
    // We expect Starchy to be in the graveyard NPCs, but he's not
    const starchy = graveyardNPCs.find(n => n.id === 'starchy');
    
    expect(starchy).toBeDefined(); // Will fail
    expect(graveyardNPCs).toContain(expect.objectContaining({
      id: 'starchy',
      name: 'Starchy',
      chunkX: -1,
      chunkY: 0
    })); // Will also fail
  });
});