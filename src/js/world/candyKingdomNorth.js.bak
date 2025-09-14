// src/js/world/candyKingdomNorth.js
// North Gate chunk - Castle approach and noble district

import { spawnSocialNPC } from '../social/init.js';

const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

/**
 * Generate the North Gate chunk - Castle approach and noble district
 * Coordinates: (0, -1)
 */
export function generateNorthGateChunk(worldSeed, cx, cy) {
  if (cx !== 0 || cy !== -1) return null;
  
  const map = [];
  
  // Initialize with fancy tilework
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      // Checkered pattern for noble district
      map[y][x] = ((x + y) % 2 === 0) ? '.' : '·';
    }
  }
  
  // Side walls continuing from main town
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    map[y][0] = '#';
    map[y][1] = '#';
    map[y][CHUNK_WIDTH-1] = '#';
    map[y][CHUNK_WIDTH-2] = '#';
  }
  
  // Castle walls at the north end (massive fortification)
  for (let y = 0; y <= 5; y++) {
    for (let x = 8; x < 40; x++) {
      map[y][x] = '█';
    }
  }
  
  // Castle gate (grand entrance)
  for (let y = 2; y <= 5; y++) {
    for (let x = 22; x <= 25; x++) {
      map[y][x] = '.';
    }
  }
  
  // Castle towers
  for (let y = 0; y <= 6; y++) {
    for (let x = 8; x <= 11; x++) {
      map[y][x] = '█';
    }
    for (let x = 36; x <= 39; x++) {
      map[y][x] = '█';
    }
  }
  map[1][10] = '▲'; // Tower peak
  map[1][37] = '▲'; // Tower peak
  
  // Grand processional road (center)
  for (let y = 6; y < CHUNK_HEIGHT; y++) {
    for (let x = 22; x <= 25; x++) {
      map[y][x] = '=';
    }
  }
  
  // Noble estates - West side
  // Estate 1
  for (let y = 8; y <= 13; y++) {
    for (let x = 4; x <= 11; x++) {
      if (y === 8 || y === 13 || x === 4 || x === 11) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[10][4] = '+'; // Door
  map[9][7] = '○'; // Fountain
  map[9][8] = '~';
  
  // Estate 2
  for (let y = 15; y <= 20; y++) {
    for (let x = 4; x <= 11; x++) {
      if (y === 15 || y === 20 || x === 4 || x === 11) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[17][4] = '+'; // Door
  
  // Estate 3
  for (let y = 8; y <= 13; y++) {
    for (let x = 13; x <= 20; x++) {
      if (y === 8 || y === 13 || x === 13 || x === 20) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[10][13] = '+'; // Door
  
  // Noble estates - East side
  // Estate 4
  for (let y = 8; y <= 13; y++) {
    for (let x = 27; x <= 34; x++) {
      if (y === 8 || y === 13 || x === 27 || x === 34) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[10][34] = '+'; // Door
  map[9][30] = '○'; // Fountain
  map[9][31] = '~';
  
  // Estate 5
  for (let y = 15; y <= 20; y++) {
    for (let x = 27; x <= 34; x++) {
      if (y === 15 || y === 20 || x === 27 || x === 34) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[17][34] = '+'; // Door
  
  // Estate 6
  for (let y = 8; y <= 13; y++) {
    for (let x = 36; x <= 43; x++) {
      if (y === 8 || y === 13 || x === 36 || x === 43) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[10][43] = '+'; // Door
  
  // Royal gardens
  for (let y = 7; y <= 14; y++) {
    if (y % 2 === 0) {
      map[y][2] = '♣';
      map[y][45] = '♣';
    }
  }
  
  for (let y = 16; y <= 20; y++) {
    if ((y + 1) % 2 === 0) {
      map[y][14] = '♣';
      map[y][33] = '♣';
    }
  }
  
  // Decorative statues along the road
  map[7][21] = '◊';
  map[7][26] = '◊';
  map[12][21] = '◊';
  map[12][26] = '◊';
  map[17][21] = '◊';
  map[17][26] = '◊';
  
  // Ornate benches
  map[10][18] = '═';
  map[10][29] = '═';
  map[15][18] = '═';
  map[15][29] = '═';
  
  // Guard posts
  map[6][20] = '▲';
  map[6][27] = '▲';
  
  // South connection (open to main town)
  for (let x = 22; x <= 25; x++) {
    map[CHUNK_HEIGHT-1][x] = '.';
    map[CHUNK_HEIGHT-2][x] = '.';
  }
  
  const chunk = {
    map,
    monsters: [],
    items: [
      { x: 7, y: 10, type: 'coin', amount: 25 },
      { x: 40, y: 10, type: 'coin', amount: 25 },
      { x: 23, y: 15, type: 'potion', item: { 
        name: 'Royal Elixir', 
        type: 'potion', 
        heal: 25,
        description: 'A refined healing potion'
      }}
    ],
    npcs: [],
    biome: 'candy_kingdom',
    description: 'The noble district leading to Princess Bubblegum\'s castle',
    isKingdomChunk: true
  };
  
  return chunk;
}

/**
 * Spawn NPCs for the North Gate chunk
 */
export function spawnNorthGateNPCs(state) {
  const npcs = [];
  
  // Castle entrance guards (elite)
  npcs.push(spawnSocialNPC(state, {
    id: 'royal_guard_left',
    name: 'Sir Crimson',
    x: 21,
    y: 5,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['elite', 'loyal', 'stern'],
    hp: 40,
    hpMax: 40,
    role: 'royal_guard'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'royal_guard_right',
    name: 'Sir Azure',
    x: 26,
    y: 5,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['elite', 'vigilant', 'noble'],
    hp: 40,
    hpMax: 40,
    role: 'royal_guard'
  }));
  
  // Tower guards
  npcs.push(spawnSocialNPC(state, {
    id: 'tower_guard_west',
    name: 'Banana Guard',
    x: 10,
    y: 7,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['watchful', 'quiet'],
    hp: 30,
    hpMax: 30
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'tower_guard_east',
    name: 'Banana Guard',
    x: 37,
    y: 7,
    faction: 'guards',
    dialogueType: 'banana_guard',
    traits: ['alert', 'disciplined'],
    hp: 30,
    hpMax: 30
  }));
  
  // Noble residents
  npcs.push(spawnSocialNPC(state, {
    id: 'duke_butterworth',
    name: 'Duke Butterworth',
    x: 7,
    y: 10,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['wealthy', 'influential', 'pompous'],
    hp: 25,
    hpMax: 25,
    role: 'duke'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'duchess_marmalade',
    name: 'Duchess Marmalade',
    x: 8,
    y: 11,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['elegant', 'shrewd', 'gossipy'],
    hp: 22,
    hpMax: 22,
    role: 'duchess'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'baron_bonbon',
    name: 'Baron Bonbon',
    x: 16,
    y: 10,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['ambitious', 'cunning', 'charming'],
    hp: 24,
    hpMax: 24,
    role: 'baron'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'lady_licorice',
    name: 'Lady Licorice',
    x: 30,
    y: 10,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['mysterious', 'aloof', 'intelligent'],
    hp: 20,
    hpMax: 20,
    role: 'lady'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'count_caramel',
    name: 'Count Caramel',
    x: 39,
    y: 10,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['vain', 'wealthy', 'collector'],
    hp: 23,
    hpMax: 23,
    role: 'count'
  }));
  
  // Servants and staff
  npcs.push(spawnSocialNPC(state, {
    id: 'butler_1',
    name: 'Jeeves Jellybean',
    x: 6,
    y: 12,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['dutiful', 'discreet', 'observant'],
    hp: 15,
    hpMax: 15,
    role: 'butler'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'maid_1',
    name: 'Molly Mint',
    x: 32,
    y: 12,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['hardworking', 'friendly', 'tired'],
    hp: 12,
    hpMax: 12,
    role: 'maid'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'gardener_1',
    name: 'Garden Gary',
    x: 14,
    y: 18,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['peaceful', 'nature-loving', 'wise'],
    hp: 14,
    hpMax: 14,
    role: 'gardener'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'gardener_2',
    name: 'Flora Fudge',
    x: 33,
    y: 18,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['cheerful', 'green-thumb', 'talkative'],
    hp: 14,
    hpMax: 14,
    role: 'gardener'
  }));
  
  // Visiting nobles
  npcs.push(spawnSocialNPC(state, {
    id: 'visiting_noble_1',
    name: 'Lord Lemondrop',
    x: 23,
    y: 12,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['foreign', 'curious', 'diplomatic'],
    hp: 21,
    hpMax: 21
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'visiting_noble_2',
    name: 'Lady Lavender',
    x: 24,
    y: 13,
    faction: 'nobles',
    dialogueType: 'nobles',
    traits: ['sophisticated', 'well-traveled', 'cultured'],
    hp: 20,
    hpMax: 20
  }));
  
  // Royal messenger
  npcs.push(spawnSocialNPC(state, {
    id: 'royal_messenger',
    name: 'Swift Sam',
    x: 23,
    y: 8,
    faction: 'guards',
    dialogueType: 'peasants',
    traits: ['fast', 'reliable', 'discrete'],
    hp: 18,
    hpMax: 18,
    role: 'messenger'
  }));
  
  // Noble children
  npcs.push(spawnSocialNPC(state, {
    id: 'noble_child_1',
    name: 'Little Lord Lollipop Jr.',
    x: 18,
    y: 11,
    faction: 'nobles',
    dialogueType: 'candy_child',
    traits: ['spoiled', 'bratty', 'entitled'],
    hp: 10,
    hpMax: 10,
    role: 'child'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'noble_child_2',
    name: 'Princess Petit Four',
    x: 29,
    y: 11,
    faction: 'nobles',
    dialogueType: 'candy_child',
    traits: ['precious', 'demanding', 'cute'],
    hp: 10,
    hpMax: 10,
    role: 'child'
  }));
  
  return npcs.filter(npc => npc !== null);
}