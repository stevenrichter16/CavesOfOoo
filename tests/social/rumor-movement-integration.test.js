import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RumorMovementBridge } from '../../src/social/movement/RumorMovementBridge.js';
import { NPC } from '../../src/social/npc.js';
import { createRumor, RumorType, RumorSeverity, rumorEngine } from '../../src/social/rumors.js';
import { EventEmitter } from 'events';

describe('Rumor-Movement Integration', () => {
  let eventBus;
  let bridge;
  
  beforeEach(() => {
    eventBus = new EventEmitter();
    bridge = new RumorMovementBridge(eventBus);
    rumorEngine.clearRumors();
  });

  describe('Movement-Based Rumor Sharing', () => {
    it('should share rumors when NPCs come within range during movement', () => {
      const guard1 = new NPC({
        id: 'guard1',
        factions: ['banana_guard'],
        x: 0,
        y: 0
      });

      const guard2 = new NPC({
        id: 'guard2',
        factions: ['banana_guard'],
        x: 10,
        y: 0
      });

      // Guard1 has a rumor
      const rumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.MODERATE,
        factions: ['bandits'],
        position: { x: 20, y: 20 }
      });
      guard1.hearRumor(rumor);

      // Create state with both NPCs
      const state = {
        npcs: [guard1, guard2]
      };

      // Move guard1 closer but not quite in range
      guard1.x = 4;
      eventBus.emit('DidMove', {
        entity: guard1,
        position: { x: 4, y: 0 },
        state
      });

      // Still too far (distance = 6, need <= 5)
      expect(guard2.memory.rumors).toHaveLength(0);

      // Move into sharing range
      guard1.x = 5;
      eventBus.emit('DidMove', {
        entity: guard1,
        position: { x: 5, y: 0 },
        state
      });

      // Now within range (distance = 5)
      expect(guard2.memory.rumors).toHaveLength(1);
      expect(guard2.memory.rumors[0].type).toBe(RumorType.COMBAT);
    });

    it('should not share rumors between hostile NPCs', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        x: 0,
        y: 0
      });

      const bandit = new NPC({
        id: 'bandit',
        factions: ['bandits'],
        x: 3,
        y: 0
      });

      const rumor = createRumor({
        type: RumorType.DISCOVERY,
        severity: RumorSeverity.MAJOR,
        factions: ['banana_guard'],
        position: { x: 50, y: 50 },
        details: 'Secret guard route'
      });
      guard.hearRumor(rumor);

      const state = {
        npcs: [guard, bandit]
      };

      // Move guard next to bandit
      eventBus.emit('DidMove', {
        entity: guard,
        position: { x: 3, y: 0 },
        state
      });

      // Should not share due to hostility
      expect(bandit.memory.rumors).toHaveLength(0);
    });

    it('should respect sharing cooldown between same NPCs', () => {
      const npc1 = new NPC({
        id: 'npc1',
        factions: ['candy_citizens'],
        x: 0,
        y: 0
      });

      const npc2 = new NPC({
        id: 'npc2',
        factions: ['candy_citizens'],
        x: 2,
        y: 0
      });

      // NPC1 gets multiple rumors
      const rumor1 = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['player']
      });
      const rumor2 = createRumor({
        type: RumorType.TRADE,
        severity: RumorSeverity.MINOR,
        factions: ['candy_merchants']
      });

      npc1.hearRumor(rumor1);

      const state = {
        npcs: [npc1, npc2]
      };

      // First movement triggers sharing
      eventBus.emit('DidMove', {
        entity: npc1,
        position: { x: 2, y: 0 },
        state
      });

      expect(npc2.memory.rumors).toHaveLength(1);

      // Add second rumor
      npc1.hearRumor(rumor2);

      // Immediate second movement shouldn't share due to cooldown
      eventBus.emit('DidMove', {
        entity: npc1,
        position: { x: 2, y: 0 },
        state
      });

      // Still only 1 rumor due to cooldown
      expect(npc2.memory.rumors).toHaveLength(1);
    });
  });

  describe('Movement Event Rumor Generation', () => {
    it('should generate combat rumor when movement results in combat', () => {
      const attacker = new NPC({
        id: 'attacker',
        factions: ['bandits'],
        x: 10,
        y: 10
      });

      const witness = new NPC({
        id: 'witness',
        factions: ['candy_citizens'],
        x: 12,
        y: 10
      });

      const state = {
        npcs: [attacker, witness]
      };

      // Movement results in combat
      eventBus.emit('MovementComplete', {
        entity: attacker,
        result: {
          combat: true,
          lethal: false,
          details: 'Bandit attacked a guard'
        },
        state
      });

      // Witness should have learned about combat
      expect(witness.memory.rumors).toHaveLength(1);
      expect(witness.memory.rumors[0].type).toBe(RumorType.COMBAT);
      expect(witness.memory.rumors[0].sentiment).toBeLessThan(0);
    });

    it('should generate discovery rumor for discoveries', () => {
      const explorer = new NPC({
        id: 'explorer',
        factions: ['candy_citizens'],
        x: 30,
        y: 30
      });

      eventBus.emit('DiscoveryMade', {
        discoverer: explorer,
        discovery: {
          details: 'Hidden treasure room',
          importance: RumorSeverity.MAJOR
        },
        position: { x: 30, y: 30 }
      });

      // Explorer should know about their own discovery
      expect(explorer.memory.rumors).toHaveLength(1);
      expect(explorer.memory.rumors[0].type).toBe(RumorType.DISCOVERY);
      expect(explorer.memory.rumors[0].sentiment).toBeGreaterThan(0);
    });

    it('should generate player sighting rumors', () => {
      const citizen1 = new NPC({
        id: 'citizen1',
        factions: ['candy_citizens'],
        x: 5,
        y: 5
      });

      const citizen2 = new NPC({
        id: 'citizen2',
        factions: ['candy_citizens'],
        x: 8,
        y: 5
      });

      const player = {
        type: 'player',
        x: 6,
        y: 5,
        factions: ['player']
      };

      const state = {
        npcs: [citizen1, citizen2]
      };

      // Player movement generates sighting
      eventBus.emit('MovementComplete', {
        entity: player,
        result: {},
        state
      });

      // Both citizens within witness range should have sighting rumor
      expect(citizen1.memory.rumors).toHaveLength(1);
      expect(citizen1.memory.rumors[0].type).toBe(RumorType.SIGHTING);
      expect(citizen1.memory.rumors[0].factions).toContain('player');

      expect(citizen2.memory.rumors).toHaveLength(1);
      expect(citizen2.memory.rumors[0].type).toBe(RumorType.SIGHTING);
    });
  });

  describe('Rumor-Influenced Movement Behaviors', () => {
    it('should make guards investigate critical threat rumors', () => {
      const guard = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        role: 'guard',
        x: 0,
        y: 0
      });

      const threatRumor = createRumor({
        type: RumorType.ASSASSINATION,
        severity: RumorSeverity.CRITICAL,
        factions: ['ice_spies'],
        position: { x: 50, y: 50 },
        details: 'Assassination attempt on the king'
      });

      guard.hearRumor(threatRumor);

      const behavior = bridge.getRumorInfluencedBehavior(guard, {});

      expect(behavior).toBeDefined();
      expect(behavior.action).toBe('investigate');
      expect(behavior.target).toEqual({ x: 50, y: 50 });
      expect(behavior.priority).toBe('high');
    });

    it('should make citizens flee from danger rumors', () => {
      const citizen = new NPC({
        id: 'citizen',
        factions: ['candy_citizens'],
        role: 'citizen',
        x: 10,
        y: 10
      });

      const dangerRumor = createRumor({
        type: RumorType.COMBAT,
        severity: RumorSeverity.CRITICAL,
        factions: ['bandits'],
        position: { x: 15, y: 15 },
        details: 'Major bandit attack'
      });

      citizen.hearRumor(dangerRumor);

      const behavior = bridge.getRumorInfluencedBehavior(citizen, {});

      expect(behavior).toBeDefined();
      expect(behavior.action).toBe('flee');
      expect(behavior.awayFrom).toEqual({ x: 15, y: 15 });
      expect(behavior.priority).toBe('high');
    });

    it('should make merchants seek trade opportunities', () => {
      const merchant = new NPC({
        id: 'merchant',
        factions: ['candy_merchants'],
        role: 'merchant',
        x: 20,
        y: 20
      });

      const tradeRumor = createRumor({
        type: RumorType.TRADE,
        severity: RumorSeverity.MODERATE,
        factions: ['fire_merchants'],
        position: { x: 100, y: 100 },
        details: 'Rare gems discovered for trade',
        sentiment: 0.8
      });

      merchant.hearRumor(tradeRumor);

      const behavior = bridge.getRumorInfluencedBehavior(merchant, {});

      expect(behavior).toBeDefined();
      expect(behavior.action).toBe('travel');
      expect(behavior.target).toEqual({ x: 100, y: 100 });
      expect(behavior.priority).toBe('normal');
    });
  });

  describe('NPC Encounter Events', () => {
    it('should trigger bidirectional rumor sharing on NPC encounter', () => {
      const merchant1 = new NPC({
        id: 'merchant1',
        factions: ['candy_merchants']
      });

      const merchant2 = new NPC({
        id: 'merchant2',
        factions: ['fire_merchants']
      });

      const rumor1 = createRumor({
        type: RumorType.TRADE,
        severity: RumorSeverity.MINOR,
        factions: ['candy_merchants']
      });

      const rumor2 = createRumor({
        type: RumorType.DISCOVERY,
        severity: RumorSeverity.MINOR,
        factions: ['fire_merchants']
      });

      merchant1.hearRumor(rumor1);
      merchant2.hearRumor(rumor2);

      eventBus.emit('NPCEncounter', {
        npc1: merchant1,
        npc2: merchant2,
        state: {}
      });

      // Both should have gained new rumors (may have duplicates due to spread copies)
      expect(merchant1.memory.rumors.length).toBeGreaterThanOrEqual(2);
      expect(merchant2.memory.rumors.length).toBeGreaterThanOrEqual(2);
      
      // Check they have the right types
      const m1Types = merchant1.memory.rumors.map(r => r.type);
      const m2Types = merchant2.memory.rumors.map(r => r.type);
      expect(m1Types).toContain(RumorType.DISCOVERY);
      expect(m2Types).toContain(RumorType.TRADE);
    });
  });

  describe('Combat Event Integration', () => {
    it('should create rumors from combat events with witnesses', () => {
      const combatant1 = new NPC({
        id: 'guard',
        factions: ['banana_guard'],
        x: 20,
        y: 20,
        name: 'Guard Captain'
      });

      const combatant2 = new NPC({
        id: 'bandit',
        factions: ['bandits'],
        x: 20,
        y: 21,
        name: 'Bandit Leader'
      });

      const witness1 = new NPC({
        id: 'witness1',
        factions: ['candy_citizens'],
        x: 22,
        y: 20
      });

      const witness2 = new NPC({
        id: 'witness2',
        factions: ['candy_merchants'],
        x: 18,
        y: 20
      });

      eventBus.emit('CombatStarted', {
        attacker: combatant1,
        defender: combatant2,
        position: { x: 20, y: 20 },
        witnesses: [witness1, witness2]
      });

      // All witnesses should have combat rumor
      expect(witness1.memory.rumors).toHaveLength(1);
      expect(witness1.memory.rumors[0].type).toBe(RumorType.COMBAT);
      expect(witness1.memory.rumors[0].details).toContain('Guard Captain');

      expect(witness2.memory.rumors).toHaveLength(1);
      expect(witness2.memory.rumors[0].type).toBe(RumorType.COMBAT);
    });
  });

  describe('Distance Calculations', () => {
    it('should correctly calculate distances for rumor sharing', () => {
      const npc1 = { x: 0, y: 0 };
      const npc2 = { x: 3, y: 4 };
      
      const distance = bridge.calculateDistance(npc1, npc2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should only share within configured distance', () => {
      const speaker = new NPC({
        id: 'speaker',
        factions: ['candy_citizens'],
        x: 0,
        y: 0
      });

      const nearListener = new NPC({
        id: 'near',
        factions: ['candy_citizens'],
        x: 4,
        y: 0  // Distance = 4, within range
      });

      const farListener = new NPC({
        id: 'far',
        factions: ['candy_citizens'],
        x: 6,
        y: 0  // Distance = 6, out of range
      });

      const rumor = createRumor({
        type: RumorType.SIGHTING,
        severity: RumorSeverity.MINOR,
        factions: ['player']
      });

      speaker.hearRumor(rumor);

      const state = {
        npcs: [speaker, nearListener, farListener]
      };

      eventBus.emit('DidMove', {
        entity: speaker,
        position: { x: 0, y: 0 },
        state
      });

      // Near listener should get rumor
      expect(nearListener.memory.rumors).toHaveLength(1);
      
      // Far listener should not
      expect(farListener.memory.rumors).toHaveLength(0);
    });
  });
});