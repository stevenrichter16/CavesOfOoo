# CavesOfOoo Event Reference

This document defines the core events used across the CavesOfOoo codebase.  
All events are sent through the central event bus (`emit`) and consumed via `on`.

---

## General Conventions
- **Event names** are lowercase strings, often verbs or nouns (e.g. `move`, `hit`, `died`).  
- **Payloads** are plain JS objects with named fields.  
- Multiple systems may listen to the same event.  
- Events are *fire and forget*: the emitter does not know who listens.  

---

## Player & Entity Events

### `move`
- **Emitted by**: input/AI systems after deciding movement  
- **Payload**: `{ id, from: {x,y}, to: {x,y} }`  
- **Used by**:
  - Map/Rendering: update position of entity sprite
  - Log: "You move north."
  - AI: react to sound of movement

### `hit`
- **Emitted by**: combat resolution when an attack lands  
- **Payload**: `{ by, vs, dmg }`  
- **Used by**:
  - Log: "Skeleton hits you for 3."
  - UI: flash victim red
  - Audio: play impact sound

### `miss`
- **Emitted by**: combat resolution when an attack fails  
- **Payload**: `{ by, vs }`  
- **Used by**: log, UI feedback

### `died`
- **Emitted by**: combat or environment when entity health <= 0  
- **Payload**: `{ id, name, by, cause }`  
- **Used by**:
  - Log: "The skeleton is defeated."
  - Persistence: record death
  - Game state: remove entity from world

---

## Item & Inventory Events

### `equipped`
- **Payload**: `{ id, item }`  
- **Used by**: log, combat (modify stats), UI inventory panel

### `unequipped`
- **Payload**: `{ id, item }`  
- **Used by**: log, combat, UI

### `pickup`
- **Payload**: `{ id, item }`  
- **Used by**: log, inventory system

### `drop`
- **Payload**: `{ id, item }`  

---

## World & System Events

### `worldTick`
- **Emitted by**: main loop each turn/tick  
- **Payload**: `{ turn }`  
- **Used by**: weather updates, AI, persistence

### `log`
- **Payload**: `{ text, cls }`  
- **Special**: core channel for plain text, usually indirect via helpers

### `gameOver`
- **Emitted by**: player dies  
- **Payload**: `{ cause }`  
- **Used by**: show end screen, persistence

---

## Notes
- Start small: not every interaction needs an event.  
- Events are best for *shared interest*: if multiple systems care about it, make it an event.  
- Keep payloads small and meaningful.
