import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/js/systems/EventBus.js';
import { NPC } from '../../src/social/npc.js';
import { Schedule, TimeOfDay, DutyType } from '../../src/social/schedule.js';

describe('SocialEncounterSystem', () => {
  let eventBus;
  let encounterSystem;
  let SocialEncounterSystem;
  
  beforeEach(async () => {
    eventBus = new EventBus();
    // We'll import after the file exists
    const module = await import('../../src/social/integration/SocialEncounterSystem.js');
    SocialEncounterSystem = module.SocialEncounterSystem;
    encounterSystem = new SocialEncounterSystem(eventBus);
  });
  
  describe('Construction and Setup', () => {
    it('should create instance with event bus', () => {
      expect(encounterSystem).toBeDefined();
      expect(encounterSystem.eventBus).toBe(eventBus);
    });
    
    it('should have an action registry', () => {
      expect(encounterSystem.registry).toBeDefined();
    });
    
    it('should listen for NPCInteraction events', () => {
      const player = { name: 'Finn', x: 5, y: 5 };
      const npc = new NPC({
        id: 'test_npc',
        name: 'Test NPC',
        factions: ['candy_citizens']
      });
      
      const handleSpy = vi.spyOn(encounterSystem, 'handleEncounter');
      
      eventBus.emit('NPCInteraction', {
        player,
        npc,
        context: { state: {} }
      });
      
      expect(handleSpy).toHaveBeenCalledWith(player, npc, expect.any(Object));
    });
  });
  
  describe('Building Social Context', () => {
    it('should build basic social context from player and NPC', () => {
      const player = {
        name: 'Finn',
        x: 5,
        y: 5,
        factions: ['player'],
        role: 'adventurer'
      };
      
      const npc = new NPC({
        id: 'merchant1',
        name: 'Merchant Mike',
        role: 'merchant',
        factions: ['candy_merchants']
      });
      
      const context = {
        state: {
          kingdom: 'candy',
          lawLevel: 0.8,
          gameTime: { hour: 14 }
        }
      };
      
      const socialContext = encounterSystem.buildSocialContext(player, npc, context);
      
      expect(socialContext).toMatchObject({
        actor: player,
        target: npc,
        kingdomId: 'candy',
        lawLevel: 0.8,
        npcRole: 'merchant',
        playerRole: 'adventurer'
      });
    });
    
    it('should extract kingdom context from chunk data', () => {
      const player = { name: 'Finn' };
      const npc = new NPC({ id: 'test', factions: ['ice_nobles'] });
      
      const context = {
        state: {
          chunk: {
            kingdomId: 'ice',
            lawLevel: 0.9
          }
        }
      };
      
      const socialContext = encounterSystem.buildSocialContext(player, npc, context);
      
      expect(socialContext.kingdomId).toBe('ice');
      expect(socialContext.lawLevel).toBe(0.9);
    });
    
    it('should handle disguised player', () => {
      const player = {
        name: 'Finn',
        disguise: {
          keys: ['candy_guard'],
          quality: 0.8
        }
      };
      
      const npc = new NPC({ id: 'test', factions: ['candy_citizens'] });
      
      const socialContext = encounterSystem.buildSocialContext(player, npc, {});
      
      expect(socialContext.visibleFaction).toBe('candy_guard');
      expect(socialContext.playerDisguise).toBe(player.disguise);
    });
    
    it('should include time and duty context', () => {
      const player = { name: 'Finn' };
      
      const npc = new NPC({
        id: 'guard1',
        role: 'guard',
        factions: ['candy_guards']
      });
      
      npc.schedule = new Schedule({
        [TimeOfDay.MORNING]: DutyType.PATROL,
        [TimeOfDay.AFTERNOON]: DutyType.GUARD_POST,
        [TimeOfDay.EVENING]: DutyType.REST,
        [TimeOfDay.NIGHT]: DutyType.SLEEP
      });
      
      const context = {
        state: {
          gameTime: { hour: 8 } // Morning
        }
      };
      
      const socialContext = encounterSystem.buildSocialContext(player, npc, context);
      
      expect(socialContext.timeOfDay).toBe(TimeOfDay.MORNING);
      expect(socialContext.currentDuty).toBe(DutyType.PATROL);
    });
    
    it('should include relationship values if available', () => {
      const player = { name: 'Finn' };
      
      const npc = new NPC({ id: 'test', factions: ['candy_citizens'] });
      npc.social = {
        trust: 0.7,
        fear: 0.1,
        respect: 0.5
      };
      
      const socialContext = encounterSystem.buildSocialContext(player, npc, {});
      
      expect(socialContext.trust).toBe(0.7);
      expect(socialContext.fear).toBe(0.1);
      expect(socialContext.respect).toBe(0.5);
    });
  });
  
  describe('Handling Encounters', () => {
    it('should emit social menu event when actions are available', () => {
      const player = { name: 'Finn' };
      const npc = new NPC({
        id: 'merchant1',
        role: 'merchant',
        factions: ['candy_merchants']
      });
      
      // Mock the registry to return some actions
      encounterSystem.registry.getAvailable = vi.fn().mockReturnValue([
        { id: 'talk', name: 'Talk' },
        { id: 'trade', name: 'Trade' }
      ]);
      
      let menuData = null;
      eventBus.on('social:menu:open', (data) => {
        menuData = data;
      });
      
      encounterSystem.handleEncounter(player, npc, { state: {} });
      
      expect(menuData).toBeDefined();
      expect(menuData.npc).toBe(npc);
      expect(menuData.actions).toHaveLength(2);
      expect(menuData.actions[0].id).toBe('talk');
    });
    
    it('should not emit menu event when no actions available', () => {
      const player = { name: 'Finn' };
      const npc = new NPC({ id: 'test', factions: ['dungeon_bandits'] });
      
      // Mock registry to return no actions
      encounterSystem.registry.getAvailable = vi.fn().mockReturnValue([]);
      
      let menuEmitted = false;
      eventBus.on('social:menu:open', () => {
        menuEmitted = true;
      });
      
      encounterSystem.handleEncounter(player, npc, { state: {} });
      
      expect(menuEmitted).toBe(false);
    });
    
    it('should pass correct context to action registry', () => {
      const player = {
        name: 'Finn',
        disguise: { keys: ['candy_guard'] }
      };
      
      const npc = new NPC({
        id: 'citizen1',
        role: 'citizen',
        factions: ['candy_citizens']
      });
      
      const getAvailableSpy = vi.spyOn(encounterSystem.registry, 'getAvailable');
      
      encounterSystem.handleEncounter(player, npc, {
        state: {
          kingdom: 'candy',
          lawLevel: 0.8
        }
      });
      
      expect(getAvailableSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: player,
          target: npc,
          kingdomId: 'candy',
          lawLevel: 0.8,
          visibleFaction: 'candy_guard'
        })
      );
    });
  });
  
  describe('Hostile NPC Detection', () => {
    it('should detect explicitly hostile NPCs', () => {
      const player = { name: 'Finn' };
      const npc = new NPC({
        id: 'bandit1',
        factions: ['dungeon_bandits']
      });
      npc.attitude = 'hostile';
      
      const isHostile = encounterSystem.isNPCHostile(npc, player, {});
      
      expect(isHostile).toBe(true);
    });
    
    it('should use faction evaluation for hostility', () => {
      const player = { factions: ['player'] };
      const npc = new NPC({
        id: 'guard1',
        factions: ['candy_guards']
      });
      
      // Mock the evaluation method
      npc.evaluateHostilityTo = vi.fn().mockReturnValue({
        hostile: true,
        reason: 'faction_enemy'
      });
      
      const isHostile = encounterSystem.isNPCHostile(npc, player, {
        lawLevel: 0.8,
        kingdomId: 'candy'
      });
      
      expect(isHostile).toBe(true);
      expect(npc.evaluateHostilityTo).toHaveBeenCalledWith(player, {
        lawLevel: 0.8,
        kingdomId: 'candy'
      });
    });
    
    it('should return false for friendly NPCs', () => {
      const player = { factions: ['candy_citizens'] };
      const npc = new NPC({
        id: 'merchant1',
        factions: ['candy_merchants']
      });
      
      npc.evaluateHostilityTo = vi.fn().mockReturnValue({
        hostile: false,
        reason: 'faction_ally'
      });
      
      const isHostile = encounterSystem.isNPCHostile(npc, player, {});
      
      expect(isHostile).toBe(false);
    });
  });
  
  describe('Integration with MovementPipeline', () => {
    it('should handle NPCInteraction event from pipeline', () => {
      const player = { name: 'Finn', x: 5, y: 5 };
      const npc = new NPC({
        id: 'test',
        name: 'Test NPC',
        factions: ['candy_citizens'],
        x: 6,
        y: 5
      });
      
      let menuData = null;
      eventBus.on('social:menu:open', (data) => {
        menuData = data;
      });
      
      // Mock registry to return actions
      encounterSystem.registry.getAvailable = vi.fn().mockReturnValue([
        { id: 'talk', name: 'Talk' }
      ]);
      
      // Simulate NPCInteraction event from MovementPipeline
      eventBus.emit('NPCInteraction', {
        player,
        npc,
        context: {
          state: {
            kingdom: 'candy',
            lawLevel: 0.8,
            chunk: { kingdomId: 'candy' }
          }
        }
      });
      
      expect(menuData).toBeDefined();
      expect(menuData.npc).toBe(npc);
    });
  });
});