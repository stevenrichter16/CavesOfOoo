import { BIOME_TIERS } from './config.js';
import { loadChunk, saveChunk } from './persistence.js';
import { genChunk } from './worldGen.js';

// Map display configuration
const MAP_WIDTH = 29;  // Visible map width in chunks
const MAP_HEIGHT = 15; // Visible map height in chunks

// Biome display characters
const BIOME_CHARS = {
  candy_forest: '░',
  slime_kingdom: '░',
  frost_caverns: '▓',
  volcanic_marsh: '▒',
  corrupted_dungeon: '█',
  lich_domain: '█',
  // Legacy biome names
  candy: '░',
  slime: '░',
  ice: '▓',
  fire: '▒'
};

// Get biome CSS class for coloring
function getBiomeClass(biome) {
  const biomeMap = {
    candy_forest: 'candy',
    slime_kingdom: 'slime',
    frost_caverns: 'frost',
    volcanic_marsh: 'volcanic',
    corrupted_dungeon: 'corrupted',
    lich_domain: 'lich',
    // Legacy
    candy: 'candy',
    slime: 'slime',
    ice: 'frost',
    fire: 'volcanic'
  };
  return biomeMap[biome] || 'unknown';
}

// Get danger level for a chunk position
function getDangerLevel(cx, cy) {
  const distance = Math.abs(cx) + Math.abs(cy);
  return Math.floor(distance / 4);
}

// Get danger display class
function getDangerClass(danger) {
  if (danger === 0) return 'danger-safe';
  if (danger <= 2) return 'danger-low';
  if (danger <= 4) return 'danger-medium';
  if (danger <= 6) return 'danger-high';
  return 'danger-extreme';
}

// Generate the world map display
export function generateWorldMap(state) {
  const { cx: playerCx, cy: playerCy, worldSeed } = state;
  
  // Calculate map bounds centered on player
  const startX = playerCx - Math.floor(MAP_WIDTH / 2);
  const startY = playerCy - Math.floor(MAP_HEIGHT / 2);
  const endX = startX + MAP_WIDTH;
  const endY = startY + MAP_HEIGHT;
  
  // Build the map grid
  const mapGrid = [];
  const exploredChunks = new Set();
  
  // Collect all explored chunks from localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(`ooo_enhanced_v1:${worldSeed}:`)) {
      const parts = key.split(':');
      if (parts.length === 4) {
        const cx = parseInt(parts[2]);
        const cy = parseInt(parts[3]);
        exploredChunks.add(`${cx},${cy}`);
      }
    }
  });
  
  // Always add current chunk as explored
  exploredChunks.add(`${playerCx},${playerCy}`);
  
  // Check for active fetch quests with vendor locations
  const questVendorLocations = new Set();
  if (state.player.quests.active && state.player.quests.fetchQuests) {
    state.player.quests.active.forEach(questId => {
      const fetchQuest = state.player.quests.fetchQuests[questId];
      if (fetchQuest && fetchQuest.vendorChunk) {
        questVendorLocations.add(`${fetchQuest.vendorChunk.x},${fetchQuest.vendorChunk.y}`);
      }
    });
  }
  
  // Generate map display
  for (let y = startY; y < endY; y++) {
    const row = [];
    for (let x = startX; x < endX; x++) {
      const isExplored = exploredChunks.has(`${x},${y}`);
      const isCurrentChunk = (x === playerCx && y === playerCy);
      const isCursorPosition = (x === state.mapCursor.x && y === state.mapCursor.y);
      const hasQuestVendor = questVendorLocations.has(`${x},${y}`);
      
      let cellData = {
        x: x,
        y: y,
        char: '·',
        cssClass: 'unexplored',
        isPlayer: isCurrentChunk,
        isCursor: isCursorPosition,
        isExplored: isExplored,
        hasQuestVendor: hasQuestVendor,
        biome: null
      };
      
      // Try to load actual chunk data if it exists
      const existingChunk = loadChunk(worldSeed, x, y) || (isCurrentChunk ? state.chunk : null);
      
      if (existingChunk) {
        // Use actual biome from saved/current chunk
        const biome = existingChunk.biome;
        cellData.biome = biome;
        cellData.char = BIOME_CHARS[biome] || '?';
        cellData.cssClass = getBiomeClass(biome);
        if (!isExplored && !isCurrentChunk) {
          cellData.cssClass += ' dim'; // Dim if not explored
        }
      } else {
        // Generate biome based on distance (same algorithm as worldGen.js)
        const distance = Math.abs(x) + Math.abs(y);
        const maxTier = Math.min(Math.max(1, 1 + Math.floor(distance / 4)), 6);
        const minTier = Math.max(1, maxTier - 1);
        
        // Get biomes for this tier range
        const availableBiomes = Object.values(BIOME_TIERS)
          .filter(biome => biome.tier >= minTier && biome.tier <= maxTier);
        
        // Use a seeded random based on world seed and coordinates for consistent generation
        // This creates more natural-looking biome clusters
        const seed = worldSeed + x * 1000 + y;
        const pseudoRandom = Math.sin(seed) * 10000;
        const biomeIndex = Math.floor(Math.abs(pseudoRandom) % availableBiomes.length);
        const biome = availableBiomes[biomeIndex] || BIOME_TIERS.candy_forest;
        
        cellData.biome = biome.id;
        cellData.char = BIOME_CHARS[biome.id] || '░';
        cellData.cssClass = getBiomeClass(biome.id) + ' dim'; // Always dim unexplored
      }
      
      
      row.push(cellData);
    }
    mapGrid.push(row);
  }
  
  return {
    grid: mapGrid,
    playerPos: { x: playerCx, y: playerCy },
    cursorPos: state.mapCursor,
    startX: startX,
    startY: startY
  };
}

// Render the world map to HTML
export function renderWorldMap(state) {
  const mapData = generateWorldMap(state);
  const { grid, playerPos, cursorPos } = mapData;
  
  // Get current biome name
  const currentBiome = state.chunk?.biome || 'Unknown';
  const biomeInfo = Object.values(BIOME_TIERS).find(b => 
    b.id === currentBiome || currentBiome === b.id.split('_')[0]
  );
  const biomeName = biomeInfo ? biomeInfo.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : currentBiome;
  
  // Get cursor chunk info
  const cursorChunk = loadChunk(state.worldSeed, cursorPos.x, cursorPos.y);
  const cursorBiome = cursorChunk?.biome;
  const cursorBiomeInfo = cursorBiome ? Object.values(BIOME_TIERS).find(b => 
    b.id === cursorBiome || cursorBiome === b.id.split('_')[0]
  ) : null;
  const cursorBiomeName = cursorBiomeInfo ? 
    cursorBiomeInfo.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
    (cursorBiome || 'Unexplored');
  
  // Calculate distances and danger
  const distance = Math.abs(playerPos.x) + Math.abs(playerPos.y);
  const danger = getDangerLevel(playerPos.x, playerPos.y);
  const dangerText = danger === 0 ? 'SAFE' : 
                     danger <= 2 ? 'LOW' : 
                     danger <= 4 ? 'MEDIUM' :
                     danger <= 6 ? 'HIGH' : 'EXTREME';
  
  const cursorDistance = Math.abs(cursorPos.x) + Math.abs(cursorPos.y);
  const cursorDanger = getDangerLevel(cursorPos.x, cursorPos.y);
  
  // Build the map display
  let mapHtml = `
    <div class="map-container">
      <div class="map-frame">
        <span class="frame-char">╔════════════════════════════════════════════════════════╗</span>\n`;
  mapHtml += `        <span class="frame-char">║</span>                   <span class="title">WORLD OF OOO - MAP</span>                    <span class="frame-char">║</span>\n`;
  mapHtml += `        <span class="frame-char">╠════════════════════════════════════════════════════════╣</span>\n`;
  
  // Add map grid
  grid.forEach((row, rowIndex) => {
    mapHtml += `        <span class="frame-char">║</span> `;
    
    row.forEach(cell => {
      if (cell.isPlayer) {
        // Show player position with biome character
        const char = cell.char || '■';
        mapHtml += `<span class="player-pos">[${char}]</span>`;
      } else if (cell.isCursor) {
        // Show cursor with brackets
        mapHtml += `<span class="cursor-highlight ${cell.cssClass}">[${cell.char}]</span>`;
      } else if (cell.hasQuestVendor) {
        // Show quest vendor location with a special marker
        mapHtml += `<span class="${cell.cssClass}" style="color: #FFD700; font-weight: bold;">[V]</span>`;
      } else {
        // Show all biomes, explored or not
        mapHtml += `<span class="${cell.cssClass}">${cell.char}${cell.char}</span>`;
      }
    });
    
    mapHtml += ` <span class="frame-char">║</span>\n`;
  });
  
  
  mapHtml += `        <span class="frame-char">╚════════════════════════════════════════════════════════╝</span>
      </div>

      <div class="info-panel">
        <div class="info-row">
          <span><span class="player-pos">[■]</span> Your Location: (${playerPos.x}, ${playerPos.y})</span>
          <span>Current Biome: <span class="${getBiomeClass(currentBiome)}">${biomeName}</span></span>
        </div>
        <div class="info-row">
          <span>Danger Level: <span class="${getDangerClass(danger)}">${dangerText}</span></span>
          <span>Distance from Spawn: ${distance}</span>
        </div>
        <hr style="margin: 10px 0; border-color: #2c2f33;">
        <div class="info-row">
          <span><span class="cursor-highlight">[·]</span> Cursor: (${cursorPos.x}, ${cursorPos.y})</span>
          <span>Biome: <span class="${cursorBiome ? getBiomeClass(cursorBiome) : 'unexplored'}">${cursorBiomeName}</span></span>
        </div>
        <div class="info-row">
          <span>Danger: <span class="${getDangerClass(cursorDanger)}">${cursorDanger}</span></span>
          <span>Distance: ${cursorDistance}</span>
        </div>
      </div>

      <div class="legend">
        <div class="legend-item">
          <span class="legend-symbol candy">░</span> Candy/Slime
        </div>
        <div class="legend-item">
          <span class="legend-symbol frost">▓</span> Frost
        </div>
        <div class="legend-item">
          <span class="legend-symbol volcanic">▒</span> Volcanic
        </div>
        <div class="legend-item">
          <span class="legend-symbol corrupted">█</span> Corrupted
        </div>
        <div class="legend-item">
          <span class="legend-symbol lich">█</span> Lich
        </div>
        <div class="legend-item">
          <span class="unexplored">··</span> Unexplored
        </div>
        <div class="legend-item">
          <span style="color: #FFD700; font-weight: bold;">[V]</span> Quest Vendor
        </div>
      </div>

      <div class="controls">
        <span class="control-key">[↑↓←→]</span> Navigate &nbsp;&nbsp;
        <span class="control-key">[Enter]</span> Travel &nbsp;&nbsp;
        <span class="control-key">[M/Esc]</span> Close Map
      </div>
    </div>
  `;
  
  return mapHtml;
}

// Initialize map cursor
export function initMapCursor(state) {
  if (!state.mapCursor) {
    state.mapCursor = { x: state.cx, y: state.cy };
  }
}

// Handle map navigation
export function handleMapNavigation(state, key) {
  if (!state.mapCursor) initMapCursor(state);
  
  switch(key) {
    case 'ArrowUp':
      state.mapCursor.y--;
      return true;
    case 'ArrowDown':
      state.mapCursor.y++;
      return true;
    case 'ArrowLeft':
      state.mapCursor.x--;
      return true;
    case 'ArrowRight':
      state.mapCursor.x++;
      return true;
    case 'Enter':
      // Fast travel to selected chunk (only if explored)
      const isExplored = loadChunk(state.worldSeed, state.mapCursor.x, state.mapCursor.y) !== null;
      if (isExplored) {
        // Save current chunk before traveling
        saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
        
        // Load new chunk
        state.cx = state.mapCursor.x;
        state.cy = state.mapCursor.y;
        
        const existing = loadChunk(state.worldSeed, state.cx, state.cy);
        state.chunk = existing ? existing : genChunk(state.worldSeed, state.cx, state.cy);
        
        // Place player at center of new chunk
        state.player.x = Math.floor(48 / 2);
        state.player.y = Math.floor(22 / 2);
        
        return 'travel'; // Signal to close map and update game
      }
      return true;
    case 'm':
    case 'M':
    case 'Escape':
      return 'close'; // Signal to close map
    default:
      return false;
  }
}