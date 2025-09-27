// src/js/world/candyMarketChunk.js
// Candy Market - Starting chunk at coordinates (0, 0)

import { W, H } from '../core/config.js';
import { populateCandyMarketNPCs } from './candyMarketNPCs.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { createTileGrid, setTile } from './tileUtils.js';
import { getTileIdAt, getTileDefAt } from '../utils/queries.js';

// Use full viewport dimensions
const CHUNK_WIDTH = W;  // 48
const CHUNK_HEIGHT = H;  // 22

// Candy Market chunk coordinates (starting position)
export const CANDY_MARKET_COORDS = { x: 0, y: 0 };

/**
 * Generate the Candy Market layout
 * A bustling marketplace with various candy vendor stalls
 */
export function generateCandyMarketMap() {
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);

  const halfWidth = Math.floor(CHUNK_WIDTH / 2);
  const halfHeight = Math.floor(CHUNK_HEIGHT / 2);

  // Add market boundaries (decorative fencing)
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    if (x !== halfWidth && x !== halfWidth + 1) {
      write(x, 0, 'wall.stone.solid');
      write(x, CHUNK_HEIGHT - 1, 'wall.stone.solid');
    }
  }
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    if (y !== halfHeight) {
      write(0, y, 'wall.stone.solid');
      write(CHUNK_WIDTH - 1, y, 'wall.stone.solid');
    }
  }
  
  // Add market stalls in organized rows
  // Top row of stalls
  // Canopy Stall
  write(3, 3, 'structure.market.stall.canopy');
  write(4, 3, 'furniture.bench.horizontal');
  write(5, 3, 'furniture.bench.horizontal');
  
  // Table Stall
  write(8, 3, 'structure.market.stall.table');
  write(9, 3, 'furniture.bench.horizontal');
  write(10, 3, 'furniture.bench.horizontal');
  
  // Goods Table
  write(13, 3, 'structure.market.stall.goods_table');
  write(14, 3, 'furniture.bench.horizontal');
  write(15, 3, 'furniture.bench.horizontal');
  
  // Vendor Cart
  write(18, 3, 'structure.market.cart');
  write(19, 3, 'furniture.bench.horizontal');
  write(18, 4, 'structure.market.cart.support');
  write(19, 4, 'structure.market.cart.support');
  
  // Middle row of stalls
  // Table Stall
  write(4, 8, 'structure.market.stall.table');
  write(5, 8, 'furniture.bench.horizontal');
  write(6, 8, 'furniture.bench.horizontal');
  
  // Crate of Wares
  write(9, 8, 'structure.market.crate');
  write(9, 9, 'structure.market.crate');
  
  // Canopy Stall
  write(14, 8, 'structure.market.stall.canopy');
  write(15, 8, 'furniture.bench.horizontal');
  write(16, 8, 'furniture.bench.horizontal');
  
  // Vendor Cart
  write(19, 8, 'structure.market.cart');
  write(20, 8, 'furniture.bench.horizontal');
  write(19, 9, 'structure.market.cart.support');
  write(20, 9, 'structure.market.cart.support');
  
  // Bottom row of stalls
  // Goods Table
  write(3, 14, 'structure.market.stall.goods_table');
  write(4, 14, 'furniture.bench.horizontal');
  write(5, 14, 'furniture.bench.horizontal');
  
  // Crate of Wares
  write(8, 14, 'structure.market.crate');
  write(8, 15, 'structure.market.crate');
  
  // Table Stall
  write(12, 14, 'structure.market.stall.table');
  write(13, 14, 'furniture.bench.horizontal');
  write(14, 14, 'furniture.bench.horizontal');
  
  // Canopy Stall
  write(17, 14, 'structure.market.stall.canopy');
  write(18, 14, 'furniture.bench.horizontal');
  write(19, 14, 'furniture.bench.horizontal');
  
  // Add decorative elements
  // Lollipop decorations
  write(2, 5, 'decoration.candy.tree');
  write(CHUNK_WIDTH - 3, 5, 'decoration.candy.tree');
  write(2, 12, 'decoration.candy.tree');
  write(CHUNK_WIDTH - 3, 12, 'decoration.candy.tree');
  
  // Fountain in center
  write(halfWidth, 10, 'decoration.fountain.center');
  write(halfWidth + 1, 10, 'decoration.fountain.center');
  write(halfWidth, 11, 'decoration.fountain.center');
  write(halfWidth + 1, 11, 'decoration.fountain.center');
  
  // Some barrels and crates scattered around
  write(7, 6, 'container.barrel.candy');
  write(12, 7, 'container.barrel.candy');
  write(10, 13, 'container.barrel.candy');
  
  // Add paths (lighter stones)
  // Main paths
  for (let x = 1; x < CHUNK_WIDTH - 1; x++) {
    if (tileIds[6][x] === 'floor.default') write(x, 6, 'floor.candy.polished');
    if (tileIds[11][x] === 'floor.default') write(x, 11, 'floor.candy.polished');
  }
  for (let y = 1; y < CHUNK_HEIGHT - 1; y++) {
    if (tileIds[y][11] === 'floor.default') write(11, y, 'floor.candy.polished');
  }

  return { map, tileIds };
}

/**
 * Spawn market NPCs and items
 */
export function populateCandyMarket(state, cx, cy) {
  // Use the new NPC spawner module
  populateCandyMarketNPCs(state, { cx, cy });
  
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

  const tileId = getTileIdAt(state, x, y);
  if (!tileId) return false;
  return [
    'structure.market.stall.canopy',
    'structure.market.stall.table',
    'structure.market.stall.goods_table',
    'structure.market.cart',
    'structure.market.crate'
  ].includes(tileId);
}

/**
 * Handle market stall interactions
 */
export function handleMarketInteraction(state, x, y) {
  const tileId = getTileIdAt(state, x, y);
  const tileDef = getTileDefAt(state, x, y);
  const terrainName = tileDef?.terrain?.name;
  const description = tileDef?.terrain?.description;

  const message = (() => {
    switch (tileId) {
      case 'structure.market.stall.canopy':
        return "A colorful canopy stall with striped awning. Various candies on display.";
      case 'structure.market.stall.table':
        return "A pink table covered with gumdrops in green, brown, and blue.";
      case 'structure.market.stall.goods_table':
        return "A sturdy table lined with bottles of candy essence.";
      case 'structure.market.cart':
        return "A wheeled vendor cart with a cyan and pink striped awning.";
      case 'structure.market.crate':
        return "Wooden crates filled with colorful candies and sweets.";
      case 'decoration.candy.tree':
        return "A giant decorative lollipop with red and white swirls.";
      case 'decoration.fountain.center':
        return "A bubbling fountain of liquid candy. The air smells sweet here.";
      case 'container.barrel.candy':
        return "A barrel of candy supplies. Property of the Candy Kingdom.";
      case 'furniture.bench.horizontal':
      case 'structure.market.cart.support':
        return "Part of a vendor's stall.";
      default:
        if (description) return description;
        if (terrainName && terrainName !== 'unknown') {
          return `You inspect the ${terrainName}.`;
        }
        return null;
    }
  })();

  if (message && state.log) {
    const tone = tileId && tileId.includes('fountain') ? 'magic' : 'note';
    state.log(message, tone);
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
  
  const { map, tileIds } = generateCandyMarketMap();

  const chunk = {
    map,
    tileIds,
    monsters: [],
    items: [],
    npcs: [],
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
