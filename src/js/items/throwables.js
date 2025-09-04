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
    stackable: true
  },
  
  sugar_pot: {
    name: "Sugar Pot",
    desc: "A crystallized sugar pot that explodes into sharp shards",
    damage: 8,
    tier: 1,
    value: 15,
    stackable: true
  },
  
  fire_pot: {
    name: "Fire Pot",
    desc: "A pot filled with flammable oil that ignites on impact",
    damage: 6,
    tier: 1,
    value: 20,
    damageType: 'fire',
    statusEffect: 'burn',
    statusChance: 0.8,
    statusDuration: 3,
    statusValue: 2,
    stackable: true
  },
  
  // Tier 2 pots
  candy_bomb: {
    name: "Candy Bomb",
    desc: "A hard candy shell filled with explosive syrup",
    damage: 12,
    tier: 2,
    value: 25,
    stackable: true
  },
  
  mint_pot: {
    name: "Mint Pot",
    desc: "A peppermint pot that deals cold damage",
    damage: 10,
    tier: 2,
    value: 30,
    statusEffect: 'freeze',
    statusChance: 0.2,
    stackable: true
  },
  
  // Tier 3 pots
  royal_jelly_pot: {
    name: "Royal Jelly Pot",
    desc: "A pot filled with Princess Bubblegum's explosive jelly",
    damage: 18,
    tier: 3,
    value: 50,
    stackable: true
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
    stackable: true
  }
};

/**
 * Get throwable pot by id
 */
export function getThrowablePot(id) {
  return THROWABLE_POTS[id];
}

/**
 * Calculate damage for a thrown pot
 */
export function calculateThrowDamage(pot, attacker) {
  let damage = pot.damage || 5;
  
  // Add attacker's strength bonus (half of melee)
  const strBonus = Math.floor((attacker.str || 10) / 4);
  damage += strBonus;
  
  // Add any equipment bonuses
  if (attacker.damageBonus) {
    damage += attacker.damageBonus;
  }
  
  return damage;
}