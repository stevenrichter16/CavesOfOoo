import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { createRumor } from '../../src/social/rumors.js';

describe('Phase 8: EventBus Integration - Social System Events', () => {
  let eventBus;
  let eventEmitter;
  
  beforeEach(() => {
    eventBus = new EventBus();
    
    // Will be implemented
    const { SocialEventEmitter, SocialEventTypes } = require('../../src/social/events/SocialEventEmitter.js');
    eventEmitter = new SocialEventEmitter(eventBus);
  });
  
  describe('Event Type Definitions', () => {
    it('should define all social event types', () => {
      const { SocialEventTypes } = require('../../src/social/events/SocialEventEmitter.js');
      
      expect(SocialEventTypes.KINGDOM_ENTERED).toBe('social:kingdom:entered');
      expect(SocialEventTypes.RUMOR_CREATED).toBe('social:rumor:created');
      expect(SocialEventTypes.RUMOR_SPREAD).toBe('social:rumor:spread');
      expect(SocialEventTypes.DISGUISE_DETECTED).toBe('social:disguise:detected');
      expect(SocialEventTypes.DISGUISE_FAILED).toBe('social:disguise:failed');
      expect(SocialEventTypes.SCHEDULE_CHANGED).toBe('social:schedule:changed');
      expect(SocialEventTypes.RELATIONSHIP_CHANGED).toBe('social:relationship:changed');
      expect(SocialEventTypes.ACTION_PERFORMED).toBe('social:action:performed');
      expect(SocialEventTypes.FACTION_STANDING_CHANGED).toBe('social:faction:changed');
    });
  });
  
  describe('Kingdom Events', () => {
    it('should emit kingdom entered event with context', () => {
      const handler = vi.fn();
      eventBus.on('social:kingdom:entered', handler);
      
      const player = { name: 'Finn', x: 10, y: 10 };
      eventEmitter.emitKingdomEntered(player, 'candy', 'ice');
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          kingdom: 'candy',
          previousKingdom: 'ice',
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should trigger kingdom-specific behaviors on entry', () => {
      const candyBehavior = vi.fn();
      const iceBehavior = vi.fn();
      
      eventBus.on('social:kingdom:entered', (data) => {
        if (data.kingdom === 'candy') {
          candyBehavior();
        } else if (data.kingdom === 'ice') {
          iceBehavior();
        }
      });
      
      const player = { name: 'Finn' };
      
      eventEmitter.emitKingdomEntered(player, 'candy', 'dungeon');
      expect(candyBehavior).toHaveBeenCalled();
      expect(iceBehavior).not.toHaveBeenCalled();
      
      eventEmitter.emitKingdomEntered(player, 'ice', 'candy');
      expect(iceBehavior).toHaveBeenCalled();
    });
  });
  
  describe('Rumor Events', () => {
    it('should emit rumor created event', () => {
      const handler = vi.fn();
      eventBus.on('social:rumor:created', handler);
      
      const rumor = createRumor({
        type: 'scandal',
        severity: 'major',
        content: 'The princess was seen with a vampire!'
      });
      
      const source = new NPC({
        id: 'gossip1',
        name: 'Gossip Greta',
        x: 5,
        y: 5
      });
      
      eventEmitter.emitRumorCreated(rumor, source);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          rumor,
          source,
          position: { x: 5, y: 5 },
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should emit rumor spread event with chain info', () => {
      const handler = vi.fn();
      eventBus.on('social:rumor:spread', handler);
      
      const rumor = {
        id: 'rumor1',
        content: 'Test rumor',
        spreadCount: 3
      };
      
      const spreader = new NPC({ id: 'npc1', name: 'Spreader' });
      const receiver = new NPC({ id: 'npc2', name: 'Receiver' });
      
      eventEmitter.emitRumorSpread(rumor, spreader, receiver);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          rumor,
          spreader,
          receiver,
          spreadChain: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should track rumor propagation metrics', () => {
      const metricsHandler = vi.fn();
      eventBus.on('social:rumor:spread', metricsHandler);
      
      const rumor = { id: 'rumor1', content: 'Test' };
      
      // Simulate rumor spreading through network
      for (let i = 0; i < 5; i++) {
        const spreader = new NPC({ id: `npc${i}` });
        const receiver = new NPC({ id: `npc${i + 1}` });
        eventEmitter.emitRumorSpread(rumor, spreader, receiver);
      }
      
      expect(metricsHandler).toHaveBeenCalledTimes(5);
    });
  });
  
  describe('Disguise Events', () => {
    it('should emit disguise detected event on successful check', () => {
      const handler = vi.fn();
      eventBus.on('social:disguise:detected', handler);
      
      const player = {
        name: 'Finn',
        disguise: { keys: ['candy_guard'], quality: 0.8 }
      };
      
      const npc = new NPC({
        id: 'citizen1',
        name: 'Citizen',
        perception: 0.5
      });
      
      eventEmitter.emitDisguiseDetected(player, npc, player.disguise, true);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          npc,
          disguise: player.disguise,
          success: true,
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should emit disguise failed event when detected', () => {
      const successHandler = vi.fn();
      const failHandler = vi.fn();
      
      eventBus.on('social:disguise:detected', successHandler);
      eventBus.on('social:disguise:failed', failHandler);
      
      const player = {
        name: 'Finn',
        disguise: { keys: ['candy_guard'], quality: 0.3 }
      };
      
      const npc = new NPC({
        id: 'guard1',
        name: 'Sharp Guard',
        perception: 0.9
      });
      
      eventEmitter.emitDisguiseDetected(player, npc, player.disguise, false);
      
      expect(successHandler).not.toHaveBeenCalled();
      expect(failHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          npc,
          disguise: player.disguise,
          success: false
        })
      );
    });
  });
  
  describe('Schedule Events', () => {
    it('should emit schedule changed event', () => {
      const handler = vi.fn();
      eventBus.on('social:schedule:changed', handler);
      
      const npc = new NPC({
        id: 'merchant1',
        name: 'Merchant Mike',
        role: 'merchant'
      });
      
      const oldDuty = 'trading';
      const newDuty = 'rest';
      const hour = 18; // Evening
      
      eventEmitter.emitScheduleChanged(npc, oldDuty, newDuty, hour);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          npc,
          oldDuty,
          newDuty,
          hour,
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should batch schedule changes for multiple NPCs', () => {
      const handler = vi.fn();
      eventBus.on('social:schedule:batch:changed', handler);
      
      const changes = [];
      for (let i = 0; i < 10; i++) {
        changes.push({
          npc: new NPC({ id: `npc${i}` }),
          oldDuty: 'work',
          newDuty: 'rest',
          hour: 18
        });
      }
      
      eventEmitter.emitBatchScheduleChange(changes);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          changes,
          count: 10,
          timestamp: expect.any(Number)
        })
      );
    });
  });
  
  describe('Relationship Events', () => {
    it('should emit relationship changed event', () => {
      const handler = vi.fn();
      eventBus.on('social:relationship:changed', handler);
      
      const player = { name: 'Finn' };
      const npc = new NPC({ id: 'npc1', name: 'Test NPC' });
      
      const oldValues = { trust: 0.5, fear: 0.3, respect: 0.4 };
      const newValues = { trust: 0.7, fear: 0.2, respect: 0.6 };
      const reason = 'compliment';
      
      eventEmitter.emitRelationshipChanged(player, npc, oldValues, newValues, reason);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          npc,
          oldValues,
          newValues,
          changes: {
            trust: 0.2,
            fear: -0.1,
            respect: 0.2
          },
          reason,
          timestamp: expect.any(Number)
        })
      );
    });
  });
  
  describe('Action Events', () => {
    it('should emit action performed event', () => {
      const handler = vi.fn();
      eventBus.on('social:action:performed', handler);
      
      const player = { name: 'Finn' };
      const npc = new NPC({ id: 'npc1', name: 'Test NPC' });
      
      const action = {
        id: 'compliment',
        label: 'Compliment',
        category: 'social'
      };
      
      const result = {
        success: true,
        trustGain: 0.1,
        message: 'Compliment appreciated'
      };
      
      eventEmitter.emitActionPerformed(player, npc, action, result);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          npc,
          action,
          result,
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should chain events for complex actions', async () => {
      const actionHandler = vi.fn();
      const relationshipHandler = vi.fn();
      const rumorHandler = vi.fn();
      
      eventBus.on('social:action:performed', actionHandler);
      eventBus.on('social:relationship:changed', relationshipHandler);
      eventBus.on('social:rumor:created', rumorHandler);
      
      // Simulate share_rumor action that creates multiple events
      const player = { name: 'Finn' };
      const npc = new NPC({ id: 'npc1', name: 'Gossip' });
      
      // Action performed
      eventEmitter.emitActionPerformed(player, npc, 
        { id: 'share_rumor' },
        { success: true }
      );
      
      // This should trigger relationship change
      eventEmitter.emitRelationshipChanged(player, npc, 
        { trust: 0.5 }, 
        { trust: 0.6 },
        'share_rumor'
      );
      
      // And create a rumor
      const rumor = createRumor({ content: 'Shared secret' });
      eventEmitter.emitRumorCreated(rumor, npc);
      
      expect(actionHandler).toHaveBeenCalled();
      expect(relationshipHandler).toHaveBeenCalled();
      expect(rumorHandler).toHaveBeenCalled();
    });
  });
  
  describe('Faction Events', () => {
    it('should emit faction standing changed event', () => {
      const handler = vi.fn();
      eventBus.on('social:faction:changed', handler);
      
      const player = { name: 'Finn' };
      const faction = 'candy_merchants';
      const oldStanding = 0.5;
      const newStanding = 0.7;
      const reason = 'completed_quest';
      
      eventEmitter.emitFactionStandingChanged(player, faction, oldStanding, newStanding, reason);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          player,
          faction,
          oldStanding,
          newStanding,
          change: 0.2,
          reason,
          timestamp: expect.any(Number)
        })
      );
    });
  });
  
  describe('Event Performance', () => {
    it('should emit events efficiently', () => {
      const handlers = [];
      
      // Register many handlers
      for (let i = 0; i < 100; i++) {
        handlers.push(vi.fn());
        eventBus.on('social:test:event', handlers[i]);
      }
      
      const startTime = performance.now();
      
      // Emit event
      eventBus.emit('social:test:event', { data: 'test' });
      
      const duration = performance.now() - startTime;
      
      // Should notify all handlers quickly
      expect(duration).toBeLessThan(5); // < 5ms for 100 handlers
      
      // All handlers should be called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalled();
      });
    });
    
    it('should handle async event emission', async () => {
      const asyncHandler = vi.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { processed: true };
      });
      
      eventBus.on('social:async:test', asyncHandler, { async: true });
      
      const result = await eventBus.emitAsync('social:async:test', { test: 'data' });
      
      expect(asyncHandler).toHaveBeenCalled();
      expect(result.results[0]).toEqual({ processed: true });
    });
  });
  
  describe('Event Error Handling', () => {
    it('should handle handler errors gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      const goodHandler = vi.fn();
      
      eventBus.on('social:error:test', errorHandler);
      eventBus.on('social:error:test', goodHandler);
      
      // Should not throw and should continue to other handlers
      expect(() => {
        eventBus.emit('social:error:test', {});
      }).not.toThrow();
      
      expect(goodHandler).toHaveBeenCalled();
    });
  });
});