// src/js/world/candyShoppingDistrictClean.js
// Clean, organized shopping district layout

import { W as CHUNK_WIDTH, H as CHUNK_HEIGHT } from '../core/config.js';
import { createTileGrid, setTile } from './tileUtils.js';

const LETTER_TILE_IDS = {
  a: 'decoration.sign.letter.a',
  b: 'decoration.sign.letter.b',
  c: 'decoration.sign.letter.c',
  e: 'decoration.sign.letter.e',
  f: 'decoration.sign.letter.f',
  g: 'decoration.sign.letter.g',
  h: 'decoration.sign.letter.h',
  i: 'decoration.sign.letter.i',
  l: 'decoration.sign.letter.l',
  m: 'decoration.sign.letter.m',
  o: 'decoration.sign.letter.o',
  p: 'decoration.sign.letter.p',
  r: 'decoration.sign.letter.r',
  t: 'decoration.sign.letter.t',
  y: 'decoration.sign.letter.y'
};

function getLetterTileId(letter) {
  const tileId = letter ? LETTER_TILE_IDS[letter.toLowerCase()] : null;
  if (!tileId) {
    throw new Error(`TileRegistry does not define a sign tile for letter '${letter}'`);
  }
  return tileId;
}

function inBounds(x, y) {
  return x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT;
}

/**
 * Generate a clean, organized Candy Kingdom Shopping District
 * Less visual clutter, better organization
 */
export function generateCleanShoppingDistrict(cx, cy, seed) {
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);
  const writeIfDefault = (x, y, tileId) => {
    if (inBounds(x, y) && tileIds[y][x] === 'floor.default') {
      write(x, y, tileId);
    }
  };

  // ========================================
  // MAIN STREETS - Simple and Clear
  // ========================================

  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, 10, 'road.paved.main');
    write(x, 11, 'road.paved.main');
    write(x, 12, 'road.paved.main');
  }

  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, 5, 'floor.candy.walkway');
    write(x, 6, 'floor.candy.walkway');
  }

  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, 16, 'floor.candy.walkway');
    write(x, 17, 'floor.candy.walkway');
  }

  // ========================================
  // CENTRAL PLAZA - Simple and Elegant
  // ========================================

  for (let y = 8; y <= 14; y++) {
    for (let x = 20; x <= 28; x++) {
      if (y >= 10 && y <= 12) continue; // Preserve boulevard tiles
      write(x, y, 'floor.candy.polished');
    }
  }

  write(24, 11, 'decoration.fountain.center');

  // Corner benches surrounding fountain
  write(21, 9, 'furniture.bench.horizontal');
  write(27, 9, 'furniture.bench.horizontal');
  write(21, 13, 'furniture.bench.horizontal');
  write(27, 13, 'furniture.bench.horizontal');

  // ========================================
  // SHOPS - Organized in Clear Rows
  // ========================================

  drawShop(write, 2, 2, 6, 3, 'pharmacy');
  write(4, 4, 'door.closed');

  drawShop(write, 9, 2, 6, 3, 'pizza');
  write(11, 4, 'door.closed');

  drawShop(write, 16, 2, 6, 3, 'candy');
  write(18, 4, 'door.closed');

  drawShop(write, 23, 2, 6, 3, 'lollipop');
  write(25, 4, 'door.closed');

  drawShop(write, 30, 2, 6, 3, 'chocolate');
  write(32, 4, 'door.closed');

  drawShop(write, 37, 2, 6, 3, 'tarts');
  write(39, 4, 'door.closed');

  drawShop(write, 2, 18, 6, 3, 'brooms');
  write(4, 18, 'door.closed');

  drawShop(write, 9, 18, 6, 3, 'goose');
  write(11, 18, 'door.closed');

  drawShop(write, 16, 18, 6, 3, 'market');
  write(18, 18, 'door.closed');

  drawShop(write, 23, 18, 6, 3, 'goods');
  write(25, 18, 'door.closed');

  // ========================================
  // SPECIAL BUILDINGS
  // ========================================

  drawBuilding(write, 38, 7, 8, 4, 'HOTEL');
  write(42, 10, 'door.closed');

  drawBuilding(write, 35, 16, 10, 5, 'OFFICE');
  write(40, 20, 'door.closed');

  // ========================================
  // LANDSCAPING - Minimal and Clean
  // ========================================

  for (let x = 5; x < CHUNK_WIDTH; x += 10) {
    writeIfDefault(x, 7, 'decoration.streetlamp');
    writeIfDefault(x, 15, 'decoration.streetlamp');
  }

  write(10, 1, 'decoration.candy.tree');
  write(20, 1, 'decoration.candy.tree');
  write(30, 1, 'decoration.candy.tree');
  write(40, 1, 'decoration.candy.tree');

  const npcData = getCleanNPCData(cx, cy);

  return {
    map,
    tileIds,
    monsters: [],
    items: [],
    npcs: [],
    biome: 'candy_kingdom',
    cx,
    cy,
    isMarket: true,
    special: 'shopping_district_clean',
    npcData
  };
}

function drawShop(write, x, y, width, height, label) {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!inBounds(x + dx, y + dy)) continue;
      const isBorder = dy === 0 || dy === height - 1 || dx === 0 || dx === width - 1;
      if (isBorder) {
        write(x + dx, y + dy, 'wall.brick.fill');
      } else {
        write(x + dx, y + dy, 'floor.candy.polished');
      }
    }
  }

  if (label && label.length > 0) {
    const labelY = y - 1;
    const labelX = x + 2;
    if (inBounds(labelX, labelY)) {
      write(labelX, labelY, getLetterTileId(label[0]));
    }
  }
}

function drawBuilding(write, x, y, width, height, label) {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!inBounds(x + dx, y + dy)) continue;
      const isBorder = dy === 0 || dy === height - 1 || dx === 0 || dx === width - 1;
      if (isBorder) {
        write(x + dx, y + dy, 'structure.building.block');
      } else {
        write(x + dx, y + dy, 'floor.candy.polished');
      }
    }
  }

  if (label && label.length > 0 && inBounds(x + 1, y + 1)) {
    for (let i = 0; i < Math.min(label.length, width - 2); i++) {
      const lx = x + i + 1;
      const ly = y + 1;
      if (inBounds(lx, ly)) {
        write(lx, ly, getLetterTileId(label[i]));
      }
    }
  }
}

/**
 * Generate NPC data for clean shopping district
 */
function getCleanNPCData(cx, cy) {
  return [
    {
      id: 'pharmacist_ann',
      name: 'Ann',
      x: 4,
      y: 3,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'medicine',
      traits: ['helpful', 'knowledgeable', 'serious'],
      hp: 25,
      hpMax: 25,
      shopkeeper: true,
      symbol: '👩',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'pizza_sassy',
      name: 'Pizza Sassy',
      x: 11,
      y: 3,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'pizza',
      traits: ['energetic', 'friendly', 'italian'],
      hp: 30,
      hpMax: 30,
      shopkeeper: true,
      symbol: '🍕',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'candy_vendor',
      name: 'Candy Merchant',
      x: 18,
      y: 3,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'candy_corn',
      traits: ['sweet', 'cheerful'],
      hp: 25,
      hpMax: 25,
      shopkeeper: true,
      symbol: '🍬',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'lollipop_lady',
      name: 'Lollipop Lady',
      x: 25,
      y: 3,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'lollipops',
      traits: ['colorful', 'bubbly'],
      hp: 25,
      hpMax: 25,
      shopkeeper: true,
      symbol: '🍭',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'chocolate_artisan',
      name: 'Chocolate Artisan',
      x: 32,
      y: 3,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'chocolate',
      traits: ['refined', 'artistic'],
      hp: 25,
      hpMax: 25,
      shopkeeper: true,
      symbol: '🍫',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'royal_baker',
      name: 'Royal Tart Baker',
      x: 39,
      y: 3,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'royal_tarts',
      traits: ['prestigious', 'skilled'],
      hp: 30,
      hpMax: 30,
      shopkeeper: true,
      symbol: '👑',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'broom_keeper',
      name: 'Broom Keeper',
      x: 4,
      y: 19,
      faction: 'merchants',
      dialogueType: 'merchants',
      goods: 'brooms',
      traits: ['practical', 'no-nonsense'],
      hp: 25,
      hpMax: 25,
      shopkeeper: true,
      symbol: '🧹',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'choose_goose',
      name: 'Choose Goose',
      x: 11,
      y: 19,
      faction: 'merchants',
      dialogueType: 'choose_goose',
      goods: 'miscellaneous',
      traits: ['poetic', 'mysterious', 'trader'],
      hp: 30,
      hpMax: 30,
      shopkeeper: true,
      symbol: '🦆',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'root_beer_guy',
      name: 'Root Beer Guy',
      x: 38,
      y: 18,
      faction: 'peasants',
      dialogueType: 'root_beer_guy',
      traits: ['tired', 'working-class', 'kind'],
      hp: 20,
      hpMax: 20,
      symbol: '🍺',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'peppermint_butler',
      name: 'Peppermint Butler',
      x: 24,
      y: 11,
      faction: 'nobles',
      dialogueType: 'peppermint_butler',
      traits: ['formal', 'mysterious', 'loyal'],
      hp: 35,
      hpMax: 35,
      symbol: '🍬',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'starchy',
      name: 'Starchy',
      x: 22,
      y: 9,
      faction: 'peasants',
      dialogueType: 'starchy',
      traits: ['paranoid', 'cowardly', 'gardener'],
      hp: 15,
      hpMax: 15,
      symbol: '🥔',
      chunkX: cx,
      chunkY: cy
    }
  ];
}
