// Expanded Candy Kingdom dialogue trees v2.0
export const candyKingdomDialoguesV2 = {
  trees: [
    {
      biome: "candy_kingdom",
      npcType: "peasant",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: [
            "Oh, a traveler! Haven't seen many folks around these parts lately.",
            "Things have been... strange since the Lich King's influence spread."
          ],
          choices: [
            {
              text: "What's been happening here?",
              next: "troubles"
            },
            {
              text: "Tell me about the Lich King",
              next: "lich_info"
            },
            {
              text: "Do you have anything to trade?",
              next: "trade_check",
              conditions: [{ randomLT: 0.5 }]
            },
            {
              text: "I should go",
              end: true
            }
          ]
        },
        {
          id: "troubles",
          npcLine: "The candy crops are rotting, guards are on edge, and nobles are hoarding sweets. It's madness!",
          proudVariant: "Even someone of my standing must endure these hardships!",
          humbleVariant: "We simple folk suffer the most in these dark times.",
          choices: [
            {
              text: "I could help with the candy crops",
              next: "help_crops",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 5, trust: 3 }
                  }
                }
              ]
            },
            {
              text: "The nobles sound selfish",
              next: "nobles_bad",
              effects: [
                {
                  factionDelta: {
                    entity: "player",
                    faction: "peasants",
                    delta: 5,
                    reason: "sympathizing"
                  }
                }
              ]
            },
            {
              text: "That's not my problem",
              next: "cold_response",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -5, respect: -3 }
                  }
                }
              ]
            }
          ]
        },
        {
          id: "lich_info",
          npcLine: [
            "The Lich King... they say he was once a great candy wizard.",
            "But dark magic corrupted him. Now he seeks to turn all sweet things bitter!"
          ],
          choices: [
            {
              text: "Where can I find him?",
              next: "lich_location",
              conditions: [
                {
                  relationAtLeast: {
                    target: "npc",
                    metric: "trust",
                    value: 20
                  }
                }
              ]
            },
            {
              text: "How can he be stopped?",
              next: "lich_weakness"
            },
            {
              text: "Sounds like a fairy tale",
              next: "skeptical"
            }
          ]
        },
        {
          id: "trade_check",
          npcLine: "I might have some sugar crystals to spare... for the right price.",
          greedyVariant: "Everything has a price, especially in these times!",
          choices: [
            {
              text: "I'll pay 10 gold",
              next: "trade_complete",
              conditions: [{ hasGold: 10 }],
              effects: [
                {
                  takeItem: { id: "gold", qty: 10 }
                },
                {
                  grantItem: { id: "sugar_crystals", qty: 3 }
                }
              ]
            },
            {
              text: "That's too expensive",
              next: "no_trade"
            },
            {
              text: "How about a trade instead?",
              next: "barter_offer",
              conditions: [{ hasTrait: "charismatic" }]
            }
          ]
        },
        {
          id: "help_crops",
          npcLine: "You would? The rot spreads from the old cemetery. Clear it, and I'll reward you!",
          choices: [
            {
              text: "I'll investigate the cemetery",
              next: "quest_accepted",
              effects: [
                {
                  startQuest: { id: "clear_candy_rot" }
                },
                {
                  setFlag: { flag: "cemetery_quest_started", value: true }
                }
              ]
            },
            {
              text: "What's the reward?",
              next: "reward_info"
            },
            {
              text: "On second thought, no",
              end: true
            }
          ]
        },
        {
          id: "quest_accepted",
          npcLine: "Bless you, traveler! Return when the deed is done!",
          end: true
        },
        {
          id: "cold_response",
          npcLine: "I see... another heartless wanderer. Be gone then!",
          end: true
        },
        {
          id: "lich_location",
          npcLine: "Beyond the Dungeon of the Crystal Eye, in the citadel of bones. But you'd be mad to go there!",
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: { id: "lich_citadel_location", detail: "The Lich King dwells in the citadel beyond the Crystal Eye dungeon" }
              }
            }
          ],
          end: true
        },
        {
          id: "lich_weakness",
          npcLine: "They say only the Enchiridion holds the secret to defeating him. But it's been lost for ages.",
          end: true
        },
        {
          id: "skeptical",
          npcLine: "Believe what you will. When the candy turns to ash in your mouth, you'll know the truth!",
          end: true
        },
        {
          id: "trade_complete",
          npcLine: "Here you go. Use them wisely!",
          end: true
        },
        {
          id: "no_trade",
          npcLine: "Times are hard for everyone, I suppose.",
          end: true
        },
        {
          id: "barter_offer",
          npcLine: "Hmm... bring me 5 pieces of rock candy from the caves, and we have a deal!",
          effects: [
            {
              startQuest: { id: "rock_candy_trade" }
            }
          ],
          end: true
        },
        {
          id: "nobles_bad",
          npcLine: "Shh! Not so loud! The guards have ears everywhere. But yes... you speak truth.",
          end: true
        },
        {
          id: "reward_info",
          npcLine: "I have a family heirloom - a charm that protects against dark magic. It could be yours!",
          choices: [
            {
              text: "Deal! I'll clear the cemetery",
              next: "quest_accepted",
              effects: [
                {
                  startQuest: { id: "clear_candy_rot" }
                },
                {
                  setFlag: { flag: "cemetery_quest_started", value: true }
                }
              ]
            },
            {
              text: "Not worth the risk",
              end: true
            }
          ]
        }
      ]
    },
    {
      biome: "candy_kingdom",
      npcType: "guard",
      start: "halt",
      nodes: [
        {
          id: "halt",
          npcLine: "Halt! State your business in the Candy Kingdom.",
          proudVariant: "Halt! You stand before the finest guard in the realm!",
          choices: [
            {
              text: "Just passing through",
              next: "passing",
              conditions: [{ randomLT: 0.7 }]
            },
            {
              text: "I'm here to help",
              next: "help_offer"
            },
            {
              text: "None of your business",
              next: "hostile_response",
              conditions: [
                {
                  not: {
                    relationAtLeast: {
                      target: "npc",
                      metric: "respect",
                      value: 10
                    }
                  }
                }
              ]
            },
            {
              text: "[Show guard insignia]",
              next: "guard_respect",
              conditions: [
                { hasItem: "guard_insignia" }
              ]
            }
          ]
        },
        {
          id: "passing",
          npcLine: "Move along then. Don't cause trouble.",
          choices: [
            {
              text: "Any news I should know?",
              next: "guard_news"
            },
            {
              text: "Where's the nearest inn?",
              next: "directions"
            },
            {
              text: "I'll be on my way",
              end: true
            }
          ]
        },
        {
          id: "help_offer",
          npcLine: "Help? We could use it. Bandits have been raiding caravans.",
          choices: [
            {
              text: "I'll hunt down these bandits",
              next: "bandit_quest",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 10, respect: 5 }
                  }
                },
                {
                  startQuest: { id: "bandit_hunt" }
                }
              ]
            },
            {
              text: "What's the pay?",
              next: "mercenary",
              conditions: [{ hasTrait: "greedy" }]
            },
            {
              text: "Actually, nevermind",
              end: true
            }
          ]
        },
        {
          id: "hostile_response",
          npcLine: "Watch your tongue, outsider, or spend the night in the dungeons!",
          choices: [
            {
              text: "Try me",
              next: "fight",
              effects: [
                { startCombat: true }
              ]
            },
            {
              text: "Sorry, I meant no disrespect",
              next: "apology",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 5, respect: 2 }
                  }
                }
              ]
            },
            {
              text: "[Walk away]",
              end: true
            }
          ]
        },
        {
          id: "guard_respect",
          npcLine: "A fellow guard! Welcome, friend. How can I assist you?",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 20, trust: 15, respect: 10 }
              }
            }
          ],
          choices: [
            {
              text: "Tell me about current threats",
              next: "threat_briefing"
            },
            {
              text: "I need supplies",
              next: "guard_supplies"
            },
            {
              text: "Just checking in",
              end: true
            }
          ]
        },
        {
          id: "guard_news",
          npcLine: "The Lich King's forces grow stronger. Strange creatures seen near the crystal caves.",
          end: true
        },
        {
          id: "directions",
          npcLine: "The Gummy Bear Inn is two blocks north. Tell Gertie I sent you for a discount.",
          effects: [
            {
              setFlag: { flag: "guard_inn_discount", value: true }
            }
          ],
          end: true
        },
        {
          id: "bandit_quest",
          npcLine: "They hide in the Licorice Woods. Bring back their leader's mask as proof.",
          end: true
        },
        {
          id: "mercenary",
          npcLine: "50 gold pieces and the kingdom's gratitude. Take it or leave it.",
          choices: [
            {
              text: "I'll take it",
              next: "bandit_quest",
              effects: [
                {
                  startQuest: { id: "bandit_hunt" }
                }
              ]
            },
            {
              text: "Not enough",
              end: true
            }
          ]
        },
        {
          id: "fight",
          npcLine: "So be it! Guards, to arms!",
          end: true
        },
        {
          id: "apology",
          npcLine: "Better. Now move along before I change my mind.",
          end: true
        },
        {
          id: "threat_briefing",
          npcLine: [
            "Three main threats: Lich cultists in the north, bandits in the woods, and...",
            "Something in the dungeons. We've lost three patrols down there."
          ],
          end: true
        },
        {
          id: "guard_supplies",
          npcLine: "Take these potions. You'll need them where you're going.",
          effects: [
            {
              grantItem: { id: "healing_potion", qty: 2 }
            }
          ],
          end: true
        }
      ]
    },
    {
      biome: "candy_kingdom",
      npcType: "merchant",
      start: "shop_greeting",
      nodes: [
        {
          id: "shop_greeting",
          npcLine: "Welcome to my shop! Finest wares in the kingdom!",
          greedyVariant: "Come in, come in! Your gold is always welcome here!",
          humbleVariant: "Welcome, friend. I have modest goods at fair prices.",
          choices: [
            {
              text: "Show me your wares",
              next: "browse_shop"
            },
            {
              text: "I have items to sell",
              next: "sell_items"
            },
            {
              text: "Any special deals?",
              next: "special_deals",
              conditions: [
                {
                  relationAtLeast: {
                    target: "npc",
                    metric: "value",
                    value: 30
                  }
                }
              ]
            },
            {
              text: "Just looking",
              end: true
            }
          ]
        },
        {
          id: "browse_shop",
          npcLine: "I have potions, weapons, and rare candies! What interests you?",
          choices: [
            {
              text: "Healing potion (15 gold)",
              next: "buy_potion",
              conditions: [{ hasGold: 15 }]
            },
            {
              text: "Iron sword (50 gold)",
              next: "buy_sword",
              conditions: [{ hasGold: 50 }]
            },
            {
              text: "Rare candy (100 gold)",
              next: "buy_candy",
              conditions: [{ hasGold: 100 }]
            },
            {
              text: "Nothing for now",
              end: true
            }
          ]
        },
        {
          id: "sell_items",
          npcLine: "Let me see what you have...",
          choices: [
            {
              text: "Sell goblin ears (5 gold each)",
              next: "sell_ears",
              conditions: [{ hasItem: "goblin_ear" }]
            },
            {
              text: "Sell ancient relic (200 gold)",
              next: "sell_relic",
              conditions: [{ hasItem: "ancient_relic" }]
            },
            {
              text: "Actually, nothing",
              end: true
            }
          ]
        },
        {
          id: "special_deals",
          npcLine: "For you, my friend, I have something special hidden away...",
          choices: [
            {
              text: "I'm interested",
              next: "secret_item"
            },
            {
              text: "Maybe later",
              end: true
            }
          ]
        },
        {
          id: "buy_potion",
          npcLine: "Excellent choice! This will keep you alive!",
          effects: [
            {
              takeItem: { id: "gold", qty: 15 }
            },
            {
              grantItem: { id: "healing_potion", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_sword",
          npcLine: "A fine weapon! May it serve you well!",
          effects: [
            {
              takeItem: { id: "gold", qty: 50 }
            },
            {
              grantItem: { id: "iron_sword", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_candy",
          npcLine: "Ah, the rare candy! It grants mysterious powers!",
          effects: [
            {
              takeItem: { id: "gold", qty: 100 }
            },
            {
              grantItem: { id: "rare_candy", qty: 1 }
            },
            {
              emitEvent: {
                type: "ItemPurchased",
                payload: { item: "rare_candy", price: 100 }
              }
            }
          ],
          end: true
        },
        {
          id: "sell_ears",
          npcLine: "Goblin ears! Always in demand for... reasons. Here's your gold!",
          effects: [
            {
              takeItem: { id: "goblin_ear", qty: 1 }
            },
            {
              grantItem: { id: "gold", qty: 5 }
            }
          ],
          end: true
        },
        {
          id: "sell_relic",
          npcLine: "By the candy gods! This is genuine! Here's your payment!",
          effects: [
            {
              takeItem: { id: "ancient_relic", qty: 1 }
            },
            {
              grantItem: { id: "gold", qty: 200 }
            },
            {
              factionDelta: {
                entity: "player",
                faction: "merchants",
                delta: 15,
                reason: "valuable_trade"
              }
            }
          ],
          end: true
        },
        {
          id: "secret_item",
          npcLine: "I have a map to the Crystal Dungeon's secret entrance. 300 gold, and it's yours.",
          choices: [
            {
              text: "Deal!",
              next: "buy_map",
              conditions: [{ hasGold: 300 }],
              effects: [
                {
                  takeItem: { id: "gold", qty: 300 }
                },
                {
                  grantItem: { id: "crystal_dungeon_map", qty: 1 }
                },
                {
                  setFlag: { flag: "knows_secret_entrance", value: true }
                }
              ]
            },
            {
              text: "Too rich for my blood",
              end: true
            }
          ]
        },
        {
          id: "buy_map",
          npcLine: "Smart investment! This will save your life down there!",
          end: true
        }
      ]
    },
    {
      biome: "candy_kingdom",
      npcType: "nobles",
      start: "noble_greeting",
      nodes: [
        {
          id: "noble_greeting",
          npcLine: "Oh my, a commoner in my presence. What could you possibly want?",
          proudVariant: "How dare you approach without proper introduction!",
          humbleVariant: "Greetings, traveler. How may I assist you?",
          choices: [
            {
              text: "I seek information about the kingdom",
              next: "kingdom_info"
            },
            {
              text: "I need your help",
              next: "help_request",
              conditions: [
                {
                  relationAtLeast: {
                    target: "npc",
                    metric: "respect",
                    value: 40
                  }
                }
              ]
            },
            {
              text: "You nobles are all the same",
              next: "insult_nobles",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -15, respect: -10 }
                  }
                },
                {
                  factionDelta: {
                    entity: "player",
                    faction: "nobles",
                    delta: -10,
                    reason: "insult"
                  }
                }
              ]
            },
            {
              text: "[Bow respectfully]",
              next: "show_respect",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { respect: 10 }
                  }
                }
              ]
            }
          ]
        },
        {
          id: "kingdom_info",
          npcLine: [
            "The kingdom? It's falling apart, though we nobles maintain order.",
            "Princess Bubblegum does her best, but the Lich King's shadow grows long."
          ],
          choices: [
            {
              text: "Tell me about Princess Bubblegum",
              next: "princess_info"
            },
            {
              text: "What about the other nobles?",
              next: "noble_politics"
            },
            {
              text: "How can I help the kingdom?",
              next: "help_kingdom"
            }
          ]
        },
        {
          id: "help_request",
          npcLine: "You need MY help? How amusing. What could you offer in return?",
          choices: [
            {
              text: "I can retrieve your stolen jewels",
              next: "jewel_quest",
              conditions: [{ flagTrue: "heard_about_theft" }]
            },
            {
              text: "Gold, of course",
              next: "bribe",
              conditions: [{ hasGold: 500 }]
            },
            {
              text: "My sword, when you need it",
              next: "oath"
            }
          ]
        },
        {
          id: "insult_nobles",
          npcLine: "How DARE you! Guards! Remove this peasant!",
          effects: [
            {
              emitEvent: {
                type: "AlertGuards",
                payload: { reason: "insulted_nobility" }
              }
            }
          ],
          end: true
        },
        {
          id: "show_respect",
          npcLine: "Finally, someone with proper manners. You may speak.",
          choices: [
            {
              text: "I seek an audience with the Princess",
              next: "princess_audience"
            },
            {
              text: "I wish to serve the nobility",
              next: "serve_nobles"
            },
            {
              text: "I have news of the Lich King",
              next: "lich_news",
              conditions: [{ flagTrue: "lich_intel" }]
            }
          ]
        },
        {
          id: "princess_info",
          npcLine: "Princess Bubblegum is brilliant but... distracted by her experiments. She barely holds court anymore.",
          effects: [
            {
              setFlag: { flag: "knows_pb_distracted", value: true }
            }
          ],
          end: true
        },
        {
          id: "noble_politics",
          npcLine: [
            "Duke Gumball plots against the Princess, Lady Lollipop hoards candy reserves,",
            "And Count Chocolate has gone mad, they say. We're all doomed!"
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: { id: "noble_conspiracy", detail: "The nobles plot against each other" }
              }
            }
          ],
          end: true
        },
        {
          id: "help_kingdom",
          npcLine: "Help? Clear the dungeons, stop the Lich King, restore order. Simple tasks for a hero, no?",
          choices: [
            {
              text: "I'll do what I can",
              next: "hero_path",
              effects: [
                {
                  startQuest: { id: "save_candy_kingdom" }
                }
              ]
            },
            {
              text: "That's asking a lot",
              end: true
            }
          ]
        },
        {
          id: "jewel_quest",
          npcLine: "My precious jewels! Yes, retrieve them from those bandits and I'll reward you handsomely!",
          effects: [
            {
              startQuest: { id: "noble_jewels" }
            },
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 15, trust: 10 }
              }
            }
          ],
          end: true
        },
        {
          id: "bribe",
          npcLine: "500 gold? Well... I suppose I could arrange what you need.",
          effects: [
            {
              takeItem: { id: "gold", qty: 500 }
            },
            {
              grantItem: { id: "noble_seal", qty: 1 }
            },
            {
              setFlag: { flag: "has_noble_backing", value: true }
            }
          ],
          end: true
        },
        {
          id: "oath",
          npcLine: "An oath of service? Interesting. Swear it, and I'll remember when the time comes.",
          effects: [
            {
              setFlag: { flag: "sworn_to_noble", value: true }
            },
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 25, respect: 20, trust: 15 }
              }
            }
          ],
          end: true
        },
        {
          id: "princess_audience",
          npcLine: "The Princess sees no one without the Council's approval. But... I could arrange it, for a price.",
          choices: [
            {
              text: "Name your price",
              next: "audience_price"
            },
            {
              text: "I'll find another way",
              end: true
            }
          ]
        },
        {
          id: "serve_nobles",
          npcLine: "Serve us? Prove your worth first. Eliminate the bandit threat, then we'll talk.",
          effects: [
            {
              startQuest: { id: "prove_to_nobles" }
            }
          ],
          end: true
        },
        {
          id: "lich_news",
          npcLine: [
            "The Lich King! What do you know? Speak quickly!",
            "This information must reach the Princess immediately!"
          ],
          effects: [
            {
              factionDelta: {
                entity: "player",
                faction: "nobles",
                delta: 30,
                reason: "vital_intel"
              }
            },
            {
              setFlag: { flag: "nobles_alerted", value: true }
            },
            {
              completeQuest: { id: "deliver_lich_intel" }
            }
          ],
          end: true
        },
        {
          id: "hero_path",
          npcLine: "A true hero! How refreshing. Take this sigil - it will open doors for you.",
          effects: [
            {
              grantItem: { id: "hero_sigil", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "audience_price",
          npcLine: "1000 gold, or bring me the head of the bandit leader. Your choice.",
          choices: [
            {
              text: "Here's the gold",
              next: "pay_audience",
              conditions: [{ hasGold: 1000 }],
              effects: [
                {
                  takeItem: { id: "gold", qty: 1000 }
                },
                {
                  setFlag: { flag: "princess_audience_granted", value: true }
                }
              ]
            },
            {
              text: "I'll hunt the bandits",
              next: "bandit_hunt_noble",
              effects: [
                {
                  startQuest: { id: "noble_bandit_bounty" }
                }
              ]
            },
            {
              text: "Forget it",
              end: true
            }
          ]
        },
        {
          id: "pay_audience",
          npcLine: "Excellent. Present this seal at the castle gates tomorrow at dawn.",
          effects: [
            {
              grantItem: { id: "audience_seal", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "bandit_hunt_noble",
          npcLine: "Good. The bandits hide in Licorice Woods. Don't return without proof!",
          end: true
        }
      ]
    }
  ]
};