/**
 * Constants for Social System Integration
 * 
 * DEPRECATED: This file is maintained for backward compatibility.
 * New code should import from src/social/constants/index.js or specific modules.
 * 
 * @deprecated Use src/social/constants/index.js instead
 */

// Re-export everything from the new organized modules for backward compatibility
export * from '../constants/index.js';

// Add deprecation warning in development (check for Node.js environment first)
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[DEPRECATION] src/social/integration/constants.js is deprecated. ' +
    'Please import from src/social/constants/index.js or specific modules instead.'
  );
}