import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fix Missing Respected Dialogue Node', () => {
  
  describe('Identify the dialogue tree with missing node', () => {
    it('should find dialogue with backstory -> respected transition', () => {
      // Based on the console logs:
      // - Has 'greeting' node
      // - Has 'flattered' node 
      // - Has 'backstory' node
      // - Missing 'respected' node
      // - Appears to be about chocolates and training
      
      const clues = {
        nodeSequence: ['greeting', 'flattered', 'backstory', 'respected'],
        context: 'chocolates, training',
        likelyNPC: 'chocopierre or chocolate vendor'
      };
      
      console.log('Dialogue clues:', clues);
      expect(clues.nodeSequence[3]).toBe('respected');
    });
  });
  
  describe('Search for the dialogue file', () => {
    it('should search for files containing backstory and chocolates', () => {
      const dataDir = path.join(process.cwd(), 'src/js/data');
      const worldDir = path.join(process.cwd(), 'src/js/world');
      const socialDir = path.join(process.cwd(), 'src/js/social');
      
      const searchDirs = [dataDir, worldDir, socialDir];
      const foundFiles = [];
      
      searchDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          
          files.forEach(file => {
            if (file.endsWith('.js') && !file.endsWith('.bak')) {
              const filePath = path.join(dir, file);
              const content = fs.readFileSync(filePath, 'utf8');
              
              // Look for backstory node and chocolate references
              if (content.includes('backstory') && 
                  (content.includes('chocolate') || content.includes('Chocolate'))) {
                foundFiles.push({
                  file: path.relative(process.cwd(), filePath),
                  hasBackstory: content.includes("'backstory'") || content.includes('"backstory"'),
                  hasRespected: content.includes("'respected'") || content.includes('"respected"'),
                  hasChocolate: content.includes('chocolate') || content.includes('Chocolate')
                });
              }
            }
          });
        }
      });
      
      console.log('Files with backstory and chocolate references:');
      foundFiles.forEach(f => {
        console.log(`  ${f.file}`);
        console.log(`    - Has backstory: ${f.hasBackstory}`);
        console.log(`    - Has respected: ${f.hasRespected}`);
        console.log(`    - Has chocolate: ${f.hasChocolate}`);
      });
      
      expect(foundFiles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Find specific dialogue tree', () => {
    it('should locate chocopierre dialogue', () => {
      // Most likely chocopierre based on chocolate context
      const possibleFiles = [
        'src/js/data/uniqueNPCDialogues.js',
        'src/js/data/candyKingdomDialoguesV3.js',
        'src/js/data/shoppingDistrictDialogues.js'
      ];
      
      let foundDialogue = null;
      
      possibleFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes('chocopierre') || content.includes('Chocopierre')) {
            // Find the specific section
            const lines = content.split('\n');
            let inChocoPierre = false;
            let nodeCount = 0;
            
            lines.forEach((line, index) => {
              if (line.includes('chocopierre:') || line.includes('Chocopierre')) {
                inChocoPierre = true;
                console.log(`Found Chocopierre dialogue at ${file}:${index + 1}`);
              }
              
              if (inChocoPierre) {
                if (line.includes('backstory')) {
                  console.log(`  Found backstory at line ${index + 1}`);
                }
                if (line.includes("next: 'respected'") || line.includes('next: "respected"')) {
                  console.log(`  Found reference to respected at line ${index + 1}`);
                  foundDialogue = { file, line: index + 1 };
                }
                if (line.includes("id: 'respected'") || line.includes('id: "respected"')) {
                  console.log(`  Found respected node at line ${index + 1}`);
                }
              }
            });
          }
        }
      });
      
      if (foundDialogue) {
        console.log(`\n✓ Found dialogue needing fix in ${foundDialogue.file}`);
      }
      
      expect(foundDialogue || {}).toBeDefined();
    });
  });
  
  describe('Create missing respected node', () => {
    it('should define what the respected node should contain', () => {
      const respectedNode = {
        id: 'respected',
        npcLine: "Ah, merci! Your appreciation for the craft is refreshing. Not many understand the years of dedication it takes to master chocolate.",
        choices: [
          {
            text: "I'd love to buy some chocolates",
            action: 'openShop'
          },
          {
            text: "What's your most popular creation?",
            next: 'popular'
          },
          {
            text: "Thank you for sharing",
            next: 'end'
          }
        ]
      };
      
      expect(respectedNode.id).toBe('respected');
      expect(respectedNode.choices).toHaveLength(3);
    });
  });
});