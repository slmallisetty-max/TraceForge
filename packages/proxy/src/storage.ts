import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Trace } from '@traceforge/shared';
import { redactTrace } from './redaction.js';

const TRACES_DIR = resolve(process.cwd(), '.ai-tests/traces');

export class TraceStorage {
  static async saveTrace(trace: Trace): Promise<void> {
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
    } catch (error) {
      // Log error but don't crash the proxy
      console.error('Failed to save trace:', error instanceof Error ? error.message : error);
      // Optionally re-throw if you want callers to know
      // throw error;
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
