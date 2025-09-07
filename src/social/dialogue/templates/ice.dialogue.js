/**
 * Ice Kingdom Dialogue Templates
 * Formal, cold, scientific dialogue
 */

export const ICE_DIALOGUE = {
  greet: {
    variants: [
      "Greetings, {player.name}. The temperature is quite cool today.",
      "Welcome to the Ice Kingdom. Please mind the frost.",
      "Salutations. I trust your journey was not too chilling?",
      "Good day. The ice formations are particularly beautiful.",
      "Formal greetings to you, visitor."
    ],
    tags: ['formal', 'cold']
  },
  
  formal_greeting: {
    template: "I extend my most formal salutations to you, {player.name}.",
    tags: ['formal', 'respectful']
  },
  
  compliment: {
    template: "Your intellect appears quite sharp. Most impressive.",
    tags: ['respectful', 'analytical']
  },
  
  discuss_science: {
    variants: [
      "Have you considered the hypothesis that ice can preserve consciousness?",
      "My latest experiment involves crystalline memory storage.",
      "The molecular structure of ice holds fascinating secrets.",
      "According to my theory, cold enhances cognitive function."
    ],
    tags: ['scientific', 'intellectual']
  },
  
  trade: {
    template: "My wares are preserved in perfect cryogenic conditions.",
    tags: ['economic', 'technical']
  },
  
  share_rumor: {
    template: "According to my sources... {rumor.content}",
    tags: ['gossip', 'analytical']
  },
  
  farewell: {
    variants: [
      "May your path remain frost-free.",
      "Until our paths cross again in this frozen realm.",
      "Stay cool, but not too cool."
    ],
    tags: ['formal']
  },
  
  hostile: {
    template: "Your behavior is most... disappointing. Chill out.",
    tags: ['disappointed', 'cold']
  },
  
  scared: {
    template: "The ice... it's cracking! This is highly irregular!",
    tags: ['fear', 'analytical']
  }
};

export default ICE_DIALOGUE;