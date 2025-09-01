# JavaScript Source Code Structure

## Directory Organization

The JavaScript source code is organized into logical modules for better maintainability and understanding:

### 📁 `/core`
**Core game engine and initialization**
- `game.js` - Main game loop, initialization, and state management
- `config.js` - Game configuration and constants
- `actions.js` - Core action definitions

### 📁 `/combat`  
**Combat mechanics and status effects**
- `combat.js` - Combat calculations, damage processing
- `statusSystem.js` - Status effect management (wet, burn, freeze, etc.)
- `effects.js` - Gear and item combat effects

### 📁 `/entities`
**Entity management and definitions**
- `entities.js` - Player and entity creation/management
- `monsters.js` - Monster behavior, abilities, and AI

### 📁 `/world`
**World generation and map management**
- `worldGen.js` - Procedural world generation
- `worldMap.js` - World map and chunk management
- `/gen` - Generation helpers
- `/map` - Map utilities
- `/queries` - World query helpers

### 📁 `/movement`
**Movement and pathfinding systems**
- `movePipeline.js` - Movement action pipeline
- `playerMovement.js` - Player movement handling
- `pathfinding.js` - A* pathfinding algorithm
- `cursor.js` - Cursor/targeting system

### 📁 `/items`
**Items, inventory, and equipment**
- `inventory.js` - Inventory management
- `shop.js` - Shop system
- `/gear` - Equipment definitions and effects

### 📁 `/quests`
**Quest and mission system**
- `quests.js` - Quest definitions and management
- `questTurnIn.js` - Quest completion handling
- `vendorQuests.js` - Vendor-specific quests

### 📁 `/ui`
**User interface components**
- `map.js` - Minimap rendering
- `particles.js` - Particle effects
- `shop.js`, `shop_clean.js` - Shop UI variations
- `fx.js` - Visual effects
- `equipment.js` - Equipment UI
- `quests.js` - Quest UI
- `questTurnIn.js` - Quest completion UI
- `dropdown.js` - Dropdown menus

### 📁 `/renderer`
**Game rendering**
- `canvas.js` - Main canvas rendering logic

### 📁 `/input`
**Input handling**
- `keys.js` - Keyboard input processing

### 📁 `/engine`
**Rule-based status effect engine**
- `/adapters` - Game-specific adapters
  - `cavesOfOoo.js` - Adapter for main game
- `materials.js` - Material registry
- `rules.js` - Rule system core
- `sim.js` - Simulation engine
- `statusRules.js` - Status effect rules
- Various test rule files

### 📁 `/utils`
**Utility functions and helpers**
- `utils.js` - General utility functions
- `log.js` - Logging system
- `events.js` - Event system
- `eventTypes.js` - Event type definitions
- `queries.js` - Query helpers
- `persistence.js` - Save/load functionality

## Import Examples

```javascript
// Importing from core
import { initGame } from './core/game.js';
import { CONFIG } from './core/config.js';

// Importing from combat
import { calculateDamage } from './combat/combat.js';
import { applyStatusEffect } from './combat/statusSystem.js';

// Importing from entities
import { createPlayer } from './entities/entities.js';
import { spawnMonster } from './entities/monsters.js';

// Cross-module imports
import { Status } from '../combat/statusSystem.js';  // from movement/ to combat/
import { log } from '../utils/log.js';              // from anywhere to utils/
```

## Key Benefits

1. **Clear Separation** - Each folder has a specific, well-defined purpose
2. **Easy Navigation** - Related files are grouped together
3. **Scalability** - Easy to add new features in appropriate locations
4. **Maintainability** - Developers can quickly understand where to find/add functionality
5. **Minimal Nesting** - Most imports are only 1-2 levels deep

## Testing

Tests are located in `/tests` at the project root and mirror the source structure where appropriate.