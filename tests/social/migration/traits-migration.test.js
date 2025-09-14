import { describe, it, expect, beforeEach } from 'vitest';

describe('NPCTraits Migration to NEW System', () => {
  let NPCTraits, areTraitsOpposed, getTraitEffects;
  
  beforeEach(async () => {
    const module = await import('../../../src/social/traits.js');
    NPCTraits = module.NPCTraits;
    areTraitsOpposed = module.areTraitsOpposed;
    getTraitEffects = module.getTraitEffects;
  });

  describe('NPCTraits in NEW location', () => {
    it('should export NPCTraits object', () => {
      expect(NPCTraits).toBeDefined();
      expect(typeof NPCTraits).toBe('object');
    });

    it('should have all expected trait definitions', () => {
      // Core personality traits
      expect(NPCTraits.brave).toBeDefined();
      expect(NPCTraits.cowardly).toBeDefined();
      expect(NPCTraits.friendly).toBeDefined();
      expect(NPCTraits.suspicious).toBeDefined();
      expect(NPCTraits.honest).toBeDefined();
      expect(NPCTraits.deceptive).toBeDefined();
      expect(NPCTraits.greedy).toBeDefined();
      expect(NPCTraits.generous).toBeDefined();
      
      // Social traits
      expect(NPCTraits.gossip).toBeDefined();
      expect(NPCTraits.talkative).toBeDefined();
      expect(NPCTraits.quiet).toBeDefined();
      expect(NPCTraits.helpful).toBeDefined();
      
      // Special traits
      expect(NPCTraits.paranoid).toBeDefined();
      expect(NPCTraits.conspiracy_theorist).toBeDefined();
      expect(NPCTraits.eccentric).toBeDefined();
    });

    it('should have trait effects for each trait', () => {
      Object.keys(NPCTraits).forEach(trait => {
        const traitDef = NPCTraits[trait];
        expect(traitDef).toHaveProperty('effects');
        expect(traitDef.effects).toBeDefined();
      });
    });

    it('should have descriptions for each trait', () => {
      Object.keys(NPCTraits).forEach(trait => {
        const traitDef = NPCTraits[trait];
        expect(traitDef).toHaveProperty('description');
        expect(typeof traitDef.description).toBe('string');
        expect(traitDef.description.length).toBeGreaterThan(0);
      });
    });

    it('should export areTraitsOpposed function', () => {
      expect(areTraitsOpposed).toBeDefined();
      expect(typeof areTraitsOpposed).toBe('function');
    });

    it('should correctly identify opposed traits', () => {
      // Test opposing pairs
      expect(areTraitsOpposed('brave', 'cowardly')).toBe(true);
      expect(areTraitsOpposed('cowardly', 'brave')).toBe(true);
      expect(areTraitsOpposed('friendly', 'suspicious')).toBe(true);
      expect(areTraitsOpposed('honest', 'deceptive')).toBe(true);
      expect(areTraitsOpposed('greedy', 'generous')).toBe(true);
      expect(areTraitsOpposed('talkative', 'quiet')).toBe(true);
      
      // Test non-opposing traits
      expect(areTraitsOpposed('brave', 'friendly')).toBe(false);
      expect(areTraitsOpposed('honest', 'helpful')).toBe(false);
      expect(areTraitsOpposed('gossip', 'talkative')).toBe(false);
    });

    it('should handle unknown traits gracefully', () => {
      expect(areTraitsOpposed('unknown_trait', 'brave')).toBe(false);
      expect(areTraitsOpposed('brave', 'unknown_trait')).toBe(false);
      expect(areTraitsOpposed('unknown1', 'unknown2')).toBe(false);
    });

    it('should export getTraitEffects function', () => {
      expect(getTraitEffects).toBeDefined();
      expect(typeof getTraitEffects).toBe('function');
    });

    it('should get trait effects correctly', () => {
      const braveEffects = getTraitEffects('brave');
      expect(braveEffects).toBeDefined();
      expect(braveEffects).toHaveProperty('combatBonus');
      expect(braveEffects).toHaveProperty('fearResistance');
      
      const greedyEffects = getTraitEffects('greedy');
      expect(greedyEffects).toBeDefined();
      expect(greedyEffects).toHaveProperty('priceModifier');
      
      // Unknown trait should return empty effects
      const unknownEffects = getTraitEffects('unknown_trait');
      expect(unknownEffects).toEqual({});
    });

    it('should work with NPC class', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        traits: ['brave', 'honest', 'helpful']
      });
      
      expect(npc.hasTrait('brave')).toBe(true);
      expect(npc.hasTrait('honest')).toBe(true);
      expect(npc.hasTrait('helpful')).toBe(true);
      expect(npc.hasTrait('cowardly')).toBe(false);
    });

    it('should prevent opposed traits when generating', async () => {
      const { NPC } = await import('../../../src/social/npcEnhanced.js');
      
      // Generate traits many times to test randomness
      for (let i = 0; i < 20; i++) {
        const npc = new NPC({
          id: `test_${i}`,
          name: `Test ${i}`
          // Let it auto-generate traits
        });
        
        // Check that no opposed traits exist
        const traits = npc.traits || [];
        for (let j = 0; j < traits.length; j++) {
          for (let k = j + 1; k < traits.length; k++) {
            expect(areTraitsOpposed(traits[j], traits[k])).toBe(false);
          }
        }
      }
    });
  });

  describe('Trait system integration', () => {
    it('should affect dialogue options based on traits', () => {
      // Traits should influence dialogue
      const gossipTrait = NPCTraits.gossip;
      expect(gossipTrait.effects).toHaveProperty('rumorSpreadChance');
      expect(gossipTrait.effects.rumorSpreadChance).toBeGreaterThan(0);
      
      const suspiciousTrait = NPCTraits.suspicious;
      expect(suspiciousTrait.effects).toHaveProperty('trustModifier');
      expect(suspiciousTrait.effects.trustModifier).toBeLessThan(0);
    });

    it('should affect NPC behavior based on traits', () => {
      const cowardlyTrait = NPCTraits.cowardly;
      expect(cowardlyTrait.effects).toHaveProperty('fleeThreshold');
      expect(cowardlyTrait.effects.fleeThreshold).toBeGreaterThan(0);
      
      const aggressiveTrait = NPCTraits.aggressive;
      expect(aggressiveTrait.effects).toHaveProperty('attackBonus');
      expect(aggressiveTrait.effects.attackBonus).toBeGreaterThan(0);
    });

    it('should have trait categories', () => {
      // Personality traits
      expect(NPCTraits.brave.category).toBe('personality');
      expect(NPCTraits.friendly.category).toBe('personality');
      
      // Social traits
      expect(NPCTraits.gossip.category).toBe('social');
      expect(NPCTraits.talkative.category).toBe('social');
      
      // Combat traits
      expect(NPCTraits.aggressive.category).toBe('combat');
      expect(NPCTraits.defensive.category).toBe('combat');
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain same trait keys as OLD system', () => {
      // These traits existed in OLD system
      const oldTraits = [
        'brave', 'cowardly', 'friendly', 'suspicious',
        'honest', 'deceptive', 'greedy', 'generous',
        'aggressive', 'peaceful', 'smart', 'dumb',
        'loyal', 'treacherous', 'curious', 'indifferent'
      ];
      
      oldTraits.forEach(trait => {
        expect(NPCTraits).toHaveProperty(trait);
      });
    });

    it('should maintain opposition relationships from OLD system', () => {
      // These were opposed in OLD system
      const oppositions = [
        ['brave', 'cowardly'],
        ['friendly', 'suspicious'],
        ['honest', 'deceptive'],
        ['greedy', 'generous'],
        ['aggressive', 'peaceful'],
        ['smart', 'dumb'],
        ['loyal', 'treacherous'],
        ['curious', 'indifferent']
      ];
      
      oppositions.forEach(([trait1, trait2]) => {
        expect(areTraitsOpposed(trait1, trait2)).toBe(true);
      });
    });
  });
});