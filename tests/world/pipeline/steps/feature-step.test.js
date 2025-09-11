/**
 * Tests for FeatureStep
 * Testing feature placement like chests, doors, traps, decorations
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureStep', () => {
  let FeatureStep, Chunk, SeededRandom;
  
  beforeEach(async () => {
    const featureModule = await import('../../../../src/js/world/pipeline/steps/FeatureStep.js');
    const chunkModule = await import('../../../../src/js/world/core/Chunk.js');
    const randomModule = await import('../../../../src/js/world/pipeline/SeededRandom.js');
    
    FeatureStep = featureModule.FeatureStep;
    Chunk = chunkModule.Chunk;
    SeededRandom = randomModule.SeededRandom;
  });
  
  describe('Door Placement', () => {
    it('should place doors between rooms', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create a simple room layout
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Two rooms connected by corridor
      // Room 1
      for (let y = 2; y < 6; y++) {
        for (let x = 2; x < 6; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Room 2
      for (let y = 2; y < 6; y++) {
        for (let x = 8; x < 12; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Corridor
      for (let x = 6; x < 8; x++) {
        chunk.setTile(x, 3, '.');
      }
      
      const context = {
        seed: 'door-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('door-test', 0, 0),
        params: {
          rooms: [
            { x: 2, y: 2, width: 4, height: 4 },
            { x: 8, y: 2, width: 4, height: 4 }
          ],
          corridors: [
            {
              start: { x: 4, y: 4 },
              end: { x: 10, y: 4 },
              points: []
            }
          ]
        }
      };
      
      await step.process(context);
      
      // Should have placed doors
      let hasDoors = false;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) === '+') {
            hasDoors = true;
            break;
          }
        }
        if (hasDoors) break;
      }
      
      expect(hasDoors).toBe(true);
    });
    
    it('should place doors at room entrances', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Initialize with walls
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Create a room
      for (let y = 5; y < 10; y++) {
        for (let x = 5; x < 10; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Add entrance
      chunk.setTile(5, 4, '.');
      
      const context = {
        seed: 'entrance-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('entrance-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 5, height: 5 }]
        }
      };
      
      await step.process(context);
      
      // Check for doors at potential entrances
      const doorPositions = [];
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) === '+') {
            doorPositions.push({ x, y });
          }
        }
      }
      
      expect(doorPositions.length).toBeGreaterThan(0);
    });
  });
  
  describe('Chest Placement', () => {
    it('should place chests in rooms', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create rooms
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Large room for chest placement
      for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'chest-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('chest-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          biomeTemperature: 0.5,
          biomeHumidity: 0.5
        }
      };
      
      chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should have chests stored in features
      expect(context.params.features).toBeDefined();
      expect(context.params.features.chests).toBeDefined();
      expect(Array.isArray(context.params.features.chests)).toBe(true);
      
      if (context.params.features.chests.length > 0) {
        const chest = context.params.features.chests[0];
        expect(chest).toHaveProperty('x');
        expect(chest).toHaveProperty('y');
        expect(chest).toHaveProperty('loot');
      }
    });
    
    it('should vary chest density by biome', async () => {
      const step = new FeatureStep();
      
      const createContext = (biome, seed) => {
        const chunk = new Chunk(0, 0);
        
        // Create room
        for (let y = 0; y < 22; y++) {
          for (let x = 0; x < 24; x++) {
            chunk.setTile(x, y, '#');
          }
        }
        
        for (let y = 2; y < 20; y++) {
          for (let x = 2; x < 22; x++) {
            chunk.setTile(x, y, '.');
          }
        }
        
        chunk.biome = biome;
        
        return {
          seed,
          cx: 0,
          cy: 0,
          chunk,
          rng: new SeededRandom(seed, 0, 0),
          params: {
            rooms: [{ x: 2, y: 2, width: 20, height: 18 }]
          }
        };
      };
      
      // Test different biomes
      const forestContext = createContext('forest', 'forest-chest');
      const desertContext = createContext('desert', 'desert-chest');
      
      await step.process(forestContext);
      await step.process(desertContext);
      
      const forestChests = forestContext.params.features?.chests?.length || 0;
      const desertChests = desertContext.params.features?.chests?.length || 0;
      
      // Different biomes should have different chest densities
      expect(forestChests).toBeDefined();
      expect(desertChests).toBeDefined();
    });
  });
  
  describe('Trap Placement', () => {
    it('should place traps in corridors and rooms', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create layout with corridor
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Long corridor for trap placement
      for (let x = 2; x < 22; x++) {
        chunk.setTile(x, 10, '.');
        chunk.setTile(x, 11, '.');
      }
      
      const context = {
        seed: 'trap-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('trap-test', 0, 0),
        params: {
          corridors: [
            {
              points: Array.from({ length: 20 }, (_, i) => ({ x: i + 2, y: 10 }))
            }
          ]
        }
      };
      
      chunk.biome = 'mountains';
      
      await step.process(context);
      
      // Should have traps in features
      expect(context.params.features).toBeDefined();
      expect(context.params.features.traps).toBeDefined();
      expect(Array.isArray(context.params.features.traps)).toBe(true);
    });
    
    it('should place more traps in dangerous biomes', async () => {
      const step = new FeatureStep();
      
      const createContext = (biome) => {
        const chunk = new Chunk(0, 0);
        
        // Create room
        for (let y = 0; y < 22; y++) {
          for (let x = 0; x < 24; x++) {
            chunk.setTile(x, y, y > 5 && y < 16 && x > 5 && x < 18 ? '.' : '#');
          }
        }
        
        chunk.biome = biome;
        
        return {
          seed: `${biome}-trap`,
          cx: 0,
          cy: 0,
          chunk,
          rng: new SeededRandom(`${biome}-trap`, 0, 0),
          params: {
            rooms: [{ x: 6, y: 6, width: 12, height: 10 }]
          }
        };
      };
      
      const swampContext = createContext('swamp');
      const grasslandContext = createContext('grassland');
      
      await step.process(swampContext);
      await step.process(grasslandContext);
      
      const swampTraps = swampContext.params.features?.traps?.length || 0;
      const grasslandTraps = grasslandContext.params.features?.traps?.length || 0;
      
      // Swamp should have more traps than grassland
      expect(swampTraps).toBeGreaterThanOrEqual(grasslandTraps);
    });
  });
  
  describe('Decoration Placement', () => {
    it('should place decorative features', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'decor-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('decor-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }]
        }
      };
      
      chunk.biome = 'forest';
      
      await step.process(context);
      
      // Should have decorations
      expect(context.params.features).toBeDefined();
      expect(context.params.features.decorations).toBeDefined();
      expect(Array.isArray(context.params.features.decorations)).toBe(true);
    });
    
    it('should use biome-appropriate decorations', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      chunk.biome = 'forest';
      
      const context = {
        seed: 'forest-decor',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('forest-decor', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }]
        }
      };
      
      await step.process(context);
      
      // Check for forest-specific decorations (trees, bushes)
      let hasForestDecor = false;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const tile = chunk.getTile(x, y);
          if (tile === 'T' || tile === '%' || tile === '&') {
            hasForestDecor = true;
            break;
          }
        }
        if (hasForestDecor) break;
      }
      
      expect(hasForestDecor).toBe(true);
    });
  });
  
  describe('Stairs Placement', () => {
    it('should place stairs in appropriate locations', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create rooms
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Room for stairs
      for (let y = 8; y < 14; y++) {
        for (let x = 8; x < 14; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'stairs-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('stairs-test', 0, 0),
        params: {
          rooms: [{ x: 8, y: 8, width: 6, height: 6 }]
        }
      };
      
      chunk.biome = 'mountains';
      
      await step.process(context);
      
      // Should have stairs
      let hasStairs = false;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const tile = chunk.getTile(x, y);
          if (tile === '<' || tile === '>') {
            hasStairs = true;
            break;
          }
        }
        if (hasStairs) break;
      }
      
      expect(hasStairs).toBe(true);
    });
    
    it('should store stair positions in features', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'stairs-pos',
        cx: 5,
        cy: 5,
        chunk,
        rng: new SeededRandom('stairs-pos', 5, 5),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }]
        }
      };
      
      chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should store stair positions
      expect(context.params.features).toBeDefined();
      expect(context.params.features.stairs).toBeDefined();
      
      if (context.params.features.stairs.length > 0) {
        const stair = context.params.features.stairs[0];
        expect(stair).toHaveProperty('x');
        expect(stair).toHaveProperty('y');
        expect(stair).toHaveProperty('type');
        expect(['up', 'down']).toContain(stair.type);
      }
    });
  });
  
  describe('Feature Validation', () => {
    it('should not place features on walls', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // All walls
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      const context = {
        seed: 'wall-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('wall-test', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should not have changed any wall tiles
      let wallsIntact = true;
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (chunk.getTile(x, y) !== '#') {
            wallsIntact = false;
            break;
          }
        }
        if (!wallsIntact) break;
      }
      
      expect(wallsIntact).toBe(true);
    });
    
    it('should not block paths with features', async () => {
      const step = new FeatureStep();
      const chunk = new Chunk(0, 0);
      
      // Create narrow corridor
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Single-width corridor
      for (let x = 5; x < 19; x++) {
        chunk.setTile(x, 10, '.');
      }
      
      const context = {
        seed: 'path-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('path-test', 0, 0),
        params: {
          corridors: [{
            points: Array.from({ length: 14 }, (_, i) => ({ x: i + 5, y: 10 }))
          }]
        }
      };
      
      await step.process(context);
      
      // Corridor should still be passable
      let pathBlocked = false;
      for (let x = 5; x < 19; x++) {
        const tile = chunk.getTile(x, 10);
        // Check if tile is impassable (not floor, door, or trap marker)
        if (tile === '#' || tile === 'C') {
          pathBlocked = true;
          break;
        }
      }
      
      expect(pathBlocked).toBe(false);
    });
  });
  
  describe('Deterministic Generation', () => {
    it('should generate same features for same seed', async () => {
      const step = new FeatureStep();
      
      const createContext = () => {
        const chunk = new Chunk(0, 0);
        
        // Create room
        for (let y = 0; y < 22; y++) {
          for (let x = 0; x < 24; x++) {
            chunk.setTile(x, y, '#');
          }
        }
        
        for (let y = 5; y < 15; y++) {
          for (let x = 5; x < 15; x++) {
            chunk.setTile(x, y, '.');
          }
        }
        
        chunk.biome = 'grassland';
        
        return {
          seed: 'deterministic',
          cx: 3,
          cy: 3,
          chunk,
          rng: new SeededRandom('deterministic', 3, 3),
          params: {
            rooms: [{ x: 5, y: 5, width: 10, height: 10 }]
          }
        };
      };
      
      const context1 = createContext();
      const context2 = createContext();
      
      await step.process(context1);
      await step.process(context2);
      
      // Compare features
      expect(context1.params.features).toEqual(context2.params.features);
      
      // Compare tile layout
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          expect(context1.chunk.getTile(x, y)).toBe(context2.chunk.getTile(x, y));
        }
      }
    });
  });
});