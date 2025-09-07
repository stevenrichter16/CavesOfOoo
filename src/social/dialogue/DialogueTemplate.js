/**
 * Dialogue Template System - Phase 7
 * Provides template-based dialogue generation with variable substitution
 */

/**
 * DialogueTemplate class for rendering dialogue with variables
 */
export class DialogueTemplate {
  constructor(template, options = {}) {
    if (Array.isArray(template)) {
      this.variants = template;
      this.template = null;
    } else {
      this.template = template;
      this.variants = null;
    }
    
    this.tags = options.tags || [];
  }
  
  /**
   * Render the template with given context
   * @param {Object} context - Context object with variables
   * @returns {string} Rendered dialogue
   */
  render(context) {
    // Select template variant if multiple
    let template = this.template;
    if (this.variants) {
      template = this.variants[Math.floor(Math.random() * this.variants.length)];
    }
    
    // Process conditionals
    template = this.processConditionals(template, context);
    
    // Replace variables
    template = this.replaceVariables(template, context);
    
    return template;
  }
  
  /**
   * Process conditional statements in template
   * @private
   */
  processConditionals(template, context) {
    const conditionalRegex = /\{if\s+([^}]+)\}(.*?)\{else\}(.*?)\{\/if\}/g;
    
    return template.replace(conditionalRegex, (match, condition, ifTrue, ifFalse) => {
      // Simple path evaluation (e.g., "attitude.friendly")
      const value = this.getNestedValue(context, condition);
      return value ? ifTrue : ifFalse;
    });
  }
  
  /**
   * Replace variables in template
   * @private
   */
  replaceVariables(template, context) {
    const variableRegex = /\{([^}]+)\}/g;
    
    return template.replace(variableRegex, (match, path) => {
      // Skip conditionals
      if (path.startsWith('if ') || path === 'else' || path === '/if') {
        return match;
      }
      
      // Skip emotion tags
      if (path.startsWith('emotion:')) {
        return ''; // Remove emotion tags from output
      }
      
      const value = this.getNestedValue(context, path);
      return value !== undefined ? value : match;
    });
  }
  
  /**
   * Get nested value from object using dot notation
   * @private
   */
  getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}