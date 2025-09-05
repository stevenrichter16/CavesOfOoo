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

// Check for lethal shock when moving onto water
rule({
  id: 'electric_water_instant_kill_on_move',
  phase: 'movement',
  priority: 100,
  when: (ctx) => {
    // Check if entity has shock status
    const hasShock = P.hasStatus('shock')(ctx) || P.hasAnyTag('electric')(ctx);
    
    // Check if we're in a movement event and moved FROM non-water TO water
    if (ctx.event?.kind !== 'move') return false;
    
    // Get the from and to positions
    const fromX = ctx.event?.from?.x;
    const fromY = ctx.event?.from?.y;
    const toX = ctx.event?.to?.x;
    const toY = ctx.event?.to?.y;
    
    // Check what tiles we're moving from and to
    const fromTile = ctx.state?.chunk?.map?.[fromY]?.[fromX];
    const toTile = ctx.state?.chunk?.map?.[toY]?.[toX];
    
    // We want to trigger if moving FROM non-water TO water while shocked
    const movingFromNonWater = fromTile !== '~';
    const movingToWater = toTile === '~';
    
    if (hasShock && movingFromNonWater && movingToWater) {
      console.log(`[ENGINE-RULE] Shocked entity stepping from ${fromTile} into water! Instant kill!`);
      return true;
    }
    
    return false;
  },
  then: (ctx) => {
    console.log(`[ENGINE-RULE] ELECTROCUTION! Entity with shock status stepped into water`);
    // Deal massive damage
    A.damage(99999, 'electrocution')(ctx);
    
    // Log message based on entity
    const entityName = ctx.entity.name || (ctx.entity.id === 'player' ? 'You' : 'Entity');
    const verb = entityName === 'You' ? 'are' : 'was';
    ctx.queue.push({ 
      type: 'log', 
      message: `⚡💀 ${entityName} ${verb} ELECTROCUTED stepping into water while shocked! 💀⚡`, 
      style: 'bad' 
    });
    
    // We can't emit FloatingText directly from here, so just rely on the damage action
    // The massive damage will trigger the death event and show damage numbers
  }
});

// Check for instant kill when shock is applied to entity already on water
rule({
  id: 'shock_applied_on_water_instant_kill',
  phase: 'apply',
  priority: 100,
  when: (ctx) => {
    // Check if we're applying shock status
    if (ctx.event?.kind !== 'applyStatus') return false;
    if (ctx.event?.status?.id !== 'shock') return false;
    
    // Check if entity is currently on water
    const currentTile = ctx.state?.chunk?.map?.[ctx.entity.y]?.[ctx.entity.x];
    const onWater = currentTile === '~';
    
    if (onWater) {
      console.log(`[ENGINE-RULE] Applying shock to entity already on water! Instant kill!`);
      return true;
    }
    
    return false;
  },
  then: (ctx) => {
    console.log(`[ENGINE-RULE] ELECTROCUTION! Shock applied while standing in water`);
    // Deal massive damage after a short delay to let the status apply first
    ctx.queue.push({ 
      type: 'delayedAction',
      delay: 100,
      action: {
        type: 'damage',
        amount: 99999,
        dtype: 'electrocution'
      }
    });
    
    // Log message
    const entityName = ctx.entity.name || (ctx.entity.id === 'player' ? 'You' : 'Entity');
    const verb = entityName === 'You' ? 'are' : 'was';
    ctx.queue.push({ 
      type: 'log', 
      message: `⚡💀 ${entityName} ${verb} ELECTROCUTED! Shocked while standing in water! 💀⚡`, 
      style: 'bad' 
    });
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