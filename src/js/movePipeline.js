// movePipeline.js - Movement system pipeline
import { emit } from './events.js';
import { EventType } from './eventTypes.js';
import { entityAt, isPassable, tryEdgeTravel } from './queries.js';
import { attack } from './combat.js';

export function runPlayerMove(state, action) {
  if (!action || action.type !== 'move') return false;

  const p = state.player;
  const { x, y } = p;
  const nx = x + action.dx;
  const ny = y + action.dy;

  // 1) Pre-hook (freeze/stun/encumbrance/terrain auras can cancel)
  const pre = { 
    id: state.playerId || p.id || 'player', 
    from: { x, y }, 
    to: { x: nx, y: ny }, 
    cancel: false 
  };
  emit(EventType.WillMove, pre);
  if (pre.cancel) return true;

  // 2) Check for entity at target (bump to attack)
  const foe = entityAt(state, nx, ny);
  if (foe) {
    attack(state, p, foe);
    return true;
  }

  // 3) Check for edge travel
  if (tryEdgeTravel(state, p, nx, ny)) return true;

  // 4) Check if passable and move
  if (isPassable(state, nx, ny)) {
    const from = { x, y };
    p.x = nx;
    p.y = ny;
    
    // Check for items/interactions at new position
    if (state.interactTile) {
      state.interactTile(state, nx, ny, state.openVendorShop);
    }
    
    emit(EventType.DidMove, { 
      id: p.id || state.playerId || 'player', 
      from, 
      to: { x: nx, y: ny } 
    });
    emit(EventType.DidStep, { 
      id: p.id || state.playerId || 'player', 
      x: nx, 
      y: ny 
    });
    return true;
  }

  // 5) Blocked movement
  emit(EventType.BlockedMove, { 
    id: p.id || state.playerId || 'player', 
    to: { x: nx, y: ny }, 
    blocker: 'wall' 
  });
  return true; // action consumed even if blocked
}