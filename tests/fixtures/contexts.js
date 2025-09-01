/**
 * Test fixtures for contexts
 */

export const contexts = {
  empty: {
    entity: {
      id: 'test',
      hp: 100,
      hpMax: 100,
      statuses: [],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {},
    queue: [],
    rand: () => 0.5
  },
  
  wetEntity: {
    entity: {
      id: 'wet-entity',
      hp: 100,
      hpMax: 100,
      statuses: [
        { id: 'wet', tags: ['coated', 'conductive', 'extinguisher'], props: { quantity: 20, turns: 5 } }
      ],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {},
    queue: [],
    rand: () => 0.5
  },
  
  electricDamage: {
    entity: {
      id: 'target',
      hp: 100,
      hpMax: 100,
      statuses: [],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {
      kind: 'damage',
      damage: { amount: 10, type: 'electric' }
    },
    queue: [],
    rand: () => 0.5
  },
  
  wetElectricDamage: {
    entity: {
      id: 'wet-target',
      hp: 100,
      hpMax: 100,
      statuses: [
        { id: 'wet', tags: ['coated', 'conductive', 'extinguisher'], props: { quantity: 20 } }
      ],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {
      kind: 'damage',
      damage: { amount: 10, type: 'electric' }
    },
    queue: [],
    rand: () => 0.5
  },
  
  burningEntity: {
    entity: {
      id: 'burning',
      hp: 80,
      hpMax: 100,
      statuses: [
        { id: 'burn', tags: ['fire', 'dot', 'hot'], props: { damagePerTurn: 3, turns: 3 } }
      ],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {},
    queue: [],
    rand: () => 0.5
  },
  
  applyWetStatus: {
    entity: {
      id: 'burning',
      hp: 100,
      hpMax: 100,
      statuses: [
        { id: 'burn', tags: ['fire', 'dot', 'hot'], props: { turns: 3 } }
      ],
      materials: []
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {
      kind: 'applyStatus',
      status: { id: 'wet', tags: ['extinguisher'], props: { turns: 3 } }
    },
    queue: [],
    rand: () => 0.5
  },
  
  waterTile: {
    entity: {
      id: 'entity-on-water',
      hp: 100,
      hpMax: 100,
      statuses: [],
      materials: [
        { id: 'water', tags: ['liquid', 'extinguisher', 'conductive'], props: {} }
      ]
    },
    env: {
      temperatureC: 20,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: ['water', 'liquid'],
      timeOfDay: 'day',
      weather: 'clear'
    },
    event: {},
    queue: [],
    rand: () => 0.5
  },
  
  frozenEntity: {
    entity: {
      id: 'frozen',
      hp: 100,
      hpMax: 100,
      statuses: [
        { id: 'freeze', tags: ['ice', 'control', 'immobilize'], props: { preventMovement: true, preventAction: true } }
      ],
      materials: []
    },
    env: {
      temperatureC: -10,
      oxygen: 1.0,
      autoIgniteAtC: 500,
      tileTags: [],
      timeOfDay: 'day',
      weather: 'snow'
    },
    event: { kind: 'turn' },
    queue: [],
    rand: () => 0.5
  }
};