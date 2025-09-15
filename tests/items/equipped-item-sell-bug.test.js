import { describe, it, expect, beforeEach } from 'vitest';

describe('Equipped Item Selling Bug', () => {
  
  describe('Problem Analysis', () => {
    it('should identify the bug scenario', () => {
      // Scenario: Player has multiple items in inventory
      const mockState = {
        player: {
          gold: 100,
          inventory: [
            { type: 'potion', item: { name: 'Health Potion', price: 20 }, id: 'potion1' },
            { type: 'weapon', item: { name: 'Iron Sword', price: 50 }, id: 'sword1' },
            { type: 'armor', item: { name: 'Leather Armor', price: 40 }, id: 'armor1' },
            { type: 'weapon', item: { name: 'Magic Staff', price: 80 }, id: 'staff1' }
          ],
          weapon: null, // This should reference the equipped weapon
          armor: null
        },
        ui: {
          shopMode: 'sell',
          shopSelectedIndex: 2, // User selected index 2 (Leather Armor)
          confirmSell: true,
          confirmChoice: 'yes'
        }
      };
      
      // Set the armor as equipped
      mockState.player.armor = mockState.player.inventory[2]; // Leather Armor
      
      console.log('Scenario:');
      console.log('  Inventory:', mockState.player.inventory.map(i => i.item.name));
      console.log('  Equipped armor:', mockState.player.armor?.item?.name);
      console.log('  Selected index:', mockState.ui.shopSelectedIndex);
      console.log('  Expected to sell:', mockState.player.inventory[2].item.name);
      console.log('  BUG: Might sell:', mockState.player.inventory[0].item.name);
      
      expect(mockState.ui.shopSelectedIndex).toBe(2);
      expect(mockState.player.armor).toBe(mockState.player.inventory[2]);
    });
  });
  
  describe('Index Tracking Issue', () => {
    it('should track how the selected index changes when filtering', () => {
      const allInventory = [
        { type: 'quest', item: { name: 'Quest Item' } },  // Not sellable
        { type: 'potion', item: { name: 'Potion' } },     // Index 0 in filtered
        { type: 'weapon', item: { name: 'Sword' } },      // Index 1 in filtered
        { type: 'quest', item: { name: 'Another Quest' } }, // Not sellable
        { type: 'armor', item: { name: 'Armor' } }        // Index 2 in filtered
      ];
      
      // Filter to only sellable items (like the shop does)
      const sellableItems = allInventory.filter(item => 
        item.type === 'weapon' || 
        item.type === 'armor' || 
        item.type === 'potion'
      );
      
      console.log('\nIndex mapping problem:');
      console.log('  Full inventory:', allInventory.map((i, idx) => `${idx}: ${i.item.name}`));
      console.log('  Sellable items:', sellableItems.map((i, idx) => `${idx}: ${i.item.name}`));
      
      // If user selects index 2 in sellable list, it's "Armor"
      // But if we use that index on the full inventory, it's "Sword"!
      const selectedInSellable = 2;
      const itemFromSellable = sellableItems[selectedInSellable];
      const itemFromFull = allInventory[selectedInSellable];
      
      console.log(`\n  Selected index ${selectedInSellable}:`);
      console.log(`    In sellable list: ${itemFromSellable?.item?.name || 'undefined'}`);
      console.log(`    In full inventory: ${itemFromFull?.item?.name || 'undefined'}`);
      
      expect(itemFromSellable?.item?.name).toBe('Armor');
      expect(itemFromFull?.item?.name).toBe('Sword');
      expect(itemFromSellable).not.toBe(itemFromFull);
    });
  });
  
  describe('Shop System Sell Function', () => {
    it('should check how sellItem function works', () => {
      // The sellItem function likely does:
      // 1. Filter inventory to get sellable items
      // 2. Use shopSelectedIndex on the FILTERED list
      // 3. But then might incorrectly reference the ORIGINAL inventory
      
      const possibleBugs = [
        'Using filtered index on unfiltered inventory',
        'Not tracking which actual inventory item was selected',
        'Losing reference to equipped item during filtering',
        'Resetting index when confirming sale'
      ];
      
      console.log('\nPossible bugs in sellItem:');
      possibleBugs.forEach(bug => console.log(`  - ${bug}`));
      
      expect(possibleBugs.length).toBeGreaterThan(0);
    });
  });
  
  describe('Expected vs Actual Behavior', () => {
    it('should define expected behavior', () => {
      const expected = {
        userAction: 'Select equipped armor at index 2 in sell list',
        confirmation: 'Confirm selling equipped armor',
        result: 'Equipped armor is sold and unequipped'
      };
      
      const actual = {
        userAction: 'Select equipped armor at index 2 in sell list',
        confirmation: 'Confirm selling equipped armor',
        result: 'First item in inventory is sold instead'
      };
      
      console.log('\nExpected behavior:', expected);
      console.log('Actual (buggy) behavior:', actual);
      
      expect(expected.result).not.toBe(actual.result);
    });
  });
  
  describe('Fix Requirements', () => {
    it('should define what needs to be fixed', () => {
      const fixes = {
        indexMapping: 'Map filtered index back to actual inventory index',
        itemReference: 'Keep reference to actual item being sold',
        equippedCheck: 'Properly check if selected item is equipped',
        confirmationData: 'Pass correct item reference through confirmation'
      };
      
      console.log('\nRequired fixes:');
      Object.entries(fixes).forEach(([area, fix]) => {
        console.log(`  ${area}: ${fix}`);
      });
      
      expect(Object.keys(fixes).length).toBe(4);
    });
  });
});