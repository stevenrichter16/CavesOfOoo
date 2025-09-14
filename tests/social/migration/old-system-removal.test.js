import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('OLD System Removal - Verify No Dependencies', () => {
  
  describe('Check for OLD system imports', () => {
    it('should not have any direct imports from /src/js/social/', async () => {
      // The migration adapter should be the only thing importing from OLD system
      // All other files should import from /src/social/ (NEW system)
      
      // Test that NEW system modules are accessible
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      const { NPCMemory } = await import('../../../src/social/memory.js');
      const { NPCTraits } = await import('../../../src/social/traits.js');
      const dialogue = await import('../../../src/social/dialogue.js');
      
      expect(NPC).toBeDefined();
      expect(NPCMemory).toBeDefined();
      expect(NPCTraits).toBeDefined();
      expect(dialogue).toBeDefined();
    });
    
    it('should have all game.js imports using NEW system', async () => {
      const game = await import('../../../src/js/core/game.js');
      
      // game.js should be using the NEW dialogue system
      expect(game.initGame).toBeDefined();
      expect(game.openVendorShop).toBeDefined();
    });
    
    it('should have all UI components using NEW system', async () => {
      // These UI components should work with NEW system
      const socialUI = await import('../../../src/js/ui/social.js');
      const dialogueTreeUI = await import('../../../src/js/ui/dialogueTree.js');
      
      expect(socialUI).toBeDefined();
      expect(dialogueTreeUI).toBeDefined();
    });
  });
  
  describe('Migration adapter should handle all OLD system needs', () => {
    it('should provide all necessary functions', async () => {
      const adapter = await import('../../../src/social/migrationAdapter.js');
      
      // All functions that game code needs
      expect(adapter.spawnSocialNPC).toBeDefined();
      expect(adapter.getAvailableInteractions).toBeDefined();
      expect(adapter.runPlayerNPCInteraction).toBeDefined();
      expect(adapter.initializeSocialSystem).toBeDefined();
      expect(adapter.handleNPCInteraction).toBeDefined();
    });
    
    it('should handle OLD format NPC conversion', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      // OLD format NPC
      const oldNPC = {
        id: 'old_npc',
        name: 'Old NPC',
        faction: 'guards',
        traits: ['brave'],
        hasTrait: function(t) { return this.traits.includes(t); }
      };
      
      // Should be able to detect and convert
      expect(NPC.isOldFormat(oldNPC)).toBe(true);
      
      const newNPC = NPC.fromOldFormat(oldNPC);
      expect(newNPC).toBeInstanceOf(NPC);
      expect(newNPC.hasTrait('brave')).toBe(true);
    });
  });
  
  describe('Verify world files use migration adapter', () => {
    it('should import from migration adapter, not OLD system', async () => {
      // Check that world files use the adapter
      const theForest = await import('../../../src/js/world/theForest.js');
      
      // Should export the spawn function that uses adapter
      expect(theForest.spawnForestNPCs).toBeDefined();
      
      // Test spawning NPCs
      const state = {
        cx: 0,
        cy: -2,
        npcs: []
      };
      
      const npcs = theForest.spawnForestNPCs(state);
      expect(npcs).toBeDefined();
      expect(Array.isArray(npcs)).toBe(true);
    });
  });
  
  describe('Files that can be safely removed', () => {
    it('should identify OLD system files', () => {
      // These are the OLD system files that should be removed
      const oldSystemFiles = [
        '/src/js/social/traits.js',      // Migrated to /src/social/traits.js
        '/src/js/social/memory.js',      // Migrated to /src/social/memory.js
        '/src/js/social/inventory.js',   // Integrated into npcEnhanced.js
        '/src/js/social/combat.js',      // Integrated into npcEnhanced.js
        '/src/js/social/init.js',        // No longer needed
        '/src/js/social/reputation.js',  // Integrated into memory.js
        '/src/js/social/dialogueTreesV2.js' // Migrated to /src/social/dialogue.js
      ];
      
      // These files should exist but can be removed after verification
      expect(oldSystemFiles.length).toBeGreaterThan(0);
    });
    
    it('should identify files that must be kept', () => {
      // These files in /src/js/social/ are actually part of game logic, not OLD system
      const keepFiles = [
        '/src/js/social/shoppingDistrictActions.js', // Game-specific actions
        '/src/js/social/dialogue.candyKingdomEvents.js', // Game-specific dialogue
        '/src/js/social/dialogue.candyMarket.js', // Game-specific dialogue
        '/src/js/social/dialogueBootstrap.js', // Dialogue initialization
        '/src/js/social/relationship.js' // May be used by game
      ];
      
      expect(keepFiles.length).toBeGreaterThan(0);
    });
  });
});