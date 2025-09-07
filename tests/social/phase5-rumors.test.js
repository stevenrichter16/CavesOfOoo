import { describe, it, expect, beforeEach } from 'vitest';
import { Rumor, createRumor, RumorType, RumorSeverity } from '../../src/social/rumors.js';
import { NPC } from '../../src/social/npc.js';
import { clearAllCaches } from '../../src/social/relationCache.js';

describe('Phase 5: Rumor & Memory System', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Rumor Creation', () => {
    it('should create a basic rumor with required properties', () => {
      const rumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: ['banana_guard'],
        position: { x: 10, y: 20 },
        details: 'Guards fought bandits near the castle'
      });

      expect(rumor).toBeDefined();
      expect(rumor.id).toBeDefined();
      expect(rumor.type).toBe(RumorType.COMBAT);
      expect(rumor.severity).toBe(RumorSeverity.MODERATE);
      expect(rumor.factions).toEqual(['banana_guard']);
      expect(rumor.position).toEqual({ x: 10, y: 20 });
      expect(rumor.details).toBe('Guards fought bandits near the castle');
      expect(rumor.timestamp).toBeDefined();
      expect(rumor.accuracy).toBe(1.0); // Initial accuracy is perfect
      expect(rumor.spreadCount).toBe(0);
    });

    it('should validate rumor severity levels', () => {
      const minor = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['candy_citizens'],
        position: { x: 0, y: 0 }
      });

      const major = createRumor({
        type: RumorType.THEFT,
        severity: RumorSeverity.MAJOR,
        factions: ['bandits'],
        position: { x: 5, y: 5 }
      });

      const critical = createRumor({
        type: RumorType.ASSASSINATION,
        severity: RumorSeverity.CRITICAL,
        factions: ['ice_spies'],
        position: { x: 100, y: 100 }
      });

      expect(minor.severity).toBe(RumorSeverity.MINOR);
      expect(major.severity).toBe(RumorSeverity.MAJOR);
      expect(critical.severity).toBe(RumorSeverity.CRITICAL);
      
      // Critical rumors should have higher initial spread potential
      expect(critical.maxSpreadDistance).toBeGreaterThan(major.maxSpreadDistance);
      expect(major.maxSpreadDistance).toBeGreaterThan(minor.maxSpreadDistance);
    });

    it('should support different rumor types', () => {
      const combatRumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: ['fire_guards'],
        position: { x: 0, y: 0 }
      });

      const theftRumor = createRumor({
        type: RumorType.THEFT,
        severity: RumorSeverity.MODERATE,
        factions: ['bandits'],
        position: { x: 0, y: 0 }
      });

      const discoveryRumor = createRumor({
        type: RumorType.DISCOVERY,
        severity: RumorSeverity.MODERATE,
        factions: ['candy_merchants'],
        position: { x: 0, y: 0 },
        details: 'New trade route discovered'
      });

      expect(combatRumor.type).toBe(RumorType.COMBAT);
      expect(theftRumor.type).toBe(RumorType.THEFT);
      expect(discoveryRumor.type).toBe(RumorType.DISCOVERY);
    });

    it('should calculate rumor decay based on distance', () => {
      const rumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: ['banana_guard'],
        position: { x: 0, y: 0 }
      });

      // Test accuracy decay over distance
      const accuracy5 = rumor.getAccuracyAtDistance(5);
      const accuracy10 = rumor.getAccuracyAtDistance(10);
      const accuracy20 = rumor.getAccuracyAtDistance(20);
      const accuracy50 = rumor.getAccuracyAtDistance(50);

      expect(accuracy5).toBeLessThan(1.0);
      expect(accuracy5).toBeGreaterThan(accuracy10);
      expect(accuracy10).toBeGreaterThan(accuracy20);
      expect(accuracy20).toBeGreaterThan(accuracy50);
      expect(accuracy50).toBeGreaterThan(0); // Never fully disappears
    });

    it('should track rumor age and staleness', () => {
      const rumor = new Rumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['candy_citizens'],
        position: { x: 0, y: 0 },
        timestamp: Date.now() - 3600000 // 1 hour ago
      });

      expect(rumor.getAge()).toBeGreaterThanOrEqual(3600000);
      expect(rumor.isStale()).toBe(false); // Minor rumors stay fresh longer

      const oldRumor = new Rumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['candy_citizens'],
        position: { x: 0, y: 0 },
        timestamp: Date.now() - 86400000 * 15 // 15 days ago (past the 14 day limit for minor)
      });

      expect(oldRumor.isStale()).toBe(true);
    });
  });

  describe('Rumor Propagation', () => {
    it('should spread rumors between aligned NPCs', () => {
      const npc1 = new NPC({
        id: 'guard1',
        factions: ['banana_guard'],
        position: { x: 0, y: 0 }
      });

      const npc2 = new NPC({
        id: 'guard2',
        factions: ['banana_guard'],
        position: { x: 5, y: 5 }
      });

      const rumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: ['banana_guard'],
        position: { x: 0, y: 0 }
      });

      // NPC1 hears the rumor
      npc1.hearRumor(rumor);
      expect(npc1.memory.rumors).toHaveLength(1);

      // NPC1 shares with aligned NPC2
      const shared = npc1.shareRumorsWith(npc2);
      expect(shared).toBe(true);
      expect(npc2.memory.rumors).toHaveLength(1);
      
      // Shared rumor should have reduced accuracy
      const sharedRumor = npc2.memory.rumors[0];
      expect(sharedRumor.accuracy).toBeLessThan(rumor.accuracy);
      expect(sharedRumor.spreadCount).toBe(1);
    });

    it('should not spread rumors to hostile NPCs', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        position: { x: 0, y: 0 }
      });

      const bandit = new NPC({
        id: 'bandit',
        factions: ['bandits'],
        position: { x: 5, y: 5 }
      });

      const rumor = createRumor({
        type: RumorType.DISCOVERY,
        severity: RumorSeverity.MAJOR,
        factions: ['banana_guard'],
        position: { x: 0, y: 0 },
        details: 'Secret guard patrol route'
      });

      guard.hearRumor(rumor);
      
      // Guard should not share with hostile bandit
      const shared = guard.shareRumorsWith(bandit);
      expect(shared).toBe(false);
      expect(bandit.memory.rumors).toHaveLength(0);
    });

    it('should distort rumors when retold multiple times', () => {
      const npc1 = new NPC({
        id: 'npc1',
        factions: ['candy_citizens']
      });

      const npc2 = new NPC({
        id: 'npc2',
        factions: ['candy_citizens']
      });

      const npc3 = new NPC({
        id: 'npc3',
        factions: ['candy_citizens']
      });

      const originalRumor = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MODERATE,
        factions: ['ice_spies'],
        position: { x: 50, y: 50 },
        details: 'Ice spy seen near the candy castle'
      });

      // Chain of rumor spreading
      npc1.hearRumor(originalRumor);
      npc1.shareRumorsWith(npc2);
      npc2.shareRumorsWith(npc3);

      const finalRumor = npc3.memory.rumors[0];
      
      // Accuracy should degrade
      expect(finalRumor.accuracy).toBeLessThan(originalRumor.accuracy);
      expect(finalRumor.spreadCount).toBe(2);
      
      // Details might be distorted (if distortion is implemented)
      // Position might become less precise
      expect(finalRumor.position).toBeDefined();
    });

    it('should limit rumor spread distance based on severity', () => {
      const minorRumor = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['candy_citizens'],
        position: { x: 0, y: 0 }
      });

      const criticalRumor = createRumor({
        type: RumorType.ASSASSINATION,
        severity: RumorSeverity.CRITICAL,
        factions: ['ice_spies'],
        position: { x: 0, y: 0 }
      });

      // NPCs at various distances
      const nearbyNPC = new NPC({
        id: 'nearby',
        factions: ['candy_citizens'],
        position: { x: 10, y: 0 }
      });

      const farNPC = new NPC({
        id: 'far',
        factions: ['candy_citizens'],
        position: { x: 100, y: 0 }
      });

      // Minor rumors shouldn't spread far
      expect(minorRumor.canSpreadToPosition(nearbyNPC.position)).toBe(true);
      expect(minorRumor.canSpreadToPosition(farNPC.position)).toBe(false);

      // Critical rumors spread much farther
      expect(criticalRumor.canSpreadToPosition(nearbyNPC.position)).toBe(true);
      expect(criticalRumor.canSpreadToPosition(farNPC.position)).toBe(true);
    });

    it('should apply faction-specific spread modifiers', () => {
      const merchantRumor = createRumor({
        type: RumorType.TRADE,
        severity: RumorSeverity.MODERATE,
        factions: ['candy_merchants'],
        position: { x: 0, y: 0 },
        details: 'New rare candy discovered'
      });

      const merchant1 = new NPC({
        id: 'merchant1',
        factions: ['candy_merchants']
      });

      const merchant2 = new NPC({
        id: 'merchant2',
        factions: ['fire_merchants']
      });

      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard']
      });

      merchant1.hearRumor(merchantRumor);

      // Merchants spread trade rumors better
      const spreadToMerchant = merchant1.shareRumorsWith(merchant2);
      const spreadToGuard = merchant1.shareRumorsWith(guard);

      expect(spreadToMerchant).toBe(true);
      
      // Trade rumors might have better retention among merchants
      if (merchant2.memory.rumors.length > 0) {
        const merchantVersion = merchant2.memory.rumors[0];
        expect(merchantVersion.accuracy).toBeGreaterThan(0.5); // Better accuracy for relevant faction
      }
    });
  });

  describe('NPC Memory Enhancement', () => {
    it('should track rumors in NPC memory', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['candy_citizens']
      });

      expect(npc.memory).toBeDefined();
      expect(npc.memory.rumors).toEqual([]);

      const rumor = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['bandits'],
        position: { x: 10, y: 10 }
      });

      npc.hearRumor(rumor);
      expect(npc.memory.rumors).toHaveLength(1);
      expect(npc.memory.rumors[0]).toMatchObject({
        type: RumorType.SIGHTING,
        factions: ['bandits']
      });
    });

    it('should limit number of rumors in memory', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['candy_citizens']
      });

      // Add many rumors
      for (let i = 0; i < 20; i++) {
        const rumor = createRumor({
          type: RumorType.SIGHTING,
          severity: RumorSeverity.MINOR,
          factions: ['bandits'],
          position: { x: i, y: i },
          details: `Rumor ${i}`
        });
        npc.hearRumor(rumor);
      }

      // Memory should have a limit (e.g., 10 rumors)
      expect(npc.memory.rumors.length).toBeLessThanOrEqual(10);
      
      // Should keep most recent/important rumors
      const lastRumor = npc.memory.rumors[npc.memory.rumors.length - 1];
      expect(lastRumor.details).toContain('19'); // Most recent
    });

    it('should prioritize important rumors in memory', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['candy_citizens']
      });

      // Add minor rumors first
      for (let i = 0; i < 8; i++) {
        npc.hearRumor(createRumor({
          type: RumorType.SIGHTING,
          severity: RumorSeverity.MINOR,
          factions: ['bandits'],
          position: { x: i, y: i }
        }));
      }

      // Add a critical rumor
      const criticalRumor = createRumor({
        type: RumorType.ASSASSINATION,
        severity: RumorSeverity.CRITICAL,
        factions: ['ice_spies'],
        position: { x: 50, y: 50 },
        details: 'King assassination attempt'
      });
      npc.hearRumor(criticalRumor);

      // Critical rumor should be retained
      const hasCritical = npc.memory.rumors.some(r => 
        r.severity === RumorSeverity.CRITICAL
      );
      expect(hasCritical).toBe(true);
    });

    it('should distinguish private vs shareable memories', () => {
      const spy = new NPC({
        id: 'spy',
        factions: ['ice_spies'],
        disguise: {
          keys: ['candy_citizens'],
          quality: 0.8
        }
      });

      const publicRumor = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['bandits'],
        position: { x: 0, y: 0 },
        isPublic: true
      });

      const secretRumor = createRumor({
        type: RumorType.DISCOVERY,
        severity: RumorSeverity.MAJOR,
        factions: ['ice_spies'],
        position: { x: 10, y: 10 },
        details: 'Secret ice kingdom plans',
        isPublic: false
      });

      spy.hearRumor(publicRumor);
      spy.hearRumor(secretRumor);

      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens']
      });

      // Spy shares rumors (but only public ones when in disguise)
      spy.shareRumorsWith(citizen);

      // Citizen should only have the public rumor
      expect(citizen.memory.rumors).toHaveLength(1);
      expect(citizen.memory.rumors[0].details).not.toContain('Secret');
    });

    it('should forget old rumors over time', () => {
      const npc = new NPC({
        id: 'test-npc',
        factions: ['candy_citizens']
      });

      const oldRumor = new Rumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['bandits'],
        position: { x: 0, y: 0 },
        timestamp: Date.now() - (86400000 * 10) // 10 days old
      });

      const recentRumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: ['banana_guard'],
        position: { x: 5, y: 5 }
      });

      npc.hearRumor(oldRumor);
      npc.hearRumor(recentRumor);

      // Process memory decay
      npc.updateMemory();

      // Old rumor should be forgotten
      expect(npc.memory.rumors).toHaveLength(1);
      expect(npc.memory.rumors[0].type).toBe(RumorType.COMBAT);
    });
  });

  describe('Faction Standing Impact', () => {
    it('should affect faction relationships through rumors', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard']
      });

      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens']
      });

      // Get initial relation
      const initialRelation = citizen.getRelationTo(guard);

      // Negative rumor about guards
      const badRumor = createRumor({
        type: RumorType.CORRUPTION,
        severity: RumorSeverity.MAJOR,
        factions: ['banana_guard'],
        position: { x: 0, y: 0 },
        details: 'Guards taking bribes',
        sentiment: -0.5 // Negative sentiment
      });

      citizen.hearRumor(badRumor);
      citizen.processRumorImpact();

      // Relation should worsen
      const newRelation = citizen.getRelationTo(guard);
      expect(newRelation).toBeLessThan(initialRelation);
    });

    it('should create reputation effects from player actions', () => {
      const player = {
        factions: ['player'],
        position: { x: 0, y: 0 },
        reputation: {}
      };

      // Player action creates rumor
      const heroicRumor = createRumor({
        type: RumorType.HEROIC_ACT,
        severity: RumorSeverity.MAJOR,
        factions: ['player'],
        position: player.position,
        details: 'Player saved candy citizens from bandits',
        sentiment: 0.8, // Positive sentiment
        affectedFactions: ['candy_citizens', 'banana_guard']
      });

      // NPCs hear the rumor
      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens']
      });

      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard']
      });

      citizen.hearRumor(heroicRumor);
      guard.hearRumor(heroicRumor);
      
      // Process the rumor impacts
      citizen.processRumorImpact();
      guard.processRumorImpact();

      // Both should have improved relations with player
      const citizenRelation = citizen.getRelationTo(player);
      const guardRelation = guard.getRelationTo(player);

      expect(citizenRelation).toBeGreaterThan(0);
      expect(guardRelation).toBeGreaterThan(0);
    });

    it('should allow rumors to shift faction alliances', () => {
      const merchantGuild = new NPC({
        id: 'merchant-leader',
        factions: ['candy_merchants'],
        role: 'leader'
      });

      // Rumor about betrayal
      const betrayalRumor = createRumor({
        type: RumorType.BETRAYAL,
        severity: RumorSeverity.CRITICAL,
        factions: ['fire_merchants'],
        position: { x: 100, y: 100 },
        details: 'Fire merchants broke trade agreement',
        sentiment: -0.9,
        affectedFactions: ['candy_merchants']
      });

      merchantGuild.hearRumor(betrayalRumor);
      merchantGuild.processRumorImpact();

      // Should affect future interactions with fire merchants
      const fireMerchant = new NPC({
        id: 'fire-merchant',
        factions: ['fire_merchants']
      });

      const relation = merchantGuild.getRelationTo(fireMerchant);
      expect(relation).toBeLessThan(0); // Should be negative after betrayal rumor
    });
  });

  describe('Rumor System Integration', () => {
    it('should integrate with quest events', () => {
      // Mock quest completion event
      const questEvent = {
        type: 'quest_complete',
        questId: 'rescue_mission',
        position: { x: 50, y: 50 },
        participants: ['player', 'banana_guard'],
        outcome: 'success'
      };

      // Quest events should generate rumors
      const rumors = Rumor.fromQuestEvent(questEvent);
      expect(rumors).toHaveLength(1);
      
      const rumor = rumors[0];
      expect(rumor.type).toBe(RumorType.QUEST);
      expect(rumor.factions).toContain('player');
      expect(rumor.details).toContain('rescue_mission');
    });

    it('should integrate with combat events', () => {
      const combatEvent = {
        type: 'combat',
        attacker: { factions: ['bandits'] },
        defender: { factions: ['banana_guard'] },
        position: { x: 30, y: 30 },
        outcome: 'defender_victory'
      };

      const rumors = Rumor.fromCombatEvent(combatEvent);
      expect(rumors.length).toBeGreaterThan(0);
      
      const rumor = rumors[0];
      expect(rumor.type).toBe(RumorType.COMBAT);
      expect(rumor.factions).toContain('banana_guard');
      expect(rumor.severity).toBeGreaterThanOrEqual(RumorSeverity.MODERATE);
    });

    it('should respect disguises when spreading rumors', () => {
      const spy = new NPC({
        id: 'spy',
        factions: ['ice_spies'],
        disguise: {
          keys: ['candy_citizens'],
          quality: 0.8
        }
      });

      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens'],
        perception: 0.3 // Low perception, won't detect disguise
      });

      const guardSecret = createRumor({
        type: RumorType.DISCOVERY,
        severity: RumorSeverity.MAJOR,
        factions: ['banana_guard'],
        position: { x: 0, y: 0 },
        details: 'Guard patrol schedule leaked',
        isPublic: false
      });

      // Spy learns the secret
      spy.hearRumor(guardSecret);

      // Spy shares with citizen (appears as fellow citizen)
      const shared = spy.shareRumorsWith(citizen);
      
      // Disguised spy might share different rumors or withhold sensitive info
      if (shared && citizen.memory.rumors.length > 0) {
        const sharedRumor = citizen.memory.rumors[0];
        // Spy might distort or withhold certain details
        expect(sharedRumor).toBeDefined();
      }
    });
  });
});