/**
 * PopulationStep - Populates chunk with entities
 * Adds monsters, NPCs, and bosses based on biome and structure
 */

import { PipelineStep } from '../PipelineStep.js';
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  MAX_MONSTERS_PER_CHUNK,
  MAX_NPCS_PER_CHUNK,
  DEFAULT_BIOME
} from '../../constants.js';

// Population parameters by biome
const BIOME_POPULATION_PARAMS = {
  grassland: {
    monsterDensity: 0.02,
    npcDensity: 0.01,
    bossChance: 0.05,
    monsterTypes: ['slime', 'rat', 'goblin', 'wolf'],
    npcTypes: ['merchant', 'villager', 'guard', 'wanderer'],
    monsterLevelRange: [1, 3]
  },
  forest: {
    monsterDensity: 0.03,
    npcDensity: 0.005,
    bossChance: 0.08,
    monsterTypes: ['wolf', 'bear', 'spider', 'goblin', 'treant'],
    npcTypes: ['wanderer', 'hunter', 'druid'],
    monsterLevelRange: [2, 5]
  },
  desert: {
    monsterDensity: 0.025,
    npcDensity: 0.002,
    bossChance: 0.06,
    monsterTypes: ['scorpion', 'mummy', 'sandworm', 'bandit'],
    npcTypes: ['wanderer', 'nomad'],
    monsterLevelRange: [3, 6]
  },
  tundra: {
    monsterDensity: 0.02,
    npcDensity: 0.003,
    bossChance: 0.07,
    monsterTypes: ['yeti', 'ice_spider', 'frost_goblin', 'wolf'],
    npcTypes: ['hunter', 'hermit'],
    monsterLevelRange: [3, 5]
  },
  swamp: {
    monsterDensity: 0.04,
    npcDensity: 0.001,
    bossChance: 0.1,
    monsterTypes: ['slime', 'zombie', 'swamp_thing', 'mosquito', 'crocodile'],
    npcTypes: ['hermit', 'witch'],
    monsterLevelRange: [2, 6]
  },
  mountains: {
    monsterDensity: 0.035,
    npcDensity: 0.004,
    bossChance: 0.12,
    monsterTypes: ['dragon', 'giant', 'harpy', 'rock_golem', 'goblin'],
    npcTypes: ['hermit', 'scholar', 'guard'],
    monsterLevelRange: [4, 8]
  }
};

// Monster stats by type
const MONSTER_STATS = {
  slime: { hp: 10, damage: 2, speed: 1, xp: 5 },
  rat: { hp: 5, damage: 1, speed: 3, xp: 3 },
  goblin: { hp: 15, damage: 3, speed: 2, xp: 10 },
  wolf: { hp: 20, damage: 4, speed: 3, xp: 15 },
  bear: { hp: 30, damage: 6, speed: 2, xp: 25 },
  spider: { hp: 12, damage: 3, speed: 4, xp: 12 },
  treant: { hp: 40, damage: 5, speed: 1, xp: 30 },
  scorpion: { hp: 18, damage: 4, speed: 3, xp: 18 },
  mummy: { hp: 25, damage: 4, speed: 1, xp: 20 },
  sandworm: { hp: 35, damage: 7, speed: 2, xp: 35 },
  bandit: { hp: 20, damage: 5, speed: 2, xp: 20 },
  yeti: { hp: 35, damage: 6, speed: 2, xp: 30 },
  ice_spider: { hp: 15, damage: 4, speed: 3, xp: 18 },
  frost_goblin: { hp: 18, damage: 4, speed: 2, xp: 15 },
  zombie: { hp: 22, damage: 3, speed: 1, xp: 15 },
  swamp_thing: { hp: 28, damage: 5, speed: 1, xp: 25 },
  mosquito: { hp: 3, damage: 1, speed: 5, xp: 5 },
  crocodile: { hp: 30, damage: 6, speed: 2, xp: 28 },
  dragon: { hp: 100, damage: 10, speed: 3, xp: 100 },
  giant: { hp: 60, damage: 8, speed: 1, xp: 50 },
  harpy: { hp: 25, damage: 5, speed: 4, xp: 30 },
  rock_golem: { hp: 50, damage: 6, speed: 1, xp: 40 }
};

export class PopulationStep extends PipelineStep {
  constructor() {
    super('PopulationStep');
  }
  
  async process(context) {
    const { chunk, rng, params } = context;
    const biome = chunk.biome || DEFAULT_BIOME;
    const populationParams = BIOME_POPULATION_PARAMS[biome] || BIOME_POPULATION_PARAMS[DEFAULT_BIOME];
    
    // Initialize entity arrays if not present
    if (!chunk.monsters) chunk.monsters = [];
    if (!chunk.npcs) chunk.npcs = [];
    
    // Get available positions
    const availablePositions = this.getAvailablePositions(chunk, params);
    
    // Populate monsters
    this.populateMonsters(chunk, rng, params, populationParams, availablePositions);
    
    // Populate NPCs
    this.populateNPCs(chunk, rng, params, populationParams, availablePositions);
    
    // Maybe add a boss
    this.maybeAddBoss(chunk, rng, params, populationParams, availablePositions, context);
  }
  
  /**
   * Get available positions for entity placement
   */
  getAvailablePositions(chunk, params) {
    const positions = [];
    const occupied = new Set();
    
    // Mark feature positions as occupied
    const features = params.features || {};
    
    if (features.chests) {
      features.chests.forEach(c => occupied.add(`${c.x},${c.y}`));
    }
    if (features.traps) {
      features.traps.forEach(t => occupied.add(`${t.x},${t.y}`));
    }
    if (features.stairs) {
      features.stairs.forEach(s => occupied.add(`${s.x},${s.y}`));
    }
    
    // Find all walkable, unoccupied positions
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        const tile = chunk.getTile(x, y);
        const key = `${x},${y}`;
        
        if ((tile === '.' || tile === '·') && !occupied.has(key)) {
          positions.push({ x, y });
        }
      }
    }
    
    return positions;
  }
  
  /**
   * Populate monsters in the chunk
   */
  populateMonsters(chunk, rng, params, populationParams, availablePositions) {
    const rooms = params.rooms || [];
    const maxMonsters = Math.min(MAX_MONSTERS_PER_CHUNK, Math.floor(availablePositions.length * populationParams.monsterDensity));
    
    for (let i = 0; i < maxMonsters && availablePositions.length > 0; i++) {
      // Pick a random position (ensure valid positive index)
      const rngValue = Math.abs(rng.next());
      const posIndex = Math.floor((isNaN(rngValue) ? 0.5 : rngValue) * availablePositions.length);
      const pos = availablePositions.splice(Math.min(posIndex, availablePositions.length - 1), 1)[0];
      
      // Pick a monster type (ensure valid positive index)
      const typeRng = Math.abs(rng.next());
      const monsterType = populationParams.monsterTypes[
        Math.floor((isNaN(typeRng) ? 0.5 : typeRng) * populationParams.monsterTypes.length)
      ];
      
      // Determine level (ensure positive)
      const [minLevel, maxLevel] = populationParams.monsterLevelRange;
      const levelRng = Math.abs(rng.next());
      const level = minLevel + Math.floor((isNaN(levelRng) ? 0.5 : levelRng) * (maxLevel - minLevel + 1));
      
      // Get base stats
      const baseStats = MONSTER_STATS[monsterType] || MONSTER_STATS.goblin;
      
      // Create monster (ensure all stats are positive)
      const monster = {
        x: Math.max(0, Math.min(CHUNK_WIDTH - 1, pos.x)),
        y: Math.max(0, Math.min(CHUNK_HEIGHT - 1, pos.y)),
        type: monsterType,
        level: Math.max(1, level),
        hp: Math.max(1, Math.floor(baseStats.hp * (1 + level * 0.2))),
        maxHp: Math.max(1, Math.floor(baseStats.hp * (1 + level * 0.2))),
        damage: Math.max(1, Math.floor(baseStats.damage * (1 + level * 0.15))),
        speed: Math.max(1, baseStats.speed),
        xp: Math.max(1, Math.floor(baseStats.xp * (1 + level * 0.3))),
        isBoss: false
      };
      
      chunk.addMonster(monster);
    }
  }
  
  /**
   * Populate NPCs in the chunk
   */
  populateNPCs(chunk, rng, params, populationParams, availablePositions) {
    const rooms = params.rooms || [];
    const maxNPCs = Math.min(MAX_NPCS_PER_CHUNK, Math.floor(availablePositions.length * populationParams.npcDensity));
    
    for (let i = 0; i < maxNPCs && availablePositions.length > 0; i++) {
      // Pick a random position (ensure valid positive index)
      const rngValue = Math.abs(rng.next());
      const posIndex = Math.floor((isNaN(rngValue) ? 0.5 : rngValue) * availablePositions.length);
      const pos = availablePositions.splice(Math.min(posIndex, availablePositions.length - 1), 1)[0];
      
      // Pick an NPC type (ensure valid positive index)
      const typeRng = Math.abs(rng.next());
      const npcType = populationParams.npcTypes[
        Math.floor((isNaN(typeRng) ? 0.5 : typeRng) * populationParams.npcTypes.length)
      ];
      
      // Generate NPC name
      const name = this.generateNPCName(rng, npcType);
      
      // Create NPC
      const npc = {
        x: pos.x,
        y: pos.y,
        name: name,
        type: npcType,
        dialogue: this.generateDialogue(npcType, rng),
        faction: this.getNPCFaction(npcType),
        inventory: this.generateNPCInventory(npcType, rng)
      };
      
      chunk.addNPC(npc);
    }
  }
  
  /**
   * Maybe add a boss monster
   */
  maybeAddBoss(chunk, rng, params, populationParams, availablePositions, context) {
    // Boss chance increases far from origin and in certain biomes
    const distanceFromOrigin = Math.sqrt(context.cx * context.cx + context.cy * context.cy);
    const bossChance = populationParams.bossChance * (1 + distanceFromOrigin * 0.01);
    
    // Check for large rooms (good for boss fights)
    const rooms = params.rooms || [];
    const largeRooms = rooms.filter(r => r.width >= 8 && r.height >= 8);
    
    const bossRng = Math.abs(rng.next());
    if ((isNaN(bossRng) ? 0.5 : bossRng) < bossChance && largeRooms.length > 0 && availablePositions.length > 0) {
      // Place boss in center of largest room
      const largestRoom = largeRooms.reduce((a, b) => 
        (a.width * a.height > b.width * b.height) ? a : b
      );
      
      const bossX = largestRoom.x + Math.floor(largestRoom.width / 2);
      const bossY = largestRoom.y + Math.floor(largestRoom.height / 2);
      
      // Remove this position from available
      const posKey = `${bossX},${bossY}`;
      const posIndex = availablePositions.findIndex(p => `${p.x},${p.y}` === posKey);
      if (posIndex >= 0) {
        availablePositions.splice(posIndex, 1);
      }
      
      // Pick a boss type (strongest monster type for the biome)
      const bossType = populationParams.monsterTypes[populationParams.monsterTypes.length - 1];
      const baseStats = MONSTER_STATS[bossType] || MONSTER_STATS.goblin;
      
      // Create boss
      const bossLevel = populationParams.monsterLevelRange[1] + 3;
      const boss = {
        x: bossX,
        y: bossY,
        type: bossType,
        level: bossLevel,
        hp: Math.max(101, baseStats.hp * 5),
        maxHp: Math.max(101, baseStats.hp * 5),
        damage: baseStats.damage * 2,
        speed: Math.max(1, baseStats.speed - 1),
        xp: baseStats.xp * 10,
        isBoss: true,
        name: `${bossType.charAt(0).toUpperCase() + bossType.slice(1)} Lord`
      };
      
      chunk.addMonster(boss);
    }
  }
  
  /**
   * Generate an NPC name
   */
  generateNPCName(rng, type) {
    const firstNames = {
      merchant: ['Gareth', 'Marcus', 'Elena', 'Sophia', 'Thaddeus'],
      villager: ['Tom', 'Mary', 'John', 'Sarah', 'William'],
      guard: ['Aldric', 'Brom', 'Cedric', 'Duncan', 'Edmund'],
      wanderer: ['Ash', 'River', 'Sky', 'Storm', 'Vale'],
      scholar: ['Aurelius', 'Minerva', 'Pythagoras', 'Socrates', 'Hypatia'],
      hunter: ['Orion', 'Diana', 'Artemis', 'Tracker', 'Arrow'],
      druid: ['Oak', 'Willow', 'Sage', 'Moss', 'Fern'],
      nomad: ['Sahara', 'Dune', 'Mirage', 'Oasis', 'Caravan'],
      hermit: ['Silent', 'Lone', 'Echo', 'Whisper', 'Shadow'],
      witch: ['Morgana', 'Hecate', 'Circe', 'Medea', 'Agatha']
    };
    
    const names = firstNames[type] || firstNames.villager;
    const nameRng = Math.abs(rng.next());
    return names[Math.floor((isNaN(nameRng) ? 0.5 : nameRng) * names.length)];
  }
  
  /**
   * Generate dialogue for an NPC
   */
  generateDialogue(type, rng) {
    const dialogues = {
      merchant: [
        "Welcome! Take a look at my wares.",
        "Best prices in the realm!",
        "Looking to buy or sell?"
      ],
      villager: [
        "Good day to you!",
        "Have you heard the news?",
        "Strange things happening lately..."
      ],
      guard: [
        "Move along, citizen.",
        "No trouble here, I hope.",
        "Stay vigilant."
      ],
      wanderer: [
        "I've seen many places...",
        "The road is long and winding.",
        "Adventure awaits those who seek it."
      ],
      scholar: [
        "Knowledge is power.",
        "Have you read the ancient texts?",
        "There's always more to learn."
      ]
    };
    
    const lines = dialogues[type] || dialogues.villager;
    return lines[Math.floor(rng.next() * lines.length)];
  }
  
  /**
   * Get NPC faction
   */
  getNPCFaction(type) {
    const factions = {
      merchant: 'neutral',
      villager: 'civilian',
      guard: 'law',
      wanderer: 'neutral',
      scholar: 'academic',
      hunter: 'neutral',
      druid: 'nature',
      nomad: 'neutral',
      hermit: 'neutral',
      witch: 'magic'
    };
    
    return factions[type] || 'neutral';
  }
  
  /**
   * Generate NPC inventory
   */
  generateNPCInventory(type, rng) {
    const inventories = {
      merchant: ['potion', 'scroll', 'weapon', 'armor'],
      villager: ['bread', 'cheese', 'apple'],
      guard: ['sword', 'shield', 'potion'],
      wanderer: ['map', 'compass', 'rope'],
      scholar: ['book', 'scroll', 'quill']
    };
    
    const items = inventories[type] || [];
    const inventory = [];
    
    for (const item of items) {
      if (rng.next() < 0.5) {
        inventory.push({
          type: item,
          quantity: 1 + Math.floor(rng.next() * 3)
        });
      }
    }
    
    return inventory;
  }
}