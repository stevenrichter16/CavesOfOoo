import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Purge OLD Social System', () => {
  
  describe('Identify OLD social system files', () => {
    it('should find all OLD social system files and backups', () => {
      const oldSocialDir = path.join(process.cwd(), 'src/js/social');
      const backupFiles = [];
      const oldSystemFiles = [];
      
      // Check if OLD social directory exists
      if (fs.existsSync(oldSocialDir)) {
        console.log('Found OLD social directory: src/js/social/');
        
        function scanDirectory(dir) {
          const items = fs.readdirSync(dir);
          items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
              scanDirectory(itemPath);
            } else {
              const relativePath = path.relative(process.cwd(), itemPath);
              
              if (item.endsWith('.bak')) {
                backupFiles.push(relativePath);
              } else if (item.endsWith('.js')) {
                oldSystemFiles.push(relativePath);
              }
            }
          });
        }
        
        scanDirectory(oldSocialDir);
      }
      
      // Also check for backup files elsewhere
      const srcDir = path.join(process.cwd(), 'src');
      
      function findBackups(dir) {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory() && !item.includes('node_modules')) {
            findBackups(itemPath);
          } else if (item.endsWith('.bak')) {
            const relativePath = path.relative(process.cwd(), itemPath);
            if (!backupFiles.includes(relativePath)) {
              backupFiles.push(relativePath);
            }
          }
        });
      }
      
      findBackups(srcDir);
      
      console.log('\n📁 OLD Social System Files:');
      oldSystemFiles.forEach(file => console.log(`  - ${file}`));
      
      console.log('\n💾 Backup Files (.bak):');
      backupFiles.forEach(file => console.log(`  - ${file}`));
      
      // Store for deletion
      global.oldSystemFiles = oldSystemFiles;
      global.backupFiles = backupFiles;
      
      expect(oldSystemFiles.length + backupFiles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Files to delete', () => {
    it('should list all files that will be deleted', () => {
      const toDelete = [
        // OLD social system directory
        'src/js/social/',
        
        // Any .bak files
        ...global.backupFiles || [],
        
        // OLD system test files that might reference it
        'tests/social/*.bak'
      ];
      
      console.log('\n🗑️ Files and directories to delete:');
      toDelete.forEach(item => {
        console.log(`  - ${item}`);
      });
      
      expect(toDelete.length).toBeGreaterThan(0);
    });
  });
  
  describe('Check for OLD system imports', () => {
    it('should find any remaining references to OLD system', () => {
      const srcDir = path.join(process.cwd(), 'src');
      const references = [];
      
      function checkFile(filePath) {
        if (!filePath.endsWith('.js') || filePath.endsWith('.bak')) return;
        
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), filePath);
        
        lines.forEach((line, idx) => {
          // Check for OLD system paths
          if (line.includes('/js/social/') && 
              !line.includes('migrationAdapter') &&
              !line.includes('// OLD') &&
              !line.includes('* OLD')) {
            references.push({
              file: relativePath,
              line: idx + 1,
              content: line.trim()
            });
          }
        });
      }
      
      function scanDir(dir) {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory() && 
              !item.includes('node_modules') &&
              !item.includes('.git')) {
            scanDir(itemPath);
          } else if (item.endsWith('.js')) {
            checkFile(itemPath);
          }
        });
      }
      
      scanDir(srcDir);
      
      if (references.length > 0) {
        console.log('\n⚠️ Found references to OLD system:');
        references.forEach(ref => {
          console.log(`  ${ref.file}:${ref.line}`);
          console.log(`    ${ref.content}`);
        });
      } else {
        console.log('\n✅ No references to OLD system found');
      }
      
      global.oldReferences = references;
      expect(references).toBeDefined();
    });
  });
});