import { describe, it, expect } from 'vitest';
import { generateCandyMarketChunk, isMarketStall } from '../../src/js/world/candyMarketChunk.js';

describe('Candy Market map tile ids', () => {
  it('provides tileIds grid with wall tiles registered', () => {
    const chunk = generateCandyMarketChunk(123, 0, 0);
    expect(chunk?.tileIds).toBeDefined();
    // Pick top boundary tile
    expect(chunk.tileIds[0][1]).toBe('wall.stone.solid');
    // Market feature glyphs should map to descriptive tile IDs
    expect(chunk.tileIds[3][3]).toBe('structure.market.stall.canopy');
    expect(chunk.tileIds[3][8]).toBe('structure.market.stall.table');
  });

  it('recognizes market stall positions via tile ids', () => {
    const chunk = generateCandyMarketChunk(555, 0, 0);
    const state = { chunk, cx: 0, cy: 0 };
    expect(isMarketStall(state, 3, 3)).toBe(true);
    expect(isMarketStall(state, 8, 3)).toBe(true);
    expect(isMarketStall(state, 6, 6)).toBe(false);
  });
});
