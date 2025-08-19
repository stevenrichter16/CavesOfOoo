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
  vendor: "V",
  monsters: { 
    goober: "g", 
    icething: "i", 
    sootling: "s", 
    firefly: "f", 
    boss: "B",
    flamepup: "☼",
    frostbite: "F",
    toxicslime: "T",
    sparkler: "S",
    wraith: "W",
    shadow_beast: "◆",
    bone_knight: "K",
    demon: "D"
  }
};

export const BIOME_TIERS = {
  // Tier 1 - Starting area (distance 0-3)
  candy_forest: { 
    tier: 1, 
    id: "candy_forest",
    monsters: ["goober", "firefly"],
    colors: { primary: "#FFB6C1", secondary: "#FFC0CB" }
  },
  
  // Tier 2 - Early exploration (distance 4-7)
  slime_kingdom: { 
    tier: 2, 
    id: "slime_kingdom",
    monsters: ["toxicslime", "goober", "sparkler"],
    colors: { primary: "#90EE90", secondary: "#98FB98" }
  },
  
  // Tier 3 - Mid game (distance 8-11)
  frost_caverns: { 
    tier: 3, 
    id: "frost_caverns",
    monsters: ["icething", "frostbite"],
    colors: { primary: "#B0E0E6", secondary: "#87CEEB" }
  },
  
  // Tier 4 - Challenging (distance 12-15)
  volcanic_marsh: { 
    tier: 4, 
    id: "volcanic_marsh",
    monsters: ["flamepup", "sootling"],
    colors: { primary: "#FF6347", secondary: "#FF4500" }
  },
  
  // Tier 5 - Dangerous (distance 16-19)
  corrupted_dungeon: { 
    tier: 5, 
    id: "corrupted_dungeon",
    monsters: ["wraith", "shadow_beast"],
    colors: { primary: "#4B0082", secondary: "#6A0DAD" }
  },
  
  // Tier 6 - Endgame (distance 20+)
  lich_domain: { 
    tier: 6, 
    id: "lich_domain",
    monsters: ["bone_knight", "demon"],
    colors: { primary: "#2F4F4F", secondary: "#191970" }
  }
};

// For backwards compatibility, create BIOMES array
export const BIOMES = Object.values(BIOME_TIERS);

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
  { name: "Jake's Cap", spd: 3, desc: "Stretchy and quick" },
  { name: "Billy's Helm", def: 3, str: 1, desc: "Hero's legacy" },
  { name: "Marceline's Hood", spd: 2, magic: 1, desc: "Swift as a vampire" },
  { name: "Lich's Crown", def: 1, str: 3, desc: "Whispers of dark power" },
  { name: "Feather Cap", spd: 4, desc: "Light as air" },
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

// Quest templates
export const QUEST_TEMPLATES = {
  kill_any: {
    id: "kill_any",
    name: "Monster Hunter",
    description: "The land needs heroes. Defeat any monster!",
    objective: "Defeat any 1 monster",
    targetMonster: "any",
    targetCount: 1,
    rewards: {
      gold: 25,
      xp: 15,
      item: null
    },
    completionText: "Good work! The land is a bit safer now.",
    isRepeatable: true,
    isStarter: true
  },
  
  kill_goober: {
    id: "kill_goober",
    name: "Goober Trouble",
    description: "Those goobers are causing mischief again!",
    objective: "Defeat 2 goobers",
    targetMonster: "goober",
    targetCount: 2,
    rewards: {
      gold: 50,
      xp: 25,
      item: null
    },
    completionText: "Well done! Those goobers won't bother anyone for a while.",
    isRepeatable: true
  },
  
  kill_three: {
    id: "kill_three",
    name: "Pest Control",
    description: "Clear out some of the monster population.",
    objective: "Defeat 3 monsters",
    targetMonster: "any",
    targetCount: 3,
    rewards: {
      gold: 100,
      xp: 50,
      item: { type: "potion", item: POTIONS[0] }
    },
    completionText: "Excellent! Here's a potion for your troubles.",
    isRepeatable: true
  },
  
  kill_icething: {
    id: "kill_icething",
    name: "Frozen Menace",
    description: "An ice-thing has been freezing our water supply. Help us!",
    objective: "Defeat 1 ice-thing",
    targetMonster: "icething",
    targetCount: 1,
    rewards: {
      gold: 75,
      xp: 30,
      item: { type: "potion", item: POTIONS[1] }
    },
    completionText: "Excellent work! Our water flows freely again!",
    isRepeatable: false
  },
  
  kill_boss: {
    id: "kill_boss",
    name: "Hero's Challenge",
    description: "A terrible boss monster threatens our land. Only a true hero can stop it!",
    objective: "Defeat a boss monster",
    targetMonster: "boss",
    targetCount: 1,
    rewards: {
      gold: 500,
      xp: 100,
      item: { type: "weapon", item: WEAPONS[4] }
    },
    completionText: "You are a true hero! The land is saved!",
    isRepeatable: false
  }
};

// Fetch quest items that vendors can request
export const FETCH_ITEMS = [
  { type: "potion", name: "a healing potion", itemCheck: (item) => item.type === "potion" && item.item.effect === "heal" },
  { type: "potion", name: "any potion", itemCheck: (item) => item.type === "potion" },
  { type: "weapon", name: "any weapon", itemCheck: (item) => item.type === "weapon" },
  { type: "armor", name: "any armor", itemCheck: (item) => item.type === "armor" },
  { type: "headgear", name: "any headgear", itemCheck: (item) => item.type === "headgear" },
  { type: "weapon", name: "a magical weapon", itemCheck: (item) => item.type === "weapon" && item.item.magical },
  { type: "armor", name: "armor with 2+ defense", itemCheck: (item) => item.type === "armor" && item.item.def >= 2 },
  { type: "headgear", name: "headgear with stats", itemCheck: (item) => item.type === "headgear" && (item.item.str || item.item.spd || item.item.magic) }
];