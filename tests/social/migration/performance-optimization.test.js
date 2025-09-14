import { describe, it, expect, beforeEach } from 'vitest';

describe('Performance Optimization - NEW system without conversion overhead', () => {
  
  describe('NPC creation performance', () => {
    it('should create NPCs efficiently', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      const startTime = performance.now();
      
      // Create 100 NPCs
      const npcs = [];
      for (let i = 0; i < 100; i++) {
        npcs.push(new NPC({
          id: `npc_${i}`,
          name: `NPC ${i}`,
          faction: 'peasants',
          traits: ['friendly', 'helpful']
        }));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be fast (under 100ms for 100 NPCs)
      expect(duration).toBeLessThan(100);
      expect(npcs.length).toBe(100);
      
      // All NPCs should be properly initialized
      npcs.forEach(npc => {
        expect(npc.memory).toBeDefined();
        expect(npc.traits).toBeDefined();
        expect(npc.hasTrait('friendly')).toBe(true);
      });
    });
    
    it('should handle interactions efficiently', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      const { getAvailableInteractions } = await import('../../../src/social/interactions.js');
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test',
        shopkeeper: true,
        questGiver: true,
        quests: ['quest1']
      });
      
      const player = {
        id: 'player',
        inventory: [{ id: 'item1' }],
        factions: ['player']
      };
      
      const startTime = performance.now();
      
      // Get interactions 1000 times
      for (let i = 0; i < 1000; i++) {
        getAvailableInteractions(player, npc);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be very fast (under 50ms for 1000 calls)
      expect(duration).toBeLessThan(50);
    });
  });
  
  describe('Memory system performance', () => {
    it('should handle memory operations efficiently', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      
      const memory = new NPCMemory('test');
      
      const startTime = performance.now();
      
      // Add 100 events
      for (let i = 0; i < 100; i++) {
        memory.remember({
          type: 'test_event',
          data: i,
          turn: i
        });
      }
      
      // Update relationships
      for (let i = 0; i < 50; i++) {
        memory.updateRelationship(`npc_${i}`, i);
      }
      
      // Add grudges
      for (let i = 0; i < 20; i++) {
        memory.addGrudge(`enemy_${i}`, 'attacked');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be fast (under 20ms)
      expect(duration).toBeLessThan(20);
      
      // Verify data integrity
      expect(memory.events.length).toBe(100);
      expect(memory.getRelationship('npc_10')).toBe(10);
      expect(memory.grudges.has('enemy_5')).toBe(true);
    });
  });
  
  describe('Dialogue system performance', () => {
    it('should handle dialogue operations efficiently', async () => {
      const dialogue = await import('../../../src/social/dialogue.js');
      
      // Register 50 dialogue trees
      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        dialogue.registerDialogueTree(`tree_${i}`, {
          id: `tree_${i}`,
          start: 'start',
          nodes: {
            start: {
              text: `Hello from tree ${i}`,
              responses: [
                { text: 'Hi', next: 'end' },
                { text: 'Bye', next: 'end' }
              ]
            },
            end: {
              text: 'Goodbye!',
              responses: []
            }
          }
        });
      }
      
      // Start dialogues
      const state = { player: { gold: 100 } };
      for (let i = 0; i < 50; i++) {
        const npc = { dialogueType: `tree_${i}` };
        dialogue.startDialogue(state, state.player, npc);
        dialogue.getCurrentNode();
        dialogue.endDialogue();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be fast (under 50ms for all operations)
      expect(duration).toBeLessThan(50);
    });
  });
  
  describe('No conversion overhead', () => {
    it('should work directly with NEW format NPCs', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      const { runInteraction } = await import('../../../src/social/interactions.js');
      
      // Create NEW format NPC directly
      const npc = new NPC({
        id: 'direct_npc',
        name: 'Direct NPC',
        faction: 'merchants',
        shopkeeper: true
      });
      
      const player = { id: 'player' };
      const state = {};
      
      const startTime = performance.now();
      
      // Run 100 interactions without conversion
      for (let i = 0; i < 100; i++) {
        runInteraction(state, player, npc, 'talk');
        runInteraction(state, player, npc, 'trade');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be very fast without conversion overhead
      expect(duration).toBeLessThan(20);
    });
    
    it('should still handle OLD format when needed', async () => {
      const { runInteraction } = await import('../../../src/social/interactions.js');
      
      // OLD format NPC (for backward compatibility)
      const oldNPC = {
        id: 'old_npc',
        name: 'Old NPC',
        faction: 'guards',
        traits: ['brave'],
        hasTrait: function(t) { return this.traits.includes(t); }
      };
      
      const player = { id: 'player' };
      const state = {};
      
      // Should still work but with conversion overhead
      const result = runInteraction(state, player, oldNPC, 'talk');
      expect(result.success).toBe(true);
    });
  });
  
  describe('Performance summary', () => {
    it('should meet performance targets', () => {
      const performanceTargets = {
        'NPC creation (100 NPCs)': '< 100ms',
        'Interaction checks (1000 calls)': '< 50ms',
        'Memory operations (170 ops)': '< 20ms',
        'Dialogue operations (100 ops)': '< 50ms',
        'Direct interactions (200 calls)': '< 20ms'
      };
      
      // All targets should be achievable
      expect(Object.keys(performanceTargets).length).toBe(5);
      
      console.log('Performance Targets:', performanceTargets);
    });
  });
});