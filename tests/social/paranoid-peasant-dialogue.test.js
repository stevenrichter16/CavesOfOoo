import { describe, it, expect, beforeEach } from 'vitest';

describe('Peppermint Larry (Paranoid Peasant) Dialogue', () => {
  let dialogue;
  let uniqueDialogues;

  beforeEach(async () => {
    dialogue = await import('../../src/social/dialogue.js');
    uniqueDialogues = await import('../../src/js/data/uniqueNPCDialogues.js');
  });

  it('should have defensive node when telling Peppermint Larry they are paranoid', () => {
    const peppermintLarry = uniqueDialogues.uniqueNPCDialogues.peppermint_larry;
    
    // Find the start node (which is 'nervous' for Peppermint Larry)
    const startNode = peppermintLarry.nodes.find(n => n.id === 'nervous');
    expect(startNode).toBeDefined();
    
    // Find the "You seem paranoid" choice
    const paranoidChoice = startNode.choices.find(c => c.text === "You seem paranoid");
    expect(paranoidChoice).toBeDefined();
    expect(paranoidChoice.next).toBe('defensive');
    
    // Verify defensive node exists
    const defensiveNode = peppermintLarry.nodes.find(n => n.id === 'defensive');
    expect(defensiveNode).toBeDefined();
    expect(defensiveNode.npcLine).toContain("PARANOID?!");
    expect(defensiveNode.choices).toHaveLength(3);
  });

  it('should have all referenced dialogue nodes', () => {
    const peppermintLarry = uniqueDialogues.uniqueNPCDialogues.peppermint_larry;
    const nodes = peppermintLarry.nodes;
    
    // Collect all referenced node IDs
    const referencedNodes = new Set();
    nodes.forEach(node => {
      node.choices?.forEach(choice => {
        if (choice.next) {
          referencedNodes.add(choice.next);
        }
      });
    });
    
    // Verify all referenced nodes exist
    const existingNodeIds = new Set(nodes.map(n => n.id));
    referencedNodes.forEach(nodeId => {
      expect(existingNodeIds.has(nodeId)).toBe(true);
    });
  });

  it('should handle the full conspiracy dialogue flow', async () => {
    const { registerDialogueTree, startDialogue, selectChoice, getCurrentNode } = dialogue;
    
    // Register Peppermint Larry's dialogue
    const peppermintLarry = uniqueDialogues.uniqueNPCDialogues.peppermint_larry;
    registerDialogueTree('peppermint_larry', {
      id: 'peppermint_larry',
      start: 'nervous',
      nodes: peppermintLarry.nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {})
    });
    
    // Create NPC and player
    const npc = {
      id: 'peppermint_larry',
      name: 'Peppermint Larry',
      dialogueType: 'peppermint_larry'
    };
    
    const state = {
      player: {
        id: 'player',
        gold: 100
      }
    };
    
    // Start dialogue
    startDialogue(state, state.player, npc);
    let node = getCurrentNode();
    
    expect(node).toBeDefined();
    expect(node.text).toContain("Sugar Surveillance");
    
    // Select "You seem paranoid" (index 1)
    selectChoice(1);
    node = getCurrentNode();
    
    // Should now be at defensive node
    expect(node).toBeDefined();
    expect(node.text).toContain("PARANOID?!");
    expect(node.choices).toHaveLength(3);
    
    // Select "I'm not an agent of anyone" (index 1)
    selectChoice(1);
    node = getCurrentNode();
    
    // Should now be at suspicious node
    expect(node).toBeDefined();
    expect(node.text).toContain("EXACTLY what an agent would say");
  });
});