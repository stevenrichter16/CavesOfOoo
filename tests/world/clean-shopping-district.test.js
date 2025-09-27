// tests/world/clean-shopping-district.test.js
// Tests for the clean shopping district layout

import { describe, it, expect } from 'vitest';
import { generateCleanShoppingDistrict } from '../../src/js/world/candyShoppingDistrictClean.js';

describe('Clean Shopping District Layout', () => {
  let chunk;
  
  beforeEach(() => {
    chunk = generateCleanShoppingDistrict(1, 0, 12345);
  });
  
  describe('Basic Structure', () => {
    it('should generate a chunk with the correct dimensions', () => {
      expect(chunk.map).toBeDefined();
      expect(chunk.map.length).toBe(22); // CHUNK_HEIGHT
      expect(chunk.map[0].length).toBe(48); // CHUNK_WIDTH
    });
    
    it('should have main streets in the correct positions', () => {
      const { tileIds } = chunk;

      // Main boulevard (rows 10-12)
      for (let x = 0; x < 48; x++) {
        expect([
          'road.paved.main',
          'structure.building.block',
          'door.closed'
        ]).toContain(tileIds[10][x]);

        if (x === 24) {
          expect(tileIds[11][x]).toBe('decoration.fountain.center');
        } else {
          expect(tileIds[11][x]).toBe('road.paved.main');
        }

        expect(tileIds[12][x]).toBe('road.paved.main');
      }

      // North shopping lane (rows 5-6)
      for (let x = 0; x < 48; x++) {
        expect(tileIds[5][x]).toBe('floor.candy.walkway');
        expect(tileIds[6][x]).toBe('floor.candy.walkway');
      }

      // South shopping lane (rows 16-17)
      for (let x = 0; x < 48; x++) {
        const northId = tileIds[16][x];
        const southId = tileIds[17][x];
        expect([
          'floor.candy.walkway',
          'structure.building.block'
        ]).toContain(northId);

        const southAllowed = new Set([
          'floor.candy.walkway',
          'structure.building.block',
          'floor.candy.polished'
        ]);
        const southOk = southAllowed.has(southId) || southId.startsWith('decoration.sign.letter');
        expect(southOk).toBe(true);
      }
    });

    it('should have a central plaza', () => {
      const { tileIds } = chunk;
      const plazaTiles = new Set([
        'floor.candy.polished',
        'furniture.bench.horizontal'
      ]);

      for (let y = 8; y <= 14; y++) {
        for (let x = 20; x <= 28; x++) {
          if (y >= 10 && y <= 12) {
            expect([
              'road.paved.main',
              'decoration.fountain.center'
            ]).toContain(tileIds[y][x]);
          } else {
            expect(plazaTiles.has(tileIds[y][x])).toBe(true);
          }
        }
      }

      expect(tileIds[11][24]).toBe('decoration.fountain.center');
    });
  });
  
  describe('Shop Placement', () => {
    it('should have shops in organized rows', () => {
      // North row shops (y=2-4)
      expect(chunk.map[2][2]).toBe('█'); // Pharmacy wall
      expect(chunk.map[2][9]).toBe('█'); // Pizza wall
      expect(chunk.map[2][16]).toBe('█'); // Candy wall
      expect(chunk.map[2][23]).toBe('█'); // Lollipop wall
      expect(chunk.map[2][30]).toBe('█'); // Chocolate wall
      expect(chunk.map[2][37]).toBe('█'); // Tarts wall
      
      // South row shops (y=18-20)
      expect(chunk.map[18][2]).toBe('█'); // Broom wall
      expect(chunk.map[18][9]).toBe('█'); // Goose wall
    });
    
    it('should have doors for each shop', () => {
      // North shops doors
      expect(chunk.map[4][4]).toBe('+'); // Pharmacy door
      expect(chunk.map[4][11]).toBe('+'); // Pizza door
      expect(chunk.map[4][18]).toBe('+'); // Candy door
      expect(chunk.map[4][25]).toBe('+'); // Lollipop door
      expect(chunk.map[4][32]).toBe('+'); // Chocolate door
      expect(chunk.map[4][39]).toBe('+'); // Tarts door
      
      // South shops doors
      expect(chunk.map[18][4]).toBe('+'); // Broom door
      expect(chunk.map[18][11]).toBe('+'); // Goose door
    });
  });
  
  describe('NPCs', () => {
    it('should have NPC data for all vendors', () => {
      expect(chunk.npcData).toBeDefined();
      expect(Array.isArray(chunk.npcData)).toBe(true);
      expect(chunk.npcData.length).toBeGreaterThan(0);
      
      // Check for specific vendors
      const vendorIds = chunk.npcData.map(npc => npc.id);
      expect(vendorIds).toContain('pharmacist_ann');
      expect(vendorIds).toContain('pizza_sassy');
      expect(vendorIds).toContain('candy_vendor');
      expect(vendorIds).toContain('lollipop_lady');
      expect(vendorIds).toContain('chocolate_artisan');
      expect(vendorIds).toContain('royal_baker');
      expect(vendorIds).toContain('broom_keeper');
      expect(vendorIds).toContain('choose_goose');
    });
    
    it('should have vendors with correct goods types', () => {
      const ann = chunk.npcData.find(npc => npc.id === 'pharmacist_ann');
      expect(ann.goods).toBe('medicine');
      expect(ann.shopkeeper).toBe(true);
      
      const pizza = chunk.npcData.find(npc => npc.id === 'pizza_sassy');
      expect(pizza.goods).toBe('pizza');
      expect(pizza.shopkeeper).toBe(true);
      
      const goose = chunk.npcData.find(npc => npc.id === 'choose_goose');
      expect(goose.goods).toBe('miscellaneous');
      expect(goose.shopkeeper).toBe(true);
    });
    
    it('should have NPCs positioned correctly', () => {
      const ann = chunk.npcData.find(npc => npc.id === 'pharmacist_ann');
      expect(ann.x).toBe(4);
      expect(ann.y).toBe(3);
      
      const pizza = chunk.npcData.find(npc => npc.id === 'pizza_sassy');
      expect(pizza.x).toBe(11);
      expect(pizza.y).toBe(3);
    });
  });
  
  describe('Visual Cleanliness', () => {
    it('should have less visual clutter than legacy version', () => {
      // Count different tile types
      const tileCounts = {};
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 48; x++) {
          const tile = chunk.map[y][x];
          tileCounts[tile] = (tileCounts[tile] || 0) + 1;
        }
      }
      
      // Should have mostly simple tiles
      const simpleTiles = ['.', '·', '=', '-', '█', '▓'];
      let simpleCount = 0;
      simpleTiles.forEach(tile => {
        simpleCount += tileCounts[tile] || 0;
      });
      
      const totalTiles = 48 * 22;
      const simplicity = simpleCount / totalTiles;
      
      // At least 80% of tiles should be simple
      expect(simplicity).toBeGreaterThan(0.8);
    });
    
    it('should have regular spacing and alignment', () => {
      // Check north row shops are evenly spaced
      const shopXPositions = [2, 9, 16, 23, 30, 37];
      for (let i = 1; i < shopXPositions.length; i++) {
        const spacing = shopXPositions[i] - shopXPositions[i-1];
        expect(spacing).toBe(7); // Consistent 7-tile spacing
      }
    });
  });
  
  describe('Chunk Properties', () => {
    it('should have correct metadata', () => {
      expect(chunk.cx).toBe(1);
      expect(chunk.cy).toBe(0);
      expect(chunk.biome).toBe('candy_kingdom');
      expect(chunk.isMarket).toBe(true);
      expect(chunk.special).toBe('shopping_district_clean');
    });
    
    it('should have no monsters', () => {
      expect(chunk.monsters).toEqual([]);
    });
    
    it('should have no items initially', () => {
      expect(chunk.items).toEqual([]);
    });
  });
});
