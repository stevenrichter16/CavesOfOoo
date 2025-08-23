// src/ui/log.js
// Centralized message log UI that listens to game events and renders text.
// No game rule code should manipulate the DOM; emit events instead.

import { on, emit } from './events.js';
import { EventType } from './eventTypes.js';

const MAX = 80;
const lines = []; // [{text, cls}]
let mountEl = null;

/**
 * Mount the log to a DOM element and register event handlers.
 * Call once on startup: mountLog(document.getElementById('log'))
 * @param {HTMLElement} element
 */
export function mountLog(element) {
  mountEl = element;

  // Generic channel: emit(EventType.Log, { text, cls? })
  on(EventType.Log, ({ text, cls }) => pushLine(text, cls));

  // Domain events → human text
  on(EventType.InventoryEquipped,   ({ item })              => pushLine(`You equip ${item}.`, 'note'));
  on(EventType.InventoryUnequipped, ({ item })              => pushLine(`You sheathe ${item}.`, 'note'));
  on(EventType.Hit,                  ({ by, vs, dmg })       => pushLine(`HIT LOG - ${by} hit ${vs} for ${fmtDmg(dmg)}.`, 'hit'));
  on(EventType.Crit,                 ({ by, vs, dmg })       => pushLine(`Critical! ${by} smashes ${vs} for ${fmtDmg(dmg)}!`, 'crit'));
  on(EventType.Miss,                 ({ by, vs })            => pushLine(`${by} miss${by==='You'?'':'es'} ${vs}.`, 'miss'));
  on(EventType.EntityDied,           ({ name, by, cause })   => pushLine(`${name} ${name==='You'?'are':'is'} defeated${by?` by ${by}`:''}${cause?` (${cause})`:''}.`, 'good'));
  on(EventType.StatusEffectRegister, ({ type, vs }) => {
    if (type == "freeze") {
        pushLine(`${vs} ${vs==='You'?'are':'is'} frozen solid!`, "magic")
    }
    else if (type == "burn") {
        pushLine(`${vs} catch${vs==='You'?'':'es'} fire!`, "bad")
    }
    else if (type == "poison") {
        pushLine(`${vs} ${vs==='You'?'are':'is'} poisoned!`, "bad")
    }
    else if (type == "shock") {
        pushLine(`${vs} ${vs==='You'?'are':'is'} electrified!`, "magic")
    }
    // TODO: Implement weakened log
  })
  on(EventType.StatusEffectPerform, ({ toId, effect, delta }) => {
    if (effect === "burn" && delta < 0) {
        pushLine(`${toId === 'player' ? 'You' : toId} take${toId === 'player' ? '' : 's'} ${-delta} burn damage!`, "bad");
    }
    // Add other status effect messages as needed
  })
  on(EventType.DidChangeChunk, ({ cx, cy, biome }) => {
    if (biome) {
      pushLine(`[${cx},${cy}] ${biome} shivers as you arrive.`, 'note');
    }
  });

  // Optional hello
  emit(EventType.Log, { text: 'Log ready.', cls: 'note' });
}

/**
 * Convenience writer: push('hello', 'note')
 * @param {string} text
 * @param {string} [cls]
 */
export function push(text, cls) {
  emit(EventType.Log, { text, cls });
}

// --- internals ---

function pushLine(text, cls) {
  lines.push({ text, cls });
  if (lines.length > MAX) lines.shift();
  render();
}

function render() {
  if (!mountEl) return;
  //console.log("in RENDER");
  mountEl.innerHTML = lines
    .map(({ text, cls }) => `<span class="${cls||''}">${escapeHtml(text)}</span>`)
    .join('<br/>');
  // autoscroll to bottom
  mountEl.scrollTop = mountEl.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

function fmtDmg(dmg) {
  return dmg === Infinity ? '∞' : String(dmg);
}