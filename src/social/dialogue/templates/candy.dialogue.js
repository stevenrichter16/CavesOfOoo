/**
 * Candy Kingdom Dialogue Templates
 * Sweet-themed dialogue with mathematical expressions
 */

export const CANDY_DIALOGUE = {
  greet: {
    variants: [
      "Oh my glob! Hey there, {player.name}!",
      "Mathematical! Good to see you!",
      "Algebraic greetings, friend!",
      "Sweet! A visitor!",
      "Welcome to the Candy Kingdom!"
    ],
    tags: ['friendly', 'sweet']
  },
  
  compliment: {
    template: "That's totally mathematical, {player.name}!",
    tags: ['friendly', 'positive']
  },
  
  trade: {
    variants: [
      "Check out these sweet deals!",
      "I've got the most mathematical merchandise!",
      "Browse my candy-coated collection!"
    ],
    tags: ['economic']
  },
  
  share_rumor: {
    template: "Oh my glob, have you heard? {rumor.content}",
    tags: ['gossip', 'social']
  },
  
  praise_princess: {
    template: "Princess Bubblegum is the most mathematical ruler in all of Ooo!",
    tags: ['respectful', 'loyal']
  },
  
  farewell: {
    variants: [
      "Stay sweet!",
      "Mathematical adventures await!",
      "Bye-bye, sugar!"
    ],
    tags: ['friendly']
  },
  
  hostile: {
    template: "That's not very algebraic of you!",
    tags: ['angry', 'disappointed']
  },
  
  scared: {
    template: "Oh my glob! This is terrifying!",
    tags: ['fear', 'panic']
  },
  
  share_candy: {
    template: "Want some candy? It's fresh from the royal kitchen!",
    tags: ['friendly', 'generous']
  }
};

export default CANDY_DIALOGUE;