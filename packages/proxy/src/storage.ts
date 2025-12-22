import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Trace } from '@traceforge/shared';
import { redactTrace } from './redaction.js';
import { storageCircuitBreaker } from './storage-metrics.js';

// Allow custom trace directory via environment variable
const TRACES_DIR = resolve(
  process.cwd(),
  process.env.TRACEFORGE_TRACES_DIR || '.ai-tests/traces'
);

export class TraceStorage {
  static async saveTrace(trace: Trace): Promise<void> {
    // Check circuit breaker before attempting save
    if (storageCircuitBreaker.isOpen()) {
      const error = new Error(
        'Storage circuit breaker is open - too many consecutive failures. ' +
        'Trace saving is temporarily disabled to prevent cascading failures.'
      );
      // Use structured logging if available, fall back to console.error
      if (typeof console.error === 'function') {
        console.error('[CIRCUIT BREAKER OPEN]', error.message);
      }
      throw error;
    }

    try {
      // Ensure directory exists
      if (!existsSync(TRACES_DIR)) {
        await mkdir(TRACES_DIR, { recursive: true });
      }

      // Add schema version if missing
      if (!trace.schema_version) {
        trace.schema_version = '1.0.0';
      }

      // Redact sensitive data before saving
      const redactedTrace = redactTrace(trace);

      // Create filename with timestamp and ID
      const timestamp = new Date(trace.timestamp).toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${trace.id}.json`;
      const filepath = resolve(TRACES_DIR, filename);

      // Sort keys for git-friendly diffs
      const sortedTrace = sortKeys(redactedTrace);
      
      // Write to file with pretty formatting
      await writeFile(filepath, JSON.stringify(sortedTrace, null, 2), 'utf-8');
      
      // Record success
      storageCircuitBreaker.recordSuccess();
    } catch (error) {
      // Record failure with circuit breaker
      const errorObj = error instanceof Error ? error : new Error(String(error));
      storageCircuitBreaker.recordFailure();
      
      // Log detailed error
      console.error('[STORAGE ERROR] Failed to save trace:', {
        traceId: trace.id,
        error: errorObj.message,
        consecutiveFailures: storageCircuitBreaker.getMetrics().consecutiveFailures,
        circuitOpen: storageCircuitBreaker.getMetrics().circuitOpen,
      });
      
      // Re-throw to let caller handle (don't silently fail)
      throw errorObj;
    }
  }
}

// Recursively sort object keys for consistent output
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const sorted: any = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortKeys(obj[key]);
  }

  return sorted;
}
