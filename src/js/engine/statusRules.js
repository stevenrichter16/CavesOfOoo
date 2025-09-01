// src/engine/statusRules.js
import { rule, P, A } from './rules.js';

// Feature flag: switch to true when you disable DOT in endOfTurnStatusPass()
const USE_ENGINE_DOT = false;

// Wet + Electric → lethal (TEST). Change to scaling when you're done testing.
rule({
  id: 'wet_electric_lethal_test',
  phase: 'predamage',
  priority: 100,
  when: (ctx) => {
    const hasConductive = P.hasAnyTag('conductive')(ctx);
    const isElectric = P.dmgTypeIs('electric')(ctx);
    if (ctx.event?.damage?.type === 'electric') {
      console.log(`[ENGINE-RULE] wet_electric check: conductive=${hasConductive}, electric=${isElectric}`);
    }
    return hasConductive && isElectric;
  },
  then: (ctx) => {
    console.log(`[ENGINE-RULE] WET + ELECTRIC = LETHAL! Setting damage to 99999`);
    ctx.event.damage.amount = Math.max(ctx.event.damage.amount, 99999);
  }
});

// DOT tick (guarded)
rule({
  id: 'dot_tick',
  phase: 'tick',
  priority: 50,
  when: (ctx) => USE_ENGINE_DOT && P.hasAnyTag('dot')(ctx),
  then: (ctx) => {
    const dots = ctx.entity.statuses?.filter(s => s.tags?.includes('dot')) || [];
    for (const s of dots) {
      const n = s.props?.damagePerTurn ?? 1;
      A.damage(n, s.id)(ctx);
    }
  }
});

// Freeze prevents turn actions
rule({
  id: 'freeze_prevent_turn',
  phase: 'preturn',
  priority: 100,
  when: (ctx) => P.hasStatus('freeze')(ctx),
  then: (ctx) => { ctx.queue.push({ type: 'preventTurn', reason: 'frozen' }); }
});

// Fire applied → thaw wet/freeze
rule({
  id: 'fire_thaws_on_apply',
  phase: 'apply',
  priority: 80,
  when: (ctx) =>
    ctx.event?.kind === 'applyStatus' &&
    (ctx.event?.status?.tags?.includes('fire') || ctx.event?.status?.id === 'burn') &&
    (P.hasStatus('wet')(ctx) || P.hasStatus('freeze')(ctx)),
  then: (ctx) => {
    A.removeStatus('wet')(ctx);
    A.removeStatus('freeze')(ctx);
    ctx.queue.push({ type: 'log', message: 'The heat dries and thaws you.' });
  }
});

// Water (wet) applied → extinguish burning
rule({
  id: 'water_extinguishes_on_apply',
  phase: 'apply',
  priority: 80,
  when: (ctx) =>
    ctx.event?.kind === 'applyStatus' &&
    (ctx.event?.status?.id === 'wet') &&
    P.hasStatus('burn')(ctx),
  then: (ctx) => {
    A.removeStatus('burn')(ctx);
    ctx.queue.push({ type: 'log', message: 'The flames are extinguished!' });
  }
});

// Stat modifiers realized at preturn
rule({
  id: 'status_stat_mods',
  phase: 'preturn',
  priority: 50,
  when: (ctx) => ctx.entity.statuses?.some(s => s.props?.statModifier),
  then: (ctx) => {
    for (const s of ctx.entity.statuses) {
      const mod = s.props?.statModifier;
      const stat = s.props?.affectedStat;
      if (stat && typeof mod === 'number') {
        ctx.queue.push({ type: 'modifyStat', stat, modifier: mod, source: s.id });
      }
    }
  }
});