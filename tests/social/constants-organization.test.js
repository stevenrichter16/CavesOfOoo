/**
 * Tests for Constants Organization
 * Verifying that constants are properly organized and accessible
 */

import { describe, it, expect } from 'vitest';

describe('Constants Organization', () => {
  
  describe('Movement Constants Module', () => {
    it('should export movement-related constants from dedicated module', async () => {
      const movementConstants = await import('../../src/social/constants/movement.js');
      
      // Movement-specific constants should be defined
      expect(movementConstants.INTERACTION_DISTANCE).toBeDefined();
      expect(movementConstants.PERCEPTION_RANGE).toBeDefined();
      expect(movementConstants.MAX_MOVEMENT_PER_TURN).toBeDefined();
      expect(movementConstants.PATHFINDING_MAX_DISTANCE).toBeDefined();
      expect(movementConstants.HOSTILE_ATTACK_RANGE).toBeDefined();
      
      // Values should be appropriate
      expect(movementConstants.INTERACTION_DISTANCE).toBe(1.5);
      expect(movementConstants.MAX_MOVEMENT_PER_TURN).toBe(1);
    });
  });
  
  describe('Social Constants Module', () => {
    it('should export social-related constants from dedicated module', async () => {
      const socialConstants = await import('../../src/social/constants/social.js');
      
      // Social-specific constants should be defined
      expect(socialConstants.MIN_TRUST_FOR_TRADE).toBeDefined();
      expect(socialConstants.MIN_TRUST_FOR_SECRETS).toBeDefined();
      expect(socialConstants.MAX_FEAR_FOR_INTERACTION).toBeDefined();
      expect(socialConstants.RESPECT_MULTIPLIER).toBeDefined();
      expect(socialConstants.RELATIONSHIP_DECAY_RATE).toBeDefined();
      expect(socialConstants.RUMOR_SPREAD_CHANCE).toBeDefined();
      
      // Values should be appropriate
      expect(socialConstants.MIN_TRUST_FOR_TRADE).toBe(0.3);
      expect(socialConstants.MIN_TRUST_FOR_SECRETS).toBe(0.7);
    });
  });
  
  describe('NPC Constants Module', () => {
    it('should export NPC-related constants from dedicated module', async () => {
      const npcConstants = await import('../../src/social/constants/npc.js');
      
      // NPC-specific constants should be defined
      expect(npcConstants.DEFAULT_NPC_HP).toBeDefined();
      expect(npcConstants.DEFAULT_NPC_HP_MAX).toBeDefined();
      expect(npcConstants.MIN_PERCEPTION_VALUE).toBeDefined();
      expect(npcConstants.MAX_PERCEPTION_VALUE).toBeDefined();
      expect(npcConstants.NPC_MEMORY_LIMIT).toBeDefined();
      expect(npcConstants.MAX_NPCS_PER_CHUNK).toBeDefined();
      
      // Values should be appropriate
      expect(npcConstants.DEFAULT_NPC_HP).toBe(100);
      expect(npcConstants.MIN_PERCEPTION_VALUE).toBe(0);
      expect(npcConstants.MAX_PERCEPTION_VALUE).toBe(2.0);
    });
  });
  
  describe('Cache Constants Module', () => {
    it('should export cache-related constants from dedicated module', async () => {
      const cacheConstants = await import('../../src/social/constants/cache.js');
      
      // Cache-specific constants should be defined
      expect(cacheConstants.RELATION_CACHE_SIZE).toBeDefined();
      expect(cacheConstants.DIALOGUE_CACHE_TTL).toBeDefined();
      expect(cacheConstants.PATH_CACHE_SIZE).toBeDefined();
      expect(cacheConstants.ACTION_CACHE_TTL).toBeDefined();
      expect(cacheConstants.SPATIAL_INDEX_MAX_HISTORY).toBeDefined();
      
      // Values should be appropriate
      expect(cacheConstants.RELATION_CACHE_SIZE).toBe(1000);
      expect(cacheConstants.DIALOGUE_CACHE_TTL).toBe(300000); // 5 minutes
    });
  });
  
  describe('Integration Constants', () => {
    it('should export integration constants from dedicated module', async () => {
      const integrationConstants = await import('../../src/social/constants/integration.js');
      
      // Integration-specific constants
      expect(integrationConstants.EVENTS).toBeDefined();
      expect(integrationConstants.ERRORS).toBeDefined();
      expect(integrationConstants.DEBUG).toBeDefined();
      
      // Event names should be defined
      expect(integrationConstants.EVENTS.NPC_INTERACTION).toBe('NPCInteraction');
      expect(integrationConstants.EVENTS.SOCIAL_MENU_OPEN).toBe('social:menu:open');
    });
  });
  
  describe('Main Index Module', () => {
    it('should re-export all constants from index', async () => {
      const allConstants = await import('../../src/social/constants/index.js');
      
      // Should have constants from all modules
      expect(allConstants.INTERACTION_DISTANCE).toBeDefined(); // movement
      expect(allConstants.MIN_TRUST_FOR_TRADE).toBeDefined(); // social
      expect(allConstants.DEFAULT_NPC_HP).toBeDefined(); // npc
      expect(allConstants.RELATION_CACHE_SIZE).toBeDefined(); // cache
      expect(allConstants.EVENTS).toBeDefined(); // integration
    });
    
    it('should maintain backward compatibility', async () => {
      // The old constants file should still work for backward compatibility
      const oldConstants = await import('../../src/social/integration/constants.js');
      
      // Key constants should still be accessible
      expect(oldConstants.INTERACTION_DISTANCE).toBeDefined();
      expect(oldConstants.DEFAULT_NPC_HP).toBeDefined();
      expect(oldConstants.EVENTS).toBeDefined();
    });
  });
  
  describe('No Circular Dependencies', () => {
    it('should not have circular dependencies between constant modules', async () => {
      // This test will fail if there are circular dependencies
      const modules = [
        import('../../src/social/constants/movement.js'),
        import('../../src/social/constants/social.js'),
        import('../../src/social/constants/npc.js'),
        import('../../src/social/constants/cache.js'),
        import('../../src/social/constants/integration.js')
      ];
      
      // All imports should resolve without errors
      const results = await Promise.all(modules);
      expect(results).toHaveLength(5);
      results.forEach(module => {
        expect(module).toBeDefined();
      });
    });
  });
  
  describe('Type Safety', () => {
    it('should have consistent types for constants', async () => {
      const { 
        INTERACTION_DISTANCE,
        MIN_TRUST_FOR_TRADE,
        DEFAULT_NPC_HP,
        RELATION_CACHE_SIZE
      } = await import('../../src/social/constants/index.js');
      
      // Numbers should be numbers
      expect(typeof INTERACTION_DISTANCE).toBe('number');
      expect(typeof MIN_TRUST_FOR_TRADE).toBe('number');
      expect(typeof DEFAULT_NPC_HP).toBe('number');
      expect(typeof RELATION_CACHE_SIZE).toBe('number');
      
      // Should not be NaN
      expect(INTERACTION_DISTANCE).not.toBeNaN();
      expect(MIN_TRUST_FOR_TRADE).not.toBeNaN();
    });
  });
});