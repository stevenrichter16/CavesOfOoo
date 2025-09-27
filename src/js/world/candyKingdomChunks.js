// Migrated from OLD social system
// src/js/world/candyKingdomChunks.js
// Adjacent chunks for the Candy Kingdom that connect to the main town

import { spawnSocialNPC } from '../../social/migrationAdapter.js';
import { createTileGrid, setTile } from './tileUtils.js';

// Full viewport dimensions
const CHUNK_WIDTH = 48;
const CHUNK_HEIGHT = 22;

/**
 * Generate the North Gate chunk - Castle approach
 * Coordinates: (0, -1)
 */
export function generateNorthGateChunk(worldSeed, cx, cy) {
  if (cx !== 0 || cy !== -1) return null;
  
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);

  // Side walls continuing from main town
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    write(0, y, 'wall.stone.solid');
    write(1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 2, y, 'wall.stone.solid');
  }

  // Castle approach road
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let x = 10; x <= 13; x++) {
      write(x, y, 'floor.default');
    }
  }

  // Castle walls at the north end
  for (let x = 4; x < 20; x++) {
    write(x, 2, 'wall.stone.solid');
    write(x, 3, 'wall.stone.solid');
  }

  // Castle gate opening
  for (let x = 10; x <= 13; x++) {
    write(x, 2, 'floor.default');
    write(x, 3, 'floor.default');
  }

  // Guard towers
  write(8, 2, 'decoration.shrine.marker');
  write(15, 2, 'decoration.shrine.marker');

  // Royal gardens on sides
  for (let y = 5; y < 15; y++) {
    for (let x = 3; x < 8; x++) {
      if ((x + y) % 3 === 0) {
        write(x, y, 'decoration.candy.tree');
      }
    }
    for (let x = 16; x < 21; x++) {
      if ((x + y) % 3 === 0) {
        write(x, y, 'decoration.candy.tree');
      }
    }
  }

  // Decorative statues
  write(6, 8, 'structure.training.statue');
  write(17, 8, 'structure.training.statue');
  write(6, 14, 'structure.training.statue');
  write(17, 14, 'structure.training.statue');

  // South connection (open to main town)
  for (let x = 10; x <= 13; x++) {
    write(x, CHUNK_HEIGHT - 1, 'floor.default');
    write(x, CHUNK_HEIGHT - 2, 'floor.default');
  }

  const chunk = {
    map,
    tileIds,
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
  
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);

  // Continue walls from main town
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, 0, 'wall.stone.solid');
    write(x, 1, 'wall.stone.solid');
    write(x, CHUNK_HEIGHT - 1, 'wall.stone.solid');
    write(x, CHUNK_HEIGHT - 2, 'wall.stone.solid');
  }

  // East wall with outer gate
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    write(CHUNK_WIDTH - 1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 2, y, 'wall.stone.solid');
    if (y >= 9 && y <= 12) {
      write(CHUNK_WIDTH - 1, y, 'floor.default');
      write(CHUNK_WIDTH - 2, y, 'floor.default');
    }
  }

  // West connection (open to main town)
  for (let y = 9; y <= 12; y++) {
    write(0, y, 'floor.default');
    write(1, y, 'floor.default');
  }

  const stallRows = [4, 8, 12, 16];
  const stallColumns = [3, 8, 13, 18];
  for (const row of stallRows) {
    stallColumns.forEach(col => {
      write(col, row, 'structure.market.stall.canopy');
      write(col + 1, row, 'furniture.bench.horizontal');
    });
  }

  const cratePositions = [
    [6, 5], [11, 5], [16, 5],
    [6, 9], [11, 9], [16, 9]
  ];
  cratePositions.forEach(([x, y]) => write(x, y, 'container.storage.crate'));

  const chunk = {
    map,
    tileIds,
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
  
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);

  // Continue walls
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    write(0, y, 'wall.stone.solid');
    write(1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 2, y, 'wall.stone.solid');
  }

  // South wall with outer gate
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, CHUNK_HEIGHT - 1, 'wall.stone.solid');
    write(x, CHUNK_HEIGHT - 2, 'wall.stone.solid');
    if (x >= 10 && x <= 13) {
      write(x, CHUNK_HEIGHT - 1, 'floor.default');
      write(x, CHUNK_HEIGHT - 2, 'floor.default');
    }
  }

  // North connection (open to main town)
  for (let x = 10; x <= 13; x++) {
    write(x, 0, 'floor.default');
    write(x, 1, 'floor.default');
  }

  const houseBounds = [
    { x1: 3, y1: 3, x2: 7, y2: 7, doorX: 3, doorY: 5 },
    { x1: 10, y1: 3, x2: 14, y2: 7, doorX: 10, doorY: 5 },
    { x1: 17, y1: 3, x2: 21, y2: 7, doorX: 17, doorY: 5 },
    { x1: 3, y1: 10, x2: 7, y2: 14, doorX: 3, doorY: 12 },
    { x1: 17, y1: 10, x2: 21, y2: 14, doorX: 17, doorY: 12 }
  ];

  houseBounds.forEach(({ x1, y1, x2, y2, doorX, doorY }) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const isBorder = y === y1 || y === y2 || x === x1 || x === x2;
        if (isBorder) {
          write(x, y, 'wall.brick.fill');
        }
      }
    }
    write(doorX, doorY, 'door.closed');
  });

  // Central park area
  write(11, 10, 'decoration.candy.tree');
  write(12, 10, 'decoration.candy.tree');
  write(11, 11, 'terrain.water.shallow');
  write(12, 11, 'terrain.water.shallow');
  write(11, 12, 'decoration.candy.tree');
  write(12, 12, 'decoration.candy.tree');

  // Benches
  write(10, 9, 'furniture.bench.horizontal');
  write(13, 9, 'furniture.bench.horizontal');
  write(10, 13, 'furniture.bench.horizontal');
  write(13, 13, 'furniture.bench.horizontal');

  const chunk = {
    map,
    tileIds,
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
  
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);

  // Continue walls
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, 0, 'wall.stone.solid');
    write(x, 1, 'wall.stone.solid');
    write(x, CHUNK_HEIGHT - 1, 'wall.stone.solid');
    write(x, CHUNK_HEIGHT - 2, 'wall.stone.solid');
  }

  // West wall with outer gate
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    write(0, y, 'wall.stone.solid');
    write(1, y, 'wall.stone.solid');
    if (y >= 9 && y <= 12) {
      write(0, y, 'floor.default');
      write(1, y, 'floor.default');
    }
  }

  // East connection (open to main town)
  for (let y = 9; y <= 12; y++) {
    write(CHUNK_WIDTH - 1, y, 'floor.default');
    write(CHUNK_WIDTH - 2, y, 'floor.default');
  }

  // Training dummies
  [
    [5, 5], [10, 5], [15, 5], [18, 5],
    [5, 16], [10, 16], [15, 16], [18, 16]
  ].forEach(([x, y]) => write(x, y, 'decoration.streetlamp'));

  // Sparring ring (center)
  for (let y = 8; y <= 13; y++) {
    for (let x = 8; x <= 15; x++) {
      if (y === 8 || y === 13 || x === 8 || x === 15) {
        write(x, y, 'floor.candy.walkway');
      }
    }
  }

  // Weapon racks
  const racks = [
    [3, 3], [4, 3], [5, 3],
    [18, 3], [19, 3], [20, 3],
    [3, 18], [4, 18], [5, 18],
    [18, 18], [19, 18], [20, 18]
  ];
  racks.forEach(([x, y]) => write(x, y, 'structure.training.rack'));

  // Barracks building
  for (let y = 6; y <= 8; y++) {
    for (let x = 3; x <= 6; x++) {
      const isBorder = y === 6 || y === 8 || x === 3 || x === 6;
      if (isBorder) {
        write(x, y, 'wall.brick.fill');
      }
    }
  }
  write(3, 7, 'door.closed');

  // Armory building
  for (let y = 13; y <= 15; y++) {
    for (let x = 17; x <= 20; x++) {
      const isBorder = y === 13 || y === 15 || x === 17 || x === 20;
      if (isBorder) {
        write(x, y, 'wall.brick.fill');
      }
    }
  }
  write(20, 14, 'door.closed');

  const chunk = {
    map,
    tileIds,
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
    dialogueType: 'banana_guard',
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
    dialogueType: 'banana_guard',
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
    name: 'Banana Guard',
    x: 20,
    y: 10,
    faction: 'guards',
    dialogueType: 'banana_guard',
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
    name: 'Banana Guard',
    x: 11,
    y: 19,
    faction: 'guards',
    dialogueType: 'banana_guard',
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
    dialogueType: 'banana_guard',
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
    dialogueType: 'banana_guard',
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
    dialogueType: 'banana_guard',
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
    dialogueType: 'banana_guard',
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
    dialogueType: 'banana_guard',
    traits: ['tough', 'intimidating'],
    hp: 30,
    hpMax: 30
  }));
  
  return npcs.filter(npc => npc !== null);
}
