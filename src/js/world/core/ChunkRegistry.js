/**
 * ChunkRegistry - Template registration and matching system
 * Manages chunk templates and finds appropriate templates for coordinates
 * Uses sorted insertion for O(log n) registration instead of O(n log n) sorting
 */

/**
 * Registry for managing chunk templates
 */
export class ChunkRegistry {
  constructor() {
    this.templates = new Map();
    this.templateList = []; // Maintain ordered list for priority
  }
  
  /**
   * Get the number of registered templates
   */
  get size() {
    return this.templates.size;
  }
  
  /**
   * Find insertion position for sorted insert
   * @private
   */
  _findInsertPosition(priority) {
    let left = 0;
    let right = this.templateList.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midPriority = this.templateList[mid].priority || 0;
      
      if (midPriority > priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return left;
  }
  
  /**
   * Register a chunk template
   * @param {Object} template - The template to register
   * @throws {Error} If template doesn't have required fields
   */
  register(template) {
    // Validate required fields
    if (!template.id) {
      throw new Error('Template must have an id');
    }
    
    // Validate template has a way to generate chunks
    if (!template.generate && !template.layout && !template.matches) {
      throw new Error('Template must have a generate method or layout property');
    }
    
    // Remove old version if exists
    if (this.templates.has(template.id)) {
      const oldTemplate = this.templates.get(template.id);
      const oldIndex = this.templateList.indexOf(oldTemplate);
      if (oldIndex !== -1) {
        this.templateList.splice(oldIndex, 1);
      }
    }
    
    // Add template with default priority if not specified
    if (template.priority === undefined) {
      template.priority = 0;
    }
    
    // Store in map
    this.templates.set(template.id, template);
    
    // Insert in sorted position (higher priority first)
    const insertPos = this._findInsertPosition(template.priority);
    this.templateList.splice(insertPos, 0, template);
  }
  
  /**
   * Get a template by ID
   * @param {string} id - Template ID
   * @returns {Object|null} The template or null if not found
   */
  getTemplate(id) {
    return this.templates.get(id) || null;
  }
  
  /**
   * Find a template that matches the given coordinates
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @param {Object} context - Optional context for condition evaluation
   * @returns {Object|null} The matching template or null
   */
  findTemplate(cx, cy, context = {}) {
    // Check templates in priority order
    for (const template of this.templateList) {
      // Check if template has a matches method
      if (template.matches) {
        if (template.matches(cx, cy, context)) {
          return template;
        }
      }
      // Fallback to checking coordinates and conditions
      else {
        // Check fixed coordinates
        if (template.coordinates && template.coordinates.length > 0) {
          const match = template.coordinates.some(c => c.x === cx && c.y === cy);
          if (match) {
            return template;
          }
        }
        
        // Check condition function
        if (template.condition) {
          if (template.condition(cx, cy, context)) {
            return template;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get all registered templates
   * @returns {Array} Array of all templates in priority order
   */
  getAllTemplates() {
    return [...this.templateList];
  }
  
  /**
   * Unregister a template
   * @param {string} id - Template ID to remove
   * @returns {boolean} True if template was removed
   */
  unregister(id) {
    if (!this.templates.has(id)) {
      return false;
    }
    
    const template = this.templates.get(id);
    this.templates.delete(id);
    
    const index = this.templateList.indexOf(template);
    if (index !== -1) {
      this.templateList.splice(index, 1);
    }
    
    return true;
  }
  
  /**
   * Clear all templates from the registry
   */
  clear() {
    this.templates.clear();
    this.templateList = [];
  }
  
  /**
   * Register a template (alias for compatibility)
   * @param {string} name - Template name/ID
   * @param {Object} template - The template object
   */
  registerTemplate(name, template) {
    // Ensure template has an ID
    if (!template.id) {
      template.id = name;
    }
    return this.register(template);
  }
}