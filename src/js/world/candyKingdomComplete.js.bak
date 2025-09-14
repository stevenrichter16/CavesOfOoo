// src/js/world/candyKingdomComplete.js
// Complete Candy Kingdom within walls - the main chunk at (0,0)
// Contains: Castle, Shopping District, Bad Part of Town, Royal Garden, all facilities

import { W, H } from '../core/config.js';
import { spawnSocialNPC } from '../social/init.js';

const CHUNK_WIDTH = W;  // 48
const CHUNK_HEIGHT = H; // 22

/**
 * Generate the complete Candy Kingdom inside its walls
 * This is the main kingdom chunk with all districts
 */
export function generateCandyKingdomComplete(worldSeed, cx, cy) {
  // Main Candy Kingdom is at (0, 0)
  if (cx !== 0 || cy !== 0) return null;
  
  const map = [];
  
  // Initialize with peanut brittle streets (.)
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.'; // Peanut brittle street by default
    }
  }
  
  // ========================================
  // WALLS AND GUMBALL GUARDIANS
  // ========================================
  // Thick candy walls around the entire kingdom
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[0][x] = '▓'; // North wall (thick cake wall)
    map[CHUNK_HEIGHT - 1][x] = '▓'; // South wall
  }
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][0] = '▓'; // West wall
    map[y][CHUNK_WIDTH - 1] = '▓'; // East wall
  }
  
  // Main entrance gate (bottom center)
  map[CHUNK_HEIGHT - 1][23] = '═'; // Gate
  map[CHUNK_HEIGHT - 1][24] = '═'; // Gate
  map[CHUNK_HEIGHT - 1][25] = '═'; // Gate
  
  // Gumball Guardian positions (on walls)
  map[CHUNK_HEIGHT - 2][22] = 'G'; // Guardian by gate (left)
  map[CHUNK_HEIGHT - 2][26] = 'G'; // Guardian by gate (right)
  map[1][10] = 'G'; // North wall guardian
  map[1][37] = 'G'; // North wall guardian
  
  // ========================================
  // CANDY CASTLE (CENTER)
  // ========================================
  // Castle takes up central area (roughly 20,5 to 28,12)
  for (let y = 5; y <= 12; y++) {
    for (let x = 20; x <= 28; x++) {
      if (y === 5 || y === 12 || x === 20 || x === 28) {
        map[y][x] = '█'; // Castle walls (cake structure)
      } else {
        map[y][x] = '·'; // Castle interior floor
      }
    }
  }
  
  // Castle features
  map[8][24] = 'T'; // Throne
  map[6][24] = 'L'; // Laboratory entrance
  map[10][24] = 'H'; // Hospital entrance
  map[8][22] = 'P'; // Peppermint Butler's station
  
  // Castle entrance
  map[12][24] = '+'; // Main door
  
  // Psychic battle on castle roof (marked)
  map[5][24] = '※'; // Goliad vs Stormo battle marker
  
  // ========================================
  // ROYAL GARDEN (NORTH OF CASTLE)
  // ========================================
  for (let y = 2; y <= 4; y++) {
    for (let x = 20; x <= 28; x++) {
      map[y][x] = '❀'; // Garden/flowers
    }
  }
  // Garden paths
  map[3][24] = '·'; // Path through garden
  
  // ========================================
  // SHOPPING DISTRICT (CENTER-SOUTH)
  // ========================================
  // Main shopping street
  for (let x = 10; x <= 38; x++) {
    map[14][x] = '='; // Main commercial street
    map[15][x] = '='; 
  }
  
  // Broom Shop
  for (let y = 16; y <= 17; y++) {
    for (let x = 10; x <= 13; x++) {
      if (x === 10 || x === 13) map[y][x] = '║'; // Shop walls
      else map[y][x] = '·'; // Shop floor
    }
  }
  map[17][11] = 'B'; // Broom sign
  
  // Lollipop Store
  for (let y = 16; y <= 17; y++) {
    for (let x = 15; x <= 18; x++) {
      if (x === 15 || x === 18) map[y][x] = '║';
      else map[y][x] = '·';
    }
  }
  map[17][16] = '♣'; // Lollipop sign
  
  // Pizza Sassy's (with peppermint frame)
  for (let y = 16; y <= 18; y++) {
    for (let x = 20; x <= 24; x++) {
      if (x === 20 || x === 24 || y === 16 || y === 18) {
        map[y][x] = '◊'; // Peppermint frame
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[17][22] = 'P'; // Pizza
  map[18][22] = '+'; // Door
  
  // Root Beer Guy's Office/Call Center
  for (let y = 16; y <= 18; y++) {
    for (let x = 26; x <= 30; x++) {
      if (x === 26 || x === 30 || y === 16 || y === 18) {
        map[y][x] = '█';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[17][28] = '☎'; // Phone/office
  
  // Market stalls in plaza
  map[13][15] = '╤'; // Table stall
  map[13][20] = '╬'; // Canopy stall
  map[13][25] = '¤'; // Vendor cart
  map[13][30] = '≡'; // Goods table
  
  // ========================================
  // EASTERN AREA (HOTEL/DRUGSTORE/HOSPITAL)
  // ========================================
  
  // Coolest Hotel (art deco, run-down)
  for (let y = 8; y <= 11; y++) {
    for (let x = 32; x <= 36; x++) {
      if (x === 32 || x === 36 || y === 8 || y === 11) {
        map[y][x] = '▪'; // Art deco walls
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[9][34] = 'H'; // Hotel
  map[11][34] = '+'; // Door
  
  // Candy Drugstore (across from hotel)
  for (let y = 8; y <= 10; y++) {
    for (let x = 38; x <= 41; x++) {
      if (x === 38 || x === 41 || y === 8 || y === 10) {
        map[y][x] = '█';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[9][39] = '⚕'; // Pharmacy sign
  map[9][40] = 'R'; // Rx
  
  // Candy Kingdom Mental Hospital (peach building near east wall)
  for (let y = 3; y <= 6; y++) {
    for (let x = 40; x <= 44; x++) {
      if (x === 40 || x === 44 || y === 3 || y === 6) {
        map[y][x] = '◈'; // Peach-colored walls
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[4][42] = 'M'; // Mental Hospital
  map[6][42] = '+'; // Door
  
  // ========================================
  // BAD PART OF TOWN (NORTHWEST)
  // ========================================
  
  // Candy Tavern (hidden in back alleys)
  for (let y = 3; y <= 5; y++) {
    for (let x = 3; x <= 7; x++) {
      if (x === 3 || x === 7 || y === 3 || y === 5) {
        map[y][x] = '▓'; // Tavern walls
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[4][5] = 'T'; // Tavern
  map[5][5] = '+'; // Door
  
  // Back alleys (narrow passages)
  for (let y = 2; y <= 7; y++) {
    map[y][2] = '·'; // Alley
    map[y][8] = '·'; // Alley
  }
  for (let x = 2; x <= 8; x++) {
    map[7][x] = '·'; // Alley
  }
  
  // Gang hideout (behind tavern)
  map[2][5] = '☠'; // Gang marker
  
  // ========================================
  // RESIDENTIAL AREA (WEST)
  // ========================================
  
  // Candy houses
  for (let i = 0; i < 4; i++) {
    const houseY = 10 + (i % 2) * 3;
    const houseX = 3 + Math.floor(i / 2) * 4;
    for (let y = houseY; y <= houseY + 1; y++) {
      for (let x = houseX; x <= houseX + 2; x++) {
        if (x === houseX || x === houseX + 2 || y === houseY || y === houseY + 1) {
          map[y][x] = '□'; // House walls
        } else {
          map[y][x] = '·';
        }
      }
    }
  }
  
  // Candy Kingdom Preschool
  for (let y = 15; y <= 17; y++) {
    for (let x = 3; x <= 7; x++) {
      if (x === 3 || x === 7 || y === 15 || y === 17) {
        map[y][x] = '█';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[16][5] = 'S'; // School
  
  // Tree swing (playground)
  map[16][8] = 'Y'; // Tree
  map[17][8] = '○'; // Swing
  
  // Candy Orphanage
  for (let y = 9; y <= 11; y++) {
    for (let x = 10; x <= 13; x++) {
      if (x === 10 || x === 13 || y === 9 || y === 11) {
        map[y][x] = '█';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[10][11] = 'O'; // Orphanage
  
  // ========================================
  // OTHER FEATURES
  // ========================================
  
  // Tartorium (factory, southwest)
  for (let y = 18; y <= 20; y++) {
    for (let x = 10; x <= 14; x++) {
      if (x === 10 || x === 14 || y === 18 || y === 20) {
        map[y][x] = '╬'; // Metallic walls
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[19][12] = 'F'; // Factory
  
  // Banana Guard Barracks (near castle)
  for (let y = 7; y <= 9; y++) {
    for (let x = 15; x <= 18; x++) {
      if (x === 15 || x === 18 || y === 7 || y === 9) {
        map[y][x] = '█';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[8][16] = 'B'; // Barracks
  
  // Park (east of castle)
  for (let y = 6; y <= 8; y++) {
    for (let x = 30; x <= 33; x++) {
      map[y][x] = '♠'; // Cotton candy trees
    }
  }
  
  // Subway entrance (marked, leads underground)
  map[19][35] = '▼'; // Subway entrance
  
  // Jake's tent (leads to sewers)
  map[13][7] = '△'; // Tent marker
  
  const chunk = {
    map,
    monsters: [], // No monsters inside the kingdom walls
    items: [],
    npcs: [],
    biome: 'candy_kingdom',
    cx: cx,
    cy: cy,
    isKingdom: true,
    special: 'candy_kingdom_complete',
    description: 'The Candy Kingdom - a walled settlement built entirely of sweets'
  };
  
  // Generate NPCs for this chunk
  chunk.npcs = spawnCandyKingdomNPCs(worldSeed, cx, cy);
  
  // Add some items
  chunk.items = [
    { type: 'gold', amount: 10, x: 24, y: 13 }, // Near castle
    { type: 'gold', amount: 5, x: 15, y: 14 }, // Shopping district
    { type: 'potion', x: 39, y: 9, item: { name: 'Candy Medicine', heal: 15 }}, // In drugstore
    { type: 'food', x: 22, y: 17, item: { name: 'Pizza Slice', heal: 8 }}, // Pizza Sassy's
    { type: 'weapon', x: 11, y: 16, item: { name: 'Broom', dmg: 2 }}, // Broom shop
  ];
  
  return chunk;
}

/**
 * Spawn all NPCs for the complete Candy Kingdom
 */
function spawnCandyKingdomNPCs(worldSeed, cx, cy) {
  const npcs = [];
  
  // === CASTLE NPCs ===
  npcs.push({
    id: 'princess_bubblegum',
    name: 'Princess Bubblegum',
    x: 24,
    y: 7,
    faction: 'nobles',
    dialogueType: 'princess_bubblegum',
    traits: ['intelligent', 'scientific', 'protective'],
    hp: 50,
    hpMax: 50,
    role: 'ruler',
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'peppermint_butler',
    name: 'Peppermint Butler',
    x: 22,
    y: 8,
    faction: 'nobles',
    dialogueType: 'peppermint_butler',
    traits: ['mysterious', 'loyal', 'formal'],
    hp: 35,
    hpMax: 35,
    role: 'butler',
    chunkX: cx,
    chunkY: cy
  });
  
  // === GUMBALL GUARDIANS ===
  npcs.push({
    id: 'gumball_guardian_1',
    name: 'Gumball Guardian',
    x: 22,
    y: 20,
    faction: 'guards',
    dialogueType: 'gumball_guardian',
    traits: ['protective', 'powerful', 'obedient'],
    hp: 100,
    hpMax: 100,
    role: 'guardian',
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'gumball_guardian_2',
    name: 'Gumball Guardian',
    x: 26,
    y: 20,
    faction: 'guards',
    dialogueType: 'gumball_guardian',
    traits: ['protective', 'powerful', 'obedient'],
    hp: 100,
    hpMax: 100,
    role: 'guardian',
    chunkX: cx,
    chunkY: cy
  });
  
  // === SHOPPING DISTRICT NPCs ===
  npcs.push({
    id: 'broom_shop_owner',
    name: 'Sweep Master',
    x: 11,
    y: 17,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'brooms',
    traits: ['tidy', 'practical', 'trader'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'lollipop_vendor',
    name: 'Lolly',
    x: 16,
    y: 17,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'lollipops',
    traits: ['sweet', 'cheerful', 'trader'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'sassy_person_1',
    name: 'Sassy Sue',
    x: 22,
    y: 17,
    faction: 'merchants',
    dialogueType: 'sassy_people',
    goods: 'pizza',
    traits: ['sassy', 'quick-witted', 'trader'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'root_beer_guy',
    name: 'Root Beer Guy',
    x: 28,
    y: 17,
    faction: 'peasants',
    dialogueType: 'root_beer_guy',
    traits: ['hardworking', 'tired', 'writer'],
    hp: 22,
    hpMax: 22,
    chunkX: cx,
    chunkY: cy
  });
  
  // Market vendors
  npcs.push({
    id: 'choose_goose',
    name: 'Choose Goose',
    x: 25,
    y: 13,
    faction: 'merchants',
    dialogueType: 'choose_goose',
    goods: 'miscellaneous',
    traits: ['rhyming', 'mysterious', 'trader'],
    hp: 24,
    hpMax: 24,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  // === HOTEL/DRUGSTORE AREA ===
  npcs.push({
    id: 'hotel_clerk',
    name: 'Concierge Candy',
    x: 34,
    y: 10,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'lodging',
    traits: ['tired', 'professional'],
    hp: 15,
    hpMax: 15,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'pharmacist_ann',
    name: 'Ann',
    x: 39,
    y: 9,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'medicine',
    traits: ['helpful', 'knowledgeable'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'doctor_princess',
    name: 'Doctor Princess',
    x: 42,
    y: 4,
    faction: 'nobles',
    dialogueType: 'doctor_princess',
    traits: ['professional', 'caring', 'serious'],
    hp: 25,
    hpMax: 25,
    role: 'doctor',
    chunkX: cx,
    chunkY: cy
  });
  
  // === BAD PART OF TOWN ===
  npcs.push({
    id: 'dirt_beer_guy',
    name: 'Dirt Beer Guy',
    x: 5,
    y: 4,
    faction: 'merchants',
    dialogueType: 'tavern_keeper',
    goods: 'drinks',
    traits: ['rough', 'reformed', 'trader'],
    hp: 25,
    hpMax: 25,
    shopkeeper: true,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'cherry_cream_soda',
    name: 'Cherry Cream Soda',
    x: 6,
    y: 4,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['sweet', 'supportive'],
    hp: 18,
    hpMax: 18,
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'pup_gang_member',
    name: 'Pup Thug',
    x: 5,
    y: 2,
    faction: 'bandits',
    dialogueType: 'bandits',
    traits: ['aggressive', 'criminal'],
    hp: 15,
    hpMax: 15,
    chunkX: cx,
    chunkY: cy
  });
  
  // === RESIDENTIAL AREA ===
  npcs.push({
    id: 'candy_nanny',
    name: 'Candy Nanny',
    x: 5,
    y: 16,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['elderly', 'caring', 'tired'],
    hp: 10,
    hpMax: 10,
    role: 'teacher',
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'baby_snaps',
    name: 'Baby Snaps',
    x: 11,
    y: 10,
    faction: 'peasants',
    dialogueType: 'orphan',
    traits: ['sad', 'hopeful'],
    hp: 8,
    hpMax: 8,
    chunkX: cx,
    chunkY: cy
  });
  
  // === BANANA GUARDS ===
  npcs.push({
    id: 'banana_guard_1',
    name: 'Banana Guard',
    x: 16,
    y: 8,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['dutiful', 'simple'],
    hp: 25,
    hpMax: 25,
    role: 'guard',
    patrol: [{x:16,y:8}, {x:20,y:8}, {x:20,y:12}, {x:16,y:12}],
    chunkX: cx,
    chunkY: cy
  });
  
  npcs.push({
    id: 'banana_guard_2',
    name: 'Banana Guard',
    x: 24,
    y: 14,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['dutiful', 'simple'],
    hp: 25,
    hpMax: 25,
    role: 'guard',
    patrol: [{x:24,y:14}, {x:30,y:14}, {x:30,y:18}, {x:24,y:18}],
    chunkX: cx,
    chunkY: cy
  });
  
  // === RANDOM CITIZENS ===
  const citizens = [
    { id: 'cinnamon_bun', name: 'Cinnamon Bun', x: 20, y: 14 },
    { id: 'starchy', name: 'Starchy', x: 30, y: 15 },
    { id: 'mr_cupcake', name: 'Mr. Cupcake', x: 12, y: 13 },
    { id: 'chocoberry', name: 'Chocoberry', x: 35, y: 12 },
    { id: 'gumdrop_lass_1', name: 'Gumdrop Lass', x: 18, y: 16 }
  ];
  
  citizens.forEach(c => {
    npcs.push({
      id: c.id,
      name: c.name,
      x: c.x,
      y: c.y,
      faction: 'peasants',
      dialogueType: 'peasants',
      traits: ['chatty', 'sweet'],
      hp: 15,
      hpMax: 15,
      chunkX: cx,
      chunkY: cy
    });
  });
  
  return npcs;
}