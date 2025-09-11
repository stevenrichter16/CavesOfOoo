/**
 * Optimized Spatial Grid for Event Indexing
 * Provides O(1) spatial queries for events and entities
 */

export class SpatialGrid {
  constructor(cellSize = 8) {
    this.cellSize = cellSize;
    this.grid = new Map(); // "gridX,gridY" -> Set of events
    this.eventLocations = new Map(); // event.id -> grid coordinates
    this.stats = {
      queries: 0,
      hits: 0,
      insertions: 0,
      deletions: 0
    };
  }
  
  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(worldX, worldY) {
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);
    return { gridX, gridY };
  }
  
  /**
   * Get grid key for coordinates
   */
  getGridKey(gridX, gridY) {
    return `${gridX},${gridY}`;
  }
  
  /**
   * Insert an event/entity into the grid
   */
  insert(event) {
    if (!event || event.cx === undefined || event.cy === undefined) {
      return false;
    }
    
    const { gridX, gridY } = this.worldToGrid(event.cx, event.cy);
    const key = this.getGridKey(gridX, gridY);
    
    // Get or create cell
    let cell = this.grid.get(key);
    if (!cell) {
      cell = new Set();
      this.grid.set(key, cell);
    }
    
    // Add to cell
    cell.add(event);
    
    // Track location for fast removal
    this.eventLocations.set(event.id || event, { gridX, gridY });
    
    this.stats.insertions++;
    return true;
  }
  
  /**
   * Remove an event/entity from the grid
   */
  remove(event) {
    if (!event) return false;
    
    const location = this.eventLocations.get(event.id || event);
    if (!location) return false;
    
    const key = this.getGridKey(location.gridX, location.gridY);
    const cell = this.grid.get(key);
    
    if (cell) {
      cell.delete(event);
      
      // Clean up empty cells
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
    
    this.eventLocations.delete(event.id || event);
    this.stats.deletions++;
    return true;
  }
  
  /**
   * Update event position
   */
  update(event, newCx, newCy) {
    const oldLocation = this.eventLocations.get(event.id || event);
    const newLocation = this.worldToGrid(newCx, newCy);
    
    // Check if actually moved cells
    if (oldLocation && 
        oldLocation.gridX === newLocation.gridX && 
        oldLocation.gridY === newLocation.gridY) {
      // Still in same cell, just update coordinates
      event.cx = newCx;
      event.cy = newCy;
      return true;
    }
    
    // Remove from old location
    if (oldLocation) {
      this.remove(event);
    }
    
    // Update coordinates
    event.cx = newCx;
    event.cy = newCy;
    
    // Insert at new location
    return this.insert(event);
  }
  
  /**
   * Query events at exact coordinates
   */
  queryPoint(cx, cy) {
    this.stats.queries++;
    
    const { gridX, gridY } = this.worldToGrid(cx, cy);
    const key = this.getGridKey(gridX, gridY);
    const cell = this.grid.get(key);
    
    if (!cell) {
      return [];
    }
    
    // Filter to exact coordinates
    const results = Array.from(cell).filter(event => 
      event.cx === cx && event.cy === cy
    );
    
    if (results.length > 0) {
      this.stats.hits++;
    }
    
    return results;
  }
  
  /**
   * Query events in a rectangular area
   */
  queryRect(minCx, minCy, maxCx, maxCy) {
    this.stats.queries++;
    
    const minGrid = this.worldToGrid(minCx, minCy);
    const maxGrid = this.worldToGrid(maxCx, maxCy);
    
    const results = [];
    const seen = new Set();
    
    // Iterate through grid cells in range
    for (let gridY = minGrid.gridY; gridY <= maxGrid.gridY; gridY++) {
      for (let gridX = minGrid.gridX; gridX <= maxGrid.gridX; gridX++) {
        const key = this.getGridKey(gridX, gridY);
        const cell = this.grid.get(key);
        
        if (cell) {
          for (const event of cell) {
            // Check if actually in query range
            if (event.cx >= minCx && event.cx <= maxCx &&
                event.cy >= minCy && event.cy <= maxCy) {
              const eventId = event.id || event;
              if (!seen.has(eventId)) {
                results.push(event);
                seen.add(eventId);
              }
            }
          }
        }
      }
    }
    
    if (results.length > 0) {
      this.stats.hits++;
    }
    
    return results;
  }
  
  /**
   * Query events within radius
   */
  queryRadius(centerCx, centerCy, radius) {
    this.stats.queries++;
    
    // Convert to rectangular bounds
    const minCx = centerCx - radius;
    const minCy = centerCy - radius;
    const maxCx = centerCx + radius;
    const maxCy = centerCy + radius;
    
    // Get candidates from rect
    const candidates = this.queryRect(minCx, minCy, maxCx, maxCy);
    
    // Filter by actual distance
    const radiusSq = radius * radius;
    const results = candidates.filter(event => {
      const dx = event.cx - centerCx;
      const dy = event.cy - centerCy;
      return (dx * dx + dy * dy) <= radiusSq;
    });
    
    return results;
  }
  
  /**
   * Get all events (for iteration)
   */
  getAllEvents() {
    const results = [];
    const seen = new Set();
    
    for (const cell of this.grid.values()) {
      for (const event of cell) {
        const eventId = event.id || event;
        if (!seen.has(eventId)) {
          results.push(event);
          seen.add(eventId);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Clear the grid
   */
  clear() {
    this.grid.clear();
    this.eventLocations.clear();
    this.stats = {
      queries: 0,
      hits: 0,
      insertions: 0,
      deletions: 0
    };
  }
  
  /**
   * Get grid statistics
   */
  getStats() {
    return {
      ...this.stats,
      cellCount: this.grid.size,
      eventCount: this.eventLocations.size,
      hitRate: this.stats.queries > 0 
        ? this.stats.hits / this.stats.queries 
        : 0,
      avgEventsPerCell: this.grid.size > 0
        ? this.eventLocations.size / this.grid.size
        : 0
    };
  }
  
  /**
   * Optimize grid cell size based on distribution
   */
  optimizeCellSize() {
    if (this.eventLocations.size === 0) return;
    
    // Calculate event density
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const cell of this.grid.values()) {
      for (const event of cell) {
        minX = Math.min(minX, event.cx);
        minY = Math.min(minY, event.cy);
        maxX = Math.max(maxX, event.cx);
        maxY = Math.max(maxY, event.cy);
      }
    }
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const area = width * height;
    const density = this.eventLocations.size / area;
    
    // Adjust cell size based on density
    // Higher density = smaller cells for better granularity
    if (density > 0.5) {
      this.cellSize = Math.max(4, this.cellSize - 1);
    } else if (density < 0.1) {
      this.cellSize = Math.min(16, this.cellSize + 1);
    }
    
    // Rebuild grid with new cell size
    const events = this.getAllEvents();
    this.clear();
    events.forEach(event => this.insert(event));
  }
  
  /**
   * Debug visualization helper
   */
  visualize() {
    const cells = [];
    
    for (const [key, cell] of this.grid.entries()) {
      const [gridX, gridY] = key.split(',').map(Number);
      cells.push({
        gridX,
        gridY,
        worldX: gridX * this.cellSize,
        worldY: gridY * this.cellSize,
        eventCount: cell.size
      });
    }
    
    return {
      cellSize: this.cellSize,
      cells,
      totalEvents: this.eventLocations.size
    };
  }
}