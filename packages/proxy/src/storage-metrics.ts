/**
 * Storage metrics and circuit breaker implementation
 */

interface StorageMetrics {
  tracesSavedTotal: number;
  tracesFailedTotal: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  circuitOpen: boolean;
}

export class StorageCircuitBreaker {
  private metrics: StorageMetrics = {
    tracesSavedTotal: 0,
    tracesFailedTotal: 0,
    consecutiveFailures: 0,
    lastFailureTime: null,
    circuitOpen: false,
  };

  private readonly MAX_CONSECUTIVE_FAILURES = 10;
  private readonly CIRCUIT_RESET_TIMEOUT_MS = 60000; // 1 minute

  /**
   * Record a successful trace save
   */
  recordSuccess(): void {
    this.metrics.tracesSavedTotal++;
    this.metrics.consecutiveFailures = 0;
    
    // Auto-close circuit if it was open and we're succeeding again
    if (this.metrics.circuitOpen) {
      this.metrics.circuitOpen = false;
    }
  }

  /**
   * Record a failed trace save
   */
  recordFailure(): void {
    this.metrics.tracesFailedTotal++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();

    // Open circuit if too many consecutive failures
    if (this.metrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.metrics.circuitOpen = true;
    }
  }

  /**
   * Check if circuit breaker is open (should reject requests)
   */
  isOpen(): boolean {
    // Check if circuit should auto-reset
    if (
      this.metrics.circuitOpen &&
      this.metrics.lastFailureTime &&
      Date.now() - this.metrics.lastFailureTime > this.CIRCUIT_RESET_TIMEOUT_MS
    ) {
      // Try to reset circuit (half-open state)
      this.metrics.circuitOpen = false;
      this.metrics.consecutiveFailures = Math.floor(this.MAX_CONSECUTIVE_FAILURES / 2);
    }

    return this.metrics.circuitOpen;
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): Readonly<StorageMetrics> {
    return { ...this.metrics };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.metrics.consecutiveFailures = 0;
    this.metrics.circuitOpen = false;
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    const total = this.metrics.tracesSavedTotal + this.metrics.tracesFailedTotal;
    if (total === 0) return 100;
    return (this.metrics.tracesSavedTotal / total) * 100;
  }
}

// Singleton instance
export const storageCircuitBreaker = new StorageCircuitBreaker();
