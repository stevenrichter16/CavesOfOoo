import { describe, it, expect, beforeEach } from 'vitest';

describe('Action Registry System - Phase 7', () => {
  let ActionRegistry;
  let ACTIONS;
  
  beforeEach(() => {
    // These will be imported from the implementation
    // ActionRegistry = require('../../src/social/actions/registry.js').ActionRegistry;
    // ACTIONS = require('../../src/social/actions/registry.js').ACTIONS;
  });
  
  describe('Action Definition Structure', () => {
    it('should define actions with required properties', () => {
      const testAction = {
        id: 'greet',
        label: 'Greet',
        cooldown: 1,
        requires: ({ attitude, npc }) => attitude !== 'hostile',
        apply: ({ state, player, npc }) => {
          npc.social.trust += 0.05;
          return { success: true, message: 'Greeting exchanged' };
        }
      };
      
      expect(testAction).toHaveProperty('id');
      expect(testAction).toHaveProperty('label');
      expect(testAction).toHaveProperty('cooldown');
      expect(testAction).toHaveProperty('requires');
      expect(testAction).toHaveProperty('apply');
      expect(typeof testAction.requires).toBe('function');
      expect(typeof testAction.apply).toBe('function');
    });
    
    it('should support optional properties', () => {
      const testAction = {
        id: 'trade',
        label: 'Trade',
        cooldown: 5,
        requires: ({ npc }) => npc.role === 'merchant',
        apply: ({ state, player, npc }) => ({ success: true }),
        cost: { gold: 10 },
        kingdom: 'candy',
        icon: '💰',
        category: 'economic'
      };
      
      expect(testAction.cost).toBeDefined();
      expect(testAction.kingdom).toBe('candy');
      expect(testAction.icon).toBe('💰');
      expect(testAction.category).toBe('economic');
    });
  });
  
  describe('ActionRegistry Class', () => {
    it('should register new actions', () => {
      const { ActionRegistry } = require('../../src/social/actions/registry.js');
      const registry = new ActionRegistry();
      
      const greetAction = {
        id: 'greet',
        label: 'Greet',
        cooldown: 1,
        requires: () => true,
        apply: () => ({ success: true })
      };
      
      registry.register(greetAction);
      expect(registry.get('greet')).toBe(greetAction);
    });
    
    it('should prevent duplicate action IDs', () => {
      const { ActionRegistry } = require('../../src/social/actions/registry.js');
      const registry = new ActionRegistry();
      
      const action1 = { id: 'test', label: 'Test 1', cooldown: 1, requires: () => true, apply: () => ({}) };
      const action2 = { id: 'test', label: 'Test 2', cooldown: 1, requires: () => true, apply: () => ({}) };
      
      registry.register(action1);
      expect(() => registry.register(action2)).toThrow('Action with id "test" already registered');
    });
    
    it('should validate required properties on registration', () => {
      const { ActionRegistry } = require('../../src/social/actions/registry.js');
      const registry = new ActionRegistry();
      
      const invalidAction = { id: 'invalid', label: 'Invalid' };
      
      expect(() => registry.register(invalidAction)).toThrow('Action missing required properties');
    });
    
    it('should get available actions for context', () => {
      const { ActionRegistry } = require('../../src/social/actions/registry.js');
      const registry = new ActionRegistry();
      
      const friendlyAction = {
        id: 'chat',
        label: 'Chat',
        cooldown: 1,
        requires: ({ attitude }) => attitude === 'friendly',
        apply: () => ({ success: true })
      };
      
      const hostileAction = {
        id: 'fight',
        label: 'Fight',
        cooldown: 3,
        requires: ({ attitude }) => attitude === 'hostile',
        apply: () => ({ success: true })
      };
      
      registry.register(friendlyAction);
      registry.register(hostileAction);
      
      const friendlyContext = { attitude: 'friendly', npc: { role: 'citizen' } };
      const available = registry.getAvailable(friendlyContext);
      
      expect(available).toContain(friendlyAction);
      expect(available).not.toContain(hostileAction);
    });
    
    it('should filter actions by kingdom', () => {
      const { ActionRegistry } = require('../../src/social/actions/registry.js');
      const registry = new ActionRegistry();
      
      const candyAction = {
        id: 'praise_pb',
        label: 'Praise Princess Bubblegum',
        kingdom: 'candy',
        cooldown: 2,
        requires: () => true,
        apply: () => ({ success: true })
      };
      
      const fireAction = {
        id: 'challenge_flame',
        label: 'Challenge to Flame Battle',
        kingdom: 'fire',
        cooldown: 5,
        requires: () => true,
        apply: () => ({ success: true })
      };
      
      registry.register(candyAction);
      registry.register(fireAction);
      
      const candyContext = { kingdom: 'candy', attitude: 'neutral' };
      const available = registry.getAvailable(candyContext);
      
      expect(available).toContain(candyAction);
      expect(available).not.toContain(fireAction);
    });
  });
  
  describe('Default Actions', () => {
    it('should provide basic social actions', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      
      expect(ACTIONS).toHaveProperty('greet');
      expect(ACTIONS).toHaveProperty('chat');
      expect(ACTIONS).toHaveProperty('compliment');
      expect(ACTIONS).toHaveProperty('insult');
      expect(ACTIONS).toHaveProperty('threaten');
      expect(ACTIONS).toHaveProperty('gift');
      expect(ACTIONS).toHaveProperty('trade');
      expect(ACTIONS).toHaveProperty('share_rumor');
    });
    
    it('should have proper cooldowns for actions', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      
      expect(ACTIONS.greet.cooldown).toBeLessThanOrEqual(2);
      expect(ACTIONS.threaten.cooldown).toBeGreaterThanOrEqual(5);
      expect(ACTIONS.gift.cooldown).toBeGreaterThanOrEqual(3);
    });
  });
  
  describe('Action Requirements', () => {
    it('should check attitude requirements', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      
      const friendlyContext = { attitude: 'friendly', npc: { role: 'citizen' } };
      const hostileContext = { attitude: 'hostile', npc: { role: 'citizen' } };
      
      expect(ACTIONS.compliment.requires(friendlyContext)).toBe(true);
      expect(ACTIONS.compliment.requires(hostileContext)).toBe(false);
      
      expect(ACTIONS.threaten.requires(hostileContext)).toBe(true);
      expect(ACTIONS.threaten.requires(friendlyContext)).toBe(false);
    });
    
    it('should check role requirements', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      
      const merchantContext = { attitude: 'neutral', npc: { role: 'merchant' } };
      const guardContext = { attitude: 'neutral', npc: { role: 'guard' } };
      
      expect(ACTIONS.trade.requires(merchantContext)).toBe(true);
      expect(ACTIONS.trade.requires(guardContext)).toBe(false);
    });
    
    it('should check schedule requirements', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      const { DutyType } = require('../../src/social/schedule.js');
      
      const tradingContext = { 
        attitude: 'neutral', 
        npc: { role: 'merchant', currentDuty: DutyType.TRADING }
      };
      
      const sleepingContext = { 
        attitude: 'neutral', 
        npc: { role: 'merchant', currentDuty: DutyType.SLEEP }
      };
      
      expect(ACTIONS.trade.requires(tradingContext)).toBe(true);
      expect(ACTIONS.trade.requires(sleepingContext)).toBe(false);
    });
  });
  
  describe('Action Effects', () => {
    it('should modify social values', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      
      const npc = {
        social: { trust: 0.5, fear: 0.2, respect: 0.3 }
      };
      
      const context = {
        state: { log: () => {} },
        player: { name: 'Finn' },
        npc: npc
      };
      
      const result = ACTIONS.compliment.apply(context);
      
      expect(result.success).toBe(true);
      expect(npc.social.trust).toBeGreaterThan(0.5);
      expect(npc.social.respect).toBeGreaterThan(0.3);
    });
    
    it('should trigger rumors when sharing', () => {
      const { ACTIONS } = require('../../src/social/actions/registry.js');
      
      const npc = {
        social: { trust: 0.5 },
        memory: { rumors: [], addRumor: (rumor) => npc.memory.rumors.push(rumor) }
      };
      
      const rumor = { type: 'trade', content: 'Prices are rising' };
      
      const context = {
        state: { log: () => {} },
        player: { name: 'Finn' },
        npc: npc,
        params: { rumor }
      };
      
      const result = ACTIONS.share_rumor.apply(context);
      
      expect(result.success).toBe(true);
      expect(npc.memory.rumors).toContain(rumor);
    });
  });
  
  describe('Kingdom-Specific Actions', () => {
    it('should have Candy Kingdom specific actions', () => {
      const { KINGDOM_ACTIONS } = require('../../src/social/actions/registry.js');
      
      expect(KINGDOM_ACTIONS.candy).toBeDefined();
      expect(KINGDOM_ACTIONS.candy.praise_princess).toBeDefined();
      expect(KINGDOM_ACTIONS.candy.share_candy).toBeDefined();
    });
    
    it('should have Fire Kingdom specific actions', () => {
      const { KINGDOM_ACTIONS } = require('../../src/social/actions/registry.js');
      
      expect(KINGDOM_ACTIONS.fire).toBeDefined();
      expect(KINGDOM_ACTIONS.fire.flame_challenge).toBeDefined();
      expect(KINGDOM_ACTIONS.fire.show_respect).toBeDefined();
    });
    
    it('should have Ice Kingdom specific actions', () => {
      const { KINGDOM_ACTIONS } = require('../../src/social/actions/registry.js');
      
      expect(KINGDOM_ACTIONS.ice).toBeDefined();
      expect(KINGDOM_ACTIONS.ice.formal_greeting).toBeDefined();
      expect(KINGDOM_ACTIONS.ice.discuss_science).toBeDefined();
    });
  });
  
  describe('Action Categories', () => {
    it('should categorize actions properly', () => {
      const { ActionRegistry } = require('../../src/social/actions/registry.js');
      const registry = new ActionRegistry();
      
      const socialAction = {
        id: 'chat',
        label: 'Chat',
        category: 'social',
        cooldown: 1,
        requires: () => true,
        apply: () => ({ success: true })
      };
      
      const economicAction = {
        id: 'trade',
        label: 'Trade',
        category: 'economic',
        cooldown: 3,
        requires: () => true,
        apply: () => ({ success: true })
      };
      
      registry.register(socialAction);
      registry.register(economicAction);
      
      const socialActions = registry.getByCategory('social');
      const economicActions = registry.getByCategory('economic');
      
      expect(socialActions).toContain(socialAction);
      expect(economicActions).toContain(economicAction);
    });
  });
  
  describe('Action Discovery', () => {
    it('should auto-discover actions from files', async () => {
      const { discoverActions } = require('../../src/social/actions/registry.js');
      
      // Test with a non-existent directory (should handle gracefully)
      const discovered = await discoverActions('./src/social/actions/custom/');
      
      expect(Array.isArray(discovered)).toBe(true);
      // Should return empty array if no files found
      expect(discovered.length).toBe(0);
      
      // Test that it would work with proper action files
      // (We're not creating actual files for this test)
    });
  });
});