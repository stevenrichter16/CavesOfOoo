// Migrated from OLD social system
// src/js/world/candyShoppingDistrict.js
// Candy Kingdom Shopping District - Commercial extension east of main kingdom
// Located at (1, 0) - directly east of the entrance
// This represents the expanded commercial area outside the main castle walls but still protected

import { W, H } from '../core/config.js';
import { spawnSocialNPC } from '../../social/migrationAdapter.js';
import { generateCleanShoppingDistrict } from './candyShoppingDistrictClean.js';

const CHUNK_WIDTH = W;  // 48
const CHUNK_HEIGHT = H; // 22

/**
 * Generate the Shopping District layout with proper Adventure Time locations
 * This is the commercial expansion of the Candy Kingdom
 * Now uses a cleaner, less chaotic layout for better gameplay
 */
export function generateShoppingDistrictChunk(worldSeed, cx, cy) {
  // Use the clean version for better visual clarity
  if (cx === 1 && cy === 0) {
    return generateCleanShoppingDistrict(cx, cy, worldSeed);
  }
  return generateLegacyShoppingDistrictChunk(worldSeed, cx, cy);
}

/**
 * Legacy shopping district generator (kept for compatibility)
 * @deprecated Use generateCleanShoppingDistrict for new implementations
 */
export function generateLegacyShoppingDistrictChunk(worldSeed, cx, cy) {
  // Shopping district is directly east of entrance at (1, 0)
  if (cx !== 1 || cy !== 0) return null;
  
  const map = [];
  
  // Initialize with peanut brittle streets (.) and chocolate dirt (·)
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      if (Math.random() < 0.7) {
        map[y][x] = '.'; // Peanut brittle main streets
      } else {
        map[y][x] = '·'; // Chocolate dirt paths
      }
    }
  }
  
  // === EXTENDED WALLS (connects to main kingdom) ===
  // North and south walls continue from main kingdom
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[0][x] = '▓'; // North wall continuation
    map[CHUNK_HEIGHT - 1][x] = '▓'; // South wall continuation
  }
  
  // Eastern wall with gate
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][CHUNK_WIDTH - 1] = '▓'; // East wall
  }
  
  // Open connection to main kingdom (west side)
  for (let y = 1; y < CHUNK_HEIGHT - 1; y++) {
    map[y][0] = '.'; // Open to connect with main kingdom
  }
  
  // Eastern gate for trade routes
  map[10][CHUNK_WIDTH - 1] = '═'; // East gate
  map[11][CHUNK_WIDTH - 1] = '═';
  map[12][CHUNK_WIDTH - 1] = '═';
  
  // === MAIN COMMERCIAL STREET (runs east-west) ===
  for (let x = 0; x < CHUNK_WIDTH - 1; x++) {
    map[10][x] = '='; // Main paved street
    map[11][x] = '=';
    map[12][x] = '='; // Wider commercial boulevard
  }
  
  // === PROMENADE (north pedestrian shopping lane) ===
  for (let x = 0; x < CHUNK_WIDTH - 1; x++) {
    map[5][x] = '◯'; // Tiled promenade
    map[6][x] = '◯';
  }
  
  // === SERVICE/DELIVERY LANE (south) ===
  for (let x = 0; x < CHUNK_WIDTH - 1; x++) {
    map[17][x] = '·'; // Service lane for deliveries
  }
  
  // ========================================
  // POCKET PLAZA (shopping center heart)
  // ========================================
  for (let y = 7; y <= 9; y++) {
    for (let x = 18; x <= 30; x++) {
      map[y][x] = '◯'; // Plaza tiles
    }
  }
  for (let y = 13; y <= 15; y++) {
    for (let x = 18; x <= 30; x++) {
      map[y][x] = '◯'; // South plaza extension
    }
  }
  
  // Large central fountain (3x3)
  map[10][23] = '○'; map[10][24] = '○'; map[10][25] = '○';
  map[11][23] = '○'; map[11][24] = '💧'; map[11][25] = '○'; // Center water
  map[12][23] = '○'; map[12][24] = '○'; map[12][25] = '○';
  
  // Benches around plaza
  map[8][20] = '═'; map[8][28] = '═'; // North benches
  map[14][20] = '═'; map[14][28] = '═'; // South benches
  map[9][19] = '║'; map[9][29] = '║'; // Side benches
  map[13][19] = '║'; map[13][29] = '║';
  
  // Decorative planters with candy flowers
  map[7][22] = '❀'; map[7][26] = '❀';
  map[15][22] = '❀'; map[15][26] = '❀';
  map[9][18] = '❀'; map[9][30] = '❀';
  map[13][18] = '❀'; map[13][30] = '❀';
  
  // Candy-cane arches at plaza entrances
  map[10][17] = '♦'; map[12][17] = '♦'; // West arch
  map[10][31] = '♦'; map[12][31] = '♦'; // East arch
  
  // ========================================
  // MAJOR SHOPS & BUILDINGS
  // ========================================
  
  // === CANDY DRUGSTORE (large pharmacy) ===
  for (let y = 2; y <= 5; y++) {
    for (let x = 3; x <= 10; x++) {
      if (y === 2 || y === 5 || x === 3 || x === 10) {
        map[y][x] = '█'; // Shop walls
      } else {
        map[y][x] = '·'; // Shop floor
      }
    }
  }
  map[5][6] = '+'; // Main door
  map[5][7] = '+'; // Double doors
  map[3][6] = '⚕'; // Pharmacy sign
  map[3][5] = 'C'; map[3][7] = 'A'; // CANDY
  map[3][8] = 'R'; map[3][9] = 'X'; // RX
  // Interior details
  map[4][4] = '□'; // Shelf
  map[4][5] = '□'; // Shelf
  map[4][8] = '□'; // Counter
  map[4][9] = '□'; // Counter
  
  // === PIZZA SASSY'S (with peppermint frame, corner location) ===
  for (let y = 2; y <= 6; y++) {
    for (let x = 12; x <= 18; x++) {
      if (y === 2 || y === 6 || x === 12 || x === 18) {
        map[y][x] = '◊'; // Peppermint frame walls
      } else {
        map[y][x] = '·'; // Restaurant floor
      }
    }
  }
  map[6][15] = '+'; // Door
  map[3][14] = 'P'; // PIZZA
  map[3][15] = 'I';
  map[3][16] = 'Z';
  map[3][17] = 'Z';
  map[3][18] = 'A';
  // Pizza ovens and tables
  map[4][13] = '☐'; // Oven
  map[4][14] = '☐'; // Oven
  map[5][15] = '○'; // Table
  map[5][16] = '○'; // Table
  
  // Delivery alley behind Pizza Sassy's
  for (let y = 2; y <= 6; y++) {
    map[y][19] = '·'; // Alley
    map[y][20] = '·'; // Alley space
  }
  map[4][19] = 'b'; // Delivery barrels
  map[5][20] = '¤'; // Delivery cart
  
  // === COOLEST HOTEL (art deco style, multi-floor) ===
  for (let y = 2; y <= 7; y++) {
    for (let x = 32; x <= 40; x++) {
      if (y === 2 || y === 7 || x === 32 || x === 40) {
        map[y][x] = '▪'; // Art deco walls
      } else {
        map[y][x] = '·'; // Hotel interior
      }
    }
  }
  map[7][36] = '+'; // Main entrance
  map[7][37] = '+'; // Double doors
  map[3][35] = 'H'; // HOTEL sign
  map[3][36] = 'O';
  map[3][37] = 'T';
  map[3][38] = 'E';
  map[3][39] = 'L';
  // Hotel lobby features
  map[6][34] = '□'; // Reception desk
  map[6][35] = '□'; // Reception desk
  map[5][38] = '○'; // Lobby seating
  map[4][36] = '†'; // Decorative lamp
  
  // === BROOM SHOP (practical goods) ===
  for (let y = 16; y <= 19; y++) {
    for (let x = 3; x <= 8; x++) {
      if (y === 16 || y === 19 || x === 3 || x === 8) {
        map[y][x] = '█'; // Shop walls
      } else {
        map[y][x] = '·'; // Shop floor
      }
    }
  }
  map[19][5] = '+'; // Door
  map[17][5] = 'B'; // Broom sign
  map[17][6] = '🧹'; // Broom symbol (or use '/')
  map[18][4] = '/'; // Brooms on display
  map[18][5] = '/';
  map[18][6] = '/';
  map[18][7] = '/';
  
  // === LOLLIPOP STORE (candy specialty) ===
  for (let y = 16; y <= 19; y++) {
    for (let x = 10; x <= 15; x++) {
      if (y === 16 || y === 19 || x === 10 || x === 15) {
        map[y][x] = '█'; // Shop walls
      } else {
        map[y][x] = '·'; // Shop floor
      }
    }
  }
  map[19][12] = '+'; // Door
  map[19][13] = '+'; // Double doors
  map[17][12] = '♣'; // Giant lollipop display
  map[17][13] = '♣';
  map[18][11] = '○'; // Candy display
  map[18][14] = '○'; // Candy display
  
  // === ROOT BEER GUY'S WORKPLACE (call center/office building) ===
  for (let y = 14; y <= 19; y++) {
    for (let x = 35; x <= 44; x++) {
      if (y === 14 || y === 19 || x === 35 || x === 44) {
        map[y][x] = '█'; // Office building walls
      } else {
        map[y][x] = '·'; // Office floor
      }
    }
  }
  map[19][39] = '+'; // Main entrance
  map[19][40] = '+'; // Double doors
  map[15][37] = 'C'; // CALL CENTER sign
  map[15][38] = 'A';
  map[15][39] = 'L';
  map[15][40] = 'L';
  // Office interior
  for (let x = 36; x <= 43; x += 2) {
    map[17][x] = '□'; // Desk
    map[18][x] = '☎'; // Phone
  }
  
  // === CHOOSE GOOSE'S BOOTH (special merchant stall) ===
  for (let y = 8; y <= 9; y++) {
    for (let x = 14; x <= 16; x++) {
      map[y][x] = '╬'; // Fancy booth
    }
  }
  map[9][15] = 'G'; // Goose sign
  
  // === TARTORIUM OUTLET (royal tart shop) ===
  for (let y = 16; y <= 19; y++) {
    for (let x = 22; x <= 27; x++) {
      if (y === 16 || y === 19 || x === 22 || x === 27) {
        map[y][x] = '╬'; // Metallic/special walls
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[19][24] = '+'; // Door
  map[19][25] = '+';
  map[17][24] = 'T'; // TART sign
  map[18][23] = '☐'; // Display case
  map[18][26] = '☐'; // Display case
  
  // ========================================
  // MARKET STALLS & STREET VENDORS
  // ========================================
  
  // North promenade stalls
  map[4][22] = '╤'; // Table stall
  map[4][26] = '╤'; // Table stall
  map[4][30] = '╬'; // Canopy stall
  
  // Central market area
  map[8][5] = '¤'; // Vendor cart
  map[8][10] = '≡'; // Goods table
  map[8][35] = '¤'; // Vendor cart
  map[8][40] = '≡'; // Goods table
  
  // South market stalls
  map[14][5] = '╤'; // Table stall
  map[14][10] = '╬'; // Canopy stall
  map[14][35] = '≡'; // Goods table
  map[14][40] = '╤'; // Table stall
  
  // ========================================
  // DECORATIVE ELEMENTS & INFRASTRUCTURE
  // ========================================
  
  // Lamp posts along main street
  for (let x = 5; x < CHUNK_WIDTH - 5; x += 6) {
    if (map[9][x] === '=' || map[9][x] === '.' || map[9][x] === '◯') {
      map[9][x] = '†'; // Lamp post
    }
    if (map[13][x] === '=' || map[13][x] === '.' || map[13][x] === '◯') {
      map[13][x] = '†'; // Lamp post
    }
  }
  
  // Giant decorative lollipops at key corners
  map[1][10] = '♣'; // Corner decoration
  map[1][38] = '♣';
  map[20][10] = '♣';
  map[20][38] = '♣';
  
  // Crosswalks on main street
  for (let y = 10; y <= 12; y++) {
    map[y][8] = '≈'; // Crosswalk
    map[y][16] = '≈'; // Crosswalk
    map[y][24] = '≈'; // Crosswalk at plaza
    map[y][32] = '≈'; // Crosswalk
    map[y][40] = '≈'; // Crosswalk
  }
  
  // Barrels and crates for atmosphere
  map[15][2] = 'b'; // Barrel
  map[14][32] = '☐'; // Crate
  map[17][12] = 'b'; // Barrel
  map[3][21] = 'b'; // Barrel
  map[18][33] = '☐'; // Crate
  
  // Small park area with candy trees
  for (let y = 8; y <= 9; y++) {
    for (let x = 42; x <= 45; x++) {
      map[y][x] = '♠'; // Cotton candy trees
    }
  }
  
  const chunk = {
    map,
    monsters: [],
    items: [],
    npcs: [], // NPCs will be spawned when chunk is loaded
    biome: 'candy_kingdom',
    cx: cx,
    cy: cy,
    isMarket: true,
    special: 'shopping_district',
    description: 'The bustling Shopping District of the Candy Kingdom - a commercial expansion with shops, plazas, and market stalls',
    // Store NPC data to spawn later when state is available
    npcData: getShoppingDistrictNPCData(cx, cy)
  };
  
  // Add items throughout the district
  chunk.items = [
    // Fountain coins
    { type: 'gold', amount: 15, x: 24, y: 11 },
    { type: 'gold', amount: 10, x: 25, y: 11 },
    
    // Shop items
    { type: 'potion', x: 6, y: 4, item: { name: 'Candy Medicine', heal: 20 }}, // Drugstore
    { type: 'potion', x: 7, y: 4, item: { name: 'Sugar Pills', heal: 10 }}, // Drugstore
    { type: 'food', x: 15, y: 5, item: { name: 'Pizza Slice', heal: 10 }}, // Pizza Sassy's
    { type: 'food', x: 16, y: 5, item: { name: 'Sassy Breadsticks', heal: 5 }},
    { type: 'weapon', x: 5, y: 18, item: { name: 'Quality Broom', dmg: 3 }}, // Broom shop
    { type: 'food', x: 12, y: 18, item: { name: 'Giant Lollipop', heal: 15 }}, // Lollipop store
    { type: 'food', x: 24, y: 18, item: { name: 'Royal Tart', heal: 25 }}, // Tartorium
    
    // Random street finds
    { type: 'gold', amount: 3, x: 8, y: 14 },
    { type: 'gold', amount: 5, x: 35, y: 8 },
    { type: 'gold', amount: 2, x: 15, y: 17 },
  ];
  
  return chunk;
}

/**
 * Get NPC data for the Shopping District
 */
export function getShoppingDistrictNPCData(cx, cy) {
  const npcData = [];
  
  // === SHOP OWNERS AND WORKERS ===
  
  // Candy Drugstore staff
  npcData.push({
    id: 'pharmacist_ann',
    name: 'Ann',
    x: 6,
    y: 4,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'medicine',
    traits: ['helpful', 'knowledgeable', 'serious'],
    hp: 25,
    hpMax: 25,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'pharmacy_assistant',
    name: 'Pill Phil',
    x: 8,
    y: 4,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    traits: ['nervous', 'helpful'],
    hp: 15,
    hpMax: 15,
    chunkX: cx,
    chunkY: cy
  });
  
  // Pizza Sassy's staff
  npcData.push({
    id: 'sassy_sue',
    name: 'Sassy Sue',
    x: 15,
    y: 4,
    faction: 'merchants',
    dialogueType: 'sassy_people',
    goods: 'pizza',
    traits: ['sassy', 'quick-witted', 'friendly'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'sassy_sam',
    name: 'Sassy Sam',
    x: 16,
    y: 5,
    faction: 'merchants',
    dialogueType: 'sassy_people',
    traits: ['sassy', 'energetic'],
    hp: 18,
    hpMax: 18,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'petey_pizzaguy',
    name: 'Petey',
    x: 19,
    y: 4,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    traits: ['fast', 'reliable'],
    hp: 16,
    hpMax: 16,
    role: 'delivery',
    chunkX: cx,
    chunkY: cy
  });
  
  // Coolest Hotel staff
  npcData.push({
    id: 'hotel_manager',
    name: 'Concierge Candy',
    x: 36,
    y: 6,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'lodging',
    traits: ['tired', 'professional', 'helpful'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'bellhop',
    name: 'Bellhop Berry',
    x: 38,
    y: 5,
    faction: 'peasants',
    dialogueType: 'candy_peasant',
    traits: ['eager', 'clumsy'],
    hp: 12,
    hpMax: 12,
    chunkX: cx,
    chunkY: cy
  });
  
  // Broom Shop
  npcData.push({
    id: 'broom_master',
    name: 'Bristle Bob',
    x: 5,
    y: 18,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'brooms',
    traits: ['tidy', 'practical', 'proud'],
    hp: 22,
    hpMax: 22,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  // Lollipop Store
  npcData.push({
    id: 'lollipop_lady',
    name: 'Lolly',
    x: 12,
    y: 18,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'lollipops',
    traits: ['sweet', 'cheerful', 'trader'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  // Root Beer Guy's Workplace
  npcData.push({
    id: 'root_beer_guy',
    name: 'Root Beer Guy',
    x: 39,
    y: 17,
    faction: 'peasants',
    dialogueType: 'root_beer_guy',
    traits: ['hardworking', 'tired', 'writer', 'dreamer'],
    hp: 22,
    hpMax: 22,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'telemarketer_1',
    name: 'Cold Caller Carl',
    x: 37,
    y: 17,
    faction: 'peasants',
    dialogueType: 'candy_peasant',
    traits: ['tired', 'monotone'],
    hp: 14,
    hpMax: 14,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'call_center_boss',
    name: 'Boss Butterscotch',
    x: 41,
    y: 16,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    traits: ['demanding', 'stressed'],
    hp: 25,
    hpMax: 25,
    chunkX: cx,
    chunkY: cy
  });
  
  // Choose Goose
  npcData.push({
    id: 'choose_goose',
    name: 'Choose Goose',
    x: 15,
    y: 9,
    faction: 'merchants',
    dialogueType: 'choose_goose',
    goods: 'miscellaneous',
    traits: ['rhyming', 'mysterious', 'cunning', 'trader'],
    hp: 26,
    hpMax: 26,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  // Tartorium Outlet
  npcData.push({
    id: 'tart_toter',
    name: 'Tart Toter Tim',
    x: 24,
    y: 18,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'royal_tarts',
    traits: ['careful', 'proud', 'nervous'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  // === MARKET VENDORS ===
  npcData.push({
    id: 'candy_corn_vendor',
    name: 'Candy Corn Carl',
    x: 22,
    y: 4,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'candy_corn',
    traits: ['friendly', 'trader'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'taffy_vendor',
    name: 'Taffy Tina',
    x: 26,
    y: 4,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'taffy',
    traits: ['stretchy', 'sweet', 'trader'],
    hp: 16,
    hpMax: 16,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'chocolate_vendor',
    name: 'Chocolate Charlie',
    x: 10,
    y: 14,
    faction: 'merchants',
    dialogueType: 'candy_merchant',
    goods: 'chocolate',
    traits: ['warm', 'melty', 'trader'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  // === NOBLES AND WEALTHY SHOPPERS ===
  npcData.push({
    id: 'lord_lollipop',
    name: 'Lord Lollipop',
    x: 35,
    y: 8,
    faction: 'nobles',
    dialogueType: 'candy_noble',
    traits: ['proud', 'wealthy', 'formal'],
    hp: 30,
    hpMax: 30,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'count_coinsworth',
    name: 'Count Coinsworth',
    x: 40,
    y: 12,
    faction: 'nobles',
    dialogueType: 'candy_noble',
    traits: ['greedy', 'calculating', 'investor'],
    hp: 28,
    hpMax: 28,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'duchess_sweetington',
    name: 'Duchess Sweetington',
    x: 18,
    y: 11,
    faction: 'nobles',
    dialogueType: 'candy_noble',
    traits: ['proud', 'critical', 'fashionable'],
    hp: 25,
    hpMax: 25,
    chunkX: cx,
    chunkY: cy
  });
  
  // === SPECIAL CHARACTERS ===
  npcData.push({
    id: 'peppermint_butler',
    name: 'Peppermint Butler',
    x: 24,
    y: 8,
    faction: 'nobles',
    dialogueType: 'peppermint_butler',
    traits: ['mysterious', 'formal', 'loyal'],
    hp: 35,
    hpMax: 35,
    chunkX: cx,
    chunkY: cy
  });
  
  // === GUARDS ===
  npcData.push({
    id: 'banana_guard_shop_1',
    name: 'Banana Guard',
    x: 5,
    y: 11,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['dutiful', 'simple'],
    hp: 25,
    hpMax: 25,
    role: 'guard',
    patrol: [{x:5,y:11}, {x:15,y:11}, {x:15,y:14}, {x:5,y:14}],
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'banana_guard_shop_2',
    name: 'Banana Guard',
    x: 35,
    y: 11,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['dutiful', 'simple'],
    hp: 25,
    hpMax: 25,
    role: 'guard',
    patrol: [{x:35,y:11}, {x:43,y:11}, {x:43,y:14}, {x:35,y:14}],
    chunkX: cx,
    chunkY: cy
  });
  
  // === TOURISTS & SHOPPERS ===
  npcData.push({
    id: 'tourist_toffee',
    name: 'Touring Toffee',
    x: 36,
    y: 8,
    faction: 'peasants',
    dialogueType: 'candy_peasant',
    traits: ['curious', 'excited', 'lost'],
    hp: 12,
    hpMax: 12,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'shopping_sherbet',
    name: 'Shopping Sherbet',
    x: 12,
    y: 11,
    faction: 'peasants',
    dialogueType: 'candy_peasant',
    traits: ['busy', 'chatty', 'indecisive'],
    hp: 14,
    hpMax: 14,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'browsing_bonbon',
    name: 'Browsing Bonbon',
    x: 30,
    y: 14,
    faction: 'peasants',
    dialogueType: 'candy_peasant',
    traits: ['window-shopping', 'friendly'],
    hp: 14,
    hpMax: 14,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'cinnamon_bun',
    name: 'Cinnamon Bun',
    x: 20,
    y: 8,
    faction: 'peasants',
    dialogueType: 'cinnamon_bun',
    traits: ['dim', 'sweet', 'loyal'],
    hp: 18,
    hpMax: 18,
    chunkX: cx,
    chunkY: cy
  });
  
  npcData.push({
    id: 'starchy',
    name: 'Starchy',
    x: 28,
    y: 9,
    faction: 'peasants',
    dialogueType: 'starchy',
    traits: ['paranoid', 'gravedigger', 'storyteller'],
    hp: 16,
    hpMax: 16,
    chunkX: cx,
    chunkY: cy
  });
  
  return npcData;
}

/**
 * Actually spawn NPCs when state is available
 * This should be called after the chunk is loaded and state is available
 */
export function spawnShoppingDistrictNPCs(state) {
  if (!state.chunk?.npcData) return [];
  
  const npcs = [];
  const { spawnSocialNPC } = require('../../social/migrationAdapter.js');
  
  state.chunk.npcData.forEach(data => {
    const npc = spawnSocialNPC(state, data);
    if (npc) npcs.push(npc);
  });
  
  // Clear npcData after spawning to avoid duplicates
  delete state.chunk.npcData;
  
  return npcs;
}