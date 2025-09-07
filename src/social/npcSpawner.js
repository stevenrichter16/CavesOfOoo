/**
 * NPC Spawner - Generates NPCs with appropriate factions for locations
 */

import { NPC } from './npc.js';

/**
 * Location-based faction spawn configurations
 */
const LOCATION_CONFIGS = {
  // Candy Kingdom locations
  'candy_castle': {
    roles: [
      { role: 'guard', weight: 0.4, factions: ['banana_guard'] },
      { role: 'noble', weight: 0.3, factions: ['candy_nobles'] },
      { role: 'citizen', weight: 0.2, factions: ['candy_citizens'] },
      { role: 'servant', weight: 0.1, factions: ['candy_citizens'] }
    ]
  },
  'candy_market': {
    roles: [
      { role: 'merchant', weight: 0.4, factions: ['candy_merchants'] },
      { role: 'citizen', weight: 0.3, factions: ['candy_citizens'] },
      { role: 'guard', weight: 0.1, factions: ['banana_guard'] },
      { role: 'visitor', weight: 0.2, factions: ['slime_traders', 'ice_merchants'] }
    ]
  },
  'candy_dungeon': {
    roles: [
      { role: 'guard', weight: 0.6, factions: ['banana_guard'] },
      { role: 'prisoner', weight: 0.4, factions: ['bandits', 'criminals'] }
    ]
  },
  
  // Fire Kingdom locations
  'fire_temple': {
    roles: [
      { role: 'priest', weight: 0.6, factions: ['flame_priests'] },
      { role: 'guard', weight: 0.2, factions: ['fire_guards'] },
      { role: 'worshipper', weight: 0.2, factions: ['fire_citizens'] }
    ]
  },
  'fire_court': {
    roles: [
      { role: 'noble', weight: 0.5, factions: ['fire_court'] },
      { role: 'guard', weight: 0.3, factions: ['fire_guards'] },
      { role: 'citizen', weight: 0.2, factions: ['fire_citizens'] }
    ]
  },
  
  // Ice Kingdom locations
  'ice_palace': {
    roles: [
      { role: 'wizard', weight: 0.3, factions: ['ice_wizards'] },
      { role: 'guard', weight: 0.3, factions: ['ice_guards', 'penguin_guards'] },
      { role: 'noble', weight: 0.2, factions: ['ice_court'] },
      { role: 'citizen', weight: 0.2, factions: ['ice_citizens'] }
    ]
  },
  
  // Slime Kingdom locations
  'slime_underground': {
    roles: [
      { role: 'trader', weight: 0.4, factions: ['slime_traders'] },
      { role: 'guard', weight: 0.2, factions: ['slime_guards'] },
      { role: 'citizen', weight: 0.3, factions: ['slime_citizens'] },
      { role: 'elemental', weight: 0.1, factions: ['slime_elementals'] }
    ]
  },
  
  // Generic locations
  'wilderness': {
    roles: [
      { role: 'bandit', weight: 0.3, factions: ['bandits'] },
      { role: 'traveler', weight: 0.3, factions: ['candy_citizens', 'fire_citizens', 'ice_citizens', 'slime_citizens'] },
      { role: 'merchant', weight: 0.2, factions: ['candy_merchants', 'slime_traders'] },
      { role: 'hermit', weight: 0.2, factions: [] }
    ]
  }
};

/**
 * NPC Templates for special spawns
 */
const NPC_TEMPLATES = {
  'double_agent': {
    role: 'spy',
    factionCount: 2,
    suspiciousCombo: true
  },
  'merchant_guard': {
    role: 'guard',
    additionalFactions: ['merchants'],
    factionWeights: { guard: 0.6, merchant: 0.4 }
  },
  'corrupt_noble': {
    role: 'noble',
    additionalFactions: ['bandits'],
    factionWeights: { noble: 0.7, bandits: 0.3 }
  }
};

/**
 * NPC Spawner class
 */
export class NPCSpawner {
  constructor() {
    this.npcCounter = 0;
  }
  
  /**
   * Spawn a single NPC
   */
  spawnNPC(config) {
    // Handle template-based spawning
    if (config.template) {
      return this.spawnFromTemplate(config);
    }
    
    // Handle location-based spawning
    if (config.location) {
      return this.spawnForLocation(config);
    }
    
    // Handle custom spawning
    return this.spawnCustom(config);
  }
  
  /**
   * Spawn multiple NPCs
   */
  spawnMultiple(config) {
    const npcs = [];
    const count = config.count || 1;
    
    // For markets and diverse locations, ensure variety
    if (config.location && LOCATION_CONFIGS[config.location]) {
      const locationConfig = LOCATION_CONFIGS[config.location];
      const roles = locationConfig.roles;
      
      // Ensure we spawn at least one of each common role type if count allows
      const mandatoryRoles = roles.filter(r => r.weight >= 0.3);
      let rolesSpawned = 0;
      
      // Spawn mandatory roles first
      for (const role of mandatoryRoles) {
        if (rolesSpawned < count) {
          npcs.push(this.spawnNPC({
            ...config,
            role: role.role
          }));
          rolesSpawned++;
        }
      }
      
      // Fill remaining with random weighted selection
      for (let i = rolesSpawned; i < count; i++) {
        npcs.push(this.spawnNPC(config));
      }
    } else {
      // Default behavior for non-location spawning
      for (let i = 0; i < count; i++) {
        npcs.push(this.spawnNPC(config));
      }
    }
    
    return npcs;
  }
  
  /**
   * Spawn NPC from template
   */
  spawnFromTemplate(config) {
    const template = NPC_TEMPLATES[config.template];
    if (!template) {
      throw new Error(`Unknown template: ${config.template}`);
    }
    
    const npcConfig = {
      id: `npc_${++this.npcCounter}`,
      name: this.generateName(template.role),
      ...config
    };
    
    // Override with template values if not specified
    if (!config.factions && template.factions) {
      npcConfig.factions = template.factions;
    }
    if (!config.factionWeights && template.factionWeights) {
      npcConfig.factionWeights = template.factionWeights;
    }
    
    return new NPC(npcConfig);
  }
  
  /**
   * Spawn NPC for specific location
   */
  spawnForLocation(config) {
    const locationConfig = LOCATION_CONFIGS[config.location];
    if (!locationConfig) {
      // Default to generic citizen
      return this.spawnGenericCitizen(config);
    }
    
    // If a specific role is requested, find it in the location config
    let role;
    if (config.role) {
      role = locationConfig.roles.find(r => r.role === config.role);
      if (!role) {
        // Role not found in location, choose random
        role = this.chooseWeightedRole(locationConfig.roles);
      }
    } else {
      // Choose role based on weights
      role = this.chooseWeightedRole(locationConfig.roles);
    }
    
    const npcConfig = {
      id: `npc_${++this.npcCounter}`,
      name: this.generateName(role.role),
      role: role.role,
      factions: role.factions,
      kingdomId: config.kingdomId,
      ...config
    };
    
    // Handle special location rules
    if (config.location === 'candy_market' && role.role === 'visitor') {
      // Visitors from other kingdoms
      npcConfig.factions = [this.chooseRandom(role.factions)];
      npcConfig.kingdomId = this.getKingdomFromFaction(npcConfig.factions[0]);
    }
    
    return new NPC(npcConfig);
  }
  
  /**
   * Spawn custom NPC
   */
  spawnCustom(config) {
    const npcConfig = {
      id: config.id || `npc_${++this.npcCounter}`,
      name: config.name || this.generateName(config.role),
      ...config
    };
    
    return new NPC(npcConfig);
  }
  
  /**
   * Spawn generic citizen
   */
  spawnGenericCitizen(config) {
    const npcConfig = {
      id: `npc_${++this.npcCounter}`,
      name: this.generateName('citizen'),
      role: 'citizen',
      inheritFaction: true,
      kingdomId: config.kingdomId || 'candy'
    };
    
    return new NPC(npcConfig);
  }
  
  /**
   * Choose role based on weights
   */
  chooseWeightedRole(roles) {
    const totalWeight = roles.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const role of roles) {
      random -= role.weight;
      if (random <= 0) {
        return role;
      }
    }
    
    return roles[roles.length - 1];
  }
  
  /**
   * Choose random element from array
   */
  chooseRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Get kingdom from faction name
   */
  getKingdomFromFaction(faction) {
    if (faction.startsWith('candy') || faction === 'banana_guard') return 'candy';
    if (faction.startsWith('fire') || faction === 'flame_priests') return 'fire';
    if (faction.startsWith('ice') || faction === 'penguin_guards') return 'ice';
    if (faction.startsWith('slime')) return 'slime';
    return 'candy'; // Default
  }
  
  /**
   * Generate name based on role
   */
  generateName(role) {
    const names = {
      guard: ['Captain Banana', 'Sergeant Peel', 'Guard Johnson', 'Watchman Yellow'],
      citizen: ['Candy Person', 'Sweet Citizen', 'Lollipop Joe', 'Gummy Mary'],
      merchant: ['Trader Tim', 'Merchant Mike', 'Vendor Vicky', 'Shopkeep Sam'],
      noble: ['Lord Lemondrop', 'Lady Licorice', 'Duke Donut', 'Countess Candy'],
      priest: ['Flame Keeper', 'Fire Sage', 'Ember Priest', 'Blaze Minister'],
      wizard: ['Ice Mage', 'Frost Wizard', 'Crystal Seer', 'Snow Sage'],
      bandit: ['Sneaky Pete', 'Robber Rob', 'Thief Theo', 'Bandit Bill'],
      trader: ['Slime Seller', 'Goo Merchant', 'Ooze Trader', 'Blob Vendor']
    };
    
    const roleNames = names[role] || names.citizen;
    return this.chooseRandom(roleNames) + ` ${this.npcCounter}`;
  }
}