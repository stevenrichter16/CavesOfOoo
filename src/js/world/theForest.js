// The Forest - Main forest location from Adventure Time
// Home to talking animals and the Forest Wizard
// Location for Sweet Tooth Fox quest
// Migrated from OLD social system

import { spawnSocialNPC } from '../../social/migrationAdapter.js';
import { makeMonster } from '../entities/entities.js';
import { createTileGrid, createGlyphAwareMap, assertNoLegacyTileIds } from './tileUtils.js';

// Forest chunk configuration
export const FOREST_CONFIG = {
  biome: 'forest',
  chunkX: 0,
  chunkY: -2,
  name: 'The Forest',
  description: 'A lush forest filled with talking animals and ancient trees',
  mapSymbol: 'F',
  colors: {
    primary: '#228B22',
    secondary: '#32CD32',
    accent: '#8B4513'
  }
};

// Generate forest terrain
export function generateForestTerrain(width = 48, height = 22) {
  const { map: baseMap, tileIds } = createTileGrid(width, height, 'floor.default');
  const map = createGlyphAwareMap(baseMap, tileIds);

  // Add trees (# symbols)
  // Dense tree clusters
  const treeCluster1 = { x: 5, y: 3, w: 8, h: 6 };
  const treeCluster2 = { x: 35, y: 2, w: 10, h: 7 };
  const treeCluster3 = { x: 20, y: 15, w: 12, h: 5 };
  const treeCluster4 = { x: 2, y: 14, w: 7, h: 6 };
  
  [treeCluster1, treeCluster2, treeCluster3, treeCluster4].forEach(cluster => {
    for (let y = cluster.y; y < cluster.y + cluster.h && y < height; y++) {
      for (let x = cluster.x; x < cluster.x + cluster.w && x < width; x++) {
        if (Math.random() < 0.7) { // 70% chance of tree in cluster
          map[y][x] = '#';
        }
      }
    }
  });
  
  // Add scattered individual trees
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    if (map[y][x] === '.') {
      map[y][x] = '#';
    }
  }
  
  // Add a small clearing in the center (for gatherings)
  const clearingX = 22;
  const clearingY = 10;
  const clearingRadius = 4;
  for (let y = clearingY - clearingRadius; y <= clearingY + clearingRadius; y++) {
    for (let x = clearingX - clearingRadius; x <= clearingX + clearingRadius; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const dist = Math.sqrt((x - clearingX) ** 2 + (y - clearingY) ** 2);
        if (dist <= clearingRadius) {
          map[y][x] = '.';
        }
      }
    }
  }
  
  // Add a small pond
  const pondX = 10;
  const pondY = 10;
  for (let y = pondY; y < pondY + 3 && y < height; y++) {
    for (let x = pondX; x < pondX + 4 && x < width; x++) {
      map[y][x] = '~';
    }
  }
  
  // Add some bushes (represented as %)
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    if (map[y][x] === '.') {
      map[y][x] = '%';
    }
  }
  
  // Add paths (represented as ,)
  // Main path from south to north
  for (let y = 0; y < height; y++) {
    const x = 24 + Math.floor(Math.sin(y * 0.3) * 2);
    if (x >= 0 && x < width && map[y][x] !== '~') {
      map[y][x] = ',';
      // Widen path slightly
      if (x > 0 && map[y][x-1] !== '~') map[y][x-1] = ',';
      if (x < width-1 && map[y][x+1] !== '~') map[y][x+1] = ',';
    }
  }
  
  // Cross path from east to west
  for (let x = 0; x < width; x++) {
    const y = 11 + Math.floor(Math.sin(x * 0.2) * 1);
    if (y >= 0 && y < height && map[y][x] !== '~') {
      map[y][x] = ',';
    }
  }
  
  return { map: baseMap, tileIds };
}

// Forest NPCs based on Adventure Time inhabitants
export function spawnForestNPCs(state) {
  if (!state.chunk?.isForest) {
    console.log('⚠️ Not in forest chunk, skipping NPC spawn');
    return;
  }
  
  console.log('🌲 Spawning Forest NPCs...');
  if (!state.npcs) state.npcs = [];
  const npcs = [];
  
  // Momma Bear and Teenage Bear
  npcs.push(spawnSocialNPC(state, {
    id: 'momma_bear',
    name: 'Momma Bear',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'momma_bear',
    x: 8,
    y: 5,
    hp: 40,
    hpMax: 40,
    traits: ['protective', 'nurturing', 'stern'],
    description: 'A large brown bear wearing an apron',
    sprite: 'B',
    color: 'brown'
  }));
  
  npcs.push(spawnSocialNPC(state, {
    id: 'teenage_bear',
    name: 'Teenage Bear',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'teenage_bear',
    x: 9,
    y: 6,
    hp: 25,
    hpMax: 25,
    traits: ['rebellious', 'moody', 'curious'],
    description: 'A smaller bear with a backwards cap',
    sprite: 'b',
    color: 'brown'
  }));
  
  // Mr. Fox (not a Sweet Tooth Fox, just regular Mr. Fox)
  npcs.push(spawnSocialNPC(state, {
    id: 'mr_fox',
    name: 'Mr. Fox',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'mr_fox',
    x: 30,
    y: 8,
    hp: 20,
    hpMax: 20,
    traits: ['clever', 'mischievous', 'talkative'],
    description: 'A well-dressed fox with a monocle',
    sprite: 'f',
    color: 'orange'
  }));
  
  // Boobafina (the goose)
  npcs.push(spawnSocialNPC(state, {
    id: 'boobafina',
    name: 'Boobafina',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'boobafina',
    x: 12,
    y: 10,
    hp: 15,
    hpMax: 15,
    traits: ['gossipy', 'dramatic', 'friendly'],
    description: 'A white goose with a pink bow',
    sprite: 'G',
    color: 'white'
  }));
  
  // Mr. Goose
  npcs.push(spawnSocialNPC(state, {
    id: 'mr_goose',
    name: 'Mr. Goose',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'mr_goose',
    x: 11,
    y: 11,
    hp: 15,
    hpMax: 15,
    traits: ['proper', 'British', 'polite'],
    description: 'A distinguished goose with a top hat',
    sprite: 'g',
    color: 'white'
  }));
  
  // Mrs. Cow
  npcs.push(spawnSocialNPC(state, {
    id: 'mrs_cow',
    name: 'Mrs. Cow',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'mrs_cow',
    x: 35,
    y: 12,
    hp: 30,
    hpMax: 30,
    traits: ['motherly', 'gentle', 'wise'],
    description: 'A spotted cow with kind eyes',
    sprite: 'C',
    color: 'white'
  }));
  
  // Forest Wizard
  npcs.push(spawnSocialNPC(state, {
    id: 'forest_wizard',
    name: 'Forest Wizard',
    type: 'npc',
    faction: 'wizards',
    dialogueType: 'forest_wizard',
    x: 22,
    y: 10,
    hp: 50,
    hpMax: 50,
    traits: ['mysterious', 'ancient', 'helpful'],
    description: 'A wizard made of wood and leaves',
    sprite: 'W',
    color: 'green',
    shopkeeper: true,
    goods: [
      { item: 'forest_charm', price: 50 },
      { item: 'healing_berries', price: 20 },
      { item: 'bark_armor', price: 100 }
    ]
  }));
  
  // Mrs. Yoder (elderly lady)
  npcs.push(spawnSocialNPC(state, {
    id: 'mrs_yoder',
    name: 'Mrs. Yoder',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'mrs_yoder',
    x: 18,
    y: 15,
    hp: 10,
    hpMax: 10,
    traits: ['elderly', 'kind', 'forgetful'],
    description: 'An elderly woman feeding birds',
    sprite: 'Y',
    color: 'gray'
  }));
  
  // Squirrels (multiple)
  for (let i = 0; i < 3; i++) {
    npcs.push(spawnSocialNPC(state, {
      id: `squirrel_${i}`,
      name: 'Squirrel',
      type: 'npc',
      faction: 'forest_animals',
      dialogueType: 'squirrel',
      x: 25 + i * 3,
      y: 4 + i,
      hp: 8,
      hpMax: 8,
      traits: ['hyperactive', 'nutty', 'chatty'],
      description: 'A bushy-tailed squirrel',
      sprite: 's',
      color: 'brown'
    }));
  }
  
  // Birds (multiple)
  for (let i = 0; i < 4; i++) {
    npcs.push(spawnSocialNPC(state, {
      id: `bird_${i}`,
      name: 'Forest Bird',
      type: 'npc',
      faction: 'forest_animals',
      dialogueType: 'bird',
      x: 15 + Math.floor(Math.random() * 20),
      y: 2 + Math.floor(Math.random() * 8),
      hp: 5,
      hpMax: 5,
      traits: ['singing', 'flighty', 'observant'],
      description: 'A colorful songbird',
      sprite: 'v',
      color: 'blue'
    }));
  }
  
  // Ants (group)
  npcs.push(spawnSocialNPC(state, {
    id: 'ant_colony',
    name: 'Ant Colony',
    type: 'npc',
    faction: 'forest_animals',
    dialogueType: 'ants',
    x: 5,
    y: 18,
    hp: 100,
    hpMax: 100,
    traits: ['industrious', 'collective', 'organized'],
    description: 'A bustling ant colony',
    sprite: 'a',
    color: 'black'
  }));
  
  return npcs;
}

// Generate the complete forest chunk  
export function generateForestChunk(worldSeed, cx, cy) {
  // Return the chunk structure that matches the chunk system
  const { map, tileIds } = generateForestTerrain();
  const chunk = {
    x: cx,
    y: cy,
    biome: FOREST_CONFIG.biome,
    map,
    tileIds,
    npcs: [], // NPCs will be spawned separately
    monsters: [],
    items: [],
    description: 'A lush forest filled with talking animals',
    isForest: true, // Flag to identify this chunk for NPC spawning
    discovered: false
  };
  
  // Add some regular forest monsters
  chunk.monsters.push(
    makeMonster('goober', 8, 14),
    makeMonster('goober', 25, 18),
    makeMonster('firefly', 30, 3),
    makeMonster('firefly', 35, 15),
    makeMonster('sootling', 40, 8)
  );
  
  // Add Sweet Tooth Foxes for the quest
  const foxLocations = [
    { x: 6, y: 8 },
    { x: 15, y: 6 },
    { x: 28, y: 14 },
    { x: 38, y: 10 },
    { x: 12, y: 17 },
    { x: 32, y: 5 }
  ];
  
  foxLocations.forEach((loc, i) => {
    const fox = makeMonster('sweet_tooth_fox', loc.x, loc.y);
    fox.id = `sweet_tooth_fox_${i}`;
    fox.questTarget = 'sweet_tooth_foxes';
    chunk.monsters.push(fox);
  });
  
  // Add forest items (berries, mushrooms, etc.)
  chunk.items = [
    {
      type: 'consumable',
      item: { 
        id: 'forest_berries',
        name: 'Forest Berries',
        effect: 'heal',
        value: 5,
        desc: 'Sweet berries that restore 5 HP'
      },
      x: 14,
      y: 7
    },
    {
      type: 'consumable',
      item: {
        id: 'magic_mushroom',
        name: 'Magic Mushroom',
        effect: 'buff_random',
        value: 10,
        desc: 'A glowing mushroom with mysterious effects'
      },
      x: 28,
      y: 16
    },
    {
      type: 'consumable',
      item: {
        id: 'tree_sap',
        name: 'Tree Sap',
        effect: 'heal',
        value: 8,
        desc: 'Sticky sap that heals wounds'
      },
      x: 36,
      y: 4
    }
  ];

  assertNoLegacyTileIds(tileIds, 'generateForestChunk');

  return chunk;
}

// Check if player is in forest chunk
export function isInForest(state) {
  return state.cx === FOREST_CONFIG.chunkX && state.cy === FOREST_CONFIG.chunkY;
}

// Forest events and interactions
export function handleForestEvents(state) {
  if (!isInForest(state)) return;
  
  // Random bird songs
  if (Math.random() < 0.02) { // 2% chance per turn
    const birdSounds = [
      'You hear birds singing in the trees.',
      'A woodpecker taps rhythmically nearby.',
      'Leaves rustle as creatures move through the underbrush.',
      'The forest is alive with natural sounds.'
    ];
    const sound = birdSounds[Math.floor(Math.random() * birdSounds.length)];
    if (state.log) {
      state.log(sound, 'note');
    }
  }
  
  // Check for Sweet Tooth Fox quest
  if (state.player?.quests?.active?.includes('sweet_tooth_foxes')) {
    // Spawn more foxes if needed
    const currentFoxes = state.chunk?.monsters?.filter(m => m.kind === 'sweet_tooth_fox') || [];
    if (currentFoxes.length < 3 && Math.random() < 0.1) {
      const newFox = makeMonster('sweet_tooth_fox', 
        5 + Math.floor(Math.random() * 38),
        2 + Math.floor(Math.random() * 18)
      );
      newFox.questTarget = 'sweet_tooth_foxes';
      state.chunk.monsters.push(newFox);
      if (state.log) {
        state.log('You spot another Sweet Tooth Fox!', 'note');
      }
    }
  }
}

// Export for chunk system integration
export const ForestChunk = {
  config: FOREST_CONFIG,
  generate: generateForestChunk,
  isInChunk: isInForest,
  handleEvents: handleForestEvents,
  spawnNPCs: spawnForestNPCs
};
