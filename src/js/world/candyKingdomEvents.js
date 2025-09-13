// src/js/world/candyKingdomEvents.js
// Dynamic events and life cycles in the Candy Kingdom

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

// Track event states
export const CandyKingdomEvents = {
  // Ceremony tracking
  backRubbingCeremony: {
    nextDate: null,
    tartPath: [],
    perfectTarts: 0,
    isActive: false
  },
  
  // Royal Promise enforcement
  royalPromise: {
    activeTrials: [],
    timeFrozen: false,
    mathQuestions: [
      { q: "What's 2 + 2?", a: 4 },
      { q: "What's 8 - 3?", a: 5 },
      { q: "What's 4 × 4?", a: 16 },
      { q: "What's 15 ÷ 3?", a: 5 }
    ]
  },
  
  // Daily life cycles
  timeOfDay: 'day', // day, evening, night
  
  // Psychic battle
  psychicBattle: {
    active: true,
    turnsElapsed: 0,
    goliadPower: 50,
    stormoPower: 50
  },
  
  // Crime tracking
  crimeActivity: {
    pupGangActive: false,
    recentCrimes: [],
    guardAlert: 'normal' // normal, heightened, maximum
  },
  
  // Transportation
  subway: {
    operational: true,
    currentTrains: [],
    nextArrival: 0
  }
};

/**
 * Initialize Candy Kingdom events when entering the kingdom
 */
export function initializeCandyKingdomEvents(state) {
  // Set initial time of day based on game time
  updateTimeOfDay(state);
  
  // Schedule next Back-Rubbing Ceremony
  if (!CandyKingdomEvents.backRubbingCeremony.nextDate) {
    scheduleBackRubbingCeremony(state);
  }
  
  // Start psychic battle animations
  if (CandyKingdomEvents.psychicBattle.active) {
    updatePsychicBattle(state);
  }
  
  // Initialize subway schedule
  scheduleSubwayArrivals(state);
  
  emit(EventType.KINGDOM_EVENTS_INITIALIZED, { events: CandyKingdomEvents });
}

/**
 * Update time of day and trigger related events
 */
export function updateTimeOfDay(state) {
  const turn = state.turn || 0;
  const hourEquivalent = (turn % 1000) / 41.67; // ~24 hour cycle per 1000 turns
  
  let newTime;
  if (hourEquivalent < 6 || hourEquivalent >= 20) {
    newTime = 'night';
  } else if (hourEquivalent >= 17) {
    newTime = 'evening';
  } else {
    newTime = 'day';
  }
  
  if (newTime !== CandyKingdomEvents.timeOfDay) {
    const oldTime = CandyKingdomEvents.timeOfDay;
    CandyKingdomEvents.timeOfDay = newTime;
    
    // Trigger time-based events
    handleTimeChange(state, oldTime, newTime);
  }
}

/**
 * Handle time of day changes
 */
function handleTimeChange(state, oldTime, newTime) {
  if (state.log) {
    if (newTime === 'evening') {
      state.log("The sun sets over the Candy Kingdom. Shops begin to close.", "note");
    } else if (newTime === 'night') {
      state.log("Night falls. The Gumball Guardians increase their vigilance.", "dim");
      // Increase crime activity at night
      CandyKingdomEvents.crimeActivity.pupGangActive = Math.random() < 0.3;
    } else if (newTime === 'day') {
      state.log("A new day dawns in the Candy Kingdom!", "magic");
      // Reset daily events
      CandyKingdomEvents.crimeActivity.pupGangActive = false;
    }
  }
  
  // Update NPC behaviors based on time
  updateNPCSchedules(state, newTime);
  
  emit(EventType.TIME_OF_DAY_CHANGED, { oldTime, newTime });
}

/**
 * Update NPC schedules based on time
 */
function updateNPCSchedules(state, timeOfDay) {
  if (!state.npcs) return;
  
  state.npcs.forEach(npc => {
    // Shopkeepers close at night
    if (npc.shopkeeper) {
      if (timeOfDay === 'night') {
        npc.shopOpen = false;
        if (npc.name === 'Root Beer Guy') {
          // Root Beer Guy goes home and writes
          npc.activity = 'writing';
        }
      } else {
        npc.shopOpen = true;
      }
    }
    
    // Guards increase patrols at night
    if (npc.faction === 'guards') {
      if (timeOfDay === 'night') {
        npc.patrolSpeed = 2; // Double speed at night
      } else {
        npc.patrolSpeed = 1;
      }
    }
    
    // Criminals active at night
    if (npc.faction === 'bandits') {
      npc.active = (timeOfDay === 'night');
    }
  });
}

/**
 * Schedule the next Back-Rubbing Ceremony
 */
function scheduleBackRubbingCeremony(state) {
  // Ceremony happens every 1000 turns (roughly once per "year")
  const nextCeremony = (Math.floor((state.turn || 0) / 1000) + 1) * 1000;
  CandyKingdomEvents.backRubbingCeremony.nextDate = nextCeremony;
  
  if (state.log) {
    const turnsUntil = nextCeremony - (state.turn || 0);
    state.log(`The next Back-Rubbing Ceremony is in ${turnsUntil} turns.`, "note");
  }
}

/**
 * Check if it's time for the Back-Rubbing Ceremony
 */
export function checkBackRubbingCeremony(state) {
  const ceremony = CandyKingdomEvents.backRubbingCeremony;
  
  if (state.turn >= ceremony.nextDate && !ceremony.isActive) {
    startBackRubbingCeremony(state);
  }
  
  if (ceremony.isActive) {
    updateCeremonyProgress(state);
  }
}

/**
 * Start the Back-Rubbing Ceremony event
 */
function startBackRubbingCeremony(state) {
  const ceremony = CandyKingdomEvents.backRubbingCeremony;
  ceremony.isActive = true;
  ceremony.perfectTarts = 0;
  
  if (state.log) {
    state.log("🎉 The Back-Rubbing Ceremony begins!", "magic");
    state.log("Royal Tart Toters are departing from the Tartorium...", "note");
  }
  
  // Create tart path from Tartorium to Congressional Hall
  ceremony.tartPath = [
    { x: 12, y: 19, chunk: '0,0' }, // Tartorium
    { x: 24, y: 18, chunk: '1,0' }, // Through shopping district
    { x: 48, y: 11, chunk: '1,0' }, // Exit east
    // Path continues outside kingdom...
  ];
  
  emit(EventType.CEREMONY_STARTED, { type: 'back_rubbing' });
}

/**
 * Update ceremony progress
 */
function updateCeremonyProgress(state) {
  const ceremony = CandyKingdomEvents.backRubbingCeremony;
  
  // Simulate tart delivery progress
  if (ceremony.tartPath.length > 0) {
    ceremony.tartPath.shift(); // Move along path
    
    // Random chance of tart theft attempt
    if (Math.random() < 0.1) {
      if (state.log) {
        state.log("Tart thieves spotted! Banana Guards responding!", "combat");
      }
      CandyKingdomEvents.crimeActivity.guardAlert = 'heightened';
    }
  } else {
    // Ceremony complete
    ceremony.isActive = false;
    ceremony.perfectTarts = Math.floor(Math.random() * 20) + 80; // 80-100 perfect tarts
    
    if (state.log) {
      state.log(`Ceremony complete! ${ceremony.perfectTarts} perfect tarts delivered!`, "magic");
    }
    
    scheduleBackRubbingCeremony(state); // Schedule next one
  }
}

/**
 * Trigger a Royal Promise trial
 */
export function triggerRoyalPromiseTrial(state, offender) {
  const trial = {
    offender: offender,
    started: state.turn,
    frozen: false,
    question: null,
    pardoned: false
  };
  
  CandyKingdomEvents.royalPromise.activeTrials.push(trial);
  
  // Gumball Guardian freezes time
  if (state.log) {
    state.log("ROYAL PROMISE BROKEN!", "combat");
    state.log("Gumball Guardian: 'TRIAL BY FIRE... OR MATH!'", "magic");
  }
  
  // Freeze time effect
  CandyKingdomEvents.royalPromise.timeFrozen = true;
  state.timeFrozen = true;
  
  // Select random math question
  trial.question = CandyKingdomEvents.royalPromise.mathQuestions[
    Math.floor(Math.random() * CandyKingdomEvents.royalPromise.mathQuestions.length)
  ];
  
  emit(EventType.ROYAL_TRIAL_STARTED, { trial });
  
  return trial;
}

/**
 * Answer a Royal Promise trial question
 */
export function answerTrialQuestion(state, trial, answer) {
  if (answer === trial.question.a) {
    // Correct answer - time reverses
    if (state.log) {
      state.log("Correct! Time reverses and the promise is forgiven.", "magic");
    }
    
    trial.pardoned = true;
    CandyKingdomEvents.royalPromise.timeFrozen = false;
    state.timeFrozen = false;
    
    // Remove from active trials
    const index = CandyKingdomEvents.royalPromise.activeTrials.indexOf(trial);
    if (index > -1) {
      CandyKingdomEvents.royalPromise.activeTrials.splice(index, 1);
    }
    
    emit(EventType.ROYAL_TRIAL_COMPLETED, { trial, success: true });
    return true;
  } else {
    // Wrong answer - trial by fire!
    if (state.log) {
      state.log("WRONG! TRIAL BY FIRE!", "combat");
    }
    
    // Deal fire damage to offender
    if (trial.offender.hp) {
      trial.offender.hp -= 10;
      if (trial.offender.hp <= 0) {
        if (state.log) {
          state.log(`${trial.offender.name} was incinerated by the Gumball Guardian!`, "combat");
        }
      }
    }
    
    emit(EventType.ROYAL_TRIAL_COMPLETED, { trial, success: false });
    return false;
  }
}

/**
 * Update the eternal psychic battle
 */
function updatePsychicBattle(state) {
  const battle = CandyKingdomEvents.psychicBattle;
  
  if (!battle.active) return;
  
  battle.turnsElapsed++;
  
  // Random power fluctuations (they're evenly matched)
  const flux = (Math.random() - 0.5) * 2;
  battle.goliadPower += flux;
  battle.stormoPower -= flux;
  
  // Keep powers balanced (eternal stalemate)
  if (Math.abs(battle.goliadPower - battle.stormoPower) > 10) {
    battle.goliadPower = 50;
    battle.stormoPower = 50;
  }
  
  // Occasional psychic waves affect nearby areas
  if (battle.turnsElapsed % 100 === 0) {
    if (state.log && state.cx === 0 && state.cy === 0) {
      state.log("Psychic waves ripple from the castle roof...", "magic");
    }
    
    // Small chance to affect nearby NPCs
    if (state.npcs && Math.random() < 0.1) {
      state.npcs.forEach(npc => {
        if (Math.abs(npc.x - 24) < 5 && Math.abs(npc.y - 8) < 5) {
          npc.confused = true;
          npc.confusedDuration = 10;
        }
      });
    }
  }
}

/**
 * Handle subway arrivals and departures
 */
function scheduleSubwayArrivals(state) {
  const subway = CandyKingdomEvents.subway;
  
  // Trains arrive every 50-100 turns
  subway.nextArrival = (state.turn || 0) + 50 + Math.floor(Math.random() * 50);
}

/**
 * Check for subway arrival
 */
export function checkSubwayArrival(state) {
  const subway = CandyKingdomEvents.subway;
  
  if (state.turn >= subway.nextArrival) {
    if (state.log && state.cx === 0 && state.cy === 0) {
      state.log("A subway train arrives at the station.", "note");
    }
    
    // Schedule next arrival
    scheduleSubwayArrivals(state);
    
    // Chance for new NPCs to arrive
    if (Math.random() < 0.3) {
      spawnSubwayPassenger(state);
    }
  }
}

/**
 * Spawn a passenger from the subway
 */
function spawnSubwayPassenger(state) {
  const passengerTypes = [
    { name: 'Commuter Candy', faction: 'peasants', traits: ['tired', 'busy'] },
    { name: 'Tourist Taffy', faction: 'peasants', traits: ['excited', 'lost'] },
    { name: 'Business Butterscotch', faction: 'merchants', traits: ['wealthy', 'impatient'] }
  ];
  
  const passenger = passengerTypes[Math.floor(Math.random() * passengerTypes.length)];
  
  // Spawn near subway entrance
  if (state.spawnNPC) {
    state.spawnNPC({
      ...passenger,
      x: 35,
      y: 19,
      hp: 15,
      hpMax: 15,
      temporary: true, // Will leave after a while
      destination: { x: Math.floor(Math.random() * 48), y: Math.floor(Math.random() * 22) }
    });
  }
  
  if (state.log) {
    state.log(`${passenger.name} emerges from the subway.`, "note");
  }
}

/**
 * Handle criminal activity in bad part of town
 */
export function updateCriminalActivity(state) {
  const crime = CandyKingdomEvents.crimeActivity;
  
  // Pup Gang activity (mostly at night)
  if (crime.pupGangActive && CandyKingdomEvents.timeOfDay === 'night') {
    // Random crimes
    if (Math.random() < 0.05) {
      const crimes = [
        { type: 'purse_snatch', message: "A purse was snatched in the bad part of town!" },
        { type: 'vandalism', message: "The Pup Gang tagged a wall with graffiti!" },
        { type: 'robbery', message: "The candy store was robbed!" }
      ];
      
      const newCrime = crimes[Math.floor(Math.random() * crimes.length)];
      crime.recentCrimes.push(newCrime);
      
      if (state.log) {
        state.log(newCrime.message, "combat");
      }
      
      // Banana Guards respond
      crime.guardAlert = 'heightened';
      
      emit(EventType.CRIME_COMMITTED, { crime: newCrime });
    }
  }
  
  // Guards calm down over time
  if (crime.guardAlert === 'heightened' && Math.random() < 0.1) {
    crime.guardAlert = 'normal';
    if (state.log) {
      state.log("The Banana Guards return to normal patrol.", "note");
    }
  }
}

/**
 * Handle Pizza Sassy's delivery
 */
export function triggerPizzaDelivery(state) {
  if (CandyKingdomEvents.timeOfDay === 'night') return; // No night deliveries
  
  if (Math.random() < 0.02) { // 2% chance per turn during day
    if (state.log) {
      state.log("A Pizza Sassy's delivery car zooms through the streets!", "note");
    }
    
    // Create delivery path
    const delivery = {
      start: { x: 15, y: 4 }, // Pizza Sassy's
      destination: { 
        x: Math.floor(Math.random() * 48), 
        y: Math.floor(Math.random() * 22) 
      },
      progress: 0
    };
    
    emit(EventType.PIZZA_DELIVERY, { delivery });
  }
}

/**
 * Main update function for all Candy Kingdom events
 */
export function updateCandyKingdomEvents(state) {
  // Only update if in Candy Kingdom
  if (state.biome !== 'candy_kingdom') return;
  
  updateTimeOfDay(state);
  checkBackRubbingCeremony(state);
  checkSubwayArrival(state);
  updateCriminalActivity(state);
  updatePsychicBattle(state);
  triggerPizzaDelivery(state);
  
  // Check for any active trials
  if (CandyKingdomEvents.royalPromise.activeTrials.length > 0) {
    // Handle ongoing trials
    CandyKingdomEvents.royalPromise.activeTrials.forEach(trial => {
      if (!trial.frozen && state.turn - trial.started > 10) {
        // Auto-fail if no answer after 10 turns
        answerTrialQuestion(state, trial, -1);
      }
    });
  }
}