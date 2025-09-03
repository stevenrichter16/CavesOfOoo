// src/js/social/dialogue.js - Template-based dialogue generation system

import { RelationshipSystem } from './relationship.js';

export class DialogueGenerator {
  constructor() {
    this.templates = {
      // Attitude-based responses
      hostile: [
        "Get away from me, {insult}!",
        "I have nothing to say to you.",
        "Leave before I call the guards!",
        "You are not welcome here, {insult}.",
        "Back off before I make you regret it!"
      ],
      
      unfriendly: [
        "What do you want?",
        "Make it quick.",
        "I am busy. What is it?",
        "Hmph. You again.",
        "State your business and be gone."
      ],
      
      neutral: [
        "Hello there.",
        "Good day to you.",
        "Can I help you?",
        "Yes? What is it?",
        "Greetings, traveler."
      ],
      
      friendly: [
        "Good to see you!",
        "Hello, friend! How can I help?",
        "Always a pleasure!",
        "Welcome, welcome!",
        "Ah, just the person I wanted to see!"
      ],
      
      devoted: [
        "My dear friend! Wonderful to see you!",
        "Anything for you, my friend.",
        "I am at your service!",
        "You honor me with your presence!",
        "Whatever you need, just ask!"
      ],
      
      // Trait-specific responses
      greedy_gift: [
        "Ah! {item.name}! You know how to speak my language!",
        "More! Do you have anything else?",
        "Finally, someone who understands value.",
        "This will do... for now.",
        "Yes, yes! Material goods! The only truth in this world!"
      ],
      
      proud_insult: [
        "How DARE you speak to me that way!",
        "You will regret those words, {insult}!",
        "Insolent fool! Know your place!",
        "I will not forget this insult!",
        "My honor demands satisfaction for this slight!"
      ],
      
      proud_compliment: [
        "Well, at least someone recognizes quality.",
        "Your words show wisdom, finally.",
        "Yes, I am rather impressive, aren't I?",
        "Your praise is... acceptable.",
        "At last, someone with proper respect!"
      ],
      
      humble_compliment: [
        "Oh, you're too kind...",
        "I don't deserve such praise.",
        "Thank you, but I'm just doing my part.",
        "You flatter me.",
        "I'm nothing special, really."
      ],
      
      gossip_rumor: [
        "Oh! Did you hear about {rumor.subject}? They say {rumor.detail}!",
        "You didn't hear this from me, but... {rumor.detail}.",
        "The word on the street is that {rumor.detail}!",
        "I probably shouldn't tell you this, but {rumor.subject}... {rumor.detail}",
        "Between you and me, {rumor.detail}. Don't spread it around!"
      ],
      
      brave_threat: [
        "You don't scare me!",
        "I've faced worse than you!",
        "Threats won't work on me!",
        "Try it. I dare you.",
        "Your intimidation is wasted on me!"
      ],
      
      coward_threat: [
        "P-please don't hurt me!",
        "I'll do whatever you want!",
        "Take what you want and go!",
        "M-mercy! Please!",
        "I don't want any trouble!"
      ],
      
      aggressive_combat: [
        "Finally! Some action!",
        "I've been waiting for this!",
        "Let's settle this with steel!",
        "Come on then!",
        "Time to fight!"
      ],
      
      peaceful_combat: [
        "Can't we talk about this?",
        "Violence isn't the answer!",
        "Please, let's be reasonable!",
        "There must be another way!",
        "I don't want to fight!"
      ]
    };
    
    this.insults = [
      "scoundrel", "fool", "wretch", "knave", "cur",
      "villain", "miscreant", "rogue", "blackguard", "oaf"
    ];
    
    this.contextualResponses = {
      trade_success: [
        "A fair trade indeed!",
        "Pleasure doing business!",
        "May this benefit us both."
      ],
      trade_reject: [
        "I'm not interested in that.",
        "Find someone else for your deals.",
        "That's not worth my time."
      ],
      help_yes: [
        "Of course! I'll help you.",
        "You can count on me!",
        "Let's do this together."
      ],
      help_no: [
        "I can't help you with that.",
        "You're on your own.",
        "Find someone else."
      ]
    };
  }
  
  generate(npc, player, context = {}) {
    const rel = RelationshipSystem.getRelation(npc, player);
    const attitude = this.calculateAttitude(rel, npc, player);
    
    // Determine dialogue category based on context and traits
    let category = this.getDialogueCategory(attitude);
    
    // Override based on specific context
    if (context.action === "gift" && npc.hasTrait?.("greedy")) {
      category = "greedy_gift";
    } else if (context.action === "insult" && npc.hasTrait?.("proud")) {
      category = "proud_insult";
    } else if (context.action === "compliment") {
      if (npc.hasTrait?.("proud")) {
        category = "proud_compliment";
      } else if (npc.hasTrait?.("humble")) {
        category = "humble_compliment";
      }
    } else if (context.action === "threaten") {
      if (npc.hasTrait?.("brave")) {
        category = "brave_threat";
      } else if (npc.hasTrait?.("cowardly")) {
        category = "coward_threat";
      }
    } else if (context.action === "chat" && npc.hasTrait?.("gossipy")) {
      const rumors = npc.memory?.getShareableRumors?.() || [];
      if (rumors.length > 0) {
        category = "gossip_rumor";
      }
    } else if (context.combat) {
      if (npc.hasTrait?.("aggressive")) {
        category = "aggressive_combat";
      } else if (npc.hasTrait?.("peaceful")) {
        category = "peaceful_combat";
      }
    }
    
    // Get appropriate template list
    const list = this.templates[category] || this.templates.neutral;
    const template = list[Math.floor(Math.random() * list.length)];
    
    // Fill in template variables
    return this.fillTemplate(template, context, npc);
  }
  
  calculateAttitude(rel, npc, player) {
    let score = rel.value;
    
    // Factor in faction standing
    if (npc.faction) {
      const factionStanding = RelationshipSystem.getFactionStanding(
        player.id,
        npc.faction
      );
      score += factionStanding * 0.3;
    }
    
    // Factor in memory-based attitude
    if (npc.memory) {
      score += npc.memory.getAttitude(player.id) * 0.5;
    }
    
    // Factor in trust and respect
    score += rel.trust * 0.1;
    score += rel.respect * 0.1;
    
    return score;
  }
  
  getDialogueCategory(attitude) {
    if (attitude < -50) return "hostile";
    if (attitude < -20) return "unfriendly";
    if (attitude < 20) return "neutral";
    if (attitude < 50) return "friendly";
    return "devoted";
  }
  
  fillTemplate(template, context, npc) {
    let result = template;
    
    // Replace {insult}
    result = result.replace("{insult}", 
      this.insults[Math.floor(Math.random() * this.insults.length)]
    );
    
    // Replace {item.name}
    if (context.gift) {
      result = result.replace("{item.name}", context.gift.name || "this gift");
    }
    
    // Replace rumor placeholders
    const rumors = npc.memory?.getShareableRumors?.() || [];
    if (rumors.length > 0) {
      const rumor = rumors[0];
      result = result.replace("{rumor.subject}", rumor.subject || "someone");
      result = result.replace("{rumor.detail}", rumor.detail || "something interesting happened");
    }
    
    // Replace NPC name
    result = result.replace("{npc.name}", npc.name || "the NPC");
    
    // Replace player reference
    result = result.replace("{player}", context.playerName || "you");
    
    return result;
  }
  
  // Generate contextual one-liners for specific situations
  generateContextual(type, npc, success = true) {
    const key = type + (success ? "_success" : "_reject");
    const responses = this.contextualResponses[key] || this.contextualResponses[type];
    
    if (!responses) {
      return success ? "Very well." : "No.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}