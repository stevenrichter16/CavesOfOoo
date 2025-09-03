// src/js/ui/cursorInspect.js - Cursor inspection system for hovering over tiles/entities

import { CANVAS_CONFIG } from '../core/config.js';
import { getStatusEffectsAsArray } from '../combat/statusSystem.js';
import { isNPCHostileToPlayer } from '../social/disguise.js';
import { RelationshipSystem } from '../social/relationship.js';

let tooltipElement = null;
let currentHoverInfo = null;
let gameState = null;  // Store reference to game state

/**
 * Initialize the cursor inspect system
 */
export function initCursorInspect(canvas, state) {
  gameState = state;  // Store initial state reference
  // Create tooltip element if it doesn't exist
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'cursor-tooltip';
    tooltipElement.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(tooltipElement);
  }
  
  // Add mouse move handler to canvas
  canvas.addEventListener('mousemove', (e) => {
    // Use window.STATE to get the latest state
    const currentState = window.STATE || gameState;
    handleMouseMove(e, canvas, currentState);
  });
  
  // Hide tooltip when mouse leaves canvas
  canvas.addEventListener('mouseleave', () => {
    hideTooltip();
  });
  
  console.log('🖱️ [CURSOR] Cursor inspect system initialized');
}

/**
 * Handle mouse movement over the canvas
 */
function handleMouseMove(event, canvas, state) {
  // Get canvas position
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Convert to tile coordinates
  const tileSize = CANVAS_CONFIG.TILE_SIZE;
  const tileX = Math.floor(x / tileSize);
  const tileY = Math.floor(y / tileSize);
  
  // Get info about what's at this tile
  const info = getTileInfo(state, tileX, tileY);
  
  if (info) {
    showTooltip(event.clientX, event.clientY, info);
  } else {
    hideTooltip();
  }
}

/**
 * Get information about what's at a specific tile
 */
function getTileInfo(state, x, y) {
  // Check bounds
  if (x < 0 || x >= CANVAS_CONFIG.GRID_WIDTH || 
      y < 0 || y >= CANVAS_CONFIG.GRID_HEIGHT) {
    return null;
  }
  
  // Check for player
  if (state.player.x === x && state.player.y === y) {
    return {
      type: 'player',
      name: 'You',
      hp: state.player.hp,
      hpMax: state.player.hpMax,
      effects: getStatusEffectsAsArray(state.player)
    };
  }
  
  // Check for NPCs (only in current chunk)
  if (state.npcs) {
    for (const npc of state.npcs) {
      if (npc.x === x && npc.y === y && npc.hp > 0 &&
          npc.chunkX === state.cx && npc.chunkY === state.cy) {
        const hostile = isNPCHostileToPlayer(state, npc);
        const relationship = RelationshipSystem.getRelation(state.player, npc);
        
        // Get faction reputation if NPC has a faction
        let factionRep = null;
        if (npc.faction) {
          factionRep = RelationshipSystem.getFactionStanding('player', npc.faction);
        }
        
        return {
          type: 'npc',
          name: npc.name || `${npc.faction || 'Unknown'} NPC`,
          faction: npc.faction,
          factionReputation: factionRep,
          hp: npc.hp,
          hpMax: npc.hpMax || npc.hp,
          effects: getStatusEffectsAsArray(npc),
          hostile: hostile,
          relationship: relationship,
          traits: npc.traits
        };
      }
    }
  }
  
  // Check for monsters
  if (state.monsters) {
    for (const monster of state.monsters) {
      if (monster.alive && monster.x === x && monster.y === y) {
        return {
          type: 'monster',
          name: monster.name || 'Unknown Monster',
          hp: monster.hp,
          hpMax: monster.hpMax || monster.hp,
          effects: getStatusEffectsAsArray(monster),
          tier: monster.tier
        };
      }
    }
  }
  
  // Check for items
  if (state.chunk?.items) {
    for (const item of state.chunk.items) {
      if (item.x === x && item.y === y) {
        return {
          type: 'item',
          name: item.item?.name || item.type,
          description: item.item?.desc || item.item?.description,
          itemType: item.type
        };
      }
    }
  }
  
  // Check for tile type
  const tile = state.chunk?.map?.[y]?.[x];
  if (tile) {
    return getTileDescription(tile);
  }
  
  return null;
}

/**
 * Get description for a tile character
 */
function getTileDescription(tile) {
  const tileDescriptions = {
    '#': { type: 'tile', name: 'Wall', description: 'Solid stone wall' },
    '.': { type: 'tile', name: 'Floor', description: 'Empty floor' },
    '~': { type: 'tile', name: 'Water', description: 'Deep water' },
    '+': { type: 'tile', name: 'Door', description: 'Closed door' },
    '/': { type: 'tile', name: 'Weapon', description: 'A weapon lies here' },
    ']': { type: 'tile', name: 'Armor', description: 'Armor lies here' },
    '^': { type: 'tile', name: 'Headgear', description: 'Headgear lies here' },
    '○': { type: 'tile', name: 'Ring', description: 'A ring lies here' },
    '!': { type: 'tile', name: 'Potion', description: 'A potion sits here' },
    '$': { type: 'tile', name: 'Chest', description: 'An unopened chest' },
    '★': { type: 'tile', name: 'Artifact', description: 'A mysterious artifact' },
    '♪': { type: 'tile', name: 'Special', description: 'Something special' },
    '▲': { type: 'tile', name: 'Shrine', description: 'An ancient shrine' },
    'V': { type: 'tile', name: 'Vendor', description: 'A merchant' }
  };
  
  return tileDescriptions[tile] || null;
}

/**
 * Show the tooltip with information
 */
function showTooltip(mouseX, mouseY, info) {
  if (!tooltipElement) return;
  
  let html = '';
  
  if (info.type === 'player') {
    html = `
      <div style="color: #4f9;">YOU</div>
      <div style="color: #f44;">HP: ${info.hp}/${info.hpMax}</div>
      ${formatEffects(info.effects)}
    `;
  } else if (info.type === 'npc') {
    const relationColor = info.hostile ? '#f44' : '#4f9';
    const relationText = info.hostile ? 'HOSTILE' : 'FRIENDLY';
    
    html = `
      <div style="color: #ff9;">${info.name}</div>
      ${info.faction ? `<div style="color: #aaa;">Faction: ${info.faction}</div>` : ''}
      ${info.factionReputation !== null ? `<div style="color: #9cf;">Faction Rep: ${info.factionReputation >= 0 ? '+' : ''}${info.factionReputation}</div>` : ''}
      <div style="color: #f44;">HP: ${info.hp}/${info.hpMax}</div>
      <div style="color: ${relationColor};">${relationText}</div>
      ${formatRelationship(info.relationship)}
      ${formatTraits(info.traits)}
      ${formatEffects(info.effects)}
    `;
  } else if (info.type === 'monster') {
    html = `
      <div style="color: #f94;">${info.name}</div>
      <div style="color: #f44;">HP: ${info.hp}/${info.hpMax}</div>
      ${info.tier ? `<div style="color: #aaa;">Tier ${info.tier}</div>` : ''}
      ${formatEffects(info.effects)}
    `;
  } else if (info.type === 'item') {
    html = `
      <div style="color: #4ff;">${info.name}</div>
      ${info.description ? `<div style="color: #aaa;">${info.description}</div>` : ''}
    `;
  } else if (info.type === 'tile') {
    html = `
      <div style="color: #888;">${info.name}</div>
      ${info.description ? `<div style="color: #666; font-size: 11px;">${info.description}</div>` : ''}
    `;
  }
  
  tooltipElement.innerHTML = html;
  tooltipElement.style.display = 'block';
  
  // Position tooltip (offset to avoid cursor)
  const offsetX = 15;
  const offsetY = 15;
  
  // Adjust position if tooltip would go off screen
  const tooltipRect = tooltipElement.getBoundingClientRect();
  let posX = mouseX + offsetX;
  let posY = mouseY + offsetY;
  
  if (posX + tooltipRect.width > window.innerWidth) {
    posX = mouseX - tooltipRect.width - offsetX;
  }
  
  if (posY + tooltipRect.height > window.innerHeight) {
    posY = mouseY - tooltipRect.height - offsetY;
  }
  
  tooltipElement.style.left = posX + 'px';
  tooltipElement.style.top = posY + 'px';
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.style.display = 'none';
  }
}

/**
 * Format status effects for display
 */
function formatEffects(effects) {
  if (!effects || effects.length === 0) return '';
  
  const effectList = effects.map(e => {
    const color = e.type.includes('buff') ? '#4f9' : 
                  e.type.includes('debuff') ? '#f44' : '#ff9';
    return `<span style="color: ${color};">${e.type}(${e.turns})</span>`;
  }).join(', ');
  
  return `<div style="margin-top: 4px;">Effects: ${effectList}</div>`;
}

/**
 * Format relationship info
 */
function formatRelationship(rel) {
  if (!rel) return '';
  
  return `
    <div style="margin-top: 4px; font-size: 11px; color: #aaa;">
      Trust: ${rel.trust || 0} | 
      Value: ${rel.value || 0} | 
      Respect: ${rel.respect || 0}
    </div>
  `;
}

/**
 * Format NPC traits
 */
function formatTraits(traits) {
  if (!traits || traits.length === 0) return '';
  
  return `
    <div style="margin-top: 4px; font-size: 11px; color: #99f;">
      Traits: ${traits.join(', ')}
    </div>
  `;
}

/**
 * Update the state reference (call this when state changes)
 */
export function updateCursorInspectState(newState) {
  gameState = newState;
}

export default {
  init: initCursorInspect,
  update: updateCursorInspectState,
  hide: hideTooltip
};