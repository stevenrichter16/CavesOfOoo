import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  adaptRunPlayerMove, 
  initializePipelineAdapter,
  MovementMetrics,
  movementMetrics 
} from '../../src/js/movement/pipelineAdapter.js';
import { gameEventBus } from '../../src/js/systems/EventBus.js';

describe('Pipeline Adapter', () => {
  let originalEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original env
    originalEnv = process.env.USE_NEW_MOVEMENT;
  });

  afterEach(() => {
    // Restore original env
    process.env.USE_NEW_MOVEMENT = originalEnv;
  });

  describe('initializePipelineAdapter', () => {
    it('should set up event listeners', () => {
      const onSpy = vi.spyOn(gameEventBus, 'on');
      
      initializePipelineAdapter();
      
      expect(onSpy).toHaveBeenCalledWith('WillMove', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('DidMove', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('MovementBlocked', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('MovementComplete', expect.any(Function));
    });
  });

  describe('adaptRunPlayerMove', () => {
    it('should return an adapted function', () => {
      const originalFunc = vi.fn(() => true);
      const adapted = adaptRunPlayerMove(originalFunc);
      
      expect(typeof adapted).toBe('function');
      expect(adapted).not.toBe(originalFunc);
    });

    it('should use original function when feature flag is disabled', async () => {
      process.env.USE_NEW_MOVEMENT = 'false';
      
      const originalFunc = vi.fn(() => true);
      const adapted = adaptRunPlayerMove(originalFunc);
      
      const mockState = { player: { x: 5, y: 5 } };
      const mockAction = { type: 'move', dx: 1, dy: 0 };
      
      const result = await adapted(mockState, mockAction);
      
      expect(originalFunc).toHaveBeenCalledWith(mockState, mockAction);
      expect(result).toBe(true);
    });

    it('should fallback to original on pipeline error', async () => {
      process.env.USE_NEW_MOVEMENT = 'true';
      
      const originalFunc = vi.fn(() => true);
      const adapted = adaptRunPlayerMove(originalFunc);
      
      // Make pipeline throw an error by passing invalid state
      const result = await adapted(null, null);
      
      expect(originalFunc).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('MovementMetrics', () => {
    let metrics;

    beforeEach(() => {
      metrics = new MovementMetrics();
    });

    it('should initialize with empty measurements', () => {
      expect(metrics.measurements).toEqual([]);
      expect(metrics.maxMeasurements).toBe(100);
    });

    it('should record metrics', () => {
      const testMetrics = {
        validation: 1.5,
        preMove: 2.3,
        checkStatus: 0.8
      };
      
      metrics.record(testMetrics);
      
      expect(metrics.measurements).toHaveLength(1);
      expect(metrics.measurements[0].metrics).toEqual(testMetrics);
      expect(metrics.measurements[0].timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('should limit measurements to maxMeasurements', () => {
      metrics.maxMeasurements = 3;
      
      for (let i = 0; i < 5; i++) {
        metrics.record({ step: i });
      }
      
      expect(metrics.measurements).toHaveLength(3);
      // Should have the last 3 measurements
      expect(metrics.measurements[0].metrics.step).toBe(2);
      expect(metrics.measurements[1].metrics.step).toBe(3);
      expect(metrics.measurements[2].metrics.step).toBe(4);
    });

    it('should calculate averages correctly', () => {
      metrics.record({ validation: 2, preMove: 4 });
      metrics.record({ validation: 4, preMove: 6 });
      metrics.record({ validation: 3, preMove: 5 });
      
      const averages = metrics.getAverages();
      
      expect(averages.validation).toBe(3); // (2+4+3)/3
      expect(averages.preMove).toBe(5); // (4+6+5)/3
    });

    it('should return empty averages with no measurements', () => {
      const averages = metrics.getAverages();
      expect(averages).toEqual({});
    });

    it('should generate report with statistics', () => {
      metrics.record({ validation: 2, preMove: 3, checkStatus: 1 });
      metrics.record({ validation: 4, preMove: 5, checkStatus: 2 });
      
      const report = metrics.getReport();
      
      expect(report.stepAverages.validation).toBe(3);
      expect(report.stepAverages.preMove).toBe(4);
      expect(report.stepAverages.checkStatus).toBe(1.5);
      expect(report.totalAverage).toBe(8.5); // 3+4+1.5
      expect(report.sampleSize).toBe(2);
    });
  });

  describe('Event handlers with debug mode', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.DEBUG_MOVEMENT = 'true';
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.DEBUG_MOVEMENT;
    });

    it('should log WillMove events in debug mode', () => {
      initializePipelineAdapter();
      
      gameEventBus.emit('WillMove', { from: { x: 5, y: 5 }, to: { x: 6, y: 5 } });
      
      expect(consoleSpy).toHaveBeenCalledWith('WillMove:', expect.any(Object));
    });

    it('should log MovementComplete with metrics', () => {
      initializePipelineAdapter();
      
      // Clear console spy calls from initialization
      consoleSpy.mockClear();
      
      gameEventBus.emit('MovementComplete', { 
        result: {
          success: true,
          metrics: { validation: 1.2, preMove: 0.8 }
        }
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Movement complete:', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('Pipeline metrics:', expect.objectContaining({
        validation: 1.2,
        preMove: 0.8
      }));
    });
  });

  describe('Global metrics recording', () => {
    it('should record metrics on MovementComplete events', () => {
      const recordSpy = vi.spyOn(movementMetrics, 'record');
      
      gameEventBus.emit('MovementComplete', {
        result: {
          metrics: { validation: 1, preMove: 2 }
        }
      });
      
      expect(recordSpy).toHaveBeenCalledWith({ validation: 1, preMove: 2 });
    });

    it('should not record if no metrics in result', () => {
      const recordSpy = vi.spyOn(movementMetrics, 'record');
      
      gameEventBus.emit('MovementComplete', {
        result: { success: true }
      });
      
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });
});