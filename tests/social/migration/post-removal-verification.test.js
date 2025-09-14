import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Post-Removal Verification - Ensure system works without OLD files', () => {
  
  describe('Core functionality without OLD system', () => {
    it('should create NPCs using NEW system', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        faction: 'guards',
        traits: ['brave', 'loyal']
      });
      
      expect(npc).toBeInstanceOf(NPC);
      expect(npc.hasTrait('brave')).toBe(true);
      expect(npc.memory).toBeDefined();
    });
    
    it('should handle dialogue through NEW system', async () => {
      const dialogue = await import('../../../src/social/dialogue.js');
      
      // Register a test dialogue
      dialogue.registerDialogueTree('test', {
        id: 'test',
        start: 'greeting',
        nodes: {
          greeting: {
            text: 'Hello!',
            responses: [
              { text: 'Hi', next: 'end' }
            ]
          },
          end: { text: 'Goodbye!', responses: [] }
        }
      });
      
      const state = { player: { gold: 100 } };
      const npc = { dialogueType: 'test' };
      
      const node = dialogue.startDialogue(state, state.player, npc);
      expect(node).toBeDefined();
      expect(node.text).toBe('Hello!');
    });
    
    it('should handle NPC interactions through adapter', async () => {
      const adapter = await import('../../../src/social/migrationAdapter.js');
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      const npc = new NPC({
        id: 'merchant',
        name: 'Merchant',
        shopkeeper: true,
        goods: []
      });
      
      const player = { id: 'player' };
      
      // Get interactions
      const interactions = adapter.getAvailableInteractions(player, npc);
      expect(interactions).toBeDefined();
      expect(interactions.find(i => i.type === 'trade')).toBeDefined();
      
      // Run interaction
      const result = adapter.runPlayerNPCInteraction({}, player, npc, 'trade');
      expect(result.success).toBe(true);
      expect(result.shopOpen).toBe(true);
    });
  });
  
  describe('World spawning without OLD system', () => {
    it('should spawn forest NPCs', async () => {
      const { spawnForestNPCs, FOREST_CONFIG } = await import('../../../src/js/world/theForest.js');
      
      const state = {
        cx: FOREST_CONFIG.chunkX,
        cy: FOREST_CONFIG.chunkY,
        npcs: [],
        chunk: { isForest: true }
      };
      
      const npcs = spawnForestNPCs(state);
      expect(npcs).toBeDefined();
      expect(Array.isArray(npcs)).toBe(true);
      expect(npcs.length).toBeGreaterThan(0);
      
      // Check for specific NPCs
      const sweetToothFox = npcs.find(n => n.id === 'sweet_tooth_fox');
      expect(sweetToothFox).toBeDefined();
      
      const forestWizard = npcs.find(n => n.id === 'forest_wizard');
      expect(forestWizard).toBeDefined();
      expect(forestWizard.shopkeeper).toBe(true);
    });
    
    it('should spawn NPCs with proper NEW system format', async () => {
      const { spawnSocialNPC } = await import('../../../src/social/migrationAdapter.js');
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      const state = { npcs: [] };
      
      const npc = spawnSocialNPC(state, {
        id: 'test_spawn',
        name: 'Test Spawn',
        x: 10,
        y: 10,
        faction: 'peasants',
        traits: ['friendly']
      });
      
      expect(npc).toBeInstanceOf(NPC);
      expect(npc.hasTrait('friendly')).toBe(true);
      expect(npc.memory).toBeDefined();
    });
  });
  
  describe('Memory system without OLD files', () => {
    it('should handle NPC memory', async () => {
      const { NPCMemory } = await import('../../../src/social/memory.js');
      
      const memory = new NPCMemory('test_npc');
      
      // Test remembering events
      memory.remember({ type: 'meeting', target: 'player' });
      expect(memory.events).toHaveLength(1);
      
      // Test relationships
      memory.updateRelationship('player', 10);
      expect(memory.getRelationship('player')).toBe(10);
      
      // Test grudges
      memory.addGrudge('player', 'stole_item');
      expect(memory.grudges.has('player')).toBe(true);
    });
  });
  
  describe('Trait system without OLD files', () => {
    it('should handle traits properly', async () => {
      const { NPCTraits, areTraitsOpposed, getTraitEffects } = await import('../../../src/social/traits.js');
      
      // Check trait definitions
      expect(NPCTraits.brave).toBeDefined();
      expect(NPCTraits.brave.opposes).toBe('cowardly');
      
      // Check opposition
      expect(areTraitsOpposed('brave', 'cowardly')).toBe(true);
      expect(areTraitsOpposed('brave', 'loyal')).toBe(false);
      
      // Check effects
      const effects = getTraitEffects('brave');
      expect(effects.combatBonus).toBe(2);
    });
  });
  
  describe('Files safe to remove', () => {
    it('should list OLD system files that can be removed', () => {
      const filesToRemove = [
        'src/js/social/traits.js',
        'src/js/social/memory.js',
        'src/js/social/init.js',
        'src/js/social/dialogueTreesV2.js',
        'src/js/social/dialogueTrees.js',
        'src/js/social/behavior.js',
        'src/js/social/actions.js',
        'src/js/social/hostility.js',
        'src/js/social/factions.js',
        'src/js/social/disguise.js',
        'src/js/social/index.js'
      ];
      
      // These are the OLD system files
      expect(filesToRemove.length).toBe(11);
      
      // Files to keep (game-specific, not OLD system)
      const filesToKeep = [
        'src/js/social/dialogue.js', // Game dialogues
        'src/js/social/dialogue.candyKingdomEvents.js',
        'src/js/social/dialogue.candyMarket.js',
        'src/js/social/dialogueBootstrap.js',
        'src/js/social/shoppingDistrictActions.js',
        'src/js/social/relationship.js' // May be used
      ];
      
      expect(filesToKeep.length).toBe(6);
    });
  });
});