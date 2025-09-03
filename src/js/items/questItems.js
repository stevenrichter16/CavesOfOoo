// Quest and dialogue item definitions
// Properly formatted items for the inventory system

// Quest reward items that can be equipped
export const QUEST_WEAPONS = {
  rock_candy_sword: {
    name: "Rock Candy Sword",
    dmg: 8,  // Changed from atk to dmg to match regular weapons
    desc: "Sharp and sweet! Forged in the Candy Forges.",  // Changed from description to desc
    price: 75,  // Added price field
    value: 75,
    tier: 2
  },
  legendary_candy_sword: {
    name: "Legendary Candy Sword", 
    dmg: 15,  // Changed from atk to dmg
    desc: "The ultimate candy weapon, blessed by Princess Bubblegum.",  // Changed to desc
    price: 1000,
    value: 1000,
    tier: 5
  },
  iron_sword: {
    name: "Iron Sword",
    dmg: 6,  // Changed from atk to dmg
    desc: "A solid iron blade.",  // Changed to desc
    price: 50,
    value: 50,
    tier: 2
  }
};

export const QUEST_ARMORS = {
  jawbreaker_shield: {
    name: "Jawbreaker Shield",
    def: 5,
    desc: "Nearly unbreakable candy defense!",  // Changed to desc
    price: 100,
    value: 100,
    tier: 2
  },
  wolf_pelt_cloak: {
    name: "Wolf Pelt Cloak",
    def: 3,
    desc: "Made from Cotton Candy Wolf fur. Soft and protective.",  // Changed to desc
    price: 75,
    value: 75,
    tier: 2
  },
  shadow_cloak: {
    name: "Shadow Cloak",
    def: 4,
    desc: "Blessed with dark magic by Peppermint Butler.",  // Changed to desc
    price: 150,
    value: 150,
    tier: 3
  },
  banana_guard_uniform: {
    name: "Banana Guard Uniform",
    def: 2,
    desc: "Official guard disguise. Banana Guards won't attack you!",
    price: 50,
    value: 50,
    tier: 1,
    disguise: "banana_guard"  // Special property for disguise
  }
};

export const QUEST_HEADGEAR = {
  hero_crown: {
    name: "Hero's Crown",
    def: 3,
    description: "Awarded to the savior of the Candy Kingdom.",
    value: 500,
    tier: 4
  },
  detective_badge: {
    name: "Detective Badge",
    def: 1,
    description: "Root Beer Guy's official detective badge.",
    value: 50,
    tier: 1
  },
  lemon_crown: {
    name: "Lemon Crown",
    def: 2,
    description: "The ancestral crown of lemon nobility.",
    value: 200,
    tier: 3
  }
};

export const QUEST_RINGS = {
  peppermint_ward: {
    name: "Peppermint Ward",
    desc: "Wards off haints and demons. Reduces damage from undead by 30%.",
    ability: "Undead Protection",
    value: 100,
    tier: 2,
    undeadProtection: 0.3  // 30% damage reduction
  },
  silencer_ring: {
    name: "Silencer Ring",
    desc: "Grants discretion in all matters.",
    ability: "Stealth +2",
    value: 250,
    tier: 3
  },
  lemon_charm: {
    name: "Lemon Charm Ring",
    desc: "A noble's favor in ring form.",
    ability: "Charisma +1",
    value: 100,
    tier: 2
  },
  anti_ooze_charm: {
    name: "Anti-Ooze Charm",
    desc: "Protects against dungeon ooze.",
    ability: "Poison Resist",
    value: 150,
    tier: 2
  },
  anti_lich_amulet: {
    name: "Anti-Lich Amulet",
    desc: "Provides some protection against the Lich's power.",
    ability: "Death Resist",
    value: 500,
    tier: 4
  },
  dark_protection_amulet: {
    name: "Dark Protection Amulet",
    desc: "Peppermint Butler's amulet against dark magic.",
    ability: "Curse Resist",
    value: 300,
    tier: 3
  },
  protection_charm: {
    name: "Protection Charm",
    desc: "A simple charm that wards off evil.",
    ability: "Defense +1",
    value: 80,
    tier: 1
  }
};

export const QUEST_POTIONS = {
  sugar_rush_potion: {
    name: "Sugar Rush Potion",
    desc: "Doubles your speed temporarily! (+4 SPD)",
    effect: "buff_spd",  // Now using the proper speed buff effect
    value: 4,  // SPD boost amount
    turns: 20,  // Duration
    price: 20,
    tier: 1
  },
  root_beer_float: {
    name: "Root Beer Float",
    desc: "Refreshing and healing! (+20 HP)",  // Changed to desc
    effect: "heal",
    value: 20,  // HP to heal
    turns: 0,
    price: 5,
    tier: 1
  },
  candy_corn_whiskey: {
    name: "Candy Corn Whiskey",
    desc: "Strong stuff! Don't drive. (+4 STR)",  // Changed to desc
    effect: "buff_str",  // Changed to recognized effect
    value: 4,  // STR boost
    turns: 20,
    price: 10,
    tier: 1
  },
  mystery_punch: {
    name: "Mystery Punch",
    desc: "Made by Peppermint Butler... good luck! (+2 STR/DEF)",  // Changed to desc
    effect: "buff_both",  // Changed to recognized effect
    value: 2,  // Boost for both stats
    turns: 25,
    price: 15,
    tier: 2
  },
  royal_jelly: {
    name: "Royal Jelly",
    desc: "From Princess Bubblegum's private stock. Fully heals!",  // Changed to desc
    effect: "max_heal",  // Changed from fullheal to max_heal
    value: 999,  // Not used for max_heal but including for consistency
    turns: 0,
    price: 200,
    tier: 3
  },
  healing_potion: {
    name: "Healing Potion",
    desc: "Restores 30 HP.",  // Changed to desc
    effect: "heal",
    value: 30,  // HP to heal
    turns: 0,
    price: 15,
    tier: 1
  }
};

// Non-equipment quest items (stored differently)
export const QUEST_ITEMS = {
  // Story items
  diamond_shard: { name: "Diamond Shard", description: "A piece of stolen diamond.", value: 50 },
  stolen_diamonds: { name: "Stolen Diamonds", description: "The Pup Gang's loot!", value: 200 },
  pup_gang_mask: { name: "Pup Gang Mask", description: "Jake Jr.'s disguise mask.", value: 30 },
  
  // Noble items
  noble_seal: { name: "Noble Seal", description: "Grants access to noble areas.", value: 100 },
  noble_favor: { name: "Noble Favor", description: "A token of noble appreciation.", value: 150 },
  noble_recommendation: { name: "Noble Recommendation", description: "Opens doors in high society.", value: 200 },
  noble_introduction_letter: { name: "Introduction Letter", description: "Letter to Peppermint Butler.", value: 50 },
  audience_seal: { name: "Audience Seal", description: "Grants audience with Princess Bubblegum.", value: 500 },
  
  // Guard items
  guard_commendation: { name: "Guard Commendation", description: "Recognition from the Banana Guards.", value: 50 },
  banana_guard_insignia: { name: "Banana Guard Insignia", description: "Official guard badge.", value: 75 },
  guard_insignia: { name: "Guard Insignia", description: "Proves you're an ally of the guards.", value: 100 },
  training_manual: { name: "Training Manual", description: "How to not slip on peels.", value: 25 },
  
  // Butler items
  butler_favor: { name: "Butler's Favor", description: "Peppermint Butler owes you one.", value: 200 },
  butler_protection_sigil: { name: "Butler's Sigil", description: "Marks you under his protection.", value: 300 },
  dark_grimoire: { name: "Dark Grimoire", description: "Contains forbidden knowledge.", value: 500 },
  demon_pact: { name: "Demon Pact", description: "A contract with dark forces.", value: 666 },
  curse_ward_mint: { name: "Curse Ward Mint", description: "Protects against curses. Minty fresh!", value: 50 },
  
  // Dungeon items
  candy_dungeon_map: { name: "Candy Dungeon Map", description: "Shows all secret passages!", value: 150 },
  dungeon_crystal: { name: "Dungeon Crystal", description: "Powers magical devices.", value: 50 },
  ooze_sample: { name: "Ooze Sample", description: "Glowing green dungeon ooze.", value: 30 },
  ooze_core: { name: "Ooze Core", description: "The heart of Mother Ooze.", value: 200 },
  
  // Lich items
  lich_essence: { name: "Lich Essence", description: "Pure evil in material form.", value: 100 },
  lich_dust: { name: "Lich Dust", description: "Remains of the Lich's power.", value: 150 },
  hero_sigil: { name: "Hero Sigil", description: "Marks you as a true hero.", value: 500 },
  
  // Trade items
  rock_candy: { name: "Rock Candy", description: "Hard candy from the caves.", value: 10 },
  sugar_crystals: { name: "Sugar Crystals", description: "Pure crystallized sugar.", value: 15 },
  sugar_crystals_pack: { name: "Sugar Crystal Pack", description: "A bundle of sugar crystals.", value: 45 },
  smuggled_rock_candy: { name: "Smuggled Rock Candy", description: "Illegal hard candy!", value: 25 },
  
  // Forest items
  cotton_candy: { name: "Cotton Candy", description: "Fluffy and sweet!", value: 5 },
  wolf_fang: { name: "Wolf Fang", description: "From a Cotton Candy Wolf.", value: 15 },
  wolf_pelt: { name: "Wolf Pelt", description: "Soft cotton candy fur.", value: 30 },
  alpha_wolf_pelt: { name: "Alpha Wolf Pelt", description: "Pelt of the pack leader.", value: 100 },
  forest_compass: { name: "Forest Compass", description: "Never get lost in the Cotton Candy Forest.", value: 75 },
  forest_anomaly_sample: { name: "Forest Anomaly", description: "Strange growth from the forest.", value: 40 },
  
  // Bandit items
  bandit_mask: { name: "Bandit Mask", description: "Licorice bandit disguise.", value: 30 },
  bandit_head: { name: "Bandit's Head", description: "Proof of the leader's defeat. Ew.", value: 100 },
  stolen_goods: { name: "Stolen Goods", description: "Items stolen by bandits.", value: 40 },
  
  // Starchy's quest items
  graveyard_shift_badge: { name: "Graveyard Shift Badge", description: "Proof you're in the Veritas Brigade!", value: 100 },
  starchy_shed_key: { name: "Starchy's Shed Key", description: "A rusty key to Starchy's tool shed.", value: 5 },
  grave_salt: { name: "Grave Salt", description: "Blessed salt that quiets restless spirits. Sprinkle on graves.", value: 10 },
  whisper_shard: { name: "Whisper Shard", description: "Hums with ghostly voices. Oh my glob!", value: 50 },
  failed_experiment_notes: { name: "Failed Experiment Notes", description: "PB's secret disposal records.", value: 200 },
  sugar_war_blueprints: { name: "Sugar War Blueprints", description: "Candy weapons that can melt flesh!", value: 500 },
  pb_ledger_plate: { name: "PB's Ledger Plate", description: "Records of 'disposed' candy folk.", value: 300 },
  veritas_decoder_ring: { name: "Veritas Decoder Ring", description: "For decoding secret Veritas Brigade messages!", value: 150 },
  graveyard_mist_essence: { name: "Graveyard Mist", description: "Collected from haunted graves.", value: 35 },
  conspiracy_evidence: { name: "Conspiracy Evidence", description: "Proof of cover-ups! The truth will out!", value: 100 },
  memory_wipe_logs: { name: "Memory Wipe Logs", description: "Banana Guard memory erasure records.", value: 250 },
  stolen_jewels: { name: "Stolen Jewels", description: "The noble's precious jewels!", value: 300 },
  licorice_rope: { name: "Licorice Rope", description: "Edible rope used by bandits.", value: 10 },
  
  // Cemetery items
  fresh_candy_seeds: { name: "Fresh Candy Seeds", description: "Seeds for new candy crops.", value: 60 },
  
  // Quest items
  capture_net: { name: "Capture Net", description: "For capturing enemies alive.", value: 40 },
  smuggler_map: { name: "Smuggler's Map", description: "Shows sewer routes.", value: 100 },
  smuggler_ledger: { name: "Smuggler's Ledger", description: "Records of illegal trades.", value: 150 },
  
  // Special items
  crystal_gem_apple: { name: "Crystal Gem Apple", description: "Grants cosmic awareness!", value: 500 },
  crystal_shard: { name: "Crystal Shard", description: "A piece of crystal guardian.", value: 75 },
  questionable_charm: { name: "Questionable Charm", description: "Might help. Or it's candy.", value: 20 },
  novel_chapter_1: { name: "Novel Chapter 1", description: "Root Beer Guy's crime novel draft.", value: 10 },
  
  // Dark magic components
  demon_candle: { name: "Demon Candle", description: "Burns with cold flame.", value: 100 },
  shadow_essence: { name: "Shadow Essence", description: "Condensed darkness.", value: 150 },
  blood_chalk: { name: "Blood Chalk", description: "You don't want to know...", value: 75 },
  
  // Investigation items
  rumor_source_letter: { name: "Incriminating Letter", description: "Proof of who spread rumors.", value: 200 },
  blackmail_documents: { name: "Blackmail Documents", description: "Leverage over nobles.", value: 300 },
  thief_tools: { name: "Thief Tools", description: "Professional lockpicks.", value: 60 },
  
  // Noble estate items
  estate_key: { name: "Estate Key", description: "Key to the summer estate.", value: 100 },
  noble_wine: { name: "Noble Wine", description: "Finest candy wine.", value: 80 },
  
  // Princess items
  pb_blessing: { name: "PB's Blessing", description: "Princess Bubblegum's personal thanks.", value: 1000 },
  royal_favor: { name: "Royal Favor", description: "The highest honor in the kingdom.", value: 750 },
  royal_appointment_token: { name: "Royal Appointment", description: "Scheduled meeting with the Princess.", value: 400 },
  
  // Clues
  clue_candy_wrapper: { name: "Suspicious Wrapper", description: "Jawbreaker wrapper with bite marks.", value: 5 },
  clue_tiny_footprints: { name: "Tiny Footprints", description: "Small sticky footprints.", value: 5 },
  clue_confession_note: { name: "Confession Note", description: "'We were just so hungry...'", value: 10 },
  
  // Misc items
  jawbreaker_stash: { name: "Jawbreaker Stash", description: "The stolen jawbreakers!", value: 100 },
  candy_corn: { name: "Candy Corn", description: "Classic Halloween candy.", value: 5 },
  
  // Gold (special handling)
  gold: { name: "Gold", description: "Currency of the realm.", value: 1 }
};

// Helper function to properly grant items to player
export function grantQuestItem(state, itemId, quantity = 1) {
  console.log('📦 [QUEST_ITEMS] grantQuestItem called with:', { itemId, quantity });
  console.log('📦 [QUEST_ITEMS] State exists:', !!state);
  console.log('📦 [QUEST_ITEMS] Player exists:', !!state?.player);
  
  const player = state.player;
  player.inventory = player.inventory || [];
  
  console.log('📦 [QUEST_ITEMS] Current inventory:', player.inventory);
  console.log('📦 [QUEST_ITEMS] Checking item type for:', itemId);
  
  // Check if it's a weapon
  if (QUEST_WEAPONS[itemId]) {
    console.log('⚔️ [QUEST_ITEMS] Item is a WEAPON:', QUEST_WEAPONS[itemId]);
    const weaponItem = {
      type: 'weapon',
      item: { ...QUEST_WEAPONS[itemId] },
      id: `item_${Date.now()}_${Math.random()}`
    };
    console.log('⚔️ [QUEST_ITEMS] Creating weapon item:', weaponItem);
    player.inventory.push(weaponItem);
    console.log('⚔️ [QUEST_ITEMS] Inventory after adding weapon:', player.inventory);
    
    if (state.log) {
      console.log('📝 [QUEST_ITEMS] Logging to game log');
      state.log(`Received: ${QUEST_WEAPONS[itemId].name}!`, 'good');
    }
    return true;
  }
  
  // Check if it's armor
  if (QUEST_ARMORS[itemId]) {
    console.log('🛡️ [QUEST_ITEMS] Item is ARMOR:', QUEST_ARMORS[itemId]);
    const armorItem = {
      type: 'armor',
      item: { ...QUEST_ARMORS[itemId] },
      id: `item_${Date.now()}_${Math.random()}`
    };
    console.log('🛡️ [QUEST_ITEMS] Creating armor item:', armorItem);
    player.inventory.push(armorItem);
    console.log('🛡️ [QUEST_ITEMS] Inventory after adding armor:', player.inventory);
    
    if (state.log) {
      state.log(`Received: ${QUEST_ARMORS[itemId].name}!`, 'good');
    }
    return true;
  }
  
  // Check if it's headgear
  if (QUEST_HEADGEAR[itemId]) {
    player.inventory.push({
      type: 'headgear',
      item: { ...QUEST_HEADGEAR[itemId] },
      id: `item_${Date.now()}_${Math.random()}`
    });
    if (state.log) {
      state.log(`Received: ${QUEST_HEADGEAR[itemId].name}!`, 'good');
    }
    return true;
  }
  
  // Check if it's a ring
  if (QUEST_RINGS[itemId]) {
    player.inventory.push({
      type: 'ring',
      item: { ...QUEST_RINGS[itemId] },
      id: `item_${Date.now()}_${Math.random()}`
    });
    if (state.log) {
      state.log(`Received: ${QUEST_RINGS[itemId].name}!`, 'good');
    }
    return true;
  }
  
  // Check if it's a potion
  if (QUEST_POTIONS[itemId]) {
    // Check for existing stack
    const existingPotion = player.inventory.find(
      i => i.type === 'potion' && i.item.name === QUEST_POTIONS[itemId].name
    );
    
    if (existingPotion) {
      existingPotion.count = (existingPotion.count || 1) + quantity;
    } else {
      player.inventory.push({
        type: 'potion',
        item: { ...QUEST_POTIONS[itemId] },
        id: `item_${Date.now()}_${Math.random()}`,
        count: quantity
      });
    }
    
    if (state.log) {
      state.log(`Received: ${quantity}x ${QUEST_POTIONS[itemId].name}!`, 'good');
    }
    return true;
  }
  
  // Otherwise it's a misc quest item
  if (QUEST_ITEMS[itemId]) {
    // Quest items go in as generic items
    player.inventory.push({
      type: 'item',
      item: {
        ...QUEST_ITEMS[itemId],
        id: itemId
      },
      id: `item_${Date.now()}_${Math.random()}`,
      count: quantity
    });
    
    if (state.log) {
      state.log(`Received: ${quantity}x ${QUEST_ITEMS[itemId].name}!`, 'good');
    }
    return true;
  }
  
  // Unknown item - create generic
  console.warn(`Unknown quest item: ${itemId}`);
  player.inventory.push({
    type: 'item',
    item: {
      id: itemId,
      name: itemId.replace(/_/g, ' '),
      description: 'A quest item.',
      value: 10
    },
    id: `item_${Date.now()}_${Math.random()}`,
    count: quantity
  });
  
  if (state.log) {
    state.log(`Received: ${quantity}x ${itemId.replace(/_/g, ' ')}!`, 'good');
  }
  return true;
}

// Check if player has a quest item
export function hasQuestItem(player, itemId, quantity = 1) {
  if (!player.inventory) return false;
  
  const item = player.inventory.find(i => 
    i.item?.id === itemId || 
    i.item?.name === QUEST_ITEMS[itemId]?.name ||
    i.item?.name === QUEST_WEAPONS[itemId]?.name ||
    i.item?.name === QUEST_ARMORS[itemId]?.name ||
    i.item?.name === QUEST_HEADGEAR[itemId]?.name ||
    i.item?.name === QUEST_RINGS[itemId]?.name ||
    i.item?.name === QUEST_POTIONS[itemId]?.name
  );
  
  if (!item) return false;
  
  const count = item.count || 1;
  return count >= quantity;
}

// Remove a quest item from inventory
export function removeQuestItem(player, itemId, quantity = 1) {
  if (!player.inventory) return false;
  
  const index = player.inventory.findIndex(i => 
    i.item?.id === itemId || 
    i.item?.name === QUEST_ITEMS[itemId]?.name ||
    i.item?.name === QUEST_WEAPONS[itemId]?.name ||
    i.item?.name === QUEST_ARMORS[itemId]?.name ||
    i.item?.name === QUEST_HEADGEAR[itemId]?.name ||
    i.item?.name === QUEST_RINGS[itemId]?.name ||
    i.item?.name === QUEST_POTIONS[itemId]?.name
  );
  
  if (index < 0) return false;
  
  const item = player.inventory[index];
  const count = item.count || 1;
  
  if (count > quantity) {
    item.count = count - quantity;
  } else {
    player.inventory.splice(index, 1);
  }
  
  return true;
}