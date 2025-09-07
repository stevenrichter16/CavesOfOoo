import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialIndex } from '../../src/social/movement/SpatialIndex.js';
import { NPC } from '../../src/social/npc.js';
import { performanceComparison } from '../../src/social/movement/SpatialIndexIntegration.js';

describe('SpatialIndex', () => {
  let index;
  
  beforeEach(() => {
    index = new SpatialIndex();
  });
  
  describe('Basic Operations', () => {
    it('should add and retrieve NPC at position', () => {
      const npc = new NPC({
        id: 'test1',
        name: 'Test NPC',
        x: 5,
        y: 10,
        hp: 100,
        factions: ['test']
      });
      
      index.add(npc);
      
      const found = index.getAt(5, 10);
      expect(found).toBe(npc);
      
      const notFound = index.getAt(6, 10);
      expect(notFound).toBeNull();
    });
    
    it('should handle multiple NPCs at same position', () => {
      const npc1 = new NPC({
        id: 'test1',
        name: 'NPC 1',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['test']
      });
      
      const npc2 = new NPC({
        id: 'test2',
        name: 'NPC 2',
        x: 5,
        y: 5,
        hp: 50,
        factions: ['test']
      });
      
      index.add(npc1);
      index.add(npc2);
      
      const all = index.getAllAt(5, 5);
      expect(all).toHaveLength(2);
      expect(all).toContain(npc1);
      expect(all).toContain(npc2);
    });
    
    it('should update NPC position', () => {
      const npc = new NPC({
        id: 'test1',
        name: 'Mobile NPC',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['test']
      });
      
      index.add(npc);
      expect(index.getAt(5, 5)).toBe(npc);
      
      // Move NPC
      npc.x = 10;
      npc.y = 10;
      index.update(npc);
      
      // Should not be at old position
      expect(index.getAt(5, 5)).toBeNull();
      
      // Should be at new position
      expect(index.getAt(10, 10)).toBe(npc);
    });
    
    it('should remove NPC', () => {
      const npc = new NPC({
        id: 'test1',
        name: 'Temporary NPC',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['test']
      });
      
      index.add(npc);
      expect(index.getAt(5, 5)).toBe(npc);
      
      index.remove(npc);
      expect(index.getAt(5, 5)).toBeNull();
    });
  });
  
  describe('Filtering', () => {
    it('should filter by hp', () => {
      const aliveNPC = new NPC({
        id: 'alive',
        name: 'Alive NPC',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['test']
      });
      
      const deadNPC = new NPC({
        id: 'dead',
        name: 'Dead NPC',
        x: 5,
        y: 5,
        hp: 0,
        factions: ['test']
      });
      
      index.add(aliveNPC);
      index.add(deadNPC);
      
      // Get only alive NPCs
      const alive = index.getAt(5, 5, { minHp: 1 });
      expect(alive).toBe(aliveNPC);
      
      // Get only dead NPCs
      const dead = index.getAt(5, 5, { hp: 0 });
      expect(dead).toBe(deadNPC);
    });
    
    it('should filter by chunk', () => {
      const npc1 = new NPC({
        id: 'chunk1',
        name: 'Chunk 1 NPC',
        x: 5,
        y: 5,
        hp: 100,
        chunkX: 0,
        chunkY: 0,
        factions: ['test']
      });
      
      const npc2 = new NPC({
        id: 'chunk2',
        name: 'Chunk 2 NPC',
        x: 5,
        y: 5,
        hp: 100,
        chunkX: 1,
        chunkY: 0,
        factions: ['test']
      });
      
      index.add(npc1);
      index.add(npc2);
      
      const inChunk0 = index.getAt(5, 5, { chunkX: 0, chunkY: 0 });
      expect(inChunk0).toBe(npc1);
      
      const inChunk1 = index.getAt(5, 5, { chunkX: 1, chunkY: 0 });
      expect(inChunk1).toBe(npc2);
    });
    
    it('should filter by faction', () => {
      const guardNPC = new NPC({
        id: 'guard',
        name: 'Guard',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['candy_guards']
      });
      
      const citizenNPC = new NPC({
        id: 'citizen',
        name: 'Citizen',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['candy_citizens']
      });
      
      index.add(guardNPC);
      index.add(citizenNPC);
      
      const guards = index.getAllAt(5, 5, { faction: 'candy_guards' });
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(guardNPC);
    });
  });
  
  describe('Radius Search', () => {
    it('should find NPCs within radius', () => {
      const npcs = [];
      
      // Create NPCs in a pattern
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const npc = new NPC({
            id: `npc_${x}_${y}`,
            name: `NPC at ${x},${y}`,
            x,
            y,
            hp: 100,
            factions: ['test']
          });
          npcs.push(npc);
          index.add(npc);
        }
      }
      
      // Search within radius 2 of (5, 5)
      const nearby = index.getWithinRadius(5, 5, 2);
      
      // Should find NPCs in a circle
      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.length).toBeLessThanOrEqual(13); // Max in radius 2
      
      // Verify all found NPCs are within radius
      for (const npc of nearby) {
        const dx = npc.x - 5;
        const dy = npc.y - 5;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeLessThanOrEqual(2);
      }
    });
  });
  
  describe('Rectangle Search', () => {
    it('should find NPCs in rectangle', () => {
      // Create grid of NPCs
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          index.add(new NPC({
            id: `npc_${x}_${y}`,
            name: `NPC at ${x},${y}`,
            x,
            y,
            hp: 100,
            factions: ['test']
          }));
        }
      }
      
      // Search in rectangle (3,3) to (6,6)
      const inRect = index.getInRectangle(3, 3, 6, 6);
      
      expect(inRect).toHaveLength(16); // 4x4 rectangle
      
      // Verify all NPCs are in rectangle
      for (const npc of inRect) {
        expect(npc.x).toBeGreaterThanOrEqual(3);
        expect(npc.x).toBeLessThanOrEqual(6);
        expect(npc.y).toBeGreaterThanOrEqual(3);
        expect(npc.y).toBeLessThanOrEqual(6);
      }
    });
  });
  
  describe('Performance', () => {
    it('should maintain O(1) lookup time', () => {
      // Create many NPCs
      const npcs = [];
      for (let i = 0; i < 1000; i++) {
        const npc = new NPC({
          id: `npc_${i}`,
          name: `NPC ${i}`,
          x: Math.floor(Math.random() * 100),
          y: Math.floor(Math.random() * 100),
          hp: 100,
          chunkX: 0,
          chunkY: 0,
          factions: ['test']
        });
        npcs.push(npc);
        index.add(npc);
      }
      
      // Measure lookup time
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const x = Math.floor(Math.random() * 100);
        const y = Math.floor(Math.random() * 100);
        index.getAt(x, y);
      }
      
      const duration = performance.now() - start;
      const avgTime = duration / iterations;
      
      // Average lookup should be very fast (< 0.1ms)
      expect(avgTime).toBeLessThan(0.1);
      
      // Check statistics
      const stats = index.getStats();
      expect(stats.lookups).toBe(iterations);
      expect(stats.totalNPCs).toBe(1000);
    });
    
    it('should be faster than linear search', () => {
      // Create test NPCs
      const npcs = [];
      for (let i = 0; i < 100; i++) {
        npcs.push(new NPC({
          id: `npc_${i}`,
          name: `NPC ${i}`,
          x: Math.floor(Math.random() * 48),
          y: Math.floor(Math.random() * 22),
          hp: Math.random() > 0.2 ? 100 : 0, // 80% alive
          chunkX: 0,
          chunkY: 0,
          factions: ['test']
        }));
      }
      
      const results = performanceComparison(npcs, 100);
      
      console.log('Performance Comparison:', {
        linearTime: results.linearSearch.time.toFixed(2) + 'ms',
        spatialTime: results.spatialIndex.time.toFixed(2) + 'ms',
        speedup: results.improvement.speedup
      });
      
      // Spatial index should be faster
      expect(results.spatialIndex.time).toBeLessThan(results.linearSearch.time);
    });
  });
  
  describe('Statistics', () => {
    it('should track performance metrics', () => {
      const npc = new NPC({
        id: 'test',
        name: 'Test',
        x: 5,
        y: 5,
        hp: 100,
        factions: ['test']
      });
      
      index.add(npc);
      
      // Perform some operations
      index.getAt(5, 5); // Hit
      index.getAt(6, 6); // Miss
      index.getAt(5, 5); // Hit
      
      const stats = index.getStats();
      
      expect(stats.lookups).toBe(3);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
      expect(stats.totalNPCs).toBe(1);
    });
  });
});