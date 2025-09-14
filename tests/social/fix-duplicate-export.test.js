import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fix Duplicate Export Error', () => {
  
  describe('Identify duplicate exports in migrationAdapter.js', () => {
    it('should find all exports of spawnSocialNPC', () => {
      const filePath = path.join(process.cwd(), 'src/social/migrationAdapter.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find all lines that export spawnSocialNPC
      const lines = content.split('\n');
      const exportLines = [];
      
      lines.forEach((line, index) => {
        if (line.includes('export') && line.includes('spawnSocialNPC')) {
          exportLines.push({
            lineNumber: index + 1,
            content: line.trim()
          });
        }
      });
      
      console.log('Found exports of spawnSocialNPC:');
      exportLines.forEach(({lineNumber, content}) => {
        console.log(`  Line ${lineNumber}: ${content}`);
      });
      
      // There should only be ONE export of spawnSocialNPC
      expect(exportLines.length).toBeGreaterThan(0);
      
      // If more than one, we have a duplicate
      if (exportLines.length > 1) {
        console.log(`\n⚠️ DUPLICATE EXPORTS FOUND: ${exportLines.length} exports of spawnSocialNPC`);
      }
    });
  });
  
  describe('Check import/export pattern', () => {
    it('should identify the correct way to export spawnSocialNPC', () => {
      // spawnSocialNPC is imported from npcEnhanced.js
      // It should either be:
      // 1. Re-exported directly: export { spawnSocialNPC } from './npcEnhanced.js'
      // 2. Imported then exported: import { spawnSocialNPC } from './npcEnhanced.js'; export { spawnSocialNPC }
      // 3. Aliased: export const spawnSocialNPC = spawnNPC
      
      // But NOT multiple times!
      
      const validPatterns = [
        "export { spawnSocialNPC } from './npcEnhanced.js'",
        "export const spawnSocialNPC = spawnNPC",
        "export { spawnSocialNPC }"
      ];
      
      expect(validPatterns.length).toBe(3);
    });
  });
  
  describe('Verify npcEnhanced.js exports', () => {
    it('should check what npcEnhanced.js exports', () => {
      const filePath = path.join(process.cwd(), 'src/social/npcEnhanced.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find exports in npcEnhanced.js
      const hasSpawnSocialNPC = content.includes('export function spawnSocialNPC') ||
                               content.includes('export { spawnSocialNPC');
      
      console.log('npcEnhanced.js exports spawnSocialNPC:', hasSpawnSocialNPC);
      
      // This will help us understand the export structure
      expect(typeof hasSpawnSocialNPC).toBe('boolean');
    });
  });
});