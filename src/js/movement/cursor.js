// systems/cursor.js - Cursor system for examining and targeting
import { W, H } from '../core/config.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { Status, getEntityId } from '../combat/statusSystem.js';

// Cursor state
const cursorState = {
  active: false,           // Is cursor mode active?
  x: 0,                   // Cursor position
  y: 0,
  mode: 'examine',        // 'examine', 'target', 'select'
  targetCallback: null,   // Function to call when target selected
  range: null,           // Max distance from player (optional)
  validTiles: null,      // Array of valid positions (optional)
  lastPlayerPos: null    // Track player position for cursor initialization
};

// Cursor configuration
export const CURSOR_CONFIG = {
  COLOR_EXAMINE: '#FFD700',  // Gold
  COLOR_TARGET: '#FF0000',   // Red  
  COLOR_SELECT: '#00FF00',   // Green
  COLOR_INVALID: '#808080',  // Gray for out-of-range
  CORNER_SIZE: 4,           // Length of corner lines
  LINE_WIDTH: 2,
  ANIMATION_SPEED: 500,     // ms for pulsing
  FAST_MOVE_TILES: 5,       // Shift+arrow movement
  BLINK_RATE: 300          // ms for blinking animation
};

/**
 * Initialize cursor at a position (usually player position)
 */
export function initCursor(x, y) {
  cursorState.x = Math.max(0, Math.min(W - 1, x));
  cursorState.y = Math.max(0, Math.min(H - 1, y));
  cursorState.lastPlayerPos = { x, y };
}

/**
 * Activate cursor mode
 */
export function activateCursor(mode = 'examine', options = {}) {
  const state = window.STATE;
  if (!state || !state.player) return false;
  
  cursorState.active = true;
  cursorState.mode = mode;
  cursorState.targetCallback = options.callback || null;
  cursorState.range = options.range || null;
  cursorState.validTiles = options.validTiles || null;
  
  // Initialize cursor at player position if not set
  if (cursorState.lastPlayerPos === null || 
      cursorState.x === 0 && cursorState.y === 0) {
    initCursor(state.player.x, state.player.y);
  }
  
  console.log(`Cursor activated in ${mode} mode at (${cursorState.x}, ${cursorState.y})`);
  
  emit(EventType.CursorActivated, { 
    mode, 
    x: cursorState.x, 
    y: cursorState.y 
  });
  
  return true;
}

/**
 * Deactivate cursor mode
 */
export function deactivateCursor() {
  if (!cursorState.active) return;
  
  const wasActive = cursorState.active;
  cursorState.active = false;
  cursorState.targetCallback = null;
  cursorState.range = null;
  cursorState.validTiles = null;
  
  if (wasActive) {
    console.log('Cursor deactivated');
    emit(EventType.CursorDeactivated, {});
  }
}

/**
 * Move cursor by delta
 */
export function moveCursor(dx, dy, fast = false) {
  if (!cursorState.active) return false;
  
  const moveAmount = fast ? CURSOR_CONFIG.FAST_MOVE_TILES : 1;
  const newX = cursorState.x + (dx * moveAmount);
  const newY = cursorState.y + (dy * moveAmount);
  
  // Clamp to map bounds
  cursorState.x = Math.max(0, Math.min(W - 1, newX));
  cursorState.y = Math.max(0, Math.min(H - 1, newY));
  
  emit(EventType.CursorMoved, { 
    x: cursorState.x, 
    y: cursorState.y,
    mode: cursorState.mode
  });
  
  return true;
}

/**
 * Move cursor to specific position
 */
export function setCursorPosition(x, y) {
  if (!cursorState.active) return false;
  
  cursorState.x = Math.max(0, Math.min(W - 1, x));
  cursorState.y = Math.max(0, Math.min(H - 1, y));
  
  emit(EventType.CursorMoved, { 
    x: cursorState.x, 
    y: cursorState.y,
    mode: cursorState.mode
  });
  
  return true;
}

/**
 * Return cursor to player position
 */
export function cursorToPlayer() {
  const state = window.STATE;
  if (!state || !state.player) return false;
  
  return setCursorPosition(state.player.x, state.player.y);
}

/**
 * Check if a position is valid for current cursor mode
 */
export function isValidCursorPosition(x, y) {
  if (!cursorState.active) return false;
  
  // Check if in bounds
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  
  // Check range constraint
  if (cursorState.range !== null) {
    const state = window.STATE;
    if (state && state.player) {
      const dx = Math.abs(x - state.player.x);
      const dy = Math.abs(y - state.player.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > cursorState.range) return false;
    }
  }
  
  // Check valid tiles list
  if (cursorState.validTiles !== null) {
    const isValid = cursorState.validTiles.some(tile => 
      tile.x === x && tile.y === y
    );
    if (!isValid) return false;
  }
  
  return true;
}

/**
 * Get current cursor state
 */
export function getCursorState() {
  return {
    active: cursorState.active,
    x: cursorState.x,
    y: cursorState.y,
    mode: cursorState.mode,
    isValid: isValidCursorPosition(cursorState.x, cursorState.y)
  };
}

/**
 * Execute cursor action (select/confirm)
 */
export function executeCursorAction() {
  if (!cursorState.active) return false;
  
  const { x, y, mode, targetCallback } = cursorState;
  
  emit(EventType.CursorAction, { x, y, mode });
  
  // Execute callback if in target mode
  if (mode === 'target' && targetCallback) {
    if (isValidCursorPosition(x, y)) {
      targetCallback(x, y);
      deactivateCursor();
      return true;
    }
  }
  
  // In examine mode, check what's at the cursor position
  if (mode === 'examine') {
    const info = getInfoAtCursor();
    
    // If there's a monster, return special action
    if (info && info.monster) {
      emit(EventType.CursorTargetEnemy, { 
        x, 
        y, 
        monster: info.monster,
        distance: info.distance
      });
      return true;
    }
    
    // Otherwise, just examine the tile
    emit(EventType.ExamineTile, { x, y });
    return true;
  }
  
  return false;
}

/**
 * Get info about what's at cursor position
 */
export function getInfoAtCursor() {
  const state = window.STATE;
  if (!state || !state.chunk) return null;
  
  const { x, y } = cursorState;
  if (y < 0 || y >= H || x < 0 || x >= W) return null;
  
  const tile = state.chunk.map[y]?.[x];
  const monster = state.chunk.monsters?.find(m => 
    m.x === x && m.y === y && m.alive
  );
  const item = state.chunk.items?.find(i => 
    i.x === x && i.y === y
  );
  
  // Calculate distance from player
  let distance = null;
  if (state.player) {
    const dx = Math.abs(x - state.player.x);
    const dy = Math.abs(y - state.player.y);
    distance = Math.round(Math.sqrt(dx * dx + dy * dy));
  }
  
  // Get monster status effects if present
  let monsterStatuses = [];
  if (monster) {
    const monsterId = getEntityId(monster);
    const effects = Status.get(monsterId);
    
    if (effects) {
      // Convert Map effects to array with display names
      for (const [type, data] of Object.entries(effects)) {
        let displayName = type;
        
        // Format status names for display
        if (type === 'wet') displayName = 'Wet';
        else if (type === 'burn') displayName = 'Burning';
        else if (type === 'poison') displayName = 'Poisoned';
        else if (type === 'shock') displayName = 'Shocked';
        else if (type === 'freeze') displayName = 'Frozen';
        else if (type === 'weaken') displayName = 'Weakened';
        else if (type === 'water_slow') displayName = 'Slowed';
        else if (type.startsWith('buff_')) displayName = '+' + type.replace('buff_', '');
        else if (type.startsWith('debuff_')) displayName = '-' + type.replace('debuff_', '');
        
        monsterStatuses.push({
          type: type,
          name: displayName,
          turns: data.turns || 0,
          value: data.value || 0
        });
      }
    }
    
    // Also check old statusEffects array for water_slow
    if (monster.statusEffects?.length > 0) {
      for (const effect of monster.statusEffects) {
        if (effect.type === 'water_slow' && !monsterStatuses.find(s => s.type === 'water_slow')) {
          monsterStatuses.push({
            type: 'water_slow',
            name: 'Slowed (Water)',
            turns: effect.duration || 0,
            value: effect.speedReduction || 0
          });
        }
      }
    }
  }
  
  return {
    x,
    y,
    tile,
    monster: monster ? {
      name: monster.name,
      hp: monster.hp,
      hpMax: monster.hpMax || monster.hp, // Default to current hp if hpMax is undefined
      statuses: monsterStatuses
    } : null,
    item: item ? {
      type: item.type,
      name: item.name || item.type
    } : null,
    distance
  };
}