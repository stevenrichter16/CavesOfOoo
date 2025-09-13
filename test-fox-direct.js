#!/usr/bin/env node

import { MovementPipeline } from './src/js/movement/MovementPipeline.js';
import { QUEST_ITEMS } from './src/js/items/questItems.js';

console.log('=== Direct Fox Tooth Test ===\n');

// Create pipeline
const pipeline = new MovementPipeline();

// Create state
const state = {
  player: {
    x: 10,
    y: 10,
    inventory: [],
    quests: {
      active: ['sweet_tooth_foxes'],
      progress: { 'sweet_tooth_foxes': { teeth: 0 } }
    }
  },
  chunk: {
    monsters: [
      {
        x: 11,
        y: 10,
        kind: 'sweet_tooth_fox',
        name: 'Sweet Tooth Fox',
        hp: 5,
        hpMax: 15,
        asleep: true,
        hasTeeth: true,
        alive: true
      }
    ],
    map: Array(20).fill(null).map(() => Array(40).fill('.'))
  },
  npcs: [],
  cx: 0,
  cy: 0,
  W: 40,
  H: 20,
  log: (state, msg, cls) => console.log(`[LOG ${cls}] ${msg}`)
};

// Move right into fox
const action = { type: 'move', dx: 1, dy: 0 };

console.log('Before movement:');
console.log('  Player at:', state.player.x, state.player.y);
console.log('  Fox at:', state.chunk.monsters[0].x, state.chunk.monsters[0].y);
console.log('  Fox asleep:', state.chunk.monsters[0].asleep);
console.log('  Fox has teeth:', state.chunk.monsters[0].hasTeeth);
console.log('  Player inventory:', state.player.inventory.length, 'items');

console.log('\nExecuting movement...');
const result = pipeline.executeSync(state, action);

console.log('\nResult:', result);

console.log('\nAfter movement:');
console.log('  Player at:', state.player.x, state.player.y);
console.log('  Fox has teeth:', state.chunk.monsters[0].hasTeeth);
console.log('  Player inventory:', state.player.inventory.length, 'items');

if (state.player.inventory.length > 0) {
  console.log('  Inventory contents:', state.player.inventory[0]);
}

console.log('\n=== Test Complete ===');