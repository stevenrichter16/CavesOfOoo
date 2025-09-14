import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verify No Duplicate Exports', () => {
  
  describe('Check migrationAdapter.js exports', () => {
    it('should have no duplicate exports of spawnSocialNPC', () => {
      const filePath = path.join(process.cwd(), 'src/social/migrationAdapter.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Parse exports more carefully
      const lines = content.split('\n');
      const exports = [];
      
      lines.forEach((line, index) => {
        // Match various export patterns
        const patterns = [
          /export\s+const\s+spawnSocialNPC/,
          /export\s+function\s+spawnSocialNPC/,
          /export\s+\{\s*spawnSocialNPC/,
          /export\s+\{[^}]*spawnSocialNPC/
        ];
        
        patterns.forEach(pattern => {
          if (pattern.test(line)) {
            exports.push({
              line: index + 1,
              content: line.trim(),
              type: pattern.source
            });
          }
        });
      });
      
      console.log('Exports of spawnSocialNPC found:');
      exports.forEach(exp => {
        console.log(`  Line ${exp.line}: ${exp.content}`);
      });
      
      // Should have exactly one export
      expect(exports.length).toBe(1);
    });
    
    it('should be able to import spawnSocialNPC from migrationAdapter', async () => {
      const { spawnSocialNPC } = await import('../../src/social/migrationAdapter.js');
      
      expect(spawnSocialNPC).toBeDefined();
      expect(typeof spawnSocialNPC).toBe('function');
    });
    
    it('should be able to import all expected functions', async () => {
      const adapter = await import('../../src/social/migrationAdapter.js');
      
      // All these should be available
      const expectedExports = [
        'spawnSocialNPC',
        'initializeNPC',
        'NPC',
        'getAvailableInteractions',
        'runPlayerNPCInteraction',
        'handleNPCInteraction',
        'initializeSocialSystem',
        'initializeMigration'
      ];
      
      expectedExports.forEach(name => {
        expect(adapter[name]).toBeDefined();
        console.log(`✓ ${name} is exported`);
      });
    });
  });
  
  describe('Test spawnSocialNPC functionality', () => {
    it('should spawn an NPC using spawnSocialNPC', async () => {
      const { spawnSocialNPC } = await import('../../src/social/migrationAdapter.js');
      
      const state = { npcs: [] };
      const npcData = {
        id: 'test_npc',
        name: 'Test NPC',
        x: 10,
        y: 10,
        faction: 'peasants'
      };
      
      const npc = spawnSocialNPC(state, npcData);
      
      expect(npc).toBeDefined();
      expect(npc.id).toBe('test_npc');
      expect(npc.name).toBe('Test NPC');
    });
  });
  
  describe('Verify no syntax errors', () => {
    it('should load without syntax errors', async () => {
      let loaded = false;
      let error = null;
      
      try {
        await import('../../src/social/migrationAdapter.js');
        loaded = true;
      } catch (e) {
        error = e;
      }
      
      expect(error).toBe(null);
      expect(loaded).toBe(true);
    });
  });
});