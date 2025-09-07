/**
 * Slime Kingdom Dialogue Templates
 * Gooey, silly, playful dialogue
 */

export const SLIME_DIALOGUE = {
  greet: {
    variants: [
      "Sluuuurp! Hey there, {player.name}!",
      "*Squelch* Welcome to our gooey kingdom!",
      "Ooooze you looking for? Hehe!",
      "*Bubble bubble* A visitor! How slime-tastic!",
      "Goooood to see you! Get it? Goo-d? *giggles*"
    ],
    tags: ['silly', 'playful']
  },
  
  compliment: {
    template: "You're so un-slime-ited! Amazing!",
    tags: ['friendly', 'punny']
  },
  
  trade: {
    variants: [
      "Check out my goo-ds! *giggles*",
      "Everything's covered in protective slime!",
      "Slime-certified quality merchandise!"
    ],
    tags: ['economic', 'silly']
  },
  
  share_rumor: {
    template: "*Whispers goopily* I heard that {rumor.content}",
    tags: ['gossip', 'secretive']
  },
  
  farewell: {
    variants: [
      "Slime you later!",
      "Don't slip on the way out!",
      "May your path be ever gooey!"
    ],
    tags: ['friendly', 'punny']
  },
  
  hostile: {
    template: "That's not very slime of you! *angry bubbling*",
    tags: ['angry', 'upset']
  },
  
  scared: {
    template: "*Quivering* I'm melting with fear!",
    tags: ['fear', 'panic']
  },
  
  happy: {
    template: "*Bouncing excitedly* This is slime-sational!",
    tags: ['happy', 'excited']
  }
};

export default SLIME_DIALOGUE;