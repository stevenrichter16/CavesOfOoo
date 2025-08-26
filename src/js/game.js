import { W, H, TILE, QUOTES, WEAPONS, ARMORS, HEADGEAR, RINGS, POTIONS, TIMES, WEATHERS, QUEST_TEMPLATES, FETCH_ITEMS } from './config.js';
import { rnd, choice, esc } from './utils.js';
import { makePlayer, levelUp } from './entities.js';
import { genChunk, findOpenSpot } from './worldGen.js';
import { saveChunk, loadChunk, clearWorld } from './persistence.js';
import { attack } from './combat.js';
import { getStatusModifier, applyStatusEffect, isFrozen, processStatusEffects } from './systems/statusSystem.js';
import { openInventory, closeInventory, renderInventory, useInventoryItem, dropInventoryItem } from './inventory.js';
import { initMapCursor, renderWorldMap, handleMapNavigation } from './worldMap.js';
import { turnInQuest, hasQuest, getQuestStatus, giveQuest, displayActiveQuests, checkFetchQuestItem, turnInFetchQuest, turnInFetchQuestWithItem } from './quests.js';
import { mountLog } from './log.js';
import { on, emit } from './events.js'
import { EventType } from './eventTypes.js';
import * as PlayerMovement from './systems/playerMovement.js';
import { isBlocked } from './queries.js';
import * as ShopSystem from './systems/shop.js';
import * as ShopUI from './ui/shop.js';
import * as VendorQuests from './systems/vendorQuests.js';
import { processMonsterTurns } from './systems/monsters.js';
import { openQuestTurnIn, processQuestRewards, closeQuestTurnIn } from './systems/questTurnIn.js';
import { renderQuestTurnIn as renderQuestTurnInUI, renderQuestTurnInConfirm as renderQuestTurnInConfirmUI } from './ui/questTurnIn.js';
import { initMapUI, MapEvents, isMapOpen, renderMap } from './ui/map.js';
import { initQuestUI, QuestEvents, isQuestUIOpen } from './ui/quests.js';
import { endOfTurnStatusPass } from './systems/statusSystem.js';
import { runOnTurnEndHooks, getGearMods } from './gear/effects.js';
import { initKeyboardControls } from './input/keys.js';
import { renderEquipmentPanel, getStatusChar, getStatusClass } from './ui/equipment.js';
import { CanvasRenderer } from './renderer/canvas.js';
import { getCursorState, isValidCursorPosition } from './systems/cursor.js';

// Game state
let STATE = null;
let canvasRenderer = null;

mountLog(document.getElementById('log'));
emit(EventType.Log, { text: 'CavesOfOoo booting…', cls: 'note' });

export function log(state, text, cls = null) { 
  // Use the event-driven log system
  emit(EventType.Log, { text, cls });
}

function setText(id, text) { 
  const el = document.getElementById(id);
  if (el) el.textContent = text; 
}


// Vendor shop functions
export function openVendorShop(state, vendor, skipQuestCheck = false) {
  // Initialize vendor quest if needed
  VendorQuests.initializeVendorQuest(state, vendor);
  
  // Check for completed quests first (unless explicitly skipping)
  if (!skipQuestCheck) {
    const completedFetchQuests = state.player.quests.active.filter(qId => {
      const fetchQuest = state.player.quests.fetchQuests?.[qId];
      if (fetchQuest && fetchQuest.vendorId === vendor.id) {
        return checkFetchQuestItem(state.player, fetchQuest);
      }
      return false;
    });

    const completedRegularQuests = state.player.quests.active.filter(qId => {
      const progress = state.player.quests.progress[qId] || 0;
      const quest = QUEST_TEMPLATES[qId];
      return quest && progress >= quest.targetCount;
    });
    
    const allCompletedQuests = [...completedFetchQuests, ...completedRegularQuests];
    
    if (allCompletedQuests.length > 0) {
      // Show quest turn-in option first
      openQuestTurnIn(state, vendor, allCompletedQuests);
      renderQuestTurnIn(state);  // Need to render the UI
      return;
    }
  }
  
  // Use systems/shop.js to open shop (handles vendor initialization)
  ShopSystem.openShop(state, vendor);
  // Use ui/shop.js to render
  ShopUI.renderShop(state);
}

export function closeShop(state) {
  // Use systems/shop.js to handle closing (manages state)
  ShopSystem.closeShop(state);
  // UI will auto-close via event listener
  render(state);
}

// Quest turn-in wrapper functions (delegate to systems/questTurnIn.js)
export function renderQuestTurnIn(state) {
  renderQuestTurnInUI(state);
}

export function renderQuestTurnInConfirm(state) {
  renderQuestTurnInConfirmUI(state);
}

export function claimQuestRewards(state, questsToTurnIn = null) {
  processQuestRewards(state, questsToTurnIn);
}

// Old implementations removed - moved to systems/questTurnIn.js and ui/questTurnIn.js

function openMap(state) {
  state.ui.mapOpen = true;
  emit(MapEvents.OpenWorldMap, { state });
}

function closeMap(state) {
  state.ui.mapOpen = false;
  emit(MapEvents.CloseWorldMap);
  render(state);
}

export function renderShop(state) {
  // Delegate all rendering to the UI module
  ShopUI.renderShop(state);
}


// Delegate tile interactions to PlayerMovement module
export function interactTile(state, x, y) {
  PlayerMovement.interactTile(state, x, y, openVendorShop);
}

// Large interactTile function moved to PlayerMovement module
/*
  The original function handled vendor interaction, artifacts, special tiles,
  chests, potions, equipment, and shrines. All this logic is now in
  src/js/systems/playerMovement.js
*/


export function handlePlayerMove(state, dx, dy) {
  if (state.over) return;
  
  // Check if following a movement path
  if (state.movementPath && state.movementPath.length > 1) {
    // Get next step in path
    const nextStep = state.movementPath[1];
    dx = nextStep.x - state.player.x;
    dy = nextStep.y - state.player.y;
    
    // Remove first step (current position)
    state.movementPath.shift();
    
    // Check if we've reached the target
    if (state.movementPath.length === 1) {
      // We're at or adjacent to target, clear the path
      state.movementPath = null;
      const target = state.movementTarget;
      state.movementTarget = null;
      
      // If this was an attack target, check if monster is still there
      if (target && target.isAttack) {
        const monster = state.chunk.monsters?.find(m => 
          m.x === target.x && m.y === target.y && m.alive
        );
        
        if (!monster) {
          log(state, "Target is no longer there", "dim");
        }
      } else if (target) {
        log(state, `Arrived at (${target.x}, ${target.y})`, "note");
      }
    } else if (state.movementPath.length > 1) {
      // Schedule next automatic step
      setTimeout(() => {
        if (state.movementPath && state.movementPath.length > 1) {
          handlePlayerMove(state, 0, 0);
        }
      }, 150); // 150ms between moves for smooth animation
    }
  }
  
  // Set up state references for movement system
  state.FETCH_ITEMS = FETCH_ITEMS;
  state.openVendorShop = openVendorShop; // Pass vendor shop function
  
  // Process movement through the movement system
  const consumed = PlayerMovement.handlePlayerMove(state, dx, dy);
  
  // If action was consumed (move attempted), run enemy turn
  if (consumed) {
    processMonsterTurns(state);
    turnEnd(state);
  }
}


export function waitTurn(state) { 
  if (state.over) return;
  
  const consumed = PlayerMovement.waitTurn(state);
  
  if (consumed) {
    processMonsterTurns(state);
    turnEnd(state);
  }
}

// HP mutator functions for the new status system
function applyStatusDamage(entityId, amount, source) {
  const entity = entityId === 'player' ? STATE.player : 
                 STATE.chunk.monsters.find(m => m.id === entityId);
  
  if (!entity) return;
  
  entity.hp = Math.max(0, entity.hp - amount);
  emit(EventType.TookDamage, { id: entityId, amount: -amount, source });
  
  if (entity.hp <= 0) {
    entity.alive = false;
    const name = entity === STATE.player ? 'You' : entity.name || `entity#${entityId}`;
    emit(EventType.EntityDied, { id: entityId, name, cause: source });
    
    if (entity === STATE.player) {
      STATE.over = true;
      log(STATE, `Game over - ${source} was too much!`, 'bad');
    }
  }
}

function applyStatusHeal(entityId, amount, source) {
  const entity = entityId === 'player' ? STATE.player : 
                 STATE.chunk.monsters.find(m => m.id === entityId);
  
  if (!entity) return;
  
  const before = entity.hp;
  entity.hp = Math.min(entity.hpMax || entity.hp, entity.hp + amount);
  const gained = entity.hp - before;
  
  if (gained > 0) {
    emit(EventType.FloatingText, { 
      x: entity.x, 
      y: entity.y, 
      text: `+${gained}`, 
      kind: 'heal' 
    });
  }
}

export function turnEnd(state) {
  // Process status effects using the new system
  endOfTurnStatusPass(state, applyStatusDamage, applyStatusHeal);
  
  // Also process player's water_slow effect (handled separately)
  if (state.player.alive) {
    processStatusEffects(state, state.player, "You");
  }
  
  // Run gear turn-end hooks
  if (state.player.alive) {
    runOnTurnEndHooks(state, state.player);
  }
  
  // Time progression
  if (Math.random() < 0.1) {
    state.timeIndex = (state.timeIndex + 1) % TIMES.length;
    if (Math.random() < 0.3) state.weather = choice(WEATHERS);
  }
  
  // Ambient messages
  if (Math.random() < 0.05) {
    const t = TIMES[state.timeIndex];
    const w = state.weather;
    const b = state.chunk.biome;
    const quotes = ((QUOTES[b] || {})[t] || {})[w];
    if (quotes && quotes.length) {
      log(state, choice(quotes), "note");
    }
  }
  
  render(state);
}

// Render using Canvas only
export function render(state) {
  // Add cursor state to the state object for the renderer
  state.cursorState = getCursorState();
  state.isValidCursorPosition = isValidCursorPosition;
  
  if (canvasRenderer) {
    canvasRenderer.render(state);
  }
  // Update HUD and other DOM elements
  updateHUD(state);
  updateEquipmentPanel(state);
}

// Separate HUD update function for use with Canvas renderer
function updateHUD(state) {
  const p = state.player;
  setText("hp", `HP ${p.hp}/${p.hpMax}`);
  setText("xp", `XP ${p.xp}/${p.xpNext}`);
  setText("level", `Lv ${p.level}`);
  setText("gold", `Gold: ${p.gold}`);
  
  const strBonus = getStatusModifier(p, "str");
  const defBonus = getStatusModifier(p, "def");
  const weaponBonus = p.weapon ? p.weapon.dmg : 0;
  const armorBonus = p.armor ? p.armor.def : 0;
  const headgearDefBonus = p.headgear ? (p.headgear.def || 0) : 0;
  const headgearStrBonus = p.headgear ? (p.headgear.str || 0) : 0;
  
  const spdBonus = getStatusModifier(p, "spd");
  const headgearSpdBonus = p.headgear ? (p.headgear.spd || 0) : 0;
  const totalSpd = (p.spd || 0) + spdBonus + headgearSpdBonus;
  
  setText("str", `STR ${p.str}${strBonus ? `+${strBonus}` : ""} ${weaponBonus ? `[+${weaponBonus}]` : ""} ${headgearStrBonus ? `[+${headgearStrBonus}]` : ""}`);
  setText("def", `DEF ${p.def}${defBonus ? `+${defBonus}` : ""} ${armorBonus ? `[+${armorBonus}]` : ""} ${headgearDefBonus ? `[+${headgearDefBonus}]` : ""}`);
  
  // Show SPD with actual value in parentheses when modified
  if (spdBonus !== 0 || headgearSpdBonus !== 0) {
    const spdElement = document.getElementById("spd");
    if (spdElement) {
      const baseSpdText = `SPD ${p.spd || 0}`;
      const modifiedSpdText = `(${totalSpd})`;
      spdElement.innerHTML = `${baseSpdText}<span style="color: ${totalSpd < p.spd ? 'var(--danger)' : totalSpd > p.spd ? 'var(--ok)' : 'var(--fg)'}">${modifiedSpdText}</span>`;
    }
  } else {
    setText("spd", `SPD ${p.spd || 0}`);
  }
  
  // Find equipped items by ID
  const equippedWeapon = p.inventory.find(i => i.id === state.equippedWeaponId);
  const equippedArmor = p.inventory.find(i => i.id === state.equippedArmorId);
  const equippedHeadgear = p.inventory.find(i => i.id === state.equippedHeadgearId);
  
  setText("weapon", equippedWeapon ? `/ ${equippedWeapon.item.name}` : "/ None");
  setText("armor", equippedArmor ? `] ${equippedArmor.item.name}` : "] None");
  setText("headgear", equippedHeadgear ? `^ ${equippedHeadgear.item.name}` : "^ None");
  setText("potions", `! x${p.potionCount}`);
  
  // Display quest status
  if (p.quests) {
    const completeQuests = p.quests.active.filter(qId => {
      const progress = p.quests.progress[qId] || 0;
      const quest = QUEST_TEMPLATES[qId];
      return quest && progress >= quest.targetCount;
    }).length;
    
    if (completeQuests > 0) {
      setText("quests", `Quests: ${p.quests.active.length} (${completeQuests} ready!)`);
      document.getElementById("quests").style.color = "#FFD700";
    } else {
      setText("quests", `Quests: ${p.quests.active.length}`);
      document.getElementById("quests").style.color = "";
    }
  }
  
  setText("time", `${TIMES[state.timeIndex]} / ${state.weather}`);
  
  // Display friendly biome name
  const biome = state.chunk?.biome || "unknown";
  let biomeName = biome;
  if (biome === "candy_forest" || biome === "candy") biomeName = "Candy Forest";
  else if (biome === "slime_kingdom" || biome === "slime") biomeName = "Slime Kingdom";
  else if (biome === "frost_caverns" || biome === "ice") biomeName = "Frost Caverns";
  else if (biome === "volcanic_marsh" || biome === "fire") biomeName = "Volcanic Marsh";
  else if (biome === "corrupted_dungeon") biomeName = "Corrupted Dungeon";
  else if (biome === "lich_domain") biomeName = "Lich Domain";
  else if (biome === "glimmering_meadows") biomeName = "Slime Kingdom"; // Old name conversion
  
  setText("biome", biomeName);
  setText("coords", `(${state.cx},${state.cy})`);
  
  // Display danger level
  const dangerLevel = state.chunk.danger || 0;
  const dangerDisplay = dangerLevel > 0 ? "☠".repeat(Math.min(dangerLevel, 5)) : "Safe";
  const dangerColor = dangerLevel === 0 ? "var(--ok)" : 
                      dangerLevel <= 2 ? "var(--accent)" : 
                      dangerLevel <= 4 ? "var(--rare)" : "var(--danger)";
  
  setText("danger", `Danger: ${dangerDisplay}`);
  const dangerEl = document.getElementById("danger");
  if (dangerEl) dangerEl.style.color = dangerColor;
  
  // Optional: Add warning when entering dangerous zones
  if (state.lastDanger !== undefined && dangerLevel > state.lastDanger) {
    log(state, `⚠ You enter a more dangerous area! (Danger Level ${dangerLevel})`, "bad");
  }
  state.lastDanger = dangerLevel;
  
  // Status effects - group by type to show stacks
  const statusBar = document.getElementById("statusBar");
  statusBar.innerHTML = "";
  
  // Group effects by type
  const effectGroups = {};
  for (const eff of p.statusEffects) {
    if (!effectGroups[eff.type]) {
      effectGroups[eff.type] = { count: 0, totalValue: 0, minTurns: eff.turns, maxTurns: eff.turns };
    }
    effectGroups[eff.type].count++;
    effectGroups[eff.type].totalValue += (eff.value || 0);  // Handle missing value field
    effectGroups[eff.type].minTurns = Math.min(effectGroups[eff.type].minTurns, eff.turns || 0);
    effectGroups[eff.type].maxTurns = Math.max(effectGroups[eff.type].maxTurns, eff.turns || 0);
  }
  
  // Display grouped effects
  for (const [type, data] of Object.entries(effectGroups)) {
    const div = document.createElement("div");
    
    // Determine effect class
    let effectClass = "debuff";
    if (type.startsWith("buff")) effectClass = "buff";
    if (type === "freeze") effectClass = "freeze";
    
    div.className = `status-effect ${effectClass}`;
    
    // Format display name
    let displayName = type.replace(/_/g, " ");
    if (type.startsWith("buff_")) displayName = "+" + type.replace("buff_", "");
    else if (type.startsWith("debuff_")) displayName = "-" + type.replace("debuff_", "");
    else if (type === "freeze") displayName = "FROZEN";
    else if (type === "burn") displayName = "burning";
    else if (type === "poison") displayName = "poisoned";
    else if (type === "shock") displayName = "shocked";
    else if (type === "weaken") displayName = "weakened";
    else if (type === "water_slow") displayName = "wet -SPD";
    
    // Show stack count if more than 1
    const stackText = data.count > 1 ? ` x${data.count}` : "";
    
    // Handle turns display for water_slow differently
    let turnsDisplay = "";
    if (type === "water_slow") {
      // Check if we're in water (duration 0) or out of water (duration > 0)
      const waterEffect = p.statusEffects.find(e => e.type === 'water_slow');
      if (waterEffect && waterEffect.duration > 0) {
        turnsDisplay = ` (${waterEffect.duration}t)`;
      }
      // No turn display when in water (duration 0)
    } else {
      const turnsText = data.minTurns === data.maxTurns ? 
        `${data.minTurns}` : 
        `${data.minTurns}-${data.maxTurns}`;
      turnsDisplay = ` (${turnsText}t)`;
    }
    
    // Don't show value for freeze or water_slow (they don't do damage)
    const valueText = (type === "freeze" || type === "water_slow" || data.totalValue === 0) ? "" : ` +${data.totalValue}`;
    
    div.textContent = `${displayName}${stackText}${valueText}${turnsDisplay}`;
    statusBar.appendChild(div);
  }
  
  // Log is now handled by the event-driven log system in log.js
  
  // Show/hide restart
  document.getElementById("restart").style.display = state.over ? "inline-block" : "none";
  
  // Inventory/Shop overlay
  document.getElementById("overlay").style.display = 
    (state.ui.inventoryOpen || state.ui.shopOpen) ? "flex" : "none";
}

// Separate equipment panel update for Canvas renderer
function updateEquipmentPanel(state) {
  renderEquipmentPanel(state);
}

export function newWorld() {
  const worldSeed = Math.floor(Math.random() * 2**31) >>> 0;
  const player = makePlayer();
  const state = {
    worldSeed, player,
    cx: 0, cy: 0,
    chunk: null,
    timeIndex: rnd(TIMES.length),
    weather: choice(WEATHERS),
    over: false,
    ui: { 
      inventoryOpen: false, 
      selectedIndex: 0, 
      mapOpen: false,
      questTurnInOpen: false,
      completedQuests: [],
      shopOpen: false,
      shopMode: null,
      shopVendor: null,
      shopSelectedIndex: 0,
      confirmSell: false,
      confirmChoice: "no",
      selectingQuest: false,
      selectedQuestIndex: 0,
      selectingFetchItem: null,
      fetchItemSelectedIndex: 0,
      selectedFetchItemIndex: undefined,
      confirmGiveEquipped: false,
      tempSelectedItem: null,
      allCompletedQuests: null
    },
    equippedWeaponId: null,  // Track by ID instead of reference
    equippedArmorId: null,   // Track by ID instead of reference
    equippedHeadgearId: null, // Track by ID instead of reference
    // Add method references for modules to use
    log: (text, cls) => log(state, text, cls),
    render: () => render(state)
  };
  state.FETCH_ITEMS = FETCH_ITEMS; // Set reference for PlayerMovement module
  PlayerMovement.loadOrGenChunk(state, 0, 0);
  const spot = findOpenSpot(state.chunk.map) || { x: 2, y: 2 };
  player.x = spot.x;
  player.y = spot.y;
  
  // Restore itemCheck functions for player's accepted fetch quests
  if (player.quests && player.quests.fetchQuests) {
    Object.values(player.quests.fetchQuests).forEach(fetchQuest => {
      if (fetchQuest.targetItem) {
        const matchingFetchItem = FETCH_ITEMS.find(fi => fi.name === fetchQuest.targetItem.name);
        if (matchingFetchItem) {
          fetchQuest.targetItem = matchingFetchItem;
        }
      }
    });
  }
  
  log(state, "Welcome to the Land of Ooo! Press 'H' for help.", "note");
  log(state, "Walk off edges to explore. Press 'I' for inventory.", "note");
  
  // Show starter quest
  log(state, "════════════════════════════", "xp");
  log(state, "YOUR QUEST: Monster Hunter", "xp");
  log(state, "Defeat any 1 monster to prove yourself!", "note");
  log(state, "Visit any vendor (V) for your reward.", "dim");
  log(state, "Press 'Q' to view active quests.", "dim");
  log(state, "════════════════════════════", "xp");
  return state;
}

// Initialize game
export function initGame() {
  // Initialize Canvas renderer
  try {
    canvasRenderer = new CanvasRenderer('game-canvas');
    canvasRenderer.setEnabled(true);
    console.log('Canvas renderer initialized successfully');
  } catch (e) {
    console.error('Failed to initialize Canvas renderer:', e);
  }
  
  // Initialize UI modules
  ShopUI.initShopUI();
  initMapUI();
  initQuestUI();
  
  // Initialize quest turn-in UI
  import('./ui/questTurnIn.js').then(module => {
    module.initQuestTurnInUI();
  });
  
  // Listen for quest turn-in events
  on('questTurnIn:openShop', ({ vendor }) => {
    // Skip quest check to avoid immediately reopening quest turn-in
    openVendorShop(STATE, vendor, true);
  });
  
  // Initialize particle effects
  import('./ui/particles.js').then(module => {
    module.initParticles();
  });
  
  STATE = newWorld();
  window.STATE = STATE; // Make available for particle system
  render(STATE);
  
  // Initialize keyboard controls
  initKeyboardControls();
}

// Keyboard controls moved to src/js/input/keys.js

// Initialization code when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  // Button handlers
  document.getElementById("restart").addEventListener("click", () => {
    window.STATE = newWorld();
    document.getElementById("log").innerHTML = "";
    render(window.STATE);
  });
  
  document.getElementById("resetWorld").addEventListener("click", () => {
    clearWorld();
    log(STATE, "World data cleared. New areas will regenerate.", "note");
    render(STATE);
  });
  
  document.getElementById("help").addEventListener("click", () => {
    log(STATE, "=== HELP ===", "note");
    log(STATE, "WASD/Arrows: Move | .: Wait | I: Inventory", "note");
    log(STATE, "R: New Game | Walk off edges to explore", "note");
    log(STATE, "Find weapons, armor, and potions to survive!", "note");
    log(STATE, "Defeat monsters to gain XP and level up!", "note");
    render(STATE);
  });
  
  // Hide the DOM game element since we're using Canvas only
  const gameEl = document.getElementById("game");
  if (gameEl) gameEl.style.display = 'none';
});