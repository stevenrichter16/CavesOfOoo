/**
 * Verify FilesystemPersistence implementation
 */

import { FilesystemPersistence } from '../../src/js/world/persistence/FilesystemPersistence.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function verifyFilesystemPersistence() {
  console.log('🔍 Verifying FilesystemPersistence...\n');
  
  const testDir = path.join(os.tmpdir(), `chunk-verify-${Date.now()}`);
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    const persistence = new FilesystemPersistence({
      baseDir: testDir,
      compression: false,
      prettyPrint: true
    });
    
    // Test 1: Save and Load
    console.log('✓ Test 1: Save and Load Chunk');
    totalTests++;
    try {
      const chunk = {
        cx: 5,
        cy: 5,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        biome: 'forest',
        monsters: [{ type: 'goblin', x: 10, y: 10 }]
      };
      
      await persistence.save('test-world', chunk);
      const loaded = await persistence.load('test-world', 5, 5);
      
      if (!loaded || loaded.biome !== 'forest' || loaded.monsters.length !== 1) {
        throw new Error('Save/Load failed');
      }
      
      console.log('  ✅ Save/Load working');
      console.log(`  📁 File saved to: ${testDir}/test-world/chunks/5_5.json\n`);
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 2: Negative Coordinates
    console.log('✓ Test 2: Negative Coordinates');
    totalTests++;
    try {
      const chunk = { cx: -3, cy: -7, map: [], biome: 'desert' };
      
      await persistence.save('test-world', chunk);
      const loaded = await persistence.load('test-world', -3, -7);
      
      if (!loaded || loaded.cx !== -3 || loaded.cy !== -7) {
        throw new Error('Negative coordinates not handled');
      }
      
      // Check file naming
      const expectedPath = path.join(testDir, 'test-world', 'chunks', 'n3_n7.json');
      await fs.access(expectedPath);
      
      console.log('  ✅ Negative coordinates handled');
      console.log('  📁 File: n3_n7.json\n');
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 3: Compression
    console.log('✓ Test 3: Compression');
    totalTests++;
    try {
      const compressedPersistence = new FilesystemPersistence({
        baseDir: testDir,
        compression: true
      });
      
      const largeChunk = {
        cx: 10,
        cy: 10,
        map: Array(22).fill().map(() => Array(24).fill('#')),
        monsters: Array(50).fill({ type: 'goblin', hp: 20 })
      };
      
      const result = await compressedPersistence.save('compressed-world', largeChunk);
      
      if (!result.compressed) {
        throw new Error('Compression not applied');
      }
      
      const loaded = await compressedPersistence.load('compressed-world', 10, 10);
      
      if (!loaded || loaded.monsters.length !== 50) {
        throw new Error('Compressed chunk not loaded correctly');
      }
      
      console.log('  ✅ Compression working');
      console.log(`  📦 Compressed size: ${result.bytesWritten} bytes\n`);
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 4: Batch Operations
    console.log('✓ Test 4: Batch Operations');
    totalTests++;
    try {
      const chunks = [];
      for (let i = 0; i < 5; i++) {
        chunks.push({ cx: i, cy: 0, map: [], data: `chunk-${i}` });
      }
      
      await persistence.saveBatch('batch-world', chunks);
      
      const coords = chunks.map(c => ({ cx: c.cx, cy: c.cy }));
      const loaded = await persistence.loadBatch('batch-world', coords);
      
      if (loaded.length !== 5 || loaded[0].data !== 'chunk-0') {
        throw new Error('Batch operations failed');
      }
      
      console.log('  ✅ Batch operations working');
      console.log(`  📦 Saved and loaded ${loaded.length} chunks\n`);
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 5: Query Operations
    console.log('✓ Test 5: Query Operations');
    totalTests++;
    try {
      // Create grid
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          await persistence.save('query-world', {
            cx: x,
            cy: y,
            map: [],
            biome: x < 2 ? 'forest' : 'desert'
          });
        }
      }
      
      // Query region
      const region = await persistence.queryRegion('query-world', 0, 0, 1, 1);
      
      if (region.length !== 4) {
        throw new Error(`Expected 4 chunks, got ${region.length}`);
      }
      
      // Query by metadata
      const forests = await persistence.queryByMetadata('query-world', {
        biome: 'forest'
      });
      
      if (forests.length !== 6) {
        throw new Error(`Expected 6 forest chunks, got ${forests.length}`);
      }
      
      console.log('  ✅ Query operations working');
      console.log(`  🔍 Found ${region.length} chunks in region`);
      console.log(`  🌲 Found ${forests.length} forest chunks\n`);
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 6: Statistics
    console.log('✓ Test 6: Statistics Tracking');
    totalTests++;
    try {
      const stats = persistence.getStats();
      
      if (stats.totalSaves === 0 || stats.totalLoads === 0) {
        throw new Error('Statistics not tracked');
      }
      
      console.log('  ✅ Statistics tracked');
      console.log(`  📊 Saves: ${stats.totalSaves}, Loads: ${stats.totalLoads}`);
      console.log(`  💾 Written: ${stats.totalBytesWritten} bytes, Read: ${stats.totalBytesRead} bytes\n`);
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 7: Storage Usage
    console.log('✓ Test 7: Storage Usage');
    totalTests++;
    try {
      const usage = await persistence.getStorageUsage('query-world');
      
      if (usage.chunkCount !== 9 || usage.totalBytes === 0) {
        throw new Error('Storage usage calculation failed');
      }
      
      console.log('  ✅ Storage usage calculated');
      console.log(`  💾 ${usage.chunkCount} chunks using ${usage.totalBytes} bytes`);
      console.log(`  📊 Average chunk size: ${usage.averageChunkSize} bytes\n`);
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 8: Migration
    console.log('✓ Test 8: Version Migration');
    totalTests++;
    try {
      // Save old format chunk
      const oldChunk = {
        cx: 50,
        cy: 50,
        tiles: Array(22).fill().map(() => Array(24).fill('#')), // Old format
        version: '0.9.0'
      };
      
      const oldPath = path.join(testDir, 'migration-world', 'chunks', '50_50.json');
      await fs.mkdir(path.dirname(oldPath), { recursive: true });
      await fs.writeFile(oldPath, JSON.stringify(oldChunk));
      
      // Load with new persistence (should migrate)
      const loaded = await persistence.load('migration-world', 50, 50);
      
      if (!loaded.map || loaded.tiles || loaded.metadata.version !== '1.0.0') {
        throw new Error('Migration failed');
      }
      
      // Check backup was created
      const backupPath = path.join(testDir, 'migration-world', 'backups', '50_50.json.backup');
      await fs.access(backupPath);
      
      console.log('  ✅ Version migration working');
      console.log('  🔄 Migrated from 0.9.0 to 1.0.0');
      console.log('  💾 Backup created\n');
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
    // Test 9: Atomic Writes
    console.log('✓ Test 9: Atomic Writes');
    totalTests++;
    try {
      const atomicPersistence = new FilesystemPersistence({
        baseDir: testDir,
        atomicWrites: true
      });
      
      await atomicPersistence.save('atomic-world', {
        cx: 60,
        cy: 60,
        map: [],
        critical: true
      });
      
      // Check no temp files left
      const chunkDir = path.join(testDir, 'atomic-world', 'chunks');
      const files = await fs.readdir(chunkDir);
      const tempFiles = files.filter(f => f.includes('.tmp'));
      
      if (tempFiles.length > 0) {
        throw new Error('Temp files not cleaned up');
      }
      
      console.log('  ✅ Atomic writes working');
      console.log('  🔒 No temp files left\n');
      passedTests++;
    } catch (e) {
      console.log('  ❌ Failed:', e.message, '\n');
    }
    
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  
  // Report
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (passedTests === totalTests) {
    console.log('✨ FilesystemPersistence fully functional!');
    console.log('🎉 Ready for production use!\n');
    
    console.log('📝 Features implemented:');
    console.log('  • File-based storage with directory structure');
    console.log('  • Optional gzip compression');
    console.log('  • Atomic writes for data integrity');
    console.log('  • Batch operations for efficiency');
    console.log('  • Query by region and metadata');
    console.log('  • Version migration with backups');
    console.log('  • Statistics and monitoring');
    console.log('  • Negative coordinate support');
  }
  
  return passedTests === totalTests;
}

// Run verification
verifyFilesystemPersistence().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});