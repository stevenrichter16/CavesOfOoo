// src/js/social/dialogueBootstrap.js
// Central bootstrap for all dialogue systems

import { DialogueGenerator } from './dialogue.js';
import { registerCandyMarketDialogue } from './dialogue.candyMarket.js';

// Create the shared dialogue generator instance
export const dialogueGen = new DialogueGenerator();

// Register all dialogue modules
export function initializeDialogues() {
  // Register Candy Market dialogues
  registerCandyMarketDialogue(dialogueGen);
  
  // Future dialogue modules can be registered here
  // registerCandyCastleDialogue(dialogueGen);
  // registerCandyForestDialogue(dialogueGen);
  
  console.log('Dialogue systems initialized');
}

// Initialize on module load
initializeDialogues();

// Helper function to get dialogue for an NPC
export function getNPCDialogue(npc, player, state) {
  const ctx = { actor: player, target: npc, state };
  
  // First check for NPC-specific tree
  const tree = dialogueGen.trees?.[npc.id] 
            || dialogueGen.trees?.[npc.dialogueType];
            
  if (tree) {
    return tree(ctx); // returns a {text, options[]} node to render
  }
  
  // Fallback to generator one-liners by attitude/type
  return { 
    text: dialogueGen.generate(npc, player, { tone: npc.dialogueType || 'neutral' }),
    options: [ { label: "Goodbye" } ]
  };
}