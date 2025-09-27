import { getTileDef, getTileByGlyph } from './TileRegistry.js';

export function createTileGrid(width, height, defaultTileId) {
  const defaultDef = getTileDef(defaultTileId);
  const map = Array.from({ length: height }, () => Array(width).fill(defaultDef.glyph));
  const tileIds = Array.from({ length: height }, () => Array(width).fill(defaultTileId));
  return { map, tileIds };
}

export function setTile(map, tileIds, x, y, tileId) {
  const def = getTileDef(tileId);
  if (!map[y] || typeof map[y][x] === 'undefined') {
    throw new Error(`setTile: coordinates out of bounds (${x}, ${y})`);
  }
  map[y][x] = def.glyph;
  tileIds[y][x] = tileId;
}

export function glyphToTileId(glyph, fallback = 'floor.default') {
  const tileId = getTileByGlyph(glyph);
  return tileId ?? fallback;
}

export function mapToTileIds(map, fallback = 'floor.default') {
  return map.map(row => row.map(glyph => glyphToTileId(glyph, fallback)));
}
