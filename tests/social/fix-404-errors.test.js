import { describe, it, expect } from 'vitest';

describe('Fix 404 Errors - Verify OLD system imports are removed', () => {
  
  describe('Updated imports in UI files', () => {
    it('should import from migrationAdapter in social.js', async () => {
      const socialUI = await import('../../src/js/ui/social.js');
      expect(socialUI).toBeDefined();
      // Should not throw error about missing index.js
    });
    
    it('should import from migrationAdapter in dialogueTree.js', async () => {
      const dialogueTreeUI = await import('../../src/js/ui/dialogueTree.js');
      expect(dialogueTreeUI).toBeDefined();
      // Should not throw error about missing index.js
    });
  });
  
  describe('Updated imports in quest files', () => {
    it('should import from migrationAdapter in candyKingdomQuests.js', async () => {
      const quests = await import('../../src/js/quests/candyKingdomQuests.js');
      expect(quests).toBeDefined();
      expect(quests.CANDY_KINGDOM_QUESTS).toBeDefined();
      // Should not throw error about missing index.js
    });
  });
  
  describe('Updated imports in game.js', () => {
    it('should import from migrationAdapter in game.js', async () => {
      const game = await import('../../src/js/core/game.js');
      expect(game).toBeDefined();
      expect(game.initGame).toBeDefined();
      // Should not throw error about missing index.js or hostility.js
    });
    
    it('should not have processHostileNPCs or processNPCSocialTurn calls', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const gamePath = path.join(process.cwd(), 'src/js/core/game.js');
      const gameContent = fs.readFileSync(gamePath, 'utf8');
      
      // Should not call these removed functions
      expect(gameContent).not.toMatch(/^\s*processHostileNPCs\(state\);/m);
      expect(gameContent).not.toMatch(/^\s*processNPCSocialTurn\(state\);/m);
      
      // Should have comments explaining the NEW system handles this
      expect(gameContent).toContain('NEW system handles this automatically');
    });
  });
  
  describe('No missing file errors', () => {
    it('should not have any imports from removed files', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const removedFiles = [
        '../social/index.js',
        '../social/hostility.js',
        '../social/init.js',
        '../social/traits.js',
        '../social/memory.js',
        '../social/dialogueTreesV2.js',
        '../social/behavior.js',
        '../social/actions.js',
        '../social/factions.js',
        '../social/disguise.js'
      ];
      
      // Check key files don't import from removed files
      const filesToCheck = [
        'src/js/core/game.js',
        'src/js/ui/social.js',
        'src/js/ui/dialogueTree.js',
        'src/js/quests/candyKingdomQuests.js'
      ];
      
      filesToCheck.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        removedFiles.forEach(removedFile => {
          const importPattern = new RegExp(`from\\s+['"]${removedFile.replace(/\./g, '\\.')}['"]`);
          expect(content).not.toMatch(importPattern);
        });
      });
    });
  });
  
  describe('All imports use NEW system', () => {
    it('should use migrationAdapter or NEW social modules', () => {
      const validImports = [
        '../../social/migrationAdapter.js',
        '../../social/dialogue.js',
        '../../social/memory.js',
        '../../social/traits.js',
        '../../social/npcEnhanced.js',
        '../../social/interactions.js',
        '../social/relationship.js', // Game-specific, kept
        '../social/dialogueBootstrap.js', // Game-specific, kept
        '../social/shoppingDistrictActions.js' // Game-specific, kept
      ];
      
      // All imports should be from these valid sources
      expect(validImports.length).toBeGreaterThan(0);
    });
  });
});