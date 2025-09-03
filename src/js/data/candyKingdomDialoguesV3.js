// Adventure Time authentic Candy Kingdom dialogue trees v3.0
// Based on actual Adventure Time lore and locations

export const candyKingdomDialoguesV3 = {
  trees: [
    // ========== CANDY PEASANT (Common Candy Person) ==========
    {
      biome: "candy_kingdom",
      npcType: "candy_peasant",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: [
            "Oh my Glob! A hero!",
            "Things have been totally math around here... if you like chaos!"
          ],
          choices: [
            {
              text: "What's been happening in the Candy Kingdom?",
              next: "kingdom_status"
            },
            {
              text: "Tell me about Princess Bubblegum",
              next: "about_pb"
            },
            {
              text: "Where can I find supplies?",
              next: "directions"
            },
            {
              text: "Have you seen anything weird lately?",
              next: "weird_stuff"
            },
            {
              text: "See ya later",
              end: true
            }
          ]
        },
        {
          id: "kingdom_status",
          npcLine: [
            "Well, the Banana Guards keep slipping on their own peels,",
            "the Candy Tavern ran out of root beer float, and someone saw",
            "Peppermint Butler doing dark magic again. So... typical Tuesday!"
          ],
          humbleVariant: "I shouldn't gossip, but things have been rather concerning lately...",
          proudVariant: "As one of the kingdom's most observant citizens, I can tell you it's chaos!",
          choices: [
            {
              text: "Dark magic? That sounds dangerous!",
              next: "peppermint_butler_magic"
            },
            {
              text: "What's wrong with the Banana Guards?",
              next: "banana_guards_problem"
            },
            {
              text: "The tavern sounds like my kind of place",
              next: "candy_tavern_info"
            }
          ]
        },
        {
          id: "about_pb",
          npcLine: [
            "Princess Bubblegum? She's like, super smart and stuff!",
            "She created all of us Candy People from scratch!",
            "But between you and me... she's been locked in her lab for weeks."
          ],
          choices: [
            {
              text: "What's she working on?",
              next: "pb_experiments",
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
              text: "Is she a good ruler?",
              next: "pb_ruler"
            },
            {
              text: "How do I get an audience with her?",
              next: "pb_audience"
            }
          ]
        },
        {
          id: "weird_stuff",
          npcLine: [
            "Oh glob, where do I even start?",
            "There's been oozing from the Candy Dungeon,",
            "strange noises from the Cotton Candy Forest,",
            "and Mr. Cream Puff swears he saw the Lich's shadow!"
          ],
          choices: [
            {
              text: "The Lich?! Tell me more!",
              next: "lich_rumors",
              effects: [
                {
                  setFlag: { flag: "heard_lich_rumor", value: true }
                }
              ]
            },
            {
              text: "What's in the Candy Dungeon?",
              next: "candy_dungeon_info"
            },
            {
              text: "Cotton Candy Forest sounds tasty",
              next: "cotton_candy_forest"
            }
          ]
        },
        {
          id: "directions",
          npcLine: "Oh sure! Let me give you the sweet tour!",
          choices: [
            {
              text: "Where's the Candy Tavern?",
              next: "tavern_directions"
            },
            {
              text: "How do I get to the castle?",
              next: "castle_directions"
            },
            {
              text: "Where's the hospital?",
              next: "hospital_directions"
            },
            {
              text: "Where can I buy supplies?",
              next: "shop_directions"
            }
          ]
        },
        {
          id: "peppermint_butler_magic",
          npcLine: [
            "Peppermint Butler is Princess Bubblegum's loyal servant,",
            "but everyone knows he practices the dark arts!",
            "I heard he has a secret chamber under the castle..."
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: { 
                  id: "peppermint_butler_dark_magic",
                  detail: "Peppermint Butler has a secret chamber for dark magic under the castle"
                }
              }
            }
          ],
          choices: [
            {
              text: "Does Princess Bubblegum know?",
              next: "pb_knows_magic"
            },
            {
              text: "Maybe I should investigate",
              next: "investigate_butler",
              effects: [
                {
                  startQuest: { id: "peppermint_butler_secret" }
                }
              ]
            },
            {
              text: "That's his business",
              end: true
            }
          ]
        },
        {
          id: "banana_guards_problem",
          npcLine: [
            "They mean well, but they're not the brightest bananas in the bunch.",
            "Last week, three of them arrested each other by accident!",
            "Princess Bubblegum keeps trying to upgrade their programming."
          ],
          choices: [
            {
              text: "Maybe I could help train them",
              next: "train_guards",
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
              text: "Sounds like the kingdom needs better security",
              next: "security_concerns"
            },
            {
              text: "That's actually pretty funny",
              next: "laugh_guards",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 5, trust: 3 }
                  }
                }
              ]
            }
          ]
        },
        {
          id: "candy_tavern_info",
          npcLine: [
            "The Candy Tavern! Best root beer floats in Ooo!",
            "Well... when they have them. Root Beer Guy owns the place.",
            "He's also a detective on the side. Pretty algebraic guy!"
          ],
          effects: [
            {
              setFlag: { flag: "knows_candy_tavern", value: true }
            }
          ],
          end: true
        },
        {
          id: "pb_experiments",
          npcLine: [
            "I overheard Peppermint Butler say she's working on",
            "something called 'Candy Biomass Enhancement Protocol'.",
            "Some of us are worried she's going to... upgrade us again."
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "pb_experiments",
                  detail: "Princess Bubblegum is working on Candy Biomass Enhancement"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "pb_ruler",
          npcLine: [
            "She's... complicated. Super smart, keeps us safe,",
            "but sometimes she gets a little too controlling.",
            "Remember when she put cameras everywhere? Yeah..."
          ],
          choices: [
            {
              text: "Cameras? That's messed up",
              next: "surveillance_state",
              effects: [
                {
                  factionDelta: {
                    entity: "player",
                    faction: "candy_peasants",
                    delta: 5,
                    reason: "sympathizing"
                  }
                }
              ]
            },
            {
              text: "She's just trying to protect you",
              next: "defend_pb",
              effects: [
                {
                  factionDelta: {
                    entity: "player",
                    faction: "candy_royalty",
                    delta: 5,
                    reason: "loyalty"
                  }
                }
              ]
            }
          ]
        },
        {
          id: "pb_audience",
          npcLine: [
            "Good luck with that! She barely leaves her lab these days.",
            "Your best bet is to impress Peppermint Butler first.",
            "Or solve some major crisis. That usually gets her attention!"
          ],
          end: true
        },
        {
          id: "lich_rumors",
          npcLine: [
            "The Lich is like, the most evil thing ever!",
            "He wants to destroy all life in the universe!",
            "Some say his essence still lingers in the Candy Dungeon depths..."
          ],
          choices: [
            {
              text: "I should investigate the dungeon",
              next: "dungeon_quest",
              effects: [
                {
                  startQuest: { id: "investigate_lich_presence" }
                }
              ]
            },
            {
              text: "Has anyone actually seen him?",
              next: "lich_sightings"
            },
            {
              text: "Sounds like nonsense",
              next: "skeptical_lich"
            }
          ]
        },
        {
          id: "candy_dungeon_info",
          npcLine: [
            "Princess Bubblegum locks up bad guys down there.",
            "But lately, weird ooze has been seeping from the lower levels.",
            "The Banana Guards won't go past level 3 anymore!"
          ],
          effects: [
            {
              setFlag: { flag: "knows_dungeon_problem", value: true }
            }
          ],
          end: true
        },
        {
          id: "cotton_candy_forest",
          npcLine: [
            "It IS tasty! But also super dangerous!",
            "The trees whisper secrets and the cotton candy wolves",
            "will totally eat you! Well, after you eat them. It's complicated."
          ],
          end: true
        },
        {
          id: "tavern_directions",
          npcLine: "Just head north past the Candy Drugstore, can't miss it! Tell Root Beer Guy I sent you!",
          effects: [
            {
              setFlag: { flag: "candy_tavern_recommendation", value: true }
            }
          ],
          end: true
        },
        {
          id: "castle_directions",
          npcLine: "The big pink castle in the center! But the Gumball Guardians might stop you at the gate.",
          end: true
        },
        {
          id: "hospital_directions",
          npcLine: [
            "We have two actually! Regular hospital for boo-boos,",
            "and the mental hospital for... you know... the melty ones."
          ],
          end: true
        },
        {
          id: "shop_directions",
          npcLine: "The Candy Convenience Store is on Gumdrop Lane, or try the drugstore for potions!",
          end: true
        },
        {
          id: "pb_knows_magic",
          npcLine: [
            "Oh, she definitely knows! I think she allows it because",
            "Peppermint Butler's magic has saved the kingdom before.",
            "Still creepy though..."
          ],
          end: true
        },
        {
          id: "investigate_butler",
          npcLine: "Be careful! He may look like a harmless mint, but that dude is DANGEROUS!",
          end: true
        },
        {
          id: "train_guards",
          npcLine: [
            "Really? You'd do that? Oh glob, that would be so math!",
            "Talk to Captain Banana Guard at the castle barracks!"
          ],
          effects: [
            {
              startQuest: { id: "train_banana_guards" }
            }
          ],
          end: true
        },
        {
          id: "security_concerns",
          npcLine: [
            "Tell me about it! But at least we have the Gumball Guardians.",
            "Those things are HUGE and shoot lasers from their eyes!"
          ],
          end: true
        },
        {
          id: "laugh_guards",
          npcLine: "Right? They're like a bunch of yellow comedians! At least they keep things interesting!",
          end: true
        },
        {
          id: "surveillance_state",
          npcLine: [
            "Yeah! She said it was for our safety, but like,",
            "I don't want her watching me eat ice cream in my underwear!"
          ],
          end: true
        },
        {
          id: "defend_pb",
          npcLine: [
            "I... I guess you're right. She did save us from the Lich,",
            "and that time with the zombies, and the fire kingdom invasion..."
          ],
          end: true
        },
        {
          id: "dungeon_quest",
          npcLine: "You're brave! Or crazy. Or both! The entrance is behind the castle, but you'll need permission!",
          end: true
        },
        {
          id: "lich_sightings",
          npcLine: [
            "Mr. Cream Puff says he saw a shadow with no body,",
            "and Chocoberry heard whispers saying 'Fall...'",
            "But they're also pretty old and eat a lot of sugar..."
          ],
          end: true
        },
        {
          id: "skeptical_lich",
          npcLine: "That's what Starchy said! Then he disappeared for three days and came back all weird!",
          end: true
        }
      ]
    },

    // ========== BANANA GUARD ==========
    {
      biome: "candy_kingdom",
      npcType: "banana_guard",
      start: "halt",
      nodes: [
        {
          id: "halt",
          npcLine: "HALT! In the name of Princess Bubblegum! State your business!",
          proudVariant: "HALT! You face the kingdom's FINEST guard!",
          choices: [
            {
              text: "I'm here to help the kingdom",
              next: "help_kingdom"
            },
            {
              text: "Just passing through",
              next: "passing_through"
            },
            {
              text: "I need to see Princess Bubblegum",
              next: "see_pb"
            },
            {
              text: "Are you going to slip on your peel?",
              next: "peel_joke",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -5, respect: -5 }
                  }
                }
              ]
            },
            {
              text: "[Show royal seal]",
              next: "royal_seal",
              conditions: [
                { hasItem: "royal_seal" }
              ]
            }
          ]
        },
        {
          id: "help_kingdom",
          npcLine: [
            "Help? We could use it! Crime is on the rise!",
            "The Pup Gang has been stealing diamonds again!"
          ],
          choices: [
            {
              text: "I'll stop the Pup Gang",
              next: "pup_gang_quest",
              effects: [
                {
                  startQuest: { id: "stop_pup_gang" }
                },
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 10, respect: 5 }
                  }
                }
              ]
            },
            {
              text: "What other problems are there?",
              next: "other_problems"
            },
            {
              text: "Sounds like you guards aren't doing your job",
              next: "insult_guards",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -10, respect: -8 }
                  }
                }
              ]
            }
          ]
        },
        {
          id: "passing_through",
          npcLine: "Hmm... okay! But no funny business! We're watching you!",
          choices: [
            {
              text: "How many guards are watching exactly?",
              next: "guard_count"
            },
            {
              text: "Where's a good place to rest?",
              next: "rest_location"
            },
            {
              text: "Got any tips for a traveler?",
              next: "traveler_tips"
            },
            {
              text: "Thanks, I'll be careful",
              end: true
            }
          ]
        },
        {
          id: "see_pb",
          npcLine: [
            "Princess Bubblegum is VERY busy with science stuff!",
            "You need an appointment! Or a REALLY good reason!"
          ],
          choices: [
            {
              text: "I have information about the Lich",
              next: "lich_info",
              conditions: [
                { flagTrue: "heard_lich_rumor" }
              ]
            },
            {
              text: "How do I get an appointment?",
              next: "get_appointment"
            },
            {
              text: "What if it's an emergency?",
              next: "emergency_protocol"
            }
          ]
        },
        {
          id: "peel_joke",
          npcLine: [
            "HEY! That's... that's actually pretty likely!",
            "It happens like three times a day! It's not funny!",
            "...Okay, it's a little funny."
          ],
          choices: [
            {
              text: "Sorry, I couldn't resist",
              next: "apologize_joke",
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
              text: "Have you tried not dropping peels everywhere?",
              next: "peel_advice"
            },
            {
              text: "You guards are ridiculous",
              next: "mock_guards",
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
                    faction: "guards",
                    delta: -10,
                    reason: "insulting guards"
                  }
                }
              ]
            }
          ]
        },
        {
          id: "royal_seal",
          npcLine: [
            "Oh my glob! The royal seal!",
            "You must be important! Go right ahead!",
            "Do you want an escort to the castle?"
          ],
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 20, respect: 25, trust: 15 }
              }
            }
          ],
          choices: [
            {
              text: "Yes, escort me",
              next: "escort_castle",
              effects: [
                {
                  setFlag: { flag: "guard_escort", value: true }
                }
              ]
            },
            {
              text: "No thanks, I know the way",
              end: true
            }
          ]
        },
        {
          id: "pup_gang_quest",
          npcLine: [
            "They usually hang out near the Candy Convenience Store!",
            "But be careful - they're tougher than they look!",
            "Bring back the stolen diamonds as proof!"
          ],
          end: true
        },
        {
          id: "other_problems",
          npcLine: [
            "Well, there's ooze in the dungeon, weird stuff in the forest,",
            "and someone keeps stealing all the jawbreakers!",
            "It's a crime wave!"
          ],
          choices: [
            {
              text: "Tell me about the dungeon ooze",
              next: "dungeon_ooze"
            },
            {
              text: "What's in the forest?",
              next: "forest_problems"
            },
            {
              text: "Jawbreaker theft is serious business",
              next: "jawbreaker_thief"
            }
          ]
        },
        {
          id: "insult_guards",
          npcLine: [
            "HEY! We're doing our best!",
            "It's hard to fight crime when you're made of banana!"
          ],
          choices: [
            {
              text: "You're right, sorry",
              next: "apologize_guards",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 5, respect: 3 }
                  }
                }
              ]
            },
            {
              text: "That's no excuse",
              next: "no_excuse",
              effects: [
                { startCombat: true }
              ]
            }
          ]
        },
        {
          id: "guard_count",
          npcLine: [
            "Let's see... there's me, Barry, Barbara, Banana Guard 16,",
            "and... uh... a bunch more! We're everywhere!",
            "Except when we're on break. Or slipped on peels."
          ],
          end: true
        },
        {
          id: "rest_location",
          npcLine: [
            "The Coolest Hotel has the best beds! Super expensive though.",
            "Or try the Candy Tavern - Root Beer Guy lets people sleep upstairs sometimes."
          ],
          effects: [
            {
              setFlag: { flag: "knows_hotels", value: true }
            }
          ],
          end: true
        },
        {
          id: "traveler_tips",
          npcLine: [
            "Don't eat the houses - people live in them!",
            "Stay away from the dungeon unless you have permission!",
            "And if you see the Lich, run! Actually, just run anyway!"
          ],
          end: true
        },
        {
          id: "lich_info",
          npcLine: [
            "THE LICH?! Oh glob oh glob oh glob!",
            "You need to tell Princess Bubblegum RIGHT NOW!",
            "Follow me! MOVE MOVE MOVE!"
          ],
          effects: [
            {
              setFlag: { flag: "urgent_pb_meeting", value: true }
            },
            {
              completeQuest: { id: "report_lich_activity" }
            }
          ],
          end: true
        },
        {
          id: "get_appointment",
          npcLine: [
            "Talk to Peppermint Butler at the castle!",
            "He handles the Princess's schedule!",
            "But he's super creepy, just warning you!"
          ],
          end: true
        },
        {
          id: "emergency_protocol",
          npcLine: [
            "If it's a REAL emergency, ring the castle alarm bell!",
            "But if it's not actually an emergency, you go to the dungeon!",
            "So... be really sure!"
          ],
          end: true
        },
        {
          id: "apologize_joke",
          npcLine: [
            "It's okay! At least you have a sense of humor!",
            "Better than those stuck-up Gumball Guardians!"
          ],
          end: true
        },
        {
          id: "peel_advice",
          npcLine: [
            "We've tried everything! Special shoes, peel collectors, even therapy!",
            "Dr. Dextrose at the mental hospital says it's 'part of our nature'.",
            "Whatever that means!"
          ],
          end: true
        },
        {
          id: "mock_guards",
          npcLine: "That's it! You're under arrest for... for... BEING MEAN!",
          end: true
        },
        {
          id: "escort_castle",
          npcLine: [
            "Right this way! Stay close!",
            "I'll make sure the Gumball Guardians don't laser you!"
          ],
          end: true
        },
        {
          id: "dungeon_ooze",
          npcLine: [
            "Green, glowing, and totally gross!",
            "Started showing up after Princess Bubblegum's last experiment!",
            "We're supposed to investigate but... ew."
          ],
          effects: [
            {
              setFlag: { flag: "knows_dungeon_ooze", value: true }
            }
          ],
          end: true
        },
        {
          id: "forest_problems",
          npcLine: [
            "Cotton Candy Wolves have been howling all night!",
            "And someone saw a giant worm! Or maybe it was just Shelby.",
            "Hard to tell in the dark!"
          ],
          end: true
        },
        {
          id: "jawbreaker_thief",
          npcLine: [
            "I KNOW RIGHT?! Those are my favorite!",
            "We think it's someone small - they get in through the vents!",
            "Maybe those candy orphans... but you didn't hear that from me!"
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "orphan_thieves",
                  detail: "Candy orphans might be stealing jawbreakers"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "apologize_guards",
          npcLine: "Thanks. It's tough being made of fruit in a candy kingdom, you know?",
          end: true
        },
        {
          id: "no_excuse",
          npcLine: "BANANA GUARDS, ASSEMBLE! PROTECT THE KINGDOM!",
          end: true
        }
      ]
    },

    // ========== CANDY MERCHANT ==========
    {
      biome: "candy_kingdom",
      npcType: "candy_merchant",
      start: "shop_greeting",
      nodes: [
        {
          id: "shop_greeting",
          npcLine: [
            "Welcome to my totally mathematical shop!",
            "I've got the best candy gear this side of the Dungeon of the Crystal Eye!"
          ],
          greedyVariant: "Come in, come in! Your money looks delicious! I mean, welcome!",
          humbleVariant: "Welcome, friend. I have modest sweets at fair prices.",
          choices: [
            {
              text: "Show me your wares",
              next: "browse_items"
            },
            {
              text: "I'm looking for something special",
              next: "special_items"
            },
            {
              text: "Any news from other kingdoms?",
              next: "merchant_news"
            },
            {
              text: "Do you buy items?",
              next: "buy_items"
            },
            {
              text: "Just browsing",
              end: true
            }
          ]
        },
        {
          id: "browse_items",
          npcLine: "I've got potions, weapons, armor, and rare candies!",
          choices: [
            {
              text: "Sugar Rush Potion (20 gold) - Doubles speed",
              next: "buy_sugar_rush",
              conditions: [{ hasGold: 20 }]
            },
            {
              text: "Rock Candy Sword (75 gold) - Sharp and sweet",
              next: "buy_candy_sword",
              conditions: [{ hasGold: 75 }]
            },
            {
              text: "Jawbreaker Shield (100 gold) - Nearly unbreakable",
              next: "buy_jawbreaker_shield",
              conditions: [{ hasGold: 100 }]
            },
            {
              text: "Royal Jelly (200 gold) - Fully heals and cures all",
              next: "buy_royal_jelly",
              conditions: [{ hasGold: 200 }]
            },
            {
              text: "Let me see other items",
              next: "special_items"
            }
          ]
        },
        {
          id: "special_items",
          npcLine: [
            "Ah, a connoisseur! I have some... unofficial items.",
            "Not strictly legal, but very effective!"
          ],
          conditions: [
            {
              relationAtLeast: {
                target: "npc",
                metric: "trust",
                value: 30
              }
            }
          ],
          choices: [
            {
              text: "Dungeon Map (150 gold) - Shows secret passages",
              next: "buy_dungeon_map",
              conditions: [{ hasGold: 150 }]
            },
            {
              text: "Peppermint Butler's Amulet (300 gold) - Dark magic protection",
              next: "buy_dark_amulet",
              conditions: [{ hasGold: 300 }]
            },
            {
              text: "Banana Guard Uniform (50 gold) - For disguises",
              next: "buy_guard_uniform",
              conditions: [{ hasGold: 50 }]
            },
            {
              text: "Crystal Gem Apple (500 gold) - From Tree Trunks' orchard",
              next: "buy_crystal_apple",
              conditions: [{ hasGold: 500 }]
            }
          ]
        },
        {
          id: "merchant_news",
          npcLine: [
            "Oh glob, where do I start?",
            "Fire Kingdom's having another coup, Ice King kidnapped someone AGAIN,",
            "and Marceline's been seen flying around at night!"
          ],
          choices: [
            {
              text: "Tell me about the Fire Kingdom",
              next: "fire_kingdom_news"
            },
            {
              text: "Who did Ice King kidnap this time?",
              next: "ice_king_news"
            },
            {
              text: "Marceline the Vampire Queen?",
              next: "marceline_news"
            }
          ]
        },
        {
          id: "buy_items",
          npcLine: "I'll buy dungeon loot, monster parts, and rare candies!",
          choices: [
            {
              text: "Sell Lich Dust (100 gold each)",
              next: "sell_lich_dust",
              conditions: [{ hasItem: "lich_dust" }]
            },
            {
              text: "Sell Candy Corn (5 gold each)",
              next: "sell_candy_corn",
              conditions: [{ hasItem: "candy_corn" }]
            },
            {
              text: "Sell Dungeon Crystal (50 gold each)",
              next: "sell_crystal",
              conditions: [{ hasItem: "dungeon_crystal" }]
            },
            {
              text: "Maybe later",
              end: true
            }
          ]
        },
        {
          id: "buy_sugar_rush",
          npcLine: "Excellent choice! This'll make you faster than Finn on a sugar high!",
          effects: [
            {
              takeItem: { id: "gold", qty: 20 }
            },
            {
              grantItem: { id: "sugar_rush_potion", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_candy_sword",
          npcLine: [
            "The Rock Candy Sword! Forged in the Candy Forges!",
            "It gets sharper the more you lick it! Wait, that sounds weird..."
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 75 }
            },
            {
              grantItem: { id: "rock_candy_sword", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_jawbreaker_shield",
          npcLine: "This shield has saved my life twice! Well, the guy I bought it from anyway!",
          effects: [
            {
              takeItem: { id: "gold", qty: 100 }
            },
            {
              grantItem: { id: "jawbreaker_shield", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_royal_jelly",
          npcLine: [
            "Shhh! This is from Princess Bubblegum's private stock!",
            "Don't tell anyone where you got it!"
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 200 }
            },
            {
              grantItem: { id: "royal_jelly", qty: 1 }
            },
            {
              setFlag: { flag: "has_royal_jelly", value: true }
            }
          ],
          end: true
        },
        {
          id: "buy_dungeon_map",
          npcLine: [
            "This map shows ALL the secret passages in the Candy Dungeon!",
            "I got it from a guard who... retired suddenly."
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 150 }
            },
            {
              grantItem: { id: "candy_dungeon_map", qty: 1 }
            },
            {
              setFlag: { flag: "knows_dungeon_secrets", value: true }
            }
          ],
          end: true
        },
        {
          id: "buy_dark_amulet",
          npcLine: [
            "This fell off Peppermint Butler's coat once!",
            "It protects against dark magic and smells minty fresh!"
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 300 }
            },
            {
              grantItem: { id: "dark_protection_amulet", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_guard_uniform",
          npcLine: [
            "One banana guard outfit, slightly used!",
            "Has a few peel stains but works great for sneaking around!"
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 50 }
            },
            {
              grantItem: { id: "banana_guard_uniform", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_crystal_apple",
          npcLine: [
            "From the Crystal Dimension! Tree Trunks found these!",
            "They taste like apples but grant cosmic awareness! Allegedly!"
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 500 }
            },
            {
              grantItem: { id: "crystal_gem_apple", qty: 1 }
            },
            {
              emitEvent: {
                type: "ItemPurchased",
                payload: { item: "crystal_gem_apple", price: 500 }
              }
            }
          ],
          end: true
        },
        {
          id: "fire_kingdom_news",
          npcLine: [
            "Flame Princess is fighting with her dad again!",
            "Something about dating a water elemental?",
            "The whole kingdom's in chaos! Great for business though!"
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "fire_kingdom_chaos",
                  detail: "Fire Kingdom having succession crisis"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "ice_king_news",
          npcLine: [
            "He kidnapped Wildberry Princess this time!",
            "But she escaped using her berry powers!",
            "He's getting desperate. Almost feel bad for the guy. Almost."
          ],
          end: true
        },
        {
          id: "marceline_news",
          npcLine: [
            "Yeah! She's been hanging around the kingdom at night!",
            "Some say she's friends with Princess Bubblegum!",
            "Others say... more than friends? But that's just gossip!"
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "marceline_visits",
                  detail: "Marceline secretly visits Princess Bubblegum"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "sell_lich_dust",
          npcLine: [
            "LICH DUST?! Where did you even GET this?!",
            "You know what, I don't want to know. Here's your gold!"
          ],
          effects: [
            {
              takeItem: { id: "lich_dust", qty: 1 }
            },
            {
              grantItem: { id: "gold", qty: 100 }
            },
            {
              factionDelta: {
                entity: "player",
                faction: "candy_merchants",
                delta: 15,
                reason: "rare_trade"
              }
            }
          ],
          end: true
        },
        {
          id: "sell_candy_corn",
          npcLine: "Candy corn! Classic! Not very valuable, but I'll take it!",
          effects: [
            {
              takeItem: { id: "candy_corn", qty: 1 }
            },
            {
              grantItem: { id: "gold", qty: 5 }
            }
          ],
          end: true
        },
        {
          id: "sell_crystal",
          npcLine: "Ooh, dungeon crystals! These power all sorts of magic stuff!",
          effects: [
            {
              takeItem: { id: "dungeon_crystal", qty: 1 }
            },
            {
              grantItem: { id: "gold", qty: 50 }
            }
          ],
          end: true
        }
      ]
    },

    // ========== CANDY NOBLE (Earl of Lemongrab style) ==========
    {
      biome: "candy_kingdom",
      npcType: "candy_noble",
      start: "noble_greeting",
      nodes: [
        {
          id: "noble_greeting",
          npcLine: "UNACCEPTABLE! Who dares approach without proper announcement?!",
          proudVariant: "You DARE approach the most noble of nobles?! STATE YOUR PURPOSE!",
          humbleVariant: "Oh, a visitor. How... unexpected. What brings you to my estate?",
          choices: [
            {
              text: "[Bow formally] My lord/lady, I seek an audience",
              next: "formal_greeting",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { respect: 15, value: 10 }
                  }
                }
              ]
            },
            {
              text: "I need information about the royal court",
              next: "court_info"
            },
            {
              text: "Chill out, I'm just passing through",
              next: "casual_response",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { respect: -10, value: -5 }
                  }
                }
              ]
            },
            {
              text: "Are you related to Lemongrab?",
              next: "lemongrab_connection",
              conditions: [
                { randomLT: 0.5 }
              ]
            }
          ]
        },
        {
          id: "formal_greeting",
          npcLine: [
            "Hmm... acceptable etiquette. BARELY acceptable!",
            "You may speak, but make it quick!",
            "I have a very important tea party at three!"
          ],
          choices: [
            {
              text: "I seek favor with Princess Bubblegum",
              next: "seek_pb_favor"
            },
            {
              text: "The kingdom faces threats that need addressing",
              next: "kingdom_threats"
            },
            {
              text: "I wish to learn about noble customs",
              next: "noble_customs"
            },
            {
              text: "I need a sponsor for the Royal Court",
              next: "court_sponsor"
            }
          ]
        },
        {
          id: "court_info",
          npcLine: [
            "The court? HAH! It's all politics and sugar-coating!",
            "Duke of Nuts thinks he runs everything,",
            "Countess Creampuff is plotting something,",
            "And don't get me started on Earl of Lemongrab!"
          ],
          choices: [
            {
              text: "What's wrong with Lemongrab?",
              next: "lemongrab_issues"
            },
            {
              text: "Tell me about these plots",
              next: "noble_plots"
            },
            {
              text: "How does one gain influence at court?",
              next: "gain_influence"
            }
          ]
        },
        {
          id: "casual_response",
          npcLine: [
            "CHILL OUT?! CHILL. OUT?!",
            "THIS IS CASTLE LEMONGRAB- wait, no, this is MY estate!",
            "SEVEN YEARS DUNGEON! No trial!"
          ],
          choices: [
            {
              text: "Whoa, sorry! I meant no disrespect!",
              next: "apologize_noble",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 5, respect: 3 }
                  }
                }
              ]
            },
            {
              text: "You can't send me to the dungeon!",
              next: "challenge_authority"
            },
            {
              text: "Seven years? That's excessive",
              next: "negotiate_sentence"
            }
          ]
        },
        {
          id: "lemongrab_connection",
          npcLine: [
            "Lemongrab?! That UNACCEPTABLE excuse for nobility?!",
            "We're... distant cousins. VERY distant!",
            "He gives all us lemon nobility a bad name with his screaming!"
          ],
          choices: [
            {
              text: "But you're screaming too...",
              next: "point_out_screaming",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -5, respect: -3 }
                  }
                }
              ]
            },
            {
              text: "He does seem rather extreme",
              next: "agree_lemongrab"
            },
            {
              text: "Tell me about lemon nobility",
              next: "lemon_nobility"
            }
          ]
        },
        {
          id: "seek_pb_favor",
          npcLine: [
            "Princess Bubblegum barely acknowledges us nobles anymore!",
            "Too busy with her 'science' and 'protecting the kingdom'!",
            "If you want her attention, you need to be USEFUL or DANGEROUS!"
          ],
          choices: [
            {
              text: "How can I prove myself useful?",
              next: "prove_useful"
            },
            {
              text: "What would she consider dangerous?",
              next: "dangerous_info"
            },
            {
              text: "Can you introduce me to her?",
              next: "pb_introduction",
              conditions: [
                {
                  relationAtLeast: {
                    target: "npc",
                    metric: "respect",
                    value: 50
                  }
                }
              ]
            }
          ]
        },
        {
          id: "kingdom_threats",
          npcLine: [
            "Threats? The kingdom is ALWAYS under threat!",
            "The Lich's influence seeps from the dungeon,",
            "Ice King harasses our princesses,",
            "And don't forget the cosmic entities that show up every Tuesday!"
          ],
          choices: [
            {
              text: "The Lich is still active?",
              next: "lich_active",
              effects: [
                {
                  setFlag: { flag: "noble_lich_warning", value: true }
                }
              ]
            },
            {
              text: "Cosmic entities every Tuesday?",
              next: "cosmic_threats"
            },
            {
              text: "I can help defend the kingdom",
              next: "offer_defense",
              effects: [
                {
                  startQuest: { id: "noble_defense_quest" }
                }
              ]
            }
          ]
        },
        {
          id: "noble_customs",
          npcLine: [
            "You want to learn proper behavior? FINALLY someone with sense!",
            "Rule one: ALWAYS announce yourself with your full title!",
            "Rule two: NEVER eat the furniture, even if it's candy!",
            "Rule three: Screaming is an acceptable form of communication!"
          ],
          choices: [
            {
              text: "What if I don't have a title?",
              next: "no_title"
            },
            {
              text: "Why can't I eat candy furniture?",
              next: "candy_furniture"
            },
            {
              text: "Is screaming really necessary?",
              next: "about_screaming"
            }
          ]
        },
        {
          id: "court_sponsor",
          npcLine: [
            "You want ME to sponsor you? UNACCEPTABLE!",
            "Unless... you can prove your worth!",
            "Retrieve my stolen heirloom from the Candy Dungeon!"
          ],
          choices: [
            {
              text: "What heirloom?",
              next: "heirloom_info"
            },
            {
              text: "I accept your quest",
              next: "accept_heirloom_quest",
              effects: [
                {
                  startQuest: { id: "noble_heirloom" }
                },
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 10, trust: 5 }
                  }
                }
              ]
            },
            {
              text: "That sounds dangerous",
              next: "dangerous_quest"
            }
          ]
        },
        {
          id: "lemongrab_issues",
          npcLine: [
            "He has his own kingdom now! Castle Lemongrab!",
            "Created a whole civilization of lemon people!",
            "They're all COMPLETELY UNACCEPTABLE! But also... family."
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "castle_lemongrab",
                  detail: "Lemongrab has his own kingdom of lemon people"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "noble_plots",
          npcLine: [
            "Duke of Nuts wants to replace the Banana Guards with nut soldiers!",
            "Countess Creampuff is hoarding rare sugars!",
            "And someone's been spreading rumors about Princess Bubblegum's past!"
          ],
          choices: [
            {
              text: "What rumors about the Princess?",
              next: "pb_rumors",
              conditions: [
                {
                  relationAtLeast: {
                    target: "npc",
                    metric: "trust",
                    value: 40
                  }
                }
              ]
            },
            {
              text: "Should we stop these plots?",
              next: "stop_plots"
            },
            {
              text: "Sounds like typical noble drama",
              end: true
            }
          ]
        },
        {
          id: "gain_influence",
          npcLine: [
            "Money! Connections! Blackmail! The three pillars of nobility!",
            "Or you could actually DO something heroic. But that's so pedestrian!"
          ],
          choices: [
            {
              text: "I prefer the heroic route",
              next: "heroic_path"
            },
            {
              text: "Tell me more about blackmail",
              next: "blackmail_info",
              conditions: [
                { hasTrait: "ambitious" }
              ]
            },
            {
              text: "How much money are we talking?",
              next: "money_talk",
              conditions: [
                { hasTrait: "greedy" }
              ]
            }
          ]
        },
        {
          id: "apologize_noble",
          npcLine: [
            "Hmm... ONE YEAR DUNGEON!",
            "Wait, no... THREE MONTHS!",
            "Fine! You're free to go! But WATCH YOUR TONE!"
          ],
          end: true
        },
        {
          id: "challenge_authority",
          npcLine: [
            "I CAN'T?! I CAN'T?!",
            "Guards! GUARDS! Oh wait, I forgot to hire guards...",
            "UNACCEPTABLE! Leave before I remember where I put my sword!"
          ],
          choices: [
            {
              text: "I'm leaving, I'm leaving!",
              end: true
            },
            {
              text: "You don't even have guards?",
              next: "no_guards",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -10, respect: -15 }
                  }
                }
              ]
            }
          ]
        },
        {
          id: "negotiate_sentence",
          npcLine: [
            "Excessive? EXCESSIVE?!",
            "Fine! Six years, eleven months, and twenty-nine days!",
            "That's my final offer!"
          ],
          choices: [
            {
              text: "How about community service instead?",
              next: "community_service"
            },
            {
              text: "This is ridiculous, I'm leaving",
              end: true
            }
          ]
        },
        {
          id: "point_out_screaming",
          npcLine: [
            "I'M NOT SCREAMING! THIS IS MY INDOOR VOICE!",
            "MY OUTDOOR VOICE IS MUCH LOUDER!",
            "WOULD YOU LIKE TO HEAR IT?!"
          ],
          choices: [
            {
              text: "No, please, indoor voice is fine!",
              end: true
            },
            {
              text: "Sure, let's hear it",
              next: "outdoor_voice"
            }
          ]
        },
        {
          id: "agree_lemongrab",
          npcLine: [
            "Finally, someone with SENSE!",
            "He makes all nobility look bad!",
            "We're supposed to be refined! Cultured! Only moderately unhinged!"
          ],
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 10, trust: 5 }
              }
            }
          ],
          end: true
        },
        {
          id: "lemon_nobility",
          npcLine: [
            "We're an ancient and noble line! Created by Princess Bubblegum herself!",
            "Though she considers us... failed experiments.",
            "UNACCEPTABLE! We're perfectly functional members of society!"
          ],
          end: true
        },
        {
          id: "prove_useful",
          npcLine: [
            "Solve problems! The dungeon ooze, the Pup Gang, the Ice King!",
            "Or bring her rare scientific components!",
            "She loves anything that glows or explodes!"
          ],
          effects: [
            {
              setFlag: { flag: "knows_pb_interests", value: true }
            }
          ],
          end: true
        },
        {
          id: "dangerous_info",
          npcLine: [
            "Anything related to the Lich gets her attention immediately!",
            "Or threats to her candy people. She's very protective.",
            "Just don't BECOME the threat. That ends badly."
          ],
          end: true
        },
        {
          id: "pb_introduction",
          npcLine: [
            "Very well! You've shown proper respect!",
            "Take this letter of introduction to Peppermint Butler.",
            "He'll arrange an audience. Maybe. If he likes you."
          ],
          effects: [
            {
              grantItem: { id: "noble_introduction_letter", qty: 1 }
            },
            {
              setFlag: { flag: "has_noble_introduction", value: true }
            }
          ],
          end: true
        },
        {
          id: "lich_active",
          npcLine: [
            "Not HIM directly, but his essence lingers!",
            "Corrupting things, whispering to the weak-minded!",
            "Princess Bubblegum has contingency plans, but still..."
          ],
          choices: [
            {
              text: "What contingency plans?",
              next: "pb_contingency"
            },
            {
              text: "Where is this corruption strongest?",
              next: "corruption_location"
            },
            {
              text: "I'll investigate this",
              next: "investigate_lich",
              effects: [
                {
                  startQuest: { id: "investigate_lich_corruption" }
                }
              ]
            }
          ]
        },
        {
          id: "cosmic_threats",
          npcLine: [
            "Oh yes! Cosmic Owl, Party God, that weird cube thing!",
            "They just show up, cause chaos, then leave!",
            "Princess Bubblegum has a whole department for it!"
          ],
          end: true
        },
        {
          id: "offer_defense",
          npcLine: [
            "You? Defend the kingdom? PROVE IT!",
            "Clear the Cotton Candy Wolves from my summer estate!",
            "Then we'll talk about kingdom defense!"
          ],
          end: true
        },
        {
          id: "no_title",
          npcLine: [
            "NO TITLE?! Then make one up!",
            "'Hero of Something!' 'Destroyer of Whatever!'",
            "A noble without a title is like candy without sugar!"
          ],
          end: true
        },
        {
          id: "candy_furniture",
          npcLine: [
            "Because it's FURNITURE! We're civilized!",
            "What's next, eating the walls? The floors?",
            "We have STANDARDS! Low ones, but still!"
          ],
          end: true
        },
        {
          id: "about_screaming",
          npcLine: "ABSOLUTELY! It shows passion! Authority! Mild insanity! All noble qualities!",
          end: true
        },
        {
          id: "heirloom_info",
          npcLine: [
            "The Lemon Crown! Passed down for generations!",
            "Well, three generations. We're not that old.",
            "Some dungeon creature stole it! UNACCEPTABLE!"
          ],
          end: true
        },
        {
          id: "accept_heirloom_quest",
          npcLine: [
            "Excellent! It's on level 5 of the dungeon!",
            "Watch out for the Dungeon of the Crystal Eye!",
            "And the ooze. And the monsters. And the traps. Good luck!"
          ],
          end: true
        },
        {
          id: "dangerous_quest",
          npcLine: [
            "Of course it's dangerous! That's why I'm not doing it!",
            "What's the point of hiring heroes if they won't hero?"
          ],
          end: true
        },
        {
          id: "pb_rumors",
          npcLine: [
            "They say she's hundreds of years old!",
            "That she was once pure bubblegum, before the Mushroom War!",
            "And that she has a secret dungeon for failed experiments!"
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "pb_dark_secrets",
                  detail: "Princess Bubblegum has dark secrets from before the kingdom"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "stop_plots",
          npcLine: [
            "Stop them? Why? It's entertainment!",
            "Besides, they never succeed. Princess Bubblegum is too smart!",
            "Though if you want to meddle, be my guest!"
          ],
          end: true
        },
        {
          id: "heroic_path",
          npcLine: [
            "Ugh, how noble of you. In the boring way!",
            "Fine! Go slay monsters and save people!",
            "Just remember us nobles when you're famous!"
          ],
          end: true
        },
        {
          id: "blackmail_info",
          npcLine: [
            "Everyone has secrets! Even Princess Bubblegum!",
            "Especially Peppermint Butler! That mint is DARK!",
            "Find secrets, use them wisely, gain power!"
          ],
          end: true
        },
        {
          id: "money_talk",
          npcLine: [
            "Thousands! Tens of thousands!",
            "The royal treasury is vast!",
            "Of course, you need money to make money..."
          ],
          end: true
        },
        {
          id: "no_guards",
          npcLine: [
            "Guards are expensive! And they eat all my food!",
            "I have defense systems! Somewhere... I think...",
            "LEAVE NOW OR FACE MY WRATH!"
          ],
          end: true
        },
        {
          id: "community_service",
          npcLine: [
            "Community service? Hmm... ACCEPTABLE!",
            "Clean my entire estate! Polish every lemon!",
            "Should only take... three years!"
          ],
          end: true
        },
        {
          id: "outdoor_voice",
          npcLine: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHHHHHHHHHHHH!!!",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: -5, fear: 10 }
              }
            },
            {
              emitEvent: {
                type: "ScreenShake",
                payload: { intensity: "extreme" }
              }
            }
          ],
          end: true
        },
        {
          id: "pb_contingency",
          npcLine: [
            "She won't tell anyone! But I've heard rumors...",
            "Something about 'Gumbald Protocol' and 'Final Solution'.",
            "Sounds ominous! Probably involves science!"
          ],
          end: true
        },
        {
          id: "corruption_location",
          npcLine: [
            "The lowest levels of the Candy Dungeon!",
            "Near the old Mushroom War relics!",
            "DON'T GO ALONE! Unless you want to become Lich food!"
          ],
          end: true
        },
        {
          id: "investigate_lich",
          npcLine: [
            "Brave! Stupid, but brave!",
            "Take this charm. It might help. Or it might be candy.",
            "I forget which!"
          ],
          effects: [
            {
              grantItem: { id: "questionable_charm", qty: 1 }
            }
          ],
          end: true
        }
      ]
    },

    // ========== PEPPERMINT BUTLER (Special NPC) ==========
    {
      biome: "candy_kingdom",
      npcType: "peppermint_butler",
      start: "butler_greeting",
      nodes: [
        {
          id: "butler_greeting",
          npcLine: [
            "Good evening. I am Peppermint Butler.",
            "How may I assist you today?"
          ],
          choices: [
            {
              text: "I need to see Princess Bubblegum",
              next: "see_princess"
            },
            {
              text: "I've heard you practice dark magic",
              next: "dark_magic_confrontation"
            },
            {
              text: "The kingdom is in danger",
              next: "kingdom_danger"
            },
            {
              text: "[Show noble introduction letter]",
              next: "noble_letter",
              conditions: [
                { hasItem: "noble_introduction_letter" }
              ]
            },
            {
              text: "Just passing through",
              next: "passing_through"
            }
          ]
        },
        {
          id: "see_princess",
          npcLine: [
            "Princess Bubblegum is currently engaged in critical research.",
            "Unless you have urgent business, I cannot disturb her."
          ],
          choices: [
            {
              text: "I have information about the Lich",
              next: "lich_information",
              conditions: [
                { flagTrue: "heard_lich_rumor" }
              ]
            },
            {
              text: "The Candy Dungeon is compromised",
              next: "dungeon_warning",
              conditions: [
                { flagTrue: "knows_dungeon_problem" }
              ]
            },
            {
              text: "I'll solve a kingdom problem first",
              next: "solve_problem"
            },
            {
              text: "Can I make an appointment?",
              next: "appointment"
            }
          ]
        },
        {
          id: "dark_magic_confrontation",
          npcLine: [
            "I see. You are well-informed.",
            "My studies are... extensive. But always in service to the Princess.",
            "Is this a threat, or mere curiosity?"
          ],
          choices: [
            {
              text: "Just curious about your abilities",
              next: "curious_magic",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 5, respect: 5 }
                  }
                }
              ]
            },
            {
              text: "I need protection from dark forces",
              next: "need_protection"
            },
            {
              text: "It's dangerous and wrong",
              next: "condemn_magic",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: -10, respect: -5 }
                  }
                }
              ]
            },
            {
              text: "Could you teach me?",
              next: "learn_magic",
              conditions: [
                {
                  relationAtLeast: {
                    target: "npc",
                    metric: "trust",
                    value: 50
                  }
                }
              ]
            }
          ]
        },
        {
          id: "kingdom_danger",
          npcLine: "The kingdom is always in some form of danger. Please be specific.",
          choices: [
            {
              text: "The Lich's corruption spreads from the dungeon",
              next: "lich_corruption"
            },
            {
              text: "There's a conspiracy among the nobles",
              next: "noble_conspiracy"
            },
            {
              text: "Ice King is planning something big",
              next: "ice_king_plot"
            },
            {
              text: "The Pup Gang is out of control",
              next: "pup_gang_issue"
            }
          ]
        },
        {
          id: "noble_letter",
          npcLine: [
            "Ah, a letter of introduction. Let me see...",
            "Everything appears to be in order.",
            "Princess Bubblegum can see you tomorrow at dawn. Do not be late."
          ],
          effects: [
            {
              setFlag: { flag: "pb_appointment_dawn", value: true }
            },
            {
              takeItem: { id: "noble_introduction_letter", qty: 1 }
            },
            {
              grantItem: { id: "royal_appointment_token", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "passing_through",
          npcLine: [
            "Very well. Please respect the castle grounds.",
            "And do not eat the architecture. It upsets the Princess."
          ],
          end: true
        },
        {
          id: "lich_information",
          npcLine: [
            "The Lich? This is indeed urgent.",
            "Follow me immediately. The Princess must hear this."
          ],
          effects: [
            {
              setFlag: { flag: "urgent_pb_meeting_peppermint", value: true }
            },
            {
              completeQuest: { id: "report_lich_activity_butler" }
            }
          ],
          end: true
        },
        {
          id: "dungeon_warning",
          npcLine: [
            "The dungeon? We are aware of certain... anomalies.",
            "If you have new information, the Princess should know.",
            "She will see you within the hour."
          ],
          effects: [
            {
              setFlag: { flag: "pb_meeting_scheduled", value: true }
            }
          ],
          end: true
        },
        {
          id: "solve_problem",
          npcLine: [
            "A practical approach. I approve.",
            "The Pup Gang has been particularly troublesome.",
            "Or you could investigate the Cotton Candy Forest disturbances."
          ],
          choices: [
            {
              text: "I'll handle the Pup Gang",
              next: "pup_gang_mission",
              effects: [
                {
                  startQuest: { id: "butler_pup_gang" }
                }
              ]
            },
            {
              text: "The forest sounds more interesting",
              next: "forest_mission",
              effects: [
                {
                  startQuest: { id: "butler_forest_investigation" }
                }
              ]
            }
          ]
        },
        {
          id: "appointment",
          npcLine: [
            "The Princess's schedule is... complex.",
            "Prove your worth to the kingdom first.",
            "Then we shall discuss appointments."
          ],
          end: true
        },
        {
          id: "curious_magic",
          npcLine: [
            "Curiosity is admirable, if dangerous.",
            "I have studied many arts: demon summoning, shadow manipulation, soul binding.",
            "All to better protect the Princess and her kingdom."
          ],
          choices: [
            {
              text: "Have you ever summoned a demon?",
              next: "demon_summoning"
            },
            {
              text: "Does the Princess approve?",
              next: "pb_approval"
            },
            {
              text: "What's the most powerful spell you know?",
              next: "powerful_spell"
            }
          ]
        },
        {
          id: "need_protection",
          npcLine: [
            "Dark forces, you say? Be more specific.",
            "Different threats require different protections."
          ],
          choices: [
            {
              text: "Protection from the Lich",
              next: "lich_protection"
            },
            {
              text: "Protection from curses",
              next: "curse_protection"
            },
            {
              text: "Protection from demons",
              next: "demon_protection"
            }
          ]
        },
        {
          id: "condemn_magic",
          npcLine: [
            "Your opinion is noted. And dismissed.",
            "I do what I must to protect this kingdom.",
            "If you cannot understand that, please leave."
          ],
          end: true
        },
        {
          id: "learn_magic",
          npcLine: [
            "You wish to walk the dark path?",
            "It requires sacrifice. Dedication. And a strong stomach.",
            "Meet me at midnight in the castle crypts. Come alone."
          ],
          effects: [
            {
              startQuest: { id: "dark_magic_training" }
            },
            {
              setFlag: { flag: "peppermint_butler_apprentice", value: true }
            }
          ],
          end: true
        },
        {
          id: "lich_corruption",
          npcLine: [
            "We are monitoring the situation closely.",
            "If you wish to help, investigate level 7 of the dungeon.",
            "Report back with your findings. If you survive."
          ],
          effects: [
            {
              startQuest: { id: "investigate_dungeon_level_7" }
            }
          ],
          end: true
        },
        {
          id: "noble_conspiracy",
          npcLine: [
            "The nobles are always conspiring. It's their nature.",
            "However, if you have specific evidence...",
            "The Princess values actionable intelligence."
          ],
          choices: [
            {
              text: "Duke of Nuts plans to replace the Banana Guards",
              next: "duke_plot",
              conditions: [
                { flagTrue: "knows_duke_plot" }
              ]
            },
            {
              text: "Someone's spreading rumors about the Princess",
              next: "pb_rumors_butler"
            },
            {
              text: "I'll gather more evidence",
              next: "gather_evidence"
            }
          ]
        },
        {
          id: "ice_king_plot",
          npcLine: [
            "Ice King is more nuisance than threat usually.",
            "But if he's planning something larger...",
            "We should increase surveillance."
          ],
          end: true
        },
        {
          id: "pup_gang_issue",
          npcLine: [
            "Those miscreants have become bolder lately.",
            "They've stolen from the royal vault twice this month.",
            "Capture them, and the Princess will be grateful."
          ],
          effects: [
            {
              startQuest: { id: "capture_pup_gang" }
            }
          ],
          end: true
        },
        {
          id: "pup_gang_mission",
          npcLine: [
            "They frequent the Candy Convenience Store after dark.",
            "Use stealth or force, I care not.",
            "Just bring them to justice."
          ],
          end: true
        },
        {
          id: "forest_mission",
          npcLine: [
            "The Cotton Candy Wolves have been acting strangely.",
            "Something stirs in the forest depths.",
            "Investigate, but do not go alone if you value your life."
          ],
          end: true
        },
        {
          id: "demon_summoning",
          npcLine: [
            "Several times. It's a useful skill.",
            "Demons provide information, power, favors...",
            "For a price, of course. Always a price."
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "butler_summons_demons",
                  detail: "Peppermint Butler regularly summons demons"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "pb_approval",
          npcLine: [
            "The Princess is... aware of my studies.",
            "She neither condones nor condemns them.",
            "She is pragmatic. Results matter more than methods."
          ],
          end: true
        },
        {
          id: "powerful_spell",
          npcLine: [
            "That would be telling.",
            "But let's say it involves the boundary between life and death.",
            "I've already said too much."
          ],
          end: true
        },
        {
          id: "lich_protection",
          npcLine: [
            "The Lich is beyond normal protection.",
            "But this amulet will provide some resistance.",
            "It won't save you, but it might give you time to run."
          ],
          effects: [
            {
              grantItem: { id: "anti_lich_amulet", qty: 1 }
            },
            {
              takeItem: { id: "gold", qty: 100 }
            }
          ],
          end: true
        },
        {
          id: "curse_protection",
          npcLine: [
            "A ward against curses? Simple enough.",
            "Wear this mint leaf. It's been properly prepared.",
            "Change it weekly or it loses potency."
          ],
          effects: [
            {
              grantItem: { id: "curse_ward_mint", qty: 1 }
            },
            {
              takeItem: { id: "gold", qty: 50 }
            }
          ],
          end: true
        },
        {
          id: "demon_protection",
          npcLine: [
            "Demons respect strength and contracts.",
            "This sigil will mark you as under my protection.",
            "Most lesser demons will avoid you."
          ],
          effects: [
            {
              grantItem: { id: "butler_protection_sigil", qty: 1 }
            },
            {
              setFlag: { flag: "butler_demon_protection", value: true }
            }
          ],
          end: true
        },
        {
          id: "duke_plot",
          npcLine: [
            "Interesting. The Duke grows bold.",
            "The Princess will want to know immediately.",
            "You've done the kingdom a service."
          ],
          effects: [
            {
              factionDelta: {
                entity: "player",
                faction: "candy_royalty",
                delta: 20,
                reason: "vital_intelligence"
              }
            },
            {
              completeQuest: { id: "expose_duke_plot" }
            }
          ],
          end: true
        },
        {
          id: "pb_rumors_butler",
          npcLine: [
            "Rumors about the Princess are dangerous.",
            "Find the source. Silence them if necessary.",
            "Discretion is paramount."
          ],
          effects: [
            {
              startQuest: { id: "silence_rumors" }
            }
          ],
          end: true
        },
        {
          id: "gather_evidence",
          npcLine: [
            "Wise. Half-truths help no one.",
            "The castle has many ears. Listen carefully.",
            "Report back when you have something concrete."
          ],
          end: true
        }
      ]
    },

    // ========== ROOT BEER GUY (Tavern Owner/Detective) ==========
    {
      biome: "candy_kingdom",
      npcType: "root_beer_guy",
      start: "tavern_greeting",
      nodes: [
        {
          id: "tavern_greeting",
          npcLine: [
            "Welcome to the Candy Tavern!",
            "I'm Root Beer Guy - bartender, detective, and novelist.",
            "What can I do for you?"
          ],
          choices: [
            {
              text: "I'd like a drink",
              next: "order_drink"
            },
            {
              text: "I need a detective",
              next: "detective_services"
            },
            {
              text: "Tell me about your novel",
              next: "novel_talk"
            },
            {
              text: "Any interesting rumors?",
              next: "tavern_rumors"
            },
            {
              text: "I need a place to rest",
              next: "room_rental"
            }
          ]
        },
        {
          id: "order_drink",
          npcLine: "What'll it be? We've got the finest beverages in the Candy Kingdom!",
          choices: [
            {
              text: "Root Beer Float (5 gold)",
              next: "buy_float",
              conditions: [{ hasGold: 5 }]
            },
            {
              text: "Candy Corn Whiskey (10 gold)",
              next: "buy_whiskey",
              conditions: [{ hasGold: 10 }]
            },
            {
              text: "Mystery Punch (15 gold) - Random effect!",
              next: "buy_mystery",
              conditions: [{ hasGold: 15 }]
            },
            {
              text: "Just water",
              next: "just_water"
            }
          ]
        },
        {
          id: "detective_services",
          npcLine: [
            "Ah, my true passion! I solve mysteries on the side.",
            "Missing persons, theft, supernatural occurrences...",
            "What's the case?"
          ],
          choices: [
            {
              text: "Someone's stealing jawbreakers",
              next: "jawbreaker_case",
              conditions: [{ flagTrue: "knows_jawbreaker_thief" }]
            },
            {
              text: "I need to find someone",
              next: "missing_person"
            },
            {
              text: "There's something weird in the dungeon",
              next: "dungeon_mystery"
            },
            {
              text: "Never mind",
              end: true
            }
          ]
        },
        {
          id: "novel_talk",
          npcLine: [
            "It's a crime noir set in a root beer factory!",
            "The protagonist is a tough-talking soda jerk who uncovers",
            "a conspiracy that goes all the way to the top!"
          ],
          choices: [
            {
              text: "Sounds exciting!",
              next: "novel_excited",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 10, trust: 5 }
                  }
                }
              ]
            },
            {
              text: "Based on a true story?",
              next: "novel_true"
            },
            {
              text: "Good luck with that",
              end: true
            }
          ]
        },
        {
          id: "tavern_rumors",
          npcLine: [
            "This tavern hears everything!",
            "What kind of information are you after?"
          ],
          choices: [
            {
              text: "Political intrigue",
              next: "political_rumors"
            },
            {
              text: "Criminal activity",
              next: "crime_rumors"
            },
            {
              text: "Strange occurrences",
              next: "strange_rumors"
            },
            {
              text: "Romance gossip",
              next: "romance_rumors"
            }
          ]
        },
        {
          id: "room_rental",
          npcLine: [
            "We have rooms upstairs! 20 gold per night.",
            "Includes breakfast and protection from bar fights."
          ],
          choices: [
            {
              text: "I'll take a room",
              next: "rent_room",
              conditions: [{ hasGold: 20 }],
              effects: [
                {
                  takeItem: { id: "gold", qty: 20 }
                },
                {
                  setFlag: { flag: "has_tavern_room", value: true }
                }
              ]
            },
            {
              text: "Too expensive",
              next: "too_expensive"
            }
          ]
        },
        {
          id: "buy_float",
          npcLine: "My specialty! This'll put fizz in your step!",
          effects: [
            {
              takeItem: { id: "gold", qty: 5 }
            },
            {
              grantItem: { id: "root_beer_float", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_whiskey",
          npcLine: "Strong stuff! Don't operate any Banana Guard equipment after drinking!",
          effects: [
            {
              takeItem: { id: "gold", qty: 10 }
            },
            {
              grantItem: { id: "candy_corn_whiskey", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "buy_mystery",
          npcLine: [
            "Ooh, feeling adventurous!",
            "This batch was made by Peppermint Butler...",
            "Good luck!"
          ],
          effects: [
            {
              takeItem: { id: "gold", qty: 15 }
            },
            {
              grantItem: { id: "mystery_punch", qty: 1 }
            },
            {
              randomLT: 0.5,
              setFlag: { flag: "mystery_punch_good", value: true }
            }
          ],
          end: true
        },
        {
          id: "just_water",
          npcLine: "Water? In a tavern? Well, okay... It's free, I guess.",
          end: true
        },
        {
          id: "jawbreaker_case",
          npcLine: [
            "The Jawbreaker Thief! I've been tracking this case!",
            "Small perpetrator, enters through vents, strikes at night...",
            "I suspect the Candy Orphans, but I need proof!"
          ],
          choices: [
            {
              text: "I'll investigate the orphanage",
              next: "investigate_orphanage",
              effects: [
                {
                  startQuest: { id: "jawbreaker_thief_case" }
                }
              ]
            },
            {
              text: "Could be someone else",
              next: "other_suspects"
            }
          ]
        },
        {
          id: "missing_person",
          npcLine: "Who are you looking for? I know most everyone in the kingdom.",
          choices: [
            {
              text: "A specific Banana Guard",
              next: "find_guard"
            },
            {
              text: "Someone who disappeared in the dungeon",
              next: "dungeon_missing"
            },
            {
              text: "Actually, never mind",
              end: true
            }
          ]
        },
        {
          id: "dungeon_mystery",
          npcLine: [
            "The dungeon's always been weird, but lately...",
            "Green ooze, strange sounds, missing prisoners...",
            "I'd investigate myself, but Cherry Cream Soda would kill me!"
          ],
          end: true
        },
        {
          id: "novel_excited",
          npcLine: [
            "Thanks! You really think so?",
            "Maybe you'd like to read the first chapter?",
            "I always need feedback!"
          ],
          choices: [
            {
              text: "Sure, I'll read it",
              next: "read_chapter",
              effects: [
                {
                  grantItem: { id: "novel_chapter_1", qty: 1 }
                }
              ]
            },
            {
              text: "Maybe later",
              end: true
            }
          ]
        },
        {
          id: "novel_true",
          npcLine: [
            "Let's just say... I've seen things in this tavern.",
            "Things that would curdle your fizz!",
            "But I change the names to protect the guilty."
          ],
          end: true
        },
        {
          id: "political_rumors",
          npcLine: [
            "Duke of Nuts is planning something with his nut army.",
            "Princess Bubblegum hasn't held court in weeks.",
            "And Lemongrab's been unusually quiet... Too quiet."
          ],
          effects: [
            {
              emitEvent: {
                type: "RumorShared",
                payload: {
                  id: "political_unrest",
                  detail: "Multiple nobles plotting in the Candy Kingdom"
                }
              }
            }
          ],
          end: true
        },
        {
          id: "crime_rumors",
          npcLine: [
            "The Pup Gang hit three shops this week!",
            "Someone's smuggling illegal candy through the sewers.",
            "And there's a black market for Princess Bubblegum's science stuff."
          ],
          choices: [
            {
              text: "Tell me about the smuggling",
              next: "smuggling_info"
            },
            {
              text: "Black market science?",
              next: "black_market_info"
            }
          ]
        },
        {
          id: "strange_rumors",
          npcLine: [
            "Folks say they've seen the Lich's shadow in their dreams.",
            "The Cosmic Owl's been spotted more than usual.",
            "And something big is moving under the Cotton Candy Forest."
          ],
          effects: [
            {
              setFlag: { flag: "cosmic_disturbances", value: true }
            }
          ],
          end: true
        },
        {
          id: "romance_rumors",
          npcLine: [
            "Oh, you want the juicy stuff!",
            "Princess Bubblegum and Marceline have been seen together a lot.",
            "And Lady Rainicorn is expecting! Jake's gonna be a dad!"
          ],
          end: true
        },
        {
          id: "rent_room",
          npcLine: [
            "Great! Room 3 is available. Up the stairs, third door.",
            "Breakfast is at 8, and please ignore any screaming from room 5.",
            "That's just our permanent guest. He has nightmares."
          ],
          end: true
        },
        {
          id: "too_expensive",
          npcLine: [
            "I understand. Times are tough.",
            "You could try the Candy Orphanage.",
            "They sometimes let travelers sleep in the playroom."
          ],
          end: true
        },
        {
          id: "investigate_orphanage",
          npcLine: [
            "Be careful! Those orphans are tougher than they look.",
            "And the matron, Ms. Butterscotch, is very protective.",
            "Report back with what you find!"
          ],
          end: true
        },
        {
          id: "other_suspects",
          npcLine: [
            "You're right to keep an open mind!",
            "Could be gnomes, or candy rats, or even a rogue Banana Guard!",
            "A good detective considers all possibilities!"
          ],
          end: true
        },
        {
          id: "find_guard",
          npcLine: [
            "They all look the same to most people, but I know them all!",
            "There's Barry, Bob, Barbara, Banana Guard 16, Steve...",
            "Which one are you looking for?"
          ],
          end: true
        },
        {
          id: "dungeon_missing",
          npcLine: [
            "People who disappear in the dungeon usually don't come back.",
            "But I'll keep an ear out. What's their name?"
          ],
          end: true
        },
        {
          id: "read_chapter",
          npcLine: [
            "Great! Let me know what you think!",
            "Especially the part where the protagonist discovers",
            "the secret ingredient is actually tears!"
          ],
          end: true
        },
        {
          id: "smuggling_info",
          npcLine: [
            "Someone's moving illegal rock candy through the sewers.",
            "It's the really hard stuff - can break teeth!",
            "The Banana Guards are too scared to investigate."
          ],
          effects: [
            {
              startQuest: { id: "candy_smuggling_ring" }
            }
          ],
          end: true
        },
        {
          id: "black_market_info",
          npcLine: [
            "Failed experiments, prototype weapons, scientific formulas...",
            "Someone in the castle is selling Princess Bubblegum's secrets!",
            "Could be worth investigating... carefully."
          ],
          effects: [
            {
              setFlag: { flag: "knows_science_black_market", value: true }
            }
          ],
          end: true
        }
      ]
    }
  ]
};