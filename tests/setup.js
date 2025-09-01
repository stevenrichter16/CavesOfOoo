// Global test setup
import { beforeEach, afterEach } from 'vitest';

// Reset any global state between tests
beforeEach(() => {
  // Clear console for cleaner test output
  console.log = () => {};
  console.info = () => {};
  // Keep console.error and console.warn for debugging
});

afterEach(() => {
  // Restore console methods if needed
});

// Mock DOM elements that might be accessed
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {}
    }),
    width: 800,
    height: 600
  })
};