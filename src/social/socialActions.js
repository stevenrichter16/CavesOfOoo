/**
 * Social Actions - Replacement for OLD actions.js
 * Provides action stubs and handlers for dialogue system
 */

/**
 * SocialActions object with all dialogue action handlers
 */
export const SocialActions = {
  // Trade actions
  trade: {
    open: (ctx) => {
      // Open trade UI
      if (ctx?.state?.openTradeUI) {
        ctx.state.openTradeUI(ctx.actor, ctx.target);
      } else if (ctx?.state?.openVendorShop) {
        ctx.state.openVendorShop(ctx.state, ctx.target);
      }
      return { success: true, opensShop: true };
    },
    apply: (ctx) => {
      // Alias for open
      return SocialActions.trade.open(ctx);
    }
  },
  
  // Haggle action
  haggle: {
    apply: (ctx) => {
      const relationshipBonus = ctx.relationship || 0;
      const discount = Math.min(0.2, relationshipBonus / 100); // Max 20% discount
      
      if (ctx.target?.memory) {
        ctx.target.memory.updateRelationship(ctx.actor?.id || 'player', 2);
      }
      
      return { 
        success: true, 
        discount,
        message: `You haggle and get a ${Math.round(discount * 100)}% discount!`
      };
    }
  },
  
  // Social interaction actions
  flatter: {
    apply: (ctx) => {
      if (ctx.target?.memory) {
        ctx.target.memory.updateRelationship(ctx.actor?.id || 'player', 5);
      }
      return { 
        success: true, 
        relationshipChange: 5,
        message: 'Your flattery is well received!'
      };
    }
  },
  
  compliment: {
    apply: (ctx) => {
      return SocialActions.flatter.apply(ctx);
    }
  },
  
  smalltalk: {
    apply: (ctx) => {
      if (ctx.target?.memory) {
        ctx.target.memory.updateRelationship(ctx.actor?.id || 'player', 1);
      }
      return { 
        success: true, 
        relationshipChange: 1,
        message: 'You have a pleasant conversation.'
      };
    }
  },
  
  chat: {
    apply: (ctx) => {
      return SocialActions.smalltalk.apply(ctx);
    }
  },
  
  greet: {
    apply: (ctx) => {
      if (ctx.target?.memory) {
        ctx.target.memory.remember({
          type: 'greeted',
          by: ctx.actor?.id || 'player',
          turn: ctx.state?.turn || 0
        });
      }
      return { 
        success: true, 
        message: 'You exchange greetings.'
      };
    }
  },
  
  report: {
    apply: (ctx) => {
      const detail = ctx.detail || 'suspicious activity';
      
      if (ctx.target?.memory) {
        ctx.target.memory.remember({
          type: 'report_received',
          detail,
          from: ctx.actor?.id || 'player',
          turn: ctx.state?.turn || 0
        });
        
        // Guards appreciate reports
        if (ctx.target.faction === 'guards') {
          ctx.target.memory.updateRelationship(ctx.actor?.id || 'player', 3);
        }
      }
      
      return { 
        success: true, 
        message: `You report ${detail} to ${ctx.target?.name || 'the NPC'}.`
      };
    }
  },
  
  // Quest-related actions
  acceptQuest: {
    apply: (ctx) => {
      const quest = ctx.quest;
      if (!quest) return { success: false, message: 'No quest to accept.' };
      
      const player = ctx.actor || ctx.state?.player;
      if (!player.quests) player.quests = { active: [], completed: [] };
      
      if (!player.quests.active.includes(quest.id)) {
        player.quests.active.push(quest.id);
      }
      
      return { 
        success: true, 
        quest: quest.id,
        message: `Quest accepted: ${quest.name || quest.id}`
      };
    }
  },
  
  turnInQuest: {
    apply: (ctx) => {
      const quest = ctx.quest;
      if (!quest) return { success: false, message: 'No quest to turn in.' };
      
      const player = ctx.actor || ctx.state?.player;
      if (!player.quests) return { success: false, message: 'No active quests.' };
      
      // Move from active to completed
      const index = player.quests.active.indexOf(quest.id);
      if (index >= 0) {
        player.quests.active.splice(index, 1);
        if (!player.quests.completed.includes(quest.id)) {
          player.quests.completed.push(quest.id);
        }
      }
      
      // Give rewards
      if (quest.rewards) {
        if (quest.rewards.gold) {
          player.gold = (player.gold || 0) + quest.rewards.gold;
        }
        if (quest.rewards.xp) {
          player.xp = (player.xp || 0) + quest.rewards.xp;
        }
      }
      
      return { 
        success: true, 
        quest: quest.id,
        rewards: quest.rewards,
        message: `Quest completed: ${quest.name || quest.id}`
      };
    }
  }
};

// Export for backward compatibility
export default SocialActions;