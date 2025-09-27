import { describe, it, expect } from 'vitest';
import { createTileGrid, setTile, mapToTileIds } from '../../src/js/world/tileUtils.js';
import { getTileDef } from '../../src/js/world/TileRegistry.js';

describe('tileUtils', () => {
  it('sets tile glyph and id', () => {
    const { map, tileIds } = createTileGrid(3, 3, 'floor.default');
    setTile(map, tileIds, 1, 1, 'wall.brick.corner.top_left');
    expect(map[1][1]).toBe(getTileDef('wall.brick.corner.top_left').glyph);
    expect(tileIds[1][1]).toBe('wall.brick.corner.top_left');
  });

  it('maps glyph grid to tile ids using registry', () => {
    const map = [
      ['.', '#', '-'],
      ['┌', '─', '='],
      ['╬', '·', '□'],
      ['o', '∘', 'T'],
      ['C', '&', '*']
    ];
    const tileIds = mapToTileIds(map);
    expect(tileIds[0][0]).toBe('floor.default');
    expect(tileIds[0][1]).toBe('wall.stone.solid');
    expect(tileIds[0][2]).toBe('floor.candy.walkway');
    expect(tileIds[1][0]).toBe('wall.brick.corner.top_left');
    expect(tileIds[1][1]).toBe('wall.brick.edge.horizontal');
    expect(tileIds[1][2]).toBe('road.paved.main');
    expect(tileIds[2][0]).toBe('structure.market.stall.canopy');
    expect(tileIds[2][1]).toBe('floor.candy.polished');
    expect(tileIds[2][2]).toBe('container.storage.crate');
    expect(tileIds[3][0]).toBe('terrain.grass.scatter');
    expect(tileIds[3][1]).toBe('decoration.transition.marker');
    expect(tileIds[3][2]).toBe('decoration.tree.generic');
    expect(tileIds[4][0]).toBe('container.chest.generic');
    expect(tileIds[4][1]).toBe('decoration.bush.generic');
    expect(tileIds[4][2]).toBe('decoration.flower.patch');
  });
});
