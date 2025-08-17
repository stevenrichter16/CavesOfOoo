export const W = 48;
export const H = 22;

export const TILE = { 
  wall: "#", 
  floor: ".", 
  player: "@", 
  artifact: "★", 
  oddity: "♪",
  potion: "!", 
  weapon: "/", 
  armor: "]", 
  headgear: "^",
  chest: "$", 
  shrine: "▲", 
  door: "+",
  monsters: { 
    goober: "g", 
    icething: "i", 
    sootling: "s", 
    firefly: "f", 
    boss: "B" 
  }
};

export const BIOMES = [
  { id: "candy", color: "#ff69b4", monsters: ["goober", "sootling"] },
  { id: "ice", color: "#87ceeb", monsters: ["icething", "firefly"] },
  { id: "fire", color: "#ff6347", monsters: ["sootling", "firefly"] },
  { id: "slime", color: "#90ee90", monsters: ["goober", "icething"] },
];

export const WEAPONS = [
  { name: "Grass Sword", dmg: 3, desc: "A blade of living grass" },
  { name: "Bacon Sword", dmg: 4, desc: "Sizzles with greasy power" },
  { name: "Root Sword", dmg: 5, desc: "Ancient and gnarled" },
  { name: "Crystal Sword", dmg: 6, desc: "Refracts light and enemies" },
  { name: "Demon Sword", dmg: 8, desc: "Whispers dark algebraic truths" },
  // Enchanted weapons
  { name: "Flame Sword", dmg: 4, effect: "burn", effectChance: 0.4, effectValue: 2, effectTurns: 3, 
    desc: "Burns with eternal fire", magical: true },
  { name: "Frost Blade", dmg: 4, effect: "freeze", effectChance: 0.3, effectValue: 0, effectTurns: 1, 
    desc: "Frozen to the touch", magical: true },
  { name: "Venom Dagger", dmg: 3, effect: "poison", effectChance: 0.5, effectValue: 3, effectTurns: 4, 
    desc: "Drips with toxic essence", magical: true },
  { name: "Vampire Fang", dmg: 5, effect: "lifesteal", effectChance: 0.25, effectValue: 0.5, effectTurns: 0, 
    desc: "Thirsts for life force", magical: true },
  { name: "Lightning Rod", dmg: 5, effect: "shock", effectChance: 0.35, effectValue: 4, effectTurns: 2, 
    desc: "Crackles with electricity", magical: true },
  { name: "Cursed Blade", dmg: 7, effect: "weaken", effectChance: 0.3, effectValue: 3, effectTurns: 5, 
    desc: "Saps enemy strength", magical: true },
];

export const ARMORS = [
  { name: "Sweater", def: 1, desc: "Cozy and protective" },
  { name: "Tin Armor", def: 2, desc: "Rattles reassuringly" },
  { name: "Ice Armor", def: 3, desc: "Cool to the touch" },
  { name: "Jake Suit", def: 4, desc: "Stretchy and durable" },
  { name: "Cosmic Armor", def: 5, desc: "Woven from starlight" },
];

export const HEADGEAR = [
  { name: "Finn's Hat", def: 1, desc: "White and iconic" },
  { name: "Ice Crown", def: 2, desc: "Cold authority radiates" },
  { name: "Candy Helmet", def: 1, str: 1, desc: "Sweet and sturdy" },
  { name: "Wizard Hat", def: 0, magic: 3, desc: "Pointed with mysterious power" },
  { name: "Flame Crown", str: 2, def: 1, desc: "Burns with inner fire" },
  { name: "Crystal Circlet", def: 2, magic: 1, desc: "Clarity of thought" },
  { name: "Billy's Helm", def: 3, str: 1, desc: "Hero's legacy" },
  { name: "Mushroom Cap", def: 2, desc: "Spongy and protective" },
  { name: "Lich's Crown", def: 1, str: 3, desc: "Whispers of dark power" },
  { name: "Golden Tiara", def: 4, desc: "Royal protection" },
];

export const POTIONS = [
  { name: "Red Potion", effect: "heal", value: 12, turns: 0, desc: "Tastes like strawberries (+12 HP)" },
  { name: "Blue Potion", effect: "max_heal", value: 999, turns: 0, desc: "Fizzy and electric (Full heal)" },
  { name: "Green Potion", effect: "buff_str", value: 4, turns: 25, desc: "Smells like fresh grass (+4 STR)" },
  { name: "Purple Potion", effect: "buff_def", value: 4, turns: 25, desc: "Thick and syrupy (+4 DEF)" },
  { name: "Yellow Potion", effect: "buff_both", value: 2, turns: 30, desc: "Bubbles with energy (+2 STR/DEF)" },
  { name: "Black Potion", effect: "berserk", value: 6, turns: 15, desc: "Bitter medicine (+6 STR, -2 DEF)" },
];

export const QUOTES = {
  candy: { 
    dusk: { rainy: ["Raindrops gather on sugar petals like tears we sometimes swallow silently."] },
    shrine: ["The Candy People left this shrine. It smells like birthday cake and nostalgia."]
  },
  ice: { 
    night: { clear: ["Frosted edges catch the dying light and whisper, we still shine."] },
    shrine: ["An Ice King shrine. The inscription reads: 'Gunter was here'."]
  },
  fire: { 
    noon: { clear: ["The molten river pulses like a loud heart daring you to feel alive."] },
    shrine: ["A Fire Kingdom seal marks this ancient shrine. It's warm to the touch."]
  },
  slime: { 
    evening: { clear: ["The slime bubbles pop with a wet melody, singing of simple joys."] },
    shrine: ["A gooey shrine pulses with life. Something deep within it remembers being whole."]
  },
};

export const TIMES = ["dawn", "morning", "noon", "afternoon", "evening", "dusk", "night"];
export const WEATHERS = ["clear", "rainy", "windy", "snowy", "stormy"];

export const STORE_PREFIX = "ooo_enhanced_v1";