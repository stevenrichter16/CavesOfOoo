import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  MigrationAdapter,
  migrateSpawnSocialNPC,
  migrateInitializeNPC,
  migrateDialogueSystem,
  migrateMovementSystem
} from '../../../src/social/migrationAdapter.js';
import { NPC } from '../../../src/social/npcEnhanced.js';

describe('Social System Migration Adapter', () => {
  let adapter;
  let state;
  
  beforeEach(() => {
    adapter = new MigrationAdapter();
    state = {
      npcs: [],
      cx: 0,
      cy: 0,
      player: {
        id: 'player',
        x: 10,
        y: 10,
        inventory: [],
        quests: { active: [], completed: [] }
      }
    };
  });

  describe('spawnSocialNPC migration', () => {
    it('should replace OLD spawnSocialNPC with NEW NPC.spawn', () => {
      const config = {
        name: 'Test Guard',
        type: 'banana_guard',
        faction: 'guards',
        x: 5,
        y: 5,
        dialogue: true
      };
      
      // Migrate spawn function
      const newSpawn = migrateSpawnSocialNPC();
      const npc = newSpawn(state, config);
      
      expect(npc).toBeInstanceOf(NPC);
      expect(npc.name).toBe('Test Guard');
      expect(npc.faction).toBe('guards');
      expect(state.npcs).toHaveLength(1);
      expect(state.npcs[0]).toBe(npc);
    });

    it('should handle all OLD spawnSocialNPC parameters', () => {
      const config = {
        name: 'Vendor',
        shopkeeper: true,
        goods: [{ id: 'potion', price: 20 }],
        traits: ['greedy'],
        faction: 'merchants'
      };
      
      const newSpawn = migrateSpawnSocialNPC();
      const npc = newSpawn(state, config);
      
      expect(npc.shopkeeper).toBe(true);
      expect(npc.goods).toHaveLength(1);
      expect(npc.hasTrait('greedy')).toBe(true);
      expect(npc.faction).toBe('merchants');
    });
  });

  describe('initializeNPC migration', () => {
    it('should convert plain objects to NPC class', () => {
      const plainNPC = {
        id: 'plain_1',
        name: 'Plain NPC',
        x: 5,
        y: 5,
        faction: 'peasants',
        traits: ['humble']
      };
      
      const newInitialize = migrateInitializeNPC();
      const npc = newInitialize(plainNPC);
      
      expect(npc).toBeInstanceOf(NPC);
      expect(npc.id).toBe('plain_1');
      expect(npc.hasTrait('humble')).toBe(true);
    });

    it('should not double-convert NPC instances', () => {
      const npc = new NPC({
        id: 'test',
        name: 'Already NPC'
      });
      
      const newInitialize = migrateInitializeNPC();
      const result = newInitialize(npc);
      
      expect(result).toBe(npc); // Same instance
    });
  });

  describe('Dialogue system migration', () => {
    it('should work with dialogueTreesV2 without changes', () => {
      const npc = new NPC({
        id: 'guard',
        dialogueType: 'banana_guard',
        faction: 'guards'
      });
      
      // Dialogue key generation should work
      const biome = 'candy_kingdom';
      const dialogueType = npc.dialogueType || npc.faction;
      const key = `${biome}:${dialogueType}`;
      
      expect(key).toBe('candy_kingdom:banana_guard');
    });

    it('should provide dialogue context compatibility', () => {
      const npc = new NPC({
        id: 'test',
        traits: ['proud'],
        faction: 'nobles',
        inventory: [{ id: 'gem' }]
      });
      
      const context = npc.toDialogueContext();
      
      expect(context.hasTrait('proud')).toBe(true);
      expect(context.faction).toBe('nobles');
      expect(context.inventory).toHaveLength(1);
    });

    it('should handle dialogue conditions', () => {
      const npc = new NPC({
        id: 'merchant',
        traits: ['greedy'],
        shopkeeper: true
      });
      
      // Test conditions dialogue system uses
      expect(npc.hasTrait('greedy')).toBe(true);
      expect(npc.shopkeeper).toBe(true);
    });
  });

  describe('Movement system migration', () => {
    it('should work with MovementAdapter.isNPCHostileToPlayer', () => {
      const hostileNPC = new NPC({
        id: 'bandit',
        factions: ['bandits'],
        attitude: 'hostile'
      });
      
      // Should have the methods MovementAdapter expects
      expect(typeof hostileNPC.evaluateHostilityTo).toBe('function');
      
      const player = {
        factions: ['player']
      };
      
      const hostility = hostileNPC.evaluateHostilityTo(player, {
        lawLevel: 50,
        kingdomId: 'candy_kingdom'
      });
      
      expect(hostility).toBeDefined();
      expect(typeof hostility.hostile).toBe('boolean');
    });

    it('should detect and convert OLD format NPCs', () => {
      const oldNPC = {
        id: 'old',
        name: 'Old NPC',
        traits: ['brave'],
        hasTrait: function(t) { return this.traits.includes(t); }
      };
      
      expect(NPC.isOldFormat(oldNPC)).toBe(true);
      
      const newNPC = NPC.fromOldFormat(oldNPC);
      expect(newNPC).toBeInstanceOf(NPC);
      expect(newNPC.hasTrait('brave')).toBe(true);
    });
  });

  describe('Batch migration', () => {
    it('should migrate all NPCs in state', () => {
      // Mix of old and new NPCs
      state.npcs = [
        // Old format
        {
          id: 'old_1',
          name: 'Old NPC',
          traits: ['humble'],
          hasTrait: function(t) { return this.traits?.includes(t); }
        },
        // Already new
        new NPC({ id: 'new_1', name: 'New NPC' }),
        // Another old
        {
          id: 'old_2',
          faction: 'guards',
          dialogue: true
        }
      ];
      
      adapter.migrateState(state);
      
      // All should be NPC instances now
      expect(state.npcs[0]).toBeInstanceOf(NPC);
      expect(state.npcs[1]).toBeInstanceOf(NPC);
      expect(state.npcs[2]).toBeInstanceOf(NPC);
      
      // Check data preserved
      expect(state.npcs[0].hasTrait('humble')).toBe(true);
      expect(state.npcs[1].id).toBe('new_1');
      expect(state.npcs[2].faction).toBe('guards');
    });

    it('should handle empty or missing npcs array', () => {
      const emptyState = { npcs: [] };
      adapter.migrateState(emptyState);
      expect(emptyState.npcs).toEqual([]);
      
      const noNpcsState = {};
      adapter.migrateState(noNpcsState);
      expect(noNpcsState.npcs).toBeUndefined();
    });
  });

  describe('Import path replacements', () => {
    it('should provide replacement imports', () => {
      const replacements = adapter.getImportReplacements();
      
      expect(replacements['../social/init.js']).toBe('../social/migrationAdapter.js');
      expect(replacements['../js/social/init.js']).toBe('../social/migrationAdapter.js');
      expect(replacements['../../src/js/social/init.js']).toBe('../../src/social/migrationAdapter.js');
    });

    it('should export compatible functions', () => {
      // These should be available as named exports
      expect(typeof migrateSpawnSocialNPC).toBe('function');
      expect(typeof migrateInitializeNPC).toBe('function');
      expect(typeof migrateDialogueSystem).toBe('function');
      expect(typeof migrateMovementSystem).toBe('function');
    });
  });

  describe('Gradual migration support', () => {
    it('should allow file-by-file migration', () => {
      // Should be able to migrate individual files
      const migrated = adapter.migrateFile('/src/js/world/candyKingdomTown.js', `
        import { spawnSocialNPC } from '../social/init.js';
        
        export function spawnTownNPCs(state) {
          spawnSocialNPC(state, { name: 'Guard' });
        }
      `);
      
      expect(migrated).toContain('migrationAdapter.js');
      expect(migrated).toContain('// Migrated from OLD social system');
    });

    it('should track migration progress', () => {
      adapter.markMigrated('/src/js/world/candyKingdomTown.js');
      adapter.markMigrated('/src/js/world/theForest.js');
      
      const progress = adapter.getMigrationProgress();
      expect(progress.migrated).toContain('/src/js/world/candyKingdomTown.js');
      expect(progress.migrated).toContain('/src/js/world/theForest.js');
      expect(progress.migrated).toHaveLength(2);
    });
  });
});