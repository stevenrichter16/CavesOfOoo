/**
 * Tests for Chunk Data Model
 * Testing the core chunk representation for the world system
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Constants that match the existing system
const W = 24; // Chunk width
const H = 22; // Chunk height

describe('Chunk Data Model', () => {
  
  describe('Basic Chunk Creation', () => {
    it('should create chunk with correct dimensions', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      expect(chunk.map).toBeDefined();
      expect(chunk.map.length).toBe(H);
      expect(chunk.map[0].length).toBe(W);
    });
    
    it('should initialize with all wall tiles', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          expect(chunk.map[y][x]).toBe('#');
        }
      }
    });
    
    it('should store chunk coordinates', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(5, -3);
      
      expect(chunk.cx).toBe(5);
      expect(chunk.cy).toBe(-3);
    });
    
    it('should initialize entity arrays', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      expect(chunk.monsters).toEqual([]);
      expect(chunk.items).toEqual([]);
      expect(chunk.npcs).toEqual([]);
    });
    
    it('should initialize metadata', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      expect(chunk.biome).toBeNull();
      expect(chunk.special).toBeNull();
      expect(chunk.features).toEqual([]);
      expect(chunk.metadata).toEqual({});
    });
  });
  
  describe('Tile Manipulation', () => {
    let Chunk;
    
    beforeEach(async () => {
      const module = await import('../../../src/js/world/core/Chunk.js');
      Chunk = module.Chunk;
    });
    
    it('should get tile at valid position', () => {
      const chunk = new Chunk(0, 0);
      chunk.map[5][10] = '.';
      
      expect(chunk.getTile(10, 5)).toBe('.');
    });
    
    it('should return null for out-of-bounds getTile', () => {
      const chunk = new Chunk(0, 0);
      
      expect(chunk.getTile(-1, 0)).toBeNull();
      expect(chunk.getTile(0, -1)).toBeNull();
      expect(chunk.getTile(W, 0)).toBeNull();
      expect(chunk.getTile(0, H)).toBeNull();
      expect(chunk.getTile(100, 100)).toBeNull();
    });
    
    it('should set tile at valid position', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(10, 5, '~');
      expect(chunk.map[5][10]).toBe('~');
      
      chunk.setTile(0, 0, '.');
      expect(chunk.map[0][0]).toBe('.');
      
      chunk.setTile(W-1, H-1, '·');
      expect(chunk.map[H-1][W-1]).toBe('·');
    });
    
    it('should ignore out-of-bounds setTile', () => {
      const chunk = new Chunk(0, 0);
      const originalMap = chunk.map.map(row => [...row]);
      
      chunk.setTile(-1, 0, '.');
      chunk.setTile(0, -1, '.');
      chunk.setTile(W, 0, '.');
      chunk.setTile(0, H, '.');
      chunk.setTile(100, 100, '.');
      
      // Map should be unchanged
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          expect(chunk.map[y][x]).toBe(originalMap[y][x]);
        }
      }
    });
  });
  
  describe('Passability Checks', () => {
    let Chunk;
    
    beforeEach(async () => {
      const module = await import('../../../src/js/world/core/Chunk.js');
      Chunk = module.Chunk;
    });
    
    it('should return true for passable tiles', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(0, 0, '.');
      expect(chunk.isPassable(0, 0)).toBe(true);
      
      chunk.setTile(1, 0, '·');
      expect(chunk.isPassable(1, 0)).toBe(true);
      
      chunk.setTile(2, 0, '~');
      expect(chunk.isPassable(2, 0)).toBe(true);
    });
    
    it('should return false for wall tiles', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(0, 0, '#');
      expect(chunk.isPassable(0, 0)).toBe(false);
      
      chunk.setTile(1, 0, '█');
      expect(chunk.isPassable(1, 0)).toBe(false);
      
      chunk.setTile(2, 0, '╬');
      expect(chunk.isPassable(2, 0)).toBe(false);
    });
    
    it('should handle out-of-bounds passability checks', () => {
      const chunk = new Chunk(0, 0);
      
      expect(chunk.isPassable(-1, 0)).toBe(false);
      expect(chunk.isPassable(0, -1)).toBe(false);
      expect(chunk.isPassable(W, 0)).toBe(false);
      expect(chunk.isPassable(0, H)).toBe(false);
    });
  });
  
  describe('Entity Management', () => {
    let Chunk;
    
    beforeEach(async () => {
      const module = await import('../../../src/js/world/core/Chunk.js');
      Chunk = module.Chunk;
    });
    
    it('should track monsters in array', () => {
      const chunk = new Chunk(0, 0);
      
      const monster = {
        type: 'skeleton',
        x: 5,
        y: 5,
        hp: 10,
        alive: true
      };
      
      chunk.monsters.push(monster);
      expect(chunk.monsters).toContain(monster);
      expect(chunk.monsters.length).toBe(1);
    });
    
    it('should track items in array', () => {
      const chunk = new Chunk(0, 0);
      
      const item = {
        type: 'potion',
        x: 10,
        y: 10,
        value: 50
      };
      
      chunk.items.push(item);
      expect(chunk.items).toContain(item);
      expect(chunk.items.length).toBe(1);
    });
    
    it('should track NPCs in array', () => {
      const chunk = new Chunk(0, 0);
      
      const npc = {
        id: 'vendor_1',
        name: 'Merchant',
        x: 12,
        y: 12
      };
      
      chunk.npcs.push(npc);
      expect(chunk.npcs).toContain(npc);
      expect(chunk.npcs.length).toBe(1);
    });
    
    it('should detect monster at position', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.monsters.push({
        x: 5,
        y: 5,
        alive: true
      });
      
      expect(chunk.hasEntityAt(5, 5)).toBe(true);
      expect(chunk.hasEntityAt(6, 5)).toBe(false);
    });
    
    it('should detect NPC at position', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.npcs.push({
        x: 10,
        y: 10
      });
      
      expect(chunk.hasEntityAt(10, 10)).toBe(true);
      expect(chunk.hasEntityAt(11, 10)).toBe(false);
    });
    
    it('should ignore dead monsters', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.monsters.push({
        x: 5,
        y: 5,
        alive: false
      });
      
      expect(chunk.hasEntityAt(5, 5)).toBe(false);
    });
    
    it('should handle multiple entities at same position', () => {
      const chunk = new Chunk(0, 0);
      
      // Add alive monster
      chunk.monsters.push({
        x: 5,
        y: 5,
        alive: true
      });
      
      // Add dead monster at same position
      chunk.monsters.push({
        x: 5,
        y: 5,
        alive: false
      });
      
      // Should still detect entity due to alive monster
      expect(chunk.hasEntityAt(5, 5)).toBe(true);
    });
  });
  
  describe('Empty Tile Finding', () => {
    let Chunk;
    
    beforeEach(async () => {
      const module = await import('../../../src/js/world/core/Chunk.js');
      Chunk = module.Chunk;
    });
    
    it('should find passable tiles', () => {
      const chunk = new Chunk(0, 0);
      
      // Create some passable tiles
      chunk.setTile(5, 5, '.');
      chunk.setTile(10, 10, '·');
      chunk.setTile(15, 15, '~');
      
      const emptyTiles = chunk.findEmptyTiles();
      
      expect(emptyTiles).toContainEqual({ x: 5, y: 5 });
      expect(emptyTiles).toContainEqual({ x: 10, y: 10 });
      expect(emptyTiles).toContainEqual({ x: 15, y: 15 });
      expect(emptyTiles.length).toBe(3);
    });
    
    it('should exclude occupied tiles', () => {
      const chunk = new Chunk(0, 0);
      
      // Create passable tiles
      chunk.setTile(5, 5, '.');
      chunk.setTile(10, 10, '.');
      
      // Add monster at (5, 5)
      chunk.monsters.push({
        x: 5,
        y: 5,
        alive: true
      });
      
      const emptyTiles = chunk.findEmptyTiles();
      
      expect(emptyTiles).not.toContainEqual({ x: 5, y: 5 });
      expect(emptyTiles).toContainEqual({ x: 10, y: 10 });
      expect(emptyTiles.length).toBe(1);
    });
    
    it('should return empty array when no empty tiles', () => {
      const chunk = new Chunk(0, 0);
      // All tiles are walls by default
      
      const emptyTiles = chunk.findEmptyTiles();
      
      expect(emptyTiles).toEqual([]);
    });
    
    it('should ignore dead monsters when finding empty tiles', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(5, 5, '.');
      
      // Add dead monster - shouldn't block tile
      chunk.monsters.push({
        x: 5,
        y: 5,
        alive: false
      });
      
      const emptyTiles = chunk.findEmptyTiles();
      
      expect(emptyTiles).toContainEqual({ x: 5, y: 5 });
    });
    
    it('should return coordinates in correct format', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.setTile(7, 3, '.');
      
      const emptyTiles = chunk.findEmptyTiles();
      
      expect(emptyTiles[0]).toHaveProperty('x');
      expect(emptyTiles[0]).toHaveProperty('y');
      expect(emptyTiles[0].x).toBe(7);
      expect(emptyTiles[0].y).toBe(3);
    });
  });
  
  describe('Metadata and Features', () => {
    let Chunk;
    
    beforeEach(async () => {
      const module = await import('../../../src/js/world/core/Chunk.js');
      Chunk = module.Chunk;
    });
    
    it('should store biome information', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.biome = 'forest';
      expect(chunk.biome).toBe('forest');
      
      chunk.biome = 'desert';
      expect(chunk.biome).toBe('desert');
    });
    
    it('should store special chunk type', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.special = 'candy_market';
      expect(chunk.special).toBe('candy_market');
      
      chunk.special = 'graveyard';
      expect(chunk.special).toBe('graveyard');
    });
    
    it('should track applied features', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.features.push('water_pond');
      chunk.features.push('treasure_room');
      
      expect(chunk.features).toContain('water_pond');
      expect(chunk.features).toContain('treasure_room');
      expect(chunk.features.length).toBe(2);
    });
    
    it('should store arbitrary metadata', () => {
      const chunk = new Chunk(0, 0);
      
      chunk.metadata.questModified = true;
      chunk.metadata.generationTime = 42;
      chunk.metadata.customData = { foo: 'bar' };
      
      expect(chunk.metadata.questModified).toBe(true);
      expect(chunk.metadata.generationTime).toBe(42);
      expect(chunk.metadata.customData).toEqual({ foo: 'bar' });
    });
  });
  
  describe('Chunk Constants', () => {
    it('should export correct dimensions', async () => {
      const module = await import('../../../src/js/world/core/Chunk.js');
      
      expect(module.CHUNK_WIDTH).toBe(24);
      expect(module.CHUNK_HEIGHT).toBe(22);
    });
  });
});