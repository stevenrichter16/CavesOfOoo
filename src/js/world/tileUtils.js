import { getTileDef, getTileByGlyph } from './TileRegistry.js';

const missingGlyphWarnings = new Set();
const legacyGlyphUsage = new Map();

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
  if (tileId) {
    return tileId;
  }

  if (fallback && !missingGlyphWarnings.has(glyph)) {
    missingGlyphWarnings.add(glyph);
    console.warn(
      `TileRegistry: missing glyph '${glyph}'. Falling back to '${fallback}'.`
    );
  }

  legacyGlyphUsage.set(glyph, (legacyGlyphUsage.get(glyph) ?? 0) + 1);

  return fallback;
}

export function mapToTileIds(map, fallback = 'floor.default') {
  return map.map(row => row.map(glyph => glyphToTileId(glyph, fallback)));
}

export function createGlyphAwareMap(baseMap, tileIds) {
  const assign = (y, x, value) => {
    if (typeof value !== 'string') {
      baseMap[y][x] = value;
      return;
    }

    if (value.length > 1 && value.includes('.')) {
      try {
        setTile(baseMap, tileIds, x, y, value);
        return;
      } catch (err) {
        console.warn(`createGlyphAwareMap: unknown tile id '${value}' at (${x}, ${y})`);
        baseMap[y][x] = value;
        tileIds[y][x] = value;
        return;
      }
    }

    const tileId = getTileByGlyph(value);
    if (tileId) {
      setTile(baseMap, tileIds, x, y, tileId);
      return;
    }

    baseMap[y][x] = value;
    tileIds[y][x] = `legacy.glyph.${value}`;
  };

  return new Proxy(baseMap, {
    get(target, prop) {
      if (typeof prop === 'string' && !Number.isNaN(Number(prop))) {
        const rowIndex = Number(prop);
        const row = target[rowIndex];
        return new Proxy(row, {
          set(rowTarget, colProp, value) {
            if (typeof colProp === 'string' && !Number.isNaN(Number(colProp))) {
              assign(rowIndex, Number(colProp), value);
              return true;
            }
            rowTarget[colProp] = value;
            return true;
          },
          get(rowTarget, colProp) {
            return rowTarget[colProp];
          }
        });
      }
      return target[prop];
    },
    set(target, prop, value) {
      if (typeof prop === 'string' && !Number.isNaN(Number(prop)) && Array.isArray(value)) {
        const rowIndex = Number(prop);
        for (let x = 0; x < value.length; x++) {
          assign(rowIndex, x, value[x]);
        }
        return true;
      }
      target[prop] = value;
      return true;
    }
  });
}

export function assertNoLegacyTileIds(tileIds, context = 'chunk') {
  if (!Array.isArray(tileIds)) return;

  const legacyEntries = [];

  for (let y = 0; y < tileIds.length; y++) {
    const row = tileIds[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x++) {
      const id = row[x];
      if (typeof id === 'string' && id.startsWith('legacy.glyph.')) {
        legacyEntries.push({ x, y, id });
        if (legacyEntries.length >= 5) break;
      }
    }
    if (legacyEntries.length >= 5) break;
  }

  if (legacyEntries.length === 0) {
    return;
  }

  const sample = legacyEntries
    .map(({ x, y, id }) => `(${x},${y})=${id}`)
    .join(', ');
  const message = `TileRegistry: legacy glyphs remain in ${context}: ${sample}`;

  const isProd = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production';
  if (isProd) {
    console.warn(message);
  } else {
    throw new Error(message);
  }
}

export function getLegacyGlyphTelemetry() {
  return new Map(legacyGlyphUsage);
}

export function resetLegacyGlyphTelemetry() {
  legacyGlyphUsage.clear();
}
