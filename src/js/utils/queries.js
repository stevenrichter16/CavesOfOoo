// queries.js - World query functions
import { W, H } from '../core/config.js';
import { emit } from './events.js';
import { EventType } from './eventTypes.js';
import { loadChunk, saveChunk } from './persistence.js';
import { genChunk as generateChunk } from '../world/worldGen.js';

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
  // Water is passable but will apply slow effect
  
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

// Check if position is blocked by terrain only (not entities)
// Used for projectiles which should hit entities but not pass through walls
export function isBlockedByTerrain(state, x, y) {
  // Out of bounds blocks projectiles
  if (x < 0 || x >= W || y < 0 || y >= H) return true;
  
  // Check map tile
  const tile = state.chunk?.map?.[y]?.[x];
  if (tile === '#' || tile === '+') return true; // walls and doors block
  
  // Water and other tiles don't block projectiles
  return false;
}

// Helper to find a safe opening in the wall when entering a chunk
function findWallOpening(state, player, side) {
  const map = state.chunk?.map;
  if (!map) return;
  
  // Check if current position is already safe
  if (map[player.y][player.x] !== '#') return;
  
  // Search for an opening along the appropriate wall
  if (side === 'top') {
    // Search along top edge (y = 0)
    const y = 0;
    // First try near the player's x position
    for (let offset = 0; offset <= Math.floor(W/2); offset++) {
      for (const dx of [offset, -offset]) {
        const x = player.x + dx;
        if (x >= 0 && x < W && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  } else if (side === 'bottom') {
    // Search along bottom edge (y = H-1)
    const y = H - 1;
    for (let offset = 0; offset <= Math.floor(W/2); offset++) {
      for (const dx of [offset, -offset]) {
        const x = player.x + dx;
        if (x >= 0 && x < W && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  } else if (side === 'left') {
    // Search along left edge (x = 0)
    const x = 0;
    for (let offset = 0; offset <= Math.floor(H/2); offset++) {
      for (const dy of [offset, -offset]) {
        const y = player.y + dy;
        if (y >= 0 && y < H && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  } else if (side === 'right') {
    // Search along right edge (x = W-1)
    const x = W - 1;
    for (let offset = 0; offset <= Math.floor(H/2); offset++) {
      for (const dy of [offset, -offset]) {
        const y = player.y + dy;
        if (y >= 0 && y < H && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  }
  
  // Fallback: find any open spot near the edge
  for (let r = 1; r < 5; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const checkY = player.y + dy;
        const checkX = player.x + dx;
        if (checkY >= 0 && checkY < H && checkX >= 0 && checkX < W) {
          if (map[checkY][checkX] !== '#') {
            player.x = checkX;
            player.y = checkY;
            return;
          }
        }
      }
    }
  }
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
  
  // Populate special chunks
  if (tcx === -1 && tcy === 0) {
    // Graveyard chunk - spawn Starchy and other graveyard NPCs
    import('../world/graveyardChunk.js').then(module => {
      module.populateGraveyard(state);
      
      // Trigger re-render after NPCs are spawned
      import('../core/game.js').then(gameModule => {
        setTimeout(() => {
          gameModule.render(state);
        }, 50); // Short delay to ensure population is complete
      });
    });
  } else if (tcx === 0 && tcy === 0 && state.chunk?.isMarket) {
    // Candy Market chunk - spawn vendors
    import('../world/candyMarketChunk.js').then(module => {
      module.populateCandyMarket(state);
      
      // Trigger re-render after NPCs are spawned
      import('../core/game.js').then(gameModule => {
        setTimeout(() => {
          gameModule.render(state);
        }, 50);
      });
    });
  }

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

  // Snap player to opposite edge and find safe opening
  if (nx < 0) {
    // Entering from the left, appear on the right edge
    player.x = W - 1;
    player.y = Math.max(0, Math.min(ny, H - 1));
    // Find opening along the right wall
    findWallOpening(state, player, 'right');
  } else if (nx >= W) {
    // Entering from the right, appear on the left edge
    player.x = 0;
    player.y = Math.max(0, Math.min(ny, H - 1));
    // Find opening along the left wall
    findWallOpening(state, player, 'left');
  } else if (ny < 0) {
    // Entering from the top, appear on the bottom edge
    player.y = H - 1;
    player.x = Math.max(0, Math.min(nx, W - 1));
    // Find opening along the bottom wall
    findWallOpening(state, player, 'bottom');
  } else if (ny >= H) {
    // Entering from the bottom, appear on the top edge
    player.y = 0;
    player.x = Math.max(0, Math.min(nx, W - 1));
    // Find opening along the top wall
    findWallOpening(state, player, 'top');
  }

  emit(EventType.DidChangeChunk, { cx: tcx, cy: tcy, biome: next?.biome });
  return true;
}