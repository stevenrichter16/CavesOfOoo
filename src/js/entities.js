export function makePlayer() { 
  return { 
    x: 2, y: 2, hp: 20, hpMax: 20, str: 5, def: 1, spd: 3,
    level: 1, xp: 0, xpNext: 10,
    alive: true,
    weapon: null, armor: null, headgear: null,
    gold: 0,  // Starting gold
    inventory: [], potionCount: 0,
    statusEffects: [],
    turnsSinceRest: 0
  }; 
}

export function makeMonster(kind, x, y, tier = 1) {
  const templates = {
    goober: { glyph: "g", name: "candy goober", hp: 6, str: 3, def: 0, spd: 2, xp: 2, ai: "chase" },
    icething: { glyph: "i", name: "ice-thing", hp: 8, str: 4, def: 1, spd: 1, xp: 3, ai: "chase" },
    sootling: { glyph: "s", name: "sootling", hp: 5, str: 3, def: 0, spd: 4, xp: 2, ai: "wander" },
    firefly: { glyph: "f", name: "firefly", hp: 3, str: 2, def: 0, spd: 6, xp: 1, ai: "skittish" },
    boss: { glyph: "B", name: "Lich King", hp: 30, str: 8, def: 3, spd: 2, xp: 20, ai: "smart" },
    
    // New ability monsters
    flamepup: { 
      glyph: "☼", 
      name: "flame pup", 
      hp: 7, 
      str: 4, 
      def: 1,
      spd: 3,
      xp: 3, 
      ai: "chase",
      ability: { 
        type: "fireBlast",
        chance: 0.05, // 5% chance per turn
        range: 3,
        damage: 4,
        effect: "burn",
        effectTurns: 2,
        effectValue: 2
      }
    },
    frostbite: { 
      glyph: "F", 
      name: "frostbite", 
      hp: 8, 
      str: 3, 
      def: 2,
      spd: 2,
      xp: 4, 
      ai: "chase",
      ability: { 
        type: "iceBreath",
        chance: 0.04,
        range: 2,
        damage: 3,
        effect: "freeze",
        effectTurns: 1,
        effectValue: 0
      }
    },
    toxicslime: { 
      glyph: "T", 
      name: "toxic slime", 
      hp: 10, 
      str: 2, 
      def: 1,
      spd: 1,
      xp: 3, 
      ai: "wander",
      ability: { 
        type: "poisonSpit",
        chance: 0.06,
        range: 4,
        damage: 2,
        effect: "poison",
        effectTurns: 3,
        effectValue: 2
      }
    },
    sparkler: { 
      glyph: "S", 
      name: "sparkler", 
      hp: 5, 
      str: 3, 
      def: 0,
      spd: 5,
      xp: 2, 
      ai: "wander",
      ability: { 
        type: "electricPulse",
        chance: 0.08,
        range: 2,
        damage: 5,
        effect: "shock",
        effectTurns: 2,
        effectValue: 1
      }
    }
  };
  
  const base = { ...templates[kind] };
  
  // Apply tier modifiers (bosses are always tier 3)
  if (kind !== "boss") {
    if (tier === 2) {
      // Veteran tier (green) - slightly stronger
      base.name = "veteran " + base.name;
      base.hp = Math.floor(base.hp * 1.5);
      base.str = base.str + 2;
      base.def = base.def + 1;
      base.spd = base.spd ? base.spd + 1 : 1;
      base.xp = Math.floor(base.xp * 2);
      // Scale ability for veterans
      if (base.ability) {
        base.ability.chance = Math.min(1.0, base.ability.chance * 1.5);
        base.ability.damage = Math.floor(base.ability.damage * 1.2);
      }
    } else if (tier === 3) {
      // Elite tier (red) - much stronger
      base.name = "elite " + base.name;
      base.hp = Math.floor(base.hp * 2.5);
      base.str = base.str + 4;
      base.def = base.def + 2;
      base.spd = base.spd ? base.spd + 2 : 2;
      base.xp = Math.floor(base.xp * 4);
      // Elite monsters are smarter
      if (base.ai === "wander") base.ai = "chase";
      if (base.ai === "skittish") base.ai = "wander";
      // Scale ability for elites
      if (base.ability) {
        base.ability.chance = Math.min(1.0, base.ability.chance * 2);
        base.ability.damage = Math.floor(base.ability.damage * 1.5);
      }
    }
  } else {
    // Bosses are always tier 3 (elite)
    tier = 3;
  }
  
  return { ...base, kind, x, y, alive: true, statusEffects: [], tier };
}

export function levelUp(state) {
  const p = state.player;
  p.level++;
  p.xpNext = p.level * 15;
  p.hpMax += 5;
  p.hp = p.hpMax;
  p.str += 2;
  p.def += 1;
  p.spd += 1;
  
  if (state.log) {
    state.log(`Level up! You are now level ${p.level}!`, "xp");
    state.log(`Your stats increase! HP:${p.hpMax} STR:${p.str} DEF:${p.def} SPD:${p.spd}`, "good");
  }
}