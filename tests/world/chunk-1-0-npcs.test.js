import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Chunk (1,0) NPC Spawning', () => {
  
  describe('Identify chunk (1,0) location', () => {
    it('should determine what chunk (1,0) represents', () => {
      // Chunk coordinates typically represent:
      // (0,0) = center/start area
      // (1,0) = one chunk east of center
      // (0,1) = one chunk north of center
      // (-1,0) = one chunk west of center
      
      const chunkInfo = {
        coordinates: '(1,0)',
        direction: 'east of center',
        likelyArea: 'Candy Kingdom East or Shopping District'
      };
      
      console.log('Chunk (1,0) info:', chunkInfo);
      expect(chunkInfo.coordinates).toBe('(1,0)');
    });
  });
  
  describe('Search for chunk (1,0) definitions', () => {
    it('should find files containing chunk (1,0) data', () => {
      const worldDir = path.join(process.cwd(), 'src/js/world');
      const foundFiles = [];
      
      if (fs.existsSync(worldDir)) {
        const files = fs.readdirSync(worldDir);
        
        files.forEach(file => {
          if (file.endsWith('.js') && !file.endsWith('.bak')) {
            const filePath = path.join(worldDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Look for chunk coordinates (1,0) or x:1, y:0
            if (content.includes('(1,0)') || 
                content.includes('1,0') ||
                (content.includes('x: 1') && content.includes('y: 0')) ||
                (content.includes('chunkX: 1') && content.includes('chunkY: 0'))) {
              
              // Count NPC mentions
              const npcCount = (content.match(/npc/gi) || []).length;
              const spawnCount = (content.match(/spawn/gi) || []).length;
              
              foundFiles.push({
                file: path.relative(process.cwd(), filePath),
                hasChunk10: true,
                npcMentions: npcCount,
                spawnMentions: spawnCount
              });
            }
          }
        });
      }
      
      console.log('Files with chunk (1,0) references:');
      foundFiles.forEach(f => {
        console.log(`  ${f.file}`);
        console.log(`    - NPC mentions: ${f.npcMentions}`);
        console.log(`    - Spawn mentions: ${f.spawnMentions}`);
      });
      
      expect(foundFiles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Check chunk spawning mechanism', () => {
    it('should examine how NPCs are spawned in chunks', async () => {
      // Check worldGen for chunk spawning
      const worldGenPath = path.join(process.cwd(), 'src/js/world/worldGen.js');
      
      if (fs.existsSync(worldGenPath)) {
        const content = fs.readFileSync(worldGenPath, 'utf8');
        
        // Look for spawn functions
        const hasSpawnChunkNPCs = content.includes('spawnChunkNPCs');
        const hasSpawnNPCsForChunk = content.includes('spawnNPCsForChunk');
        const hasLoadChunk = content.includes('loadChunk');
        const hasGenerateChunk = content.includes('generateChunk');
        
        console.log('WorldGen spawning functions:');
        console.log('  - spawnChunkNPCs:', hasSpawnChunkNPCs);
        console.log('  - spawnNPCsForChunk:', hasSpawnNPCsForChunk);
        console.log('  - loadChunk:', hasLoadChunk);
        console.log('  - generateChunk:', hasGenerateChunk);
        
        // Look for chunk data structure
        if (content.includes('chunkData') || content.includes('chunks')) {
          console.log('  ✓ Has chunk data structure');
        }
        
        expect(hasLoadChunk || hasGenerateChunk).toBe(true);
      }
    });
  });
  
  describe('Test NPC spawning for chunk (1,0)', () => {
    it('should spawn NPCs when entering chunk (1,0)', async () => {
      // Mock game state
      const state = {
        chunks: new Map(),
        npcs: [],
        player: {
          x: 50, // Moving into chunk (1,0)
          y: 50,
          chunk: { x: 1, y: 0 }
        }
      };
      
      // Test spawning
      const { spawnSocialNPC } = await import('../../src/social/migrationAdapter.js');
      
      // Define test NPCs for chunk (1,0)
      const chunk10NPCs = [
        {
          id: 'shopkeeper_1',
          name: 'Candy Vendor',
          x: 100,
          y: 100,
          chunk: { x: 1, y: 0 },
          shopkeeper: true
        },
        {
          id: 'guard_1', 
          name: 'Banana Guard',
          x: 150,
          y: 150,
          chunk: { x: 1, y: 0 },
          faction: 'guards'
        }
      ];
      
      // Spawn NPCs
      let spawnedCount = 0;
      for (const npcData of chunk10NPCs) {
        try {
          const npc = spawnSocialNPC(state, npcData);
          if (npc) {
            spawnedCount++;
            console.log(`✓ Spawned ${npc.name} at (${npc.x}, ${npc.y})`);
          }
        } catch (e) {
          console.error(`Failed to spawn ${npcData.name}:`, e.message);
        }
      }
      
      expect(spawnedCount).toBe(chunk10NPCs.length);
      expect(state.npcs.length).toBe(spawnedCount);
    });
  });
  
  describe('Check specific chunk files', () => {
    it('should check candyKingdomEast for chunk (1,0)', () => {
      const eastPath = path.join(process.cwd(), 'src/js/world/candyKingdomEast.js');
      
      if (fs.existsSync(eastPath)) {
        const content = fs.readFileSync(eastPath, 'utf8');
        
        // Check if this is chunk (1,0)
        const hasChunk10 = content.includes('1, 0') || 
                           content.includes('(1,0)') ||
                           content.includes('chunkX: 1');
        
        // Count NPCs defined
        const npcMatches = content.match(/name:\s*['"][^'"]+['"]/g) || [];
        
        console.log('CandyKingdomEast.js analysis:');
        console.log('  - Is chunk (1,0):', hasChunk10);
        console.log('  - NPCs defined:', npcMatches.length);
        
        if (npcMatches.length > 0) {
          console.log('  - NPC names found:');
          npcMatches.forEach(match => {
            const name = match.match(/name:\s*['"]([^'"]+)['"]/)[1];
            console.log(`    • ${name}`);
          });
        }
        
        expect(npcMatches.length).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should check candyShoppingDistrict for chunk (1,0)', () => {
      const shoppingPath = path.join(process.cwd(), 'src/js/world/candyShoppingDistrict.js');
      
      if (fs.existsSync(shoppingPath)) {
        const content = fs.readFileSync(shoppingPath, 'utf8');
        
        // Check if this is chunk (1,0)
        const hasChunk10 = content.includes('1, 0') || 
                           content.includes('(1,0)') ||
                           content.includes('chunkX: 1');
        
        // Count NPCs defined
        const npcMatches = content.match(/name:\s*['"][^'"]+['"]/g) || [];
        
        console.log('CandyShoppingDistrict.js analysis:');
        console.log('  - Is chunk (1,0):', hasChunk10);
        console.log('  - NPCs defined:', npcMatches.length);
        
        if (npcMatches.length > 0) {
          console.log('  - NPC names found:');
          npcMatches.forEach(match => {
            const name = match.match(/name:\s*['"]([^'"]+)['"]/)[1];
            console.log(`    • ${name}`);
          });
        }
        
        expect(npcMatches.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});