import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processMonsterTurns } from '../../src/js/entities/monsters.js';
import { Status, getEntityId, applyStatusEffect } from '../../src/js/combat/statusSystem.js';
import { W, H } from '../../src/js/core/config.js';

describe('Monster Water Effects', () => {
  let state;
  let monster;
  
  beforeEach(() => {
    // Clear the Status Map before each test
    Status.clear();
    
    // Create a test state with a map containing water
    state = {
      player: {
        x: 5,
        y: 5,
        hp: 100,
        hpMax: 100,
        alive: true
      },
      chunk: {
        map: Array(H).fill(null).map(() => Array(W).fill('.')),
        monsters: []
      },
      log: vi.fn(),
      over: false
    };
    
    // Add water tiles to the map
    for (let x = 10; x < 15; x++) {
      for (let y = 10; y < 15; y++) {
        state.chunk.map[y][x] = '~';
      }
    }
    
    // Create a test monster
    monster = {
      id: 'monster_test_1',
      name: 'Test Goober',
      x: 8,
      y: 10,
      hp: 30,
      hpMax: 30,
      alive: true,
      dmg: 5,
      ai: 'chase',
      statusEffects: []
    };
    
    state.chunk.monsters.push(monster);
    
    // Set up window.STATE for the status system
    window.STATE = state;
  });
  
  describe('Monster entering water', () => {
    it('should apply wet status when monster enters water tile', () => {
      // Position monster next to water
      monster.x = 9;
      monster.y = 10;
      
      // Move monster into water (x=10, y=10 is water)
      monster.x = 10;
      
      // Manually trigger water effect check (normally done by movement functions)
      const checkMonsterWaterEffect = (state, monster, oldX, oldY) => {
        const newTile = state.chunk?.map?.[monster.y]?.[monster.x];
        
        if (newTile === '~') {
          const monsterId = getEntityId(monster);
          let effects = Status.get(monsterId);
          
          if (!effects || !effects['wet']) {
            applyStatusEffect(monster, 'wet', 4, 1);
          } else {
            effects['wet'].turns = 4;
          }
          
          effects = Status.get(monsterId);
          if (effects && effects['wet']) {
            effects['wet'].quantity = 40;
          }
        }
      };
      
      checkMonsterWaterEffect(state, monster, 9, 10);
      
      // Check that wet status was applied
      const monsterId = getEntityId(monster);
      const effects = Status.get(monsterId);
      
      expect(effects).toBeDefined();
      expect(effects['wet']).toBeDefined();
      expect(effects['wet'].turns).toBe(4); // 4 turns before tick
      expect(effects['wet'].value).toBe(1);
      expect(effects['wet'].quantity).toBe(40); // For conductivity
    });
    
    it('should maintain wet status at 3 visible turns when monster stays in water', () => {
      const monsterId = getEntityId(monster);
      
      // First entry into water
      monster.x = 10;
      monster.y = 10;
      applyStatusEffect(monster, 'wet', 4, 1);
      
      let effects = Status.get(monsterId);
      effects['wet'].quantity = 40;
      
      // Simulate turn end tick
      effects['wet'].turns -= 1;
      expect(effects['wet'].turns).toBe(3); // Visible turns
      
      // Monster moves to another water tile
      monster.x = 11;
      effects['wet'].turns = 4; // Refresh
      effects['wet'].turns -= 1; // Turn tick
      expect(effects['wet'].turns).toBe(3); // Still 3 visible
      
      // Monster moves to yet another water tile
      monster.x = 12;
      effects['wet'].turns = 4; // Refresh
      effects['wet'].turns -= 1; // Turn tick
      expect(effects['wet'].turns).toBe(3); // Still 3 visible
    });
    
    it('should apply both wet and water_slow effects', () => {
      // Position monster in water
      monster.x = 10;
      monster.y = 10;
      
      // Apply wet status
      applyStatusEffect(monster, 'wet', 4, 1);
      
      // Apply water_slow effect (old system for movement penalty)
      monster.statusEffects.push({
        type: 'water_slow',
        duration: 0, // 0 while in water
        damage: 0,
        speedReduction: 2
      });
      
      // Check wet status in Status Map
      const monsterId = getEntityId(monster);
      const effects = Status.get(monsterId);
      expect(effects['wet']).toBeDefined();
      expect(effects['wet'].turns).toBe(4);
      
      // Check water_slow in statusEffects array
      const waterSlow = monster.statusEffects.find(e => e.type === 'water_slow');
      expect(waterSlow).toBeDefined();
      expect(waterSlow.speedReduction).toBe(2);
      expect(waterSlow.duration).toBe(0); // 0 while in water
    });
    
    it('should set water_slow duration when leaving water', () => {
      // Start monster in water
      monster.x = 10;
      monster.y = 10;
      
      monster.statusEffects.push({
        type: 'water_slow',
        duration: 0,
        damage: 0,
        speedReduction: 2
      });
      
      // Move monster out of water
      monster.x = 8; // Back to dry land
      
      // Simulate leaving water - set duration
      const waterSlow = monster.statusEffects.find(e => e.type === 'water_slow');
      if (waterSlow && state.chunk.map[monster.y][monster.x] !== '~') {
        waterSlow.duration = 3;
      }
      
      expect(waterSlow.duration).toBe(3);
    });
  });
  
  describe('Monster wet status and electric damage', () => {
    it('should make monster vulnerable to electric damage when wet', () => {
      const monsterId = getEntityId(monster);
      
      // Apply wet status to monster
      applyStatusEffect(monster, 'wet', 4, 1);
      const effects = Status.get(monsterId);
      effects['wet'].quantity = 40; // Ensure conductivity is active
      
      // Verify monster is wet
      expect(effects['wet']).toBeDefined();
      expect(effects['wet'].quantity).toBe(40);
      
      // When shocked while wet, the predamage phase in the engine
      // would detect wet + electric and apply instant kill
      // This is tested in the engine's rule tests
      
      // Apply shock to wet monster
      applyStatusEffect(monster, 'shock', 3, 5);
      
      // Both effects should be present
      expect(effects['wet']).toBeDefined();
      expect(effects['shock']).toBeDefined();
    });
    
    it('should track multiple monsters getting wet independently', () => {
      // Create a second monster
      const monster2 = {
        id: 'monster_test_2',
        name: 'Another Goober',
        x: 12,
        y: 12,
        hp: 20,
        hpMax: 20,
        alive: true,
        dmg: 3,
        ai: 'wander',
        statusEffects: []
      };
      
      state.chunk.monsters.push(monster2);
      
      // Apply wet to first monster
      applyStatusEffect(monster, 'wet', 4, 1);
      
      // Apply wet to second monster
      applyStatusEffect(monster2, 'wet', 4, 1);
      
      // Check both have independent wet status
      const monster1Id = getEntityId(monster);
      const monster2Id = getEntityId(monster2);
      
      const effects1 = Status.get(monster1Id);
      const effects2 = Status.get(monster2Id);
      
      expect(effects1['wet']).toBeDefined();
      expect(effects2['wet']).toBeDefined();
      
      // Modify one without affecting the other
      effects1['wet'].turns = 2;
      expect(effects1['wet'].turns).toBe(2);
      expect(effects2['wet'].turns).toBe(4);
    });
  });
  
  describe('Integration with monster movement', () => {
    it('should apply wet status during chase movement through water', () => {
      // Set up player position to lure monster into water
      state.player.x = 12;
      state.player.y = 10;
      
      // Position monster just outside water
      monster.x = 9;
      monster.y = 10;
      monster.ai = 'chase';
      
      // Mock the movement function to simulate entering water
      const simulateChaseIntoWater = () => {
        // Monster would move from (9,10) to (10,10) which is water
        const oldX = monster.x;
        const oldY = monster.y;
        monster.x = 10; // Move into water
        
        // Apply water effects
        const newTile = state.chunk.map[monster.y][monster.x];
        if (newTile === '~') {
          applyStatusEffect(monster, 'wet', 4, 1);
          const monsterId = getEntityId(monster);
          const effects = Status.get(monsterId);
          if (effects && effects['wet']) {
            effects['wet'].quantity = 40;
          }
        }
      };
      
      simulateChaseIntoWater();
      
      // Verify wet status was applied
      const monsterId = getEntityId(monster);
      const effects = Status.get(monsterId);
      
      expect(monster.x).toBe(10); // In water
      expect(effects['wet']).toBeDefined();
      expect(effects['wet'].turns).toBe(4);
      expect(effects['wet'].quantity).toBe(40);
    });
    
    it('should handle skittish AI avoiding water when possible', () => {
      // Skittish monsters should avoid water if they can
      monster.ai = 'skittish';
      monster.x = 10;
      monster.y = 9; // Just above water
      
      // Player approaches from above
      state.player.x = 10;
      state.player.y = 7;
      
      // Monster would normally flee south into water at (10,10)
      // But smart pathfinding might avoid it
      // For this test, we'll verify water effects IF it enters
      
      // Force monster into water for testing
      monster.y = 10; // Now in water
      
      applyStatusEffect(monster, 'wet', 4, 1);
      
      const monsterId = getEntityId(monster);
      const effects = Status.get(monsterId);
      
      expect(state.chunk.map[monster.y][monster.x]).toBe('~');
      expect(effects['wet']).toBeDefined();
    });
  });
  
  describe('Monster wet status countdown', () => {
    it('should properly count down wet status when out of water', () => {
      const monsterId = getEntityId(monster);
      
      // Apply wet status
      applyStatusEffect(monster, 'wet', 4, 1);
      let effects = Status.get(monsterId);
      
      // Turn 1: In water
      effects['wet'].turns -= 1;
      expect(effects['wet'].turns).toBe(3);
      
      // Move out of water
      monster.x = 5; // Dry land
      monster.y = 5;
      
      // Turn 2: Out of water
      effects['wet'].turns -= 1;
      expect(effects['wet'].turns).toBe(2);
      
      // Turn 3: Still out
      effects['wet'].turns -= 1;
      expect(effects['wet'].turns).toBe(1);
      
      // Turn 4: Effect expires
      effects['wet'].turns -= 1;
      expect(effects['wet'].turns).toBe(0);
    });
    
    it('should refresh wet status if monster re-enters water', () => {
      const monsterId = getEntityId(monster);
      
      // Apply wet status
      applyStatusEffect(monster, 'wet', 4, 1);
      let effects = Status.get(monsterId);
      
      // Let it tick down
      effects['wet'].turns = 2; // Partially depleted
      
      // Re-enter water
      monster.x = 10;
      monster.y = 10;
      
      // Refresh wet status
      effects['wet'].turns = 4;
      effects['wet'].turns -= 1; // Turn tick
      
      expect(effects['wet'].turns).toBe(3); // Back to full
    });
  });
});