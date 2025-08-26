// renderer/canvas.js - HTML5 Canvas renderer for CavesOfOoo
// This module handles all canvas-based rendering, replacing DOM manipulation

import { CANVAS_CONFIG, TILE } from '../config.js';

export class CanvasRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container element '${containerId}' not found`);
      return;
    }
    
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Set dimensions
    this.tileSize = CANVAS_CONFIG.TILE_SIZE;
    this.width = CANVAS_CONFIG.GRID_WIDTH;
    this.height = CANVAS_CONFIG.GRID_HEIGHT;
    
    this.canvas.width = this.width * this.tileSize;
    this.canvas.height = this.height * this.tileSize;
    
    // Set canvas styles
    this.canvas.style.display = 'block';
    this.canvas.style.imageRendering = 'pixelated'; // For crisp pixels
    this.canvas.style.imageRendering = 'crisp-edges'; // Firefox
    this.canvas.style.imageRendering = '-moz-crisp-edges'; // Older Firefox
    this.canvas.style.imageRendering = '-webkit-crisp-edges'; // Webkit
    
    // Pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = CANVAS_CONFIG.ENABLE_SMOOTH;
    
    // Font setup for ASCII mode
    this.ctx.font = `${CANVAS_CONFIG.FONT_SIZE}px ${CANVAS_CONFIG.FONT_FAMILY}`;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
    
    // Dirty rectangle tracking
    this.dirtyRects = [];
    this.isFullRedraw = true;
    
    // Cache for performance
    this.tileCache = new Map();
    this.colorCache = new Map();
    
    // Store previous state for diffing
    this.previousState = null;
    
    // Append to container (visible by default for Canvas-only mode)
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);
    
    console.log('Canvas renderer initialized:', {
      width: this.canvas.width,
      height: this.canvas.height,
      tileSize: this.tileSize
    });
  }
  
  /**
   * Enable or disable canvas rendering
   */
  setEnabled(enabled) {
    this.canvas.style.display = enabled ? 'block' : 'none';
  }
  
  /**
   * Clear the entire canvas or dirty rectangles
   */
  clear() {
    // Save context state
    this.ctx.save();
    
    // Always do full clear for now to prevent sprite trails
    // TODO: Implement proper dirty rectangle tracking later
    this.ctx.fillStyle = CANVAS_CONFIG.BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Restore context state
    this.ctx.restore();
  }
  
  /**
   * Draw a single tile (ASCII or sprite)
   */
  drawTile(x, y, char, color = CANVAS_CONFIG.FOREGROUND, bgColor = null) {
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;
    
    // Background
    if (bgColor && bgColor !== CANVAS_CONFIG.BACKGROUND) {
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
    }
    
    // Don't draw truly empty tiles, but DO draw floor tiles ('.')
    if (!char || char === ' ') return;
    
    // Foreground
    if (CANVAS_CONFIG.RENDER_MODE === 'ASCII') {
      // Set font every time (context state can be lost)
      this.ctx.font = `${CANVAS_CONFIG.FONT_SIZE}px ${CANVAS_CONFIG.FONT_FAMILY}`;
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = color;
      // Center the character in the tile
      this.ctx.fillText(
        char, 
        pixelX + this.tileSize / 2, 
        pixelY + this.tileSize / 2
      );
    } else {
      // Sprite mode - will be implemented later
      // this.drawSprite(x, y, char, color);
    }
  }
  
  /**
   * Draw the game state
   */
  render(gameState) {
    if (!gameState || !gameState.chunk) {
      console.warn('Invalid game state for rendering');
      return;
    }
    
    // Ensure canvas is visible
    if (this.canvas.style.display === 'none') {
      this.canvas.style.display = 'block';
    }
    
    this.clear();
    
    const { chunk, player } = gameState;
    const { map, monsters, items, biome } = chunk;
    
    // Draw map tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!map[y] || !map[y][x]) continue;
        
        const tile = map[y][x];
        const color = this.getTileColor(tile, biome);
        this.drawTile(x, y, tile, color);
      }
    }
    
    // Draw items
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        if (item.x >= 0 && item.x < this.width && 
            item.y >= 0 && item.y < this.height) {
          const glyph = this.getItemGlyph(item);
          const color = this.getItemColor(item.type);
          this.drawTile(item.x, item.y, glyph, color);
        }
      });
    }
    
    // Draw monsters
    if (monsters && Array.isArray(monsters)) {
      monsters.forEach(monster => {
        if (monster.alive && 
            monster.x >= 0 && monster.x < this.width && 
            monster.y >= 0 && monster.y < this.height) {
          const color = this.getMonsterColor(monster);
          
          // Check for status effects
          let bgColor = null;
          if (monster.statusEffects && monster.statusEffects.length > 0) {
            bgColor = this.getStatusEffectBgColor(monster.statusEffects[0].type);
          }
          
          this.drawTile(monster.x, monster.y, monster.glyph, color, bgColor);
        }
      });
    }
    
    // Draw player
    if (player && player.alive) {
      let bgColor = null;
      if (player.statusEffects && player.statusEffects.length > 0) {
        bgColor = this.getStatusEffectBgColor(player.statusEffects[0].type);
      }
      
      this.drawTile(player.x, player.y, TILE.player, '#ffd27f', bgColor);
    }
    
    // Draw movement path if active
    if (gameState.movementPath && gameState.movementPath.length > 1) {
      this.drawPath(gameState.movementPath, gameState.movementTarget);
    }
    
    // Draw cursor if active
    this.drawCursor(gameState);
    
    // Draw grid overlay if enabled (for debugging)
    if (CANVAS_CONFIG.SHOW_GRID) {
      this.drawGrid();
    }
    
    // Force a browser repaint if needed
    this.canvas.offsetHeight;
  }
  
  /**
   * Clone relevant game state for diffing
   */
  cloneGameState(state) {
    // Simple clone for now - can be optimized later
    return {
      player: { x: state.player.x, y: state.player.y, alive: state.player.alive },
      monsters: state.chunk.monsters.map(m => ({
        x: m.x, y: m.y, alive: m.alive, glyph: m.glyph
      }))
    };
  }
  
  /**
   * Mark area as needing redraw
   */
  markDirty(x, y, w = 1, h = 1) {
    if (CANVAS_CONFIG.DIRTY_RECTS) {
      this.dirtyRects.push({ x, y, w, h });
    }
  }
  
  /**
   * Get color based on biome and tile type
   */
  getTileColor(tile, biome) {
    // Cache key for performance
    const cacheKey = `${tile}_${biome}`;
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey);
    }
    
    // Biome color schemes - make floors more visible
    const biomeColors = {
      candy_forest: { 
        wall: '#FFB6C1', 
        floor: '#4a2a4a',  // Lighter purple for visibility
        door: '#FF69B4'
      },
      candy: { // Legacy name support
        wall: '#FFB6C1', 
        floor: '#4a2a4a',
        door: '#FF69B4'
      },
      slime_kingdom: { 
        wall: '#90EE90', 
        floor: '#2a4a2a',  // Lighter green for visibility
        door: '#7FFF00'
      },
      slime: { // Legacy name support
        wall: '#90EE90', 
        floor: '#2a4a2a',
        door: '#7FFF00'
      },
      frost_caverns: { 
        wall: '#B0E0E6', 
        floor: '#2a3a4a',  // Lighter blue for visibility
        door: '#87CEEB'
      },
      ice: { // Legacy name support
        wall: '#B0E0E6', 
        floor: '#2a3a4a',
        door: '#87CEEB'
      },
      volcanic_marsh: { 
        wall: '#FF6347', 
        floor: '#4a2a2a',  // Lighter red for visibility
        door: '#DC143C'
      },
      fire: { // Legacy name support
        wall: '#FF6347', 
        floor: '#4a2a2a',
        door: '#DC143C'
      },
      corrupted_dungeon: { 
        wall: '#9370DB', 
        floor: '#3a3a5a',  // Lighter purple for visibility
        door: '#8A2BE2'
      },
      lich_domain: { 
        wall: '#708090', 
        floor: '#3a3f46',  // Lighter grey for visibility
        door: '#778899'
      }
    };
    
    const colors = biomeColors[biome] || biomeColors.candy_forest;
    let color;
    
    switch(tile) {
      case TILE.wall:
      case '#':
        color = colors.wall;
        break;
      case TILE.floor:
      case '.':
        color = colors.floor;
        break;
      case TILE.door:
      case '+':
        color = colors.door;
        break;
      case TILE.vendor:
      case 'V':
        color = '#FFD700'; // Gold
        break;
      case TILE.shrine:
      case '▲':
        color = '#9370DB'; // Purple
        break;
      case TILE.chest:
      case '$':
        color = '#FFD700'; // Gold
        break;
      case TILE.artifact:
      case '★':
        color = '#FFD700'; // Gold
        break;
      case '~': // Water
        color = '#4682B4'; // Steel blue
        break;
      default:
        color = CANVAS_CONFIG.FOREGROUND;
    }
    
    // Cache the result
    this.colorCache.set(cacheKey, color);
    return color;
  }
  
  /**
   * Get monster color based on tier
   */
  getMonsterColor(monster) {
    const tierColors = {
      1: '#c9ffd6', // Normal - greenish white
      2: '#7effa0', // Veteran - green  
      3: '#ff6b6b'  // Elite - red
    };
    
    // Special monster colors
    if (monster.name === 'flame pup') return '#FFA500';
    if (monster.name === 'demon') return '#DC143C';
    if (monster.name === 'bone knight') return '#F0E68C';
    if (monster.name === 'wraith') return '#9370DB';
    if (monster.name === 'shadow beast') return '#4B0082';
    
    return tierColors[monster.tier || 1];
  }
  
  /**
   * Get item color based on type
   */
  getItemColor(type) {
    const itemColors = {
      potion: '#ff69b4',
      weapon: '#ffd700',
      armor: '#87ceeb',
      headgear: '#dda0dd',
      ring: '#f0e68c',
      gold: '#ffd700',
      shrine: '#9370db',
      chest: '#ffd700',
      vendor: '#ffd700',
      artifact: '#ffd700'
    };
    return itemColors[type] || CANVAS_CONFIG.FOREGROUND;
  }
  
  /**
   * Get item glyph
   */
  getItemGlyph(item) {
    // Handle different item structures
    if (item.glyph) return item.glyph;
    if (item.type && TILE[item.type]) return TILE[item.type];
    
    // Fallback glyphs
    const glyphs = {
      weapon: '/',
      armor: ']',
      headgear: '^',
      ring: '○',
      potion: '!',
      chest: '$',
      shrine: '▲',
      vendor: 'V',
      artifact: '★'
    };
    
    return glyphs[item.type] || '?';
  }
  
  /**
   * Get background color for status effects
   */
  getStatusEffectBgColor(effectType) {
    const effectColors = {
      burn: 'rgba(255, 69, 0, 0.3)',
      fire: 'rgba(255, 69, 0, 0.3)',
      freeze: 'rgba(135, 206, 235, 0.3)',
      ice: 'rgba(135, 206, 235, 0.3)',
      poison: 'rgba(50, 205, 50, 0.3)',
      shock: 'rgba(255, 255, 0, 0.3)',
      weaken: 'rgba(139, 69, 19, 0.3)',
      buff_str: 'rgba(255, 215, 0, 0.2)',
      buff_def: 'rgba(135, 206, 235, 0.2)'
    };
    
    return effectColors[effectType] || null;
  }
  
  /**
   * Draw path for auto-movement
   */
  drawPath(path, targetInfo) {
    if (!path || path.length < 2) return;
    
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'; // Semi-transparent gold
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]); // Dashed line
    
    // Draw line connecting path points
    this.ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const x = path[i].x * this.tileSize + this.tileSize / 2;
      const y = path[i].y * this.tileSize + this.tileSize / 2;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      
      // Draw a small circle at each waypoint
      if (i > 0 && i < path.length - 1) {
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.fillRect(
          path[i].x * this.tileSize + 6,
          path[i].y * this.tileSize + 6,
          4, 4
        );
      }
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Reset line dash
    
    // Highlight the target tile
    const target = path[path.length - 1];
    // Use red for attack targets, blue for movement targets
    const targetColor = targetInfo && targetInfo.isAttack ? 
      'rgba(255, 0, 0, 0.5)' : 'rgba(0, 150, 255, 0.5)';
    this.ctx.strokeStyle = targetColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      target.x * this.tileSize + 1,
      target.y * this.tileSize + 1,
      this.tileSize - 2,
      this.tileSize - 2
    );
    
    this.ctx.restore();
  }
  
  /**
   * Draw cursor if active
   */
  drawCursor(gameState) {
    // Check if cursor system is available
    if (!gameState.cursorState) return;
    
    const cursorState = gameState.cursorState;
    if (!cursorState.active) return;
    
    const { x, y, mode } = cursorState;
    
    // Choose color based on mode and validity
    let color;
    const isValid = gameState.isValidCursorPosition ? 
      gameState.isValidCursorPosition(x, y) : true;
    
    if (!isValid) {
      color = '#808080'; // Gray for invalid
    } else if (mode === 'examine') {
      color = '#FFD700'; // Gold
    } else if (mode === 'target') {
      color = '#FF0000'; // Red
    } else if (mode === 'select') {
      color = '#00FF00'; // Green
    } else {
      color = '#FFD700'; // Default gold
    }
    
    // Draw four corner brackets around the cursor position
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;
    const cornerSize = 4; // Length of corner lines
    const lineWidth = 2;
    
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    
    // Top-left corner
    this.ctx.beginPath();
    this.ctx.moveTo(pixelX, pixelY + cornerSize);
    this.ctx.lineTo(pixelX, pixelY);
    this.ctx.lineTo(pixelX + cornerSize, pixelY);
    this.ctx.stroke();
    
    // Top-right corner
    this.ctx.beginPath();
    this.ctx.moveTo(pixelX + this.tileSize - cornerSize, pixelY);
    this.ctx.lineTo(pixelX + this.tileSize, pixelY);
    this.ctx.lineTo(pixelX + this.tileSize, pixelY + cornerSize);
    this.ctx.stroke();
    
    // Bottom-left corner
    this.ctx.beginPath();
    this.ctx.moveTo(pixelX, pixelY + this.tileSize - cornerSize);
    this.ctx.lineTo(pixelX, pixelY + this.tileSize);
    this.ctx.lineTo(pixelX + cornerSize, pixelY + this.tileSize);
    this.ctx.stroke();
    
    // Bottom-right corner
    this.ctx.beginPath();
    this.ctx.moveTo(pixelX + this.tileSize - cornerSize, pixelY + this.tileSize);
    this.ctx.lineTo(pixelX + this.tileSize, pixelY + this.tileSize);
    this.ctx.lineTo(pixelX + this.tileSize, pixelY + this.tileSize - cornerSize);
    this.ctx.stroke();
    
    // Add pulsing animation using transparency
    const pulseAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 500);
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = pulseAlpha;
    
    // Draw inner highlight for visibility
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      pixelX + 2, 
      pixelY + 2, 
      this.tileSize - 4, 
      this.tileSize - 4
    );
    
    this.ctx.restore();
  }
  
  /**
   * Draw grid overlay for debugging
   */
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= this.width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.tileSize, 0);
      this.ctx.lineTo(x * this.tileSize, this.canvas.height);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.tileSize);
      this.ctx.lineTo(this.canvas.width, y * this.tileSize);
      this.ctx.stroke();
    }
  }
  
  /**
   * Force full redraw on next render
   */
  forceFullRedraw() {
    this.isFullRedraw = true;
  }
}