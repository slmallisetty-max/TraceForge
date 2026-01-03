import { storageCircuitBreaker } from './storage-metrics.js';
import type { StorageBackend } from '@traceforge/shared';

export type { StorageBackend };

export interface RetentionPolicy {
  enabled: boolean;
  maxAgeSeconds?: number;  // Delete traces older than this
  maxCount?: number;        // Keep only the newest N traces
  checkIntervalSeconds: number; // How often to run cleanup
}

export class RetentionManager {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private storage: StorageBackend,
    private policy: RetentionPolicy,
    private logger: any
  ) {}

  start() {
    if (!this.policy.enabled) {
      this.logger.info('Retention policy is disabled');
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Retention manager already running');
      return;
    }

    this.isRunning = true;

    // Run immediately on startup
    this.runCleanup();

    // Schedule periodic cleanup
    this.timer = setInterval(
      () => this.runCleanup(),
      this.policy.checkIntervalSeconds * 1000
    );

    this.logger.info(
      {
        maxAgeSeconds: this.policy.maxAgeSeconds,
        maxCount: this.policy.maxCount,
        checkInterval: this.policy.checkIntervalSeconds,
      },
      'Retention manager started'
    );
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.logger.info('Retention manager stopped');
  }

  private async runCleanup() {
    try {
      const startTime = Date.now();

      // Don't run cleanup if circuit breaker is open
      if (storageCircuitBreaker.isOpen()) {
        this.logger.warn('Skipping cleanup - circuit breaker is open');
        return;
      }

      const deleted = await this.storage.cleanup(
        this.policy.maxAgeSeconds,
        this.policy.maxCount
      );

      const duration = Date.now() - startTime;

      if (deleted > 0) {
        this.logger.info(
          {
            deleted,
            durationMs: duration,
            policy: this.policy,
          },
          'Cleanup completed'
        );
      }
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Cleanup failed');
    }
  }

  async forceCleanup(): Promise<number> {
    return await this.storage.cleanup(
      this.policy.maxAgeSeconds,
      this.policy.maxCount
    );
  }
}

/**
 * Load retention policy from environment
 */
export function loadRetentionPolicy(): RetentionPolicy {
  const maxAgeDays = process.env.TRACEFORGE_MAX_TRACE_AGE_DAYS;
  const maxCount = process.env.TRACEFORGE_MAX_TRACE_COUNT;

  return {
    enabled: process.env.TRACEFORGE_RETENTION_ENABLED !== 'false',
    maxAgeSeconds: maxAgeDays ? parseInt(maxAgeDays, 10) * 86400 : undefined,
    maxCount: maxCount ? parseInt(maxCount, 10) : undefined,
    checkIntervalSeconds: parseInt(process.env.TRACEFORGE_CLEANUP_INTERVAL || '21600', 10), // Default: 6 hours
  };
}
