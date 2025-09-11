/**
 * Quest Generator for Adventure Time themed quests
 */

import { QuestObjective, QuestState, QuestDifficulty } from './constants.js';

// Chunk dimensions constants
const CHUNK_WIDTH = 24;
const CHUNK_HEIGHT = 22;

export class QuestGenerator {
  constructor(chunkSystem) {
    this.chunkSystem = chunkSystem;
    this.questIdCounter = 0;
    this.templates = this.initializeTemplates();
  }
  
  /**
   * Generate a quest based on parameters
   */
  generateQuest(params = {}) {
    const questId = `quest_${++this.questIdCounter}`;
    const biome = params.biome || 'grasslands';
    const playerLevel = params.playerLevel || 1;
    const type = params.type || 'standard';
    
    const quest = {
      id: questId,
      biome: biome,
      state: QuestState.AVAILABLE,
      title: this.generateTitle(biome, type),
      description: this.generateDescription(biome, type),
      objectives: [],
      rewards: this.generateRewards(playerLevel, biome),
      level: playerLevel,
      type: type
    };
    
    // Handle multi-stage quests
    if (type === 'multi_stage') {
      const stages = params.stages || 3;
      quest.stages = [];
      quest.currentStage = 0;
      
      for (let i = 0; i < stages; i++) {
        quest.stages.push({
          objectives: [this.generateObjective({ biome })],
          description: `Stage ${i + 1}: ${this.generateStageDescription(biome, i)}`
        });
      }
    } else {
      // Generate objectives based on theme
      const theme = params.theme || 'standard';
      const objectiveCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < objectiveCount; i++) {
        quest.objectives.push(this.generateObjective({ 
          biome, 
          theme,
          type: this.selectObjectiveType(biome, theme)
        }));
      }
    }
    
    // Add target chunk for location-based quests
    if (quest.objectives.some(o => o.location)) {
      quest.targetChunk = quest.objectives[0].location || { 
        cx: Math.floor(Math.random() * 20) - 10,
        cy: Math.floor(Math.random() * 20) - 10
      };
    } else if (type === 'fetch' || quest.objectives.length > 0) {
      // Always set a target chunk for fetch quests or any quest with objectives
      quest.targetChunk = {
        cx: Math.floor(Math.random() * 20) - 10,
        cy: Math.floor(Math.random() * 20) - 10
      };
    }
    
    return quest;
  }
  
  /**
   * Generate a quest objective
   */
  generateObjective(params = {}) {
    const type = params.type || QuestObjective.COLLECT;
    const biome = params.biome || 'grasslands';
    
    const objective = {
      id: `obj_${++this.questIdCounter}`,
      type: type,
      completed: false
    };
    
    switch(type) {
      case QuestObjective.COLLECT:
        objective.target = this.getCollectTarget(biome);
        objective.count = Math.floor(Math.random() * 5) + 3;
        objective.progress = 0;
        objective.description = `Collect ${objective.count} ${objective.target}`;
        break;
        
      case QuestObjective.DEFEAT:
        objective.enemyType = this.getEnemyType(biome);
        objective.count = Math.floor(Math.random() * 5) + 3;
        objective.progress = 0;
        objective.description = `Defeat ${objective.count} ${objective.enemyType}s`;
        break;
        
      case QuestObjective.EXPLORE:
        objective.location = {
          cx: Math.floor(Math.random() * 20) - 10,
          cy: Math.floor(Math.random() * 20) - 10,
          x: Math.floor(Math.random() * CHUNK_WIDTH),
          y: Math.floor(Math.random() * CHUNK_HEIGHT)
        };
        objective.discovered = false;
        objective.description = `Explore the location at (${objective.location.cx}, ${objective.location.cy})`;
        break;
        
      case QuestObjective.DELIVER:
        objective.item = this.getDeliveryItem(biome);
        objective.recipient = this.getRecipient(biome);
        objective.recipientLocation = {
          cx: Math.floor(Math.random() * 10),
          cy: Math.floor(Math.random() * 10)
        };
        objective.description = `Deliver ${objective.item} to ${objective.recipient}`;
        break;
        
      case QuestObjective.ESCORT:
        objective.npcId = `npc_${Math.floor(Math.random() * 1000)}`;
        objective.startLocation = {
          cx: 0,
          cy: 0
        };
        objective.destination = {
          cx: Math.floor(Math.random() * 10) + 1,
          cy: Math.floor(Math.random() * 10) + 1
        };
        objective.npcHealth = 100;
        objective.description = `Escort NPC to safety`;
        break;
        
      case QuestObjective.SURVIVE:
        objective.duration = Math.floor(Math.random() * 180) + 120; // 2-5 minutes
        objective.survivalConditions = {
          minHealth: 25,
          stayInArea: {
            cx: Math.floor(Math.random() * 10),
            cy: Math.floor(Math.random() * 10),
            radius: 5
          },
          avoidEnemyType: this.getEnemyType(biome)
        };
        objective.timeRemaining = objective.duration;
        objective.description = `Survive for ${objective.duration} seconds`;
        break;
        
      case QuestObjective.INTERACT:
        objective.interactionTarget = this.getInteractionTarget(biome);
        objective.dialogue = this.getInteractionDialogue(biome, objective.interactionTarget);
        objective.interactionCount = Math.floor(Math.random() * 3) + 1;
        objective.progress = 0;
        objective.description = `Speak with ${objective.interactionTarget}`;
        break;
        
      default:
        if (params.theme === 'adventure_time') {
          // Adventure Time specific objectives
          objective.type = this.getAdventureTimeObjective(biome);
          objective.description = this.getATObjectiveDescription(objective.type);
        }
    }
    
    return objective;
  }
  
  /**
   * Select appropriate objective type for biome/theme
   */
  selectObjectiveType(biome, theme) {
    if (theme === 'adventure_time') {
      const atObjectives = [
        'rescue_candy_person',
        'collect_royal_tarts',
        'defeat_candy_zombies',
        'find_princess_bubblegum',
        'deliver_message_to_peppermint_butler'
      ];
      return atObjectives[Math.floor(Math.random() * atObjectives.length)];
    }
    
    const types = Object.values(QuestObjective);
    return types[Math.floor(Math.random() * types.length)];
  }
  
  /**
   * Get Adventure Time specific objective
   */
  getAdventureTimeObjective(biome) {
    const objectives = {
      candy_kingdom: [
        'rescue_candy_person',
        'collect_royal_tarts',
        'defeat_candy_zombies',
        'find_princess_bubblegum',
        'deliver_message_to_peppermint_butler'
      ],
      ice_kingdom: [
        'rescue_penguin',
        'defeat_ice_monsters',
        'find_ice_king_crown'
      ],
      fire_kingdom: [
        'collect_flame_gems',
        'defeat_flame_guards',
        'deliver_message_to_flame_princess'
      ]
    };
    
    const biomeObjectives = objectives[biome] || objectives.candy_kingdom;
    return biomeObjectives[Math.floor(Math.random() * biomeObjectives.length)];
  }
  
  /**
   * Get AT objective description
   */
  getATObjectiveDescription(objectiveType) {
    const descriptions = {
      'rescue_candy_person': 'Rescue the trapped Candy Person',
      'collect_royal_tarts': 'Collect Royal Tarts for the Princess',
      'defeat_candy_zombies': 'Defeat the Candy Zombies',
      'find_princess_bubblegum': 'Find Princess Bubblegum',
      'deliver_message_to_peppermint_butler': 'Deliver message to Peppermint Butler'
    };
    
    return descriptions[objectiveType] || 'Complete the objective';
  }
  
  /**
   * Get collection target based on biome
   */
  getCollectTarget(biome) {
    const targets = {
      candy_kingdom: ['candy', 'royal_tart', 'sugar_crystal'],
      ice_kingdom: ['ice_shard', 'frozen_tear', 'penguin_feather'],
      fire_kingdom: ['flame_gem', 'lava_rock', 'ember'],
      grasslands: ['herb', 'flower', 'mushroom'],
      dungeon: ['bone', 'ancient_coin', 'mysterious_orb']
    };
    
    const biomeTargets = targets[biome] || targets.grasslands;
    return biomeTargets[Math.floor(Math.random() * biomeTargets.length)];
  }
  
  /**
   * Get enemy type based on biome
   */
  getEnemyType(biome) {
    const enemies = {
      candy_kingdom: ['candy_zombie', 'sugar_imp', 'gummy_bear'],
      ice_kingdom: ['ice_monster', 'frost_wolf', 'snow_golem'],
      fire_kingdom: ['flame_guard', 'lava_slug', 'fire_imp'],
      grasslands: ['goblin', 'wolf', 'bandit'],
      dungeon: ['skeleton', 'zombie', 'monster']
    };
    
    const biomeEnemies = enemies[biome] || enemies.grasslands;
    return biomeEnemies[Math.floor(Math.random() * biomeEnemies.length)];
  }
  
  /**
   * Get delivery item
   */
  getDeliveryItem(biome) {
    const items = {
      candy_kingdom: 'Royal Letter',
      ice_kingdom: 'Frozen Scroll',
      fire_kingdom: 'Flame Seal',
      grasslands: 'Package'
    };
    
    return items[biome] || 'Package';
  }
  
  /**
   * Get recipient
   */
  getRecipient(biome) {
    const recipients = {
      candy_kingdom: 'Peppermint Butler',
      ice_kingdom: 'Gunter',
      fire_kingdom: 'Flambo',
      grasslands: 'Village Elder'
    };
    
    return recipients[biome] || 'NPC';
  }
  
  /**
   * Get interaction target
   */
  getInteractionTarget(biome) {
    const targets = {
      candy_kingdom: ['Princess Bubblegum', 'Peppermint Butler', 'Cinnamon Bun'],
      ice_kingdom: ['Ice King', 'Gunter', 'Ice Penguin'],
      fire_kingdom: ['Flame Princess', 'Flambo', 'Flame Guard'],
      grasslands: ['Finn', 'Jake', 'Tree Trunks'],
      dungeon: ['Dungeon Master', 'Skeleton Guard', 'Ancient Spirit']
    };
    
    const biomeTargets = targets[biome] || targets.grasslands;
    return biomeTargets[Math.floor(Math.random() * biomeTargets.length)];
  }
  
  /**
   * Get interaction dialogue
   */
  getInteractionDialogue(biome, target) {
    const dialogues = {
      'Princess Bubblegum': 'Greetings, brave adventurer. I have important matters to discuss.',
      'Ice King': 'Oh, visitors! Want to see my fan fiction?',
      'Flame Princess': 'Speak quickly, or feel my wrath!',
      'Finn': 'Mathematical! Want to go on an adventure?',
      'Jake': 'Yo, buddy! Let\'s stretch into action!'
    };
    
    return dialogues[target] || `Hello, adventurer. I am ${target}.`;
  }
  
  /**
   * Generate quest title
   */
  generateTitle(biome, type) {
    const titles = {
      candy_kingdom: [
        'Royal Decree',
        'Sweet Salvation',
        'Candy Crisis'
      ],
      ice_kingdom: [
        'Frozen Hearts',
        'Ice King\'s Request',
        'Penguin Problems'
      ],
      fire_kingdom: [
        'Flame War',
        'Burning Bridges',
        'Heat of Battle'
      ],
      dungeon: [
        'Dungeon Delve',
        'Ancient Secrets',
        'Dark Depths'
      ]
    };
    
    const biomeTitles = titles[biome] || ['Adventure Awaits'];
    return biomeTitles[Math.floor(Math.random() * biomeTitles.length)];
  }
  
  /**
   * Generate quest description
   */
  generateDescription(biome, type) {
    return `A quest in the ${biome.replace('_', ' ')} awaits brave adventurers.`;
  }
  
  /**
   * Generate stage description
   */
  generateStageDescription(biome, stageIndex) {
    const descriptions = [
      `Begin your journey in the ${biome}`,
      `Continue deeper into danger`,
      `Face the final challenge`
    ];
    
    return descriptions[stageIndex] || 'Continue your quest';
  }
  
  /**
   * Generate rewards
   */
  generateRewards(level, biome) {
    return {
      experience: level * 20,
      gold: level * 10 + Math.floor(Math.random() * 20),
      items: []
    };
  }
  
  /**
   * Get quest templates
   */
  getTemplates() {
    return this.templates;
  }
  
  /**
   * Initialize templates
   */
  initializeTemplates() {
    return [
      {
        name: 'Dungeon Crawl',
        baseObjectives: [
          { type: QuestObjective.EXPLORE },
          { type: QuestObjective.DEFEAT },
          { type: QuestObjective.COLLECT }
        ]
      },
      {
        name: 'Royal Decree',
        baseObjectives: [
          { type: QuestObjective.DELIVER },
          { type: QuestObjective.INTERACT }
        ]
      },
      {
        name: 'Rescue Mission',
        baseObjectives: [
          { type: QuestObjective.EXPLORE },
          { type: QuestObjective.DEFEAT },
          { type: QuestObjective.ESCORT }
        ]
      },
      {
        name: 'Ancient Artifact',
        baseObjectives: [
          { type: QuestObjective.EXPLORE },
          { type: QuestObjective.COLLECT },
          { type: QuestObjective.DELIVER }
        ]
      }
    ];
  }
  
  /**
   * Generate quest from template
   */
  generateFromTemplate(template, params = {}) {
    const quest = this.generateQuest(params);
    quest.title = `${template.name} ${Math.floor(Math.random() * 100)}`;
    
    // Use template objectives
    quest.objectives = template.baseObjectives.map(baseObj => 
      this.generateObjective({
        ...baseObj,
        biome: params.biome || 'grasslands'
      })
    );
    
    // Randomize locations
    quest.objectives.forEach(obj => {
      if (obj.location) {
        obj.location.cx = Math.floor(Math.random() * 20) - 10;
        obj.location.cy = Math.floor(Math.random() * 20) - 10;
      }
    });
    
    return quest;
  }
}