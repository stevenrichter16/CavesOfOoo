import { describe, it, expect, beforeEach } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { Schedule, TimeOfDay, DutyType } from '../../src/social/schedule.js';
import { createRumor } from '../../src/social/rumors.js';

describe('Phase 8: Save/Load Integration - Social System Persistence', () => {
  let serializer;
  let testNPCs;
  let testRelationships;
  let testRumors;
  
  beforeEach(() => {
    // Will be implemented
    const { SocialSerializer } = require('../../src/social/serialization/SocialSerializer.js');
    serializer = new SocialSerializer();
    
    // Create test NPCs with various states
    testNPCs = [
      new NPC({
        id: 'merchant1',
        name: 'Merchant Mike',
        role: 'merchant',
        factions: ['candy_merchants', 'candy_citizens'],
        factionWeights: { 'candy_merchants': 0.7, 'candy_citizens': 0.3 },
        x: 10,
        y: 15,
        kingdomId: 'candy'
      }),
      new NPC({
        id: 'guard1',
        name: 'Guard Gary',
        role: 'guard',
        factions: ['candy_guards'],
        x: 5,
        y: 5,
        kingdomId: 'candy'
      })
    ];
    
    // Add schedules
    testNPCs[0].schedule = new Schedule({
      [TimeOfDay.MORNING]: DutyType.SETUP_SHOP,
      [TimeOfDay.AFTERNOON]: DutyType.TRADING,
      [TimeOfDay.EVENING]: DutyType.SOCIALIZE,
      [TimeOfDay.NIGHT]: DutyType.SLEEP
    });
    
    // Add memory/rumors
    testNPCs[0].memory.addRumor({
      id: 'rumor1',
      type: 'trade',
      content: 'Prices are rising!',
      severity: 'minor'
    });
    
    // Add social values
    testNPCs[0].social = {
      trust: 0.6,
      fear: 0.2,
      respect: 0.7
    };
    
    // Test relationships
    testRelationships = {
      'player_merchant1': {
        trust: 0.8,
        fear: 0.1,
        respect: 0.9,
        lastInteraction: Date.now()
      },
      'player_guard1': {
        trust: 0.4,
        fear: 0.5,
        respect: 0.6,
        lastInteraction: Date.now() - 86400000 // Yesterday
      }
    };
    
    // Test rumors
    testRumors = [
      createRumor({
        type: 'scandal',
        severity: 'major',
        content: 'The princess was seen with a vampire!',
        details: 'Late night meeting in the garden'
      }),
      createRumor({
        type: 'trade',
        severity: 'minor',
        content: 'New merchant in town',
        details: 'Selling rare items'
      })
    ];
  });
  
  describe('NPC Serialization', () => {
    it('should serialize basic NPC properties', () => {
      const data = serializer.serializeNPCs(testNPCs);
      
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('merchant1');
      expect(data[0].name).toBe('Merchant Mike');
      expect(data[0].role).toBe('merchant');
      expect(data[0].kingdomId).toBe('candy');
      expect(data[0].position).toEqual({ x: 10, y: 15 });
    });
    
    it('should serialize multi-faction data', () => {
      const data = serializer.serializeNPCs(testNPCs);
      
      expect(data[0].factions).toEqual(['candy_merchants', 'candy_citizens']);
      expect(data[0].factionWeights).toEqual({
        'candy_merchants': 0.7,
        'candy_citizens': 0.3
      });
    });
    
    it('should serialize schedules', () => {
      const data = serializer.serializeNPCs(testNPCs);
      
      expect(data[0].schedule).toBeDefined();
      expect(data[0].schedule[TimeOfDay.MORNING]).toBe(DutyType.SETUP_SHOP);
      expect(data[0].schedule[TimeOfDay.AFTERNOON]).toBe(DutyType.TRADING);
    });
    
    it('should serialize memory and rumors', () => {
      const data = serializer.serializeNPCs(testNPCs);
      
      expect(data[0].memory).toBeDefined();
      expect(data[0].memory.rumors).toHaveLength(1);
      expect(data[0].memory.rumors[0].content).toBe('Prices are rising!');
    });
    
    it('should serialize social values', () => {
      const data = serializer.serializeNPCs(testNPCs);
      
      expect(data[0].social).toEqual({
        trust: 0.6,
        fear: 0.2,
        respect: 0.7
      });
    });
    
    it('should limit event history to prevent bloat', () => {
      // Add many events to NPC memory
      for (let i = 0; i < 200; i++) {
        testNPCs[0].memory.events.push({
          type: 'interaction',
          timestamp: Date.now() - i * 1000
        });
      }
      
      const data = serializer.serializeNPCs(testNPCs);
      
      // Should only keep last 100 events
      expect(data[0].memory.events).toHaveLength(100);
    });
  });
  
  describe('NPC Deserialization', () => {
    it('should restore NPCs from serialized data', () => {
      const serialized = serializer.serializeNPCs(testNPCs);
      const restored = serializer.deserializeNPCs(serialized);
      
      expect(restored).toHaveLength(2);
      expect(restored[0].id).toBe('merchant1');
      expect(restored[0].name).toBe('Merchant Mike');
      expect(restored[0].x).toBe(10);
      expect(restored[0].y).toBe(15);
    });
    
    it('should restore schedules', () => {
      const serialized = serializer.serializeNPCs(testNPCs);
      const restored = serializer.deserializeNPCs(serialized);
      
      expect(restored[0].schedule).toBeDefined();
      expect(restored[0].schedule.getCurrentDuty(8)).toBe(DutyType.SETUP_SHOP);
      expect(restored[0].schedule.getCurrentDuty(14)).toBe(DutyType.TRADING);
    });
    
    it('should restore memory with functional methods', () => {
      const serialized = serializer.serializeNPCs(testNPCs);
      const restored = serializer.deserializeNPCs(serialized);
      
      // Memory should have functional addRumor method
      expect(restored[0].memory.addRumor).toBeDefined();
      expect(restored[0].memory.rumors).toHaveLength(1);
      
      // Should be able to add new rumors
      const added = restored[0].memory.addRumor({
        id: 'new_rumor',
        content: 'Test rumor'
      });
      
      expect(added).toBe(true);
      expect(restored[0].memory.rumors).toHaveLength(2);
    });
  });
  
  describe('Relationship Serialization', () => {
    it('should serialize relationship data', () => {
      const data = serializer.serializeRelationships(testRelationships);
      
      expect(data['player_merchant1']).toBeDefined();
      expect(data['player_merchant1'].trust).toBe(0.8);
      expect(data['player_merchant1'].lastInteraction).toBeDefined();
    });
    
    it('should restore relationships', () => {
      const serialized = serializer.serializeRelationships(testRelationships);
      const restored = serializer.deserializeRelationships(serialized);
      
      expect(restored['player_merchant1'].trust).toBe(0.8);
      expect(restored['player_guard1'].fear).toBe(0.5);
    });
  });
  
  describe('Rumor Queue Serialization', () => {
    it('should serialize active rumors', () => {
      const data = serializer.serializeRumors(testRumors);
      
      expect(data).toHaveLength(2);
      expect(data[0].type).toBe('scandal');
      expect(data[0].severity).toBe('major');
      expect(data[1].type).toBe('trade');
    });
    
    it('should restore rumor queue', () => {
      const serialized = serializer.serializeRumors(testRumors);
      const restored = serializer.deserializeRumors(serialized);
      
      expect(restored).toHaveLength(2);
      expect(restored[0].content).toBe('The princess was seen with a vampire!');
      expect(restored[0].id).toBeDefined(); // Should preserve IDs
    });
  });
  
  describe('Full State Serialization', () => {
    it('should serialize complete social state', () => {
      const state = {
        npcs: testNPCs,
        relationships: testRelationships,
        rumors: testRumors,
        factions: {
          'candy_merchants': { standing: 0.5, reputation: 0.7 },
          'candy_guards': { standing: 0.3, reputation: 0.4 }
        }
      };
      
      const data = serializer.serialize(state);
      
      expect(data.version).toBe('1.0.0');
      expect(data.npcs).toBeDefined();
      expect(data.relationships).toBeDefined();
      expect(data.rumors).toBeDefined();
      expect(data.factions).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
    
    it('should restore complete social state', () => {
      const state = {
        npcs: testNPCs,
        relationships: testRelationships,
        rumors: testRumors,
        factions: {
          'candy_merchants': { standing: 0.5, reputation: 0.7 }
        }
      };
      
      const serialized = serializer.serialize(state);
      const restored = serializer.deserialize(serialized);
      
      expect(restored.npcs).toHaveLength(2);
      expect(restored.relationships['player_merchant1']).toBeDefined();
      expect(restored.rumors).toHaveLength(2);
      expect(restored.factions['candy_merchants'].standing).toBe(0.5);
    });
  });
  
  describe('Version Migration', () => {
    it('should handle old save format migration', () => {
      const oldFormat = {
        version: '0.9.0',
        npcs: [
          {
            id: 'old_npc',
            name: 'Old NPC',
            faction: 'candy_citizens', // Single faction in old format
            x: 5,
            y: 5
          }
        ]
      };
      
      const migrated = serializer.migrate(oldFormat);
      
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.npcs[0].factions).toEqual(['candy_citizens']); // Converted to array
    });
    
    it('should add missing fields with defaults', () => {
      const incomplete = {
        version: '1.0.0',
        npcs: [
          {
            id: 'incomplete',
            name: 'Incomplete NPC'
            // Missing many fields
          }
        ]
      };
      
      const restored = serializer.deserialize(incomplete);
      
      expect(restored.npcs[0].factions).toEqual([]);
      expect(restored.npcs[0].memory).toBeDefined();
      expect(restored.npcs[0].social).toBeDefined();
    });
  });
  
  describe('Performance', () => {
    it('should serialize large NPC populations efficiently', () => {
      const manyNPCs = [];
      for (let i = 0; i < 100; i++) {
        const npc = new NPC({
          id: `npc${i}`,
          name: `NPC ${i}`,
          role: 'citizen',
          factions: ['candy_citizens'],
          x: i % 20,
          y: Math.floor(i / 20)
        });
        
        // Add some rumors to each
        for (let j = 0; j < 5; j++) {
          npc.memory.addRumor({
            id: `rumor_${i}_${j}`,
            content: `Rumor ${j} for NPC ${i}`
          });
        }
        
        manyNPCs.push(npc);
      }
      
      const startTime = performance.now();
      const serialized = serializer.serializeNPCs(manyNPCs);
      const serializeTime = performance.now() - startTime;
      
      expect(serializeTime).toBeLessThan(50); // Should serialize 100 NPCs in < 50ms
      
      const deserializeStart = performance.now();
      const restored = serializer.deserializeNPCs(serialized);
      const deserializeTime = performance.now() - deserializeStart;
      
      expect(deserializeTime).toBeLessThan(100); // Should deserialize in < 100ms
      expect(restored).toHaveLength(100);
    });
    
    it('should compress serialized data efficiently', () => {
      const state = {
        npcs: testNPCs,
        relationships: testRelationships,
        rumors: testRumors,
        factions: {}
      };
      
      const uncompressed = JSON.stringify(serializer.serialize(state));
      const compressed = serializer.compress(serializer.serialize(state));
      
      // Compressed should be smaller
      expect(compressed.length).toBeLessThan(uncompressed.length);
      
      // Should be able to decompress
      const decompressed = serializer.decompress(compressed);
      expect(decompressed.version).toBe('1.0.0');
    });
  });
});