// movePipeline.js - Movement system pipeline
import { emit, emitCancellable } from './events.js';
import { EventType } from './eventTypes.js';
import { entityAt, isPassable, tryEdgeTravel } from './queries.js';
import { attack } from './combat.js';

export function runPlayerMove(state, action) {
  if (action.type !== 'move') return false;

  const player = state.player;
  const nx = player.x + action.dx;
  const ny = player.y + action.dy;

  // 1) Pre-hook (freeze/stun/encumbrance/terrain auras can cancel)
  const cancelled = emitCancellable(EventType.WillMove, {
    id: 'player', 
    from: { x: player.x, y: player.y }, 
    to: { x: nx, y: ny }
  });
  if (cancelled) return true;

  // 2) Check for edge travel first
  if (nx < 0 || nx >= state.W || ny < 0 || ny >= state.H) {
    // For now, delegate to existing edge travel logic in game.js
    // This will be refactored later
    if (state.handleEdgeTravel) {
      state.handleEdgeTravel(nx, ny);
      return true;
    }
  }

  // 3) Check for entity at target (bump to attack)
  const foe = entityAt(state, nx, ny);
  if (foe) {
    // bump = attack; do NOT move into tile
    attack(state, player, foe);
    return true;
  } 
  
  // 4) Check if passable and move
  if (isPassable(state, nx, ny)) {
    const from = { x: player.x, y: player.y };
    player.x = nx; 
    player.y = ny;
    emit(EventType.DidMove, { id: 'player', from, to: { x: nx, y: ny } });
    emit(EventType.DidStep, { id: 'player', x: nx, y: ny });
    return true;
  } 
  
  // 5) Blocked movement
  emit(EventType.BlockedMove, { id: 'player', to: { x: nx, y: ny }, blocker: 'wall' });
  return true; // action consumed even if blocked
}