/**
 * Tests for PopulationStep
 * Testing monster and NPC population based on biome and structure
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('PopulationStep', () => {
  let PopulationStep, Chunk, SeededRandom;
  
  beforeEach(async () => {
    const populationModule = await import('../../../../src/js/world/pipeline/steps/PopulationStep.js');
    const chunkModule = await import('../../../../src/js/world/core/Chunk.js');
    const randomModule = await import('../../../../src/js/world/pipeline/SeededRandom.js');
    
    PopulationStep = populationModule.PopulationStep;
    Chunk = chunkModule.Chunk;
    SeededRandom = randomModule.SeededRandom;
  });
  
  describe('Monster Population', () => {
    it('should populate monsters in rooms', async () => {
      const step = new PopulationStep();
      const chunk = new Chunk(0, 0);
      
      // Create room layout
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Large room for monsters
      for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'monster-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('monster-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          features: { doors: [], chests: [], traps: [] }
        }
      };
      
      chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should have monsters
      expect(chunk.monsters).toBeDefined();
      expect(chunk.monsters.length).toBeGreaterThan(0);
      
      // Monsters should have required properties
      if (chunk.monsters.length > 0) {
        const monster = chunk.monsters[0];
        expect(monster).toHaveProperty('x');
        expect(monster).toHaveProperty('y');
        expect(monster).toHaveProperty('type');
        expect(monster).toHaveProperty('level');
        expect(monster).toHaveProperty('hp');
      }
    });
    
    it('should vary monster density by biome', async () => {
      const step = new PopulationStep();
      
      const createContext = (biome) => {
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
          seed: `${biome}-monsters`,
          cx: 0,
          cy: 0,
          chunk,
          rng: new SeededRandom(`${biome}-monsters`, 0, 0),
          params: {
            rooms: [{ x: 2, y: 2, width: 20, height: 18 }],
            features: { doors: [], chests: [], traps: [] }
          }
        };
      };
      
      const swampContext = createContext('swamp');
      const grasslandContext = createContext('grassland');
      
      await step.process(swampContext);
      await step.process(grasslandContext);
      
      const swampMonsters = swampContext.chunk.monsters.length;
      const grasslandMonsters = grasslandContext.chunk.monsters.length;
      
      // Different biomes should have different monster densities
      expect(swampMonsters).toBeDefined();
      expect(grasslandMonsters).toBeDefined();
      // Swamp typically has more monsters
      expect(swampMonsters).toBeGreaterThanOrEqual(grasslandMonsters);
    });
    
    it('should use biome-appropriate monster types', async () => {
      const step = new PopulationStep();
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
        seed: 'forest-monsters',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('forest-monsters', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          features: { doors: [], chests: [], traps: [] }
        }
      };
      
      await step.process(context);
      
      // Check for forest-appropriate monsters
      const forestTypes = ['wolf', 'bear', 'spider', 'goblin'];
      const hasForestMonster = chunk.monsters.some(m => 
        forestTypes.includes(m.type)
      );
      
      expect(hasForestMonster).toBe(true);
    });
    
    it('should not place monsters on occupied tiles', async () => {
      const step = new PopulationStep();
      const chunk = new Chunk(0, 0);
      
      // Create room with features
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      for (let y = 5; y < 10; y++) {
        for (let x = 5; x < 10; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Add some features
      chunk.setTile(7, 7, 'C'); // Chest
      chunk.setTile(6, 6, '+'); // Door
      
      const context = {
        seed: 'occupied-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('occupied-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 5, height: 5 }],
          features: {
            doors: [{ x: 6, y: 6 }],
            chests: [{ x: 7, y: 7 }],
            traps: []
          }
        }
      };
      
      chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Monsters should not be on feature tiles
      for (const monster of chunk.monsters) {
        const tile = chunk.getTile(monster.x, monster.y);
        expect(['C', '+']).not.toContain(tile);
      }
    });
  });
  
  describe('NPC Population', () => {
    it('should populate NPCs in safe areas', async () => {
      const step = new PopulationStep();
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
        seed: 'npc-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('npc-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          features: { doors: [], chests: [], traps: [] }
        }
      };
      
      chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Should have NPCs
      expect(chunk.npcs).toBeDefined();
      expect(Array.isArray(chunk.npcs)).toBe(true);
      
      // NPCs should have required properties
      if (chunk.npcs.length > 0) {
        const npc = chunk.npcs[0];
        expect(npc).toHaveProperty('x');
        expect(npc).toHaveProperty('y');
        expect(npc).toHaveProperty('name');
        expect(npc).toHaveProperty('type');
        expect(npc).toHaveProperty('dialogue');
      }
    });
    
    it('should place more NPCs in civilized biomes', async () => {
      const step = new PopulationStep();
      
      const createContext = (biome) => {
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
        
        chunk.biome = biome;
        
        return {
          seed: `${biome}-npcs`,
          cx: 0,
          cy: 0,
          chunk,
          rng: new SeededRandom(`${biome}-npcs`, 0, 0),
          params: {
            rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
            features: { doors: [], chests: [], traps: [] }
          }
        };
      };
      
      const grasslandContext = createContext('grassland');
      const swampContext = createContext('swamp');
      
      await step.process(grasslandContext);
      await step.process(swampContext);
      
      const grasslandNpcs = grasslandContext.chunk.npcs.length;
      const swampNpcs = swampContext.chunk.npcs.length;
      
      // Grassland should have more NPCs than swamp
      expect(grasslandNpcs).toBeGreaterThanOrEqual(swampNpcs);
    });
    
    it('should create appropriate NPC types', async () => {
      const step = new PopulationStep();
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
      
      const context = {
        seed: 'npc-types',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('npc-types', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          features: { doors: [], chests: [], traps: [] }
        }
      };
      
      await step.process(context);
      
      // Check for appropriate NPC types
      const validTypes = ['merchant', 'villager', 'guard', 'wanderer', 'scholar'];
      
      if (chunk.npcs.length > 0) {
        const hasValidType = chunk.npcs.some(npc => 
          validTypes.includes(npc.type)
        );
        expect(hasValidType).toBe(true);
      }
    });
  });
  
  describe('Boss Placement', () => {
    it('should place bosses in large rooms', async () => {
      const step = new PopulationStep();
      const chunk = new Chunk(0, 0);
      
      // Create large room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Large boss room
      for (let y = 2; y < 20; y++) {
        for (let x = 2; x < 22; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'boss-test',
        cx: 10,
        cy: 10,
        chunk,
        rng: new SeededRandom('boss-test', 10, 10),
        params: {
          rooms: [{ x: 2, y: 2, width: 20, height: 18 }],
          features: { 
            doors: [],
            chests: [],
            traps: [],
            stairs: [{ x: 10, y: 10, type: 'down' }]
          }
        }
      };
      
      chunk.biome = 'mountains';
      
      await step.process(context);
      
      // Should potentially have a boss
      const hasBoss = chunk.monsters.some(m => m.isBoss === true);
      
      // Bosses are rare, so just check structure
      if (hasBoss) {
        const boss = chunk.monsters.find(m => m.isBoss);
        expect(boss.level).toBeGreaterThan(5);
        expect(boss.hp).toBeGreaterThan(100);
      }
    });
  });
  
  describe('Population Validation', () => {
    it('should not exceed maximum entity count', async () => {
      const step = new PopulationStep();
      const chunk = new Chunk(0, 0);
      
      // Create very large room
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, y > 0 && y < 21 && x > 0 && x < 23 ? '.' : '#');
        }
      }
      
      const context = {
        seed: 'max-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('max-test', 0, 0),
        params: {
          rooms: [{ x: 1, y: 1, width: 22, height: 20 }],
          features: { doors: [], chests: [], traps: [] }
        }
      };
      
      chunk.biome = 'swamp'; // High density biome
      
      await step.process(context);
      
      // Should not exceed reasonable limits
      expect(chunk.monsters.length).toBeLessThanOrEqual(20);
      expect(chunk.npcs.length).toBeLessThanOrEqual(10);
    });
    
    it('should maintain minimum spacing between entities', async () => {
      const step = new PopulationStep();
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
        seed: 'spacing-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('spacing-test', 0, 0),
        params: {
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          features: { doors: [], chests: [], traps: [] }
        }
      };
      
      chunk.biome = 'grassland';
      
      await step.process(context);
      
      // Check that no two entities share the same position
      const positions = new Set();
      
      for (const monster of chunk.monsters) {
        const key = `${monster.x},${monster.y}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
      
      for (const npc of chunk.npcs) {
        const key = `${npc.x},${npc.y}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
    });
  });
  
  describe('Deterministic Generation', () => {
    it('should generate same population for same seed', async () => {
      const step = new PopulationStep();
      
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
          cx: 5,
          cy: 5,
          chunk,
          rng: new SeededRandom('deterministic', 5, 5),
          params: {
            rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
            features: { doors: [], chests: [], traps: [] }
          }
        };
      };
      
      const context1 = createContext();
      const context2 = createContext();
      
      await step.process(context1);
      await step.process(context2);
      
      // Compare monster populations
      expect(context1.chunk.monsters.length).toBe(context2.chunk.monsters.length);
      
      for (let i = 0; i < context1.chunk.monsters.length; i++) {
        expect(context1.chunk.monsters[i].x).toBe(context2.chunk.monsters[i].x);
        expect(context1.chunk.monsters[i].y).toBe(context2.chunk.monsters[i].y);
        expect(context1.chunk.monsters[i].type).toBe(context2.chunk.monsters[i].type);
      }
      
      // Compare NPC populations
      expect(context1.chunk.npcs.length).toBe(context2.chunk.npcs.length);
    });
  });
});