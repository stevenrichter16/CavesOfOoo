// log.js - Event-driven log system using constants
import { on } from './events.js';
import { EventType } from './eventTypes.js';

const MAX = 80;
const lines = [];
let mountEl = null;

export function mountLog(element) {
  mountEl = element;

  // Generic log event
  on(EventType.Log, ({ text, cls }) => pushLine(text, cls));

  // Combat events
  on(EventType.Miss, ({ by, vs }) => 
    pushLine(`${by} miss${by==='You'?'':'es'} ${vs}.`, 'miss'));
  
  on(EventType.Hit, ({ by, vs, dmg }) => 
    pushLine(`${by} hit${vs==='You'?'s':''} ${vs} for ${dmg}.`, 'hit'));
  
  on(EventType.Crit, ({ by, vs, dmg }) => 
    pushLine(`Critical! ${by} smash${by==='You'?'':'es'} ${vs} for ${dmg}!`, 'crit'));
  
  on(EventType.EntityDied, ({ name, by, cause }) => 
    pushLine(`${name} ${name==='You'?'are':'is'} defeated${by?` by ${by}`:''}${cause?` (${cause})`:''}.`, 'good'));

  // Status effect events
  on(EventType.StatusEffectRegister, ({ toId, type, vs, value, turns }) => {
    // Use 'vs' (the label) if provided, otherwise use toId
    const target = vs || (toId === 'player' ? 'You' : toId);
    
    if (type === 'freeze') {
      pushLine(`${target} ${target==='You'?'are':'is'} frozen solid!`, 'magic');
    } else if (type === 'burn') {
      pushLine(`${target} catch${target==='You'?'':'es'} fire!`, 'bad');
    } else if (type === 'poison') {
      pushLine(`${target} ${target==='You'?'are':'is'} poisoned!`, 'bad');
    } else if (type === 'shock') {
      pushLine(`${target} ${target==='You'?'are':'is'} electrified!`, 'magic');
    } else if (type === 'weaken') {
      pushLine(`${target} ${target==='You'?'are':'is'} weakened!`, 'note');
    } else {
      // Generic status effect message
      pushLine(`${target} gains ${type}${value?` (${value}/turn)`:''}${turns?` for ${turns} turns`:''}.`, 'note');
    }
  });
  
  on(EventType.StatusEffectPerform, ({ toId, effect, delta, remaining }) => {
    const target = toId === 'player' ? 'You' : toId;
    if (delta < 0) {
      if (effect === 'burn') {
        pushLine(`${target} take${target === 'You' ? '' : 's'} ${Math.abs(delta)} burn damage!`, 'bad');
      } else if (effect === 'poison') {
        pushLine(`${target} take${target === 'You' ? '' : 's'} ${Math.abs(delta)} poison damage!`, 'bad');
      } else if (effect === 'shock') {
        pushLine(`${target} take${target === 'You' ? '' : 's'} ${Math.abs(delta)} shock damage!`, 'magic');
      } else {
        pushLine(`${target} suffer${target === 'You' ? '' : 's'} ${Math.abs(delta)} from ${effect}.`, 'hit');
      }
    } else if (delta > 0) {
      pushLine(`${target} recover${target === 'You' ? '' : 's'} ${delta} from ${effect}.`, 'good');
    } else {
      pushLine(`${effect} persists on ${target}.`, 'note');
    }
    
    if (remaining !== undefined && remaining > 0) {
      pushLine(`(${remaining} turn${remaining === 1 ? '' : 's'} remaining)`, 'dim');
    }
  });
  
  on(EventType.StatusEffectExpired, ({ toId, effect, reason }) => {
    const target = toId === 'player' ? 'You' : toId;
    pushLine(`${effect} ends on ${target}${reason?` (${reason})`:''}.`, 'note');
  });

  // World change events
  on(EventType.DidChangeChunk, ({ cx, cy, biome }) => {
    if (biome) {
      pushLine(`[${cx},${cy}] ${biome} shivers as you arrive.`, 'note');
    }
  });

  // Inventory events (optional)
  on(EventType.InventoryEquipped, ({ item }) => 
    pushLine(`You equip ${item}.`, 'note'));
  
  on(EventType.InventoryUnequipped, ({ item }) => 
    pushLine(`You sheathe ${item}.`, 'note'));

  pushLine('Log ready.', 'note');
}

function pushLine(text, cls) {
  lines.push({ text, cls });
  if (lines.length > MAX) lines.shift();
  render();
}

function render() {
  if (!mountEl) return;
  mountEl.innerHTML = lines
    .map(({ text, cls }) => `<span class="${cls||''}">${escapeHtml(text)}</span>`)
    .join('<br/>');
  mountEl.scrollTop = mountEl.scrollHeight;
}

function escapeHtml(s) { 
  return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); 
}

// Helper to format damage numbers
function fmtDmg(n) {
  return n > 0 ? `-${n}` : `${n}`;
}