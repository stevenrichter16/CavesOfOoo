// src/js/world/graveyardChunk.js
// Candy Kingdom Graveyard - Fixed chunk at coordinates (-1, 0)

import { W, H } from '../core/config.js';
import { spawnSocialNPC } from '../social/init.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// Graveyard chunk coordinates
export const GRAVEYARD_COORDS = { x: -1, y: 0 };

// Track which graves have wards placed
const wardedGraves = new Set();

// Track if player has collected whisper shard
let whisperShardCollected = false;

/**
 * Generate the Candy Kingdom graveyard layout
 * ASCII art style graveyard with graves, crypts, and paths
 */
export function generateGraveyardMap() {
  const map = [];
  
  // Initialize with dirt floor (.)
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      map[y][x] = '.';
    }
  }
  
  // Add graveyard walls (outer perimeter with openings)
  for (let x = 0; x < W; x++) {
    map[0][x] = '#';
    map[H-1][x] = '#';
  }
  for (let y = 0; y < H; y++) {
    map[y][0] = '#';
    map[y][W-1] = '#';
  }
  
  // Add openings for chunk transitions
  // Top opening (to go north)
  for (let x = Math.floor(W/2) - 2; x <= Math.floor(W/2) + 2; x++) {
    map[0][x] = '.';
  }
  
  // Bottom opening (to go south) - main entrance
  for (let x = Math.floor(W/2) - 2; x <= Math.floor(W/2) + 2; x++) {
    map[H-1][x] = '.';
  }
  
  // Left opening (to go west)
  for (let y = Math.floor(H/2) - 1; y <= Math.floor(H/2) + 1; y++) {
    map[y][0] = '.';
  }
  
  // Right opening (to go east - back to candy market at 0,0)
  for (let y = Math.floor(H/2) - 1; y <= Math.floor(H/2) + 1; y++) {
    map[y][W-1] = '.';
  }
  
  // Add gravestones in rows (using 'T' for tombstones)
  // First row of graves
  for (let x = 3; x < W - 3; x += 3) {
    if (x < W - 3) {
      map[3][x] = 'T';
      map[4][x] = '#';  // Base of gravestone
    }
  }
  
  // Second row of graves
  for (let x = 4; x < W - 3; x += 3) {
    if (x < W - 3) {
      map[7][x] = 'T';
      map[8][x] = '#';  // Base of gravestone
    }
  }
  
  // Third row of graves
  for (let x = 3; x < W - 3; x += 3) {
    if (x < W - 3) {
      map[11][x] = 'T';
      map[12][x] = '#';  // Base of gravestone
    }
  }
  
  // Fourth row of graves (older section)
  for (let x = 4; x < W - 3; x += 3) {
    if (x < W - 3) {
      map[15][x] = 'T';
      map[16][x] = '#';  // Base of gravestone
    }
  }
  
  // Add crypts (larger structures)
  // Rootbeer Mausoleum (quest location)
  const cryptX = W - 8;
  const cryptY = 4;
  for (let y = cryptY; y < cryptY + 4; y++) {
    for (let x = cryptX; x < cryptX + 5; x++) {
      if (x < W - 1 && y < H - 1) {
        map[y][x] = '#';
      }
    }
  }
  map[cryptY + 1][cryptX + 2] = '+';  // Crypt door
  map[cryptY + 2][cryptX + 2] = '+';  // Crypt door
  
  // Second crypt (for other quests)
  const crypt2X = 2;
  const crypt2Y = 10;
  for (let y = crypt2Y; y < crypt2Y + 4; y++) {
    for (let x = crypt2X; x < crypt2X + 5; x++) {
      if (x < W - 1 && y < H - 1) {
        map[y][x] = '#';
      }
    }
  }
  map[crypt2Y + 1][crypt2X + 2] = '+';  // Crypt door
  map[crypt2Y + 2][crypt2X + 2] = '+';  // Crypt door
  
  // Add some dead trees (using 'Y' for dead trees - like bare branches)
  map[2][2] = 'Y';
  map[5][W-3] = 'Y';
  map[14][5] = 'Y';
  map[9][W-6] = 'Y';
  
  // Add paths between graves (keep as dirt .)
  // Paths are already dirt, but we ensure clear walking paths
  for (let y = 2; y < H - 2; y++) {
    map[y][Math.floor(W/2)] = '.';  // Central path
  }
  
  // Add special tiles for atmosphere
  // Spooky mist tiles (using '~' repurposed as mist)
  map[6][6] = '~';
  map[10][W-7] = '~';
  map[13][4] = '~';
  
  // Add Starchy's workshop/shed (larger and more detailed)
  const shedX = 2;
  const shedY = H - 7;
  
  // Shed walls (5x4 building)
  for (let y = shedY; y < shedY + 4; y++) {
    for (let x = shedX; x < shedX + 5; x++) {
      if (x < W - 1 && y < H - 1) {
        // Create walls
        if (y === shedY || y === shedY + 3 || x === shedX || x === shedX + 4) {
          map[y][x] = '#';
        } else {
          // Interior floor
          map[y][x] = '.';
        }
      }
    }
  }
  
  // Add shed details
  map[shedY + 2][shedX + 4] = '▓';  // Shed door (heavy door)
  map[shedY + 1][shedX + 1] = '☐';  // Window
  map[shedY + 1][shedX + 3] = '☐';  // Window
  
  // Add some gardening tools outside
  map[shedY - 1][shedX + 1] = '†';  // Shovel leaning against shed
  map[shedY + 1][shedX - 1] = 'b';  // Barrel outside
  
  return map;
}

/**
 * Spawn graveyard-specific NPCs and items
 */
export function populateGraveyard(state) {
  // Always spawn Starchy in the graveyard if not already present
  const starchyExists = state.npcs?.some(npc => npc.id === 'starchy');
  
  if (!starchyExists) {
    // Find a random empty tile for Starchy, excluding shed interior
    const shedX = 2;
    const shedY = H - 7; // H = 22, so shedY = 15
    const emptyTiles = [];
    
    // Collect all empty floor tiles that are NOT inside the shed
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        // Check if this tile is empty floor
        if (state.chunk.map[y][x] === '.') {
          // Check if it's NOT inside the shed (shed interior is from x:3-5, y:16-17)
          const insideShed = (x >= shedX + 1 && x <= shedX + 3 && 
                             y >= shedY + 1 && y <= shedY + 2);
          if (!insideShed) {
            emptyTiles.push({ x, y });
          }
        }
      }
    }
    
    // Pick a random empty tile for Starchy
    let starchyPos = { x: 6, y: H - 5 }; // Default position as fallback
    if (emptyTiles.length > 0) {
      starchyPos = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    }
    
    // Spawn Starchy at the chosen position
    spawnSocialNPC(state, {
      id: 'starchy',
      name: 'Starchy',
      x: starchyPos.x,
      y: starchyPos.y,
      faction: 'peasants',
      dialogueType: 'starchy',
      traits: ['secretive', 'gossipy'],
      hp: 25,
      hpMax: 25,
      chunkX: -1,  // Explicitly set graveyard coordinates
      chunkY: 0
    });
    
    if (state.log) {
      state.log("You see Starchy digging a fresh grave nearby.", "note");
    }
  }
  
  // Add some candy ghosts at night
  const isNight = state.timeIndex >= 4;  // evening, dusk, or night
  
  if (isNight && Math.random() < 0.3) {
    // Spawn a candy ghost (haint)
    const ghostX = 3 + Math.floor(Math.random() * (W - 6));
    const ghostY = 3 + Math.floor(Math.random() * (H - 6));
    
    // Check if position is walkable
    if (state.chunk.map[ghostY][ghostX] === '.') {
      state.chunk.monsters = state.chunk.monsters || [];
      state.chunk.monsters.push({
        name: 'Candy Ghost',
        glyph: 'g',
        x: ghostX,
        y: ghostY,
        hp: 15,
        hpMax: 15,
        str: 5,
        def: 2,
        spd: 8,
        alive: true,
        isGhost: true,
        undead: true,  // Marked as undead
        tier: 1
      });
      
      if (state.log) {
        state.log("A translucent candy ghost drifts through the graveyard...", "magic");
      }
    }
  }
  
  // Add graveyard-specific items
  state.chunk.items = state.chunk.items || [];
  
  // Place quest items if appropriate quests are active
  if (state.activeQuests) {
    // Check for Grave Discoveries quest
    const graveDiscoveriesQuest = state.activeQuests.find(q => q.id === 'grave_discoveries');
    if (graveDiscoveriesQuest && !graveDiscoveriesQuest.itemSpawned) {
      // Place failed experiment notes in Rootbeer Mausoleum
      state.chunk.items.push({
        type: 'quest_item',
        item: {
          id: 'failed_experiment_notes',
          name: 'Failed Experiment Notes',
          description: "PB's secret disposal records."
        },
        x: W - 6,
        y: 6,
        questItem: true
      });
      graveDiscoveriesQuest.itemSpawned = true;
      
      if (state.log) {
        state.log("Something glints inside the Rootbeer Mausoleum...", "dim");
      }
    }
    
    // Check for Warding the Haints quest
    const wardingQuest = state.activeQuests.find(q => q.id === 'warding_the_haints');
    if (wardingQuest && !whisperShardCollected) {
      // Place whisper shard in graveyard mist
      state.chunk.items.push({
        type: 'quest_item',
        item: {
          id: 'whisper_shard',
          name: 'Whisper Shard',
          description: 'Hums with ghostly voices.'
        },
        x: 10,
        y: 10,
        questItem: true
      });
    }
  }
}

/**
 * Check if a position is a grave that can be warded
 */
export function isWardableGrave(state, x, y) {
  if (!state.chunk || state.cx !== GRAVEYARD_COORDS.x || state.cy !== GRAVEYARD_COORDS.y) {
    return false;
  }
  
  // Check if position is a gravestone
  const tile = state.chunk.map[y]?.[x];
  return tile === 'T';
}

/**
 * Place a ward on a grave
 */
export function placeWardOnGrave(state, x, y) {
  if (!isWardableGrave(state, x, y)) {
    if (state.log) {
      state.log("You can only place wards on gravestones.", "note");
    }
    return false;
  }
  
  // Check if already warded
  const graveKey = `${x},${y}`;
  if (wardedGraves.has(graveKey)) {
    if (state.log) {
      state.log("This grave already has a ward.", "note");
    }
    return false;
  }
  
  // Check if player has grave salt
  const saltIndex = state.player.inventory?.findIndex(item => 
    item.item?.id === 'grave_salt' || item.item?.name === 'Grave Salt'
  );
  
  if (saltIndex === -1) {
    if (state.log) {
      state.log("You need grave salt to sprinkle on graves.", "note");
    }
    return false;
  }
  
  // Check if it's night time (required for quest)
  // timeIndex 6 = night, 5 = dusk, 4 = evening are considered "after dark"
  const isNight = state.timeIndex >= 4;  // evening, dusk, or night
  if (!isNight) {
    if (state.log) {
      state.log("Starchy said to place the wards after dark...", "note");
    }
    return false;
  }
  
  // Place the ward (using salt)
  wardedGraves.add(graveKey);
  
  // Remove one portion of grave salt from inventory
  const salt = state.player.inventory[saltIndex];
  if (salt.count > 1) {
    salt.count--;
  } else {
    state.player.inventory.splice(saltIndex, 1);
  }
  
  // Visual feedback
  if (state.log) {
    state.log("You sprinkle grave salt on the grave. The air shimmers with a minty freshness.", "magic");
    
    // Check quest progress
    const wardingQuest = state.activeQuests?.find(q => q.id === 'warding_the_haints');
    if (wardingQuest) {
      wardingQuest.progress = wardingQuest.progress || {};
      wardingQuest.progress.wardsPlaced = (wardingQuest.progress.wardsPlaced || 0) + 1;
      
      if (wardingQuest.progress.wardsPlaced >= 5) {
        state.log("You've placed all 5 wards! The graveyard feels quieter.", "good");
        
        // Spawn whisper shard if not already collected
        if (!whisperShardCollected) {
          state.chunk.items.push({
            type: 'quest_item',
            item: {
              id: 'whisper_shard',
              name: 'Whisper Shard',
              description: 'A crystal that hums with ghostly voices.'
            },
            x: state.player.x + 1,
            y: state.player.y,
            questItem: true
          });
          state.log("A whisper shard materializes from the mist!", "magic");
        }
      } else {
        state.log(`Wards placed: ${wardingQuest.progress.wardsPlaced}/5`, "quest");
      }
    }
  }
  
  // Emit event for quest tracking
  emit(EventType.QuestProgress, {
    questId: 'warding_the_haints',
    action: 'ward_placed',
    progress: wardedGraves.size
  });
  
  return true;
}

/**
 * Check if it's night time in the graveyard
 */
export function isGraveyardNight(state) {
  // timeIndex 6 = night, 5 = dusk, 4 = evening are considered "after dark"
  return state.timeIndex >= 4;  // evening, dusk, or night
}

/**
 * Handle shed door interaction
 */
export function handleShedDoor(state, x, y) {
  // Check if this is the shed door position  
  const shedX = 2;
  const shedY = H - 7;
  const doorX = shedX + 4;
  const doorY = shedY + 2;
  
  if (x !== doorX || y !== doorY) return false;
  
  // Check if player has the warding quest
  const wardingQuest = state.activeQuests?.find(q => q.id === 'warding_the_haints');
  if (!wardingQuest) {
    if (state.log) {
      state.log("The shed is locked. It belongs to Starchy.", "note");
    }
    return true;
  }
  
  // Check if player has the key
  const hasKey = state.player.inventory?.some(item => 
    item.item?.id === 'starchy_shed_key' || item.item?.name === "Starchy's Shed Key"
  );
  
  if (!hasKey) {
    if (state.log) {
      state.log("Starchy's shed is locked. You need a key.", "note");
    }
    return true;
  }
  
  // Check if ghoul is already defeated
  if (state.flags?.shed_ghoul_defeated) {
    if (state.log) {
      state.log("The shed is empty now. The grave salts have already been collected.", "dim");
    }
    return true;
  }
  
  // Spawn the ghoul inside
  if (!state.flags?.shed_ghoul_spawned) {
    if (state.log) {
      state.log("You unlock the shed door with Starchy's key...", "note");
      state.log("A horrible ghoul lurches out from inside the shed!", "bad");
    }
    
    // Spawn ghoul inside the shed (middle of shed interior)
    const shedX = 2;
    const shedY = H - 7;
    const ghoulX = shedX + 2; // Middle of shed
    const ghoulY = shedY + 1; // Inside shed
    
    const ghoul = {
      name: 'Shed Ghoul',
      glyph: 'G',
      x: ghoulX,
      y: ghoulY,
      hp: 1,
      hpMax: 1,
      str: 6,
      def: 3,
      spd: 4,
      alive: true,
      undead: true,
      tier: 2,
      xp: 20,
      questTarget: 'shed_ghoul',
      drops: ['grave_salt'] // Will drop grave salts when killed
    };
    
    // Add to monsters
    state.chunk.monsters = state.chunk.monsters || [];
    state.chunk.monsters.push(ghoul);
    
    state.flags = state.flags || {};
    state.flags.shed_ghoul_spawned = true;
  }
  
  return true;
}

/**
 * Handle special graveyard interactions
 */
export function handleGraveyardInteraction(state, x, y) {
  const tile = state.chunk.map[y][x];
  
  // Check for shed door interaction
  if (tile === '▓') {
    handleShedDoor(state, x, y);
    return;
  }
  
  // Check for shed windows
  if (tile === '☐') {
    if (state.log) {
      if (!state.flags?.shed_ghoul_spawned) {
        state.log("You peer through the grimy window... Something moves inside!", "dim");
      } else if (state.flags?.shed_ghoul_defeated) {
        state.log("The shed is empty now. Just gardening tools and bags of salt.", "note");
      } else {
        state.log("The window is too dirty to see through clearly.", "dim");
      }
    }
    return;
  }
  
  // Check for shovel
  if (tile === '†') {
    if (state.log) {
      state.log("A rusty shovel leans against the shed. It's seen better days.", "dim");
    }
    return;
  }
  
  // Check for barrel
  if (tile === 'b') {
    if (state.log) {
      state.log("An old barrel full of gravedigging supplies.", "dim");
    }
    return;
  }
  
  // Interacting with gravestones
  if (tile === 'T') {
    // Random gravestone messages
    const messages = [
      "Here lies Candy Person. They were sweet.",
      "R.I.P. - Melted too young.",
      "In loving memory of a loyal Candy Citizen.",
      "Here lies someone who exploded from fear.",
      "This grave is empty... or is it?",
      "The inscription is too weathered to read.",
      "Fresh flowers have been placed here recently.",
      "This gravestone is older than the Candy Kingdom itself.",
      "'Death is but another path' - signed, P.B.",
      "Here lies... wait, this name has been scratched out."
    ];
    
    if (state.log) {
      state.log(messages[Math.floor(Math.random() * messages.length)], "dim");
    }
    
    // Check if player wants to place a ward
    const wardingQuest = state.activeQuests?.find(q => q.id === 'warding_the_haints');
    if (wardingQuest && isGraveyardNight(state)) {
      placeWardOnGrave(state, x, y);
    }
  }
  
  // Interacting with mist tiles
  if (tile === '~') {
    if (state.log) {
      state.log("The graveyard mist swirls around you. You hear faint whispers...", "magic");
      
      // Small chance to hear a conspiracy
      if (Math.random() < 0.2) {
        const whispers = [
          "You hear: 'The Princess... experiments...'",
          "You hear: 'We were... failures...'",
          "You hear: 'Banana Guards... forget... everything...'",
          "You hear: 'Sugar War... coming...'",
          "You hear: 'Trust... Starchy...'",
          "You hear: 'Peppermint Butler... darkness...'"
        ];
        state.log(whispers[Math.floor(Math.random() * whispers.length)], "magic");
      }
    }
  }
  
  // Interacting with crypts
  if (tile === '+' && (x === W - 6 || x === 4)) {
    // Check if this is the Rootbeer Mausoleum
    if (x === W - 6) {
      if (state.log) {
        state.log("The Rootbeer Mausoleum. The lock has been broken...", "note");
      }
      
      // Check for Grave Discoveries quest
      const graveQuest = state.activeQuests?.find(q => q.id === 'grave_discoveries');
      if (graveQuest) {
        state.log("This must be where Starchy hid the evidence!", "quest");
      }
    } else {
      if (state.log) {
        state.log("An old crypt. It's sealed tight.", "note");
      }
    }
  }
}

/**
 * Generate the complete graveyard chunk
 */
export function generateGraveyardChunk(worldSeed, cx, cy) {
  // Only generate if at graveyard coordinates
  if (cx !== GRAVEYARD_COORDS.x || cy !== GRAVEYARD_COORDS.y) {
    return null;
  }
  
  const chunk = {
    map: generateGraveyardMap(),
    monsters: [],
    items: [],
    biome: 'candy_kingdom',
    cx: cx,
    cy: cy,
    isGraveyard: true,
    special: 'graveyard'
  };
  
  return chunk;
}

/**
 * Check if coordinates are the graveyard
 */
export function isGraveyardChunk(cx, cy) {
  return cx === GRAVEYARD_COORDS.x && cy === GRAVEYARD_COORDS.y;
}

/**
 * Reset graveyard state (for new game)
 */
export function resetGraveyardState() {
  wardedGraves.clear();
  whisperShardCollected = false;
}

/**
 * Handle ghoul death - drops grave salts
 */
export function onGhoulDefeated(state, ghoul) {
  if (ghoul.questTarget !== 'shed_ghoul') return;
  
  // Mark ghoul as defeated
  state.flags = state.flags || {};
  state.flags.shed_ghoul_defeated = true;
  
  // Drop 5 grave salts at ghoul's position as a single stack
  state.chunk.items = state.chunk.items || [];
  state.chunk.items.push({
    type: 'quest_item',
    item: {
      id: 'grave_salt',
      name: 'Grave Salt',
      description: 'Blessed salt that quiets restless spirits.'
    },
    x: ghoul.x,
    y: ghoul.y,
    questItem: true,
    count: 5  // Stack of 5 grave salts
  });
  
  if (state.log) {
    state.log("The ghoul drops a bag of 5 grave salts!", "good");
    state.log("Quest Update: Collect the grave salts to continue.", "quest");
  }
  
  // Update quest progress
  const wardingQuest = state.activeQuests?.find(q => q.id === 'warding_the_haints');
  if (wardingQuest) {
    wardingQuest.progress = wardingQuest.progress || {};
    wardingQuest.progress.ghoulDefeated = true;
  }
}

/**
 * Handle collecting whisper shard
 */
export function collectWhisperShard(state) {
  whisperShardCollected = true;
  
  // Update quest progress
  const wardingQuest = state.activeQuests?.find(q => q.id === 'warding_the_haints');
  if (wardingQuest) {
    wardingQuest.progress = wardingQuest.progress || {};
    wardingQuest.progress.whisperShardCollected = true;
    
    if (state.log) {
      state.log("Quest progress: Return to Starchy with the whisper shard!", "quest");
    }
  }
}