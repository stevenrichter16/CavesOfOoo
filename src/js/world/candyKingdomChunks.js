// src/js/world/candyKingdomChunks.js
// Adjacent chunks for the Candy Kingdom that connect to the main town

import { spawnSocialNPC } from '../social/init.js';

// Full viewport dimensions
const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

/**
 * Generate the North Gate chunk - Castle approach
 * Coordinates: (0, -1)
 */
export function generateNorthGateChunk(worldSeed, cx, cy) {
  if (cx !== 0 || cy !== -1) return null;
  
  const map = [];
  
  // Initialize with cobblestone
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.';
    }
  }
  
  // Side walls continuing from main town
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][0] = '#';
    map[y][1] = '#';
    map[y][CHUNK_WIDTH-1] = '#';
    map[y][CHUNK_WIDTH-2] = '#';
  }
  
  // Castle approach road
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let x = 10; x <= 13; x++) {
      map[y][x] = '.'; // Clear road path
    }
  }
  
  // Castle walls at the north end
  for (let x = 4; x < 20; x++) {
    map[2][x] = '#';
    map[3][x] = '#';
  }
  
  // Castle gate
  for (let x = 10; x <= 13; x++) {
    map[2][x] = '.';
    map[3][x] = '.';
  }
  
  // Guard towers
  map[2][8] = '▲';
  map[2][15] = '▲';
  
  // Royal gardens on sides
  for (let y = 5; y < 15; y++) {
    for (let x = 3; x < 8; x++) {
      if ((x + y) % 3 === 0) {
        map[y][x] = '♣'; // Garden trees
      }
    }
    for (let x = 16; x < 21; x++) {
      if ((x + y) % 3 === 0) {
        map[y][x] = '♣';
      }
    }
  }
  
  // Some decorative statues
  map[8][6] = '◊';
  map[8][17] = '◊';
  map[14][6] = '◊';
  map[14][17] = '◊';
  
  // South connection (open to main town)
  for (let x = 10; x <= 13; x++) {
    map[CHUNK_HEIGHT-1][x] = '.';
    map[CHUNK_HEIGHT-2][x] = '.';
  }
  
  const chunk = {
    map,
    monsters: [],
    items: [
      { x: 5, y: 10, type: 'coin', amount: 10 },
      { x: 18, y: 10, type: 'coin', amount: 10 }
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The northern approach to Princess Bubblegum\'s castle',
    isKingdomChunk: true
  };
  
  return chunk;
}

/**
 * Generate the East Gate chunk - Merchant Quarter
 * Coordinates: (1, 0)
 */
export function generateEastGateChunk(worldSeed, cx, cy) {
  if (cx !== 1 || cy !== 0) return null;
  
  const map = [];
  
  // Initialize with cobblestone
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.';
    }
  }
  
  // Continue walls from main town
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[0][x] = '#';
    map[1][x] = '#';
    map[CHUNK_HEIGHT-1][x] = '#';
    map[CHUNK_HEIGHT-2][x] = '#';
  }
  
  // East wall with outer gate
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][CHUNK_WIDTH-1] = '#';
    map[y][CHUNK_WIDTH-2] = '#';
    // Outer gate
    if (y >= 9 && y <= 12) {
      map[y][CHUNK_WIDTH-1] = '.';
      map[y][CHUNK_WIDTH-2] = '.';
    }
  }
  
  // West connection (open to main town)
  for (let y = 9; y <= 12; y++) {
    map[y][0] = '.';
    map[y][1] = '.';
  }
  
  // Market stalls and shops
  // Row 1
  map[4][3] = '╬';
  map[4][4] = '═';
  map[4][8] = '╬';
  map[4][9] = '═';
  map[4][13] = '╬';
  map[4][14] = '═';
  map[4][18] = '╬';
  map[4][19] = '═';
  
  // Row 2
  map[8][3] = '╬';
  map[8][4] = '═';
  map[8][8] = '╬';
  map[8][9] = '═';
  map[8][13] = '╬';
  map[8][14] = '═';
  map[8][18] = '╬';
  map[8][19] = '═';
  
  // Row 3
  map[12][3] = '╬';
  map[12][4] = '═';
  map[12][8] = '╬';
  map[12][9] = '═';
  map[12][13] = '╬';
  map[12][14] = '═';
  map[12][18] = '╬';
  map[12][19] = '═';
  
  // Row 4
  map[16][3] = '╬';
  map[16][4] = '═';
  map[16][8] = '╬';
  map[16][9] = '═';
  map[16][13] = '╬';
  map[16][14] = '═';
  map[16][18] = '╬';
  map[16][19] = '═';
  
  // Storage crates
  map[5][6] = '□';
  map[5][11] = '□';
  map[5][16] = '□';
  map[9][6] = '□';
  map[9][11] = '□';
  map[9][16] = '□';
  
  const chunk = {
    map,
    monsters: [],
    items: [
      { x: 5, y: 5, type: 'potion', item: { name: 'Merchant\'s Brew', type: 'potion', heal: 15 }},
      { x: 10, y: 10, type: 'coin', amount: 20 },
      { x: 15, y: 15, type: 'coin', amount: 15 }
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The bustling merchant quarter of the Candy Kingdom',
    isKingdomChunk: true
  };
  
  return chunk;
}

/**
 * Generate the South Gate chunk - Residential District
 * Coordinates: (0, 1)
 */
export function generateSouthGateChunk(worldSeed, cx, cy) {
  if (cx !== 0 || cy !== 1) return null;
  
  const map = [];
  
  // Initialize with cobblestone
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.';
    }
  }
  
  // Continue walls
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][0] = '#';
    map[y][1] = '#';
    map[y][CHUNK_WIDTH-1] = '#';
    map[y][CHUNK_WIDTH-2] = '#';
  }
  
  // South wall with outer gate
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[CHUNK_HEIGHT-1][x] = '#';
    map[CHUNK_HEIGHT-2][x] = '#';
    // Outer gate
    if (x >= 10 && x <= 13) {
      map[CHUNK_HEIGHT-1][x] = '.';
      map[CHUNK_HEIGHT-2][x] = '.';
    }
  }
  
  // North connection (open to main town)
  for (let x = 10; x <= 13; x++) {
    map[0][x] = '.';
    map[1][x] = '.';
  }
  
  // Candy houses (simplified)
  // House 1
  for (let y = 3; y <= 7; y++) {
    for (let x = 3; x <= 7; x++) {
      if (y === 3 || y === 7 || x === 3 || x === 7) {
        map[y][x] = '▪';
      }
    }
  }
  map[5][3] = '+'; // Door
  
  // House 2
  for (let y = 3; y <= 7; y++) {
    for (let x = 10; x <= 14; x++) {
      if (y === 3 || y === 7 || x === 10 || x === 14) {
        map[y][x] = '▪';
      }
    }
  }
  map[5][10] = '+'; // Door
  
  // House 3
  for (let y = 3; y <= 7; y++) {
    for (let x = 17; x <= 21; x++) {
      if (y === 3 || y === 7 || x === 17 || x === 21) {
        map[y][x] = '▪';
      }
    }
  }
  map[5][17] = '+'; // Door
  
  // House 4
  for (let y = 10; y <= 14; y++) {
    for (let x = 3; x <= 7; x++) {
      if (y === 10 || y === 14 || x === 3 || x === 7) {
        map[y][x] = '▪';
      }
    }
  }
  map[12][3] = '+'; // Door
  
  // House 5
  for (let y = 10; y <= 14; y++) {
    for (let x = 17; x <= 21; x++) {
      if (y === 10 || y === 14 || x === 17 || x === 21) {
        map[y][x] = '▪';
      }
    }
  }
  map[12][17] = '+'; // Door
  
  // Central park area
  map[10][11] = '♣';
  map[10][12] = '♣';
  map[11][11] = '~'; // Small pond
  map[11][12] = '~';
  map[12][11] = '♣';
  map[12][12] = '♣';
  
  // Benches
  map[9][10] = '═';
  map[9][13] = '═';
  map[13][10] = '═';
  map[13][13] = '═';
  
  const chunk = {
    map,
    monsters: [],
    items: [
      { x: 11, y: 17, type: 'coin', amount: 8 },
      { x: 5, y: 5, type: 'food', item: { name: 'Home-baked Cookie', type: 'food', heal: 8 }}
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The peaceful residential district of the Candy Kingdom',
    isKingdomChunk: true
  };
  
  return chunk;
}

/**
 * Generate the West Gate chunk - Training Grounds
 * Coordinates: (-1, 0)  
 */
export function generateWestGateChunk(worldSeed, cx, cy) {
  if (cx !== -1 || cy !== 0) return null;
  
  const map = [];
  
  // Initialize with dirt/training ground
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.';
    }
  }
  
  // Continue walls
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[0][x] = '#';
    map[1][x] = '#';
    map[CHUNK_HEIGHT-1][x] = '#';
    map[CHUNK_HEIGHT-2][x] = '#';
  }
  
  // West wall with outer gate
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][0] = '#';
    map[y][1] = '#';
    // Outer gate
    if (y >= 9 && y <= 12) {
      map[y][0] = '.';
      map[y][1] = '.';
    }
  }
  
  // East connection (open to main town)
  for (let y = 9; y <= 12; y++) {
    map[y][CHUNK_WIDTH-1] = '.';
    map[y][CHUNK_WIDTH-2] = '.';
  }
  
  // Training dummies
  map[5][5] = '†';
  map[5][10] = '†';
  map[5][15] = '†';
  map[5][18] = '†';
  
  map[16][5] = '†';
  map[16][10] = '†';
  map[16][15] = '†';
  map[16][18] = '†';
  
  // Sparring ring (center)
  for (let y = 8; y <= 13; y++) {
    for (let x = 8; x <= 15; x++) {
      if (y === 8 || y === 13 || x === 8 || x === 15) {
        map[y][x] = '-';
      }
    }
  }
  
  // Weapon racks
  map[3][3] = '|';
  map[3][4] = '|';
  map[3][5] = '|';
  
  map[3][18] = '|';
  map[3][19] = '|';
  map[3][20] = '|';
  
  map[18][3] = '|';
  map[18][4] = '|';
  map[18][5] = '|';
  
  map[18][18] = '|';
  map[18][19] = '|';
  map[18][20] = '|';
  
  // Barracks building
  for (let y = 6; y <= 8; y++) {
    for (let x = 3; x <= 6; x++) {
      if (y === 6 || y === 8 || x === 3 || x === 6) {
        map[y][x] = '▪';
      }
    }
  }
  map[7][3] = '+'; // Door
  
  // Armory building
  for (let y = 13; y <= 15; y++) {
    for (let x = 17; x <= 20; x++) {
      if (y === 13 || y === 15 || x === 17 || x === 20) {
        map[y][x] = '▪';
      }
    }
  }
  map[14][20] = '+'; // Door
  
  const chunk = {
    map,
    monsters: [],
    items: [
      { x: 4, y: 4, type: 'weapon', item: { name: 'Training Sword', type: 'weapon', dmg: 3 }},
      { x: 19, y: 19, type: 'armor', item: { name: 'Padded Armor', type: 'armor', def: 2 }}
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The training grounds where Candy Kingdom guards hone their skills',
    isKingdomChunk: true
  };
  
  return chunk;
}

/**
 * Spawn NPCs for the North Gate chunk
 */
export function spawnNorthGateNPCs(state) {
  const npcs = [];
  
  // Royal guards at castle gate
  npcs.push(spawnSocialNPC(state, {
    id: 'royal_guard_1',
    name: 'Sir Butterscotch',
    x: 9,
    y: 4,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['loyal', 'stern', 'elite'],
    hp: 35,
    hpMax: 35,
    role: 'royal_guard'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'royal_guard_2',
    name: 'Dame Toffee',
    x: 14,
    y: 4,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['vigilant', 'noble', 'elite'],
    hp: 35,
    hpMax: 35,
    role: 'royal_guard'
  }));
  
  // Gardener
  npcs.push(spawnSocialNPC(state, {
    id: 'royal_gardener',
    name: 'Maple the Gardener',
    x: 5,
    y: 10,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['peaceful', 'knowledgeable', 'gentle'],
    hp: 12,
    hpMax: 12,
    role: 'gardener'
  }));
  
  // Noble visitor
  npcs.push(spawnSocialNPC(state, {
    id: 'visiting_noble',
    name: 'Countess Caramel',
    x: 12,
    y: 12,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['haughty', 'wealthy', 'connected'],
    hp: 20,
    hpMax: 20,
    role: 'noble'
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn NPCs for the East Gate chunk (Merchant Quarter)
 */
export function spawnEastGateNPCs(state) {
  const npcs = [];
  
  // Various merchants
  npcs.push(spawnSocialNPC(state, {
    id: 'spice_merchant',
    name: 'Cinnamon Sam',
    x: 3,
    y: 5,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'spices',
    traits: ['shrewd', 'traveled', 'talkative'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'fabric_merchant',
    name: 'Silky Sue',
    x: 8,
    y: 5,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'fabrics',
    traits: ['fashionable', 'gossipy'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'weapon_merchant',
    name: 'Rock Candy Rick',
    x: 13,
    y: 5,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'weapons',
    traits: ['gruff', 'experienced'],
    hp: 25,
    hpMax: 25,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'potion_merchant',
    name: 'Fizzy Phil',
    x: 18,
    y: 5,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'potions',
    traits: ['eccentric', 'knowledgeable'],
    hp: 16,
    hpMax: 16,
    shopkeeper: true
  }));
  
  // Customers
  npcs.push(spawnSocialNPC(state, {
    id: 'shopper_1',
    name: 'Candy Shopper',
    x: 10,
    y: 10,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['curious', 'bargain-hunting'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'shopper_2',
    name: 'Wealthy Buyer',
    x: 15,
    y: 13,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['wealthy', 'demanding'],
    hp: 18,
    hpMax: 18
  }));
  
  // Gate guard
  npcs.push(spawnSocialNPC(state, {
    id: 'east_gate_guard',
    name: 'Licorice Guard',
    x: 20,
    y: 10,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['watchful', 'bored'],
    hp: 25,
    hpMax: 25
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn NPCs for the South Gate chunk (Residential)
 */
export function spawnSouthGateNPCs(state) {
  const npcs = [];
  
  // Residents
  npcs.push(spawnSocialNPC(state, {
    id: 'resident_1',
    name: 'Granny Gumball',
    x: 5,
    y: 5,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['elderly', 'kind', 'nostalgic'],
    hp: 10,
    hpMax: 10
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'resident_2',
    name: 'Taffy Tom',
    x: 12,
    y: 5,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['friendly', 'hardworking'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'resident_3',
    name: 'Honey Family Dad',
    x: 19,
    y: 5,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['protective', 'tired'],
    hp: 18,
    hpMax: 18
  }));
  
  // Kids playing
  npcs.push(spawnSocialNPC(state, {
    id: 'kid_1',
    name: 'Lollipop Boy',
    x: 11,
    y: 9,
    faction: 'peasants',
    dialogueType: 'candy_child',
    traits: ['playful', 'mischievous'],
    hp: 8,
    hpMax: 8,
    role: 'child'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'kid_2',
    name: 'Gummy Girl',
    x: 12,
    y: 13,
    faction: 'peasants',
    dialogueType: 'candy_child',
    traits: ['cheerful', 'energetic'],
    hp: 8,
    hpMax: 8,
    role: 'child'
  }));
  
  // Gate guard
  npcs.push(spawnSocialNPC(state, {
    id: 'south_gate_guard',
    name: 'Fudge Guard',
    x: 11,
    y: 19,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['relaxed', 'friendly'],
    hp: 25,
    hpMax: 25
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn NPCs for the West Gate chunk (Training Grounds)
 */
export function spawnWestGateNPCs(state) {
  const npcs = [];
  
  // Training master
  npcs.push(spawnSocialNPC(state, {
    id: 'training_master',
    name: 'Master Hardcandy',
    x: 11,
    y: 10,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['veteran', 'strict', 'skilled'],
    hp: 40,
    hpMax: 40,
    role: 'trainer'
  }));
  
  // Training guards
  npcs.push(spawnSocialNPC(state, {
    id: 'trainee_1',
    name: 'Rookie Raspberry',
    x: 5,
    y: 6,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['eager', 'inexperienced'],
    hp: 20,
    hpMax: 20,
    role: 'trainee'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'trainee_2',
    name: 'Cadet Coconut',
    x: 18,
    y: 6,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['determined', 'clumsy'],
    hp: 20,
    hpMax: 20,
    role: 'trainee'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'trainee_3',
    name: 'Private Peanut',
    x: 10,
    y: 15,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['strong', 'slow'],
    hp: 22,
    hpMax: 22,
    role: 'trainee'
  }));
  
  // Armorer
  npcs.push(spawnSocialNPC(state, {
    id: 'armorer',
    name: 'Smith Sourball',
    x: 18,
    y: 14,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'armor',
    traits: ['skilled', 'grumpy'],
    hp: 25,
    hpMax: 25,
    shopkeeper: true
  }));
  
  // Gate guard
  npcs.push(spawnSocialNPC(state, {
    id: 'west_gate_guard',
    name: 'Jawbreaker Jim',
    x: 2,
    y: 10,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['tough', 'intimidating'],
    hp: 30,
    hpMax: 30
  }));
  
  return npcs.filter(npc => npc !== null);
}