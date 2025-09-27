// src/js/world/candyKingdomTown.js
// Candy Kingdom Town - Main starting area within the kingdom walls
// Migrated from OLD social system

import { spawnSocialNPC } from '../../social/migrationAdapter.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { createTileGrid, setTile } from './tileUtils.js';

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
  const { map, tileIds } = createTileGrid(CHUNK_WIDTH, CHUNK_HEIGHT, 'floor.default');
  const write = (x, y, tileId) => setTile(map, tileIds, x, y, tileId);

  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, 0, 'wall.stone.solid');
    write(x, 1, 'wall.stone.solid');
    if (x >= 22 && x <= 25) {
      write(x, 0, 'floor.default');
      write(x, 1, 'floor.default');
    }
  }

  for (let x = 0; x < CHUNK_WIDTH; x++) {
    write(x, CHUNK_HEIGHT - 1, 'wall.stone.solid');
    write(x, CHUNK_HEIGHT - 2, 'wall.stone.solid');
    if (x >= 22 && x <= 25) {
      write(x, CHUNK_HEIGHT - 1, 'floor.default');
      write(x, CHUNK_HEIGHT - 2, 'floor.default');
    }
  }

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    write(0, y, 'wall.stone.solid');
    write(1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 1, y, 'wall.stone.solid');
    write(CHUNK_WIDTH - 2, y, 'wall.stone.solid');
    if (y >= 9 && y <= 12) {
      write(0, y, 'floor.default');
      write(1, y, 'floor.default');
      write(CHUNK_WIDTH - 1, y, 'floor.default');
      write(CHUNK_WIDTH - 2, y, 'floor.default');
    }
  }

  // Central fountain (water tiles only; center remains floor)
  write(23, 10, 'decoration.fountain.center');
  write(23, 9, 'terrain.water.shallow');
  write(23, 11, 'terrain.water.shallow');
  write(22, 10, 'terrain.water.shallow');
  write(24, 10, 'terrain.water.shallow');
  write(22, 9, 'terrain.water.shallow');
  write(24, 9, 'terrain.water.shallow');
  write(22, 11, 'terrain.water.shallow');
  write(24, 11, 'terrain.water.shallow');

  // Additional buildings (perimeter walls only)
  const fillRectPerimeter = (x1, y1, x2, y2) => {
    for (let x = x1; x <= x2; x++) {
      write(x, y1, 'wall.brick.fill');
      write(x, y2, 'wall.brick.fill');
    }
    for (let y = y1; y <= y2; y++) {
      write(x1, y, 'wall.brick.fill');
      write(x2, y, 'wall.brick.fill');
    }
  };

  fillRectPerimeter(6, 15, 11, 18);  // Library
  fillRectPerimeter(16, 6, 20, 9);   // Inn
  fillRectPerimeter(36, 15, 41, 18); // Bank
  fillRectPerimeter(27, 6, 31, 9);   // Temple

  write(6, 16, 'door.closed');
  write(16, 7, 'door.closed');
  write(41, 16, 'door.closed');
  write(31, 7, 'door.closed');

  // Market stalls - West side row
  [
    [5,4,'structure.market.stall.canopy'], [5,5,'furniture.bench.horizontal'],
    [5,8,'structure.market.stall.canopy'], [5,9,'furniture.bench.horizontal'],
    [5,12,'structure.market.stall.canopy'], [5,13,'furniture.bench.horizontal'],
    [8,4,'structure.market.stall.canopy'], [8,5,'furniture.bench.horizontal'],
    [8,8,'structure.market.stall.canopy'], [8,9,'furniture.bench.horizontal'],
    [8,12,'structure.market.stall.canopy'], [8,13,'furniture.bench.horizontal'],
    [11,4,'structure.market.stall.canopy'], [11,5,'furniture.bench.horizontal'],
    [11,8,'structure.market.stall.canopy'], [11,9,'furniture.bench.horizontal'],
    [11,12,'structure.market.stall.canopy'], [11,13,'furniture.bench.horizontal'],
    [14,4,'structure.market.stall.canopy'], [14,5,'furniture.bench.horizontal'],
    [14,8,'structure.market.stall.canopy'], [14,9,'furniture.bench.horizontal'],
    [14,12,'structure.market.stall.canopy'], [14,13,'furniture.bench.horizontal']
  ].forEach(([x,y,tileId]) => write(x,y,tileId));

  // Market stalls - East side row (mirrored horizontally)
  [
    [35,4,'structure.market.stall.canopy'], [35,5,'furniture.bench.horizontal'],
    [35,8,'structure.market.stall.canopy'], [35,9,'furniture.bench.horizontal'],
    [35,12,'structure.market.stall.canopy'], [35,13,'furniture.bench.horizontal'],
    [38,4,'structure.market.stall.canopy'], [38,5,'furniture.bench.horizontal'],
    [38,8,'structure.market.stall.canopy'], [38,9,'furniture.bench.horizontal'],
    [38,12,'structure.market.stall.canopy'], [38,13,'furniture.bench.horizontal'],
    [41,4,'structure.market.stall.canopy'], [41,5,'furniture.bench.horizontal'],
    [41,8,'structure.market.stall.canopy'], [41,9,'furniture.bench.horizontal'],
    [41,12,'structure.market.stall.canopy'], [41,13,'furniture.bench.horizontal'],
    [44,4,'structure.market.stall.canopy'], [44,5,'furniture.bench.horizontal'],
    [44,8,'structure.market.stall.canopy'], [44,9,'furniture.bench.horizontal'],
    [44,12,'structure.market.stall.canopy'], [44,13,'furniture.bench.horizontal']
  ].forEach(([x,y,tileId]) => write(x,y,tileId));

  // Guard posts
  [
    [21,2], [26,2], [21,19], [26,19], [2,9], [2,12], [45,9], [45,12]
  ].forEach(([x,y]) => write(x,y,'decoration.shrine.marker'));

  // Benches around fountain
  [
    [20,8], [26,8], [20,12], [26,12], [19,10], [27,10]
  ].forEach(([x,y]) => write(x,y,'furniture.bench.horizontal'));

  // Decorative candy trees
  [
    [16,4], [31,4], [16,16], [31,16], [7,7], [40,7], [7,13], [40,13]
  ].forEach(([x,y]) => write(x,y,'decoration.candy.tree'));

  applyBuildingWallAutotiles(map, tileIds);

  return { map, tileIds };
}

function applyBuildingWallAutotiles(map, tileIds) {
  const height = map.length;
  const width = map[0] ? map[0].length : 0;
  const buildingMask = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const tileId = tileIds?.[y]?.[x];
      return Boolean(tileId && tileId.startsWith('wall.brick'));
    })
  );

  const brickTilesByGlyph = {
    '┌': 'wall.brick.corner.top_left',
    '┐': 'wall.brick.corner.top_right',
    '└': 'wall.brick.corner.bottom_left',
    '┘': 'wall.brick.corner.bottom_right',
    '─': 'wall.brick.edge.horizontal',
    '│': 'wall.brick.edge.vertical',
    '█': 'wall.brick.fill'
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!buildingMask[y][x]) continue;

      const up = y > 0 && buildingMask[y - 1][x];
      const down = y < height - 1 && buildingMask[y + 1][x];
      const left = x > 0 && buildingMask[y][x - 1];
      const right = x < width - 1 && buildingMask[y][x + 1];

      const connectedUp = up || (y > 0 && tileIds?.[y - 1]?.[x] === 'door.closed');
      const connectedDown = down || (y < height - 1 && tileIds?.[y + 1]?.[x] === 'door.closed');
      const connectedLeft = left || (x > 0 && tileIds?.[y]?.[x - 1] === 'door.closed');
      const connectedRight = right || (x < width - 1 && tileIds?.[y]?.[x + 1] === 'door.closed');

      let glyph;
      if (!connectedUp && !connectedLeft && connectedRight && connectedDown) glyph = '┌';
      else if (!connectedUp && !connectedRight && connectedLeft && connectedDown) glyph = '┐';
      else if (!connectedDown && !connectedLeft && connectedRight && connectedUp) glyph = '└';
      else if (!connectedDown && !connectedRight && connectedLeft && connectedUp) glyph = '┘';
      else if ((!connectedUp && connectedDown && (connectedLeft || connectedRight)) || (connectedUp && !connectedDown && (connectedLeft || connectedRight)) || (connectedLeft && connectedRight && !connectedUp && !connectedDown)) glyph = '─';
      else if ((!connectedLeft && connectedRight && (connectedUp || connectedDown)) || (connectedLeft && !connectedRight && (connectedUp || connectedDown)) || ((connectedUp && connectedDown) && !connectedLeft && !connectedRight)) glyph = '│';
      else if ((connectedUp || connectedDown) && !connectedLeft && !connectedRight) glyph = '│';
      else if ((connectedLeft || connectedRight) && !connectedUp && !connectedDown) glyph = '─';
      else glyph = '█';

      const tileId = brickTilesByGlyph[glyph] || 'wall.brick.fill';
      setTile(map, tileIds, x, y, tileId);
    }
  }
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
    hpMax: 35,
    questGiver: true,
    quests: ['open_inventory_quest']
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
  
  const { map, tileIds } = generateCandyKingdomMap();

  const chunk = {
    map,
    tileIds,
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
