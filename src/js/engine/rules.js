// src/engine/rules.js
/** @typedef {'apply'|'predamage'|'tick'|'postdamage'} Phase */

const RULES = [];

/** Define a rule */
export function rule(def) {
  RULES.push({
    id: def.id || `rule_${RULES.length}`,
    phase: def.phase || 'tick',
    priority: def.priority ?? 0,
    when: def.when || (() => false),
    then: def.then || (() => {})
  });
}

/** Get rules for a phase, ordered by priority (desc) */
export function getRulesForPhase(phase /** @type {Phase} */) {
  return RULES.filter(r => r.phase === phase).sort((a, b) => b.priority - a.priority);
}

/* ---------- Predicates (P) ---------- */
export const P = {
  hasStatus: (id) => (ctx) => ctx.entity.statuses?.some(s => s.id === id),
  hasAnyTag: (tag) => (ctx) =>
    (ctx.entity.statuses?.some(s => s.tags?.includes(tag)) ||
     ctx.entity.materials?.some(m => m.tags?.includes(tag))),
  dmgTypeIs: (type) => (ctx) => ctx.event?.damage?.type === type,
  exposedToFire: () => (ctx) =>
    P.hasStatus('burning')(ctx) || (ctx.env?.temperatureC ?? 0) >= (ctx.env?.autoIgniteAtC ?? 800),
  and: (...ps) => (ctx) => ps.every(p => p(ctx)),
  or:  (...ps) => (ctx) => ps.some(p => p(ctx)),
};

/* ---------- Actions (A) ---------- */
export const A = {
  addStatus: (id, props={}) => (ctx) => ctx.queue.push({ type:'addStatus', id, props }),
  removeStatus: (id) => (ctx) => ctx.queue.push({ type:'removeStatus', id }),
  damage: (amount, dtype) => (ctx) => ctx.queue.push({ type:'damage', amount, dtype }),
  scaleIncomingDamage: (mult) => (ctx) => {
    if (ctx.event?.damage) {
      ctx.event.damage.amount = Math.max(0, Math.floor(ctx.event.damage.amount * mult));
    }
  },
  consumeCoating: (id, qty='all') => (ctx) => ctx.queue.push({ type:'consumeCoating', id, qty }),
  spawn: (what, props) => (ctx) => ctx.queue.push({ type:'spawn', what, props }),
};