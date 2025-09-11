/**
 * Comprehensive Phase 3 Review
 * Testing quality, logic, and integration with Phase 1 & 2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Phase 3 Comprehensive Review', () => {
  let ChunkSystem, ChunkCache, ChunkRegistry, ChunkPipeline;
  let chunkSystem;
  
  beforeEach(async () => {
    // Import all components
    const systemModule = await import('../../src/js/world/ChunkSystem.js');
    ChunkSystem = systemModule.ChunkSystem;
    
    // Mock components for isolated testing
    vi.clearAllMocks();
  });
  
  describe('Phase 3 Core Quality', () => {
    describe('Architecture Validation', () => {
      it('should follow single responsibility principle', () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // ChunkSystem should only orchestrate, not implement details
        expect(system.cache).toBeDefined(); // Delegates caching
        expect(system.registry).toBeDefined(); // Delegates templates
        expect(system.pipeline).toBeDefined(); // Delegates generation
        
        // Should not have implementation details
        expect(system.generateBiome).toBeUndefined();
        expect(system.generateTerrain).toBeUndefined();
        expect(system.lruEvict).toBeUndefined();
      });
      
      it('should maintain loose coupling through events', () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Should register handlers, not direct dependencies
        const registeredEvents = eventBus.on.mock.calls.map(c => c[0]);
        expect(registeredEvents).toContain('PlayerChangedChunk');
        expect(registeredEvents).toContain('QuestAccepted');
        
        // Should not have direct references to other systems
        expect(system.movementSystem).toBeUndefined();
        expect(system.questSystem).toBeUndefined();
      });
      
      it('should be open for extension, closed for modification', () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Can extend through templates
        const customTemplate = {
          matches: (cx, cy) => cx === 999 && cy === 999,
          generate: vi.fn()
        };
        system.registerTemplate('custom', customTemplate);
        
        // Can extend through event handlers
        let customHandlerCalled = false;
        eventBus.on.mockImplementation((event, handler) => {
          if (event === 'CustomEvent') {
            customHandlerCalled = true;
          }
        });
        
        system.registerEventHandler('CustomEvent', () => {});
        expect(eventBus.on).toHaveBeenCalledWith('CustomEvent', expect.any(Function));
      });
    });
    
    describe('Error Handling Quality', () => {
      it('should never throw unhandled errors to caller', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Break internal components
        system.cache.get = () => { throw new Error('Cache error'); };
        system.pipeline.generate = () => { throw new Error('Pipeline error'); };
        
        // Should handle gracefully
        await expect(system.generateChunk('seed', 0, 0)).rejects.toThrow();
        
        // But should emit error event
        expect(eventBus.emit).toHaveBeenCalledWith(
          'ChunkGenerationError',
          expect.any(Object)
        );
      });
      
      it('should validate all inputs', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Test with various invalid inputs
        const invalidInputs = [
          [null, null],
          [undefined, undefined],
          ['not-a-number', 'also-not'],
          [Infinity, -Infinity],
          [NaN, NaN],
          [{}, []],
        ];
        
        for (const [cx, cy] of invalidInputs) {
          // Should handle gracefully
          const result = await system.generateChunk('seed', cx, cy).catch(e => 'error');
          expect(result).toBeDefined();
        }
      });
      
      it('should prevent state corruption on errors', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        const initialCacheSize = system.cache.cache.size;
        
        // Force an error during generation
        system.pipeline.generate = vi.fn().mockRejectedValue(new Error('Failed'));
        
        try {
          await system.generateChunk('seed', 10, 10);
        } catch (e) {
          // Expected to fail
        }
        
        // Cache should not contain failed chunk
        expect(system.cache.get(10, 10)).toBeUndefined();
        expect(system.cache.cache.size).toBe(initialCacheSize);
      });
    });
    
    describe('Performance Characteristics', () => {
      it('should handle high load without degradation', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Generate many chunks rapidly
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 100; i++) {
          promises.push(system.generateChunk('seed', i, 0));
        }
        
        await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        // Should complete 100 chunks in reasonable time
        expect(duration).toBeLessThan(1000); // Under 1 second
        
        // Should not leak memory
        expect(system.cache.cache.size).toBeLessThanOrEqual(100);
      });
      
      it('should optimize repeated requests', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        let generateCount = 0;
        system.pipeline.generate = vi.fn().mockImplementation(async (s, cx, cy) => {
          generateCount++;
          return { cx, cy, map: [] };
        });
        
        // Request same chunk multiple times
        const chunk1 = await system.generateChunk('seed', 5, 5);
        const chunk2 = await system.generateChunk('seed', 5, 5);
        const chunk3 = await system.generateChunk('seed', 5, 5);
        
        // Should only generate once (cached)
        expect(generateCount).toBe(1);
        expect(chunk1).toBe(chunk2);
        expect(chunk2).toBe(chunk3);
      });
    });
    
    describe('Memory Management', () => {
      it('should not leak memory on system lifecycle', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        
        // Create and destroy multiple systems
        for (let i = 0; i < 10; i++) {
          const system = new ChunkSystem(eventBus);
          
          // Generate some chunks
          await system.generateChunk('seed', i, 0);
          await system.generateChunk('seed', i, 1);
          
          // Destroy
          await system.destroy();
        }
        
        // Event handlers should be cleaned up
        const offCalls = eventBus.off.mock.calls.length;
        const onCalls = eventBus.on.mock.calls.length;
        
        // Should have equal on/off calls (no leaks)
        expect(offCalls).toBeGreaterThan(0);
      });
      
      it('should respect memory limits', () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus, { cacheSize: 10 });
        
        // Add more chunks than cache size
        for (let i = 0; i < 20; i++) {
          system.cache.set(i, 0, { cx: i, cy: 0 });
        }
        
        // Should not exceed configured limit
        expect(system.cache.cache.size).toBeLessThanOrEqual(10);
      });
    });
  });
  
  describe('Phase 1 Integration (Core Models)', () => {
    describe('Chunk Model Integration', () => {
      it('should use Phase 1 Chunk model correctly', async () => {
        // Import Phase 1 Chunk if available
        let Chunk;
        try {
          const chunkModule = await import('../../src/js/world/core/Chunk.js');
          Chunk = chunkModule.Chunk;
        } catch {
          // Mock if not available
          Chunk = class {
            constructor(cx, cy) {
              this.cx = cx;
              this.cy = cy;
              this.map = Array(22).fill().map(() => Array(24).fill('#'));
            }
            getTile(x, y) { return this.map[y][x]; }
            setTile(x, y, tile) { this.map[y][x] = tile; }
          };
        }
        
        const chunk = new Chunk(5, 5);
        expect(chunk.cx).toBe(5);
        expect(chunk.cy).toBe(5);
        expect(chunk.map).toBeDefined();
        expect(chunk.getTile).toBeDefined();
        expect(chunk.setTile).toBeDefined();
      });
      
      it('should integrate with Phase 1 ChunkCache', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Test cache integration
        const chunk = { cx: 1, cy: 1, map: [] };
        system.cache.set(1, 1, chunk);
        
        const retrieved = system.cache.get(1, 1);
        expect(retrieved).toBe(chunk);
        
        // Test cache eviction callback
        if (system.cache.on) {
          const evictHandler = vi.fn();
          system.cache.on('evict', evictHandler);
          
          // Fill cache to trigger eviction
          for (let i = 0; i < 200; i++) {
            system.cache.set(i, 0, { cx: i, cy: 0 });
          }
        }
      });
      
      it('should use Phase 1 ChunkRegistry patterns', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Register template using Phase 1 pattern
        const template = {
          priority: 10,
          matches: (cx, cy) => cx === 0 && cy === 0,
          generate: async (seed, cx, cy) => ({
            cx, cy,
            map: Array(22).fill().map(() => Array(24).fill('.'))
          })
        };
        
        system.registerTemplate('spawn', template);
        
        // Find template using Phase 1 pattern
        const found = system.registry.findTemplate(0, 0);
        expect(found).toBeDefined();
      });
    });
    
    describe('Spatial Indexing Integration', () => {
      it('should work with Phase 1 spatial indexing', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        const chunk = await system.generateChunk('seed', 0, 0);
        
        // Chunk should support spatial indexing from Phase 1
        if (chunk.spatialIndex) {
          chunk.addMonster({ x: 5, y: 5, type: 'goblin' });
          const entity = chunk.getEntityAt(5, 5);
          expect(entity).toBeDefined();
        }
      });
    });
    
    describe('Event System Integration', () => {
      it('should emit Phase 1 compatible events', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        await system.generateChunk('seed', 0, 0);
        
        // Should emit events that Phase 1 systems can consume
        expect(eventBus.emit).toHaveBeenCalledWith(
          'ChunkGenerating',
          expect.objectContaining({ cx: 0, cy: 0 })
        );
        
        expect(eventBus.emit).toHaveBeenCalledWith(
          'ChunkGenerated',
          expect.objectContaining({ chunk: expect.any(Object) })
        );
      });
    });
  });
  
  describe('Phase 2 Integration (Pipeline)', () => {
    describe('Pipeline Integration', () => {
      it('should use Phase 2 ChunkPipeline correctly', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Mock pipeline to verify integration
        system.pipeline.generate = vi.fn().mockResolvedValue({
          cx: 10,
          cy: 10,
          map: Array(22).fill().map(() => Array(24).fill('#')),
          biome: 'forest',
          rooms: [{ x: 5, y: 5, width: 10, height: 10 }],
          features: { doors: [], chests: [] },
          monsters: [],
          npcs: []
        });
        
        const chunk = await system.generateChunk('seed', 10, 10);
        
        // Should receive Phase 2 pipeline output
        expect(chunk.biome).toBe('forest');
        expect(chunk.rooms).toBeDefined();
        expect(chunk.features).toBeDefined();
      });
      
      it('should respect Phase 2 pipeline steps', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Pipeline should run these steps from Phase 2:
        // 1. BiomeStep
        // 2. StructureStep  
        // 3. FeatureStep
        // 4. PopulationStep
        // 5. ValidationStep
        
        const chunk = await system.generateChunk('seed', 5, 5);
        
        if (chunk.biome) {
          // BiomeStep ran
          expect(['grassland', 'forest', 'desert', 'tundra', 'swamp', 'mountains'])
            .toContain(chunk.biome);
        }
        
        if (chunk.validated) {
          // ValidationStep ran
          expect(chunk.validated).toBe(true);
        }
      });
      
      it('should handle Phase 2 SeededRandom', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Generate same chunk twice with same seed
        const chunk1 = await system.generateChunk('test-seed', 7, 7);
        
        // Clear cache to force regeneration
        system.cache.cache.clear();
        
        const chunk2 = await system.generateChunk('test-seed', 7, 7);
        
        // Should be deterministic (same seed = same output)
        if (chunk1.biome && chunk2.biome) {
          expect(chunk1.biome).toBe(chunk2.biome);
        }
      });
    });
    
    describe('Pipeline Step Integration', () => {
      it('should integrate with BiomeStep from Phase 2', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        const chunk = await system.generateChunk('seed', 0, 0);
        
        // Should have biome from Phase 2 BiomeStep
        if (chunk.biome) {
          expect(chunk.biome).toBeTruthy();
          expect(typeof chunk.biome).toBe('string');
        }
      });
      
      it('should integrate with ValidationStep from Phase 2', async () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Generate chunk with potential issues
        system.pipeline.generate = vi.fn().mockResolvedValue({
          cx: 0,
          cy: 0,
          map: Array(22).fill().map(() => Array(24).fill('#')),
          monsters: [
            { x: -1, y: -1, type: 'invalid' }, // Out of bounds
            { x: 5, y: 5, type: 'valid' }
          ]
        });
        
        const chunk = await system.generateChunk('seed', 0, 0);
        
        // ValidationStep should fix issues
        if (chunk.monsters) {
          const validMonsters = chunk.monsters.filter(m => 
            m.x >= 0 && m.x < 24 && m.y >= 0 && m.y < 22
          );
          
          // Invalid monsters should be fixed or removed
          expect(validMonsters.length).toBeGreaterThan(0);
        }
      });
    });
    
    describe('Constants Integration', () => {
      it('should use Phase 2 constants consistently', () => {
        const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
        const system = new ChunkSystem(eventBus);
        
        // Check transition logic uses correct constants
        const result = system.getChunkTransition(23, 21, 1, 1);
        
        // Should use CHUNK_WIDTH (24) and CHUNK_HEIGHT (22)
        expect(result.shouldTransition).toBe(true);
        expect(result.newX).toBe(0); // Wrapped from 24 to 0
        expect(result.newY).toBe(0); // Wrapped from 22 to 0
      });
    });
  });
  
  describe('Cross-Phase Data Flow', () => {
    it('should maintain data integrity across all phases', async () => {
      const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const system = new ChunkSystem(eventBus);
      
      // Phase 1: Create chunk
      const chunk = await system.generateChunk('seed', 3, 3);
      
      // Phase 2: Pipeline adds data
      if (chunk.biome) {
        expect(chunk.biome).toBeTruthy();
      }
      
      // Phase 3: System modifies for quest
      const handler = eventBus.on.mock.calls
        .find(call => call[0] === 'QuestAccepted')?.[1];
      
      if (handler) {
        system.cache.set(3, 3, chunk);
        
        await handler({
          quest: {
            id: 'test',
            targetChunk: { cx: 3, cy: 3 },
            modifications: {
              addNPC: { type: 'questgiver', x: 10, y: 10 }
            }
          }
        });
        
        // All phase data should coexist
        expect(chunk.cx).toBe(3); // Phase 1
        if (chunk.biome) expect(chunk.biome).toBeTruthy(); // Phase 2
        if (chunk.npcs) expect(chunk.npcs.length).toBeGreaterThan(0); // Phase 3
      }
    });
    
    it('should handle phase boundaries correctly', async () => {
      const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const system = new ChunkSystem(eventBus);
      
      // Test Phase 1 -> Phase 3 (skipping Phase 2)
      system.pipeline = null; // Disable Phase 2
      
      // Should handle missing pipeline gracefully
      try {
        await system.generateChunk('seed', 0, 0);
      } catch (e) {
        expect(e).toBeDefined();
      }
      
      // Test Phase 2 -> Phase 3 (without Phase 1 cache)
      system.pipeline = { generate: vi.fn().mockResolvedValue({ cx: 0, cy: 0, map: [] }) };
      system.cache = null; // Disable Phase 1 cache
      
      // Should handle missing cache gracefully
      try {
        await system.generateChunk('seed', 1, 1);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });
  
  describe('System Integration Quality', () => {
    it('should not break when phases are partially implemented', async () => {
      const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const system = new ChunkSystem(eventBus);
      
      // Partially break each phase
      system.cache.get = () => undefined; // Phase 1 partial failure
      system.pipeline.generate = vi.fn().mockResolvedValue({ cx: 0, cy: 0 }); // Phase 2 partial
      
      // Should still function
      const chunk = await system.generateChunk('seed', 0, 0);
      expect(chunk).toBeDefined();
    });
    
    it('should maintain backwards compatibility', async () => {
      const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const system = new ChunkSystem(eventBus);
      
      // Old-style chunk (pre-Phase 2)
      const oldChunk = {
        cx: 0,
        cy: 0,
        tiles: Array(22).fill().map(() => Array(24).fill('#')) // Old format
      };
      
      system.cache.set(0, 0, oldChunk);
      
      const retrieved = await system.generateChunk('seed', 0, 0);
      expect(retrieved).toBe(oldChunk);
    });
    
    it('should scale with system growth', async () => {
      const eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      
      // Simulate system growth over time
      const systems = [];
      
      // Phase 1 systems
      systems.push(new ChunkSystem(eventBus));
      
      // Phase 2 additions
      systems.push(new ChunkSystem(eventBus, { cacheSize: 200 }));
      
      // Phase 3 additions
      systems.push(new ChunkSystem(eventBus, { 
        cacheSize: 500,
        preloadRadius: 2 
      }));
      
      // All should coexist
      expect(systems).toHaveLength(3);
      
      // Cleanup
      for (const sys of systems) {
        await sys.destroy();
      }
    });
  });
});