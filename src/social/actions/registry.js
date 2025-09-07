/**
 * Action Registry System - Phase 7
 * Centralized system for managing social actions
 * Data-driven approach for easy content addition
 */

import { DutyType, applyDutyModifiers, getCurrentDuty } from '../schedule.js';
import { 
  SOCIAL_DEFAULTS,
  TRUST_CHANGES,
  RESPECT_CHANGES,
  FEAR_CHANGES,
  RELATIONSHIP_THRESHOLDS,
  LAW_THRESHOLDS,
  ACTION_COOLDOWNS
} from './constants.js';

/**
 * @typedef {Object} ActionContext
 * @property {string} [attitude] - NPC's attitude toward player: 'hostile', 'neutral', 'friendly'
 * @property {Object} [player] - Player object
 * @property {Object} [player.disguise] - Player's disguise
 * @property {string[]} [player.disguise.keys] - Disguise faction keys
 * @property {number} [player.disguise.quality] - Disguise quality (0-1)
 * @property {Array} [player.inventory] - Player's inventory items
 * @property {Object} [npc] - NPC object
 * @property {string} [npc.role] - NPC's role (merchant, guard, etc)
 * @property {Object} [npc.schedule] - NPC's schedule
 * @property {Object} [npc.social] - NPC's social values
 * @property {number} [npc.social.trust] - Trust level (0-1)
 * @property {Object} [relationship] - Relationship between player and NPC
 * @property {number} [relationship.trust] - Trust in relationship (0-1)
 * @property {string} [kingdom] - Current kingdom ID
 * @property {number} [lawLevel] - Law enforcement level (0-1)
 * @property {number} [hour] - Current hour (0-23)
 * @property {Object} [state] - Game state object
 * @property {Object} [params] - Additional action parameters
 */

/**
 * @typedef {Object} ActionDefinition
 * @property {string} id - Unique action identifier
 * @property {string} label - Display label
 * @property {number} cooldown - Cooldown in turns
 * @property {string} [category] - Action category
 * @property {string} [kingdom] - Kingdom restriction
 * @property {function(ActionContext): boolean} requires - Requirements checker
 * @property {function(ActionContext): Object} apply - Apply action effect
 */

/**
 * Action Registry class for managing social actions
 */
export class ActionRegistry {
  constructor() {
    this.actions = new Map();
    this.categories = new Map();
  }
  
  /**
   * Register a new action
   * @param {ActionDefinition} action - Action definition
   */
  register(action) {
    // Validate required properties
    const required = ['id', 'label', 'cooldown', 'requires', 'apply'];
    const missing = required.filter(prop => !action[prop]);
    
    if (missing.length > 0) {
      throw new Error(`Action missing required properties: ${missing.join(', ')}`);
    }
    
    // Check for duplicate IDs
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" already registered`);
    }
    
    // Register action
    this.actions.set(action.id, action);
    
    // Add to category if specified
    if (action.category) {
      if (!this.categories.has(action.category)) {
        this.categories.set(action.category, []);
      }
      this.categories.get(action.category).push(action);
    }
  }
  
  /**
   * Get action by ID
   * @param {string} id - Action ID
   * @returns {ActionDefinition|undefined} Action definition
   */
  get(id) {
    return this.actions.get(id);
  }
  
  /**
   * Get available actions for context
   * @param {ActionContext} context - Current context
   * @returns {ActionDefinition[]} Available actions
   */
  getAvailable(context) {
    const available = [];
    
    for (const action of this.actions.values()) {
      // Check kingdom restriction
      if (action.kingdom) {
        // Allow if context kingdom matches OR NPC is in that kingdom
        const kingdomMatch = context.kingdom === action.kingdom || 
                           (context.npc && context.npc.kingdomId === action.kingdom);
        if (!kingdomMatch) {
          continue;
        }
      }
      
      // Gap 1 Fix: Check faction visibility
      if (action.requiresFaction) {
        // If visibleFaction is specified, use it; otherwise check all factions
        if (context.visibleFaction) {
          if (!action.requiresFaction(context.visibleFaction)) {
            continue;
          }
        } else if (context.npc && context.npc.factions) {
          // Fallback to checking if any faction matches
          const hasFaction = context.npc.factions.some(f => action.requiresFaction(f));
          if (!hasFaction) {
            continue;
          }
        } else {
          // No faction info available, skip faction-specific action
          continue;
        }
      }
      
      // Check requirements
      if (action.requires(context)) {
        available.push(action);
      }
    }
    
    return available;
  }
  
  /**
   * Get actions by category
   * @param {string} category - Category name
   * @returns {Array} Actions in category
   */
  getByCategory(category) {
    return this.categories.get(category) || [];
  }
}

/**
 * Default social actions
 */
export const ACTIONS = {
  greet: {
    id: 'greet',
    label: 'Greet',
    cooldown: ACTION_COOLDOWNS.GREET,
    category: 'social',
    requires: ({ attitude }) => attitude !== 'hostile',
    apply: ({ state, player, npc }) => {
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.GREET;
      if (state && state.log) {
        state.log(`${player.name} greets ${npc.name}`);
      }
      return { success: true, message: 'Greeting exchanged' };
    }
  },
  
  chat: {
    id: 'chat',
    label: 'Chat',
    cooldown: ACTION_COOLDOWNS.CHAT,
    category: 'social',
    requires: ({ attitude }) => attitude === 'friendly' || attitude === 'neutral',
    apply: ({ state, player, npc }) => {
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.CHAT;
      return { success: true, message: 'Had a nice chat' };
    }
  },
  
  compliment: {
    id: 'compliment',
    label: 'Compliment',
    cooldown: ACTION_COOLDOWNS.COMPLIMENT,
    category: 'social',
    requires: ({ attitude }) => attitude === 'friendly' || attitude === 'neutral',
    apply: (context) => {
      const { state, player, npc, hour } = context;
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      
      // Base result with trust gain
      const baseResult = {
        success: true,
        message: 'Compliment appreciated',
        trustGain: TRUST_CHANGES.COMPLIMENT
      };
      
      // Apply duty modifiers (Gap 2)
      const currentDuty = npc.schedule ? getCurrentDuty(npc, hour) : npc.currentDuty;
      const modifiedResult = applyDutyModifiers({ currentDuty, npc, hour }, baseResult);
      
      // Apply the modified trust gain
      npc.social.trust += modifiedResult.trustGain || TRUST_CHANGES.COMPLIMENT;
      npc.social.respect += RESPECT_CHANGES.COMPLIMENT;
      
      return modifiedResult;
    }
  },
  
  insult: {
    id: 'insult',
    label: 'Insult',
    cooldown: ACTION_COOLDOWNS.INSULT,
    category: 'hostile',
    requires: () => true,
    apply: ({ state, player, npc }) => {
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.INSULT;
      npc.social.respect += RESPECT_CHANGES.INSULT;
      return { success: true, message: 'Insult delivered' };
    }
  },
  
  threaten: {
    id: 'threaten',
    label: 'Threaten',
    cooldown: ACTION_COOLDOWNS.THREATEN,
    category: 'hostile',
    requires: ({ attitude }) => attitude === 'hostile' || attitude === 'angry',
    apply: ({ state, player, npc }) => {
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.THREATEN;
      npc.social.fear += FEAR_CHANGES.THREATEN;
      return { success: true, message: 'Threat issued' };
    }
  },
  
  gift: {
    id: 'gift',
    label: 'Give Gift',
    cooldown: ACTION_COOLDOWNS.GIFT,
    category: 'economic',
    requires: ({ attitude, player }) => {
      // Check hostile attitude
      if (attitude === 'hostile') return false;
      
      // If player exists and has inventory, check it's not empty
      if (player && player.inventory) {
        return player.inventory.length > 0;
      }
      
      // If no player or no inventory info, allow the action
      return true;
    },
    apply: ({ state, player, npc }) => {
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.GIFT;
      npc.social.respect += RESPECT_CHANGES.GIFT;
      return { success: true, message: 'Gift received gratefully' };
    }
  },
  
  trade: {
    id: 'trade',
    label: 'Trade',
    cooldown: ACTION_COOLDOWNS.TRADE,
    category: 'economic',
    requires: ({ npc, hour }) => {
      // Check if NPC is a merchant
      if (!npc || npc.role !== 'merchant') return false;
      
      // If hour is provided, check schedule
      if (hour !== undefined && npc.schedule) {
        const currentDuty = npc.schedule.getCurrentDuty(hour);
        if (currentDuty === DutyType.SLEEP) return false;
        if (currentDuty === DutyType.TRADING) return true;
        // Allow other duties except sleep
        return currentDuty !== DutyType.SLEEP;
      }
      
      // Legacy check for currentDuty
      if (npc.currentDuty !== undefined) {
        if (npc.currentDuty === DutyType.SLEEP) return false;
        if (npc.currentDuty === DutyType.TRADING) return true;
      }
      
      return true; // Allow if no schedule
    },
    apply: (context) => {
      const { state, player, npc, hour } = context;
      
      // Base result
      const baseResult = {
        success: true,
        message: 'Trade completed',
        price: 100, // Base price for example
        inventory: ['potion', 'sword', 'shield'] // Example inventory
      };
      
      // Apply duty modifiers (Gap 2)
      const currentDuty = npc.schedule ? getCurrentDuty(npc, hour) : npc.currentDuty;
      const modifiedResult = applyDutyModifiers({ currentDuty, npc, hour }, baseResult);
      
      return modifiedResult;
    }
  },
  
  share_rumor: {
    id: 'share_rumor',
    label: 'Share Rumor',
    cooldown: ACTION_COOLDOWNS.SHARE_RUMOR,
    category: 'social',
    requires: ({ attitude }) => attitude !== 'hostile',
    apply: ({ state, player, npc, params }) => {
      // NPCs have memory initialized in constructor
      // Add rumor if provided
      if (params && params.rumor && npc.memory && npc.memory.addRumor) {
        npc.memory.addRumor(params.rumor);
      }
      
      // Initialize social if needed
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.SHARE_RUMOR;
      
      return { success: true, message: 'Rumor shared' };
    }
  },
  
  hug: {
    id: 'hug',
    label: 'Hug',
    cooldown: ACTION_COOLDOWNS.HUG,
    category: 'social',
    requires: ({ relationship, npc, player }) => {
      // Check relationship object first
      if (relationship && relationship.trust !== undefined) {
        return relationship.trust > RELATIONSHIP_THRESHOLDS.HUG_TRUST_REQUIRED;
      }
      
      // Check NPC's social values
      if (npc && npc.social && npc.social.trust !== undefined) {
        return npc.social.trust > RELATIONSHIP_THRESHOLDS.HUG_TRUST_REQUIRED;
      }
      
      // Check relation value from getRelationTo
      if (npc && player && npc.getRelationTo) {
        const relation = npc.getRelationTo(player);
        return relation > RELATIONSHIP_THRESHOLDS.POSITIVE_RELATION;
      }
      
      return false;
    },
    apply: ({ state, player, npc }) => {
      npc.social = npc.social || { 
        trust: SOCIAL_DEFAULTS.TRUST, 
        fear: SOCIAL_DEFAULTS.FEAR, 
        respect: SOCIAL_DEFAULTS.RESPECT 
      };
      npc.social.trust += TRUST_CHANGES.HUG;
      return { success: true, message: 'Warm hug exchanged' };
    }
  },
  
  arrest: {
    id: 'arrest',
    label: 'Arrest',
    cooldown: ACTION_COOLDOWNS.ARREST,
    category: 'authority',
    requires: ({ player }) => {
      // Only available if player is disguised as guard
      if (!player) return false;
      
      // Check for disguise object
      if (player.disguise && player.disguise.keys) {
        // Check if any disguise key is guard-related
        return player.disguise.keys.some(key => 
          key.includes('guard') || key === 'banana_guard'
        );
      }
      
      // Check for old-style single disguise
      if (player.disguiseKey) {
        return player.disguiseKey.includes('guard');
      }
      
      return false;
    },
    apply: ({ state, player, npc }) => {
      return { success: true, message: 'Arrest attempted' };
    }
  },
  
  pickpocket: {
    id: 'pickpocket',
    label: 'Pickpocket',
    cooldown: ACTION_COOLDOWNS.PICKPOCKET,
    category: 'criminal',
    requires: ({ kingdom, lawLevel }) => {
      // Only in lawless areas
      if (lawLevel !== undefined && lawLevel > LAW_THRESHOLDS.PICKPOCKET_MAX) return false;
      return true;
    },
    apply: ({ state, player, npc }) => {
      return { success: true, message: 'Pickpocket attempted' };
    }
  }
};

/**
 * Kingdom-specific actions
 */
export const KINGDOM_ACTIONS = {
  candy: {
    praise_princess: {
      id: 'praise_pb',
      label: 'Praise Princess Bubblegum',
      kingdom: 'candy',
      cooldown: ACTION_COOLDOWNS.PRAISE_PRINCESS,
      category: 'social',
      requires: () => true,
      apply: ({ state, player, npc }) => {
        npc.social = npc.social || { 
          trust: SOCIAL_DEFAULTS.TRUST, 
          fear: SOCIAL_DEFAULTS.FEAR, 
          respect: SOCIAL_DEFAULTS.RESPECT 
        };
        npc.social.respect += RESPECT_CHANGES.PRAISE_PRINCESS;
        return { success: true, message: 'Princess praised' };
      }
    },
    
    share_candy: {
      id: 'share_candy',
      label: 'Share Candy',
      kingdom: 'candy',
      cooldown: ACTION_COOLDOWNS.SHARE_CANDY,
      category: 'social',
      requiresFaction: (faction) => faction && (faction.includes('candy') || faction === 'candy_citizens' || faction === 'candy_merchants'),
      requires: ({ attitude }) => attitude !== 'hostile',
      apply: ({ state, player, npc }) => {
        npc.social = npc.social || { 
          trust: SOCIAL_DEFAULTS.TRUST, 
          fear: SOCIAL_DEFAULTS.FEAR, 
          respect: SOCIAL_DEFAULTS.RESPECT 
        };
        npc.social.trust += TRUST_CHANGES.SHARE_CANDY;
        return { success: true, message: 'Candy shared' };
      }
    }
  },
  
  fire: {
    flame_challenge: {
      id: 'flame_challenge',
      label: 'Challenge to Flame Battle',
      kingdom: 'fire',
      cooldown: ACTION_COOLDOWNS.FLAME_CHALLENGE,
      category: 'hostile',
      requires: () => true,
      apply: ({ state, player, npc }) => {
        npc.social = npc.social || { 
          trust: SOCIAL_DEFAULTS.TRUST, 
          fear: SOCIAL_DEFAULTS.FEAR, 
          respect: SOCIAL_DEFAULTS.RESPECT 
        };
        npc.social.respect += RESPECT_CHANGES.FLAME_CHALLENGE;
        npc.social.fear += FEAR_CHANGES.FLAME_CHALLENGE;
        return { success: true, message: 'Challenge issued' };
      }
    },
    
    show_respect: {
      id: 'show_respect',
      label: 'Show Respect',
      kingdom: 'fire',
      cooldown: ACTION_COOLDOWNS.SHOW_RESPECT,
      category: 'social',
      requires: () => true,
      apply: ({ state, player, npc }) => {
        npc.social = npc.social || { 
          trust: SOCIAL_DEFAULTS.TRUST, 
          fear: SOCIAL_DEFAULTS.FEAR, 
          respect: SOCIAL_DEFAULTS.RESPECT 
        };
        npc.social.respect += RESPECT_CHANGES.SHOW_RESPECT;
        return { success: true, message: 'Respect shown' };
      }
    }
  },
  
  ice: {
    formal_greeting: {
      id: 'formal_greeting',
      label: 'Formal Greeting',
      kingdom: 'ice',
      cooldown: ACTION_COOLDOWNS.FORMAL_GREETING,
      category: 'social',
      requires: () => true,
      apply: ({ state, player, npc }) => {
        npc.social = npc.social || { 
          trust: SOCIAL_DEFAULTS.TRUST, 
          fear: SOCIAL_DEFAULTS.FEAR, 
          respect: SOCIAL_DEFAULTS.RESPECT 
        };
        npc.social.respect += RESPECT_CHANGES.FORMAL_GREETING;
        npc.social.trust += TRUST_CHANGES.FORMAL_GREETING || 0.03;
        return { success: true, message: 'Formal greeting exchanged' };
      }
    },
    
    discuss_science: {
      id: 'discuss_science',
      label: 'Discuss Science',
      kingdom: 'ice',
      cooldown: 4,
      category: 'social',
      requires: ({ npc }) => npc.role === 'scientist' || npc.role === 'noble',
      apply: ({ state, player, npc }) => {
        npc.social = npc.social || { trust: 0.5, fear: 0.2, respect: 0.3 };
        npc.social.respect += 0.15;
        npc.social.trust += 0.05;
        return { success: true, message: 'Scientific discussion enjoyed' };
      }
    },
    
    exchange_intel: {
      id: 'exchange_intel',
      label: 'Exchange Intelligence',
      kingdom: 'ice',
      cooldown: 5,
      category: 'espionage',
      requiresFaction: (faction) => faction === 'ice_spies',
      requires: ({ npc }) => {
        // Keep basic requirement check for backward compatibility
        return npc.factions && npc.factions.includes('ice_spies');
      },
      apply: ({ state, player, npc }) => {
        return { success: true, message: 'Intelligence exchanged' };
      }
    }
  }
};

/**
 * Enhanced rumor actions (Gap 3 implementation)
 */
export const RUMOR_ACTIONS = {
  ask_for_rumors: {
    id: 'ask_for_rumors',
    label: 'Ask for Rumors',
    cooldown: 2,
    category: 'rumor',
    requires: ({ attitude, npc }) => {
      return attitude !== 'hostile' && npc && npc.memory && npc.memory.rumors;
    },
    apply: ({ npc }) => {
      const rumors = npc.memory.rumors.slice(0, 3);
      return {
        success: true,
        rumors: rumors,
        message: rumors.length > 0 ? 'Here\'s what I\'ve heard...' : 'I haven\'t heard anything interesting.'
      };
    }
  },
  
  verify_rumor: {
    id: 'verify_rumor',
    label: 'Verify Rumor',
    cooldown: 3,
    category: 'rumor',
    requires: ({ relationship, npc, params }) => {
      // Need trust and a rumor to verify
      return relationship && relationship.trust > 0.5 && 
             npc && npc.memory && npc.memory.rumors.length > 0 &&
             params && params.rumorId;
    },
    apply: ({ npc, params }) => {
      const rumor = npc.memory.rumors.find(r => r.id === params.rumorId);
      if (!rumor) {
        return { success: false, message: 'I don\'t know about that rumor.' };
      }
      
      // Verification based on rumor properties and random chance
      const verification = !rumor.false && Math.random() > 0.3;
      
      return {
        success: true,
        verified: verification,
        message: verification ? 'Yes, that\'s true!' : 'No, that\'s just gossip.'
      };
    }
  },
  
  share_sensitive_rumor: {
    id: 'share_sensitive_rumor',
    label: 'Share Sensitive Information',
    cooldown: 5,
    category: 'rumor',
    requires: ({ relationship, npc }) => {
      // High trust required and specific roles
      return relationship && relationship.trust > 0.7 && 
             npc && (npc.role === 'guard' || npc.role === 'spy' || npc.role === 'noble');
    },
    apply: ({ npc, player }) => {
      // Create high-value rumor based on NPC role
      const sensitiveRumor = {
        id: `sensitive_${Date.now()}`,
        type: 'intelligence',
        severity: 'critical',
        content: npc.role === 'guard' ? 'Secret guard patrol routes' :
                 npc.role === 'spy' ? 'Enemy kingdom plans' :
                 'Court intrigue',
        restricted: true,
        source: npc.id
      };
      
      // Add to NPC's memory that they shared this
      npc.memory.addRumor({
        ...sensitiveRumor,
        sharedWith: player.name
      });
      
      return {
        success: true,
        rumor: sensitiveRumor,
        trustGain: 0.1,
        message: 'I shouldn\'t be telling you this, but...'
      };
    }
  },
  
  spread_false_rumor: {
    id: 'spread_false_rumor',
    label: 'Spread False Rumor',
    cooldown: 4,
    category: 'rumor',
    requires: ({ npc, params }) => {
      // Spies and criminals can spread false rumors
      return npc && (npc.role === 'spy' || npc.role === 'criminal' || npc.role === 'bandit') &&
             params && params.content;
    },
    apply: ({ npc, params, player }) => {
      const falseRumor = {
        id: `false_${Date.now()}`,
        type: 'misinformation',
        content: params.content,
        false: true,
        spreaderId: player.name,
        timestamp: Date.now()
      };
      
      // NPC adds the false rumor to their memory
      const added = npc.memory.addRumor(falseRumor);
      
      if (!added) {
        return {
          success: false,
          message: 'I\'ve already heard that one.'
        };
      }
      
      // Trust loss if spreading lies
      if (npc.social) {
        npc.social.trust -= 0.1;
      }
      
      return {
        success: true,
        message: 'Interesting... I\'ll spread the word.',
        trustLoss: 0.1
      };
    }
  },
  
  debunk_rumor: {
    id: 'debunk_rumor',
    label: 'Debunk Rumor',
    cooldown: 3,
    category: 'rumor',
    requires: ({ npc, params, relationship }) => {
      // Need to know the rumor exists and have some trust
      return npc && npc.memory && params && params.rumorId &&
             npc.memory.rumors.some(r => r.id === params.rumorId) &&
             (!relationship || relationship.trust > 0.3);
    },
    apply: ({ npc, params }) => {
      // Remove false rumor from memory
      const rumorIndex = npc.memory.rumors.findIndex(r => r.id === params.rumorId);
      
      if (rumorIndex === -1) {
        return { success: false, message: 'I don\'t know that rumor.' };
      }
      
      const rumor = npc.memory.rumors[rumorIndex];
      
      // Only debunk if it's actually false or if NPC trusts the player enough
      if (rumor.false || Math.random() > 0.5) {
        npc.memory.rumors.splice(rumorIndex, 1);
        npc.memory.rumorIds.delete(params.rumorId);
        
        // Gain respect for correcting misinformation
        if (npc.social) {
          npc.social.respect = (npc.social.respect || 0.5) + 0.05;
        }
        
        return {
          success: true,
          respectGain: 0.05,
          message: 'You\'re right, that was just gossip. Thanks for clearing that up.'
        };
      } else {
        return {
          success: false,
          message: 'No, I\'m pretty sure that\'s true.'
        };
      }
    }
  }
};

/**
 * Auto-discover actions from directory
 * Only available in Node.js environment with file system access
 * @param {string} dir - Directory path
 * @returns {Promise<Array>} Discovered actions
 */
export async function discoverActions(dir) {
  const actions = [];
  
  // Check if we're in Node.js environment
  if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
    return actions;
  }
  
  try {
    // Dynamic import for Node.js only
    const fs = await import('fs');
    const path = await import('path');
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (file.endsWith('.action.js')) {
        const actionPath = path.join(dir, file);
        const actionModule = await import(actionPath);
        const action = actionModule.default;
        
        if (action && action.id && action.label && action.apply) {
          actions.push(action);
        }
      }
    }
  } catch (error) {
    // Directory might not exist yet - only warn in development
    if (process.env && process.env.NODE_ENV === 'development') {
      console.warn(`Could not discover actions from ${dir}:`, error.message);
    }
  }
  
  return actions;
}

// Create default registry and register all actions
const defaultRegistry = new ActionRegistry();

// Register default actions
for (const action of Object.values(ACTIONS)) {
  defaultRegistry.register(action);
}

// Register kingdom actions
for (const kingdom of Object.values(KINGDOM_ACTIONS)) {
  for (const action of Object.values(kingdom)) {
    defaultRegistry.register(action);
  }
}

// Register enhanced rumor actions (Gap 3)
for (const action of Object.values(RUMOR_ACTIONS)) {
  defaultRegistry.register(action);
}

export default defaultRegistry;