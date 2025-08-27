// src/engine/testRules.instantKillWetElectric.js
import { rule, P } from './rules.js';

// TEST ONLY: conductive (e.g., Wet) + incoming electric damage => lethal
rule({
  id: 'TEST_wet_electric_instant_kill',
  phase: 'predamage',
  priority: 999, // ensure it runs before other predamage logic
  when: (ctx) => {
    const hasConductive = P.hasAnyTag('conductive')(ctx);
    const isElectric = P.dmgTypeIs('electric')(ctx);
    return hasConductive && isElectric;
  },
  then: (ctx) => {
    // Make damage exceed current HP - instant kill
    ctx.event.damage.amount = 99999;
  }
});