/**
 * Fire Kingdom Dialogue Templates
 * Aggressive, passionate dialogue with fire/heat themes
 */

export const FIRE_DIALOGUE = {
  greet: {
    variants: [
      "The flames burn bright today, {player.name}!",
      "You dare enter the Fire Kingdom?",
      "State your business, before you get burned!",
      "The heat rises... as do you approach.",
      "Welcome to the realm of eternal flame!"
    ],
    tags: ['aggressive', 'passionate']
  },
  
  compliment: {
    template: "Your spirit burns with intensity! Respect!",
    tags: ['respectful', 'impressed']
  },
  
  challenge: {
    template: "I challenge you to a flame battle! Show me your fire!",
    tags: ['hostile', 'competitive']
  },
  
  flame_challenge: {
    template: "Face me in the ancient rite of flame combat!",
    tags: ['hostile', 'traditional']
  },
  
  trade: {
    template: "These goods are forged in the hottest flames!",
    tags: ['economic', 'proud']
  },
  
  share_rumor: {
    template: "The flames whisper secrets... {rumor.content}",
    tags: ['gossip', 'mysterious']
  },
  
  show_respect: {
    template: "Your flames burn true. I acknowledge your strength.",
    tags: ['respectful', 'honor']
  },
  
  farewell: {
    variants: [
      "May your flames never die!",
      "Burn bright, warrior!",
      "Until the flames call us together again!"
    ],
    tags: ['respectful']
  },
  
  hostile: {
    template: "You dare insult the flame? BURN!",
    tags: ['angry', 'violent']
  },
  
  scared: {
    template: "The flames... they're out of control!",
    tags: ['fear', 'panic']
  }
};

export default FIRE_DIALOGUE;