// queries.js - World query functions
import { W, H } from '../core/config.js';
import { emit } from './events.js';
import { EventType } from './eventTypes.js';
import { loadChunk, saveChunk } from './persistence.js';
import { genChunk as generateChunk } from '../world/worldGen.js';

// Use full viewport dimensions for chunks
const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

export function entityAt(state, x, y) {
  // Check for monsters at this position
  if (state.chunk && state.chunk.monsters) {
    const monster = state.chunk.monsters.find(m => m.alive && m.x === x && m.y === y);
    if (monster) return monster;
  }
  
  // Check for NPCs at this position in the current chunk
  if (state.npcs) {
    const npc = state.npcs.find(n => 
      n.x === x && 
      n.y === y && 
      n.hp > 0 &&
      n.chunkX === state.cx &&
      n.chunkY === state.cy
    );
    if (npc) return npc;
  }
  
  // Check for player at this position (though usually we know it's not the player)
  if (state.player && state.player.x === x && state.player.y === y) {
    return state.player;
  }
  
  return null;
}

export function isPassable(state, x, y) {
  // Allow edge travel by not blocking out-of-bounds
  // Use actual map dimensions, not viewport dimensions
  if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT) return true;
  
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
  if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT) return false;
  
  // Within bounds - check if NOT passable
  return !isPassable(state, x, y);
}

// Check if position is blocked by terrain only (not entities)
// Used for projectiles which should hit entities but not pass through walls
export function isBlockedByTerrain(state, x, y) {
  // Out of bounds blocks projectiles
  if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT) return true;
  
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
    for (let offset = 0; offset <= Math.floor(CHUNK_WIDTH/2); offset++) {
      for (const dx of [offset, -offset]) {
        const x = player.x + dx;
        if (x >= 0 && x < CHUNK_WIDTH && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  } else if (side === 'bottom') {
    // Search along bottom edge (y = CHUNK_HEIGHT-1)
    const y = CHUNK_HEIGHT - 1;
    for (let offset = 0; offset <= Math.floor(CHUNK_WIDTH/2); offset++) {
      for (const dx of [offset, -offset]) {
        const x = player.x + dx;
        if (x >= 0 && x < CHUNK_WIDTH && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  } else if (side === 'left') {
    // Search along left edge (x = 0)
    const x = 0;
    for (let offset = 0; offset <= Math.floor(CHUNK_HEIGHT/2); offset++) {
      for (const dy of [offset, -offset]) {
        const y = player.y + dy;
        if (y >= 0 && y < CHUNK_HEIGHT && map[y][x] !== '#') {
          player.x = x;
          player.y = y;
          return;
        }
      }
    }
  } else if (side === 'right') {
    // Search along right edge (x = CHUNK_WIDTH-1)
    const x = CHUNK_WIDTH - 1;
    for (let offset = 0; offset <= Math.floor(CHUNK_HEIGHT/2); offset++) {
      for (const dy of [offset, -offset]) {
        const y = player.y + dy;
        if (y >= 0 && y < CHUNK_HEIGHT && map[y][x] !== '#') {
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
        if (checkY >= 0 && checkY < CHUNK_HEIGHT && checkX >= 0 && checkX < CHUNK_WIDTH) {
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
  // Use actual chunk dimensions
  if (nx >= 0 && nx < CHUNK_WIDTH && ny >= 0 && ny < CHUNK_HEIGHT) return false;

  const tcx = state.cx + (nx < 0 ? -1 : nx >= CHUNK_WIDTH ? 1 : 0);
  const tcy = state.cy + (ny < 0 ? -1 : ny >= CHUNK_HEIGHT ? 1 : 0);

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
  
  // Handle shopping district NPCs specifically
  if (tcx === 1 && tcy === 0 && state.chunk?.npcData) {
    console.log('🛍️ Entering Shopping District via edge travel, spawning NPCs...');
    // Dynamically import to avoid circular dependency
    import('../../social/migrationAdapter.js').then(socialModule => {
      if (state.chunk?.npcData) {
        // Initialize NPCs array if it doesn't exist
        if (!state.npcs) state.npcs = [];
        
        const npcCount = state.chunk.npcData.length;
        console.log(`📦 Found ${npcCount} NPCs to spawn in shopping district`);
        
        state.chunk.npcData.forEach(data => {
          // Set the chunk coordinates for spawning - NPCs use chunkX/chunkY not cx/cy
          data.chunkX = tcx;
          data.chunkY = tcy;
          const npc = socialModule.spawnSocialNPC(state, data);
          if (npc) {
            state.npcs.push(npc);
            console.log(`✅ Spawned NPC: ${npc.name} at (${npc.x}, ${npc.y}) in chunk (${npc.chunkX}, ${npc.chunkY})`);
          } else {
            console.warn(`⚠️ Failed to spawn NPC: ${data.name}`);
          }
        });
        
        // Clear npcData after spawning to avoid duplicates
        delete state.chunk.npcData;
        console.log(`🎉 Successfully spawned ${state.npcs.filter(n => n.chunkX === tcx && n.chunkY === tcy).length} NPCs in shopping district`);
      }
    }).catch(err => {
      console.error('❌ Error spawning shopping district NPCs:', err);
    });
  }
  
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
  } else if (tcx === 0 && tcy === -2 && state.chunk?.isForest) {
    // The Forest chunk - spawn forest animals and Forest Wizard
    console.log('🌲 Entering The Forest, spawning NPCs...');
    import('../world/theForest.js').then(module => {
      module.spawnForestNPCs(state);
      console.log('🌲 Forest NPCs spawned');
      
      // Trigger re-render after NPCs are spawned
      import('../core/game.js').then(gameModule => {
        setTimeout(() => {
          gameModule.render(state);
        }, 50);
      });
    }).catch(err => {
      console.error('❌ Error spawning Forest NPCs:', err);
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
    player.x = CHUNK_WIDTH - 1;
    player.y = Math.max(0, Math.min(ny, CHUNK_HEIGHT - 1));
    // Find opening along the right wall
    findWallOpening(state, player, 'right');
  } else if (nx >= CHUNK_WIDTH) {
    // Entering from the right, appear on the left edge
    player.x = 0;
    player.y = Math.max(0, Math.min(ny, CHUNK_HEIGHT - 1));
    // Find opening along the left wall
    findWallOpening(state, player, 'left');
  } else if (ny < 0) {
    // Entering from the top, appear on the bottom edge
    player.y = CHUNK_HEIGHT - 1;
    player.x = Math.max(0, Math.min(nx, CHUNK_WIDTH - 1));
    // Find opening along the bottom wall
    findWallOpening(state, player, 'bottom');
  } else if (ny >= CHUNK_HEIGHT) {
    // Entering from the bottom, appear on the top edge
    player.y = 0;
    player.x = Math.max(0, Math.min(nx, CHUNK_WIDTH - 1));
    // Find opening along the top wall
    findWallOpening(state, player, 'top');
  }

  emit(EventType.DidChangeChunk, { cx: tcx, cy: tcy, biome: next?.biome });
  return true;
}