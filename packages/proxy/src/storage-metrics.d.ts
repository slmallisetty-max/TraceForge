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
export declare class StorageCircuitBreaker {
    private metrics;
    private readonly MAX_CONSECUTIVE_FAILURES;
    private readonly CIRCUIT_RESET_TIMEOUT_MS;
    /**
     * Record a successful trace save
     */
    recordSuccess(): void;
    /**
     * Record a failed trace save
     */
    recordFailure(): void;
    /**
     * Check if circuit breaker is open (should reject requests)
     */
    isOpen(): boolean;
    /**
     * Get current metrics for monitoring
     */
    getMetrics(): Readonly<StorageMetrics>;
    /**
     * Manually reset the circuit breaker
     */
    reset(): void;
    /**
     * Get success rate as percentage
     */
    getSuccessRate(): number;
}
export declare const storageCircuitBreaker: StorageCircuitBreaker;
export {};
//# sourceMappingURL=storage-metrics.d.ts.map