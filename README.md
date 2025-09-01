# Caves of Ooo - Enhanced Adventure Roguelike

A browser-based roguelike game set in the Land of Ooo from Adventure Time.

## Project Structure

```
CavesOfOoo/
├── index.html              # Main HTML file
├── package.json            # Project metadata
├── README.md              # This file
└── src/
    ├── css/
    │   └── styles.css     # All game styles
    └── js/
        ├── config.js      # Game constants and configuration
        ├── utils.js       # Utility functions and RNG
        ├── persistence.js # Save/load functionality
        ├── entities.js    # Player and monster creation
        ├── worldGen.js    # Dungeon generation
        ├── combat.js      # Combat system
        ├── inventory.js   # Inventory management
        ├── game.js        # Main game logic and initialization
        ├── systems/
        │   └── statusSystem.js # Status effect management system
        └── engine/        # Rule-based interaction engine
```

## How to Run

1. Open a terminal in the project directory
2. Run: `python3 -m http.server 8000`
3. Open your browser to: `http://localhost:8000`

## Game Controls

- **WASD/Arrow Keys**: Move
- **I**: Open/close inventory
- **.**: Wait a turn
- **R**: Restart game
- **H**: Show help

### Inventory Controls
- **Arrow Keys**: Navigate items
- **Enter**: Use/equip item
- **D**: Drop item
- **I/Esc**: Close inventory

## Features

- Procedurally generated dungeons
- Multiple biomes with unique monsters
- Weapon and armor system
- Potion effects and status buffs
- Persistent world (saves to localStorage)
- Level progression and XP system
- Boss encounters
- Shrines with blessings

## Technologies

- Vanilla JavaScript (ES6 modules)
- HTML5
- CSS3
- LocalStorage for persistence
