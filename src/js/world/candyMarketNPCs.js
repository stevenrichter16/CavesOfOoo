// src/js/world/candyMarketNPCs.js
// Spawns Candy Kingdom shopping-district NPCs, tuned to your social system.

import { spawnSocialNPC } from '../social/init.js';

export function populateCandyMarketNPCs(state, opts = {}) {
  const cx = opts.cx ?? 0, cy = opts.cy ?? 0;

  // ───────────────────────────────────────────────────────────────────────────
  // VENDORS (shopkeepers) — kept compatible with candyMarketChunk's vendor tiles
  // ───────────────────────────────────────────────────────────────────────────
  const vendors = [
    { id: 'candy_corn_vendor',  name: 'Candy Corn Carl',   x: 4,  y: 4,  goods: 'candy_corn'  },
    { id: 'lollipops_vendor',   name: 'Lollipop Lucy',     x: 9,  y: 4,  goods: 'lollipops'   },
    { id: 'gumdrops_vendor',    name: 'Gumdrop Gary',      x: 14, y: 4,  goods: 'gumdrops'    },
    { id: 'taffy_vendor',       name: 'Taffy Tom',         x: 5,  y: 9,  goods: 'taffy'       },
    { id: 'chocolate_vendor',   name: 'Chocolate Charlie', x: 15, y: 9,  goods: 'chocolate'   },
    { id: 'peppermints_vendor', name: 'Peppermint Patty',  x: 4,  y: 15, goods: 'peppermints' },
    { id: 'rock_candy_vendor',  name: 'Rock Candy Randy',  x: 13, y: 15, goods: 'rock_candy'  },
    { id: 'cotton_candy_vendor',name: 'Cotton Candy Cathy',x: 18, y: 15, goods: 'cotton_candy'}
  ];

  vendors.forEach(v => {
    spawnSocialNPC(state, {
      id: v.id,
      name: v.name,
      x: v.x, y: v.y,
      chunkX: cx, chunkY: cy,
      faction: 'merchants',
      dialogueType: 'merchant_vendor',     // custom dialogue pack below
      goods: v.goods,
      traits: ['friendly','trader'],
      hp: 20, hpMax: 20,
      shopkeeper: true,
      schedule: {                           // simple day loop for flavor
        day:  { action: 'work_stall', x: v.x, y: v.y },
        dusk: { action: 'pack_up',    x: v.x, y: v.y },
        night:{ action: 'go_home' }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // UNIQUE MARKET PERSONALITIES
  // ───────────────────────────────────────────────────────────────────────────
  // Choose Goose — promenade hawker
  spawnSocialNPC(state, {
    id: 'choose_goose',
    name: 'Choose Goose',
    x: 34, y: 7, chunkX: cx, chunkY: cy,
    faction: 'merchants',
    dialogueType: 'choose_goose',
    traits: ['greedy','chatty','cunning'],
    hp: 24, hpMax: 24,
    shopkeeper: true,
    goods: 'trinkets'
  });

  // Peppermint Butler — errands through plaza (rare merchant perks)
  spawnSocialNPC(state, {
    id: 'peppermint_butler',
    name: 'Peppermint Butler',
    x: 24, y: 10, chunkX: cx, chunkY: cy,
    faction: 'nobles',
    dialogueType: 'peppermint_butler',
    traits: ['mysterious','cunning','polite'],
    hp: 35, hpMax: 35
  });

  // Banana Guard Patrol — presence in market
  spawnSocialNPC(state, {
    id: 'banana_guard_1',
    name: 'Banana Guard',
    x: 22, y: 6, chunkX: cx, chunkY: cy,
    faction: 'guards',
    dialogueType: 'guard_market',
    traits: ['dutiful','polite'],
    hp: 28, hpMax: 28,
    patrol: [{x:22,y:6},{x:26,y:6},{x:26,y:11},{x:22,y:11}]
  });

  // Root Beer Guy — east end errand (not always present)
  spawnSocialNPC(state, {
    id: 'root_beer_guy',
    name: 'Root Beer Guy',
    x: 42, y: 11, chunkX: cx, chunkY: cy,
    faction: 'peasants',
    dialogueType: 'root_beer_guy',
    traits: ['earnest','chatty'],
    hp: 20, hpMax: 20
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GENERAL CITIZENS — light chatter
  // ───────────────────────────────────────────────────────────────────────────
  const citizens = [
    { id:'gummy_bear',     name:'Gummy Bear',      x: 7,  y: 7 },
    { id:'jellybean_joe',  name:'Jellybean Joe',   x: 15, y: 12 },
    { id:'marshmallow_mike',name:'Marshmallow Mike',x: 3, y: 10 }
  ];
  citizens.forEach(c => {
    spawnSocialNPC(state, {
      id: c.id, name: c.name, x: c.x, y: c.y,
      chunkX: cx, chunkY: cy,
      faction: 'peasants',
      dialogueType: 'peasant',
      traits: ['chatty'],
      hp: 15, hpMax: 15
    });
  });
}