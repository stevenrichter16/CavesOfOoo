// src/js/sprites/marketSprites.js
// Pixel art sprites for Candy Market stalls

// Color palette from the original sprites
const colors = {
  black: '#000000',
  brown1: '#4a2c17',  // Dark brown for outlines/shadows
  brown2: '#7a4e3a',  // Medium brown 
  brown3: '#a67c52',  // Light brown/tan
  brown4: '#c8956d',  // Lighter brown/beige
  
  pink1: '#ff69b4',   // Bright pink
  pink2: '#ffc0cb',   // Light pink
  beige: '#f5deb3',   // Wheat/beige color
  
  red: '#ff0000',     // Pure red
  green: '#00ff00',   // Pure green  
  blue: '#0099ff',    // Bright blue
  cyan: '#00ffff',    // Cyan
  
  white: '#ffffff',
  gray: '#808080',
  darkGray: '#404040'
};

/**
 * Draw a pixel at the given position
 */
function drawPixel(ctx, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

/**
 * Market stall sprite definitions
 */
export const MARKET_SPRITES = {
  // Canopy Stall with striped awning
  canopyStall: {
    symbol: '╬',
    width: 16,
    height: 16,
    draw: (ctx, x, y, scale = 16) => {
      const pixelSize = 4; // Each pixel is 4x4
      const d = (px, py, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      };
      
      // Black frame
      for (let i = 3; i <= 12; i++) {
        d(i, 2, colors.black);
        d(i, 7, colors.black);
      }
      d(2, 3, colors.black); d(2, 4, colors.black); d(2, 5, colors.black); d(2, 6, colors.black);
      d(13, 3, colors.black); d(13, 4, colors.black); d(13, 5, colors.black); d(13, 6, colors.black);
      
      // Vertical pink/beige stripes
      for (let py = 3; py <= 6; py++) {
        d(3, py, colors.pink1); d(4, py, colors.pink1);
        d(5, py, colors.beige); d(6, py, colors.beige);
        d(7, py, colors.pink1); d(8, py, colors.pink1);
        d(9, py, colors.beige); d(10, py, colors.beige);
        d(11, py, colors.pink1); d(12, py, colors.pink1);
      }
      
      // Support poles
      for (let py = 8; py <= 13; py++) {
        d(2, py, colors.black); d(3, py, colors.brown1);
        d(13, py, colors.black); d(12, py, colors.brown1);
      }
      
      // Storage boxes at bottom
      for (let px = 4; px <= 8; px++) {
        for (let py = 10; py <= 12; py++) {
          d(px, py, colors.brown3);
        }
      }
      d(4, 10, colors.brown2); d(8, 10, colors.brown2);
      d(4, 12, colors.brown2); d(8, 12, colors.brown2);
      
      // Small items/candies
      d(9, 11, colors.red);
      d(10, 11, colors.green);
      d(11, 11, colors.blue);
      d(9, 12, colors.blue);
      d(10, 12, colors.green);
    }
  },
  
  // Table Stall with gumdrops
  tableStall: {
    symbol: '╤',
    width: 16,
    height: 16,
    draw: (ctx, x, y, scale = 16) => {
      const pixelSize = 4; // Each pixel is 4x4
      const d = (px, py, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      };
      
      // Black outline
      for (let px = 3; px <= 12; px++) {
        d(px, 4, colors.black);
        d(px, 10, colors.black);
      }
      d(3, 5, colors.black); d(3, 6, colors.black); d(3, 7, colors.black); 
      d(3, 8, colors.black); d(3, 9, colors.black);
      d(12, 5, colors.black); d(12, 6, colors.black); d(12, 7, colors.black); 
      d(12, 8, colors.black); d(12, 9, colors.black);
      
      // Table top (lighter pink)
      for (let px = 4; px <= 11; px++) {
        d(px, 5, colors.pink2);
      }
      
      // Table body (pink)
      for (let px = 4; px <= 11; px++) {
        for (let py = 6; py <= 9; py++) {
          d(px, py, colors.pink1);
        }
      }
      
      // Three gumdrops on top
      d(5, 3, colors.green); d(5, 4, colors.green);
      d(7, 3, colors.brown1); d(8, 3, colors.brown1); d(7, 4, colors.brown1);
      d(10, 3, colors.blue); d(10, 4, colors.blue);
      
      // Table feet
      d(4, 10, colors.brown1); d(4, 11, colors.brown1);
      d(11, 10, colors.brown1); d(11, 11, colors.brown1);
    }
  },
  
  // Goods Table with bottles
  goodsTable: {
    symbol: '≡',
    width: 16,
    height: 16,
    draw: (ctx, x, y, scale = 16) => {
      const pixelSize = 4; // Each pixel is 4x4
      const d = (px, py, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      };
      
      // Table outline
      for (let px = 2; px <= 13; px++) {
        d(px, 6, colors.black);
        d(px, 12, colors.black);
      }
      d(2, 7, colors.black); d(2, 8, colors.black); d(2, 9, colors.black); 
      d(2, 10, colors.black); d(2, 11, colors.black);
      d(13, 7, colors.black); d(13, 8, colors.black); d(13, 9, colors.black); 
      d(13, 10, colors.black); d(13, 11, colors.black);
      
      // Table body
      for (let px = 3; px <= 12; px++) {
        for (let py = 7; py <= 11; py++) {
          d(px, py, colors.brown2);
        }
      }
      
      // Darker top edge
      for (let px = 3; px <= 12; px++) {
        d(px, 7, colors.brown1);
      }
      
      // Bottles with cyan tops
      // Bottle 1 - red
      d(4, 4, colors.brown1); // cork
      d(4, 5, colors.cyan); d(5, 5, colors.cyan);
      d(4, 6, colors.red); d(5, 6, colors.red);
      
      // Bottle 2 - green  
      d(7, 4, colors.brown1); // cork
      d(7, 5, colors.cyan); d(8, 5, colors.cyan);
      d(7, 6, colors.green); d(8, 6, colors.green);
      
      // Bottle 3 - blue
      d(10, 4, colors.brown1); // cork
      d(10, 5, colors.cyan); d(11, 5, colors.cyan);
      d(10, 6, colors.blue); d(11, 6, colors.blue);
    }
  },
  
  // Vendor Cart with wheels
  vendorCart: {
    symbol: '¤',
    width: 16,
    height: 16,
    draw: (ctx, x, y, scale = 16) => {
      const pixelSize = 4; // Each pixel is 4x4
      const d = (px, py, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      };
      
      // Awning
      for (let px = 2; px <= 13; px++) {
        d(px, 2, colors.black);
        d(px, 7, colors.black);
      }
      d(2, 3, colors.black); d(2, 4, colors.black); d(2, 5, colors.black); d(2, 6, colors.black);
      d(13, 3, colors.black); d(13, 4, colors.black); d(13, 5, colors.black); d(13, 6, colors.black);
      
      // Awning stripes (alternating cyan/pink)
      for (let py = 3; py <= 6; py++) {
        d(3, py, colors.cyan); d(4, py, colors.cyan);
        d(5, py, colors.pink1); d(6, py, colors.pink1);
        d(7, py, colors.cyan); d(8, py, colors.cyan);
        d(9, py, colors.pink1); d(10, py, colors.pink1);
        d(11, py, colors.cyan); d(12, py, colors.cyan);
      }
      
      // Cart body
      for (let px = 3; px <= 12; px++) {
        for (let py = 8; py <= 10; py++) {
          d(px, py, colors.brown3);
        }
      }
      d(2, 8, colors.black); d(2, 9, colors.black); d(2, 10, colors.black);
      d(13, 8, colors.black); d(13, 9, colors.black); d(13, 10, colors.black);
      for (let px = 3; px <= 12; px++) {
        d(px, 11, colors.black);
      }
      
      // Dark wood effect
      for (let px = 3; px <= 12; px++) {
        d(px, 8, colors.brown2);
      }
      
      // Wheels
      d(3, 12, colors.black); d(4, 12, colors.black); d(5, 12, colors.black);
      d(3, 13, colors.black); d(4, 13, colors.darkGray); d(5, 13, colors.black);
      d(3, 14, colors.black); d(4, 14, colors.black); d(5, 14, colors.black);
      
      d(10, 12, colors.black); d(11, 12, colors.black); d(12, 12, colors.black);
      d(10, 13, colors.black); d(11, 13, colors.darkGray); d(12, 13, colors.black);
      d(10, 14, colors.black); d(11, 14, colors.black); d(12, 14, colors.black);
      
      // Lollipop decoration
      d(14, 9, colors.pink1); 
      d(15, 10, colors.pink1);
    }
  },
  
  // Crate of Wares
  crateOfWares: {
    symbol: '☐',
    width: 16,
    height: 16,
    draw: (ctx, x, y, scale = 16) => {
      const pixelSize = 4; // Each pixel is 4x4
      const d = (px, py, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      };
      
      // Main crate
      for (let px = 3; px <= 12; px++) {
        d(px, 5, colors.black);
        d(px, 12, colors.black);
      }
      d(3, 6, colors.black); d(3, 7, colors.black); d(3, 8, colors.black); 
      d(3, 9, colors.black); d(3, 10, colors.black); d(3, 11, colors.black);
      d(12, 6, colors.black); d(12, 7, colors.black); d(12, 8, colors.black); 
      d(12, 9, colors.black); d(12, 10, colors.black); d(12, 11, colors.black);
      
      // Crate fill - darker at top
      for (let px = 4; px <= 11; px++) {
        d(px, 6, colors.brown1);
        for (let py = 7; py <= 11; py++) {
          d(px, py, colors.brown2);
        }
      }
      
      // Wood planks (horizontal lines)
      for (let px = 4; px <= 11; px++) {
        d(px, 8, colors.brown1);
        d(px, 10, colors.brown1);
      }
      
      // Items inside (colorful candies/goods)
      d(5, 6, colors.red);
      d(7, 6, colors.green);
      d(9, 6, colors.blue);
      d(6, 7, colors.blue);
      d(8, 7, colors.red);
      d(10, 7, colors.green);
    }
  },
  
  // Decorative Lollipop
  lollipop: {
    symbol: '♣',
    width: 16,
    height: 16,
    draw: (ctx, x, y, scale = 16) => {
      const pixelSize = 4; // Each pixel is 4x4
      const d = (px, py, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      };
      
      // Lollipop circle
      for (let px = 5; px <= 10; px++) {
        d(px, 1, colors.black);
        d(px, 8, colors.black);
      }
      d(4, 2, colors.black); d(11, 2, colors.black);
      d(3, 3, colors.black); d(12, 3, colors.black);
      d(3, 4, colors.black); d(12, 4, colors.black);
      d(3, 5, colors.black); d(12, 5, colors.black);
      d(3, 6, colors.black); d(12, 6, colors.black);
      d(4, 7, colors.black); d(11, 7, colors.black);
      
      // Swirl pattern
      // Top section
      d(6, 2, colors.red); d(7, 2, colors.red); d(8, 2, colors.white); d(9, 2, colors.white);
      d(5, 3, colors.red); d(6, 3, colors.red); d(7, 3, colors.red); 
      d(8, 3, colors.white); d(9, 3, colors.white); d(10, 3, colors.white);
      
      // Middle swirl
      d(4, 4, colors.white); d(5, 4, colors.white); d(6, 4, colors.red); d(7, 4, colors.red); 
      d(8, 4, colors.red); d(9, 4, colors.white); d(10, 4, colors.white); d(11, 4, colors.white);
      
      d(4, 5, colors.white); d(5, 5, colors.white); d(6, 5, colors.white); d(7, 5, colors.red);
      d(8, 5, colors.red); d(9, 5, colors.red); d(10, 5, colors.red); d(11, 5, colors.red);
      
      // Bottom section  
      d(4, 6, colors.red); d(5, 6, colors.red); d(6, 6, colors.white); d(7, 6, colors.white);
      d(8, 6, colors.white); d(9, 6, colors.red); d(10, 6, colors.red); d(11, 6, colors.red);
      
      d(5, 7, colors.red); d(6, 7, colors.red); d(7, 7, colors.white); 
      d(8, 7, colors.white); d(9, 7, colors.white); d(10, 7, colors.white);
      
      // Stick
      d(7, 9, colors.black); d(8, 9, colors.black);
      d(7, 10, colors.white); d(8, 10, colors.white);
      d(7, 11, colors.white); d(8, 11, colors.white);
      d(7, 12, colors.white); d(8, 12, colors.white);
      d(7, 13, colors.white); d(8, 13, colors.white);
      d(7, 14, colors.black); d(8, 14, colors.black);
    }
  }
};

/**
 * Draw a sprite at the given tile position
 */
export function drawMarketSprite(ctx, spriteName, tileX, tileY, tileSize = 16) {
  const sprite = MARKET_SPRITES[spriteName];
  if (!sprite) return;
  
  sprite.draw(ctx, tileX, tileY, tileSize);
}