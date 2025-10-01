// Migrated from OLD social system
// src/js/world/candyForest.js
// Cotton Candy Forest - Magical forest surrounding the Candy Kingdom

import { spawnSocialNPC } from '../../social/migrationAdapter.js';
import { makeMonster } from '../entities/entities.js';
import { createTileGrid, createGlyphAwareMap, assertNoLegacyTileIds } from './tileUtils.js';

const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

/**
 * Generate Cotton Candy Forest chunk - Northwest
 * Coordinates: (-1, -1)
 */
export function generateCandyForestNW(worldSeed, cx, cy) {
  if (cx !== -1 || cy !== -1) return null;
  
  const { map: baseMap, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const map = createGlyphAwareMap(baseMap, tileIds);
  
  // Initialize with forest floor (mix of grass and candy moss)
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      const r = Math.random();
      if (r < 0.7) map[y][x] = '·'; // Candy moss
      else if (r < 0.9) map[y][x] = ','; // Sugar grass
      else map[y][x] = '.'; // Path
    }
  }
  
  // Cotton candy trees (using various symbols)
  const treePositions = [
    [5, 3], [8, 5], [12, 4], [15, 6], [18, 3], [22, 5], [25, 4], [28, 6],
    [32, 3], [35, 5], [38, 4], [42, 6], [45, 3],
    [3, 10], [7, 12], [11, 11], [14, 13], [19, 10], [23, 12], [27, 11],
    [31, 13], [34, 10], [39, 12], [43, 11],
    [5, 17], [9, 19], [13, 18], [17, 17], [21, 19], [26, 18], [30, 17],
    [35, 19], [40, 18], [44, 17]
  ];
  
  for (const [x, y] of treePositions) {
    if (x < CHUNK_WIDTH && y < CHUNK_HEIGHT) {
      map[y][x] = '♣'; // Candy tree
      // Add tree canopy
      if (y > 0) map[y-1][x] = '◆'; // Cotton candy top
      if (x > 0 && y > 0) map[y-1][x-1] = '◇';
      if (x < CHUNK_WIDTH-1 && y > 0) map[y-1][x+1] = '◇';
    }
  }
  
  // Winding forest path
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    const pathY = 11 + Math.floor(Math.sin(x * 0.3) * 3);
    if (pathY >= 0 && pathY < CHUNK_HEIGHT) {
      map[pathY][x] = '=';
      if (pathY > 0) map[pathY-1][x] = '.';
      if (pathY < CHUNK_HEIGHT-1) map[pathY+1][x] = '.';
    }
  }
  
  // Fairy ring (mushroom circle)
  const ringX = 15, ringY = 15;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const x = Math.round(ringX + Math.cos(angle) * 4);
    const y = Math.round(ringY + Math.sin(angle) * 2);
    if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT) {
      map[y][x] = '°'; // Mushroom
    }
  }
  
  // Hidden candy stash
  map[3][40] = '$'; // Chest
  
  // Berry bushes
  map[8][20] = '❀';
  map[14][8] = '❀';
  map[18][30] = '❀';
  map[6][35] = '❀';
  
  const chunk = {
    map: baseMap,
    tileIds,
    monsters: [],
    items: [
      { x: 40, y: 3, type: 'chest', contents: [
        { type: 'coin', amount: 30 },
        { type: 'potion', item: { name: 'Forest Nectar', heal: 20 }}
      ]},
      { x: 20, y: 8, type: 'food', item: { name: 'Candy Berries', heal: 8 }},
      { x: 8, y: 14, type: 'food', item: { name: 'Sugar Fruit', heal: 10 }},
      { x: 15, y: 15, type: 'special', item: { 
        name: 'Fairy Dust', 
        description: 'Sparkles with magical energy'
      }}
    ],
    npcs: [],
    biome: 'candy_forest',
    description: 'Dense cotton candy forest with towering sugar trees',
    isForest: true
  };

  assertNoLegacyTileIds(tileIds, 'generateCandyForestNW');

  return chunk;
}

/**
 * Generate Cotton Candy Forest chunk - Northeast  
 * Coordinates: (1, -1)
 */
export function generateCandyForestNE(worldSeed, cx, cy) {
  if (cx !== 1 || cy !== -1) return null;
  
  const { map: baseMap, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const map = createGlyphAwareMap(baseMap, tileIds);
  
  // Initialize with forest floor
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      const r = Math.random();
      if (r < 0.6) map[y][x] = '·';
      else if (r < 0.85) map[y][x] = ',';
      else map[y][x] = '.';
    }
  }
  
  // Denser tree coverage in this area
  for (let i = 0; i < 45; i++) {
    const x = Math.floor(Math.random() * CHUNK_WIDTH);
    const y = Math.floor(Math.random() * CHUNK_HEIGHT);
    if (map[y][x] !== '=' && map[y][x] !== '$') {
      map[y][x] = '♣';
      if (y > 0) map[y-1][x] = '◆';
    }
  }
  
  // Candy cane grove (special area)
  for (let y = 8; y <= 14; y++) {
    for (let x = 20; x <= 28; x++) {
      if ((x + y) % 3 === 0) {
        map[y][x] = '|'; // Candy cane
      } else {
        map[y][x] = '·';
      }
    }
  }
  
  // Small clearing with pond
  for (let y = 4; y <= 7; y++) {
    for (let x = 35; x <= 42; x++) {
      map[y][x] = '.';
    }
  }
  // Pond
  map[5][38] = '~';
  map[5][39] = '~';
  map[6][38] = '~';
  map[6][39] = '~';
  map[6][40] = '~';
  
  // Ancient sugar crystal
  map[11][24] = '★'; // Special artifact
  
  // More berry bushes
  map[3][10] = '❀';
  map[17][15] = '❀';
  map[10][40] = '❀';
  map[19][25] = '❀';
  
  // Hidden treehouse (entrance)
  map[2][8] = '▲';
  
  const chunk = {
    map: baseMap,
    tileIds,
    monsters: [],
    items: [
      { x: 24, y: 11, type: 'artifact', item: { 
        name: 'Ancient Sugar Crystal', 
        description: 'Pulses with ancient candy magic',
        value: 100
      }},
      { x: 38, y: 7, type: 'potion', item: { 
        name: 'Spring Water', 
        heal: 15,
        description: 'Pure water from the forest spring'
      }},
      { x: 10, y: 3, type: 'coin', amount: 20 },
      { x: 25, y: 19, type: 'food', item: { name: 'Wild Candy', heal: 12 }}
    ],
    npcs: [],
    biome: 'candy_forest',
    description: 'Deep cotton candy forest with a candy cane grove',
    isForest: true
  };

  assertNoLegacyTileIds(tileIds, 'generateCandyForestNE');

  return chunk;
}

/**
 * Generate Cotton Candy Forest chunk - Southwest
 * Coordinates: (-1, 1)
 */
export function generateCandyForestSW(worldSeed, cx, cy) {
  if (cx !== -1 || cy !== 1) return null;
  
  const { map: baseMap, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const map = createGlyphAwareMap(baseMap, tileIds);
  
  // Initialize with sparser forest (edge of forest)
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      const r = Math.random();
      if (r < 0.5) map[y][x] = '·';
      else if (r < 0.7) map[y][x] = ',';
      else map[y][x] = '.';
    }
  }
  
  // Fewer trees at forest edge
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(Math.random() * CHUNK_WIDTH);
    const y = Math.floor(Math.random() * CHUNK_HEIGHT);
    map[y][x] = '♣';
    if (y > 0 && Math.random() > 0.5) map[y-1][x] = '◆';
  }
  
  // Woodcutter's cabin
  for (let y = 10; y <= 14; y++) {
    for (let x = 20; x <= 25; x++) {
      if (y === 10 || y === 14 || x === 20 || x === 25) {
        map[y][x] = '▪';
      } else {
        map[y][x] = '·';
      }
    }
  }
  map[12][20] = '+'; // Door
  map[11][22] = '═'; // Bench
  map[11][23] = '═';
  
  // Wood pile
  map[13][26] = '≡';
  map[13][27] = '≡';
  map[12][26] = '≡';
  
  // Garden patch
  for (let y = 15; y <= 17; y++) {
    for (let x = 21; x <= 24; x++) {
      map[y][x] = '≈'; // Tilled soil
    }
  }
  
  // Well
  map[9][23] = 'O';
  
  // Forest trail markers
  map[5][5] = '↑';
  map[10][35] = '→';
  map[18][15] = '←';
  
  const chunk = {
    map: baseMap,
    tileIds,
    monsters: [],
    items: [
      { x: 23, y: 12, type: 'weapon', item: { 
        name: 'Woodcutter\'s Axe', 
        dmg: 5,
        description: 'Well-maintained chopping axe'
      }},
      { x: 22, y: 16, type: 'food', item: { name: 'Garden Vegetables', heal: 10 }},
      { x: 23, y: 9, type: 'potion', item: { name: 'Well Water', heal: 8 }}
    ],
    npcs: [],
    biome: 'candy_forest',
    description: 'Edge of the cotton candy forest with a woodcutter\'s cabin',
    isForest: true
  };

  assertNoLegacyTileIds(tileIds, 'generateCandyForestSW');

  return chunk;
}

/**
 * Generate Cotton Candy Forest chunk - Southeast
 * Coordinates: (1, 1)
 */
export function generateCandyForestSE(worldSeed, cx, cy) {
  if (cx !== 1 || cy !== 1) return null;
  
  const { map: baseMap, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const map = createGlyphAwareMap(baseMap, tileIds);
  
  // Initialize with mystical forest floor
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      const r = Math.random();
      if (r < 0.6) map[y][x] = '·';
      else if (r < 0.8) map[y][x] = '*'; // Glowing moss
      else map[y][x] = '.';
    }
  }
  
  // Enchanted grove - circular arrangement
  const groveX = 24, groveY = 11;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const x = Math.round(groveX + Math.cos(angle) * 8);
    const y = Math.round(groveY + Math.sin(angle) * 5);
    if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT) {
      map[y][x] = '♠'; // Enchanted tree
      if (y > 0) map[y-1][x] = '✦'; // Magical canopy
    }
  }
  
  // Central altar
  map[groveY][groveX] = '◊';
  map[groveY][groveX-1] = '▬';
  map[groveY][groveX+1] = '▬';
  
  // Glowing mushroom patches
  const mushroomClusters = [
    [8, 5], [10, 6], [9, 7],
    [35, 15], [37, 16], [36, 17],
    [15, 18], [16, 19], [17, 18]
  ];
  
  for (const [x, y] of mushroomClusters) {
    if (x < CHUNK_WIDTH && y < CHUNK_HEIGHT) {
      map[y][x] = '°'; // Glowing mushroom
    }
  }
  
  // Mysterious ruins
  map[3][40] = '█';
  map[3][41] = '█';
  map[3][42] = '█';
  map[4][40] = '█';
  map[4][42] = '█';
  map[5][41] = '◊'; // Rune stone
  
  // Will-o'-wisps locations (marked with special character)
  map[8][12] = '✧';
  map[14][30] = '✧';
  map[18][8] = '✧';
  
  const chunk = {
    map: baseMap,
    tileIds,
    monsters: [],
    items: [
      { x: 24, y: 11, type: 'artifact', item: { 
        name: 'Forest Heart Crystal', 
        description: 'The beating heart of the enchanted grove',
        value: 200
      }},
      { x: 41, y: 5, type: 'special', item: { 
        name: 'Ancient Rune', 
        description: 'Covered in mysterious symbols'
      }},
      { x: 10, y: 6, type: 'potion', item: { 
        name: 'Mushroom Elixir', 
        heal: 25,
        description: 'Glows with inner light'
      }},
      { x: 12, y: 8, type: 'special', item: {
        name: 'Wisp Essence',
        description: 'Captured light of a will-o\'-wisp'
      }}
    ],
    npcs: [],
    biome: 'candy_forest',
    description: 'Mystical grove deep in the cotton candy forest',
    isForest: true,
    isEnchanted: true
  };

  assertNoLegacyTileIds(tileIds, 'generateCandyForestSE');

  return chunk;
}

/**
 * Spawn NPCs for Northwest forest
 */
export function spawnForestNWNPCs(state) {
  const npcs = [];
  
  // Forest ranger
  npcs.push(spawnSocialNPC(state, {
    id: 'forest_ranger',
    name: 'Ranger Maple',
    x: 10,
    y: 11,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['nature-loving', 'protective', 'wise'],
    hp: 25,
    hpMax: 25,
    role: 'ranger'
  }));
  
  // Lost traveler
  npcs.push(spawnSocialNPC(state, {
    id: 'lost_traveler',
    name: 'Confused Carl',
    x: 25,
    y: 8,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['lost', 'frightened', 'grateful'],
    hp: 12,
    hpMax: 12
  }));
  
  // Fairy creatures
  npcs.push(spawnSocialNPC(state, {
    id: 'forest_fairy_1',
    name: 'Sparkle Sprite',
    x: 15,
    y: 15,
    faction: 'peasants',
    dialogueType: 'gnome_fairy',
    traits: ['playful', 'magical', 'tiny'],
    hp: 10,
    hpMax: 10,
    role: 'fairy'
  }));
  
  // Candy bear (friendly)
  npcs.push(spawnSocialNPC(state, {
    id: 'candy_bear',
    name: 'Honeycomb',
    x: 35,
    y: 10,
    faction: 'wildlings',
    dialogueType: 'peasants',
    traits: ['gentle', 'hungry', 'sleepy'],
    hp: 40,
    hpMax: 40,
    role: 'creature'
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn NPCs for Northeast forest
 */
export function spawnForestNENPCs(state) {
  const npcs = [];
  
  // Hermit wizard
  npcs.push(spawnSocialNPC(state, {
    id: 'hermit_wizard',
    name: 'Sage Sucrose',
    x: 8,
    y: 3,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['wise', 'eccentric', 'magical'],
    hp: 20,
    hpMax: 20,
    role: 'wizard'
  }));
  
  // Candy collector
  npcs.push(spawnSocialNPC(state, {
    id: 'candy_collector',
    name: 'Collector Colin',
    x: 24,
    y: 11,
    faction: 'merchants',
    dialogueType: 'merchants',
    traits: ['obsessive', 'knowledgeable', 'trader'],
    hp: 18,
    hpMax: 18
  }));
  
  // Forest spirit
  npcs.push(spawnSocialNPC(state, {
    id: 'forest_spirit',
    name: 'Whisperwind',
    x: 39,
    y: 6,
    faction: 'peasants',
    dialogueType: 'gnome_fairy',
    traits: ['ethereal', 'ancient', 'mysterious'],
    hp: 30,
    hpMax: 30,
    role: 'spirit'
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn NPCs for Southwest forest
 */
export function spawnForestSWNPCs(state) {
  const npcs = [];
  
  // Woodcutter
  npcs.push(spawnSocialNPC(state, {
    id: 'woodcutter',
    name: 'Timber Tom',
    x: 22,
    y: 12,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['hardworking', 'strong', 'simple'],
    hp: 28,
    hpMax: 28,
    role: 'woodcutter'
  }));
  
  // Woodcutter's wife
  npcs.push(spawnSocialNPC(state, {
    id: 'woodcutter_wife',
    name: 'Garden Grace',
    x: 23,
    y: 16,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['kind', 'nurturing', 'wise'],
    hp: 15,
    hpMax: 15
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn NPCs for Southeast forest
 */
export function spawnForestSENPCs(state) {
  const npcs = [];
  
  // Grove guardian
  npcs.push(spawnSocialNPC(state, {
    id: 'grove_guardian',
    name: 'Ancient Willow',
    x: 24,
    y: 11,
    faction: 'peasants',
    dialogueType: 'peasants',
    traits: ['ancient', 'powerful', 'protective'],
    hp: 50,
    hpMax: 50,
    role: 'guardian'
  }));
  
  // Mushroom merchant
  npcs.push(spawnSocialNPC(state, {
    id: 'mushroom_merchant',
    name: 'Fungi Fred',
    x: 9,
    y: 6,
    faction: 'merchants',
    dialogueType: 'merchants',
    goods: 'mushrooms',
    traits: ['strange', 'knowledgeable', 'secretive'],
    hp: 16,
    hpMax: 16,
    shopkeeper: true
  }));
  
  // Will-o'-wisp (special NPC)
  npcs.push(spawnSocialNPC(state, {
    id: 'wisp_1',
    name: 'Dancing Light',
    x: 8,
    y: 12,
    faction: 'peasants',
    dialogueType: 'gnome_fairy',
    traits: ['ethereal', 'mischievous', 'elusive'],
    hp: 5,
    hpMax: 5,
    role: 'wisp',
    sprite: 'wisp',
    char: '✧',
    color: '#88FFFF'
  }));
  
  return npcs.filter(npc => npc !== null);
}

/**
 * Spawn forest monsters for any forest chunk
 */
export function spawnForestMonsters(state, cx, cy) {
  const monsters = [];
  
  // Cotton candy wolves
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(Math.random() * 40) + 4;
    const y = Math.floor(Math.random() * 18) + 2;
    
    monsters.push(makeMonster('wolf', x, y, {
      name: 'Cotton Candy Wolf',
      hp: 15,
      hpMax: 15,
      dmg: 3,
      def: 1,
      description: 'A wolf made of fluffy cotton candy'
    }));
  }
  
  // Sugar sprites (hostile fairies)
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(Math.random() * 40) + 4;
    const y = Math.floor(Math.random() * 18) + 2;
    
    monsters.push(makeMonster('sprite', x, y, {
      name: 'Sugar Sprite',
      hp: 8,
      hpMax: 8,
      dmg: 2,
      def: 0,
      spd: 2,
      description: 'A mischievous candy fairy'
    }));
  }
  
  // Occasionally spawn a candy bear (tougher enemy)
  if (Math.random() < 0.3) {
    const x = Math.floor(Math.random() * 30) + 9;
    const y = Math.floor(Math.random() * 14) + 4;
    
    monsters.push(makeMonster('bear', x, y, {
      name: 'Gummy Bear',
      hp: 30,
      hpMax: 30,
      dmg: 5,
      def: 2,
      description: 'A massive gummy bear, sticky and dangerous'
    }));
  }
  
  return monsters;
}
