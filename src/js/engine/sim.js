// src/engine/sim.js
import { getRulesForPhase } from './rules.js';

/**
 * @typedef {{
 *  entity:{ id:string, statuses:Array<{id,tags?:string[],props?:any}>, materials:Array<{id,tags?:string[],props?:any}> },
 *  env?:{ temperatureC?:number, oxygen?:number, autoIgniteAtC?:number, tileTags?:string[] },
 *  event?:{ kind?:'applyStatus'|'tick'|'damage', status?:{id,props?}, damage?:{amount:number,type:string} },
 *  queue?:Array<any>, rand?:()=>number
 * }} SimContext
 */

export function runPhase(phase, ctx /* SimContext */) {
  ctx.queue = ctx.queue || [];
  for (const r of getRulesForPhase(phase)) {
    try { 
      if (r.when(ctx)) {
        r.then(ctx);
      }
    } catch (e) {
      console.error(`Error in rule ${r.id}:`, e);
    }
  }
  return ctx.queue;
}