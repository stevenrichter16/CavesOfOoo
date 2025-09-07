import { describe, it, expect, beforeEach } from 'vitest';

describe('Phase 7 Integration - Data-Driven Actions & Dialogue', () => {
  
  describe('Integration with Schedule System (Phase 6)', () => {
    it('should restrict actions based on NPC duty', () => {
      const defaultRegistry = require('../../src/social/actions/registry.js').default;
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      const { DutyType, getCurrentDuty, Schedule, TimeOfDay } = require('../../src/social/schedule.js');
      const { NPC } = require('../../src/social/npc.js');
      
      const registry = defaultRegistry;
      
      // Create schedule for merchant
      const schedule = new Schedule({
        [TimeOfDay.MORNING]: DutyType.SETUP_SHOP,
        [TimeOfDay.AFTERNOON]: DutyType.TRADING,
        [TimeOfDay.EVENING]: DutyType.REST,
        [TimeOfDay.NIGHT]: DutyType.SLEEP
      });
      
      const npc = new NPC({
        id: 'merchant1',
        name: 'Merchant Mike',
        role: 'merchant',
        factions: ['candy_merchants']
      });
      npc.schedule = schedule;
      
      // During trading hours
      const tradingContext = {
        npc: npc,
        hour: 14, // Afternoon - trading time
        attitude: 'neutral'
      };
      
      const tradingActions = registry.getAvailable(tradingContext);
      expect(tradingActions.some(a => a.id === 'trade')).toBe(true);
      
      // During sleep
      const sleepContext = {
        npc: npc,
        hour: 23, // Night - sleep time
        attitude: 'neutral'
      };
      
      const sleepActions = registry.getAvailable(sleepContext);
      expect(sleepActions.some(a => a.id === 'trade')).toBe(false);
    });
    
    it('should modify dialogue based on current duty', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const { DutyType } = require('../../src/social/schedule.js');
      
      const manager = new DialogueManager();
      
      const tradingContext = {
        npc: {
          name: 'Merchant Mike',
          currentDuty: DutyType.TRADING
        }
      };
      
      const sleepingContext = {
        npc: {
          name: 'Merchant Mike',
          currentDuty: DutyType.SLEEP
        }
      };
      
      const tradingDialogue = manager.getDialogue('candy', 'greet', tradingContext);
      const sleepingDialogue = manager.getDialogue('candy', 'greet', sleepingContext);
      
      expect(tradingDialogue).toContain('browse my wares');
      expect(sleepingDialogue).toContain('zzz');
    });
  });
  
  describe('Integration with Rumor System (Phase 5)', () => {
    it('should create rumors through share_rumor action', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      const { createRumor } = require('../../src/social/rumors.js');
      const { NPC } = require('../../src/social/npc.js');
      
      const npc = new NPC({
        id: 'gossip1',
        name: 'Gossip Greta',
        role: 'gossip',
        factions: ['candy_citizens']
      });
      
      const rumor = createRumor({
        type: 'trade',
        severity: 'major',
        content: 'Prices are rising!',
        details: 'Prices are rising!'
      });
      
      const context = {
        state: { log: () => {} },
        player: { name: 'Finn' },
        npc: npc,
        params: { rumor }
      };
      
      const result = ACTIONS.share_rumor.apply(context);
      
      expect(result.success).toBe(true);
      expect(npc.memory.rumors).toContainEqual(expect.objectContaining({
        type: 'trade',
        details: 'Prices are rising!'
      }));
    });
    
    it('should generate rumor-specific dialogue', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const rumorContext = {
        action: 'share_rumor',
        rumor: {
          type: 'scandal',
          content: 'The princess was seen with a stranger!'
        }
      };
      
      const dialogue = manager.getDialogue('candy', 'share_rumor', rumorContext);
      
      expect(dialogue).toContain('heard');
      // Should reference the rumor content
    });
  });
  
  describe('Integration with Disguise System (Phase 4)', () => {
    it('should affect available actions based on disguise', () => {
      const defaultRegistry = require('../../src/social/actions/registry.js').default;
      const registry = defaultRegistry;
      
      const disguisedContext = {
        player: {
          disguise: { keys: ['candy_guard'], quality: 0.8 }
        },
        npc: { role: 'citizen' },
        attitude: 'neutral'
      };
      
      const undisguisedContext = {
        player: {},
        npc: { role: 'citizen' },
        attitude: 'neutral'
      };
      
      const disguisedActions = registry.getAvailable(disguisedContext);
      const normalActions = registry.getAvailable(undisguisedContext);
      
      // Guard-specific actions available when disguised
      expect(disguisedActions.some(a => a.id === 'arrest')).toBe(true);
      expect(normalActions.some(a => a.id === 'arrest')).toBe(false);
    });
    
    it('should modify dialogue for disguised player', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const disguisedContext = {
        player: {
          name: 'Finn',
          disguise: { keys: ['banana_guard'], quality: 0.9 }
        }
      };
      
      const dialogue = manager.getDialogue('candy', 'greet', disguisedContext);
      
      expect(dialogue).toContain('fellow guard');
      // or other guard-specific greeting
    });
  });
  
  describe('Integration with Contextual Relationships (Phase 3)', () => {
    it('should filter actions by relationship status', () => {
      const defaultRegistry = require('../../src/social/actions/registry.js').default;
      const registry = defaultRegistry;
      
      const friendContext = {
        relationship: { trust: 0.8, fear: 0.1, respect: 0.7 },
        attitude: 'friendly',
        npc: { role: 'citizen' }
      };
      
      const enemyContext = {
        relationship: { trust: 0.1, fear: 0.8, respect: 0.2 },
        attitude: 'hostile',
        npc: { role: 'citizen' }
      };
      
      const friendActions = registry.getAvailable(friendContext);
      const enemyActions = registry.getAvailable(enemyContext);
      
      expect(friendActions.some(a => a.id === 'hug')).toBe(true);
      expect(enemyActions.some(a => a.id === 'hug')).toBe(false);
    });
    
    it('should personalize dialogue based on relationship', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const friendContext = {
        player: { name: 'Finn' },
        relationship: { trust: 0.9 },
        history: { favors: 3, betrayals: 0 }
      };
      
      const enemyContext = {
        player: { name: 'Finn' },
        relationship: { trust: 0.1 },
        history: { favors: 0, betrayals: 2 }
      };
      
      const friendDialogue = manager.getDialogue('candy', 'greet', friendContext);
      const enemyDialogue = manager.getDialogue('candy', 'greet', enemyContext);
      
      expect(friendDialogue).toContain('friend');
      expect(enemyDialogue).toContain('you');
      expect(friendDialogue).not.toBe(enemyDialogue);
    });
  });
  
  describe('Integration with Multi-Faction NPCs (Phase 2)', () => {
    it('should provide faction-specific actions', () => {
      const defaultRegistry = require('../../src/social/actions/registry.js').default;
      const { NPC } = require('../../src/social/npc.js');
      const registry = defaultRegistry;
      
      const multiFactionNPC = new NPC({
        id: 'spy1',
        name: 'Double Agent',
        role: 'spy',
        factions: ['candy_citizens', 'ice_spies'],
        kingdomId: 'candy'
      });
      
      const context = {
        npc: multiFactionNPC,
        kingdom: 'candy',
        attitude: 'neutral',
        visibleFaction: 'candy_citizens' // What faction they appear as
      };
      
      const actions = registry.getAvailable(context);
      
      // Should have actions for visible faction
      expect(actions.some(a => a.id === 'share_candy')).toBe(true);
      // But not for hidden faction
      expect(actions.some(a => a.id === 'exchange_intel')).toBe(false);
    });
  });
  
  describe('Integration with Kingdom/Faction System (Phase 1)', () => {
    it('should restrict actions by kingdom laws', () => {
      const defaultRegistry = require('../../src/social/actions/registry.js').default;
      const registry = defaultRegistry;
      
      const candyContext = {
        kingdom: 'candy',
        lawLevel: 0.8, // High law
        npc: { role: 'citizen' },
        attitude: 'neutral'
      };
      
      const dungeonContext = {
        kingdom: 'dungeon',
        lawLevel: 0.1, // Lawless
        npc: { role: 'citizen' },
        attitude: 'neutral'
      };
      
      const candyActions = registry.getAvailable(candyContext);
      const dungeonActions = registry.getAvailable(dungeonContext);
      
      // Illegal actions restricted in Candy Kingdom
      expect(candyActions.some(a => a.id === 'pickpocket')).toBe(false);
      // But available in lawless dungeon
      expect(dungeonActions.some(a => a.id === 'pickpocket')).toBe(true);
    });
    
    it('should use kingdom-appropriate dialogue', () => {
      const { DialogueManager } = require('../../src/social/dialogue/DialogueManager.js');
      const manager = new DialogueManager();
      
      const candyContext = { kingdom: 'candy' };
      const fireContext = { kingdom: 'fire' };
      const iceContext = { kingdom: 'ice' };
      
      const candyGreet = manager.getDialogue('candy', 'greet', candyContext);
      const fireGreet = manager.getDialogue('fire', 'greet', fireContext);
      const iceGreet = manager.getDialogue('ice', 'greet', iceContext);
      
      // Check for candy-appropriate language (sweet or sugar)
      expect(candyGreet.toLowerCase()).toMatch(/sweet|sugar|candy/);
      // Fire kingdom dialogue (currently using default)
      expect(typeof fireGreet).toBe('string');
      // Ice kingdom dialogue (currently using default)  
      expect(typeof iceGreet).toBe('string');
    });
  });
  
  describe('Performance with Data-Driven System', () => {
    it('should handle many actions efficiently', () => {
      const defaultRegistry = require('../../src/social/actions/registry.js').default;
      const registry = defaultRegistry;
      
      // Register 100 actions
      for (let i = 0; i < 100; i++) {
        registry.register({
          id: `action_${i}`,
          label: `Action ${i}`,
          cooldown: 1,
          requires: ({ random }) => random > 0.5,
          apply: () => ({ success: true })
        });
      }
      
      const startTime = performance.now();
      
      // Get available actions 100 times
      for (let i = 0; i < 100; i++) {
        const context = { random: Math.random(), attitude: 'neutral' };
        registry.getAvailable(context);
      }
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(50); // Should be fast
    });
  });
});