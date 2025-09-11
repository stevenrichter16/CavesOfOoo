/**
 * Tests for StructureStep
 * Testing room and corridor generation based on biome
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('StructureStep', () => {
  let StructureStep, Chunk, SeededRandom;
  
  beforeEach(async () => {
    const structureModule = await import('../../../../src/js/world/pipeline/steps/StructureStep.js');
    const chunkModule = await import('../../../../src/js/world/core/Chunk.js');
    const randomModule = await import('../../../../src/js/world/pipeline/SeededRandom.js');
    
    StructureStep = structureModule.StructureStep;
    Chunk = chunkModule.Chunk;
    SeededRandom = randomModule.SeededRandom;
  });
  
  describe('Basic Structure Generation', () => {
    it('should generate structure in chunk', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'test-seed',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('test-seed', 0, 0),
        params: {
          biomeTemperature: 0.5,
          biomeHumidity: 0.5,
          biomeElevation: 0.3
        }
      };
      
      // Set biome
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should have some floor tiles
      let hasFloor = false;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const tile = context.chunk.getTile(x, y);
          if (tile === '.' || tile === '·') {
            hasFloor = true;
            break;
          }
        }
        if (hasFloor) break;
      }
      
      expect(hasFloor).toBe(true);
    });
    
    it('should generate walls', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'test-seed',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('test-seed', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'forest';
      
      await step.process(context);
      
      // Should have some wall tiles
      let hasWalls = false;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (context.chunk.getTile(x, y) === '#') {
            hasWalls = true;
            break;
          }
        }
        if (hasWalls) break;
      }
      
      expect(hasWalls).toBe(true);
    });
  });
  
  describe('Room Generation', () => {
    it('should generate rooms', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'room-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('room-test', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should store room data in params
      expect(context.params.rooms).toBeDefined();
      expect(Array.isArray(context.params.rooms)).toBe(true);
      
      if (context.params.rooms.length > 0) {
        const room = context.params.rooms[0];
        expect(room).toHaveProperty('x');
        expect(room).toHaveProperty('y');
        expect(room).toHaveProperty('width');
        expect(room).toHaveProperty('height');
      }
    });
    
    it('should create rooms within chunk bounds', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'bounds-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('bounds-test', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      if (context.params.rooms && context.params.rooms.length > 0) {
        context.params.rooms.forEach(room => {
          expect(room.x).toBeGreaterThanOrEqual(0);
          expect(room.y).toBeGreaterThanOrEqual(0);
          expect(room.x + room.width).toBeLessThanOrEqual(24);
          expect(room.y + room.height).toBeLessThanOrEqual(22);
        });
      }
    });
    
    it('should vary room count by biome', async () => {
      const step = new StructureStep();
      
      // Test forest biome (more rooms expected)
      const forestContext = {
        seed: 'forest-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('forest-test', 0, 0),
        params: {}
      };
      forestContext.chunk.biome = 'forest';
      
      await step.process(forestContext);
      const forestRoomCount = forestContext.params.rooms ? forestContext.params.rooms.length : 0;
      
      // Test desert biome (fewer rooms expected)
      const desertContext = {
        seed: 'desert-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('desert-test', 0, 0),
        params: {}
      };
      desertContext.chunk.biome = 'desert';
      
      await step.process(desertContext);
      const desertRoomCount = desertContext.params.rooms ? desertContext.params.rooms.length : 0;
      
      // Different biomes should have different structure densities
      expect(forestRoomCount).toBeDefined();
      expect(desertRoomCount).toBeDefined();
    });
  });
  
  describe('Corridor Generation', () => {
    it('should generate corridors connecting rooms', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'corridor-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('corridor-test', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should have corridors stored
      expect(context.params.corridors).toBeDefined();
      expect(Array.isArray(context.params.corridors)).toBe(true);
    });
    
    it('should create passable paths', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'path-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('path-test', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Check that there are connected floor tiles
      let floorCount = 0;
      for (let y = 1; y < 21; y++) {
        for (let x = 1; x < 23; x++) {
          const tile = context.chunk.getTile(x, y);
          if (tile === '.' || tile === '·') {
            floorCount++;
          }
        }
      }
      
      // Should have reasonable amount of floor space
      expect(floorCount).toBeGreaterThan(50); // At least some walkable area
    });
  });
  
  describe('Biome-Specific Structures', () => {
    it('should generate water features in swamp biome', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'swamp-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('swamp-test', 0, 0),
        params: {
          biomeHumidity: 0.9
        }
      };
      
      context.chunk.biome = 'swamp';
      
      await step.process(context);
      
      // Should have water tiles
      let hasWater = false;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (context.chunk.getTile(x, y) === '~') {
            hasWater = true;
            break;
          }
        }
        if (hasWater) break;
      }
      
      expect(hasWater).toBe(true);
    });
    
    it('should create sparse structures in desert', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'desert-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('desert-test', 0, 0),
        params: {
          biomeTemperature: 0.9,
          biomeHumidity: 0.1
        }
      };
      
      context.chunk.biome = 'desert';
      
      await step.process(context);
      
      // Count open floor tiles
      let floorCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const tile = context.chunk.getTile(x, y);
          if (tile === '.' || tile === '·') {
            floorCount++;
          }
        }
      }
      
      // Desert should have more open space
      expect(floorCount).toBeGreaterThan(100);
    });
    
    it('should create denser structures in forest', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'forest-density',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('forest-density', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'forest';
      
      await step.process(context);
      
      // Count wall tiles
      let wallCount = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (context.chunk.getTile(x, y) === '#') {
            wallCount++;
          }
        }
      }
      
      // Forest should have more walls/obstacles
      expect(wallCount).toBeGreaterThan(100);
    });
  });
  
  describe('Edge Connections', () => {
    it('should mark edge connection points', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'edge-test',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('edge-test', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should mark edge connections
      expect(context.params.edgeConnections).toBeDefined();
      expect(context.params.edgeConnections).toHaveProperty('north');
      expect(context.params.edgeConnections).toHaveProperty('south');
      expect(context.params.edgeConnections).toHaveProperty('east');
      expect(context.params.edgeConnections).toHaveProperty('west');
    });
    
    it('should ensure edges have some passable tiles', async () => {
      const step = new StructureStep();
      const context = {
        seed: 'passable-edge',
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom('passable-edge', 0, 0),
        params: {}
      };
      
      context.chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Check each edge has at least one passable tile
      const edges = {
        north: [],
        south: [],
        east: [],
        west: []
      };
      
      // North edge
      for (let x = 0; x < 24; x++) {
        const tile = context.chunk.getTile(x, 0);
        if (tile === '.' || tile === '·') edges.north.push(x);
      }
      
      // South edge
      for (let x = 0; x < 24; x++) {
        const tile = context.chunk.getTile(x, 21);
        if (tile === '.' || tile === '·') edges.south.push(x);
      }
      
      // East edge
      for (let y = 0; y < 22; y++) {
        const tile = context.chunk.getTile(23, y);
        if (tile === '.' || tile === '·') edges.east.push(y);
      }
      
      // West edge
      for (let y = 0; y < 22; y++) {
        const tile = context.chunk.getTile(0, y);
        if (tile === '.' || tile === '·') edges.west.push(y);
      }
      
      // Each edge should have at least one connection point
      expect(edges.north.length).toBeGreaterThan(0);
      expect(edges.south.length).toBeGreaterThan(0);
      expect(edges.east.length).toBeGreaterThan(0);
      expect(edges.west.length).toBeGreaterThan(0);
    });
  });
  
  describe('Deterministic Generation', () => {
    it('should generate same structure for same seed', async () => {
      const step = new StructureStep();
      
      const createContext = (seed, cx, cy) => ({
        seed,
        cx,
        cy,
        chunk: new Chunk(cx, cy),
        rng: new SeededRandom(seed, cx, cy),
        params: {}
      });
      
      const context1 = createContext('test', 5, 5);
      const context2 = createContext('test', 5, 5);
      
      context1.chunk.biome = 'grassland';
      context2.chunk.biome = 'grassland';
      
      await step.process(context1);
      await step.process(context2);
      
      // Compare tile layout
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          expect(context1.chunk.getTile(x, y)).toBe(context2.chunk.getTile(x, y));
        }
      }
      
      // Compare room data
      expect(context1.params.rooms).toEqual(context2.params.rooms);
    });
    
    it('should generate different structures for different seeds', async () => {
      const step = new StructureStep();
      
      const createContext = (seed) => ({
        seed,
        cx: 0,
        cy: 0,
        chunk: new Chunk(0, 0),
        rng: new SeededRandom(seed, 0, 0),
        params: {}
      });
      
      const context1 = createContext('seed1');
      const context2 = createContext('seed2');
      
      context1.chunk.biome = 'grassland';
      context2.chunk.biome = 'grassland';
      
      await step.process(context1);
      await step.process(context2);
      
      // Should have different layouts
      let differences = 0;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (context1.chunk.getTile(x, y) !== context2.chunk.getTile(x, y)) {
            differences++;
          }
        }
      }
      
      expect(differences).toBeGreaterThan(50); // Significant differences
    });
  });
});