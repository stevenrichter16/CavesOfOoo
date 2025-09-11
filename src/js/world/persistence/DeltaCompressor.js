/**
 * Delta Compressor - Efficiently compress chunk modifications
 */

export class DeltaCompressor {
  constructor() {
    this.compressionVersion = '1.0';
  }
  
  /**
   * Compress modifications
   */
  compress(modifications) {
    const compressed = {
      version: this.compressionVersion,
      tiles: {},
      runs: [],
      entities: modifications.entities,
      items: modifications.items,
      structures: modifications.structures
    };
    
    // Find tile runs (consecutive tiles with same change)
    const tileRuns = this.findTileRuns(modifications.tiles);
    
    if (tileRuns.length > 0) {
      compressed.runs = tileRuns;
      
      // Only store non-run tiles
      Object.keys(modifications.tiles).forEach(key => {
        if (!this.isInRun(key, tileRuns)) {
          compressed.tiles[key] = modifications.tiles[key];
        }
      });
    } else {
      compressed.tiles = modifications.tiles;
    }
    
    return compressed;
  }
  
  /**
   * Decompress modifications
   */
  decompress(compressed) {
    const decompressed = {
      tiles: {},
      entities: compressed.entities || { added: [], removed: [], modified: [] },
      items: compressed.items || { added: [], pickedUp: [], modified: [] },
      structures: compressed.structures || []
    };
    
    // Restore individual tiles
    if (compressed.tiles) {
      Object.keys(compressed.tiles).forEach(key => {
        decompressed.tiles[key] = compressed.tiles[key];
      });
    }
    
    // Restore tile runs
    if (compressed.runs) {
      compressed.runs.forEach(run => {
        this.expandRun(run, decompressed.tiles);
      });
    }
    
    return decompressed;
  }
  
  /**
   * Find runs of consecutive tile changes
   */
  findTileRuns(tiles) {
    const runs = [];
    const processed = new Set();
    
    Object.keys(tiles).forEach(key => {
      if (processed.has(key)) return;
      
      const [x, y] = key.split(',').map(Number);
      const tile = tiles[key];
      
      // Try to find horizontal run
      let runLength = 1;
      let endX = x;
      
      while (tiles[`${endX + 1},${y}`]) {
        const nextTile = tiles[`${endX + 1},${y}`];
        if (nextTile.original === tile.original && nextTile.current === tile.current) {
          endX++;
          runLength++;
          processed.add(`${endX},${y}`);
        } else {
          break;
        }
      }
      
      // Only create run if it's worth it (3+ tiles)
      if (runLength >= 3) {
        runs.push({
          start: [x, y],
          end: [endX, y],
          original: tile.original,
          current: tile.current
        });
        processed.add(key);
      }
    });
    
    return runs;
  }
  
  /**
   * Check if a tile is part of a run
   */
  isInRun(key, runs) {
    const [x, y] = key.split(',').map(Number);
    
    return runs.some(run => {
      return y === run.start[1] && 
             x >= run.start[0] && 
             x <= run.end[0];
    });
  }
  
  /**
   * Expand a run back into individual tiles
   */
  expandRun(run, tiles) {
    const [startX, y] = run.start;
    const [endX] = run.end;
    
    for (let x = startX; x <= endX; x++) {
      tiles[`${x},${y}`] = {
        original: run.original,
        current: run.current
      };
    }
  }
}