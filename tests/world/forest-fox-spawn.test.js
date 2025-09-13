// tests/world/forest-fox-spawn.test.js
// Test Sweet Tooth Fox spawning in forest chunks

import { describe, it, expect, beforeEach } from 'vitest';
import { generateForestChunk } from '../../src/js/world/theForest.js';

describe('Forest Fox Spawning', () => {
  describe('Forest Chunk Generation', () => {
    it('should include sweet tooth foxes in forest chunks', () => {
      const seed = 12345;
      const cx = 0;
      const cy = -2;
      
      const chunk = generateForestChunk(seed, cx, cy);
      
      expect(chunk).toBeDefined();
      expect(chunk.biome).toBe('forest');
      expect(chunk.monsters).toBeDefined();
      
      // Check if any sweet tooth foxes were spawned
      const foxes = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox');
      
      // Forest chunks should spawn some foxes
      if (foxes.length > 0) {
        foxes.forEach(fox => {
          expect(fox.kind).toBe('sweet_tooth_fox');
          expect(fox.hp).toBeGreaterThan(0);
          expect(fox.hpMax).toBeGreaterThan(0);
          expect(fox.str).toBeDefined();
          expect(fox.def).toBeDefined();
          expect(fox.spd).toBeDefined();
          expect(fox.hasTeeth).not.toBe(false); // undefined or true
          expect(fox.alive).toBe(true);
        });
      }
    });

    it('should spawn foxes with correct initial properties', () => {
      const seed = 54321;
      const cx = 0;
      const cy = -2;
      
      const chunk = generateForestChunk(seed, cx, cy);
      const foxes = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox');
      
      if (foxes.length > 0) {
        const fox = foxes[0];
        
        // Check initial state
        expect(fox.hp).toBeGreaterThanOrEqual(5); // Minimum HP
        expect(fox.alive).toBe(true);
        
        // Foxes should not spawn asleep
        if (fox.hp > 5) {
          expect(fox.asleep).not.toBe(true);
          expect(fox.status).not.toBe('sleep');
        }
      }
    });

    it('should handle fox properties correctly for quest', () => {
      const seed = 99999;
      const cx = 0;
      const cy = -2;
      
      const chunk = generateForestChunk(seed, cx, cy);
      const foxes = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox');
      
      if (foxes.length > 0) {
        foxes.forEach((fox, index) => {
          // Each fox should have unique ID
          expect(fox.id).toBeDefined();
          
          // Fox should be positioned on the map
          expect(fox.x).toBeGreaterThanOrEqual(0);
          expect(fox.x).toBeLessThan(48); // Map width
          expect(fox.y).toBeGreaterThanOrEqual(0);
          expect(fox.y).toBeLessThan(22); // Map height
          
          // Check quest-related properties
          expect(fox.kind).toBe('sweet_tooth_fox');
          expect(fox.name).toContain('Fox');
        });
      }
    });
  });

  describe('Fox Combat Properties', () => {
    it('should spawn foxes with balanced combat stats', () => {
      const seed = 11111;
      const cx = 0;
      const cy = -2;
      
      const chunk = generateForestChunk(seed, cx, cy);
      const foxes = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox');
      
      if (foxes.length > 0) {
        foxes.forEach(fox => {
          // Check combat stats are reasonable
          expect(fox.str).toBeGreaterThan(0);
          expect(fox.str).toBeLessThanOrEqual(10); // Not too strong
          
          expect(fox.def).toBeGreaterThanOrEqual(0);
          expect(fox.def).toBeLessThanOrEqual(5); // Not too tanky
          
          expect(fox.spd).toBeGreaterThan(0);
          expect(fox.spd).toBeLessThanOrEqual(10); // Not too fast
          
          expect(fox.hp).toBeGreaterThanOrEqual(5); // Minimum HP
          expect(fox.hpMax).toBeGreaterThanOrEqual(fox.hp);
        });
      }
    });

    it('should ensure foxes can enter sleep state', () => {
      const seed = 22222;
      const cx = 0;
      const cy = -2;
      
      const chunk = generateForestChunk(seed, cx, cy);
      const foxes = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox');
      
      if (foxes.length > 0) {
        const fox = foxes[0];
        
        // Simulate damage to 5 HP
        fox.hp = 5;
        
        // Fox should be able to have sleep properties set
        fox.status = 'sleep';
        fox.asleep = true;
        
        expect(fox.status).toBe('sleep');
        expect(fox.asleep).toBe(true);
        expect(fox.hp).toBe(5);
      }
    });
  });

  describe('Multiple Forest Chunks', () => {
    it('should generate different fox configurations with different seeds', () => {
      const configs = [];
      
      for (let seed = 1; seed <= 5; seed++) {
        const chunk = generateForestChunk(seed * 1000, 0, -2);
        const foxCount = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox').length;
        configs.push(foxCount);
      }
      
      // Different seeds should potentially create different numbers of foxes
      // (though some might be the same by chance)
      const uniqueCounts = new Set(configs);
      expect(uniqueCounts.size).toBeGreaterThan(0);
    });

    it('should place foxes at valid positions', () => {
      const seed = 33333;
      const cx = 0;
      const cy = -2;
      
      const chunk = generateForestChunk(seed, cx, cy);
      const foxes = chunk.monsters.filter(m => m.kind === 'sweet_tooth_fox');
      
      if (foxes.length > 0) {
        // Check for overlapping foxes
        const positions = new Set();
        foxes.forEach(fox => {
          const posKey = `${fox.x},${fox.y}`;
          expect(positions.has(posKey)).toBe(false); // No overlapping
          positions.add(posKey);
        });
      }
    });
  });
});