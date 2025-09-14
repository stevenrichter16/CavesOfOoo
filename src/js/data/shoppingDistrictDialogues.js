// src/js/data/shoppingDistrictDialogues.js
// Dialogue trees for Shopping District NPCs

export const shoppingDistrictDialogues = {
  // === GUARDS (Generic guards dialogue) ===
  guards: {
    biome: 'candy_kingdom',
    npcType: 'guards',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Halt! I mean... hello, citizen. Everything's under control here.",
        choices: [
          { text: "What are you guarding?", next: 'guarding' },
          { text: "Any trouble lately?", next: 'trouble' },
          { text: "Keep up the good work", next: 'thanks' },
          { text: "Goodbye", action: 'end' }
        ]
      },
      {
        id: 'guarding',
        npcLine: "The Shopping District, of course! Gotta keep the peace between merchants and customers.",
        choices: [
          { text: "Sounds important", next: 'important' },
          { text: "Must be boring", next: 'boring' },
          { text: "I see", next: 'greeting' }
        ]
      },
      {
        id: 'important',
        npcLine: "Very important! Princess Bubblegum says commerce is the lifeblood of the kingdom.",
        choices: [
          { text: "The Princess is wise", next: 'wise' },
          { text: "If you say so", next: 'greeting' }
        ]
      },
      {
        id: 'wise',
        npcLine: "The wisest! We're lucky to serve under her rule.",
        choices: [
          { text: "Indeed", next: 'greeting' }
        ]
      },
      {
        id: 'boring',
        npcLine: "Hey! It's not... okay, maybe a little. But someone's gotta do it!",
        choices: [
          { text: "Sorry, didn't mean to offend", next: 'greeting' },
          { text: "At least you're honest", next: 'greeting' }
        ]
      },
      {
        id: 'trouble',
        npcLine: "Just the usual. Some haggling got heated at Choose Goose's stall. And someone complained Pizza Sassy's was TOO sassy.",
        choices: [
          { text: "Too sassy?", next: 'too_sassy' },
          { text: "Typical day then", next: 'greeting' }
        ]
      },
      {
        id: 'too_sassy',
        npcLine: "I know, right? It's literally in the name! Some people just don't get it.",
        choices: [
          { text: "People are strange", next: 'greeting' }
        ]
      },
      {
        id: 'thanks',
        npcLine: "Oh! Well... thank you, citizen! That means a lot. Not many people appreciate us guards.",
        choices: [
          { 
            text: "You deserve recognition", 
            next: 'greeting',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: 10, trust: 5, respect: 10 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'guards',
                delta: 5,
                reason: 'appreciation'
              }
            }]
          }
        ]
      }
    ]
  },

  // === PEASANTS (Generic peasant/visitor dialogue) ===
  peasants: {
    biome: 'candy_kingdom',
    npcType: 'peasants',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Oh, hello there! Are you shopping too? This place has everything!",
        choices: [
          { text: "Yes, looking around", next: 'shopping' },
          { text: "What do you recommend?", next: 'recommend' },
          { text: "Just passing through", next: 'passing' },
          { text: "Goodbye", action: 'end' }
        ]
      },
      {
        id: 'shopping',
        npcLine: "Isn't it wonderful? Though the prices keep going up. Used to be able to get a candy apple for half what it costs now!",
        choices: [
          { text: "Inflation is everywhere", next: 'inflation' },
          { text: "Still worth it though", next: 'worth' },
          { text: "That's rough", next: 'greeting' }
        ]
      },
      {
        id: 'inflation',
        npcLine: "Tell me about it! My sugar salary hasn't gone up in three years. But what can you do?",
        choices: [
          { text: "Organize a union?", next: 'union' },
          { text: "Times are tough", next: 'greeting' }
        ]
      },
      {
        id: 'union',
        npcLine: "Shhh! Not so loud! The Banana Guards might hear you. But... you might be onto something.",
        choices: [
          { text: "Workers unite!", next: 'workers' },
          { text: "Just kidding", next: 'greeting' }
        ]
      },
      {
        id: 'workers',
        npcLine: "Haha, you're brave! I like that. Maybe things can change around here.",
        choices: [
          { 
            text: "Change starts with us", 
            next: 'greeting',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: 15, trust: 10, respect: 15 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'peasants',
                delta: 10,
                reason: 'solidarity'
              }
            }]
          }
        ]
      },
      {
        id: 'worth',
        npcLine: "You must be doing well! Good for you. Some of us are just scraping by.",
        choices: [
          { text: "Sorry, I didn't mean...", next: 'sorry' },
          { text: "Work harder then", next: 'rude' }
        ]
      },
      {
        id: 'sorry',
        npcLine: "No, no, it's fine. We all have our struggles. Enjoy your shopping!",
        choices: [
          { text: "Thanks, you too", next: 'greeting' }
        ]
      },
      {
        id: 'rude',
        npcLine: "Wow. Just... wow. Must be nice up there on your high horse made of candy.",
        choices: [
          { 
            text: "That's life", 
            next: 'greeting',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: -20, trust: -15, respect: -20 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'peasants',
                delta: -15,
                reason: 'insult'
              }
            }]
          },
          { text: "Sorry, that was harsh", next: 'sorry' }
        ]
      },
      {
        id: 'recommend',
        npcLine: "Well, Choose Goose has interesting trinkets, but he won't stop rhyming. The pharmacy has good deals on medicine though!",
        choices: [
          { text: "Thanks for the tips", next: 'tips' },
          { text: "I'll check them out", next: 'greeting' }
        ]
      },
      {
        id: 'tips',
        npcLine: "Happy to help! We regular folk gotta stick together, you know?",
        choices: [
          { text: "Absolutely", next: 'greeting' }
        ]
      },
      {
        id: 'passing',
        npcLine: "Oh, well enjoy your walk! Watch out for the fountain - kids keep throwing candy coins in it.",
        choices: [
          { text: "Thanks for the warning", next: 'greeting' }
        ]
      }
    ]
  },

  // === NOBLES (Generic noble dialogue) ===
  noble: {
    biome: 'candy_kingdom',
    npcType: 'noble',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Ah, another visitor to our... commercial district. How quaint. I suppose you're here to shop?",
        proudVariant: "Hmm, I don't believe we've been properly introduced. I am of noble standing, you know.",
        humbleVariant: "Good day! Lovely weather for shopping, isn't it?",
        choices: [
          { text: "Yes, my lord/lady", next: 'respectful' },
          { text: "What's it to you?", next: 'rude' },
          { text: "Just browsing", next: 'browsing' },
          { text: "Excuse me", action: 'end' }
        ]
      },
      {
        id: 'respectful',
        npcLine: "At least someone here has proper manners. The merchant class could learn from your example.",
        choices: [
          { text: "Thank you, your grace", next: 'grace' },
          { text: "The merchants work hard", next: 'defend_merchants' },
          { text: "Indeed", next: 'greeting' }
        ]
      },
      {
        id: 'grace',
        npcLine: "'Your grace'! How delightful! You clearly understand proper etiquette. So rare these days.",
        choices: [
          { 
            text: "One must maintain standards", 
            next: 'standards',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: 20, trust: 10, respect: 25 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'nobles',
                delta: 15,
                reason: 'proper_etiquette'
              }
            }]
          },
          { text: "Of course", next: 'greeting' }
        ]
      },
      {
        id: 'standards',
        npcLine: "Precisely! You'd make a fine addition to court. Perhaps I should mention you to Princess Bubblegum.",
        choices: [
          { text: "I would be honored", next: 'honored' },
          { text: "That's not necessary", next: 'greeting' }
        ]
      },
      {
        id: 'honored',
        npcLine: "We'll see. Continue to demonstrate such refined behavior, and who knows what doors might open?",
        choices: [
          { text: "Thank you for your kindness", next: 'greeting' }
        ]
      },
      {
        id: 'defend_merchants',
        npcLine: "'Work hard'? They haggle and gossip. Hardly comparable to managing estates and attending court.",
        choices: [
          { text: "Everyone contributes differently", next: 'contribute' },
          { text: "You're right, of course", next: 'greeting' }
        ]
      },
      {
        id: 'contribute',
        npcLine: "How... democratic of you. I suppose next you'll say the Banana Guards deserve equal say in governance?",
        choices: [
          { text: "Why not?", next: 'why_not' },
          { text: "That's different", next: 'greeting' }
        ]
      },
      {
        id: 'why_not',
        npcLine: "*laughs* Oh, you're serious? How amusing. Democracy is chaos, dear. Hierarchy maintains order.",
        choices: [
          { 
            text: "Hierarchy maintains oppression", 
            next: 'greeting',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: -25, trust: -20, respect: -15 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'nobles',
                delta: -20,
                reason: 'revolutionary_talk'
              }
            }]
          },
          { text: "Perhaps you're right", next: 'greeting' }
        ]
      },
      {
        id: 'rude',
        npcLine: "Such insolence! Do you know who I am? My family has served the crown for generations!",
        choices: [
          { text: "And I should care because...?", next: 'dont_care' },
          { text: "My apologies", next: 'apology' }
        ]
      },
      {
        id: 'dont_care',
        npcLine: "Because... because... Oh! The youth these days! No respect for tradition or position!",
        choices: [
          { 
            text: "Times are changing, old timer", 
            next: 'greeting',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: -30, trust: -25, respect: -30, fear: 10 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'nobles',
                delta: -25,
                reason: 'disrespect'
              }
            }]
          },
          { text: "Whatever", action: 'end' }
        ]
      },
      {
        id: 'apology',
        npcLine: "Hmph. Well. At least you know when you've erred. See that it doesn't happen again.",
        choices: [
          { text: "Yes, my lord/lady", next: 'greeting' },
          { text: "...", next: 'greeting' }
        ]
      },
      {
        id: 'browsing',
        npcLine: "Browsing. How pedestrian. I'm here on actual business - reviewing my family's merchant investments.",
        greedyVariant: "Every gold piece these merchants make, I get my percentage. It's a beautiful system.",
        choices: [
          { text: "Smart investing", next: 'investing' },
          { text: "Must be nice to have money", next: 'money' },
          { text: "Good for you", next: 'greeting' }
        ]
      },
      {
        id: 'investing',
        npcLine: "Indeed. One must make one's gold work for them. The secret is diversification and... connections.",
        choices: [
          { text: "Any tips?", next: 'tips' },
          { text: "Interesting", next: 'greeting' }
        ]
      },
      {
        id: 'tips',
        npcLine: "Tips? For you? Well... I suppose. Avoid Choose Goose - his margins are ridiculous. The pharmacy, however, steady profits.",
        choices: [
          { text: "Thank you for the advice", next: 'greeting' },
          { text: "I'll keep that in mind", next: 'greeting' }
        ]
      },
      {
        id: 'money',
        npcLine: "'Nice'? It's not about nice, it's about birthright and careful cultivation over generations.",
        choices: [
          { text: "And exploitation", next: 'exploitation' },
          { text: "I understand", next: 'greeting' }
        ]
      },
      {
        id: 'exploitation',
        npcLine: "Exploitation? I prefer 'maximizing human resources.' The peasants need work, I provide it. Symbiotic.",
        choices: [
          { text: "That's one way to see it", next: 'greeting' },
          { text: "You're a parasite", next: 'parasite' }
        ]
      },
      {
        id: 'parasite',
        npcLine: "How DARE you! Guards! GUARDS! Oh, they're never around when you need them...",
        choices: [
          { text: "*leave quickly*", action: 'end' }
        ]
      }
    ]
  },

  // === MERCHANT VENDORS (general merchants) ===
  merchants: {
    biome: 'candy_kingdom',
    npcType: 'merchants',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Welcome to my shop! I've got the finest goods in the Shopping District!",
        choices: [
          { text: "Show me what you have", action: 'openShop' },
          { text: "Tell me about the Shopping District", next: 'about_district' },
          { text: "Any news?", next: 'gossip' },
          { text: "Goodbye", action: 'end' }
        ]
      },
      {
        id: 'browse',
        npcLine: "Take your time browsing. Everything's fresh from the Candy Kingdom factories!",
        choices: [
          { 
            text: "I'll take a look", 
            action: 'openShop',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: 5 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'candy_kingdom',
                delta: 2,
                reason: 'shopping'
              }
            }]
          },
          { text: "What's your best seller?", next: 'best_seller' },
          { text: "Maybe later", next: 'greeting' }
        ]
      },
      {
        id: 'best_seller',
        npcLine: "The candy apples are flying off the shelves! Princess Bubblegum herself ordered a dozen last week.",
        choices: [
          { text: "I'll take one!", action: 'buyItem:candy_apple' },
          { text: "Interesting", next: 'greeting' }
        ]
      },
      {
        id: 'about_district',
        npcLine: "The Shopping District is the commercial heart of the Candy Kingdom! We've got everything from Pizza Sassy's to the fancy Coolest Hotel.",
        choices: [
          { text: "Where's Pizza Sassy's?", next: 'pizza_directions' },
          { text: "Tell me about the hotel", next: 'hotel_info' },
          { text: "Thanks", next: 'greeting' }
        ]
      },
      {
        id: 'pizza_directions',
        npcLine: "Pizza Sassy's is just north of here, you can't miss the peppermint frame! But watch out - they're VERY sassy.",
        choices: [
          { text: "How sassy?", next: 'sassy_warning' },
          { text: "Thanks for the tip", next: 'greeting' }
        ]
      },
      {
        id: 'sassy_warning',
        npcLine: "Let's just say... don't expect a smile with your service. It's literally in their name!",
        choices: [
          { text: "Haha, got it", next: 'greeting' }
        ]
      },
      {
        id: 'hotel_info',
        npcLine: "The Coolest Hotel is where all the fancy visitors stay. Very art deco, very expensive. Root Beer Guy works nearby at the call center.",
        choices: [
          { text: "Sounds fancy", next: 'greeting' }
        ]
      },
      {
        id: 'gossip',
        npcLine: "Well... I heard Choose Goose has been rhyming even MORE than usual. And Peppermint Butler was seen skulking around the plaza at midnight!",
        choices: [
          { text: "Mysterious!", next: 'greeting' },
          { text: "Typical Peppermint Butler", next: 'greeting' }
        ]
      }
    ]
  },

  // === CHOOSE GOOSE ===
  choose_goose: {
    biome: 'candy_kingdom',
    npcType: 'choose_goose',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Choose Goose! My name you can't refuse! I've got goods to make you choose, shiny trinkets you won't lose!",
        choices: [
          { text: "Show me your wares", action: 'openShop' },
          { text: "Why all the rhyming?", next: 'about_rhyming' },
          { text: "Got anything special?", next: 'special_items' },
          { text: "Goodbye", action: 'end' }
        ]
      },
      {
        id: 'browse',
        npcLine: "A look, a peek, at treasures unique! From golden geese to silver fleece!",
        choices: [
          { text: "Let me see", action: 'openShop' },
          { text: "What's with the golden geese?", next: 'golden_geese' },
          { text: "Maybe later", next: 'greeting' }
        ]
      },
      {
        id: 'golden_geese',
        npcLine: "Not real geese, just golden peace! Medallions fine at bargain price! Choose them twice, or maybe thrice!",
        choices: [
          { text: "I'll take one", action: 'buyItem:golden_medallion' },
          { text: "Too expensive", next: 'greeting' }
        ]
      },
      {
        id: 'about_rhyming',
        npcLine: "To rhyme's divine, it's how I shine! My words align in perfect time! No curse or hex, just how I flex!",
        choices: [
          { text: "That must be exhausting", next: 'not_tired' },
          { text: "I like it!", next: 'thanks' },
          { text: "Okay then", next: 'greeting' }
        ]
      },
      {
        id: 'not_tired',
        npcLine: "Not tired, I'm wired! Inspired, admired! My rhyming game has earned me fame!",
        choices: [
          { text: "Impressive", next: 'greeting' }
        ]
      },
      {
        id: 'thanks',
        npcLine: "Your praise I raise! In all my days, few appreciate my verbal maze!",
        choices: [
          { text: "You're welcome", next: 'greeting' }
        ]
      },
      {
        id: 'special_items',
        npcLine: "Special deals on magic wheels! Crystal balls that heed your calls! But choose with care, buyer beware!",
        choices: [
          { text: "Magic wheels?", next: 'magic_wheels' },
          { text: "Crystal balls?", next: 'crystal_balls' },
          { text: "Why beware?", next: 'warning' },
          { text: "I'll browse", next: 'browse' }
        ]
      },
      {
        id: 'magic_wheels',
        npcLine: "Wheels that spin and help you win! But once they start, they're hard to part!",
        choices: [
          { text: "Sounds dangerous", next: 'greeting' },
          { text: "I'll risk it", action: 'buyItem:magic_wheel' }
        ]
      },
      {
        id: 'crystal_balls',
        npcLine: "See your fate, but never late! The future's clear, but full of fear!",
        choices: [
          { text: "I don't need to know", next: 'greeting' },
          { text: "Show me one", action: 'buyItem:crystal_ball' }
        ]
      },
      {
        id: 'warning',
        npcLine: "Magic's trick is double quick! What seems a gift might cause a rift! Choose Goose knows, that's how it goes!",
        choices: [
          { text: "Thanks for the warning", next: 'greeting' }
        ]
      }
    ]
  },

  // === ROOT BEER GUY ===
  root_beer_guy: {
    biome: 'candy_kingdom',
    npcType: 'root_beer_guy',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Oh, hey there. Just on my break from the call center. *sigh* Another day, another dollar...",
        choices: [
          { text: "Rough day at work?", next: 'about_work' },
          { text: "You seem tired", next: 'tired' },
          { text: "Tell me about yourself", next: 'about_self' },
          { text: "See you around", action: 'end' }
        ]
      },
      {
        id: 'about_work',
        npcLine: "You know how it is... 'Have you tried turning it off and on again?' Eight hours a day. But hey, it pays the bills.",
        choices: [
          { text: "That sounds soul-crushing", next: 'soul_crushing' },
          { text: "At least you have a job", next: 'grateful' },
          { text: "Any interesting calls?", next: 'calls' }
        ]
      },
      {
        id: 'soul_crushing',
        npcLine: "It is what it is. But I'm writing a novel in my spare time! It's about a root beer float who becomes a detective.",
        choices: [
          { text: "That sounds amazing!", next: 'novel_encouraged' },
          { text: "Good luck with that", next: 'novel_skeptical' },
          { text: "Cool", next: 'greeting' }
        ]
      },
      {
        id: 'novel_encouraged',
        npcLine: "Really? Thanks! Not many people take my creative side seriously. Cherry Cream Soda supports me though.",
        choices: [
          { text: "Is that your wife?", next: 'about_wife' },
          { text: "Keep following your dreams", next: 'greeting' }
        ]
      },
      {
        id: 'about_wife',
        npcLine: "Yeah, we've been married for five years now. She works at the Candy Hospital. We're saving up for a house in the nice part of the kingdom.",
        choices: [
          { text: "That's sweet", next: 'greeting' },
          { text: "The suburban dream", next: 'suburban' }
        ]
      },
      {
        id: 'suburban',
        npcLine: "Haha, yeah... white picket fence made of candy canes and everything. It's not glamorous, but it's our dream.",
        choices: [
          { text: "Nothing wrong with that", next: 'greeting' }
        ]
      },
      {
        id: 'novel_skeptical',
        npcLine: "Yeah, I know it's a long shot. But you gotta have something to keep you going, you know?",
        choices: [
          { text: "I suppose so", next: 'greeting' }
        ]
      },
      {
        id: 'grateful',
        npcLine: "True, true. Steady paycheck, decent benefits. Can't complain too much. Well, I can, but I shouldn't.",
        choices: [
          { text: "Haha", next: 'greeting' }
        ]
      },
      {
        id: 'calls',
        npcLine: "Oh man, yesterday someone called because their candy computer was 'too sticky.' Turned out they spilled soda on it. Shocking, right?",
        choices: [
          { text: "People, am I right?", next: 'people' },
          { text: "That's hilarious", next: 'greeting' }
        ]
      },
      {
        id: 'people',
        npcLine: "Tell me about it. But hey, job security. As long as people keep having tech problems, I've got work.",
        choices: [
          { text: "Silver lining", next: 'greeting' }
        ]
      },
      {
        id: 'tired',
        npcLine: "Yeah, double shift yesterday. Someone called in sick. Probably out enjoying the weather while I'm stuck in a cubicle.",
        choices: [
          { text: "That's rough", next: 'greeting' },
          { text: "Hang in there", next: 'greeting' }
        ]
      },
      {
        id: 'about_self',
        npcLine: "I'm Root Beer Guy. I work at the call center, write novels that probably won't get published, and dream about early retirement. Living the dream!",
        choices: [
          { text: "Keep your chin up", next: 'greeting' },
          { text: "We all have our struggles", next: 'greeting' }
        ]
      }
    ]
  },

  // === PEPPERMINT BUTLER ===
  peppermint_butler: {
    biome: 'candy_kingdom',
    npcType: 'peppermint_butler',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Ah, a visitor to our Shopping District. How... interesting. Is there something specific you seek?",
        choices: [
          { text: "Just browsing", next: 'browsing' },
          { text: "What are you doing here?", next: 'what_doing' },
          { 
            text: "You seem suspicious", 
            next: 'suspicious',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: -10, trust: -15, fear: 5 }
              }
            }]
          },
          { text: "Nothing, goodbye", action: 'end' }
        ]
      },
      {
        id: 'browsing',
        npcLine: "Indeed. The Shopping District offers many... conveniences. Be careful what you purchase. Some deals come with hidden costs.",
        choices: [
          { text: "What do you mean?", next: 'hidden_costs' },
          { text: "Thanks for the warning", next: 'greeting' }
        ]
      },
      {
        id: 'hidden_costs',
        npcLine: "Let's just say not all merchants are as honest as they appear. Choose Goose, for instance, deals in more than mere trinkets.",
        choices: [
          { text: "What kind of deals?", next: 'goose_deals' },
          { text: "I'll be careful", next: 'greeting' }
        ]
      },
      {
        id: 'goose_deals',
        npcLine: "That would be telling. Some knowledge is earned, not given freely. Perhaps we could make an... arrangement?",
        choices: [
          { text: "What kind of arrangement?", next: 'arrangement' },
          { text: "No thanks", next: 'greeting' }
        ]
      },
      {
        id: 'arrangement',
        npcLine: "Information for information. Or perhaps a small favor. I'm always in need of... capable individuals.",
        choices: [
          { text: "I'll think about it", next: 'greeting' },
          { text: "Sounds shady", next: 'shady' }
        ]
      },
      {
        id: 'shady',
        npcLine: "Shady? I prefer 'discrete.' The Princess values my... unique skillset. As should you.",
        choices: [
          { text: "If you say so", next: 'greeting' }
        ]
      },
      {
        id: 'what_doing',
        npcLine: "Princess Bubblegum asked me to... observe the commercial activities. Ensure everything runs smoothly.",
        choices: [
          { text: "You mean spy on people?", next: 'spying' },
          { text: "Makes sense", next: 'greeting' }
        ]
      },
      {
        id: 'spying',
        npcLine: "Such a crude word. I prefer 'maintaining awareness.' The safety of the kingdom requires vigilance.",
        choices: [
          { text: "Right...", next: 'greeting' }
        ]
      },
      {
        id: 'suspicious',
        npcLine: "Suspicious? Me? I'm merely a humble servant of the Princess. Though I admit, trust is a luxury few can afford.",
        choices: [
          { 
            text: "Especially with you", 
            next: 'with_me',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: -5, trust: -10, respect: 5, fear: 5 }
              }
            }]
          },
          { text: "Fair point", next: 'greeting' }
        ]
      },
      {
        id: 'with_me',
        npcLine: "*chuckles darkly* You're learning. That will serve you well in this kingdom. Or destroy you. Time will tell.",
        choices: [
          { text: "Ominous", next: 'greeting' },
          { text: "I can handle myself", next: 'handle' }
        ]
      },
      {
        id: 'handle',
        npcLine: "We shall see. The Shopping District plaza has ears, and the fountain... well, some say it sees all.",
        choices: [
          { text: "The fountain?", next: 'fountain' },
          { text: "You're being cryptic", next: 'greeting' }
        ]
      },
      {
        id: 'fountain',
        npcLine: "Just an old rumor. Pay it no mind. Unless, of course, you have secrets to hide?",
        choices: [
          { text: "Everyone has secrets", next: 'greeting' },
          { text: "Not me", next: 'not_me' }
        ]
      },
      {
        id: 'not_me',
        npcLine: "How refreshingly naive. Hold onto that innocence. It's rarer than you might think in the Candy Kingdom.",
        choices: [
          { text: "...", next: 'greeting' }
        ]
      }
    ]
  },

  // === SASSY PEOPLE (Pizza Sassy's staff) ===
  sassy_people: {
    biome: 'candy_kingdom',
    npcType: 'sassy_people',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Welcome to Pizza Sassy's. What do you want? We don't have all day.",
        choices: [
          { text: "I'd like a pizza", next: 'order_pizza' },
          { text: "Why so rude?", next: 'why_rude' },
          { text: "Is the pizza good?", next: 'pizza_quality' },
          { text: "Nevermind", action: 'end' }
        ]
      },
      {
        id: 'order_pizza',
        npcLine: "Finally, someone who knows what they want. That'll be 10 gold. No, we don't do half toppings. Yes, it's worth it.",
        choices: [
          { 
            text: "Here's 10 gold", 
            action: 'buyItem:pizza', 
            condition: 'hasGold:10',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: 5, trust: 5 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'candy_kingdom',
                delta: 3,
                reason: 'purchase'
              }
            }]
          },
          { text: "That's expensive!", next: 'expensive' },
          { text: "What toppings?", next: 'toppings' },
          { text: "I changed my mind", next: 'changed_mind' }
        ]
      },
      {
        id: 'expensive',
        npcLine: "Then go eat somewhere else. Oh wait, we're the only pizza place in the kingdom. Tough luck.",
        choices: [
          { text: "Fine, here's the gold", action: 'buyItem:pizza', condition: 'hasGold:10' },
          { text: "This is ridiculous", next: 'ridiculous' }
        ]
      },
      {
        id: 'ridiculous',
        npcLine: "No, what's ridiculous is you standing here complaining instead of ordering. Next!",
        choices: [
          { text: "Wait, I'll order", next: 'order_pizza' },
          { text: "Forget it", action: 'end' }
        ]
      },
      {
        id: 'toppings',
        npcLine: "*rolls eyes* Candy corn, gummy bears, chocolate chips. It's CANDY Kingdom pizza. What did you expect, pepperoni?",
        choices: [
          { text: "Sounds... interesting", next: 'order_pizza' },
          { text: "That's disgusting", next: 'disgusting' }
        ]
      },
      {
        id: 'disgusting',
        npcLine: "Your face is disgusting. The pizza is delicious. Make up your mind or leave.",
        choices: [
          { 
            text: "How dare you!", 
            next: 'how_dare',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: -10, respect: -5 }
              },
              factionDelta: {
                entity: 'player',
                faction: 'candy_kingdom',
                delta: -5,
                reason: 'argument'
              }
            }]
          },
          { text: "I'll take one", next: 'order_pizza' },
          { text: "I'm leaving", action: 'end' }
        ]
      },
      {
        id: 'how_dare',
        npcLine: "How dare I? It's literally our brand. PIZZA SASSY'S. Reading comprehension much?",
        choices: [
          { text: "...", next: 'greeting' }
        ]
      },
      {
        id: 'changed_mind',
        npcLine: "Of course you did. Typical. NEXT!",
        choices: [
          { text: "Actually, wait...", next: 'order_pizza' },
          { text: "Bye", action: 'end' }
        ]
      },
      {
        id: 'why_rude',
        npcLine: "It's not rude, it's SASSY. It's in the name. Pizza SASSY'S. We put it right there so people like you would know what to expect.",
        choices: [
          { text: "But why?", next: 'but_why' },
          { text: "That's a terrible business model", next: 'business_model' },
          { text: "Fair enough", next: 'greeting' }
        ]
      },
      {
        id: 'but_why',
        npcLine: "Because life is short and pizza is forever. Also, it's fun. Your confused face right now? Priceless.",
        choices: [
          { text: "You're mean", next: 'mean' },
          { 
            text: "Actually that's kind of funny", 
            next: 'funny',
            effects: [{
              relationDelta: {
                target: 'player',
                deltas: { value: 10, trust: 5, respect: 10 }
              }
            }]
          }
        ]
      },
      {
        id: 'mean',
        npcLine: "And you're still here, so clearly it's working. Pizza or no pizza?",
        choices: [
          { text: "Pizza", next: 'order_pizza' },
          { text: "No pizza", action: 'end' }
        ]
      },
      {
        id: 'funny',
        npcLine: "See? You get it. Most people are too uptight. Now, you ordering or just here for the sass?",
        choices: [
          { text: "I'll order", next: 'order_pizza' },
          { text: "Just the sass", next: 'just_sass' }
        ]
      },
      {
        id: 'just_sass',
        npcLine: "Sass is free but you're taking up valuable insulting-actual-customers time. Shoo.",
        choices: [
          { text: "Haha, bye", action: 'end' }
        ]
      },
      {
        id: 'business_model',
        npcLine: "We're the only pizza place in the kingdom and there's a line out the door. Seems pretty good to me, genius.",
        choices: [
          { text: "Good point", next: 'greeting' },
          { text: "Still rude", next: 'greeting' }
        ]
      },
      {
        id: 'pizza_quality',
        npcLine: "No, it's terrible. That's why we're always packed and Princess Bubblegum orders from us twice a week. *eye roll*",
        choices: [
          { text: "The Princess eats here?", next: 'princess_eats' },
          { text: "Okay, one pizza", next: 'order_pizza' }
        ]
      },
      {
        id: 'princess_eats',
        npcLine: "Even royalty needs sass sometimes. Plus our garlic candy knots are to die for. Not literally. Probably.",
        choices: [
          { text: "Probably?", next: 'probably' },
          { text: "I'll try them", action: 'buyItem:garlic_knots', condition: 'hasGold:5' }
        ]
      },
      {
        id: 'probably',
        npcLine: "Look, no one's died YET. That's all I'm saying. You want food or a medical guarantee?",
        choices: [
          { text: "Food please", next: 'order_pizza' },
          { text: "I'll pass", action: 'end' }
        ]
      }
    ]
  },

  // === CINNAMON BUN ===
  cinnamon_bun: {
    biome: 'candy_kingdom',
    npcType: 'cinnamon_bun',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "Oh! Oh! Hi! I'm Cinnamon Bun! Are you new? You look new! Or maybe old? I can't tell!",
        choices: [
          { text: "Hi Cinnamon Bun", next: 'hi' },
          { text: "Are you okay?", next: 'okay' },
          { text: "What are you doing here?", next: 'what_doing' },
          { text: "Bye", action: 'end' }
        ]
      },
      {
        id: 'hi',
        npcLine: "You know my name! That's amazing! Sometimes I forget my name! But then I remember because people yell it at me!",
        choices: [
          { text: "Why do they yell?", next: 'yell' },
          { text: "That's... nice", next: 'greeting' }
        ]
      },
      {
        id: 'yell',
        npcLine: "Usually because I did something wrong! Or right? It's hard to tell! One time I tried to help at the bakery and accidentally set the oven to 'volcano'!",
        choices: [
          { text: "Volcano?", next: 'volcano' },
          { text: "Oh my", next: 'greeting' }
        ]
      },
      {
        id: 'volcano',
        npcLine: "Yeah! The cookies turned into lava! It was AWESOME! But also bad! The baker was mad but the lava cookies sold really well!",
        choices: [
          { text: "That's hilarious", next: 'greeting' },
          { text: "You're quite special", next: 'special' }
        ]
      },
      {
        id: 'special',
        npcLine: "Princess Bubblegum says that too! She says I'm 'special' and 'need supervision' and 'please stop touching that'!",
        choices: [
          { text: "She cares about you", next: 'greeting' },
          { text: "Sounds about right", next: 'greeting' }
        ]
      },
      {
        id: 'okay',
        npcLine: "I think so? My frosting feels extra melty today! But that might be because I stood too close to Pizza Sassy's ovens!",
        choices: [
          { text: "You should be careful", next: 'careful' },
          { text: "Does that hurt?", next: 'hurt' }
        ]
      },
      {
        id: 'careful',
        npcLine: "I try! But sometimes careful is boring! And then I forget what I was being careful about! It's a whole thing!",
        choices: [
          { text: "Just do your best", next: 'greeting' }
        ]
      },
      {
        id: 'hurt',
        npcLine: "Nope! It tickles! Everything tickles! Except when it doesn't! Then it feels like purple!",
        choices: [
          { text: "Purple?", next: 'purple' },
          { text: "Interesting", next: 'greeting' }
        ]
      },
      {
        id: 'purple',
        npcLine: "Yeah! You know, purple! Like when you sneeze but backwards! Everyone knows that feeling!",
        choices: [
          { text: "Sure...", next: 'greeting' }
        ]
      },
      {
        id: 'what_doing',
        npcLine: "Shopping! Or walking! Or both! I came to buy something but I forgot what! So now I'm just looking at everything until I remember!",
        choices: [
          { text: "What if you don't remember?", next: 'dont_remember' },
          { text: "Good luck", next: 'greeting' }
        ]
      },
      {
        id: 'dont_remember',
        npcLine: "Then I'll buy something else! Last time I came for soap and left with a hat! The hat doesn't clean things but it looks nice!",
        choices: [
          { text: "Practical", next: 'greeting' },
          { text: "You're funny", next: 'funny' }
        ]
      },
      {
        id: 'funny',
        npcLine: "Thanks! I don't mean to be! Things just happen around me! Like that time with the pudding tsunami!",
        choices: [
          { text: "Pudding tsunami?!", next: 'tsunami' },
          { text: "I don't want to know", next: 'greeting' }
        ]
      },
      {
        id: 'tsunami',
        npcLine: "It was AMAZING! And terrifying! And delicious! The Royal Guard is still finding pudding in their armor!",
        choices: [
          { text: "How did you manage that?", next: 'how' },
          { text: "Incredible", next: 'greeting' }
        ]
      },
      {
        id: 'how',
        npcLine: "I don't know! I pressed a button that said 'DO NOT PRESS' and then WHOOSH! Pudding everywhere!",
        choices: [
          { text: "Why did you press it?", next: 'why_press' },
          { text: "Classic Cinnamon Bun", next: 'greeting' }
        ]
      },
      {
        id: 'why_press',
        npcLine: "It was shiny! And red! And it said not to! That's like putting a sign that says 'NOT A DOOR' on a door!",
        choices: [
          { text: "That's... actually a good point", next: 'greeting' },
          { text: "No, it's really not", next: 'greeting' }
        ]
      }
    ]
  },

  // === STARCHY ===
  starchy: {
    biome: 'candy_kingdom',
    npcType: 'starchy',
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        npcLine: "*whispers* You there... yes, you. Come closer. The walls have ears, and the ears have... smaller ears.",
        choices: [
          { text: "What are you talking about?", next: 'paranoid' },
          { text: "Are you Starchy?", next: 'identity' },
          { text: "I should go...", action: 'end' }
        ]
      },
      {
        id: 'identity',
        npcLine: "Starchy? Who told you that name? Was it THEM? *looks around nervously* Yes, yes, I'm Starchy. The gravedigger. The one who knows.",
        choices: [
          { text: "Knows what?", next: 'knows_what' },
          { text: "Why are you in the Shopping District?", next: 'why_here' },
          { text: "You seem paranoid", next: 'paranoid' }
        ]
      },
      {
        id: 'paranoid',
        npcLine: "Paranoid? PARANOID?! Just because everyone IS out to get me doesn't mean I'm paranoid! The fountain knows. It KNOWS!",
        choices: [
          { text: "What does the fountain know?", next: 'fountain_knows' },
          { text: "Have you taken your medication?", next: 'medication' },
          { text: "Right...", next: 'greeting' }
        ]
      },
      {
        id: 'fountain_knows',
        npcLine: "Everything! Every coin tossed, every wish made, every secret whispered! And at night... it whispers back!",
        choices: [
          { text: "What does it say?", next: 'fountain_says' },
          { text: "That's impossible", next: 'impossible' },
          { text: "Interesting theory", next: 'greeting' }
        ]
      },
      {
        id: 'fountain_says',
        npcLine: "Numbers... always numbers. 4-8-15-16-23-42. Over and over. I think it's a warning. Or a recipe. Hard to tell.",
        choices: [
          { text: "Those are just random numbers", next: 'random' },
          { text: "What kind of warning?", next: 'warning' },
          { text: "Maybe you should rest", next: 'greeting' }
        ]
      },
      {
        id: 'random',
        npcLine: "RANDOM?! Nothing is random! Everything is connected! The pizza deliveries, the hotel reservations, even Choose Goose's rhymes!",
        choices: [
          { text: "How are they connected?", next: 'connected' },
          { text: "You've lost it", next: 'greeting' }
        ]
      },
      {
        id: 'connected',
        npcLine: "Follow the money! Every gold coin has a tiny mark. I've seen it! They're tracking our purchases! Building a profile! Soon they'll know everything!",
        choices: [
          { text: "Who's 'they'?", next: 'who_they' },
          { text: "That's concerning", next: 'greeting' }
        ]
      },
      {
        id: 'who_they',
        npcLine: "If I told you, they'd know that I know that they know! It's safer for both of us if you don't know what I know, you know?",
        choices: [
          { text: "No, I don't know", next: 'greeting' },
          { text: "Crystal clear", next: 'greeting' }
        ]
      },
      {
        id: 'warning',
        npcLine: "The dead are restless! I've seen them walking at night! Not zombies, but... something else. Something worse.",
        choices: [
          { text: "What could be worse than zombies?", next: 'worse' },
          { text: "You work in a graveyard...", next: 'graveyard' }
        ]
      },
      {
        id: 'worse',
        npcLine: "Zombie LAWYERS! They'll sue you to death! Then sue your estate! Then sue your ghost for haunting without a permit!",
        choices: [
          { text: "That's... creative", next: 'greeting' },
          { text: "I'm leaving now", action: 'end' }
        ]
      },
      {
        id: 'graveyard',
        npcLine: "Exactly! That's how I KNOW! The graves tell me secrets. Especially Gary's. Gary never shuts up.",
        choices: [
          { text: "Who's Gary?", next: 'gary' },
          { text: "Dead people don't talk", next: 'greeting' }
        ]
      },
      {
        id: 'gary',
        npcLine: "Gary Williams, died in '82. Choked on a candy apple. Ironic, right? Now he warns everyone about proper chewing. Very annoying.",
        choices: [
          { text: "Thanks for the warning", next: 'greeting' },
          { text: "You need help", next: 'greeting' }
        ]
      },
      {
        id: 'impossible',
        npcLine: "That's what they WANT you to think! Open your mind! Or don't! Actually, don't! That's how they get in!",
        choices: [
          { text: "How who gets in?", next: 'who_they' },
          { text: "Okay then", next: 'greeting' }
        ]
      },
      {
        id: 'medication',
        npcLine: "Pills? PILLS?! That's how they control us! Little candy-coated mind control devices! I only take the purple ones. Purple is safe.",
        choices: [
          { text: "Why is purple safe?", next: 'purple_safe' },
          { text: "Please take all your meds", next: 'greeting' }
        ]
      },
      {
        id: 'purple_safe',
        npcLine: "Because purple is the color of royalty! And royalty can't be mind-controlled! It's in the constitution! Article purple, section purple!",
        choices: [
          { text: "That's not how constitutions work", next: 'greeting' },
          { text: "Makes perfect sense", next: 'greeting' }
        ]
      },
      {
        id: 'knows_what',
        npcLine: "The truth about the Shopping District! It's built on an ancient burial ground! A burial ground for... SHOPPING CARTS!",
        choices: [
          { text: "Shopping carts?", next: 'carts' },
          { text: "That's ridiculous", next: 'greeting' }
        ]
      },
      {
        id: 'carts',
        npcLine: "Yes! Cursed shopping carts! That's why sometimes your cart has a wonky wheel! It's the ghost of a cart that died with unfinished shopping!",
        choices: [
          { text: "How do carts die?", next: 'cart_death' },
          { text: "I've heard enough", action: 'end' }
        ]
      },
      {
        id: 'cart_death',
        npcLine: "Rust! Abandonment! Being left in the parking lot during a full moon! It's all documented in my journal! Volume 47!",
        choices: [
          { text: "You have 47 journals?", next: 'journals' },
          { text: "Fascinating", next: 'greeting' }
        ]
      },
      {
        id: 'journals',
        npcLine: "48 now! This conversation is going in the new one! 'Subject appears skeptical but interested. Possible spy? Further observation required.'",
        choices: [
          { text: "I'm not a spy", next: 'not_spy' },
          { text: "Write whatever you want", next: 'greeting' }
        ]
      },
      {
        id: 'not_spy',
        npcLine: "That's EXACTLY what a spy would say! But also what a non-spy would say! It's the perfect cover! You're either very clever or very not clever!",
        choices: [
          { text: "Thanks?", next: 'greeting' },
          { text: "You're exhausting", action: 'end' }
        ]
      },
      {
        id: 'why_here',
        npcLine: "Shopping! Even paranoid gravediggers need groceries! Also, the broom shop has excellent hiding spots. Not that I hide. Much.",
        choices: [
          { text: "What are you hiding from?", next: 'hiding' },
          { text: "The broom shop?", next: 'broom_shop' }
        ]
      },
      {
        id: 'hiding',
        npcLine: "Everything! Nothing! The secret is to hide when no one's looking for you! Then when they ARE looking, you're already hidden!",
        choices: [
          { text: "That's actually smart", next: 'greeting' },
          { text: "Or just paranoid", next: 'paranoid' }
        ]
      },
      {
        id: 'broom_shop',
        npcLine: "Best brooms in the kingdom! I buy in bulk. You never know when you'll need to sweep away evidence. I mean... dirt. Regular dirt.",
        choices: [
          { text: "Evidence of what?", next: 'evidence' },
          { text: "Sure, dirt", next: 'greeting' }
        ]
      },
      {
        id: 'evidence',
        npcLine: "*sweats nervously* Nothing! There's no evidence because nothing happened! And even if it did, which it didn't, you can't prove it!",
        choices: [
          { text: "Prove what?", next: 'prove' },
          { text: "Relax, I don't care", next: 'greeting' }
        ]
      },
      {
        id: 'prove',
        npcLine: "That I've been using graveyard dirt to grow super vegetables! They're perfectly safe! Mostly! The turnips only scream a little!",
        choices: [
          { text: "Screaming turnips?!", next: 'turnips' },
          { text: "I'm done here", action: 'end' }
        ]
      },
      {
        id: 'turnips',
        npcLine: "Just at night! And only when you cut them! It's actually quite melodious once you get used to it. Want to buy some?",
        choices: [
          { text: "Absolutely not", next: 'greeting' },
          { text: "How much?", next: 'turnip_sale' }
        ]
      },
      {
        id: 'turnip_sale',
        npcLine: "Free! But you didn't get them from me! And if anyone asks, you've never heard of screaming vegetables! Deal?",
        choices: [
          { text: "Deal", action: 'receiveItem:screaming_turnip' },
          { text: "No thanks", next: 'greeting' }
        ]
      }
    ]
  }
};

// Register all shopping district dialogues
export function registerShoppingDistrictDialogues() {
  // Use dynamic import to avoid circular dependencies
  import('../../social/dialogue.js').then(module => {
    const { registerDialogueTree } = module;
    
    // Register each dialogue tree
    Object.entries(shoppingDistrictDialogues).forEach(([npcType, dialogue]) => {
      // Ensure each dialogue has proper structure
      if (!dialogue.nodes || !dialogue.nodes.length) {
        console.warn(`Warning: ${npcType} dialogue has no nodes`);
        return;
      }
      
      // Add any missing required fields
      dialogue.biome = dialogue.biome || 'candy_kingdom';
      dialogue.npcType = dialogue.npcType || npcType;
      dialogue.start = dialogue.start || 'greeting';
      
      registerDialogueTree(npcType, dialogue.biome, dialogue);
      console.log(`📝 Registered dialogue tree for ${dialogue.biome}:${npcType}`);
    });
    
    console.log('🛍️ Shopping District dialogues registered successfully');
  }).catch(err => {
    console.error('Failed to register shopping district dialogues:', err);
  });
}