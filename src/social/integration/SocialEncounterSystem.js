/**
 * SocialEncounterSystem - Bridges the MovementPipeline with the Social/NPC system
 * Handles NPC encounters during movement and triggers appropriate social interactions
 */

import defaultRegistry from '../actions/registry.js';
import { Schedule, getTimeOfDayFromHour } from '../schedule.js';
import { 
  DEFAULT_GAME_HOUR, 
  DEFAULT_LAW_LEVEL,
  DEFAULT_PLAYER_ROLE,
  DEFAULT_TRUST,
  DEFAULT_FEAR,
  DEFAULT_RESPECT,
  EVENTS,
  ERRORS,
  DEBUG
} from './constants.js';
import { ErrorHandler, ErrorCode, ErrorSeverity } from '../utils/ErrorHandler.js';

export class SocialEncounterSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.registry = defaultRegistry;
    this.errorHandler = new ErrorHandler(eventBus, {
      debugMode: DEBUG.LOG_ENCOUNTERS
    });
    
    // Bind handler for proper cleanup
    this.handleNPCInteraction = this.handleNPCInteraction.bind(this);
    
    // Listen for NPC interactions from the movement pipeline
    this.eventBus.on(EVENTS.NPC_INTERACTION, this.handleNPCInteraction);
    
    // Register recovery strategies
    this._registerRecoveryStrategies();
  }
  
  /**
   * Handle NPCInteraction event from MovementPipeline
   * @private
   */
  handleNPCInteraction(data) {
    // Pass the full context including state
    const context = {
      state: data.context?.state || data.state,
      player: data.player,
      npc: data.npc
    };
    this.handleEncounter(data.player, data.npc, context);
  }
  
  /**
   * Clean up event listeners to prevent memory leaks
   */
  destroy() {
    this.eventBus.off(EVENTS.NPC_INTERACTION, this.handleNPCInteraction);
  }
  
  /**
   * Handle an encounter between player and NPC
   * @param {Object} player - The player entity
   * @param {Object} npc - The NPC entity
   * @param {Object} context - Additional context (state, kingdom, etc)
   */
  handleEncounter(player, npc, context) {
    try {
      // Validate inputs
      if (!player || !npc) {
        this.errorHandler.logWarning(
          ErrorCode.ENCOUNTER_INVALID,
          'Missing player or NPC',
          { player: !!player, npc: !!npc }
        );
        return;
      }
      
      // Build social context for evaluation
      const socialContext = this.buildSocialContext(player, npc, context);
      
      if (DEBUG.LOG_ENCOUNTERS) {
        this.errorHandler.logDebug(
          'ENCOUNTER_START',
          `Handling encounter: ${player.name} meets ${npc.name}`,
          { player: player.name, npc: npc.name, context: socialContext }
        );
      }
      
      // Get available actions with error handling
      let actions = [];
      try {
        actions = this.registry.getAvailable(socialContext);
      } catch (registryError) {
        this.errorHandler.logError(
          ErrorCode.ENCOUNTER_REGISTRY_ERROR,
          registryError,
          { player: player.name, npc: npc.name },
          ErrorSeverity.WARNING
        );
        // Fallback to basic talk action
        actions = [{ id: 'talk', label: 'Talk', enabled: true }];
      }
      
      // Emit menu event if there are actions available
      if (actions && actions.length > 0) {
        this.eventBus.emit(EVENTS.SOCIAL_MENU_OPEN, {
          npc: npc,
          actions: actions,
          context: socialContext
        });
      }
    } catch (error) {
      this.errorHandler.logError(
        ErrorCode.ENCOUNTER_SYSTEM_ERROR,
        error,
        { 
          player: player?.name, 
          npc: npc?.name,
          context: context 
        }
      );
      // Error event is automatically emitted by ErrorHandler
    }
  }
  
  /**
   * Build social context from movement context
   */
  buildSocialContext(player, npc, context) {
    const state = context.state || {};
    const chunk = state.chunk || {};
    
    // Get time-based context
    const gameTime = state.gameTime || { hour: DEFAULT_GAME_HOUR };
    const timeOfDay = getTimeOfDayFromHour(gameTime.hour);
    
    // Get NPC's current duty if they have a schedule
    let currentDuty = null;
    if (npc.schedule instanceof Schedule) {
      currentDuty = npc.schedule.getDuty(timeOfDay);
    }
    
    // Get visible faction for the player (considering disguise)
    let visibleFaction = null;
    if (player.disguise && player.disguise.keys && player.disguise.keys.length > 0) {
      // Use first disguise key as visible faction
      visibleFaction = player.disguise.keys[0];
    } else if (player.factions && player.factions.length > 0) {
      visibleFaction = player.factions[0];
    }
    
    return {
      actor: player,
      target: npc,
      
      // Kingdom context
      kingdomId: chunk.kingdomId || state.kingdom,
      lawLevel: chunk.lawLevel || state.lawLevel || DEFAULT_LAW_LEVEL,
      
      // Time context
      timeOfDay: timeOfDay,
      currentDuty: currentDuty,
      
      // Faction context
      visibleFaction: visibleFaction,
      playerDisguise: player.disguise,
      
      // Relationship context (if available)
      trust: npc.social?.trust || DEFAULT_TRUST,
      fear: npc.social?.fear || DEFAULT_FEAR,
      respect: npc.social?.respect || DEFAULT_RESPECT,
      
      // Role context
      npcRole: npc.role,
      playerRole: player.role || DEFAULT_PLAYER_ROLE,
      
      // State reference for actions that need it
      state: state
    };
  }
  
  /**
   * Check if an NPC should be considered hostile
   */
  isNPCHostile(npc, player, context) {
    // Check explicit hostility
    if (npc.attitude === 'hostile') {
      return true;
    }
    
    // Check faction-based hostility
    if (npc.evaluateHostilityTo) {
      const hostility = npc.evaluateHostilityTo(player, {
        lawLevel: context.lawLevel || 0.5,
        kingdomId: context.kingdomId
      });
      return hostility.hostile;
    }
    
    return false;
  }
  
  /**
   * Register recovery strategies for common errors
   * @private
   */
  _registerRecoveryStrategies() {
    // Recovery for registry errors - reload registry
    this.errorHandler.registerRecoveryStrategy(
      ErrorCode.ENCOUNTER_REGISTRY_ERROR,
      (error) => {
        try {
          this.registry = defaultRegistry;
          this.errorHandler.logInfo(
            'RECOVERY_SUCCESS',
            'Registry reloaded successfully'
          );
        } catch (e) {
          // Recovery failed, will be logged by ErrorHandler
        }
      }
    );
    
    // Recovery for invalid encounters - clean up state
    this.errorHandler.registerRecoveryStrategy(
      ErrorCode.ENCOUNTER_INVALID,
      (error) => {
        // Close any open menus
        this.eventBus.emit(EVENTS.SOCIAL_MENU_CLOSE);
      }
    );
  }
}