/**
 * Tests to verify issues found in code review
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Code Review Issues', () => {
  
  describe('Chunk Spatial Index Duplication Bug', () => {
    it('should not duplicate entities in spatial index when using addMonster', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const monster = { x: 5, y: 5, alive: true, type: 'skeleton' };
      
      // This should only add once to spatial index
      chunk.addMonster(monster);
      
      // Get entities at position
      const key = '5,5';
      const entities = chunk._entityIndex.get(key);
      
      // Should only have one entity, not duplicated
      expect(entities.size).toBe(1);
      expect(Array.from(entities)).toEqual([monster]);
    });
    
    it('should not duplicate NPCs in spatial index when using addNPC', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const npc = { x: 10, y: 10, id: 'vendor' };
      
      // This should only add once to spatial index
      chunk.addNPC(npc);
      
      // Get entities at position
      const key = '10,10';
      const entities = chunk._entityIndex.get(key);
      
      // Should only have one entity, not duplicated
      expect(entities.size).toBe(1);
      expect(Array.from(entities)).toEqual([npc]);
    });
    
    it('should handle direct array push correctly', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const monster = { x: 5, y: 5, alive: true };
      
      // Direct push (backward compatibility)
      chunk.monsters.push(monster);
      
      // Should be in spatial index
      expect(chunk.hasEntityAt(5, 5)).toBe(true);
      
      // Get entities at position
      const key = '5,5';
      const entities = chunk._entityIndex.get(key);
      
      // Should only have one entity
      expect(entities.size).toBe(1);
    });
  });
  
  describe('Chunk Entity Validation', () => {
    it('should handle entity without x,y gracefully in addMonster', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const invalidMonster = { alive: true, type: 'skeleton' };
      
      // Should not throw but also not add to index
      expect(() => chunk.addMonster(invalidMonster)).not.toThrow();
      
      // Should not be in spatial index
      const key = 'undefined,undefined';
      expect(chunk._entityIndex.has(key)).toBe(false);
    });
    
    it('should handle entity with out-of-bounds position', async () => {
      const { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const outOfBoundsMonster = { x: CHUNK_WIDTH + 5, y: CHUNK_HEIGHT + 5, alive: true };
      
      // Should add to arrays but spatial index will have out-of-bounds key
      chunk.addMonster(outOfBoundsMonster);
      
      // Entity is tracked but at invalid position
      expect(chunk.monsters).toContain(outOfBoundsMonster);
      
      // Should not affect normal bounds checking
      expect(chunk.hasEntityAt(CHUNK_WIDTH + 5, CHUNK_HEIGHT + 5)).toBe(true);
    });
  });
  
  describe('ChunkCache Stats Reset', () => {
    it('should reset statistics when cache is cleared', async () => {
      const { ChunkCache } = await import('../../../src/js/world/core/ChunkCache.js');
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      
      const cache = new ChunkCache(3);
      
      // Generate some stats
      cache.set(0, 0, new Chunk(0, 0));
      cache.get(0, 0); // Hit
      cache.get(1, 0); // Miss
      
      const statsBefore = cache.getStatistics();
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);
      
      // Clear cache
      cache.clear();
      
      // Stats should be reset
      const statsAfter = cache.getStatistics();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
      expect(statsAfter.evictions).toBe(0);
    });
  });
  
  describe('Backward Compatibility Edge Cases', () => {
    it('should handle mixed usage of push and addMonster', async () => {
      const { Chunk } = await import('../../../src/js/world/core/Chunk.js');
      const chunk = new Chunk(0, 0);
      
      const monster1 = { x: 5, y: 5, alive: true };
      const monster2 = { x: 6, y: 6, alive: true };
      
      // Mix direct push and addMonster
      chunk.monsters.push(monster1);
      chunk.addMonster(monster2);
      
      // Both should be in spatial index
      expect(chunk.hasEntityAt(5, 5)).toBe(true);
      expect(chunk.hasEntityAt(6, 6)).toBe(true);
      
      // No duplicates
      expect(chunk._entityIndex.get('5,5').size).toBe(1);
      expect(chunk._entityIndex.get('6,6').size).toBe(1);
    });
  });
});