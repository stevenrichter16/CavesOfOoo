import { describe, it, expect } from 'vitest';
import { getCandyTileSpriteConfig } from '../../src/js/sprites/qudSprites.js';

describe('Candy Kingdom tile sprite resolution', () => {
  it('resolves sprite sources from the tile registry when tile id is provided', () => {
    const config = getCandyTileSpriteConfig('wall.brick.corner.top_left');
    expect(config).toBeTruthy();
    expect(config?.sources).toContain('Walls/brick-corner-top-left.png');
    expect(config?.fit).toBe('fill');
  });

  it('falls back to glyph lookup when tile id is missing', () => {
    const config = getCandyTileSpriteConfig(null, '┘');
    expect(config?.sources).toContain('Walls/brick-corner-bottom-right.png');
  });

  it('returns special market sprite config for stall tiles', () => {
    const canopy = getCandyTileSpriteConfig('structure.market.stall.canopy');
    expect(canopy).toBeTruthy();
    expect(canopy?.type).toBe('marketSprite');
    expect(canopy?.name).toBe('canopyStall');

    const bench = getCandyTileSpriteConfig('furniture.bench.horizontal');
    expect(bench).toBeTruthy();
    expect(bench?.name).toBe('benchHorizontal');

    const fountain = getCandyTileSpriteConfig('decoration.fountain.center');
    expect(fountain?.name).toBe('fountainCenter');

    const barrel = getCandyTileSpriteConfig('container.barrel.candy');
    expect(barrel?.name).toBe('candyBarrel');
  });
});
