// src/js/data/uniqueNPCDialogues.js
// Unique dialogue trees for special NPCs in Candy Kingdom

import { choice } from "../utils/utils.js";

export const uniqueNPCDialogues = {
  // Steven
  steven: {
    biome: 'candy_kingdom',
    npcType: 'steven',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Hello, I am the creator of this world.",
        choices: [
          {
            text: "Wow that's pretty cool",
            next: 'appreciated'
          },
          {
            text: "Yeah right, and I'm from Pluto.",
            next: 'insulted'
          }
        ]
      },
      {
        id: 'appreciated',
        npcLine: "It is cool isn't it?",
        choices: []
      },
      {
        id: 'insulted',
        npcLine: "Maybe you are.",
        choices: []
      }
    ]
  },

  // Captain Root Beer - Gate Guard Captain
  captain_rootbeer: {
    biome: 'candy_kingdom',
    npcType: 'captain_rootbeer',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Halt, citizen! State your business in the Candy Kingdom.",
        choices: [
          { 
            text: "I'm just exploring the kingdom",
            next: 'exploring',
            effects: { trust: 1 }
          },
          { 
            text: "I'm looking for adventure",
            next: 'adventure',
            effects: { respect: 2 }
          },
          {
            text: "That's none of your concern",
            next: 'rude',
            effects: { trust: -2, respect: -1 }
          }
        ]
      },
      {
        id: 'exploring',
        npcLine: "Very well. Keep to the main paths and don't cause trouble. The kingdom's been on edge lately.",
        choices: [
          {
            text: "On edge? What's happening?",
            next: 'trouble_info'
          },
          {
            text: "I'll be careful",
            next: 'end_polite'
          }
        ]
      },
      {
        id: 'adventure',
        npcLine: "Ha! Another would-be hero. We've had reports of monster activity near the eastern borders. If you're truly brave, you could investigate.",
        choices: [
          {
            text: "Tell me more about these monsters",
            next: 'monster_info',
            effects: { respect: 1 }
          },
          {
            text: "Where exactly should I go?",
            next: 'directions'
          },
          {
            text: "Maybe I'll start with something smaller",
            next: 'wise_choice'
          }
        ]
      },
      {
        id: 'rude',
        npcLine: "Watch your tongue! I've thrown ruder folks than you in the dungeon. Move along before I change my mind.",
        choices: [
          {
            text: "Sorry, I didn't mean to be rude",
            next: 'apology',
            effects: { trust: 1 }
          },
          {
            text: "Fine, I'm leaving",
            next: 'end'
          }
        ]
      },
      {
        id: 'trouble_info',
        npcLine: "Strange creatures have been spotted at night. Some say they're made of pure sugar gone bad. Princess Bubblegum has increased patrols.",
        choices: [
          {
            text: "How can I help?",
            next: 'help_offer',
            effects: { respect: 3, trust: 2 }
          },
          {
            text: "Sounds dangerous",
            next: 'end_careful'
          }
        ]
      },
      {
        id: 'monster_info',
        npcLine: "Candy zombies, mostly. Sometimes a rogue gummy bear. They come out at night, attracted to the sweet scent of our kingdom.",
        choices: [
          {
            text: "I'll take care of them",
            next: 'brave_end',
            effects: { respect: 2 }
          },
          {
            text: "Any weaknesses I should know?",
            next: 'tactical_info'
          }
        ]
      },
      {
        id: 'tactical_info',
        npcLine: "Fire works well on most candy creatures. And they hate sour things - a splash of lemon juice sends them running!",
        choices: [
          {
            text: "Thanks for the advice",
            next: 'end_grateful',
            effects: { trust: 1 }
          }
        ]
      },
      {
        id: 'end_polite',
        npcLine: "Good. Carry on, citizen.",
        choices: []
      },
      {
        id: 'end_grateful',
        npcLine: "Stay safe out there, adventurer.",
        choices: []
      },
      {
        id: 'brave_end',
        npcLine: "Brave words! May your sword stay sharp and your candy stay sweet.",
        choices: []
      },
      {
        id: 'end',
        npcLine: "Move along.",
        choices: []
      }
    ]
  },

  // Manfried the Candycorn - Melancholic merchant
  manfried: {
    biome: 'candy_kingdom',
    npcType: 'manfried',
    start: 'intro',
    nodes: [
      {
        id: 'intro',
        npcLine: "*sighs deeply* Oh... another customer. Welcome to my humble stand. The candy apples are fresh, though freshness is but a fleeting concept in this saccharine existence...",
        choices: [
          {
            text: "Are you okay? You seem sad",
            next: 'existential',
            effects: { trust: 2, value: 1 }
          },
          {
            text: "I'll take a candy apple",
            next: 'purchase'
          },
          {
            text: "What's with the gloomy attitude?",
            next: 'questioning'
          }
        ]
      },
      {
        id: 'existential',
        npcLine: "Sad? No, my friend. I am simply... aware. Aware that we are all but candy in the great cosmic jar, slowly melting away. But what is sadness to a candycorn who has seen the truth?",
        choices: [
          {
            text: "That's... deep. What truth?",
            next: 'philosophy',
            effects: { trust: 2 }
          },
          {
            text: "You need to lighten up",
            next: 'lighten'
          },
          {
            text: "Can I just buy an apple?",
            next: 'purchase'
          }
        ]
      },
      {
        id: 'philosophy',
        npcLine: "The truth that we are all temporary. Today a candycorn, tomorrow... who knows? Perhaps melted, perhaps eaten. We exist in the space between sweet and bitter.",
        choices: [
          {
            text: "But isn't that what makes life precious?",
            next: 'profound',
            effects: { trust: 3, respect: 2 }
          },
          {
            text: "You're making me depressed",
            next: 'depressed'
          }
        ]
      },
      {
        id: 'profound',
        npcLine: "*a small smile* Perhaps you understand more than most. Yes... the temporary nature of candy makes each moment sweeter. Here, take this apple - on the house. For a fellow philosopher.",
        effects: { trust: 5, value: 3 },
        choices: [
          {
            text: "Thank you, Manfried",
            next: 'end_wise'
          }
        ]
      },
      {
        id: 'purchase',
        npcLine: "Five coins for an apple. Each one lovingly dipped in caramel while I contemplated the meaninglessness of it all.",
        choices: [
          {
            text: "I'll take one",
            next: 'transaction',
            condition: 'hasCoins:5'
          },
          {
            text: "That's too expensive",
            next: 'haggle'
          },
          {
            text: "Maybe later",
            next: 'end'
          }
        ]
      },
      {
        id: 'transaction',
        npcLine: "Here you go. May it bring you brief joy in this endless cycle of consumption and decay.",
        effects: { coins: -5 },
        giveItem: { type: 'food', name: 'Candy Apple', heal: 15 },
        choices: []
      },
      {
        id: 'end_wise',
        npcLine: "May you find sweetness in the bitter moments, friend.",
        choices: []
      },
      {
        id: 'end',
        npcLine: "*returns to staring wistfully at nothing*",
        choices: []
      }
    ]
  },

  // Mrs. Butterscotch - Motherly gossip
  mrs_butterscotch: {
    biome: 'candy_kingdom',
    npcType: 'mrs_butterscotch',
    start: 'welcome',
    nodes: [
      {
        id: 'welcome',
        npcLine: "Oh my goodness, dearie! Come, come! You look like you could use a nice lollipop and some good conversation!",
        choices: [
          {
            text: "You're very kind!",
            next: 'kind_response',
            effects: { trust: 2 }
          },
          {
            text: "What's the latest gossip?",
            next: 'gossip_main',
            effects: { value: 1 }
          },
          {
            text: "Just browsing, thanks",
            next: 'browsing'
          }
        ]
      },
      {
        id: 'kind_response',
        npcLine: "Oh, you sweet thing! Here, have a free sample! *whispers* And between you and me, have you heard about Lord Lollipop's scandal?",
        giveItem: { type: 'food', name: 'Mini Lollipop', heal: 5 },
        choices: [
          {
            text: "Scandal? Do tell!",
            next: 'scandal_story',
            effects: { trust: 2 }
          },
          {
            text: "I don't listen to gossip",
            next: 'no_gossip'
          }
        ]
      },
      {
        id: 'gossip_main',
        npcLine: "Oh honey, where do I even begin! Did you know that Candy Cornia was seen sneaking out of the castle at midnight last week?",
        choices: [
          {
            text: "Really? What was she doing?",
            next: 'cornia_gossip',
            effects: { trust: 1 }
          },
          {
            text: "Tell me more about the castle",
            next: 'castle_info'
          },
          {
            text: "Any other interesting news?",
            next: 'more_gossip'
          }
        ]
      },
      {
        id: 'scandal_story',
        npcLine: "Well! Lord Lollipop claims he's allergic to sugar - can you imagine? A candy person allergic to sugar! Some say he's actually from the Vegetable Kingdom!",
        choices: [
          {
            text: "That's incredible!",
            next: 'more_gossip',
            effects: { trust: 1 }
          },
          {
            text: "Sounds like nonsense",
            next: 'skeptical'
          }
        ]
      },
      {
        id: 'cornia_gossip',
        npcLine: "Meeting with someone from the Ice King's domain, if you can believe it! Romance across kingdom lines - how scandalous! Don't tell anyone I told you!",
        choices: [
          {
            text: "Your secret's safe with me",
            next: 'trust_built',
            effects: { trust: 3 }
          },
          {
            text: "The Ice King's domain?",
            next: 'ice_info'
          }
        ]
      },
      {
        id: 'trust_built',
        npcLine: "Oh, I knew I could trust you, dearie! Here, take this special lollipop - it's my grandmother's recipe!",
        giveItem: { type: 'food', name: 'Grandma\'s Special Lollipop', heal: 20 },
        choices: [
          {
            text: "Thank you so much!",
            next: 'end_happy'
          }
        ]
      },
      {
        id: 'more_gossip',
        npcLine: "Old Man Taffy claims he once saw Princess Bubblegum crying in the garden. And Peppermint Larry thinks the guards are hiding something big!",
        choices: [
          {
            text: "Interesting... thanks for the info",
            next: 'end_informed'
          },
          {
            text: "I should go talk to them",
            next: 'investigate'
          }
        ]
      },
      {
        id: 'investigate',
        npcLine: "Oh yes, do! And come back and tell me what you learn! I'll have fresh lollipops waiting!",
        choices: []
      },
      {
        id: 'end_happy',
        npcLine: "Come back anytime, sweetie! I always have fresh candy and fresher gossip!",
        choices: []
      },
      {
        id: 'end_informed',
        npcLine: "Knowledge is power, dearie! And gossip is the sweetest knowledge of all!",
        choices: []
      }
    ]
  },

  // Old Man Taffy - Wise storyteller
  old_taffy: {
    biome: 'candy_kingdom',
    npcType: 'old_taffy',
    start: 'sitting',
    nodes: [
      {
        id: 'sitting',
        npcLine: "*sitting on bench, feeding sugar crumbs to candy pigeons* Ah, young one. These old eyes have seen much. Come, sit a while.",
        choices: [
          {
            text: "I'd love to hear your stories",
            next: 'story_choice',
            effects: { trust: 2, respect: 2 }
          },
          {
            text: "How long have you lived here?",
            next: 'history'
          },
          {
            text: "Sorry, I'm in a hurry",
            next: 'end_quick'
          }
        ]
      },
      {
        id: 'story_choice',
        npcLine: "Which tale would you hear? The founding of the Candy Kingdom? The Great Molasses Flood? Or perhaps... the prophecy of the Lich?",
        choices: [
          {
            text: "Tell me about the founding",
            next: 'founding_story',
            effects: { value: 2 }
          },
          {
            text: "What was the Molasses Flood?",
            next: 'flood_story'
          },
          {
            text: "The Lich? That sounds ominous",
            next: 'lich_story',
            effects: { trust: 1 }
          }
        ]
      },
      {
        id: 'founding_story',
        npcLine: "Long ago, this land was nothing but sugar deserts and caramel canyons. Then came the first Princess - not Bubblegum, but Princess Sucrose. She planted the first candy trees and taught us to build with gingerbread.",
        choices: [
          {
            text: "What happened to Princess Sucrose?",
            next: 'sucrose_fate',
            effects: { trust: 1 }
          },
          {
            text: "How is Princess Bubblegum related?",
            next: 'bubblegum_connection'
          }
        ]
      },
      {
        id: 'flood_story',
        npcLine: "Fifty years past, the Molasses Reserves burst. A wave of sticky darkness consumed half the kingdom. Many were preserved in the flow - some say you can still hear them calling from the Molasses Wastes.",
        choices: [
          {
            text: "That's terrifying!",
            next: 'flood_wisdom'
          },
          {
            text: "Could it happen again?",
            next: 'flood_warning',
            effects: { value: 2 }
          }
        ]
      },
      {
        id: 'lich_story',
        npcLine: "*lowers voice* They say when the last sweet turns sour, when candy turns to ash, the Lich will rise. A being of pure decay, the antithesis of our sugary existence.",
        choices: [
          {
            text: "Do you believe it?",
            next: 'lich_belief',
            effects: { trust: 2 }
          },
          {
            text: "How can we prevent it?",
            next: 'lich_prevention'
          }
        ]
      },
      {
        id: 'lich_belief',
        npcLine: "I've lived long enough to know that every sweet story has a bitter truth. The Lich is real, young one. I've felt its presence in the cold winds from the north.",
        choices: [
          {
            text: "What should I do if I encounter it?",
            next: 'lich_advice',
            effects: { respect: 2 }
          },
          {
            text: "You're just trying to scare me",
            next: 'skeptical_end'
          }
        ]
      },
      {
        id: 'lich_advice',
        npcLine: "Run. But if you cannot... remember that life defeats death. Growth conquers decay. Find something worth protecting, and you'll find the strength to face even the Lich.",
        effects: { trust: 3, respect: 3 },
        choices: [
          {
            text: "Thank you for the wisdom",
            next: 'end_blessed'
          }
        ]
      },
      {
        id: 'flood_warning',
        npcLine: "Princess Bubblegum has reinforced the reserves, but... *sniffs air* sometimes I smell molasses on the wind. Stay vigilant, young one.",
        choices: [
          {
            text: "I'll be careful",
            next: 'end_warned'
          }
        ]
      },
      {
        id: 'end_blessed',
        npcLine: "May your path be sweet and your burdens light. Take this - it's helped me through dark times.",
        giveItem: { type: 'accessory', name: 'Taffy\'s Charm', effects: { luck: 1 } },
        choices: []
      },
      {
        id: 'end_warned',
        npcLine: "Good. The young should learn from the old, lest history's mistakes repeat in candy-coated tragedy.",
        choices: []
      },
      {
        id: 'end_quick',
        npcLine: "Youth always rushes. But remember - sometimes the longest path teaches the most important lessons.",
        choices: []
      }
    ]
  },

  // Peppermint Larry - Paranoid conspiracy theorist
  peppermint_larry: {
    biome: 'candy_kingdom',
    npcType: 'peppermint_larry',
    start: 'nervous',
    nodes: [
      {
        id: 'nervous',
        npcLine: "*glances around nervously* You! Yes, you! You're not one of THEM, are you? The watchers? The... *whispers* ...the Sugar Surveillance?",
        choices: [
          {
            text: "Sugar Surveillance? What?",
            next: 'conspiracy_intro',
            effects: { trust: 1 }
          },
          {
            text: "You seem paranoid",
            next: 'defensive'
          },
          {
            text: "I'm just a regular person",
            next: 'suspicious'
          }
        ]
      },
      {
        id: 'conspiracy_intro',
        npcLine: "Oh, you don't KNOW? Of course you don't! They keep it hidden! Princess Bubblegum has EYES everywhere! Candy cameras! Gumdrop microphones! They're watching us RIGHT NOW!",
        choices: [
          {
            text: "Why would she spy on everyone?",
            next: 'conspiracy_reason',
            effects: { trust: 2 }
          },
          {
            text: "You're crazy",
            next: 'not_crazy'
          },
          {
            text: "Tell me everything",
            next: 'full_conspiracy',
            effects: { trust: 3, value: 2 }
          }
        ]
      },
      {
        id: 'full_conspiracy',
        npcLine: "Finally, someone who LISTENS! Look - the Princess isn't even made of bubblegum! She's some kind of ancient being! And the Candy People? We're all experiments! Living experiments!",
        choices: [
          {
            text: "Do you have proof?",
            next: 'proof',
            effects: { respect: 1 }
          },
          {
            text: "What kind of experiments?",
            next: 'experiment_details'
          },
          {
            text: "How do we stop her?",
            next: 'revolution'
          }
        ]
      },
      {
        id: 'proof',
        npcLine: "*pulls out crumpled papers* Look! Guard patrol patterns that spell out MYSTICAL SYMBOLS! Candy distribution that follows ELECTROMAGNETIC LEY LINES! It's all connected!",
        choices: [
          {
            text: "This is just random scribbles",
            next: 'disbelief'
          },
          {
            text: "My god... you might be right",
            next: 'believer',
            effects: { trust: 5 }
          },
          {
            text: "Have you told anyone else?",
            next: 'spreading'
          }
        ]
      },
      {
        id: 'believer',
        npcLine: "YES! YES! You SEE it! Quick, take this! *hands you a tin foil hat made of candy wrapper* It blocks their mind-reading rays! We'll bring down the system together!",
        giveItem: { type: 'armor', name: 'Conspiracy Hat', def: 1, description: 'Blocks mind reading (allegedly)' },
        choices: [
          {
            text: "Together we'll uncover the truth!",
            next: 'end_ally',
            effects: { trust: 3 }
          }
        ]
      },
      {
        id: 'experiment_details',
        npcLine: "Think about it! Why are we all different candy types? It's selective breeding! She's trying to create the PERFECT CANDY CITIZEN! Docile! Sweet! OBEDIENT!",
        choices: [
          {
            text: "That's actually disturbing",
            next: 'disturbed',
            effects: { trust: 2 }
          },
          {
            text: "Or maybe we're just candy people?",
            next: 'logical'
          }
        ]
      },
      {
        id: 'disturbed',
        npcLine: "NOW you're getting it! Question everything! Trust no one! Especially not the Banana Guards - they're not even candy! THINK ABOUT IT!",
        choices: [
          {
            text: "I'll be more careful",
            next: 'end_cautious'
          }
        ]
      },
      {
        id: 'end_ally',
        npcLine: "Meet me at midnight behind the chocolate shop! Come alone! Trust no one! Not even me! ESPECIALLY not me! *runs away*",
        choices: []
      },
      {
        id: 'end_cautious',
        npcLine: "Good! Good! Stay vigilant! The truth is out there, covered in sugar and lies! *mutters and wanders off*",
        choices: []
      },
      {
        id: 'defensive',
        npcLine: "Paranoid?! PARANOID?! That's what THEY want you to think! You're probably one of their agents, aren't you? Trying to discredit me!",
        choices: [
          {
            text: "I'm sorry, I didn't mean to upset you",
            next: 'conspiracy_intro',
            effects: { trust: -1 }
          },
          {
            text: "I'm not an agent of anyone",
            next: 'suspicious'
          },
          {
            text: "Maybe you should calm down",
            next: 'not_crazy'
          }
        ]
      },
      {
        id: 'suspicious',
        npcLine: "That's EXACTLY what an agent would say! But... wait... *squints* ...no, you're too obvious. They'd never send someone so... unprepared. Unless that's what they WANT me to think!",
        choices: [
          {
            text: "I just want to understand",
            next: 'conspiracy_intro',
            effects: { trust: 1 }
          },
          {
            text: "This is exhausting",
            next: 'end_cautious'
          }
        ]
      },
      {
        id: 'not_crazy',
        npcLine: "I'm NOT crazy! I'm the only SANE one left! Everyone else is walking around, happy and oblivious, while the Princess watches from her tower! ALWAYS WATCHING!",
        choices: [
          {
            text: "What is she watching for?",
            next: 'conspiracy_reason',
            effects: { trust: 1 }
          },
          {
            text: "Maybe she's just protecting the kingdom",
            next: 'logical'
          }
        ]
      },
      {
        id: 'conspiracy_reason',
        npcLine: "Control! ABSOLUTE CONTROL! She monitors our sugar levels, our happiness metrics, our productivity! One wrong move and POOF - you're 'relocated' to the Dungeon of the Crystal Eye!",
        choices: [
          {
            text: "Has anyone actually been relocated?",
            next: 'proof'
          },
          {
            text: "That sounds terrifying",
            next: 'disturbed'
          },
          {
            text: "How do we stop her?",
            next: 'revolution'
          }
        ]
      },
      {
        id: 'revolution',
        npcLine: "*eyes widen* You want to... to fight back? *whispers* There's a resistance. We meet in secret. We're stockpiling sugar-free alternatives. When the time comes... we'll be ready.",
        choices: [
          {
            text: "Count me in",
            next: 'believer',
            effects: { trust: 10 }
          },
          {
            text: "That sounds dangerous",
            next: 'end_cautious'
          }
        ]
      },
      {
        id: 'spreading',
        npcLine: "I've tried! But they all think I'm crazy! The few who believed me... they're gone now. 'Vacation' they said. But I know better. I KNOW!",
        choices: [
          {
            text: "I believe you",
            next: 'believer',
            effects: { trust: 5 }
          },
          {
            text: "Maybe they really went on vacation",
            next: 'logical'
          }
        ]
      },
      {
        id: 'disbelief',
        npcLine: "You're blind! BLIND! These aren't scribbles, they're EVIDENCE! But fine, stay asleep! Stay a sheep! A candy-coated sheep!",
        choices: [
          {
            text: "I'm sorry, show me again",
            next: 'proof',
            effects: { trust: -2 }
          },
          {
            text: "Goodbye",
            next: 'end_cautious'
          }
        ]
      },
      {
        id: 'logical',
        npcLine: "Just candy people?! JUST?! That's the programming talking! They've gotten to you already! Your mind is full of sugar and lies!",
        choices: [
          {
            text: "Maybe you have a point",
            next: 'conspiracy_intro',
            effects: { trust: 1 }
          },
          {
            text: "I should go",
            next: 'end_cautious'
          }
        ]
      }
    ]
  },

  // Chocopierre - Sophisticated chocolate merchant
  chocopierre: {
    biome: 'candy_kingdom',
    npcType: 'chocopierre',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "*adjusts monocle* Bon jour! Welcome to Chocopierre's Boutique de Chocolat! Only zee finest artisanal chocolates, crafted with passion and je ne sais quoi!",
        choices: [
          {
            text: "Your chocolates look amazing!",
            next: 'flattered',
            effects: { trust: 2, value: 1 }
          },
          {
            text: "Why the fancy accent?",
            next: 'accent'
          },
          {
            text: "Do you have anything affordable?",
            next: 'peasant'
          }
        ]
      },
      {
        id: 'flattered',
        npcLine: "Ah! A person of taste! But of course zey are amazing - each piece is a work of art! I studied under zee great Chocolatiers of zee Dessert Desert!",
        choices: [
          {
            text: "Tell me about your training",
            next: 'backstory',
            effects: { trust: 2 }
          },
          {
            text: "What do you recommend?",
            next: 'recommendation'
          }
        ]
      },
      {
        id: 'backstory',
        npcLine: "For seven years, I apprenticed in zee Temple of Cocoa! I learned zee ancient art of tempering, zee sacred ratios of sweet and bitter! I have devoted my life to chocolate perfection!",
        choices: [
          {
            text: "That's incredible dedication",
            next: 'respected',
            effects: { respect: 3 }
          },
          {
            text: "Was it worth it?",
            next: 'philosophical'
          }
        ]
      },
      {
        id: 'philosophical',
        npcLine: "*sighs deeply* What is worth, mon ami? I create beauty that melts away. But in that moment of melting - ah! - zee one who tastes it knows true joy. Is that not worth everything?",
        choices: [
          {
            text: "You're a true artist",
            next: 'artist',
            effects: { trust: 3, respect: 2 }
          },
          {
            text: "It's just candy",
            next: 'insulted'
          }
        ]
      },
      {
        id: 'artist',
        npcLine: "Finally! Someone who understands! You must try my masterpiece - zee Triple Dark Delight with Crystallized Tears of Joy! On zee house, for a fellow appreciator of art!",
        giveItem: { type: 'food', name: 'Triple Dark Delight', heal: 30, description: 'A masterpiece of chocolate' },
        choices: [
          {
            text: "This is incredible! Thank you!",
            next: 'end_cultured'
          }
        ]
      },
      {
        id: 'insulted',
        npcLine: "JUST CANDY?! *gasps* You... you BARBARIAN! Out! OUT OF MY BOUTIQUE! Come back when you have developed a palate more sophisticated than a gummy worm!",
        effects: { trust: -5, respect: -3 },
        choices: []
      },
      {
        id: 'recommendation',
        npcLine: "For zee beginner, I recommend zee Milk Chocolate Dream. For zee adventurous, zee Spicy Aztec Surprise. And for zee true connoisseur... zee Essence of Midnight.",
        choices: [
          {
            text: "I'll take the Milk Chocolate Dream",
            next: 'purchase_milk',
            condition: 'hasCoins:10'
          },
          {
            text: "Give me the Essence of Midnight",
            next: 'purchase_midnight',
            condition: 'hasCoins:25'
          },
          {
            text: "These are too expensive",
            next: 'haggle'
          }
        ]
      },
      {
        id: 'purchase_midnight',
        npcLine: "Ah! Zee Essence! You have exquisite taste! This will change your life, mon ami!",
        effects: { coins: -25 },
        giveItem: { type: 'food', name: 'Essence of Midnight', heal: 50, description: 'Darkness made edible' },
        choices: []
      },
      {
        id: 'end_cultured',
        npcLine: "Return anytime! Together we shall elevate zee chocolate arts to new heights!",
        choices: []
      },
      {
        id: 'respected',
        npcLine: "Ah, merci! Your appreciation for zee craft is refreshing. Not many understand zee years of dedication it takes to master chocolate. Perhaps... you would like to see my special collection?",
        choices: [
          {
            text: "I'd love to buy some chocolates",
            action: 'openShop'
          },
          {
            text: "What's your most popular creation?",
            next: 'recommendation'
          },
          {
            text: "Thank you for sharing your story",
            next: 'end_cultured'
          }
        ]
      },
      {
        id: 'accent',
        npcLine: "*huffs indignantly* Fancy?! This is not fancy, this is AUTHENTIQUE! I am from zee Dessert Desert, where all zee great chocolatiers train! You uncultured swine!",
        choices: [
          {
            text: "I didn't mean to offend",
            next: 'greeting',
            effects: { trust: -1 }
          },
          {
            text: "The Dessert Desert?",
            next: 'backstory'
          }
        ]
      },
      {
        id: 'peasant',
        npcLine: "*sniffs disdainfully* Affordable? You want AFFORDABLE chocolate? Perhaps you should visit zee Candy Corn stand! My chocolates are ART, not mere sustenance!",
        choices: [
          {
            text: "You're right, quality has its price",
            next: 'flattered',
            effects: { respect: 1 }
          },
          {
            text: "Never mind then",
            next: 'insulted'
          }
        ]
      },
      {
        id: 'haggle',
        npcLine: "Haggle? HAGGLE?! You dare to haggle with Chocopierre?! *sighs dramatically* Fine... for you, because I sense potential... 10% off. But only if you promise to savor every bite!",
        choices: [
          {
            text: "Deal! I'll take something",
            action: 'openShop'
          },
          {
            text: "Still too much",
            next: 'insulted'
          }
        ]
      },
      {
        id: 'purchase_milk',
        npcLine: "Ah, zee classic choice! Perfect for zee beginner's palate. This will be your gateway to greater chocolate adventures!",
        effects: { coins: -10 },
        giveItem: { type: 'food', name: 'Milk Chocolate Dream', heal: 20, description: 'Smooth and creamy perfection' },
        choices: [
          {
            text: "Thank you!",
            next: 'end_cultured'
          }
        ]
      }
    ]
  },

  // Candy Children - playful and innocent
  candy_child: {
    biome: 'candy_kingdom',
    npcType: 'candy_child',
    start: 'playing',
    nodes: [
      {
        id: 'playing',
        npcLine: "*stops playing* Wow! You're not made of candy! Are you a human? A real human?!",
        choices: [
          {
            text: "Yes, I'm a human",
            next: 'excited',
            effects: { trust: 2 }
          },
          {
            text: "What are you playing?",
            next: 'game'
          },
          {
            text: "Run along, kid",
            next: 'sad'
          }
        ]
      },
      {
        id: 'excited',
        npcLine: "WOOOW! My mom said humans were just made up! Do you really have bones inside you? That's so gross but so cool!",
        choices: [
          {
            text: "Want to feel my arm? There's bones in there!",
            next: 'touching',
            effects: { trust: 3 }
          },
          {
            text: "Being made of candy seems cooler",
            next: 'candy_cool'
          }
        ]
      },
      {
        id: 'game',
        npcLine: "We're playing Knights and Dragons! But Jeremy always wants to be the dragon and that's not fair! Wanna play with us?",
        choices: [
          {
            text: "Sure! I'll be a knight",
            next: 'play_knight',
            effects: { trust: 3, value: 2 }
          },
          {
            text: "I'll be the dragon!",
            next: 'play_dragon'
          },
          {
            text: "Maybe later",
            next: 'maybe_later'
          }
        ]
      },
      {
        id: 'play_knight',
        npcLine: "YAY! You can have my sword! *hands you a sticky candy cane* Now we can defeat Jeremy... I mean, the dragon!",
        giveItem: { type: 'weapon', name: 'Candy Cane Sword', dmg: 2, description: 'A child\'s toy, sticky with enthusiasm' },
        choices: [
          {
            text: "*play fight with the kids*",
            next: 'end_play'
          }
        ]
      },
      {
        id: 'touching',
        npcLine: "*pokes your arm* EWWW! It's hard but squishy! That's so weird! Hey, hey! Can you eat candy? Does it become part of your bones?!",
        choices: [
          {
            text: "It gives me energy to run and play!",
            next: 'energy'
          },
          {
            text: "Too much candy is bad for humans",
            next: 'candy_bad'
          }
        ]
      },
      {
        id: 'candy_bad',
        npcLine: "Bad?! How can candy be bad?! We're MADE of candy and we're fine! Adults are so weird!",
        choices: [
          {
            text: "You're right, you're perfect as candy",
            next: 'end_sweet'
          }
        ]
      },
      {
        id: 'end_play',
        npcLine: "That was fun! You're the best human ever! Come play again tomorrow!",
        choices: []
      },
      {
        id: 'end_sweet',
        npcLine: "*giggles* You're nice! Not scary like the stories! Bye bye, bone person!",
        choices: []
      }
    ]
  },

  // Candy Cornia - Snobbish noble
  candy_cornia: {
    biome: 'candy_kingdom',
    npcType: 'candy_cornia',
    start: 'disdain',
    nodes: [
      {
        id: 'disdain',
        npcLine: "*looks you up and down* Ugh. Another commoner. I suppose you're going to ask for money or directions or some other tedious thing?",
        choices: [
          {
            text: "I don't need anything from you",
            next: 'independent',
            effects: { respect: 2 }
          },
          {
            text: "Actually, I heard an interesting rumor about you",
            next: 'rumor_bait',
            effects: { trust: -1 }
          },
          {
            text: "You must be Lady Candy Cornia",
            next: 'recognized'
          }
        ]
      },
      {
        id: 'rumor_bait',
        npcLine: "*face flushes* R-rumor? What rumor? I don't know what you're talking about! My life is perfectly proper and absolutely boring!",
        choices: [
          {
            text: "Something about midnight meetings...",
            next: 'confronted',
            effects: { trust: -2 }
          },
          {
            text: "Never mind, my mistake",
            next: 'backing_off'
          }
        ]
      },
      {
        id: 'confronted',
        npcLine: "*whispers harshly* How DARE you! I don't know what gossip you've heard, but... wait. You're not going to tell my father, are you?",
        choices: [
          {
            text: "That depends. Tell me the truth",
            next: 'ice_romance',
            effects: { value: 3 }
          },
          {
            text: "Your secret is safe with me",
            next: 'trust_gained',
            effects: { trust: 5 }
          },
          {
            text: "Maybe I will, maybe I won't",
            next: 'blackmail'
          }
        ]
      },
      {
        id: 'ice_romance',
        npcLine: "*sighs* Fine! Yes, I've been seeing someone from the Ice Kingdom. His name is Frost Prince Crystalline. We met at a diplomatic ball and... and he actually listens to me!",
        choices: [
          {
            text: "That's actually really sweet",
            next: 'understanding',
            effects: { trust: 4, respect: 2 }
          },
          {
            text: "An Ice Prince? Isn't that dangerous?",
            next: 'worried'
          }
        ]
      },
      {
        id: 'understanding',
        npcLine: "*tears up slightly* You... you think so? Everyone else just sees the scandal. But he makes me laugh, and he doesn't care about my title or my father's money...",
        choices: [
          {
            text: "Love is worth fighting for",
            next: 'romantic_end',
            effects: { trust: 3 }
          },
          {
            text: "Be careful though",
            next: 'cautious_end'
          }
        ]
      },
      {
        id: 'trust_gained',
        npcLine: "*relieved* Thank you! I... I misjudged you. Here, take this. If anyone asks, you didn't get it from me.",
        giveItem: { type: 'accessory', name: 'Noble\'s Ring', effects: { charisma: 2 } },
        choices: [
          {
            text: "Thank you, your secret is safe",
            next: 'end_allied'
          }
        ]
      },
      {
        id: 'recognized',
        npcLine: "Finally, someone with proper manners! Yes, I am Lady Candy Cornia, Third of her name, Heir to the Corn Syrup Estates. And you are...?",
        choices: [
          {
            text: "An adventurer seeking fortune and glory",
            next: 'adventurer_response'
          },
          {
            text: "Nobody important",
            next: 'humble'
          }
        ]
      },
      {
        id: 'adventurer_response',
        npcLine: "Oh how dreadfully exciting! Father says adventurers are reckless fools, but secretly I think you're all terribly brave. Tell me, have you slain any dragons?",
        choices: [
          {
            text: "Several! Each more terrible than the last",
            next: 'impressed',
            effects: { value: 2 }
          },
          {
            text: "I prefer to avoid violence when possible",
            next: 'peaceful'
          }
        ]
      },
      {
        id: 'impressed',
        npcLine: "*eyes sparkling* How thrilling! You must tell me everything! Oh, but not here - the walls have ears. Visit me at the Corn Syrup Estates sometime!",
        effects: { trust: 2, respect: 3 },
        choices: []
      },
      {
        id: 'romantic_end',
        npcLine: "*smiles genuinely* You're right. Thank you for not judging me. Perhaps... perhaps you could deliver a letter for me sometime?",
        choices: []
      },
      {
        id: 'end_allied',
        npcLine: "I won't forget this kindness. If you ever need a favor from the nobility, find me.",
        choices: []
      }
    ]
  },

  // Glimmer the Gnome Fairy - Magical helper
  gnome_fairy: {
    biome: 'candy_kingdom',
    npcType: 'gnome_fairy',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "*twirls in the air with sparkling dust* Oh my! A visitor! I'm Glimmer, guardian fairy of the Candy Kingdom fountain! Are you here to make a wish?",
        choices: [
          {
            text: "Yes! I'd like to make a wish",
            next: 'make_wish',
            effects: { trust: 2 }
          },
          {
            text: "You're a real fairy?",
            next: 'about_fairy',
            effects: { value: 1 }
          },
          {
            text: "What do you guard?",
            next: 'guardian_duty'
          }
        ]
      },
      {
        id: 'make_wish',
        npcLine: "*giggles* Wonderful! But you know, wishes aren't free in the magical world. You need three things: a pure heart, a silver coin, and... a really good joke to make me laugh!",
        choices: [
          {
            text: "Here's a coin and a joke: Why don't scientists trust atoms?",
            next: 'joke_response',
            condition: 'hasCoins:1',
            effects: { coins: -1, trust: 3 }
          },
          {
            text: "I don't have a coin right now",
            next: 'no_coin'
          },
          {
            text: "That seems like a lot for a wish",
            next: 'bargain'
          }
        ]
      },
      {
        id: 'joke_response',
        npcLine: "*tilts head curiously* I don't know, why don't they?",
        choices: [
          {
            text: "Because they make up everything!",
            next: 'wish_granted',
            effects: { trust: 5 }
          }
        ]
      },
      {
        id: 'wish_granted',
        npcLine: "*bursts into tinkling laughter* Oh that's delightful! Very well, you've earned your wish! *waves tiny hands and sparkles surround you* There! I've blessed you with fairy luck. May fortune smile upon your adventures!",
        effects: { luck: 1 },
        giveItem: { type: 'buff', name: 'Fairy Blessing', effect: 'luck', duration: 100 },
        choices: [
          {
            text: "Thank you, Glimmer!",
            next: 'end_blessed'
          }
        ]
      },
      {
        id: 'about_fairy',
        npcLine: "Of course I'm real! *does a little loop in the air* I'm a gnome fairy - we're smaller than regular fairies but MUCH more magical! My green cap isn't just for fashion, it channels nature magic!",
        choices: [
          {
            text: "That's amazing! What kind of magic can you do?",
            next: 'fairy_magic',
            effects: { trust: 2 }
          },
          {
            text: "Are there other fairies in the kingdom?",
            next: 'other_fairies'
          }
        ]
      },
      {
        id: 'fairy_magic',
        npcLine: "Oh, all sorts! I can make plants grow, purify water, grant minor wishes, and... *whispers* I can see into people's hearts to know if they're good or evil. You have a good heart, by the way. Mostly.",
        choices: [
          {
            text: "Mostly?",
            next: 'mostly_good',
            effects: { trust: 1 }
          },
          {
            text: "Can you teach me magic?",
            next: 'teach_magic'
          }
        ]
      },
      {
        id: 'mostly_good',
        npcLine: "*giggles mischievously* Everyone has a tiny bit of mischief in them! It's what makes life interesting. Your mischief is the fun kind, not the mean kind. That's important!",
        choices: [
          {
            text: "I like you, Glimmer",
            next: 'friendship',
            effects: { trust: 3 }
          }
        ]
      },
      {
        id: 'teach_magic',
        npcLine: "Humans can't do fairy magic, silly! But... *flies close and whispers* I could give you a magical item if you help me with something. The fountain's magical crystal is getting cloudy. If you find some Pure Sugar Essence, I can cleanse it!",
        choices: [
          {
            text: "I'll keep an eye out for it",
            next: 'quest_accepted',
            effects: { value: 3 }
          },
          {
            text: "Where would I find that?",
            next: 'essence_location'
          }
        ]
      },
      {
        id: 'essence_location',
        npcLine: "Pure Sugar Essence only forms in places where happiness is strongest. Try looking near celebrations, or maybe where children play! Sometimes merchants from the Ice Kingdom have it too.",
        choices: [
          {
            text: "I'll search for it",
            next: 'quest_accepted'
          }
        ]
      },
      {
        id: 'guardian_duty',
        npcLine: "This fountain is the heart of the Candy Kingdom! Its waters have healing properties, but more importantly, it's connected to Princess Bubblegum's life force. If anything happened to it... *shivers* The whole kingdom would wither!",
        choices: [
          {
            text: "That's a big responsibility",
            next: 'responsibility',
            effects: { respect: 2 }
          },
          {
            text: "Has anyone ever tried to harm it?",
            next: 'fountain_threats'
          }
        ]
      },
      {
        id: 'fountain_threats',
        npcLine: "*face darkens* Once... a shadow creature from the Dungeon of the Crystal Eye tried to poison it. But I called upon all the nature spirits and we drove it away! Though... *looks worried* lately I've been sensing something dark approaching from the north.",
        choices: [
          {
            text: "I'll help protect the fountain",
            next: 'protector',
            effects: { trust: 4, respect: 3 }
          },
          {
            text: "What kind of darkness?",
            next: 'darkness_info'
          }
        ]
      },
      {
        id: 'darkness_info',
        npcLine: "It feels... ancient. Cold. Like the opposite of life itself. The older fairies whisper about someone called 'The Lich' but they won't tell me more. They just say to keep the fountain pure and strong.",
        choices: [
          {
            text: "The Lich... I've heard that name",
            next: 'lich_knowledge'
          },
          {
            text: "We'll face it together when it comes",
            next: 'brave_together',
            effects: { trust: 5 }
          }
        ]
      },
      {
        id: 'other_fairies',
        npcLine: "A few! But most are too shy to show themselves. There's Moonbeam who guards the castle, Rosebud in the royal gardens, and... *whispers* the Shadow Fairy, but we don't talk about her. She made some bad choices.",
        choices: [
          {
            text: "Shadow Fairy?",
            next: 'shadow_fairy'
          },
          {
            text: "Maybe I'll meet them someday",
            next: 'meet_fairies'
          }
        ]
      },
      {
        id: 'shadow_fairy',
        npcLine: "*looks sad* She used to be like me, but she made a deal with dark forces for more power. Now she can only come out at night and feeds on nightmares. It's very tragic. Remember: power isn't worth losing yourself!",
        choices: [
          {
            text: "That's good advice",
            next: 'end_wise',
            effects: { trust: 2 }
          }
        ]
      },
      {
        id: 'friendship',
        npcLine: "*glows brighter* Really?! Oh, that makes me so happy! Here, take this - it's a crystallized dewdrop from my home forest. It'll bring you luck! Come visit me anytime!",
        giveItem: { type: 'accessory', name: 'Fairy Dewdrop', effects: { luck: 1 } },
        choices: [
          {
            text: "Thank you! I'll visit often",
            next: 'end_friend'
          }
        ]
      },
      {
        id: 'protector',
        npcLine: "*sparkles with joy* Oh thank you! A brave protector and a fairy guardian - we make a good team! Here, take this enchanted leaf. If you're ever in mortal danger, hold it tight and think of the fountain. It might just save you!",
        giveItem: { type: 'item', name: 'Enchanted Leaf', description: 'A magical leaf that may protect you once from death' },
        choices: []
      },
      {
        id: 'quest_accepted',
        npcLine: "Wonderful! When you find the Pure Sugar Essence, come back to me. I'll have something special for you!",
        choices: []
      },
      {
        id: 'end_blessed',
        npcLine: "*twirls happily* May your path be sweet and your burdens light!",
        choices: []
      },
      {
        id: 'end_friend',
        npcLine: "*does a happy dance in the air* I have a human friend! This is the best day ever!",
        choices: []
      },
      {
        id: 'end_wise',
        npcLine: "*nods sagely for such a tiny creature* Remember, true magic comes from kindness and courage, not from power!",
        choices: []
      }
    ]
  }
};