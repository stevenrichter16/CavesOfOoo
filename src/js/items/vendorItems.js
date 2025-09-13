// src/js/items/vendorItems.js
// Complete vendor item system for Shopping District

import { applyStatusEffect } from '../combat/statusSystem.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

/**
 * Special item effects handler
 */
export function applyVendorItemEffect(state, player, item) {
  if (!item || !item.effect) return;

  const effect = item.effect;
  
  switch (effect.type) {
    case 'heal':
      healPlayer(state, player, effect.amount);
      break;
      
    case 'buff':
      applyBuff(state, player, effect.stat, effect.power, effect.duration);
      break;
      
    case 'random':
      applyRandomEffect(state, player);
      break;
      
    case 'fortune':
      giveFortune(state, player);
      break;
      
    case 'transform':
      applyTransformation(state, player, effect.into);
      break;
      
    case 'teleport':
      teleportPlayer(state, player, effect.destination);
      break;
      
    case 'summon':
      summonCreature(state, player, effect.creature);
      break;
      
    default:
      console.log(`Unknown effect type: ${effect.type}`);
  }
}

function healPlayer(state, player, amount) {
  const healed = Math.min(amount, player.hpMax - player.hp);
  player.hp += healed;
  state.log(`Healed ${healed} HP!`, 'good');
}

function applyBuff(state, player, stat, power, duration) {
  const buffName = `vendor_buff_${stat}`;
  
  player.statusEffects = player.statusEffects || {};
  player.statusEffects[buffName] = {
    name: `${stat.toUpperCase()} Boost`,
    stat: stat,
    power: power,
    duration: duration,
    turnsRemaining: duration
  };
  
  state.log(`${stat.toUpperCase()} increased by ${power}% for ${duration} turns!`, 'buff');
}

function applyRandomEffect(state, player) {
  const effects = [
    () => {
      player.gold += 10;
      state.log('Found 10 gold coins inside!', 'good');
    },
    () => {
      healPlayer(state, player, 25);
      state.log('Contains healing elixir!', 'good');
    },
    () => {
      applyBuff(state, player, 'spd', 100, 3);
      state.log('Sugar rush! Speed doubled!', 'buff');
    },
    () => {
      player.hp = Math.max(1, player.hp - 10);
      state.log('Ouch! It exploded! Lost 10 HP', 'bad');
    },
    () => {
      const items = ['Candy Corn', 'Small Lollipop', 'Chocolate Bar'];
      const item = items[Math.floor(Math.random() * items.length)];
      player.inventory.push({ name: item, type: 'potion', heal: 5 });
      state.log(`Found ${item} inside!`, 'good');
    }
  ];
  
  const effect = effects[Math.floor(Math.random() * effects.length)];
  effect();
}

function giveFortune(state, player) {
  const fortunes = [
    'You will find great treasure soon.',
    'Beware of falling rocks.',
    'A new friend awaits you.',
    'Your next battle will be challenging.',
    'Good luck comes to those who share.',
    'The path ahead holds many surprises.',
    'Trust your instincts in the dungeon.',
    'A powerful item is nearby.'
  ];
  
  const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
  state.log(`Fortune: "${fortune}"`, 'note');
  
  // Small luck boost
  player.statusEffects = player.statusEffects || {};
  player.statusEffects.fortune = {
    name: 'Good Fortune',
    power: 10,
    duration: 10,
    turnsRemaining: 10
  };
}

/**
 * Complete vendor item database
 */
export const VendorItems = {
  // Choose Goose's Miscellaneous Items
  mystery_box: {
    name: 'Mystery Box',
    type: 'consumable',
    price: 25,
    description: 'A mysterious box that could contain anything!',
    effect: { type: 'random' },
    stackable: false
  },
  
  shiny_trinket: {
    name: 'Shiny Trinket',
    type: 'treasure',
    price: 15,
    description: 'A shiny bauble that catches the light.',
    sellValue: 10
  },
  
  golden_medallion: {
    name: 'Golden Medallion',
    type: 'treasure',
    price: 100,
    description: 'An ornate golden medallion with mystical engravings.',
    sellValue: 75,
    questItem: true
  },
  
  crystal_ball: {
    name: 'Crystal Ball',
    type: 'consumable',
    price: 75,
    description: 'Peer into the future and receive a fortune!',
    effect: { type: 'fortune' }
  },
  
  magic_beans: {
    name: 'Magic Beans',
    type: 'consumable',
    price: 50,
    description: 'Plant these to grow something special.',
    effect: { type: 'summon', creature: 'beanstalk' }
  },
  
  // Candy Items with Buffs
  rainbow_lollipop: {
    name: 'Rainbow Lollipop',
    type: 'potion',
    price: 25,
    description: 'A swirling rainbow lollipop that grants speed!',
    heal: 25,
    effect: { type: 'buff', stat: 'spd', power: 50, duration: 5 }
  },
  
  dark_chocolate: {
    name: 'Dark Chocolate',
    type: 'potion',
    price: 12,
    description: 'Rich dark chocolate that toughens your defenses.',
    heal: 10,
    effect: { type: 'buff', stat: 'def', power: 30, duration: 5 }
  },
  
  jawbreaker: {
    name: 'Jawbreaker',
    type: 'potion',
    price: 20,
    description: 'An incredibly hard candy that grants resilience.',
    heal: 15,
    effect: { type: 'buff', stat: 'def', power: 75, duration: 3 }
  },
  
  sour_patch: {
    name: 'Sour Patch',
    type: 'potion',
    price: 18,
    description: 'Sour then sweet! Damages then heals.',
    heal: 30,
    initialDamage: 5
  },
  
  // Weapon Items
  enchanted_broom: {
    name: 'Enchanted Broom',
    type: 'weapon',
    price: 150,
    description: 'A broom enchanted with cleaning magic. Extra damage to dirty enemies!',
    dmg: 6,
    special: 'clean_sweep'
  },
  
  golden_broom: {
    name: 'Golden Broom',
    type: 'weapon',
    price: 250,
    description: 'A prestigious golden broom that sparkles with power.',
    dmg: 8,
    special: 'gold_dust'
  },
  
  // Special Food Items
  mega_pizza: {
    name: 'Mega Pizza',
    type: 'potion',
    price: 100,
    description: 'An enormous pizza that fully restores health!',
    fullRestore: true
  },
  
  spicy_pizza: {
    name: 'Spicy Pizza',
    type: 'potion',
    price: 35,
    description: 'Hot pizza that burns your tongue but boosts attack!',
    heal: 20,
    effect: { type: 'buff', stat: 'str', power: 40, duration: 5 }
  },
  
  royal_feast: {
    name: 'Royal Feast',
    type: 'potion',
    price: 75,
    description: 'A complete royal meal that grants multiple buffs.',
    heal: 40,
    multiEffect: [
      { type: 'buff', stat: 'str', power: 20, duration: 5 },
      { type: 'buff', stat: 'def', power: 20, duration: 5 },
      { type: 'buff', stat: 'spd', power: 20, duration: 5 }
    ]
  },
  
  // Quest-Related Items
  ancient_recipe: {
    name: 'Ancient Recipe',
    type: 'quest',
    price: 200,
    description: 'An ancient recipe for a legendary dish.',
    questItem: true,
    nonConsumable: true
  },
  
  merchant_license: {
    name: 'Merchant License',
    type: 'quest',
    price: 500,
    description: 'Official license to trade in the Candy Kingdom.',
    questItem: true,
    nonConsumable: true
  },
  
  map_fragment: {
    name: 'Map Fragment',
    type: 'quest',
    price: 150,
    description: 'Part of a larger map. Collect all pieces!',
    questItem: true,
    stackable: true
  }
};

/**
 * Generate dynamic vendor inventory based on vendor type and level
 */
export function generateVendorInventory(vendor) {
  const inventories = {
    medicine: generateMedicineInventory,
    candy_corn: generateCandyInventory,
    lollipops: generateLollipopInventory,
    chocolate: generateChocolateInventory,
    pizza: generatePizzaInventory,
    brooms: generateBroomInventory,
    royal_tarts: generateRoyalInventory,
    miscellaneous: generateMiscInventory
  };
  
  const generator = inventories[vendor.goods] || inventories.miscellaneous;
  return generator(vendor);
}

function generateMedicineInventory(vendor) {
  // Already handled by pharmacy items
  return [];
}

function generateCandyInventory(vendor) {
  return [
    createVendorItem('potion', 'Candy Corn', 5, { heal: 5 }),
    createVendorItem('potion', 'Candy Corn Bag', 20, { heal: 20 }),
    createVendorItem('potion', 'Candy Apple', 15, { heal: 15 }),
    createVendorItem('potion', 'Caramel Square', 8, { heal: 8 })
  ];
}

function generateLollipopInventory(vendor) {
  return [
    createVendorItem('potion', 'Small Lollipop', 3, { heal: 3 }),
    createVendorItem('potion', 'Giant Lollipop', 15, { heal: 15 }),
    createVendorItem('potion', 'Rainbow Lollipop', 25, { heal: 25, buff: 'spd' }),
    createVendorItem('potion', 'Swirl Pop', 10, { heal: 10 }),
    createVendorItem('potion', 'Jawbreaker', 20, { heal: 15, buff: 'def' })
  ];
}

function generateChocolateInventory(vendor) {
  return [
    createVendorItem('potion', 'Chocolate Bar', 8, { heal: 8 }),
    createVendorItem('potion', 'Dark Chocolate', 12, { heal: 10, buff: 'def' }),
    createVendorItem('potion', 'White Chocolate', 10, { heal: 12 }),
    createVendorItem('potion', 'Truffle', 25, { heal: 20, buff: 'str' }),
    createVendorItem('potion', 'Hot Chocolate', 15, { heal: 18 })
  ];
}

function generatePizzaInventory(vendor) {
  return [
    createVendorItem('potion', 'Pizza Slice', 10, { heal: 10 }),
    createVendorItem('potion', 'Whole Pizza', 50, { heal: 50 }),
    createVendorItem('potion', 'Garlic Knots', 5, { heal: 5 }),
    createVendorItem('potion', 'Spicy Pizza', 35, { heal: 20, buff: 'str' }),
    createVendorItem('potion', 'Calzone', 25, { heal: 25 }),
    createVendorItem('potion', 'Breadsticks', 8, { heal: 8 })
  ];
}

function generateBroomInventory(vendor) {
  return [
    createVendorItem('weapon', 'Basic Broom', 20, { dmg: 2 }),
    createVendorItem('weapon', 'Quality Broom', 50, { dmg: 3 }),
    createVendorItem('weapon', 'Magic Broom', 100, { dmg: 5 }),
    createVendorItem('weapon', 'Enchanted Broom', 150, { dmg: 6, special: 'clean_sweep' }),
    createVendorItem('weapon', 'Golden Broom', 250, { dmg: 8, special: 'gold_dust' })
  ];
}

function generateRoyalInventory(vendor) {
  return [
    createVendorItem('potion', 'Royal Tart', 30, { heal: 30 }),
    createVendorItem('potion', 'Mini Tart', 10, { heal: 10 }),
    createVendorItem('potion', 'Tart Sampler', 50, { heal: 40 }),
    createVendorItem('potion', 'Royal Feast', 75, { heal: 40, multiBuffs: true }),
    createVendorItem('potion', 'Crown Cookies', 20, { heal: 15, buff: 'def' })
  ];
}

function generateMiscInventory(vendor) {
  return [
    createVendorItem('item', 'Mystery Box', 25, { special: 'random' }),
    createVendorItem('item', 'Shiny Trinket', 15, { sellValue: 10 }),
    createVendorItem('item', 'Golden Medallion', 100, { sellValue: 75 }),
    createVendorItem('item', 'Crystal Ball', 75, { special: 'fortune' }),
    createVendorItem('item', 'Magic Beans', 50, { special: 'summon' }),
    createVendorItem('item', 'Ancient Scroll', 35, { questItem: true })
  ];
}

/**
 * Helper to create vendor item structure
 */
function createVendorItem(type, name, price, properties = {}) {
  return {
    type: type,
    item: {
      name: name,
      ...properties
    },
    price: price
  };
}

/**
 * Apply special weapon effects
 */
export function applyWeaponSpecial(state, attacker, target, special) {
  switch (special) {
    case 'clean_sweep':
      // Extra damage to dirty/undead enemies
      if (target.type === 'undead' || target.type === 'slime') {
        const extraDamage = Math.floor(Math.random() * 5) + 3;
        target.hp -= extraDamage;
        state.log('Clean sweep! Extra damage!', 'good');
      }
      break;
      
    case 'gold_dust':
      // Chance to find gold on hit
      if (Math.random() < 0.2) {
        const goldFound = Math.floor(Math.random() * 10) + 5;
        attacker.gold += goldFound;
        state.log(`Gold dust scattered! Found ${goldFound} gold!`, 'good');
      }
      break;
  }
}