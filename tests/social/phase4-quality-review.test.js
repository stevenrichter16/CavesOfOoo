import { describe, it, expect, beforeEach } from 'vitest';
import { NPC } from '../../src/social/npc.js';
import { clearAllCaches } from '../../src/social/relationCache.js';

describe('Phase 4 Quality Review: Disguise System Logic Errors', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Disguise Quality Edge Cases', () => {
    it('should handle disguise quality exactly at threshold', () => {
      const spy = new NPC({
        id: 'spy-1',
        factions: ['real_faction'],
        disguise: {
          keys: ['fake_faction'],
          quality: 0.5 // Exactly at DISGUISE_QUALITY_MIN
        }
      });

      // Should this hide or show real factions? Test boundary condition
      const visibleFactions = spy.getVisibleFactions();
      
      // Current implementation: quality > threshold (0.5 > 0.5 = false)
      // So real factions should be visible
      expect(visibleFactions).toContain('real_faction');
      expect(visibleFactions).not.toContain('fake_faction');
    });

    it('should handle disguise quality just above threshold', () => {
      const spy = new NPC({
        id: 'spy-2', 
        factions: ['real_faction'],
        disguise: {
          keys: ['fake_faction'],
          quality: 0.5001 // Just above threshold
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should hide real factions and show disguise
      expect(visibleFactions).toContain('fake_faction');
      expect(visibleFactions).not.toContain('real_faction');
    });

    it('should handle zero quality disguise', () => {
      const spy = new NPC({
        id: 'spy-3',
        factions: ['real_faction'], 
        disguise: {
          keys: ['fake_faction'],
          quality: 0 // Terrible disguise
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should show real factions
      expect(visibleFactions).toContain('real_faction');
      expect(visibleFactions).not.toContain('fake_faction');
    });

    it('should handle quality above 1.0 (invalid but possible)', () => {
      const spy = new NPC({
        id: 'spy-4',
        factions: ['real_faction'],
        disguise: {
          keys: ['fake_faction'],
          quality: 1.5 // Invalid but not prevented
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should still work and hide real factions
      expect(visibleFactions).toContain('fake_faction');
      expect(visibleFactions).not.toContain('real_faction');
    });

    it('should handle negative quality (invalid but possible)', () => {
      const spy = new NPC({
        id: 'spy-5',
        factions: ['real_faction'],
        disguise: {
          keys: ['fake_faction'], 
          quality: -0.5 // Invalid negative quality
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should show real factions (negative < 0.5)
      expect(visibleFactions).toContain('real_faction');
      expect(visibleFactions).not.toContain('fake_faction');
    });
  });

  describe('Perception vs Disguise Detection Edge Cases', () => {
    it('should handle perception exactly equal to disguise quality', () => {
      const spy = new NPC({
        id: 'spy-6',
        factions: ['spy_faction'],
        disguise: {
          keys: ['guard_faction'],
          quality: 0.7
        }
      });

      const observer = new NPC({
        id: 'observer-1',
        factions: ['guard_faction'],
        perception: 0.7 // Exactly equal to disguise quality
      });

      const dialogue = observer.getDialogue(spy);
      
      // Current logic: perception > quality (0.7 > 0.7 = false)
      // So disguise should NOT be suspected
      expect(dialogue.tone).not.toBe('suspicious');
      expect(dialogue.hints).not.toContain('disguise_suspected');
    });

    it('should handle perception just above disguise quality', () => {
      const spy = new NPC({
        id: 'spy-7',
        factions: ['spy_faction'],
        disguise: {
          keys: ['guard_faction'],
          quality: 0.7
        }
      });

      const observer = new NPC({
        id: 'observer-2', 
        factions: ['guard_faction'],
        perception: 0.7001 // Just above quality
      });

      const dialogue = observer.getDialogue(spy);
      
      // Should detect disguise
      expect(dialogue.tone).toBe('suspicious');
      expect(dialogue.hints).toContain('disguise_suspected');
    });

    it('should handle zero perception observer', () => {
      const spy = new NPC({
        id: 'spy-8',
        factions: ['spy_faction'],
        disguise: {
          keys: ['guard_faction'],
          quality: 0.5
        }
      });

      const observer = new NPC({
        id: 'observer-3',
        factions: ['guard_faction'],
        perception: 0 // No perception
      });

      const dialogue = observer.getDialogue(spy);
      
      // Should never detect disguise (0 < any positive quality)
      expect(dialogue.tone).not.toBe('suspicious');
    });

    it('should handle observer with perception above 1.0', () => {
      const spy = new NPC({
        id: 'spy-9',
        factions: ['spy_faction'],
        disguise: {
          keys: ['guard_faction'],
          quality: 0.9
        }
      });

      const observer = new NPC({
        id: 'observer-4',
        factions: ['guard_faction'],
        perception: 1.2 // Super-human perception (now allowed)
      });

      // Should create successfully (no longer throws error)
      expect(observer.perception).toBe(1.2);

      const dialogue = observer.getDialogue(spy);
      
      // Should always detect disguise
      expect(dialogue.tone).toBe('suspicious');
      expect(dialogue.hints).toContain('disguise_suspected');
    });
  });

  describe('Quality Validation Edge Cases', () => {
    it('should clamp quality values above 1.0', () => {
      const spy = new NPC({
        id: 'spy-quality-1',
        factions: ['real_faction']
      });

      // Set invalid quality above 1.0
      spy.disguise = {
        keys: ['fake_faction'],
        quality: 1.5
      };

      // Should be clamped to 1.0
      expect(spy.disguise.quality).toBe(1.0);
    });

    it('should clamp negative quality values', () => {
      const spy = new NPC({
        id: 'spy-quality-2',
        factions: ['real_faction']
      });

      spy.disguise = {
        keys: ['fake_faction'],
        quality: -0.5
      };

      // Should be clamped to 0
      expect(spy.disguise.quality).toBe(0);
    });

    it('should handle NaN quality values', () => {
      const spy = new NPC({
        id: 'spy-quality-3',
        factions: ['real_faction']
      });

      spy.disguise = {
        keys: ['fake_faction'],
        quality: NaN
      };

      // NaN should be clamped to 0
      expect(spy.disguise.quality).toBe(0);
    });

    it('should sanitize disguise faction keys', () => {
      const spy = new NPC({
        id: 'spy-sanitize-1',
        factions: ['real_faction']
      });

      spy.disguise = {
        keys: ['<script>alert("hack")</script>', 'valid_faction', '  ', null, ''],
        quality: 0.8
      };

      // Should remove malicious/invalid keys (HTML tags removed, content remains)
      expect(spy.disguise.keys).toEqual(['alert("hack")', 'valid_faction']);
      expect(spy.disguise.keys).not.toContain('');
      expect(spy.disguise.keys).not.toContain(null);
    });
  });

  describe('Disguise Data Structure Edge Cases', () => {
    it('should handle disguise with empty keys array', () => {
      const spy = new NPC({
        id: 'spy-10',
        factions: ['real_faction'],
        disguise: {
          keys: [], // Empty disguise keys
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // With empty keys, should fall back to real factions
      expect(visibleFactions).toContain('real_faction');
      expect(visibleFactions).toHaveLength(1);
    });

    it('should handle disguise with null keys', () => {
      const spy = new NPC({
        id: 'spy-11',
        factions: ['real_faction'],
        disguise: {
          keys: null, // Null keys
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should fall back to real factions
      expect(visibleFactions).toContain('real_faction');
    });

    it('should handle disguise without keys property', () => {
      const spy = new NPC({
        id: 'spy-12',
        factions: ['real_faction'],
        disguise: {
          // Missing keys property
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should fall back to real factions
      expect(visibleFactions).toContain('real_faction');
    });

    it('should handle disguise without quality property', () => {
      const spy = new NPC({
        id: 'spy-13',
        factions: ['real_faction'],
        disguise: {
          keys: ['fake_faction']
          // Missing quality property
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Without quality, comparison fails (undefined > 0.5 = false)
      // Should fall back to real factions
      expect(visibleFactions).toContain('real_faction');
    });

    it('should handle null disguise object', () => {
      const spy = new NPC({
        id: 'spy-14',
        factions: ['real_faction'],
        disguise: null
      });

      const visibleFactions = spy.getVisibleFactions();
      
      // Should show real factions
      expect(visibleFactions).toContain('real_faction');
    });
  });

  describe('Faction Visibility Logic Errors', () => {
    it('should handle NPC with empty real factions but disguise', () => {
      const spy = new NPC({
        id: 'spy-15',
        factions: [], // No real factions
        disguise: {
          keys: ['fake_faction'],
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      const allFactions = spy.getAllFactions();
      
      // Should show disguise factions
      expect(visibleFactions).toContain('fake_faction');
      
      // getAllFactions should include both (empty real + disguise)
      expect(allFactions).toContain('fake_faction');
    });

    it('should handle duplicate factions in disguise and real', () => {
      const spy = new NPC({
        id: 'spy-16',
        factions: ['shared_faction'],
        disguise: {
          keys: ['shared_faction'], // Same as real faction
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      const allFactions = spy.getAllFactions();
      
      // Should show disguise (which is same as real)
      expect(visibleFactions).toContain('shared_faction');
      expect(visibleFactions).toHaveLength(1);
      
      // getAllFactions should not duplicate
      expect(allFactions).toContain('shared_faction');
      expect(allFactions).toHaveLength(1);
    });

    it('should handle multiple disguise factions', () => {
      const spy = new NPC({
        id: 'spy-17',
        factions: ['real1', 'real2'],
        disguise: {
          keys: ['fake1', 'fake2', 'fake3'],
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      const allFactions = spy.getAllFactions();
      
      // Should show all disguise factions
      expect(visibleFactions).toEqual(['fake1', 'fake2', 'fake3']);
      
      // getAllFactions should include all unique factions
      expect(allFactions).toEqual(['real1', 'real2', 'fake1', 'fake2', 'fake3']);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should not mutate original faction arrays', () => {
      const originalFactions = ['real_faction'];
      const originalDisguiseKeys = ['fake_faction'];
      
      const spy = new NPC({
        id: 'spy-18',
        factions: originalFactions,
        disguise: {
          keys: originalDisguiseKeys,
          quality: 0.8
        }
      });

      const visibleFactions = spy.getVisibleFactions();
      const allFactions = spy.getAllFactions();
      
      // Modify returned arrays
      visibleFactions.push('added_faction');
      allFactions.push('added_faction');
      
      // Original arrays should not be modified
      expect(originalFactions).toEqual(['real_faction']);
      expect(originalDisguiseKeys).toEqual(['fake_faction']);
      expect(spy.factions).toEqual(['real_faction']);
      expect(spy.disguise.keys).toEqual(['fake_faction']);
    });

    it('should handle rapid disguise changes', () => {
      const spy = new NPC({
        id: 'spy-19',
        factions: ['real_faction']
      });

      // Rapid disguise changes
      for (let i = 0; i < 100; i++) {
        spy.disguise = {
          keys: [`disguise_${i}`],
          quality: Math.random()
        };
      }
      
      // Should still work correctly
      const visibleFactions = spy.getVisibleFactions();
      expect(Array.isArray(visibleFactions)).toBe(true);
      expect(visibleFactions.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Logic Errors', () => {
    it('should handle hostility evaluation with disguised NPCs', () => {
      const disguisedSpy = new NPC({
        id: 'spy-20',
        factions: ['enemy_faction'],
        disguise: {
          keys: ['ally_faction'],
          quality: 0.8
        }
      });

      const observer = new NPC({
        id: 'observer-5',
        factions: ['ally_faction']
      });

      // Observer should see spy as ally (not enemy) due to disguise
      const hostility = observer.evaluateHostilityTo(disguisedSpy);
      
      // Should not be hostile to apparent ally
      expect(hostility.hostile).toBe(false);
    });

    it('should handle dialogue evaluation order', () => {
      const spy = new NPC({
        id: 'spy-21',
        factions: ['enemy_faction'],
        disguise: {
          keys: ['ally_faction'],
          quality: 0.6
        }
      });

      const observer = new NPC({
        id: 'observer-6',
        factions: ['ally_faction'],
        perception: 0.8 // Higher than disguise quality
      });

      const dialogue = observer.getDialogue(spy);
      
      // Even though disguise is detected, should still evaluate based on
      // visible factions for hostility, then add suspicion
      expect(dialogue.tone).toBe('suspicious');
      expect(dialogue.hints).toContain('disguise_suspected');
    });
  });
});