// src/js/data/starchyDialogues.js
// Starchy — The Conspiracy Theorist Gravedigger
// Deep, exploratory, reputation-aware dialogue tree

export const starchyDialogues = {
  biome: "candy_kingdom",
  npcType: "starchy",
  start: "greeting_root",
  meta: {
    // Helper thresholds for reputation checks
    rep: { distrust: -20, neutral: 0, friendly: 20, trusted: 50 }
  },
  nodes: [
    // ========= GREETING (rep-gated entry) =========
    {
      id: "greeting_root",
      npcLine: [
        "Oh my glob! Starchy here! Gravedigger by trade, truth-sayer by night!",
        "...Unless you're one o' PB's spies, then I ain't sayin' nothin'!"
      ],
      // Fan out to one of three greeting variants based on reputation
      choices: [
        {
          text: "(Continue...)",
          next: "greet_low",
          conditions: [
            { relationBelow: { target: "npc", metric: "value", value: -20 } }
          ]
        },
        {
          text: "(Continue...)",
          next: "greet_neutral",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "value", value: -20 } },
            { relationBelow: { target: "npc", metric: "value", value: 20 } }
          ]
        },
        {
          text: "(Continue...)",
          next: "greet_high",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "value", value: 20 } }
          ]
        }
      ]
    },

    {
      id: "greet_low",
      npcLine: [
        "Ohh... it's YOU. I know a Princess Bubblegum stooge when I smell one.",
        "You best keep your distance, bub. The graveyard shift knows all about your type!"
      ],
      choices: [
        { text: "I'm not a spy. Let's talk.", next: "main_menu_wary" },
        {
          text: "[Mock] Nice tinfoil hat, Starchy.",
          next: "mock_starchy",
          effects: [
            { relationDelta: { target: "npc", deltas: { value: -8, respect: -6 } } }
          ]
        },
        { text: "Fine, I'll go.", end: true }
      ]
    },

    {
      id: "greet_neutral",
      npcLine: [
        "Howdy, citizen! Starchy at your service—graves, mail, janitorin', and midnight truths on the *Graveyard Shift*!",
        "Whaddya need? Haints, conspiracies, or just directions to the nearest cover-up?"
      ],
      choices: [
        {
          text: "[QUEST] I've quieted the haints and got the whisper shard!",
          next: "complete_warding_quest",
          conditions: [
            { hasCompletedObjective: { questId: "warding_the_haints", objective: "all" } }
          ]
        },
        { text: "Tell me about your jobs.", next: "jobs_root" },
        { text: "What conspiracies ya got?", next: "cons_root" },
        { text: "Heard any haunt stories?", next: "haints_root" },
        { text: "What do you think about Princess Bubblegum?", next: "pb_opinion_root" },
        { text: "You doing okay, Starchy?", next: "lonely_probe" },
        { text: "See you, Starchy.", end: true }
      ]
    },

    {
      id: "greet_high",
      npcLine: [
        "Ah! My trusty friend returns. Starchy's always glad for a keen ear and a closed mouth.",
        "I've got graves to dig and truths to unearth. Which one tickles yer sweet tooth today?"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: 2, trust: 2 } } }
      ],
      choices: [
        {
          text: "[QUEST] I've quieted the haints and got the whisper shard!",
          next: "complete_warding_quest",
          conditions: [
            { hasCompletedObjective: { questId: "warding_the_haints", objective: "all" } }
          ]
        },
        { text: "Your work—how do you juggle it all?", next: "jobs_root" },
        { text: "Lay the biggest conspiracy on me.", next: "cons_trusted_gate" },
        { text: "Those 'haints'—want help?", next: "haints_root" },
        { text: "Level with me: PB. Good or bad?", next: "pb_opinion_root" },
        { text: "How are *you*, really?", next: "lonely_probe" },
        { text: "Later, friend.", end: true }
      ]
    },

    // ========= WARY MENU =========
    {
      id: "main_menu_wary",
      npcLine: "Alright... but I'm watchin' you. What do you want?",
      choices: [
        { text: "Just curious about your work.", next: "jobs_root" },
        { text: "Heard you know things.", next: "cons_wary" },
        { text: "Never mind.", end: true }
      ]
    },

    // ========= JOBS =========
    {
      id: "jobs_root",
      npcLine: [
        "Graves by day, haints by night, letters in between! Starchy don't sleep much.",
        "But the dead? They sleep plenty. Usually. Unless they're candy zombies..."
      ],
      choices: [
        { text: "Ever dig up anything... strange?", next: "jobs_strange_gate" },
        { text: "You hear things in the graveyard?", next: "haints_root" },
        { text: "Need a hand with chores?", next: "jobs_help" },
        { text: "Back to other topics.", next: "hub_back" }
      ]
    },
    
    {
      id: "jobs_help",
      npcLine: [
        "Heh! Always. But you don't look like the mop-and-bucket type.",
        "Tell ya what: if you can lay wards on the graves, I'll call it even."
      ],
      choices: [
        { text: "I can place wards.", next: "haints_quest_offer" },
        { text: "Maybe later.", next: "hub_back" }
      ]
    },
    
    {
      id: "jobs_strange_gate",
      npcLine: "Oh my glob... Depends who's askin'. You workin' for the Princess?",
      choices: [
        {
          text: "You can trust me.",
          next: "jobs_strange_mid",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "trust", value: 10 } }
          ]
        },
        {
          text: "[Persuade] I can help keep the kingdom safe.",
          next: "jobs_strange_mid",
          effects: [
            { relationDelta: { target: "npc", deltas: { value: 3, trust: 2 } } }
          ]
        },
        { text: "Never mind.", next: "hub_back" }
      ]
    },
    
    {
      id: "jobs_strange_mid",
      npcLine: [
        "Sometimes I find notes. Broken candy bodies. Labels from PB's lab.",
        "Failed experiments, she calls 'em. Cuts me up, y'know? Candy folk should be sweet, not... disposable."
      ],
      choices: [
        {
          text: "Show me one of those notes.",
          next: "jobs_strange_proof_gate",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "trust", value: 20 } }
          ]
        },
        { text: "We should tell someone.", next: "jobs_strange_pushback" },
        { text: "That's heavy. I'm sorry.", next: "jobs_empathy" }
      ]
    },
    
    {
      id: "jobs_strange_proof_gate",
      npcLine: [
        "Alright. I stashed one in a locked crypt—third row, behind the Rootbeer mausoleum.",
        "Bring it back, keep it quiet. Don't let the Banana Guards see you pokin' around."
      ],
      effects: [
        { startQuest: { id: "grave_discoveries" } }
      ],
      end: true
    },
    
    {
      id: "jobs_strange_pushback",
      npcLine: [
        "Tell who? The Guards? They're programmed to forget half what they see!",
        "We'll do more good keepin' records and waitin' for the right moment."
      ],
      choices: [
        { text: "If you say so. What's next?", next: "hub_back" },
        { text: "I still think we should report it.", next: "report_warning" }
      ]
    },
    
    {
      id: "jobs_empathy",
      npcLine: [
        "Aw, thanks. Not many listen to Starchy when he talks *feelings*.",
        "Yer alright, friend. Oh my glob, you're actually alright!"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: 8, trust: 6 } } }
      ],
      end: true
    },

    // ========= CONSPIRACIES =========
    {
      id: "cons_root",
      npcLine: [
        "Which flavor o' truth you cravin'? Guards, Candy Science, or the... *Other Stuff*?",
        "Fair warning: once you know, you can't un-know!"
      ],
      choices: [
        { text: "Banana Guards & memory wipes", next: "cons_guards" },
        { text: "Peppermint Butler & demons", next: "cons_butler" },
        { text: "What's the 'Other Stuff'?", next: "cons_trusted_gate" },
        { text: "Leave conspiracies.", next: "hub_back" }
      ]
    },

    {
      id: "cons_wary",
      npcLine: [
        "Know things? Me? Nah...",
        "Just a simple gravedigger who definitely doesn't run a midnight radio show about government cover-ups."
      ],
      choices: [
        { text: "Tell me more about this radio show.", next: "cons_radio" },
        { text: "Right. See you around.", end: true }
      ]
    },

    {
      id: "cons_radio",
      npcLine: [
        "The Graveyard Shift! Every midnight, I broadcast the TRUTH about this kingdom!",
        "Last week's episode: 'Security Cameras or Mind Control Nodes?' You'd be surprised..."
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: 3 } } }
      ],
      choices: [
        { text: "Sounds interesting.", next: "hub_back" },
        { text: "Sounds crazy.", next: "mock_starchy" }
      ]
    },
    
    {
      id: "cons_guards",
      npcLine: [
        "They ain't just clumsy—PB scrubs their memories after certain incidents!",
        "I got timestamps: incident—clean-up—'nothing happened.' See the pattern?"
      ],
      choices: [
        {
          text: "Makes sense. Can we prove it?",
          next: "cons_guards_proof",
          effects: [
            { relationDelta: { target: "npc", deltas: { respect: 3, value: 3 } } }
          ]
        },
        {
          text: "That's a stretch.",
          next: "cons_skeptic",
          effects: [
            { relationDelta: { target: "npc", deltas: { value: -4 } } }
          ]
        },
        { text: "Another topic.", next: "hub_back" }
      ]
    },
    
    {
      id: "cons_guards_proof",
      npcLine: [
        "We'd need logs from the barracks. Or a guard willing to talk—and remember.",
        "Maybe Root Beer Guy's heard whispers. He hears everythin'."
      ],
      end: true
    },

    {
      id: "cons_skeptic",
      npcLine: [
        "That's what they all say! Then BAM—candy zombie apocalypse!",
        "Remember the Slumber Party Panic? I literally EXPLODED from fear!"
      ],
      choices: [
        { text: "You... exploded?", next: "cons_exploded" },
        { text: "Let's change topics.", next: "hub_back" }
      ]
    },

    {
      id: "cons_exploded",
      npcLine: [
        "Dead as a doornail! PB brought me back with her decorpsinator serum.",
        "But what else did she do while I was in pieces? THAT'S the real question!"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: 2 } } }
      ],
      end: true
    },
    
    {
      id: "cons_butler",
      npcLine: [
        "The mint's knee-deep in demonology! Kingdom turns a blind eye 'cause he's useful.",
        "Starchy's advice? Take his deals only if ya like soul paperwork."
      ],
      choices: [
        { text: "Any protection against his magic?", next: "cons_butler_ward" },
        { text: "He's loyal to PB though, right?", next: "cons_butler_loyal" },
        { text: "Let's switch topics.", next: "hub_back" }
      ]
    },
    
    {
      id: "cons_butler_ward",
      npcLine: [
        "Peppermint wards help a tad. I can make ya one if you run a favor for me.",
        "No refunds if your soul gets repossessed! Oh my glob!"
      ],
      effects: [
        { startQuest: { id: "mint_ward_errand" } }
      ],
      end: true
    },
    
    {
      id: "cons_butler_loyal",
      npcLine: [
        "Loyal? Sure. To PB. To the kingdom? *Most days.* To himself? Always.",
        "Folks got layers. Like jawbreakers. And demons."
      ],
      end: true
    },
    
    {
      id: "cons_trusted_gate",
      npcLine: "The Other Stuff ain't for every ear. It's Veritas Brigade level intel.",
      choices: [
        {
          text: "What's the Veritas Brigade?",
          next: "cons_veritas",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "value", value: 10 } }
          ]
        },
        {
          text: "You can trust me with the truth.",
          next: "cons_trusted",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "value", value: 20 } },
            { relationAtLeast: { target: "npc", metric: "trust", value: 15 } }
          ]
        },
        { text: "Guess I'm not ready.", next: "hub_back" }
      ]
    },

    {
      id: "cons_veritas",
      npcLine: [
        "My secret club! Dedicated to uncovering the Princess's dark secrets!",
        "Members get decoder rings and everything! But you gotta prove yourself first."
      ],
      choices: [
        { text: "How do I prove myself?", next: "cons_veritas_test" },
        { text: "Sounds paranoid.", next: "cons_skeptic" }
      ]
    },

    {
      id: "cons_veritas_test",
      npcLine: [
        "Help me with a few investigations. Show you can keep secrets.",
        "Then maybe—MAYBE—you get a decoder ring. They're limited edition!"
      ],
      end: true
    },
    
    {
      id: "cons_trusted",
      npcLine: [
        "PB's got *Sugar War Protocols*—candy weapons that can melt flesh candy AND real flesh!",
        "Blueprints still exist. With 'em, you could arm a small army... or stop one."
      ],
      choices: [
        {
          text: "Where are these blueprints?",
          next: "cons_trusted_loc",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "trust", value: 30 } }
          ]
        },
        { text: "That's dangerous knowledge.", next: "cons_trusted_moral" },
        { text: "We should tell PB.", next: "report_warning" }
      ]
    },
    
    {
      id: "cons_trusted_loc",
      npcLine: [
        "Candy Dungeon. Deep depths. A sealed archive behind the syrup falls.",
        "You bring 'em back—we decide who gets to see 'em. Veritas Brigade style!"
      ],
      effects: [
        { startQuest: { id: "sugar_war_protocols" } }
      ],
      end: true
    },
    
    {
      id: "cons_trusted_moral",
      npcLine: [
        "Dangerous truths are still truths! Best we hold 'em, not the baddies.",
        "You in or out?"
      ],
      choices: [
        { text: "I'm in.", next: "cons_trusted_loc" },
        { text: "Out—for now.", next: "hub_back" }
      ]
    },

    // ========= HAINTS =========
    {
      id: "haints_root",
      npcLine: [
        "Haints are the whisperin' kind—candy folk who didn't pass on proper.",
        "They talk to me at night. Tell secrets. Sometimes lies. Always spooky!"
      ],
      choices: [
        { text: "How do we help them pass on?", next: "haints_help" },
        { text: "Can you prove they're real?", next: "haints_proof" },
        { text: "Give me a job. I'll help.", next: "haints_quest_offer" },
        { text: "Let's talk about something else.", next: "hub_back" }
      ]
    },
    
    {
      id: "haints_help",
      npcLine: [
        "Grave salts on the graves calm 'em. Problem is, a ghoul's taken up residence in my shed!",
        "Can't get the salts without dealin' with that heeby-jeeby monster first!"
      ],
      choices: [
        { text: "I'll handle the ghoul.", next: "haints_quest_offer" },
        { text: "Sounds dangerous. Pass.", next: "hub_back" }
      ]
    },
    
    {
      id: "haints_proof",
      npcLine: [
        "Bring a *whisper shard* from the graveyard mist—tiny crystal that hums with a voice.",
        "You'll hear 'em too. Then you'll believe. Oh my glob, will you believe!"
      ],
      effects: [
        { startQuest: { id: "warding_the_haints" } }
      ],
      end: true
    },
    
    {
      id: "haints_quest_offer",
      npcLine: [
        "Oh my glob! The grave salts are in my shed, but a ghoul moved in there!",
        "Gives me the heeby jeebies, that thing does! Here's the key—get rid of it,",
        "grab the salts, then sprinkle 'em on graves after dark. If the whispers quiet, come back!"
      ],
      effects: [
        { startQuest: { id: "warding_the_haints" } }
      ],
      end: true
    },

    // ========= PB OPINION =========
    {
      id: "pb_opinion_root",
      npcLine: [
        "PB's smart. Too smart. Built us candy folk... which means she can unbuild us too.",
        "Starchy keeps records. For the day folks need 'em. The truth will out!"
      ],
      choices: [
        {
          text: "You *have* records?",
          next: "pb_records_gate",
          conditions: [
            { relationAtLeast: { target: "npc", metric: "trust", value: 20 } }
          ]
        },
        { text: "She protects the kingdom.", next: "pb_defense" },
        { text: "That's messed up if true.", next: "pb_concern" },
        { text: "Let's change the subject.", next: "hub_back" }
      ]
    },
    
    {
      id: "pb_records_gate",
      npcLine: [
        "Locked crypt. Hidden stash. Bring me the ledger plate and we'll copy it discreet.",
        "No grandstanding. Not yet. The Veritas Brigade plays the long game!"
      ],
      effects: [
        { startQuest: { id: "pbs_secrets" } }
      ],
      end: true
    },
    
    {
      id: "pb_defense",
      npcLine: [
        "She *tries* to. World's a bitey place. Can't fault her for that.",
        "Just don't want the little folk to get chewed up first, y'know?"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { respect: 3 } } }
      ],
      end: true
    },
    
    {
      id: "pb_concern",
      npcLine: [
        "Good! Keep that concern handy. Might save lives someday.",
        "I'll share more when you've earned it. Veritas Brigade doesn't take just anyone!"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: 5, trust: 3 } } }
      ],
      end: true
    },

    // ========= LONELINESS / EMPATHY =========
    {
      id: "lonely_probe",
      npcLine: [
        "Eh... truth is, it's a cold job. Folks laugh, call me crazy.",
        "Graveyard's quiet. Too quiet. Sometimes I talk to myself just to hear a voice..."
      ],
      choices: [
        {
          text: "You're not crazy. You're careful.",
          next: "lonely_kind",
          effects: [
            { relationDelta: { target: "npc", deltas: { value: 10, trust: 8 } } }
          ]
        },
        {
          text: "[Joke] I'd hang out more, but I'm allergic to ghosts.",
          next: "lonely_joke",
          effects: [
            { relationDelta: { target: "npc", deltas: { value: 4 } } }
          ]
        },
        {
          text: "[Cruel] Maybe folks laugh for a reason.",
          next: "lonely_cruel",
          effects: [
            { relationDelta: { target: "npc", deltas: { value: -15, respect: -10 } } }
          ]
        },
        { text: "Let's talk about something else.", next: "hub_back" }
      ]
    },
    
    {
      id: "lonely_kind",
      npcLine: [
        "Oh my glob... Thanks, friend. Not many say it plain.",
        "Here—Starchy's *Graveyard Shift* badge. Wear it, and I'll know you're family. Welcome to the Veritas Brigade!"
      ],
      effects: [
        { grantItem: { id: "graveyard_shift_badge", qty: 1 } },
        { setFlag: { flag: "veritas_brigade_member", value: true } }
      ],
      end: true
    },
    
    {
      id: "lonely_joke",
      npcLine: [
        "Ha! Good one. If you sneeze ectoplasm, see a doc. Trust me on that one!",
        "Thanks for the laugh. Gets lonely diggin' graves all day."
      ],
      end: true
    },
    
    {
      id: "lonely_cruel",
      npcLine: [
        "...Get outta my cemetery.",
        "And don't come back 'til you grow a heart! Oh my glob!"
      ],
      effects: [
        { factionDelta: { entity: "player", faction: "peasants", delta: -5, reason: "cruel to Starchy" } }
      ],
      end: true
    },

    // ========= REPORTING (consequence scaffold) =========
    {
      id: "report_warning",
      npcLine: [
        "You go to PB with raw truth, you'll spook the kingdom! Starchy'll lose sources!",
        "If you do it anyway... don't expect me to shake your hand. The Veritas Brigade remembers."
      ],
      choices: [
        {
          text: "I'll keep it quiet—for now.",
          next: "hub_back",
          effects: [
            { relationDelta: { target: "npc", deltas: { trust: 4 } } }
          ]
        },
        {
          text: "I'm telling PB. It's the right thing.",
          next: "report_choice_mark",
          effects: [
            { setFlag: { flag: "player_reports_to_pb", value: true } }
          ]
        }
      ]
    },
    
    {
      id: "report_choice_mark",
      npcLine: [
        "Then this is where we part roads. Oh my glob, I thought you were different!",
        "I protect the little folk from big secrets. Even from you. You're banned from the Graveyard Shift!"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: -100, trust: -100 } } },
        {
          emitEvent: {
            type: "RumorShared",
            payload: { id: "starchy_denounces_player", detail: "Starchy denounced the player on Graveyard Shift" }
          }
        },
        { factionDelta: { entity: "player", faction: "peasants", delta: -10, reason: "betrayed Starchy" } }
      ],
      end: true
    },

    // ========= MOCK PATH =========
    {
      id: "mock_starchy",
      npcLine: [
        "Har har. Real cute. Laugh it up while the haints gnaw your bootlaces!",
        "Oh my glob, we're done here!"
      ],
      effects: [
        { relationDelta: { target: "npc", deltas: { value: -5, respect: -5 } } }
      ],
      end: true
    },

    // ========= QUEST COMPLETION =========
    {
      id: "complete_warding_quest",
      npcLine: [
        "Oh my glob! You actually did it! The whisper shard... I can hear 'em too now!",
        "The haints are quieter, sure enough. You're a true friend of the Veritas Brigade!",
        "Here's your reward—a peppermint ward ring! Never know when you'll need demon protection!"
      ],
      effects: [
        { completeQuest: { id: "warding_the_haints" } },
        { relationDelta: { target: "npc", deltas: { value: 10, trust: 8, respect: 5 } } }
      ],
      choices: [
        { text: "What did the whispers say?", next: "whisper_reveal" },
        { text: "Thanks, Starchy.", next: "hub_back" }
      ]
    },
    
    {
      id: "whisper_reveal",
      npcLine: [
        "The whispers... they speak of failed experiments, candy citizens who 'didn't work out.'",
        "PB's been buryin' her mistakes here for years! The haints are the souls of candy folk she couldn't perfect!",
        "This shard is proof! The Graveyard Shift listeners are gonna flip their lids!"
      ],
      choices: [
        { text: "That's... dark.", next: "dark_acknowledge" },
        { text: "You're really going to broadcast this?", next: "broadcast_confirm" },
        { text: "Good luck with that.", end: true }
      ]
    },
    
    {
      id: "dark_acknowledge",
      npcLine: [
        "Dark as a demon's diary! But that's the truth they don't want ya to know!",
        "Keep diggin', friend. There's more where that came from!"
      ],
      end: true
    },
    
    {
      id: "broadcast_confirm",
      npcLine: [
        "You betcha! Tomorrow night on the Graveyard Shift! 'The Whispers of Failed Candy!'",
        "Course, half the kingdom thinks I'm nuts already. But you and I know better, don't we?"
      ],
      end: true
    },

    // ========= HUB RETURN =========
    {
      id: "hub_back",
      npcLine: "What else ya need, friend? The truth never sleeps!",
      choices: [
        { text: "Your jobs", next: "jobs_root" },
        { text: "Conspiracies", next: "cons_root" },
        { text: "Haints", next: "haints_root" },
        { text: "PB talk", next: "pb_opinion_root" },
        { text: "Nothing more.", end: true }
      ]
    },

    // ========= CONDITION HELPER =========
    {
      id: "relationBelow",
      // This is a helper node for condition checking
      // Not actually visited in dialogue
    }
  ]
};

// Export a helper function to check for the relationBelow condition
export function checkRelationBelow(conditions) {
  if (!conditions) return true;
  for (const condition of conditions) {
    if (condition.relationBelow) {
      // This needs to be handled by the dialogue system
      return true;
    }
  }
  return true;
}