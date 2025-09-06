import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ErrorMetrics,
  errorMetrics,
  getPipelineHealth
} from '../../src/js/movement/pipelineAdapter.js';

describe('Error Metrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = new ErrorMetrics();
  });

  describe('ErrorMetrics class', () => {
    it('should initialize with empty errors array', () => {
      expect(metrics.errors).toEqual([]);
      expect(metrics.maxErrors).toBe(100);
    });

    it('should record errors with context', () => {
      const error = new Error('Test error');
      const context = {
        state: {
          player: { x: 5, y: 10 },
          cx: 0,
          cy: 1
        },
        action: { type: 'move', dx: 1, dy: 0 }
      };

      metrics.record(error, context);

      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0]).toMatchObject({
        message: 'Test error',
        state: {
          playerPos: { x: 5, y: 10 },
          chunkPos: { x: 0, y: 1 }
        },
        action: { type: 'move', dx: 1, dy: 0 }
      });
      expect(metrics.errors[0].timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('should handle missing context gracefully', () => {
      const error = new Error('Test error');
      
      metrics.record(error, null);
      
      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0].state).toBeNull();
      expect(metrics.errors[0].action).toBeUndefined();
    });

    it('should limit stored errors to maxErrors', () => {
      metrics.maxErrors = 3;
      
      for (let i = 0; i < 5; i++) {
        metrics.record(new Error(`Error ${i}`), null);
      }
      
      expect(metrics.errors).toHaveLength(3);
      expect(metrics.errors[0].message).toBe('Error 2');
      expect(metrics.errors[1].message).toBe('Error 3');
      expect(metrics.errors[2].message).toBe('Error 4');
    });

    it('should get recent errors', () => {
      for (let i = 0; i < 20; i++) {
        metrics.record(new Error(`Error ${i}`), null);
      }
      
      const recent = metrics.getRecentErrors(5);
      
      expect(recent).toHaveLength(5);
      expect(recent[0].message).toBe('Error 15');
      expect(recent[4].message).toBe('Error 19');
    });

    it('should calculate error rate', () => {
      const now = Date.now();
      
      // Add some recent errors
      for (let i = 0; i < 5; i++) {
        metrics.errors.push({
          timestamp: now - i * 1000, // Last 5 seconds
          message: `Error ${i}`
        });
      }
      
      // Add some old errors
      for (let i = 0; i < 3; i++) {
        metrics.errors.push({
          timestamp: now - 120000, // 2 minutes ago
          message: `Old error ${i}`
        });
      }
      
      const rate = metrics.getErrorRate(10000); // 10 second window
      
      expect(rate.count).toBe(5);
      expect(rate.rate).toBe(0.5); // 5 errors / 10 seconds
      expect(rate.window).toBe(10000);
    });

    it('should clear all errors', () => {
      metrics.record(new Error('Test'), null);
      metrics.record(new Error('Test2'), null);
      
      expect(metrics.errors).toHaveLength(2);
      
      metrics.clear();
      
      expect(metrics.errors).toEqual([]);
    });
  });

  describe('getPipelineHealth', () => {
    it('should return comprehensive health status', () => {
      // Mock environment
      process.env.USE_NEW_MOVEMENT = 'true';
      
      const health = getPipelineHealth();
      
      expect(health).toHaveProperty('enabled');
      expect(health).toHaveProperty('performance');
      expect(health).toHaveProperty('errors');
      expect(health).toHaveProperty('status');
      
      expect(health.performance).toHaveProperty('averageMs');
      expect(health.performance).toHaveProperty('sampleSize');
      expect(health.performance).toHaveProperty('stepBreakdown');
      
      expect(health.errors).toHaveProperty('rate');
      expect(health.errors).toHaveProperty('count');
      expect(health.errors).toHaveProperty('recent');
    });

    it('should determine health status based on error count', () => {
      // Clear global error metrics
      errorMetrics.clear();
      
      // Healthy (no errors)
      let health = getPipelineHealth();
      expect(health.status).toBe('healthy');
      
      // Degraded (6 errors)
      const now = Date.now();
      for (let i = 0; i < 6; i++) {
        errorMetrics.errors.push({
          timestamp: now - i * 1000,
          message: `Error ${i}`
        });
      }
      health = getPipelineHealth();
      expect(health.status).toBe('degraded');
      
      // Unhealthy (11 errors)
      for (let i = 6; i < 11; i++) {
        errorMetrics.errors.push({
          timestamp: now - i * 1000,
          message: `Error ${i}`
        });
      }
      health = getPipelineHealth();
      expect(health.status).toBe('unhealthy');
      
      // Clean up
      errorMetrics.clear();
    });

    it('should format recent errors properly', () => {
      errorMetrics.clear();
      
      const error = new Error('Test error');
      errorMetrics.record(error, null);
      
      const health = getPipelineHealth();
      
      expect(health.errors.recent).toHaveLength(1);
      expect(health.errors.recent[0]).toHaveProperty('message', 'Test error');
      expect(health.errors.recent[0]).toHaveProperty('timestamp');
      expect(health.errors.recent[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO format
      
      errorMetrics.clear();
    });
  });
});