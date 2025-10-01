// TileRegistry.js - centralized tile definitions for terrain & rendering

export const TileRegistry = {
  'floor.default': {
    glyph: '.',
    sprite: 'tile4.png',
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'floor',
      description: 'Stone floor worn smooth by countless footsteps'
    }
  },
  'wall.stone.solid': {
    glyph: '#',
    sprite: 'wall.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'wall',
      description: 'Solid stone wall'
    }
  },
  'terrain.water.shallow': {
    glyph: '~',
    sprite: ['~/Downloads/Textures/Terrain/tile_swamp1.bmp', 'Textures/Terrain/tile_swamp2.bmp'],
    terrain: {
      passable: true,
      moveCost: 2,
      blocksVision: false,
      name: 'water',
      description: 'Shallow water that slows movement'
    }
  },
  'door.closed': {
    glyph: '+',
    sprite: 'Textures/Walls/wall_sultan_columns_b-00111011.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'door',
      description: 'A closed door'
    }
  },
  'wall.brick.corner.top_left': {
    glyph: '┌',
    sprite: 'Walls/brick-corner-top-left.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall corner',
      description: 'A candy brick wall corner'
    }
  },
  'wall.brick.corner.top_right': {
    glyph: '┐',
    sprite: 'Walls/brick-corner-top-right.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall corner',
      description: 'A candy brick wall corner'
    }
  },
  'wall.brick.corner.bottom_left': {
    glyph: '└',
    sprite: 'Walls/brick-corner-bottom-left.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall corner',
      description: 'A candy brick wall corner'
    }
  },
  'wall.brick.corner.bottom_right': {
    glyph: '┘',
    sprite: 'Walls/brick-corner-bottom-right.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall corner',
      description: 'A candy brick wall corner'
    }
  },
  'wall.brick.edge.horizontal': {
    glyph: '─',
    sprite: 'Walls/brick-middle-horizontal.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall',
      description: 'A candy brick wall'
    }
  },
  'wall.brick.edge.vertical': {
    glyph: '│',
    sprite: 'Walls/brick-middle-vertical.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall',
      description: 'A candy brick wall'
    }
  },
  'wall.brick.fill': {
    glyph: '█',
    sprite: 'building_wall.png',
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'brick wall',
      description: 'A candy brick wall'
    }
  },
  'floor.candy.polished': {
    glyph: '·',
    sprite: 'tile4.png',
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'candy floor',
      description: 'Sparkling candy tiles polished to a shine'
    }
  },
  'structure.market.stall.canopy': {
    glyph: '╬',
    sprite: { type: 'marketSprite', name: 'canopyStall' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'market canopy stall',
      description: 'A striped canopy stall displaying colorful candies'
    }
  },
  'structure.market.stall.table': {
    glyph: '╤',
    sprite: { type: 'marketSprite', name: 'tableStall' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'market table stall',
      description: 'A candy merchant table lined with sweets'
    }
  },
  'structure.market.stall.goods_table': {
    glyph: '≡',
    sprite: { type: 'marketSprite', name: 'goodsTable' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'goods table',
      description: 'A sturdy table displaying jars of candy essence'
    }
  },
  'structure.market.cart': {
    glyph: '¤',
    sprite: { type: 'marketSprite', name: 'vendorCart' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'vendor cart',
      description: 'A wheeled vendor cart stuffed with treats'
    }
  },
  'structure.market.crate': {
    glyph: '☐',
    sprite: { type: 'marketSprite', name: 'crateOfWares' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'crate of wares',
      description: 'A crate overflowing with market goods'
    }
  },
  'structure.market.cart.support': {
    glyph: '║',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'vendor cart support',
      description: 'Vertical supports holding up a vendor cart'
    }
  },
  'structure.market.wall': {
    glyph: '▪',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'market wall',
      description: 'A thick candy-brick wall enclosing market buildings'
    },
    tags: ['structure', 'wall']
  },
  'furniture.bench.horizontal': {
    glyph: '═',
    sprite: { type: 'marketSprite', name: 'benchHorizontal' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'bench',
      description: 'A polished candy bench inviting weary shoppers to rest'
    }
  },
  'floor.market.promenade': {
    glyph: '◯',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'promenade tile',
      description: 'Decorative tilework guiding shoppers through the district'
    },
    tags: ['floor', 'promenade']
  },
  'floor.candy.walkway': {
    glyph: '-',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'walkway',
      description: 'A neatly paved candy walkway'
    }
  },
  'floor.crosswalk.striped': {
    glyph: '≈',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'crosswalk',
      description: 'Striped candy paint guiding pedestrians across the boulevard'
    },
    tags: ['floor', 'crosswalk']
  },
  'road.paved.main': {
    glyph: '=',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'paved road',
      description: 'A smooth main boulevard through the kingdom'
    }
  },
  'decoration.candy.tree': {
    glyph: '♣',
    sprite: { type: 'marketSprite', name: 'lollipop' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'candy tree',
      description: 'A decorative candy tree with swirling lollipop fronds'
    }
  },
  'decoration.fountain.center': {
    glyph: '○',
    sprite: { type: 'marketSprite', name: 'fountainCenter' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'fountain',
      description: 'The shimmering heart of a candy fountain'
    }
  },
  'decoration.streetlamp': {
    glyph: '†',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'street lamp',
      description: 'A tall candy street lamp or training post'
    }
  },
  'decoration.snowman': {
    glyph: '☃',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'snowman',
      description: 'A jolly snowman topped with a candy cane scarf'
    },
    tags: ['decoration', 'winter']
  },
  'structure.arch.candy': {
    glyph: '♦',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'candy arch',
      description: 'A peppermint archway welcoming shoppers'
    }
  },
  'structure.training.statue': {
    glyph: '◊',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'statue',
      description: 'A decorative statue honoring candy heroes'
    }
  },
  'decoration.shrine.marker': {
    glyph: '▲',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'shrine marker',
      description: 'A decorative marker watching over the square'
    }
  },
  'decoration.shop.broom': {
    glyph: '🧹',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'display broom',
      description: 'A neatly propped broom awaiting its next owner'
    }
  },
  'decoration.sign.pharmacy': {
    glyph: '⚕',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'pharmacy emblem',
      description: 'A gleaming medical emblem advertising sweet remedies'
    },
    tags: ['sign']
  },
  'decoration.office.phone': {
    glyph: '☎',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'desk phone',
      description: 'A candy-coated desk phone buzzing with customer calls'
    }
  },
  'container.barrel.candy': {
    glyph: 'b',
    sprite: { type: 'marketSprite', name: 'candyBarrel' },
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'candy barrel',
      description: 'A barrel filled with sugary supplies'
    }
  },
  'container.storage.crate': {
    glyph: '□',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'storage crate',
      description: 'A sturdy crate for storing shop goods'
    }
  },
  'terrain.hazard.spikes': {
    glyph: '^',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'spikes',
      description: 'Sharp spikes jutting from the floor'
    }
  },
  'material.candy.dust': {
    glyph: '%',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'candy dust',
      description: 'A pile of volatile candy dust'
    }
  },
  'structure.building.block': {
    glyph: '▓',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'building wall',
      description: 'A reinforced candy building wall'
    }
  },
  'structure.training.rack': {
    glyph: '|',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'weapon rack',
      description: 'An equipment rack filled with practice gear'
    }
  },
  'structure.grave.marker': {
    glyph: '⚰',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'grave marker',
      description: 'An old tombstone marking a burial site'
    },
    tags: ['structure', 'grave']
  },
  'container.chest.generic': {
    glyph: 'C',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'chest',
      description: 'A sturdy candy chest brimming with loot'
    },
    tags: ['container', 'chest']
  },
  'interaction.vendor.tile': {
    glyph: 'V',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'vendor',
      description: 'A friendly shopkeeper ready to trade'
    },
    tags: ['interactive', 'vendor']
  },
  'item.collectible.artifact': {
    glyph: '★',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'artifact',
      description: 'A relic humming with ancient stories'
    },
    tags: ['pickup', 'artifact']
  },
  'item.collectible.oddity': {
    glyph: '♪',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'oddity',
      description: 'A strange object emitting curious melodies'
    },
    tags: ['pickup', 'oddity']
  },
  'item.drop.potion': {
    glyph: '!',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'dropped potion',
      description: 'A potion sits here waiting to be collected'
    },
    tags: ['pickup', 'potion']
  },
  'item.drop.weapon': {
    glyph: '/',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'dropped weapon',
      description: 'A weapon has been left on the ground'
    },
    tags: ['pickup', 'weapon']
  },
  'item.drop.armor': {
    glyph: ']',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'dropped armor',
      description: 'A suit of armor rests here'
    },
    tags: ['pickup', 'armor']
  },
  'item.drop.headgear': {
    glyph: '^',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'dropped headgear',
      description: 'Headgear carefully placed on the floor'
    },
    tags: ['pickup', 'headgear']
  },
  'item.drop.ring': {
    glyph: '○',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'dropped ring',
      description: 'A ring glints invitingly on the ground'
    },
    tags: ['pickup', 'ring']
  },
  'item.drop.throwable': {
    glyph: '⚱',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'dropped throwable',
      description: 'A fragile pot filled with volatile candy'
    },
    tags: ['pickup', 'throwable']
  },
  'decoration.transition.marker': {
    glyph: '∘',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'transition marker',
      description: 'A faint marker indicating a gradual biome shift'
    }
  },
  'decoration.tree.generic': {
    glyph: 'T',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'tree',
      description: 'A sturdy tree with sugary leaves'
    }
  },
  'decoration.tree.cotton_candy': {
    glyph: '♠',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'cotton candy tree',
      description: 'A fluffy cotton candy tree twirling in the breeze'
    }
  },
  'decoration.tree.dead': {
    glyph: 'Y',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'dead tree',
      description: 'A withered tree devoid of leaves'
    },
    tags: ['decoration', 'tree']
  },
  'decoration.bush.generic': {
    glyph: '&',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: true,
      name: 'bush',
      description: 'A dense bush bursting with sweets'
    }
  },
  'decoration.flower.patch': {
    glyph: '*',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'flower patch',
      description: 'Bright candy blossoms rustle softly'
    }
  },
  'decoration.flower.planter': {
    glyph: '❀',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'flower planter',
      description: 'A raised planter overflowing with sugary blooms'
    }
  },
  'decoration.mushroom.cluster': {
    glyph: 'v',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'mushroom cluster',
      description: 'A cluster of gummy mushrooms'
    }
  },
  'decoration.crystal.cluster': {
    glyph: 'i',
    sprite: null,
    terrain: {
      passable: false,
      moveCost: Infinity,
      blocksVision: false,
      name: 'crystal cluster',
      description: 'Glittering candy crystals jut from the ground'
    }
  },
  'terrain.grass.scatter': {
    glyph: 'o',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'grass',
      description: 'Soft tufts of candy grass'
    }
  },
  'decoration.sign.letter.a': {
    glyph: 'Ⓐ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “A”'
    }
  },
  'decoration.sign.letter.b': {
    glyph: 'Ⓑ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “B”'
    }
  },
  'decoration.sign.letter.c': {
    glyph: 'Ⓒ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “C”'
    }
  },
  'decoration.sign.letter.e': {
    glyph: 'Ⓔ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “E”'
    }
  },
  'decoration.sign.letter.f': {
    glyph: 'Ⓕ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “F”'
    }
  },
  'decoration.sign.letter.g': {
    glyph: 'Ⓖ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “G”'
    }
  },
  'decoration.sign.letter.h': {
    glyph: 'Ⓗ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “H”'
    }
  },
  'decoration.sign.letter.i': {
    glyph: 'Ⓘ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “I”'
    }
  },
  'decoration.sign.letter.l': {
    glyph: 'Ⓛ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “L”'
    }
  },
  'decoration.sign.letter.m': {
    glyph: 'Ⓜ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “M”'
    }
  },
  'decoration.sign.letter.o': {
    glyph: 'Ⓞ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “O”'
    }
  },
  'decoration.sign.letter.x': {
    glyph: 'Ⓧ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “X”'
    }
  },
  'decoration.sign.letter.p': {
    glyph: 'Ⓟ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “P”'
    }
  },
  'decoration.sign.letter.r': {
    glyph: 'Ⓡ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “R”'
    }
  },
  'decoration.sign.letter.t': {
    glyph: 'Ⓣ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “T”'
    }
  },
  'decoration.sign.letter.y': {
    glyph: 'Ⓨ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “Y”'
    }
  },
  'decoration.sign.letter.z': {
    glyph: 'Ⓩ',
    sprite: null,
    terrain: {
      passable: true,
      moveCost: 1,
      blocksVision: false,
      name: 'sign',
      description: 'A painted sign bearing the letter “Z”'
    }
  }
};

const glyphIndex = new Map();
for (const [id, def] of Object.entries(TileRegistry)) {
  if (!def?.glyph) continue;
  if (!glyphIndex.has(def.glyph)) {
    glyphIndex.set(def.glyph, id);
  }
}

export function getTileDef(id) {
  const def = TileRegistry[id];
  if (!def) {
    throw new Error(`TileRegistry: unknown tile id '${id}'`);
  }
  return def;
}

export function getTileByGlyph(glyph) {
  return glyphIndex.get(glyph);
}

export function getRegistryTerrainEntries() {
  return Object.entries(TileRegistry).filter(([, def]) => def?.terrain);
}

// Registry Naming Guidelines:
// - Use a dotted hierarchy: <category>.<subCategory>.<variant>. Keep drift minimal to avoid large vocabularies.
// - category examples: floor, wall, terrain, structure, decoration, container, interaction, item, material.
// - subCategory should denote the family (e.g. 'candy', 'brick', 'market').
// - variant describes the specific asset (e.g. 'polished', 'arch', 'cotton_candy').
// Properties accepted:
// - glyph: a single-character fallback used by ASCII rendering / map persistence (required).
// - sprite: string path, array of paths, or object descriptor (optional). Sprite loading is handled by renderer.
// - terrain: object defining gameplay behavior (passable, moveCost, blocksVision, name, description, hooks like onEnter/onExit).
// - tags: optional array for quick lookup (e.g. ['floor', 'crosswalk']).
// - Additional metadata can be attached ad-hoc (vfx, ambientSound, etc.) but document their usage.
//
// When adding a new tile:
// 1. Choose consistent naming per the hierarchy above.
// 2. Provide terrain data whenever the tile affects movement/vision.
// 3. Supply a sprite or leave null if pending art (track follow-up in tasks).
// 4. Ensure glyph is unique to avoid collision; register the glyph in TileRegistry only once.
// 5. Update generators to use tile IDs instead of glyph literals.
