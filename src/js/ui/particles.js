// particles.js - ASCII particle effects for status effects
import { on } from '../events.js';
import { EventType } from '../eventTypes.js';

// Particle configurations for each status effect
const particleConfigs = {
  burn: {
    chars: ['*', '·', '•'],
    rate: 6,  // Higher rate = more particles per second
    spread: 15,
    className: 'particle-burn',
    duration: 1000
  },
  fire: {
    chars: ['*', '·', '•'],
    rate: 6,
    spread: 15,
    className: 'particle-burn',
    duration: 1000
  },
  freeze: {
    chars: ['*', '❄', '·'],
    rate: 4,
    spread: 15,
    className: 'particle-freeze',
    duration: 1500
  },
  ice: {
    chars: ['*', '❄', '·'],
    rate: 4,
    spread: 15,
    className: 'particle-freeze',
    duration: 1500
  },
  shock: {
    chars: ['!', '|', '/', '\\', '-', '⚡'],
    rate: 8,  // Very fast for electric effect
    spread: 10,
    className: 'particle-shock',
    duration: 800
  },
  poison: {
    chars: ['o', 'O', '·', '*', '☠'],
    rate: 5,
    spread: 12,
    className: 'particle-poison',
    duration: 1200
  },
  weaken: {
    chars: ['v', 'V', '-', '_'],
    rate: 3,
    spread: 10,
    className: 'particle-weaken',
    duration: 1000
  },
  weakness: {
    chars: ['v', 'V', '-', '_'],
    rate: 3,
    spread: 10,
    className: 'particle-weaken',
    duration: 1000
  },
  buff_str: {
    chars: ['^', '!', '+', '*', '↑'],
    rate: 5,
    spread: 15,
    className: 'particle-strength',
    duration: 800
  },
  buff_def: {
    chars: ['[', ']', '#', '+', '▪'],
    rate: 4,
    spread: 12,
    className: 'particle-defense',
    duration: 1000
  },
  bleed: {
    chars: ['·', 'o', '*', '•'],
    rate: 4,
    spread: 10,
    className: 'particle-bleed',
    duration: 1000
  }
};

let particleId = 0;
let activeEffects = new Map(); // Track active particle intervals

export function initParticles() {
  console.log('Particle system initialized');
  
  // Listen for status effect events
  on(EventType.StatusEffectRegister, ({ toId, type, vs, turns }) => {
    // Determine entity ID - use vs (visual name) if toId not provided
    const entityId = toId || (vs === 'You' ? 'player' : vs);
    console.log("in initParticles()")
    console.log('StatusEffectRegister:', type, 'on', entityId);
    
    // Get position of entity
    const pos = getEntityPosition(entityId);
    if (pos) {
      createStatusParticles(pos.x, pos.y, type, entityId);
    } else {
      console.log('Particle system: Could not find position for', entityId, 'vs:', vs);
    }
  });
  
  on(EventType.StatusEffectPerform, ({ toId, effect }) => {
    // Create occasional extra particles for ongoing damage effects
    const entityId = toId || 'player';
    const pos = getEntityPosition(entityId);
    if (pos && Math.random() < 0.5) { // 50% chance per tick for more visibility
      createSingleParticle(pos.x, pos.y, effect);
    }
  });
  
  on(EventType.StatusEffectExpired, ({ toId, effect }) => {
    // Stop particle generation for this entity/effect
    const entityId = toId || 'player';
    const key = `${entityId}-${effect}`;
    if (activeEffects.has(key)) {
      clearInterval(activeEffects.get(key));
      activeEffects.delete(key);
      console.log('StatusEffectExpired: Stopped particles for', key);
    }
  });
  
  // Clean up when entity dies
  on(EventType.EntityDied, ({ id }) => {
    // Clear all effects for this entity
    const entityId = id || 'unknown';
    console.log('Entity died, clearing particles for', entityId);
    
    for (const [key, interval] of activeEffects.entries()) {
      if (key.startsWith(`${entityId}-`)) {
        clearInterval(interval);
        activeEffects.delete(key);
        console.log('Cleared particles for dead entity:', key);
      }
    }
  });
}

function getEntityPosition(entityId) {
  // Try to get position from the game state if available
  if (window.STATE) {
    const state = window.STATE;
    
    // For player
    if (entityId === 'player' || entityId === 'You') {
      if (state.player) {
        return { x: state.player.x, y: state.player.y };
      }
    }
    
    // For monsters - check by coordinates in ID
    if (entityId && entityId.includes('monster_')) {
      const parts = entityId.split('_');
      if (parts.length >= 3) {
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        if (!isNaN(x) && !isNaN(y)) {
          return { x, y };
        }
      }
    }
    
    // Check monsters in current chunk
    if (state.chunk && state.chunk.monsters) {
      for (const monster of state.chunk.monsters) {
        if (monster.alive) {
          const mId = `monster_${monster.x}_${monster.y}`;
          if (mId === entityId) {
            return { x: monster.x, y: monster.y };
          }
        }
      }
    }
  }
  
  return null;
}

function createStatusParticles(x, y, statusType, entityId) {
  const config = particleConfigs[statusType];
  if (!config) return;
  
  // Clear any existing effect for this entity
  const key = `${entityId}-${statusType}`;
  if (activeEffects.has(key)) {
    clearInterval(activeEffects.get(key));
  }
  
  // Create initial burst of particles
  for (let i = 0; i < 3; i++) {
    setTimeout(() => createSingleParticle(x, y, statusType), i * 100);
  }
  
  // Create periodic particles continuously while effect is active
  // The interval will be cleared when StatusEffectExpired event fires
  const interval = setInterval(() => {
    // Update position in case entity moved
    const currentPos = getEntityPosition(entityId);
    if (currentPos) {
      createSingleParticle(currentPos.x, currentPos.y, statusType);
    }
  }, 1000 / config.rate);
  
  activeEffects.set(key, interval);
}

function createSingleParticle(x, y, statusType) {
  const config = particleConfigs[statusType];
  if (!config) return;
  
  // Use the dedicated particle container
  const particleContainer = document.getElementById('particle-container');
  if (!particleContainer) return;
  
  // Canvas mode only - use fixed dimensions based on canvas tile size
  const charWidth = 16;  // CANVAS_CONFIG.TILE_SIZE
  const charHeight = 16; // CANVAS_CONFIG.TILE_SIZE
  
  // Create particle element
  const particle = document.createElement('div');
  particle.className = `status-particle ${config.className}`;
  particle.id = `particle-${particleId++}`;
  particle.style.position = 'absolute';
  
  // Choose random character
  const char = config.chars[Math.floor(Math.random() * config.chars.length)];
  particle.textContent = char;
  
  // Set random drift
  const drift = (Math.random() - 0.5) * config.spread;
  particle.style.setProperty('--drift-x', `${drift}px`);
  
  // Position particle at entity location
  const offsetX = (Math.random() - 0.5) * 8;
  const offsetY = (Math.random() - 0.5) * 8;
  particle.style.left = `${x * charWidth + offsetX}px`;
  particle.style.top = `${y * charHeight + offsetY}px`;
  
  // Add to particle container
  particleContainer.appendChild(particle);
  
  // Remove particle after animation
  setTimeout(() => {
    if (particle.parentNode) {
      particle.remove();
    }
  }, config.duration);
}

// Clean up all active effects
export function clearAllParticles() {
  activeEffects.forEach(interval => clearInterval(interval));
  activeEffects.clear();
  
  // Remove any lingering particles
  document.querySelectorAll('.status-particle').forEach(p => p.remove());
}