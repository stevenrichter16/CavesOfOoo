/**
 * Debug cache issue in full stack integration
 */

import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';
import { FilesystemPersistence } from '../../src/js/world/persistence/FilesystemPersistence.js';
import { ChunkStreaming } from '../../src/js/world/streaming/ChunkStreaming.js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

async function debugCacheIssue() {
  console.log('🔍 Debugging Full Stack Cache Issue\n');
  
  const testDir = path.join(os.tmpdir(), `debug-cache-${Date.now()}`);
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    
    // Create event bus
    const eventBus = {
      handlers: new Map(),
      on(event, handler) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);
      },
      off(event, handler) {
        const handlers = this.handlers.get(event);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) handlers.splice(index, 1);
        }
      },
      emit(event, data) {
        const handlers = this.handlers.get(event) || [];
        handlers.forEach(h => h(data));
      }
    };
    
    console.log('Creating ChunkSystem...');
    const system = new ChunkSystem(eventBus, {
      cacheSize: 20,
      persistChunks: true,
      enableStreaming: true,
      enableMetrics: true,
      persistenceType: 'filesystem',
      persistenceConfig: {
        baseDir: path.join(testDir, 'full-stack'),
        compression: true
      }
    });
    
    console.log('  Cache initialized:', system.cache ? '✅' : '❌');
    console.log('  Cache type:', system.cache?.constructor?.name);
    console.log('  Cache size:', system.cache?.size || 0);
    
    // Setup persistence and streaming
    console.log('\nSetting up persistence...');
    const persistence = new FilesystemPersistence({
      baseDir: path.join(testDir, 'full-stack'),
      compression: true
    });
    system.setPersistence(persistence);
    
    console.log('Setting up streaming...');
    const streaming = new ChunkStreaming(system, eventBus, {
      maxLoadedChunks: 15,
      enableLOD: true,
      enablePredictive: true
    });
    system.setStreaming(streaming);
    
    // Full workflow test
    console.log('\nStarting full workflow...');
    streaming.setViewport(0, 0, 3);
    
    console.log('Loading visible chunks...');
    const chunks = await streaming.loadVisibleChunks('full-test');
    console.log('  Chunks loaded:', chunks.length);
    
    // Check cache operations
    console.log('\nChecking cache operations...');
    
    // Try direct cache access
    console.log('Direct cache test:');
    const testChunk = { cx: 99, cy: 99, map: [], test: true };
    system.cache.set(99, 99, testChunk);
    const retrieved = system.cache.get(99, 99);
    console.log('  Set and get:', retrieved?.test === true ? '✅' : '❌');
    
    // Check if generated chunks are in cache
    console.log('\nChecking generated chunks in cache:');
    
    // Get all chunks to see what's actually in cache
    const allCached = system.getAllChunks();
    console.log('  Total chunks in cache:', allCached.length);
    
    if (allCached.length > 0) {
      const firstChunk = allCached[0];
      console.log('  First chunk properties:');
      console.log('    cx:', firstChunk.cx);
      console.log('    cy:', firstChunk.cy);
      console.log('    biome:', firstChunk.biome);
      console.log('    map:', firstChunk.map ? 'present' : 'missing');
      console.log('    features:', firstChunk.features ? 'present' : 'missing');
      console.log('    All keys:', Object.keys(firstChunk).join(', '));
    }
    
    const cached0 = system.cache.get(0, 0);
    console.log('  Chunk at (0,0):', cached0 ? '✅' : '❌');
    
    if (!cached0) {
      console.log('\nDEBUGGING: Why is chunk not in cache?');
      
      // Check if cache has any chunks
      const allChunks = system.getAllChunks();
      console.log('  Total chunks in cache:', allChunks.length);
      
      if (allChunks.length > 0) {
        console.log('  First chunk coords:', `(${allChunks[0].cx}, ${allChunks[0].cy})`);
      }
      
      // Try generating directly
      console.log('\nGenerating chunk directly...');
      const directChunk = await system.generateChunk('full-test', 0, 0);
      console.log('  Direct generation:', directChunk ? '✅' : '❌');
      
      // Check cache again
      const afterDirect = system.cache.get(0, 0);
      console.log('  In cache after direct generation:', afterDirect ? '✅' : '❌');
      
      // Check streaming's active chunks
      console.log('\nChecking streaming active chunks:');
      const activeChunks = streaming.getActiveChunks();
      console.log('  Active chunks in streaming:', activeChunks.length);
      
      // Check if streaming is using a different cache
      const streamingHas00 = activeChunks.some(c => c.cx === 0 && c.cy === 0);
      console.log('  Streaming has (0,0):', streamingHas00 ? '✅' : '❌');
    }
    
    // Check pipeline generation
    console.log('\nChecking pipeline properties:');
    if (cached0) {
      console.log('  Has biome:', cached0.biome ? '✅' : '❌');
      console.log('  Has map:', cached0.map ? '✅' : '❌');
      console.log('  Biome value:', cached0.biome);
    }
    
    // Check persistence
    console.log('\nChecking persistence:');
    const persisted = await persistence.exists('full-test', 0, 0);
    console.log('  Chunk persisted:', persisted ? '✅' : '❌');
    
    // Check metrics
    console.log('\nChecking metrics:');
    const report = system.getMetricsReport();
    console.log('  Metrics enabled:', report.enabled ? '✅' : '❌');
    console.log('  Generation tracked:', report.generation ? '✅' : '❌');
    console.log('  Cache tracked:', report.cache ? '✅' : '❌');
    console.log('  Persistence tracked:', report.persistence ? '✅' : '❌');
    
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  }
}

// Run debug
debugCacheIssue().catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});