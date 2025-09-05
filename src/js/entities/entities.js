export function makePlayer() { 
  // Generate unique IDs for starting items
  const generateItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Starting inventory with throwable pots
  const startingInventory = [
    {
      type: "throwable",
      item: {
        id: "clay_pot",
        name: "Clay Pot",
        desc: "A simple clay pot that shatters on impact",
        damage: 5,
        tier: 1,
        value: 10,
        stackable: true
      },
      id: generateItemId(),
      count: 5  // Start with 5 clay pots
    },
    {
      type: "throwable", 
      item: {
        id: "sugar_pot",
        name: "Sugar Pot",
        desc: "A crystallized sugar pot that explodes into sharp shards",
        damage: 8,
        tier: 1,
        value: 15,
        stackable: true
      },
      id: generateItemId(),
      count: 3  // Start with 3 sugar pots
    },
    {
      type: "throwable",
      item: {
        id: "fire_pot",
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
      id: generateItemId(),
      count: 3  // Start with 3 fire pots for testing candy dust explosions
    },
    {
      type: "throwable",
      item: {
        id: "shock_pot",
        name: "Shock Pot",
        desc: "A jar filled with electric eels that releases lightning on impact",
        damage: 8,
        tier: 2,
        value: 35,
        damageType: 'electric',
        statusEffect: 'shock',
        statusChance: 0.5,
        statusDuration: 2,
        statusValue: 3,
        stackable: true
      },
      id: generateItemId(),
      count: 3  // Start with 3 shock pots
    }
  ];
  
  return { 
    x: 2, y: 2, hp: 30, hpMax: 30, str: 6, def: 2, spd: 3,
    level: 1, xp: 0, xpNext: 30,
    alive: true,
    faction: 'player',  // Player's faction for hostility checks
    weapon: null, armor: null, headgear: null,
    rings: [null, null],  // Two ring slots
    gold: 0,  // Starting gold
    inventory: startingInventory, potionCount: 0,
    // statusEffects handled by Status Map in statusSystem.js
    turnsSinceRest: 0,
    // Quest tracking with automatic starter quest
    quests: {
      active: ["kill_any"],  // Start with kill_any quest active!
      completed: [],         // Array of completed quest IDs
      progress: {
        kill_any: 0          // Initialize progress for starter quest
      }
    }
  }; 
}

export function makeMonster(kind, x, y, tier = 1) {
  const templates = {
    // Basic enemies - significantly buffed HP and XP
    goober: { glyph: "g", name: "candy goober", hp: 60, str: 3, def: 0, spd: 2, xp: 10, ai: "chase" },
    icething: { glyph: "i", name: "ice-thing", hp: 40, str: 4, def: 2, spd: 1, xp: 15, ai: "chase" },
    sootling: { glyph: "s", name: "sootling", hp: 25, str: 3, def: 0, spd: 4, xp: 8, ai: "wander" },
    firefly: { glyph: "f", name: "firefly", hp: 30, str: 2, def: 0, spd: 6, xp: 5, ai: "skittish" },
    boss: { glyph: "B", name: "Lich King", hp: 150, str: 10, def: 5, spd: 3, xp: 100, ai: "smart" },
    
    // Mid-tier ability monsters - buffed significantly
    flamepup: { 
      glyph: "☼", 
      name: "flame pup", 
      hp: 35, 
      str: 5, 
      def: 1,
      spd: 3,
      xp: 15, 
      ai: "chase",
      ability: { 
        type: "fireBlast",
        chance: 0.05, // 5% chance per turn
        range: 3,
        damage: 6,
        effect: "burn",
        effectTurns: 2,
        effectValue: 3
      }
    },
    frostbite: { 
      glyph: "F", 
      name: "frostbite", 
      hp: 45, 
      str: 4, 
      def: 3,
      spd: 2,
      xp: 20, 
      ai: "chase",
      ability: { 
        type: "iceBreath",
        chance: 0.04,
        range: 2,
        damage: 5,
        effect: "freeze",
        effectTurns: 1,
        effectValue: 0
      }
    },
    toxicslime: { 
      glyph: "T", 
      name: "toxic slime", 
      hp: 120, 
      str: 3, 
      def: 2,
      spd: 1,
      xp: 40, 
      ai: "wander",
      ability: { 
        type: "poisonSpit",
        chance: 0.06,
        range: 4,
        damage: 4,
        effect: "poison",
        effectTurns: 3,
        effectValue: 3
      }
    },
    sparkler: { 
      glyph: "S", 
      name: "sparkler", 
      hp: 80, 
      str: 4, 
      def: 1,
      spd: 5,
      xp: 35, 
      ai: "wander",
      ability: { 
        type: "electricPulse",
        chance: 0.08,
        range: 2,
        damage: 7,
        effect: "shock",
        effectTurns: 2,
        effectValue: 2
      }
    },
    
    // High-tier monsters - Corrupted Dungeon (buffed significantly)
    wraith: { 
      glyph: "W", 
      name: "wraith", 
      hp: 60, 
      str: 8, 
      def: 3,
      spd: 4,
      xp: 45, 
      ai: "smart",
      undead: true,  // Marked as undead
      ability: { 
        type: "lifeDrain",
        chance: 0.08,
        range: 2,
        damage: 6,
        heal: 3, // Heals the wraith
        effect: "weakness",
        effectTurns: 2,
        effectValue: -2 // Reduces player STR
      }
    },
    shadow_beast: { 
      glyph: "◆", 
      name: "shadow beast", 
      hp: 75, 
      str: 9, 
      def: 4,
      spd: 3,
      xp: 50, 
      ai: "chase",
      undead: true,  // Shadow creature, counts as undead
      ability: { 
        type: "shadowStrike",
        chance: 0.06,
        range: 3,
        damage: 8,
        effect: "blind",
        effectTurns: 1,
        effectValue: 0 // Reduces accuracy
      }
    },
    
    // Elite-tier monsters - Lich Domain (heavily buffed)
    bone_knight: { 
      glyph: "K", 
      name: "bone knight", 
      hp: 90, 
      str: 10, 
      def: 6,
      spd: 2,
      xp: 60, 
      ai: "smart",
      undead: true,  // Skeleton warrior
      ability: { 
        type: "boneShield",
        chance: 0.1,
        selfBuff: true,
        effect: "armor",
        effectTurns: 3,
        effectValue: 4 // Temporary DEF boost
      }
    },
    demon: { 
      glyph: "D", 
      name: "demon", 
      hp: 100, 
      str: 12, 
      def: 5,
      spd: 4,
      xp: 75, 
      ai: "smart",
      undead: true,  // Demonic entity
      ability: { 
        type: "hellfire",
        chance: 0.07,
        range: 4,
        damage: 10,
        effect: "burn",
        effectTurns: 3,
        effectValue: 4
      }
    }
  };
  
  const base = { ...templates[kind] };
  
  // Apply tier modifiers (bosses are always tier 3)
  if (kind !== "boss") {
    if (tier === 2) {
      // Veteran tier (green) - moderately stronger
      base.name = "veteran " + base.name;
      base.hp = Math.floor(base.hp * 1.5);  // 1.5x HP
      base.str = base.str + 2;
      base.def = base.def + 1;
      base.spd = base.spd ? base.spd + 1 : 1;
      base.xp = Math.floor(base.xp * 1.5);  // Reduced from 2x
      // Scale ability for veterans
      if (base.ability) {
        base.ability.chance = Math.min(1.0, base.ability.chance * 1.3);
        base.ability.damage = Math.floor(base.ability.damage * 1.2);
      }
    } else if (tier === 3) {
      // Elite tier (red) - much stronger
      base.name = "elite " + base.name;
      base.hp = Math.floor(base.hp * 2.5);  // 2.5x HP
      base.str = base.str + 4;
      base.def = base.def + 3;
      base.spd = base.spd ? base.spd + 2 : 2;
      base.xp = Math.floor(base.xp * 3);  // Reduced from 4x
      // Elite monsters are smarter
      if (base.ai === "wander") base.ai = "chase";
      if (base.ai === "skittish") base.ai = "wander";
      // Scale ability for elites
      if (base.ability) {
        base.ability.chance = Math.min(1.0, base.ability.chance * 1.5);
        base.ability.damage = Math.floor(base.ability.damage * 1.5);
      }
    }
  } else {
    // Bosses are always tier 3 (elite)
    tier = 3;
  }
  
  // Set hpMax to match hp for proper display
  base.hpMax = base.hp;
  
  return { ...base, kind, x, y, alive: true, tier }; // statusEffects handled by Status Map
}

export function levelUp(state) {
  const p = state.player;
  p.level++;
  p.xpNext = p.level * 50;  // Increased XP requirements to match higher XP rewards
  p.hpMax += 8;  // More HP per level to survive tougher enemies
  p.hp = p.hpMax;
  p.str += 3;  // Better strength growth
  p.def += 2;  // Better defense growth
  p.spd += 1;
  
  if (state.log) {
    state.log(`Level up! You are now level ${p.level}!`, "xp");
    state.log(`Your stats increase! HP:${p.hpMax} STR:${p.str} DEF:${p.def} SPD:${p.spd}`, "good");
  }
}