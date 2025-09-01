import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'src/js/renderer/**',
        'src/js/ui/**',
        'test-*.html'
      ],
      include: [
        'src/js/engine/**/*.js'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 85,
        statements: 85
      }
    },
    include: ['tests/**/*.{test,spec}.js'],
    exclude: ['node_modules', 'dist']
  },
  resolve: {
    alias: {
      '@': '/src',
      '@engine': '/src/js/engine',
      '@systems': '/src/js/systems'
    }
  }
});