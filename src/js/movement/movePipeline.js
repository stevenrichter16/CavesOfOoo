// movePipeline.js - Movement system pipeline
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { entityAt, isPassable, tryEdgeTravel } from '../utils/queries.js';
import { attack } from '../combat/combat.js';
import { isNPCHostileToPlayer } from '../../social/hostilityUtils.js';
import { adaptRunPlayerMove, initializePipelineAdapter } from './pipelineAdapter.js';
import { QUEST_ITEMS } from '../items/questItems.js';

// Initialize the pipeline adapter on module load
initializePipelineAdapter();

// Original implementation
function runPlayerMoveOriginal(state, action) {
  console.log('[OLD PIPELINE] runPlayerMoveOriginal called!');
  if (!action || action.type !== 'move') return false;

  // Block movement if dialogue is open
  if (state.ui?.dialogueOpen || state.ui?.dialogueTreeOpen) {
    return true; // Consume the action but don't move
  }

  // CRITICAL: We must use state.player directly, not a local reference
  // Otherwise inventory updates may not persist
  const p = state.player;
  
  // Debug check to ensure we're using the right reference
  console.log('[FOX TOOTH DEBUG] p === state.player?', p === state.player);
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
  
  // 3) Check for entity at target (bump to attack or interact)
  const foe = entityAt(state, nx, ny);
  console.log('[OLD PIPELINE FOX] Entity at target:', foe);
  if (foe) {
    console.log('[OLD PIPELINE FOX] Foe found:', foe.kind, 'asleep?', foe.asleep, 'hasTeeth?', foe.hasTeeth);
    // Check if it's a sleeping fox that can have teeth collected
    if (foe.asleep && foe.kind === 'sweet_tooth_fox') {
      console.log('[OLD PIPELINE FOX] It\'s a sleeping fox! (OLD PIPELINE)');
      if (foe.hasTeeth !== false) { // Default to true if not set
        console.log('[FOX TOOTH] Fox has teeth, collecting...');
        // Use the QUEST_ITEMS definition for the tooth
        const itemDef = QUEST_ITEMS.fox_sweet_tooth;
        const tooth = {
          type: 'item',  // Quest items use 'item' type
          item: { 
            id: 'fox_sweet_tooth',
            ...itemDef
          },
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,  // Unique inventory ID
          count: 1  // Use 'count' not 'quantity'
        };
        
        // Check if already has teeth in inventory
        console.log('[FOX TOOTH] Checking inventory. p === state.player?', p === state.player);
        console.log('[FOX TOOTH] p.inventory:', p.inventory);
        console.log('[FOX TOOTH] state.player.inventory:', state.player.inventory);
        
        const existing = p.inventory?.find(i => 
          i.type === 'item' && i.item?.id === 'fox_sweet_tooth'
        );
        if (existing) {
          existing.count = (existing.count || 1) + 1;
          console.log('[FOX TOOTH] Incremented existing tooth. New count:', existing.count);
        } else {
          if (!p.inventory) p.inventory = [];
          p.inventory.push(tooth);
          console.log('[FOX TOOTH] Added new tooth to inventory. Total items:', p.inventory.length);
        }
        
        console.log('[FOX TOOTH] After adding - p.inventory:', p.inventory);
        console.log('[FOX TOOTH] After adding - state.player.inventory:', state.player.inventory);
        
        foe.hasTeeth = false;
        
        // Use emit for logging instead of state.log
        emit(EventType.Log, { 
          text: 'You extract a sweet tooth from the sleeping fox!', 
          cls: 'good' 
        });
        
        // Update quest progress if applicable
        if (p.quests?.active?.includes('sweet_tooth_foxes')) {
          if (!p.quests.progress['sweet_tooth_foxes']) {
            p.quests.progress['sweet_tooth_foxes'] = { teeth: 0 };
          }
          p.quests.progress['sweet_tooth_foxes'].teeth++;
          const progress = p.quests.progress['sweet_tooth_foxes'].teeth;
          
          emit(EventType.Log, { 
            text: `Quest progress: ${progress}/5 teeth collected`, 
            cls: 'note' 
          });
        }
      } else {
        emit(EventType.Log, { 
          text: 'This fox has already had its teeth removed.', 
          cls: 'note' 
        });
      }
      return true;
    }
    
    // Otherwise attack as normal
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

// Export the adapted version that can switch between old and new implementation
export const runPlayerMove = adaptRunPlayerMove(runPlayerMoveOriginal);