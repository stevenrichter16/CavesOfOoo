import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainSystem } from '../../src/js/systems/TerrainSystem.js';
import { getTileByGlyph } from '../../src/js/world/TileRegistry.js';

describe('TerrainSystem registry integration', () => {
  let terrain;

  beforeEach(() => {
    terrain = new TerrainSystem();
  });

  it('marks brick corner glyph as impassable and vision blocking', () => {
    const glyph = '┌';
    expect(terrain.isPassable(glyph)).toBe(false);
    expect(terrain.blocksVision(glyph)).toBe(true);
  });

  it('provides registry terrain info via glyph lookups', () => {
    const glyph = '┐';
    const id = getTileByGlyph(glyph);
    expect(id).toBe('wall.brick.corner.top_right');
    expect(terrain.getTerrainInfo(glyph).name).toContain('brick');
  });

  it('treats registry-backed walkways as passable terrain', () => {
    const glyph = '=';
    expect(getTileByGlyph(glyph)).toBe('road.paved.main');
    expect(terrain.isPassable(glyph)).toBe(true);
    expect(terrain.getTerrainInfo(glyph).name).toContain('road');
  });
});
