# Property-Driven Interaction Engine – Developer Guide

This document explains how the **CavesOfOoo interaction engine** works. It separates *game state* from *physics/status rules* so behaviors like **Wet + Electric → Instant Kill** can be defined **data-driven** without hardcoding.

---

## Mental Model

- **Game code** owns the state: entities, HP, UI, inventory.
- **Engine** owns the rules: materials, statuses, interactions.
- **Adapter** connects them: builds snapshots from entities, applies actions back.

**Per turn / attack:**
1. Build a `SimContext` (entity, statuses, materials, env, event).
2. Run all rules for the relevant phase (`predamage`, `tick`, etc).
3. Rules enqueue **actions** (`addStatus`, `damage`, `spawn`, etc).
4. Adapter applies those actions to your real game state.

---

## Core Concepts

### Materials
Physical substances, coatings, or ambient media.

```js
{ id:'water', tags:['liquid','conductive'], props:{ conductivityAmp:1.5 } }
```

- **Persistence:** until consumed/removed.
- **Use:** model physics, fuel, conductivity, corrosion.

### Statuses
Conditions/afflictions on entities.

```js
{ id:'wet', tags:['conductive'], props:{ quantity:40, turns:10 } }
```

- **Persistence:** duration/intensity.
- **Use:** UI flags, DOTs, debuffs, control states.

### Rules
Declarative if-then logic.

```js
rule({
  id: 'wet-electric-instantkill',
  phase: 'predamage',
  when: (ctx) => P.and(P.hasAnyTag('conductive'), P.dmgTypeIs('electric'))(ctx),
  then: (ctx) => {
    const hp = ctx.entity.hp ?? 99999;
    ctx.event.damage.amount = hp; // lethal for test
  }
});
```

- **Phase:** when it runs (`predamage`, `tick`, etc).
- **Priority:** order within phase.
- **When:** predicate function (`ctx` → bool).
- **Then:** effects (`ctx` → push actions or mutate damage).

### Predicates (P)
Reusable tests, e.g.:
- `P.hasStatus('burning')`
- `P.hasAnyTag('conductive')`
- `P.dmgTypeIs('electric')`

### Actions (A)
Reusable effects, e.g.:
- `A.addStatus('burning', { intensity:1 })`
- `A.damage(10, 'fire')`
- `A.scaleIncomingDamage(1.5)`

### SimContext
The object rules run against:

```js
{
  entity: { statuses: [...], materials: [...] },
  env: { temperatureC: 20 },
  event: { kind:'damage', damage:{ amount:10, type:'electric' } },
  queue: []
}
```

### Action Queue
List of effects for the adapter to apply:

```js
[
  { type:'addStatus', id:'stunned', props:{ turns:1 } },
  { type:'damage', amount:12, dtype:'fire' }
]
```

---

## Files

- `materials.js` – registers materials & statuses.
- `rules.js` – DSL for rules, predicates, actions.
- `sim.js` – runs rules for a phase.
- `universalRules.js` – reusable rules (ignite, douse, corrosion).
- `adapters/cavesOfOoo.js` – glue between engine and game.
- `testRules.instantKillWetElectric.js` – example test rule.

---

## Flow Example: Wet + Electric

1. Player steps on `~` → adapter gives them `wet` status (`tags:['conductive']`).
2. Combat applies an electric hit:
   - `applyAttack` calls `runPreDamage(state, defender, { amount, type:'electric' })`.
   - Engine builds context: entity statuses include `wet`.
   - Rule `wet-electric-instantkill` matches (conductive + electric).
   - Sets `ctx.event.damage.amount = defender.hp`.
3. Adapter applies actions → defender.hp = 0.

---

## Design Heuristics

- **Material = Cause (substance, fuel, conductivity).**
- **Status = Effect (burning, wet, stunned, DOT).**
- **Rule = Logic (when → then).**
- **Adapter = Application (mutate real state).**

Keep rules **small & composable**. Use tags (`conductive`, `flammable`, `corrosive`) for generalization.

---

## Extension Example

Add liquid nitrogen material + freezing rule:

```js
registerMaterial({
  id:'liq_nitrogen',
  tags:['liquid','cryogenic'],
  props:{ freezingPower:40 }
});

rule({
  id:'cryogenic-freeze',
  phase:'tick',
  when: (ctx) => ctx.entity.materials.some(m => m.id==='liq_nitrogen') &&
                 ctx.entity.statuses.some(s => s.id==='wet'),
  then: (ctx) => { A.addStatus('frozen',{ turns:2 })(ctx); A.removeStatus('wet')(ctx); }
});
```

---

## Checklist

- [ ] Substance? → **Material**.
- [ ] Condition/UI flag? → **Status**.
- [ ] Logic about tags/props? → **Rule**.
- [ ] Apply to real state? → **Adapter**.

---
