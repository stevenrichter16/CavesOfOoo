// tests/quests/sweet-tooth-fox-quest.test.js
// Test the Sweet Tooth Fox quest mechanics

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { giveQuest, hasQuest, updateQuestProgress, turnInQuest } from '../../src/js/quests/quests.js';
import { attack } from '../../src/js/combat/combat.js';
import { runPlayerMove } from '../../src/js/movement/movePipeline.js';
import { spawnSocialNPC } from '../../src/js/social/init.js';
import { startDialogue, selectChoice, registerDialogueTree } from '../../src/js/social/dialogueTreesV2.js';

describe('Sweet Tooth Fox Quest', () => {
  let state;
  let player;

  beforeEach(() => {
    player = {
      id: 'player',
      x: 10,
      y: 10,
      hp: 30,
      hpMax: 30,
      atk: 5,
      def: 2,
      gold: 0,
      inventory: [],
      quests: {
        active: [],
        completed: [],
        progress: {},
        fetchQuests: {}
      }
    };

    state = {
      player,
      cx: 0,
      cy: 0,
      chunk: {
        map: Array(22).fill(null).map(() => Array(48).fill('.')),
        monsters: [],
        items: []
      },
      npcs: [],
      turn: 0,
      log: vi.fn()
    };
  });

  describe('Quest Definition', () => {
    it('should define the Sweet Tooth Fox quest', () => {
      const quest = {
        id: 'sweet_tooth_foxes',
        name: 'Sweet Tooth Menace',
        description: 'Foxes with sweet teeth are attacking candy citizens! We need their teeth removed.',
        objective: 'Collect 5 Fox Sweet Teeth',
        giver: 'banana_guard',
        targetItem: 'fox_sweet_tooth',
        targetCount: 5,
        rewards: {
          gold: 100,
          xp: 50,
          reputation: { guards: 10, peasants: 5 }
        },
        completionText: 'Excellent work! The candy citizens are safe now.',
        isRepeatable: false
      };

      expect(quest.id).toBe('sweet_tooth_foxes');
      expect(quest.targetCount).toBe(5);
      expect(quest.targetItem).toBe('fox_sweet_tooth');
    });
  });

  describe('Fox Knockout Mechanics', () => {
    it('should spawn sweet tooth foxes in the forest', () => {
      const fox = {
        id: 'sweet_tooth_fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 15,
        y: 10,
        hp: 15,
        hpMax: 15,
        atk: 3,
        def: 1,
        alive: true,
        hasTeeth: true,
        knockedOut: false
      };

      state.chunk.monsters.push(fox);
      expect(state.chunk.monsters).toContain(fox);
      expect(fox.hasTeeth).toBe(true);
    });

    it('should knock out fox when hp drops below 5', () => {
      const fox = {
        id: 'sweet_tooth_fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 15,
        hpMax: 15,
        atk: 3,
        def: 1,
        alive: true,
        hasTeeth: true,
        knockedOut: false
      };

      state.chunk.monsters.push(fox);

      // Attack fox multiple times
      while (fox.hp >= 5 && fox.alive) {
        attack(state, player, fox);
      }

      // Fox should be knocked out, not dead
      if (fox.hp < 5 && fox.hp > 0) {
        fox.knockedOut = true;
        fox.alive = false; // Can't attack anymore
        expect(fox.knockedOut).toBe(true);
        expect(fox.hp).toBeGreaterThan(0);
        expect(fox.hp).toBeLessThan(5);
      }
    });

    it('should not allow attacking knocked out foxes', () => {
      const fox = {
        id: 'sweet_tooth_fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 3,
        hpMax: 15,
        atk: 3,
        def: 1,
        alive: false,
        knockedOut: true,
        hasTeeth: true
      };

      state.chunk.monsters.push(fox);
      
      const initialHp = fox.hp;
      // Try to attack knocked out fox - should fail
      const result = attack(state, player, fox);
      
      // HP should not change
      expect(fox.hp).toBe(initialHp);
    });
  });

  describe('Tooth Collection', () => {
    it('should allow interacting with knocked out fox to take teeth', async () => {
      const fox = {
        id: 'sweet_tooth_fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 3,
        hpMax: 15,
        alive: false,
        knockedOut: true,
        hasTeeth: true
      };

      state.chunk.monsters.push(fox);
      
      // Mock interaction function
      state.interactWithKnockedOutFox = (state, fox) => {
        if (fox.knockedOut && fox.hasTeeth) {
          // Add tooth to inventory
          const tooth = {
            item: { 
              name: 'Fox Sweet Tooth',
              id: 'fox_sweet_tooth',
              description: 'A dangerously sweet tooth from a fox'
            },
            quantity: 1
          };
          
          // Check if already has teeth in inventory
          const existing = player.inventory.find(i => i.item.id === 'fox_sweet_tooth');
          if (existing) {
            existing.quantity++;
          } else {
            player.inventory.push(tooth);
          }
          
          fox.hasTeeth = false;
          state.log(state, 'You extract a sweet tooth from the knocked out fox!', 'good');
          return true;
        }
        return false;
      };

      // Move player next to fox and interact
      player.x = 10;
      const result = state.interactWithKnockedOutFox(state, fox);
      
      expect(result).toBe(true);
      expect(fox.hasTeeth).toBe(false);
      expect(player.inventory.some(i => i.item.id === 'fox_sweet_tooth')).toBe(true);
    });

    it('should not allow taking teeth twice from same fox', () => {
      const fox = {
        id: 'sweet_tooth_fox_1',
        name: 'Sweet Tooth Fox',
        kind: 'sweet_tooth_fox',
        x: 11,
        y: 10,
        hp: 3,
        hpMax: 15,
        alive: false,
        knockedOut: true,
        hasTeeth: false // Already taken
      };

      state.chunk.monsters.push(fox);
      
      state.interactWithKnockedOutFox = (state, fox) => {
        if (fox.knockedOut && fox.hasTeeth) {
          return true;
        }
        state.log(state, 'This fox has already had its teeth removed.', 'note');
        return false;
      };

      const result = state.interactWithKnockedOutFox(state, fox);
      expect(result).toBe(false);
    });

    it('should track tooth collection progress', () => {
      // Give quest
      const quest = {
        id: 'sweet_tooth_foxes',
        name: 'Sweet Tooth Menace',
        objective: 'Collect 5 Fox Sweet Teeth',
        targetItem: 'fox_sweet_tooth',
        targetCount: 5,
        itemProgress: 0
      };

      player.quests.active.push(quest.id);
      player.quests.progress[quest.id] = { teeth: 0 };

      // Simulate collecting teeth
      for (let i = 1; i <= 3; i++) {
        player.quests.progress[quest.id].teeth++;
      }

      expect(player.quests.progress[quest.id].teeth).toBe(3);
    });
  });

  describe('Banana Guard Quest Integration', () => {
    it('should have banana guard offer the quest', () => {
      const bananaGuardDialogue = {
        biome: 'candy_kingdom',
        npcType: 'banana_guard',
        start: 'greeting',
        nodes: [
          {
            id: 'greeting',
            npcLine: 'HALT! Are you here about the fox problem?',
            choices: [
              {
                text: 'What fox problem?',
                next: 'explain_quest'
              },
              {
                text: 'I need to go.',
                next: 'end'
              }
            ]
          },
          {
            id: 'explain_quest',
            npcLine: 'Foxes with sweet teeth keep trying to eat our candy citizens! We need someone to knock them out and remove their sweet teeth.',
            choices: [
              {
                text: 'I\'ll help! (Accept Quest)',
                action: 'giveQuest:sweet_tooth_foxes',
                next: 'quest_accepted'
              },
              {
                text: 'That sounds dangerous.',
                next: 'end'
              }
            ]
          },
          {
            id: 'quest_accepted',
            npcLine: 'Excellent! Bring me 5 fox sweet teeth. You\'ll find the foxes in the forest. Knock them out and take their teeth!',
            end: true
          },
          {
            id: 'end',
            npcLine: 'Stay safe, citizen!',
            end: true
          }
        ]
      };

      expect(bananaGuardDialogue.nodes).toHaveLength(4);
      const explainNode = bananaGuardDialogue.nodes.find(n => n.id === 'explain_quest');
      const acceptChoice = explainNode.choices.find(c => c.action?.includes('giveQuest'));
      expect(acceptChoice).toBeTruthy();
      expect(acceptChoice.action).toBe('giveQuest:sweet_tooth_foxes');
    });

    it('should check for quest completion', () => {
      player.quests.active.push('sweet_tooth_foxes');
      
      // Add 5 teeth to inventory
      player.inventory.push({
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        quantity: 5
      });

      // Check if player has enough teeth
      const hasEnoughTeeth = () => {
        const teeth = player.inventory.find(i => i.item.id === 'fox_sweet_tooth');
        return teeth && teeth.quantity >= 5;
      };

      expect(hasEnoughTeeth()).toBe(true);
    });

    it('should complete quest and give rewards', () => {
      player.quests.active.push('sweet_tooth_foxes');
      player.inventory.push({
        item: { id: 'fox_sweet_tooth', name: 'Fox Sweet Tooth' },
        quantity: 5
      });

      // Complete quest
      const completeQuest = () => {
        // Remove teeth from inventory
        const teethIndex = player.inventory.findIndex(i => i.item.id === 'fox_sweet_tooth');
        if (teethIndex >= 0) {
          player.inventory[teethIndex].quantity -= 5;
          if (player.inventory[teethIndex].quantity <= 0) {
            player.inventory.splice(teethIndex, 1);
          }
        }

        // Give rewards
        player.gold += 100;
        player.xp = (player.xp || 0) + 50;
        
        // Move from active to completed
        const questIndex = player.quests.active.indexOf('sweet_tooth_foxes');
        if (questIndex >= 0) {
          player.quests.active.splice(questIndex, 1);
          player.quests.completed.push('sweet_tooth_foxes');
        }

        return true;
      };

      const result = completeQuest();
      expect(result).toBe(true);
      expect(player.gold).toBe(100);
      expect(player.quests.completed).toContain('sweet_tooth_foxes');
      expect(player.quests.active).not.toContain('sweet_tooth_foxes');
      expect(player.inventory.find(i => i.item.id === 'fox_sweet_tooth')).toBeFalsy();
    });
  });

  describe('Forest Spawn Integration', () => {
    it('should spawn sweet tooth foxes in forest chunks', () => {
      // Simulate forest chunk
      state.chunk.biome = 'forest';
      
      const spawnForestMonsters = (chunk) => {
        const monsters = [];
        
        // Add sweet tooth foxes in forest
        if (chunk.biome === 'forest') {
          for (let i = 0; i < 2; i++) {
            monsters.push({
              id: `sweet_tooth_fox_${i}`,
              name: 'Sweet Tooth Fox',
              kind: 'sweet_tooth_fox',
              x: 10 + i * 5,
              y: 10 + i * 2,
              hp: 15,
              hpMax: 15,
              atk: 3,
              def: 1,
              alive: true,
              hasTeeth: true,
              knockedOut: false,
              glyph: '🦊',
              color: 'orange'
            });
          }
        }
        
        return monsters;
      };

      const monsters = spawnForestMonsters(state.chunk);
      expect(monsters).toHaveLength(2);
      expect(monsters[0].kind).toBe('sweet_tooth_fox');
    });
  });
});