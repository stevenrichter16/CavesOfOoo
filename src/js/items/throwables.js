// src/js/items/throwables.js
// Throwable pot items for ranged combat

export const THROWABLE_POTS = {
  // Tier 1 pots
  clay_pot: {
    name: "Clay Pot",
    desc: "A simple clay pot that shatters on impact",
    damage: 5,
    tier: 1,
    value: 10,
    stackable: true,
    projectileConfig: {
      type: 'default',
      speed: 70,
      arcHeight: 0.0,
      trail: false,
      impactSymbols: ['x', '+', '*'],
      animationSymbols: ['o', 'O', '0', 'O', 'o']
    }
  },
  
  sugar_pot: {
    name: "Sugar Pot",
    desc: "A crystallized sugar pot that explodes into sharp shards",
    damage: 8,
    tier: 1,
    value: 15,
    stackable: true,
    projectileConfig: {
      type: 'default',
      speed: 70,
      arcHeight: 0.0,
      trail: false,
      impactSymbols: ['*', 'x', '+', '*'],
      animationSymbols: ['o', 'O', '0', 'O', 'o']
    }
  },
  
  fire_pot: {
    name: "Fire Pot",
    desc: "A pot filled with flammable oil that ignites on impact",
    damage: 6,
    tier: 1,
    value: 20,
    damageType: 'fire',
    statusEffect: 'burn',
    statusChance: 0.0,
    statusDuration: 3,
    statusValue: 2,
    stackable: true,
    projectileConfig: {
      type: 'fire',
      speed: 70,
      arcHeight: 0.0,
      trail: true,
      impactSymbols: ['*', 'x', 'X', '+'],
      animationSymbols: ['*', 'x', '+', 'X', '*'],
      displayKind: 'crit'
    },
    tileInteractions: {
      '%': {
        action: 'ignite',
        message: "KABOOM! The candy dust ignites explosively!",
        areaEffect: {
          radius: 3,
          damage: 15,
          damageType: 'explosion',
          effect: 'explosion',
          excludeSource: false,
          chainReaction: true
        }
      }
    }
  },
  
  // Tier 2 pots
  candy_bomb: {
    name: "Candy Bomb",
    desc: "A hard candy shell filled with explosive syrup",
    damage: 12,
    tier: 2,
    value: 25,
    stackable: true,
    projectileConfig: {
      type: 'explosive',
      speed: 90,
      arcHeight: 0.6,
      trail: false,
      impactSymbols: ['*', 'X', '*', 'X'],
      animationSymbols: ['o', 'O', '@', 'O', 'o']
    }
  },
  
  mint_pot: {
    name: "Mint Pot",
    desc: "A peppermint pot that deals cold damage",
    damage: 10,
    tier: 2,
    value: 30,
    statusEffect: 'freeze',
    statusChance: 0.2,
    stackable: true,
    projectileConfig: {
      type: 'ice',
      speed: 100,
      arcHeight: 0.5,
      trail: false,
      impactSymbols: ['*', '+', '*'],
      animationSymbols: ['*', 'o', 'O', '*'],
      displayKind: 'freeze'
    }
  },
  
  // Alias for mint_pot for consistency
  ice_pot: {
    name: "Ice Pot",
    desc: "A freezing pot that deals cold damage",
    damage: 10,
    tier: 2,
    value: 30,
    statusEffect: 'freeze',
    statusChance: 0.3,
    statusDuration: 2,
    stackable: true,
    projectileConfig: {
      type: 'ice',
      speed: 100,
      arcHeight: 0.5,
      trail: false,
      impactSymbols: ['*', '+', '*'],
      animationSymbols: ['*', 'o', 'O', '*'],
      displayKind: 'freeze'
    }
  },
  
  shock_pot: {
    name: "Shock Pot",
    desc: "A jar filled with electric eels that releases lightning on impact",
    damage: 8,
    tier: 2,
    value: 35,
    damageType: 'electric',
    statusEffect: 'shock',
    statusChance: 1.0,  // Always apply shock on direct hit
    statusDuration: 3,
    statusValue: 4,
    stackable: true,
    projectileConfig: {
      type: 'electric',
      speed: 80,
      arcHeight: 0.4,
      trail: true,
      impactSymbols: ['z', 'Z', 'x', '+'],
      animationSymbols: ['o', 'z', 'Z', 'z', 'o'],
      displayKind: 'magic'
    },
    tileInteractions: {
      '~': {
        action: 'electrify',
        message: "BZZZZT! The water becomes electrified!",
        areaEffect: {
          radius: 2,
          damage: 10,
          damageType: 'electric',
          effect: 'electrify_water',
          excludeSource: false
        }
      }
    }
  },
  
  // Tier 3 pots
  royal_jelly_pot: {
    name: "Royal Jelly Pot",
    desc: "A pot filled with Princess Bubblegum's explosive jelly",
    damage: 18,
    tier: 3,
    value: 50,
    stackable: true,
    projectileConfig: {
      type: 'explosive',
      speed: 80,
      arcHeight: 0.7,
      trail: true,
      impactSymbols: ['*', 'X', '*', 'X', '*'],
      animationSymbols: ['@', 'O', '@', 'O']
    }
  },
  
  acid_pot: {
    name: "Acid Pot",
    desc: "A glass pot filled with lemongrab's sour acid",
    damage: 15,
    tier: 3,
    value: 45,
    statusEffect: 'poison',
    statusChance: 0.3,
    statusDuration: 3,
    stackable: true,
    projectileConfig: {
      type: 'poison',
      speed: 100,
      arcHeight: 0.5,
      trail: true,
      impactSymbols: ['@', 'o', '@'],
      animationSymbols: ['o', '@', 'o', '@'],
      displayKind: 'poison'
    }
  }
};

/**
 * Get throwable pot by id
 */
export function getThrowablePot(id) {
  return THROWABLE_POTS[id];
}

/**
 * Get all throwable pots
 * @returns {Object} All throwable pot configurations
 */
export function getAllThrowablePots() {
  return THROWABLE_POTS;
}

/**
 * Calculate damage for a thrown pot
 */
export function calculateThrowDamage(pot, attacker) {
  let damage = pot.damage || 5;
  
  // Add attacker's strength bonus (half of melee strength bonus)
  // This gives throwables a reasonable strength scaling without being as strong as melee
  const strBonus = Math.floor((attacker.str || 0) / 2);
  damage += strBonus;
  
  // Add any equipment bonuses
  if (attacker.damageBonus) {
    damage += attacker.damageBonus;
  }
  
  return damage;
}