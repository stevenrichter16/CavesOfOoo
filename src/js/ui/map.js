// ui/map.js - World Map UI module
import { on, emit } from '../events.js';
import { EventType } from '../eventTypes.js';
import { initMapCursor, renderWorldMap, handleMapNavigation } from '../worldMap.js';

// Map UI state
let mapState = {
  isOpen: false
};

// Event types for map
export const MapEvents = {
  OpenWorldMap: 'openWorldMap',
  CloseWorldMap: 'closeWorldMap',
  NavigateMap: 'navigateMap'
};

/**
 * Initialize map UI and event listeners
 */
export function initMapUI() {
  // Listen for map events
  on(MapEvents.OpenWorldMap, ({ state }) => {
    openMap(state);
  });
  
  on(MapEvents.CloseWorldMap, () => {
    closeMap();
  });
  
  on(MapEvents.NavigateMap, ({ direction, state }) => {
    if (mapState.isOpen) {
      handleMapNavigation(state, direction);
      renderMap(state);
    }
  });
}

/**
 * Open the world map
 */
export function openMap(state) {
  mapState.isOpen = true;
  state.ui.mapOpen = true;  // Set the state flag
  initMapCursor(state);
  renderMap(state);
}

/**
 * Close the world map
 */
export function closeMap() {
  mapState.isOpen = false;
  const mapOverlay = document.getElementById('mapOverlay');
  if (mapOverlay) {
    mapOverlay.classList.remove('active');
  }
}

/**
 * Render the world map
 */
export function renderMap(state) {
  const mapOverlay = document.getElementById('mapOverlay');
  const mapContent = document.getElementById('mapContent');
  
  if (!mapOverlay || !mapContent) return;
  
  mapContent.innerHTML = renderWorldMap(state);
  mapOverlay.classList.add('active');
}

/**
 * Check if map is open
 */
export function isMapOpen() {
  return mapState.isOpen;
}