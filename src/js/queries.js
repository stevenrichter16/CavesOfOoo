// queries.js - World query functions
import { W, H } from './config.js';
import { emit } from './events.js';
import { EventType } from './eventTypes.js';

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
  // Check if we're trying to move off the map edge
  if (nx >= 0 && nx < W && ny >= 0 && ny < H) return false;
  
  // Calculate target chunk coordinates
  const tcx = state.cx + (nx < 0 ? -1 : nx >= W ? 1 : 0);
  const tcy = state.cy + (ny < 0 ? -1 : ny >= H ? 1 : 0);
  
  // Emit will change chunk event
  emit(EventType.WillChangeChunk, { from: { cx: state.cx, cy: state.cy }, to: { cx: tcx, cy: tcy } });
  
  // This would normally call loadOrGenChunk from game.js
  // For now, return false since we need to import that functionality
  return false; // Will be handled by the existing tryMove for now
}