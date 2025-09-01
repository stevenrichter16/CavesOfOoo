/**
 * Test fixtures for entities
 */

export const entities = {
  player: {
    id: 'player',
    hp: 100,
    hpMax: 100,
    x: 5,
    y: 5,
    str: 10,
    def: 10,
    spd: 10,
    alive: true,
    statusEffects: [],
    armor: null,
    headgear: null
  },
  
  wetPlayer: {
    id: 'wet-player',
    hp: 100,
    hpMax: 100,
    x: 5,
    y: 5,
    statusEffects: [
      { type: 'wet', turns: 5, value: 0, quantity: 20 }
    ]
  },
  
  burningPlayer: {
    id: 'burning-player',
    hp: 80,
    hpMax: 100,
    x: 5,
    y: 5,
    statusEffects: [
      { type: 'burn', turns: 3, value: 2 }
    ]
  },
  
  frozenPlayer: {
    id: 'frozen-player',
    hp: 100,
    hpMax: 100,
    x: 5,
    y: 5,
    statusEffects: [
      { type: 'freeze', turns: 2, value: 0 }
    ]
  },
  
  multiStatusPlayer: {
    id: 'multi-status',
    hp: 60,
    hpMax: 100,
    x: 5,
    y: 5,
    statusEffects: [
      { type: 'wet', turns: 3, value: 0, quantity: 10 },
      { type: 'poison', turns: 5, value: 2 },
      { type: 'weaken', turns: 2, value: 3 }
    ]
  },
  
  metalGearPlayer: {
    id: 'metal-gear-player',
    hp: 100,
    hpMax: 100,
    x: 5,
    y: 5,
    statusEffects: [],
    armor: { name: 'Steel Armor', defense: 5 },
    headgear: { name: 'Iron Helm', defense: 2 }
  },
  
  lowHpPlayer: {
    id: 'low-hp',
    hp: 10,
    hpMax: 100,
    x: 5,
    y: 5,
    statusEffects: []
  }
};