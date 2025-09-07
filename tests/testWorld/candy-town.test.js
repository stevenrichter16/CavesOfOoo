/**
 * Test World: Candy Kingdom Town Square
 * Testing NPC + Social System + Movement Pipeline Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Candy Kingdom Test World', () => {
  let testWorld;
  let bob, sally, tim;
  let player;

  describe('World Setup', () => {
    it('should create a test world with town square', () => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      
      expect(testWorld).toBeDefined();
      expect(testWorld.width).toBe(20);
      expect(testWorld.height).toBe(20);
      expect(testWorld.name).toBe('Candy Kingdom Town Square');
    });

    it('should have proper terrain layout', () => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      
      // Check for paths (walkable)
      expect(testWorld.isWalkable(10, 10)).toBe(true); // Town center
      expect(testWorld.isWalkable(5, 10)).toBe(true);  // West path
      expect(testWorld.isWalkable(15, 10)).toBe(true); // East path
      
      // Check for buildings (not walkable)
      expect(testWorld.isWalkable(0, 0)).toBe(false);   // Corner building
      expect(testWorld.isWalkable(19, 0)).toBe(false);  // Corner building
    });
  });

  describe('NPC Creation and Placement', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
    });

    it('should create Guard Bob at the gate', () => {
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      
      expect(bob).toBeDefined();
      expect(bob.name).toBe('Guard Bob');
      expect(bob.role).toBe('guard');
      expect(bob.factions).toContain('banana_guard');
      expect(bob.x).toBe(10);
      expect(bob.y).toBe(5); // North gate position
      expect(bob.perception).toBe(0.7); // Guards have higher perception
    });

    it('should create Merchant Sally at her shop', () => {
      sally = testWorld.npcs.find(npc => npc.id === 'merchant-sally');
      
      expect(sally).toBeDefined();
      expect(sally.name).toBe('Merchant Sally');
      expect(sally.role).toBe('merchant');
      expect(sally.factions).toContain('candy_merchants');
      expect(sally.x).toBe(15);
      expect(sally.y).toBe(10); // Shop on east side
      expect(sally.memory.maxRumors).toBeGreaterThanOrEqual(10);
    });

    it('should create Citizen Tim wandering the square', () => {
      tim = testWorld.npcs.find(npc => npc.id === 'citizen-tim');
      
      expect(tim).toBeDefined();
      expect(tim.name).toBe('Citizen Tim');
      expect(tim.role).toBe('citizen');
      expect(tim.factions).toContain('candy_citizens');
      expect(tim.x).toBe(8);
      expect(tim.y).toBe(12); // South part of square
    });

    it('should have NPCs with proper movement capabilities', () => {
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      
      expect(bob.movementType).toBe('patrol');
      expect(bob.patrolRoute).toEqual([
        { x: 10, y: 5 },  // Gate
        { x: 8, y: 7 },   // West patrol
        { x: 12, y: 7 },  // East patrol
        { x: 10, y: 5 }   // Back to gate
      ]);
    });
  });

  describe('Player Setup', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      player = testWorld.player;
    });

    it('should create player at spawn point', () => {
      expect(player).toBeDefined();
      expect(player.x).toBe(10);
      expect(player.y).toBe(15); // South entrance
      expect(player.factions).toContain('player');
    });

    it('should have movement capabilities', () => {
      const initialX = player.x;
      testWorld.movePlayer(0, -1); // Move north
      
      expect(player.y).toBe(14);
      expect(player.x).toBe(initialX);
    });
  });

  describe('Rumor System Integration', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      sally = testWorld.npcs.find(npc => npc.id === 'merchant-sally');
      tim = testWorld.npcs.find(npc => npc.id === 'citizen-tim');
    });

    it('should allow NPCs to share rumors when nearby', () => {
      // Create a test rumor
      const rumor = testWorld.createRumor({
        type: 'combat',
        severity: 'moderate',
        details: 'Bandits spotted near the east gate!',
        position: { x: 15, y: 5 }
      });

      // Give rumor to Bob
      bob.hearRumor(rumor);
      expect(bob.memory.rumors).toHaveLength(1);

      // Move Tim near Bob (within 5 units for sharing)
      testWorld.moveNPC(tim, 10, 7);
      
      // Trigger rumor sharing
      testWorld.processRumorSharing();
      
      // Tim should now have the rumor
      expect(tim.memory.rumors).toHaveLength(1);
      expect(tim.memory.rumors[0].id).toBe(rumor.id);
      expect(tim.memory.rumors[0].accuracy).toBeLessThan(1.0);
    });

    it('should prioritize trade rumors for merchants', () => {
      const tradeRumor = testWorld.createRumor({
        type: 'trade',
        severity: 'minor',
        details: 'Candy prices rising in Fire Kingdom!',
        position: { x: 10, y: 10 }
      });

      const combatRumor = testWorld.createRumor({
        type: 'combat',
        severity: 'minor',
        details: 'Small scuffle at the gate',
        position: { x: 10, y: 5 }
      });

      sally.hearRumor(tradeRumor);
      sally.hearRumor(combatRumor);

      // Sally should remember trade rumor with higher priority
      const tradePriority = sally.memory.rumors.find(r => r.type === 'trade');
      expect(tradePriority).toBeDefined();
    });

    it('should affect NPC relationships based on rumors', () => {
      const banditRumor = testWorld.createRumor({
        type: 'combat',
        severity: 'major',
        details: 'Bandits attacked a merchant!',
        factions: ['bandits'],
        sentiment: -0.8
      });

      const initialRelation = bob.getRelationTo(testWorld.getFaction('bandits'));
      bob.hearRumor(banditRumor);
      const newRelation = bob.getRelationTo(testWorld.getFaction('bandits'));

      expect(newRelation).toBeLessThan(initialRelation);
    });
  });

  describe('Player-NPC Interactions', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      player = testWorld.player;
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      sally = testWorld.npcs.find(npc => npc.id === 'merchant-sally');
    });

    it('should trigger dialogue when player interacts with NPC', () => {
      // Move player next to Sally
      testWorld.movePlayerTo(14, 10);
      
      const interaction = testWorld.interactWithNPC(sally);
      
      expect(interaction).toBeDefined();
      expect(interaction.type).toBe('dialogue');
      expect(interaction.npc).toBe(sally);
      expect(interaction.dialogue).toContain('Looking to trade?');
    });

    it('should have hostile reaction when player attacks guard', () => {
      // Player attacks Bob
      const attackResult = testWorld.playerAttackNPC(bob);
      
      expect(attackResult.combat).toBe(true);
      expect(bob.getRelationTo(player)).toBeLessThan(0);
      
      // Other guards should also become hostile
      const otherGuards = testWorld.npcs.filter(
        npc => npc.factions.includes('banana_guard') && npc.id !== 'guard-bob'
      );
      
      if (otherGuards.length > 0) {
        expect(otherGuards[0].getRelationTo(player)).toBeLessThan(0);
      }
    });

    it('should generate rumors from player actions', () => {
      // Player steals from merchant
      const stealResult = testWorld.playerStealFrom(sally);
      
      expect(stealResult.success).toBeDefined();
      
      // Should generate a theft rumor
      testWorld.update(); // Process events
      
      // Sally should have a rumor about the theft
      const theftRumor = sally.memory.rumors.find(r => r.type === 'theft');
      expect(theftRumor).toBeDefined();
      expect(theftRumor.factions).toContain('player');
    });
  });

  describe('Movement Pipeline Integration', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      player = testWorld.player;
    });

    it('should use Movement Pipeline for player movement', async () => {
      const initialPosition = { x: player.x, y: player.y };
      
      // Try to move north
      const moveResult = await testWorld.executePlayerMove(0, -1);
      
      expect(moveResult.success).toBe(true);
      expect(player.y).toBe(initialPosition.y - 1);
    });

    it('should prevent movement into walls', async () => {
      // Move player to corner
      testWorld.movePlayerTo(1, 1);
      
      // Try to move into wall (0, 1)
      const moveResult = await testWorld.executePlayerMove(-1, 0);
      
      expect(moveResult.success).toBe(false);
      expect(moveResult.reason).toContain('blocked');
      expect(player.x).toBe(1); // Should not have moved
    });

    it('should trigger combat when moving into hostile NPC', async () => {
      // Make Bob hostile to player
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      testWorld.makeFactionHostile('banana_guard', 'player');
      
      // Move player next to Bob
      testWorld.movePlayerTo(10, 6);
      
      // Try to move into Bob's position
      const moveResult = await testWorld.executePlayerMove(0, -1);
      
      expect(moveResult.combat).toBe(true);
      expect(moveResult.attacked).toBe(true);
    });
  });

  describe('Dialogue System', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      sally = testWorld.npcs.find(npc => npc.id === 'merchant-sally');
      tim = testWorld.npcs.find(npc => npc.id === 'citizen-tim');
    });

    it('should have role-specific dialogue', () => {
      const bobDialogue = bob.getDialogue(player);
      expect(bobDialogue).toMatch(/peace|guard|watch/i);

      const sallyDialogue = sally.getDialogue(player);
      expect(sallyDialogue).toMatch(/trade|goods|shop/i);

      const timDialogue = tim.getDialogue(player);
      expect(timDialogue).toMatch(/town|nice day|hello/i);
    });

    it('should change dialogue based on rumors', () => {
      const combatRumor = testWorld.createRumor({
        type: 'combat',
        severity: 'major',
        details: 'Bandits attacking merchants!'
      });

      bob.hearRumor(combatRumor);
      const alertDialogue = bob.getDialogue(player);
      
      expect(alertDialogue).toMatch(/trouble|danger|careful/i);
    });

    it('should have hostile dialogue when relation is negative', () => {
      // Make Bob hostile to player
      bob.adjustRelationTo(player, -0.8);
      
      const hostileDialogue = bob.getDialogue(player);
      expect(hostileDialogue).toMatch(/not welcome|leave|get out/i);
    });
  });

  describe('Test Scenarios', () => {
    beforeEach(() => {
      const { CandyTestWorld } = require('../../src/testWorld/CandyTestWorld.js');
      testWorld = new CandyTestWorld();
    });

    it('Scenario 1: Rumor spreads through town', () => {
      // Create urgent rumor at gate
      const rumor = testWorld.createRumor({
        type: 'assassination',
        severity: 'critical',
        details: 'The Candy King has been attacked!',
        position: { x: 10, y: 5 }
      });

      // Bob hears it first
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      bob.hearRumor(rumor);

      // Simulate time passing and NPCs moving
      for (let i = 0; i < 10; i++) {
        testWorld.update();
        testWorld.processRumorSharing();
      }

      // Check that rumor has spread
      const npcsWithRumor = testWorld.npcs.filter(
        npc => npc.memory.rumors.some(r => r.id === rumor.id)
      );

      expect(npcsWithRumor.length).toBeGreaterThan(1);
    });

    it('Scenario 2: Player builds reputation through actions', () => {
      sally = testWorld.npcs.find(npc => npc.id === 'merchant-sally');
      
      // Help Sally (positive action)
      testWorld.playerHelpNPC(sally);
      expect(sally.getRelationTo(player)).toBeGreaterThan(0);

      // This should spread to other merchants
      const otherMerchants = testWorld.npcs.filter(
        npc => npc.factions.includes('candy_merchants') && npc.id !== sally.id
      );

      if (otherMerchants.length > 0) {
        expect(otherMerchants[0].getRelationTo(player)).toBeGreaterThan(0);
      }
    });

    it('Scenario 3: Guards respond to crimes', () => {
      tim = testWorld.npcs.find(npc => npc.id === 'citizen-tim');
      bob = testWorld.npcs.find(npc => npc.id === 'guard-bob');
      
      // Player attacks citizen
      testWorld.playerAttackNPC(tim);
      
      // Generate crime rumor
      const crimeRumor = testWorld.createRumor({
        type: 'combat',
        severity: 'major',
        details: 'Someone attacked Tim!',
        factions: ['player'],
        sentiment: -0.9
      });
      
      bob.hearRumor(crimeRumor);
      
      // Bob should now be hostile to player
      expect(bob.evaluateHostilityTo(player).hostile).toBe(true);
    });
  });
});