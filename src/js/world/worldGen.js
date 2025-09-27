import { W, H, BIOMES, BIOME_TIERS, WEAPONS, ARMORS, HEADGEAR, RINGS, POTIONS, FETCH_ITEMS } from '../core/config.js';

// Use full viewport dimensions for chunks
const CHUNK_WIDTH = W;  // 48
const CHUNK_HEIGHT = H;  // 22
import { clamp, seededRand, hashStr } from '../utils/utils.js';
import { makeMonster } from '../entities/entities.js';
import { generateGraveyardChunk } from './graveyardChunk.js';
import { generateCandyMarketChunk } from './candyMarketChunk.js';
import { generateCandyKingdomTownChunk } from './candyKingdomTown.js';
import { generateNorthGateChunk } from './candyKingdomNorth.js';
import { generateEastGateChunk } from './candyKingdomEast.js';
import { generateShoppingDistrictChunk } from './candyShoppingDistrict.js';
import { generateForestChunk } from './theForest.js';
import { 
  generateSouthGateChunk,
  generateWestGateChunk
} from './candyKingdomChunks.js';
import {
  generateCandyForestNW,
  generateCandyForestNE,
  generateCandyForestSW,
  generateCandyForestSE
} from './candyForest.js';
import { mapToTileIds } from './tileUtils.js';
import { getTileDef } from './TileRegistry.js';

export function generateRooms(sr, count = 5) {
  const rooms = [];
  for (let i = 0; i < count; i++) {
    const w = sr.between(4, 10);
    const h = sr.between(4, 8);
    const x = sr.between(0, Math.max(1, W - w));
    const y = sr.between(0, Math.max(1, H - h));
    rooms.push({ x, y, w, h });
  }
  return rooms;
}

export function addWaterFeature(map, sr) {
  const waterType = sr.next();
  
  if (waterType < 0.4) {
    // Create a small pond (reduced size)
    const centerX = sr.between(5, W - 5);
    const centerY = sr.between(5, H - 5);
    const radiusX = sr.between(1, 3);  // Reduced from 2-5
    const radiusY = sr.between(1, 2);  // Reduced from 2-4
    
    for (let y = Math.max(1, centerY - radiusY); y < Math.min(H - 1, centerY + radiusY); y++) {
      for (let x = Math.max(1, centerX - radiusX); x < Math.min(W - 1, centerX + radiusX); x++) {
        const distX = Math.abs(x - centerX) / radiusX;
        const distY = Math.abs(y - centerY) / radiusY;
        const dist = Math.sqrt(distX * distX + distY * distY);
        
        if (dist < 1.0) {
          // Make it water with some randomness for natural edges
          if (dist < 0.7 || sr.next() < 0.4) {  // Reduced chance from 0.6
            map[y][x] = "~";
          }
        }
      }
    }
  } else if (waterType < 0.7) {
    // Create a creek/river running across the map
    let startSide = sr.int(4);
    let x, y;
    
    // Pick starting position on edge
    if (startSide === 0) { // Top
      x = sr.between(3, W - 3);
      y = 0;
    } else if (startSide === 1) { // Right
      x = W - 1;
      y = sr.between(3, H - 3);
    } else if (startSide === 2) { // Bottom
      x = sr.between(3, W - 3);
      y = H - 1;
    } else { // Left
      x = 0;
      y = sr.between(3, H - 3);
    }
    
    // Meander across the map
    let steps = 0;
    while (x > 0 && x < W - 1 && y > 0 && y < H - 1 && steps < 100) {
      // Carve a narrow water path
      map[y][x] = "~";
      
      // Occasionally add adjacent water for slight width variation
      if (sr.next() < 0.2) {  // 20% chance for wider spots
        const dir = sr.pick([[1,0], [-1,0], [0,1], [0,-1]]);
        const nx = x + dir[0], ny = y + dir[1];
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          map[ny][nx] = "~";
        }
      }
      
      // Move generally toward opposite side with some randomness
      if (startSide === 0 || startSide === 2) { // Started top/bottom, move horizontally
        x += sr.next() < 0.5 ? -1 : 1;
        y += sr.next() < 0.7 ? (startSide === 0 ? 1 : -1) : 0;
      } else { // Started left/right, move vertically
        y += sr.next() < 0.5 ? -1 : 1;
        x += sr.next() < 0.7 ? (startSide === 3 ? 1 : -1) : 0;
      }
      
      steps++;
    }
  } else {
    // Create very small scattered water pools
    const poolCount = sr.between(2, 4);  // Reduced from 3-6
    for (let i = 0; i < poolCount; i++) {
      const x = sr.between(2, W - 2);
      const y = sr.between(2, H - 2);
      const size = sr.between(1, 2);  // Reduced from 1-3
      
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < CHUNK_WIDTH && ny >= 0 && ny < CHUNK_HEIGHT) {
            // More restrictive - only adjacent tiles for size 2
            if (Math.abs(dx) + Math.abs(dy) < size) {
              map[ny][nx] = "~";
            }
          }
        }
      }
    }
  }
}

export function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (y >= 0 && y < H && x >= 0 && x < W) map[y][x] = ".";
    }
  }
}

export function carveCorridor(map, x1, y1, x2, y2) {
  while (x1 !== x2 || y1 !== y2) {
    if (y1 >= 0 && y1 < H && x1 >= 0 && x1 < W) map[y1][x1] = ".";
    if (x1 < x2) x1++;
    else if (x1 > x2) x1--;
    else if (y1 < y2) y1++;
    else if (y1 > y2) y1--;
  }
  if (y2 >= 0 && y2 < H && x2 >= 0 && x2 < W) map[y2][x2] = ".";
}

export function ensureEdgeExits(map, sr) {
  const gatesPerSide = () => 2 + sr.int(2); // Increased from 1-2 to 2-3 exits per side
  // Create exits on each edge
  for (let side = 0; side < 4; side++) {
    for (let g = 0; g < gatesPerSide(); g++) {
      if (side === 0) { // Left
        const y = 1 + sr.int(H - 2);
        if (y >= 0 && y < H) {
          map[y][0] = ".";
          for (let x = 1; x < 5 && x < W - 1; x++) {
            if (y >= 0 && y < H && x >= 0 && x < W) map[y][x] = ".";
          }
        }
      } else if (side === 1) { // Right
        const y = 1 + sr.int(H - 2);
        if (y >= 0 && y < H) {
          map[y][W - 1] = ".";
          for (let x = W - 2; x > W - 6 && x > 0; x--) {
            if (y >= 0 && y < H && x >= 0 && x < W) map[y][x] = ".";
          }
        }
      } else if (side === 2) { // Top
        const x = 1 + sr.int(W - 2);
        if (x >= 0 && x < W) {
          map[0][x] = ".";
          for (let y = 1; y < 5 && y < H - 1; y++) {
            if (y >= 0 && y < H && x >= 0 && x < W) map[y][x] = ".";
          }
        }
      } else { // Bottom
        const x = 1 + sr.int(W - 2);
        if (x >= 0 && x < W) {
          map[H - 1][x] = ".";
          for (let y = H - 2; y > H - 6 && y > 0; y--) {
            if (y >= 0 && y < H && x >= 0 && x < W) map[y][x] = ".";
          }
        }
      }
    }
  }
}

export function generateVendorInventory(sr, biome) {
  const inventory = [];
  
  // Create price map for consistent pricing per item type
  const potionPrices = {};
  POTIONS.forEach(p => {
    // Base price on potion power/rarity
    let basePrice = 25;
    if (p.effect === "max_heal") basePrice = 80;  // Blue potion - full heal
    else if (p.effect === "heal") basePrice = 25;  // Red potion - basic heal
    else if (p.effect === "buff_both") basePrice = 60;  // Yellow - buffs both
    else if (p.effect === "berserk") basePrice = 50;  // Black - risky buff
    else basePrice = 40;  // Green/Purple - single stat buffs
    
    // Add small random variance (±20%)
    potionPrices[p.name] = basePrice + sr.int(Math.floor(basePrice * 0.4)) - Math.floor(basePrice * 0.2);
  });
  
  // Always have at least 1-2 potions
  for (let i = 0; i < sr.between(1, 3); i++) {
    const potion = sr.pick(POTIONS);
    inventory.push({
      type: "potion",
      item: potion,
      price: potionPrices[potion.name]
    });
  }
  
  // Sometimes have weapons (60% chance)
  if (sr.next() < 0.6) {
    inventory.push({
      type: "weapon",
      item: sr.pick(WEAPONS),
      price: 50 + sr.int(100)
    });
  }
  
  // Sometimes have armor (60% chance)
  if (sr.next() < 0.6) {
    inventory.push({
      type: "armor", 
      item: sr.pick(ARMORS),
      price: 40 + sr.int(80)
    });
  }
  
  // Sometimes have headgear (40% chance)
  if (sr.next() < 0.4) {
    inventory.push({
      type: "headgear",
      item: sr.pick(HEADGEAR),
      price: 30 + sr.int(60)
    });
  }
  
  return inventory;
}

function findFloorTile(map, sr) {
  for (let tries = 0; tries < 1000; tries++) {
    const x = sr.int(CHUNK_WIDTH), y = sr.int(CHUNK_HEIGHT);
    if (map[y][x] === ".") return { x, y };
  }
  return null;
}

export function placeItems(map, sr, biome) {
  const items = [];
  const tilePlacements = [];

  const placeTile = (pos, tileId) => {
    const def = getTileDef(tileId);
    map[pos.y][pos.x] = def.glyph;
    tilePlacements.push({ x: pos.x, y: pos.y, tileId });
  };

  // Place chests
  for (let i = 0; i < sr.between(1, 3); i++) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      placeTile(pos, 'container.chest.generic');
      items.push({ type: 'chest', x: pos.x, y: pos.y, opened: false });
    }
  }

  // Place shrines (rare)
  if (sr.next() < 0.3) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      placeTile(pos, 'decoration.shrine.marker');
      items.push({ type: 'shrine', x: pos.x, y: pos.y, used: false });
    }
  }

  // Place vendor (70% chance per chunk)
  if (sr.next() < 0.7) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      placeTile(pos, 'interaction.vendor.tile');

      // Generate a unique vendor ID based on chunk coordinates
      const vendorId = `vendor_${sr.seed}_${pos.x}_${pos.y}`;

      // Pick a random fetch quest item for this vendor
      const fetchItem = sr.pick(FETCH_ITEMS);

      items.push({
        type: 'vendor',
        x: pos.x,
        y: pos.y,
        id: vendorId,
        inventory: generateVendorInventory(sr, biome),
        fetchQuest: {
          id: `fetch_${vendorId}`,
          name: "Vendor's Request",
          description: `I need ${fetchItem.name}. Can you help me?`,
          objective: `Bring ${fetchItem.name} to this vendor`,
          targetItem: fetchItem,
          vendorId: vendorId,
          vendorChunk: null, // Will be set when quest is accepted
          rewards: {
            gold: 40 + sr.int(60),
            xp: 20 + sr.int(30),
            item: sr.next() < 0.5 ? { type: 'potion', item: sr.pick(POTIONS) } : null
          },
          completionText: 'Perfect! This is exactly what I needed. Thank you!',
          isRepeatable: false
        }
      });
    }
  }

  // Place artifacts and oddities
  for (let i = 0; i < sr.between(2, 5); i++) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      const tileId = sr.pick(['item.collectible.artifact', 'item.collectible.oddity']);
      placeTile(pos, tileId);
    }
  }

  // Place potions
  for (let i = 0; i < sr.between(1, 3); i++) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      placeTile(pos, 'item.drop.potion');
      items.push({
        type: 'potion',
        x: pos.x,
        y: pos.y,
        item: sr.pick(POTIONS)
      });
    }
  }

  // Chance for weapon/armor/headgear
  if (sr.next() < 0.4) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      const itemTypeRoll = sr.next();
      let itemType;
      let itemArray;

      if (itemTypeRoll < 0.33) {
        itemType = 'weapon';
        itemArray = WEAPONS;
      } else if (itemTypeRoll < 0.66) {
        itemType = 'armor';
        itemArray = ARMORS;
      } else {
        itemType = 'headgear';
        itemArray = HEADGEAR;
      }

      const tileId =
        itemType === 'weapon' ? 'item.drop.weapon' :
        itemType === 'armor' ? 'item.drop.armor' :
        'item.drop.headgear';

      placeTile(pos, tileId);
      items.push({
        type: itemType,
        x: pos.x,
        y: pos.y,
        item: sr.pick(itemArray)
      });
    }
  }

  return { items, tilePlacements };
}

export function genChunk(seed, cx, cy) {
  // Check if this is the candy kingdom town chunk (starting position)
  if (cx === 0 && cy === 0) {
    return generateCandyKingdomTownChunk(seed, cx, cy);
  }
  
  // Check for Shopping District (directly east of town center)
  if (cx === 1 && cy === 0) {
    return generateShoppingDistrictChunk(seed, cx, cy);
  }
  
  // Check for other Candy Kingdom chunks
  if (cx === 0 && cy === -1) {
    return generateNorthGateChunk(seed, cx, cy);
  }
  if (cx === 2 && cy === 0) {
    return generateEastGateChunk(seed, cx, cy);
  }
  if (cx === 0 && cy === 1) {
    return generateSouthGateChunk(seed, cx, cy);
  }
  if (cx === -1 && cy === 0) {
    return generateWestGateChunk(seed, cx, cy);
  }
  
  // Check for The Forest (regular forest, not candy forest)
  // Place it to the north of the kingdom for the Sweet Tooth Fox quest
  if (cx === 0 && cy === -2) {
    const forestChunk = generateForestChunk(seed, cx, cy);
    return {
      ...forestChunk,
      x: cx,
      y: cy,
      seed: hashStr(`${seed}|${cx}|${cy}`)
    };
  }
  
  // Check for Cotton Candy Forest chunks
  if (cx === -1 && cy === -1) {
    return generateCandyForestNW(seed, cx, cy);
  }
  if (cx === 1 && cy === -1) {
    return generateCandyForestNE(seed, cx, cy);
  }
  if (cx === -1 && cy === 1) {
    return generateCandyForestSW(seed, cx, cy);
  }
  if (cx === 1 && cy === 1) {
    return generateCandyForestSE(seed, cx, cy);
  }
  
  const sr = seededRand(hashStr(`${seed}|${cx}|${cy}`));
  
  // Calculate distance from spawn for difficulty scaling
  const distance = Math.abs(cx) + Math.abs(cy);
  const zoneDanger = Math.floor(distance / 4); // Every 4 chunks = new danger zone
  
  // Generate base map structure - start with more floor tiles
  const map = Array.from({ length: CHUNK_HEIGHT }, () => Array.from({ length: CHUNK_WIDTH }, () => "#"));
  
  // Generate larger rooms for more open space
  const rooms = generateRooms(sr, sr.between(5, 9));
  rooms.forEach(room => {
    // Make rooms larger
    room.w = Math.min(room.w + sr.between(2, 4), CHUNK_WIDTH - room.x - 1);
    room.h = Math.min(room.h + sr.between(1, 3), CHUNK_HEIGHT - room.y - 1);
    carveRoom(map, room);
  });
  
  // Connect rooms with wider corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const r1 = rooms[i], r2 = rooms[i + 1];
    const x1 = clamp(Math.floor(r1.x + r1.w / 2), 0, CHUNK_WIDTH - 1);
    const y1 = clamp(Math.floor(r1.y + r1.h / 2), 0, CHUNK_HEIGHT - 1);
    const x2 = clamp(Math.floor(r2.x + r2.w / 2), 0, CHUNK_WIDTH - 1);
    const y2 = clamp(Math.floor(r2.y + r2.h / 2), 0, CHUNK_HEIGHT - 1);
    
    // Carve main corridor
    carveCorridor(map, x1, y1, x2, y2);
    // Make corridors wider by carving adjacent tiles
    carveCorridor(map, x1 + 1, y1, x2 + 1, y2);
    carveCorridor(map, x1, y1 + 1, x2, y2 + 1);
  }
  
  // Add more random paths for variety and openness
  for (let i = 0; i < sr.between(8, 15); i++) {
    const x = sr.int(CHUNK_WIDTH), y = sr.int(CHUNK_HEIGHT);
    const steps = sr.between(15, 40);
    let cx = x, cy = y;
    for (let s = 0; s < steps; s++) {
      // Carve a wider path
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < CHUNK_WIDTH && ny >= 0 && ny < CHUNK_HEIGHT) {
            if (sr.next() < 0.7) map[ny][nx] = "."; // 70% chance to carve each adjacent tile
          }
        }
      }
      const dir = sr.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      cx = clamp(cx + dir[0], 0, CHUNK_WIDTH - 1);
      cy = clamp(cy + dir[1], 0, CHUNK_HEIGHT - 1);
    }
  }
  
  // Add water features (15% chance per chunk - reduced from 40%)
  if (sr.next() < 0.15) {
    addWaterFeature(map, sr);
  }
  
  // Add candy dust piles - LONG CHAINS for testing chain reactions
  if (sr.next() < 1.0) {
    // Create 2-3 LONG CHAINS of candy dust
    const chainCount = sr.between(2, 3);
    
    for (let c = 0; c < chainCount; c++) {
      // Pick a random starting point
      const startX = sr.between(3, W - 3);
      const startY = sr.between(3, H - 3);
      
      // Create a chain of 10-15 connected candy dust tiles
      const chainLength = sr.between(10, 15);
      let currentX = startX;
      let currentY = startY;
      const placedPositions = [];
      
      // Place first candy dust
      if (map[currentY][currentX] === '.') {
        map[currentY][currentX] = '%';
        placedPositions.push({x: currentX, y: currentY});
      }
      
      // Build a continuous chain
      for (let i = 1; i < chainLength; i++) {
        // Try to find a valid adjacent position
        const dirs = [[0,1], [1,0], [0,-1], [-1,0]]; // Only orthogonal for cleaner chains
        let placed = false;
        
        // Shuffle directions for variety
        for (let j = dirs.length - 1; j > 0; j--) {
          const k = sr.int(j + 1);
          [dirs[j], dirs[k]] = [dirs[k], dirs[j]];
        }
        
        // Try each direction until we find a valid spot
        for (const [dx, dy] of dirs) {
          const newX = currentX + dx;
          const newY = currentY + dy;
          
          // Check if valid and empty
          if (newX >= 1 && newX < W-1 && newY >= 1 && newY < H-1 && map[newY][newX] === '.') {
            map[newY][newX] = '%';
            placedPositions.push({x: newX, y: newY});
            currentX = newX;
            currentY = newY;
            placed = true;
            break;
          }
        }
        
        // If we couldn't extend the chain, try from a different position in the chain
        if (!placed && placedPositions.length > 1) {
          const backtrack = sr.pick(placedPositions);
          currentX = backtrack.x;
          currentY = backtrack.y;
          i--; // Try again from this position
        }
      }
    }
    
    // Create some branching chains for more interesting reactions
    const branchCount = sr.between(2, 4);
    for (let b = 0; b < branchCount; b++) {
      // Create a cross or T-shaped formation
      const centerX = sr.between(8, W - 8);
      const centerY = sr.between(5, H - 5);
      
      // Horizontal line
      for (let x = centerX - 5; x <= centerX + 5; x++) {
        if (x >= 0 && x < W && map[centerY][x] === '.') {
          map[centerY][x] = '%';
        }
      }
      
      // Vertical line  
      for (let y = centerY - 3; y <= centerY + 3; y++) {
        if (y >= 0 && y < H && map[y][centerX] === '.') {
          map[y][centerX] = '%';
        }
      }
    }
    
    // Add a few scattered piles to connect chains
    const scatteredCount = sr.between(8, 12);
    for (let i = 0; i < scatteredCount; i++) {
      const x = sr.between(2, W - 2);
      const y = sr.between(2, H - 2);
      if (map[y][x] === '.') {
        map[y][x] = '%';
      }
    }
  }
  
  // Clear out some random walls to make it more open
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (map[y][x] === "#") {
        // Count adjacent floors
        let floorCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (map[y + dy][x + dx] === ".") floorCount++;
          }
        }
        // If surrounded by many floors, remove this wall
        if (floorCount >= 5) {
          map[y][x] = ".";
        }
      }
    }
  }
  
  ensureEdgeExits(map, sr);
  
  // SELECT BIOME BASED ON DISTANCE
  const maxTier = Math.min(Math.max(1, 1 + Math.floor(distance / 4)), 6);
  const minTier = Math.max(1, maxTier - 1); // Can spawn current or previous tier
  
  // Filter biomes by appropriate tier
  const availableBiomes = Object.values(BIOME_TIERS)
    .filter(biome => biome.tier >= minTier && biome.tier <= maxTier);
  
  // If no biomes available (shouldn't happen), fallback to tier 1
  const biome = availableBiomes.length > 0 
    ? sr.pick(availableBiomes) 
    : BIOME_TIERS.candy_forest;
  
  const { items, tilePlacements } = placeItems(map, sr, biome);
  
  // SPAWN MONSTERS WITH SCALED DIFFICULTY
  const monsters = [];
  const baseMonsterCount = sr.between(8, 15);
  const monsterCount = baseMonsterCount + Math.floor(zoneDanger / 2); // More monsters in danger zones
  
  // Get possible monsters for this biome
  const possibleMonsters = biome.monsters.concat(["goober", "firefly"]); // Common everywhere
  
  for (let i = 0; i < monsterCount; i++) {
    const pos = findFloorTile(map, sr);
    if (!pos) break;
    const kind = sr.pick(possibleMonsters);
    
    // ENHANCED TIER CALCULATION based on distance
    let tier = 1;
    const tierRoll = sr.next();
    
    // Increase elite/veteran chances with distance
    const eliteChance = 0.05 + (zoneDanger * 0.03); // 5% -> 8% -> 11%...
    const veteranChance = 0.25 + (zoneDanger * 0.05); // 25% -> 30% -> 35%...
    
    if (tierRoll < Math.min(eliteChance, 0.30)) { // Cap at 30%
      tier = 3; // Elite
    } else if (tierRoll < Math.min(veteranChance, 0.60)) { // Cap at 60%
      tier = 2; // Veteran
    }
    
    const monster = makeMonster(kind, pos.x, pos.y, tier);
    
    // ADDITIONAL SCALING based on zone danger
    if (zoneDanger > 0) {
      monster.hp += zoneDanger * 2;
      monster.str += Math.floor(zoneDanger * 0.5);
      monster.xp = Math.floor(monster.xp * (1 + zoneDanger * 0.1));
    }
    
    monsters.push(monster);
  }
  
  // BOSS SPAWN CHANCE increases with distance
  const bossChance = 0.1 + (zoneDanger * 0.02); // 10% -> 12% -> 14%...
  if (sr.next() < Math.min(bossChance, 0.25)) { // Cap at 25%
    const pos = findFloorTile(map, sr);
    if (pos) {
      const boss = makeMonster("boss", pos.x, pos.y, 3);
      // Scale boss too
      boss.hp += zoneDanger * 5;
      boss.str += zoneDanger;
      boss.xp = Math.floor(boss.xp * (1 + zoneDanger * 0.2));
      monsters.push(boss);
    }
  }
  
  const tileIds = mapToTileIds(map, 'floor.default');
  for (const { x, y, tileId } of tilePlacements) {
    if (tileIds[y] && typeof tileIds[y][x] !== 'undefined') {
      tileIds[y][x] = tileId;
    }
  }

  return {
    map,
    tileIds,
    monsters,
    biome: biome.id,
    items,
    npcs: [], // NPCs are added later by the game
    cx: cx, // Add chunk coordinates
    cy: cy,
    danger: zoneDanger // Store danger level for display
  };
}

export function findOpenSpot(map) {
  // Validate map exists and has proper dimensions
  if (!map || !Array.isArray(map) || map.length === 0) {
    console.error('Invalid map passed to findOpenSpot');
    return { x: Math.floor(CHUNK_WIDTH / 2), y: Math.floor(CHUNK_HEIGHT / 2) };
  }
  
  for (let tries = 0; tries < 4000; tries++) {
    const x = Math.floor(Math.random() * CHUNK_WIDTH);
    const y = Math.floor(Math.random() * CHUNK_HEIGHT);
    // Check bounds and that row exists
    if (y < map.length && map[y] && x < map[y].length && map[y][x] === ".") {
      return { x, y };
    }
  }
  
  // Fallback to center if no open spot found
  return { x: Math.floor(CHUNK_WIDTH / 2), y: Math.floor(CHUNK_HEIGHT / 2) };
}
