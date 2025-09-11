/**
 * Dynamic Event System for Adventure Time world
 * Manages random and triggered events that affect chunks
 */

import { EventTypes, EventPriority, EventDuration } from './constants.js';
import { BiomeEventGenerator } from './BiomeEventGenerator.js';

/**
 * Main event system coordinator
 */
export class DynamicEventSystem {
  constructor(chunkSystem, eventBus) {
    this.chunkSystem = chunkSystem;
    this.eventBus = eventBus;
    this.activeEvents = [];
    this.eventHistory = [];
    this.currentTick = 0;
    this.eventIdCounter = 0;
    this.maxHistorySize = 100; // Limit history to prevent memory leak
    this.maxActiveEvents = 500; // Limit active events
    this.maxSpatialIndexSize = 1000; // Limit spatial index entries
    
    // Spatial index for efficient location queries
    this.spatialIndex = new Map(); // "cx,cy" -> Set of events
    
    // Event scheduler for time-based events
    this.scheduler = new EventScheduler();
    
    // Trigger manager for action-based events  
    this.triggerManager = new EventTriggerManager();
    
    // Store bound handler for cleanup
    this.boundChunkEvictionHandler = this.handleChunkEviction.bind(this);
    
    // Listen for cache evictions to handle cleanup
    if (chunkSystem && chunkSystem.cache) {
      chunkSystem.cache.on('evicted', this.boundChunkEvictionHandler);
    }
  }
  
  /**
   * Handle chunk eviction from cache
   */
  handleChunkEviction(data) {
    const { cx, cy } = data;
    const key = `${cx},${cy}`;
    const events = this.spatialIndex.get(key);
    
    if (events) {
      // Create a copy to avoid race conditions during iteration
      const eventsCopy = Array.from(events);
      
      // Mark events as needing reapplication when chunk reloads
      eventsCopy.forEach(event => {
        if (event && typeof event === 'object') {
          event.needsReapplication = true;
        }
      });
    }
  }
  
  /**
   * Reapply events to a reloaded chunk
   */
  async reapplyEventsToChunk(chunk) {
    if (!chunk) return;
    
    const cx = chunk.cx;
    const cy = chunk.cy;
    const key = `${cx},${cy}`;
    const events = this.spatialIndex.get(key);
    
    if (!events || events.size === 0) return;
    
    // Sort events by priority for correct application order
    const sortedEvents = Array.from(events).sort((a, b) => 
      (a.priority || 0) - (b.priority || 0)
    );
    
    // Reapply each event that needs it
    const failedEvents = [];
    for (const event of sortedEvents) {
      if (event.needsReapplication && event.active) {
        try {
          await this.reapplyEventToChunk(event, chunk);
        } catch (error) {
          console.error(`Failed to reapply event ${event.id}:`, error);
          failedEvents.push(event.id);
        }
      }
    }
    
    if (failedEvents.length > 0) {
      console.warn(`Failed to reapply ${failedEvents.length} events to chunk (${cx}, ${cy}): ${failedEvents.join(', ')}`);
    }
  }
  
  /**
   * Generate a biome-specific event
   */
  async generateBiomeEvent(biome, cx, cy) {
    // Validate chunk exists or can be generated
    if (this.chunkSystem) {
      const chunk = this.chunkSystem.cache?.get(cx, cy);
      if (!chunk) {
        // Optionally try to generate the chunk first
        // For now, just log warning
        console.warn(`Generating event for non-cached chunk at (${cx}, ${cy})`);
      }
    }
    
    const generator = new BiomeEventGenerator(biome);
    const eventType = generator.generateEventType();
    
    const event = {
      id: `event_${++this.eventIdCounter}`,
      type: eventType,
      biome: biome,
      cx: cx,
      cy: cy,
      startTick: this.currentTick,
      duration: this.getEventDuration(eventType),
      priority: EventPriority.MEDIUM,
      effects: generator.getEventEffects(eventType),
      active: false  // Will be set to true when started
    };
    
    return event;
  }
  
  /**
   * Cleanup spatial index of empty entries
   */
  _cleanupSpatialIndex() {
    const keysToDelete = [];
    for (const [key, events] of this.spatialIndex.entries()) {
      if (events.size === 0) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.spatialIndex.delete(key));
    
    // If still too large, remove oldest entries more aggressively
    while (this.spatialIndex.size > this.maxSpatialIndexSize) {
      const keysArray = Array.from(this.spatialIndex.keys());
      // Remove 20% or at least 1 entry
      const toRemoveCount = Math.max(1, Math.ceil(this.spatialIndex.size * 0.2));
      const toRemove = keysArray.slice(0, toRemoveCount);
      toRemove.forEach(key => this.spatialIndex.delete(key));
    }
  }
  
  /**
   * Clean up temporary modifications from an expired event
   */
  _cleanupEventModifications(event) {
    if (!this.chunkSystem || !event.id) return;
    
    // Try to get the chunk from cache
    const chunk = this.chunkSystem.cache?.get(event.cx, event.cy);
    if (!chunk || !chunk.temporaryModifications) return;
    
    // Check if this event has temporary modifications
    const eventMods = chunk.temporaryModifications[event.id];
    if (!eventMods) return;
    
    // Restore original tiles if they exist
    if (eventMods.originalTiles) {
      for (const [key, originalTile] of Object.entries(eventMods.originalTiles)) {
        const [x, y] = key.split(',').map(Number);
        if (chunk.setTile) {
          chunk.setTile(x, y, originalTile);
        }
      }
    }
    
    // Clean up the modifications entry
    delete chunk.temporaryModifications[event.id];
    
    // If temporaryModifications is now empty, clean it up
    if (Object.keys(chunk.temporaryModifications).length === 0) {
      chunk.temporaryModifications = {};
    }
  }
  
  /**
   * Start an event
   */
  startEvent(event) {
    // Check if we're at the limit
    if (this.activeEvents.length >= this.maxActiveEvents) {
      console.warn(`Maximum active events reached (${this.maxActiveEvents}), dropping event`);
      return false;
    }
    
    // Check for conflicts
    if (this.hasConflict(event)) {
      return false;
    }
    
    // Mark as active
    event.active = true;
    event.startTick = event.startTick || this.currentTick;
    
    // Add to active events
    this.activeEvents.push(event);
    
    // Add to spatial index if location is specified
    if (event.cx !== undefined && event.cy !== undefined) {
      const key = `${event.cx},${event.cy}`;
      if (!this.spatialIndex.has(key)) {
        this.spatialIndex.set(key, new Set());
      }
      this.spatialIndex.get(key).add(event);
    }
    
    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('WorldEventStarted', { event });
    }
    
    // Handle chain events
    if (event.chainEvents) {
      this.startChainEvents(event.chainEvents, event);
    }
    
    return true;
  }
  
  /**
   * Start chain events
   */
  startChainEvents(chainEventTypes, parentEvent) {
    const chainedEvents = [];
    
    for (const eventType of chainEventTypes) {
      const chainEvent = {
        id: `event_${++this.eventIdCounter}`,
        type: eventType,
        startTick: this.currentTick,
        duration: this.getEventDuration(eventType),
        priority: EventPriority.MEDIUM,
        // Inherit location from parent if available
        cx: parentEvent?.cx,
        cy: parentEvent?.cy
      };
      
      this.activeEvents.push(chainEvent);
      chainedEvents.push(chainEvent);
      
      // Add to spatial index if location is specified
      if (chainEvent.cx !== undefined && chainEvent.cy !== undefined) {
        const key = `${chainEvent.cx},${chainEvent.cy}`;
        if (!this.spatialIndex.has(key)) {
          this.spatialIndex.set(key, new Set());
        }
        this.spatialIndex.get(key).add(chainEvent);
      }
    }
    
    return chainedEvents;
  }
  
  /**
   * Check if event has conflicts
   */
  hasConflict(event) {
    if (!event.conflicts || event.cx === undefined || event.cy === undefined) {
      return false;
    }
    
    const eventsAtLocation = this.getActiveEventsAt(event.cx, event.cy);
    
    for (const activeEvent of eventsAtLocation) {
      // Check both directions - if new event conflicts with existing OR existing conflicts with new
      if (event.conflicts.includes(activeEvent.type)) {
        return true;
      }
      if (activeEvent.conflicts && activeEvent.conflicts.includes(event.type)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Advance time by one tick
   */
  tick(tickNumber) {
    this.currentTick = tickNumber;
    
    // Check for expired events
    const expiredEvents = [];
    
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const event = this.activeEvents[i];
      
      if (event.duration !== undefined && event.duration !== EventDuration.ETERNAL) {
        const elapsed = this.currentTick - event.startTick;
        
        if (elapsed >= event.duration || event.duration === 0) {
          expiredEvents.push(event);
          this.activeEvents.splice(i, 1);
          
          // Remove from spatial index
          if (event.cx !== undefined && event.cy !== undefined) {
            const key = `${event.cx},${event.cy}`;
            const events = this.spatialIndex.get(key);
            if (events) {
              events.delete(event);
              if (events.size === 0) {
                this.spatialIndex.delete(key);
              }
            }
          }
        }
      }
    }
    
    // Move expired events to history with pruning
    this.eventHistory.push(...expiredEvents);
    
    // Prune history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      // Keep only the most recent events
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
    
    // Periodic spatial index cleanup
    if (this.currentTick % 100 === 0) {
      this._cleanupSpatialIndex();
    }
    
    // Clean up temporary modifications and emit expiration events
    for (const event of expiredEvents) {
      // Clean up temporary modifications from affected chunks
      if (event.cx !== undefined && event.cy !== undefined) {
        this._cleanupEventModifications(event);
      }
      
      if (this.eventBus) {
        this.eventBus.emit('WorldEventEnded', { event });
      }
    }
  }
  
  /**
   * Get active events at a location
   */
  getActiveEventsAt(cx, cy) {
    // First check spatial index
    const key = `${cx},${cy}`;
    const indexedEvents = this.spatialIndex.get(key);
    
    if (indexedEvents) {
      // Sort by priority
      return Array.from(indexedEvents).sort((a, b) => 
        (b.priority || 0) - (a.priority || 0)
      );
    }
    
    // Fallback to filtering all events
    return this.activeEvents
      .filter(e => e.cx === cx && e.cy === cy)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Reapply event effects to a reloaded chunk
   */
  async reapplyEventToChunk(event, chunk) {
    try {
      // Apply the event
      await this.applyEventToChunk(event, chunk);
    } catch (error) {
      console.error(`Failed to reapply event ${event.id} to chunk (${chunk.cx}, ${chunk.cy}):`, error);
      // Still clear the flag to prevent infinite retries
    } finally {
      // Always clear the reapplication flag, even on error
      event.needsReapplication = false;
    }
  }
  
  /**
   * Apply event effects to a chunk
   */
  async applyEventToChunk(event, chunk) {
    if (!event || !chunk) {
      console.warn('Invalid event or chunk in applyEventToChunk');
      return;
    }
    
    // Initialize all required data structures first
    if (!chunk.items) chunk.items = [];
    if (!chunk.monsters) chunk.monsters = [];
    if (!chunk.npcs) chunk.npcs = [];
    if (!chunk.temporaryModifications) chunk.temporaryModifications = {};
    if (!chunk.questMarkers) chunk.questMarkers = {};
    if (!chunk.metadata) chunk.metadata = {};
    
    if (!event.effects) return;
    
    const effects = event.effects;
    
    // Use constants for dimensions
    const CHUNK_WIDTH = 24;
    const CHUNK_HEIGHT = 22;
    
    // Spawn items
    if (effects.spawnItems) {
      // Get passable tiles for item placement
      const emptyTiles = chunk.findEmptyTiles ? chunk.findEmptyTiles() : [];
      
      if (emptyTiles.length === 0) {
        // No passable tiles, can't place items
        console.warn('No passable tiles available for item placement');
        return;
      }
      
      for (const itemType of effects.spawnItems) {
        // Pick random passable tile
        const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        
        chunk.items.push({
          type: itemType,
          x: tile.x,
          y: tile.y
        });
      }
    }
    
    // Modify tiles
    if (effects.tileChanges) {
      for (let y = 0; y < chunk.map.length; y++) {
        for (let x = 0; x < chunk.map[y].length; x++) {
          const currentTile = chunk.map[y][x];
          if (effects.tileChanges[currentTile]) {
            chunk.setTile(x, y, effects.tileChanges[currentTile]);
          }
        }
      }
    }
    
    // Temporary tile modifications
    if (effects.temporaryTiles) {
      chunk.temporaryModifications[event.id] = {
        originalTiles: {},
        duration: event.duration
      };
      
      for (let y = 0; y < chunk.map.length; y++) {
        for (let x = 0; x < chunk.map[y].length; x++) {
          const currentTile = chunk.map[y][x];
          if (effects.temporaryTiles[currentTile]) {
            // Store original
            const key = `${x},${y}`;
            chunk.temporaryModifications[event.id].originalTiles[key] = currentTile;
            
            // Apply temporary change
            chunk.setTile(x, y, effects.temporaryTiles[currentTile]);
          }
        }
      }
    }
    
    // Spawn NPCs
    if (effects.spawnNPCs) {
      for (const npcSpec of effects.spawnNPCs) {
        for (let i = 0; i < npcSpec.count; i++) {
          const x = Math.floor(Math.random() * 24);
          const y = Math.floor(Math.random() * 22);
          
          chunk.npcs.push({
            type: npcSpec.type,
            x: x,
            y: y,
            eventId: event.id
          });
        }
      }
    }
  }
  
  /**
   * Get event duration based on type
   */
  getEventDuration(eventType) {
    const durations = {
      [EventTypes.CANDY_RAIN]: EventDuration.SHORT,
      [EventTypes.ICE_STORM]: EventDuration.MEDIUM,
      [EventTypes.PRINCESS_PARADE]: EventDuration.SHORT,
      [EventTypes.ETERNAL_FLAME]: EventDuration.ETERNAL,
      [EventTypes.ANCIENT_CURSE]: EventDuration.LONG
    };
    
    return durations[eventType] || EventDuration.MEDIUM;
  }
  
  /**
   * Get scheduler
   */
  getScheduler() {
    return this.scheduler;
  }
  
  /**
   * Get trigger manager
   */
  getTriggerManager() {
    return this.triggerManager;
  }
  
  /**
   * Serialize for saving
   */
  serialize() {
    return {
      version: '1.0',
      activeEvents: this.activeEvents,
      eventHistory: this.eventHistory.slice(-100), // Keep last 100
      currentTick: this.currentTick
    };
  }
  
  /**
   * Deserialize from save data
   */
  deserialize(data) {
    this.activeEvents = data.activeEvents || [];
    this.eventHistory = data.eventHistory || [];
    this.currentTick = data.currentTick || 0;
    
    // Rebuild spatial index
    this.spatialIndex.clear();
    for (const event of this.activeEvents) {
      if (event.cx !== undefined && event.cy !== undefined) {
        const key = `${event.cx},${event.cy}`;
        if (!this.spatialIndex.has(key)) {
          this.spatialIndex.set(key, new Set());
        }
        this.spatialIndex.get(key).add(event);
      }
    }
  }
  
  /**
   * Destroy the event system and clean up resources
   */
  destroy() {
    // Remove event listener
    if (this.chunkSystem && this.chunkSystem.cache) {
      this.chunkSystem.cache.off('evicted', this.boundChunkEvictionHandler);
    }
    
    // Remove all event bus listeners if they exist
    if (this.eventBus && typeof this.eventBus.removeAllListeners === 'function') {
      // Remove listeners registered by this system
      this.eventBus.removeAllListeners('WorldEventStarted');
      this.eventBus.removeAllListeners('WorldEventEnded');
    }
    
    // Clear all data structures
    this.activeEvents = [];
    this.eventHistory = [];
    this.spatialIndex.clear();
    
    // Clear scheduler and trigger manager if they have cleanup
    if (this.scheduler) {
      if (this.scheduler.clear) {
        this.scheduler.clear();
      }
      this.scheduler = null;
    }
    if (this.triggerManager) {
      if (this.triggerManager.clear) {
        this.triggerManager.clear();
      }
      this.triggerManager = null;
    }
    
    // Clear references to prevent memory leaks
    this.chunkSystem = null;
    this.eventBus = null;
    this.boundChunkEvictionHandler = null;
  }
}

/**
 * Event scheduler for time-based events
 */
class EventScheduler {
  constructor() {
    this.scheduledEvents = [];
    this.currentTime = { hour: 0, minute: 0 };
  }
  
  scheduleEvent(eventSpec) {
    this.scheduledEvents.push(eventSpec);
  }
  
  setTime(hour, minute) {
    this.currentTime = { hour, minute };
  }
  
  getTriggeredEvents() {
    return this.scheduledEvents.filter(event => 
      event.triggerTime.hour === this.currentTime.hour &&
      event.triggerTime.minute === this.currentTime.minute
    );
  }
  
  clear() {
    this.scheduledEvents = [];
    this.currentTime = { hour: 0, minute: 0 };
  }
}

/**
 * Event trigger manager for action-based events
 */
class EventTriggerManager {
  constructor() {
    this.triggers = new Map();
  }
  
  registerTrigger(trigger) {
    if (!this.triggers.has(trigger.action)) {
      this.triggers.set(trigger.action, []);
    }
    this.triggers.get(trigger.action).push(trigger);
  }
  
  checkTrigger(action) {
    const triggers = this.triggers.get(action) || [];
    
    for (const trigger of triggers) {
      if (Math.random() < trigger.probability) {
        return {
          type: trigger.eventType,
          triggeredBy: action
        };
      }
    }
    
    return null;
  }
  
  clear() {
    this.triggers.clear();
  }
}