// src/js/world/candyShoppingDistrictClean.js
// Clean, organized shopping district layout

import { W as CHUNK_WIDTH, H as CHUNK_HEIGHT } from '../core/config.js';

/**
 * Generate a clean, organized Candy Kingdom Shopping District
 * Less visual clutter, better organization
 */
export function generateCleanShoppingDistrict(cx, cy, seed) {
  const map = [];
  
  // Initialize with clean floor tiles
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.'; // Clean stone floor
    }
  }
  
  // ========================================
  // MAIN STREETS - Simple and Clear
  // ========================================
  
  // Main horizontal boulevard (3 tiles wide)
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[10][x] = '='; // Paved road
    map[11][x] = '=';
    map[12][x] = '=';
  }
  
  // North shopping lane (2 tiles wide)
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[5][x] = '-'; // Walkway
    map[6][x] = '-';
  }
  
  // South shopping lane (2 tiles wide)
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[16][x] = '-'; // Walkway
    map[17][x] = '-';
  }
  
  // ========================================
  // CENTRAL PLAZA - Simple and Elegant
  // ========================================
  
  // Plaza area (less cluttered) - avoid overwriting main streets
  for (let y = 8; y <= 14; y++) {
    for (let x = 20; x <= 28; x++) {
      // Don't overwrite main boulevard
      if (y >= 10 && y <= 12) continue;
      map[y][x] = '·'; // Plaza floor
    }
  }
  
  // Simple fountain (single tile)
  map[11][24] = '○'; // Fountain
  
  // Corner benches (minimal)
  map[9][21] = '═';  // Bench
  map[9][27] = '═';  // Bench
  map[13][21] = '═'; // Bench
  map[13][27] = '═'; // Bench
  
  // ========================================
  // SHOPS - Organized in Clear Rows
  // ========================================
  
  // === NORTH ROW SHOPS (y=2-4) ===
  
  // Pharmacy (6x3)
  drawShop(map, 2, 2, 6, 3, 'PHARMACY');
  map[4][4] = '+'; // Door
  
  // Pizza Shop (6x3)
  drawShop(map, 9, 2, 6, 3, 'PIZZA');
  map[4][11] = '+'; // Door
  
  // Candy Store (6x3)
  drawShop(map, 16, 2, 6, 3, 'CANDY');
  map[4][18] = '+'; // Door
  
  // Lollipop Shop (6x3)
  drawShop(map, 23, 2, 6, 3, 'LOLLIPOP');
  map[4][25] = '+'; // Door
  
  // Chocolate Shop (6x3)
  drawShop(map, 30, 2, 6, 3, 'CHOCOLATE');
  map[4][32] = '+'; // Door
  
  // Royal Tarts (6x3)
  drawShop(map, 37, 2, 6, 3, 'TARTS');
  map[4][39] = '+'; // Door
  
  // === SOUTH ROW SHOPS (y=18-20) ===
  
  // Broom Shop (6x3)
  drawShop(map, 2, 18, 6, 3, 'BROOMS');
  map[18][4] = '+'; // Door
  
  // Choose Goose Stall (6x3)
  drawShop(map, 9, 18, 6, 3, 'GOOSE');
  map[18][11] = '+'; // Door
  
  // Market Stalls (6x3 each)
  drawShop(map, 16, 18, 6, 3, 'MARKET');
  map[18][18] = '+'; // Door
  
  drawShop(map, 23, 18, 6, 3, 'GOODS');
  map[18][25] = '+'; // Door
  
  // === SPECIAL BUILDINGS ===
  
  // Hotel (larger, corner building - positioned to avoid main street)
  drawBuilding(map, 38, 7, 8, 4, 'HOTEL');
  map[10][42] = '+'; // Main entrance on street level
  
  // Call Center (Root Beer Guy's workplace)
  drawBuilding(map, 35, 16, 10, 5, 'OFFICE');
  map[20][40] = '+'; // Door
  
  // ========================================
  // LANDSCAPING - Minimal and Clean
  // ========================================
  
  // Street lamps at regular intervals
  for (let x = 5; x < CHUNK_WIDTH; x += 10) {
    if (map[7][x] === '.') map[7][x] = '†'; // North lamps
    if (map[15][x] === '.') map[15][x] = '†'; // South lamps
  }
  
  // Simple trees/plants
  map[1][10] = '♣'; // Tree
  map[1][20] = '♣'; // Tree
  map[1][30] = '♣'; // Tree
  map[1][40] = '♣'; // Tree
  
  // ========================================
  // NPCs SPAWN POINTS - Clear Locations
  // ========================================
  
  const npcData = getCleanNPCData(cx, cy);
  
  // ========================================
  // RETURN CHUNK
  // ========================================
  
  const chunk = {
    map,
    monsters: [],
    items: [],
    npcs: [], // NPCs will be spawned when chunk is loaded
    biome: 'candy_kingdom',
    cx: cx,
    cy: cy,
    isMarket: true,
    special: 'shopping_district_clean',
    npcData: npcData
  };
  
  return chunk;
}

/**
 * Helper function to draw a simple shop
 */
function drawShop(map, x, y, width, height, label) {
  // Draw walls
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (dy === 0 || dy === height - 1 || dx === 0 || dx === width - 1) {
        if (y + dy < CHUNK_HEIGHT && x + dx < CHUNK_WIDTH) {
          map[y + dy][x + dx] = '█'; // Wall
        }
      } else {
        if (y + dy < CHUNK_HEIGHT && x + dx < CHUNK_WIDTH) {
          map[y + dy][x + dx] = '·'; // Floor
        }
      }
    }
  }
  
  // Add simple label (first letter only to reduce clutter)
  if (y - 1 >= 0 && x + 2 < CHUNK_WIDTH && label) {
    map[y][x + 2] = label[0];
  }
}

/**
 * Helper function to draw larger buildings
 */
function drawBuilding(map, x, y, width, height, label) {
  // Draw walls with different character for variety
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (dy === 0 || dy === height - 1 || dx === 0 || dx === width - 1) {
        if (y + dy < CHUNK_HEIGHT && x + dx < CHUNK_WIDTH) {
          map[y + dy][x + dx] = '▓'; // Building wall
        }
      } else {
        if (y + dy < CHUNK_HEIGHT && x + dx < CHUNK_WIDTH) {
          map[y + dy][x + dx] = '·'; // Floor
        }
      }
    }
  }
  
  // Add label
  if (label && y + 1 < CHUNK_HEIGHT) {
    for (let i = 0; i < Math.min(label.length, width - 2); i++) {
      if (x + i + 1 < CHUNK_WIDTH) {
        map[y + 1][x + i + 1] = label[i];
      }
    }
  }
}

/**
 * Generate NPC data for clean shopping district
 */
function getCleanNPCData(cx, cy) {
  return [
    // === SHOP VENDORS (one per shop) ===
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
    
    // === SPECIAL NPCs (non-vendors) ===
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
    },
    
    // === WANDERING SHOPPERS (fewer, better placed) ===
    {
      id: 'candy_person_1',
      name: 'Gumdrop',
      x: 15,
      y: 11,
      faction: 'peasants',
      dialogueType: 'candy_peasant',
      traits: ['sweet', 'simple'],
      hp: 10,
      hpMax: 10,
      symbol: '🍬',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'candy_person_2',
      name: 'Taffy',
      x: 30,
      y: 11,
      faction: 'peasants',
      dialogueType: 'candy_peasant',
      traits: ['stretchy', 'friendly'],
      hp: 10,
      hpMax: 10,
      symbol: '🍬',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'banana_guard_1',
      name: 'Banana Guard',
      x: 2,
      y: 11,
      faction: 'guards',
      dialogueType: 'banana_guard',
      traits: ['dim', 'loyal', 'strong'],
      hp: 40,
      hpMax: 40,
      symbol: '🍌',
      chunkX: cx,
      chunkY: cy
    },
    {
      id: 'banana_guard_2',
      name: 'Banana Guard',
      x: 45,
      y: 11,
      faction: 'guards',
      dialogueType: 'banana_guard',
      traits: ['dim', 'loyal', 'strong'],
      hp: 40,
      hpMax: 40,
      symbol: '🍌',
      chunkX: cx,
      chunkY: cy
    }
  ];
}