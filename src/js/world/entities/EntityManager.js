/**
 * Entity Manager
 * Manages all entities (NPCs, mobs, items) across chunks
 */

export class EntityManager {
  constructor(chunkSystem, eventBus) {
    this.chunkSystem = chunkSystem;
    this.eventBus = eventBus;
    
    // Entity storage
    this.entities = new Map(); // id -> entity
    this.chunkEntities = new Map(); // "cx,cy" -> Set of entity IDs
    this.entityIdCounter = 0;
    
    // Behavior systems
    this.behaviors = new Map();
    this.registerDefaultBehaviors();
  }
  
  /**
   * Create a new entity
   */
  createEntity(config) {
    const id = `entity_${++this.entityIdCounter}`;
    
    const entity = {
      id,
      type: config.type || 'generic',
      name: config.name || 'Unknown',
      x: config.x || 0,
      y: config.y || 0,
      health: config.health || 100,
      maxHealth: config.health || 100,
      alive: true,
      behavior: config.behavior || null,
      metadata: config.metadata || {},
      ...config
    };
    
    // Calculate chunk coordinates
    entity.chunkX = Math.floor(entity.x / 24);
    entity.chunkY = Math.floor(entity.y / 22);
    
    // Store entity
    this.entities.set(id, entity);
    
    // Add to chunk index
    this.addToChunkIndex(entity);
    
    // Emit creation event
    if (this.eventBus) {
      this.eventBus.emit('EntityCreated', { entity });
    }
    
    return entity;
  }
  
  /**
   * Move an entity to a new position
   */
  moveEntity(entityId, newX, newY) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    const oldChunkX = entity.chunkX;
    const oldChunkY = entity.chunkY;
    
    // Update position
    entity.x = newX;
    entity.y = newY;
    
    // Calculate new chunk
    entity.chunkX = Math.floor(newX / 24);
    entity.chunkY = Math.floor(newY / 22);
    
    // Check if chunk changed
    if (oldChunkX !== entity.chunkX || oldChunkY !== entity.chunkY) {
      // Remove from old chunk
      this.removeFromChunkIndex(entity, oldChunkX, oldChunkY);
      
      // Add to new chunk
      this.addToChunkIndex(entity);
      
      // Emit chunk transition event
      if (this.eventBus) {
        this.eventBus.emit('EntityChangedChunk', {
          entity,
          fromChunk: { x: oldChunkX, y: oldChunkY },
          toChunk: { x: entity.chunkX, y: entity.chunkY }
        });
      }
    }
    
    return true;
  }
  
  /**
   * Damage an entity
   */
  damageEntity(entityId, damage) {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.alive) return;
    
    entity.health = Math.max(0, entity.health - damage);
    
    if (entity.health === 0) {
      entity.alive = false;
      
      // Emit death event
      if (this.eventBus) {
        this.eventBus.emit('EntityDied', { entity });
      }
    }
    
    return entity.health;
  }
  
  /**
   * Get all entities in a specific chunk
   */
  getEntitiesInChunk(cx, cy) {
    const key = `${cx},${cy}`;
    const entityIds = this.chunkEntities.get(key);
    
    if (!entityIds) return [];
    
    const entities = [];
    for (const id of entityIds) {
      const entity = this.entities.get(id);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }
  
  /**
   * Update entity behaviors
   */
  updateBehaviors() {
    for (const entity of this.entities.values()) {
      if (entity.alive && entity.behavior) {
        const behaviorFunc = this.behaviors.get(entity.behavior);
        if (behaviorFunc) {
          behaviorFunc(entity, this);
        }
      }
    }
  }
  
  /**
   * Register a behavior function
   */
  registerBehavior(name, func) {
    this.behaviors.set(name, func);
  }
  
  /**
   * Register default behaviors
   */
  registerDefaultBehaviors() {
    // Wander behavior
    this.registerBehavior('wander', (entity, manager) => {
      const dx = (Math.random() - 0.5) * 2;
      const dy = (Math.random() - 0.5) * 2;
      
      manager.moveEntity(entity.id, 
        entity.x + dx,
        entity.y + dy
      );
    });
    
    // Follow behavior
    this.registerBehavior('follow', (entity, manager) => {
      if (entity.target) {
        const target = manager.entities.get(entity.target);
        if (target) {
          const dx = Math.sign(target.x - entity.x);
          const dy = Math.sign(target.y - entity.y);
          
          manager.moveEntity(entity.id,
            entity.x + dx,
            entity.y + dy
          );
        }
      }
    });
    
    // Patrol behavior
    this.registerBehavior('patrol', (entity, manager) => {
      if (!entity.patrolIndex) entity.patrolIndex = 0;
      if (!entity.patrolPoints) return;
      
      const target = entity.patrolPoints[entity.patrolIndex];
      const dx = target.x - entity.x;
      const dy = target.y - entity.y;
      
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        // Reached patrol point, move to next
        entity.patrolIndex = (entity.patrolIndex + 1) % entity.patrolPoints.length;
      } else {
        // Move toward patrol point
        manager.moveEntity(entity.id,
          entity.x + Math.sign(dx),
          entity.y + Math.sign(dy)
        );
      }
    });
  }
  
  /**
   * Add entity to chunk index
   * @private
   */
  addToChunkIndex(entity) {
    const key = `${entity.chunkX},${entity.chunkY}`;
    
    if (!this.chunkEntities.has(key)) {
      this.chunkEntities.set(key, new Set());
    }
    
    this.chunkEntities.get(key).add(entity.id);
  }
  
  /**
   * Remove entity from chunk index
   * @private
   */
  removeFromChunkIndex(entity, cx, cy) {
    const key = `${cx},${cy}`;
    const entities = this.chunkEntities.get(key);
    
    if (entities) {
      entities.delete(entity.id);
      
      if (entities.size === 0) {
        this.chunkEntities.delete(key);
      }
    }
  }
  
  /**
   * Get entity by ID
   */
  getEntity(id) {
    return this.entities.get(id);
  }
  
  /**
   * Remove an entity
   */
  removeEntity(id) {
    const entity = this.entities.get(id);
    if (!entity) return false;
    
    // Remove from chunk index
    this.removeFromChunkIndex(entity, entity.chunkX, entity.chunkY);
    
    // Remove from entities
    this.entities.delete(id);
    
    // Emit removal event
    if (this.eventBus) {
      this.eventBus.emit('EntityRemoved', { entity });
    }
    
    return true;
  }
  
  /**
   * Get all entities
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }
  
  /**
   * Get entities within radius of a point
   */
  getEntitiesInRadius(x, y, radius) {
    const entities = [];
    
    for (const entity of this.entities.values()) {
      const dx = entity.x - x;
      const dy = entity.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        entities.push(entity);
      }
    }
    
    return entities;
  }
  
  /**
   * Clear all entities
   */
  clear() {
    this.entities.clear();
    this.chunkEntities.clear();
    this.entityIdCounter = 0;
  }
}