/**
 * StructureStep - Generates rooms and corridors based on biome
 * Creates the basic structure layout for the chunk
 */

import { PipelineStep } from '../PipelineStep.js';
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT, 
  MAX_ROOM_ATTEMPTS,
  DEFAULT_BIOME 
} from '../../constants.js';

// Structure parameters by biome
const BIOME_STRUCTURE_PARAMS = {
  // Original biomes
  grassland: {
    roomDensity: 0.5,
    minRooms: 2,
    maxRooms: 5,
    minRoomSize: 3,
    maxRoomSize: 8,
    corridorWidth: 1,
    openness: 0.6
  },
  grasslands: { // Alias for consistency
    roomDensity: 0.5,
    minRooms: 2,
    maxRooms: 5,
    minRoomSize: 3,
    maxRoomSize: 8,
    corridorWidth: 1,
    openness: 0.6
  },
  forest: {
    roomDensity: 0.7,
    minRooms: 3,
    maxRooms: 7,
    minRoomSize: 2,
    maxRoomSize: 6,
    corridorWidth: 1,
    openness: 0.3
  },
  desert: {
    roomDensity: 0.2,
    minRooms: 2,
    maxRooms: 4,
    minRoomSize: 5,
    maxRoomSize: 12,
    corridorWidth: 2,
    openness: 0.9
  },
  tundra: {
    roomDensity: 0.4,
    minRooms: 1,
    maxRooms: 4,
    minRoomSize: 3,
    maxRoomSize: 7,
    corridorWidth: 1,
    openness: 0.5
  },
  swamp: {
    roomDensity: 0.3,
    minRooms: 1,
    maxRooms: 4,
    minRoomSize: 3,
    maxRoomSize: 6,
    corridorWidth: 1,
    openness: 0.4,
    waterDensity: 0.3
  },
  mountains: {
    roomDensity: 0.6,
    minRooms: 2,
    maxRooms: 6,
    minRoomSize: 2,
    maxRoomSize: 5,
    corridorWidth: 1,
    openness: 0.2
  },
  // Adventure Time biomes
  candy_kingdom: {
    roomDensity: 0.6,
    minRooms: 3,
    maxRooms: 6,
    minRoomSize: 4,
    maxRoomSize: 8,
    corridorWidth: 2,
    openness: 0.7
  },
  ice_kingdom: {
    roomDensity: 0.5,
    minRooms: 2,
    maxRooms: 5,
    minRoomSize: 3,
    maxRoomSize: 7,
    corridorWidth: 1,
    openness: 0.5
  },
  fire_kingdom: {
    roomDensity: 0.4,
    minRooms: 2,
    maxRooms: 4,
    minRoomSize: 5,
    maxRoomSize: 10,
    corridorWidth: 2,
    openness: 0.8
  },
  dungeon: {
    roomDensity: 0.7,
    minRooms: 4,
    maxRooms: 8,
    minRoomSize: 3,
    maxRoomSize: 6,
    corridorWidth: 1,
    openness: 0.3
  },
  cloud_kingdom: {
    roomDensity: 0.3,
    minRooms: 2,
    maxRooms: 4,
    minRoomSize: 5,
    maxRoomSize: 9,
    corridorWidth: 2,
    openness: 0.9
  },
  bad_lands: {
    roomDensity: 0.2,
    minRooms: 1,
    maxRooms: 3,
    minRoomSize: 4,
    maxRoomSize: 8,
    corridorWidth: 1,
    openness: 0.7
  },
  breakfast_kingdom: {
    roomDensity: 0.5,
    minRooms: 3,
    maxRooms: 5,
    minRoomSize: 3,
    maxRoomSize: 7,
    corridorWidth: 1,
    openness: 0.6
  },
  lemongrab_earldom: {
    roomDensity: 0.8,
    minRooms: 4,
    maxRooms: 7,
    minRoomSize: 2,
    maxRoomSize: 5,
    corridorWidth: 1,
    openness: 0.2
  },
  marceline_cave: {
    roomDensity: 0.4,
    minRooms: 2,
    maxRooms: 4,
    minRoomSize: 4,
    maxRoomSize: 8,
    corridorWidth: 1,
    openness: 0.4
  }
};

export class StructureStep extends PipelineStep {
  constructor() {
    super('StructureStep');
  }
  
  async process(context) {
    const { chunk, rng, params } = context;
    
    // Validate and default biome
    let biome = chunk.biome;
    if (!biome || typeof biome !== 'string' || !BIOME_STRUCTURE_PARAMS[biome]) {
      biome = DEFAULT_BIOME;
      chunk.biome = biome;
    }
    
    const structureParams = BIOME_STRUCTURE_PARAMS[biome] || BIOME_STRUCTURE_PARAMS[DEFAULT_BIOME];
    
    // Initialize the chunk with walls
    this.initializeChunk(chunk);
    
    // Generate rooms
    const rooms = this.generateRooms(chunk, rng, structureParams);
    params.rooms = rooms;
    
    // Carve out rooms
    this.carveRooms(chunk, rooms);
    
    // Generate corridors connecting rooms
    const corridors = this.generateCorridors(chunk, rooms, rng, structureParams);
    params.corridors = corridors;
    
    // Carve corridors
    this.carveCorridors(chunk, corridors, structureParams);
    
    // Add biome-specific features
    this.addBiomeFeatures(chunk, rng, biome, structureParams);
    
    // Ensure edge connections
    const edgeConnections = this.ensureEdgeConnections(chunk, rng);
    params.edgeConnections = edgeConnections;
  }
  
  /**
   * Initialize chunk with wall tiles
   */
  initializeChunk(chunk) {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        chunk.setTile(x, y, '#');
      }
    }
  }
  
  /**
   * Generate rooms based on biome parameters
   */
  generateRooms(chunk, rng, params) {
    const rooms = [];
    const numRooms = params.minRooms + 
      Math.floor(rng.next() * (params.maxRooms - params.minRooms + 1));
    
    for (let i = 0; i < numRooms; i++) {
      let attempts = 0;
      let room = null;
      
      // Try to place room without overlap
      while (attempts < MAX_ROOM_ATTEMPTS && !room) {
        const width = params.minRoomSize + 
          Math.floor(rng.next() * (params.maxRoomSize - params.minRoomSize + 1));
        const height = params.minRoomSize + 
          Math.floor(rng.next() * (params.maxRoomSize - params.minRoomSize + 1));
        
        const x = 1 + Math.floor(rng.next() * (CHUNK_WIDTH - width - 2));
        const y = 1 + Math.floor(rng.next() * (CHUNK_HEIGHT - height - 2));
        
        const candidate = { x, y, width, height };
        
        // Check for overlap with existing rooms
        if (!this.roomOverlaps(candidate, rooms)) {
          room = candidate;
          rooms.push(room);
        }
        
        attempts++;
      }
    }
    
    return rooms;
  }
  
  /**
   * Check if room overlaps with existing rooms
   */
  roomOverlaps(room, rooms) {
    for (const other of rooms) {
      // Add 1 tile buffer between rooms
      if (room.x < other.x + other.width + 1 &&
          room.x + room.width + 1 > other.x &&
          room.y < other.y + other.height + 1 &&
          room.y + room.height + 1 > other.y) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Carve rooms into the chunk
   */
  carveRooms(chunk, rooms) {
    for (const room of rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          chunk.setTile(x, y, '.');
        }
      }
    }
  }
  
  /**
   * Generate corridors connecting rooms
   */
  generateCorridors(chunk, rooms, rng, params) {
    const corridors = [];
    
    if (rooms.length < 2) return corridors;
    
    // Connect each room to at least one other
    for (let i = 0; i < rooms.length - 1; i++) {
      const room1 = rooms[i];
      const room2 = rooms[i + 1];
      
      const corridor = this.createCorridor(room1, room2, rng);
      corridors.push(corridor);
    }
    
    // Add some extra connections for variety
    const extraConnections = Math.floor(rng.next() * 3);
    for (let i = 0; i < extraConnections; i++) {
      const room1 = rooms[Math.floor(rng.next() * rooms.length)];
      const room2 = rooms[Math.floor(rng.next() * rooms.length)];
      
      if (room1 !== room2) {
        const corridor = this.createCorridor(room1, room2, rng);
        corridors.push(corridor);
      }
    }
    
    return corridors;
  }
  
  /**
   * Create a corridor between two rooms
   */
  createCorridor(room1, room2, rng) {
    const start = {
      x: room1.x + Math.floor(room1.width / 2),
      y: room1.y + Math.floor(room1.height / 2)
    };
    
    const end = {
      x: room2.x + Math.floor(room2.width / 2),
      y: room2.y + Math.floor(room2.height / 2)
    };
    
    // Use L-shaped corridors
    const bendFirst = rng.next() < 0.5;
    
    return {
      start,
      end,
      bendFirst,
      points: this.getCorridorPoints(start, end, bendFirst)
    };
  }
  
  /**
   * Get all points along a corridor path
   */
  getCorridorPoints(start, end, bendFirst) {
    const points = [];
    
    if (bendFirst) {
      // Horizontal first, then vertical
      const y = start.y;
      for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) {
        points.push({ x, y });
      }
      
      const x = end.x;
      for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) {
        points.push({ x, y });
      }
    } else {
      // Vertical first, then horizontal
      const x = start.x;
      for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) {
        points.push({ x, y });
      }
      
      const y = end.y;
      for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) {
        points.push({ x, y });
      }
    }
    
    return points;
  }
  
  /**
   * Carve corridors into the chunk
   */
  carveCorridors(chunk, corridors, params) {
    const width = params.corridorWidth || 1;
    
    for (const corridor of corridors) {
      for (const point of corridor.points) {
        // Carve corridor with specified width
        for (let dy = -Math.floor(width/2); dy <= Math.floor(width/2); dy++) {
          for (let dx = -Math.floor(width/2); dx <= Math.floor(width/2); dx++) {
            const x = point.x + dx;
            const y = point.y + dy;
            
            if (x >= 0 && x < 24 && y >= 0 && y < 22) {
              chunk.setTile(x, y, 'floor.default');
            }
          }
        }
      }
    }
  }
  
  /**
   * Add biome-specific features
   */
  addBiomeFeatures(chunk, rng, biome, params) {
    if (biome === 'swamp' && params.waterDensity) {
      // Add water pools in swamp
      const numPools = Math.floor(params.waterDensity * 10);
      
      for (let i = 0; i < numPools; i++) {
        const x = Math.floor(rng.next() * 24);
        const y = Math.floor(rng.next() * 22);
        const size = 1 + Math.floor(rng.next() * 3);
        
        for (let dy = -size; dy <= size; dy++) {
          for (let dx = -size; dx <= size; dx++) {
            const px = x + dx;
            const py = y + dy;
            
            if (px >= 0 && px < 24 && py >= 0 && py < 22) {
              // Only place water on floor tiles
              const currentId = typeof chunk.getTileId === 'function' ? chunk.getTileId(px, py) : null;
              if (currentId === 'floor.default' || currentId === 'floor.candy.polished') {
                if (Math.abs(dx) + Math.abs(dy) <= size) {
                  chunk.setTile(px, py, 'terrain.water.shallow');
                }
              }
            }
          }
        }
      }
    }
    
    // Add alternate floor tiles for variety
    if (params.openness > 0.5) {
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const currentId = typeof chunk.getTileId === 'function' ? chunk.getTileId(x, y) : null;
          if ((currentId === 'floor.default' || currentId === 'floor.candy.polished') && rng.next() < 0.2) {
            chunk.setTile(x, y, 'floor.candy.polished');
          }
        }
      }
    }
  }
  
  /**
   * Ensure there are connections at chunk edges
   */
  ensureEdgeConnections(chunk, rng) {
    const connections = {
      north: [],
      south: [],
      east: [],
      west: []
    };
    
    // Ensure at least one connection per edge
    
    // North edge
    let hasNorth = false;
    for (let x = 2; x < 22; x++) {
      const tileId = typeof chunk.getTileId === 'function' ? chunk.getTileId(x, 0) : null;
      if (tileId === 'floor.default' || tileId === 'floor.candy.polished') {
        connections.north.push(x);
        hasNorth = true;
      }
    }
    if (!hasNorth) {
      const x = 5 + Math.floor(rng.next() * 14);
      chunk.setTile(x, 0, 'floor.default');
      chunk.setTile(x, 1, 'floor.default');
      connections.north.push(x);
    }
    
    // South edge
    let hasSouth = false;
    for (let x = 2; x < 22; x++) {
      const tileId = typeof chunk.getTileId === 'function' ? chunk.getTileId(x, 21) : null;
      if (tileId === 'floor.default' || tileId === 'floor.candy.polished') {
        connections.south.push(x);
        hasSouth = true;
      }
    }
    if (!hasSouth) {
      const x = 5 + Math.floor(rng.next() * 14);
      chunk.setTile(x, 21, 'floor.default');
      chunk.setTile(x, 20, 'floor.default');
      connections.south.push(x);
    }
    
    // East edge
    let hasEast = false;
    for (let y = 2; y < 20; y++) {
      const tileId = typeof chunk.getTileId === 'function' ? chunk.getTileId(23, y) : null;
      if (tileId === 'floor.default' || tileId === 'floor.candy.polished') {
        connections.east.push(y);
        hasEast = true;
      }
    }
    if (!hasEast) {
      const y = 5 + Math.floor(rng.next() * 12);
      chunk.setTile(23, y, 'floor.default');
      chunk.setTile(22, y, 'floor.default');
      connections.east.push(y);
    }
    
    // West edge
    let hasWest = false;
    for (let y = 2; y < 20; y++) {
      const tileId = typeof chunk.getTileId === 'function' ? chunk.getTileId(0, y) : null;
      if (tileId === 'floor.default' || tileId === 'floor.candy.polished') {
        connections.west.push(y);
        hasWest = true;
      }
    }
    if (!hasWest) {
      const y = 5 + Math.floor(rng.next() * 12);
      chunk.setTile(0, y, 'floor.default');
      chunk.setTile(1, y, 'floor.default');
      connections.west.push(y);
    }
    
    return connections;
  }
}
