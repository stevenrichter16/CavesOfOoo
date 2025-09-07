/**
 * NPC Class - Multi-faction NPCs for Adventure Time kingdoms
 * Supports complex faction relationships and behaviors
 */

import { getEffectiveRelation, evaluateFactionHostility, getVisibleFactions as getEntityVisibleFactions } from './factionRegistry.js';
import { getFactionDef } from '../data/kingdoms/index.js';
import { invalidateDisguiseCaches } from './relationCache.js';
import { 
  DIALOGUE_THRESHOLDS, 
  FACTION_PRIORITIES, 
  BEHAVIOR_THRESHOLDS,
  SPAWN_CONFIG,
  FACTION_CATEGORIES,
  SUSPICIOUS_COMBOS,
  DEFAULT_FACTIONS
} from './npcConstants.js';
import { 
  MIN_PERCEPTION_VALUE,
  MAX_PERCEPTION_VALUE,
  DEFAULT_NPC_HP,
  DEFAULT_NPC_HP_MAX,
  DEFAULT_CHUNK_X,
  DEFAULT_CHUNK_Y
} from './integration/constants.js';
import { getErrorHandler, ErrorCode } from './utils/ErrorHandler.js';

/**
 * NPC class with multi-faction support
 */
export class NPC {
  constructor(config) {
    // Validate config
    if (!config || typeof config !== 'object') {
      throw new Error('NPC config must be an object');
    }
    if (!config.id) {
      throw new Error('NPC must have an id');
    }
    
    // Basic properties
    this.id = config.id;
    this.name = config.name || `NPC_${config.id}`;
    this.kingdomId = config.kingdomId || null;
    this.role = config.role || 'citizen';
    this.perception = config.perception || SPAWN_CONFIG.DEFAULT_PERCEPTION;
    
    // Combat properties for movement integration
    this.hp = config.hp ?? DEFAULT_NPC_HP;
    this.hpMax = config.hpMax ?? DEFAULT_NPC_HP_MAX;
    
    // Position properties for movement integration
    // Accept either position object or x,y directly
    // Use nullish coalescing to handle 0 as valid position
    if (config.position) {
      this.x = config.position.x ?? 0;
      this.y = config.position.y ?? 0;
    } else {
      this.x = config.x ?? 0;
      this.y = config.y ?? 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;
    this.chunkX = config.chunkX ?? DEFAULT_CHUNK_X;
    this.chunkY = config.chunkY ?? DEFAULT_CHUNK_Y;
    
    // Movement-related properties
    this.patrolCenter = config.patrolCenter || null;
    this.patrolRadius = config.patrolRadius || 5;
    this.moveSpeed = config.moveSpeed || 1;
    
    // Validate and clamp perception range (allow super-human perception for magical NPCs)
    if (this.perception < MIN_PERCEPTION_VALUE) {
      const errorHandler = getErrorHandler();
      errorHandler.logWarning(
        ErrorCode.NPC_INVALID_DATA,
        `Invalid negative perception ${this.perception}, setting to ${MIN_PERCEPTION_VALUE}`,
        { npcId: this.id, perception: this.perception }
      );
      this.perception = MIN_PERCEPTION_VALUE;
    }
    if (this.perception > MAX_PERCEPTION_VALUE) {
      const errorHandler = getErrorHandler();
      errorHandler.logWarning(
        ErrorCode.NPC_INVALID_DATA,
        `Extremely high perception ${this.perception}, clamping to ${MAX_PERCEPTION_VALUE}`,
        { npcId: this.id, perception: this.perception }
      );
      this.perception = MAX_PERCEPTION_VALUE;
    }
    
    // Handle faction inheritance
    if (config.inheritFrom) {
      this.inheritFactionsFrom(config.inheritFrom);
    } else if (config.inheritFaction && this.kingdomId) {
      this.inheritDefaultFaction();
    } else {
      // Filter and sanitize factions
      this.factions = (config.factions || [])
        .map(f => NPC.sanitizeFaction(f))
        .filter(f => f && f.length > 0);
    }
    
    // Add additional factions if specified in config
    let weightsSetByAddFactions = false;
    if (config.additionalFactions) {
      // Ensure factions array exists before adding
      if (!this.factions || this.factions.length === 0) {
        this.factions = [];
      }
      this.addFactions(config.additionalFactions, config.factionPriority);
      weightsSetByAddFactions = true;
    }
    
    // Handle faction weights (don't override if already set by addFactions)
    if (config.factionWeights) {
      this.validateAndSetWeights(config.factionWeights);
    } else if (!weightsSetByAddFactions) {
      this.generateEqualWeights();
    }
    
    // Disguise support
    this._disguise = config.disguise || null;
    
    // Phase 5: Memory system for rumors
    this.memory = {
      rumors: [],
      rumorIds: new Set(), // Fast O(1) lookup for duplicate checking
      maxRumors: 10,
      lastUpdate: Date.now(),
      factionImpacts: {}, // Track impact of rumors on faction relations
      // Method to add rumors safely
      addRumor: function(rumor) {
        if (!rumor) return false;
        
        // Check for duplicate by ID
        if (rumor.id && this.rumorIds.has(rumor.id)) {
          return false;
        }
        
        // Add rumor
        this.rumors.push(rumor);
        if (rumor.id) {
          this.rumorIds.add(rumor.id);
        }
        
        // Enforce max rumors limit (remove oldest)
        if (this.rumors.length > this.maxRumors) {
          const removed = this.rumors.shift();
          if (removed.id) {
            this.rumorIds.delete(removed.id);
          }
        }
        
        this.lastUpdate = Date.now();
        return true;
      }
    };
    
    // Infer role from factions if not specified
    if (!this.role || this.role === 'citizen') {
      this.inferRoleFromFactions();
    }
  }

  /**
   * Get disguise
   */
  get disguise() {
    return this._disguise;
  }
  
  /**
   * Get position as object
   */
  get position() {
    return { x: this.x, y: this.y };
  }

  /**
   * Set disguise and invalidate cache
   */
  set disguise(value) {
    // Validate and sanitize disguise data
    if (value && typeof value === 'object') {
      // Validate quality if present (handle NaN by defaulting to 0)
      if (typeof value.quality === 'number') {
        if (isNaN(value.quality)) {
          value.quality = 0;
        } else {
          value.quality = Math.max(0, Math.min(1, value.quality));
        }
      }
      
      // Sanitize disguise keys if present
      if (Array.isArray(value.keys)) {
        value.keys = value.keys
          .map(key => NPC.sanitizeFaction(key))
          .filter(key => key && key.length > 0);
      }
    }
    
    this._disguise = value;
    // Invalidate cache when disguise changes
    invalidateDisguiseCaches();
  }
  
  /**
   * Sanitize faction string
   */
  static sanitizeFaction(faction) {
    if (!faction || typeof faction !== 'string') return null;
    // Remove any HTML/script tags and dangerous characters
    return faction.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
  }

  /**
   * Infer role based on faction types
   */
  inferRoleFromFactions() {
    if (this.hasFactionType('guard')) {
      this.role = 'guard';
    } else if (this.hasFactionType('merchant')) {
      this.role = 'merchant';
    } else if (this.hasFactionType('noble')) {
      this.role = 'noble';
    } else if (this.hasFactionType('priest')) {
      this.role = 'priest';
    } else if (this.hasFactionType('criminal')) {
      this.role = 'bandit';
    } else if (!this.role) {
      this.role = 'citizen';
    }
  }
  
  /**
   * Inherit factions from parent NPC
   */
  inheritFactionsFrom(parent) {
    this.factions = [...parent.factions];
    this.factionWeights = { ...parent.factionWeights };
  }
  
  /**
   * Inherit default faction based on kingdom and role
   */
  inheritDefaultFaction() {
    // Use default faction mappings from constants
    const roleFactionMap = DEFAULT_FACTIONS;
    
    const factionMap = roleFactionMap[this.role];
    if (factionMap && factionMap[this.kingdomId]) {
      this.factions = [factionMap[this.kingdomId]];
    } else {
      // Try to fallback to citizen role if available
      const citizenMap = roleFactionMap['citizen'];
      if (citizenMap && citizenMap[this.kingdomId]) {
        this.factions = [citizenMap[this.kingdomId]];
      } else {
        // Default fallback - empty factions
        this.factions = [];
      }
    }
  }
  
  /**
   * Add additional factions with priority handling
   */
  addFactions(factions, priority = 'equal') {
    const existingFactions = this.factions || [];
    this.factions = [...existingFactions, ...factions];
    
    // Regenerate weights based on priority
    if (priority === 'additional') {
      // Give more weight to additional factions
      const totalAdditionalWeight = FACTION_PRIORITIES.ADDITIONAL_WEIGHT;
      const totalExistingWeight = FACTION_PRIORITIES.EXISTING_WEIGHT;
      
      this.factionWeights = {};
      
      // Distribute weights proportionally within each group
      if (existingFactions.length > 0) {
        const existingShare = totalExistingWeight / existingFactions.length;
        existingFactions.forEach(f => {
          this.factionWeights[f] = existingShare;
        });
      }
      
      if (factions.length > 0) {
        const additionalShare = totalAdditionalWeight / factions.length;
        factions.forEach(f => {
          this.factionWeights[f] = additionalShare;
        });
      }
      
      // Verify weights sum to 1 (with floating point tolerance)
      const sum = Object.values(this.factionWeights).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > FACTION_PRIORITIES.WEIGHT_SUM_TOLERANCE) {
        console.warn(`Faction weights sum to ${sum}, normalizing...`);
        this.normalizeWeights();
      }
    } else {
      this.generateEqualWeights();
    }
  }
  
  /**
   * Normalize weights to sum to 1
   */
  normalizeWeights() {
    const sum = Object.values(this.factionWeights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      Object.keys(this.factionWeights).forEach(f => {
        this.factionWeights[f] /= sum;
      });
    }
  }
  
  /**
   * Validate and set faction weights
   */
  validateAndSetWeights(weights, strict = false) {
    const sum = Object.values(weights).reduce((acc, w) => acc + w, 0);
    
    // Check for invalid individual weights
    for (const [faction, weight] of Object.entries(weights)) {
      if (weight < 0 || weight > 1) {
        throw new Error(`Invalid faction weight for ${faction}: ${weight}`);
      }
    }
    
    if (Math.abs(sum - 1) > FACTION_PRIORITIES.WEIGHT_SUM_TOLERANCE) {
      // Throw error if sum exceeds reasonable bounds
      if (strict || sum > 1.15 || sum < 0.5) {
        throw new Error(`Faction weights must sum to 1, got ${sum}`);
      }
      // Normalize weights to sum to 1 for deviations between 0.5-1.15
      const normalized = {};
      for (const [faction, weight] of Object.entries(weights)) {
        normalized[faction] = weight / sum;
      }
      this.factionWeights = normalized;
    } else {
      this.factionWeights = weights;
    }
  }
  
  /**
   * Generate equal weights for all factions
   */
  generateEqualWeights() {
    this.factionWeights = {};
    if (this.factions.length === 0) return;
    
    const weight = 1 / this.factions.length;
    this.factions.forEach(f => {
      this.factionWeights[f] = weight;
    });
  }
  
  /**
   * Get relation to another NPC (includes rumor impacts)
   */
  getRelationTo(other, additionalContext = {}) {
    // Build comprehensive context
    const otherIsMerchant = other.role === 'merchant' || 
                           (other.hasFactionType && other.hasFactionType('merchant'));
    const context = {
      kingdomId: this.kingdomId,
      tradeContext: this.role === 'merchant' || otherIsMerchant ||
                   this.hasFactionType('merchant'),
      ...additionalContext // Allow caller to add timeOfDay, alertState, etc.
    };
    
    const baseRelation = getEffectiveRelation(
      this.factions,
      other.factions,
      context
    );
    
    // Phase 5: Apply rumor-based modifications
    if (this.memory?.factionImpacts) {
      let impact = 0;
      for (const faction of (other.factions || [])) {
        if (this.memory.factionImpacts[faction]) {
          impact += this.memory.factionImpacts[faction];
        }
      }
      return Math.max(-1, Math.min(1, baseRelation + impact));
    }
    
    return baseRelation;
  }
  
  /**
   * Evaluate hostility to another NPC
   */
  evaluateHostilityTo(other, context = {}) {
    const fullContext = {
      ...context,
      kingdomId: this.kingdomId || context.kingdomId,
      disguise: other.disguise
    };
    
    // Use visible factions if other is an NPC with getVisibleFactions method
    const otherFactions = other.getVisibleFactions ? other.getVisibleFactions() : other.factions;
    
    return evaluateFactionHostility(
      this.factions,
      otherFactions,
      fullContext
    );
  }
  
  /**
   * Get visible factions (what others see)
   */
  getVisibleFactions() {
    // High quality disguise hides real factions
    if (this.disguise?.keys && 
        this.disguise.keys.length > 0 && 
        this.disguise.quality > DIALOGUE_THRESHOLDS.DISGUISE_QUALITY_MIN) {
      return [...this.disguise.keys];
    }
    // Low quality or no disguise shows real factions
    return [...this.factions];
  }
  
  /**
   * Get all factions (including hidden ones)
   */
  getAllFactions() {
    const allFactions = [...this.factions];
    if (this.disguise?.keys) {
      this.disguise.keys.forEach(f => {
        if (!allFactions.includes(f)) {
          allFactions.push(f);
        }
      });
    }
    return allFactions;
  }
  
  /**
   * Get dialogue options based on faction relations
   */
  getDialogue(player, context = {}) {
    const relation = this.getRelationTo(player);
    const hostility = this.evaluateHostilityTo(player, context);
    
    // Check for same faction
    const sameFaction = this.factions.some(f => player.factions?.includes(f));
    
    // Check for disguise suspicion
    let disguiseSuspected = false;
    if (player.disguise && this.perception > player.disguise.quality) {
      disguiseSuspected = true;
    }
    
    // Determine dialogue tone
    let tone;
    if (disguiseSuspected) {
      tone = 'suspicious';
    } else if (hostility.hostile) {
      tone = 'hostile';
    } else if (sameFaction) {
      tone = 'collegial';
    } else if (relation > DIALOGUE_THRESHOLDS.FRIENDLY_RELATION) {
      tone = 'friendly';
    } else if (relation < DIALOGUE_THRESHOLDS.UNFRIENDLY_RELATION) {
      tone = 'unfriendly';
    } else if (this.hasSuspiciousFactions()) {
      tone = 'nervous';
    } else {
      tone = 'neutral';
    }
    
    // Build dialogue options
    const options = [];
    const hints = [];
    
    // Add basic talk option for non-hostile
    if (tone !== 'hostile') {
      options.push('talk');
    }
    
    // Guard-specific options
    if (this.hasFactionType('guard') || this.role === 'guard') {
      if (tone === 'hostile') {
        options.push('arrest');
      } else if (tone === 'suspicious') {
        options.push('question');
      }
    }
    
    // Merchant-specific options
    if (this.hasFactionType('merchant') || this.role === 'merchant') {
      if (tone === 'friendly' || tone === 'neutral' || tone === 'collegial') {
        options.push('trade');
      }
    }
    
    // Faction business for same faction
    if (sameFaction) {
      options.push('faction_business');
    }
    
    // Add hints
    if (disguiseSuspected) {
      hints.push('disguise_suspected');
    }
    if (this.hasSuspiciousFactions()) {
      hints.push('suspicious');
    }
    if (tone === 'hostile') {
      hints.push('hostile');
    }
    
    return {
      tone,
      options,
      hints
    };
  }
  
  /**
   * Check if NPC has suspicious faction mix
   */
  hasSuspiciousFactions() {
    const suspiciousCombos = SUSPICIOUS_COMBOS;
    
    return suspiciousCombos.some(combo => 
      combo.every(f => this.factions.includes(f))
    );
  }
  
  /**
   * Get NPC behavior based on context
   */
  getBehavior(context = {}) {
    let primary = 'idle';
    let secondary = null;
    let alertLevel = 'normal';
    
    // Calculate faction type weights
    const guardWeight = this.getFactionTypeWeight('guard');
    const merchantWeight = this.getFactionTypeWeight('merchant');
    const citizenWeight = this.getFactionTypeWeight('citizen');
    
    // Determine primary behavior based on context and weights
    if (context.timeOfDay === 'night') {
      if (guardWeight > 0) {
        primary = 'patrol';
        alertLevel = 'high';
        if (merchantWeight > 0.3) {
          secondary = 'watch';
        }
      } else if (citizenWeight > 0) {
        primary = 'rest';
      } else if (merchantWeight > 0) {
        primary = 'restock';
      }
    } else { // day or unspecified
      if (merchantWeight > guardWeight && merchantWeight > 0) {
        primary = 'trade';
        if (guardWeight > 0.3) {
          secondary = 'watch';
        }
      } else if (guardWeight > 0) {
        primary = 'watch';
        if (merchantWeight > 0.3) {
          secondary = 'trade';
        }
      } else if (citizenWeight > 0) {
        primary = 'work';
      }
    }
    
    return {
      primary,
      secondary,
      alertLevel
    };
  }
  
  /**
   * Get behavior toward another NPC
   */
  getBehaviorToward(other) {
    const relation = this.getRelationTo(other);
    const hostility = this.evaluateHostilityTo(other);
    
    // Handle hostile interactions first
    if (hostility.hostile) {
      // Citizens and non-combatants flee from threats
      if (this.hasFactionType('citizen') || 
          (!this.hasFactionType('guard') && !this.hasFactionType('criminal'))) {
        return {
          action: 'flee',
          priority: 'high',
          cooperation: 0
        };
      }
      // Guards confront threats
      if (this.hasFactionType('guard')) {
        return {
          action: 'confront',
          priority: 'high',
          cooperation: 0
        };
      }
      // Criminals might fight or flee
      if (this.hasFactionType('criminal')) {
        return {
          action: 'fight',
          priority: 'high',
          cooperation: 0
        };
      }
    }
    
    // Handle friendly/neutral interactions
    
    // Merchants always prioritize trade with other merchants
    const thisIsMerchant = this.hasFactionType('merchant') || this.role === 'merchant';
    const otherIsMerchant = (other.hasFactionType && other.hasFactionType('merchant')) || 
                           other.role === 'merchant' ||
                           (other.factions && other.factions.some(f => f.includes('merchant')));
    
    if (thisIsMerchant && otherIsMerchant && relation > BEHAVIOR_THRESHOLDS.COOPERATION_MIN) {
      return {
        action: 'trade',
        priority: 'normal',
        cooperation: relation
      };
    }
    
    // Guards watch suspicious individuals
    if (this.hasFactionType('guard') && relation < 0) {
      return {
        action: 'watch',
        priority: 'normal',
        cooperation: 0
      };
    }
    
    // Allied factions cooperate
    if (relation > BEHAVIOR_THRESHOLDS.COOPERATION_MIN) {
      const primaryAction = this.hasFactionType('merchant') ? 'trade' : 'cooperate';
      return {
        action: primaryAction,
        priority: 'normal',
        cooperation: relation
      };
    }
    
    return {
      action: 'neutral',
      priority: 'low',
      cooperation: Math.max(0, relation)
    };
  }
  
  /**
   * Check if NPC has a faction of given type
   */
  hasFactionType(type) {
    const keywords = FACTION_CATEGORIES[type.toUpperCase()] || [];
    return this.factions.some(f => {
      const fLower = f.toLowerCase();
      return keywords.some(keyword => {
        // Check if keyword appears as whole word or after underscore/hyphen
        // This matches: "guard", "banana_guard", "fire-guard", "guards", etc.
        const patterns = [
          new RegExp(`^${keyword}$`),          // Exact match
          new RegExp(`^${keyword}[_-]`),       // Starts with keyword
          new RegExp(`[_-]${keyword}$`),       // Ends with keyword  
          new RegExp(`[_-]${keyword}[_-]`)     // In middle
        ];
        return patterns.some(regex => regex.test(fLower));
      });
    });
  }
  
  /**
   * Get weight for factions of given type
   */
  getFactionTypeWeight(type) {
    const keywords = FACTION_CATEGORIES[type.toUpperCase()] || [];
    return this.factions
      .filter(f => keywords.some(keyword => f.toLowerCase().includes(keyword)))
      .reduce((sum, f) => sum + (this.factionWeights[f] || 0), 0);
  }
  
  /**
   * Get merchant faction weight
   */
  getMerchantWeight() {
    return this.getFactionTypeWeight('merchant');
  }
  
  /**
   * Get guard faction weight
   */
  getGuardWeight() {
    return this.getFactionTypeWeight('guard');
  }

  /**
   * Move NPC to new position
   * @param {number} x - New x position
   * @param {number} y - New y position
   * @param {number} chunkX - Optional new chunk X
   * @param {number} chunkY - Optional new chunk Y
   */
  moveTo(x, y, chunkX = this.chunkX, chunkY = this.chunkY) {
    // Store last position
    this.lastX = this.x;
    this.lastY = this.y;
    
    // Update position
    this.x = x;
    this.y = y;
    this.chunkX = chunkX;
    this.chunkY = chunkY;
  }

  /**
   * Get distance to a position
   * @param {number} x - Target x position
   * @param {number} y - Target y position
   * @returns {number} Euclidean distance
   */
  distanceTo(x, y) {
    return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
  }

  /**
   * Check if NPC can see a position
   * @param {number} x - Target x position
   * @param {number} y - Target y position
   * @param {number} range - Vision range (default 10)
   * @returns {boolean}
   */
  canSee(x, y, range = 10) {
    return this.distanceTo(x, y) <= range;
  }

  /**
   * Phase 5: Rumor & Memory System Methods
   */

  /**
   * Hear a rumor and add to memory
   * @param {Rumor} rumor - The rumor to hear
   */
  hearRumor(rumor) {
    if (!rumor || !this.memory) {
      console.warn('NPC.hearRumor: Invalid rumor or memory not initialized');
      return false;
    }
    
    // Check if we already know this rumor (O(1) lookup)
    if (this.memory.rumorIds.has(rumor.id)) {
      return false;
    }
    
    // Add rumor to memory
    this.memory.rumors.push(rumor);
    this.memory.rumorIds.add(rumor.id);
    
    // Maintain memory limit
    this.maintainMemoryLimit();
    
    return true;
  }

  /**
   * Share rumors with another NPC
   * @param {NPC} otherNPC - The NPC to share with
   * @returns {boolean} Whether rumors were shared
   */
  shareRumorsWith(otherNPC) {
    if (!otherNPC || !this.memory || this.memory.rumors.length === 0) {
      return false;
    }
    
    // Check relation to other NPC
    const relation = this.getRelationTo(otherNPC);
    
    // Don't share with hostile NPCs
    if (relation < -0.3) {
      return false;
    }
    
    // Filter rumors to share
    const rumorsToShare = this.memory.rumors.filter(rumor => {
      // Don't share private rumors unless very close
      if (!rumor.isPublic && relation < 0.7) {
        return false;
      }
      
      // When disguised, be selective about what to share
      if (this.disguise && this.disguise.quality > 0.5) {
        // Don't share faction-specific secrets while disguised
        if (!rumor.isPublic && rumor.factions?.some(f => this.factions.includes(f))) {
          return false;
        }
      }
      
      // Don't share negative rumors about the recipient's factions
      // unless we're very close allies or the rumor is about mutual enemies
      if (rumor.sentiment < -0.2 && rumor.factions?.length > 0) {
        const targetsFriendlyFaction = rumor.factions.some(f => 
          otherNPC.factions.includes(f)
        );
        
        if (targetsFriendlyFaction) {
          // Only share if we're close allies (relation > 0.8)
          if (relation < 0.8) {
            // Could check if recipient also dislikes that faction, but keep it simple
            return false; // Don't share negative rumor about their faction
          }
        }
      }
      
      // Prioritize sharing positive rumors about recipient's factions
      if (rumor.sentiment > 0.2 && rumor.factions?.some(f => otherNPC.factions.includes(f))) {
        return true; // Always share positive news about their faction
      }
      
      return true;
    });
    
    // Share filtered rumors
    let shared = false;
    for (const rumor of rumorsToShare) {
      const spreadCopy = rumor.createSpreadCopy();
      otherNPC.hearRumor(spreadCopy);
      shared = true;
    }
    
    return shared;
  }

  /**
   * Process the impact of rumors on faction relations
   */
  processRumorImpact() {
    if (!this.memory || this.memory.rumors.length === 0) return;
    
    // Process each rumor's sentiment impact
    for (const rumor of this.memory.rumors) {
      if (rumor.sentiment !== undefined && rumor.sentiment !== 0) {
        // Apply sentiment impact to faction relations
        // The factions IN the rumor are affected by the sentiment
        if (!this.memory.factionImpacts) {
          this.memory.factionImpacts = {};
        }
        
        // Apply to rumor's main factions
        const targetFactions = rumor.factions || [];
        for (const faction of targetFactions) {
          if (!this.memory.factionImpacts[faction]) {
            this.memory.factionImpacts[faction] = 0;
          }
          // Stronger impact for more severe rumors
          const SEVERITY_MULTIPLIER_BASE = 0.1;
          const severityMultiplier = rumor.severity ? rumor.severity * SEVERITY_MULTIPLIER_BASE : SEVERITY_MULTIPLIER_BASE;
          this.memory.factionImpacts[faction] += rumor.sentiment * severityMultiplier;
        }
        
        // Also apply to explicitly affected factions if specified
        if (rumor.affectedFactions) {
          for (const faction of rumor.affectedFactions) {
            if (!this.memory.factionImpacts[faction]) {
              this.memory.factionImpacts[faction] = 0;
            }
            // For affected factions, positive rumors improve, negative rumors harm
            const AFFECTED_FACTION_IMPACT = 0.05;
            this.memory.factionImpacts[faction] += rumor.sentiment * AFFECTED_FACTION_IMPACT;
          }
        }
      }
    }
  }

  /**
   * Update memory, removing stale rumors
   */
  updateMemory() {
    if (!this.memory) return;
    
    const now = Date.now();
    const DAYS_IN_MS = 86400000;
    const STALE_DAYS = 7;
    const staleTime = DAYS_IN_MS * STALE_DAYS;
    
    // Remove stale rumors
    const freshRumors = [];
    this.memory.rumors.forEach(rumor => {
      const age = now - rumor.timestamp;
      if (age < staleTime) {
        freshRumors.push(rumor);
      } else {
        // Remove stale rumor ID from Set
        this.memory.rumorIds.delete(rumor.id);
      }
    });
    this.memory.rumors = freshRumors;
    
    this.memory.lastUpdate = now;
    this.maintainMemoryLimit();
  }

  /**
   * Maintain memory limit by removing least important rumors
   */
  maintainMemoryLimit() {
    if (!this.memory || this.memory.rumors.length <= this.memory.maxRumors) {
      return;
    }
    
    // For minor rumors only, keep most recent
    const allMinor = this.memory.rumors.every(r => 
      !r.severity || r.severity === 1
    );
    
    let removedRumors = [];
    
    if (allMinor) {
      // Keep the most recent rumors when all are minor
      removedRumors = this.memory.rumors.slice(0, -this.memory.maxRumors);
      this.memory.rumors = this.memory.rumors.slice(-this.memory.maxRumors);
    } else {
      // Sort by priority (keep important ones)
      this.memory.rumors.sort((a, b) => {
        // Priority: Critical > Major > Moderate > Minor
        // Then by recency
        const severityDiff = (b.severity || 1) - (a.severity || 1);
        if (severityDiff !== 0) return severityDiff;
        
        return b.timestamp - a.timestamp;
      });
      
      // Track removed rumors
      removedRumors = this.memory.rumors.slice(this.memory.maxRumors);
      
      // Keep only top N rumors
      this.memory.rumors = this.memory.rumors.slice(0, this.memory.maxRumors);
    }
    
    // Remove IDs of forgotten rumors from the Set
    removedRumors.forEach(rumor => {
      this.memory.rumorIds.delete(rumor.id);
    });
  }

}