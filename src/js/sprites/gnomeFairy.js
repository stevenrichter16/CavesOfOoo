// src/js/sprites/gnomeFairy.js
// Green Cap Gnome Fairy sprite - 16x24 pixels

export const GREEN_GNOME_SPRITE = {
  palette: {
    '0': 'transparent',
    '1': '#111',
    '2': '#B8E6B8',
    '3': '#9FD69F',
    '4': '#2E7D32',
    '5': '#1B5E20',
    '6': '#E0E0E0',
    '7': '#333',
    '8': '#FFB3B3',
    '9': '#C8FFC8'
  },
  rows: [
    "0000000550000000",
    "0000000550000000",
    "0000005445000000",
    "0000005445000000",
    "0000054454500000",
    "0000054454500000",
    "0000544444450000",
    "0000544444450000",
    "0004333333334000",
    "0043333333333400",
    "0433333333333340",
    "9433310003133349",
    "9943370007333499",
    "9943333333333499",
    "0994338888339900",
    "0004333333334000",
    "0000454444540000",
    "0000454444540000",
    "0000045445400000",
    "0000045445400000",
    "0000045005400000",
    "0000004224000000",
    "0000004334000000",
    "0000004004000000"
  ]
};

/**
 * Convert sprite to SVG data URL
 */
export function makeGnomeSpriteSVG() {
  const sprite = GREEN_GNOME_SPRITE;
  const w = 16, h = 24;
  const rects = [];
  
  for (let y = 0; y < h; y++) {
    const row = sprite.rows[y];
    for (let x = 0; x < w; x++) {
      const k = row[x] ?? '0';
      const fill = sprite.palette[k];
      if (fill && fill !== 'transparent') {
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
      }
    }
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${w} ${h}">${rects.join('')}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * Create canvas image from sprite
 */
export function createGnomeSpriteImage(callback) {
  const img = new Image();
  img.src = makeGnomeSpriteSVG();
  img.onload = () => callback(img);
  return img;
}

/**
 * Draw gnome sprite on canvas context
 */
export function drawGnomeSprite(ctx, x, y, scale = 1) {
  const sprite = GREEN_GNOME_SPRITE;
  const pixelSize = scale;
  
  ctx.save();
  
  for (let py = 0; py < 24; py++) {
    const row = sprite.rows[py];
    for (let px = 0; px < 16; px++) {
      const k = row[px] ?? '0';
      const fill = sprite.palette[k];
      if (fill && fill !== 'transparent') {
        ctx.fillStyle = fill;
        ctx.fillRect(
          x + px * pixelSize,
          y + py * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }
  
  ctx.restore();
}