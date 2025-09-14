/**
 * Migration Adapter - Facilitates gradual migration from OLD to NEW social system
 * 
 * This adapter provides drop-in replacements for OLD system functions while
 * using the NEW NPC class underneath. This allows for file-by-file migration
 * without breaking the entire codebase.
 */

import { NPC, spawnSocialNPC as spawnNPC, initializeNPC } from './npcEnhanced.js';

// Re-export spawnSocialNPC for backward compatibility
export const spawnSocialNPC = spawnNPC;

/**
 * Main migration adapter class
 */
export class MigrationAdapter {
  constructor() {
    this.migratedFiles = new Set();
    this.conversionCache = new WeakMap(); // Cache converted NPCs
  }
  
  /**
   * Migrate all NPCs in state to NEW system
   */
  migrateState(state) {
    if (!state.npcs || !Array.isArray(state.npcs)) {
      return;
    }
    
    state.npcs = state.npcs.map(npc => {
      // Skip invalid entries
      if (!npc || typeof npc !== 'object') {
        return null;
      }
      
      // Check cache first
      if (this.conversionCache.has(npc)) {
        return this.conversionCache.get(npc);
      }
      
      // Convert if needed
      if (NPC.isOldFormat(npc)) {
        const converted = NPC.fromOldFormat(npc);
        this.conversionCache.set(npc, converted);
        return converted;
      }
      
      return npc;
    }).filter(Boolean); // Remove null entries
  }
  
  /**
   * Migrate a single file's imports
   */
  migrateFile(filepath, content) {
    // Replace OLD imports with migration adapter
    let migrated = content;
    
    // Replace various import patterns
    const replacements = [
      [/from ['"]\.\.\/social\/init\.js['"]/g, 'from \'../social/migrationAdapter.js\''],
      [/from ['"]\.\.\/js\/social\/init\.js['"]/g, 'from \'../social/migrationAdapter.js\''],
      [/from ['"]\.\.\/\.\.\/src\/js\/social\/init\.js['"]/g, 'from \'../../src/social/migrationAdapter.js\''],
      [/from ['"]\.\/social\/init\.js['"]/g, 'from \'./social/migrationAdapter.js\'']
    ];
    
    for (const [pattern, replacement] of replacements) {
      migrated = migrated.replace(pattern, replacement);
    }
    
    // Add migration comment
    if (migrated !== content) {
      migrated = '// Migrated from OLD social system\n' + migrated;
      this.markMigrated(filepath);
    }
    
    return migrated;
  }
  
  /**
   * Mark a file as migrated
   */
  markMigrated(filepath) {
    this.migratedFiles.add(filepath);
  }
  
  /**
   * Get migration progress
   */
  getMigrationProgress() {
    return {
      migrated: Array.from(this.migratedFiles),
      count: this.migratedFiles.size
    };
  }
  
  /**
   * Get import path replacements
   */
  getImportReplacements() {
    return {
      '../social/init.js': '../social/migrationAdapter.js',
      '../js/social/init.js': '../social/migrationAdapter.js',
      '../../src/js/social/init.js': '../../src/social/migrationAdapter.js',
      './social/init.js': './social/migrationAdapter.js'
    };
  }
}

/**
 * Drop-in replacement for OLD spawnSocialNPC
 * Returns a function for compatibility with existing code
 */
export function migrateSpawnSocialNPC() {
  return spawnSocialNPC;
}

/**
 * Drop-in replacement for OLD initializeNPC
 * Returns a function for compatibility with existing code
 */
export function migrateInitializeNPC() {
  return initializeNPC;
}

/**
 * Migrate dialogue system (no changes needed for V2)
 */
export function migrateDialogueSystem() {
  // DialogueTreesV2 already works with enhanced NPCs
  // This is here for completeness and future enhancements
  return {
    compatible: true,
    message: 'DialogueTreesV2 is compatible with enhanced NPCs'
  };
}

/**
 * Migrate movement system
 */
export function migrateMovementSystem() {
  // MovementAdapter already handles conversion
  // This provides a helper for explicit migration
  return {
    convertNPC: (npc) => {
      if (NPC.isOldFormat(npc)) {
        return NPC.fromOldFormat(npc);
      }
      return npc;
    }
  };
}

/**
 * Export OLD system function names for drop-in replacement
 * These are the functions that existing code imports
 */
export { 
  spawnSocialNPC,
  initializeNPC 
} from './npcEnhanced.js';

// Re-export the enhanced NPC class
export { NPC } from './npcEnhanced.js';

/**
 * Get available interactions between player and NPC
 * Reimplemented without OLD system dependency
 */
export function getAvailableInteractions(player, npc) {
  const options = [];
  
  // Ensure player has factions for hostility evaluation
  if (!player.factions && !player.faction) {
    player.factions = ['player'];
  }
  
  // Convert OLD format NPC if needed
  if (NPC.isOldFormat(npc)) {
    npc = NPC.fromOldFormat(npc);
  }
  
  // Basic talk option (always available)
  options.push({
    type: 'talk',
    label: 'Talk',
    description: `Talk to ${npc.name || 'NPC'}`
  });
  
  // Trade option for merchants
  if (npc.shopkeeper || npc.faction === 'merchants') {
    options.push({
      type: 'trade',
      label: 'Trade',
      description: `Trade with ${npc.name || 'Merchant'}`
    });
  }
  
  // Quest option for quest givers
  if (npc.questGiver && npc.quests?.length > 0) {
    options.push({
      type: 'quest',
      label: 'Quest',
      description: 'Ask about quests'
    });
  }
  
  // Gift option if player has items
  if (player.inventory?.length > 0) {
    options.push({
      type: 'gift',
      label: 'Give Gift',
      description: 'Offer a gift'
    });
  }
  
  // Fight option for hostile NPCs
  const hostilityResult = npc.evaluateHostilityTo ? 
    npc.evaluateHostilityTo(player) : 
    { hostile: npc.attitude === 'hostile' };
    
  if (hostilityResult.hostile || npc.attitude === 'hostile') {
    options.push({
      type: 'fight',
      label: 'Fight',
      description: 'Attack the NPC'
    });
  }
  
  // Pickpocket option (if player has thief skills)
  if (player.skills?.includes('pickpocket') || player.class === 'thief') {
    options.push({
      type: 'pickpocket',
      label: 'Pickpocket',
      description: 'Attempt to steal'
    });
  }
  
  return options;
}

/**
 * Execute player-NPC interaction
 * Reimplemented without OLD system dependency
 */
export function runPlayerNPCInteraction(state, player, npc, actionType, params) {
  // Default params to empty object for backward compatibility
  if (params === undefined) {
    params = {};
  }
  // Convert OLD format NPC if needed
  if (NPC.isOldFormat(npc)) {
    npc = NPC.fromOldFormat(npc);
  }
  
  // Record interaction in NPC memory
  if (npc.memory) {
    npc.memory.remember({
      type: 'interaction',
      action: actionType,
      with: player.id || 'player',
      timestamp: Date.now()
    });
  }
  
  switch (actionType) {
    case 'talk':
      // Update relationship
      if (npc.memory) {
        npc.memory.updateRelationship(player.id || 'player', 1);
      }
      
      return {
        success: true,
        message: `You talk with ${npc.name || 'the NPC'}.`,
        dialogue: npc.dialogue || true
      };
    
    case 'trade':
      if (!npc.shopkeeper && npc.faction !== 'merchants') {
        return {
          success: false,
          reason: 'not_merchant',
          message: `${npc.name || 'This NPC'} is not a merchant.`
        };
      }
      
      return {
        success: true,
        message: `Opening trade with ${npc.name || 'the merchant'}.`,
        goods: npc.goods || [],
        shopOpen: true
      };
    
    case 'quest':
      if (!npc.questGiver) {
        return {
          success: false,
          reason: 'not_quest_giver',
          message: `${npc.name || 'This NPC'} has no quests to offer.`
        };
      }
      
      return {
        success: true,
        message: 'Quest dialogue initiated.',
        quests: npc.quests || []
      };
    
    case 'gift':
      const giftItem = params.item;
      if (!giftItem) {
        return {
          success: false,
          reason: 'no_item',
          message: 'No item selected to gift.'
        };
      }
      
      // Remember the gift
      if (npc.memory) {
        npc.memory.remember({
          type: 'gift_from',
          giver: player.id || 'player',
          item: giftItem,
          value: giftItem.value || 5
        });
      }
      
      return {
        success: true,
        message: `You give ${giftItem.name || 'an item'} to ${npc.name || 'the NPC'}.`,
        relationshipChange: 5
      };
    
    case 'fight':
      return {
        success: true,
        message: `You attack ${npc.name || 'the NPC'}!`,
        combatInitiated: true
      };
    
    case 'pickpocket':
      const successChance = 0.3 + (player.skills?.pickpocket || 0) * 0.1;
      const success = Math.random() < successChance;
      
      if (success && npc.inventory?.length > 0) {
        const stolenItem = npc.inventory[0];
        return {
          success: true,
          message: `You successfully steal ${stolenItem.name || 'an item'}!`,
          item: stolenItem
        };
      } else {
        // Remember the theft attempt
        if (npc.memory) {
          npc.memory.remember({
            type: 'stolen_from',
            thief: player.id || 'player',
            success: false
          });
        }
        
        return {
          success: false,
          reason: 'caught',
          message: `${npc.name || 'The NPC'} catches you trying to steal!`,
          hostilityIncrease: true
        };
      }
    
    default:
      return {
        success: false,
        reason: 'invalid_action',
        message: `Unknown action type: ${actionType}`
      };
  }
}

/**
 * Handle NPC interaction (wrapper for runPlayerNPCInteraction)
 */
export function handleNPCInteraction(state, player, npc, actionType, params) {
  return runPlayerNPCInteraction(state, player, npc, actionType, params);
}

/**
 * Initialize social system for existing NPCs
 * Reimplemented without OLD system dependency
 */
export function initializeSocialSystem(state) {
  // Ensure npcs array exists
  if (!state.npcs) {
    state.npcs = [];
  }
  
  // Convert any OLD format NPCs in the array
  state.npcs = state.npcs.map(npc => {
    if (NPC.isOldFormat(npc)) {
      return NPC.fromOldFormat(npc);
    }
    return npc;
  });
  
  // Initialize existing monsters as NPCs if needed
  if (state.chunk?.monsters) {
    for (let i = 0; i < state.chunk.monsters.length; i++) {
      const monster = state.chunk.monsters[i];
      
      // Skip if already initialized (has NPC methods)
      if (monster instanceof NPC || typeof monster.hasTrait === 'function') {
        continue;
      }
      
      // Convert monster to social NPC
      const npcConfig = {
        id: monster.id || `monster_${i}`,
        name: monster.name || 'Monster',
        x: monster.x,
        y: monster.y,
        hp: monster.hp,
        hpMax: monster.hpMax || monster.hp,
        faction: guessFactionFromMonster(monster),
        traits: generateMonsterTraits(),
        dialogue: false,
        attitude: 'hostile'
      };
      
      // Replace monster with NPC instance
      state.chunk.monsters[i] = new NPC(npcConfig);
    }
  }
  
  return state;
}

/**
 * Helper function to guess faction from monster type
 */
function guessFactionFromMonster(monster) {
  const name = (monster.name || '').toLowerCase();
  
  if (name.includes('bandit') || name.includes('thief')) {
    return 'bandits';
  }
  if (name.includes('guard') || name.includes('soldier')) {
    return 'guards';
  }
  if (name.includes('goblin') || name.includes('orc')) {
    return 'monsters';
  }
  if (name.includes('wolf') || name.includes('bear')) {
    return 'forest_animals';
  }
  
  return 'hostile';
}

/**
 * Generate random traits for a monster
 */
function generateMonsterTraits() {
  const monsterTraits = [
    'aggressive', 'territorial', 'hungry', 'cunning', 
    'brutal', 'savage', 'predatory', 'vicious'
  ];
  
  const count = 1 + Math.floor(Math.random() * 2);
  const traits = [];
  
  for (let i = 0; i < count && monsterTraits.length > 0; i++) {
    const index = Math.floor(Math.random() * monsterTraits.length);
    traits.push(monsterTraits.splice(index, 1)[0]);
  }
  
  return traits;
}

// Create singleton instance for global use
const globalAdapter = new MigrationAdapter();

/**
 * Batch convert all NPCs in a state object
 */
export function convertAllNPCs(state) {
  if (!state.npcs) return;
  
  // Filter out invalid entries first
  state.npcs = state.npcs.filter(npc => npc && typeof npc === 'object');
  
  globalAdapter.migrateState(state);
}

/**
 * Check if an object needs conversion
 */
export function needsConversion(obj) {
  return NPC.isOldFormat(obj);
}

/**
 * Convert a single NPC
 */
export function convertNPC(npc) {
  // Handle invalid input
  if (!npc || typeof npc !== 'object') {
    return null;
  }
  
  if (needsConversion(npc)) {
    return NPC.fromOldFormat(npc);
  }
  return npc;
}

/**
 * Migration helper for game initialization
 * Call this in game.js to migrate on startup
 */
export function initializeMigration(state) {
  console.log('🔄 [MIGRATION] Initializing social system migration...');
  
  // Convert existing NPCs
  if (state.npcs) {
    const oldCount = state.npcs.filter(n => NPC.isOldFormat(n)).length;
    if (oldCount > 0) {
      console.log(`🔄 [MIGRATION] Converting ${oldCount} OLD format NPCs...`);
      convertAllNPCs(state);
      console.log('✅ [MIGRATION] NPCs converted to NEW format');
    }
  }
  
  // Set up conversion hook for new NPCs
  if (state.npcs && Array.isArray(state.npcs)) {
    const originalPush = state.npcs.push.bind(state.npcs);
    state.npcs.push = function(...npcs) {
      // Convert any OLD format NPCs before adding
      const converted = npcs
        .map(npc => convertNPC(npc))
        .filter(Boolean); // Remove null entries
      return originalPush(...converted);
    };
  }
  
  console.log('✅ [MIGRATION] Social system migration initialized');
  
  return globalAdapter;
}

// Export the global adapter instance
export default globalAdapter;