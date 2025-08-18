import { W, H, BIOMES, WEAPONS, ARMORS, HEADGEAR, POTIONS } from './config.js';
import { clamp, seededRand, hashStr } from './utils.js';
import { makeMonster } from './entities.js';

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
  const gatesPerSide = () => 1 + sr.int(2);
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
    const x = sr.int(W), y = sr.int(H);
    if (map[y][x] === ".") return { x, y };
  }
  return null;
}

export function placeItems(map, sr, biome) {
  const items = [];
  
  // Place chests
  for (let i = 0; i < sr.between(1, 3); i++) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      map[pos.y][pos.x] = "$";
      items.push({ type: "chest", x: pos.x, y: pos.y, opened: false });
    }
  }
  
  // Place shrines (rare)
  if (sr.next() < 0.3) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      map[pos.y][pos.x] = "▲";
      items.push({ type: "shrine", x: pos.x, y: pos.y, used: false });
    }
  }
  
  // Place vendor (70% chance per chunk)
  if (sr.next() < 0.7) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      map[pos.y][pos.x] = "V";
      items.push({
        type: "vendor",
        x: pos.x,
        y: pos.y,
        inventory: generateVendorInventory(sr, biome)
      });
    }
  }
  
  // Place artifacts and oddities
  for (let i = 0; i < sr.between(2, 5); i++) {
    const pos = findFloorTile(map, sr);
    if (pos) map[pos.y][pos.x] = sr.pick(["★", "♪"]);
  }
  
  // Place potions
  for (let i = 0; i < sr.between(1, 3); i++) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      map[pos.y][pos.x] = "!";
      items.push({
        type: "potion", x: pos.x, y: pos.y,
        item: sr.pick(POTIONS)
      });
    }
  }
  
  // Chance for weapon/armor/headgear
  if (sr.next() < 0.4) {
    const pos = findFloorTile(map, sr);
    if (pos) {
      const itemType = sr.next();
      let type, tile, itemArray;
      
      if (itemType < 0.33) {
        type = "weapon";
        tile = "/";
        itemArray = WEAPONS;
      } else if (itemType < 0.66) {
        type = "armor";
        tile = "]";
        itemArray = ARMORS;
      } else {
        type = "headgear";
        tile = "^";
        itemArray = HEADGEAR;
      }
      
      map[pos.y][pos.x] = tile;
      items.push({
        type: type,
        x: pos.x, y: pos.y,
        item: sr.pick(itemArray)
      });
    }
  }
  
  return items;
}

export function genChunk(seed, cx, cy) {
  const sr = seededRand(hashStr(`${seed}|${cx}|${cy}`));
  const map = Array.from({ length: H }, () => Array.from({ length: W }, () => "#"));
  
  // Generate rooms and corridors
  const rooms = generateRooms(sr, sr.between(3, 7));
  rooms.forEach(room => carveRoom(map, room));
  
  // Connect rooms
  for (let i = 0; i < rooms.length - 1; i++) {
    const r1 = rooms[i], r2 = rooms[i + 1];
    const x1 = clamp(Math.floor(r1.x + r1.w / 2), 0, W - 1);
    const y1 = clamp(Math.floor(r1.y + r1.h / 2), 0, H - 1);
    const x2 = clamp(Math.floor(r2.x + r2.w / 2), 0, W - 1);
    const y2 = clamp(Math.floor(r2.y + r2.h / 2), 0, H - 1);
    carveCorridor(map, x1, y1, x2, y2);
  }
  
  // Add some random paths for variety
  for (let i = 0; i < sr.between(5, 10); i++) {
    const x = sr.int(W), y = sr.int(H);
    const steps = sr.between(10, 30);
    let cx = x, cy = y;
    for (let s = 0; s < steps; s++) {
      if (cx >= 0 && cx < W && cy >= 0 && cy < H) map[cy][cx] = ".";
      const dir = sr.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      cx = clamp(cx + dir[0], 0, W - 1);
      cy = clamp(cy + dir[1], 0, H - 1);
    }
  }
  
  ensureEdgeExits(map, sr);
  
  const biome = sr.pick(BIOMES);
  const items = placeItems(map, sr, biome);
  
  // Spawn monsters
  const monsters = [];
  const monsterCount = sr.between(8, 15);
  const possibleMonsters = biome.monsters.concat(["goober", "firefly"]);
  
  for (let i = 0; i < monsterCount; i++) {
    const pos = findFloorTile(map, sr);
    if (!pos) break;
    const kind = sr.pick(possibleMonsters);
    
    // Determine tier based on rarity
    // 70% tier 1 (normal), 25% tier 2 (veteran), 5% tier 3 (elite)
    let tier = 1;
    const tierRoll = sr.next();
    if (tierRoll < 0.05) {
      tier = 3; // Elite (5% chance)
    } else if (tierRoll < 0.30) {
      tier = 2; // Veteran (25% chance)
    }
    
    monsters.push(makeMonster(kind, pos.x, pos.y, tier));
  }
  
  // Chance for a boss in some chunks (bosses are always tier 3)
  if (sr.next() < 0.1) {
    const pos = findFloorTile(map, sr);
    if (pos) monsters.push(makeMonster("boss", pos.x, pos.y, 3));
  }
  
  return { map, monsters, biome: biome.id, items };
}

export function findOpenSpot(map) {
  for (let tries = 0; tries < 4000; tries++) {
    const x = Math.floor(Math.random() * W);
    const y = Math.floor(Math.random() * H);
    if (map[y][x] === ".") return { x, y };
  }
  return null;
}