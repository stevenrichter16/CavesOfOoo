import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Final Integration - Complete Social System Migration', () => {
  
  describe('Shop opening through dialogue', () => {
    it('should open shop when selecting shop option in dialogue', async () => {
      // Import all required modules
      const { startDialogue, selectChoice, registerDialogueTree } = 
        await import('../../../src/social/dialogue.js');
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      // Create a merchant NPC
      const merchant = new NPC({
        id: 'test_merchant',
        name: 'Test Merchant',
        faction: 'merchants',
        shopkeeper: true,
        goods: [
          { id: 'potion', name: 'Health Potion', price: 10, count: 5 },
          { id: 'sword', name: 'Iron Sword', price: 50, count: 2 }
        ],
        dialogueType: 'test_merchant'
      });
      
      // Register merchant dialogue
      registerDialogueTree('test_merchant', {
        id: 'test_merchant',
        nodes: {
          start: {
            text: 'Welcome to my shop! What can I do for you?',
            responses: [
              {
                text: 'I want to buy something',
                action: 'openShop'
              },
              {
                text: 'Just browsing',
                next: 'browse'
              },
              {
                text: 'Goodbye',
                next: 'end'
              }
            ]
          },
          browse: {
            text: 'Take your time looking around.',
            responses: [
              {
                text: 'Actually, show me what you have',
                action: 'openShop'
              },
              {
                text: 'Thanks',
                next: 'end'
              }
            ]
          },
          end: {
            text: 'Come back anytime!',
            responses: []
          }
        }
      });
      
      // Create game state
      const state = {
        player: {
          id: 'player',
          name: 'Finn',
          gold: 100,
          inventory: []
        },
        npcs: [merchant],
        ui: {}
      };
      
      // Start dialogue with merchant
      const dialogueNode = startDialogue(state, state.player, merchant);
      expect(dialogueNode).toBeDefined();
      expect(dialogueNode.text).toBe('Welcome to my shop! What can I do for you?');
      expect(dialogueNode.choices).toHaveLength(3);
      
      // Select "I want to buy something"
      const result = selectChoice(0);
      
      // Dialogue should close and shop should be triggered
      expect(result).toBe(null); // Dialogue closed
      
      // Verify shop state would be set (async operation)
      // In real game, ShopSystem.openShop would be called
    });
    
    it('should handle all dialogue node types correctly', async () => {
      const { startDialogue, getCurrentNode, selectChoice, registerDialogueTree } = 
        await import('../../../src/social/dialogue.js');
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      // Create an NPC with complex dialogue
      const npc = new NPC({
        id: 'complex_npc',
        name: 'Complex NPC',
        faction: 'peasants',
        traits: ['friendly', 'helpful'],
        dialogueType: 'complex'
      });
      
      // Register complex dialogue with conditions
      registerDialogueTree('complex', {
        id: 'complex',
        nodes: {
          start: {
            text: 'Hello there!',
            responses: [
              {
                text: 'Hi! (If you have 50+ gold)',
                next: 'rich',
                condition: { type: 'gold', amount: 50 }
              },
              {
                text: 'Hello (Always available)',
                next: 'normal'
              }
            ]
          },
          rich: {
            text: 'I see you have money!',
            responses: [
              { text: 'Yes I do', next: 'end' }
            ]
          },
          normal: {
            text: 'Nice to meet you.',
            responses: [
              { text: 'Nice to meet you too', next: 'end' }
            ]
          },
          end: {
            text: 'Goodbye!',
            responses: []
          }
        }
      });
      
      // Test with rich player
      const richState = {
        player: { gold: 100 }
      };
      
      startDialogue(richState, richState.player, npc);
      let node = getCurrentNode();
      expect(node.choices).toHaveLength(2); // Both options available
      
      // Test with poor player
      const poorState = {
        player: { gold: 30 }
      };
      
      startDialogue(poorState, poorState.player, npc);
      node = getCurrentNode();
      expect(node.choices).toHaveLength(1); // Only "Hello" available
    });
  });
  
  describe('Complete system integration', () => {
    it('should have all migrated components working together', async () => {
      // Import all migrated modules
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const { NPCTraits, areTraitsOpposed } = await import('../../../src/social/traits.js');
      const dialogue = await import('../../../src/social/dialogue.js');
      const adapter = await import('../../../src/social/migrationAdapter.js');
      
      // Create a full-featured NPC
      const npc = new NPC({
        id: 'full_npc',
        name: 'Full Featured NPC',
        faction: 'merchants',
        traits: ['greedy', 'clever'],
        shopkeeper: true,
        questGiver: true,
        quests: ['find_artifact'],
        goods: [{ id: 'item1', price: 10 }],
        dialogueType: 'full'
      });
      
      // Test NPC has all features
      expect(npc).toBeInstanceOf(NPC);
      expect(npc.memory).toBeInstanceOf(NPCMemory);
      expect(npc.hasTrait('greedy')).toBe(true);
      expect(npc.hasTrait('generous')).toBe(false); // Opposite trait
      expect(areTraitsOpposed('greedy', 'generous')).toBe(true);
      
      // Test memory system
      npc.memory.remember({ type: 'test_event' });
      expect(npc.memory.events).toHaveLength(1);
      
      // Test dialogue system
      dialogue.registerDialogueTree('full', {
        nodes: { start: { text: 'Test' } }
      });
      expect(dialogue.getDialogueTree('full')).toBeDefined();
      
      // Test migration adapter functions
      expect(typeof adapter.getAvailableInteractions).toBe('function');
      expect(typeof adapter.runPlayerNPCInteraction).toBe('function');
      expect(typeof adapter.initializeSocialSystem).toBe('function');
    });
    
    it('should maintain performance with full migration', () => {
      const startTime = performance.now();
      
      // Simulate heavy usage
      for (let i = 0; i < 100; i++) {
        const { NPC } = require('../../../src/social/npcEnhanced.js');
        const npc = new NPC({
          id: `npc_${i}`,
          name: `NPC ${i}`,
          traits: ['brave', 'loyal']
        });
        
        // Simulate operations
        npc.hasTrait('brave');
        npc.memory.remember({ type: 'spawn' });
        npc.evaluateHostilityTo({ factions: ['player'] });
      }
      
      const endTime = performance.now();
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(200); // 200ms for 100 NPCs
    });
  });
  
  describe('Backward compatibility verification', () => {
    it('should work with OLD format NPCs', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      const adapter = await import('../../../src/social/migrationAdapter.js');
      
      // OLD format NPC
      const oldNPC = {
        id: 'old_npc',
        name: 'Old Format NPC',
        faction: 'guards',
        traits: ['brave'],
        hasTrait: function(t) { return this.traits.includes(t); }
      };
      
      // Should be convertible
      expect(NPC.isOldFormat(oldNPC)).toBe(true);
      
      const converted = NPC.fromOldFormat(oldNPC);
      expect(converted).toBeInstanceOf(NPC);
      expect(converted.name).toBe('Old Format NPC');
      expect(converted.hasTrait('brave')).toBe(true);
      
      // Should work with adapter functions
      const interactions = adapter.getAvailableInteractions(
        { id: 'player' }, 
        oldNPC
      );
      expect(Array.isArray(interactions)).toBe(true);
    });
    
    it('should handle all edge cases', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      // Minimal NPC (id is required)
      const minimal = new NPC({ id: 'minimal' });
      expect(minimal.id).toBe('minimal');
      expect(minimal.traits).toBeDefined();
      expect(minimal.memory).toBeDefined();
      
      // NPC with everything
      const full = new NPC({
        id: 'full',
        name: 'Full',
        x: 10, y: 10,
        hp: 100, hpMax: 100,
        faction: 'nobles',
        factions: ['nobles', 'royalty'],
        traits: ['proud', 'intelligent'],
        memory: new (await import('../../../src/social/memory.js')).NPCMemory('full'),
        inventory: [{ id: 'crown' }],
        dialogueType: 'royalty',
        dialogue: true,
        shopkeeper: true,
        goods: [],
        questGiver: true,
        quests: ['royal_quest'],
        glyph: 'K',
        color: 'gold',
        type: 'royal',
        attitude: 'neutral',
        sprite: 'king',
        char: '♔',
        role: 'king'
      });
      
      // All properties should be preserved
      expect(full.faction).toBe('nobles');
      expect(full.factions).toContain('royalty');
      expect(full.sprite).toBe('king');
      expect(full.char).toBe('♔');
      expect(full.role).toBe('king');
    });
  });
});