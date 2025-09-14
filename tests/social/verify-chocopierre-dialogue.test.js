import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verify Chocopierre Dialogue Fixed', () => {
  
  describe('All referenced nodes exist', () => {
    it('should have all nodes referenced in chocopierre dialogue', () => {
      const filePath = path.join(process.cwd(), 'src/js/data/uniqueNPCDialogues.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract chocopierre section
      const startIndex = content.indexOf('chocopierre: {');
      const endIndex = content.indexOf('candy_child: {', startIndex);
      const chocoPierreSection = content.substring(startIndex, endIndex);
      
      // Find all node IDs that are defined
      const definedNodes = new Set();
      const nodeIdPattern = /id:\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = nodeIdPattern.exec(chocoPierreSection)) !== null) {
        definedNodes.add(match[1]);
      }
      
      // Find all nodes that are referenced
      const referencedNodes = new Set();
      const nextPattern = /next:\s*['"]([^'"]+)['"]/g;
      while ((match = nextPattern.exec(chocoPierreSection)) !== null) {
        referencedNodes.add(match[1]);
      }
      
      console.log('Defined nodes:', Array.from(definedNodes));
      console.log('Referenced nodes:', Array.from(referencedNodes));
      
      // Check that all referenced nodes are defined
      const missingNodes = [];
      referencedNodes.forEach(nodeId => {
        if (!definedNodes.has(nodeId)) {
          missingNodes.push(nodeId);
        }
      });
      
      if (missingNodes.length > 0) {
        console.error('Missing nodes:', missingNodes);
      }
      
      expect(missingNodes).toEqual([]);
    });
    
    it('should have the respected node', () => {
      const filePath = path.join(process.cwd(), 'src/js/data/uniqueNPCDialogues.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain("id: 'respected'");
      expect(content).toContain('Your appreciation for zee craft');
    });
    
    it('should have all missing nodes added', () => {
      const filePath = path.join(process.cwd(), 'src/js/data/uniqueNPCDialogues.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      const requiredNodes = [
        'respected',
        'accent', 
        'peasant',
        'haggle',
        'purchase_milk'
      ];
      
      requiredNodes.forEach(nodeId => {
        const hasNode = content.includes(`id: '${nodeId}'`);
        console.log(`Node '${nodeId}': ${hasNode ? '✓' : '✗'}`);
        expect(hasNode).toBe(true);
      });
    });
  });
  
  describe('Dialogue flow validation', () => {
    it('should be able to navigate through dialogue', async () => {
      const dialogueModule = await import('../../src/social/dialogue.js');
      const uniqueNPCs = await import('../../src/js/data/uniqueNPCDialogues.js');
      
      // Register chocopierre dialogue
      const chocoDialogue = uniqueNPCs.uniqueNPCDialogues.chocopierre;
      
      // Convert nodes array to object format for dialogue system
      const nodesObj = {};
      chocoDialogue.nodes.forEach(node => {
        nodesObj[node.id] = node;
      });
      
      dialogueModule.registerDialogueTree('chocopierre', {
        id: 'chocopierre',
        start: chocoDialogue.start || 'greeting',
        nodes: nodesObj
      });
      
      // Test navigation path that was failing
      const state = { player: { gold: 100 } };
      const npc = { dialogueType: 'chocopierre' };
      
      // Start dialogue
      dialogueModule.startDialogue(state, state.player, npc);
      let node = dialogueModule.getCurrentNode();
      expect(node.id).toBe('greeting');
      
      // Select "Your chocolates look amazing!" -> flattered
      dialogueModule.selectChoice(0);
      node = dialogueModule.getCurrentNode();
      expect(node.id).toBe('flattered');
      
      // Select "Tell me about your training" -> backstory
      dialogueModule.selectChoice(0);
      node = dialogueModule.getCurrentNode();
      expect(node.id).toBe('backstory');
      
      // Select "That's incredible dedication" -> respected (was missing)
      dialogueModule.selectChoice(0);
      node = dialogueModule.getCurrentNode();
      expect(node).toBeDefined();
      expect(node.id).toBe('respected');
      expect(node.text).toContain('appreciation for zee craft');
      
      console.log('✓ Dialogue flow works correctly');
    });
  });
});