import { writeFile, mkdir, readdir, stat, unlink, readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Trace, Test, StorageBackend, ListOptions } from '@traceforge/shared';
import { redactTrace } from './redaction.js';
import { storageCircuitBreaker } from './storage-metrics.js';

// Allow custom trace directory via environment variable
const TRACES_DIR = resolve(
  process.cwd(),
  process.env.TRACEFORGE_TRACES_DIR || '.ai-tests/traces'
);

const TESTS_DIR = resolve(
  process.cwd(),
  process.env.TRACEFORGE_TESTS_DIR || '.ai-tests/tests'
);

export class FileStorageBackend implements StorageBackend {
  async saveTrace(trace: Trace): Promise<void> {
    // Check circuit breaker before attempting save
    if (storageCircuitBreaker.isOpen()) {
      const error = new Error(
        'Storage circuit breaker is open - too many consecutive failures. ' +
        'Trace saving is temporarily disabled to prevent cascading failures.'
      );
      console.error('[CIRCUIT BREAKER OPEN]', error.message);
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

  async getTrace(id: string): Promise<Trace | null> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return null;
      }

      const files = await readdir(TRACES_DIR);
      const traceFile = files.find(f => f.includes(id));

      if (!traceFile) {
        return null;
      }

      const content = await readFile(resolve(TRACES_DIR, traceFile), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to get trace:', error);
      return null;
    }
  }

  async listTraces(options: ListOptions = {}): Promise<Trace[]> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return [];
      }

      const { limit = 100, offset = 0, sortOrder = 'desc' } = options;
      const files = await readdir(TRACES_DIR);
      const traceFiles = files.filter(f => f.endsWith('.json'));

      // Get file stats for sorting
      const fileStats = await Promise.all(
        traceFiles.map(async (filename) => {
          const filepath = resolve(TRACES_DIR, filename);
          const stats = await stat(filepath);
          return {
            filename,
            filepath,
            mtime: stats.mtime.getTime(),
          };
        })
      );

      // Sort by modification time
      fileStats.sort((a, b) => 
        sortOrder === 'desc' ? b.mtime - a.mtime : a.mtime - b.mtime
      );

      // Apply pagination
      const paginatedFiles = fileStats.slice(offset, offset + limit);

      // Read and parse traces
      const traces = await Promise.all(
        paginatedFiles.map(async (file) => {
          const content = await readFile(file.filepath, 'utf-8');
          return JSON.parse(content) as Trace;
        })
      );

      return traces;
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to list traces:', error);
      return [];
    }
  }

  async deleteTrace(id: string): Promise<void> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return;
      }

      const files = await readdir(TRACES_DIR);
      const traceFile = files.find(f => f.includes(id));

      if (traceFile) {
        await unlink(resolve(TRACES_DIR, traceFile));
      }
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to delete trace:', error);
      throw error;
    }
  }

  async countTraces(): Promise<number> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return 0;
      }

      const files = await readdir(TRACES_DIR);
      return files.filter(f => f.endsWith('.json')).length;
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to count traces:', error);
      return 0;
    }
  }

  async cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return 0;
      }

      const files = await readdir(TRACES_DIR);
      const traceFiles = files.filter(f => f.endsWith('.json'));

      if (traceFiles.length === 0) {
        return 0;
      }

      // Get file stats with timestamps
      const fileStats = await Promise.all(
        traceFiles.map(async (filename) => {
          const filepath = resolve(TRACES_DIR, filename);
          const stats = await stat(filepath);
          return {
            filename,
            filepath,
            mtime: stats.mtime.getTime(),
          };
        })
      );

      // Sort by modification time (newest first)
      fileStats.sort((a, b) => b.mtime - a.mtime);

      const toDelete: string[] = [];

      // Delete by age
      if (maxAgeSeconds) {
        const cutoffTime = Date.now() - (maxAgeSeconds * 1000);
        for (const file of fileStats) {
          if (file.mtime < cutoffTime) {
            toDelete.push(file.filepath);
          }
        }
      }

      // Delete by count (keep only newest N)
      if (maxCount && fileStats.length > maxCount) {
        const excess = fileStats.slice(maxCount);
        for (const file of excess) {
          if (!toDelete.includes(file.filepath)) {
            toDelete.push(file.filepath);
          }
        }
      }

      // Perform deletions
      await Promise.all(toDelete.map(filepath => unlink(filepath)));

      return toDelete.length;
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to cleanup traces:', error);
      throw error;
    }
  }

  async saveTest(test: Test): Promise<void> {
    try {
      // Ensure directory exists
      if (!existsSync(TESTS_DIR)) {
        await mkdir(TESTS_DIR, { recursive: true });
      }

      const filename = `${test.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${test.id}.json`;
      const filepath = resolve(TESTS_DIR, filename);

      await writeFile(filepath, JSON.stringify(test, null, 2), 'utf-8');
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to save test:', error);
      throw error;
    }
  }

  async getTest(id: string): Promise<Test | null> {
    try {
      if (!existsSync(TESTS_DIR)) {
        return null;
      }

      const files = await readdir(TESTS_DIR);
      const testFile = files.find(f => f.includes(id));

      if (!testFile) {
        return null;
      }

      const content = await readFile(resolve(TESTS_DIR, testFile), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to get test:', error);
      return null;
    }
  }

  async listTests(options: ListOptions = {}): Promise<Test[]> {
    try {
      if (!existsSync(TESTS_DIR)) {
        return [];
      }

      const { limit = 100, offset = 0 } = options;
      const files = await readdir(TESTS_DIR);
      const testFiles = files.filter(f => f.endsWith('.json'));

      // Apply pagination
      const paginatedFiles = testFiles.slice(offset, offset + limit);

      // Read and parse tests
      const tests = await Promise.all(
        paginatedFiles.map(async (filename) => {
          const content = await readFile(resolve(TESTS_DIR, filename), 'utf-8');
          return JSON.parse(content) as Test;
        })
      );

      return tests;
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to list tests:', error);
      return [];
    }
  }

  async deleteTest(id: string): Promise<void> {
    try {
      if (!existsSync(TESTS_DIR)) {
        return;
      }

      const files = await readdir(TESTS_DIR);
      const testFile = files.find(f => f.includes(id));

      if (testFile) {
        await unlink(resolve(TESTS_DIR, testFile));
      }
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to delete test:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for file-based storage
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

// Legacy export for backwards compatibility
export class TraceStorage {
  static async saveTrace(trace: Trace): Promise<void> {
    const backend = new FileStorageBackend();
    return backend.saveTrace(trace);
  }

  static async countTraces(): Promise<number> {
    const backend = new FileStorageBackend();
    return backend.countTraces();
  }

  static async cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number> {
    const backend = new FileStorageBackend();
    return backend.cleanup(maxAgeSeconds, maxCount);
  }
}
