/**
 * ValidationStep - Validates and fixes chunk issues
 * Ensures chunk connectivity, valid tiles, and proper entity placement
 */

import { PipelineStep } from '../PipelineStep.js';
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT, 
  VALID_TILES,
  BIOME_TYPES,
  DEFAULT_BIOME,
  MAX_ENTITY_PLACEMENT_RADIUS
} from '../../constants.js';

export class ValidationStep extends PipelineStep {
  constructor() {
    super('ValidationStep');
    this.critical = true; // Mark as critical step
  }
  
  async process(context) {
    const { chunk, rng, params } = context;
    
    // Initialize validation results
    params.validationResults = {
      connected: false,
      allRoomsReachable: false,
      issuesFound: 0,
      issuesFixed: 0
    };
    
    // Run validation checks
    this.validateTiles(chunk, params);
    this.validateBorders(chunk, params);
    this.validateConnectivity(chunk, params, rng);
    this.validateEntities(chunk, params, rng);
    this.validateMetadata(chunk, context);
    this.validateBiome(chunk);
    
    // Mark chunk as validated
    params.validationResults.validated = true;
  }
  
  /**
   * Validate and fix tile types
   */
  validateTiles(chunk, params) {
    let fixedTiles = 0;
    
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        // Access tile data directly to avoid errors with null
        const tile = chunk.map[y][x];
        
        // Check for invalid tiles
        if (!tile || tile === null || typeof tile !== 'string' || tile.length !== 1 || !VALID_TILES.has(tile)) {
          // Default to wall for invalid tiles
          chunk.map[y][x] = '#';
          fixedTiles++;
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
        }
      }
    }
  }
  
  /**
   * Ensure borders are walls except at connections
   */
  validateBorders(chunk, params) {
    const edgeConnections = params.edgeConnections || {
      north: [],
      south: [],
      east: [],
      west: []
    };
    
    // North and South borders
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      // North
      if (!edgeConnections.north.includes(x)) {
        if (chunk.getTile(x, 0) !== '#') {
          chunk.setTile(x, 0, '#');
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
        }
      }
      
      // South
      if (!edgeConnections.south.includes(x)) {
        if (chunk.getTile(x, CHUNK_HEIGHT - 1) !== '#') {
          chunk.setTile(x, CHUNK_HEIGHT - 1, '#');
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
        }
      }
    }
    
    // East and West borders
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      // West
      if (!edgeConnections.west.includes(y)) {
        if (chunk.getTile(0, y) !== '#') {
          chunk.setTile(0, y, '#');
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
        }
      }
      
      // East
      if (!edgeConnections.east.includes(y)) {
        if (chunk.getTile(CHUNK_WIDTH - 1, y) !== '#') {
          chunk.setTile(CHUNK_WIDTH - 1, y, '#');
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
        }
      }
    }
  }
  
  /**
   * Validate and ensure connectivity
   */
  validateConnectivity(chunk, params, rng) {
    // Find all floor regions using flood fill
    const visited = new Set();
    const regions = [];
    
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        const key = `${x},${y}`;
        const tile = chunk.getTile(x, y);
        
        if (!visited.has(key) && this.isWalkable(tile)) {
          const region = this.floodFill(chunk, x, y, visited);
          if (region.length > 0) {
            regions.push(region);
          }
        }
      }
    }
    
    // Check if disconnected
    if (regions.length > 1) {
      params.validationResults.issuesFound++;
      
      // Connect regions
      this.connectRegions(chunk, regions, rng);
      params.validationResults.issuesFixed++;
    }
    
    // Check room connectivity
    const rooms = params.rooms || [];
    if (rooms.length > 0) {
      const allReachable = this.checkRoomConnectivity(chunk, rooms);
      params.validationResults.allRoomsReachable = allReachable;
    } else {
      params.validationResults.allRoomsReachable = true;
    }
    
    params.validationResults.connected = true;
  }
  
  /**
   * Flood fill to find connected region
   */
  floodFill(chunk, startX, startY, visited) {
    const region = [];
    const stack = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT) continue;
      
      const tile = chunk.getTile(x, y);
      if (!this.isWalkable(tile)) continue;
      
      visited.add(key);
      region.push({ x, y });
      
      // Add neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    return region;
  }
  
  /**
   * Check if tile is walkable
   */
  isWalkable(tile) {
    return tile === '.' || tile === '·' || tile === '+' || tile === '<' || tile === '>';
  }
  
  /**
   * Connect disconnected regions
   */
  connectRegions(chunk, regions, rng) {
    // Sort regions by size (largest first)
    regions.sort((a, b) => b.length - a.length);
    
    // Connect each smaller region to the largest
    const mainRegion = regions[0];
    
    for (let i = 1; i < regions.length; i++) {
      const region = regions[i];
      
      // Find closest points between regions
      let minDist = Infinity;
      let bestPair = null;
      
      for (const p1 of mainRegion) {
        for (const p2 of region) {
          const dist = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
          if (dist < minDist) {
            minDist = dist;
            bestPair = [p1, p2];
          }
        }
      }
      
      // Create corridor between closest points
      if (bestPair) {
        this.createCorridor(chunk, bestPair[0], bestPair[1]);
      }
    }
  }
  
  /**
   * Create a corridor between two points
   */
  createCorridor(chunk, p1, p2) {
    let x = p1.x;
    let y = p1.y;
    
    // Move horizontally first
    while (x !== p2.x) {
      chunk.setTile(x, y, '.');
      x += x < p2.x ? 1 : -1;
    }
    
    // Then vertically
    while (y !== p2.y) {
      chunk.setTile(x, y, '.');
      y += y < p2.y ? 1 : -1;
    }
  }
  
  /**
   * Check if all rooms are connected
   */
  checkRoomConnectivity(chunk, rooms) {
    if (rooms.length === 0) return true;
    
    // Start from first room
    const visited = new Set();
    const stack = [];
    
    // Add a point from first room
    const firstRoom = rooms[0];
    stack.push([
      firstRoom.x + Math.floor(firstRoom.width / 2),
      firstRoom.y + Math.floor(firstRoom.height / 2)
    ]);
    
    // Flood fill from first room
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT) continue;
      
      const tile = chunk.getTile(x, y);
      if (!this.isWalkable(tile)) continue;
      
      visited.add(key);
      
      // Add neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    // Check if all rooms have at least one visited tile
    for (const room of rooms) {
      let roomReachable = false;
      
      for (let y = room.y; y < room.y + room.height && !roomReachable; y++) {
        for (let x = room.x; x < room.x + room.width && !roomReachable; x++) {
          if (visited.has(`${x},${y}`)) {
            roomReachable = true;
          }
        }
      }
      
      if (!roomReachable) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate and fix entity positions
   */
  validateEntities(chunk, params, rng) {
    const occupiedPositions = new Set();
    
    // Validate and fix monsters
    if (chunk.monsters && chunk.monsters.length > 0) {
      const validMonsters = [];
      
      for (const monster of chunk.monsters) {
        // Check bounds
        if (monster.x < 0 || monster.x >= CHUNK_WIDTH || monster.y < 0 || monster.y >= CHUNK_HEIGHT) {
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
          continue; // Remove out of bounds monster
        }
        
        // Check tile
        const tile = chunk.getTile(monster.x, monster.y);
        if (!this.isWalkable(tile)) {
          // Try to find nearby walkable tile
          const newPos = this.findNearbyWalkable(chunk, monster.x, monster.y, occupiedPositions);
          if (newPos) {
            monster.x = newPos.x;
            monster.y = newPos.y;
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
          } else {
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
            continue; // Remove if no valid position
          }
        }
        
        // Check overlap
        const key = `${monster.x},${monster.y}`;
        if (occupiedPositions.has(key)) {
          // Find new position
          const newPos = this.findNearbyWalkable(chunk, monster.x, monster.y, occupiedPositions);
          if (newPos) {
            monster.x = newPos.x;
            monster.y = newPos.y;
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
          } else {
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
            continue; // Remove if no valid position
          }
        }
        
        occupiedPositions.add(`${monster.x},${monster.y}`);
        validMonsters.push(monster);
      }
      
      chunk.monsters = validMonsters;
    }
    
    // Validate and fix NPCs
    if (chunk.npcs && chunk.npcs.length > 0) {
      const validNPCs = [];
      
      for (const npc of chunk.npcs) {
        // Check bounds
        if (npc.x < 0 || npc.x >= CHUNK_WIDTH || npc.y < 0 || npc.y >= CHUNK_HEIGHT) {
          params.validationResults.issuesFound++;
          params.validationResults.issuesFixed++;
          continue; // Remove out of bounds NPC
        }
        
        // Check tile
        const tile = chunk.getTile(npc.x, npc.y);
        if (!this.isWalkable(tile)) {
          // Try to find nearby walkable tile
          const newPos = this.findNearbyWalkable(chunk, npc.x, npc.y, occupiedPositions);
          if (newPos) {
            npc.x = newPos.x;
            npc.y = newPos.y;
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
          } else {
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
            continue; // Remove if no valid position
          }
        }
        
        // Check overlap
        const key = `${npc.x},${npc.y}`;
        if (occupiedPositions.has(key)) {
          // Find new position
          const newPos = this.findNearbyWalkable(chunk, npc.x, npc.y, occupiedPositions);
          if (newPos) {
            npc.x = newPos.x;
            npc.y = newPos.y;
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
          } else {
            params.validationResults.issuesFound++;
            params.validationResults.issuesFixed++;
            continue; // Remove if no valid position
          }
        }
        
        occupiedPositions.add(`${npc.x},${npc.y}`);
        validNPCs.push(npc);
      }
      
      chunk.npcs = validNPCs;
    }
  }
  
  /**
   * Find nearby walkable position
   */
  findNearbyWalkable(chunk, x, y, occupied) {
    // Search in expanding circles
    for (let radius = 1; radius < MAX_ENTITY_PLACEMENT_RADIUS; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx < 0 || nx >= CHUNK_WIDTH || ny < 0 || ny >= CHUNK_HEIGHT) continue;
          
          const tile = chunk.getTile(nx, ny);
          const key = `${nx},${ny}`;
          
          if (this.isWalkable(tile) && !occupied.has(key)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate and set metadata
   */
  validateMetadata(chunk, context) {
    if (!chunk.metadata) {
      chunk.metadata = {};
    }
    
    chunk.metadata.generated = true;
    chunk.metadata.version = chunk.metadata.version || '1.0.0';
    chunk.metadata.seed = context.seed;
    chunk.metadata.validatedAt = Date.now();
  }
  
  /**
   * Validate biome assignment
   */
  validateBiome(chunk) {
    if (!chunk.biome || !BIOME_TYPES.includes(chunk.biome)) {
      chunk.biome = DEFAULT_BIOME;
    }
  }
}