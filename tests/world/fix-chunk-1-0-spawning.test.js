import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fix Chunk (1,0) NPC Spawning Issue', () => {
  
  describe('Identify the problem', () => {
    it('should find all files trying to import OLD social/init.js', () => {
      const problemFiles = [
        'src/js/utils/queries.js',
        'src/js/movement/playerMovement.js', 
        'src/js/core/game.js',
        'src/js/world/candyShoppingDistrict.js'
      ];
      
      const issues = [];
      
      problemFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for OLD social system imports
          if (content.includes("'../social/init.js'") || 
              content.includes('"../social/init.js"')) {
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.includes('social/init.js')) {
                issues.push({
                  file: file,
                  line: idx + 1,
                  content: line.trim()
                });
              }
            });
          }
        }
      });
      
      console.log('Files with OLD social/init.js imports:');
      issues.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.content}`);
      });
      
      // These files need to be fixed
      expect(issues.length).toBeGreaterThan(0);
    });
  });
  
  describe('Test the fix', () => {
    it('should use NEW social system for spawning', async () => {
      // The correct import should be from migrationAdapter
      const { spawnSocialNPC } = await import('../../src/social/migrationAdapter.js');
      
      expect(spawnSocialNPC).toBeDefined();
      expect(typeof spawnSocialNPC).toBe('function');
      
      // Test spawning an NPC
      const state = {
        npcs: [],
        cx: 1,
        cy: 0
      };
      
      const npcData = {
        id: 'test_vendor',
        name: 'Test Vendor',
        x: 10,
        y: 10,
        chunkX: 1,
        chunkY: 0,
        shopkeeper: true,
        faction: 'merchants'
      };
      
      const npc = spawnSocialNPC(state, npcData);
      
      expect(npc).toBeDefined();
      expect(npc.name).toBe('Test Vendor');
      expect(npc.shopkeeper).toBe(true);
      expect(state.npcs.length).toBe(1);
    });
  });
  
  describe('Verify all import paths to fix', () => {
    it('should list all occurrences that need replacement', () => {
      const replacements = [
        {
          file: 'src/js/utils/queries.js',
          old: "import('../social/init.js')",
          new: "import('../../social/migrationAdapter.js')",
          reason: 'Dynamic import in edge travel handler'
        },
        {
          file: 'src/js/movement/playerMovement.js',
          old: "import('../social/init.js')",
          new: "import('../../social/migrationAdapter.js')",
          reason: 'Dynamic import in chunk change handler'
        },
        {
          file: 'src/js/core/game.js',
          old: "import('../social/init.js')",
          new: "import('../../social/migrationAdapter.js')",
          reason: 'Dynamic import in shopping district handler'
        },
        {
          file: 'src/js/world/candyShoppingDistrict.js',
          old: "require('../social/init.js')",
          new: "require('../../social/migrationAdapter.js')",
          reason: 'CommonJS require in spawn function'
        }
      ];
      
      console.log('\nImports to replace:');
      replacements.forEach(r => {
        console.log(`\n${r.file}:`);
        console.log(`  OLD: ${r.old}`);
        console.log(`  NEW: ${r.new}`);
        console.log(`  Why: ${r.reason}`);
      });
      
      expect(replacements.length).toBe(4);
    });
  });
});