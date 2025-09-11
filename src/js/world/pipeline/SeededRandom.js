/**
 * SeededRandom - Deterministic random number generator
 * Provides consistent random values based on seed and coordinates
 */

/**
 * Seeded random number generator using xorshift
 */
export class SeededRandom {
  /**
   * Create a new seeded random generator
   * @param {string} seed - Base seed string
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   */
  constructor(seed, cx, cy) {
    // Handle null/undefined seed
    seed = seed || 'default';
    
    // Convert seed string to number
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Mix in coordinates
    this.seed = (hash ^ (cx * 73856093) ^ (cy * 19349663)) >>> 0;
    
    // Initialize state
    this.state = this.seed || 1;
  }
  
  /**
   * Generate next random value between 0 and 1
   * @returns {number} Random value [0, 1)
   */
  next() {
    // Xorshift algorithm
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    this.state = this.state >>> 0; // Ensure unsigned 32-bit
    
    // Convert to [0, 1) range
    return this.state / 0x100000000;
  }
  
  /**
   * Generate random integer in range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random integer
   */
  between(min, max) {
    // Handle edge case where min === max
    if (min === max) {
      return min;
    }
    return Math.floor(this.next() * (max - min)) + min;
  }
  
  /**
   * Pick random element from array
   * @param {Array} array - Array to pick from
   * @returns {*} Random element
   */
  pick(array) {
    if (!array || array.length === 0) {
      return null;
    }
    return array[this.between(0, array.length)];
  }
  
  /**
   * Random chance test
   * @param {number} probability - Probability between 0 and 1
   * @returns {boolean} True if random value is less than probability
   */
  chance(probability) {
    return this.next() < probability;
  }
  
  /**
   * Shuffle array in place
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array (same reference)
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.between(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}