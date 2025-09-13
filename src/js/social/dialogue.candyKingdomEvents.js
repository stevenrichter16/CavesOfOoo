// src/js/social/dialogue.candyKingdomEvents.js
// Special dialogue for Candy Kingdom events and characters

import { DialogueGenerator } from './dialogue.js';
import { CandyKingdomEvents, triggerRoyalPromiseTrial, answerTrialQuestion } from '../world/candyKingdomEvents.js';

export function registerCandyKingdomEventDialogue(dialogueGen) {
  dialogueGen.templatesByType = dialogueGen.templatesByType || {};
  dialogueGen.trees = dialogueGen.trees || {};
  
  // === GUMBALL GUARDIAN DIALOGUE ===
  dialogueGen.templatesByType.gumball_guardian = {
    greeting: [
      "HALT. STATE YOUR BUSINESS.",
      "I SAFEGUARD THE CANDY PEOPLE.",
      "WELCOME, CITIZEN."
    ],
    warning: [
      "DO NOT BREAK THE ROYAL PROMISE.",
      "TRIAL BY FIRE OR MATH AWAITS PROMISE-BREAKERS.",
      "I AM WATCHING."
    ],
    bubble: [
      "*blows bubbles peacefully*",
      "*bubble* *bubble* *bubble*",
      "Mom says bubbles are nice."
    ]
  };
  
  dialogueGen.trees['gumball_guardian_1'] = function(ctx) {
    // Check if there's an active trial
    if (CandyKingdomEvents.royalPromise.activeTrials.length > 0) {
      const trial = CandyKingdomEvents.royalPromise.activeTrials[0];
      return {
        text: `MATH QUESTION: ${trial.question.q}`,
        options: [
          { label: "3", action: () => answerTrialQuestion(ctx.state, trial, 3) },
          { label: "4", action: () => answerTrialQuestion(ctx.state, trial, 4) },
          { label: "5", action: () => answerTrialQuestion(ctx.state, trial, 5) },
          { label: "16", action: () => answerTrialQuestion(ctx.state, trial, 16) }
        ]
      };
    }
    
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.gumball_guardian.greeting),
      options: [
        { label: "I'm just visiting", next: () => ({
            text: "PROCEED. DO NOT CAUSE TROUBLE.",
            options: [{ label: "I won't" }]
        })},
        { label: "What's a Royal Promise?", next: () => ({
            text: "A SACRED VOW. BREAKING IT TRIGGERS TRIAL BY FIRE... OR MATH.",
            options: [{ label: "Understood" }]
        })},
        { label: "Nice bubbles", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.gumball_guardian.bubble),
            options: [{ label: "Cute" }]
        })},
        { label: "Goodbye" }
      ]
    };
  };
  
  dialogueGen.trees['gumball_guardian_2'] = dialogueGen.trees['gumball_guardian_1'];
  
  // === PRINCESS BUBBLEGUM DIALOGUE ===
  dialogueGen.templatesByType.princess_bubblegum = {
    greeting: [
      "Welcome to the Candy Kingdom!",
      "Oh, hello there. How can I help you?",
      "I'm quite busy with my experiments, but what do you need?"
    ],
    science: [
      "Science is the key to protecting my subjects.",
      "I've been working on a new candy biomass formula.",
      "The molecular structure of candy is fascinating!"
    ],
    kingdom: [
      "The Candy People are my responsibility.",
      "I must protect them from all threats.",
      "This kingdom is built on more than just sugar."
    ]
  };
  
  dialogueGen.trees['princess_bubblegum'] = function(ctx) {
    // Check if ceremony is active
    if (CandyKingdomEvents.backRubbingCeremony.isActive) {
      return {
        text: "The Back-Rubbing Ceremony is today! The Royal Tarts must arrive safely.",
        options: [
          { label: "I'll help protect them", next: () => ({
              text: "Thank you! The Banana Guards could use assistance.",
              options: [{ label: "On my way" }]
          })},
          { label: "What are Royal Tarts?", next: () => ({
              text: "The most delicious treats in Ooo, served only at the ceremony.",
              options: [{ label: "Sounds amazing" }]
          })},
          { label: "Goodbye, Princess" }
        ]
      };
    }
    
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.princess_bubblegum.greeting),
      options: [
        { label: "Tell me about your science", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.princess_bubblegum.science),
            options: [{ label: "Fascinating" }]
        })},
        { label: "How's the kingdom?", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.princess_bubblegum.kingdom),
            options: [{ label: "You're a good ruler" }]
        })},
        { label: "About Goliad and Stormo...", next: () => ({
            text: "They're locked in eternal psychic combat on the roof. It's... complicated.",
            options: [{ label: "I see" }]
        })},
        { label: "Goodbye, Princess" }
      ]
    };
  };
  
  // === DOCTOR PRINCESS DIALOGUE ===
  dialogueGen.templatesByType.doctor_princess = {
    greeting: [
      "Hello, I'm Doctor Princess. Do you need medical attention?",
      "The Mental Hospital is quite busy today.",
      "Please keep your voice down. The patients need rest."
    ],
    medical: [
      "Candy physiology is unique and requires special care.",
      "Mental health is just as important as physical health.",
      "Some patients never leave... but we do our best."
    ]
  };
  
  dialogueGen.trees['doctor_princess'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.doctor_princess.greeting),
      options: [
        { label: "I need healing", action: () => {
            if (ctx.actor.hp < ctx.actor.hpMax) {
              ctx.actor.hp = Math.min(ctx.actor.hp + 10, ctx.actor.hpMax);
              return { text: "There, you should feel better now.", options: [{ label: "Thank you" }] };
            }
            return { text: "You seem fine to me.", options: [{ label: "Oh, okay" }] };
        }},
        { label: "Tell me about the hospital", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.doctor_princess.medical),
            options: [{ label: "Interesting" }]
        })},
        { label: "Goodbye, Doctor" }
      ]
    };
  };
  
  // === SASSY PEOPLE DIALOGUE ===
  dialogueGen.templatesByType.sassy_people = {
    greeting: [
      "Welcome to Pizza Sassy's! You want pizza or what?",
      "Yeah, yeah, welcome. Order or move along.",
      "Best pizza in the kingdom, not that you'd know quality."
    ],
    sassy: [
      "Your face looks like old pizza dough.",
      "Oh great, another 'customer'.",
      "We're all out of patience. Want pizza instead?"
    ],
    delivery: [
      "Delivery in 30 minutes or it's... still full price.",
      "Our delivery cars are the fastest! ...When they work.",
      "Petey's out on delivery. Again. That guy never stops."
    ]
  };
  
  dialogueGen.trees['sassy_sue'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.sassy_people.greeting),
      options: [
        { label: "One pizza please", next: () => ({
            text: "That'll be 10 gold. And a tip. A good tip.",
            options: [
              { label: "Pay 10 gold", action: () => {
                  if ((ctx.actor.gold || 0) >= 10) {
                    ctx.actor.gold -= 10;
                    return { text: "Here's your pizza. Try not to drop it.", options: [{ label: "Thanks... I guess" }] };
                  }
                  return { text: "No money? No pizza. NEXT!", options: [{ label: "Sorry" }] };
              }},
              { label: "Too expensive!" }
            ]
        })},
        { label: "Why so sassy?", next: () => ({
            text: "It's literally in our name. Pizza SASSY'S. Duh.",
            options: [{ label: "Fair point" }]
        })},
        { label: "Bye" }
      ]
    };
  };
  
  // === CINNAMON BUN DIALOGUE ===
  dialogueGen.templatesByType.cinnamon_bun = {
    greeting: [
      "Oh hey! Hi! Hello!",
      "Wow, you're talking to me!",
      "I'm Cinnamon Bun! I like things!"
    ],
    confused: [
      "Sometimes I forget what I'm doing.",
      "My brain feels like frosting sometimes.",
      "Princess Bubblegum says I'm special!"
    ]
  };
  
  dialogueGen.trees['cinnamon_bun'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.cinnamon_bun.greeting),
      options: [
        { label: "How are you?", next: () => ({
            text: "I'm great! I think! Wait, am I?",
            options: [{ label: "You're doing fine" }]
        })},
        { label: "What do you do here?", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.cinnamon_bun.confused),
            options: [{ label: "That's... nice" }]
        })},
        { label: "Bye Cinnamon Bun" }
      ]
    };
  };
  
  // === STARCHY DIALOGUE ===
  dialogueGen.templatesByType.starchy = {
    greeting: [
      "Have you heard about the conspiracy?",
      "*whispers* They're watching us...",
      "I know things. Terrible things."
    ],
    paranoid: [
      "The graveyard... it knows secrets.",
      "I've seen things in the night shift you wouldn't believe.",
      "Trust no one. Especially not me."
    ],
    stories: [
      "Want to hear about the blank-eyed girls?",
      "The dead tell no tales... except to me.",
      "My radio show reveals the TRUTH!"
    ]
  };
  
  dialogueGen.trees['starchy'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.starchy.greeting),
      options: [
        { label: "What conspiracy?", next: () => ({
            text: "The shadows move when no one's watching. The graves whisper names.",
            options: [{ label: "Uh... okay" }]
        })},
        { label: "Tell me a story", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.starchy.stories),
            options: [{ label: "Creepy!" }]
        })},
        { label: "Are you okay?", next: () => ({
            text: "No one is okay. We're all just candy waiting to melt.",
            options: [{ label: "Dark..." }]
        })},
        { label: "I should go" }
      ]
    };
  };
  
  // === TAVERN KEEPER (Dirt Beer Guy) ===
  dialogueGen.templatesByType.tavern_keeper = {
    greeting: [
      "Welcome to the tavern. It's under new management.",
      "We don't tolerate troublemakers anymore.",
      "Cherry Cream Soda and I run a respectable establishment now."
    ],
    drinks: [
      "We serve root beer, dirt beer, and candy cocktails.",
      "No more shady deals in my tavern.",
      "The Pup Gang isn't welcome here anymore."
    ]
  };
  
  dialogueGen.trees['dirt_beer_guy'] = function(ctx) {
    const timeOfDay = CandyKingdomEvents.timeOfDay;
    
    if (timeOfDay === 'night' && CandyKingdomEvents.crimeActivity.pupGangActive) {
      return {
        text: "Shh! The Pup Gang is sniffing around outside. Best stay in here.",
        options: [
          { label: "I'll be careful", next: () => ({
              text: "They usually hang out behind the tavern. Avoid that area.",
              options: [{ label: "Thanks for the warning" }]
          })},
          { label: "I'm not afraid of them" },
          { label: "Hide me!" }
        ]
      };
    }
    
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.tavern_keeper.greeting),
      options: [
        { label: "What do you serve?", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.tavern_keeper.drinks),
            options: [
              { label: "One root beer please", action: () => {
                  if ((ctx.actor.gold || 0) >= 3) {
                    ctx.actor.gold -= 3;
                    ctx.actor.hp = Math.min(ctx.actor.hp + 5, ctx.actor.hpMax);
                    return { text: "Here you go. Enjoy!", options: [{ label: "Thanks" }] };
                  }
                  return { text: "That's 3 gold.", options: [{ label: "Maybe later" }] };
              }},
              { label: "Just looking" }
            ]
        })},
        { label: "Any trouble lately?", next: () => ({
            text: "Less since we cleaned the place up. But the alley's still sketchy at night.",
            options: [{ label: "Good to know" }]
        })},
        { label: "Goodbye" }
      ]
    };
  };
  
  // === ORPHAN DIALOGUE ===
  dialogueGen.templatesByType.orphan = {
    greeting: [
      "*sniff* Hello...",
      "Are you here to adopt someone?",
      "The orphanage is cold and lonely."
    ],
    sad: [
      "Princess Bubblegum visits sometimes.",
      "We just want families.",
      "Baby Snaps cried all night again."
    ]
  };
  
  dialogueGen.trees['baby_snaps'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.orphan.greeting),
      options: [
        { label: "Are you okay?", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.orphan.sad),
            options: [{ label: "*pat head*", action: () => {
                ctx.target.happiness = (ctx.target.happiness || 0) + 10;
                return { text: "*sniff* Thank you...", options: [{ label: "You're welcome" }] };
            }}]
        })},
        { label: "Here's some candy", action: () => {
            ctx.target.happiness = (ctx.target.happiness || 0) + 20;
            return { text: "Really?! For me?! Thank you!", options: [{ label: "Enjoy!" }] };
        }},
        { label: "Goodbye" }
      ]
    };
  };
}