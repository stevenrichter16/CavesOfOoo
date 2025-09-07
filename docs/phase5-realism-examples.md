# Real Examples: Current System vs Reality

## The Merchant's Discovery

### **Current System Behavior:**
```javascript
// Day 1: Merchant discovers rare gems
const discovery = createRumor({
  type: RumorType.DISCOVERY,
  severity: RumorSeverity.MODERATE,
  details: "Rare gems found in northern cave",
  position: { x: 100, y: 200 },
  accuracy: 1.0
});

// Day 2: Merchant tells Guard (5 units away)
guard.hearRumor(discovery);
// Guard has: { details: "Rare gems found in northern cave", accuracy: 0.85 }

// Day 3: Guard tells Citizen (4 units away) 
citizen.hearRumor(discovery);
// Citizen has: { details: "Rare gems found in northern cave", accuracy: 0.70 }

// Day 10: Rumor becomes stale and is forgotten
// Everyone forgets simultaneously
```

### **Real World Behavior:**
```
Day 1: Merchant discovers rare gems
"I found some interesting stones in the north cave"

Day 2: Merchant tells Guard (who doesn't care about trade)
"That merchant found something in a cave up north"

Day 3: Guard tells Citizen (embellishing for interest)
"There's treasure in the forbidden caves! The merchant is rich now!"

Day 4: Citizen tells Friend (adding their own interpretation)
"The northern caves are full of magical gems that grant wishes!"

Day 10: 
- Merchant: Still remembers exact location and details (personal experience)
- Guard: Vaguely remembers "something about caves"
- Citizen: Firmly believes in magical wishing gems
- Friend: Planning expedition to find "the merchant's secret treasure cave"
```

## The King's Illness

### **Current System:**
```javascript
// Original rumor
const rumor = createRumor({
  type: RumorType.SIGHTING,
  severity: RumorSeverity.MAJOR,
  details: "King looks unwell at feast",
  sentiment: -0.3,
  accuracy: 1.0
});

// Spreading (same rumor, less accurate)
npc1.memory.rumors = [{
  id: "rumor_123",
  details: "King looks unwell at feast",
  accuracy: 0.85
}];

npc2.memory.rumors = [{
  id: "rumor_123", 
  details: "King looks unwell at feast",
  accuracy: 0.70
}];

// Everyone has identical text, just "less accurate"
```

### **Real World:**
```
Noble at feast: "The king seemed tired and left early"
↓
Noble's spouse: "The king is ill - he could barely stand at the feast"
↓
Servant: "The king collapsed at the feast! They carried him out!"
↓
Market vendor: "The king is dying! I heard he was poisoned at the feast!"
↓
Peasant: "The prince poisoned the king to steal the throne!"
↓
Neighboring kingdom: "Civil war in Candy Kingdom after king's assassination!"
```

## Memory Differences

### **Current System:**
```javascript
// All NPCs remember the same way
class NPC {
  memory: {
    rumors: [], // Max 10
    maxRumors: 10,
    // Forget after 7 days, regardless of importance
  }
}

// A child and a spymaster have identical memory capabilities
child.memory.maxRumors = 10;
spymaster.memory.maxRumors = 10;

// Both forget at the same rate
forgetIfOld(rumor) {
  return rumor.age > 7_DAYS;
}
```

### **Real World:**

**Child's Memory:**
- Remembers: "There was a big fight!" (exciting, simple)
- Forgets: Trade negotiations, political details
- Capacity: Few key events
- Distortion: High (poor understanding)

**Merchant's Memory:**
- Remembers: Trade routes, prices, customer preferences
- Forgets: Combat details, irrelevant gossip
- Capacity: Hundreds of trade-relevant facts
- Distortion: Low for trade, high for combat

**Guard's Memory:**
- Remembers: Threats, suspicious individuals, combat encounters
- Forgets: Trade gossip, social drama
- Capacity: Moderate, threat-focused
- Distortion: Amplifies danger, minimizes friendly encounters

**Spymaster's Memory:**
- Remembers: Everything, cross-referenced and verified
- Forgets: Almost nothing
- Capacity: Vast, organized network of information
- Distortion: Minimal (professional training)

## Spreading Patterns

### **Current System:**
```
Rumor at (0,0) with range 30:
- NPC at (10,0): ✓ Can hear (distance 10)
- NPC at (0,20): ✓ Can hear (distance 20)  
- NPC at (31,0): ✗ Cannot hear (distance 31)

Perfect circle, no obstacles considered
```

### **Real World:**
```
King's scandal:
- Queen: Knows immediately (intimate relationship)
- Court advisor: Knows within hours (inner circle)
- Castle guard: Knows within days (workplace gossip)
- Peasant outside castle: Never knows (class barrier)
- Merchant from distant city: Knows quickly (travels in elite circles)
- Hermit 5 miles away: Never knows (social isolation)

Social distance matters more than physical distance
```

## The Problem With Fixed Accuracy

### **Current System:**
```javascript
// Accuracy just decreases
accuracy = 1.0 → 0.85 → 0.70 → 0.55 → 0.40...

// But what does "70% accurate" mean for:
"The king was attacked" 
// 70% chance it happened?
// 70% of details correct?
// Attack was 70% as severe?
```

### **Real World:**
```
Original: "The guard drew his sword on a thief"

Retelling 1: "The guard killed a thief" 
// Not less accurate - DIFFERENT

Retelling 2: "Guards are murdering civilians"
// Not inaccurate - INTERPRETED through bias

Retelling 3: "There's a guard rebellion"
// Not degraded - EVOLVED into new narrative
```

## What "Accuracy" Should Mean

### **Better Model:**
```javascript
class Rumor {
  facts: {
    who: "guard",      // Can change: guard → guards → army
    what: "drew sword", // Can change: drew → attacked → killed
    where: "market",   // Can change: market → city → kingdom
    when: "yesterday", // Can change: yesterday → recently → ongoing
    why: "thief"       // Can change: thief → civilians → rebellion
  }
  
  mutate(spreader) {
    // Each fact can independently change based on:
    // - Spreader's biases
    // - Emotional state
    // - Understanding level
    // - Agenda
    
    if (spreader.hatesGuards) {
      this.facts.what = "murdered";
      this.facts.why = "innocent person";
    }
    
    if (spreader.fearful) {
      this.facts.who = "guards" // Pluralize
      this.facts.when = "ongoing" // Make current threat
    }
  }
}
```

## Conclusion

The current system treats rumors like **photocopies that fade** when they should be like **stories that transform**. Memory isn't a **filing cabinet with limited slots** but a **complex web of associations** that changes based on relevance, emotion, and reinforcement.

The fix isn't to make the system more complex, but to model the RIGHT complexity - the natural way information evolves through human communication.