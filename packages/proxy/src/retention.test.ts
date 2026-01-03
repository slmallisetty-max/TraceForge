import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetentionManager, loadRetentionPolicy, type RetentionPolicy } from './retention';

describe('RetentionManager', () => {
  let mockStorage: any;
  let mockLogger: any;

  beforeEach(() => {
    mockStorage = {
      cleanup: vi.fn(async () => 0),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('does not start if policy is disabled', () => {
    const policy: RetentionPolicy = {
      enabled: false,
      checkIntervalSeconds: 60,
    };

    const manager = new RetentionManager(mockStorage, policy, mockLogger);
    manager.start();

    expect(mockLogger.info).toHaveBeenCalledWith('Retention policy is disabled');
    expect(mockStorage.cleanup).not.toHaveBeenCalled();
  });

  it('runs cleanup immediately on start', async () => {
    const policy: RetentionPolicy = {
      enabled: true,
      maxAgeSeconds: 86400,
      checkIntervalSeconds: 3600,
    };

    (mockStorage.cleanup as any).mockResolvedValue(5);

    const manager = new RetentionManager(mockStorage, policy, mockLogger);
    manager.start();

    // Wait for immediate cleanup
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockStorage.cleanup).toHaveBeenCalledWith(86400, undefined);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ deleted: 5 }),
      'Cleanup completed'
    );

    manager.stop();
  });

  it('schedules periodic cleanup', async () => {
    vi.useFakeTimers();

    const policy: RetentionPolicy = {
      enabled: true,
      maxCount: 100,
      checkIntervalSeconds: 60,
    };

    (mockStorage.cleanup as any).mockResolvedValue(3);

    const manager = new RetentionManager(mockStorage, policy, mockLogger);
    manager.start();

    // Initial cleanup happens immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(mockStorage.cleanup).toHaveBeenCalledTimes(1);

    // Fast-forward to next interval
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockStorage.cleanup).toHaveBeenCalledTimes(2);

    manager.stop();
    vi.useRealTimers();
  });

  it('handles cleanup errors gracefully', async () => {
    const policy: RetentionPolicy = {
      enabled: true,
      maxAgeSeconds: 3600,
      checkIntervalSeconds: 60,
    };

    (mockStorage.cleanup as any).mockRejectedValue(new Error('Cleanup failed'));

    const manager = new RetentionManager(mockStorage, policy, mockLogger);
    manager.start();

    // Wait for cleanup to run and fail
    await new Promise(resolve => setImmediate(resolve));

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Cleanup failed' }),
      'Cleanup failed'
    );

    manager.stop();
  });

  it('stops periodic cleanup', async () => {
    vi.useFakeTimers();

    const policy: RetentionPolicy = {
      enabled: true,
      checkIntervalSeconds: 60,
    };

    const manager = new RetentionManager(mockStorage, policy, mockLogger);
    manager.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(mockStorage.cleanup).toHaveBeenCalledTimes(1);

    manager.stop();

    await vi.advanceTimersByTimeAsync(60000);

    // No additional calls after stop
    expect(mockStorage.cleanup).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('supports force cleanup', async () => {
    const policy: RetentionPolicy = {
      enabled: true,
      maxAgeSeconds: 86400,
      maxCount: 1000,
      checkIntervalSeconds: 3600,
    };

    (mockStorage.cleanup as any).mockResolvedValue(42);

    const manager = new RetentionManager(mockStorage, policy, mockLogger);

    const deleted = await manager.forceCleanup();

    expect(deleted).toBe(42);
    expect(mockStorage.cleanup).toHaveBeenCalledWith(86400, 1000);
  });

  it('does not log if no traces deleted', async () => {
    const policy: RetentionPolicy = {
      enabled: true,
      checkIntervalSeconds: 60,
    };

    (mockStorage.cleanup as any).mockResolvedValue(0);

    const manager = new RetentionManager(mockStorage, policy, mockLogger);
    manager.start();

    // Wait for cleanup to run
    await new Promise(resolve => setImmediate(resolve));

    // Should have "started" log but not "completed" log
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.any(Object),
      'Retention manager started'
    );

    // Filter for cleanup completed logs
    const cleanupLogs = (mockLogger.info as any).mock.calls.filter(
      (call: any) => call[1] === 'Cleanup completed'
    );
    expect(cleanupLogs).toHaveLength(0);

    manager.stop();
  });
});

describe('loadRetentionPolicy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads default configuration', () => {
    delete process.env.TRACEFORGE_RETENTION_ENABLED;
    delete process.env.TRACEFORGE_MAX_TRACE_AGE_DAYS;
    delete process.env.TRACEFORGE_MAX_TRACE_COUNT;
    delete process.env.TRACEFORGE_CLEANUP_INTERVAL;

    const policy = loadRetentionPolicy();

    expect(policy).toEqual({
      enabled: true,
      maxAgeSeconds: undefined,
      maxCount: undefined,
      checkIntervalSeconds: 21600, // 6 hours
    });
  });

  it('loads age-based policy', () => {
    process.env.TRACEFORGE_MAX_TRACE_AGE_DAYS = '7';

    const policy = loadRetentionPolicy();

    expect(policy.maxAgeSeconds).toBe(7 * 86400);
  });

  it('loads count-based policy', () => {
    process.env.TRACEFORGE_MAX_TRACE_COUNT = '10000';

    const policy = loadRetentionPolicy();

    expect(policy.maxCount).toBe(10000);
  });

  it('loads combined policy', () => {
    process.env.TRACEFORGE_MAX_TRACE_AGE_DAYS = '30';
    process.env.TRACEFORGE_MAX_TRACE_COUNT = '50000';

    const policy = loadRetentionPolicy();

    expect(policy.maxAgeSeconds).toBe(30 * 86400);
    expect(policy.maxCount).toBe(50000);
  });

  it('can disable retention', () => {
    process.env.TRACEFORGE_RETENTION_ENABLED = 'false';

    const policy = loadRetentionPolicy();

    expect(policy.enabled).toBe(false);
  });

  it('loads custom check interval', () => {
    process.env.TRACEFORGE_CLEANUP_INTERVAL = '3600';

    const policy = loadRetentionPolicy();

    expect(policy.checkIntervalSeconds).toBe(3600);
  });
});
