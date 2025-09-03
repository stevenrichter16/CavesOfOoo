// src/js/world/candyMarketChunk.js
// Candy Market - Starting chunk at coordinates (0, 0)

import { W, H } from '../core/config.js';
import { spawnSocialNPC } from '../social/init.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// Candy Market chunk coordinates (starting position)
export const CANDY_MARKET_COORDS = { x: 0, y: 0 };

/**
 * Generate the Candy Market layout
 * A bustling marketplace with various candy vendor stalls
 */
export function generateCandyMarketMap() {
  const map = [];
  
  // Initialize with cobblestone floor (.)
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      map[y][x] = '.';
    }
  }
  
  // Add market boundaries (decorative fencing)
  for (let x = 0; x < W; x++) {
    if (x !== Math.floor(W/2) && x !== Math.floor(W/2) + 1) { // Leave entrance gaps
      map[0][x] = '#';
      map[H-1][x] = '#';
    }
  }
  for (let y = 0; y < H; y++) {
    if (y !== Math.floor(H/2)) { // Leave side entrances
      map[y][0] = '#';
      map[y][W-1] = '#';
    }
  }
  
  // Add market stalls in organized rows
  // Top row of stalls
  // Canopy Stall
  map[3][3] = '╬';
  map[3][4] = '═';  // Stall extension
  map[3][5] = '═';  // Stall extension
  
  // Table Stall
  map[3][8] = '╤';
  map[3][9] = '═';
  map[3][10] = '═';
  
  // Goods Table
  map[3][13] = '≡';
  map[3][14] = '═';
  map[3][15] = '═';
  
  // Vendor Cart
  map[3][18] = '¤';
  map[3][19] = '═';
  map[4][18] = '║';  // Cart body
  map[4][19] = '║';  // Cart body
  
  // Middle row of stalls
  // Table Stall
  map[8][4] = '╤';
  map[8][5] = '═';
  map[8][6] = '═';
  
  // Crate of Wares
  map[8][9] = '☐';
  map[9][9] = '☐';  // Stacked crates
  
  // Canopy Stall
  map[8][14] = '╬';
  map[8][15] = '═';
  map[8][16] = '═';
  
  // Vendor Cart
  map[8][19] = '¤';
  map[8][20] = '═';
  map[9][19] = '║';
  map[9][20] = '║';
  
  // Bottom row of stalls
  // Goods Table
  map[14][3] = '≡';
  map[14][4] = '═';
  map[14][5] = '═';
  
  // Crate of Wares
  map[14][8] = '☐';
  map[15][8] = '☐';
  
  // Table Stall
  map[14][12] = '╤';
  map[14][13] = '═';
  map[14][14] = '═';
  
  // Canopy Stall
  map[14][17] = '╬';
  map[14][18] = '═';
  map[14][19] = '═';
  
  // Add decorative elements
  // Lollipop decorations
  map[5][2] = '♣';
  map[5][W-3] = '♣';
  map[12][2] = '♣';
  map[12][W-3] = '♣';
  
  // Fountain in center
  map[10][Math.floor(W/2)] = '○';
  map[10][Math.floor(W/2) + 1] = '○';
  map[11][Math.floor(W/2)] = '○';
  map[11][Math.floor(W/2) + 1] = '○';
  
  // Some barrels and crates scattered around
  map[6][7] = 'b';  // Barrel
  map[7][12] = 'b';  // Barrel
  map[13][10] = 'b';  // Barrel
  
  // Add paths (lighter stones)
  // Main paths
  for (let x = 1; x < W - 1; x++) {
    if (map[6][x] === '.') map[6][x] = '·';  // Horizontal path
    if (map[11][x] === '.') map[11][x] = '·';  // Horizontal path
  }
  for (let y = 1; y < H - 1; y++) {
    if (map[y][11] === '.') map[y][11] = '·';  // Vertical path
  }
  
  return map;
}

/**
 * Spawn market NPCs and items
 */
export function populateCandyMarket(state) {
  // Spawn market vendors
  const vendors = [
    { name: 'Candy Corn Carl', x: 4, y: 4, goods: 'candy_corn' },
    { name: 'Lollipop Lucy', x: 9, y: 4, goods: 'lollipops' },
    { name: 'Gumdrop Gary', x: 14, y: 4, goods: 'gumdrops' },
    { name: 'Taffy Tom', x: 5, y: 9, goods: 'taffy' },
    { name: 'Chocolate Charlie', x: 15, y: 9, goods: 'chocolate' },
    { name: 'Peppermint Patty', x: 4, y: 15, goods: 'peppermints' },
    { name: 'Rock Candy Randy', x: 13, y: 15, goods: 'rock_candy' },
    { name: 'Cotton Candy Cathy', x: 18, y: 15, goods: 'cotton_candy' }
  ];
  
  vendors.forEach(vendor => {
    spawnSocialNPC(state, {
      id: vendor.goods + '_vendor',
      name: vendor.name,
      x: vendor.x,
      y: vendor.y,
      faction: 'merchants',
      dialogueType: 'merchant',
      goods: vendor.goods,
      traits: ['friendly', 'trader'],
      hp: 20,
      hpMax: 20,
      shopkeeper: true
    });
  });
  
  // Spawn some wandering candy citizens
  const citizens = [
    { name: 'Gummy Bear', x: 7, y: 7 },
    { name: 'Jellybean Joe', x: 15, y: 12 },
    { name: 'Marshmallow Mike', x: 3, y: 10 }
  ];
  
  citizens.forEach(citizen => {
    spawnSocialNPC(state, {
      id: citizen.name.toLowerCase().replace(' ', '_'),
      name: citizen.name,
      x: citizen.x,
      y: citizen.y,
      faction: 'peasants',
      dialogueType: 'peasant',
      traits: ['chatty'],
      hp: 15,
      hpMax: 15
    });
  });
  
  // Add welcome message
  if (state.log) {
    state.log("Welcome to the Candy Market! Browse the stalls and talk to vendors.", "note");
    state.log("Use arrow keys to move, hover cursor to inspect items.", "dim");
  }
  
  // Add some random items on the ground
  state.chunk.items = state.chunk.items || [];
  
  // A few gold coins scattered around
  state.chunk.items.push(
    { type: 'gold', amount: 5, x: 6, y: 5 },
    { type: 'gold', amount: 3, x: 16, y: 13 },
    { type: 'gold', amount: 7, x: 10, y: 17 }
  );
}

/**
 * Check if a position is a market stall
 */
export function isMarketStall(state, x, y) {
  if (!state.chunk || state.cx !== CANDY_MARKET_COORDS.x || state.cy !== CANDY_MARKET_COORDS.y) {
    return false;
  }
  
  const tile = state.chunk.map[y]?.[x];
  return tile === '╬' || tile === '╤' || tile === '≡' || tile === '¤' || tile === '☐';
}

/**
 * Handle market stall interactions
 */
export function handleMarketInteraction(state, x, y) {
  const tile = state.chunk.map[y][x];
  
  // Interacting with stalls
  if (tile === '╬') { // Canopy Stall
    if (state.log) {
      state.log("A colorful canopy stall with striped awning. Various candies on display.", "note");
    }
  } else if (tile === '╤') { // Table Stall
    if (state.log) {
      state.log("A pink table covered with gumdrops in green, brown, and blue.", "note");
    }
  } else if (tile === '≡') { // Goods Table
    if (state.log) {
      state.log("A sturdy brown table with bottles of candy essence.", "note");
    }
  } else if (tile === '¤') { // Vendor Cart
    if (state.log) {
      state.log("A wheeled vendor cart with cyan and pink striped awning.", "note");
    }
  } else if (tile === '☐') { // Crate of Wares
    if (state.log) {
      state.log("Wooden crates filled with colorful candies and sweets.", "note");
    }
  } else if (tile === '♣') { // Lollipop decoration
    if (state.log) {
      state.log("A giant decorative lollipop with red and white swirls.", "note");
    }
  } else if (tile === '○') { // Fountain
    if (state.log) {
      state.log("A bubbling fountain of liquid candy. The air smells sweet here.", "magic");
    }
  } else if (tile === 'b') { // Barrel
    if (state.log) {
      state.log("A barrel of candy supplies. Property of the Candy Kingdom.", "dim");
    }
  } else if (tile === '═' || tile === '║') { // Stall extensions
    if (state.log) {
      state.log("Part of a vendor's stall.", "dim");
    }
  }
}

/**
 * Generate the complete candy market chunk
 */
export function generateCandyMarketChunk(worldSeed, cx, cy) {
  // Only generate if at market coordinates
  if (cx !== CANDY_MARKET_COORDS.x || cy !== CANDY_MARKET_COORDS.y) {
    return null;
  }
  
  const chunk = {
    map: generateCandyMarketMap(),
    monsters: [],
    items: [],
    biome: 'candy_kingdom',
    cx: cx,
    cy: cy,
    isMarket: true,
    special: 'candy_market'
  };
  
  return chunk;
}

/**
 * Check if coordinates are the candy market
 */
export function isCandyMarketChunk(cx, cy) {
  return cx === CANDY_MARKET_COORDS.x && cy === CANDY_MARKET_COORDS.y;
}