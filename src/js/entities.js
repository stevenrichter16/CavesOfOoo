export function makePlayer() { 
  return { 
    x: 2, y: 2, hp: 20, hpMax: 20, str: 5, def: 1, 
    level: 1, xp: 0, xpNext: 10,
    alive: true,
    weapon: null, armor: null, headgear: null,
    inventory: [], potionCount: 0,
    statusEffects: [],
    turnsSinceRest: 0
  }; 
}

export function makeMonster(kind, x, y, tier = 1) {
  const templates = {
    goober: { glyph: "g", name: "candy goober", hp: 6, str: 3, def: 0, xp: 2, ai: "chase" },
    icething: { glyph: "i", name: "ice-thing", hp: 8, str: 4, def: 1, xp: 3, ai: "chase" },
    sootling: { glyph: "s", name: "sootling", hp: 5, str: 3, def: 0, xp: 2, ai: "wander" },
    firefly: { glyph: "f", name: "firefly", hp: 3, str: 2, def: 0, xp: 1, ai: "skittish" },
    boss: { glyph: "B", name: "Lich King", hp: 30, str: 8, def: 3, xp: 20, ai: "smart" }
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
      base.xp = Math.floor(base.xp * 2);
    } else if (tier === 3) {
      // Elite tier (red) - much stronger
      base.name = "elite " + base.name;
      base.hp = Math.floor(base.hp * 2.5);
      base.str = base.str + 4;
      base.def = base.def + 2;
      base.xp = Math.floor(base.xp * 4);
      // Elite monsters are smarter
      if (base.ai === "wander") base.ai = "chase";
      if (base.ai === "skittish") base.ai = "wander";
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
  
  if (state.log) {
    state.log(`Level up! You are now level ${p.level}!`, "xp");
    state.log(`Your stats increase! HP:${p.hpMax} STR:${p.str} DEF:${p.def}`, "good");
  }
}