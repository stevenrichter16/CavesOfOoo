// systems/playerMovement.js - Player movement and collision logic
// Handles all player movement, edge travel, collision detection, and tile interactions

import { W, H } from '../core/config.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { log } from '../core/game.js';
import { Move } from '../core/actions.js';
import { runPlayerMove } from './movePipeline.js';
import { isFrozen } from '../combat/statusSystem.js';
import { saveChunk, loadChunk } from '../utils/persistence.js';
import { genChunk } from '../world/worldGen.js';
import * as WorldIntegration from '../world/gameIntegration.js';
import { levelUp } from '../entities/entities.js';
import { choice } from '../utils/utils.js';
import { applyStatusEffect } from '../combat/statusSystem.js';
import { WEAPONS, ARMORS, HEADGEAR, RINGS, POTIONS, QUOTES, QUEST_TEMPLATES } from '../core/config.js';
import { getTerrainSystem } from '../systems/TerrainSystem.js';
import { checkFetchQuestItem } from '../quests/quests.js';
import { glyphToTileId } from '../world/tileUtils.js';
import { getTileDef } from '../world/TileRegistry.js';

// Helper to generate unique IDs
let nextItemId = 1;
function generateItemId() {
  return `item_${Date.now()}_${nextItemId++}`;
}

function getTileInfo(state, x, y) {
  const chunk = state.chunk;
  const glyph = chunk?.map?.[y]?.[x] ?? null;
  let rawTileId = null;

  if (chunk?.getTileId) {
    rawTileId = chunk.getTileId(x, y);
  } else if (chunk?.tileIds?.[y]) {
    rawTileId = chunk.tileIds[y][x] ?? null;
  }

  if (!rawTileId && glyph) {
    rawTileId = glyphToTileId(glyph, null);
  }

  let resolvedTileId = rawTileId;
  if (!resolvedTileId || resolvedTileId.startsWith('legacy.')) {
    const legacyGlyph = rawTileId?.startsWith('legacy.glyph.')
      ? rawTileId.slice('legacy.glyph.'.length)
      : glyph;
    if (legacyGlyph) {
      const mapped = glyphToTileId(legacyGlyph, null);
      if (mapped) {
        resolvedTileId = mapped;
      }
    }
  }

  let tileDef = null;
  if (resolvedTileId && !resolvedTileId.startsWith('legacy.')) {
    try {
      tileDef = getTileDef(resolvedTileId);
    } catch (err) {
      tileDef = null;
    }
  }
  return { glyph, tileId: rawTileId, resolvedTileId, tileDef };
}

function setFloorTile(state, x, y) {
  if (!state.chunk) return;
  try {
    state.chunk.setTile(x, y, 'floor.default');
  } catch (err) {
    state.chunk.setTile(x, y, '.');
  }
}

const ITEM_TILE_PRIORITY = ['vendor', 'chest', 'shrine', 'potion', 'throwable', 'weapon', 'armor', 'headgear', 'ring'];

const ITEM_TYPE_TO_TILE_ID = {
  vendor: 'interaction.vendor.tile',
  chest: 'container.chest.generic',
  shrine: 'decoration.shrine.marker',
  potion: 'item.drop.potion',
  throwable: 'item.drop.throwable',
  weapon: 'item.drop.weapon',
  armor: 'item.drop.armor',
  headgear: 'item.drop.headgear',
  ring: 'item.drop.ring'
};

function deriveTileIdFromItems(itemsAtPos) {
  for (const type of ITEM_TILE_PRIORITY) {
    const match = itemsAtPos.find(item => item.type === type);
    if (match) {
      return ITEM_TYPE_TO_TILE_ID[type] ?? null;
    }
  }
  return null;
}

function normalizeTileId(tileInfo, itemsAtPos) {
  if (!tileInfo) return null;

  const { resolvedTileId, glyph } = tileInfo;

  if (resolvedTileId && !resolvedTileId.startsWith('legacy.')) {
    if (resolvedTileId === 'terrain.hazard.spikes') {
      const headgearItem = itemsAtPos.find(item => item.type === 'headgear');
      if (headgearItem) {
        return 'item.drop.headgear';
      }
    }
    return resolvedTileId;
  }

  const itemDerived = deriveTileIdFromItems(itemsAtPos);
  if (itemDerived) {
    return itemDerived;
  }

  if (glyph) {
    const fallback = glyphToTileId(glyph, null);
    if (fallback) {
      return fallback;
    }
  }

  return resolvedTileId;
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
export async function loadOrGenChunk(state, cx, cy) {
  // Save current chunk before switching using the new system
  if (state.chunk) {
    try {
      // Save to new system
      await WorldIntegration.saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
    } catch (e) {
      // Fallback to old system
      saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
    }
  }
  
  state.cx = cx;
  state.cy = cy;
  
  // Try to use new chunk system, fallback to old
  let chunk;
  try {
    chunk = await WorldIntegration.loadChunk(state.worldSeed, cx, cy);
    if (!chunk) {
      chunk = await WorldIntegration.genChunk(state.worldSeed, cx, cy);
    }
  } catch (e) {
    // Fallback to old system
    const existing = loadChunk(state.worldSeed, cx, cy);
    chunk = existing ? existing : genChunk(state.worldSeed, cx, cy);
  }
  state.chunk = chunk;
  
  // Ensure items array exists
  if (!state.chunk.items) state.chunk.items = [];
  
  // Emit chunk entered event for quest spawning
  import('../systems/EventBus.js').then(module => {
    const eventBus = module.getGameEventBus();
    eventBus.emit('ChunkEntered', {
      chunk: { x: cx, y: cy },
      state: state
    });
  });
  
  // If this is the graveyard, populate it
  if (cx === -1 && cy === 0) {
    import('../world/graveyardChunk.js').then(module => {
      module.populateGraveyard(state);
    });
  }
  
  // If this is the shopping district, spawn NPCs from npcData
  if (cx === 1 && cy === 0 && state.chunk?.npcData) {
    console.log('🛍️ Entering Shopping District, spawning NPCs...');
    import('../../social/migrationAdapter.js').then(socialModule => {
      if (state.chunk?.npcData) {
        // Initialize NPCs array if it doesn't exist
        if (!state.npcs) state.npcs = [];
        
        const npcCount = state.chunk.npcData.length;
        console.log(`📦 Found ${npcCount} NPCs to spawn in shopping district`);
        
        state.chunk.npcData.forEach(data => {
          // Set the chunk coordinates for spawning - NPCs use chunkX/chunkY not cx/cy
          data.chunkX = cx;
          data.chunkY = cy;
          
          console.log(`🔍 Spawning NPC with data:`, {
            id: data.id,
            name: data.name,
            goods: data.goods,
            shopkeeper: data.shopkeeper,
            x: data.x,
            y: data.y
          });
          
          const npc = socialModule.spawnSocialNPC(state, data);
          if (npc) {
            state.npcs.push(npc);
            console.log(`✅ Spawned NPC: ${npc.name} at (${npc.x}, ${npc.y}) in chunk (${npc.chunkX}, ${npc.chunkY})`, {
              goods: npc.goods,
              shopkeeper: npc.shopkeeper
            });
          } else {
            console.warn(`⚠️ Failed to spawn NPC: ${data.name}`);
          }
        });
        
        // Clear npcData after spawning to avoid duplicates
        delete state.chunk.npcData;
        console.log(`🎉 Successfully spawned ${state.npcs.filter(n => n.cx === cx && n.cy === cy).length} NPCs in shopping district`);
      }
    }).catch(err => {
      console.error('❌ Error spawning shopping district NPCs:', err);
    });
  }
  
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
export function findOpenSpot(mapOrChunk) {
  const terrain = getTerrainSystem();
  const map = Array.isArray(mapOrChunk) ? mapOrChunk : mapOrChunk?.map;
  if (!Array.isArray(map)) {
    console.error('Invalid map passed to findOpenSpot');
    return { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  }

  const tileIds = !Array.isArray(mapOrChunk) ? mapOrChunk?.tileIds : null;

  for (let y = 0; y < Math.min(H, map.length); y++) {
    const row = map[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < Math.min(W, row.length); x++) {
      const glyph = row[x];
      const tileId = tileIds?.[y]?.[x] ?? (glyph ? glyphToTileId(glyph, null) : null);
      const key = tileId ?? glyph;
      if (key && terrain.isPassable(key)) {
        return { x, y };
      }
    }
  }

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
  
  const tileInfo = getTileInfo(state, x, y);
  if (!state.chunk.items) state.chunk.items = [];
  const items = state.chunk.items;
  const itemsAtPos = items.filter(i => i.x === x && i.y === y);
  const normalizedTileId = normalizeTileId(tileInfo, itemsAtPos);

  // Vendor interaction - needs special handling due to UI dependencies
  if (normalizedTileId === 'interaction.vendor.tile') {
    const vendor = itemsAtPos.find(i => i.type === 'vendor') || items.find(i => i.type === 'vendor' && i.x === x && i.y === y);
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
  if (normalizedTileId === 'item.collectible.artifact') {
    log(state, choice([
      "A diary speaks: 'I dreamed I was a butterfly...'",
      "A music box plays a forgotten lullaby.",
      "An old crown whispers of lost kingdoms."
    ]), "rare");
    setFloorTile(state, x, y);
    state.player.xp += 5;
    log(state, "+5 XP from artifact!", "xp");
    
    // Check for level up
    if (state.player.xp >= state.player.xpNext) {
      levelUp(state);
    }
  } 
  
  // Special tile interaction
  else if (normalizedTileId === 'item.collectible.oddity') {
    log(state, choice(getSpecialTileMessages()), "magic");
  }
  
  // Chest opening
  else if (normalizedTileId === 'container.chest.generic') {
    // Find or create chest object
    let chest = itemsAtPos.find(i => i.type === 'chest');
    if (!chest) {
      chest = { type: 'chest', x: x, y: y, opened: false };
      items.push(chest);
    }
    
    if (!chest.opened) {
      chest.opened = true;
      
      // IMPORTANT: Update the map tile to remove the chest graphic
      setFloorTile(state, x, y);
      
      // Remove the chest from the items array so it won't be drawn
      const chestIndex = items.indexOf(chest);
      if (chestIndex !== -1) {
        items.splice(chestIndex, 1);
      }
      
      // Save chunk immediately to persist the change
      saveChunk(state.worldSeed, state.cx, state.cy, state.chunk);
      
      // Gold chance (40%)
      if (Math.random() < 0.4) {
        const goldAmount = 10 + Math.floor(Math.random() * 40);
        state.player.gold += goldAmount;
        log(state, `The chest contains ${goldAmount} gold!`, "gold");
      }
      
      const loot = Math.random();
      if (loot < 0.20) {
        const weapon = choice(WEAPONS);
        const newItem = { 
          type: "weapon", 
          item: { ...weapon }, // Clone to avoid shared references
          id: generateItemId() 
        };
        state.player.inventory.push(newItem);
        log(state, `Chest contains: ${weapon.name}!`, "good");
      } else if (loot < 0.35) {
        const armor = choice(ARMORS);
        const newItem = { 
          type: "armor", 
          item: { ...armor }, // Clone to avoid shared references
          id: generateItemId() 
        };
        state.player.inventory.push(newItem);
        log(state, `Chest contains: ${armor.name}!`, "good");
      } else if (loot < 0.50) {
        const headgear = choice(HEADGEAR);
        state.player.inventory.push({ 
          type: "headgear", 
          item: { ...headgear }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${headgear.name}!`, "good");
      } else if (loot < 0.65) {
        const ring = choice(RINGS);
        state.player.inventory.push({ 
          type: "ring", 
          item: { ...ring }, // Clone to avoid shared references
          id: generateItemId() 
        });
        log(state, `Chest contains: ${ring.name}!`, "good");
      } else if (loot < 0.80) {
        // Throwable pots!
        import('../items/throwables.js').then(module => {
          const potTier = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
          const potIds = Object.keys(module.THROWABLE_POTS).filter(id => 
            module.THROWABLE_POTS[id].tier === potTier
          );
          const potId = choice(potIds);
          const pot = module.THROWABLE_POTS[potId];
          const count = 3 + Math.floor(Math.random() * 5); // 3-7 pots
          
          // Copy all pot properties including damageType and statusEffect
          const potCopy = { ...pot, id: potId };
          
          state.player.inventory.push({
            type: "throwable",
            item: potCopy,
            id: generateItemId(),
            count: count
          });
          log(state, `Chest contains: ${pot.name} x${count}!`, "good");
        });
      } else {
        const potion = choice(POTIONS);
        addPotionToInventory(state, potion);
        log(state, `Chest contains: ${potion.name}!`, "good");
      }
    }
  }
  
  // Potion pickup
  else if (normalizedTileId === 'item.drop.potion') {
    const potion = itemsAtPos.find(i => i.type === 'potion');
    if (potion) {
      addPotionToInventory(state, potion.item);
      setFloorTile(state, x, y);
      log(state, `You pickup: ${potion.item.name}`, "good");
      // Remove from items
      const idx = items.indexOf(potion);
      if (idx >= 0) items.splice(idx, 1);
    }
  }
  
  // Equipment pickup (weapon/armor/headgear)
  else if (
    normalizedTileId === 'item.drop.weapon' ||
    normalizedTileId === 'item.drop.armor' ||
    normalizedTileId === 'item.drop.headgear' ||
    normalizedTileId === 'item.drop.ring'
  ) {
    const item = itemsAtPos.find(i => i.type === 'weapon' || i.type === 'armor' || i.type === 'headgear' || i.type === 'ring');
    if (item) {
      state.player.inventory.push({ 
        type: item.type, 
        item: { ...item.item }, // Clone to avoid shared references
        id: generateItemId() 
      });
      setFloorTile(state, x, y);
      log(state, `You pickup: ${item.item.name}`, "good");
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
    }
  }
  
  // Shrine interaction
  else if (normalizedTileId === 'decoration.shrine.marker') {
    const shrine = itemsAtPos.find(i => i.type === 'shrine');
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
  
  // Quest item pickup
  else if (items.some(i => i.type === "quest_item" && i.x === x && i.y === y)) {
    const questItem = items.find(i => i.type === "quest_item" && i.x === x && i.y === y);
    if (questItem) {
      // Grant the quest item(s) - use count if specified
      const quantity = questItem.count || 1;
      import('../items/questItems.js').then(module => {
        module.grantQuestItem(state, questItem.item.id, quantity);
        if (quantity > 1) {
          log(state, `You found: ${quantity}x ${questItem.item.name}!`, "quest");
        } else {
          log(state, `You found: ${questItem.item.name}!`, "quest");
        }
        
        // Special handling for whisper shard
        if (questItem.item.id === 'whisper_shard') {
          import('../world/graveyardChunk.js').then(graveyardModule => {
            graveyardModule.collectWhisperShard(state);
          });
        }
        
        // Remove from items
        const idx = items.indexOf(questItem);
        if (idx >= 0) items.splice(idx, 1);
      });
    }
  }
  
  // Graveyard-specific interactions
  else if (state.chunk?.isGraveyard) {
    import('../world/graveyardChunk.js').then(module => {
      module.handleGraveyardInteraction(state, x, y);
    });
  }
  
  // Candy Market interactions
  else if (state.chunk?.isMarket) {
    import('../world/candyMarketChunk.js').then(module => {
      module.handleMarketInteraction(state, x, y);
    });
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
    setFloorTile(state, x, y);
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
