// src/js/social/dialogue.candyMarket.js
// Registers Candy Market dialogue trees & templates.

import { DialogueGenerator } from './dialogue.js';
import { SocialActions } from '../../social/socialActions.js';

// Initialize stub methods for actions that don't exist yet
function initializeActionStubs() {
  if (!SocialActions.trade.open) {
    SocialActions.trade.open = (ctx) => {
      // Open trade UI
      if (ctx.state?.openTradeUI) {
        ctx.state.openTradeUI(ctx.actor, ctx.target);
      }
      return { success: true };
    };
  }

  if (!SocialActions.trade.apply) {
    SocialActions.trade.apply = SocialActions.trade.open;
  }

  if (!SocialActions.haggle) {
    SocialActions.haggle = {
      requirements: (ctx) => true, // Always available
      apply: (ctx) => {
        // Haggle logic
        return { success: true, message: "You negotiate prices." };
      },
      baseCost: 0,
      effects: ctx => ({ value: 1, trust: 0.5 }),
      description: "Try to negotiate better prices"
    };
  }

  if (!SocialActions.flatter) {
    SocialActions.flatter = SocialActions.compliment || {
      requirements: (ctx) => true,
      apply: (ctx) => {
        // Compliment/flatter logic
        return { success: true, message: "You compliment them." };
      },
      baseCost: 0,
      effects: ctx => ({ value: 2, respect: 1 }),
      description: "Flatter them with compliments"
    };
  }

  if (!SocialActions.smalltalk) {
    SocialActions.smalltalk = SocialActions.chat || {
      requirements: (ctx) => true,
      apply: (ctx) => {
        // Chat logic
        return { success: true, message: "You have a chat." };
      },
      baseCost: 0,
      effects: ctx => ({ value: 1, trust: 0.5 }),
      description: "Engage in small talk"
    };
  }

  if (!SocialActions.greet) {
    SocialActions.greet = {
      requirements: (ctx) => true,
      apply: (ctx) => {
        // Greeting logic
        return { success: true, message: "You greet them politely." };
      },
      baseCost: 0,
      effects: ctx => ({ value: 1, trust: 0 }),
      description: "Greet them politely"
    };
  }

  if (!SocialActions.report) {
    SocialActions.report = {
      requirements: (ctx) => ctx.target.faction === 'guards', // Only for guards
      apply: (ctx) => {
        // Report logic
        return { success: true, message: "You report the issue." };
      },
      baseCost: 0,
      effects: ctx => ({ respect: 2, trust: 1 }),
      description: "Report an incident"
    };
  }
}

// Call initialization
initializeActionStubs();

export function registerCandyMarketDialogue(dialogueGen) {
  // ── TYPE-LEVEL templates to keep things DRY ────────────────────────────────
  dialogueGen.templatesByType = dialogueGen.templatesByType || {};

  dialogueGen.templatesByType.merchant_vendor = {
    greeting: [
      "Sweet deals! Step right up!",
      "Fresh confections, fair prices!",
      "Welcome, traveler—care for a taste?"
    ],
    smalltalk: [
      "Busy day in the plaza.",
      "Banana Guards keep the streets safe—usually.",
      "The fountain brings good luck… and crumbs."
    ],
    tradeOpen: [
      "What tickles your sweet tooth?",
      "Take a look—something sugary for everyone.",
      "I can make you a candy-sweet bargain."
    ],
    refuse: [
      "No refunds on sticky goods.",
      "Sorry, that's all I've got right now."
    ]
  };

  dialogueGen.templatesByType.choose_goose = {
    greeting: [
      "Choose Goose! Choose goods! Choose… me!",
      "Rhymes and dimes! Pay my fines!",
      "Treasure for pleasure! Coins for joins!"
    ],
    tradeOpen: [
      "A trinket for a ticket to delight?",
      "Mmm… baubles! Shiny! Tiny! Buy-y!"
    ],
    smalltalk: [
      "Beware the deal that feels too real.",
      "Good rhymes make good times."
    ],
    refuse: [ "No choosing? No goosing." ]
  };

  dialogueGen.templatesByType.guard_market = {
    greeting: [
      "Move along—keep the stalls clear.",
      "All's calm in the plaza today.",
      "Report any tart-nappers immediately."
    ],
    smalltalk: [
      "Pizza Sassy's smells great on patrol.",
      "We lost a barrel to a sugar-rush stampede once."
    ]
  };

  dialogueGen.templatesByType.peppermint_butler = {
    greeting: [
      "Ah. Hello.",
      "How… interesting to see you here.",
      "Careful where you step; the plaza hears things."
    ],
    smalltalk: [
      "Some doors open only once.",
      "A sweet tooth can be a sharp fang."
    ],
    refuse: [ "Not now." ]
  };

  dialogueGen.templatesByType.root_beer_guy = {
    greeting: [
      "Oh! Hi there!",
      "Just on break, don't mind me."
    ],
    smalltalk: [
      "I'm writing a new story about a brave bottle.",
      "Desk job's okay. Market air's better."
    ]
  };

  // ── NPC-SPECIFIC branching trees (lightweight) ─────────────────────────────
  // Each returns { text, options:[{label,next?,action?}] }
  dialogueGen.trees = dialogueGen.trees || {};

  dialogueGen.trees['choose_goose'] = function(ctx) {
    const openTrade = () => ({
      text: dialogueGen.pick(dialogueGen.templatesByType.choose_goose.tradeOpen),
      options: [
        { label: "Buy (open shop)", action: () => SocialActions.trade.open(ctx) },
        { label: "Haggle", next: 'haggle' },
        { label: "Goodbye" }
      ]
    });
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.choose_goose.greeting),
      options: [
        { label: "Browse wares", next: openTrade },
        { label: "Compliment rhyme", action: () => SocialActions.flatter.apply(ctx) },
        { label: "Goodbye" }
      ]
    };
  };

  dialogueGen.trees['peppermint_butler'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.peppermint_butler.greeting),
      options: [
        { label: "Polite greeting", action: () => SocialActions.greet.apply(ctx) },
        { label: "Ask for tip", next: () => ({
            text: "North at the fountain. Ask twice, never thrice.",
            options: [ { label: "Thanks" } ]
        })},
        { label: "Goodbye" }
      ]
    };
  };

  dialogueGen.trees['banana_guard_1'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.guard_market.greeting),
      options: [
        { label: "Any trouble?", next: () => ({
            text: "Keep crosswalks clear. And… no tart jokes.",
            options: [ { label: "Got it" } ]
        })},
        { label: "Report a disturbance", action: () => SocialActions.report.apply({
            ...ctx, report: { type: 'suspicious_activity', severity: 1 }
        })},
        { label: "Goodbye" }
      ]
    };
  };

  dialogueGen.trees['root_beer_guy'] = function(ctx) {
    return {
      text: dialogueGen.pick(dialogueGen.templatesByType.root_beer_guy.greeting),
      options: [
        { label: "Smalltalk", next: () => ({
            text: dialogueGen.pick(dialogueGen.templatesByType.root_beer_guy.smalltalk),
            options: [ { label: "Heh" }, { label: "Goodbye" } ]
        })},
        { label: "Ask about work", next: () => ({
            text: "Phones ring. Hearts sing. Paperwork… everything.",
            options: [ { label: "Good luck!" } ]
        })},
        { label: "Goodbye" }
      ]
    };
  };

  // Vendors share a generic tree that opens trade and uses your SocialActions
  [
    'candy_corn_vendor','lollipops_vendor','gumdrops_vendor','taffy_vendor',
    'chocolate_vendor','peppermints_vendor','rock_candy_vendor','cotton_candy_vendor'
  ].forEach(id => {
    dialogueGen.trees[id] = function(ctx) {
      return {
        text: dialogueGen.pick(dialogueGen.templatesByType.merchant_vendor.greeting),
        options: [
          { label: "Browse goods", action: () => SocialActions.trade.open(ctx) },
          { label: "Haggle",       action: () => SocialActions.haggle.apply(ctx) },
          { label: "Compliment",   action: () => SocialActions.flatter.apply(ctx) },
          { label: "Goodbye" }
        ]
      };
    };
  });

  // Peasants generic
  ['gummy_bear','jellybean_joe','marshmallow_mike'].forEach(id => {
    dialogueGen.trees[id] = function(ctx) {
      return {
        text: "Hi!",
        options: [
          { label: "Chit-chat", action: () => SocialActions.smalltalk.apply(ctx) },
          { label: "Ask directions", next: () => ({
              text: "The fountain's center, hotel to the north, carts to the west.",
              options: [ { label: "Thanks!" } ]
          })},
          { label: "Goodbye" }
        ]
      };
    };
  });
}