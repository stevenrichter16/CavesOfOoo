import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NPC } from '../../../src/social/npcEnhanced.js';
import { spawnSocialNPC } from '../../../src/social/migrationAdapter.js';

describe('World File Migration - candyKingdomTown.js', () => {
  let state;
  let mockLog;

  beforeEach(() => {
    mockLog = vi.fn();
    
    // Mock game state similar to what world files expect
    state = {
      player: {
        id: 'player',
        x: 20,
        y: 10,
        inventory: [],
        gold: 100,
        quests: { active: [], completed: [] }
      },
      npcs: [],
      cx: 0,
      cy: 0,
      W: 40,
      H: 20,
      chunk: {
        isKingdomTown: true,
        npcs: [],
        map: Array(20).fill(null).map(() => Array(40).fill('.'))
      },
      log: mockLog
    };
  });

  describe('Candy Kingdom Town NPCs', () => {
    it('should spawn Banana Guards with NEW system', () => {
      // Simulate spawning Banana Guards like candyKingdomTown.js does
      const guardPositions = [
        { x: 5, y: 5, name: 'Banana Guard North' },
        { x: 35, y: 5, name: 'Banana Guard South' },
        { x: 20, y: 18, name: 'Banana Guard Gate' }
      ];
      
      guardPositions.forEach(pos => {
        const guard = spawnSocialNPC(state, {
          name: pos.name,
          type: 'banana_guard',
          faction: 'guards',
          x: pos.x,
          y: pos.y,
          hp: 25,
          hpMax: 25,
          dialogue: true,
          traits: ['brave', 'loyal'],
          glyph: 'B',
          color: 'yellow'
        });
        
        expect(guard).toBeInstanceOf(NPC);
        expect(guard.faction).toBe('guards');
        expect(guard.hasTrait('brave')).toBe(true);
      });
      
      expect(state.npcs).toHaveLength(3);
    });

    it('should spawn Candy Peasants with NEW system', () => {
      // Simulate spawning Candy Peasants
      const peasantTypes = [
        { name: 'Candy Corn Citizen', glyph: 'c', color: 'orange' },
        { name: 'Gummy Bear', glyph: 'g', color: 'green' },
        { name: 'Lollipop Lady', glyph: 'l', color: 'pink' }
      ];
      
      peasantTypes.forEach((type, i) => {
        const peasant = spawnSocialNPC(state, {
          name: type.name,
          type: 'candy_peasant',
          faction: 'peasants',
          x: 10 + i * 5,
          y: 10,
          hp: 15,
          hpMax: 15,
          dialogue: true,
          glyph: type.glyph,
          color: type.color,
          traits: ['gossip']
        });
        
        expect(peasant).toBeInstanceOf(NPC);
        expect(peasant.faction).toBe('peasants');
        expect(peasant.dialogue).toBe(true);
        expect(peasant.glyph).toBe(type.glyph);
      });
      
      expect(state.npcs).toHaveLength(3);
    });

    it('should spawn merchants with shop functionality', () => {
      const merchant = spawnSocialNPC(state, {
        name: 'Candy Merchant',
        type: 'merchant',
        faction: 'merchants',
        x: 20,
        y: 15,
        hp: 20,
        hpMax: 20,
        dialogue: true,
        shopkeeper: true,
        goods: [
          { id: 'candy_apple', name: 'Candy Apple', price: 5, count: 10 },
          { id: 'sugar_bomb', name: 'Sugar Bomb', price: 15, count: 5 },
          { id: 'health_potion', name: 'Health Potion', price: 20, count: 3 }
        ],
        traits: ['greedy'],
        glyph: 'M',
        color: 'gold'
      });
      
      expect(merchant).toBeInstanceOf(NPC);
      expect(merchant.shopkeeper).toBe(true);
      expect(merchant.goods).toHaveLength(3);
      expect(merchant.goods[0].name).toBe('Candy Apple');
      expect(merchant.hasTrait('greedy')).toBe(true);
    });

    it('should spawn quest giver NPCs', () => {
      const questGiver = spawnSocialNPC(state, {
        name: 'Root Beer Guy',
        type: 'root_beer_guy',
        faction: 'peasants',
        x: 30,
        y: 8,
        hp: 18,
        hpMax: 18,
        dialogue: true,
        dialogueType: 'quest_giver',
        questGiver: true,
        quests: ['candy_thief_case', 'missing_ingredients'],
        traits: ['helpful', 'gossip'],
        glyph: 'R',
        color: 'brown'
      });
      
      expect(questGiver).toBeInstanceOf(NPC);
      expect(questGiver.questGiver).toBe(true);
      expect(questGiver.quests).toHaveLength(2);
      expect(questGiver.dialogueType).toBe('quest_giver');
      expect(questGiver.hasTrait('helpful')).toBe(true);
    });
  });

  describe('Migration pattern for world files', () => {
    it('should support batch spawning pattern', () => {
      // Simulate a typical spawning pattern from world files
      const npcConfigs = [
        { name: 'Guard 1', faction: 'guards', x: 5, y: 5 },
        { name: 'Guard 2', faction: 'guards', x: 10, y: 5 },
        { name: 'Peasant 1', faction: 'peasants', x: 15, y: 10 },
        { name: 'Merchant', faction: 'merchants', x: 20, y: 15, shopkeeper: true }
      ];
      
      // Spawn all NPCs
      npcConfigs.forEach(config => {
        spawnSocialNPC(state, {
          ...config,
          hp: 20,
          hpMax: 20,
          dialogue: true
        });
      });
      
      // All should be NEW NPCs
      expect(state.npcs).toHaveLength(4);
      state.npcs.forEach(npc => {
        expect(npc).toBeInstanceOf(NPC);
        expect(npc.dialogue).toBe(true);
      });
      
      // Check specific NPCs
      expect(state.npcs[3].shopkeeper).toBe(true);
      expect(state.npcs[0].faction).toBe('guards');
    });

    it('should maintain chunk association', () => {
      // Test that NPCs are associated with correct chunk
      state.cx = 2;
      state.cy = -1;
      
      const npc = spawnSocialNPC(state, {
        name: 'Chunk Test NPC',
        faction: 'peasants',
        x: 10,
        y: 10
      });
      
      expect(npc.chunkX).toBe(2);
      expect(npc.chunkY).toBe(-1);
    });

    it('should support dynamic NPC spawning during gameplay', () => {
      // Simulate spawning NPCs after game has started
      // First spawn some initial NPCs
      spawnSocialNPC(state, { name: 'Initial NPC', faction: 'guards' });
      
      expect(state.npcs).toHaveLength(1);
      
      // Later, spawn more NPCs (like when entering a new area)
      const dynamicNPCs = [
        { name: 'Dynamic 1', faction: 'merchants' },
        { name: 'Dynamic 2', faction: 'peasants' }
      ];
      
      dynamicNPCs.forEach(config => {
        spawnSocialNPC(state, config);
      });
      
      // All NPCs should be NEW format
      expect(state.npcs).toHaveLength(3);
      state.npcs.forEach(npc => {
        expect(npc).toBeInstanceOf(NPC);
      });
    });
  });

  describe('Special NPC types', () => {
    it('should handle Starchy (graveyard keeper)', () => {
      const starchy = spawnSocialNPC(state, {
        id: 'starchy',
        name: 'Starchy',
        type: 'starchy',
        faction: 'peasants',
        x: 20,
        y: 10,
        hp: 30,
        hpMax: 30,
        dialogue: true,
        dialogueType: 'starchy',
        questGiver: true,
        quests: ['warding_the_haints'],
        traits: ['nervous', 'helpful'],
        glyph: 'S',
        color: 'gray'
      });
      
      expect(starchy).toBeInstanceOf(NPC);
      expect(starchy.id).toBe('starchy');
      expect(starchy.dialogueType).toBe('starchy');
      expect(starchy.hasTrait('nervous')).toBe(true);
    });

    it('should handle Princess Bubblegum', () => {
      const pb = spawnSocialNPC(state, {
        id: 'princess_bubblegum',
        name: 'Princess Bubblegum',
        type: 'royalty',
        faction: 'royalty',
        x: 20,
        y: 5,
        hp: 100,
        hpMax: 100,
        dialogue: true,
        dialogueType: 'princess_bubblegum',
        traits: ['intelligent', 'proud'],
        glyph: 'P',
        color: 'pink'
      });
      
      expect(pb).toBeInstanceOf(NPC);
      expect(pb.faction).toBe('royalty');
      expect(pb.hasTrait('intelligent')).toBe(true);
    });

    it('should handle hostile bandits', () => {
      const bandit = spawnSocialNPC(state, {
        name: 'Candy Bandit',
        type: 'bandit',
        factions: ['bandits'],  // Multi-faction support
        attitude: 'hostile',
        x: 30,
        y: 15,
        hp: 25,
        hpMax: 25,
        dialogue: false,  // No dialogue, just combat
        glyph: 'b',
        color: 'red'
      });
      
      expect(bandit).toBeInstanceOf(NPC);
      expect(bandit.factions).toContain('bandits');
      expect(bandit.attitude).toBe('hostile');
      expect(bandit.dialogue).toBe(false);
      
      // Should have hostility evaluation
      expect(typeof bandit.evaluateHostilityTo).toBe('function');
    });
  });

  describe('Backward compatibility checks', () => {
    it('should work with existing dialogue system', () => {
      const npc = spawnSocialNPC(state, {
        name: 'Dialogue Test',
        type: 'banana_guard',
        faction: 'guards',
        dialogue: true,
        dialogueType: 'banana_guard'
      });
      
      // Check dialogue lookup compatibility
      const biome = 'candy_kingdom';
      const lookupType = npc.dialogueType || npc.type || npc.faction;
      const dialogueKey = `${biome}:${lookupType}`;
      
      expect(dialogueKey).toBe('candy_kingdom:banana_guard');
      expect(npc.dialogue).toBe(true);
    });

    it('should work with existing UI checks', () => {
      const npc = spawnSocialNPC(state, {
        name: 'UI Test',
        faction: 'guards',
        dialogue: true
      });
      
      // Simulate UI check from openNPCInteraction
      const hasDialogueTree = (npc.faction && 
        ['nobles', 'guards', 'merchants', 'peasants', 'forest_animals', 'wizards'].includes(npc.faction)) ||
        npc.dialogueType;
      
      expect(hasDialogueTree).toBe(true);
    });

    it('should maintain save/load compatibility', () => {
      const npc = spawnSocialNPC(state, {
        name: 'Save Test',
        faction: 'merchants',
        traits: ['greedy'],
        inventory: [{ id: 'gold', count: 50 }]
      });
      
      // Simulate save/load
      const serialized = JSON.stringify(npc);
      const deserialized = JSON.parse(serialized);
      
      // Should be convertible back to NPC
      const restored = NPC.fromOldFormat(deserialized);
      expect(restored).toBeInstanceOf(NPC);
      expect(restored.name).toBe('Save Test');
      expect(restored.hasTrait('greedy')).toBe(true);
    });
  });
});