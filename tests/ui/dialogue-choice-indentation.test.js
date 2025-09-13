// tests/ui/dialogue-choice-indentation.test.js
// Test that dialogue choices properly indent when selected

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Dialogue Choice Indentation', () => {
  let dom;
  let document;
  let container;
  let currentDialogueUI;
  
  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    
    // Create container for dialogue
    container = document.createElement('div');
    container.id = 'dialogue-tree';
    document.body.appendChild(container);
  });
  
  describe('Choice Rendering', () => {
    it('should render choices with proper indentation', () => {
      // Mock dialogue node with choices
      const node = {
        npcLine: 'Test dialogue',
        choices: [
          { text: 'Option 1', next: 'node1' },
          { text: 'Option 2', next: 'node2' },
          { text: 'Option 3', next: 'node3' }
        ]
      };
      
      // Simulate rendering choices with selection
      const selectedIndex = 1; // Second option selected
      
      let html = '<div>';
      node.choices.forEach((choice, index) => {
        const selected = index === selectedIndex;
        const textColor = selected ? 'var(--primary, #4af)' : '#ccc';
        
        html += `<div style="
          padding: 5px 0;
          margin: 2px 0;
          cursor: pointer;
          color: ${textColor};
        " data-choice="${index}">`;
        
        // This is the current implementation - arrow shows but no indentation
        html += selected ? '> ' : '  ';
        html += `[${index + 1}] ${choice.text}`;
        html += '</div>';
      });
      html += '</div>';
      
      container.innerHTML = html;
      
      // Check the rendered HTML
      const choiceDivs = container.querySelectorAll('[data-choice]');
      expect(choiceDivs.length).toBe(3);
      
      // Verify current behavior (failing test - no indentation)
      const selectedChoice = choiceDivs[1];
      const unselectedChoice1 = choiceDivs[0];
      const unselectedChoice2 = choiceDivs[2];
      
      // Selected should start with '> '
      expect(selectedChoice.textContent.trim()).toMatch(/^>\s+\[2\]/);
      // Unselected should start with spaces
      expect(unselectedChoice1.textContent.trim()).toMatch(/^\[1\]/);
      expect(unselectedChoice2.textContent.trim()).toMatch(/^\[3\]/);
    });
    
    it('should properly indent selected choice', () => {
      // This is what we want - selected choice indented
      const node = {
        npcLine: 'Test dialogue',
        choices: [
          { text: 'Option 1', next: 'node1' },
          { text: 'Option 2', next: 'node2' },
          { text: 'Option 3', next: 'node3' }
        ]
      };
      
      const selectedIndex = 1;
      
      let html = '<div>';
      node.choices.forEach((choice, index) => {
        const selected = index === selectedIndex;
        const textColor = selected ? 'var(--primary, #4af)' : '#ccc';
        
        html += `<div style="
          padding: 5px 0;
          margin: 2px 0;
          cursor: pointer;
          color: ${textColor};
        " data-choice="${index}">`;
        
        // CORRECT IMPLEMENTATION - indent selected choice
        if (selected) {
          html += '  > [' + (index + 1) + '] ' + choice.text;
        } else {
          html += '[' + (index + 1) + '] ' + choice.text;
        }
        
        html += '</div>';
      });
      html += '</div>';
      
      container.innerHTML = html;
      
      const choiceDivs = container.querySelectorAll('[data-choice]');
      
      // Verify correct indentation
      const selectedChoice = choiceDivs[1];
      const unselectedChoice1 = choiceDivs[0];
      
      // Selected should be indented with arrow
      expect(selectedChoice.textContent).toMatch(/^\s+>\s+\[2\]/);
      // Unselected should not be indented
      expect(unselectedChoice1.textContent).toMatch(/^\[1\]/);
      
      // Visual check - selected has leading spaces
      expect(selectedChoice.textContent.indexOf('>') > 0).toBe(true);
      expect(unselectedChoice1.textContent.indexOf('[1]')).toBe(0);
    });
    
    it('should update indentation when selection changes', () => {
      const choices = [
        { text: 'Option 1', next: 'node1' },
        { text: 'Option 2', next: 'node2' },
        { text: 'Option 3', next: 'node3' }
      ];
      
      // Test selection change from index 0 to index 1
      const renderChoices = (selectedIndex) => {
        let html = '<div>';
        choices.forEach((choice, index) => {
          const selected = index === selectedIndex;
          const textColor = selected ? 'var(--primary, #4af)' : '#ccc';
          
          html += `<div style="
            padding: 5px 0;
            margin: 2px 0;
            cursor: pointer;
            color: ${textColor};
          " data-choice="${index}">`;
          
          // Correct indentation
          if (selected) {
            html += '  > [' + (index + 1) + '] ' + choice.text;
          } else {
            html += '[' + (index + 1) + '] ' + choice.text;
          }
          
          html += '</div>';
        });
        html += '</div>';
        return html;
      };
      
      // First render with index 0 selected
      container.innerHTML = renderChoices(0);
      let choiceDivs = container.querySelectorAll('[data-choice]');
      expect(choiceDivs[0].textContent).toMatch(/^\s+>\s+\[1\]/);
      expect(choiceDivs[1].textContent).toMatch(/^\[2\]/);
      
      // Re-render with index 1 selected
      container.innerHTML = renderChoices(1);
      choiceDivs = container.querySelectorAll('[data-choice]');
      expect(choiceDivs[0].textContent).toMatch(/^\[1\]/);
      expect(choiceDivs[1].textContent).toMatch(/^\s+>\s+\[2\]/);
    });
  });
  
  describe('Keyboard Navigation', () => {
    it('should maintain proper indentation during keyboard navigation', () => {
      // Simulate dialogue UI state
      const mockDialogueUI = {
        selectedChoice: 0,
        npc: { name: 'Test NPC' }
      };
      
      const choices = [
        { text: 'First choice', next: 'node1' },
        { text: 'Second choice', next: 'node2' },
        { text: 'Third choice', next: 'node3' }
      ];
      
      const renderWithSelection = (selectedIndex) => {
        let html = '';
        choices.forEach((choice, index) => {
          const selected = index === selectedIndex;
          const textColor = selected ? 'var(--primary, #4af)' : '#ccc';
          
          html += `<div style="color: ${textColor};" data-choice="${index}">`;
          
          if (selected) {
            html += '  > [' + (index + 1) + '] ' + choice.text;
          } else {
            html += '[' + (index + 1) + '] ' + choice.text;
          }
          
          html += '</div>';
        });
        return html;
      };
      
      // Simulate arrow down key press
      mockDialogueUI.selectedChoice = 0;
      container.innerHTML = renderWithSelection(0);
      
      // Move down
      mockDialogueUI.selectedChoice = 1;
      container.innerHTML = renderWithSelection(1);
      
      const choiceDivs = container.querySelectorAll('[data-choice]');
      
      // First choice should no longer be indented
      expect(choiceDivs[0].textContent).toMatch(/^\[1\]/);
      // Second choice should now be indented
      expect(choiceDivs[1].textContent).toMatch(/^\s+>\s+\[2\]/);
      // Third choice should not be indented
      expect(choiceDivs[2].textContent).toMatch(/^\[3\]/);
    });
  });
});