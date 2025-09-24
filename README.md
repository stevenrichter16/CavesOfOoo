# Caves of Ooo - Adventure Time Roguelike

A browser-based roguelike game set in the Land of Ooo from Adventure Time. Explore procedurally generated dungeons, complete quests, interact with NPCs, and battle monsters in this feature-rich adventure game.

## Features

### 🗺️ World Generation & Exploration
- **Procedurally generated infinite world** with chunk-based system
- **Multiple biomes**: Candy Kingdom, Grasslands, Graveyard, Ice Kingdom, Fire Kingdom, Dungeon
- **Seamless world travel** - walk off screen edges to explore new areas
- **Persistent world** - chunks save automatically to localStorage
- **Day/night cycle** affecting monster spawns and quest availability

### ⚔️ Combat System
- **Turn-based tactical combat** with melee and ranged attacks
- **Throwable weapons system** - throw pots with different effects (Fire, Ice, Sugar, Clay)
- **Status effects**: Burning, Frozen, Blessed, Weakened, and more
- **Weapon enchantments** with special effects
- **Projectile system** for ranged attacks
- **Combat animations** and floating damage text

### 📜 Quest System
- **Event-driven quest architecture** with automatic objective tracking
- **Multiple quest types**: Main story, side quests, tutorials
- **Quest categories**:
  - Tutorial quests (inventory, combat basics)
  - Combat quests (kill monsters, boss battles)
  - Collection quests (gather items)
  - Exploration quests (discover locations)
- **Quest menu** (Q) showing active quests with progress tracking
- **Quest rewards**: Gold, XP, items, and story progression

### 🗣️ Social & Dialogue Systems
- **Dynamic NPC dialogue trees** with branching conversations
- **Relationship system** tracking trust and respect with NPCs
- **Context-sensitive dialogue** based on quest progress and player actions
- **Multiple NPCs** including Steven (quest giver), Candy Peasants, Banana Guards
- **Shop vendors** with unique inventories and dialogue

### 🎒 Inventory & Items
- **Tab-based inventory system** (I):
  - Equipment tab for weapons and armor
  - Consumables tab for potions
  - Throwables tab for combat items
  - Quest items tab
- **Item categories**:
  - **Weapons**: Swords, axes, staffs with various enchantments
  - **Armor**: Different defense values and special properties
  - **Headgear**: Stat bonuses and protection
  - **Potions**: Health, strength, speed, magic buffs
  - **Throwables**: Combat pots with elemental effects
- **Item dropping and management**

### 🏪 Shop System
- **Vendor shops** with unique inventories per biome
- **Buy/sell mechanics** with gold economy
- **Special vendor quests** and rewards
- **Dynamic pricing** based on item rarity

### 📊 Character Progression
- **Level system** with XP from combat
- **Stat growth**: HP, Strength, Defense, Speed, Magic
- **Equipment bonuses** affecting combat performance
- **Blessing shrines** providing permanent buffs

### ⚙️ Interaction Engine
- **Property-driven status system**: materials, statuses, and rules declared in `src/js/engine/`
- **Adapter layer** (`engine/adapters/cavesOfOoo.js`) keeps engine logic decoupled from game entities
- **Composable rules** allow elemental combos like water + electricity without hardcoding
- **Action queue** lets rules enqueue effects that the main game applies after each phase

### 🎮 Controls

#### Movement & Basic Actions
- **WASD/Arrow Keys**: Move player
- **.** (period): Wait a turn
- **R**: Start new game
- **H**: Show help

#### UI Controls
- **I**: Open/close inventory
- **Q**: Open/close quest menu
- **M**: Open/close map
- **X**: Examine mode (cursor inspection)
- **T**: Throw item (if throwables available)
- **V**: Interact with vendors

#### Inventory Controls (when open)
- **Arrow Keys**: Navigate items
- **Tab**: Switch between inventory tabs
- **Enter**: Use/equip selected item
- **D**: Drop selected item
- **I/Escape**: Close inventory

#### Dialogue Controls
- **Number Keys (1-9)**: Select dialogue options
- **Escape**: Exit dialogue

#### Combat Controls
- **Movement keys**: Attack adjacent enemies
- **T**: Enter throw mode for ranged attacks
- **Arrow keys** (in throw mode): Aim cursor
- **Enter** (in throw mode): Confirm throw
- **Escape** (in throw mode): Cancel throw

#### Special Actions
- **P**: Place ward on gravestone (graveyard only)

### 🏗️ Project Structure

```
CavesOfOoo/
├── index.html                    # Main game HTML
├── package.json                  # Project configuration
├── README.md                     # This file
├── test-*.html                   # Test harnesses
├── tests/                        # Comprehensive test suite
│   ├── combat/                   # Combat system tests
│   ├── items/                    # Inventory and item tests
│   ├── movement/                 # Movement system tests
│   ├── quests/                   # Quest system tests
│   ├── social/                   # Dialogue and NPC tests
│   └── world/                    # World generation tests
└── src/
    ├── css/
    │   └── styles.css           # Game styling
    └── js/
        ├── core/                # Core game systems
        │   ├── game.js          # Main game loop
        │   ├── config.js        # Game configuration
        │   └── worldGen.js      # Base world generation
        ├── engine/              # Property-driven interaction engine
        │   ├── adapters/        # Glue between engine rules and game state
        │   ├── materials.js     # Material and status definitions
        │   └── rules.js         # Declarative interaction rules
        ├── combat/              # Combat systems
        │   ├── combat.js        # Combat mechanics
        │   ├── statusSystem.js  # Status effects
        │   ├── throwables.js    # Throwable weapons
        │   └── effects.js       # Combat effects
        ├── data/                # Game data
        │   ├── uniqueNPCDialogues.js
        │   └── candyKingdomDialoguesV3.js
        ├── entities/            # Entity management
        │   ├── entities.js      # Player and entity systems
        │   └── monsters.js      # Monster AI
        ├── input/               # Input handling
        │   └── keys.js          # Keyboard controls
        ├── items/               # Item systems
        │   ├── inventory.js     # Inventory management
        │   ├── shop.js          # Shop mechanics
        │   └── vendorItems.js   # Vendor inventories
        ├── movement/            # Movement systems
        │   ├── playerMovement.js
        │   ├── movePipeline.js
        │   └── cursor.js        # Cursor examination
        ├── quests/              # Quest system
        │   └── definitions/     # Quest definitions
        ├── renderer/            # Rendering
        │   └── canvas.js        # Canvas renderer
        ├── social/              # Social systems
        │   ├── dialogue.js      # Dialogue engine
        │   ├── dialogueTreesV2.js
        │   └── relationship.js  # NPC relationships
        ├── systems/             # Game systems
        │   ├── EventBus.js      # Event system
        │   ├── LootSystem.js    # Loot generation
        │   └── ProjectileSystem.js
        ├── ui/                  # UI components
        │   ├── questMenu.js     # Quest menu UI
        │   ├── dialogueTree.js  # Dialogue UI
        │   ├── shop.js          # Shop UI
        │   └── social.js        # Social menu UI
        ├── utils/               # Utilities
        │   ├── persistence.js   # Save/load system
        │   ├── events.js        # Event handling
        │   └── queries.js       # World queries
        └── world/               # World chunks
            ├── ChunkSystem.js   # Chunk management
            ├── quests/          # Quest system
            │   ├── QuestManager.js
            │   ├── QuestService.js
            │   └── QuestEventBus.js
            └── chunks/          # Biome generators

```

## Getting Started

### Requirements
- Modern web browser with ES6+ support
- Python 3 (for local development server)
- Node.js & npm (for running tests)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/caves-of-ooo.git
cd caves-of-ooo
```

2. Install dependencies (for testing):
```bash
npm install
```

### Running the Game

#### Option 1: Python Server (Recommended)
```bash
npm start
# or
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

#### Option 2: Direct File Access
Simply open `index.html` in your browser (some features may be limited).

### Running Tests
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Open test UI
npm run test:coverage # Generate coverage report
```

## Gameplay Tips

### Getting Started
1. Talk to Steven NPC in the Candy Kingdom to receive starter quests
2. Press 'I' to complete the inventory tutorial quest
3. Practice combat with throwable pots (press 'T')
4. Explore the world by walking off screen edges

### Combat Strategy
- Use throwables for ranged attacks against tough enemies
- Different pot types have different effects:
  - Fire Pots: Burn damage over time
  - Ice Pots: Freeze enemies
  - Sugar Pots: Basic damage
- Manage your health with potions
- Some enemies are weak to specific damage types

### Quest Progression
1. Complete tutorial quests first (inventory, throwing)
2. Take on combat quests to gain XP and gold
3. Explore different biomes for unique quests
4. Check quest menu (Q) to track progress

### World Exploration
- Each biome has unique monsters and NPCs
- Candy Kingdom (0,0): Starting area with shops and quests
- Graveyard (-1,0): Special ward-placing mechanics
- Ice Kingdom: Cold-themed enemies and frozen terrain
- Fire Kingdom: Fire-resistant enemies and lava hazards

## Technologies Used

- **Vanilla JavaScript** (ES6 modules)
- **HTML5 Canvas** for rendering
- **CSS3** for UI styling
- **LocalStorage** for game persistence
- **Vitest** for testing
- **Event-driven architecture** for game systems

## Development

### Adding New Quests
1. Create quest definition in `src/js/world/quests/definitions/`
2. Register quest in `QuestManager.js`
3. Add dialogue nodes for quest giver
4. Emit relevant events for objectives
5. Create tests in `tests/quests/`

### Adding New NPCs
1. Define dialogue tree in `src/js/data/`
2. Add NPC spawning in relevant chunk generator
3. Set up relationship metrics if needed
4. Create interaction handlers

### Testing Guidelines
- Tests use Vitest framework
- Mock DOM elements when needed
- Test quest flows end-to-end
- Verify event emissions and handling

## Save System

The game automatically saves:
- Player stats and inventory
- Quest progress
- World chunks as you explore
- NPC relationship states

Saves are stored in browser localStorage and persist between sessions.

## Credits

- Game design and development by Steven Richter
- Inspired by Adventure Time created by Pendleton Ward
- Built with modern web technologies

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## Known Issues

- Some UI elements may overlap on smaller screens
- Performance may degrade with many entities on screen
- Save files can grow large with extensive exploration

## Future Features

- Multiplayer support
- More biomes and dungeons
- Crafting system
- Pet companions
- Boss raids
- Achievement system

---

For bug reports and feature requests, please open an issue on GitHub.
