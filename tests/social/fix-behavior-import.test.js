import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fix behavior.js 404 and shoppingDistrictActions.js Error', () => {
  
  describe('Find who imports behavior.js', () => {
    it('should identify files importing behavior.js', () => {
      const srcDir = path.join(process.cwd(), 'src');
      const importingFiles = [];
      
      function searchDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('backup')) {
            searchDirectory(itemPath);
          } else if (item.endsWith('.js') && !item.endsWith('.bak')) {
            const content = fs.readFileSync(itemPath, 'utf8');
            
            if (content.includes('behavior.js')) {
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.includes('behavior.js')) {
                  importingFiles.push({
                    file: path.relative(process.cwd(), itemPath),
                    line: index + 1,
                    content: line.trim()
                  });
                }
              });
            }
          }
        });
      }
      
      searchDirectory(srcDir);
      
      console.log('Files importing behavior.js:');
      importingFiles.forEach(({file, line, content}) => {
        console.log(`  ${file}:${line} - ${content}`);
      });
      
      // Document findings
      expect(importingFiles).toBeDefined();
    });
  });
  
  describe('Check shoppingDistrictActions.js', () => {
    it('should verify shoppingDistrictActions.js exists', () => {
      const filePath = path.join(process.cwd(), 'src/js/social/shoppingDistrictActions.js');
      const exists = fs.existsSync(filePath);
      
      console.log('shoppingDistrictActions.js exists:', exists);
      expect(exists).toBe(true);
    });
    
    it('should check what shoppingDistrictActions.js imports', () => {
      const filePath = path.join(process.cwd(), 'src/js/social/shoppingDistrictActions.js');
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const imports = [];
        lines.forEach((line, index) => {
          if (line.includes('import') && line.includes('from')) {
            imports.push({
              line: index + 1,
              content: line.trim()
            });
          }
        });
        
        console.log('shoppingDistrictActions.js imports:');
        imports.forEach(({line, content}) => {
          console.log(`  Line ${line}: ${content}`);
        });
        
        // Check for problematic imports
        const hasBehaviorImport = content.includes('behavior.js');
        const hasOldSystemImports = content.includes('/social/index.js') || 
                                    content.includes('/social/init.js') ||
                                    content.includes('/social/actions.js');
        
        console.log('Has behavior.js import:', hasBehaviorImport);
        console.log('Has OLD system imports:', hasOldSystemImports);
        
        expect(typeof hasBehaviorImport).toBe('boolean');
      }
    });
  });
  
  describe('Check game.js dynamic import', () => {
    it('should find where game.js imports shoppingDistrictActions', () => {
      const filePath = path.join(process.cwd(), 'src/js/core/game.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find dynamic imports
      const dynamicImportPattern = /import\([^)]*shoppingDistrictActions[^)]*\)/g;
      const matches = content.match(dynamicImportPattern);
      
      if (matches) {
        console.log('Dynamic imports of shoppingDistrictActions:');
        matches.forEach(match => {
          console.log(`  ${match}`);
        });
      }
      
      // Find the line number
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('shoppingDistrictActions')) {
          console.log(`Line ${index + 1}: ${line.trim()}`);
        }
      });
      
      expect(matches || []).toBeDefined();
    });
  });
  
  describe('Behavior.js functionality', () => {
    it('should identify what behavior.js provided', () => {
      // behavior.js likely provided NPC behavior functions
      const behaviorFunctions = {
        'updateNPCBehavior': 'Update NPC AI behavior',
        'processNPCTurn': 'Process NPC turn actions',
        'getNPCAction': 'Get next NPC action',
        'evaluateBehavior': 'Evaluate NPC behavior state'
      };
      
      // These functions might need to be:
      // 1. Removed if not used
      // 2. Replaced with NEW system equivalents
      // 3. Created as stubs if needed
      
      expect(Object.keys(behaviorFunctions).length).toBeGreaterThan(0);
    });
  });
});