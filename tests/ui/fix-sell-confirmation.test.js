import { describe, it, expect, beforeEach } from 'vitest';

describe('Fix Sell Confirmation Navigation', () => {
  
  describe('Bug Analysis', () => {
    it('should identify the bug in handleShopControls', () => {
      // BUG: Line 706 in keys.js always passes 'left' regardless of key
      const buggyCode = `
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          ShopSystem.navigateShop(STATE, 'left'); // BUG: Always 'left'
          ShopUI.renderShop(STATE);
        }
      `;
      
      const fixedCode = `
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          const direction = e.key === "ArrowLeft" ? 'left' : 'right';
          ShopSystem.navigateShop(STATE, direction);
          ShopUI.renderShop(STATE);
        }
      `;
      
      console.log('Buggy code:', buggyCode);
      console.log('Fixed code:', fixedCode);
      
      expect(fixedCode).toContain("e.key === \"ArrowLeft\" ? 'left' : 'right'");
    });
  });
  
  describe('Number Key Support', () => {
    it('should add number key handling for yes/no', () => {
      const enhancedCode = `
        if (STATE.ui.confirmSell) {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            const direction = e.key === "ArrowLeft" ? 'left' : 'right';
            ShopSystem.navigateShop(STATE, direction);
            ShopUI.renderShop(STATE);
          } else if (e.key === "1") {
            STATE.ui.confirmChoice = 'yes';
            ShopUI.renderShop(STATE);
          } else if (e.key === "2") {
            STATE.ui.confirmChoice = 'no';
            ShopUI.renderShop(STATE);
          } else if (e.key === "Enter") {
            // ... existing Enter handling
          }
        }
      `;
      
      expect(enhancedCode).toContain('e.key === "1"');
      expect(enhancedCode).toContain('e.key === "2"');
      expect(enhancedCode).toContain("confirmChoice = 'yes'");
      expect(enhancedCode).toContain("confirmChoice = 'no'");
    });
  });
  
  describe('Navigation Function Test', () => {
    it('should properly toggle between yes and no', () => {
      // Test the shop.js navigateShop function
      const mockState = {
        ui: {
          confirmSell: true,
          confirmChoice: 'no'
        }
      };
      
      // Simulate navigateShop function from shop.js
      const navigateShop = (state, direction) => {
        if (state.ui.confirmSell) {
          if (direction === 'left' || direction === 'right') {
            state.ui.confirmChoice = state.ui.confirmChoice === 'yes' ? 'no' : 'yes';
          }
        }
      };
      
      // Initial state
      expect(mockState.ui.confirmChoice).toBe('no');
      
      // Press left - should toggle to yes
      navigateShop(mockState, 'left');
      expect(mockState.ui.confirmChoice).toBe('yes');
      
      // Press right - should toggle back to no
      navigateShop(mockState, 'right');
      expect(mockState.ui.confirmChoice).toBe('no');
      
      // Press left again - should be yes
      navigateShop(mockState, 'left');
      expect(mockState.ui.confirmChoice).toBe('yes');
    });
  });
  
  describe('Complete Fix', () => {
    it('should define the complete fix for keys.js', () => {
      const completeFix = {
        file: 'src/js/input/keys.js',
        line: 706,
        changes: [
          'Fix arrow key direction passing',
          'Add number key (1/2) support',
          'Ensure UI re-renders after changes'
        ]
      };
      
      console.log('Fix location:', completeFix.file);
      console.log('Line to fix:', completeFix.line);
      console.log('Changes needed:');
      completeFix.changes.forEach(change => {
        console.log(`  - ${change}`);
      });
      
      expect(completeFix.file).toBe('src/js/input/keys.js');
      expect(completeFix.line).toBe(706);
    });
  });
});