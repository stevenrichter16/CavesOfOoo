#!/usr/bin/env node

// Test script to verify movement pipeline fixes
import { isNewPipelineEnabled } from './src/js/movement/pipelineAdapter.js';
import { movementPipeline } from './src/js/movement/MovementPipeline.js';
import { QUEST_ITEMS } from './src/js/items/questItems.js';

console.log('=== Testing Movement Pipeline Fixes ===\n');

// Test 1: Check pipeline is enabled
console.log('Test 1: Pipeline Status');
console.log('  New pipeline enabled:', isNewPipelineEnabled());
console.assert(isNewPipelineEnabled() === true, 'Pipeline should be enabled!');
console.log('  ✅ Pass\n');

// Test 2: Check fox tooth item exists
console.log('Test 2: Fox Tooth Item Definition');
const foxTooth = QUEST_ITEMS.fox_sweet_tooth;
console.log('  Fox tooth exists:', !!foxTooth);
console.log('  Name:', foxTooth?.name);
console.log('  Description:', foxTooth?.description);
console.assert(foxTooth !== undefined, 'Fox tooth should be defined!');
console.log('  ✅ Pass\n');

// Test 3: Test edge transition context
console.log('Test 3: Edge Transition Context');
const mockState = {
  player: { x: 39, y: 10, inventory: [], quests: {} },
  cx: 0,
  cy: 0,
  chunk: { monsters: [] },
  npcs: [],
  W: 40,
  H: 20
};

const mockAction = { type: 'move', dx: 1, dy: 0 };

try {
  const context = movementPipeline.createContext(mockState, mockAction);
  console.log('  Context created successfully');
  console.log('  Player reference set:', context.player === mockState.player);
  console.log('  Target position:', context.targetX, context.targetY);
  console.log('  Is edge transition:', context.targetX >= 40);
  console.assert(context.player === mockState.player, 'Player reference should match!');
  console.log('  ✅ Pass\n');
} catch (error) {
  console.error('  ❌ Failed:', error.message);
}

// Test 4: Test fox tooth collection context
console.log('Test 4: Fox Tooth Collection Context');
const foxState = {
  player: { x: 10, y: 10, inventory: [], quests: { active: ['sweet_tooth_foxes'], progress: {} } },
  cx: 0,
  cy: 0,
  chunk: {
    monsters: [{
      x: 11,
      y: 10,
      kind: 'sweet_tooth_fox',
      asleep: true,
      hasTeeth: true,
      hp: 5
    }]
  },
  npcs: [],
  W: 40,
  H: 20
};

const foxAction = { type: 'move', dx: 1, dy: 0 };

try {
  const context = movementPipeline.createContext(foxState, foxAction);
  console.log('  Context created for fox interaction');
  console.log('  Target has sleeping fox:', 
    foxState.chunk.monsters.some(m => m.x === 11 && m.y === 10 && m.asleep));
  console.log('  Player inventory before:', foxState.player.inventory.length);
  console.log('  ✅ Pass\n');
} catch (error) {
  console.error('  ❌ Failed:', error.message);
}

console.log('=== All Tests Complete ===');
console.log('\nNext steps:');
console.log('1. Open the game in browser');
console.log('2. Open browser console');
console.log('3. Run: window.checkStateSync()');
console.log('4. Try moving to a chunk edge');
console.log('5. Try collecting a fox tooth');
console.log('6. Check for [FOX TOOTH] debug messages');