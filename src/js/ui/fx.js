// ui/fx.js - Visual effects module (DOM-based)
import { on } from '../events.js';
import { EventType } from '../eventTypes.js';

// Subscribe to floating text events
on(EventType.FloatingText, ({ x, y, text, kind }) => {
  const el = document.createElement('div');
  el.className = `float ${kind || ''}`;
  el.textContent = text;
  
  // Position relative to Canvas tile grid
  // Canvas tile size: 16x16px
  el.style.position = 'absolute';
  el.style.left = `${x * 16}px`;
  el.style.top = `${y * 16}px`;
  el.style.pointerEvents = 'none';
  el.style.zIndex = '1000';
  
  // Add to the particle container if it exists, otherwise fall back to game container
  const particleContainer = document.getElementById('particle-container');
  const gameContainer = document.getElementById('game');
  const targetContainer = particleContainer || (gameContainer && gameContainer.parentElement);
  
  if (targetContainer) {
    targetContainer.appendChild(el);
    
    // Remove after animation completes
    setTimeout(() => el.remove(), 800);
  }
});

// Optional: Subscribe to screen shake events
on(EventType.Shake, ({ intensity = 5, duration = 200 }) => {
  const gameElement = document.querySelector('.game');
  if (!gameElement) return;
  
  gameElement.style.animation = `shake ${duration}ms`;
  
  setTimeout(() => {
    gameElement.style.animation = '';
  }, duration);
});

// Optional: Subscribe to sound events
on(EventType.PlaySound, ({ sound }) => {
  // Placeholder for sound effects
  // You could integrate with Web Audio API or HTML5 audio here
  // Sound effect placeholder
});