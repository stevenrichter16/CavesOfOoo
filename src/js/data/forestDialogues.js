// Dialogue trees for The Forest inhabitants
// Based on Adventure Time forest characters

export const forestDialogues = {
  trees: [
    // ========== MOMMA BEAR ==========
    {
      biome: "forest",
      npcType: "momma_bear",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "Oh my! A visitor! You better not be here to cause trouble for my boy!",
          choices: [
            {
              text: "I'm just passing through, ma'am",
              next: "peaceful"
            },
            {
              text: "Is your son okay?",
              next: "concern_for_son"
            },
            {
              text: "Have you seen any foxes with sweet teeth?",
              next: "fox_question",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "I should go",
              end: true
            }
          ]
        },
        {
          id: "peaceful",
          npcLine: "Well, that's fine then. Just stay away from those nasty foxes. They've been trying to eat anything sweet!",
          choices: [
            {
              text: "I'm actually hunting them",
              next: "hunting_foxes",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Thanks for the warning",
              end: true
            }
          ]
        },
        {
          id: "concern_for_son",
          npcLine: [
            "He's going through a phase. Thinks he's too cool for his mother!",
            "But I still make him honey sandwiches every day."
          ],
          choices: [
            {
              text: "Sounds like a good mom",
              next: "good_mom",
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
              text: "Teenagers, right?",
              next: "teenager_talk"
            }
          ]
        },
        {
          id: "fox_question",
          npcLine: [
            "Oh those HORRIBLE creatures! Yes, I've seen them!",
            "They tried to take a bite out of Mrs. Cow last week!",
            "I saw three of them near the old hollow tree to the east."
          ],
          choices: [
            {
              text: "Thanks for the tip!",
              end: true
            },
            {
              text: "I'll take care of them",
              next: "hero_promise"
            }
          ]
        },
        {
          id: "hunting_foxes",
          npcLine: "Good! Someone needs to knock some sense into them! Just don't kill them - they're still forest creatures.",
          end: true
        },
        {
          id: "hero_promise",
          npcLine: "Bless you, dear. The forest will be safer with those teeth removed!",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 15, respect: 10 }
              }
            }
          ],
          end: true
        }
      ]
    },

    // ========== TEENAGE BEAR ==========
    {
      biome: "forest",
      npcType: "teenage_bear",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "Ugh, what do YOU want? Can't you see I'm busy being cool?",
          choices: [
            {
              text: "You don't look that cool",
              next: "not_cool"
            },
            {
              text: "Sorry to bother you",
              next: "apologize"
            },
            {
              text: "Seen any Sweet Tooth Foxes?",
              next: "fox_info",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Whatever, later",
              end: true
            }
          ]
        },
        {
          id: "not_cool",
          npcLine: "What?! I'm the COOLEST bear in this forest! I don't even NEED my mom's sandwiches!",
          choices: [
            {
              text: "But you still eat them",
              next: "caught"
            },
            {
              text: "Sure you are, kid",
              end: true
            }
          ]
        },
        {
          id: "caught",
          npcLine: "...They're really good sandwiches, okay? Don't tell anyone!",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 5, trust: 10 }
              }
            }
          ],
          end: true
        },
        {
          id: "fox_info",
          npcLine: [
            "Oh yeah, those losers? They hang out by the pond sometimes.",
            "They think they're so tough with their sharp sweet teeth.",
            "I could totally take them if I wanted to!"
          ],
          choices: [
            {
              text: "Why don't you then?",
              next: "challenge"
            },
            {
              text: "Thanks for the info",
              end: true
            }
          ]
        },
        {
          id: "challenge",
          npcLine: "Because... uh... Mom said I can't fight. Yeah, that's why!",
          end: true
        }
      ]
    },

    // ========== MR. FOX (not a Sweet Tooth Fox) ==========
    {
      biome: "forest",
      npcType: "mr_fox",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "Ah, a visitor! *adjusts monocle* How delightfully unexpected! I am Mr. Fox, no relation to those dreadful Sweet Tooth variants.",
          choices: [
            {
              text: "You seem more civilized",
              next: "civilized"
            },
            {
              text: "Tell me about the Sweet Tooth Foxes",
              next: "about_cousins",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Nice to meet you",
              next: "polite"
            }
          ]
        },
        {
          id: "civilized",
          npcLine: [
            "Indeed! I prefer tea and crumpets to... eating candy people.",
            "It's quite embarrassing having such uncouth relatives."
          ],
          choices: [
            {
              text: "Where can I find them?",
              next: "locations",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Family can be difficult",
              next: "sympathy"
            }
          ]
        },
        {
          id: "about_cousins",
          npcLine: [
            "Those ruffians give us foxes a bad name!",
            "They developed a mutation that makes them crave sugar.",
            "I've seen them lurking near the berry bushes and the hollow logs."
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
          id: "locations",
          npcLine: "Check the northeastern grove and around the fallen oak. They love to ambush travelers there.",
          end: true
        }
      ]
    },

    // ========== BOOBAFINA ==========
    {
      biome: "forest",
      npcType: "boobafina",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "HONK! Oh my! Did you hear what Mrs. Cow said about the Forest Wizard?!",
          choices: [
            {
              text: "No, what did she say?",
              next: "gossip"
            },
            {
              text: "I don't care for gossip",
              next: "no_gossip"
            },
            {
              text: "Have you seen any Sweet Tooth Foxes?",
              next: "fox_gossip",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            }
          ]
        },
        {
          id: "gossip",
          npcLine: [
            "She said he's been practicing DARK FOREST MAGIC!",
            "Can you believe it? In our peaceful forest!",
            "Though between you and me, he does make lovely potions..."
          ],
          choices: [
            {
              text: "Sounds dangerous",
              next: "dangerous"
            },
            {
              text: "Maybe it's just rumors",
              next: "rumors"
            }
          ]
        },
        {
          id: "fox_gossip",
          npcLine: [
            "Oh THOSE troublemakers! HONK!",
            "I saw one trying to nibble on Mr. Goose just yesterday!",
            "They congregate near the water - probably washing down all that sugar!"
          ],
          end: true
        }
      ]
    },

    // ========== FOREST WIZARD ==========
    {
      biome: "forest",
      npcType: "forest_wizard",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "The trees whisper of your arrival, traveler. I am the Forest Wizard, guardian of these woods.",
          choices: [
            {
              text: "I seek your wisdom",
              next: "wisdom"
            },
            {
              text: "Do you have anything for sale?",
              next: "shop"
            },
            {
              text: "Can you help with the Sweet Tooth Foxes?",
              next: "fox_help",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "I'll be going",
              end: true
            }
          ]
        },
        {
          id: "wisdom",
          npcLine: [
            "The forest teaches patience. The trees grow slowly but surely.",
            "Those who rush through life miss the beauty in the shadows between leaves."
          ],
          choices: [
            {
              text: "Deep. Thanks.",
              end: true
            },
            {
              text: "Can wisdom help me fight?",
              next: "combat_wisdom"
            }
          ]
        },
        {
          id: "shop",
          npcLine: "I have remedies and charms blessed by the forest itself.",
          action: "openShop",
          end: true
        },
        {
          id: "fox_help",
          npcLine: [
            "Ah, the cursed ones. Their teeth were normal once.",
            "A candy witch cursed them for stealing her sweets.",
            "To break the curse, the teeth must be removed while they live.",
            "Here, take this knockout powder. It will help."
          ],
          effects: [
            {
              grantItem: { id: "knockout_powder", qty: 3 }
            }
          ],
          end: true
        },
        {
          id: "combat_wisdom",
          npcLine: "Sometimes the gentlest touch defeats the mightiest foe. Remember this with the foxes - mercy is strength.",
          end: true
        }
      ]
    },

    // ========== MRS. COW ==========
    {
      biome: "forest",
      npcType: "mrs_cow",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "Moooo~ Oh, hello dear. Would you like some fresh milk? It's very nutritious!",
          choices: [
            {
              text: "That's very kind of you",
              next: "accept_milk"
            },
            {
              text: "I'm lactose intolerant",
              next: "no_milk"
            },
            {
              text: "Have the Sweet Tooth Foxes bothered you?",
              next: "fox_trouble",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            }
          ]
        },
        {
          id: "accept_milk",
          npcLine: "Here you go, dear. Fresh from this morning!",
          effects: [
            {
              grantItem: { id: "fresh_milk", qty: 1 }
            },
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 10, trust: 10 }
              }
            }
          ],
          end: true
        },
        {
          id: "fox_trouble",
          npcLine: [
            "Oh my, yes! Those rude foxes tried to bite me!",
            "They said I looked like a candy cow! Can you imagine?",
            "I've seen them most often in the morning, near the eastern clearing."
          ],
          choices: [
            {
              text: "I'll protect you",
              next: "protect",
              effects: [
                {
                  relationDelta: {
                    target: "npc",
                    deltas: { value: 20, respect: 15 }
                  }
                }
              ]
            },
            {
              text: "Stay safe",
              end: true
            }
          ]
        },
        {
          id: "protect",
          npcLine: "You're so brave! Please be careful though - even if they're troublemakers, they're still living creatures.",
          end: true
        }
      ]
    },

    // ========== SQUIRREL ==========
    {
      biome: "forest",
      npcType: "squirrel",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "NUTS! NUTS! Do you have any NUTS?! I need more NUTS!",
          choices: [
            {
              text: "Calm down there",
              next: "calm"
            },
            {
              text: "I might have some nuts",
              next: "check_nuts",
              conditions: [
                { hasItem: "acorn" }
              ]
            },
            {
              text: "Where are the Sweet Tooth Foxes?",
              next: "fox_location",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Bye, nutty",
              end: true
            }
          ]
        },
        {
          id: "calm",
          npcLine: "Can't calm down! Winter is coming! Need MORE NUTS! ALWAYS MORE NUTS!",
          end: true
        },
        {
          id: "fox_location",
          npcLine: [
            "Foxes?! DANGEROUS! They don't want nuts, they want SWEETS!",
            "Saw them! By the big tree! And the small tree! And the medium tree!",
            "EVERYWHERE! But mostly north! NOW ABOUT THOSE NUTS..."
          ],
          end: true
        }
      ]
    },

    // ========== ANTS ==========
    {
      biome: "forest",
      npcType: "ants",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "WE ARE MANY. WE ARE ONE. WHAT DO YOU WANT WITH THE COLONY?",
          choices: [
            {
              text: "Just passing through",
              next: "passing"
            },
            {
              text: "Information about Sweet Tooth Foxes",
              next: "fox_intel",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Nothing, goodbye",
              end: true
            }
          ]
        },
        {
          id: "passing",
          npcLine: "ACCEPTABLE. DO NOT STEP ON US. WE BITE.",
          end: true
        },
        {
          id: "fox_intel",
          npcLine: [
            "THE SWEET ONES. YES. WE HAVE OBSERVED.",
            "PATTERN DETECTED: DAWN - EAST CLEARING. NOON - POND. DUSK - BERRY GROVE.",
            "WEAKNESS DETECTED: EASILY KNOCKED UNCONSCIOUS WHEN WEAKENED.",
            "PAYMENT REQUIRED: SUGAR CUBE."
          ],
          choices: [
            {
              text: "Here's sugar",
              next: "pay_ants",
              conditions: [
                { hasItem: "sugar_cube" }
              ]
            },
            {
              text: "I don't have sugar",
              next: "no_payment"
            }
          ]
        },
        {
          id: "pay_ants",
          npcLine: "PAYMENT ACCEPTED. ADDITIONAL INTELLIGENCE: THREE FOXES CURRENTLY NEAR FALLEN LOG, COORDINATES 28-14.",
          effects: [
            {
              takeItem: { id: "sugar_cube", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "no_payment",
          npcLine: "NO PAYMENT. NO MORE INFORMATION. GOODBYE.",
          end: true
        }
      ]
    },

    // ========== MR. GOOSE ==========
    {
      biome: "forest",
      npcType: "mr_goose",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "Oh, I say! Terribly good to meet you, old chap. Mr. Goose at your service. *tips top hat*",
          choices: [
            {
              text: "Pleased to meet you, Mr. Goose",
              next: "pleased"
            },
            {
              text: "That's a fine hat you have",
              next: "compliment_hat"
            },
            {
              text: "Are you related to Boobafina?",
              next: "about_wife"
            },
            {
              text: "Have you seen any Sweet Tooth Foxes?",
              next: "fox_question",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "Goodbye",
              end: true
            }
          ]
        },
        {
          id: "pleased",
          npcLine: "Quite right, quite right! One must maintain proper decorum in these woods, mustn't one?",
          choices: [
            {
              text: "Indeed",
              next: "indeed"
            },
            {
              text: "Tell me about the forest",
              next: "about_forest"
            }
          ]
        },
        {
          id: "compliment_hat",
          npcLine: [
            "Why thank you! It's a family heirloom, don't you know.",
            "Passed down through generations of distinguished geese."
          ],
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 5, respect: 3 }
              }
            }
          ],
          choices: [
            {
              text: "It suits you well",
              end: true
            },
            {
              text: "Tell me more about your family",
              next: "about_family"
            }
          ]
        },
        {
          id: "about_wife",
          npcLine: [
            "Ah yes, dear Boobafina! My beloved wife.",
            "She does tend to get rather excitable about the local gossip, I'm afraid.",
            "But she has the kindest heart in all the forest!"
          ],
          choices: [
            {
              text: "You two make a lovely couple",
              next: "lovely_couple"
            },
            {
              text: "She does like to talk",
              next: "likes_talk"
            }
          ]
        },
        {
          id: "fox_question",
          npcLine: [
            "Oh those dreadful ruffians! Yes, I've seen them.",
            "Quite uncivilized, attempting to bite everything sweet.",
            "I observed three of them near the old hollow log just this morning.",
            "Do be careful, won't you?"
          ],
          end: true
        },
        {
          id: "about_forest",
          npcLine: [
            "The forest is a splendid place, really.",
            "Though one must watch out for the less civilized inhabitants.",
            "The Forest Wizard keeps things in balance, you see."
          ],
          end: true
        },
        {
          id: "lovely_couple",
          npcLine: "How terribly kind of you to say! HONK! Oh pardon me, that just slips out sometimes.",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 10, trust: 5 }
              }
            }
          ],
          end: true
        }
      ]
    },

    // ========== MRS. YODER ==========
    {
      biome: "forest",
      npcType: "mrs_yoder",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "Oh my, a visitor! *adjusts spectacles* Would you like some bird seed, dearie?",
          choices: [
            {
              text: "That's very kind of you",
              next: "accept_seed"
            },
            {
              text: "No thank you, I'm not a bird",
              next: "not_bird"
            },
            {
              text: "Tell me about yourself",
              next: "about_yoder"
            },
            {
              text: "I should go",
              end: true
            }
          ]
        },
        {
          id: "accept_seed",
          npcLine: [
            "Oh wonderful! The birds do love visitors who appreciate a good seed.",
            "*hands you some seeds* Here you go, dear."
          ],
          effects: [
            {
              grantItem: { id: "bird_seed", qty: 1 }
            },
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 5, trust: 5 }
              }
            }
          ],
          choices: [
            {
              text: "Thank you!",
              end: true
            },
            {
              text: "Why do you feed the birds?",
              next: "why_birds"
            }
          ]
        },
        {
          id: "not_bird",
          npcLine: [
            "Oh! *squints* So you're not!",
            "My eyes aren't what they used to be, you know.",
            "But the birds might still appreciate it if you scattered some for them!"
          ],
          end: true
        },
        {
          id: "about_yoder",
          npcLine: [
            "I've lived in these woods for... oh, how long has it been?",
            "The years do blend together when you're my age.",
            "I just enjoy feeding the birds and watching the forest life go by."
          ],
          choices: [
            {
              text: "That sounds peaceful",
              next: "peaceful"
            },
            {
              text: "Don't you get lonely?",
              next: "lonely"
            }
          ]
        },
        {
          id: "why_birds",
          npcLine: [
            "The birds are such wonderful company!",
            "They sing the most beautiful songs and tell me all the forest news.",
            "Though sometimes I forget which birds told me what..."
          ],
          end: true
        },
        {
          id: "peaceful",
          npcLine: "Oh yes, very peaceful. Except when those Sweet Tooth Foxes come around causing trouble!",
          end: true
        },
        {
          id: "lonely",
          npcLine: [
            "Lonely? Oh no, dear. I have all my bird friends!",
            "And nice visitors like you stop by from time to time.",
            "That's more than enough for an old lady like me."
          ],
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 3, trust: 3 }
              }
            }
          ],
          end: true
        }
      ]
    },

    // ========== BIRD ==========
    {
      biome: "forest",
      npcType: "bird",
      start: "greeting",
      nodes: [
        {
          id: "greeting",
          npcLine: "*chirp chirp* Tweet tweet! *flutters wings excitedly*",
          choices: [
            {
              text: "Hello little bird!",
              next: "hello"
            },
            {
              text: "*whistle a tune*",
              next: "whistle"
            },
            {
              text: "Do you have any news?",
              next: "news"
            },
            {
              text: "Fly away, bird",
              end: true
            }
          ]
        },
        {
          id: "hello",
          npcLine: "Tweet tweet chirp! *hops closer* Chirp chirp!",
          choices: [
            {
              text: "You're very friendly",
              next: "friendly"
            },
            {
              text: "I wish I could understand you",
              next: "understand"
            }
          ]
        },
        {
          id: "whistle",
          npcLine: [
            "*TWEET TWEET TWEET!* *does a little dance*",
            "*chirps your tune back at you*"
          ],
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 10, trust: 5 }
              }
            }
          ],
          choices: [
            {
              text: "You're a good singer!",
              end: true
            },
            {
              text: "*whistle another tune*",
              next: "whistle_more"
            }
          ]
        },
        {
          id: "news",
          npcLine: [
            "*chirp chirp tweet tweet!*",
            "*flies in a circle and points wing toward the east*",
            "*makes chomping motions* Tweet!"
          ],
          choices: [
            {
              text: "Are you warning me about the foxes?",
              next: "fox_warning",
              conditions: [
                { hasActiveQuest: "sweet_tooth_foxes" }
              ]
            },
            {
              text: "I don't understand",
              next: "confused"
            }
          ]
        },
        {
          id: "fox_warning",
          npcLine: "*TWEET TWEET!* *nods vigorously* *points east again* Chirp chirp!",
          end: true
        },
        {
          id: "confused",
          npcLine: "*chirp...* *tilts head* Tweet tweet...",
          end: true
        },
        {
          id: "friendly",
          npcLine: "*chirp!* *lands on your shoulder briefly then flies back* Tweet tweet!",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 5, trust: 10 }
              }
            }
          ],
          end: true
        },
        {
          id: "understand",
          npcLine: "*chirp chirp* *flies in a heart shape* Tweet! *drops a small feather for you*",
          effects: [
            {
              grantItem: { id: "bird_feather", qty: 1 }
            }
          ],
          end: true
        },
        {
          id: "whistle_more",
          npcLine: "*TWEET TWEET TWEET TWEET!* *absolutely delighted* *does loop-de-loops*",
          effects: [
            {
              relationDelta: {
                target: "npc",
                deltas: { value: 5, trust: 5 }
              }
            }
          ],
          end: true
        }
      ]
    }
  ]
};