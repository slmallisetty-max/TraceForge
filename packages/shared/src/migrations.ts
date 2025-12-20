/**
 * Schema migration utilities for handling version changes
 */

import { TRACE_SCHEMA_VERSION } from './schema.js';
import type { Trace } from './types.js';

export interface MigrationResult {
  success: boolean;
  originalVersion?: string;
  newVersion: string;
  warnings?: string[];
  errors?: string[];
}

/**
 * Migrate a trace to the current schema version
 */
export function migrateTrace(trace: any): { trace: Trace; result: MigrationResult } {
  const originalVersion = trace.schema_version || '0.0.0';
  const warnings: string[] = [];
  const errors: string[] = [];

  // If no version field exists, assume it's an old trace
  if (!trace.schema_version) {
    warnings.push('Trace is missing schema_version field. Assuming legacy format.');
  }

  // Clone the trace to avoid mutating the original
  let migratedTrace: any = JSON.parse(JSON.stringify(trace));

  // Apply migrations based on version
  if (compareVersions(originalVersion, '1.0.0') < 0) {
    migratedTrace = migrateToV1(migratedTrace, warnings);
  }

  // Set current version
  migratedTrace.schema_version = TRACE_SCHEMA_VERSION;

  const result: MigrationResult = {
    success: errors.length === 0,
    originalVersion,
    newVersion: TRACE_SCHEMA_VERSION,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };

  return { trace: migratedTrace, result };
}

/**
 * Migrate from pre-1.0.0 to 1.0.0
 */
function migrateToV1(trace: any, warnings: string[]): any {
  // Add schema_version field
  trace.schema_version = '1.0.0';

  // Ensure all required fields exist
  if (!trace.id) {
    warnings.push('Missing required field: id');
  }

  if (!trace.timestamp) {
    warnings.push('Missing required field: timestamp');
  }

  if (!trace.metadata) {
    trace.metadata = {
      duration_ms: 0,
      status: 'success',
    };
    warnings.push('Missing metadata, created default');
  }

  return trace;
}

/**
 * Check if a trace needs migration
 */
export function needsMigration(trace: any): boolean {
  const version = trace.schema_version || '0.0.0';
  return compareVersions(version, TRACE_SCHEMA_VERSION) < 0;
}

/**
 * Get the current schema version
 */
export function getCurrentVersion(): string {
  return TRACE_SCHEMA_VERSION;
}

/**
 * Compare two semantic version strings
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Batch migrate multiple traces
 */
export function migrateTraces(traces: any[]): {
  traces: Trace[];
  results: MigrationResult[];
} {
  const migratedTraces: Trace[] = [];
  const results: MigrationResult[] = [];

  for (const trace of traces) {
    const { trace: migratedTrace, result } = migrateTrace(trace);
    migratedTraces.push(migratedTrace);
    results.push(result);
  }

  return { traces: migratedTraces, results };
}
