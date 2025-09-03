// movePipeline.js - Movement system pipeline
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { entityAt, isPassable, tryEdgeTravel } from '../utils/queries.js';
import { attack } from '../combat/combat.js';
import { isNPCHostileToPlayer } from '../social/disguise.js';

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

  // 2) Check for NPC at target (bump to interact or attack)
  const npc = state.npcs?.find(n => 
    n.x === nx && 
    n.y === ny && 
    n.hp > 0 &&
    n.chunkX === state.cx &&
    n.chunkY === state.cy
  );
  if (npc) {
    // Check if NPC is hostile - if so, attack instead of interact
    if (isNPCHostileToPlayer(state, npc)) {
      // NPC is hostile, attack them
      attack(state, p, npc);
      return true;
    }
    
    // NPC is not hostile, open social interaction menu
    emit(EventType.NPCInteraction, { player: p, npc });
    if (state.openNPCInteraction) {
      state.openNPCInteraction(state, npc);
    } else {
      // Fallback: just log that we bumped into them
      if (state.log) {
        state.log(state, `You approach ${npc.name}.`, "note");
      }
    }
    return true;
  }
  
  // 3) Check for entity at target (bump to attack)
  const foe = entityAt(state, nx, ny);
  if (foe) {
    attack(state, p, foe);
    return true;
  }

  // 4) Check for edge travel
  if (tryEdgeTravel(state, p, nx, ny)) return true;

  // 5) Check if passable and move
  if (isPassable(state, nx, ny)) {
    const from = { x, y };
    p.x = nx;
    p.y = ny;
    
    // Check if we're entering or leaving water
    const prevTile = state.chunk?.map?.[from.y]?.[from.x];
    const newTile = state.chunk?.map?.[ny]?.[nx];
    
    // Handle water effects
    if (newTile === '~') {
      // Entering or staying in water - apply/refresh water slow
      if (!state.player.statusEffects?.find(e => e.type === 'water_slow')) {
        // Apply water slow effect (no damage, just for tracking and speed reduction)
        state.player.statusEffects = state.player.statusEffects || [];
        state.player.statusEffects.push({
          type: 'water_slow',
          duration: 0, // Will be set to 3 when leaving water
          damage: 0,
          speedReduction: 2 // Reduce speed by 2 while in water
        });
        if (state.log) {
          state.log(state, "You wade into the water. Your movement slows.", "note");
        }
      }
    } else if (prevTile === '~' && newTile !== '~') {
      // Leaving water - set duration to 3 turns
      const waterSlow = state.player.statusEffects?.find(e => e.type === 'water_slow');
      if (waterSlow) {
        waterSlow.duration = 3;
        if (state.log) {
          state.log(state, "You emerge from the water, still dripping wet.", "note");
        }
      }
    }
    
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

  // 6) Blocked movement
  emit(EventType.BlockedMove, { 
    id: p.id || state.playerId || 'player', 
    to: { x: nx, y: ny }, 
    blocker: 'wall' 
  });
  return true; // action consumed even if blocked
}