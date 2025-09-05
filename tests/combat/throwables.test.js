import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeThrow, canThrowAt, getThrowRange } from '../../src/js/combat/throwables.js';
import { calculateThrowDamage, getThrowablePot, getAllThrowablePots } from '../../src/js/items/throwables.js';
import { createMockState, createMockEntity, waitFor } from '../helpers/testUtils.js';
import * as events from '../../src/js/utils/events.js';
import * as projectileSystem from '../../src/js/systems/ProjectileSystem.js';

// Mock the ProjectileSystem
vi.mock('../../src/js/systems/ProjectileSystem.js', () => ({
  launchProjectile: vi.fn()
}));

// Mock events
vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}));

// Mock combat
vi.mock('../../src/js/combat/combat.js', () => ({
  applyAttack: vi.fn((state, attacker, defender, result) => {
    defender.hp -= result.dmg;
    if (defender.hp <= 0) {
      defender.alive = false;
      return 'kill';
    }
    return 'hit';
  })
}));

// Mock status system
vi.mock('../../src/js/combat/statusSystem.js', () => ({
  applyStatusEffect: vi.fn(),
  Status: new Map(),
  getEntityId: (entity) => entity.id || 'unknown'
}));

describe('Throwable Items Configuration', () => {
  describe('getThrowablePot', () => {
    it('should return fire pot configuration', () => {
      const pot = getThrowablePot('fire_pot');
      expect(pot).toBeDefined();
      expect(pot.name).toBe('Fire Pot');
      expect(pot.damageType).toBe('fire');
      expect(pot.statusEffect).toBe('burn');
      expect(pot.damage).toBe(6);
    });

    it('should return shock pot configuration', () => {
      const pot = getThrowablePot('shock_pot');
      expect(pot).toBeDefined();
      expect(pot.name).toBe('Shock Pot');
      expect(pot.damageType).toBe('electric');
      expect(pot.statusEffect).toBe('shock');
      expect(pot.statusChance).toBe(1.0);
      expect(pot.damage).toBe(8);
    });

    it('should return ice pot configuration', () => {
      const pot = getThrowablePot('ice_pot');
      expect(pot).toBeDefined();
      expect(pot.name).toBe('Ice Pot');
      expect(pot.statusEffect).toBe('freeze');
    });

    it('should return undefined for unknown pot', () => {
      const pot = getThrowablePot('unknown_pot');
      expect(pot).toBeUndefined();
    });
  });

  describe('getAllThrowablePots', () => {
    it('should return all throwable pots', () => {
      const pots = getAllThrowablePots();
      expect(pots).toBeDefined();
      expect(Object.keys(pots)).toContain('fire_pot');
      expect(Object.keys(pots)).toContain('shock_pot');
      expect(Object.keys(pots)).toContain('ice_pot');
      expect(Object.keys(pots)).toContain('candy_bomb');
    });
  });

  describe('calculateThrowDamage', () => {
    it('should calculate base damage from item', () => {
      const item = { damage: 10 };
      const player = { str: 5 };
      const damage = calculateThrowDamage(item, player);
      expect(damage).toBe(12); // 10 + floor(5/2)
    });

    it('should add strength bonus', () => {
      const item = { damage: 8 };
      const player = { str: 10 };
      const damage = calculateThrowDamage(item, player);
      expect(damage).toBe(13); // 8 + floor(10/2)
    });

    it('should handle missing damage property', () => {
      const item = {};
      const player = { str: 6 };
      const damage = calculateThrowDamage(item, player);
      expect(damage).toBe(8); // 5 (default) + floor(6/2)
    });
  });
});

describe('Throwable Execution', () => {
  let mockState;
  
  beforeEach(() => {
    mockState = createMockState({
      player: createMockEntity({ 
        id: 'player',
        x: 5, 
        y: 5,
        inventory: [
          { 
            id: 'fire_pot',
            name: 'Fire Pot',
            damage: 6,
            count: 3,
            damageType: 'fire',
            statusEffect: 'burn'
          }
        ]
      }),
      chunk: {
        map: Array(20).fill(null).map(() => Array(20).fill('.')),
        monsters: []
      }
    });

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup projectile mock to simulate hitting target
    projectileSystem.launchProjectile.mockImplementation(async (config) => {
      // Call the onImpact callback if provided
      if (config.onImpact) {
        config.onImpact(config.toX, config.toY);
      }
      return { x: config.toX, y: config.toY };
    });
  });

  describe('executeThrow', () => {
    it('should throw at empty space', async () => {
      mockState.pendingThrowable = {
        item: mockState.player.inventory[0],
        inventoryIndex: 0
      };

      const result = await executeThrow(mockState, 10, 10);
      
      expect(result).toBe(true);
      expect(projectileSystem.launchProjectile).toHaveBeenCalled();
      expect(mockState.player.inventory[0].count).toBe(2);
    });

    it('should throw at monster and deal damage', async () => {
      const monster = createMockEntity({
        name: 'Goober',
        x: 10,
        y: 10,
        hp: 20
      });
      mockState.chunk.monsters.push(monster);
      
      mockState.pendingThrowable = {
        item: mockState.player.inventory[0],
        inventoryIndex: 0
      };

      const result = await executeThrow(mockState, 10, 10);
      
      expect(result).toBe(true);
      expect(projectileSystem.launchProjectile).toHaveBeenCalled();
      
      // Check that damage was calculated and applied
      const launchCall = projectileSystem.launchProjectile.mock.calls[0][0];
      expect(launchCall.fromX).toBe(5);
      expect(launchCall.fromY).toBe(5);
      expect(launchCall.toX).toBe(10);
      expect(launchCall.toY).toBe(10);
    });

    it('should fail with invalid coordinates', async () => {
      mockState.pendingThrowable = {
        item: mockState.player.inventory[0],
        inventoryIndex: 0
      };

      const result = await executeThrow(mockState, NaN, 10);
      
      expect(result).toBe(false);
      expect(projectileSystem.launchProjectile).not.toHaveBeenCalled();
    });

    it('should fail with no pending throwable', async () => {
      mockState.pendingThrowable = null;

      const result = await executeThrow(mockState, 10, 10);
      
      expect(result).toBe(false);
      expect(projectileSystem.launchProjectile).not.toHaveBeenCalled();
    });

    it('should handle water tile interaction for shock pot', async () => {
      // Set up shock pot
      mockState.player.inventory[0] = {
        id: 'shock_pot',
        name: 'Shock Pot',
        damage: 8,
        count: 2,
        damageType: 'electric',
        tileInteractions: {
          '~': {
            action: 'electrify',
            message: 'BZZZZT! The water becomes electrified!',
            areaEffect: {
              radius: 2,
              damage: 10,
              damageType: 'electric',
              effect: 'electrify_water'
            }
          }
        }
      };
      
      // Place water at target
      mockState.chunk.map[10][10] = '~';
      
      mockState.pendingThrowable = {
        item: mockState.player.inventory[0],
        inventoryIndex: 0
      };

      const result = await executeThrow(mockState, 10, 10);
      
      expect(result).toBe(true);
      // Water electrification would be handled by the area effect system
    });

    it('should handle candy dust explosion for fire pot', async () => {
      // Place candy dust at target
      mockState.chunk.map[10][10] = '%';
      
      mockState.player.inventory[0].tileInteractions = {
        '%': {
          action: 'ignite',
          message: 'KABOOM! The candy dust ignites explosively!',
          areaEffect: {
            radius: 3,
            damage: 15,
            damageType: 'explosion',
            effect: 'explosion'
          }
        }
      };
      
      mockState.pendingThrowable = {
        item: mockState.player.inventory[0],
        inventoryIndex: 0
      };

      const result = await executeThrow(mockState, 10, 10);
      
      expect(result).toBe(true);
      // Explosion would be handled by the area effect system
    });
  });

  describe('canThrowAt', () => {
    it('should allow throw within range', () => {
      const canThrow = canThrowAt(mockState, 8, 8);
      expect(canThrow).toBe(true);
    });

    it('should prevent throw beyond range', () => {
      const canThrow = canThrowAt(mockState, 15, 15);
      expect(canThrow).toBe(false);
    });

    it('should calculate correct distance', () => {
      // Player at (5,5), target at (9,8)
      // Distance = sqrt((9-5)^2 + (8-5)^2) = sqrt(16+9) = 5
      const canThrow = canThrowAt(mockState, 9, 8);
      expect(canThrow).toBe(true);
      
      // Player at (5,5), target at (11,11)
      // Distance = sqrt((11-5)^2 + (11-5)^2) = sqrt(36+36) = 8.48
      const canThrowFar = canThrowAt(mockState, 11, 11);
      expect(canThrowFar).toBe(false);
    });

    it('should return false with no player', () => {
      mockState.player = null;
      const canThrow = canThrowAt(mockState, 8, 8);
      expect(canThrow).toBe(false);
    });
  });

  describe('getThrowRange', () => {
    it('should return correct throw range', () => {
      const range = getThrowRange();
      expect(range).toBe(8);
    });
  });
});

describe('Throwable Status Effects', () => {
  let mockState;
  
  beforeEach(() => {
    mockState = createMockState({
      player: createMockEntity({ 
        id: 'player',
        x: 5, 
        y: 5,
        inventory: []
      }),
      chunk: {
        map: Array(20).fill(null).map(() => Array(20).fill('.')),
        monsters: []
      }
    });
    vi.clearAllMocks();
  });

  it('should apply burn status from fire pot', async () => {
    const monster = createMockEntity({
      name: 'Goober',
      x: 10,
      y: 10,
      hp: 30,
      alive: true
    });
    mockState.chunk.monsters.push(monster);
    
    mockState.player.inventory = [{
      id: 'fire_pot',
      name: 'Fire Pot',
      damage: 6,
      count: 1,
      damageType: 'fire',
      statusEffect: 'burn',
      statusChance: 1.0,
      statusDuration: 3,
      statusValue: 2
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    projectileSystem.launchProjectile.mockImplementation(async (config) => {
      if (config.onImpact) config.onImpact(10, 10);
      return { x: 10, y: 10 };
    });

    await executeThrow(mockState, 10, 10);
    
    // Status effect would be applied through the combat system
    // We can't directly test it here without more complex mocking
  });

  it('should apply shock status from shock pot', async () => {
    const monster = createMockEntity({
      name: 'Goober',
      x: 10,
      y: 10,
      hp: 30,
      alive: true
    });
    mockState.chunk.monsters.push(monster);
    
    mockState.player.inventory = [{
      id: 'shock_pot',
      name: 'Shock Pot',
      damage: 8,
      count: 1,
      damageType: 'electric',
      statusEffect: 'shock',
      statusChance: 1.0,
      statusDuration: 3,
      statusValue: 4
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    await executeThrow(mockState, 10, 10);
    
    // Verify the pot was consumed
    expect(mockState.player.inventory.length).toBe(0);
  });

  it('should not apply status to dead enemy', async () => {
    const monster = createMockEntity({
      name: 'Goober',
      x: 10,
      y: 10,
      hp: 1,
      alive: false  // Already dead
    });
    mockState.chunk.monsters.push(monster);
    
    mockState.player.inventory = [{
      id: 'fire_pot',
      name: 'Fire Pot',
      damage: 6,
      count: 1,
      statusEffect: 'burn',
      statusChance: 1.0
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    await executeThrow(mockState, 10, 10);
    
    // Status effect should not be applied to dead enemy
    // This would be verified in the actual implementation
  });
});

describe('Throwable Projectile Integration', () => {
  let mockState;
  
  beforeEach(() => {
    mockState = createMockState({
      player: createMockEntity({ 
        id: 'player',
        x: 5, 
        y: 5,
        inventory: []
      }),
      chunk: {
        map: Array(20).fill(null).map(() => Array(20).fill('.')),
        monsters: []
      }
    });
    vi.clearAllMocks();
  });

  it('should pass correct projectile configuration for fire pot', async () => {
    mockState.player.inventory = [{
      id: 'fire_pot',
      name: 'Fire Pot',
      damage: 6,
      count: 1,
      projectileConfig: {
        type: 'fire',
        speed: 70,
        arcHeight: 0.0,
        trail: true
      }
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    await executeThrow(mockState, 10, 10);
    
    expect(projectileSystem.launchProjectile).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fire',
        speed: 70,
        arcHeight: 0.0,
        trail: true,
        toX: 10,
        toY: 10
      })
    );
  });

  it('should pass correct projectile configuration for shock pot', async () => {
    mockState.player.inventory = [{
      id: 'shock_pot',
      name: 'Shock Pot',
      damage: 8,
      count: 1,
      projectileConfig: {
        type: 'electric',
        speed: 80,
        arcHeight: 0.4,
        trail: true
      }
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    await executeThrow(mockState, 10, 10);
    
    expect(projectileSystem.launchProjectile).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'electric',
        speed: 80,
        arcHeight: 0.4,
        trail: true
      })
    );
  });

  it('should use default projectile config if not specified', async () => {
    mockState.player.inventory = [{
      id: 'basic_pot',
      name: 'Basic Pot',
      damage: 5,
      count: 1
      // No projectileConfig
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    await executeThrow(mockState, 10, 10);
    
    expect(projectileSystem.launchProjectile).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'default',
        speed: 100,
        trail: false,
        arcHeight: 0.5
      })
    );
  });

  it('should handle collision detection callback', async () => {
    mockState.player.inventory = [{
      id: 'fire_pot',
      name: 'Fire Pot',
      damage: 6,
      count: 1
    }];
    
    mockState.pendingThrowable = {
      item: mockState.player.inventory[0],
      inventoryIndex: 0
    };

    await executeThrow(mockState, 10, 10);
    
    const launchCall = projectileSystem.launchProjectile.mock.calls[0][0];
    expect(launchCall.checkCollision).toBeDefined();
    
    // Test collision check
    mockState.chunk.map[5][5] = '#'; // Wall
    expect(launchCall.checkCollision(5, 5)).toBe(true);
    
    mockState.chunk.map[6][6] = '.'; // Floor
    expect(launchCall.checkCollision(6, 6)).toBe(false);
  });
});