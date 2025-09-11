/**
 * Tests for ValidationStep
 * Testing chunk validation and error correction
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('ValidationStep', () => {
  let ValidationStep, Chunk, SeededRandom;
  
  beforeEach(async () => {
    const validationModule = await import('../../../../src/js/world/pipeline/steps/ValidationStep.js');
    const chunkModule = await import('../../../../src/js/world/core/Chunk.js');
    const randomModule = await import('../../../../src/js/world/pipeline/SeededRandom.js');
    
    ValidationStep = validationModule.ValidationStep;
    Chunk = chunkModule.Chunk;
    SeededRandom = randomModule.SeededRandom;
  });
  
  describe('Connectivity Validation', () => {
    it('should detect disconnected areas', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create two disconnected rooms
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Room 1
      for (let y = 2; y < 6; y++) {
        for (let x = 2; x < 6; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Room 2 (disconnected)
      for (let y = 10; y < 14; y++) {
        for (let x = 10; x < 14; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'disconnect-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('disconnect-test', 0, 0),
        params: {
          rooms: [
            { x: 2, y: 2, width: 4, height: 4 },
            { x: 10, y: 10, width: 4, height: 4 }
          ]
        }
      };
      
      await step.process(context);
      
      // Should detect and fix disconnection
      expect(context.params.validationResults).toBeDefined();
      expect(context.params.validationResults.connected).toBe(true);
    });
    
    it('should ensure all rooms are reachable', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create connected rooms
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Three rooms with corridors
      for (let y = 2; y < 6; y++) {
        for (let x = 2; x < 6; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      for (let y = 2; y < 6; y++) {
        for (let x = 10; x < 14; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Connect them
      for (let x = 6; x < 10; x++) {
        chunk.setTile(x, 3, '.');
      }
      
      const context = {
        seed: 'reachable-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('reachable-test', 0, 0),
        params: {
          rooms: [
            { x: 2, y: 2, width: 4, height: 4 },
            { x: 10, y: 2, width: 4, height: 4 }
          ]
        }
      };
      
      await step.process(context);
      
      expect(context.params.validationResults.connected).toBe(true);
      expect(context.params.validationResults.allRoomsReachable).toBe(true);
    });
  });
  
  describe('Entity Validation', () => {
    it('should validate entity positions', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
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
      
      // Add monsters with invalid positions
      chunk.monsters = [
        { x: 7, y: 7, type: 'goblin' }, // Valid
        { x: 0, y: 0, type: 'slime' },   // Invalid (on wall)
        { x: 100, y: 100, type: 'rat' }  // Invalid (out of bounds)
      ];
      
      const context = {
        seed: 'entity-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('entity-test', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should fix or remove invalid entities
      expect(chunk.monsters.every(m => {
        const tile = chunk.getTile(m.x, m.y);
        return m.x >= 0 && m.x < 24 && m.y >= 0 && m.y < 22 &&
               (tile === '.' || tile === '·');
      })).toBe(true);
    });
    
    it('should prevent entity overlap', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create room
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
      
      // Add overlapping entities
      chunk.monsters = [
        { x: 7, y: 7, type: 'goblin' },
        { x: 7, y: 7, type: 'slime' }  // Same position
      ];
      
      chunk.npcs = [
        { x: 7, y: 7, type: 'merchant' }  // Also same position
      ];
      
      const context = {
        seed: 'overlap-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('overlap-test', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should separate overlapping entities
      const positions = new Set();
      chunk.monsters.forEach(m => positions.add(`${m.x},${m.y}`));
      chunk.npcs.forEach(n => positions.add(`${n.x},${n.y}`));
      
      const totalEntities = chunk.monsters.length + chunk.npcs.length;
      expect(positions.size).toBe(totalEntities);
    });
  });
  
  describe('Tile Validation', () => {
    it('should fix invalid tile types', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Set some invalid tiles
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          if (x === 5 && y === 5) {
            chunk.setTile(x, y, 'X'); // Invalid tile
          } else if (x === 6 && y === 6) {
            // Directly set null to bypass validation
            chunk.map[y][x] = null; // Null tile
          } else {
            chunk.setTile(x, y, '#');
          }
        }
      }
      
      const context = {
        seed: 'tile-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('tile-test', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should replace invalid tiles with valid ones
      const validTiles = ['#', '.', '·', '~', '+', 'C', '^', '<', '>', 'T', '%', '&', 'o', '*', 'v', 'i'];
      
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const tile = chunk.getTile(x, y);
          expect(tile).toBeDefined();
          expect(tile).not.toBeNull();
        }
      }
    });
    
    it('should ensure borders are walls', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create chunk with open borders
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      const context = {
        seed: 'border-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('border-test', 0, 0),
        params: {
          edgeConnections: {
            north: [5],
            south: [10],
            east: [7],
            west: [12]
          }
        }
      };
      
      await step.process(context);
      
      // Borders should be walls except at connection points
      for (let x = 0; x < 24; x++) {
        if (!context.params.edgeConnections.north.includes(x)) {
          expect(chunk.getTile(x, 0)).toBe('#');
        }
        if (!context.params.edgeConnections.south.includes(x)) {
          expect(chunk.getTile(x, 21)).toBe('#');
        }
      }
      
      for (let y = 0; y < 22; y++) {
        if (!context.params.edgeConnections.west.includes(y)) {
          expect(chunk.getTile(0, y)).toBe('#');
        }
        if (!context.params.edgeConnections.east.includes(y)) {
          expect(chunk.getTile(23, y)).toBe('#');
        }
      }
    });
  });
  
  describe('Metadata Validation', () => {
    it('should ensure required metadata exists', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Minimal setup
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, y > 0 && y < 21 && x > 0 && x < 23 ? '.' : '#');
        }
      }
      
      const context = {
        seed: 'metadata-test',
        cx: 5,
        cy: 5,
        chunk,
        rng: new SeededRandom('metadata-test', 5, 5),
        params: {}
      };
      
      await step.process(context);
      
      // Should ensure metadata is complete
      expect(chunk.metadata).toBeDefined();
      expect(chunk.metadata.generated).toBe(true);
      expect(chunk.metadata.version).toBeDefined();
      expect(chunk.metadata.seed).toBe('metadata-test');
    });
    
    it('should validate biome assignment', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create chunk without biome
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      const context = {
        seed: 'biome-validate',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('biome-validate', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should assign default biome if missing
      expect(chunk.biome).toBeDefined();
      expect(['grassland', 'forest', 'desert', 'tundra', 'swamp', 'mountains']).toContain(chunk.biome);
    });
  });
  
  describe('Performance Validation', () => {
    it('should complete validation quickly', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create complex chunk
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, ((x + y) % 3 === 0) ? '#' : '.');
        }
      }
      
      // Add many entities
      chunk.monsters = Array.from({ length: 10 }, (_, i) => ({
        x: 5 + i,
        y: 5,
        type: 'goblin'
      }));
      
      chunk.npcs = Array.from({ length: 5 }, (_, i) => ({
        x: 5,
        y: 10 + i,
        type: 'villager'
      }));
      
      const context = {
        seed: 'performance-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('performance-test', 0, 0),
        params: {
          rooms: [
            { x: 2, y: 2, width: 20, height: 18 }
          ]
        }
      };
      
      const startTime = Date.now();
      await step.process(context);
      const endTime = Date.now();
      
      // Should complete within reasonable time (100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
  
  describe('Validation Results', () => {
    it('should report validation issues found', async () => {
      const step = new ValidationStep();
      const chunk = new Chunk(0, 0);
      
      // Create chunk with various issues
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          chunk.setTile(x, y, '#');
        }
      }
      
      // Disconnected rooms
      for (let y = 2; y < 5; y++) {
        for (let x = 2; x < 5; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      for (let y = 10; y < 13; y++) {
        for (let x = 10; x < 13; x++) {
          chunk.setTile(x, y, '.');
        }
      }
      
      // Invalid entity
      chunk.monsters = [
        { x: 0, y: 0, type: 'goblin' }
      ];
      
      const context = {
        seed: 'report-test',
        cx: 0,
        cy: 0,
        chunk,
        rng: new SeededRandom('report-test', 0, 0),
        params: {}
      };
      
      await step.process(context);
      
      // Should report issues found and fixed
      expect(context.params.validationResults).toBeDefined();
      expect(context.params.validationResults.issuesFound).toBeGreaterThan(0);
      expect(context.params.validationResults.issuesFixed).toBeGreaterThan(0);
    });
  });
});