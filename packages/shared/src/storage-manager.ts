/**
 * Storage Manager - Abstraction layer for storage backends
 * Provides fallback support and hot-swapping capabilities
 */

import type { Trace, Test } from "./types.js";
import type { StorageBackend, ListOptions } from "./storage-backend.js";
import { storageLogger } from "./logger.js";

export interface StorageManagerConfig {
  primary: StorageBackend;
  fallbacks?: StorageBackend[];
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

/**
 * StorageManager provides:
 * - Primary/fallback storage architecture
 * - Automatic failover
 * - Retry logic
 * - Metrics collection
 */
export class StorageManager implements StorageBackend {
  private primary: StorageBackend;
  private fallbacks: StorageBackend[];
  private retryAttempts: number;
  private retryDelay: number;
  private metrics: StorageMetrics;

  constructor(config: StorageManagerConfig) {
    this.primary = config.primary;
    this.fallbacks = config.fallbacks || [];
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.metrics = {
      primarySuccesses: 0,
      primaryFailures: 0,
      fallbackSuccesses: 0,
      fallbackFailures: 0,
    };
  }

  /**
   * Save trace with automatic fallback
   */
  async saveTrace(trace: Trace): Promise<void> {
    try {
      await this.executeWithRetry(() => this.primary.saveTrace(trace));
      this.metrics.primarySuccesses++;
    } catch (primaryError) {
      this.metrics.primaryFailures++;
      storageLogger.warn(
        { error: primaryError, traceId: trace.id },
        "Primary storage failed, attempting fallback"
      );

      // Try fallback backends
      for (const fallback of this.fallbacks) {
        try {
          await fallback.saveTrace(trace);
          this.metrics.fallbackSuccesses++;
          storageLogger.info(
            { traceId: trace.id },
            "Saved to fallback storage"
          );
          return;
        } catch (fallbackError) {
          this.metrics.fallbackFailures++;
          storageLogger.error(
            { error: fallbackError, traceId: trace.id },
            "Fallback storage failed"
          );
        }
      }

      // All backends failed
      throw new Error(
        `All storage backends failed for trace ${trace.id}. ` +
          `Primary: ${
            primaryError instanceof Error ? primaryError.message : "unknown"
          }. ` +
          `Fallbacks exhausted.`
      );
    }
  }

  /**
   * Get trace from primary (fallbacks not used for reads to maintain consistency)
   */
  async getTrace(id: string): Promise<Trace | null> {
    try {
      return await this.executeWithRetry(() => this.primary.getTrace(id));
    } catch (error) {
      storageLogger.error(
        { error, id },
        "Failed to get trace from primary storage"
      );
      throw error;
    }
  }

  /**
   * List traces from primary
   */
  async listTraces(options?: ListOptions): Promise<Trace[]> {
    try {
      return await this.executeWithRetry(() =>
        this.primary.listTraces(options)
      );
    } catch (error) {
      storageLogger.error(
        { error },
        "Failed to list traces from primary storage"
      );
      throw error;
    }
  }

  /**
   * Delete trace from all backends
   */
  async deleteTrace(id: string): Promise<void> {
    const errors: Error[] = [];

    // Delete from primary
    try {
      await this.primary.deleteTrace(id);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    // Delete from fallbacks
    for (const fallback of this.fallbacks) {
      try {
        await fallback.deleteTrace(id);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      storageLogger.warn(
        { errors: errors.map((e) => e.message), id },
        "Some storage backends failed to delete trace"
      );
    }
  }

  /**
   * Count traces from primary
   */
  async countTraces(): Promise<number> {
    try {
      return await this.executeWithRetry(() => this.primary.countTraces());
    } catch (error) {
      storageLogger.error({ error }, "Failed to count traces");
      throw error;
    }
  }

  /**
   * Cleanup from all backends
   */
  async cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number> {
    let totalCleaned = 0;

    // Cleanup primary
    try {
      totalCleaned += await this.primary.cleanup(maxAgeSeconds, maxCount);
    } catch (error) {
      storageLogger.error({ error }, "Failed to cleanup primary storage");
    }

    // Cleanup fallbacks
    for (const fallback of this.fallbacks) {
      try {
        totalCleaned += await fallback.cleanup(maxAgeSeconds, maxCount);
      } catch (error) {
        storageLogger.error({ error }, "Failed to cleanup fallback storage");
      }
    }

    return totalCleaned;
  }

  /**
   * Save test (similar pattern to saveTrace)
   */
  async saveTest(test: Test): Promise<void> {
    try {
      await this.executeWithRetry(() => this.primary.saveTest(test));
      this.metrics.primarySuccesses++;
    } catch (primaryError) {
      this.metrics.primaryFailures++;

      for (const fallback of this.fallbacks) {
        try {
          await fallback.saveTest(test);
          this.metrics.fallbackSuccesses++;
          return;
        } catch {
          this.metrics.fallbackFailures++;
        }
      }

      throw primaryError;
    }
  }

  async getTest(id: string): Promise<Test | null> {
    return await this.executeWithRetry(() => this.primary.getTest(id));
  }

  async listTests(options?: ListOptions): Promise<Test[]> {
    return await this.executeWithRetry(() => this.primary.listTests(options));
  }

  async deleteTest(id: string): Promise<void> {
    const errors: Error[] = [];

    try {
      await this.primary.deleteTest(id);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    for (const fallback of this.fallbacks) {
      try {
        await fallback.deleteTest(id);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      storageLogger.warn(
        { errors: errors.map((e) => e.message), id },
        "Some backends failed to delete test"
      );
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryAttempts - 1) {
          storageLogger.warn(
            {
              error: lastError.message,
              attempt: attempt + 1,
              maxAttempts: this.retryAttempts,
            },
            "Storage operation failed, retrying"
          );
          await this.sleep(this.retryDelay);
        }
      }
    }

    throw lastError || new Error("Operation failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get storage metrics
   */
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      primarySuccesses: 0,
      primaryFailures: 0,
      fallbackSuccesses: 0,
      fallbackFailures: 0,
    };
  }

  /**
   * Health check for all backends
   */
  async healthCheck(): Promise<StorageHealthStatus> {
    const status: StorageHealthStatus = {
      primary: "unknown",
      fallbacks: [],
    };

    // Check primary
    try {
      await this.primary.countTraces();
      status.primary = "healthy";
    } catch {
      status.primary = "unhealthy";
    }

    // Check fallbacks
    for (const fallback of this.fallbacks) {
      try {
        await fallback.countTraces();
        status.fallbacks.push("healthy");
      } catch {
        status.fallbacks.push("unhealthy");
      }
    }

    return status;
  }

  /**
   * Close all storage backends
   */
  async close(): Promise<void> {
    const errors: Error[] = [];

    try {
      await this.primary.close();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    for (const fallback of this.fallbacks) {
      try {
        await fallback.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      storageLogger.warn(
        { errors: errors.map((e) => e.message) },
        "Some storage backends failed to close"
      );
    }
  }
}

interface StorageMetrics {
  primarySuccesses: number;
  primaryFailures: number;
  fallbackSuccesses: number;
  fallbackFailures: number;
}

interface StorageHealthStatus {
  primary: "healthy" | "unhealthy" | "unknown";
  fallbacks: ("healthy" | "unhealthy")[];
}
