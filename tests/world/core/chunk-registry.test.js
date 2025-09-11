/**
 * Tests for ChunkRegistry
 * Testing the template registration and matching system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChunkRegistry', () => {
  let ChunkRegistry;
  
  beforeEach(async () => {
    const module = await import('../../../src/js/world/core/ChunkRegistry.js');
    ChunkRegistry = module.ChunkRegistry;
  });
  
  describe('Template Registration', () => {
    it('should register chunk templates', () => {
      const registry = new ChunkRegistry();
      
      const template = {
        id: 'test_template',
        name: 'Test Template',
        generate: vi.fn()
      };
      
      registry.register(template);
      
      expect(registry.getTemplate('test_template')).toBe(template);
    });
    
    it('should retrieve templates by ID', () => {
      const registry = new ChunkRegistry();
      
      const template1 = { id: 'template1', name: 'Template 1', generate: vi.fn() };
      const template2 = { id: 'template2', name: 'Template 2', generate: vi.fn() };
      
      registry.register(template1);
      registry.register(template2);
      
      expect(registry.getTemplate('template1')).toBe(template1);
      expect(registry.getTemplate('template2')).toBe(template2);
    });
    
    it('should handle duplicate registration by overwriting', () => {
      const registry = new ChunkRegistry();
      
      const template1 = { id: 'duplicate', name: 'First Version', generate: vi.fn() };
      const template2 = { id: 'duplicate', name: 'Second Version', generate: vi.fn() };
      
      registry.register(template1);
      registry.register(template2);
      
      // Should have the second version
      expect(registry.getTemplate('duplicate').name).toBe('Second Version');
    });
    
    it('should return null for non-existent template', () => {
      const registry = new ChunkRegistry();
      
      expect(registry.getTemplate('non_existent')).toBeNull();
    });
    
    it('should validate template has required fields', () => {
      const registry = new ChunkRegistry();
      
      // Should throw for template without ID
      expect(() => {
        registry.register({ name: 'No ID', generate: vi.fn() });
      }).toThrow('Template must have an id');
      
      // Should accept template with ID and generate
      expect(() => {
        registry.register({ id: 'valid', name: 'Valid', generate: vi.fn() });
      }).not.toThrow();
    });
  });
  
  describe('Template Matching', () => {
    it('should match templates by fixed coordinates', () => {
      const registry = new ChunkRegistry();
      
      const candyMarket = {
        id: 'candy_market',
        coordinates: [{ x: 0, y: 0 }],
        matches: function(cx, cy) {
          return this.coordinates.some(c => c.x === cx && c.y === cy);
        }
      };
      
      registry.register(candyMarket);
      
      const found = registry.findTemplate(0, 0);
      expect(found).toBe(candyMarket);
      
      const notFound = registry.findTemplate(1, 1);
      expect(notFound).toBeNull();
    });
    
    it('should evaluate condition functions', () => {
      const registry = new ChunkRegistry();
      
      const conditionalTemplate = {
        id: 'conditional',
        condition: (cx, cy) => cx > 5 && cy < -3,
        matches: function(cx, cy) {
          return this.condition(cx, cy);
        }
      };
      
      registry.register(conditionalTemplate);
      
      expect(registry.findTemplate(6, -4)).toBe(conditionalTemplate);
      expect(registry.findTemplate(6, -2)).toBeNull();
      expect(registry.findTemplate(4, -4)).toBeNull();
    });
    
    it('should prioritize fixed coordinates over conditions', () => {
      const registry = new ChunkRegistry();
      
      const fixedTemplate = {
        id: 'fixed',
        coordinates: [{ x: 5, y: 5 }],
        priority: 10,
        matches: function(cx, cy) {
          return this.coordinates.some(c => c.x === cx && c.y === cy);
        }
      };
      
      const conditionalTemplate = {
        id: 'conditional',
        priority: 5,
        condition: (cx, cy) => cx === 5 && cy === 5,
        matches: function(cx, cy) {
          return this.condition(cx, cy);
        }
      };
      
      registry.register(conditionalTemplate);
      registry.register(fixedTemplate);
      
      // Fixed template should win due to higher priority
      const found = registry.findTemplate(5, 5);
      expect(found.id).toBe('fixed');
    });
    
    it('should return null when no template matches', () => {
      const registry = new ChunkRegistry();
      
      const template = {
        id: 'specific',
        coordinates: [{ x: 100, y: 100 }],
        matches: function(cx, cy) {
          return this.coordinates.some(c => c.x === cx && c.y === cy);
        }
      };
      
      registry.register(template);
      
      expect(registry.findTemplate(0, 0)).toBeNull();
      expect(registry.findTemplate(50, 50)).toBeNull();
    });
    
    it('should handle multiple coordinates per template', () => {
      const registry = new ChunkRegistry();
      
      const multiCoordTemplate = {
        id: 'multi',
        coordinates: [
          { x: 0, y: 0 },
          { x: 5, y: -3 },
          { x: -8, y: 2 }
        ],
        matches: function(cx, cy) {
          return this.coordinates.some(c => c.x === cx && c.y === cy);
        }
      };
      
      registry.register(multiCoordTemplate);
      
      expect(registry.findTemplate(0, 0)).toBe(multiCoordTemplate);
      expect(registry.findTemplate(5, -3)).toBe(multiCoordTemplate);
      expect(registry.findTemplate(-8, 2)).toBe(multiCoordTemplate);
      expect(registry.findTemplate(1, 1)).toBeNull();
    });
    
    it('should pass context to condition functions', () => {
      const registry = new ChunkRegistry();
      
      const contextTemplate = {
        id: 'context_aware',
        condition: (cx, cy, context) => {
          return context && context.questActive === true;
        },
        matches: function(cx, cy, context) {
          return this.condition(cx, cy, context);
        }
      };
      
      registry.register(contextTemplate);
      
      // Without context, no match
      expect(registry.findTemplate(0, 0)).toBeNull();
      
      // With context but questActive false
      expect(registry.findTemplate(0, 0, { questActive: false })).toBeNull();
      
      // With context and questActive true
      expect(registry.findTemplate(0, 0, { questActive: true })).toBe(contextTemplate);
    });
  });
  
  describe('Registry Management', () => {
    it('should list all registered templates', () => {
      const registry = new ChunkRegistry();
      
      const template1 = { id: 'template1', generate: vi.fn() };
      const template2 = { id: 'template2', generate: vi.fn() };
      const template3 = { id: 'template3', generate: vi.fn() };
      
      registry.register(template1);
      registry.register(template2);
      registry.register(template3);
      
      const all = registry.getAllTemplates();
      
      expect(all).toHaveLength(3);
      expect(all).toContain(template1);
      expect(all).toContain(template2);
      expect(all).toContain(template3);
    });
    
    it('should unregister templates', () => {
      const registry = new ChunkRegistry();
      
      const template = { id: 'to_remove', generate: vi.fn() };
      
      registry.register(template);
      expect(registry.getTemplate('to_remove')).toBe(template);
      
      const removed = registry.unregister('to_remove');
      
      expect(removed).toBe(true);
      expect(registry.getTemplate('to_remove')).toBeNull();
    });
    
    it('should return false when unregistering non-existent template', () => {
      const registry = new ChunkRegistry();
      
      const removed = registry.unregister('non_existent');
      
      expect(removed).toBe(false);
    });
    
    it('should clear all templates', () => {
      const registry = new ChunkRegistry();
      
      registry.register({ id: 'template1', generate: vi.fn() });
      registry.register({ id: 'template2', generate: vi.fn() });
      registry.register({ id: 'template3', generate: vi.fn() });
      
      expect(registry.getAllTemplates()).toHaveLength(3);
      
      registry.clear();
      
      expect(registry.getAllTemplates()).toHaveLength(0);
      expect(registry.getTemplate('template1')).toBeNull();
    });
    
    it('should track template count', () => {
      const registry = new ChunkRegistry();
      
      expect(registry.size).toBe(0);
      
      registry.register({ id: 'template1', generate: vi.fn() });
      expect(registry.size).toBe(1);
      
      registry.register({ id: 'template2', generate: vi.fn() });
      expect(registry.size).toBe(2);
      
      registry.unregister('template1');
      expect(registry.size).toBe(1);
      
      registry.clear();
      expect(registry.size).toBe(0);
    });
  });
  
  describe('Template Priority', () => {
    it('should respect template priority when multiple match', () => {
      const registry = new ChunkRegistry();
      
      const lowPriority = {
        id: 'low',
        priority: 1,
        matches: (cx, cy) => cx === 0 && cy === 0
      };
      
      const highPriority = {
        id: 'high',
        priority: 10,
        matches: (cx, cy) => cx === 0 && cy === 0
      };
      
      registry.register(lowPriority);
      registry.register(highPriority);
      
      const found = registry.findTemplate(0, 0);
      expect(found.id).toBe('high');
    });
    
    it('should use default priority of 0 when not specified', () => {
      const registry = new ChunkRegistry();
      
      const noPriority = {
        id: 'no_priority',
        matches: (cx, cy) => true
      };
      
      const withPriority = {
        id: 'with_priority',
        priority: 1,
        matches: (cx, cy) => true
      };
      
      registry.register(noPriority);
      registry.register(withPriority);
      
      const found = registry.findTemplate(0, 0);
      expect(found.id).toBe('with_priority');
    });
  });
});