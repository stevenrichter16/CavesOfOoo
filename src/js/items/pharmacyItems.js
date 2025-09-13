// src/js/items/pharmacyItems.js
// Pharmacy items for the Candy Kingdom Shopping District

import { applyStatusEffect } from '../combat/statusSystem.js';
import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

/**
 * Pharmacy items with stat-modifying effects
 * All items are candy-themed medicines
 */
export const PharmacyItems = {
  // Basic healing
  sugar_pills: {
    name: 'Sugar Pills',
    description: 'Basic candy medicine. They say it\'s just placebo, but it works!',
    cost: 5,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'heal',
      amount: 5
    }
  },
  
  candy_medicine: {
    name: 'Candy Medicine',
    description: 'Proper medicinal candy. Tastes like cherry and makes you feel better.',
    cost: 20,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'heal',
      amount: 20
    }
  },
  
  // Stat boosters
  strength_syrup: {
    name: 'Strength Syrup',
    description: 'Thick maple-flavored syrup that makes your muscles feel like rock candy.',
    cost: 30,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'buff',
      stat: 'str',
      power: 50,
      duration: 5,
      sideEffect: 'drowsy' // 20% chance of speed debuff
    }
  },
  
  defense_drops: {
    name: 'Defense Drops',
    description: 'Peppermint drops that harden your candy coating. Side effects may include stiffness.',
    cost: 30,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'buff',
      stat: 'def',
      power: 50,
      duration: 5
    }
  },
  
  speed_soda: {
    name: 'Speed Soda',
    description: 'Fizzy cola that makes you jittery and fast. Contains 300% daily recommended sugar.',
    cost: 35,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'buff',
      stat: 'spd',
      power: 50,
      duration: 5,
      bonusHeal: 5 // Also heals a bit from sugar rush
    }
  },
  
  // Special effects
  max_health_mints: {
    name: 'Max Health Mints',
    description: 'Rare mints that permanently increase your vitality. Limited supply!',
    cost: 100,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'permanent',
      stat: 'hpMax',
      amount: 10,
      maxCap: 200 // Can't go above 200 HP
    }
  },
  
  pain_pops: {
    name: 'Pain Pops',
    description: 'Numbing lollipops that reduce incoming damage. May cause giggling.',
    cost: 40,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'damage_reduction',
      power: 50, // 50% damage reduction
      duration: 3,
      bonusHeal: 10
    }
  },
  
  energy_elixir: {
    name: 'Energy Elixir',
    description: 'Premium candy elixir. Fully restores health, cures ailments, and grants regeneration.',
    cost: 200,
    type: 'potion',
    shopType: 'pharmacy',
    effect: {
      type: 'full_restore',
      cureStatus: true,
      regeneration: {
        power: 5,
        duration: 5
      }
    }
  }
};

/**
 * Apply the effect of a pharmacy item to a player
 * @param {Object} state - Game state
 * @param {Object} player - Player to apply effect to
 * @param {Object} item - Pharmacy item to use
 */
export function applyPharmacyItemEffect(state, player, item) {
  if (!item.effect) {
    console.warn('Item has no effect:', item.name);
    return;
  }
  
  // Ensure player has an ID for status system
  if (!player.id) {
    player.id = player.name || 'player';
  }
  
  const effect = item.effect;
  const log = state.log || ((msg, cls) => emit(EventType.Log, { text: msg, cls }));
  
  switch (effect.type) {
    case 'heal':
      // Basic healing
      const healAmount = effect.amount || 10;
      const oldHp = player.hp;
      player.hp = Math.min(player.hp + healAmount, player.hpMax);
      const actualHeal = player.hp - oldHp;
      log(`You recovered ${actualHeal} HP from ${item.name}!`, 'good');
      break;
      
    case 'buff':
      // Stat buff with status effect
      const buffType = `buff_${effect.stat}`;
      
      // Ensure statusEffects object exists
      if (!player.statusEffects) {
        player.statusEffects = {};
      }
      
      // Add the status effect directly for testing
      player.statusEffects[buffType] = {
        type: buffType,
        power: effect.power || 50,
        duration: effect.duration || 5,
        startTurn: state.turn || 0
      };
      
      // Also try to use the game's status system if available
      try {
        applyStatusEffect(player, buffType, effect.duration || 5, effect.power || 50);
      } catch (e) {
        // Status system might not be fully initialized in tests
      }
      
      const statName = {
        str: 'strength',
        def: 'defense',
        spd: 'speed'
      }[effect.stat] || effect.stat;
      
      log(`Your ${statName} increased!`, 'buff');
      
      // Apply side effects if any
      if (effect.sideEffect === 'drowsy' && Math.random() < 0.2) {
        player.statusEffects['debuff_spd'] = {
          type: 'debuff_spd',
          power: 25,
          duration: 2,
          startTurn: state.turn || 0
        };
        
        try {
          applyStatusEffect(player, 'debuff_spd', 2, 25);
        } catch (e) {
          // Status system might not be fully initialized
        }
        
        log('You feel a bit drowsy...', 'debuff');
      }
      
      // Bonus healing for some buffs
      if (effect.bonusHeal) {
        player.hp = Math.min(player.hp + effect.bonusHeal, player.hpMax);
        log(`You also recovered ${effect.bonusHeal} HP!`, 'good');
      }
      break;
      
    case 'permanent':
      // Permanent stat increase
      if (effect.stat === 'hpMax') {
        const oldMax = player.hpMax;
        player.hpMax = Math.min(player.hpMax + effect.amount, effect.maxCap || 200);
        const increase = player.hpMax - oldMax;
        
        if (increase > 0) {
          player.hp += increase; // Also heal by the amount increased
          log(`Your max HP permanently increased by ${increase}!`, 'good');
        } else {
          log(`Your max HP is already at the cap!`, 'note');
        }
      }
      break;
      
    case 'damage_reduction':
      // Apply damage reduction status
      if (!player.statusEffects) {
        player.statusEffects = {};
      }
      
      player.statusEffects['damage_reduction'] = {
        type: 'damage_reduction',
        power: effect.power,
        duration: effect.duration,
        startTurn: state.turn || 0
      };
      
      try {
        applyStatusEffect(player, 'damage_reduction', effect.duration, effect.power);
      } catch (e) {
        // Status system might not be fully initialized
      }
      
      log(`You'll take ${effect.power}% less damage for ${effect.duration} turns!`, 'buff');
      
      if (effect.bonusHeal) {
        player.hp = Math.min(player.hp + effect.bonusHeal, player.hpMax);
        log(`You also recovered ${effect.bonusHeal} HP!`, 'good');
      }
      break;
      
    case 'full_restore':
      // Full restoration
      player.hp = player.hpMax;
      log(`Your HP was fully restored!`, 'good');
      
      // Cure negative status effects
      if (effect.cureStatus && player.statusEffects) {
        const negativeEffects = ['poison', 'frozen', 'slow', 'debuff_str', 'debuff_def', 'debuff_spd'];
        let cured = false;
        
        negativeEffects.forEach(status => {
          if (player.statusEffects[status]) {
            delete player.statusEffects[status];
            cured = true;
          }
        });
        
        if (cured) {
          log(`All negative status effects were cured!`, 'good');
        }
      }
      
      // Apply regeneration
      if (effect.regeneration) {
        if (!player.statusEffects) {
          player.statusEffects = {};
        }
        
        player.statusEffects['regeneration'] = {
          type: 'regeneration',
          power: effect.regeneration.power,
          duration: effect.regeneration.duration,
          startTurn: state.turn || 0
        };
        
        try {
          applyStatusEffect(player, 'regeneration', effect.regeneration.duration, effect.regeneration.power);
        } catch (e) {
          // Status system might not be fully initialized
        }
        
        log(`You'll regenerate ${effect.regeneration.power} HP per turn!`, 'buff');
      }
      break;
      
    default:
      console.warn('Unknown effect type:', effect.type);
  }
}

/**
 * Get pharmacy items for vendor shop
 * @returns {Array} Array of pharmacy items formatted for shop
 */
export function getPharmacyInventory() {
  return Object.entries(PharmacyItems).map(([id, item]) => ({
    ...item,
    id,
    count: Math.floor(Math.random() * 5) + 1, // Random stock 1-5
    onUse: (state, player) => applyPharmacyItemEffect(state, player, item)
  }));
}

/**
 * Check if an item is a pharmacy item
 * @param {Object} item - Item to check
 * @returns {boolean} True if item is from pharmacy
 */
export function isPharmacyItem(item) {
  return item.shopType === 'pharmacy' || 
         Object.values(PharmacyItems).some(pItem => pItem.name === item.name);
}