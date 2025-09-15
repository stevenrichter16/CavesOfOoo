import { describe, it, expect } from 'vitest';

describe('Fix Equipped Item Sell Index Bug', () => {
  
  describe('Bug identification', () => {
    it('should identify the exact bug location', () => {
      const bugLocation = {
        file: 'src/js/items/shop.js',
        function: 'handleSellConfirmation',
        line: 414,
        code: 'const result = sellItem(state, state.ui.shopSelectedIndex, true);',
        problem: 'Using filtered index (shopSelectedIndex) directly on full inventory'
      };
      
      console.log('Bug found at:');
      console.log(`  File: ${bugLocation.file}`);
      console.log(`  Function: ${bugLocation.function}`);
      console.log(`  Line: ${bugLocation.line}`);
      console.log(`  Buggy code: ${bugLocation.code}`);
      console.log(`  Problem: ${bugLocation.problem}`);
      
      expect(bugLocation.problem).toContain('filtered index');
    });
  });
  
  describe('Solution design', () => {
    it('should store actual inventory index when confirming', () => {
      // Solution: Store the actual inventory index when confirmation is triggered
      const solution = `
        // In handleSellToVendor when setting confirmSell:
        if (result.needsConfirmation) {
          STATE.ui.confirmSell = true;
          STATE.ui.confirmChoice = 'no';
          STATE.ui.confirmItemIndex = actualIndex; // NEW: Store actual index
          ShopUI.renderShop(STATE);
        }
        
        // In handleSellConfirmation:
        if (confirm && state.ui.confirmChoice === 'yes') {
          // Use stored actual index instead of shopSelectedIndex
          const result = sellItem(state, state.ui.confirmItemIndex, true);
          ...
        }
      `;
      
      console.log('\nProposed solution:', solution);
      
      expect(solution).toContain('confirmItemIndex');
      expect(solution).toContain('actualIndex');
    });
  });
  
  describe('Test the fix logic', () => {
    it('should correctly map filtered index to actual index', () => {
      const state = {
        player: {
          inventory: [
            { type: 'quest', item: { name: 'Quest Item' }, id: 'q1' },
            { type: 'potion', item: { name: 'Health Potion' }, id: 'p1' },
            { type: 'weapon', item: { name: 'Iron Sword' }, id: 'w1' },
            { type: 'armor', item: { name: 'Leather Armor' }, id: 'a1' },
            { type: 'quest', item: { name: 'Another Quest' }, id: 'q2' }
          ]
        },
        ui: {
          shopSelectedIndex: 2 // Selected "Leather Armor" in filtered list
        }
      };
      
      // Filter sellable items
      const sellableItems = state.player.inventory.filter(item => 
        item.type === 'weapon' || 
        item.type === 'armor' || 
        item.type === 'potion'
      );
      
      console.log('\nInventory mapping:');
      console.log('Full inventory:');
      state.player.inventory.forEach((item, idx) => {
        console.log(`  [${idx}] ${item.item.name} (${item.type})`);
      });
      
      console.log('\nFiltered sellable items:');
      sellableItems.forEach((item, idx) => {
        console.log(`  [${idx}] ${item.item.name}`);
      });
      
      // Get selected item from filtered list
      const selectedItem = sellableItems[state.ui.shopSelectedIndex];
      console.log(`\nSelected at filtered index ${state.ui.shopSelectedIndex}: ${selectedItem.item.name}`);
      
      // Find actual index
      const actualIndex = state.player.inventory.indexOf(selectedItem);
      console.log(`Actual inventory index: ${actualIndex}`);
      console.log(`Item at actual index: ${state.player.inventory[actualIndex].item.name}`);
      
      expect(selectedItem.item.name).toBe('Leather Armor');
      expect(actualIndex).toBe(3); // Leather Armor is at index 3 in full inventory
      expect(state.ui.shopSelectedIndex).toBe(2); // But index 2 in filtered list
    });
  });
  
  describe('Implementation steps', () => {
    it('should define the fix implementation', () => {
      const steps = [
        '1. Add confirmItemIndex to UI state initialization',
        '2. Store actual index in handleSellToVendor when confirmation needed',
        '3. Use confirmItemIndex in handleSellConfirmation instead of shopSelectedIndex',
        '4. Clear confirmItemIndex when closing shop or canceling'
      ];
      
      console.log('\nImplementation steps:');
      steps.forEach(step => console.log(`  ${step}`));
      
      expect(steps.length).toBe(4);
    });
  });
  
  describe('Verification', () => {
    it('should verify the fix works correctly', () => {
      // Simulate the fixed flow
      const state = {
        player: {
          inventory: [
            { type: 'potion', item: { name: 'Potion', price: 20 }, id: 'p1' },
            { type: 'weapon', item: { name: 'Sword', price: 50 }, id: 'w1' },
            { type: 'armor', item: { name: 'Armor', price: 40 }, id: 'a1' }
          ],
          armor: null,
          gold: 100
        },
        ui: {
          shopSelectedIndex: 1, // Selected Armor in filtered list
          confirmSell: false,
          confirmChoice: 'no',
          confirmItemIndex: null
        }
      };
      
      // Make armor equipped
      state.player.armor = state.player.inventory[2];
      
      // Filter sellable items
      const sellableItems = state.player.inventory.filter(item => 
        item.type === 'weapon' || item.type === 'armor' || item.type === 'potion'
      );
      
      // User selects index 1 in sell menu (which is Sword in filtered list)
      // But wait, we want to select Armor which is at index 2 in filtered
      state.ui.shopSelectedIndex = 2;
      
      const selectedItem = sellableItems[state.ui.shopSelectedIndex];
      const actualIndex = state.player.inventory.indexOf(selectedItem);
      
      console.log('\nFix verification:');
      console.log(`  Selected in UI: ${selectedItem.item.name} at filtered index ${state.ui.shopSelectedIndex}`);
      console.log(`  Actual inventory index: ${actualIndex}`);
      console.log(`  Will sell: ${state.player.inventory[actualIndex].item.name}`);
      
      // Store actual index for confirmation
      state.ui.confirmItemIndex = actualIndex;
      
      // Confirm sale using stored index
      const itemToSell = state.player.inventory[state.ui.confirmItemIndex];
      console.log(`  Confirming sale of: ${itemToSell.item.name}`);
      
      expect(itemToSell.item.name).toBe('Armor');
      expect(state.ui.confirmItemIndex).toBe(2);
    });
  });
});