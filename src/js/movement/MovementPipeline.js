/**
 * MovementPipeline - Orchestrates player movement through a series of steps
 * Each step can modify or cancel the movement
 */
import { EventBus } from '../systems/EventBus.js';
import { entityAt, isPassable, tryEdgeTravel } from '../utils/queries.js';
import { attack } from '../combat/combat.js';
import { isNPCHostileToPlayer } from '../social/disguise.js';
import { isFrozen } from '../combat/statusSystem.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';
import { getTerrainSystem } from '../systems/TerrainSystem.js';
import { getLootSystem } from '../systems/LootSystem.js';
import { getInventorySystem } from '../systems/InventorySystem.js';
import { getPathfindingSystem } from '../pathfinding/PathfindingSystem.js';
import { getMovementCostCalculator } from '../pathfinding/MovementCostCalculator.js';
import { getPathCache } from '../pathfinding/PathCache.js';

export class MovementPipeline {
  constructor(eventBus = new EventBus()) {
    this.eventBus = eventBus;
    
    // Initialize systems (can be overridden for testing)
    this.terrainSystem = getTerrainSystem(eventBus);
    this.lootSystem = getLootSystem(eventBus);
    this.inventorySystem = getInventorySystem(eventBus);
    this.pathfindingSystem = getPathfindingSystem();
    this.movementCostCalculator = getMovementCostCalculator();
    this.pathCache = getPathCache();
    
    // Define pipeline steps in order
    this.steps = [
      { name: 'validation', handler: this.validateMove.bind(this) },
      { name: 'preMove', handler: this.preMove.bind(this) },
      { name: 'checkStatus', handler: this.checkStatusEffects.bind(this) },
      { name: 'checkCollisions', handler: this.checkCollisions.bind(this) },
      { name: 'handleNPC', handler: this.handleNPCInteraction.bind(this) },
      { name: 'handleMonster', handler: this.handleMonsterCollision.bind(this) },
      { name: 'checkTerrain', handler: this.checkTerrainPassability.bind(this) },
      { name: 'handleItems', handler: this.handleItemPickup.bind(this) },
      { name: 'applyMovement', handler: this.applyMovement.bind(this) },
      { name: 'handleEdgeTransition', handler: this.handleEdgeTransition.bind(this) },
      { name: 'postMove', handler: this.postMove.bind(this) }
    ];
  }

  /**
   * Execute the movement pipeline
   * @param {Object} state - Game state
   * @param {Object} action - Movement action {type: 'move', dx, dy}
   * @returns {Promise<MovementResult>} Result of the movement attempt
   */
  async execute(state, action) {
    // Create movement context
    const context = this.createContext(state, action);
    
    // Execute each step in sequence
    for (const step of this.steps) {
      try {
        const startTime = performance.now();
        
        await step.handler(context);
        
        const duration = performance.now() - startTime;
        context.metrics[step.name] = duration;
        
        // Check if movement was cancelled
        if (context.cancelled) {
          context.result.success = false;
          context.result.step = step.name;
          break;
        }
      } catch (error) {
        console.error(`Error in movement step '${step.name}':`, error);
        context.cancelled = true;
        context.result.success = false;
        context.result.error = error.message;
        context.result.step = step.name;
        break;
      }
    }

    // Copy metrics to result
    context.result.metrics = context.metrics;
    
    // Emit final result event
    await this.eventBus.emitAsync('MovementComplete', context.result);
    
    return context.result;
  }

  /**
   * Create movement context object
   */
  createContext(state, action) {
    // Validate critical inputs only - detailed validation in validateMove step
    if (!state) {
      throw new Error('MovementPipeline: state is required');
    }
    if (!state.player) {
      throw new Error('MovementPipeline: state.player is required');
    }
    if (!action) {
      throw new Error('MovementPipeline: action is required');
    }
    
    const player = state.player;
    // Use defaults if dx/dy are missing (will be caught in validateMove)
    const targetX = player.x + (action.dx || 0);
    const targetY = player.y + (action.dy || 0);

    return {
      // Input
      state,
      action,
      player,
      
      // Positions
      fromX: player.x,
      fromY: player.y,
      targetX,
      targetY,
      
      // State
      cancelled: false,
      skipDefaultHandler: false,
      
      // Result
      result: {
        success: true,
        moved: false,
        reason: null,
        step: null,
        interacted: false,
        attacked: false,
        pickedUpItems: [],
        changedChunk: false,
        metrics: {}
      },
      
      // Metrics for performance tracking
      metrics: {}
    };
  }

  /**
   * Step 1: Validate the move action
   */
  async validateMove(context) {
    const { action } = context;
    
    if (!action || action.type !== 'move') {
      context.cancelled = true;
      context.result.reason = 'Invalid move action';
      return;
    }

    if (typeof action.dx !== 'number' || typeof action.dy !== 'number') {
      context.cancelled = true;
      context.result.reason = 'Invalid movement delta';
      return;
    }

    // Check if movement is non-zero
    if (action.dx === 0 && action.dy === 0) {
      context.cancelled = true;
      context.result.reason = 'No movement';
      return;
    }
  }

  /**
   * Step 2: Pre-move checks and events
   */
  async preMove(context) {
    const { fromX, fromY, targetX, targetY, player } = context;
    
    // Emit WillMove event - handlers can cancel movement
    const preEvent = await this.eventBus.emitAsync('WillMove', {
      player,
      from: { x: fromX, y: fromY },
      to: { x: targetX, y: targetY },
      context
    });

    if (preEvent.cancelled) {
      context.cancelled = true;
      context.result.reason = 'Movement cancelled by WillMove event';
      return;
    }

    // Legacy event system compatibility
    const legacyEvent = {
      id: context.state.playerId || player.id || 'player',
      from: { x: fromX, y: fromY },
      to: { x: targetX, y: targetY },
      cancel: false
    };
    
    emit(EventType.WillMove, legacyEvent);
    
    if (legacyEvent.cancel) {
      context.cancelled = true;
      context.result.reason = 'Movement cancelled by legacy event';
      return;
    }
  }

  /**
   * Step 3: Check status effects that prevent movement
   */
  async checkStatusEffects(context) {
    const { player } = context;
    
    // Check if player is frozen
    if (isFrozen(player)) {
      context.cancelled = true;
      context.result.reason = 'Player is frozen';
      
      if (context.state.log) {
        context.state.log("You're frozen and cannot move!", "bad");
      }
      return;
    }

    // Check for other movement-preventing statuses
    const statusEvent = await this.eventBus.emitAsync('CheckMovementStatus', {
      player,
      context
    });

    if (statusEvent.cancelled) {
      context.cancelled = true;
      context.result.reason = statusEvent.data.reason || 'Status effect prevents movement';
      return;
    }
  }

  /**
   * Step 4: Check for collisions with world boundaries
   */
  async checkCollisions(context) {
    const { targetX, targetY, state } = context;
    
    // Check if we're moving out of bounds (edge transition handled later)
    const mapWidth = state.chunk?.map?.[0]?.length || 0;
    const mapHeight = state.chunk?.map?.length || 0;
    
    if (targetX < 0 || targetX >= mapWidth || targetY < 0 || targetY >= mapHeight) {
      // Don't cancel - edge transition will handle this
      context.isEdgeTransition = true;
      return;
    }
  }

  /**
   * Step 5: Handle NPC interactions
   */
  async handleNPCInteraction(context) {
    const { targetX, targetY, state } = context;
    
    // Skip if edge transition
    if (context.isEdgeTransition) return;
    
    // Check for NPC at target position
    const npc = state.npcs?.find(n => 
      n.x === targetX && 
      n.y === targetY && 
      n.hp > 0 &&
      n.chunkX === state.cx &&
      n.chunkY === state.cy
    );

    if (!npc) return;

    // Check if NPC is hostile
    if (isNPCHostileToPlayer(state, npc)) {
      // Attack hostile NPC
      attack(state, context.player, npc);
      context.result.attacked = true;
      context.cancelled = true;
      context.result.reason = 'Attacked hostile NPC';
      return;
    }

    // Interact with friendly NPC
    await this.eventBus.emitAsync('NPCInteraction', { 
      player: context.player, 
      npc,
      context 
    });

    // Legacy interaction
    emit(EventType.NPCInteraction, { player: context.player, npc });
    
    if (state.openNPCInteraction) {
      state.openNPCInteraction(state, npc);
    } else if (state.log) {
      state.log(`You approach ${npc.name}.`, "note");
    }

    context.result.interacted = true;
    context.cancelled = true;
    context.result.reason = 'NPC interaction';
  }

  /**
   * Step 6: Handle monster collisions
   */
  async handleMonsterCollision(context) {
    const { targetX, targetY, state } = context;
    
    // Skip if edge transition or already cancelled
    if (context.isEdgeTransition || context.cancelled) return;
    
    // Check for monster at target position
    const monster = entityAt(state, targetX, targetY);
    
    if (monster && monster !== context.player) {
      // Attack the monster
      const result = attack(state, context.player, monster);
      
      context.result.attacked = true;
      context.cancelled = true;
      context.result.reason = 'Monster collision';
      
      // Emit combat event
      await this.eventBus.emitAsync('CombatInitiated', {
        attacker: context.player,
        defender: monster,
        result
      });
    }
  }

  /**
   * Step 7: Check terrain passability
   */
  async checkTerrainPassability(context) {
    const { targetX, targetY, state } = context;
    
    // Skip if edge transition or already cancelled
    if (context.isEdgeTransition || context.cancelled) return;
    
    // Use TerrainSystem to check passability
    const tile = this.terrainSystem.getTerrainAt(state, targetX, targetY);
    
    if (tile && !this.terrainSystem.isPassable(tile)) {
      context.cancelled = true;
      context.result.reason = 'Terrain not passable';
      
      // Log message based on terrain type
      
      if (tile === '#') {
        if (state.log) state.log("You bump into a wall.", "note");
      } else if (tile === '+') {
        if (state.log) state.log("The door is locked.", "note");
      }
      
      // Emit blocked event
      await this.eventBus.emitAsync('MovementBlocked', {
        player: context.player,
        position: { x: targetX, y: targetY },
        tile,
        context
      });
    }
  }

  /**
   * Step 8: Handle item pickup at target position
   */
  async handleItemPickup(context) {
    const { targetX, targetY, state } = context;
    
    // Skip if cancelled or edge transition
    if (context.cancelled || context.isEdgeTransition) return;
    
    // Use LootSystem to check for items
    const items = this.lootSystem.getItemsAt(state, targetX, targetY);
    
    if (items && items.length > 0) {
      // Check if inventory has space
      const canPickup = items.filter(item => {
        if (item.stackable) {
          // Stackable items can usually be picked up
          return true;
        }
        // Check inventory space for non-stackable
        return !this.inventorySystem.isInventoryFull(state.player.inventory);
      });
      
      // Store items that will be picked up
      context.itemsToPickup = canPickup;
      
      // Emit item pickup event
      if (canPickup.length > 0) {
        await this.eventBus.emitAsync('ItemsAvailable', {
          player: context.player,
          items: canPickup,
          position: { x: targetX, y: targetY },
          context
        });
      }
    }
  }

  /**
   * Step 9: Apply the movement
   */
  async applyMovement(context) {
    const { targetX, targetY, player, state } = context;
    
    // Skip if cancelled
    if (context.cancelled) return;
    
    // Skip if edge transition (handled in next step)
    if (context.isEdgeTransition) return;
    
    // Update player position
    player.x = targetX;
    player.y = targetY;
    
    context.result.moved = true;
    
    // Handle item pickup after movement using LootSystem
    if (context.itemsToPickup && context.itemsToPickup.length > 0) {
      context.result.pickedUpItems = [];
      
      // Use synchronous checkForItems to avoid race conditions
      const pickedUp = this.lootSystem.checkForItems(state, targetX, targetY);
      context.result.pickedUpItems = pickedUp;
    }
    
    // Check for terrain effects at new position
    await this.handleTerrainEffects(context);
  }

  /**
   * Step 10: Handle edge transitions
   */
  async handleEdgeTransition(context) {
    const { targetX, targetY, state } = context;
    
    // Skip if not an edge transition or cancelled
    if (!context.isEdgeTransition || context.cancelled) return;
    
    // Try to transition to new chunk
    const transitioned = tryEdgeTravel(state, targetX, targetY);
    
    if (transitioned) {
      context.result.moved = true;
      context.result.changedChunk = true;
      
      // Emit chunk change event
      await this.eventBus.emitAsync('ChunkChanged', {
        player: context.player,
        from: { x: context.fromX, y: context.fromY },
        to: { x: state.player.x, y: state.player.y },
        chunkFrom: { x: state.cx, y: state.cy },
        chunkTo: { x: state.cx, y: state.cy } // Updated by tryEdgeTravel
      });
    } else {
      context.cancelled = true;
      context.result.reason = 'Edge transition failed';
      
      if (state.log) {
        state.log("You can't go that way.", "note");
      }
    }
  }

  /**
   * Step 11: Post-move effects and events
   */
  async postMove(context) {
    const { player, result } = context;
    
    // Skip if movement was cancelled
    if (context.cancelled) return;
    
    // Emit successful movement event
    await this.eventBus.emitAsync('DidMove', {
      player,
      from: { x: context.fromX, y: context.fromY },
      to: { x: player.x, y: player.y },
      result
    });
    
    // Legacy event
    emit(EventType.DidMove, {
      id: context.state.playerId || player.id || 'player',
      from: { x: context.fromX, y: context.fromY },
      to: { x: player.x, y: player.y }
    });
  }

  /**
   * Find path to target position using A* pathfinding
   * @param {Object} state - Game state
   * @param {Object} target - Target position {x, y}
   * @returns {Array|null} Path as array of positions or null if no path
   */
  findPath(state, target) {
    const start = { x: state.player.x, y: state.player.y };
    
    // Check cache first
    let path = this.pathCache.get(start, target);
    if (path) {
      return path;
    }
    
    // Calculate new path
    path = this.pathfindingSystem.findPath(start, target, state);
    
    // Cache the result if successful
    if (path) {
      this.pathCache.set(start, target, path);
    }
    
    return path;
  }

  /**
   * Calculate movement cost for a specific move
   * @param {Object} state - Game state
   * @param {Object} from - Starting position
   * @param {Object} to - Target position
   * @returns {number} Movement cost
   */
  calculateMovementCost(state, from, to) {
    return this.movementCostCalculator.calculateMoveCost(from, to, state);
  }

  /**
   * Invalidate cached paths in an area (when terrain changes)
   * @param {Object} area - Area to invalidate
   */
  invalidatePathCache(area) {
    this.pathCache.invalidateArea(area);
    this.movementCostCalculator.invalidateCache();
  }

  /**
   * Get pathfinding statistics
   * @returns {Object} Statistics object
   */
  getPathfindingStats() {
    return {
      cache: this.pathCache.getStats(),
      cacheSize: this.pathCache.size()
    };
  }

  /**
   * Handle terrain effects at player's position
   */
  async handleTerrainEffects(context) {
    const { player, state } = context;
    const tile = this.terrainSystem.getTerrainAt(state, player.x, player.y);
    
    // Don't modify cancelled state - it's for movement, not terrain
    
    // Emit terrain enter event
    await this.eventBus.emitAsync('TerrainEntered', {
      player,
      tile,
      position: { x: player.x, y: player.y },
      context
    });
    
    // Use TerrainSystem to handle enter effects (now synchronous)
    if (tile) {
      this.terrainSystem.onEnterTile(state, player.x, player.y);
    }
    
    // Handle exit effects for previous tile if we moved
    if (context.fromX !== player.x || context.fromY !== player.y) {
      const previousTile = this.terrainSystem.getTerrainAt(state, context.fromX, context.fromY);
      if (previousTile) {
        this.terrainSystem.onExitTile(state, context.fromX, context.fromY);
      }
    }
  }
}

// Default instance getter - can be overridden for testing
let _movementPipeline = null;

/**
 * Get or create the movement pipeline instance
 * @param {EventBus} eventBus - Optional event bus to use
 * @returns {MovementPipeline} The movement pipeline instance
 */
export function getMovementPipeline(eventBus = null) {
  if (!_movementPipeline) {
    const bus = eventBus || new EventBus();
    _movementPipeline = new MovementPipeline(bus);
  }
  return _movementPipeline;
}

/**
 * Reset the movement pipeline (useful for testing)
 */
export function resetMovementPipeline() {
  _movementPipeline = null;
}

// Export for backward compatibility (will deprecate)
export const movementPipeline = getMovementPipeline();