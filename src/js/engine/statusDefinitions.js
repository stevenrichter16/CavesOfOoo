// src/engine/statusDefinitions.js
import { registerStatus } from './materials.js';

export function registerAllStatuses() {
  // Environmental / movement
  registerStatus({
    id: 'wet',
    tags: ['coated','conductive','extinguisher'],
    props: { 
      quantity: 20, 
      extinguishingPower: 20,  // Added from materials.js
      conductivityAmp: 1.5,
      turns: 10 
    }
  });
  registerStatus({
    id: 'water_slow',
    tags: ['wet','movement_impair'],
    props: { speedReduction: 2 }
  });

  // Damage over time (DOT)
  registerStatus({
    id: 'burn',
    tags: ['fire','dot','hot'],
    props: { intensity: 1, damagePerTurn: 3 }
  });
  registerStatus({
    id: 'poison',
    tags: ['toxic','dot'],
    props: { intensity: 1, damagePerTurn: 2 }
  });
  registerStatus({
    id: 'shock',
    tags: ['electric','dot','paralyze'],
    props: { intensity: 1, damagePerTurn: 4 }
  });
  registerStatus({
    id: 'bleed',
    tags: ['physical','dot'],
    props: { intensity: 1, damagePerTurn: 2 }
  });

  // Control
  registerStatus({
    id: 'freeze',
    tags: ['ice','control','immobilize'],
    props: { preventMovement: true, preventAction: true }
  });

  // Buffs / Debuffs
  registerStatus({
    id: 'weaken',
    tags: ['debuff','strength'],
    props: { statModifier: -3, affectedStat: 'str' }
  });
  registerStatus({
    id: 'armor',
    tags: ['buff','defense'],
    props: { statModifier: +3, affectedStat: 'def' }
  });
}

// Auto-register all statuses when this module is imported
registerAllStatuses();