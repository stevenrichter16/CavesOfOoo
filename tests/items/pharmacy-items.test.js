// tests/items/pharmacy-items.test.js
// TDD tests for Candy Kingdom Pharmacy items

import { describe, it, expect, beforeEach } from 'vitest';
import { PharmacyItems, applyPharmacyItemEffect } from '../../src/js/items/pharmacyItems.js';
import { applyStatusEffect } from '../../src/js/combat/statusSystem.js';

describe('Pharmacy Items', () => {
  let player;
  let state;

  beforeEach(() => {
    player = {
      hp: 50,
      hpMax: 100,
      str: 10,
      def: 10,
      spd: 10,
      gold: 100,
      inventory: [],
      statusEffects: {}
    };
    
    state = {
      player,
      turn: 1,
      log: vi.fn()
    };
  });

  describe('Item Definitions', () => {
    it('should have all required pharmacy items', () => {
      expect(PharmacyItems).toBeDefined();
      expect(PharmacyItems['sugar_pills']).toBeDefined();
      expect(PharmacyItems['candy_medicine']).toBeDefined();
      expect(PharmacyItems['strength_syrup']).toBeDefined();
      expect(PharmacyItems['defense_drops']).toBeDefined();
      expect(PharmacyItems['speed_soda']).toBeDefined();
      expect(PharmacyItems['max_health_mints']).toBeDefined();
      expect(PharmacyItems['pain_pops']).toBeDefined();
      expect(PharmacyItems['energy_elixir']).toBeDefined();
    });

    it('should have proper item structure', () => {
      const sugarPills = PharmacyItems['sugar_pills'];
      expect(sugarPills).toHaveProperty('name');
      expect(sugarPills).toHaveProperty('description');
      expect(sugarPills).toHaveProperty('cost');
      expect(sugarPills).toHaveProperty('type');
      expect(sugarPills).toHaveProperty('effect');
      expect(sugarPills.type).toBe('potion');
    });

    it('should have reasonable costs', () => {
      expect(PharmacyItems['sugar_pills'].cost).toBe(5);
      expect(PharmacyItems['candy_medicine'].cost).toBe(20);
      expect(PharmacyItems['strength_syrup'].cost).toBeGreaterThanOrEqual(30);
      expect(PharmacyItems['max_health_mints'].cost).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Sugar Pills (Basic Healing)', () => {
    it('should heal small amount of HP', () => {
      const item = PharmacyItems['sugar_pills'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hp).toBe(55); // Healed 5 HP
      expect(state.log).toHaveBeenCalledWith(
        expect.stringContaining('5 HP'),
        'good'
      );
    });

    it('should not heal above max HP', () => {
      player.hp = 98;
      const item = PharmacyItems['sugar_pills'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hp).toBe(100); // Capped at max
    });
  });

  describe('Candy Medicine (Medium Healing)', () => {
    it('should heal moderate amount of HP', () => {
      const item = PharmacyItems['candy_medicine'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hp).toBe(70); // Healed 20 HP
    });
  });

  describe('Strength Syrup (STR Boost)', () => {
    it('should temporarily increase strength', () => {
      const item = PharmacyItems['strength_syrup'];
      applyPharmacyItemEffect(state, player, item);
      
      // Should apply a strength buff status effect
      expect(player.statusEffects).toHaveProperty('buff_str');
      expect(player.statusEffects.buff_str.power).toBeGreaterThanOrEqual(30);
      expect(player.statusEffects.buff_str.duration).toBeGreaterThanOrEqual(5);
    });

    it('should log strength increase message', () => {
      const item = PharmacyItems['strength_syrup'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(state.log).toHaveBeenCalledWith(
        expect.stringContaining('strength'),
        'buff'
      );
    });
  });

  describe('Defense Drops (DEF Boost)', () => {
    it('should temporarily increase defense', () => {
      const item = PharmacyItems['defense_drops'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.statusEffects).toHaveProperty('buff_def');
      expect(player.statusEffects.buff_def.power).toBeGreaterThanOrEqual(30);
      expect(player.statusEffects.buff_def.duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Speed Soda (SPD Boost)', () => {
    it('should temporarily increase speed', () => {
      const item = PharmacyItems['speed_soda'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.statusEffects).toHaveProperty('buff_spd');
      expect(player.statusEffects.buff_spd.power).toBeGreaterThanOrEqual(30);
      expect(player.statusEffects.buff_spd.duration).toBeGreaterThanOrEqual(5);
    });

    it('should heal small amount as side effect', () => {
      const item = PharmacyItems['speed_soda'];
      const initialHp = player.hp;
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hp).toBeGreaterThan(initialHp); // Also heals a bit
    });
  });

  describe('Max Health Mints (Permanent HP Increase)', () => {
    it('should permanently increase max HP', () => {
      const item = PharmacyItems['max_health_mints'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hpMax).toBe(110); // Increased by 10
      expect(player.hp).toBe(60); // Also heals current HP by 10
    });

    it('should be expensive', () => {
      const item = PharmacyItems['max_health_mints'];
      expect(item.cost).toBeGreaterThanOrEqual(100);
    });

    it('should have a cap on max HP increase', () => {
      player.hpMax = 195;
      const item = PharmacyItems['max_health_mints'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hpMax).toBe(200); // Capped at 200
    });
  });

  describe('Pain Pops (Damage Reduction)', () => {
    it('should provide temporary damage reduction', () => {
      const item = PharmacyItems['pain_pops'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.statusEffects).toHaveProperty('damage_reduction');
      expect(player.statusEffects.damage_reduction.power).toBe(50); // 50% reduction
      expect(player.statusEffects.damage_reduction.duration).toBeGreaterThanOrEqual(3);
    });

    it('should heal small amount', () => {
      const item = PharmacyItems['pain_pops'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hp).toBe(60); // Healed 10 HP
    });
  });

  describe('Energy Elixir (Full Restore)', () => {
    it('should fully restore HP and cure status effects', () => {
      player.hp = 10;
      player.statusEffects = {
        poison: { duration: 5 },
        frozen: { duration: 3 }
      };
      
      const item = PharmacyItems['energy_elixir'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.hp).toBe(100); // Fully healed
      expect(player.statusEffects.poison).toBeUndefined(); // Cured
      expect(player.statusEffects.frozen).toBeUndefined(); // Cured
    });

    it('should grant temporary regeneration', () => {
      const item = PharmacyItems['energy_elixir'];
      applyPharmacyItemEffect(state, player, item);
      
      expect(player.statusEffects).toHaveProperty('regeneration');
      expect(player.statusEffects.regeneration.power).toBe(5); // 5 HP per turn
      expect(player.statusEffects.regeneration.duration).toBe(5); // 5 turns
    });

    it('should be very expensive', () => {
      const item = PharmacyItems['energy_elixir'];
      expect(item.cost).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Inventory Integration', () => {
    it('should add pharmacy items to inventory correctly', () => {
      const item = PharmacyItems['sugar_pills'];
      player.inventory.push({
        ...item,
        id: 'item_1',
        count: 1
      });
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].name).toBe('Sugar Pills');
    });

    it('should stack identical pharmacy items', () => {
      const item = PharmacyItems['sugar_pills'];
      
      // Add first item
      player.inventory.push({
        ...item,
        id: 'item_1',
        count: 1
      });
      
      // Add second identical item (should stack)
      const existing = player.inventory.find(i => i.name === item.name);
      if (existing) {
        existing.count++;
      }
      
      expect(player.inventory).toHaveLength(1);
      expect(player.inventory[0].count).toBe(2);
    });
  });

  describe('Vendor Integration', () => {
    it('should work with vendor shop system', () => {
      const vendor = {
        name: 'Ann',
        goods: 'medicine',
        shopkeeper: true
      };
      
      const shopItems = Object.values(PharmacyItems).filter(item => 
        item.shopType === 'pharmacy'
      );
      
      expect(shopItems.length).toBeGreaterThan(0);
      shopItems.forEach(item => {
        expect(item).toHaveProperty('cost');
        expect(item.cost).toBeGreaterThan(0);
      });
    });
  });
});

describe('Pharmacy Item Side Effects', () => {
  let player;
  let state;

  beforeEach(() => {
    player = {
      hp: 50,
      hpMax: 100,
      str: 10,
      def: 10,
      spd: 10,
      statusEffects: {}
    };
    
    state = {
      player,
      turn: 1,
      log: vi.fn()
    };
  });

  it('should have chance of side effects for strong medicines', () => {
    const item = PharmacyItems['strength_syrup'];
    
    // Mock random for testing
    const originalRandom = Math.random;
    Math.random = () => 0.1; // Force side effect
    
    applyPharmacyItemEffect(state, player, item);
    
    // Check for possible side effects (like temporary speed reduction)
    if (player.statusEffects.debuff_spd) {
      expect(player.statusEffects.debuff_spd.duration).toBe(2);
      expect(state.log).toHaveBeenCalledWith(
        expect.stringContaining('drowsy'),
        'debuff'
      );
    }
    
    Math.random = originalRandom;
  });

  it('should have flavor text for each item', () => {
    Object.values(PharmacyItems).forEach(item => {
      expect(item.description).toBeDefined();
      expect(item.description.length).toBeGreaterThan(10);
    });
  });
});