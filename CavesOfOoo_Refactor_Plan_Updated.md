
# CavesOfOoo — Refactor Plan (Updated for Current Codebase)
**Audience:** Claude Code (apply these changes step-by-step).  
**Design Goals:** Movement-centric turns, event-driven systems, DOM-free game logic, symmetric player/NPC rules, and small modules with single responsibility.

> This updates the original playbook to match the *current* files you provided (actions.js, movePipeline.js, queries.js, events.js, eventTypes.js, log.js, game.js, worldGen.js, worldMap.js, quests.js).

---

## 0) Quick snapshot of current code (what to keep)
- **Input → Action → Movement pipeline present:** `Move(dx,dy)` + `runPlayerMove(state, action)` already route attempted movement through: `WillMove (cancellable) → bump/edge/walk → DidMove/DidStep/BlockedMove`. Keep this as the hinge for all gameplay.
- **Event backbone present:** `events.js` exposes `on/emit/emitCancellable`; `eventTypes.js` defines constants.
- **World queries present:** `queries.js` provides `entityAt`, `isPassable`, `tryEdgeTravel` (adjust imports as needed).
- **Logger wired:** `log.js` subscribes and prints user-facing text.
- **Big game/UI file:** `game.js` still mixes UI and rules (vendors/quests/world map). We’ll extract UI gradually.

---

## 1) Event vocabulary & constants (stabilize)
**Why:** Avoid string drift/typos and keep a single language across modules.

### Tasks
1) In `eventTypes.js`, ensure these names exist (or add them if missing):
```js
export const EventType = {
  // Movement
  WillMove: 'willMove',
  DidMove: 'didMove',
  DidStep: 'didStep',
  BlockedMove: 'blockedMove',

  // Combat
  WillAttack: 'willAttack',
  DidAttack: 'didAttack',
  Hit: 'hit',
  Crit: 'crit',
  Miss: 'miss',
  TookDamage: 'tookDamage',
  EntityDied: 'entityDied',

  // Status Effects
  StatusEffectRegister: 'statusEffectRegister',
  StatusEffectPerform: 'statusEffectPerform',
  StatusEffectExpired: 'statusEffectExpired',

  // UI / Log
  Log: 'log',
  FloatingText: 'floatingText',   // for damage/heal numbers (new)
  PlaySound: 'playSound',         // optional for SFX
  Shake: 'shake',                 // optional for screen shake
};
```
2) Replace all raw event string literals across the repo with `EventType.*` imports.

---

## 2) Movement pipeline — finish the hinge
**Why:** Keep everything hanging off movement but make modules subscribe instead of baking logic into `game.js`.

### Tasks
- Confirm `runPlayerMove(state, action)` calls, in order:
  - `emit(EventType.WillMove, payload)` (cancellable via `payload.cancel=true`).
  - If entity at target: `attack(state, player, foe)` (no DOM here).
  - Else `tryEdgeTravel`; if handled, return.
  - Else if passable: mutate player position → `emit(EventType.DidMove)` + `emit(EventType.DidStep)`.
  - Else `emit(EventType.BlockedMove)`.

**Patch example (idempotent):**
```js
// movePipeline.js (ensure it matches this sequence)
if (foe) { attack(state, player, foe); return true; }
if (tryEdgeTravel(state, player, nx, ny)) return true;
if (isPassable(state, nx, ny)) {
  const from = { x, y };
  player.x = nx; player.y = ny;
  emit(EventType.DidMove, { id: player.id, from, to: { x: nx, y: ny } });
  emit(EventType.DidStep, { id: player.id, x: nx, y: ny });
  return true;
}
emit(EventType.BlockedMove, { id: player.id, to: { x: nx, y: ny }, blocker: 'wall' });
```
- Make sure **no DOM** is touched here (logging/FX must be subscribers).

---

## 3) World queries — single source of truth
**Why:** Centralize collision/occupancy/edge travel so movement & AI use the same rules.

### Tasks
- Keep `queries.js` as the canonical home of:
  - `entityAt(state, x, y)`
  - `isPassable(state, x, y)`
  - `tryEdgeTravel(state, player, nx, ny)` (must call your real chunk loader and snap position).
- Replace any duplicate utility functions in other files with imports from `queries.js`.

**Edge travel reminder:**
```js
// tryEdgeTravel should return true if it handled chunk switch and player position
// It should also emit world-change events later if you add them (WillChangeChunk/DidChangeChunk).
```

---

## 4) Combat — symmetric, DOM-free, eventful
**Why:** Player and NPC share the same path; combat emits facts, UI reacts.

### Tasks
- Ensure you have (or create) `systems/combat.js` exporting:
  - `resolveAttack(state, attacker, defender, method='melee')` → pure function returning `{ hit, crit, dmg, method, by, vs, attackerId, defenderId }`.
  - `applyAttack(state, attacker, defender, result)` → mutates HP, emits `DidAttack`, `Hit|Miss|Crit`, `TookDamage`, `EntityDied` (and **not** DOM).
  - `attack(state, attacker, defender, method='melee')` → emits `WillAttack`; if not cancelled, calls resolve→apply.
- Replace any direct DOM (`showDamageNumber`) with `emit(EventType.FloatingText, { x, y, text, kind })`.

**FloatingText UI subscriber (new file):**
```js
// ui/fx.js
import { on } from '../core/events.js';
import { EventType } from '../core/eventTypes.js';

on(EventType.FloatingText, ({ x, y, text, kind }) => {
  const el = document.createElement('div');
  el.className = `float ${kind||''}`;
  el.textContent = text;
  el.style.left = x * 16 + 'px';
  el.style.top  = y * 16 + 'px';
  document.querySelector('.ascii-map').appendChild(el);
  setTimeout(() => el.remove(), 800);
});
```
*(Adjust sizing/selector to your layout.)*

---

## 5) Status effects — map store + minimal system
**Why:** Data-first (easy persistence), tick only active entities, emit events for log/FX.

### Tasks
Create `systems/statusSystem.js`:
```js
// systems/statusSystem.js
import { emit } from '../core/events.js';
import { EventType } from '../core/eventTypes.js';

const Status = new Map(); // id -> { effectKey: { value, turns, sourceId? }, ... }
const Active = new Set(); // ids with any active effects

export function statusEffectRegister({ toId, effect, value=0, turns=0, sourceId }) {
  const s = Status.get(toId) || {};
  s[effect] = { value, turns, sourceId };
  Status.set(toId, s);
  Active.add(toId);
  emit(EventType.StatusEffectRegister, { toId, effect, value, turns, sourceId });
}

export function statusEffectPerformTick({ toId, applyDamage, applyHeal }) {
  const s = Status.get(toId);
  if (!s) return;
  for (const [effect, data] of Object.entries(s)) {
    if (!data) continue;
    let delta = 0;
    // Damage-over-time effects:
    if (['poison','burn','bleed','shock'].includes(effect)) { delta = -Math.abs(data.value); applyDamage(toId, -delta, effect); }
    // Healing-over-time effects:
    if (['regen','lifesteal'].includes(effect)) { delta = +Math.abs(data.value); applyHeal(toId, delta, effect); }

    emit(EventType.StatusEffectPerform, { toId, effect, delta, remaining: Math.max(0, (data.turns||0) - 1) });
    data.turns = (data.turns||0) - 1;
    if (data.turns <= 0) { delete s[effect]; emit(EventType.StatusEffectExpired, { toId, effect, reason: 'duration' }); }
  }
  if (Object.keys(s).length === 0) { Status.delete(toId); Active.delete(toId); }
}

export function endOfTurnStatusPass(state, applyDamage, applyHeal) {
  // Only iterate active entities
  for (const id of Array.from(Active)) statusEffectPerformTick({ toId: id, applyDamage, applyHeal });
}
```
**Integrate into turn cadence:** after a consumed player move and AI actions, call `endOfTurnStatusPass(...)` with tiny HP mutators that also emit `TookDamage` events.

---

## 6) Turn cadence — keep deterministic order
**Why:** Predictable systems help debugging and tests.

### Tasks
In your key handler (or main loop after dequeuing an action):
1) `runPlayerMove(state, Move(...))`  
2) `runAI(state)` (if you have it)  
3) `endOfTurnStatusPass(state, applyDamage, applyHeal)`  
4) `emit(EventType.DidTurn, { turn: state.turn++ })`  
5) `render(state)`

Example HP mutators passed to status system:
```js
function applyDamage(id, amount, source) {
  const e = state.entities.get(id);
  if (!e) return;
  e.hp = Math.max(0, e.hp - amount);
  emit(EventType.TookDamage, { id, amount: -amount, source });
  if (e.hp <= 0) emit(EventType.EntityDied, { id, name: e.name || `entity#${id}`, cause: source });
}

function applyHeal(id, amount, source) {
  const e = state.entities.get(id);
  if (!e) return;
  const before = e.hp;
  e.hp = Math.min(e.max || e.hp, e.hp + amount);
  const gained = e.hp - before;
  if (gained > 0) emit(EventType.TookDamage, { id, amount: +gained, source }); // or emit a separate Healed event
}
```

---

## 7) Logging/UI — keep presentation out of systems
**Why:** Make rule code framework-agnostic and testable.

### Tasks
- Ensure all user-facing text routes through `log.js` by subscribing to domain events:
  - Movement: `DidMove`, `BlockedMove`
  - Combat: `Hit`, `Miss`, `Crit`, `EntityDied`, `TookDamage`
  - Status: `StatusEffectRegister`, `StatusEffectPerform`, `StatusEffectExpired`
- Remove any `console.log`/DOM text mutation from systems.

---

## 8) UI extraction from game.js (staged)
**Why:** Shrink `game.js` and avoid god-file drift.

### Tasks (no breaking changes; staged):
- Create `ui/fx.js` (FloatingText etc.) and import it early so its subscriptions are live.
- Extract **Shop UI**: `ui/shop.js` with `mountShop(root)`, `renderShop(state)`, and event listeners (`OpenShop`, `CloseShop`, `BuyItem`, `SellItem`). Keep pricing/data rules in systems.
- Extract **World Map UI**: `ui/map.js`, subscribe to `OpenWorldMap/CloseWorldMap`, and render using `worldMap.js` helpers.
- Extract **Quest UI**: `ui/quests.js`, subscribe to quest events (`QuestOffered`, `QuestTurnInOpened`, `QuestTurnedIn`) and render. Keep logic in `quests.js`.

Mark remaining UI-in-logic sites in `game.js` with `// TODO(ui-extract)` for next pass.

---

## 9) Tests / sanity checks (manual or quick harness)
- Move into wall → expect `BlockedMove`, no position change.
- Move into empty tile → expect `DidMove` + `DidStep` and position changed.
- Bump foe → expect combat events and no movement.
- Edge move → `tryEdgeTravel` snaps to new chunk/edge; position updated.
- Status tick → applying poison emits `StatusEffectRegister`, `StatusEffectPerform`, HP reduces, `StatusEffectExpired` when done.

---

## 10) Commit strategy for Claude
1) Replace remaining `tryMove` call sites with `Move()+runPlayerMove()` (if any).  
2) Add `ui/fx.js` and route floating numbers via `EventType.FloatingText`.  
3) Add `systems/statusSystem.js`, wire into the turn cadence with HP mutators.  
4) Stabilize event names via `EventType.*` everywhere.  
5) Extract one UI module at a time from `game.js` (shop → map → quests).  
6) Consolidate any duplicated world queries into `queries.js`.

---

## Appendix: Minimal scaffolds Claude may create

**ui/fx.css** (optional)
```css
.float { position:absolute; pointer-events:none; animation: rise 0.8s ease-out forwards; }
@keyframes rise { from { transform: translateY(0); opacity:1; } to { transform: translateY(-16px); opacity:0; } }
```

**ui/fx.js** (subscribe once at startup)
```js
import { on } from '../core/events.js';
import { EventType } from '../core/eventTypes.js';

on(EventType.FloatingText, ({ x, y, text, kind }) => {
  const el = document.createElement('div');
  el.className = `float ${kind||''}`;
  el.textContent = text;
  el.style.left = `${x*16}px`;
  el.style.top  = `${y*16}px`;
  document.querySelector('.ascii-map').appendChild(el);
  setTimeout(() => el.remove(), 800);
});
```

**systems/combat.js** (shape reminder)
```js
export function attack(state, attacker, defender, method='melee') {
  const pre = { attackerId: attacker.id, defenderId: defender.id, method, cancel:false };
  emit(EventType.WillAttack, pre);
  if (pre.cancel) return 'cancelled';

  const res = resolveAttack(state, attacker, defender, method);
  return applyAttack(state, attacker, defender, res);
}
```

---

**End of plan.** Apply changes in small commits; keep the game playable after each step.
