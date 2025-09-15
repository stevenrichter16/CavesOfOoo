// src/js/world/candyKingdomTown.js
// Candy Kingdom Town - Main starting area within the kingdom walls
// Migrated from OLD social system

import { spawnSocialNPC } from '../../social/migrationAdapter.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// Full viewport dimensions
const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

// Candy Kingdom Town chunk coordinates (expanded starting area)
export const CANDY_KINGDOM_COORDS = { x: 0, y: 0 };

/**
 * Generate the Candy Kingdom Town layout
 * A bustling town square within the candy kingdom walls
 */
export function generateCandyKingdomMap() {
  const map = [];
  
  // Initialize with candy cobblestone floor (.)
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      map[y][x] = '.';
    }
  }
  
  // Add thick kingdom walls with gate
  // Top wall with battlements
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[0][x] = '#'; // Thick wall
    map[1][x] = '#'; // Double thick
    // Gate entrance at center
    if (x >= 22 && x <= 25) {
      map[0][x] = '.';
      map[1][x] = '.';
    }
  }
  
  // Bottom wall
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    map[CHUNK_HEIGHT-1][x] = '#';
    map[CHUNK_HEIGHT-2][x] = '#';
    // South gate
    if (x >= 22 && x <= 25) {
      map[CHUNK_HEIGHT-1][x] = '.';
      map[CHUNK_HEIGHT-2][x] = '.';
    }
  }
  
  // Side walls
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][0] = '#';
    map[y][1] = '#';
    map[y][CHUNK_WIDTH-1] = '#';
    map[y][CHUNK_WIDTH-2] = '#';
    // Side gates
    if (y >= 9 && y <= 12) {
      map[y][0] = '.';
      map[y][1] = '.';
      map[y][CHUNK_WIDTH-1] = '.';
      map[y][CHUNK_WIDTH-2] = '.';
    }
  }
  
  // Central fountain (now truly centered)
  map[10][23] = '○'; // Fountain center
  map[9][23] = '~';  // Water
  map[11][23] = '~';
  map[10][22] = '~';
  map[10][24] = '~';
  map[9][22] = '~';
  map[9][24] = '~';
  map[11][22] = '~';
  map[11][24] = '~';
  
  // Market stalls - West side row
  map[5][4] = '╬';
  map[5][5] = '═';
  map[5][8] = '╬';
  map[5][9] = '═';
  map[5][12] = '╬';
  map[5][13] = '═';
  
  map[8][4] = '╬';
  map[8][5] = '═';
  map[8][8] = '╬';
  map[8][9] = '═';
  map[8][12] = '╬';
  map[8][13] = '═';
  
  map[11][4] = '╬';
  map[11][5] = '═';
  map[11][8] = '╬';
  map[11][9] = '═';
  map[11][12] = '╬';
  map[11][13] = '═';
  
  map[14][4] = '╬';
  map[14][5] = '═';
  map[14][8] = '╬';
  map[14][9] = '═';
  map[14][12] = '╬';
  map[14][13] = '═';
  
  // Market stalls - East side row
  map[5][34] = '╬';
  map[5][35] = '═';
  map[5][38] = '╬';
  map[5][39] = '═';
  map[5][42] = '╬';
  map[5][43] = '═';
  
  map[8][34] = '╬';
  map[8][35] = '═';
  map[8][38] = '╬';
  map[8][39] = '═';
  map[8][42] = '╬';
  map[8][43] = '═';
  
  map[11][34] = '╬';
  map[11][35] = '═';
  map[11][38] = '╬';
  map[11][39] = '═';
  map[11][42] = '╬';
  map[11][43] = '═';
  
  map[14][34] = '╬';
  map[14][35] = '═';
  map[14][38] = '╬';
  map[14][39] = '═';
  map[14][42] = '╬';
  map[14][43] = '═';
  
  // Guard posts at gates
  map[2][21] = '▲';  // North gate guard post left
  map[2][26] = '▲';  // North gate guard post right
  map[19][21] = '▲'; // South gate guard post left
  map[19][26] = '▲'; // South gate guard post right
  map[9][2] = '▲';   // West gate guard post
  map[12][2] = '▲';
  map[9][45] = '▲';  // East gate guard post
  map[12][45] = '▲';
  
  // Benches around fountain
  map[8][20] = '═';
  map[8][26] = '═';
  map[12][20] = '═';
  map[12][26] = '═';
  map[10][19] = '═';
  map[10][27] = '═';
  
  // Decorative candy trees throughout
  map[4][16] = '♣';
  map[4][31] = '♣';
  map[16][16] = '♣';
  map[16][31] = '♣';
  map[7][7] = '♣';
  map[7][40] = '♣';
  map[13][7] = '♣';
  map[13][40] = '♣';
  
  // Additional buildings - West side
  // Library
  for (let y = 15; y <= 18; y++) {
    for (let x = 6; x <= 11; x++) {
      if (y === 15 || y === 18 || x === 6 || x === 11) {
        map[y][x] = '▪';
      }
    }
  }
  map[16][6] = '+'; // Door
  
  // Inn
  for (let y = 6; y <= 9; y++) {
    for (let x = 16; x <= 20; x++) {
      if (y === 6 || y === 9 || x === 16 || x === 20) {
        map[y][x] = '▪';
      }
    }
  }
  map[7][16] = '+'; // Door
  
  // Additional buildings - East side
  // Bank
  for (let y = 15; y <= 18; y++) {
    for (let x = 36; x <= 41; x++) {
      if (y === 15 || y === 18 || x === 36 || x === 41) {
        map[y][x] = '▪';
      }
    }
  }
  map[16][41] = '+'; // Door
  
  // Temple
  for (let y = 6; y <= 9; y++) {
    for (let x = 27; x <= 31; x++) {
      if (y === 6 || y === 9 || x === 27 || x === 31) {
        map[y][x] = '▪';
      }
    }
  }
  map[7][31] = '+'; // Door
  
  return map;
}

/**
 * Spawn NPCs for Candy Kingdom Town
 */
export function spawnCandyKingdomNPCs(state) {
  const npcs = [];

  npcs.push(spawnSocialNPC(state, {
    id: 'steven',
    name: 'Steven',
    x: 10, 
    y: 10,
    faction: 'nobles',
    dialogueType: 'steven',
    traits: ['mysterious','cunning','polite'],
    hp: 35, 
    hpMax: 35
  }));
  
  // Gate Guards
  npcs.push(spawnSocialNPC(state, {
    id: 'captain_rootbeer',
    name: 'Captain Root Beer',
    x: 21,
    y: 2,
    faction: 'guards',
    dialogueType: 'captain_rootbeer',
    traits: ['disciplined', 'protective', 'veteran'],
    hp: 30,
    hpMax: 30,
    role: 'guard_captain'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'banana_guard_north',
    name: 'Banana Guard',
    x: 26,
    y: 2,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['alert', 'dutiful'],
    hp: 25,
    hpMax: 25,
    role: 'guard'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'banana_guard_south',
    name: 'Banana Guard',
    x: 21,
    y: 19,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['friendly', 'talkative'],
    hp: 25,
    hpMax: 25,
    role: 'guard'
  }));
  
  // Unique Merchants
  npcs.push(spawnSocialNPC(state, {
    id: 'manfried_candycorn',
    name: 'Manfried the Candycorn',
    x: 5,
    y: 6,
    faction: 'merchants',
    dialogueType: 'manfried',
    goods: 'candy_apples',
    traits: ['melancholic', 'poetic', 'mysterious'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    role: 'merchant'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'mrs_butterscotch',
    name: 'Mrs. Butterscotch',
    x: 9,
    y: 6,
    faction: 'merchants',
    dialogueType: 'mrs_butterscotch',
    goods: 'lollipops',
    traits: ['motherly', 'gossipy', 'generous'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    role: 'merchant'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'chocopierre',
    name: 'Chocopierre',
    x: 35,
    y: 6,
    faction: 'merchants',
    dialogueType: 'chocopierre',
    goods: 'chocolate',
    traits: ['sophisticated', 'artistic', 'prideful'],
    hp: 20,
    hpMax: 20,
    shopkeeper: true,
    role: 'merchant'
  }));
  
  // Regular Citizens
  npcs.push(spawnSocialNPC(state, {
    id: 'candy_child_1',
    name: 'Gumdrop Kid',
    x: 19,
    y: 9,
    faction: 'peasants',
    dialogueType: 'candy_child',
    traits: ['playful', 'energetic', 'curious'],
    hp: 10,
    hpMax: 10,
    role: 'child'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'candy_child_2',
    name: 'Jellybean Girl',
    x: 27,
    y: 8,
    faction: 'peasants',
    dialogueType: 'candy_child',
    traits: ['shy', 'creative', 'kind'],
    hp: 10,
    hpMax: 10,
    role: 'child'
  }));
  
  // Interesting Characters
  npcs.push(spawnSocialNPC(state, {
    id: 'old_taffy',
    name: 'Old Man Taffy',
    x: 20,
    y: 13,
    faction: 'peasants',
    dialogueType: 'old_taffy',
    traits: ['wise', 'nostalgic', 'storyteller'],
    hp: 15,
    hpMax: 15,
    role: 'elder'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'peppermint_larry',
    name: 'Peppermint Larry',
    x: 26,
    y: 13,
    faction: 'peasants',
    dialogueType: 'peppermint_larry',
    traits: ['paranoid', 'conspiracy_theorist', 'eccentric'],
    hp: 18,
    hpMax: 18,
    role: 'citizen'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'candy_cornia',
    name: 'Candy Cornia',
    x: 29,
    y: 7,
    faction: 'nobles',
    dialogueType: 'candy_cornia',
    traits: ['snobbish', 'fashionable', 'influential'],
    hp: 22,
    hpMax: 22,
    role: 'noble'
  }));
  
  // More regular NPCs to populate the town
  npcs.push(spawnSocialNPC(state, {
    id: 'citizen_1',
    name: 'Candy Citizen',
    x: 10,
    y: 7,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['friendly', 'hardworking'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'citizen_2',
    name: 'Sugar Worker',
    x: 12,
    y: 6,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['tired', 'honest'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'citizen_3',
    name: 'Candy Farmer',
    x: 16,
    y: 11,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['practical', 'traditional'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'merchant_assistant',
    name: 'Shop Assistant',
    x: 19,
    y: 8,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['helpful', 'eager'],
    hp: 18,
    hpMax: 18
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'noble_courtier',
    name: 'Lord Lollipop',
    x: 38,
    y: 16,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['arrogant', 'refined'],
    hp: 20,
    hpMax: 20
  }));
  
  // Additional NPCs for the expanded area
  npcs.push(spawnSocialNPC(state, {
    id: 'librarian',
    name: 'Sage Sweetroll',
    x: 8,
    y: 16,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['intelligent', 'quiet', 'helpful'],
    hp: 12,
    hpMax: 12,
    role: 'librarian'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'innkeeper',
    name: 'Jolly Jelly',
    x: 18,
    y: 7,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['welcoming', 'chatty', 'business-minded'],
    hp: 20,
    hpMax: 20,
    role: 'innkeeper'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'banker',
    name: 'Count Coinsworth',
    x: 39,
    y: 16,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['greedy', 'calculating', 'wealthy'],
    hp: 18,
    hpMax: 18,
    role: 'banker'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'priest',
    name: 'Brother Bonbon',
    x: 29,
    y: 7,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['pious', 'kind', 'wise'],
    hp: 15,
    hpMax: 15,
    role: 'priest'
  }));
  
  // More merchants for the expanded market
  npcs.push(spawnSocialNPC(state, {
    id: 'baker',
    name: 'Crusty Chris',
    x: 13,
    y: 6,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'baked_goods',
    traits: ['warm', 'early-riser'],
    hp: 18,
    hpMax: 18,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'jeweler',
    name: 'Crystal Claire',
    x: 39,
    y: 6,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'jewelry',
    traits: ['precise', 'artistic'],
    hp: 16,
    hpMax: 16,
    shopkeeper: true
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'herbalist',
    name: 'Minty Margaret',
    x: 43,
    y: 9,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'herbs',
    traits: ['knowledgeable', 'nature-loving'],
    hp: 15,
    hpMax: 15,
    shopkeeper: true
  }));
  
  // More citizens
  npcs.push(spawnSocialNPC(state, {
    id: 'citizen_4',
    name: 'Candy Citizen',
    x: 32,
    y: 10,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['busy', 'polite'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'citizen_5',
    name: 'Market Visitor',
    x: 15,
    y: 10,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['curious', 'talkative'],
    hp: 15,
    hpMax: 15
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'banana_guard_west',
    name: 'Banana Guard',
    x: 2,
    y: 10,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['alert', 'professional'],
    hp: 25,
    hpMax: 25
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'banana_guard_east',
    name: 'Banana Guard',
    x: 45,
    y: 10,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['stoic', 'experienced'],
    hp: 25,
    hpMax: 25
  }));
  
  // Special gnome fairy NPC
  npcs.push(spawnSocialNPC(state, {
    id: 'gnome_fairy',
    name: 'Glimmer the Gnome',
    x: 25,
    y: 9,
    faction: 'peasants',
    dialogueType: 'gnome_fairy',
    traits: ['magical', 'mischievous', 'helpful'],
    hp: 30,
    hpMax: 30,
    role: 'fairy',
    sprite: 'gnome_fairy',
    char: '🧚',  // Unicode fairy as fallback
    color: '#2E7D32'  // Green color for ASCII mode
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Generate the complete Candy Kingdom Town chunk
 */
export function generateCandyKingdomTownChunk(worldSeed, cx, cy) {
  // Only generate if at town coordinates
  if (cx !== CANDY_KINGDOM_COORDS.x || cy !== CANDY_KINGDOM_COORDS.y) {
    return null;
  }
  
  const chunk = {
    map: generateCandyKingdomMap(),
    monsters: [],
    items: [
      // Starting potion near fountain
      { x: 9, y: 10, type: 'potion', item: { 
        name: 'Candy Healing Potion', 
        type: 'potion', 
        heal: 10,
        description: 'A sweet healing concoction'
      }},
      // Some coins scattered around
      { x: 7, y: 7, type: 'coin', amount: 5 },
      { x: 16, y: 13, type: 'coin', amount: 3 },
      { x: 5, y: 16, type: 'coin', amount: 7 }
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The heart of the Candy Kingdom - a bustling town square',
    isKingdomTown: true
  };
  
  return chunk;
}