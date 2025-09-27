# Tile System & Texture Integration Plan

## Context
- Tiles are stored as raw glyph characters in `state.chunk.map` with no metadata.
- Rendering looks up glyphs in `CANDY_TILE_TEXTURES`.
- Gameplay logic (passability, blocks vision, etc.) still uses hardcoded glyph checks or defaults.
- Recently added building glyphs (`┌┐└┘─│█`) render correctly but remain passable because they are unregistered in `TerrainSystem`.

## Goals
1. Introduce a registry-backed tile system so each tile ID carries gameplay and visual properties.
2. Update existing chunk generators to use descriptive tile IDs rather than bare glyphs.
3. Ensure new brick wall tiles are registered for gameplay (impassable, blocks vision) while keeping rendering intact.
4. Maintain backward compatibility with existing glyph-based logic during transition.

## Phased Implementation

### Phase 1 – Registry & Terrain Integration
- Create `src/js/world/TileRegistry.js` exporting definitions, e.g.
  ```js
  export const TileRegistry = {
    'floor.candy': { glyph: '.', sprite: 'tile4.png', passable: true, blocksVision: false },
    'wall.brick.corner.top_left': { glyph: '┌', sprite: 'Walls/brick-corner-top-left.png', passable: false, blocksVision: true },
    // ...
  };
  ```
- Add helper functions `getTileDef(id)` and `getTileByGlyph(glyph)` to TileRegistry.
- Modify `TerrainSystem.registerDefaultTerrains` to load entries from TileRegistry for glyph-based registration. Preserve current manual registrations for legacy tiles until migration is complete.

### Phase 2 – Map Generation Helpers
- Create utility `setTile(map, x, y, tileId)` that writes `TileRegistry[tileId].glyph` to map.
- Update Candy Kingdom town generator to call `setTile(..., 'wall.brick.corner.top_left')` instead of writing `'┌'` directly.
- Ensure auto-tiler now produces tile IDs rather than glyphs (or converts glyph output to IDs before writing).

### Phase 3 – Rendering Alignment
- Refactor `CANDY_TILE_TEXTURES` to source from TileRegistry: `drawTileSprite` should resolve `tileId` or glyph → `sprite` path via registry.
- Support multi-biome overrides by allowing registry entries to specify per-biome sprite variants when needed.

### Phase 4 – Gameplay Consistency & Back-Compat
- Update `isPassable`, `isBlocked`, etc. to consult TileRegistry/TerrainSystem rather than hardcoded glyphs.
- Add fallback logic: if a glyph is missing in the registry, treat it as legacy and log a warning.
- Run through other systems (pathfinding, movement, damage surfaces) to swap direct glyph checks for `getTileDef` usage.

### Phase 5 – Migration & Cleanup
- Convert other chunk generators gradually to tile IDs.
- Remove obsolete glyph-only entries once all generators use IDs.
- Document the new workflow (how to add a tile, where to define sprite, how to use in generators).

## Immediate Fix (interim before full refactor)
- Register new wall glyphs (`┌┐└┘─│█`) with `TerrainSystem.registerTerrain` so they block movement now.
- Extend `isPassable`/`isBlocked` to treat them as walls until TileRegistry-based lookups go live.

## Risks & Considerations
- Need to ensure save/load (which stores glyphs) remains compatible—TileRegistry must map glyphs back to IDs deterministically.
- Sprite loading is async; ensure registry is initialized before rendering (currently a lazy import).
- Tile layering may eventually be required (floor + wall). Consider future support before locking schema.

## Deliverables
- New `TileRegistry.js` module with documented format.
- Updated TerrainSystem, renderer, and Candy Kingdom map generator using registry helpers.
- Interim terrain registration for brick glyphs.

