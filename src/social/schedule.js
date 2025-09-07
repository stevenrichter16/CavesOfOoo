/**
 * Schedule System - Phase 6
 * Provides time-based NPC duties and behavior modifiers
 * Integrates with existing phases 1-5 of the social system
 */

// Time of day constants
export const TimeOfDay = {
  MORNING: 'morning',      // 6:00 - 11:59
  AFTERNOON: 'afternoon',  // 12:00 - 17:59
  EVENING: 'evening',      // 18:00 - 21:59
  NIGHT: 'night'          // 22:00 - 5:59 (wraps midnight)
};

// Duty type constants
export const DutyType = {
  PATROL: 'patrol',
  GUARD_POST: 'guard_post',
  TRADING: 'trading',
  SETUP_SHOP: 'setup_shop',
  REST: 'rest',
  SOCIALIZE: 'socialize',
  WORSHIP: 'worship',
  GATHER_RUMORS: 'gather_rumors',
  SPREAD_RUMORS: 'spread_rumors',
  HOME: 'home',
  SLEEP: 'sleep',
  EAT: 'eat',
  WORK: 'work'
};

/**
 * Get time of day from hour (0-23)
 * @param {number} hour - Hour in 24-hour format
 * @returns {string} Time period from TimeOfDay
 * @throws {Error} If hour is not a valid number
 */
export function getTimeOfDayFromHour(hour) {
  // Input validation
  if (typeof hour !== 'number' || isNaN(hour)) {
    throw new Error('Hour must be a number');
  }
  
  if (hour < 0) {
    throw new Error('Hour must be non-negative');
  }
  
  // Validate hour is an integer
  if (!Number.isInteger(hour)) {
    throw new Error('Hour must be an integer');
  }
  
  const normalizedHour = hour % 24;
  
  if (normalizedHour >= 6 && normalizedHour < 12) {
    return TimeOfDay.MORNING;
  } else if (normalizedHour >= 12 && normalizedHour < 18) {
    return TimeOfDay.AFTERNOON;
  } else if (normalizedHour >= 18 && normalizedHour < 22) {
    return TimeOfDay.EVENING;
  } else {
    return TimeOfDay.NIGHT;
  }
}

/**
 * Schedule class for managing NPC duties throughout the day
 */
export class Schedule {
  constructor(duties) {
    // Validate that all time periods are defined
    const requiredPeriods = Object.values(TimeOfDay);
    const providedPeriods = Object.keys(duties);
    
    for (const period of requiredPeriods) {
      if (!providedPeriods.includes(period)) {
        throw new Error('Schedule must define duties for all time periods');
      }
    }
    
    // Check for extra/invalid periods
    for (const period of providedPeriods) {
      if (!requiredPeriods.includes(period)) {
        throw new Error(`Invalid time period: ${period}`);
      }
    }
    
    // Create immutable copy
    this.duties = Object.freeze({ ...duties });
  }
  
  /**
   * Get duty for a specific time period
   * @param {string} timeOfDay - Time period from TimeOfDay
   * @returns {string} Duty type from DutyType
   */
  getDuty(timeOfDay) {
    return this.duties[timeOfDay];
  }
  
  /**
   * Get a copy of all duties (immutable)
   * @returns {Object} Copy of duties object
   */
  getAllDuties() {
    return { ...this.duties };
  }
  
  /**
   * Get current duty based on hour
   * @param {number} hour - Current hour (0-23)
   * @returns {string} Current duty type
   */
  getCurrentDuty(hour) {
    const timeOfDay = getTimeOfDayFromHour(hour);
    return this.getDuty(timeOfDay);
  }
  
  /**
   * Create a new Schedule with a modified duty
   * Schedules are immutable to prevent cache corruption
   * @param {string} timeOfDay - Time period from TimeOfDay
   * @param {string} duty - Duty type from DutyType
   * @returns {Schedule} New Schedule instance with the modification
   */
  withDuty(timeOfDay, duty) {
    // Validate inputs
    if (!Object.values(TimeOfDay).includes(timeOfDay)) {
      throw new Error(`Invalid time period: ${timeOfDay}`);
    }
    if (!Object.values(DutyType).includes(duty)) {
      throw new Error(`Invalid duty type: ${duty}`);
    }
    
    // Create new schedule with modified duty
    const newDuties = { ...this.duties };
    newDuties[timeOfDay] = duty;
    return new Schedule(newDuties);
  }
  
  /**
   * @deprecated Schedules are immutable. Use withDuty() instead.
   */
  setDuty(timeOfDay, duty) {
    throw new Error('Schedules are immutable. Use withDuty() to create a modified schedule.');
  }
}

// Cache for default schedules to improve performance
const SCHEDULE_CACHE = new Map();

/**
 * Clear the schedule cache (useful for testing or memory management)
 */
export function clearScheduleCache() {
  SCHEDULE_CACHE.clear();
}

// Role-based default schedules
const ROLE_SCHEDULES = {
  guard: {
    [TimeOfDay.MORNING]: DutyType.PATROL,
    [TimeOfDay.AFTERNOON]: DutyType.GUARD_POST,
    [TimeOfDay.EVENING]: DutyType.PATROL,
    [TimeOfDay.NIGHT]: DutyType.GUARD_POST
  },
  merchant: {
    [TimeOfDay.MORNING]: DutyType.SETUP_SHOP,
    [TimeOfDay.AFTERNOON]: DutyType.TRADING,
    [TimeOfDay.EVENING]: DutyType.TRADING,
    [TimeOfDay.NIGHT]: DutyType.HOME
  },
  citizen: {
    [TimeOfDay.MORNING]: DutyType.WORK,
    [TimeOfDay.AFTERNOON]: DutyType.WORK,
    [TimeOfDay.EVENING]: DutyType.SOCIALIZE,
    [TimeOfDay.NIGHT]: DutyType.SLEEP
  },
  gossip: {
    [TimeOfDay.MORNING]: DutyType.GATHER_RUMORS,
    [TimeOfDay.AFTERNOON]: DutyType.SPREAD_RUMORS,
    [TimeOfDay.EVENING]: DutyType.SOCIALIZE,
    [TimeOfDay.NIGHT]: DutyType.SLEEP
  },
  priest: {
    [TimeOfDay.MORNING]: DutyType.WORSHIP,
    [TimeOfDay.AFTERNOON]: DutyType.WORSHIP,
    [TimeOfDay.EVENING]: DutyType.REST,
    [TimeOfDay.NIGHT]: DutyType.SLEEP
  },
  noble: {
    [TimeOfDay.MORNING]: DutyType.REST,
    [TimeOfDay.AFTERNOON]: DutyType.SOCIALIZE,
    [TimeOfDay.EVENING]: DutyType.SOCIALIZE,
    [TimeOfDay.NIGHT]: DutyType.REST
  },
  criminal: {
    [TimeOfDay.MORNING]: DutyType.SLEEP,
    [TimeOfDay.AFTERNOON]: DutyType.REST,
    [TimeOfDay.EVENING]: DutyType.WORK,
    [TimeOfDay.NIGHT]: DutyType.WORK
  },
  spy: {
    [TimeOfDay.MORNING]: DutyType.GATHER_RUMORS,
    [TimeOfDay.AFTERNOON]: DutyType.WORK,
    [TimeOfDay.EVENING]: DutyType.GATHER_RUMORS,
    [TimeOfDay.NIGHT]: DutyType.WORK
  },
  // Default schedule for unknown roles
  default: {
    [TimeOfDay.MORNING]: DutyType.WORK,
    [TimeOfDay.AFTERNOON]: DutyType.WORK,
    [TimeOfDay.EVENING]: DutyType.REST,
    [TimeOfDay.NIGHT]: DutyType.SLEEP
  }
};

/**
 * Get default schedule for a role (cached for performance)
 * @param {string} role - NPC role
 * @returns {Schedule} Default schedule for the role
 */
export function getRoleDefaultSchedule(role) {
  // Normalize role to handle unknown roles
  const normalizedRole = ROLE_SCHEDULES[role] ? role : 'default';
  
  // Check cache first
  if (SCHEDULE_CACHE.has(normalizedRole)) {
    return SCHEDULE_CACHE.get(normalizedRole);
  }
  
  // Create new schedule and cache it
  const duties = ROLE_SCHEDULES[normalizedRole];
  const schedule = new Schedule(duties);
  SCHEDULE_CACHE.set(normalizedRole, schedule);
  
  return schedule;
}

// Duty-based behavior modifiers
const DUTY_MODIFIERS = {
  [DutyType.PATROL]: {
    suspicion: 1.5,
    alertness: 1.5,
    friendliness: 0.8,
    tradeWillingness: 0,
    rumorSpreading: 0.5,
    trustGainMultiplier: 0.5,  // Gap 2: Reduced trust gain when on patrol
    priceModifier: 1.0
  },
  [DutyType.GUARD_POST]: {
    suspicion: 1.2,
    alertness: 1.0,
    friendliness: 0.9,
    tradeWillingness: 0,
    rumorSpreading: 0.3,
    trustGainMultiplier: 0.7,
    priceModifier: 1.0
  },
  [DutyType.TRADING]: {
    suspicion: 0.8,
    alertness: 1.0,
    friendliness: 1.5,
    tradeWillingness: 2.0,
    rumorSpreading: 1.2,
    trustGainMultiplier: 1.2,
    priceModifier: 0.9  // Gap 2: 10% discount during trading hours
  },
  [DutyType.SETUP_SHOP]: {
    suspicion: 0.9,
    alertness: 1.0,
    friendliness: 1.2,
    tradeWillingness: 0.5,
    rumorSpreading: 0.8,
    trustGainMultiplier: 1.0,
    priceModifier: 1.1,  // Slightly higher prices during setup
    inventoryLimited: true
  },
  [DutyType.REST]: {
    suspicion: 0.7,
    alertness: 0.7,
    friendliness: 1.2,
    tradeWillingness: 0.3,
    rumorSpreading: 1.0,
    trustGainMultiplier: 1.5,  // Gap 2: More receptive during rest
    priceModifier: 1.0
  },
  [DutyType.SOCIALIZE]: {
    suspicion: 0.5,
    alertness: 0.8,
    friendliness: 1.8,
    tradeWillingness: 0.5,
    rumorSpreading: 2.0,
    trustGainMultiplier: 1.8,
    priceModifier: 1.0
  },
  [DutyType.WORSHIP]: {
    suspicion: 0.6,
    alertness: 0.8,
    friendliness: 1.3,
    tradeWillingness: 0,
    rumorSpreading: 0.7,
    trustGainMultiplier: 1.1,
    priceModifier: 1.0
  },
  [DutyType.GATHER_RUMORS]: {
    suspicion: 0.7,
    alertness: 1.5,
    friendliness: 1.3,
    tradeWillingness: 0.3,
    rumorSpreading: 0.3, // Gathering, not spreading
    rumorReceptiveness: 2.0
  },
  [DutyType.SPREAD_RUMORS]: {
    suspicion: 0.6,
    alertness: 1.2,
    friendliness: 1.5,
    tradeWillingness: 0.4,
    rumorSpreading: 2.5
  },
  [DutyType.HOME]: {
    suspicion: 0.5,
    alertness: 0.5,
    friendliness: 0.8,
    tradeWillingness: 0.2,
    rumorSpreading: 0.5
  },
  [DutyType.SLEEP]: {
    suspicion: 0.1,
    alertness: 0.1,
    friendliness: 0.1,
    tradeWillingness: 0,
    rumorSpreading: 0,
    grumpiness: 3.0 // Very grumpy if woken!
  },
  [DutyType.EAT]: {
    suspicion: 0.4,
    alertness: 0.6,
    friendliness: 1.1,
    tradeWillingness: 0.2,
    rumorSpreading: 1.3
  },
  [DutyType.WORK]: {
    suspicion: 0.8,
    alertness: 1.0,
    friendliness: 0.9,
    tradeWillingness: 0.7,
    rumorSpreading: 0.8
  }
};

/**
 * Get behavior modifiers for a duty type
 * @param {string} duty - Duty type from DutyType
 * @returns {Object} Behavior modifiers
 */
export function getDutyBehaviorModifiers(duty) {
  return DUTY_MODIFIERS[duty] || {
    suspicion: 1.0,
    alertness: 1.0,
    friendliness: 1.0,
    tradeWillingness: 1.0,
    rumorSpreading: 1.0,
    trustGainMultiplier: 1.0,
    priceModifier: 1.0
  };
}

/**
 * Apply duty modifiers to action results (Gap 2 implementation)
 * @param {Object} context - Context with currentDuty or hour/npc
 * @param {Object} baseResult - Base action result
 * @returns {Object} Modified result with duty effects applied
 */
export function applyDutyModifiers(context, baseResult) {
  // Determine current duty
  let currentDuty = context.currentDuty;
  
  if (!currentDuty && context.npc && context.hour !== undefined) {
    currentDuty = getCurrentDuty(context.npc, context.hour);
  }
  
  if (!currentDuty) {
    return baseResult;
  }
  
  const modifiers = getDutyBehaviorModifiers(currentDuty);
  const modifiedResult = { ...baseResult };
  
  // Apply trust gain modifier
  if (modifiedResult.trustGain !== undefined && modifiers.trustGainMultiplier !== undefined) {
    modifiedResult.trustGain *= modifiers.trustGainMultiplier;
    modifiedResult.modifiers = modifiedResult.modifiers || [];
    
    if (modifiers.trustGainMultiplier < 1) {
      modifiedResult.modifiers.push('suspicious_duty');
    } else if (modifiers.trustGainMultiplier > 1) {
      modifiedResult.modifiers.push('relaxed_duty');
    }
  }
  
  // Apply price modifier for trade actions
  if (modifiedResult.price !== undefined && modifiers.priceModifier !== undefined) {
    modifiedResult.price *= modifiers.priceModifier;
    modifiedResult.priceModifier = modifiers.priceModifier;
  }
  
  // Apply inventory limitation
  if (modifiers.inventoryLimited && modifiedResult.inventory !== undefined) {
    modifiedResult.inventoryLimited = true;
    modifiedResult.message = modifiedResult.message || '';
    if (!modifiedResult.message.includes('still setting up')) {
      modifiedResult.message = 'I\'m still setting up shop, inventory is limited. ' + modifiedResult.message;
    }
  }
  
  return modifiedResult;
}

/**
 * Get current duty for an NPC
 * @param {Object} npc - NPC object
 * @param {number} hour - Current hour (0-23)
 * @returns {string} Current duty type
 */
export function getCurrentDuty(npc, hour) {
  // If NPC has a custom schedule, use it
  if (npc.schedule && npc.schedule instanceof Schedule) {
    return npc.schedule.getCurrentDuty(hour);
  }
  
  // Otherwise, use role-based default
  if (npc.role) {
    const defaultSchedule = getRoleDefaultSchedule(npc.role);
    return defaultSchedule.getCurrentDuty(hour);
  }
  
  // Fallback to generic work
  return DutyType.WORK;
}

/**
 * Apply duty modifiers to NPC behavior
 * This integrates with the existing social system
 * @param {Object} npc - NPC object
 * @param {number} hour - Current hour
 * @returns {Object} Modified behavior values
 */
export function getDutyModifiedBehavior(npc, hour) {
  const duty = getCurrentDuty(npc, hour);
  const modifiers = getDutyBehaviorModifiers(duty);
  
  // Return modified values that can be used by existing systems
  return {
    duty,
    modifiers,
    // Integration with Phase 3 (contextual relationships)
    suspicionMultiplier: modifiers.suspicion,
    // Integration with Phase 5 (rumor system)
    rumorSpreadChance: modifiers.rumorSpreading,
    rumorReceptiveness: modifiers.rumorReceptiveness || 1.0,
    // Integration with Phase 1-2 (faction/multi-faction)
    friendlinessModifier: modifiers.friendliness,
    // New for Phase 6
    tradeWillingness: modifiers.tradeWillingness,
    alertness: modifiers.alertness,
    grumpiness: modifiers.grumpiness || 1.0
  };
}

/**
 * Get location preference for current duty
 * 
 * FUTURE WORK: This function is prepared for Phase 7 integration
 * where NPCs will move to appropriate locations based on their duties.
 * Currently not actively used but tested and ready for implementation.
 * 
 * @param {string} duty - Duty type
 * @returns {string} Preferred location type
 */
export function getDutyLocation(duty) {
  const DUTY_LOCATIONS = {
    [DutyType.PATROL]: 'street',
    [DutyType.GUARD_POST]: 'guardpost',
    [DutyType.TRADING]: 'shop',
    [DutyType.SETUP_SHOP]: 'shop',
    [DutyType.REST]: 'home',
    [DutyType.SOCIALIZE]: 'tavern',
    [DutyType.WORSHIP]: 'temple',
    [DutyType.GATHER_RUMORS]: 'market',
    [DutyType.SPREAD_RUMORS]: 'street',
    [DutyType.HOME]: 'home',
    [DutyType.SLEEP]: 'home',
    [DutyType.EAT]: 'tavern',
    [DutyType.WORK]: 'workplace'
  };
  
  return DUTY_LOCATIONS[duty] || 'street';
}

/**
 * Check if NPC should be moving to a new location for duty
 * 
 * FUTURE WORK: This function is prepared for Phase 7 integration
 * where NPCs will physically move between locations based on duty changes.
 * Currently not actively used but tested and ready for implementation.
 * 
 * @param {Object} npc - NPC object
 * @param {number} hour - Current hour
 * @param {number} lastHour - Previous hour
 * @returns {boolean} Whether NPC should move to a new location
 */
export function shouldChangeLocation(npc, hour, lastHour) {
  const currentDuty = getCurrentDuty(npc, hour);
  const lastDuty = getCurrentDuty(npc, lastHour);
  
  if (currentDuty !== lastDuty) {
    const currentLocation = getDutyLocation(currentDuty);
    const lastLocation = getDutyLocation(lastDuty);
    return currentLocation !== lastLocation;
  }
  
  return false;
}

// Export for use in existing systems
export default {
  TimeOfDay,
  DutyType,
  Schedule,
  getTimeOfDayFromHour,
  getRoleDefaultSchedule,
  getCurrentDuty,
  getDutyBehaviorModifiers,
  applyDutyModifiers,
  getDutyLocation,
  shouldChangeLocation,
  clearScheduleCache
};