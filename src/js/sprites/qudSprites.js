// Minimal sprite renderer in the spirit of Caves of Qud.
// Uses simple color blocks and highlights for a lo-fi aesthetic.

import { TileRegistry, getTileByGlyph } from '../world/TileRegistry.js';
import { MARKET_SPRITES } from './marketSprites.js';

const BASE_TILE_PALETTE = {
  floorBase: '#1b1f26',
  floorHighlight: '#242a34',
  floorDetail: '#2f3644',
  wallBase: '#524a5d',
  wallHighlight: '#867c9b',
  wallShadow: '#2a2531',
  doorBase: '#6b4525',
  doorHighlight: '#9c6d3c',
  waterBase: '#0e2b3e',
  waterHighlight: '#236a92',
  waterSpark: '#3fb2e8',
  hazardBase: '#623030',
  hazardHighlight: '#d97b6a',
  dustBase: '#5b2448',
  dustHighlight: '#b469ae',
  shrineBase: '#332739',
  shrineHighlight: '#f2c14e',
  chestBase: '#6c522f',
  chestHighlight: '#c6994b'
};

const BIOME_OVERRIDES = {
  candy_forest: {
    floorBase: '#ffb3d9',
    floorHighlight: '#ffc2e3',
    floorDetail: '#ffe0f2',
    wallBase: '#b55da8',
    wallHighlight: '#ff9bd7',
    dustBase: '#f48fb1',
    dustHighlight: '#ffd1e6'
  },
  candy_kingdom: {
    floorBase: '#ffb3d9',
    floorHighlight: '#ffc6e6',
    floorDetail: '#ffe5f4',
    wallBase: '#c678ff',
    wallHighlight: '#f0b6ff',
    dustBase: '#f69acd',
    dustHighlight: '#ffd6f0'
  },
  slime_kingdom: {
    floorBase: '#162418',
    floorHighlight: '#1f3422',
    floorDetail: '#253f2a',
    wallBase: '#5fa162',
    wallHighlight: '#91d892',
    waterBase: '#133223',
    waterHighlight: '#1f5c3a',
    waterSpark: '#4cd063'
  },
  frost_caverns: {
    floorBase: '#17222c',
    floorHighlight: '#1f2f3c',
    floorDetail: '#2d3f52',
    wallBase: '#7fb9d6',
    wallHighlight: '#c7e8f7',
    waterBase: '#102f49',
    waterHighlight: '#2f6e9c',
    waterSpark: '#73c4ff'
  },
  volcanic_marsh: {
    floorBase: '#2a1414',
    floorHighlight: '#371c1c',
    floorDetail: '#4a2626',
    wallBase: '#b4553a',
    wallHighlight: '#ff8663',
    hazardBase: '#752c17',
    hazardHighlight: '#ff7043'
  },
  corrupted_dungeon: {
    floorBase: '#221d2b',
    floorHighlight: '#2c2536',
    floorDetail: '#3a3150',
    wallBase: '#7b5cc1',
    wallHighlight: '#b391ff'
  },
  lich_domain: {
    floorBase: '#1a1d23',
    floorHighlight: '#232830',
    floorDetail: '#313741',
    wallBase: '#4d5465',
    wallHighlight: '#8a96aa'
  }
};

const STATUS_AURAS = {
  burn: 'rgba(255, 99, 71, 0.35)',
  fire: 'rgba(255, 99, 71, 0.35)',
  freeze: 'rgba(135, 206, 250, 0.35)',
  ice: 'rgba(135, 206, 250, 0.35)',
  poison: 'rgba(124, 252, 0, 0.35)',
  shock: 'rgba(255, 255, 0, 0.35)',
  weaken: 'rgba(205, 133, 63, 0.3)',
  buff_str: 'rgba(255, 215, 0, 0.25)',
  buff_def: 'rgba(70, 130, 180, 0.25)'
};

const MONSTER_PALETTES = {
  goober:     { body: '#ff7aa7', shell: '#4a1c2d', eye: '#ffe9f2' },
  icething:   { body: '#93d8ff', shell: '#21506f', eye: '#ffffff' },
  sootling:   { body: '#4a4a4a', shell: '#171717', eye: '#ffca7a' },
  firefly:    { body: '#f3e462', shell: '#694620', eye: '#ffffff' },
  flamepup:   { body: '#ff8a3c', shell: '#5a1d0a', eye: '#ffe7c2' },
  frostbite:  { body: '#8fd2ff', shell: '#1f5d78', eye: '#ffffff' },
  toxicslime: { body: '#7be95f', shell: '#24511a', eye: '#123f0a' },
  sparkler:   { body: '#fae56b', shell: '#7b1f1f', eye: '#ffffff' },
  wraith:     { body: '#a395ff', shell: '#35227a', eye: '#ffffff' },
  shadow_beast:{ body: '#613a7b', shell: '#1c1026', eye: '#d3b5ff' },
  bone_knight: { body: '#ded3ad', shell: '#5b5130', eye: '#d9534f' },
  demon:      { body: '#e25c5c', shell: '#4c0808', eye: '#ffe9b0' },
  boss:       { body: '#7ed6ff', shell: '#224a5b', eye: '#ffffff' },
  default:    { body: '#b7bfc6', shell: '#2f353b', eye: '#ffffff' }
};

const FACTION_COLORS = {
  merchants: '#f4c144',
  guards: '#5a8df0',
  nobles: '#d7b5ff',
  peasants: '#9d9d9d',
  bandits: '#f26d5b',
  wildlings: '#6ddc74',
  default: '#b4c5ff'
};

const NPC_HEAD_COLOR = '#f6d7b0';
const NPC_EYE_COLOR = '#1b1f26';
const NPC_BOOT_COLOR = '#2c2c2c';

const textureCache = new Map();

function ensureTexture(src) {
  if (!src) return null;
  let entry = textureCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, error: false };
    img.onload = () => {
      entry.loaded = true;
      if (typeof window !== 'undefined') {
        const state = window.STATE;
        if (state && typeof state.render === 'function') {
          requestAnimationFrame(() => state.render());
        }
      }
    };
    img.onerror = () => { entry.error = true; };
    img.src = src;
    textureCache.set(src, entry);
  }
  return entry;
}

function drawTexture(ctx, entry, pixelX, pixelY, width, height, { fit = 'fill' } = {}) {
  if (!entry || entry.error || !entry.loaded) return false;
  const img = entry.img;
  if (fit === 'fill') {
    ctx.drawImage(img, pixelX, pixelY, width, height);
    return true;
  }

  const drawWidth = img.width;
  const drawHeight = img.height;
  const offsetX = pixelX + (width - drawWidth) / 2;
  let offsetY = pixelY;
  if (fit === 'bottom') {
    offsetY = pixelY + (height - drawHeight);
  } else if (fit === 'center') {
    offsetY = pixelY + (height - drawHeight) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  return true;
}

function chooseVariant(list, x = 0, y = 0) {
  if (!list || list.length === 0) return null;
  if (list.length === 1) return list[0];
  const hash = (((x * 73856093) ^ (y * 19349663)) >>> 0) % list.length;
  return list[hash];
}

const LEGACY_GLYPH_TEXTURES = {
  '%': {
    sources: ['Textures/Terrain/sw_flowers_bunched_1.bmp', 'Textures/Terrain/sw_flowers_bunched_2.bmp'],
    fit: 'bottom'
  },
  'T': {
    sources: ['Textures/Terrain/tile_tombstone2.png', 'Textures/Terrain/tile_tombstone3.png'],
    fit: 'bottom'
  },
  '◯': {
    sources: ['Textures/Terrain/sw_ground_brick1.bmp', 'Textures/Terrain/sw_ground_brick2.bmp'],
    fit: 'fill'
  },
  '▪': {
    sources: ['building_wall.png'],
    fit: 'fill'
  }
};

const CANDY_TILE_TEXTURES = buildCandyTileTextures();

function buildCandyTileTextures() {
  const textures = new Map();
  for (const [tileId, def] of Object.entries(TileRegistry)) {
    const spriteDef = def?.sprite;
    if (!spriteDef) continue;

    if (Array.isArray(spriteDef) || typeof spriteDef === 'string') {
      const sources = Array.isArray(spriteDef) ? spriteDef : [spriteDef];
      if (!sources.length) continue;
      textures.set(tileId, {
        type: 'texture',
        sources,
        fit: def.spriteFit ?? 'fill'
      });
      continue;
    }

    if (spriteDef?.type === 'marketSprite' && spriteDef.name) {
      textures.set(tileId, {
        type: 'marketSprite',
        name: spriteDef.name
      });
    }
  }
  return textures;
}

export function getCandyTileSpriteConfig(tileId, glyph) {
  if (tileId) {
    const config = CANDY_TILE_TEXTURES.get(tileId);
    if (config) {
      return config;
    }
  }

  const registryId = glyph ? getTileByGlyph(glyph) : null;
  if (registryId) {
    const config = CANDY_TILE_TEXTURES.get(registryId);
    if (config) {
      return config;
    }
  }

  if (glyph && LEGACY_GLYPH_TEXTURES[glyph]) {
    return LEGACY_GLYPH_TEXTURES[glyph];
  }

  return null;
}

const CANDY_ITEM_TEXTURES = {
  potion: ['Textures/Items/sw_orb.bmp', 'Textures/Items/sw_shard.bmp'],
  weapon: ['Textures/Items/sw_baton_siphon.bmp'],
  armor: ['Textures/Items/sw_betyl.bmp'],
  ring: ['Textures/Items/item_11-1.bmp']
};

const CANDY_NPC_TEXTURES = {
  merchants: [
    'Textures/Creatures/Creatures-0-3.png',
    'Textures/Creatures/Creatures-0-4.png',
    'Textures/Creatures/Creatures-0-8.png'
  ],
  nobles: [
    'Textures/Creatures/Creatures-4-14.png',
    'Textures/Creatures/Creatures-0-12.png'
  ],
  peasants: [
    'farmer3.png'
  ],
  guards: [
    'Textures/Creatures/sf_5-0.bmp',
    'Textures/Creatures/sf_7-2.bmp'
  ]
};

const PLAYER_TEXTURES = [
  'Textures/Creatures/Creatures-0-0.png',
  'Textures/Creatures/Creatures-0-1.png',
  'Textures/Creatures/Creatures-0-2.png'
];

function drawDefaultNpc(ctx, pixelX, pixelY, size, robeColor) {
  drawRect(ctx, pixelX + 4, pixelY + 1, size - 8, 3, NPC_HEAD_COLOR);
  drawRect(ctx, pixelX + 5, pixelY + 2, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + size - 7, pixelY + 2, 2, 1, NPC_EYE_COLOR);
  const base = robeColor || FACTION_COLORS.default;
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, base);
  drawRect(ctx, pixelX + 3, pixelY + 5, size - 6, size - 7, '#dde6ff');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, NPC_BOOT_COLOR);
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, NPC_BOOT_COLOR);
}

function drawMerchantNpc(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 3, pixelY, size - 6, 1, '#7d4b16');
  drawRect(ctx, pixelX + 4, pixelY, size - 8, 1, '#b3812d');
  drawRect(ctx, pixelX + 4, pixelY + 1, size - 8, 3, NPC_HEAD_COLOR);
  drawRect(ctx, pixelX + 5, pixelY + 2, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + size - 7, pixelY + 2, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, '#c98a2c');
  drawRect(ctx, pixelX + 3, pixelY + 4, size - 6, size - 6, '#f4c144');
  drawRect(ctx, pixelX + 2, pixelY + 8, size - 4, 2, '#b86a15');
  drawRect(ctx, pixelX + 4, pixelY + 9, size - 8, 2, '#ffd27f');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, '#3b2d1a');
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, '#3b2d1a');
}

function drawGuardNpc(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 3, pixelY, size - 6, 1, '#6a7fcc');
  drawRect(ctx, pixelX + 3, pixelY + 1, size - 6, 3, '#9fb4ff');
  drawRect(ctx, pixelX + 4, pixelY + 2, size - 8, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + 4, pixelY + 3, size - 8, 1, '#d7e2ff');
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, '#1f3a8a');
  drawRect(ctx, pixelX + 3, pixelY + 4, size - 6, size - 6, '#4f6bdc');
  drawRect(ctx, pixelX + 3, pixelY + 7, size - 6, 2, '#7fa0ff');
  drawRect(ctx, pixelX + 2, pixelY + 9, size - 4, 2, '#1f2d66');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, NPC_BOOT_COLOR);
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, NPC_BOOT_COLOR);
}

function drawNobleNpc(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 3, pixelY, size - 6, 1, '#eacb3c');
  drawRect(ctx, pixelX + 3, pixelY + 1, size - 6, 1, '#f7e27b');
  drawRect(ctx, pixelX + 4, pixelY + 2, size - 8, 2, NPC_HEAD_COLOR);
  drawRect(ctx, pixelX + 5, pixelY + 3, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + size - 7, pixelY + 3, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, '#7a36c4');
  drawRect(ctx, pixelX + 3, pixelY + 4, size - 6, size - 6, '#b067ff');
  drawRect(ctx, pixelX + 3, pixelY + 8, size - 6, 2, '#ffd700');
  drawRect(ctx, pixelX + 4, pixelY + 9, size - 8, 2, '#d9a5ff');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, '#45286f');
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, '#45286f');
}

function drawPeasantNpc(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 4, pixelY, size - 8, 1, '#6b5136');
  drawRect(ctx, pixelX + 4, pixelY + 1, size - 8, 3, NPC_HEAD_COLOR);
  drawRect(ctx, pixelX + 5, pixelY + 2, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + size - 7, pixelY + 2, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, '#9b7a4b');
  drawRect(ctx, pixelX + 3, pixelY + 6, size - 6, size - 8, '#d9cdb4');
  drawRect(ctx, pixelX + 3, pixelY + 8, size - 6, 2, '#c4b192');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, '#483728');
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, '#483728');
}

function drawWildlingNpc(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 3, pixelY, size - 6, 2, '#2f5e2c');
  drawRect(ctx, pixelX + 4, pixelY + 2, size - 8, 3, '#d5f0c6');
  drawRect(ctx, pixelX + 5, pixelY + 3, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + size - 7, pixelY + 3, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, '#2f6231');
  drawRect(ctx, pixelX + 3, pixelY + 4, size - 6, size - 6, '#3d873f');
  drawRect(ctx, pixelX + 2, pixelY + 5, size - 4, 2, '#63c76d');
  drawRect(ctx, pixelX + 3, pixelY + 9, size - 6, 2, '#2a5029');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, '#1b301b');
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, '#1b301b');
}

function drawBanditNpc(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 3, pixelY, size - 6, 2, '#3a1b1b');
  drawRect(ctx, pixelX + 4, pixelY + 2, size - 8, 1, '#080c12');
  drawRect(ctx, pixelX + 4, pixelY + 3, size - 8, 2, NPC_HEAD_COLOR);
  drawRect(ctx, pixelX + 5, pixelY + 3, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + size - 7, pixelY + 3, 2, 1, NPC_EYE_COLOR);
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, '#421919');
  drawRect(ctx, pixelX + 3, pixelY + 4, size - 6, size - 6, '#712c2c');
  drawRect(ctx, pixelX + 2, pixelY + 8, size - 4, 2, '#ff5b5b');
  drawRect(ctx, pixelX + 3, pixelY + 9, size - 6, 2, '#8f3232');
  drawRect(ctx, pixelX + 3, pixelY + size - 4, 2, 2, '#1b1010');
  drawRect(ctx, pixelX + size - 5, pixelY + size - 4, 2, 2, '#1b1010');
}

function drawBananaGuardNpc(ctx, pixelX, pixelY, size) {
  const peelLight = '#ffe770';
  const peelMid = '#f9d348';
  const peelShadow = '#d9a93c';
  const peelCore = '#fef1a1';
  const faceBase = '#fff6d3';
  const faceShade = '#f1d79e';
  const mouthColor = '#8f4d2b';
  const eyeColor = '#27333d';
  const strapDark = '#2f3a88';
  const strapMid = '#4e5ed6';
  const strapLight = '#8c9aff';
  const accentBlue = '#6fa8ff';
  const badgeGold = '#fbd25d';
  const beltLeather = '#4a2e16';
  const bootColor = '#382719';

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Outer peel body with curved silhouette
  drawRect(ctx, pixelX + 5, pixelY, size - 10, 1, peelMid);
  drawRect(ctx, pixelX + 4, pixelY + 1, size - 8, size - 2, peelLight);
  drawRect(ctx, pixelX + 4, pixelY + size - 2, size - 8, 1, peelShadow);

  // Inner peel core for highlight
  drawRect(ctx, pixelX + 6, pixelY + 2, size - 12, size - 6, peelCore);

  // Side shading to suggest roundness
  drawRect(ctx, pixelX + 4, pixelY + 2, 1, size - 4, peelShadow);
  drawRect(ctx, pixelX + size - 5, pixelY + 3, 1, size - 5, peelMid);

  // Shoulder strap shadow and chest bandolier
  drawRect(ctx, pixelX + 3, pixelY + 1, 2, size - 4, strapDark);
  drawRect(ctx, pixelX + 3, pixelY + 2, 2, size - 6, strapMid);
  drawRect(ctx, pixelX + 3, pixelY + 5, size - 6, 2, strapLight);

  // Hat - tall helmet with blue trim
  drawRect(ctx, pixelX + 3, pixelY - 2, size - 6, 2, strapDark);
  drawRect(ctx, pixelX + 3, pixelY, size - 6, 1, strapMid);
  drawRect(ctx, pixelX + 4, pixelY - 3, size - 8, 1, accentBlue);

  // Face panel with subtle cheek shading
  drawRect(ctx, pixelX + 6, pixelY + 4, size - 12, 4, faceBase);
  drawRect(ctx, pixelX + 6, pixelY + 6, size - 12, 1, faceShade);

  // Eyes
  drawRect(ctx, pixelX + 7, pixelY + 5, 2, 1, eyeColor);
  drawRect(ctx, pixelX + size - 9, pixelY + 5, 2, 1, eyeColor);

  // Mouth (slight frown)
  drawRect(ctx, pixelX + 8, pixelY + 7, size - 16, 1, mouthColor);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 7, 2, 1, '#733318');

  // Belt with golden buckle and radio gadget
  drawRect(ctx, pixelX + 4, pixelY + 11, size - 8, 1, beltLeather);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 10, 2, 2, badgeGold);
  drawRect(ctx, pixelX + size - 7, pixelY + 10, 2, 2, strapDark);
  drawRect(ctx, pixelX + size - 6, pixelY + 10, 1, 1, strapLight);

  // Arm guards with cuffs
  drawRect(ctx, pixelX + 2, pixelY + 6, 2, 2, peelLight);
  drawRect(ctx, pixelX + 2, pixelY + 7, 2, 1, strapMid);
  drawRect(ctx, pixelX + size - 4, pixelY + 6, 2, 2, peelLight);
  drawRect(ctx, pixelX + size - 4, pixelY + 7, 2, 1, strapMid);

  // Lower peel drape shading
  drawRect(ctx, pixelX + 5, pixelY + size - 5, size - 10, 1, peelMid);
  drawRect(ctx, pixelX + 6, pixelY + size - 4, size - 12, 1, peelShadow);

  // Boots
  drawRect(ctx, pixelX + 6, pixelY + size - 3, 3, 2, bootColor);
  drawRect(ctx, pixelX + size - 9, pixelY + size - 3, 3, 2, bootColor);
  drawRect(ctx, pixelX + 6, pixelY + size - 2, 3, 1, '#2a1c11');
  drawRect(ctx, pixelX + size - 9, pixelY + size - 2, 3, 1, '#2a1c11');

  // Radio antenna on hat
  drawRect(ctx, pixelX + size - 6, pixelY - 4, 1, 3, strapMid);
  drawRect(ctx, pixelX + size - 7, pixelY - 4, 3, 1, accentBlue);

  ctx.restore();
}

const NPC_RENDERERS = {
  merchants: drawMerchantNpc,
  guards: drawGuardNpc,
  nobles: drawNobleNpc,
  peasants: drawPeasantNpc,
  bandits: drawBanditNpc,
  wildlings: drawWildlingNpc,
  banana_guard: drawBananaGuardNpc
};

function getNpcTexture(entity) {
  if (!entity) return null;
  const name = (entity.name || '').toLowerCase();
  const id = entity.id || '';
  const factions = Array.isArray(entity.factions) ? entity.factions.slice() : [];
  if (entity.faction) factions.push(entity.faction);
  if (factions.includes('banana_guard') || name.includes('banana guard') || id.includes('banana_guard')) {
    return null;
  }
  const factionKey = factions.find(f => CANDY_NPC_TEXTURES[f]);
  if (factionKey) {
    const textures = CANDY_NPC_TEXTURES[factionKey];
    const src = chooseVariant(textures, entity.x ?? 0, entity.y ?? 0);
    return ensureTexture(src);
  }
  return null;
}

function getPlayerTexture(entity) {
  const src = chooseVariant(PLAYER_TEXTURES, entity?.x ?? 0, entity?.y ?? 0);
  return ensureTexture(src);
}

function getPalette(biome) {
  const override = BIOME_OVERRIDES[biome] || {};
  return { ...BASE_TILE_PALETTE, ...override };
}

function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawFloorTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.floorBase);
  drawRect(ctx, pixelX + 1, pixelY + 1, size - 2, size - 2, palette.floorHighlight);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + size / 2, 2, 2, palette.floorDetail);
}

function drawWallTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.wallShadow);
  drawRect(ctx, pixelX + 1, pixelY + 1, size - 2, size - 2, palette.wallBase);
  drawRect(ctx, pixelX + 1, pixelY + 1, size - 2, Math.ceil(size / 3), palette.wallHighlight);
}

function drawDoorTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.doorBase);
  drawRect(ctx, pixelX + 2, pixelY + 2, size - 4, size - 4, palette.doorHighlight);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 2, 2, size - 4, palette.doorBase);
}

function drawWaterTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.waterBase);
  drawRect(ctx, pixelX, pixelY + size / 2, size, size / 2, palette.waterHighlight);
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawRect(ctx, pixelX + 2, pixelY + 2, size - 4, 3, palette.waterSpark);
  drawRect(ctx, pixelX + 3, pixelY + size - 5, size - 6, 2, palette.waterSpark);
  ctx.restore();
}

function drawDustTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.dustBase);
  drawRect(ctx, pixelX + 1, pixelY + 1, size - 2, size - 2, palette.dustHighlight);
  drawRect(ctx, pixelX + 2, pixelY + size - 4, size - 4, 2, palette.dustBase);
}

function drawHazardTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.floorBase);
  drawRect(ctx, pixelX + 2, pixelY + 2, size - 4, size - 4, palette.hazardBase);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 2, 2, size - 6, palette.hazardHighlight);
}

function drawShrineTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.shrineBase);
  drawRect(ctx, pixelX + 3, pixelY + 3, size - 6, size - 6, palette.shrineHighlight);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 1, 2, size - 2, palette.shrineHighlight);
}

function drawChestTile(ctx, pixelX, pixelY, size, palette) {
  drawRect(ctx, pixelX, pixelY, size, size, palette.chestBase);
  drawRect(ctx, pixelX + 2, pixelY + 3, size - 4, size - 5, palette.chestHighlight);
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 3, 2, size - 6, palette.chestBase);
}

function drawPotion(ctx, pixelX, pixelY, size, color) {
  const glass = '#e8f1ff';
  drawRect(ctx, pixelX + size / 3, pixelY + 2, size / 3, size / 4, glass);
  drawRect(ctx, pixelX + size / 3 - 1, pixelY + size / 3, size / 3 + 2, size / 2, color || '#ff7ab5');
  drawRect(ctx, pixelX + size / 3, pixelY + size / 3 - 1, size / 3, 2, glass);
}

function drawWeapon(ctx, pixelX, pixelY, size, color) {
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 2, 2, size - 4, color || '#f4d35e');
  drawRect(ctx, pixelX + size / 2 - 3, pixelY + size / 3, 6, 3, '#c7a34f');
}

function drawArmor(ctx, pixelX, pixelY, size, color) {
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size - 6, color || '#8ecae6');
  drawRect(ctx, pixelX + 2, pixelY + 2, 4, 3, '#c9e7f5');
  drawRect(ctx, pixelX + size - 6, pixelY + 2, 4, 3, '#c9e7f5');
}

function drawHeadgear(ctx, pixelX, pixelY, size, color) {
  drawRect(ctx, pixelX + 2, pixelY + 4, size - 4, size / 3, color || '#dda0dd');
  drawRect(ctx, pixelX + size / 2 - 2, pixelY + 2, 4, 3, '#f6e7ff');
}

function drawRing(ctx, pixelX, pixelY, size, color) {
  const ringColor = color || '#f4e285';
  drawRect(ctx, pixelX + size / 2 - 3, pixelY + size / 2 - 3, 6, 6, ringColor);
  drawRect(ctx, pixelX + size / 2 - 2, pixelY + size / 2 - 2, 4, 4, '#1b1f26');
}

function drawVendor(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 2, pixelY + 3, size - 4, size - 6, '#ffca7b');
  drawRect(ctx, pixelX + 2, pixelY + 2, size - 4, 2, '#9e5a13');
  drawRect(ctx, pixelX + size / 2 - 1, pixelY + 3, 2, size - 5, '#9e5a13');
}

function drawRoundedCreature(ctx, pixelX, pixelY, size, palette) {
  const { body, shell, eye } = palette;
  drawRect(ctx, pixelX + 1, pixelY + 1, size - 2, size - 2, shell);
  drawRect(ctx, pixelX + 2, pixelY + 2, size - 4, size - 4, body);
  drawRect(ctx, pixelX + 4, pixelY + size - 5, 3, 2, eye);
  drawRect(ctx, pixelX + size - 7, pixelY + size - 5, 3, 2, eye);
}

function drawPlayer(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 1, pixelY + 2, size - 2, size - 4, '#f7e5a3');
  drawRect(ctx, pixelX + 3, pixelY + size - 6, size - 6, 4, '#6c4d2d');
  drawRect(ctx, pixelX + 4, pixelY + 4, size - 8, 3, '#ffe9bd');
  drawRect(ctx, pixelX + 4, pixelY + size - 5, 2, 2, '#2c2c2c');
  drawRect(ctx, pixelX + size - 6, pixelY + size - 5, 2, 2, '#2c2c2c');
}

function drawNpc(ctx, pixelX, pixelY, size, entity = {}) {
  if (entity?.sprite === 'gnome_fairy') {
    drawGnomeFairy(ctx, pixelX, pixelY, size);
    return;
  }
  const lowerName = (entity?.name || '').toLowerCase();
  const id = entity?.id || '';
  const factions = Array.isArray(entity?.factions) ? entity.factions : [entity?.faction].filter(Boolean);
  const isBananaGuard = factions.includes('banana_guard') ||
    (entity?.faction === 'guard' && lowerName.includes('banana guard')) ||
    id.includes('banana_guard');
  if (isBananaGuard) {
    drawBananaGuardNpc(ctx, pixelX, pixelY, size);
    return;
  }
  const faction = entity?.faction;
  const renderer = faction ? NPC_RENDERERS[faction] : null;
  if (renderer) {
    renderer(ctx, pixelX, pixelY, size);
    return;
  }
  drawDefaultNpc(ctx, pixelX, pixelY, size, FACTION_COLORS[faction] || FACTION_COLORS.default);
}

function drawGnomeFairy(ctx, pixelX, pixelY, size) {
  drawRect(ctx, pixelX + 1, pixelY + 4, size - 2, size - 6, '#ffe4ff');
  drawRect(ctx, pixelX + 3, pixelY + 2, size - 6, 3, '#dda0ff');
  drawRect(ctx, pixelX + 2, pixelY + size - 6, size - 4, 3, '#95e4ff');
  drawRect(ctx, pixelX + 4, pixelY + size - 5, 2, 2, '#3c3c3c');
  drawRect(ctx, pixelX + size - 6, pixelY + size - 5, 2, 2, '#3c3c3c');
  // wings
  drawRect(ctx, pixelX, pixelY + 4, 2, size - 8, 'rgba(180, 240, 255, 0.7)');
  drawRect(ctx, pixelX + size - 2, pixelY + 4, 2, size - 8, 'rgba(180, 240, 255, 0.7)');
}

function drawMonster(ctx, pixelX, pixelY, size, entity) {
  const palette = MONSTER_PALETTES[entity.kind] || MONSTER_PALETTES[entity.glyph] || MONSTER_PALETTES.default;
  drawRoundedCreature(ctx, pixelX, pixelY, size, palette);
}

function drawEntity(ctx, type, pixelX, pixelY, size, entity) {
  if (type === 'player') {
    drawPlayer(ctx, pixelX, pixelY, size);
    return true;
  }
  if (type === 'npc') {
    drawNpc(ctx, pixelX, pixelY, size, entity || {});
    return true;
  }
  if (type === 'monster') {
    drawMonster(ctx, pixelX, pixelY, size, entity || {});
    return true;
  }
  return false;
}

function drawItem(ctx, pixelX, pixelY, size, item, color) {
  if (!item) return false;
  switch (item.type) {
    case 'potion':
      drawPotion(ctx, pixelX, pixelY, size, color);
      return true;
    case 'weapon':
      drawWeapon(ctx, pixelX, pixelY, size, color);
      return true;
    case 'armor':
      drawArmor(ctx, pixelX, pixelY, size, color);
      return true;
    case 'headgear':
      drawHeadgear(ctx, pixelX, pixelY, size, color);
      return true;
    case 'ring':
      drawRing(ctx, pixelX, pixelY, size, color);
      return true;
    case 'vendor':
      drawVendor(ctx, pixelX, pixelY, size);
      return true;
    case 'chest':
      drawChestTile(ctx, pixelX, pixelY, size, getPalette());
      return true;
    default:
      return false;
  }
}

export function drawTileSprite(ctx, char, pixelX, pixelY, width, height, options = {}) {
  const { biome, color, meta = {} } = options;

  if (meta.type === 'item' && biome === 'candy_kingdom') {
    const itemSources = CANDY_ITEM_TEXTURES[meta.item?.type];
    if (itemSources && itemSources.length) {
      const entry = ensureTexture(itemSources[0]);
      if (drawTexture(ctx, entry, pixelX, pixelY, width, height, { fit: 'bottom' })) {
        return true;
      }
    }
  }

  if (biome === 'candy_kingdom') {
    const tileConfig = getCandyTileSpriteConfig(meta.tileId, char);
    if (tileConfig) {
      if (tileConfig.type === 'marketSprite') {
        const sprite = MARKET_SPRITES[tileConfig.name];
        if (sprite?.draw) {
          const size = Math.min(width, height);
          const offsetY = pixelY + (height - size);
          sprite.draw(ctx, pixelX, offsetY, size);
          return true;
        }
      } else {
        const src = chooseVariant(tileConfig.sources, meta.x ?? 0, meta.y ?? 0);
        const entry = ensureTexture(src);
        if (drawTexture(ctx, entry, pixelX, pixelY, width, height, { fit: tileConfig.fit ?? 'fill' })) {
          return true;
        }
      }
    }
  }

  if (meta.type === 'item') {
    const size = Math.min(width, height);
    const offsetY = pixelY + (height - size);
    if (drawItem(ctx, pixelX, offsetY, size, meta.item, color)) {
      return true;
    }
  }

  const palette = getPalette(biome);
  const size = Math.min(width, height);
  const offsetY = pixelY + (height - size);

  switch (char) {
    case '.':
    case ',':
    case '·':
      drawFloorTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '#':
    case '█':
      drawWallTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '~':
      drawWaterTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '+':
    case '▓':
      drawDoorTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '%':
      drawDustTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '^':
      drawHazardTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '▲':
      drawShrineTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '$':
      drawChestTile(ctx, pixelX, offsetY, size, palette);
      return true;
    case '!':
      drawPotion(ctx, pixelX, offsetY, size, color);
      return true;
    case '/':
      drawWeapon(ctx, pixelX, offsetY, size, color);
      return true;
    case ']':
      drawArmor(ctx, pixelX, offsetY, size, color);
      return true;
    case '○':
      drawWaterTile(ctx, pixelX, offsetY, size, palette);
      drawRect(ctx, pixelX + size / 2 - 1, offsetY + 1, 2, size - 2, '#9bdcfb');
      return true;
    case '╬':
    case '╤':
    case '≡':
    case '¤':
      drawVendor(ctx, pixelX, offsetY, size);
      return true;
    case '☐':
      drawRect(ctx, pixelX + 2, offsetY + 2, size - 4, size - 4, '#87ceeb');
      drawRect(ctx, pixelX + 2, offsetY + size / 2 - 1, size - 4, 2, '#aed9ff');
      return true;
    case '♣':
      drawRect(ctx, pixelX + size / 2 - 2, offsetY + 2, 4, 4, '#4caf50');
      drawRect(ctx, pixelX + size / 2 - 1, offsetY + 6, 2, size - 8, '#2e7d32');
      return true;
    default:
      return false;
  }
}

export function drawEntitySprite(ctx, type, { entity, pixelX, pixelY, width, height }) {
  const tileWidth = width ?? 16;
  const tileHeight = height ?? tileWidth;

  if (type === 'player') {
    const playerTexture = getPlayerTexture(entity);
    if (playerTexture && drawTexture(ctx, playerTexture, pixelX, pixelY, tileWidth, tileHeight, { fit: 'bottom' })) {
      return true;
    }
  }

  if (type === 'npc') {
    const npcTexture = getNpcTexture(entity);
    if (npcTexture && drawTexture(ctx, npcTexture, pixelX, pixelY, tileWidth, tileHeight, { fit: 'bottom' })) {
      return true;
    }
  }

  const size = Math.min(tileWidth, tileHeight);
  const offsetY = pixelY + (tileHeight - size);
  return drawEntity(ctx, type, pixelX, offsetY, size, entity);
}

export function drawStatusAura(ctx, pixelX, pixelY, width, height, effects = []) {
  if (!effects.length) return;
  const primary = effects[0];
  const type = primary?.type || primary;
  const color = STATUS_AURAS[type];
  if (!color) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(pixelX, pixelY, width, height);
  ctx.restore();
}
