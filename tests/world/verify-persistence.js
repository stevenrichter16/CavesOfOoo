/**
 * Verify persistence interface implementation
 */

import { MemoryPersistence } from '../../src/js/world/persistence/IChunkPersistence.js';

async function verifyPersistence() {
  console.log('🔍 Verifying Persistence Interface...\n');
  
  const persistence = new MemoryPersistence();
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Save and Load
  console.log('✓ Test 1: Save and Load');
  totalTests++;
  try {
    const chunk = {
      cx: 5, cy: 5,
      map: [],
      biome: 'forest'
    };
    
    await persistence.save('test-seed', chunk);
    const loaded = await persistence.load('test-seed', 5, 5);
    
    if (!loaded || loaded.biome !== 'forest') {
      throw new Error('Save/Load failed');
    }
    console.log('  ✅ Save/Load works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 2: Existence Check
  console.log('✓ Test 2: Existence Check');
  totalTests++;
  try {
    const exists1 = await persistence.exists('test-seed', 5, 5);
    const exists2 = await persistence.exists('test-seed', 999, 999);
    
    if (!exists1 || exists2) {
      throw new Error('Existence check failed');
    }
    console.log('  ✅ Existence check works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 3: Batch Operations
  console.log('✓ Test 3: Batch Operations');
  totalTests++;
  try {
    const chunks = [
      { cx: 0, cy: 0, map: [] },
      { cx: 1, cy: 0, map: [] },
      { cx: 2, cy: 0, map: [] }
    ];
    
    await persistence.saveBatch('batch-seed', chunks);
    const coords = chunks.map(c => ({ cx: c.cx, cy: c.cy }));
    const loaded = await persistence.loadBatch('batch-seed', coords);
    
    if (loaded.length !== 3) {
      throw new Error('Batch operations failed');
    }
    console.log('  ✅ Batch operations work\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 4: Region Query
  console.log('✓ Test 4: Region Query');
  totalTests++;
  try {
    await persistence.clear();
    
    // Create grid of chunks
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        await persistence.save('query-seed', { cx: x, cy: y, map: [] });
      }
    }
    
    const results = await persistence.queryRegion('query-seed', 0, 0, 1, 1);
    
    if (results.length !== 4) {
      throw new Error(`Expected 4 chunks, got ${results.length}`);
    }
    console.log('  ✅ Region query works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 5: Metadata Query
  console.log('✓ Test 5: Metadata Query');
  totalTests++;
  try {
    await persistence.clear();
    
    await persistence.save('meta-seed', { cx: 0, cy: 0, map: [], biome: 'forest' });
    await persistence.save('meta-seed', { cx: 1, cy: 0, map: [], biome: 'desert' });
    await persistence.save('meta-seed', { cx: 2, cy: 0, map: [], biome: 'forest' });
    
    const forests = await persistence.queryByMetadata('meta-seed', { biome: 'forest' });
    
    if (forests.length !== 2) {
      throw new Error('Metadata query failed');
    }
    console.log('  ✅ Metadata query works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 6: Version Handling
  console.log('✓ Test 6: Version Handling');
  totalTests++;
  try {
    const oldChunk = { cx: 30, cy: 30, map: [], version: '0.9.0' };
    await persistence.save('version-seed', oldChunk);
    
    const loaded = await persistence.load('version-seed', 30, 30);
    
    if (!loaded.metadata || loaded.metadata.version !== '1.0.0') {
      throw new Error('Version migration failed');
    }
    console.log('  ✅ Version handling works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 7: Compression
  console.log('✓ Test 7: Compression');
  totalTests++;
  try {
    persistence.setCompression(true);
    
    const largeChunk = {
      cx: 50, cy: 50,
      map: Array(22).fill().map(() => Array(24).fill('#')),
      monsters: Array(50).fill({ type: 'goblin' })
    };
    
    const stats = await persistence.save('compress-seed', largeChunk);
    
    if (!stats.compressed || stats.compressedSize >= stats.originalSize) {
      throw new Error('Compression not working');
    }
    console.log('  ✅ Compression works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 8: Error Handling
  console.log('✓ Test 8: Error Handling');
  totalTests++;
  try {
    persistence.simulateError('save');
    
    let errorCaught = false;
    try {
      await persistence.save('error-seed', { cx: 60, cy: 60, map: [] });
    } catch (e) {
      errorCaught = true;
    }
    
    persistence.clearErrors();
    
    if (!errorCaught) {
      throw new Error('Error simulation failed');
    }
    console.log('  ✅ Error handling works\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  // Test 9: Statistics
  console.log('✓ Test 9: Statistics');
  totalTests++;
  try {
    persistence.clear();
    
    await persistence.save('stats-seed', { cx: 70, cy: 70, map: [] });
    await persistence.load('stats-seed', 70, 70);
    await persistence.delete('stats-seed', 70, 70);
    
    const stats = persistence.getStats();
    
    if (stats.saves < 1 || stats.loads < 1 || stats.deletes < 1) {
      throw new Error('Statistics not tracked');
    }
    console.log('  ✅ Statistics work\n');
    passedTests++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message, '\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (passedTests === totalTests) {
    console.log('✨ All Persistence Interface tests passed!');
    console.log('🎉 Ready for Phase 4 implementation!\n');
  }
  
  return passedTests === totalTests;
}

// Run verification
verifyPersistence().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});