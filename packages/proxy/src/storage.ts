import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { Trace } from '@traceforge/shared';

const TRACES_DIR = resolve(process.cwd(), '.ai-tests/traces');

export class TraceStorage {
  static async saveTrace(trace: Trace): Promise<void> {
    // Create filename with timestamp and ID
    const timestamp = new Date(trace.timestamp).toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${trace.id}.json`;
    const filepath = resolve(TRACES_DIR, filename);

    // Sort keys for git-friendly diffs
    const sortedTrace = sortKeys(trace);
    
    // Write to file with pretty formatting
    await writeFile(filepath, JSON.stringify(sortedTrace, null, 2), 'utf-8');
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
