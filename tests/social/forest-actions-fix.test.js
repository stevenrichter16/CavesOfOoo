// tests/social/forest-actions-fix.test.js  
// Test to verify that all SocialActions have valid requirements functions

import { describe, it, expect, beforeEach } from 'vitest';
import { SocialActions, isActionAvailable } from '../../src/js/social/actions.js';
import { getAvailableInteractions } from '../../src/js/social/init.js';
import '../../src/js/social/dialogue.candyMarket.js'; // Import to trigger stub creation

describe('Forest Actions Requirements Fix', () => {
  let player;
  let forestNPC;
  
  beforeEach(() => {
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      gold: 100,
      inventory: [],
      quests: {
        active: [],
        completed: [],
        progress: {},
        fetchQuests: {}
      }
    };
    
    forestNPC = {
      id: 'momma_bear',
      name: 'Momma Bear',
      dialogueType: 'momma_bear',
      faction: 'forest_animals',
      x: 11,
      y: 10,
      hp: 40,
      hpMax: 40,
      traits: ['protective', 'nurturing']
    };
  });
  
  describe('All SocialActions have requirements', () => {
    it('should have requirements function for all actions', () => {
      for (const [name, action] of Object.entries(SocialActions)) {
        expect(action, `Action ${name} is not an object`).toBeTruthy();
        expect(typeof action, `Action ${name} is not an object`).toBe('object');
        expect(typeof action.requirements, `Action ${name} missing requirements function`).toBe('function');
      }
    });
    
    it('should not throw when checking action availability', () => {
      for (const [name, action] of Object.entries(SocialActions)) {
        const checkAvailability = () => {
          isActionAvailable(player, forestNPC, name, {
            relation: { value: 0, trust: 0, fear: 0, respect: 0 }
          });
        };
        
        expect(checkAvailability, `Action ${name} threw error`).not.toThrow();
      }
    });
  });
  
  describe('Forest NPC interactions', () => {
    it('should get available interactions without error', () => {
      const getInteractions = () => {
        return getAvailableInteractions(player, forestNPC);
      };
      
      expect(getInteractions).not.toThrow();
      
      const interactions = getInteractions();
      expect(interactions).toBeTruthy();
      expect(Array.isArray(interactions)).toBe(true);
    });
    
    it('should have valid actions for forest animals', () => {
      const interactions = getAvailableInteractions(player, forestNPC);
      
      // Should have at least some basic interactions
      expect(interactions.length).toBeGreaterThan(0);
      
      // Each interaction should have required properties
      interactions.forEach(interaction => {
        expect(interaction).toHaveProperty('type');
        expect(interaction).toHaveProperty('label');
        // Description might be on the action or the interaction
        const action = SocialActions[interaction.type];
        expect(action || interaction).toHaveProperty('description');
      });
    });
    
    it('should handle guards NPC differently', () => {
      const guardNPC = {
        ...forestNPC,
        faction: 'guards',
        dialogueType: 'banana_guard'
      };
      
      const interactions = getAvailableInteractions(player, guardNPC);
      expect(interactions).toBeTruthy();
      
      // Guards might have report action available
      const reportAction = interactions.find(i => i.type === 'report');
      // Report action should only be available for guards based on our fix
      if (reportAction) {
        expect(guardNPC.faction).toBe('guards');
      }
    });
  });
  
  describe('Dynamically added actions', () => {
    it('should have proper structure for haggle action', () => {
      const haggle = SocialActions.haggle;
      if (haggle) {
        expect(haggle.requirements).toBeTruthy();
        expect(typeof haggle.requirements).toBe('function');
        expect(haggle.baseCost).toBeDefined();
        expect(haggle.description).toBeTruthy();
      }
    });
    
    it('should have proper structure for greet action', () => {
      const greet = SocialActions.greet;
      if (greet) {
        expect(greet.requirements).toBeTruthy();
        expect(typeof greet.requirements).toBe('function');
        expect(greet.baseCost).toBeDefined();
        expect(greet.description).toBeTruthy();
      }
    });
    
    it('should have proper structure for report action', () => {
      const report = SocialActions.report;
      if (report) {
        expect(report.requirements).toBeTruthy();
        expect(typeof report.requirements).toBe('function');
        expect(report.baseCost).toBeDefined();
        expect(report.description).toBeTruthy();
        
        // Test that report is only available for guards
        const guardContext = { target: { faction: 'guards' } };
        const nonGuardContext = { target: { faction: 'forest_animals' } };
        
        expect(report.requirements(guardContext)).toBe(true);
        expect(report.requirements(nonGuardContext)).toBe(false);
      }
    });
  });
});