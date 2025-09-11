/**
 * PipelineStep - Base class for chunk generation pipeline steps
 * Each step processes the chunk in sequence during generation
 */

/**
 * Base class for pipeline steps
 */
export class PipelineStep {
  /**
   * Create a new pipeline step
   * @param {string} name - Step name
   * @param {Object} options - Configuration options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.enabled = options.enabled !== false;
    this.priority = options.priority || 0;
    this.critical = options.critical || false;
    
    // Execution tracking
    this.executionCount = 0;
    this.lastExecutionTime = 0;
  }
  
  /**
   * Execute the step with pre/post processing
   * @param {Object} context - Pipeline context
   * @returns {Promise<Object>} Updated context
   */
  async execute(context) {
    // Skip if disabled
    if (!this.enabled) {
      return context;
    }
    
    const startTime = Date.now();
    
    try {
      // Validation
      if (this.validate) {
        this.validate(context);
      }
      
      // Pre-processing hook
      if (this.preProcess) {
        await this.preProcess(context);
      }
      
      // Main processing
      await this.process(context);
      
      // Post-processing hook
      if (this.postProcess) {
        await this.postProcess(context);
      }
      
      // Update tracking
      this.executionCount++;
      this.lastExecutionTime = Date.now() - startTime;
      
      return context;
      
    } catch (error) {
      // Add step information to error
      error.step = this.name;
      
      // Try error recovery if handler exists
      if (this.handleError) {
        await this.handleError(error, context);
        return context;
      }
      
      // Re-throw with step info
      throw error;
    }
  }
  
  /**
   * Process the context - must be overridden by subclasses
   * @param {Object} context - Pipeline context
   * @returns {Promise<void>}
   */
  async process(context) {
    throw new Error(`Step ${this.name} must implement process method`);
  }
  
  /**
   * Get required context fields
   * @returns {Array<string>} Required field names
   */
  get requires() {
    return [];
  }
  
  /**
   * Get provided context fields
   * @returns {Array<string>} Provided field names
   */
  get provides() {
    return [];
  }
}