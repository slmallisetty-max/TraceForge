import { writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { resolve } from "path";
import { existsSync } from "fs";
import type { Trace } from "@traceforge/shared";
import { redactTrace } from "./redaction.js";
import { storageCircuitBreaker } from "./storage-metrics.js";

// Allow custom trace directory via environment variable
const TRACES_DIR = resolve(
  process.cwd(),
  process.env.TRACEFORGE_TRACES_DIR || ".ai-tests/traces"
);

export class TraceStorage {
  static async saveTrace(trace: Trace): Promise<void> {
    // Check circuit breaker before attempting save
    if (storageCircuitBreaker.isOpen()) {
      const error = new Error(
        "Storage circuit breaker is open - too many consecutive failures. " +
          "Trace saving is temporarily disabled to prevent cascading failures."
      );
      // Use structured logging if available, fall back to console.error
      if (typeof console.error === "function") {
        console.error("[CIRCUIT BREAKER OPEN]", error.message);
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
        trace.schema_version = "1.0.0";
      }

      // Redact sensitive data before saving
      const redactedTrace = redactTrace(trace);

      // Create filename with timestamp and ID
      const timestamp = new Date(trace.timestamp)
        .toISOString()
        .replace(/[:.]/g, "-");
      const filename = `${timestamp}_${trace.id}.json`;
      const filepath = resolve(TRACES_DIR, filename);

      // Sort keys for git-friendly diffs
      const sortedTrace = sortKeys(redactedTrace);

      // Write to file with pretty formatting
      await writeFile(filepath, JSON.stringify(sortedTrace, null, 2), "utf-8");

      // Record success
      storageCircuitBreaker.recordSuccess();
    } catch (error) {
      // Record failure with circuit breaker
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      storageCircuitBreaker.recordFailure();

      // Log detailed error
      console.error("[STORAGE ERROR] Failed to save trace:", {
        traceId: trace.id,
        error: errorObj.message,
        consecutiveFailures:
          storageCircuitBreaker.getMetrics().consecutiveFailures,
        circuitOpen: storageCircuitBreaker.getMetrics().circuitOpen,
      });

      // Re-throw to let caller handle (don't silently fail)
      throw errorObj;
    }
  }

  /**
   * Count total number of traces
   */
  static async countTraces(): Promise<number> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return 0;
      }

      const files = await readdir(TRACES_DIR);
      return files.filter((f) => f.endsWith(".json")).length;
    } catch (error) {
      console.error("[STORAGE ERROR] Failed to count traces:", error);
      return 0;
    }
  }

  /**
   * Clean up traces based on age and/or count
   * @param maxAgeSeconds Delete traces older than this (optional)
   * @param maxCount Keep only the newest N traces (optional)
   * @returns Number of traces deleted
   */
  static async cleanup(
    maxAgeSeconds?: number,
    maxCount?: number
  ): Promise<number> {
    try {
      if (!existsSync(TRACES_DIR)) {
        return 0;
      }

      const files = await readdir(TRACES_DIR);
      const traceFiles = files.filter((f) => f.endsWith(".json"));

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
        const cutoffTime = Date.now() - maxAgeSeconds * 1000;
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
      await Promise.all(toDelete.map((filepath) => unlink(filepath)));

      return toDelete.length;
    } catch (error) {
      console.error("[STORAGE ERROR] Failed to cleanup traces:", error);
      throw error;
    }
  }
}

// Recursively sort object keys for consistent output
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const sorted: any = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortKeys(obj[key]);
  }

  return sorted;
}
