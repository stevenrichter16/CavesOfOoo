// systems/playerMovement.js - Player movement and collision logic
// Handles all player movement, edge travel, collision detection, and tile interactions

import { W, H } from '../config.js';
import { emit } from '../events.js';
import { EventType } from '../eventTypes.js';
import { log } from '../game.js';
import { Move } from '../actions.js';
import { runPlayerMove } from '../movePipeline.js';
import { isFrozen } from './statusSystem.js';
import { saveChunk, loadChunk } from '../persistence.js';
import { genChunk } from '../worldGen.js';
import { levelUp } from '../entities.js';
import { choice } from '../utils.js';
import { applyStatusEffect } from './statusSystem.js';
import { WEAPONS, ARMORS, HEADGEAR, RINGS, POTIONS, QUOTES, QUEST_TEMPLATES } from '../config.js';
import { checkFetchQuestItem } from '../quests.js';

// Helper to generate unique IDs
let nextItemId = 1;
function generateItemId() {
  return `item_${Date.now()}_${nextItemId++}`;
}

// Helper to add potion with stacking
function addPotionToInventory(state, potion) {
  // Check if we already have this potion type
  const existingPotion = state.player.inventory.find(
    i => i.type === "potion" && i.item.name === potion.name
  );
  
  if (existingPotion) {
    // Stack it
    existingPotion.count = (existingPotion.count || 1) + 1;
  } else {
    // Add new stack
    state.player.inventory.push({
      type: "potion",
      item: { ...potion },
      id: generateItemId(),
      count: 1
    });
  }
  state.player.potionCount++;
}

/**
 * Handle player movement input
 * Processes movement through the pipeline and triggers turn end
 */
export function handlePlayerMove(state, dx, dy) {
  if (state.over) return;
  
  // Check if player is frozen
  const frozen = isFrozen(state.player);
  if (frozen) {
    log(state, "You're frozen solid and can't move!", "magic");
    // Movement blocked but turn still passes
    emit(EventType.MovementBlocked, { reason: 'frozen', player: state.player });
    return true; // Action consumed
  }
  
  // Add dimensions and references to state for movePipeline
  state.W = W;
  state.H = H;
  state.FETCH_ITEMS = state.FETCH_ITEMS || []; // For restoring fetch quest functions
  
  // Add interactTile reference for movePipeline with vendor shop callback
  state.interactTile = (state, x, y) => interactTile(state, x, y, state.openVendorShop);
  
  // Create move action and run through pipeline
  const action = Move(dx, dy);
  const consumed = runPlayerMove(state, action);
  
  return consumed;
}

/**
 * Handle waiting in place
 * Player rests and recovers a small amount of HP
 */
export function waitTurn(state) { 
  if (state.over) return;
  
  // Check if player is frozen
  if (isFrozen(state.player)) {
    log(state, "You're frozen solid and can't act!", "magic");
    return true; // Action consumed
  }
  
  log(state, "You wait. Time wiggles."); 
  state.player.turnsSinceRest = 0;
  
  // Small heal if hurt
  if (state.player.hp < state.player.hpMax) {
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + 1);
    log(state, "You catch your breath. +1 HP", "good");
  }
  
  return true; // Action consumed
}

/**
 * Load or generate a chunk
 * Handles chunk transitions and restoration of fetch quest functions
 */
export function loadOrGenChunk(state, cx, cy) {
  // Save current chunk before switching
  if (state.chunk) {
    saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
  }
  
  state.cx = cx;
  state.cy = cy;
  
  // Load existing or generate new chunk
  const existing = loadChunk(state.worldSeed, cx, cy);
  state.chunk = existing ? existing : genChunk(state.worldSeed, cx, cy);
  
  // Ensure items array exists
  if (!state.chunk.items) state.chunk.items = [];
  
  // Restore itemCheck functions for vendor fetch quests (lost during JSON serialization)
  if (state.chunk.items && state.FETCH_ITEMS) {
    state.chunk.items.forEach(item => {
      if (item.type === "vendor" && item.fetchQuest && item.fetchQuest.targetItem) {
        const targetItem = item.fetchQuest.targetItem;
        // Find matching FETCH_ITEM by name to restore the itemCheck function
        const matchingFetchItem = state.FETCH_ITEMS.find(fi => fi.name === targetItem.name);
        if (matchingFetchItem) {
          item.fetchQuest.targetItem = matchingFetchItem;
        }
      }
    });
  }
}

/**
 * Find an open spot on the map
 * Used when player spawns in a wall after chunk transition
 */
export function findOpenSpot(map) {
  // Try to find a floor tile
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x] === ".") {
        return { x, y };
      }
    }
  }
  
  // Fallback to center if no floor found
  return { x: Math.floor(W / 2), y: Math.floor(H / 2) };
}

/**
 * Handle interactions with tiles at a specific position
 * Processes vendors, artifacts, special tiles, items, etc.
 */
export function interactTile(state, x, y, openVendorShop = null) {
  // Check bounds
  if (y < 0 || y >= H || x < 0 || x >= W) return;
  if (!state.chunk?.map?.[y]?.[x]) return;
  
  const tile = state.chunk.map[y][x];
  if (!state.chunk.items) state.chunk.items = [];
  const items = state.chunk.items;
  
  // Vendor interaction - needs special handling due to UI dependencies
  if (tile === "V") {
    const vendor = items.find(i => i.type === "vendor" && i.x === x && i.y === y);
    if (vendor) {
      log(state, "\"Hello, adventurer! Take a look at my wares!\"", "note");
      // If openVendorShop callback provided (from game.js), use it
      if (openVendorShop) {
        setTimeout(() => {
          openVendorShop(state, vendor);
        }, 0);
      } else {
        // Otherwise just emit event
        emit(EventType.VendorInteraction, { vendor, x, y });
      }
    }
    return; // Don't auto-pickup vendors!
  }
  
  // Artifact interaction
  if (tile === "★") {
    log(state, choice([
      "A diary speaks: 'I dreamed I was a butterfly...'",
      "A music box plays a forgotten lullaby.",
      "An old crown whispers of lost kingdoms."
    ]), "rare");
    state.chunk.map[y][x] = ".";
    state.player.xp += 5;
    log(state, "+5 XP from artifact!", "xp");
    
    // Check for level up
    if (state.player.xp >= state.player.xpNext) {
      levelUp(state);
    }
  } 
  
  // Special tile interaction
  else if (tile === "♪") {
    log(state, choice(getSpecialTileMessages()), "magic");
  }
  
  // Chest opening
  else if (tile === "$") {
    const chest = items.find(i => i.type === "chest" && i.x === x && i.y === y);
    if (!chest) {
      // No chest object found, but tile is $, so create one
      const newChest = { type: "chest", x: x, y: y, opened: false };
      items.push(newChest);
    }
    
    const chestToOpen = chest || items.find(i => i.type === "chest" && i.x === x && i.y === y);
    if (chestToOpen && !chestToOpen.opened) {
      chestToOpen.opened = true;
      state.chunk.map[y][x] = ".";
      
      // Gold chance (40%)
      if (Math.random() < 0.4) {
        const goldAmount = 10 + Math.floor(Math.random() * 40);
        state.player.gold += goldAmount;
        log(state, `The chest contains ${goldAmount} gold!`, "gold");
      }
      
      const loot = Math.random();
      if (loot < 0.25) {
        const weapon = choice(WEAPONS);
        const newItem = { 
          type: "weapon", 
          item: { ...weapon }, // Clone to avoid shared references
          id: generateItemId() 
        };
        state.player.inventory.push(newItem);
        log(state, `Chest contains: ${weapon.name}!`, "good");
      } else if (loot < 0.45) {
        const armor = choice(ARMORS);
        const newItem = { 
          type: "armor", 
          item: { ...armor }, // Clone to avoid shared references
          id: generateItemId() 
        };
        state.player.inventory.push(newItem);
        log(state, `Chest contains: ${armor.name}!`, "good");
      } else if (loot < 0.65) {
        const headgear = choice(HEADGEAR);
        state.player.inventory.push({ 
          type: "headgear", 
          item: { ...headgear }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${headgear.name}!`, "good");
      } else if (loot < 0.85) {
        const ring = choice(RINGS);
        state.player.inventory.push({ 
          type: "ring", 
          item: { ...ring }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${ring.name}!`, "good");
      } else {
        const potion = choice(POTIONS);
        addPotionToInventory(state, potion);
        log(state, `Chest contains: ${potion.name}!`, "good");
      }
    }
  }
  
  // Potion pickup
  else if (tile === "!") {
    const potion = items.find(i => i.type === "potion" && i.x === x && i.y === y);
    if (potion) {
      addPotionToInventory(state, potion.item);
      state.chunk.map[y][x] = ".";
      log(state, `You pickup: ${potion.item.name}`, "good");
      // Remove from items
      const idx = items.indexOf(potion);
      if (idx >= 0) items.splice(idx, 1);
    }
  }
  
  // Equipment pickup (weapon/armor/headgear)
  else if (tile === "/" || tile === "]" || tile === "^") {
    const item = items.find(i => (i.type === "weapon" || i.type === "armor" || i.type === "headgear") && i.x === x && i.y === y);
    if (item) {
      state.player.inventory.push({ 
        type: item.type, 
        item: { ...item.item }, // Clone to avoid shared references
        id: generateItemId() 
      });
      state.chunk.map[y][x] = ".";
      log(state, `You pickup: ${item.item.name}`, "good");
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
    }
  }
  
  // Shrine interaction
  else if (tile === "▲") {
    const shrine = items.find(i => i.type === "shrine" && i.x === x && i.y === y);
    if (shrine && !shrine.used) {
      shrine.used = true;
      log(state, choice(QUOTES[state.chunk.biome]?.shrine || ["The shrine pulses with ancient power."]), "magic");
      // Blessing effect
      const blessing = Math.random();
      if (blessing < 0.3) {
        state.player.hp = state.player.hpMax;
        log(state, "The shrine fully restores your health!", "good");
      } else if (blessing < 0.6) {
        applyStatusEffect(state.player, "buff_str", 50, 3);
        log(state, "The shrine grants you strength!", "good");
      } else {
        applyStatusEffect(state.player, "buff_def", 50, 3);
        log(state, "The shrine grants you protection!", "good");
      }
    }
  }
}

/**
 * Get special tile messages for the ♪ tile
 */
function getSpecialTileMessages() {
  return [
    // Original messages
    "The floor hums with ancient magic.",
    "A voice echoes: 'Remember to be awesome.'",
    "Time feels stretchy here, like taffy.",
    
    // Mystical/philosophical
    "You hear the universe giggling softly.",
    "Something here remembers being a star.",
    "The air tastes like purple nostalgia.",
    "Reality hiccups. You pretend not to notice.",
    "This spot exists in seven dimensions. You can feel three.",
    "A memory that isn't yours floats by.",
    "The ground purrs like a sleepy cosmic cat.",
    "You smell colors and see sounds for a moment.",
    "Gravity feels optional here.",
    "The shadows are dancing to silent music.",
    "You briefly understand everything, then forget.",
    "Time moves sideways for exactly three seconds.",
    "The walls are dreaming about being clouds.",
    "You hear tomorrow's echo.",
    "Something whispers your true name backwards.",
    
    // Adventure Time vibes
    "Mathematical! This place is algebraic!",
    "The dungeon sighs contentedly.",
    "You feel inexplicably radical.",
    "A ghostly voice says 'What time is it?'",
    "Everything turns sepia-toned briefly.",
    "You taste bacon pancakes... somehow.",
    "The stones remember better days.",
    "Reality does a little flip. Neat!",
    
    // Funny/whimsical
    "Your reflection winks at you from nowhere.",
    "The floor apologizes for being cold.",
    "You hear someone humming off-key nearby. It's you.",
    "A dust mote does a tiny backflip.",
    "The darkness feels unusually friendly.",
    "Your shadow high-fives itself.",
    "Something invisible boops your nose.",
    "The silence is uncomfortably loud.",
    "You feel briefly taller. Or is everything else shorter?",
    "The air sparkles with unfinished thoughts.",
    
    // Cryptic/mysterious
    "The number 47 appears in your mind.",
    "You see a door that was never there.",
    "Someone left their dreams here.",
    "The walls know your middle name.",
    "You hear dice rolling in the distance.",
    "A clock ticks thirteen times.",
    "The darkness has been expecting you.",
    "You find a memory you haven't made yet.",
    "The stones spell out words in a language you almost know.",
    "You see your past self for half a second.",
    
    // Sensory/atmospheric
    "It smells like rain on another planet.",
    "The temperature can't decide what it wants to be.",
    "Light bends wrong here.",
    "You hear the sound of melting starlight.",
    "The air feels thick with possibility.",
    "Everything glows slightly from within."
  ];
}

/**
 * Handle door opening
 */
export function openDoor(state, x, y) {
  if (state.chunk?.map?.[y]?.[x] === "+") {
    state.chunk.map[y][x] = ".";
    log(state, "You open the door.");
    emit(EventType.DoorOpened, { x, y });
    return true;
  }
  return false;
}

/**
 * Handle wall collision  
 */
export function hitWall(state) {
  log(state, "You bonk the wall. It forgives you.");
  emit(EventType.WallCollision, { player: state.player });
}