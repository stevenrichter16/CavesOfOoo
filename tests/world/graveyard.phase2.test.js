import { describe, it, expect } from 'vitest';
import { generateGraveyardChunk, GRAVEYARD_COORDS } from '../../src/js/world/graveyardChunk.js';

describe('Graveyard map tile ids', () => {
  it('exposes tileIds grid and registers walls', () => {
    const { x, y } = GRAVEYARD_COORDS;
    const chunk = generateGraveyardChunk(123, x, y);
    expect(chunk?.tileIds).toBeDefined();
    // Top border of graveyard should be wall
    expect(chunk.tileIds[0][0]).toBe('wall.stone.solid');
  });
});
