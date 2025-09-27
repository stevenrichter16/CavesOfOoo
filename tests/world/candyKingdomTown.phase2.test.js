import { describe, it, expect } from 'vitest';
import { generateCandyKingdomTownChunk } from '../../src/js/world/candyKingdomTown.js';

describe('Candy Kingdom town tile IDs', () => {
  it('stores tile IDs for building walls', () => {
    const chunk = generateCandyKingdomTownChunk(123, 0, 0);
    expect(chunk).toBeTruthy();
    expect(chunk.tileIds).toBeDefined();
    // Known building corner at (6,15) after autotiling
    expect(chunk.tileIds[15][6]).toBe('wall.brick.corner.top_left');
    // Horizontal span along top edge should use edge ID
    expect(chunk.tileIds[15][7]).toBe('wall.brick.edge.horizontal');
    // Market fixtures should map to descriptive tile IDs
    expect(chunk.tileIds[4][5]).toBe('structure.market.stall.canopy');
    expect(chunk.tileIds[5][5]).toBe('furniture.bench.horizontal');
  });

  it('preserves doors and produces correct edge tiles around entrances', () => {
    const chunk = generateCandyKingdomTownChunk(123, 0, 0);
    const { map, tileIds } = chunk;

    // Library entrance at (6,16) should remain a door glyph and tile id
    expect(map[16][6]).toBe('+');
    expect(tileIds[16][6]).toBe('door.closed');

    // Tiles adjacent to the doorway should retain walkable floors, with walls wrapping vertically
    expect(tileIds[16][5]).toBe('floor.default');
    expect(tileIds[16][7]).toBe('floor.default');
    expect(tileIds[15][6]).toBe('wall.brick.corner.top_left');
    expect(tileIds[17][6]).toBe('wall.brick.edge.vertical');
  });

  it('produces a rectangular map matching chunk dimensions', () => {
    const chunk = generateCandyKingdomTownChunk(123, 0, 0);
    const { map, tileIds } = chunk;

    expect(map.length).toBe(22);
    expect(tileIds.length).toBe(22);

    map.forEach((row, y) => {
      expect(row).toBeDefined();
      expect(row.length).toBe(48);
      row.forEach((glyph, x) => {
        expect(typeof glyph).toBe('string');
        expect(glyph.length).toBeGreaterThan(0);
        expect(tileIds[y][x]).toBeDefined();
      });
    });
  });
});
