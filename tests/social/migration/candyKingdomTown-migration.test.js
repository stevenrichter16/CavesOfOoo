import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawnCandyKingdomNPCs } from '../../../src/js/world/candyKingdomTown.js';
import { NPC } from '../../../src/social/npcEnhanced.js';

describe('CandyKingdomTown Migration', () => {
  let state;
  
  beforeEach(() => {
    state = {
      player: {
        id: 'player',
        x: 24,
        y: 11,
        inventory: [],
        gold: 100,
        quests: { active: [], completed: [] }
      },
      npcs: [],
      cx: 0,
      cy: 0,
      W: 48,
      H: 22,
      chunk: {
        isKingdomTown: true,
        npcs: [],
        biome: 'candy_kingdom'
      }
    };
  });

  describe('spawnCandyKingdomNPCs', () => {
    it('should spawn all NPCs as NEW format', () => {
      const npcs = spawnCandyKingdomNPCs(state);
      
      // Should spawn many NPCs
      expect(npcs.length).toBeGreaterThan(20);
      
      // All should be NEW NPC instances
      npcs.forEach(npc => {
        expect(npc).toBeInstanceOf(NPC);
      });
    });

    it('should spawn Captain Root Beer correctly', () => {
      spawnCandyKingdomNPCs(state);
      
      const captain = state.npcs.find(n => n.id === 'captain_rootbeer');
      expect(captain).toBeDefined();
      expect(captain).toBeInstanceOf(NPC);
      expect(captain.name).toBe('Captain Root Beer');
      expect(captain.faction).toBe('guards');
      expect(captain.dialogueType).toBe('captain_rootbeer');
      expect(captain.hasTrait('disciplined')).toBe(true);
      expect(captain.hasTrait('protective')).toBe(true);
      expect(captain.hasTrait('veteran')).toBe(true);
      expect(captain.hp).toBe(30);
    });

    it('should spawn merchants with shop functionality', () => {
      spawnCandyKingdomNPCs(state);
      
      const manfried = state.npcs.find(n => n.id === 'manfried_candycorn');
      expect(manfried).toBeDefined();
      expect(manfried).toBeInstanceOf(NPC);
      expect(manfried.shopkeeper).toBe(true);
      expect(manfried.goods).toBe('candy_apples');
      expect(manfried.hasTrait('melancholic')).toBe(true);
      
      const chocopierre = state.npcs.find(n => n.id === 'chocopierre');
      expect(chocopierre).toBeDefined();
      expect(chocopierre.shopkeeper).toBe(true);
      expect(chocopierre.goods).toBe('chocolate');
    });

    it('should spawn child NPCs correctly', () => {
      spawnCandyKingdomNPCs(state);
      
      const child1 = state.npcs.find(n => n.id === 'candy_child_1');
      expect(child1).toBeDefined();
      expect(child1.name).toBe('Gumdrop Kid');
      expect(child1.faction).toBe('peasants');
      expect(child1.hasTrait('playful')).toBe(true);
      expect(child1.hp).toBe(10);
    });

    it('should spawn special characters with unique traits', () => {
      spawnCandyKingdomNPCs(state);
      
      const peppermintLarry = state.npcs.find(n => n.id === 'peppermint_larry');
      expect(peppermintLarry).toBeDefined();
      expect(peppermintLarry.hasTrait('paranoid')).toBe(true);
      expect(peppermintLarry.hasTrait('conspiracy_theorist')).toBe(true);
      expect(peppermintLarry.hasTrait('eccentric')).toBe(true);
    });

    it('should spawn gnome fairy with special properties', () => {
      spawnCandyKingdomNPCs(state);
      
      const gnomeFairy = state.npcs.find(n => n.id === 'gnome_fairy');
      expect(gnomeFairy).toBeDefined();
      expect(gnomeFairy.name).toBe('Glimmer the Gnome');
      expect(gnomeFairy.hasTrait('magical')).toBe(true);
      expect(gnomeFairy.hasTrait('mischievous')).toBe(true);
      expect(gnomeFairy.sprite).toBe('gnome_fairy');
      expect(gnomeFairy.char).toBe('🧚');
    });

    it('should set correct positions for all NPCs', () => {
      spawnCandyKingdomNPCs(state);
      
      // Check some specific positions
      const northGuard = state.npcs.find(n => n.id === 'banana_guard_north');
      expect(northGuard.x).toBe(26);
      expect(northGuard.y).toBe(2);
      
      const westGuard = state.npcs.find(n => n.id === 'banana_guard_west');
      expect(westGuard.x).toBe(2);
      expect(westGuard.y).toBe(10);
    });

    it('should preserve all NPC properties through migration', () => {
      spawnCandyKingdomNPCs(state);
      
      // Check various properties are preserved
      const npcsWithRoles = state.npcs.filter(n => n.role);
      expect(npcsWithRoles.length).toBeGreaterThan(0);
      
      const npcsWithDialogueTypes = state.npcs.filter(n => n.dialogueType);
      expect(npcsWithDialogueTypes.length).toBeGreaterThan(0);
      
      const merchants = state.npcs.filter(n => n.shopkeeper);
      expect(merchants.length).toBeGreaterThan(5);
    });

    it('should maintain dialogue compatibility', () => {
      spawnCandyKingdomNPCs(state);
      
      // All NPCs should have dialogue enabled by default
      state.npcs.forEach(npc => {
        expect(npc.dialogue).toBe(true);
        
        // Check dialogue lookup would work
        const lookupType = npc.dialogueType || npc.type || npc.faction;
        expect(lookupType).toBeDefined();
      });
    });

    it('should generate valid NPC IDs', () => {
      spawnCandyKingdomNPCs(state);
      
      const ids = state.npcs.map(n => n.id);
      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
      
      // All should have IDs
      state.npcs.forEach(npc => {
        expect(npc.id).toBeDefined();
        expect(typeof npc.id).toBe('string');
      });
    });

    it('should handle faction assignments correctly', () => {
      spawnCandyKingdomNPCs(state);
      
      const guards = state.npcs.filter(n => n.faction === 'guards');
      const merchants = state.npcs.filter(n => n.faction === 'merchants');
      const peasants = state.npcs.filter(n => n.faction === 'peasants');
      const nobles = state.npcs.filter(n => n.faction === 'nobles');
      
      expect(guards.length).toBeGreaterThan(4);
      expect(merchants.length).toBeGreaterThan(5);
      expect(peasants.length).toBeGreaterThan(8);
      expect(nobles.length).toBeGreaterThan(1);
    });

    it('should support save/load after migration', () => {
      spawnCandyKingdomNPCs(state);
      
      // Serialize the state
      const serialized = JSON.stringify(state.npcs);
      
      // Deserialize
      const deserialized = JSON.parse(serialized);
      
      // Should be able to restore NPCs
      const restored = deserialized.map(data => NPC.fromOldFormat(data));
      
      restored.forEach((npc, i) => {
        expect(npc).toBeInstanceOf(NPC);
        expect(npc.name).toBe(state.npcs[i].name);
        expect(npc.faction).toBe(state.npcs[i].faction);
      });
    });

    it('should maintain memory and trait systems', () => {
      spawnCandyKingdomNPCs(state);
      
      state.npcs.forEach(npc => {
        // Should have memory system
        expect(npc.memory).toBeDefined();
        expect(npc.memory.events).toBeDefined();
        
        // Should have traits
        expect(Array.isArray(npc.traits)).toBe(true);
        expect(npc.traits.length).toBeGreaterThan(0);
        
        // hasTrait should work
        expect(typeof npc.hasTrait).toBe('function');
      });
    });

    it('should work with hostile evaluation', () => {
      spawnCandyKingdomNPCs(state);
      
      const guard = state.npcs.find(n => n.faction === 'guards');
      expect(guard).toBeDefined();
      
      // Should have hostility evaluation
      expect(typeof guard.evaluateHostilityTo).toBe('function');
      
      // Guards should not be hostile to player by default
      const player = { factions: ['player'] };
      const hostilityResult = guard.evaluateHostilityTo(player);
      expect(hostilityResult.hostilityLevel).toBeLessThan(0.5); // Not hostile
      expect(hostilityResult.hostile).toBe(false);
    });
  });
});