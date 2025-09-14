import { W, H, TILE, QUOTES, WEAPONS, ARMORS, HEADGEAR, RINGS, POTIONS, TIMES, WEATHERS, QUEST_TEMPLATES, FETCH_ITEMS } from './config.js';
import { rnd, choice, esc } from '../utils/utils.js';
import { makePlayer, levelUp } from '../entities/entities.js';
import { genChunk, findOpenSpot } from '../world/worldGen.js';
import { saveChunk, loadChunk, clearWorld } from '../utils/persistence.js';
import { attack } from '../combat/combat.js';
import { getStatusModifier, isFrozen, processStatusEffects, getStatusEffectsAsArray, Status, getEntityId } from '../combat/statusSystem.js';
import { openInventory, closeInventory, renderInventory, useInventoryItem, dropInventoryItem } from '../items/inventory.js';
import { initMapCursor, renderWorldMap, handleMapNavigation } from '../world/worldMap.js';
import { turnInQuest, hasQuest, getQuestStatus, giveQuest, displayActiveQuests, checkFetchQuestItem, turnInFetchQuest, turnInFetchQuestWithItem } from '../quests/quests.js';
import { mountLog } from '../utils/log.js';
import { on, emit } from '../utils/events.js'
import { EventType } from '../utils/eventTypes.js';
import * as PlayerMovement from '../movement/playerMovement.js';
import { isBlocked } from '../utils/queries.js';
import * as ShopSystem from '../items/shop.js';
import * as ShopUI from '../ui/shop.js';
import * as VendorQuests from '../quests/vendorQuests.js';
import { processMonsterTurns } from '../entities/monsters.js';
import { openQuestTurnIn, processQuestRewards, closeQuestTurnIn } from '../quests/questTurnIn.js';
import { renderQuestTurnIn as renderQuestTurnInUI, renderQuestTurnInConfirm as renderQuestTurnInConfirmUI } from '../ui/questTurnIn.js';
import { initMapUI, MapEvents, isMapOpen, renderMap } from '../ui/map.js';
import { initQuestUI, QuestEvents, isQuestUIOpen } from '../ui/quests.js';
import { endOfTurnStatusPass } from '../combat/statusSystem.js';
import { runOnTurnEndHooks, getGearMods } from '../combat/effects.js';
import { initKeyboardControls } from '../input/keys.js';
import { renderEquipmentPanel, getStatusChar, getStatusClass } from '../ui/equipment.js';
import { CanvasRenderer } from '../renderer/canvas.js';
import { getCursorState, isValidCursorPosition } from '../movement/cursor.js';
import { runTickForEntity, runPreDamage, runMovementForEntity } from '../engine/adapters/cavesOfOoo.js';
import '../engine/materials.js';          // ensure defaults loaded
import '../engine/statusDefinitions.js';  // register all status definitions
import '../engine/statusRules.js';        // load status interaction rules
import '../engine/universalRules.js';     // (empty for now, fine to keep)
import '../engine/testRules.instantKillWetElectric.js'; // our test rule
import '../engine/candyDustRule.js';      // candy dust explosion rules
import { applyStatusEffect } from '../combat/statusSystem.js';
// Migration: Using enhanced NPC system with backward compatibility
import { spawnSocialNPC, initializeMigration, initializeSocialSystem } from '../../social/migrationAdapter.js';
// processNPCSocialTurn and processHostileNPCs are no longer needed with NEW system
import { RelationshipSystem } from '../social/relationship.js';
import * as WorldIntegration from '../world/gameIntegration.js';
import { openNPCInteraction, closeSocialMenu, handleSocialInput } from '../ui/social.js';
import { loadExpandedCandyKingdomDialogues, registerDialogueTree } from '../../social/dialogue.js';
import { candyKingdomDialoguesV3 } from '../data/candyKingdomDialoguesV3.js';
import { starchyDialogues } from '../data/starchyDialogues.js';
import { forestDialogues } from '../data/forestDialogues.js';
import { onEnemyDefeated, onItemCollected } from '../world/questChunks.js';
import { getQuestSpawner } from '../systems/QuestSpawner.js';
import * as questItems from '../items/questItems.js';  // Import quest items for immediate availability
import { initCursorInspect } from '../ui/cursorInspect.js';

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
  console.log('🎮 openVendorShop called with:', {
    vendorId: vendor?.id,
    vendorName: vendor?.name,
    vendorGoods: vendor?.goods,
    shopkeeper: vendor?.shopkeeper,
    skipQuestCheck
  });
  
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
  
  console.log('🚀 Opening shop through ShopSystem...');
  // Use systems/shop.js to open shop (handles vendor initialization)
  ShopSystem.openShop(state, vendor);
  
  console.log('🖼️ Rendering shop through ShopUI...');
  // Use ui/shop.js to render
  ShopUI.renderShop(state);
  
  console.log('✨ Shop opening complete!');
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
  
  // Store old position before movement attempt
  const oldX = state.player.x;
  const oldY = state.player.y;
  
  // Process movement through the movement system
  const consumed = PlayerMovement.handlePlayerMove(state, dx, dy);
  
  // If action was consumed (move attempted), run enemy turn  
  if (consumed) {
    // Check if player actually moved
    const playerMoved = (state.player.x !== oldX || state.player.y !== oldY);
    
    // Run movement phase rules (handles candy dust explosions, etc.)
    runMovementForEntity(state, state.player, oldX, oldY, state.player.x, state.player.y);
    
    // Only advance game time if player actually moved or took an action
    if (playerMoved) {
      try {
        WorldIntegration.onPlayerAction();
      } catch (e) {
        // Silently fail if world systems not ready
      }
    }
    
    // Handle water tile effects (keep this for now as it's not in rules yet)
    const tile = state.chunk?.map?.[state.player.y]?.[state.player.x];
    if (tile === '~') {
      console.log(`[GAME] Player entered water tile`);
      const playerId = getEntityId(state.player);
      let effects = Status.get(playerId);
      
      // Check if already wet
      if (!effects || !effects['wet']) {
        // First time getting wet - apply 4 turns (will tick down to 3 at turn end)
        applyStatusEffect(state.player, 'wet', /*turns*/ 4, /*value*/ 1);
        log(state, 'Your boots splash. You are Wet.', 'note');
      } else {
        // Already wet - refresh to 4 turns (will tick down to 3 at turn end)
        effects['wet'].turns = 4;
        console.log(`[GAME] Wet status refreshed to 4 turns (will show as 3 after tick)`);
      }
      
      // Get updated effects and set wet quantity for conductivity
      effects = Status.get(playerId);
      if (effects && effects['wet']) {
        effects['wet'].quantity = Math.max(effects['wet'].quantity || 0, 40);
        console.log(`[GAME] Set wet quantity to ${effects['wet'].quantity}`);
      }
    }

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
  
  console.log(`[DAMAGE] → ${entityId} takes ${amount} ${source} damage`);
  
  // For shock damage, run through the engine's predamage phase
  // This allows the wet + electric instant kill rule to trigger
  if (source === 'shock') {
    console.log(`[GAME] Processing shock damage through engine predamage phase`);
    const modifiedDamage = runPreDamage(STATE, entity, { amount, type: 'electric' });
    amount = modifiedDamage.amount;
    
    // Check if this is instant kill territory
    if (amount >= 99999) {
      log(STATE, "⚡💀 ELECTROCUTED! Being wet and shocked is lethal! 💀⚡", "bad");
    }
  }
  
  // Apply the damage (potentially modified by engine)
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
  // Increment turn counter
  state.turn = (state.turn || 0) + 1;
  
  console.log(`\n[TURN-END] ═══════════ END OF TURN ${state.turn} ═══════════`);
  console.log(`[TURN-END] Player HP: ${state.player.hp}/${state.player.hpMax}`);
  const playerEffects = getStatusEffectsAsArray(state.player);
  console.log(`[TURN-END] Active effects: ${playerEffects.map(e => e.type).join(', ') || 'none'}`);
  
  // NOTE: Hostile NPC processing and social turns are now handled by the NEW system
  // The enhanced NPC class handles hostility evaluation internally
  // Social interactions are handled through the InteractionSystem
  
  // Process NPCs (NEW system handles this automatically through NPC class)
  console.log(`[TURN-END] NPCs use NEW social system with enhanced features`);
  
  // Process status effects using the new system
  console.log(`[TURN-END] Processing status effects...`);
  endOfTurnStatusPass(state, applyStatusDamage, applyStatusHeal);
  
  // Process water_slow effect (special case that doesn't use the Map system)
  // Note: processStatusEffects also calls statusEffectPerformTick, which would
  // double-process effects. So we only handle water_slow here.
  // Water slow is now handled in processStatusEffects via Map
  
  // Run gear turn-end hooks
  if (state.player.alive) {
    runOnTurnEndHooks(state, state.player);
  }
  
  // Decay relationships over time
  RelationshipSystem.decayRelations();
  
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

  if (state.player.alive) {
    console.log(`[TURN-END] Running engine tick phase...`);
    runTickForEntity(state, state.player);
  }
  
  console.log(`[TURN-END] Final HP: ${state.player.hp}/${state.player.hpMax}`);
  console.log(`[TURN-END] ═══════════════════════════════════\n`);
  render(state);
}

// Render using Canvas only
export function render(state) {
  // Safety check for state
  if (!state) {
    return;
  }
  
  // Add cursor state to the state object for the renderer
  state.cursorState = getCursorState();
  state.isValidCursorPosition = isValidCursorPosition;
  
  if (canvasRenderer) {
    canvasRenderer.render(state);
  }
  // Update HUD and other DOM elements
  updateHUD(state);
  updateEquipmentPanel(state);
  
  // Update world simulation
  try {
    WorldIntegration.updateWorld();
    WorldIntegration.updatePlayerPosition(state.player);
    
    // Sync NPCs with their entities so they actually move
    WorldIntegration.syncNPCsWithEntities(state);
  } catch (e) {
    // Silently fail if world systems not ready
  }
}

// Separate HUD update function for use with Canvas renderer
function updateHUD(state) {
  // Safety check for state and player
  if (!state || !state.player) {
    return;
  }
  
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
  
  // Use new time and weather systems if available
  try {
    const timeStr = WorldIntegration.getTimeDisplay();
    const weatherStr = WorldIntegration.getWeatherDisplay();
    setText("time", `${timeStr} / ${weatherStr}`);
  } catch (e) {
    // Fallback to old system
    setText("time", `${TIMES[state.timeIndex]} / ${state.weather}`);
  }
  
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
  const playerEffectsForHUD = getStatusEffectsAsArray(p);
  const effectGroups = {};
  for (const eff of playerEffectsForHUD) {
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
    else if (type === "wet") displayName = "WET (conductive!)";
    
    // Show stack count if more than 1
    const stackText = data.count > 1 ? ` x${data.count}` : "";
    
    // Handle turns display for water_slow differently
    let turnsDisplay = "";
    if (type === "water_slow") {
      // Check if we're in water (duration 0) or out of water (duration > 0)
      const waterEffect = playerEffectsForHUD.find(e => e.type === 'water_slow');
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

export async function newWorld() {
  const worldSeed = Math.floor(Math.random() * 2**31) >>> 0;
  const player = makePlayer();
  const state = {
    worldSeed, player,
    cx: 0, cy: 0,
    chunk: null,
    timeIndex: rnd(TIMES.length),
    weather: choice(WEATHERS),
    over: false,
    npcs: [],  // Array to hold all NPCs in the game
    turn: 0,   // Turn counter for social system
    factionReputation: {  // Initialize faction reputation
      merchants: 0,
      guards: 0,
      nobles: 0,
      peasants: 0,
      bandits: 0,
      wildlings: 0
    },
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
      allCompletedQuests: null,
      socialMenuOpen: false,  // For NPC interaction menu
      selectedNPCId: null,     // Currently interacting NPC
      socialActionIndex: 0     // Selected social action
    },
    equippedWeaponId: null,  // Track by ID instead of reference
    equippedArmorId: null,   // Track by ID instead of reference
    equippedHeadgearId: null, // Track by ID instead of reference
    // Add method references for modules to use
    log: (text, cls) => log(state, text, cls),
    render: () => render(state),
    openNPCInteraction: (state, npc) => openNPCInteraction(state, npc)
  };
  state.FETCH_ITEMS = FETCH_ITEMS; // Set reference for PlayerMovement module
  // Load initial chunk and wait for it
  try {
    await PlayerMovement.loadOrGenChunk(state, 0, 0);
  } catch (e) {
    console.error('Failed to load initial chunk, using fallback:', e);
    // Fallback to sync generation if async fails
    const { genChunk } = await import('../world/worldGen.js');
    state.chunk = genChunk(state.worldSeed, 0, 0);
  }
  
  // Ensure chunk has a valid map
  if (!state.chunk || !state.chunk.map || !Array.isArray(state.chunk.map)) {
    console.error('Chunk generation failed to create valid map, creating emergency chunk');
    state.chunk = {
      cx: 0,
      cy: 0,
      map: Array(H).fill().map(() => Array(24).fill('.')),
      npcs: [],
      monsters: [],
      items: []
    };
  }
  
  const spot = findOpenSpot(state.chunk.map) || { x: 2, y: 2 };
  player.x = spot.x;
  player.y = spot.y;
  
  // Set player position in world simulation
  if (WorldIntegration.worldSimulation) {
    WorldIntegration.addPlayer(player);
  }
  
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
  
  // Initialize social system for existing entities
  initializeSocialSystem(state);
  
  // Initialize NPC migration to enhanced system
  initializeMigration(state);
  console.log('🚀 [GAME] Enhanced NPC system initialized with migration adapter');
  
  // Initialize quest spawner system
  const questSpawner = getQuestSpawner();
  console.log('🎯 [GAME] Quest spawner system initialized');
  
  // Load v3.0 Adventure Time authentic dialogue trees
  loadExpandedCandyKingdomDialogues(candyKingdomDialoguesV3);
  
  // Expose state to window for debugging
  if (typeof window !== 'undefined') {
    window.gameState = state;
    
    // Load debug utilities
    import('../debug/foxToothDebug.js').then(() => {
      console.log('Fox tooth debug utilities loaded');
    }).catch(err => {
      // Debug utilities are optional
    });
    
    import('../debug/stateDebug.js').then(() => {
      console.log('State debug utilities loaded');
    }).catch(err => {
      // Debug utilities are optional
    });
  }
  
  // Register Starchy's dialogue tree
  registerDialogueTree(starchyDialogues.npcType, starchyDialogues.biome, starchyDialogues);
  console.log('🎭 [GAME] Starchy dialogue tree registered');
  
  // Register Forest dialogue trees
  console.log('🌲 [GAME] About to register forest dialogues...');
  console.log('🌲 [GAME] forestDialogues object:', forestDialogues);
  if (forestDialogues && forestDialogues.trees) {
    console.log('🌲 [GAME] Found', forestDialogues.trees.length, 'forest dialogue trees');
    forestDialogues.trees.forEach(tree => {
      console.log('🌲 [GAME] Registering tree for:', tree.npcType, 'in biome:', tree.biome);
      registerDialogueTree(tree.npcType, tree.biome, tree);
    });
    console.log('🌲 [GAME] Forest dialogue trees registered');
  } else {
    console.error('🌲 [GAME] No forest dialogues found!');
  }
  
  // Register Shopping District dialogue trees and actions
  import('../data/shoppingDistrictDialogues.js').then(module => {
    module.registerShoppingDistrictDialogues();
    console.log('🛍️ [GAME] Shopping District dialogue trees loaded');
    
    // Also register shopping district actions
    return import('../social/shoppingDistrictActions.js');
  }).then(module => {
    if (module) {
      module.registerShoppingDistrictActions();
      console.log('🛍️ [GAME] Shopping District actions registered');
    }
  }).catch(err => {
    console.error('Failed to load Shopping District dialogues/actions:', err);
  });
  
  // Register unique NPC dialogue trees
  import('../data/uniqueNPCDialogues.js').then(module => {
    const dialogues = module.uniqueNPCDialogues;
    for (const [key, dialogue] of Object.entries(dialogues)) {
      registerDialogueTree(dialogue.npcType, dialogue.biome, dialogue);
    }
    console.log('🎭 [GAME] Unique NPC dialogue trees registered');
  });
  
  // Populate the candy kingdom chunks with NPCs
  if (state.chunk?.isKingdomTown) {
    import('../world/candyKingdomTown.js').then(module => {
      module.spawnCandyKingdomNPCs(state);
    });
  } else if (state.chunk?.isForest) {
    // Spawn Forest NPCs
    console.log('🌲 Forest detected, spawning NPCs...');
    import('../world/theForest.js').then(module => {
      module.spawnForestNPCs(state);
      console.log('🌲 Forest NPCs spawned');
    });
  } else if (state.chunk?.isMarket && state.chunk?.special === 'shopping_district') {
    // Handle Shopping District NPCs
    console.log('🛍️ Shopping District detected, spawning NPCs...');
    import('../../social/migrationAdapter.js').then(socialModule => {
      if (state.chunk?.npcData) {
        const npcCount = state.chunk.npcData.length;
        console.log(`📦 Found ${npcCount} NPC data entries to spawn`);
        
        state.npcs = state.npcs || [];
        let spawned = 0;
        
        state.chunk.npcData.forEach(data => {
          // Ensure chunk coordinates are set
          data.chunkX = state.cx;
          data.chunkY = state.cy;
          
          console.log(`Spawning NPC: ${data.name} at (${data.x}, ${data.y})`);
          const npc = socialModule.spawnSocialNPC(state, data);
          if (npc) {
            state.npcs.push(npc);
            spawned++;
          }
        });
        
        // Clear npcData after spawning
        delete state.chunk.npcData;
        console.log(`✅ Successfully spawned ${spawned}/${npcCount} NPCs in Shopping District`);
        
        // Log current NPC count
        console.log(`Total NPCs in state: ${state.npcs.length}`);
      } else {
        console.log('⚠️ No npcData found in shopping district chunk');
      }
    }).catch(err => {
      console.error('❌ Failed to load social module:', err);
    });
  } else if (state.chunk?.isKingdomChunk) {
    // Spawn NPCs for adjacent Candy Kingdom chunks
    if (state.cx === 0 && state.cy === -1) {
      import('../world/candyKingdomNorth.js').then(module => {
        module.spawnNorthGateNPCs(state);
      });
    } else if (state.cx === 2 && state.cy === 0) {
      // East Gate (moved to make room for Shopping District)
      import('../world/candyKingdomEast.js').then(module => {
        module.spawnEastGateNPCs(state);
      });
    } else if (state.cx === 0 && state.cy === 1) {
      import('../world/candyKingdomChunks.js').then(module => {
        module.spawnSouthGateNPCs(state);
      });
    } else if (state.cx === -1 && state.cy === 0) {
      import('../world/candyKingdomChunks.js').then(module => {
        module.spawnWestGateNPCs(state);
      });
    }
  } else if (state.chunk?.isForest) {
    // Spawn NPCs and monsters for Cotton Candy Forest chunks
    import('../world/candyForest.js').then(module => {
      if (state.cx === -1 && state.cy === -1) {
        module.spawnForestNWNPCs(state);
      } else if (state.cx === 1 && state.cy === -1) {
        module.spawnForestNENPCs(state);
      } else if (state.cx === -1 && state.cy === 1) {
        module.spawnForestSWNPCs(state);
      } else if (state.cx === 1 && state.cy === 1) {
        module.spawnForestSENPCs(state);
      }
      
      // Spawn forest monsters
      const monsters = module.spawnForestMonsters(state, state.cx, state.cy);
      if (monsters && monsters.length > 0) {
        state.monsters = state.monsters || [];
        state.monsters.push(...monsters);
      }
    });
  } else if (state.cx === 0 && state.cy === 0 && state.chunk?.isMarket) {
    import('../world/candyMarketChunk.js').then(module => {
      module.populateCandyMarket(state);
    });
  } else if (state.cx === 0 && state.cy === 0) {
    // Fallback: Spawn some test NPCs if not a market chunk
    const npcSpots = [];
    // Use actual map dimensions, not viewport dimensions
    const mapHeight = state.chunk.map.length;
    const mapWidth = state.chunk.map[0] ? state.chunk.map[0].length : 24;
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = state.chunk.map[y][x];
        if (tile === '.' && Math.abs(x - player.x) > 2 && Math.abs(y - player.y) > 2) {
          npcSpots.push({ x, y });
        }
      }
    }
    
    // Spawn a few NPCs
    if (npcSpots.length >= 3) {
      // Candy Merchant  
      const merchantSpot = choice(npcSpots);
      spawnSocialNPC(state, {
        id: 'merchant_1',
        name: 'Gummy Joe',
        x: merchantSpot.x,
        y: merchantSpot.y,
        faction: 'merchants',
        dialogueType: 'candy_merchant',
        traits: ['greedy', 'gossipy'],
        hp: 30,
        hpMax: 30
      });
      
      // Banana Guard
      const guardSpot = choice(npcSpots.filter(s => s !== merchantSpot));
      if (guardSpot) {
        spawnSocialNPC(state, {
          id: 'guard_1', 
          name: 'Banana Guard Barry',
          x: guardSpot.x,
          y: guardSpot.y,
          faction: 'guards',
          dialogueType: 'banana_guard',
          traits: ['brave', 'loyal'],
          hp: 40,
          hpMax: 40
        });
      }
      
      // Candy Peasant
      const peasantSpot = choice(npcSpots.filter(s => s !== merchantSpot && s !== guardSpot));
      if (peasantSpot) {
        spawnSocialNPC(state, {
          id: 'peasant_1',
          name: 'Mr. Cupcake',
          x: peasantSpot.x,
          y: peasantSpot.y,
          faction: 'peasants',
          dialogueType: 'candy_peasant',
          traits: ['humble', 'peaceful'],
          hp: 20,
          hpMax: 20
        });
      }
      
      // Candy Noble (Lemongrab-style)
      const nobleSpot = choice(npcSpots.filter(s => s !== merchantSpot && s !== guardSpot && s !== peasantSpot));
      if (nobleSpot) {
        spawnSocialNPC(state, {
          id: 'noble_1',
          name: 'Earl of Candy Corn',
          x: nobleSpot.x,
          y: nobleSpot.y,
          faction: 'nobles',
          dialogueType: 'candy_noble',
          traits: ['proud', 'ambitious'],
          hp: 25,
          hpMax: 25
        });
      }
      
      // Special NPC - Peppermint Butler (if we have more spots)
      const butlerSpot = choice(npcSpots.filter(s => 
        s !== merchantSpot && s !== guardSpot && s !== peasantSpot && s !== nobleSpot));
      if (butlerSpot && npcSpots.length >= 5) {
        spawnSocialNPC(state, {
          id: 'peppermint_butler',
          name: 'Peppermint Butler',
          x: butlerSpot.x,
          y: butlerSpot.y,
          faction: 'royalty',
          dialogueType: 'peppermint_butler',
          traits: ['secretive', 'loyal'],
          hp: 35,
          hpMax: 35
        });
      }
      
      // Root Beer Guy at the tavern (if we have even more spots)
      const tavernSpot = choice(npcSpots.filter(s => 
        s !== merchantSpot && s !== guardSpot && s !== peasantSpot && s !== nobleSpot && s !== butlerSpot));
      if (tavernSpot && npcSpots.length >= 6) {
        spawnSocialNPC(state, {
          id: 'root_beer_guy',
          name: 'Root Beer Guy',
          x: tavernSpot.x,
          y: tavernSpot.y,
          faction: 'merchants',
          dialogueType: 'root_beer_guy',
          traits: ['curious', 'charismatic'],
          hp: 30,
          hpMax: 30
        });
      }
      
      // Starchy - The Conspiracy Theorist Gravedigger
      const starchySpot = choice(npcSpots.filter(s => 
        s !== merchantSpot && s !== guardSpot && s !== peasantSpot && s !== nobleSpot && s !== butlerSpot && s !== tavernSpot));
      if (starchySpot && npcSpots.length >= 7) {
        spawnSocialNPC(state, {
          id: 'starchy',
          name: 'Starchy',
          x: starchySpot.x,
          y: starchySpot.y,
          faction: 'peasants',
          dialogueType: 'starchy',
          traits: ['secretive', 'gossipy'],
          hp: 25,
          hpMax: 25
        });
        console.log('🎭 [GAME] Starchy spawned at', starchySpot);
      }
    }
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
export async function initGame() {
  // Initialize Phase 7/8 world systems
  try {
    await WorldIntegration.initWorldSystems();
    WorldIntegration.startSimulation();
    console.log('World systems initialized');
  } catch (e) {
    console.error('Failed to initialize world systems:', e);
  }
  
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
  import('../ui/questTurnIn.js').then(module => {
    module.initQuestTurnInUI();
  });
  
  // Listen for quest turn-in events
  on('questTurnIn:openShop', ({ vendor }) => {
    // Use window.STATE to ensure we have the latest state with updated gold
    const currentState = window.STATE || STATE;
    
    // Open shop state but delay rendering to ensure gold is updated
    ShopSystem.openShop(currentState, vendor);
    
    // Render after a delay to ensure state is fully synchronized
    setTimeout(() => {
      // Use window.STATE again to ensure we have the absolute latest state
      const latestState = window.STATE || STATE;
      ShopUI.renderShop(latestState);
    }, 100); // Wait 100ms to ensure all state updates are complete
  });
  
  // Initialize particle effects
  import('../ui/particles.js').then(module => {
    module.initParticles();
  });
  
  STATE = await newWorld();
  window.STATE = STATE; // Make available globally for particle system and social system
  
  // Add debug helpers to the window for console debugging
  window.debugChunk = () => {
    const s = window.STATE;
    console.log('=== CHUNK DEBUG INFO ===');
    console.log(`Current chunk: (${s.cx}, ${s.cy})`);
    console.log(`Player position: (${s.player.x}, ${s.player.y})`);
    console.log(`Total NPCs: ${s.npcs?.length || 0}`);
    
    const chunkNPCs = s.npcs?.filter(n => n.chunkX === s.cx && n.chunkY === s.cy) || [];
    console.log(`NPCs in current chunk: ${chunkNPCs.length}`);
    chunkNPCs.forEach(n => {
      console.log(`  - ${n.name} (${n.id}) at (${n.x}, ${n.y}), HP: ${n.hp}/${n.hpMax}`);
    });
    
    console.log('\nAll NPCs by chunk:');
    const npcsByChunk = {};
    s.npcs?.forEach(n => {
      const key = `(${n.chunkX}, ${n.chunkY})`;
      if (!npcsByChunk[key]) npcsByChunk[key] = [];
      npcsByChunk[key].push(n.name);
    });
    Object.entries(npcsByChunk).forEach(([chunk, npcs]) => {
      console.log(`  ${chunk}: ${npcs.join(', ')}`);
    });
    
    return 'Debug info printed to console';
  };
  
  window.spawnStarchy = () => {
    const s = window.STATE;
    import('../world/graveyardChunk.js').then(module => {
      module.populateGraveyard(s);
      console.log('Called populateGraveyard manually');
    });
    return 'Attempting to spawn Starchy...';
  };
  
  window.findStarchy = () => {
    const s = window.STATE;
    const starchy = s.npcs?.find(n => n.id === 'starchy');
    if (starchy) {
      console.log('=== STARCHY STATUS ===');
      console.log('Position:', starchy.x, starchy.y);
      console.log('Chunk:', starchy.chunkX, starchy.chunkY);
      console.log('HP:', starchy.hp, '/', starchy.hpMax);
      console.log('Alive:', starchy.hp > 0);
      console.log('Current player chunk:', s.cx, s.cy);
      console.log('In same chunk?', starchy.chunkX === s.cx && starchy.chunkY === s.cy);
      
      // Check what's at Starchy's position
      if (s.chunk?.map?.[starchy.y]?.[starchy.x]) {
        console.log('Tile at Starchy position:', s.chunk.map[starchy.y][starchy.x]);
      }
      
      return starchy;
    } else {
      console.log('Starchy not found in NPCs array!');
      return null;
    }
  };
  
  console.log('🎮 Debug helpers available: window.debugChunk(), window.spawnStarchy(), window.findStarchy()');
  window.__questItems = questItems; // Make quest items module globally available for dialogue
  console.log('🎮 [GAME] Quest items module made globally available');
  
  // Initialize cursor inspect system now that we have state
  if (canvasRenderer && canvasRenderer.canvas) {
    initCursorInspect(canvasRenderer.canvas, STATE);
    console.log('🖱️ [GAME] Cursor inspect system initialized');
  }
  
  render(STATE);

  STATE.applyStatus = (entity, type, turns = 10, value = 1) => {
    applyStatusEffect(entity, type, turns, value);
  };
  
  // Initialize keyboard controls
  initKeyboardControls();
}

// Keyboard controls moved to src/js/input/keys.js

// Initialization code when DOM is loaded
window.addEventListener("DOMContentLoaded", async () => {
  // Button handlers
  document.getElementById("restart").addEventListener("click", async () => {
    window.STATE = await newWorld();
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