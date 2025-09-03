# CavesOfOoo – Social System Implementation Plan

This document provides a step‑by‑step plan for implementing the full NPC–player and NPC–NPC interaction system in **CavesOfOoo**. It assumes no prior context and is self‑contained.

---

## 1. File Structure

```
src/
 ├── social/
 │    ├── traits.js          # NPCTraits definitions
 │    ├── factions.js        # Faction definitions & relations
 │    ├── relationship.js    # RelationshipMatrix + RelationshipSystem singleton
 │    ├── memory.js          # NPCMemory class
 │    ├── actions.js         # SocialActions object
 │    ├── dialogue.js        # DialogueGenerator class
 │    ├── behavior.js        # processNPCSocialTurn, executeSocialAction
 │    ├── init.js            # initializeNPC, runPlayerNPCInteraction, getAvailableInteractions
 │    └── index.js           # exports everything as a module
```

---

## 2. Integration Steps

### 2.1 Add Social Tick to Game Loop
In `game.js`, after monster AI and before status effects:

```js
import { processNPCSocialTurn } from './social/behavior.js';

function runTurn(state) {
  // ... player + monster moves
  processNPCSocialTurn(state);
  // ... status effects, persistence, rendering
}
```

### 2.2 Connect to Event Bus and Log
In `ui/log.js`:

```js
on('SocialInteraction', ({ actor, target, action, dialogue }) => {
  pushLine(`${actor} ${action}s ${target}.`, 'note');
  if (dialogue) pushLine(dialogue, 'dialogue');
});
```

### 2.3 Spawn NPCs that Don’t Exist Yet
Use `initializeNPC`:

```js
import { initializeNPC } from './social/init.js';

function spawnNPC(id, name, config) {
  const npc = {
    id,
    name,
    x: config.x || 0,
    y: config.y || 0,
    hp: config.hp || 10,
    traits: config.traits || null,
    faction: config.faction || null,
    inventory: []
  };
  return initializeNPC(npc, config);
}
```

Example batch:
```js
const townNPCs = [
  spawnNPC('n1', 'Candy Merchant', { faction: 'merchants' }),
  spawnNPC('n2', 'Peasant', { faction: 'peasants', traits: ['humble'] }),
  spawnNPC('n3', 'Guard', { faction: 'guards', traits: ['brave','loyal'] })
];
```

---

## 3. System Details

### 3.1 Traits
- Defined in `traits.js` (brave, cowardly, greedy, etc.)
- Traits provide **modifiers** (giftEffectiveness, intimidationResist, etc.)
- `npc.hasTrait(trait)` helper included

### 3.2 Factions
- Encoded in `factions.js` with values and relations
- Propagate reputation with `propagateReputation`

### 3.3 Relationships
- `RelationshipMatrix` maps pairs to {value, trust, fear, respect}
- History ring buffer for logs and AI
- `modifyRelation(actor, target, { value, trust, reason })`

### 3.4 Memory
- Ring buffer of last N events
- Tracks grudges, favors, rumors
- `getAttitude(entityId)` returns net favor minus grudges

### 3.5 Actions
- `SocialActions` define requirements + effects
- Examples: `chat`, `compliment`, `insult`, `threaten`, `gift`, `share_rumor`, `trade`, `request_help`

### 3.6 Dialogue
- Template‑based responses keyed by **attitude** and **traits**
- Fills `{insult}`, `{item.name}`, `{rumor.detail}` at runtime

### 3.7 Behavior
- `processNPCSocialTurn` runs chance‑based interactions
- Uses proximity (Manhattan distance ≤ 5)
- Chooses target weighted by relationship values
- Executes via `executeSocialAction`

### 3.8 Player Interactions
- `getAvailableInteractions(player,npc)` → menu options
- `runPlayerNPCInteraction(state,player,npc,action,params)` executes and returns dialogue + updated relation

---

## 4. Example Scenarios

- **Gift to Greedy Merchant** → `gift` action doubles effect
- **Insult Proud Noble** → strong negative reaction, special dialogue
- **Threaten Brave Guard** → fails, produces “You don’t scare me!”
- **Share Rumor via Gossipy NPC** → rumor propagates to target memory

---

## 5. Testing

### 5.1 Vitest Unit Tests
- Traits load correctly
- Relationship deltas clamped [-100,100]
- Rumor spread count ≤ 3
- DialogueGenerator returns valid string per action

### 5.2 Smoke Test Harness
```js
const player = { id:'p1', name:'Hero', traits:['humble'] };
const npc = spawnNPC('g1','Guard',{ faction:'guards', traits:['brave'] });
const state = { npcs:[npc], player, emit: console.log };

const result = runPlayerNPCInteraction(state, player, npc, 'chat');
console.log(result.dialogue);
```

---

## 6. Balancing & Tuning
- Adjust **trait multipliers** (compliment proud x2, insult humble x0.5)
- Tweak **faction propagation** dampening (relation/200)
- Limit NPC social chance per turn (max 30%)

---

## 7. Success Criteria
- NPCs interact without player input
- Player actions change relationships & dialogue
- Faction reputation shifts propagate logically
- Logs and events capture outcomes
- Performance acceptable with 50+ NPCs

---

