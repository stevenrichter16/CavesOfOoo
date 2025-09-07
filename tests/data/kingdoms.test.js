import { describe, it, expect, beforeEach } from 'vitest';
import { KINGDOMS, getFactionDef, getKingdomById, getAllFactionIds } from '../../src/data/kingdoms/index.js';

describe('Kingdom Data Layer', () => {
  describe('Kingdom Structure', () => {
    it('should have all required Adventure Time kingdoms', () => {
      expect(KINGDOMS).toHaveProperty('candy');
      expect(KINGDOMS).toHaveProperty('fire');
      expect(KINGDOMS).toHaveProperty('ice');
      expect(KINGDOMS).toHaveProperty('slime');
    });

    it('should have valid structure for Candy Kingdom', () => {
      const candy = KINGDOMS.candy;
      
      // Required fields
      expect(candy.id).toBe('candy');
      expect(candy.name).toBe('Candy Kingdom');
      expect(candy.tags).toContain('sweet');
      expect(candy.tags).toContain('civilization');
      expect(candy.lawLevel).toBeGreaterThan(0.5);
      
      // Realm weights
      expect(candy.realmWeights).toHaveProperty('trust');
      expect(candy.realmWeights).toHaveProperty('respect');
      expect(candy.realmWeights).toHaveProperty('fear');
      expect(candy.realmWeights).toHaveProperty('law');
      expect(candy.realmWeights).toHaveProperty('rumor');
      
      // Terrain costs
      expect(candy.terrainCost).toHaveProperty('candy_road');
      expect(candy.terrainCost.candy_road).toBeLessThan(1);
      
      // Disguise uniforms
      expect(candy.disguiseUniforms).toContain('banana_guard');
      expect(candy.disguiseUniforms).toContain('candy_court');
      
      // Factions
      expect(candy.factions.length).toBeGreaterThan(0);
    });

    it('should have valid Candy Kingdom factions', () => {
      const candy = KINGDOMS.candy;
      
      // Find Banana Guards faction
      const bananaGuards = candy.factions.find(f => f.id === 'banana_guard');
      expect(bananaGuards).toBeDefined();
      expect(bananaGuards.name).toBe('Banana Guards');
      expect(bananaGuards.kind).toBe('state');
      expect(bananaGuards.values).toContain('order');
      expect(bananaGuards.values).toContain('loyalty');
      
      // Check relations
      expect(bananaGuards.relations).toHaveProperty('fire_court');
      expect(bananaGuards.relations.fire_court).toBeLessThan(0); // Negative relation
      
      // Find Candy Merchants
      const merchants = candy.factions.find(f => f.id === 'candy_merchants');
      expect(merchants).toBeDefined();
      expect(merchants.kind).toBe('guild');
      expect(merchants.values).toContain('profit');
    });

    it('should have valid Fire Kingdom structure', () => {
      const fire = KINGDOMS.fire;
      
      expect(fire.id).toBe('fire');
      expect(fire.name).toBe('Fire Kingdom');
      expect(fire.tags).toContain('fire');
      expect(fire.tags).toContain('hot');
      expect(fire.tags).toContain('authoritarian');
      
      // Fire Kingdom should have higher fear weight
      expect(fire.realmWeights.fear).toBeGreaterThan(1);
      
      // Check for Fire Court faction
      const fireCourt = fire.factions.find(f => f.id === 'fire_court');
      expect(fireCourt).toBeDefined();
      expect(fireCourt.taboos).toContain('ice_magic');
    });

    it('should have valid Ice Kingdom structure', () => {
      const ice = KINGDOMS.ice;
      
      expect(ice.id).toBe('ice');
      expect(ice.name).toBe('Ice Kingdom');
      expect(ice.tags).toContain('ice');
      expect(ice.tags).toContain('cold');
      
      // Ice and Fire should be hostile
      const iceCourt = ice.factions.find(f => f.id === 'ice_court');
      expect(iceCourt).toBeDefined();
      expect(iceCourt.relations.fire_court).toBeLessThan(-0.5);
    });

    it('should have valid Slime Kingdom structure', () => {
      const slime = KINGDOMS.slime;
      
      expect(slime.id).toBe('slime');
      expect(slime.name).toBe('Slime Kingdom');
      expect(slime.tags).toContain('slime');
      expect(slime.tags).toContain('gooey');
      
      const slimeCourt = slime.factions.find(f => f.id === 'slime_court');
      expect(slimeCourt).toBeDefined();
    });
  });

  describe('getFactionDef helper', () => {
    it('should find faction by ID', () => {
      const result = getFactionDef('banana_guard');
      expect(result).toBeDefined();
      expect(result.faction.id).toBe('banana_guard');
      expect(result.kingdom.id).toBe('candy');
    });

    it('should find faction from any kingdom', () => {
      const fireResult = getFactionDef('fire_court');
      expect(fireResult.kingdom.id).toBe('fire');
      
      const iceResult = getFactionDef('ice_citizens');
      expect(iceResult.kingdom.id).toBe('ice');
    });

    it('should return null for unknown faction', () => {
      const result = getFactionDef('unknown_faction');
      expect(result).toBeNull();
    });
  });

  describe('getKingdomById helper', () => {
    it('should return kingdom by ID', () => {
      const candy = getKingdomById('candy');
      expect(candy).toBeDefined();
      expect(candy.name).toBe('Candy Kingdom');
    });

    it('should return null for unknown kingdom', () => {
      const result = getKingdomById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('getAllFactionIds helper', () => {
    it('should return all faction IDs across kingdoms', () => {
      const factionIds = getAllFactionIds();
      
      expect(factionIds).toContain('banana_guard');
      expect(factionIds).toContain('fire_court');
      expect(factionIds).toContain('ice_court');
      expect(factionIds).toContain('slime_court');
      
      // No duplicates
      const uniqueIds = [...new Set(factionIds)];
      expect(uniqueIds.length).toBe(factionIds.length);
    });
  });

  describe('Cross-Kingdom Relations', () => {
    it('should have Fire vs Ice hostility', () => {
      const fireCourt = getFactionDef('fire_court');
      const iceCourt = getFactionDef('ice_court');
      
      expect(fireCourt.faction.relations.ice_court).toBeLessThan(-0.5);
      expect(iceCourt.faction.relations.fire_court).toBeLessThan(-0.5);
    });

    it('should have Candy Kingdom trade relations', () => {
      const candyMerchants = getFactionDef('candy_merchants');
      
      // Candy merchants should have some positive trade relations
      expect(candyMerchants.faction.relations.slime_traders).toBeGreaterThan(0);
    });
  });

  describe('Terrain Costs', () => {
    it('should have appropriate terrain costs per kingdom', () => {
      const fire = KINGDOMS.fire;
      const ice = KINGDOMS.ice;
      
      // Fire Kingdom: lava is easy, ice is hard
      expect(fire.terrainCost.lava).toBeLessThanOrEqual(4);
      expect(fire.terrainCost.ice).toBeGreaterThan(5);
      
      // Ice Kingdom: ice is easy, lava is hard
      expect(ice.terrainCost.ice).toBeLessThan(2);
      expect(ice.terrainCost.lava).toBeGreaterThan(5);
    });
  });

  describe('Disguise Uniforms', () => {
    it('should have appropriate disguises per kingdom', () => {
      const candy = KINGDOMS.candy;
      const fire = KINGDOMS.fire;
      
      expect(candy.disguiseUniforms).toContain('banana_guard');
      expect(fire.disguiseUniforms).toContain('fire_guard');
      expect(fire.disguiseUniforms).toContain('fire_court');
    });
  });

  describe('Values and Taboos', () => {
    it('should have faction-appropriate values', () => {
      const bananaGuard = getFactionDef('banana_guard');
      expect(bananaGuard.faction.values).toContain('order');
      expect(bananaGuard.faction.values).toContain('loyalty');
      
      const candyMerchants = getFactionDef('candy_merchants');
      expect(candyMerchants.faction.values).toContain('profit');
    });

    it('should have faction-appropriate taboos', () => {
      const fireCourt = getFactionDef('fire_court');
      expect(fireCourt.faction.taboos).toContain('ice_magic');
      expect(fireCourt.faction.taboos).toContain('insult_monarchy');
      
      const iceCourt = getFactionDef('ice_court');
      expect(iceCourt.faction.taboos).toContain('fire_magic');
    });
  });
});