// src/engine/sim.js
import { getRulesForPhase } from './rules.js';

export const PHASE_ORDER = ['preturn','movement','apply','predamage','damage','postdamage','tick','cleanup'];

/**
 * ctx: {
 *   entity: { statuses[], materials[] }, env:{...}, event:{...},
 *   queue:[], rand:fn, attacker?:{...}
 * }
 */
export function runPhase(phase, ctx, options = {}) {
  const { debug = false, stopOnError = false } = options;
  ctx.queue = ctx.queue || [];
  const rules = getRulesForPhase(phase);

  let matchedCount = 0;
  for (const r of rules) {
    try {
      const matches = r.when(ctx);
      if (matches) {
        matchedCount++;
        const before = ctx.queue.length;
        r.then(ctx);
        const added = ctx.queue.length - before;
        const newActs = ctx.queue.slice(before);
        if (newActs.some(a => a.type === 'stopPhase')) {
          break;
        }
      }
    } catch (err) {
      if (stopOnError) throw err;
    }
  }
  
  return ctx.queue;
}

export function runPhases(phases, ctx, options = {}) {
  for (const p of phases) {
    runPhase(p, ctx, options);
    const stopAll = ctx.queue?.some(a => a.type === 'stopAllPhases');
    if (stopAll) break;
  }
  return ctx.queue;
}