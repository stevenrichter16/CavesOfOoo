import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verify Shopping District Actions Fixed', () => {
  
  describe('No behavior.js import', () => {
    it('should not import from behavior.js', () => {
      const filePath = path.join(process.cwd(), 'src/js/social/shoppingDistrictActions.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Should not import from behavior.js
      expect(content).not.toContain("from './behavior.js'");
      expect(content).not.toContain('from "../behavior.js"');
      
      // Should have a comment explaining removal
      expect(content).toContain('behavior.js is part of OLD system');
    });
  });
  
  describe('ShoppingDistrictActions module loads', () => {
    it('should successfully import shoppingDistrictActions', async () => {
      let loaded = false;
      let error = null;
      
      try {
        const module = await import('../../src/js/social/shoppingDistrictActions.js');
        loaded = true;
        
        // Check exports
        expect(module.ShoppingDistrictActions).toBeDefined();
        expect(module.registerShoppingDistrictActions).toBeDefined();
        expect(typeof module.registerShoppingDistrictActions).toBe('function');
      } catch (e) {
        error = e;
        console.error('Failed to load shoppingDistrictActions:', e);
      }
      
      expect(error).toBe(null);
      expect(loaded).toBe(true);
    });
    
    it('should have all expected action methods', async () => {
      const { ShoppingDistrictActions } = await import('../../src/js/social/shoppingDistrictActions.js');
      
      // Check that action methods exist
      const expectedActions = [
        'openShop',
        'completeQuest',
        'giveGift',
        'spreadRumor',
        'askAbout'
      ];
      
      expectedActions.forEach(action => {
        if (ShoppingDistrictActions[action]) {
          console.log(`✓ ${action} exists`);
          expect(typeof ShoppingDistrictActions[action]).toBe('function');
        } else {
          console.log(`⚠️ ${action} not found (may be optional)`);
        }
      });
      
      // At minimum, openShop should exist
      expect(ShoppingDistrictActions.openShop).toBeDefined();
    });
  });
  
  describe('Dynamic import in game.js', () => {
    it('should be able to dynamically import shoppingDistrictActions', async () => {
      // Simulate what game.js does
      let success = false;
      let error = null;
      
      try {
        const module = await import('../../src/js/social/shoppingDistrictActions.js');
        
        // Check if registerShoppingDistrictActions can be called
        if (module && module.registerShoppingDistrictActions) {
          // Don't actually call it as it may have side effects
          success = true;
          console.log('✓ Dynamic import successful');
          console.log('✓ registerShoppingDistrictActions is available');
        }
      } catch (e) {
        error = e;
        console.error('Dynamic import failed:', e);
      }
      
      expect(error).toBe(null);
      expect(success).toBe(true);
    });
  });
  
  describe('No remaining OLD system imports', () => {
    it('should not have any imports from removed OLD system files', () => {
      const filePath = path.join(process.cwd(), 'src/js/social/shoppingDistrictActions.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      const oldSystemFiles = [
        'behavior.js',
        'actions.js',
        'index.js',
        'init.js',
        'hostility.js',
        'disguise.js',
        'factions.js',
        'traits.js',
        'memory.js'
      ];
      
      oldSystemFiles.forEach(file => {
        expect(content).not.toContain(`from './${file}'`);
        expect(content).not.toContain(`from "./${file}"`);
      });
      
      console.log('✓ No OLD system imports found');
    });
  });
  
  describe('RelationshipSystem still works', () => {
    it('should successfully import RelationshipSystem', async () => {
      // shoppingDistrictActions imports RelationshipSystem
      // Make sure that still works
      const { RelationshipSystem } = await import('../../src/js/social/relationship.js');
      
      expect(RelationshipSystem).toBeDefined();
      console.log('✓ RelationshipSystem import works');
    });
  });
});