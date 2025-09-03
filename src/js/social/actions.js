// src/js/social/actions.js - Social action definitions with effects

import { getTraitModifier } from './traits.js';

// Helper to compute intimidation from entity state
function computeIntimidationAura(entity) {
  // Check for status effects that add intimidation
  let aura = 0;
  
  // Fire/burning adds significant intimidation
  if (entity.statusEffects?.some(e => e.type === 'burn' || e.type === 'burning')) {
    aura += 5;
  }
  
  // Electric charge is scary
  if (entity.statusEffects?.some(e => e.type === 'shock')) {
    aura += 3;
  }
  
  // Being wet reduces intimidation
  if (entity.statusEffects?.some(e => e.type === 'wet' || e.type === 'water_slow')) {
    aura -= 2;
  }
  
  // Size/level based intimidation
  aura += (entity.level || 1) * 0.5;
  
  // Equipment bonus
  if (entity.weapon?.damage) {
    aura += Math.min(5, entity.weapon.damage / 2);
  }
  
  return Math.max(0, aura);
}

export const SocialActions = {
  chat: {
    baseCost: 0,
    requirements: ctx => {
      // Can't chat if relationship is too hostile
      return ctx.relation.value > -30;
    },
    effects: ctx => ({
      value: 1,
      trust: 0.5
    }),
    description: "Have a friendly conversation"
  },
  
  compliment: {
    baseCost: 0,
    requirements: ctx => true,
    effects: ctx => {
      // Proud NPCs love compliments, humble ones are less affected
      const proudMult = ctx.target.hasTrait?.("proud") ? 
        getTraitModifier("proud", "praiseEffect") : 1.0;
      const humbleMult = ctx.target.hasTrait?.("humble") ? 
        getTraitModifier("humble", "praiseEffect") : 1.0;
      
      const mult = proudMult * humbleMult;
      
      return {
        value: 3 * mult,
        respect: 2 * mult
      };
    },
    description: "Say something nice"
  },
  
  insult: {
    baseCost: 0,
    requirements: ctx => true,
    effects: ctx => {
      // Proud NPCs hate insults more
      const proudMult = ctx.target.hasTrait?.("proud") ? 
        getTraitModifier("proud", "insultSensitivity") : 1.0;
      const humbleMult = ctx.target.hasTrait?.("humble") ? 
        getTraitModifier("humble", "insultSensitivity") : 1.0;
      
      const mult = proudMult * humbleMult;
      
      return {
        value: -5 * mult,
        respect: -3 * mult
      };
    },
    // Mirror effect - target may fear aggressive insulters
    mirror: (ctx, eff) => ({
      fear: ctx.actor.hasTrait?.("aggressive") ? 2 : 0
    }),
    description: "Say something mean"
  },
  
  threaten: {
    baseCost: 0,
    requirements: ctx => {
      // Must be aggressive or already hostile
      return ctx.actor.hasTrait?.("aggressive") || ctx.relation.value < -20;
    },
    effects: ctx => {
      const str = ctx.actor.stats?.str || 10;
      const aura = computeIntimidationAura(ctx.actor);
      const intimidation = str + aura;
      
      // Brave resist, cowardly fold
      const resistMod = ctx.target.hasTrait?.("brave") ? 
        getTraitModifier("brave", "intimidationResist") : 0;
      const cowardMod = ctx.target.hasTrait?.("cowardly") ? 
        getTraitModifier("cowardly", "intimidationResist") : 0;
      
      const resistance = 10 + (ctx.target.stats?.str || 10) * 0.5 + 
                         resistMod * 10 + cowardMod * 10;
      
      const success = intimidation > resistance;
      
      return {
        value: -10,
        fear: success ? 15 : 5,
        respect: success ? -5 : 5 // Respect if they stand up to you
      };
    },
    // Mirror - threatening makes you feared slightly
    mirror: (ctx, eff) => ({
      value: -3,
      fear: 5
    }),
    description: "Intimidate with force"
  },
  
  gift: {
    baseCost: 1, // Requires an item
    requirements: ctx => {
      // Must have a gift item specified
      return ctx.gift !== undefined;
    },
    effects: ctx => {
      const baseValue = ctx.gift.value || 10;
      
      // Greedy love gifts, generous less impressed
      const greedyMult = ctx.target.hasTrait?.("greedy") ? 
        getTraitModifier("greedy", "giftEffectiveness") : 1.0;
      const generousMult = ctx.target.hasTrait?.("generous") ? 
        getTraitModifier("generous", "giftEffectiveness") : 1.0;
      
      const mult = greedyMult * generousMult;
      
      return {
        value: Math.floor(baseValue * mult / 10),
        trust: 2
      };
    },
    description: "Give an item as a gift"
  },
  
  share_rumor: {
    baseCost: 0,
    requirements: ctx => {
      // Must have rumors to share
      return ctx.actor.memory?.getShareableRumors?.()?.length > 0;
    },
    effects: ctx => {
      // Gossipy NPCs appreciate rumors more
      const gossipBonus = ctx.target.hasTrait?.("gossipy") ? 2 : 0;
      
      return {
        value: 1 + gossipBonus,
        trust: 1
      };
    },
    special: (ctx, state) => {
      // Transfer the rumor to target's memory
      const rumors = ctx.actor.memory.getShareableRumors();
      if (rumors.length > 0 && ctx.target.memory) {
        const rumor = rumors[0];
        ctx.target.memory.addRumor(rumor);
        rumor.spreadCount++;
        
        // Log the rumor spread
        if (state?.log) {
          state.log(`${ctx.actor.name} shares a rumor with ${ctx.target.name}`, "note");
        }
      }
    },
    description: "Share interesting information"
  },
  
  trade: {
    baseCost: 0,
    requirements: ctx => {
      // Both must have items to trade
      return (ctx.actor.inventory?.length > 0) && 
             (ctx.target.inventory?.length > 0);
    },
    effects: ctx => ({
      value: 2,
      trust: 3,
      respect: 1
    }),
    special: (ctx, state) => {
      // Could open trade UI here
      if (state?.openTradeUI) {
        state.openTradeUI(ctx.actor, ctx.target);
      }
    },
    description: "Propose a trade"
  },
  
  request_help: {
    baseCost: 0,
    requirements: ctx => {
      // Need good relationship or high trust
      return ctx.relation.value > 20 || ctx.relation.trust > 30;
    },
    effects: ctx => {
      // Effects depend on whether help was given
      const helpGiven = ctx.helpGiven || 
                       (ctx.relation.value > 40 && Math.random() < 0.7);
      
      return {
        value: helpGiven ? -1 : -3,
        trust: helpGiven ? 5 : -3
      };
    },
    special: (ctx, state) => {
      // Loyal NPCs more likely to help
      if (ctx.target.hasTrait?.("loyal")) {
        ctx.helpGiven = Math.random() < 0.9;
      }
    },
    description: "Ask for assistance"
  },
  
  bribe: {
    baseCost: 1, // Requires money/item
    requirements: ctx => {
      // Need something valuable to offer
      return ctx.bribe?.value >= 10;
    },
    effects: ctx => {
      // Greedy NPCs are more susceptible
      const bribeResist = ctx.target.hasTrait?.("greedy") ? 
        getTraitModifier("greedy", "bribeResist") : 0;
      
      const success = Math.random() < (0.5 - bribeResist);
      
      return {
        value: success ? 5 : -5,
        trust: success ? -2 : -5,
        respect: -3 // Lose respect either way
      };
    },
    description: "Offer a bribe"
  },
  
  recruit: {
    baseCost: 0,
    requirements: ctx => {
      // Very high relationship required
      return ctx.relation.value > 70 && ctx.relation.trust > 50;
    },
    effects: ctx => ({
      value: 5,
      trust: 10,
      respect: 5
    }),
    special: (ctx, state) => {
      // Add NPC to party/followers
      if (state?.addFollower) {
        state.addFollower(ctx.target);
      }
    },
    description: "Ask to join your party"
  }
};

// Helper to check if an action is available
export function isActionAvailable(actor, target, actionType, context = {}) {
  const action = SocialActions[actionType];
  if (!action) return false;
  
  const ctx = {
    actor,
    target,
    relation: context.relation || { value: 0, trust: 0, fear: 0, respect: 0 },
    ...context
  };
  
  return action.requirements(ctx);
}