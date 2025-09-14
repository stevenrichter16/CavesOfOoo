import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NPCMemory Migration to NEW System', () => {
  let NPCMemory;
  
  beforeEach(() => {
    vi.resetModules();
  });

  describe('NPCMemory in NEW location', () => {
    it('should export NPCMemory class from new location', async () => {
      const module = await import('../../../src/social/memory.js');
      expect(module.NPCMemory).toBeDefined();
      expect(typeof module.NPCMemory).toBe('function');
    });

    it('should create memory instances with correct structure', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      expect(memory.npcId).toBe('test_npc');
      expect(memory.events).toEqual([]);
      expect(memory.relationships).toEqual({});
      expect(memory.knownFacts).toEqual({});
    });

    it('should remember events correctly', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      const event = {
        type: 'interaction',
        with: 'player',
        action: 'greeting',
        timestamp: Date.now()
      };
      
      memory.remember(event);
      expect(memory.events).toHaveLength(1);
      expect(memory.events[0]).toMatchObject(event);
    });

    it('should track relationships', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      memory.updateRelationship('player', 5);
      expect(memory.getRelationship('player')).toBe(5);
      
      memory.updateRelationship('player', -3);
      expect(memory.getRelationship('player')).toBe(2);
    });

    it('should store and retrieve facts', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      memory.learnFact('player_helped', true);
      memory.learnFact('player_faction', 'guards');
      
      expect(memory.knowsFact('player_helped')).toBe(true);
      expect(memory.getFact('player_faction')).toBe('guards');
      expect(memory.knowsFact('unknown_fact')).toBe(false);
    });

    it('should forget old events when limit exceeded', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      // Add more than max events (default 100)
      for (let i = 0; i < 110; i++) {
        memory.remember({ type: 'test', id: i });
      }
      
      expect(memory.events.length).toBeLessThanOrEqual(100);
      // Should keep newer events
      expect(memory.events[memory.events.length - 1].id).toBe(109);
    });

    it('should query recent events', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      const now = Date.now();
      memory.remember({ type: 'old', timestamp: now - 10000 });
      memory.remember({ type: 'recent', timestamp: now - 1000 });
      memory.remember({ type: 'very_recent', timestamp: now });
      
      const recentEvents = memory.getRecentEvents(5000);
      expect(recentEvents).toHaveLength(2);
      expect(recentEvents[0].type).toBe('very_recent');
      expect(recentEvents[1].type).toBe('recent');
    });

    it('should find events by type', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      memory.remember({ type: 'combat', result: 'win' });
      memory.remember({ type: 'dialogue', topic: 'quest' });
      memory.remember({ type: 'combat', result: 'loss' });
      
      const combatEvents = memory.getEventsByType('combat');
      expect(combatEvents).toHaveLength(2);
      expect(combatEvents[0].result).toBe('win');
      expect(combatEvents[1].result).toBe('loss');
    });

    it('should serialize and deserialize correctly', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test_npc');
      
      memory.remember({ type: 'test' });
      memory.updateRelationship('player', 10);
      memory.learnFact('important', 'data');
      
      const serialized = memory.serialize();
      const restored = NPCMemory.deserialize(serialized);
      
      expect(restored.npcId).toBe('test_npc');
      expect(restored.events).toHaveLength(1);
      expect(restored.getRelationship('player')).toBe(10);
      expect(restored.getFact('important')).toBe('data');
    });

    it('should be compatible with enhanced NPC class', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC'
      });
      
      expect(npc.memory).toBeInstanceOf(NPCMemory);
      expect(npc.memory.npcId).toBe('test_npc');
      
      // Should work with NPC
      npc.memory.remember({ type: 'spawn' });
      expect(npc.memory.events).toHaveLength(1);
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain same API as OLD system', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const memory = new NPCMemory('test');
      
      // All OLD system methods should exist
      expect(typeof memory.remember).toBe('function');
      expect(typeof memory.updateRelationship).toBe('function');
      expect(typeof memory.getRelationship).toBe('function');
      expect(typeof memory.learnFact).toBe('function');
      expect(typeof memory.knowsFact).toBe('function');
      expect(typeof memory.getFact).toBe('function');
      expect(typeof memory.getRecentEvents).toBe('function');
      expect(typeof memory.getEventsByType).toBe('function');
      expect(typeof memory.serialize).toBe('function');
    });

    it('should work with OLD memory data format', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      
      // OLD format data
      const oldData = {
        npcId: 'old_npc',
        memories: [{ type: 'old_event' }],  // OLD used 'memories'
        relationships: { player: 5 },
        knownFacts: { fact1: true }
      };
      
      const memory = NPCMemory.deserialize(oldData);
      expect(memory.events).toHaveLength(1);  // Should convert memories to events
      expect(memory.getRelationship('player')).toBe(5);
      expect(memory.getFact('fact1')).toBe(true);
    });
  });
});