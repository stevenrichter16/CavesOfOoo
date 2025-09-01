// src/engine/sim.js
import { getRulesForPhase } from './rules.js';

export const PHASE_ORDER = ['preturn','apply','predamage','damage','postdamage','tick','cleanup'];

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

  console.log(`\n[ENGINE-PHASE] ═══ ${phase.toUpperCase()} PHASE ═══`);
  console.log(`[ENGINE-PHASE] Evaluating ${rules.length} rule(s)...`);

  let matchedCount = 0;
  for (const r of rules) {
    try {
      const matches = r.when(ctx);
      if (matches) {
        matchedCount++;
        console.log(`[ENGINE-PHASE] ✓ Rule #${matchedCount}: '${r.id}' MATCHED`);
        const before = ctx.queue.length;
        r.then(ctx);
        const added = ctx.queue.length - before;
        if (added > 0) {
          const actions = ctx.queue.slice(before);
          console.log(`[ENGINE-PHASE]   → Actions queued: ${actions.map(a => a.type).join(', ')}`);
        } else {
          console.log(`[ENGINE-PHASE]   → Direct modification (no actions queued)`);
        }
        const newActs = ctx.queue.slice(before);
        if (newActs.some(a => a.type === 'stopPhase')) {
          console.log(`[ENGINE-PHASE] ⚠ Phase interrupted by '${r.id}'`);
          break;
        }
      }
    } catch (err) {
      console.error(`[ENGINE-PHASE] ❌ Error in rule '${r.id}':`, err.message);
      if (stopOnError) throw err;
    }
  }
  
  if (matchedCount === 0) {
    console.log(`[ENGINE-PHASE] No rules matched for this phase`);
  }
  console.log(`[ENGINE-PHASE] Phase complete with ${ctx.queue.length} total actions`);
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