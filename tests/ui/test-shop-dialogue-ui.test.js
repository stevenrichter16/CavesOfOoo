import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Shop Dialogue UI Integration', () => {
  let dom;
  let document;
  let window;
  
  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    window = dom.window;
    
    // Make DOM globals available
    global.document = document;
    global.window = window;
    
    // Add CSS custom properties
    document.documentElement.style.setProperty('--bg', '#222');
    document.documentElement.style.setProperty('--primary', '#4af');
    document.documentElement.style.setProperty('--gold', '#ff0');
    document.documentElement.style.setProperty('--danger', '#f44');
    document.documentElement.style.setProperty('--ok', '#4f4');
    document.documentElement.style.setProperty('--fg', '#fff');
  });
  
  describe('Shop renders in dialogue style', () => {
    it('should create shop container with dialogue styling', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopSelectedIndex: 0,
          shopVendor: {
            name: 'Pizza Sassy',
            faction: 'merchants',
            inventory: [
              { 
                type: 'potion',
                item: { name: 'Pizza Slice', heal: 10 },
                price: 10
              },
              {
                type: 'potion',
                item: { name: 'Garlic Knots', heal: 5 },
                price: 5
              }
            ]
          }
        },
        player: {
          gold: 50,
          inventory: []
        }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      expect(container).toBeDefined();
      expect(container.style.position).toBe('absolute');
      expect(container.style.transform).toContain('translate(-50%, -50%)');
      expect(container.style.border).toContain('2px solid');
      expect(container.style.fontFamily).toBe('monospace');
    });
    
    it('should display NPC name as header', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopSelectedIndex: 0,
          shopVendor: {
            name: 'Chocopierre',
            faction: 'merchants',
            inventory: []
          }
        },
        player: { gold: 100, inventory: [] }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      expect(container.innerHTML).toContain("Chocopierre's Shop");
      expect(container.querySelector('h3')).toBeDefined();
    });
    
    it('should display items in numbered choice format', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopSelectedIndex: 0,
          shopVendor: {
            name: 'Test Vendor',
            inventory: [
              {
                type: 'weapon',
                item: { name: 'Iron Sword', dmg: 5 },
                price: 50
              },
              {
                type: 'armor',
                item: { name: 'Leather Armor', def: 3 },
                price: 40
              }
            ]
          }
        },
        player: { gold: 100, inventory: [] }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      const html = container.innerHTML;
      
      // Check for numbered items
      expect(html).toContain('[1] Iron Sword - 50g (Damage +5)');
      expect(html).toContain('[2] Leather Armor - 40g (Defense +3)');
      
      // Check for selection arrow on first item
      expect(html).toContain('&gt; [1]');
    });
    
    it('should show keyboard hints at bottom', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopSelectedIndex: 0,
          shopVendor: {
            name: 'Test',
            inventory: []
          }
        },
        player: { gold: 0, inventory: [] }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      const html = container.innerHTML;
      
      expect(html).toContain('[↑/↓] or numbers to select');
      expect(html).toContain('[Enter] to Buy');
      expect(html).toContain('[Tab] switch mode');
      expect(html).toContain('[ESC] to exit');
    });
  });
  
  describe('Shop modes display correctly', () => {
    it('should show BUYING mode', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopSelectedIndex: 0,
          shopVendor: { name: 'Test', inventory: [] }
        },
        player: { gold: 50, inventory: [] }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      expect(container.innerHTML).toContain('BUYING');
      expect(container.innerHTML).toContain('Your Gold: 50');
    });
    
    it('should show SELLING mode with player inventory', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          shopMode: 'sell',
          shopSelectedIndex: 0,
          shopVendor: { name: 'Test', inventory: [] }
        },
        player: {
          gold: 50,
          inventory: [
            {
              type: 'weapon',
              item: { name: 'Old Sword', price: 20 }
            }
          ],
          weapon: null
        }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      expect(container.innerHTML).toContain('SELLING');
      expect(container.innerHTML).toContain('Old Sword - 10g'); // Half price for selling
    });
  });
  
  describe('Confirmation dialog', () => {
    it('should show warning for equipped items', async () => {
      const { renderShopDialogueStyle } = await import('../../src/js/ui/shopDialogue.js');
      
      const mockState = {
        ui: {
          shopOpen: true,
          confirmSell: true,
          confirmChoice: 'no',
          shopVendor: { name: 'Test' }
        },
        player: { gold: 50 }
      };
      
      renderShopDialogueStyle(mockState);
      
      const container = document.getElementById('shop-dialogue');
      const html = container.innerHTML;
      
      expect(html).toContain('WARNING');
      expect(html).toContain('EQUIPPED');
      expect(html).toContain('[1] YES - Sell it');
      expect(html).toContain('[2] NO - Keep it');
      expect(container.style.border).toContain('var(--danger');
    });
  });
});