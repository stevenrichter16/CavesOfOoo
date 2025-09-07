import { describe, it, expect, beforeEach } from 'vitest';

describe('Dialogue Template System - Phase 7', () => {
  
  describe('DialogueTemplate Class', () => {
    it('should create template with variables', () => {
      const { DialogueTemplate } = require('../../src/social/dialogue/DialogueTemplate.js');
      
      const template = new DialogueTemplate(
        "Hello {player.name}, I am {npc.name} the {npc.role}!"
      );
      
      const context = {
        player: { name: 'Finn' },
        npc: { name: 'Jake', role: 'adventurer' }
      };
      
      const result = template.render(context);
      expect(result).toBe("Hello Finn, I am Jake the adventurer!");
    });
    
    it('should support conditional templates', () => {
      const { DialogueTemplate } = require('../../src/social/dialogue/DialogueTemplate.js');
      
      const template = new DialogueTemplate(
        "{if attitude.friendly}Hey friend!{else}Who are you?{/if}"
      );
      
      const friendlyContext = { attitude: { friendly: true } };
      const neutralContext = { attitude: { friendly: false } };
      
      expect(template.render(friendlyContext)).toBe("Hey friend!");
      expect(template.render(neutralContext)).toBe("Who are you?");
    });
    
    it('should select random variant', () => {
      const { DialogueTemplate } = require('../../src/social/dialogue/DialogueTemplate.js');
      
      const template = new DialogueTemplate([
        "Hello there!",
        "Greetings!",
        "Hi!"
      ]);
      
      const result = template.render({});
      expect(["Hello there!", "Greetings!", "Hi!"]).toContain(result);
    });
  });
  
  describe('DialogueManager', () => {
    it('should load kingdom dialogue templates', async () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      await manager.loadKingdom('candy');
      
      expect(manager.hasDialogue('candy', 'greet')).toBe(true);
      expect(manager.hasDialogue('candy', 'farewell')).toBe(true);
    });
    
    it('should fall back to default dialogue', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const dialogue = manager.getDialogue('unknown_kingdom', 'greet', {});
      
      expect(dialogue).toBeDefined();
      expect(typeof dialogue).toBe('string');
    });
    
    it('should use kingdom-specific dialogue when available', async () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      await manager.loadKingdom('candy');
      
      const context = {
        player: { name: 'Finn' },
        npc: { name: 'Peppermint Butler', role: 'butler' }
      };
      
      const dialogue = manager.getDialogue('candy', 'greet', context);
      
      // Check for any Candy Kingdom specific term
      const hasCandyTerms = 
        dialogue.includes('mathematical') || 
        dialogue.includes('algebraic') ||
        dialogue.includes('sweet') ||
        dialogue.includes('Sweet') ||
        dialogue.includes('sugar') ||
        dialogue.includes('glob') ||
        dialogue.includes('candy') ||
        dialogue.includes('Candy Kingdom');
      
      expect(hasCandyTerms).toBe(true);
    });
  });
  
  describe('Kingdom Dialogue Templates', () => {
    describe('Candy Kingdom', () => {
      it('should have sweet-themed dialogue', async () => {
        const candyModule = await import('../../src/social/dialogue/templates/candy.dialogue.js');
        const CANDY_DIALOGUE = candyModule.CANDY_DIALOGUE;
        
        expect(CANDY_DIALOGUE.greet).toBeDefined();
        expect(CANDY_DIALOGUE.compliment).toBeDefined();
        expect(CANDY_DIALOGUE.trade).toBeDefined();
        
        const greetings = CANDY_DIALOGUE.greet.variants || [CANDY_DIALOGUE.greet.template];
        const hasCandyTerms = greetings.some(g => 
          g.includes('sweet') || 
          g.includes('mathematical') || 
          g.includes('algebraic') ||
          g.includes('glob') ||
          g.includes('Sweet')
        );
        
        expect(hasCandyTerms).toBe(true);
      });
      
      it('should reference Princess Bubblegum', () => {
        const { CANDY_DIALOGUE } = require('../../src/social/dialogue/templates/candy.dialogue.js');
        
        expect(CANDY_DIALOGUE.praise_princess).toBeDefined();
        expect(CANDY_DIALOGUE.praise_princess.template).toContain('Princess Bubblegum');
      });
    });
    
    describe('Fire Kingdom', () => {
      it('should have aggressive/passionate dialogue', () => {
        const { FIRE_DIALOGUE } = require('../../src/social/dialogue/templates/fire.dialogue.js');
        
        expect(FIRE_DIALOGUE.greet).toBeDefined();
        expect(FIRE_DIALOGUE.challenge).toBeDefined();
        
        const greetings = FIRE_DIALOGUE.greet.variants || [FIRE_DIALOGUE.greet.template];
        const hasFireTerms = greetings.some(g => 
          g.includes('flame') || 
          g.includes('burn') || 
          g.includes('heat')
        );
        
        expect(hasFireTerms).toBe(true);
      });
    });
    
    describe('Ice Kingdom', () => {
      it('should have formal/cold dialogue', () => {
        const { ICE_DIALOGUE } = require('../../src/social/dialogue/templates/ice.dialogue.js');
        
        expect(ICE_DIALOGUE.greet).toBeDefined();
        expect(ICE_DIALOGUE.formal_greeting).toBeDefined();
        
        const greetings = ICE_DIALOGUE.greet.variants || [ICE_DIALOGUE.greet.template];
        const hasIceTerms = greetings.some(g => 
          g.includes('cool') || 
          g.includes('frost') || 
          g.includes('chill')
        );
        
        expect(hasIceTerms).toBe(true);
      });
      
      it('should have scientific dialogue', async () => {
        const iceModule = await import('../../src/social/dialogue/templates/ice.dialogue.js');
        const ICE_DIALOGUE = iceModule.ICE_DIALOGUE;
        
        expect(ICE_DIALOGUE.discuss_science).toBeDefined();
        const scienceDialogue = ICE_DIALOGUE.discuss_science.variants || [ICE_DIALOGUE.discuss_science.template];
        
        const hasScienceTerms = scienceDialogue.some(d => 
          d.includes('hypothesis') || 
          d.includes('experiment') || 
          d.includes('theory') ||
          d.includes('molecular') ||
          d.includes('crystalline')
        );
          
        expect(hasScienceTerms).toBe(true);
      });
    });
    
    describe('Slime Kingdom', () => {
      it('should have gooey/silly dialogue', () => {
        const { SLIME_DIALOGUE } = require('../../src/social/dialogue/templates/slime.dialogue.js');
        
        expect(SLIME_DIALOGUE.greet).toBeDefined();
        
        const greetings = SLIME_DIALOGUE.greet.variants || [SLIME_DIALOGUE.greet.template];
        const hasSlimeTerms = greetings.some(g => 
          g.includes('slime') || 
          g.includes('goo') || 
          g.includes('ooze')
        );
        
        expect(hasSlimeTerms).toBe(true);
      });
    });
  });
  
  describe('Dialogue Context Variables', () => {
    it('should support player variables', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const context = {
        player: {
          name: 'Finn',
          title: 'the Human',
          level: 10
        }
      };
      
      const template = "{player.name} {player.title}, level {player.level}";
      const result = manager.renderTemplate(template, context);
      
      expect(result).toBe("Finn the Human, level 10");
    });
    
    it('should support NPC variables', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const context = {
        npc: {
          name: 'Jake',
          role: 'adventurer',
          faction: 'good_guys'
        }
      };
      
      const template = "I'm {npc.name}, a {npc.role} with the {npc.faction}";
      const result = manager.renderTemplate(template, context);
      
      expect(result).toBe("I'm Jake, a adventurer with the good_guys");
    });
    
    it('should support schedule variables', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      const { DutyType } = require('../../src/social/schedule.js');
      
      const context = {
        npc: {
          currentDuty: DutyType.TRADING
        },
        time: {
          hour: 14,
          period: 'afternoon'
        }
      };
      
      const template = "I'm {npc.currentDuty} this {time.period}";
      const result = manager.renderTemplate(template, context);
      
      expect(result).toBe("I'm trading this afternoon");
    });
  });
  
  describe('Attitude-Based Dialogue', () => {
    it('should select dialogue based on attitude', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const friendlyContext = { attitude: 'friendly' };
      const hostileContext = { attitude: 'hostile' };
      const neutralContext = { attitude: 'neutral' };
      
      const friendlyGreet = manager.getDialogueForAttitude('greet', friendlyContext);
      const hostileGreet = manager.getDialogueForAttitude('greet', hostileContext);
      const neutralGreet = manager.getDialogueForAttitude('greet', neutralContext);
      
      expect(friendlyGreet).not.toBe(hostileGreet);
      expect(friendlyGreet).not.toBe(neutralGreet);
    });
  });
  
  describe('Dialogue Tags', () => {
    it('should support emotion tags', () => {
      const { DialogueTemplate } = require('../../src/social/dialogue/DialogueTemplate.js');
      
      const template = new DialogueTemplate(
        "{emotion:happy}I'm so glad to see you!",
        { tags: ['happy', 'friendly'] }
      );
      
      expect(template.tags).toContain('happy');
      expect(template.tags).toContain('friendly');
    });
    
    it('should filter dialogue by tags', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const happyDialogue = manager.getDialogueByTag('happy');
      const sadDialogue = manager.getDialogueByTag('sad');
      
      expect(happyDialogue).toBeDefined();
      expect(sadDialogue).toBeDefined();
      expect(happyDialogue).not.toBe(sadDialogue);
    });
  });
  
  describe('Dialogue History', () => {
    it('should track used dialogue to avoid repetition', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const context = { npc: { id: 'npc1' } };
      
      // Get multiple greetings to ensure variety
      const dialogues = new Set();
      for (let i = 0; i < 10; i++) {
        const dialogue = manager.getDialogue('default', 'greet', context);
        dialogues.add(dialogue);
      }
      
      // Should have multiple variants (at least 2)
      expect(dialogues.size).toBeGreaterThan(1);
    });
  });
});