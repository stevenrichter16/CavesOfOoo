# CavesOfOoo Refactor Playbook

This playbook is written as **instructions you can give to Claude Code** (or any refactoring assistant) to systematically improve the design of CavesOfOoo, based on best practices from JavaScript game architecture, roguelike design, and lessons from games like *Dwarf Fortress* and *Caves of Qud*.

---

## Core Principles

1. **Modularity over monoliths**
   - Break code into smaller, single-responsibility files (`src/core/`, `src/systems/`, `src/ui/`, `src/world/`).
   - Avoid "god objects".

2. **Event-driven architecture**
   - Introduce an event bus (`core/events.js`).
   - Use `emit` / `on` for communication instead of direct coupling.

3. **Data-first design**
   - Keep game state in plain objects (`entities`, `map`, `inventory`).
   - Systems operate on this state and emit events.

4. **Domain separation**
   - Systems: combat, movement, inventory, AI, rendering, persistence.
   - Each system mutates state + emits events.
   - Other systems subscribe and react.

5. **Pre/Post hooks via events**
   - `willX` → can modify/cancel (before).
   - `didX` → fire after (for logging/UI).

6. **Simplicity**
   - Plain HTML, CSS, JS (no framework).
   - Vanilla DOM for UI, later replaceable with canvas.

---

## Refactor Tasks

### Task 1 — Introduce Event Bus
- Create `src/core/events.js`:
  ```js
  const handlers = {};
  export function on(type, fn){ (handlers[type] ||= []).push(fn); }
  export function emit(type, payload){ (handlers[type]||[]).forEach(fn => fn(payload)); }
  export function emitCancellable(type, payload){
    payload.cancel = false;
    emit(type, payload);
    return payload.cancel;
  }
  ```
- Replace direct console logging with events (`emit('log', {...})`).

### Task 2 — Logging System
- Create `src/ui/log.js`.
- Subscribe to domain events (`equipped`, `hit`, `entityDied`) and render text into a `#log` element.
- Keep history, limit lines.

### Task 3 — Game State Structure
- Move all mutable state into `src/state.js`:
  ```js
  export const state = {
    turn: 0,
    player: { id:'player', hp:10, pos:{x:0,y:0} },
    entities: {},
    map: {},
    inventory: [],
  };
  ```

### Task 4 — Core Systems
- **Combat** (`src/systems/combat.js`): owns HP math, emits `hit`, `miss`, `tookDamage`, `entityDied`.
- **Movement** (`src/systems/movement.js`): checks walls, emits `willMove`, `didMove`, `blockedMove`.
- **Inventory** (`src/systems/inventory.js`): manages pickup/drop/equip, emits `equipped`, `unequipped`.
- **AI** (`src/systems/ai.js`): emits `didAIDecide`, `didAIAct`.
- **Persistence** (`src/systems/persistence.js`): save/load, emits `willSaveWorld`, `didLoadWorld`.

### Task 5 — Pre/Post Event Hooks
- Replace inline conditionals with `emitCancellable` for `willX` events.
- Example (movement):
  ```js
  if (emitCancellable('willMove', { id, from, to })) return;
  setPos(id, to);
  emit('didMove', { id, from, to });
  ```

### Task 6 — Rendering
- **Phase 1:** Keep DOM-based rendering but subscribe to state changes via events.
- **Phase 2:** (optional later) Replace with canvas renderer.

### Task 7 — Persistence
- Move save/load logic into `src/systems/persistence.js`.
- Use events to trigger autosaves, chunk saves.

### Task 8 — Documentation
- Document all events in `docs/events.md` with payload shapes.
- Example:
  ```md
  ## Combat
  - willAttack: { attacker, defender, method }
  - didAttack: { attacker, defender, method }
  - hit: { by, vs, dmg, crit? }
  - miss: { by, vs }
  - entityDied: { id, name, by?, cause? }
  ```

---

## Example Flow (Attack)

1. `combat.attack(attacker, defender)` is called.
2. `emitCancellable('willAttack', { attacker, defender })` — can cancel.
3. If not cancelled, resolve hit/damage, apply to defender.
4. Emit `didAttack`, then either `hit` or `miss`.
5. If defender HP <= 0, emit `entityDied`.
6. Log/UI/FX subscribe and react.

---

## Example Flow (Movement)

1. Input calls `tryMove(player, {x,y})`.
2. `emitCancellable('willMove', { id, from, to })` — doors/traps can cancel.
3. If allowed, update position and emit `didMove`.
4. If blocked, emit `blockedMove`.

---

## Migration Strategy

1. Extract **event bus** first.
2. Move logging onto it.
3. Gradually peel systems (combat, movement, inventory) into modules.
4. Replace direct DOM manipulation with event-driven updates.
5. Add tests for systems by emitting fake events and checking state.
6. Later consider swapping renderer to `<canvas>`.

---

## Deliverables

- `src/core/events.js`
- `src/ui/log.js`
- `src/state.js`
- `src/systems/` (combat, movement, inventory, ai, persistence)
- `docs/events.md`

---

By following this, Claude Code (or another refactor tool) can **stepwise refactor your codebase** into a clean, modular roguelike engine.
