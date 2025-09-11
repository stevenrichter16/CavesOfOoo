// src/js/world/candyKingdomEast.js
// East Gate chunk - Massive merchant quarter and bazaar

import { spawnSocialNPC } from '../social/init.js';

const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

/**
 * Generate the East Gate chunk - Grand Bazaar
 * Coordinates: (1, 0)
 */
export function generateEastGateChunk(worldSeed, cx, cy) {
  if (cx !== 1 || cy !== 0) return null;
  
  const map = [];
  
  // Initialize with market floor pattern
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
  
  // East outer wall with grand gate
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
  
  // Market stalls - organized in rows
  // Row 1 (y=3-4)
  for (let x = 3; x <= 44; x += 3) {
    if (x < 44) {
      map[3][x] = '╬';
      map[3][x+1] = '═';
      map[4][x] = '□'; // Storage
    }
  }
  
  // Row 2 (y=6-7)
  for (let x = 3; x <= 44; x += 3) {
    if (x < 44) {
      map[6][x] = '╬';
      map[6][x+1] = '═';
      map[7][x] = '□';
    }
  }
  
  // Row 3 (y=9-10)
  for (let x = 3; x <= 44; x += 3) {
    if (x < 44 && x !== 21 && x !== 24) { // Leave center clear
      map[9][x] = '╬';
      map[9][x+1] = '═';
      map[10][x] = '□';
    }
  }
  
  // Row 4 (y=12-13)
  for (let x = 3; x <= 44; x += 3) {
    if (x < 44 && x !== 21 && x !== 24) { // Leave center clear
      map[12][x] = '╬';
      map[12][x+1] = '═';
      map[13][x] = '□';
    }
  }
  
  // Row 5 (y=15-16)
  for (let x = 3; x <= 44; x += 3) {
    if (x < 44) {
      map[15][x] = '╬';
      map[15][x+1] = '═';
      map[16][x] = '□';
    }
  }
  
  // Row 6 (y=18-19)
  for (let x = 3; x <= 44; x += 3) {
    if (x < 44) {
      map[18][x] = '╬';
      map[18][x+1] = '═';
      map[19][x] = '□';
    }
  }
  
  // Central plaza with fountain
  for (let y = 9; y <= 13; y++) {
    for (let x = 21; x <= 26; x++) {
      if (y === 9 || y === 13 || x === 21 || x === 26) {
        map[y][x] = '-';
      }
    }
  }
  map[11][23] = '○'; // Fountain
  map[11][24] = '~';
  map[10][23] = '~';
  map[12][23] = '~';
  
  // Merchant guild building (large structure)
  for (let y = 2; y <= 5; y++) {
    for (let x = 20; x <= 27; x++) {
      if (y === 2 || y === 5 || x === 20 || x === 27) {
        map[y][x] = '█';
      }
    }
  }
  map[5][23] = '+'; // Door
  map[5][24] = '+'; // Double door
  map[3][23] = '◊'; // Guild sign
  
  // Warehouse buildings
  // Warehouse 1
  for (let y = 14; y <= 17; y++) {
    for (let x = 2; x <= 6; x++) {
      if (y === 14 || y === 17 || x === 2 || x === 6) {
        map[y][x] = '▪';
      }
    }
  }
  map[15][2] = '+';
  
  // Warehouse 2
  for (let y = 14; y <= 17; y++) {
    for (let x = 41; x <= 45; x++) {
      if (y === 14 || y === 17 || x === 41 || x === 45) {
        map[y][x] = '▪';
      }
    }
  }
  map[15][45] = '+';
  
  // Money changer booths
  map[8][10] = '₪';
  map[8][37] = '₪';
  
  // Auction platform
  for (let y = 16; y <= 17; y++) {
    for (let x = 22; x <= 25; x++) {
      map[y][x] = '▓';
    }
  }
  
  // Decorative elements
  // Banners
  map[2][8] = '⚑';
  map[2][16] = '⚑';
  map[2][31] = '⚑';
  map[2][39] = '⚑';
  
  // Benches for customers
  map[5][5] = '═';
  map[5][13] = '═';
  map[5][34] = '═';
  map[5][42] = '═';
  map[11][8] = '═';
  map[11][15] = '═';
  map[11][32] = '═';
  map[11][39] = '═';
  
  const chunk = {
    map,
    monsters: [],
    items: [
      { x: 23, y: 11, type: 'coin', amount: 50 },
      { x: 5, y: 5, type: 'coin', amount: 15 },
      { x: 42, y: 5, type: 'coin', amount: 15 },
      { x: 10, y: 10, type: 'food', item: { 
        name: 'Exotic Fruit', 
        type: 'food', 
        heal: 12 
      }},
      { x: 37, y: 10, type: 'potion', item: { 
        name: 'Merchant\'s Tonic', 
        type: 'potion', 
        heal: 20 
      }}
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The Grand Bazaar - the kingdom\'s bustling trade center',
    isKingdomChunk: true
  };
  
  return chunk;
}

/**
 * Spawn NPCs for the East Gate chunk
 */
export function spawnEastGateNPCs(state) {
  const npcs = [];
  
  // Merchant Guild Master
  npcs.push(spawnSocialNPC(state, {
    id: 'guild_master',
    name: 'Master Marzipan',
    x: 23,
    y: 4,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['wealthy', 'influential', 'shrewd'],
    hp: 30,
    hpMax: 30,
    role: 'guild_master'
  }));
  
  // Row 1 merchants
  npcs.push(spawnSocialNPC(state, {
    id: 'weapon_merchant',
    name: 'Sharp Eddie',
    x: 4,
    y: 3,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'weapons',
    traits: ['gruff', 'experienced', 'honest'],
    hp: 25,
    hpMax: 25,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'armor_merchant',
    name: 'Iron Ingrid',
    x: 7,
    y: 3,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'armor',
    traits: ['tough', 'skilled', 'fair'],
    hp: 28,
    hpMax: 28,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'potion_seller',
    name: 'Bubbles McGee',
    x: 10,
    y: 3,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'potions',
    traits: ['eccentric', 'knowledgeable', 'mysterious'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'jeweler',
    name: 'Sparkle Sarah',
    x: 13,
    y: 3,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'jewelry',
    traits: ['precise', 'elegant', 'expensive'],
    hp: 16,
    hpMax: 16,
    shopkeeper: true
  }));
  
  // Row 2 merchants
  npcs.push(spawnSocialNPC(state, {
    id: 'spice_trader',
    name: 'Saffron Sam',
    x: 4,
    y: 6,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'spices',
    traits: ['exotic', 'well-traveled', 'haggler'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'fabric_merchant',
    name: 'Silk Sally',
    x: 10,
    y: 6,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'fabrics',
    traits: ['fashionable', 'gossipy', 'trendy'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'book_seller',
    name: 'Tome Tony',
    x: 16,
    y: 6,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'books',
    traits: ['intelligent', 'quiet', 'helpful'],
    hp: 15,
    hpMax: 15,
    shopkeeper: true
  }));
  
  // Row 3 merchants
  npcs.push(spawnSocialNPC(state, {
    id: 'food_vendor_1',
    name: 'Baker Betty',
    x: 4,
    y: 9,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'baked_goods',
    traits: ['warm', 'motherly', 'generous'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'food_vendor_2',
    name: 'Meat Mike',
    x: 10,
    y: 9,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'meats',
    traits: ['hearty', 'loud', 'friendly'],
    hp: 22,
    hpMax: 22,
    shopkeeper: true
  }));
  
  // Money changers
  npcs.push(spawnSocialNPC(state, {
    id: 'money_changer_1',
    name: 'Coins Carl',
    x: 10,
    y: 8,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['calculating', 'quick', 'observant'],
    hp: 16,
    hpMax: 16,
    role: 'banker'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'money_changer_2',
    name: 'Exchange Emma',
    x: 37,
    y: 8,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['precise', 'mathematical', 'busy'],
    hp: 16,
    hpMax: 16,
    role: 'banker'
  }));
  
  // Auction house staff
  npcs.push(spawnSocialNPC(state, {
    id: 'auctioneer',
    name: 'Gabby Gavel',
    x: 23,
    y: 16,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['loud', 'fast-talking', 'charismatic'],
    hp: 20,
    hpMax: 20,
    role: 'auctioneer'
  }));
  
  // Warehouse workers
  npcs.push(spawnSocialNPC(state, {
    id: 'warehouse_worker_1',
    name: 'Heavy Harry',
    x: 4,
    y: 15,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['strong', 'tired', 'hardworking'],
    hp: 20,
    hpMax: 20,
    role: 'laborer'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'warehouse_worker_2',
    name: 'Loader Larry',
    x: 43,
    y: 15,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['muscular', 'simple', 'reliable'],
    hp: 20,
    hpMax: 20,
    role: 'laborer'
  }));
  
  // Customers and visitors
  npcs.push(spawnSocialNPC(state, {
    id: 'shopper_1',
    name: 'Browsing Brenda',
    x: 15,
    y: 10,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['curious', 'indecisive', 'chatty'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'shopper_2',
    name: 'Rich Robert',
    x: 30,
    y: 10,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['wealthy', 'demanding', 'impatient'],
    hp: 18,
    hpMax: 18
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'shopper_3',
    name: 'Tourist Tina',
    x: 25,
    y: 12,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['foreign', 'excited', 'naive'],
    hp: 14,
    hpMax: 14
  }));
  
  // Market guards
  npcs.push(spawnSocialNPC(state, {
    id: 'market_guard_1',
    name: 'Market Guard',
    x: 2,
    y: 10,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['watchful', 'stern'],
    hp: 25,
    hpMax: 25
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'market_guard_2',
    name: 'Market Guard',
    x: 45,
    y: 10,
    faction: 'guards',
    dialogueType: 'guards',
    traits: ['alert', 'fair'],
    hp: 25,
    hpMax: 25
  }));
  
  // Street performers
  npcs.push(spawnSocialNPC(state, {
    id: 'juggler',
    name: 'Jolly Juggler',
    x: 20,
    y: 11,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['entertaining', 'acrobatic', 'cheerful'],
    hp: 14,
    hpMax: 14,
    role: 'entertainer'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'musician',
    name: 'Melody Max',
    x: 27,
    y: 11,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['musical', 'romantic', 'poor'],
    hp: 12,
    hpMax: 12,
    role: 'bard'
  }));
  
  // More row 4-6 merchants
  npcs.push(spawnSocialNPC(state, {
    id: 'exotic_goods',
    name: 'Foreign Fred',
    x: 34,
    y: 12,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'exotic',
    traits: ['mysterious', 'foreign', 'expensive'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'map_seller',
    name: 'Cartographer Chris',
    x: 40,
    y: 15,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'maps',
    traits: ['knowledgeable', 'adventurous', 'detailed'],
    hp: 16,
    hpMax: 16,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'pet_merchant',
    name: 'Pet Paula',
    x: 31,
    y: 18,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'pets',
    traits: ['animal-loving', 'gentle', 'caring'],
    hp: 15,
    hpMax: 15,
    shopkeeper: true
  }));
  
  return npcs.filter(npc => npc !== null);
}