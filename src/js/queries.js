// queries.js - World query functions
import { W, H } from './config.js';
import { emit } from './events.js';
import { EventType } from './eventTypes.js';
import { loadChunk, saveChunk } from './persistence.js';
import { genChunk as generateChunk } from './worldGen.js';

export function entityAt(state, x, y) {
  // Check for monsters at this position
  if (state.chunk && state.chunk.monsters) {
    const monster = state.chunk.monsters.find(m => m.alive && m.x === x && m.y === y);
    if (monster) return monster;
  }
  
  // Check for player at this position (though usually we know it's not the player)
  if (state.player && state.player.x === x && state.player.y === y) {
    return state.player;
  }
  
  return null;
}

export function isPassable(state, x, y) {
  // Allow edge travel by not blocking out-of-bounds
  if (x < 0 || x >= W || y < 0 || y >= H) return true;
  
  // Check map tile
  const tile = state.chunk?.map?.[y]?.[x];
  if (tile === '#' || tile === '+') return false; // walls and doors block
  
  // Check for entities
  if (entityAt(state, x, y)) return false;
  
  return true;
}

// Alias for isBlocked (inverse of isPassable)
export function isBlocked(state, x, y) {
  // Allow edge travel
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  
  // Within bounds - check if NOT passable
  return !isPassable(state, x, y);
}

export function tryEdgeTravel(state, player, nx, ny) {
  // In-bounds? Nothing to do.
  if (nx >= 0 && nx < W && ny >= 0 && ny < H) return false;

  const tcx = state.cx + (nx < 0 ? -1 : nx >= W ? 1 : 0);
  const tcy = state.cy + (ny < 0 ? -1 : ny >= H ? 1 : 0);

  emit(EventType.WillChangeChunk, { from: {cx: state.cx, cy: state.cy}, to: {cx: tcx, cy: tcy} });

  // Save current chunk before switching
  if (state.chunk) {
    saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
  }

  // Load or generate next chunk
  const seed = state.worldSeed ?? state.seed ?? 0;
  let next = loadChunk(seed, tcx, tcy);
  if (!next) {
    next = generateChunk(seed, tcx, tcy);
    // Don't save immediately - let the game save when it needs to
  }

  // Swap active chunk
  state.cx = tcx;
  state.cy = tcy;
  state.chunk = next;

  // Ensure items array exists
  if (!state.chunk.items) state.chunk.items = [];

  // Restore itemCheck functions for vendor fetch quests (lost during JSON serialization)
  if (state.chunk.items) {
    const FETCH_ITEMS = state.FETCH_ITEMS || []; // Will need to pass this in
    state.chunk.items.forEach(item => {
      if (item.type === "vendor" && item.fetchQuest && item.fetchQuest.targetItem) {
        const targetItem = item.fetchQuest.targetItem;
        // Find matching FETCH_ITEM by name to restore the itemCheck function
        const matchingFetchItem = FETCH_ITEMS.find(fi => fi.name === targetItem.name);
        if (matchingFetchItem) {
          item.fetchQuest.targetItem = matchingFetchItem;
        }
      }
    });
  }

  // Snap player to opposite edge
  if (nx < 0) {
    player.x = W - 1;
    player.y = Math.max(0, Math.min(ny, H - 1));
  } else if (nx >= W) {
    player.x = 0;
    player.y = Math.max(0, Math.min(ny, H - 1));
  } else if (ny < 0) {
    player.y = H - 1;
    player.x = Math.max(0, Math.min(nx, W - 1));
  } else if (ny >= H) {
    player.y = 0;
    player.x = Math.max(0, Math.min(nx, W - 1));
  }

  // Check if player landed on a wall and find a safe spot
  if (state.chunk?.map?.[player.y]?.[player.x] === "#") {
    // Find nearest open spot
    for (let r = 1; r < 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const checkY = player.y + dy;
          const checkX = player.x + dx;
          if (checkY >= 0 && checkY < H && checkX >= 0 && checkX < W) {
            if (state.chunk.map[checkY][checkX] === ".") {
              player.x = checkX;
              player.y = checkY;
              emit(EventType.DidChangeChunk, { cx: tcx, cy: tcy, biome: next?.biome });
              return true;
            }
          }
        }
      }
    }
    // If no spot found, force to center
    player.x = Math.floor(W / 2);
    player.y = Math.floor(H / 2);
  }

  emit(EventType.DidChangeChunk, { cx: tcx, cy: tcy, biome: next?.biome });
  return true;
}